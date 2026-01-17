'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Download, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSort, useFilters, useModal } from '@/hooks';
import { customerSchema, sanitizeInput } from '@/lib/validations/schemas';
import type { Customer } from '@/types/database';
import { CustomerList } from './_components/CustomerList';
import { CustomerForm } from './_components/CustomerForm';
import { CustomerFilters } from './_components/CustomerFilters';
import { DeleteConfirmDialog } from './_components/DeleteConfirmDialog';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

// Minimal WorkOrder type for counting purposes
interface WorkOrderBasic {
  id: string;
  customer_id: string;
}

type SortField = 'name' | 'email' | 'phone' | 'created_at' | 'order_count';

export default function CustomersPage() {
  const { profile, canEdit, canDelete, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [newThisWeekCount, setNewThisWeekCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const formModal = useModal<string | null>(); // editingId
  const deleteModal = useModal<Customer>();

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{ name: string; phone: string; email: string }[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  // Vehicle form state
  const [vehicleData, setVehicleData] = useState({
    year: '',
    make: '',
    model: '',
    trim: '',
    tire_size: '',
  });
  const [showVehicleSection, setShowVehicleSection] = useState(false);

  // Search and filter hooks
  const { filteredData: searchFilteredData, searchTerm, setSearchTerm } = useFilters(
    customers,
    (customer, search) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (customer.email?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (customer.phone?.includes(search) || false)
  );

  // Apply custom filter type (new, active, inactive)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const typeFilteredData = searchFilteredData.filter((customer) => {
    if (filterType === 'new') {
      if (!customer.created_at) return false;
      return new Date(customer.created_at) >= oneWeekAgo;
    } else if (filterType === 'active') {
      return (customer.order_count || 0) > 0;
    } else if (filterType === 'inactive') {
      return (customer.order_count || 0) === 0;
    }
    return true; // 'all'
  });

  // Sort hook
  const { sortedData, sortField, sortDirection, toggleSort } = useSort<Customer, SortField>(
    typeFilteredData,
    'created_at',
    'desc'
  );

  useEffect(() => {
    if (!profile?.shop_id) return;
    loadData();
  }, [profile?.shop_id, currentPage]);

  async function loadData() {
    if (!profile?.shop_id) return;

    try {
      // Get new this week count (separate query for accurate stats)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: newCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', profile.shop_id)
        .gte('created_at', oneWeekAgo);
      setNewThisWeekCount(newCount || 0);

      // Get total count for pagination
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', profile.shop_id);

      setTotalCount(count || 0);

      // Calculate pagination range
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const [customersRes, ordersRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('shop_id', profile.shop_id)
          .order('created_at', { ascending: false })
          .range(from, to),
        supabase
          .from('work_orders')
          .select('id, customer_id')
          .eq('shop_id', profile.shop_id),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const workOrdersData = ordersRes.data || [];
      setWorkOrders(workOrdersData);

      // Calculate order count for each customer
      const orderCounts = workOrdersData.reduce((acc: Record<string, number>, order) => {
        acc[order.customer_id] = (acc[order.customer_id] || 0) + 1;
        return acc;
      }, {});

      const customersWithOrders = (customersRes.data || []).map((customer) => ({
        ...customer,
        order_count: orderCounts[customer.id] || 0,
      }));

      setCustomers(customersWithOrders);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load customers",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.shop_id) return;

    const editingId = formModal.data;

    try {
      // Sanitize inputs to prevent XSS
      const sanitizedFirstName = sanitizeInput(formData.first_name);
      const sanitizedLastName = sanitizeInput(formData.last_name);
      const sanitizedData = {
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        name: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
        email: sanitizeInput(formData.email),
        phone: sanitizeInput(formData.phone),
        address: sanitizeInput(formData.address),
      };

      // Validate with Zod schema
      const validationResult = customerSchema.safeParse(sanitizedData);

      if (!validationResult.success) {
        // Show first validation error
        const firstError = validationResult.error.issues?.[0];
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: firstError?.message || "Invalid input. Please check your data.",
        });
        return;
      }

      // Prepare data for database (only include fields that exist in DB)
      const dbData = {
        name: validationResult.data.name || `${validationResult.data.first_name} ${validationResult.data.last_name}`,
        email: validationResult.data.email,
        phone: validationResult.data.phone,
        address: validationResult.data.address,
      };

      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update(dbData)
          .eq('id', editingId)
          .eq('shop_id', profile.shop_id);
        if (error) throw error;

        toast({
          title: "Success!",
          description: "Customer updated successfully",
        });
      } else {
        const customerData = {
          ...dbData,
          shop_id: profile.shop_id,
        };
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select('id')
          .single();
        if (error) throw error;

        // If vehicle data was provided, save it
        if (showVehicleSection && vehicleData.year && vehicleData.make && vehicleData.model && newCustomer) {
          const vehiclePayload = {
            customer_id: newCustomer.id,
            year: parseInt(vehicleData.year),
            make: vehicleData.make.trim(),
            model: vehicleData.model.trim(),
            trim: vehicleData.trim.trim() || null,
            recommended_tire_size: vehicleData.tire_size || null,
          };

          const { error: vehicleError } = await supabase
            .from('customer_vehicles')
            .insert([vehiclePayload]);

          if (vehicleError) {
            console.error('Error saving vehicle:', vehicleError);
            // Don't fail the whole operation, just log it
          }
        }

        toast({
          title: "Success!",
          description: showVehicleSection && vehicleData.make ? "Customer and vehicle created successfully" : "Customer created successfully",
        });
      }

      // Reset all form data
      setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '' });
      setVehicleData({ year: '', make: '', model: '', trim: '', tire_size: '' });
      setShowVehicleSection(false);
      formModal.close();
      loadData();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save customer",
      });
    }
  }

  function startEdit(customer: Customer) {
    // Split existing name into first and last (use first space as separator)
    const nameParts = customer.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    setFormData({
      first_name: firstName,
      last_name: lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    formModal.open(customer.id);
  }

  async function confirmDelete() {
    if (!deleteModal.data || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteModal.data.id)
        .eq('shop_id', profile.shop_id);
      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer deleted successfully",
      });
      deleteModal.close();
      loadData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete customer",
      });
    }
  }

  function handleCancelForm() {
    formModal.close();
    setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '' });
    setVehicleData({ year: '', make: '', model: '', trim: '', tire_size: '' });
    setShowVehicleSection(false);
  }

  // CSV Import functions
  function parseCSV(text: string): { name: string; phone: string; email: string }[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'customer' || h === 'customer name');
    const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phone number' || h === 'tel');
    const emailIdx = headers.findIndex(h => h === 'email' || h === 'email address');

    if (nameIdx === -1) {
      setImportError('CSV must have a "name" or "customer name" column');
      return [];
    }

    const results: { name: string; phone: string; email: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const name = values[nameIdx] || '';
      if (!name) continue;

      results.push({
        name,
        phone: phoneIdx !== -1 ? values[phoneIdx] || '' : '',
        email: emailIdx !== -1 ? values[emailIdx] || '' : '',
      });
    }
    return results;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setImportPreview([]);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setImportPreview(parsed.slice(0, 5)); // Preview first 5
      }
    } catch (err) {
      setImportError('Failed to read file');
    }
  }

  async function handleImport() {
    if (!importFile || !profile?.shop_id) return;

    setImporting(true);
    setImportError(null);

    try {
      const text = await importFile.text();
      const customers = parseCSV(text);

      if (customers.length === 0) {
        setImportError('No valid customers found in file');
        setImporting(false);
        return;
      }

      // Batch insert customers
      const customerData = customers.map(c => ({
        shop_id: profile.shop_id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
      }));

      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      if (error) throw error;

      toast({
        title: 'Import Successful!',
        description: `${customers.length} customers imported`,
      });

      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      loadData();
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err.message || 'Failed to import customers');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csvContent = 'Name,Phone,Email\nJohn Doe,(555) 123-4567,john@example.com\nJane Smith,(555) 987-6543,jane@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customer-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Calculate stats
  const stats = {
    total: totalCount,
    newThisWeek: newThisWeekCount,
    active: customers.filter(c => (c.order_count || 0) > 0).length,
    totalOrders: workOrders.length,
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-text">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text mb-2">Profile Not Found</h2>
            <p className="text-text-muted">Please contact support to set up your shop profile.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-text">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text mb-2">Customers</h1>
            <p className="text-sm text-text-muted">
              Manage your customer database
            </p>
          </div>

          <div className="flex gap-2">
            {/* Import Button */}
            <button
              onClick={() => setImportModalOpen(true)}
              disabled={!canEdit}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-bg-light text-text-muted hover:bg-highlight hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={18} />
              Import
            </button>

            <Dialog open={formModal.isOpen} onOpenChange={(open) => open ? formModal.open(null) : formModal.close()}>
              <DialogTrigger asChild>
                <button
                  disabled={!canEdit}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-bg-light text-text-muted hover:bg-info hover:text-text transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
                >
                  <Plus size={20} />
                  Add Customer
                </button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {formModal.data ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogDescription>
                  {formModal.data ? 'Update customer information.' : 'Add a new customer to your database.'}
                </DialogDescription>
              </DialogHeader>

              <CustomerForm
                formData={formData}
                onFormDataChange={setFormData}
                vehicleData={vehicleData}
                onVehicleDataChange={setVehicleData}
                showVehicleSection={showVehicleSection}
                onToggleVehicleSection={() => setShowVehicleSection(!showVehicleSection)}
                isEditing={!!formModal.data}
                onSubmit={handleSubmit}
                onCancel={handleCancelForm}
              />
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards - Centered data, semantic text colors, no icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg border border-border-muted rounded-lg shadow-md p-6 text-center"
          >
            <p className="text-sm text-info uppercase tracking-wider mb-2">Total Customers</p>
            <p className="text-3xl font-bold text-text-muted">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg border border-border-muted rounded-lg shadow-md p-6 text-center"
          >
            <p className="text-sm text-success uppercase tracking-wider mb-2">New This Week</p>
            <p className="text-3xl font-bold text-text-muted">{stats.newThisWeek}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg border border-border-muted rounded-lg shadow-md p-6 text-center"
          >
            <p className="text-sm text-primary uppercase tracking-wider mb-2">Active Customers</p>
            <p className="text-3xl font-bold text-text-muted">{stats.active}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-bg border border-border-muted rounded-lg shadow-md p-6 text-center"
          >
            <p className="text-sm text-warning uppercase tracking-wider mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-text-muted">{stats.totalOrders}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <CustomerFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* Table */}
        <div className="bg-bg border border-border-muted rounded-lg shadow-md overflow-hidden">
          {sortedData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted">
                {customers.length === 0
                  ? 'No customers yet. Click "Add Customer" to get started.'
                  : 'No customers match your filters.'}
              </p>
            </div>
          ) : (
            <CustomerList
              customers={sortedData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={toggleSort}
              onEdit={startEdit}
              onDelete={(customer) => deleteModal.open(customer)}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}

          {/* Pagination Controls */}
          {totalCount > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-muted">
              <div className="text-sm text-text-muted">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} customers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                <span className="text-sm text-text-muted px-3">
                  Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Import Modal */}
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="text-primary" size={20} />
                Import Customers
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file to import multiple customers at once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Template download */}
              <div className="p-4 bg-bg-light rounded-lg border border-border-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">Need a template?</p>
                    <p className="text-xs text-text-muted">Download our CSV template with the correct format</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-text-muted hover:bg-primary hover:text-white transition-colors text-sm"
                  >
                    <Download size={16} />
                    Template
                  </button>
                </div>
              </div>

              {/* File upload area */}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  importFile ? 'border-success bg-success/5' : 'border-border-muted hover:border-primary'
                }`}>
                  {importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="text-success" size={24} />
                      <div className="text-left">
                        <p className="font-medium text-text">{importFile.name}</p>
                        <p className="text-xs text-text-muted">
                          {importPreview.length > 0 ? `${importPreview.length}+ customers found` : 'Processing...'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportFile(null);
                          setImportPreview([]);
                          setImportError(null);
                        }}
                        className="p-1 rounded hover:bg-bg-light"
                      >
                        <X size={16} className="text-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 text-text-muted" size={32} />
                      <p className="text-sm text-text">Drop your CSV file here or click to browse</p>
                      <p className="text-xs text-text-muted mt-1">Supports .csv files</p>
                    </>
                  )}
                </div>
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="border border-border-muted rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-bg-light border-b border-border-muted">
                    <p className="text-xs font-medium text-text-muted">Preview (first 5 rows)</p>
                  </div>
                  <div className="divide-y divide-border-muted max-h-40 overflow-y-auto">
                    {importPreview.map((row, i) => (
                      <div key={i} className="px-4 py-2 text-sm">
                        <span className="font-medium text-text">{row.name}</span>
                        {row.phone && <span className="text-text-muted ml-2">{row.phone}</span>}
                        {row.email && <span className="text-text-muted ml-2">{row.email}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {importError && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                  <AlertCircle className="text-danger flex-shrink-0" size={18} />
                  <p className="text-sm text-danger">{importError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                    setImportError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing || importPreview.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Import {importPreview.length > 0 ? `${importPreview.length}+ Customers` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={deleteModal.isOpen}
          customer={deleteModal.data || null}
          onClose={() => deleteModal.close()}
          onConfirm={confirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}
