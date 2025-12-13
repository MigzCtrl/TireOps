'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { User, Mail, Phone, MapPin, Calendar, DollarSign, ClipboardList, ArrowLeft } from 'lucide-react';
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
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <User className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">{customer.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">Customer Details & History</p>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-semibold dark:text-white mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Mail className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium dark:text-white">{customer.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-green-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="font-medium dark:text-white">{customer.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="text-red-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                <p className="font-medium dark:text-white">{customer.address || 'Not provided'}</p>
              </div>
            </div>
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
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Work Order History</h2>
            <Link
              href="/work-orders"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg dark:hover:bg-gray-700/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg dark:text-white">{order.service_type}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.tire_info}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[order.status as keyof typeof statusColors]
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
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
                      <div className="col-span-2">
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
      </div>
    </DashboardLayout>
  );
}
