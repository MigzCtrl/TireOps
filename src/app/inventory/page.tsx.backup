'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Package, Plus, Search, Download, Trash2, Edit, Check, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Stepper from '@/components/Stepper';
import Dropdown, { type DropdownOption } from '@/components/Dropdown';

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

export default function InventoryPage() {
  const searchParams = useSearchParams();
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
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    size: '',
    quantity: 0,
    price: 0,
    description: '',
  });

  const supabase = createClient();

  const stockFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Stock Levels', description: 'Show all items' },
    { value: 'in-stock', label: 'In Stock', description: 'Items with quantity > 0' },
    { value: 'low-stock', label: 'Low Stock', description: 'Items with 1-9 units' },
    { value: 'out-of-stock', label: 'Out of Stock', description: 'Items with 0 units' },
  ];

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    // Check for search parameter in URL
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (tire) =>
          tire.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tire.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tire.size.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stock filter
    if (stockFilter === 'in-stock') {
      filtered = filtered.filter((tire) => tire.quantity > 0);
    } else if (stockFilter === 'low-stock') {
      filtered = filtered.filter((tire) => tire.quantity > 0 && tire.quantity < 10);
    } else if (stockFilter === 'out-of-stock') {
      filtered = filtered.filter((tire) => tire.quantity === 0);
    }

    setFilteredInventory(filtered);
  }, [searchTerm, stockFilter, inventory]);

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('brand', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
      setFilteredInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory').insert([formData]);

      if (error) throw error;

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
      console.error('Error adding tire:', error);
      alert('Error adding tire');
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
    if (!deleteConfirmId) return;

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', deleteConfirmId);

      if (error) throw error;
      loadInventory();
      cancelDelete();
    } catch (error) {
      console.error('Error deleting tire:', error);
      alert('Error deleting tire');
    }
  }

  async function updateQuantity(id: string, newQuantity: number) {
    if (newQuantity < 0) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
      loadInventory();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Error updating quantity');
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
  }

  function cancelEditingTire() {
    setEditingTireId(null);
    setFormData({
      brand: '',
      model: '',
      size: '',
      quantity: 0,
      price: 0,
      description: '',
    });
  }

  async function saveEditedTire(id: string) {
    try {
      const { error } = await supabase
        .from('inventory')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      setEditingTireId(null);
      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      loadInventory();
    } catch (error) {
      console.error('Error updating tire:', error);
      alert('Error updating tire');
    }
  }

  const totalValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  async function exportToCSV() {
    setExportStatus('exporting');

    // Small delay to show the exporting state
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

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    setExportStatus('success');
    setTimeout(() => setExportStatus('idle'), 2000);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl dark:text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white mb-2">Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your tire inventory and stock levels
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <button
              onClick={exportToCSV}
              disabled={exportStatus !== 'idle'}
              className={`flex items-center gap-2 px-4 py-3 btn-glass text-white btn-press w-full sm:w-auto justify-center transition-all duration-300 ${
                exportStatus === 'success'
                  ? 'bg-green-500/20 border-green-500/50'
                  : exportStatus === 'exporting'
                  ? 'opacity-75 cursor-wait'
                  : 'hover:glow-blue-hover'
              }`}
            >
              {exportStatus === 'exporting' ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Exporting...
                </>
              ) : exportStatus === 'success' ? (
                <>
                  <Check size={20} className="text-green-400" />
                  Exported!
                </>
              ) : (
                <>
                  <Download size={20} />
                  Export CSV
                </>
              )}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 btn-glass-primary btn-press w-full sm:w-auto justify-center"
            >
              {showForm ? 'Cancel' : <><Plus size={20} /> Add Tire</>}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stats-card p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Items</div>
              <div className="text-5xl stat-number text-white font-bold">{inventory.length}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stats-card p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Units</div>
              <div className="text-5xl stat-number text-white font-bold">
                {inventory.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stats-card p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Value</div>
              <div className="text-5xl stat-number text-white font-bold">
                ${totalValue.toFixed(2)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by brand, model, or size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl glass border border-gray-200/50 dark:border-gray-700/50 dark:text-white focus-premium transition-all duration-200"
            />
          </div>
          <Dropdown
            options={stockFilterOptions}
            value={stockFilter}
            onChange={setStockFilter}
            placeholder="Filter by stock level"
          />
        </div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg"
            style={{ padding: '24px' }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Tire</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Size *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 225/45R17"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Quantity *
                  </label>
                  <Stepper
                    value={formData.quantity}
                    onChange={(value) => setFormData({ ...formData, quantity: value })}
                    min={0}
                    className="justify-start"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) })
                    }
                    className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      brand: '',
                      model: '',
                      size: '',
                      quantity: 0,
                      price: 0,
                      description: '',
                    });
                  }}
                  className="sm:flex-1 h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sm:flex-1 h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                >
                  Add Tire
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Tire List */}
        <div className="space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="card-glass p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || stockFilter !== 'all'
                  ? 'No tires match your filters'
                  : 'No tires in inventory. Click "Add Tire" to get started.'}
              </p>
            </div>
          ) : (
            filteredInventory.map((tire, index) => (
              <motion.div
                key={tire.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-glass p-4 lg:p-6 lift-hover"
              >
                {editingTireId === tire.id ? (
                  /* Edit Form */
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Edit Tire</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Brand</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Model</label>
                        <input
                          type="text"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Size</label>
                        <input
                          type="text"
                          value={formData.size}
                          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                          className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={cancelEditingTire}
                        className="sm:flex-1 h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditedTire(tire.id)}
                        className="sm:flex-1 h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular View */
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 sm:gap-0">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold dark:text-white">
                          {tire.brand} {tire.model}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Size: {tire.size}</p>
                        {tire.description && (
                          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                            {tire.description}
                          </p>
                        )}
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${tire.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">per tire</p>
                      </div>
                    </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-sm font-medium dark:text-gray-300">Quantity:</span>
                    <Stepper
                      value={tire.quantity}
                      onChange={(newValue) => updateQuantity(tire.id, newValue)}
                      min={0}
                    />
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tire.quantity === 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : tire.quantity < 10
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {tire.quantity === 0
                        ? 'Out of Stock'
                        : tire.quantity < 10
                        ? 'Low Stock'
                        : 'In Stock'}
                    </span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => startEditingTire(tire)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Tire"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => confirmDelete(tire)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                  </>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && deletingTire && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                  <Trash2 size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Delete Tire?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="glass rounded-lg p-4 mb-6 border border-gray-200/30 dark:border-gray-700/30">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {deletingTire.brand} {deletingTire.model}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Size: {deletingTire.size} • Quantity: {deletingTire.quantity}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-3 btn-glass text-gray-900 dark:text-white rounded-xl hover:bg-white/20 dark:hover:bg-gray-700/50 transition-all font-medium btn-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600/90 backdrop-blur-xl border border-red-500/50 text-white rounded-xl hover:bg-red-700 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all font-medium btn-press"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
