'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Plus, Calendar, Clock, Trash2, X, Edit } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Dropdown from '@/components/Dropdown';
import DateTimePicker from '@/components/DateTimePicker';
import TireSelector, { type SelectedTire } from '@/components/TireSelector';
import CustomSelect from '@/components/CustomSelect';
import { createPortal } from 'react-dom';

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
  const [selectedTires, setSelectedTires] = useState<SelectedTire[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [customerTireSize, setCustomerTireSize] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [stockError, setStockError] = useState<string>('');
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
    setMounted(true);
    loadData();
  }, []);

  // Handle body scroll lock and focus management when modal opens/closes
  useEffect(() => {
    if (showForm) {
      // Save the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift from scrollbar

      // Focus the modal after a brief delay to ensure it's rendered
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showForm]);

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

  function calculateTotal() {
    return selectedTires.reduce((sum, st) => sum + (st.quantity * st.tire.price), 0);
  }

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
          const workOrderItems = selectedTires.map(st => ({
            work_order_id: editingOrderId,
            tire_id: st.tire.id,
            quantity: st.quantity,
            unit_price: st.tire.price,
            subtotal: st.quantity * st.tire.price,
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
        const workOrderItems = selectedTires.map(st => ({
          work_order_id: orderData.id,
          tire_id: st.tire.id,
          quantity: st.quantity,
          unit_price: st.tire.price,
          subtotal: st.quantity * st.tire.price,
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

  const statusOptions = [
    { value: 'pending', label: 'Pending', description: 'Work order is waiting to be started' },
    { value: 'in_progress', label: 'In Progress', description: 'Currently being worked on' },
    { value: 'completed', label: 'Completed', description: 'Work order is finished' },
    { value: 'cancelled', label: 'Cancelled', description: 'Work order was cancelled' },
  ];

  const handleFilterClick = (status: string | null) => {
    if (statusFilter === status) {
      setStatusFilter(null); // Toggle off if clicking the same filter
    } else {
      setStatusFilter(status);
    }
  };

  const filteredWorkOrders = statusFilter
    ? workOrders.filter((order) => order.status === statusFilter)
    : workOrders;

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
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 btn-glass-primary btn-press w-full sm:w-auto justify-center"
          >
            <Plus size={20} /> New Work Order
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleFilterClick(null)}
            className={`stats-card p-4 lg:p-6 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 ${
              statusFilter === null ? 'ring-4 ring-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Orders</div>
              <div className="text-5xl stat-number text-white font-bold">{workOrders.length}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleFilterClick('pending')}
            className={`stats-card p-4 lg:p-6 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 ${
              statusFilter === 'pending' ? 'ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Pending</div>
              <div className="text-5xl stat-number text-white font-bold">
                {workOrders.filter((o) => o.status === 'pending').length}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleFilterClick('in_progress')}
            className={`stats-card p-4 lg:p-6 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 ${
              statusFilter === 'in_progress' ? 'ring-4 ring-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">In Progress</div>
              <div className="text-5xl stat-number text-white font-bold">
                {workOrders.filter((o) => o.status === 'in_progress').length}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleFilterClick('completed')}
            className={`stats-card p-4 lg:p-6 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 ${
              statusFilter === 'completed' ? 'ring-4 ring-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Completed</div>
              <div className="text-5xl stat-number text-white font-bold">
                {workOrders.filter((o) => o.status === 'completed').length}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Form Modal - Rendered in Portal */}
        {mounted && showForm && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] pointer-events-none"
              style={{ isolation: 'isolate' }}
            >
              {/* Overlay Background */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                onClick={cancelEdit}
                aria-hidden="true"
              />

              {/* Modal Container */}
              <div
                className="absolute inset-0 overflow-y-auto pointer-events-none"
                style={{ overscrollBehavior: 'contain' }}
              >
                <div className="min-h-full flex items-center justify-center p-6 pointer-events-none">
                  <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    tabIndex={-1}
                    className="pointer-events-auto w-[90vw] max-w-[1200px]"
                    style={{ overflow: 'visible' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                  >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl"
              style={{ maxHeight: '90vh', padding: '24px', overflow: 'visible' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {editingOrderId ? 'Edit Work Order' : 'New Work Order'}
                </h2>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                  {/* Two Column Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Basic Info Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Basic Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Customer
                            </label>
                            <CustomSelect
                              value={customers.find(c => c.id === formData.customer_id)?.name || ''}
                              onChange={(name) => {
                                const customer = customers.find(c => c.name === name);
                                if (customer) {
                                  setFormData({ ...formData, customer_id: customer.id });
                                }
                              }}
                              options={customers.map(c => c.name)}
                              placeholder="Select a customer"
                              searchable={true}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Service Type
                            </label>
                            <CustomSelect
                              value={formData.service_type}
                              onChange={(value) => setFormData({ ...formData, service_type: value })}
                              options={['Tire Installation', 'Tire Rotation', 'Tire Repair', 'Wheel Alignment', 'Tire Balance']}
                              placeholder="Select service"
                              searchable={true}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Schedule Section */}
                      <div>
                        <DateTimePicker
                          date={formData.scheduled_date}
                          time={formData.scheduled_time}
                          onDateChange={(date) => setFormData({ ...formData, scheduled_date: date })}
                          onTimeChange={(time) => setFormData({ ...formData, scheduled_time: time })}
                          label="Schedule Appointment"
                        />
                      </div>

                      {/* Notes Section */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Additional Notes</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Add any special instructions or notes..."
                          className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Right Column - Tire Selection */}
                    <div>
                      {/* Stock Error Message */}
                      <AnimatePresence>
                        {stockError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
                          >
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">{stockError}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <TireSelector
                        tires={tires}
                        selectedTires={selectedTires}
                        onTiresChange={setSelectedTires}
                        customerTireSize={customerTireSize}
                        onStockError={(message) => {
                          setStockError(message);
                          setTimeout(() => setStockError(''), 5000); // Clear after 5 seconds
                        }}
                      />
                    </div>

                  </div>
                </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="sm:flex-1 h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sm:flex-1 h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                >
                  {editingOrderId ? 'Update Work Order' : 'Create Work Order'}
                </button>
              </div>
            </form>
            </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Work Orders List */}
        <div className="space-y-4">
          {filteredWorkOrders.length === 0 ? (
            <div className="card-glass p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {workOrders.length === 0
                  ? 'No work orders yet. Click "New Work Order" to get started.'
                  : `No ${statusFilter ? statusFilter.replace('_', ' ') : ''} work orders found.`}
              </p>
            </div>
          ) : (
            filteredWorkOrders.map((order, index) => (
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
                  <div className="w-full sm:w-auto sm:min-w-[180px]">
                    <Dropdown
                      options={statusOptions}
                      value={order.status}
                      onChange={(newStatus) => updateStatus(order.id, newStatus)}
                      className="w-full"
                      compact
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Tire:</span>
                    <p className="font-medium dark:text-white">{order.tire_info}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
                    <p className="font-medium dark:text-white">
                      {new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString()}
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
