'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, DollarSign, Users, Package, AlertTriangle, Award } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface Analytics {
  totalCustomers: number;
  totalWorkOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  lowStockItems: number;
  inventoryValue: number;
  recentOrders: any[];
  topCustomers: any[];
  popularTires: any[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const [customersRes, ordersRes, inventoryRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase
          .from('work_orders')
          .select('*, customers(name), inventory(brand, model, price)'),
        supabase.from('inventory').select('*'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];

      // Calculate metrics
      const totalRevenue = orders
        .filter((o: any) => o.status === 'completed' && o.total_amount)
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      const inventoryValue = inventory.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );

      const lowStockItems = inventory.filter((item) => item.quantity < 10).length;

      // Top customers by order count
      const customerOrderCounts: any = {};
      orders.forEach((order: any) => {
        const name = order.customers?.name || 'Unknown';
        customerOrderCounts[name] = (customerOrderCounts[name] || 0) + 1;
      });

      const topCustomers = Object.entries(customerOrderCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      // Popular tires by usage in orders
      const tireUsage: any = {};
      orders.forEach((order: any) => {
        if (order.inventory) {
          const tireKey = `${order.inventory.brand} ${order.inventory.model}`;
          tireUsage[tireKey] = (tireUsage[tireKey] || 0) + 1;
        }
      });

      const popularTires = Object.entries(tireUsage)
        .map(([tire, count]) => ({ tire, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      // Recent orders
      const recentOrders = orders
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      setAnalytics({
        totalCustomers: customers.length,
        totalWorkOrders: orders.length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
        completedOrders: orders.filter((o: any) => o.status === 'completed')
          .length,
        totalRevenue,
        lowStockItems,
        inventoryValue,
        recentOrders,
        topCustomers,
        popularTires,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl dark:text-white">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl dark:text-white">Failed to load analytics</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold dark:text-white mb-2">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Business insights and performance metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${analytics.totalRevenue.toFixed(2)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Customers</div>
              <Users className="text-blue-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.totalCustomers}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Work Orders</div>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {analytics.totalWorkOrders}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Inventory Value</div>
              <Package className="text-orange-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              ${analytics.inventoryValue.toFixed(2)}
            </div>
          </motion.div>
        </div>

        {/* Order Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold dark:text-white mb-4">Pending Orders</h3>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.pendingOrders}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting service</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold dark:text-white mb-4">Completed Orders</h3>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {analytics.completedOrders}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Successfully finished</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold dark:text-white mb-4">Low Stock Items</h3>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                {analytics.lowStockItems}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Need reordering</p>
            </div>
          </motion.div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-blue-600" size={24} />
              <h3 className="text-xl font-semibold dark:text-white">Top Customers</h3>
            </div>
            {analytics.topCustomers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No customer data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topCustomers.map((customer: any, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium dark:text-white">{customer.name}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {customer.count} {customer.count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-600" size={24} />
              <h3 className="text-xl font-semibold dark:text-white">Popular Tires</h3>
            </div>
            {analytics.popularTires.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No tire usage data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.popularTires.map((item: any, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium dark:text-white">{item.tire}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count} {item.count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold dark:text-white mb-4">Recent Work Orders</h3>
          {analytics.recentOrders.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent orders</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Service
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium dark:text-white">
                        {order.customers?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {order.service_type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : order.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.scheduled_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium dark:text-white">
                        {order.total_amount
                          ? `$${parseFloat(order.total_amount).toFixed(2)}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
