'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Package, ClipboardList, TrendingUp,
  Clock, Cloud
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0
  });
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Review customer feedback', completed: false },
    { id: 2, title: 'Update inventory levels', completed: false },
    { id: 3, title: 'Process pending orders', completed: true },
  ]);

  const supabase = createClient();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [customersRes, ordersRes, inventoryRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('work_orders').select('*, total_amount, status'),
        supabase.from('inventory').select('quantity'),
      ]);

      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];

      const revenue = orders
        .filter((o: any) => o.status === 'completed' && o.total_amount)
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      const lowStock = inventory.filter((item: any) => item.quantity < 10).length;

      setStats({
        totalCustomers: customers.length,
        totalOrders: orders.length,
        completedOrders: orders.filter((o: any) => o.status === 'completed').length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
        totalRevenue: revenue,
        lowStockItems: lowStock,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const taskCompletion = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold dark:text-white mb-2">Overview</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor key metrics and manage your platform</p>
          </div>

          {/* Hero Section with Time & Weather */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 mb-8 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Fresh start, Demo</h2>
                <p className="text-blue-100 mb-6">Ready to make today productive! 🚀</p>
                <div className="text-6xl font-bold">{formatTime(time)}</div>
                <div className="mt-2 text-blue-100">{formatDate(time)}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud size={32} />
                  <span className="text-5xl font-bold">17°C</span>
                </div>
                <div className="text-blue-100">Overcast</div>
                <div className="text-sm text-blue-200">Los Angeles</div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Customers</div>
                <Users className="text-blue-600" size={20} />
              </div>
              <div className="text-3xl font-bold dark:text-white">{stats.totalCustomers}</div>
              <div className="text-sm text-green-600 mt-2">+12% from last month</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Orders</div>
                <ClipboardList className="text-purple-600" size={20} />
              </div>
              <div className="text-3xl font-bold dark:text-white">{stats.pendingOrders}</div>
              <div className="text-sm text-green-600 mt-2">+5% increase</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Task Completion</div>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <div className="text-3xl font-bold dark:text-white">{taskCompletion}%</div>
              <div className="text-sm text-green-600 mt-2">+5% progress</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Response Time</div>
                <Clock className="text-orange-600" size={20} />
              </div>
              <div className="text-3xl font-bold dark:text-white">32 min</div>
              <div className="text-sm text-red-600 mt-2">+0% change</div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold dark:text-white">Quick Tasks</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white">
                    Active ({tasks.filter(t => !t.completed).length})
                  </button>
                  <button className="px-3 py-1 text-sm rounded-lg dark:text-gray-400">
                    Completed ({tasks.filter(t => t.completed).length})
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {
                        setTasks(tasks.map(t =>
                          t.id === task.id ? { ...t, completed: !t.completed } : t
                        ));
                      }}
                      className="w-4 h-4"
                    />
                    <span className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'dark:text-white'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>

              <input
                type="text"
                placeholder="Add a quick task..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>

            {/* Performance Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 lg:col-span-2"
            >
              <h3 className="text-lg font-semibold dark:text-white mb-4">Performance Insights</h3>

              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - 0.85)}`}
                      className="text-blue-600"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold dark:text-white">85%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm dark:text-gray-300">Task Completion</span>
                  <span className="text-sm font-semibold text-blue-600">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm dark:text-gray-300">User Engagement</span>
                  <span className="text-sm font-semibold text-green-600">84%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm dark:text-gray-300">Response Time</span>
                  <span className="text-sm font-semibold text-purple-600">78%</span>
                </div>
              </div>
            </motion.div>
          </div>
      </div>
    </DashboardLayout>
  );
}
