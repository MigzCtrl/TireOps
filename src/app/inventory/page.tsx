'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  Package, Plus, Search, Download, Trash2, Edit, Check, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Minus, History
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Tire {
  id: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
  price: number;
  description: string;
  created_at: string;
}

type SortField = 'brand' | 'model' | 'size' | 'quantity' | 'price';
type SortDirection = 'asc' | 'desc';

export default function InventoryPage() {
  const { profile, isOwner, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<Tire[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingTireId, setEditingTireId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingTire, setDeletingTire] = useState<Tire | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success'>('idle');
  const [sortField, setSortField] = useState<SortField>('brand');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    size: '',
    quantity: 0,
    price: 0,
    description: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (!profile?.shop_id) return;
    loadInventory();
  }, [profile?.shop_id]);

  useEffect(() => {
    let filtered = inventory;

    if (searchTerm) {
      filtered = filtered.filter(
        (tire) =>
          tire.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tire.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tire.size.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stockFilter === 'in-stock') {
      filtered = filtered.filter((tire) => tire.quantity > 0);
    } else if (stockFilter === 'low-stock') {
      filtered = filtered.filter((tire) => tire.quantity > 0 && tire.quantity < 10);
    } else if (stockFilter === 'out-of-stock') {
      filtered = filtered.filter((tire) => tire.quantity === 0);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    setFilteredInventory(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, stockFilter, inventory, sortField, sortDirection]);

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
      setFilteredInventory(data || []);
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

      setEditingTireId(null);
      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      setShowForm(false);
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

  function confirmDelete(tire: Tire) {
    setDeletingTire(tire);
    setDeleteConfirmId(tire.id);
  }

  function cancelDelete() {
    setDeletingTire(null);
    setDeleteConfirmId(null);
  }

  async function handleDelete() {
    if (!deleteConfirmId || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', deleteConfirmId)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Tire deleted successfully",
      });
      loadInventory();
      cancelDelete();
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
    setEditingTireId(tire.id);
    setFormData({
      brand: tire.brand,
      model: tire.model,
      size: tire.size,
      quantity: tire.quantity,
      price: tire.price,
      description: tire.description || '',
    });
    setShowForm(true);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
    const rows = filteredInventory.map((tire) => [
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

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

            <Dialog open={showForm} onOpenChange={setShowForm}>
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
                    {editingTireId ? 'Edit Tire' : 'Add New Tire'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTireId ? 'Update tire information in your inventory.' : 'Add a new tire to your inventory.'}
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
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        placeholder="99.99"
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
                        setShowForm(false);
                        setEditingTireId(null);
                        setFormData({
                          brand: '',
                          model: '',
                          size: '',
                          quantity: 0,
                          price: 0,
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
                      {editingTireId ? 'Update Tire' : 'Add Tire'}
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
          {filteredInventory.length === 0 ? (
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
                  <thead className="bg-bg-light border-b border-border-muted">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => handleSort('brand')}
                      >
                        <div className="flex items-center gap-2">
                          Brand
                          {sortField === 'brand' && (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => handleSort('model')}
                      >
                        <div className="flex items-center gap-2">
                          Model
                          {sortField === 'model' && (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => handleSort('size')}
                      >
                        <div className="flex items-center gap-2">
                          Size
                          {sortField === 'size' && (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center gap-2">
                          Stock
                          {sortField === 'quantity' && (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center gap-2">
                          Price
                          {sortField === 'price' && (
                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg divide-y divide-border-muted">
                    {paginatedInventory.map((tire, index) => (
                      <tr
                        key={tire.id}
                        className="hover:bg-bg-light transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text">
                            {tire.brand}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text">
                            {tire.model}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text-muted">
                            {tire.size}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(tire.id, tire.quantity - 1)}
                                disabled={!isOwner || tire.quantity === 0}
                                className="p-1 rounded hover:bg-bg-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus size={14} className="text-text-muted" />
                              </button>
                              <span className="text-sm font-medium text-text w-8 text-center">
                                {tire.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(tire.id, tire.quantity + 1)}
                                disabled={!isOwner}
                                className="p-1 rounded hover:bg-bg-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus size={14} className="text-text-muted" />
                              </button>
                            </div>
                            {getStockBadge(tire.quantity)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text">
                            ${tire.price.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditingTire(tire)}
                              disabled={!isOwner}
                              className="p-2 rounded-lg bg-bg-light text-text-muted hover:bg-info hover:text-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => confirmDelete(tire)}
                              disabled={!isOwner}
                              className="p-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
                            >
                              <Trash2 size={14} />
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
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && deletingTire && (
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && cancelDelete()}>
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
                    {deletingTire.brand} {deletingTire.model}
                  </p>
                  <p className="text-sm text-text-muted">
                    Size: {deletingTire.size} • Quantity: {deletingTire.quantity}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelDelete}
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
