'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Package, Plus, Search, Download, Minus, Trash2, Edit } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

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
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [editingTireId, setEditingTireId] = useState<string | null>(null);
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

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this tire?')) return;

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);

      if (error) throw error;
      loadInventory();
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

  function startEditingQuantity(tire: Tire) {
    setEditingQuantityId(tire.id);
    setTempQuantity(tire.quantity.toString());
  }

  function cancelEditingQuantity() {
    setEditingQuantityId(null);
    setTempQuantity('');
  }

  async function saveQuantity(id: string) {
    const newQuantity = parseInt(tempQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      alert('Please enter a valid quantity (0 or greater)');
      return;
    }
    await updateQuantity(id, newQuantity);
    setEditingQuantityId(null);
    setTempQuantity('');
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

  function exportToCSV() {
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold dark:text-white mb-2">Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your tire inventory and stock levels
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download size={20} />
              Export CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Items</div>
              <Package className="text-blue-600" size={20} />
            </div>
            <div className="text-3xl font-bold dark:text-white">{inventory.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Units</div>
              <Package className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold dark:text-white">
              {inventory.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
              <Package className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${totalValue.toFixed(2)}
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
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="in-stock">In Stock ({">"} 0)</option>
            <option value="low-stock">Low Stock (1-9)</option>
            <option value="out-of-stock">Out of Stock (0)</option>
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-xl font-semibold dark:text-white mb-4">Add New Tire</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Brand *
                </label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
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
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                {editingTireId === tire.id ? (
                  /* Edit Form */
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:text-white mb-4">Edit Tire</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Brand</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Model</label>
                        <input
                          type="text"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Size</label>
                        <input
                          type="text"
                          value={formData.size}
                          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={cancelEditingTire}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditedTire(tire.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular View */
                  <>
                    <div className="flex justify-between items-start">
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
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${tire.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">per tire</p>
                      </div>
                    </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium dark:text-gray-300">Quantity:</span>
                    {editingQuantityId === tire.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveQuantity(tire.id);
                            if (e.key === 'Escape') cancelEditingQuantity();
                          }}
                          className="w-20 px-3 py-2 rounded-lg border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveQuantity(tire.id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingQuantity}
                          className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(tire.id, tire.quantity - 1)}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Decrease by 1"
                          >
                            <Minus size={16} className="dark:text-white" />
                          </button>
                          <button
                            onClick={() => startEditingQuantity(tire)}
                            className="font-bold text-lg w-16 text-center dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg py-1 transition-colors"
                            title="Click to edit quantity"
                          >
                            {tire.quantity}
                          </button>
                          <button
                            onClick={() => updateQuantity(tire.id, tire.quantity + 1)}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Increase by 1"
                          >
                            <Plus size={16} className="dark:text-white" />
                          </button>
                        </div>
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
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingTire(tire)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Tire"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(tire.id)}
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
      </div>
    </DashboardLayout>
  );
}
