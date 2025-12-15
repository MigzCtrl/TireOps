'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { User, Mail, Phone, MapPin, Calendar, DollarSign, ClipboardList, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

interface WorkOrder {
  id: string;
  service_type: string;
  scheduled_date: string;
  status: string;
  total_amount: number | null;
  notes: string;
  tire_info?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  async function loadCustomerData() {
    try {
      // Load customer info
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      // Load work orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('work_orders')
        .select('*, inventory(brand, model, size)')
        .eq('customer_id', customerId)
        .order('scheduled_date', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithTireInfo = ordersData.map((order: any) => ({
        ...order,
        tire_info: order.inventory
          ? `${order.inventory.brand} ${order.inventory.model} (${order.inventory.size})`
          : 'No tire specified',
      }));

      setCustomer(customerData);
      setWorkOrders(ordersWithTireInfo);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalSpent = workOrders
    .filter((order) => order.status === 'completed' && order.total_amount)
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };

  const handleEditClick = () => {
    setEditedCustomer(customer);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedCustomer(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editedCustomer.name,
          email: editedCustomer.email,
          phone: editedCustomer.phone,
          address: editedCustomer.address,
        })
        .eq('id', customerId);

      if (error) throw error;

      setCustomer(editedCustomer);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      window.location.href = '/customers';
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

  const handleInputChange = (field: keyof Customer, value: string) => {
    if (editedCustomer) {
      setEditedCustomer({
        ...editedCustomer,
        [field]: value,
      });
    }
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

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl dark:text-white">Customer not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ArrowLeft size={20} />
            Back to Customers
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <User className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold dark:text-white">{customer.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">Customer Details & History</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleEditClick}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Contact Information</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            {isEditing && (
              <div className="flex items-start gap-3 md:col-span-2">
                <User className="text-purple-600 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
                  <input
                    type="text"
                    value={editedCustomer?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="flex items-start gap-3">
              <Mail className="text-blue-600 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedCustomer?.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium dark:text-white">{customer.email || 'Not provided'}</p>
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Phone Field */}
            <div className="flex items-start gap-3">
              <Phone className="text-green-600 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedCustomer?.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium dark:text-white">{customer.phone}</p>
                    <a
                      href={`tel:${customer.phone}`}
                      className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      Call
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Address Field */}
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="text-red-600 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedCustomer?.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-medium dark:text-white">{customer.address || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Customer Since (Read-only) */}
            <div className="flex items-start gap-3">
              <Calendar className="text-purple-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Since</p>
                <p className="font-medium dark:text-white">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <ClipboardList className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{workOrders.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Orders</p>
              <ClipboardList className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {workOrders.filter((o) => o.status === 'completed').length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              ${totalSpent.toFixed(2)}
            </p>
          </motion.div>
        </div>

        {/* Work Orders History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Work Order History</h2>
            <Link
              href="/work-orders"
              className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + New Order
            </Link>
          </div>

          {workOrders.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No work orders yet for this customer
            </p>
          ) : (
            <div className="space-y-4">
              {workOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-lg dark:hover:bg-gray-700/50 transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-lg dark:text-white">{order.service_type}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.tire_info}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        statusColors[order.status as keyof typeof statusColors]
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Scheduled Date</p>
                      <p className="font-medium dark:text-white">
                        {new Date(order.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-medium dark:text-white">
                        {order.total_amount
                          ? `$${order.total_amount.toFixed(2)}`
                          : 'Not set'}
                      </p>
                    </div>
                    {order.notes && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-gray-600 dark:text-gray-400">Notes</p>
                        <p className="font-medium dark:text-white">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold dark:text-white">Delete Customer</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold">{customer.name}</span>?
                This will permanently remove the customer and all associated data.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Customer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
