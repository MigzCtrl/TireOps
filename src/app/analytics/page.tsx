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
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold dark:text-white mb-2">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Business insights and performance metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Revenue</div>
              <div className="text-5xl stat-number text-white font-bold">
                ${analytics.totalRevenue.toFixed(2)}
              </div>
              <div className="text-sm text-green-300">Lifetime earnings</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Customers</div>
              <div className="text-5xl stat-number text-white font-bold">
                {analytics.totalCustomers}
              </div>
              <div className="text-sm text-green-300">Active clients</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Work Orders</div>
              <div className="text-5xl stat-number text-white font-bold">
                {analytics.totalWorkOrders}
              </div>
              <div className="text-sm text-green-300">Total processed</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Inventory Value</div>
              <div className="text-5xl stat-number text-white font-bold">
                ${analytics.inventoryValue.toFixed(2)}
              </div>
              <div className="text-sm text-green-300">Total stock worth</div>
            </div>
          </motion.div>
        </div>

        {/* Order Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Pending Orders</div>
              <div className="text-5xl stat-number text-white font-bold">
                {analytics.pendingOrders}
              </div>
              <div className="text-sm text-yellow-300">Awaiting service</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Completed Orders</div>
              <div className="text-5xl stat-number text-white font-bold">
                {analytics.completedOrders}
              </div>
              <div className="text-sm text-green-300">Successfully finished</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Low Stock Items</div>
              <div className="text-5xl stat-number text-white font-bold">
                {analytics.lowStockItems}
              </div>
              <div className="text-sm text-red-300">Need reordering</div>
            </div>
          </motion.div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-blue-300" size={24} />
              <h3 className="text-xl font-semibold text-white">Top Customers</h3>
            </div>
            {analytics.topCustomers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                No customer data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topCustomers.map((customer: any, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>
                      <span className="font-medium text-white">{customer.name}</span>
                    </div>
                    <span className="text-sm text-blue-200">
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
            className="stats-card p-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-300" size={24} />
              <h3 className="text-xl font-semibold text-white">Popular Tires</h3>
            </div>
            {analytics.popularTires.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                No tire usage data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.popularTires.map((item: any, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>
                      <span className="font-medium text-white">{item.tire}</span>
                    </div>
                    <span className="text-sm text-blue-200">
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
          className="stats-card p-4 lg:p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Recent Work Orders</h3>
          {analytics.recentOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No recent orders</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {analytics.recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-white/10 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-white">
                        {order.customers?.name || 'Unknown'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-blue-100">
                        {order.service_type}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-500/30 text-green-200 border border-green-400/40'
                              : order.status === 'pending'
                              ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/40'
                              : order.status === 'in_progress'
                              ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                              : 'bg-red-500/30 text-red-200 border border-red-400/40'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-blue-100">
                        {new Date(order.scheduled_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-white">
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
