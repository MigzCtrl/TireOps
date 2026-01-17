'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  Package, Plus, Search, Download, Trash2, Edit, Check, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Minus, History, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle,
  Lock, Image, FileText, Sparkles, Pencil, RefreshCw
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePagination, useSort, useFilters, useModal } from '@/hooks';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import type { Tire } from '@/types/database';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

type SortField = 'brand' | 'model' | 'size' | 'quantity' | 'price';

export default function InventoryPage() {
  const { profile, isOwner, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { hasFeature, currentTier } = useFeatureGate();
  const canUseImport = hasFeature('ai_import');

  // Data state
  const [inventory, setInventory] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('all');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success'>('idle');

  // Modals
  const formModal = useModal<string | null>(); // editingTireId
  const deleteModal = useModal<Tire>();

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importPreview, setImportPreview] = useState<{ brand: string; model: string; size: string; quantity: number; price: number }[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMethod, setImportMethod] = useState<'csv' | 'excel' | 'ai' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    size: '',
    quantity: '' as string | number,
    price: '' as string | number,
    description: '',
  });

  // Search and filter hook
  const { filteredData: searchFilteredData, searchTerm, setSearchTerm } = useFilters(
    inventory,
    (tire, search) =>
      tire.brand.toLowerCase().includes(search.toLowerCase()) ||
      tire.model.toLowerCase().includes(search.toLowerCase()) ||
      tire.size.toLowerCase().includes(search.toLowerCase())
  );

  // Apply stock filter manually (custom filter)
  const stockFilteredData = searchFilteredData.filter((tire) => {
    if (stockFilter === 'in-stock') return tire.quantity > 0;
    if (stockFilter === 'low-stock') return tire.quantity > 0 && tire.quantity < 10;
    if (stockFilter === 'out-of-stock') return tire.quantity === 0;
    return true; // 'all'
  });

  // Sort hook
  const { sortedData, sortField, sortDirection, toggleSort } = useSort<Tire, SortField>(
    stockFilteredData,
    'brand'
  );

  // Pagination hook
  const {
    paginatedData,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    goToPage,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
  } = usePagination(sortedData, 10);

  useEffect(() => {
    if (!profile?.shop_id) return;
    loadInventory();
  }, [profile?.shop_id]);

  async function loadInventory() {
    if (!profile?.shop_id) return;

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('brand', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.shop_id) return;

    const editingTireId = formModal.data;

    try {
      if (editingTireId) {
        const { error } = await supabase
          .from('inventory')
          .update(formData)
          .eq('id', editingTireId)
          .eq('shop_id', profile.shop_id);
        if (error) throw error;

        toast({
          title: "Success!",
          description: "Tire updated successfully",
        });
      } else {
        const tireData = {
          ...formData,
          shop_id: profile.shop_id,
        };
        const { error } = await supabase.from('inventory').insert([tireData]);
        if (error) throw error;

        toast({
          title: "Success!",
          description: "Tire added successfully",
        });
      }

      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: '',
        price: '',
        description: '',
      });
      formModal.close();
      loadInventory();
    } catch (error) {
      console.error(`Error ${editingTireId ? 'updating' : 'adding'} tire:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingTireId ? 'update' : 'add'} tire`,
      });
    }
  }

  async function handleDelete() {
    if (!deleteModal.data || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', deleteModal.data.id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Tire deleted successfully",
      });
      loadInventory();
      deleteModal.close();
    } catch (error) {
      console.error('Error deleting tire:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete tire",
      });
    }
  }

  async function updateQuantity(id: string, newQuantity: number) {
    if (newQuantity < 0 || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;
      loadInventory();

      toast({
        title: "Updated",
        description: "Stock quantity updated",
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update quantity",
      });
    }
  }

  function startEditingTire(tire: Tire) {
    setFormData({
      brand: tire.brand,
      model: tire.model,
      size: tire.size,
      quantity: tire.quantity,
      price: tire.price,
      description: tire.description || '',
    });
    formModal.open(tire.id);
  }

  function getStockBadge(quantity: number) {
    if (quantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger border border-danger/30">
          Out of Stock
        </span>
      );
    } else if (quantity < 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
          Low Stock
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
          In Stock
        </span>
      );
    }
  }

  const totalValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  async function exportToCSV() {
    setExportStatus('exporting');

    await new Promise(resolve => setTimeout(resolve, 300));

    const headers = ['Brand', 'Model', 'Size', 'Quantity', 'Price', 'Description'];
    const rows = sortedData.map((tire) => [
      tire.brand,
      tire.model,
      tire.size,
      tire.quantity,
      tire.price,
      tire.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    setExportStatus('success');
    setTimeout(() => setExportStatus('idle'), 2000);
  }

  // CSV Import functions for inventory
  function parseInventoryCSV(text: string): { brand: string; model: string; size: string; quantity: number; price: number }[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const brandIdx = headers.findIndex(h => h === 'brand' || h === 'manufacturer');
    const modelIdx = headers.findIndex(h => h === 'model' || h === 'product' || h === 'name');
    const sizeIdx = headers.findIndex(h => h === 'size' || h === 'tire size');
    const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty' || h === 'stock');
    const priceIdx = headers.findIndex(h => h === 'price' || h === 'cost' || h === 'unit price');

    if (brandIdx === -1 || modelIdx === -1 || sizeIdx === -1) {
      setImportError('CSV must have "brand", "model", and "size" columns');
      return [];
    }

    const results: { brand: string; model: string; size: string; quantity: number; price: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const brand = values[brandIdx] || '';
      const model = values[modelIdx] || '';
      const size = values[sizeIdx] || '';
      if (!brand || !model || !size) continue;

      results.push({
        brand,
        model,
        size,
        quantity: qtyIdx !== -1 ? parseInt(values[qtyIdx]) || 0 : 0,
        price: priceIdx !== -1 ? parseFloat(values[priceIdx]) || 0 : 0,
      });
    }
    return results;
  }

  async function handleInventoryFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setImportPreview([]);
    setImportMethod(null);
    setEditingIndex(null);
    setAnalyzing(true);

    // Timeout controller to prevent infinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      // Use AI-powered import API for all file types
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'inventory');

      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze file');
      }

      if (result.data && result.data.length > 0) {
        setImportPreview(result.data);
        setImportMethod(result.method);
      } else {
        setImportError('No inventory data found in file. Try a different file or format.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setImportError('Analysis timed out. Try a smaller file or CSV format.');
      } else {
        setImportError(err.message || 'Failed to analyze file');
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleInventoryImport() {
    if (!profile?.shop_id || importPreview.length === 0) return;

    setImporting(true);
    setImportError(null);

    try {
      // Filter out empty rows
      const validItems = importPreview.filter(item =>
        item.brand?.trim() && item.size?.trim()
      );

      if (validItems.length === 0) {
        setImportError('No valid inventory items found');
        setImporting(false);
        return;
      }

      const inventoryData = validItems.map(item => ({
        shop_id: profile.shop_id,
        brand: item.brand.trim(),
        model: item.model?.trim() || '',
        size: item.size.trim(),
        quantity: item.quantity || 0,
        price: item.price || 0,
      }));

      const { error } = await supabase
        .from('inventory')
        .insert(inventoryData);

      if (error) throw error;

      toast({
        title: 'Import Successful!',
        description: `${validItems.length} inventory items imported`,
      });

      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportMethod(null);
      setEditingIndex(null);
      loadInventory();
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err.message || 'Failed to import inventory');
    } finally {
      setImporting(false);
    }
  }

  // Update an import row
  function updateImportRow(index: number, field: 'brand' | 'model' | 'size' | 'quantity' | 'price', value: string | number) {
    setImportPreview(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  }

  // Delete an import row
  function deleteImportRow(index: number) {
    setImportPreview(prev => prev.filter((_, i) => i !== index));
  }

  function downloadInventoryTemplate() {
    const csvContent = 'Brand,Model,Size,Quantity,Price\nMichelin,Pilot Sport 4,225/45R17,8,189.99\nGoodyear,Eagle F1,255/35R19,4,249.99\nBridgestone,Potenza RE-71R,245/40R18,12,159.99';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

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
            <h1 className="text-2xl font-bold text-text">Inventory</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage your tire inventory and stock levels
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={exportStatus !== 'idle'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                exportStatus === 'success'
                  ? 'bg-success/20 text-text-muted'
                  : 'bg-bg-light text-text hover:bg-highlight hover:text-text'
              }`}
            >
              {exportStatus === 'exporting' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : exportStatus === 'success' ? (
                <>
                  <Check size={16} className="text-success" />
                  Exported!
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadInventory()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-light text-text hover:bg-highlight hover:text-text transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {/* Import Button */}
            <button
              onClick={() => canUseImport ? setImportModalOpen(true) : setShowUpgradePrompt(true)}
              disabled={!isOwner}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                canUseImport
                  ? 'bg-bg-light text-text hover:bg-highlight hover:text-text'
                  : 'bg-bg-light text-text-muted'
              }`}
            >
              {canUseImport ? <Upload size={16} /> : <Lock size={16} />}
              {canUseImport ? 'Import' : 'Import (Pro)'}
            </button>

            <Dialog open={formModal.isOpen} onOpenChange={(open) => open ? formModal.open(null) : formModal.close()}>
              <DialogTrigger asChild>
                <button
                  disabled={!isOwner}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-light text-text hover:bg-highlight hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text"
                >
                  <Plus size={16} />
                  Add Inventory
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {formModal.data ? 'Edit Tire' : 'Add New Tire'}
                  </DialogTitle>
                  <DialogDescription>
                    {formModal.data ? 'Update tire information in your inventory.' : 'Add a new tire to your inventory.'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand *</Label>
                      <Input
                        id="brand"
                        type="text"
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Michelin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Model *</Label>
                      <Input
                        id="model"
                        type="text"
                        required
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="Pilot Sport 4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="size">Size *</Label>
                      <Input
                        id="size"
                        type="text"
                        required
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        placeholder="225/45R17"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        required
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                        placeholder="4"
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price per tire *</Label>
                      <Input
                        id="price"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                        placeholder="99.99"
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full h-24 px-3 py-2 rounded-lg border border-border-muted bg-bg-light text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Additional details about this tire..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        formModal.close();
                        setFormData({
                          brand: '',
                          model: '',
                          size: '',
                          quantity: '',
                          price: '',
                          description: '',
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
                    >
                      {formModal.data ? 'Update Tire' : 'Add Tire'}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg border border-border-muted rounded-lg p-6 text-center">
            <p className="text-sm text-info uppercase tracking-wider mb-2">Total Items</p>
            <p className="text-3xl font-bold text-text-muted">{inventory.length}</p>
          </div>

          <div className="bg-bg border border-border-muted rounded-lg p-6 text-center">
            <p className="text-sm text-success uppercase tracking-wider mb-2">Total Units</p>
            <p className="text-3xl font-bold text-text-muted">
              {inventory.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </div>

          <div className="bg-bg border border-border-muted rounded-lg p-6 text-center">
            <p className="text-sm text-warning uppercase tracking-wider mb-2">Total Value</p>
            <p className="text-3xl font-bold text-text-muted">
              ${totalValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <Input
              type="text"
              placeholder="Search by brand, model, or size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-bg-light border-border-muted"
            />
          </div>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="bg-bg-light border-border-muted">
              <SelectValue placeholder="Filter by stock level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock (1-9 units)</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table View */}
        <div className="bg-bg border border-border-muted rounded-lg overflow-hidden">
          {sortedData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted">
                {searchTerm || stockFilter !== 'all'
                  ? 'No tires match your filters'
                  : 'No tires in inventory. Click "Add Inventory" to get started.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bg-light border-b-2 border-border-muted">
                    <tr>
                      <th
                        className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => toggleSort('brand')}
                      >
                        <div className="flex items-center gap-2">
                          Brand
                          {sortField === 'brand' && (
                            sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => toggleSort('model')}
                      >
                        <div className="flex items-center gap-2">
                          Model
                          {sortField === 'model' && (
                            sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => toggleSort('size')}
                      >
                        <div className="flex items-center gap-2">
                          Size
                          {sortField === 'size' && (
                            sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => toggleSort('quantity')}
                      >
                        <div className="flex items-center gap-2">
                          Stock
                          {sortField === 'quantity' && (
                            sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => toggleSort('price')}
                      >
                        <div className="flex items-center gap-2">
                          Price
                          {sortField === 'price' && (
                            sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                          )}
                        </div>
                      </th>
                      <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-text uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg divide-y divide-border-muted">
                    {paginatedData.map((tire, index) => (
                      <tr
                        key={tire.id}
                        className="hover:bg-bg-light transition-colors"
                      >
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                          <div className="text-base md:text-lg font-semibold text-text">
                            {tire.brand}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                          <div className="text-base md:text-lg text-text">
                            {tire.model}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                          <div className="text-base text-text-muted font-medium">
                            {tire.size}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(tire.id, tire.quantity - 1)}
                                disabled={!isOwner || tire.quantity === 0}
                                className="p-2 rounded-lg hover:bg-bg-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus size={18} className="text-text-muted" />
                              </button>
                              <span className="text-lg font-bold text-text w-10 text-center">
                                {tire.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(tire.id, tire.quantity + 1)}
                                disabled={!isOwner}
                                className="p-2 rounded-lg hover:bg-bg-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus size={18} className="text-text-muted" />
                              </button>
                            </div>
                            {getStockBadge(tire.quantity)}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                          <div className="text-base md:text-lg font-bold text-success">
                            ${tire.price.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap text-right font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditingTire(tire)}
                              disabled={!isOwner}
                              className="p-2.5 rounded-lg bg-bg-light text-text-muted hover:bg-info hover:text-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => deleteModal.open(tire)}
                              disabled={!isOwner}
                              className="p-2.5 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-bg-light border-t border-border-muted flex items-center justify-between">
                  <div className="text-sm text-text-muted">
                    Showing {startIndex} to {endIndex} of {totalItems} items
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm text-text">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Import Modal */}
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="text-primary" size={20} />
                AI-Powered Import
              </DialogTitle>
              <DialogDescription>
                Upload photos, PDFs, CSV, Excel, or text files. Our AI will extract inventory data automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Supported formats info */}
              <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Image size={14} className="text-primary" /> Photos
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <FileText size={14} className="text-primary" /> PDF
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <FileSpreadsheet size={14} className="text-primary" /> CSV/Excel
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <FileText size={14} className="text-primary" /> Text
                </div>
              </div>

              {/* Template download */}
              <div className="p-3 bg-bg-light rounded-lg border border-border-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">Need a template?</p>
                    <p className="text-xs text-text-muted">Download our CSV template</p>
                  </div>
                  <button
                    onClick={downloadInventoryTemplate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg text-text-muted hover:bg-primary hover:text-white transition-colors text-sm"
                  >
                    <Download size={14} />
                    Template
                  </button>
                </div>
              </div>

              {/* File upload area */}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleInventoryFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  importFile ? 'border-success bg-success/5' : 'border-border-muted hover:border-primary'
                }`}>
                  {analyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="text-sm text-text">Analyzing with AI...</p>
                      <p className="text-xs text-text-muted">This may take a moment for images and PDFs</p>
                    </div>
                  ) : importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="text-success" size={24} />
                      <div className="text-left">
                        <p className="font-medium text-text">{importFile.name}</p>
                        <p className="text-xs text-text-muted">
                          {importPreview.length > 0 ? `${importPreview.length} items found` : 'Processing...'}
                          {importMethod && <span className="ml-1 text-primary">({importMethod})</span>}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportFile(null);
                          setImportPreview([]);
                          setImportError(null);
                          setImportMethod(null);
                        }}
                        className="p-1 rounded hover:bg-bg-light"
                      >
                        <X size={16} className="text-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 text-text-muted" size={32} />
                      <p className="text-sm text-text">Drop your file here or click to browse</p>
                      <p className="text-xs text-text-muted mt-1">Photos, PDFs, CSV, Excel, or text files</p>
                    </>
                  )}
                </div>
              </div>

              {/* Editable Preview */}
              {importPreview.length > 0 && (
                <div className="border border-border-muted rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-bg-light border-b border-border-muted flex items-center justify-between">
                    <p className="text-xs font-medium text-text-muted">Review & Edit ({importPreview.length} items)</p>
                  </div>
                  <div className="divide-y divide-border-muted max-h-60 overflow-y-auto">
                    {importPreview.map((row, i) => (
                      <div key={i} className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-light/50">
                        {editingIndex === i ? (
                          <>
                            <input
                              value={row.brand}
                              onChange={(e) => updateImportRow(i, 'brand', e.target.value)}
                              placeholder="Brand"
                              className="flex-1 px-2 py-1 text-xs rounded border border-border-muted bg-bg text-text"
                            />
                            <input
                              value={row.model}
                              onChange={(e) => updateImportRow(i, 'model', e.target.value)}
                              placeholder="Model"
                              className="flex-1 px-2 py-1 text-xs rounded border border-border-muted bg-bg text-text"
                            />
                            <input
                              value={row.size}
                              onChange={(e) => updateImportRow(i, 'size', e.target.value)}
                              placeholder="Size"
                              className="w-24 px-2 py-1 text-xs rounded border border-border-muted bg-bg text-text"
                            />
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => updateImportRow(i, 'quantity', parseInt(e.target.value) || 0)}
                              placeholder="Qty"
                              className="w-16 px-2 py-1 text-xs rounded border border-border-muted bg-bg text-text"
                            />
                            <input
                              type="number"
                              value={row.price}
                              onChange={(e) => updateImportRow(i, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="w-20 px-2 py-1 text-xs rounded border border-border-muted bg-bg text-text"
                            />
                            <button onClick={() => setEditingIndex(null)} className="p-1 text-success hover:bg-success/10 rounded">
                              <Check size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-text">{row.brand} {row.model}</span>
                              <span className="text-text-muted ml-2">{row.size}</span>
                            </div>
                            <span className="text-text-muted text-xs">Qty: {row.quantity}</span>
                            <span className="text-success text-xs font-medium">${row.price}</span>
                            <button onClick={() => setEditingIndex(i)} className="p-1 text-text-muted hover:bg-bg-light rounded">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteImportRow(i)} className="p-1 text-text-muted hover:bg-danger/10 hover:text-danger rounded">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
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
                    setImportMethod(null);
                    setEditingIndex(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInventoryImport}
                  disabled={importing || importPreview.length === 0 || analyzing}
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
                      Import {importPreview.length} Items
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upgrade Prompt */}
        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          feature="ai_import"
        />

        {/* Delete Confirmation Dialog */}
        {deleteModal.data && (
          <Dialog open={deleteModal.isOpen} onOpenChange={(open) => !open && deleteModal.close()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-danger/20">
                    <Trash2 size={20} className="text-danger" />
                  </div>
                  Delete Tire?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-text-muted">
                  This action cannot be undone. This will permanently delete the tire from your inventory.
                </p>

                <div className="rounded-lg p-4 bg-bg-light border border-border-muted">
                  <p className="font-semibold text-text mb-1">
                    {deleteModal.data.brand} {deleteModal.data.model}
                  </p>
                  <p className="text-sm text-text-muted">
                    Size: {deleteModal.data.size} • Quantity: {deleteModal.data.quantity}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => deleteModal.close()}
                    className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
