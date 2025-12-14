'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Plus, Calendar, Clock, Trash2, X, Edit } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface WorkOrder {
  id: string;
  customer_id: string;
  tire_id: string | null;
  status: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string;
  total_amount: number | null;
  customer_name?: string;
  tire_info?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Tire {
  id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
}

interface TireItem {
  tire_id: string;
  quantity: number;
  unit_price: number;
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedTires, setSelectedTires] = useState<TireItem[]>([]);
  const [currentTireId, setCurrentTireId] = useState('');
  const [currentTireQuantity, setCurrentTireQuantity] = useState(1);
  const [tireSearchQuery, setTireSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    status: 'pending',
  });

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ordersRes, customersRes, tiresRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*, customers(name), inventory(brand, model, size)')
          .order('scheduled_date', { ascending: false }),
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('inventory').select('id, brand, model, size, price, quantity').order('brand'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (tiresRes.error) throw tiresRes.error;

      const ordersWithNames = (ordersRes.data || []).map((order: any) => ({
        ...order,
        customer_name: order.customers?.name || 'Unknown',
        tire_info: order.inventory
          ? `${order.inventory.brand} ${order.inventory.model} (${order.inventory.size})`
          : 'No tire selected',
      }));

      setWorkOrders(ordersWithNames);
      setCustomers(customersRes.data || []);
      setTires(tiresRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function addTireToOrder(tireId: string, quantity: number) {
    const tire = tires.find(t => t.id === tireId);
    if (!tire) return;

    const existingItem = selectedTires.find(item => item.tire_id === tireId);
    if (existingItem) {
      alert('This tire is already added to the order');
      return;
    }

    if (quantity > tire.quantity) {
      alert(`Only ${tire.quantity} in stock`);
      return;
    }

    const newItem: TireItem = {
      tire_id: tireId,
      quantity: quantity,
      unit_price: tire.price,
    };

    setSelectedTires([...selectedTires, newItem]);
    setCurrentTireId('');
    setCurrentTireQuantity(1);
    setTireSearchQuery('');
  }

  function updateTireQuantity(tireId: string, quantity: number) {
    if (quantity < 1) return;

    setSelectedTires(selectedTires.map(item =>
      item.tire_id === tireId ? { ...item, quantity } : item
    ));
  }

  function removeTireFromOrder(tireId: string) {
    setSelectedTires(selectedTires.filter(item => item.tire_id !== tireId));
  }

  function calculateTotal() {
    return selectedTires.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }

  const filteredTires = tires
    .filter(tire => {
      if (!tireSearchQuery.trim()) return true; // Show all if no search query

      const query = tireSearchQuery.toLowerCase().trim();
      const brand = tire.brand?.toLowerCase() || '';
      const model = tire.model?.toLowerCase() || '';
      const size = tire.size?.toLowerCase() || '';

      return (
        brand.includes(query) ||
        model.includes(query) ||
        size.includes(query) ||
        // Also match if query matches any part of size (e.g., "205" matches "205/55R16")
        size.replace(/\//g, ' ').includes(query)
      );
    })
    .sort((a, b) => {
      // If no search query, sort by quantity (most stock first) then alphabetically
      if (!tireSearchQuery.trim()) {
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
        return a.brand.localeCompare(b.brand);
      }
      return 0;
    })
    .slice(0, tireSearchQuery.trim() ? undefined : 8); // Show top 8 when no search

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedTires.length === 0 && !editingOrderId) {
      alert('Please add at least one tire to the order');
      return;
    }

    try {
      const totalAmount = selectedTires.length > 0 ? calculateTotal() : null;

      if (editingOrderId) {
        // Update existing work order
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({
            customer_id: formData.customer_id,
            service_type: formData.service_type,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time || null,
            notes: formData.notes,
            status: formData.status,
            ...(totalAmount !== null && { total_amount: totalAmount }),
          })
          .eq('id', editingOrderId);

        if (updateError) {
          console.error('Order update error:', updateError);
          throw updateError;
        }

        // If tires were updated, handle work_order_items
        if (selectedTires.length > 0) {
          // Delete existing items
          await supabase
            .from('work_order_items')
            .delete()
            .eq('work_order_id', editingOrderId);

          // Insert new items
          const workOrderItems = selectedTires.map(item => ({
            work_order_id: editingOrderId,
            tire_id: item.tire_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          }));

          const { error: itemsError } = await supabase
            .from('work_order_items')
            .insert(workOrderItems);

          if (itemsError) {
            console.error('Work order items update error:', itemsError);
            throw itemsError;
          }
        }
      } else {
        // Create new work order
        const { data: orderData, error: orderError } = await supabase
          .from('work_orders')
          .insert([{
            customer_id: formData.customer_id,
            service_type: formData.service_type,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time || null,
            notes: formData.notes,
            total_amount: totalAmount,
            status: 'pending',
            tire_id: null,
          }])
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        // Create work order items
        const workOrderItems = selectedTires.map(item => ({
          work_order_id: orderData.id,
          tire_id: item.tire_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        }));

        const { error: itemsError} = await supabase
          .from('work_order_items')
          .insert(workOrderItems);

        if (itemsError) {
          console.error('Work order items creation error:', itemsError);

          // Check if it's a table doesn't exist error
          if (itemsError.message?.includes('relation "work_order_items" does not exist')) {
            alert('Database setup required: Please run the migration SQL in your Supabase dashboard. Check the console for instructions.');
            console.log('=== MIGRATION REQUIRED ===');
            console.log('Go to your Supabase Dashboard > SQL Editor and run the migration file:');
            console.log('Location: D:\\Tire-Shop-MVP\\supabase\\migrations\\add_work_order_items.sql');
          }
          throw itemsError;
        }
      }

      // Reset form
      setFormData({
        customer_id: '',
        service_type: '',
        scheduled_date: '',
        scheduled_time: '',
        notes: '',
        status: 'pending',
      });
      setSelectedTires([]);
      setEditingOrderId(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error with work order:', error);
      alert(`Error ${editingOrderId ? 'updating' : 'creating'} work order`);
    }
  }

  function startEditingOrder(order: WorkOrder) {
    setEditingOrderId(order.id);
    setFormData({
      customer_id: order.customer_id,
      service_type: order.service_type,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time || '',
      notes: order.notes,
      status: order.status,
    });
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingOrderId(null);
    setFormData({
      customer_id: '',
      service_type: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
      status: 'pending',
    });
    setSelectedTires([]);
    setShowForm(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  }

  function openDeleteModal(id: string) {
    setOrderToDelete(id);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  }

  async function confirmDelete() {
    if (!orderToDelete) return;

    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', orderToDelete);

      if (error) throw error;
      closeDeleteModal();
      loadData();
    } catch (error) {
      console.error('Error deleting work order:', error);
      alert('Error deleting work order');
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white mb-2">Work Orders</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage service appointments and work orders
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                cancelEdit();
              } else {
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 btn-glass-primary btn-press w-full sm:w-auto justify-center"
          >
            {showForm ? 'Cancel' : <><Plus size={20} /> New Work Order</>}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Orders</div>
              <ClipboardList className="text-blue-600" size={20} />
            </div>
            <div className="text-5xl stat-number text-white font-bold dark:text-white">{workOrders.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Pending</div>
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div className="text-5xl stat-number text-white font-bold text-yellow-600 dark:text-yellow-400">
              {workOrders.filter((o) => o.status === 'pending').length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">In Progress</div>
              <ClipboardList className="text-blue-600" size={20} />
            </div>
            <div className="text-5xl stat-number text-white font-bold text-blue-600 dark:text-blue-400">
              {workOrders.filter((o) => o.status === 'in_progress').length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Completed</div>
              <ClipboardList className="text-green-600" size={20} />
            </div>
            <div className="text-5xl stat-number text-white font-bold text-green-600 dark:text-green-400">
              {workOrders.filter((o) => o.status === 'completed').length}
            </div>
          </motion.div>
        </div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-glass p-4 lg:p-6"
          >
            <h2 className="text-xl font-semibold dark:text-white mb-4">
              {editingOrderId ? 'Edit Work Order' : 'Create Work Order'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                    Customer
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_id: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({ ...formData, service_type: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  >
                    <option value="">Select service</option>
                    <option value="Tire Installation">Tire Installation</option>
                    <option value="Tire Rotation">Tire Rotation</option>
                    <option value="Tire Repair">Tire Repair</option>
                    <option value="Wheel Alignment">Wheel Alignment</option>
                    <option value="Tire Balance">Tire Balance</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                    Select Tires *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search and select tire (brand, model, or size)..."
                      value={tireSearchQuery}
                      onChange={(e) => {
                        setTireSearchQuery(e.target.value);
                        setShowDropdown(true);
                        setCurrentTireId('');
                      }}
                      onFocus={() => {
                        setShowDropdown(true);
                        if (!tireSearchQuery) {
                          setTireSearchQuery(' '); // Trigger to show top tires
                          setTimeout(() => setTireSearchQuery(''), 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    {showDropdown && (filteredTires.length > 0 || !tireSearchQuery) && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredTires.length > 0 ? (
                          filteredTires.map((tire) => (
                            <div
                              key={tire.id}
                              onClick={() => {
                                setCurrentTireId(tire.id);
                                setTireSearchQuery(`${tire.brand} ${tire.model} (${tire.size})`);
                                setShowDropdown(false);
                              }}
                              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium dark:text-white">
                                    {tire.brand} {tire.model}
                                  </div>
                                  <div className="text-sm stat-label text-gray-600 dark:text-gray-400">
                                    Size: {tire.size}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                                    ${tire.price.toFixed(2)}
                                  </div>
                                  <div className="text-sm stat-label text-gray-600 dark:text-gray-400">
                                    Stock: {tire.quantity}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                            No tires found
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected tire with quantity selector */}
                    {currentTireId && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                      >
                        {(() => {
                          const selectedTire = tires.find(t => t.id === currentTireId);
                          if (!selectedTire) return null;
                          return (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-medium dark:text-white">
                                  {selectedTire.brand} {selectedTire.model}
                                </div>
                                <div className="text-sm stat-label text-gray-600 dark:text-gray-400">
                                  {selectedTire.size} • ${selectedTire.price.toFixed(2)} each
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium dark:text-white">Qty:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={selectedTire.quantity}
                                    value={currentTireQuantity}
                                    onChange={(e) => setCurrentTireQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    / {selectedTire.quantity}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addTireToOrder(currentTireId, currentTireQuantity)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 justify-center"
                                >
                                  <Plus size={18} />
                                  Add
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </div>

                  {/* Display selected tires */}
                  {selectedTires.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedTires.map((item) => {
                        const tire = tires.find(t => t.id === item.tire_id);
                        if (!tire) return null;
                        return (
                          <div
                            key={item.tire_id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium dark:text-white">
                                {tire.brand} {tire.model} ({tire.size})
                              </div>
                              <div className="text-sm stat-label text-gray-600 dark:text-gray-400">
                                ${item.unit_price.toFixed(2)} each
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={tire.quantity}
                                  value={item.quantity}
                                  onChange={(e) => updateTireQuantity(item.tire_id, parseInt(e.target.value))}
                                  className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white text-center"
                                />
                              </div>
                              <div className="text-right min-w-[80px]">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  ${(item.quantity * item.unit_price).toFixed(2)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTireFromOrder(item.tire_id)}
                                className="p-1.5 sm:p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Remove"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <div className="font-semibold text-lg dark:text-white">Total Amount:</div>
                        <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                          ${calculateTotal().toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                    Scheduled Date
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduled_date: new Date().toISOString().split('T')[0] })}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setFormData({ ...formData, scheduled_date: tomorrow.toISOString().split('T')[0] });
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        setFormData({ ...formData, scheduled_date: nextWeek.toISOString().split('T')[0] });
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Next Week
                    </button>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) =>
                        setFormData({ ...formData, scheduled_date: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                    Scheduled Time
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduled_time: '09:00' })}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      9 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduled_time: '12:00' })}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      12 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduled_time: '15:00' })}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      3 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduled_time: '17:00' })}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      5 PM
                    </button>
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) =>
                        setFormData({ ...formData, scheduled_time: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full btn-glass-primary py-3 btn-press"
              >
                {editingOrderId ? 'Update Work Order' : 'Create Work Order'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Work Orders List */}
        <div className="space-y-4">
          {workOrders.length === 0 ? (
            <div className="card-glass p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No work orders yet. Click "New Work Order" to get started.
              </p>
            </div>
          ) : (
            workOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-glass p-4 lg:p-6 lift-hover"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">
                      {order.customer_name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      {order.service_type}
                    </p>
                  </div>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[order.status as keyof typeof statusColors]
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Tire:</span>
                    <p className="font-medium dark:text-white">{order.tire_info}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
                    <p className="font-medium dark:text-white">
                      {new Date(order.scheduled_date).toLocaleDateString()}
                      {order.scheduled_time && ` at ${order.scheduled_time}`}
                    </p>
                  </div>
                  {order.total_amount && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        ${order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {order.notes && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                      <p className="font-medium dark:text-white">{order.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 sm:gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => startEditingOrder(order)}
                    className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(order.id)}
                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Delete Work Order</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete this work order? All associated data will be permanently removed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
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
