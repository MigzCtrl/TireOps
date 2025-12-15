'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Package, ClipboardList, TrendingUp,
  Clock, Cloud, Plus, Check
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
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showTaskFeedback, setShowTaskFeedback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStats();
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadTasks();
      subscribeToTasks();
    }
  }, [userId]);

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Use a default guest user ID if no authentication
      // In production, you'd want proper auth, but this allows testing
      setUserId(user?.id || '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.error('Error loading user:', error);
      // Fallback to guest user if auth fails
      setUserId('00000000-0000-0000-0000-000000000000');
    }
  }

  async function loadTasks() {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  function subscribeToTasks() {
    if (!userId) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

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

  const addTask = async () => {
    if (!newTaskInput.trim() || !userId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: userId,
            title: newTaskInput.trim(),
            completed: false,
          },
        ]);

      if (error) throw error;

      setNewTaskInput('');
      setShowTaskFeedback(true);
      setTimeout(() => setShowTaskFeedback(false), 2000);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  const filteredTasks = tasks.filter(t =>
    taskFilter === 'active' ? !t.completed : t.completed
  );

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
      <div className="space-y-4 lg:space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white mb-2">Overview</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor key metrics and manage your platform</p>
          </div>

          {/* Hero Section with Time & Business Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-6 lg:p-8 mb-8 text-white border border-blue-500/20 shadow-2xl"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 animate-pulse" style={{ animationDuration: '8s' }}></div>

            {/* Glass effect overlay */}
            <div className="absolute inset-0 backdrop-blur-3xl bg-white/5"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 lg:gap-0">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Big Boy Tires Dashboard
                </h2>
                <p className="text-blue-200 mb-6 text-lg">Warren, Ohio • Professional Tire Management</p>
                <div className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">{formatTime(time)}</div>
                <div className="mt-3 text-blue-200 text-lg lg:text-xl">{formatDate(time)}</div>
              </div>
              <div className="text-center lg:text-right flex flex-col sm:flex-row gap-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-sm text-blue-200 mb-2">Revenue Today</div>
                  <div className="text-4xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-sm text-blue-200 mb-2">Active Orders</div>
                  <div className="text-4xl font-bold">{stats.pendingOrders}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stats-card p-6"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Total Customers</div>
                <div className="text-5xl stat-number text-white font-bold">{stats.totalCustomers}</div>
                <div className="text-sm text-green-300">+12% from last month</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stats-card p-6"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Active Orders</div>
                <div className="text-5xl stat-number text-white font-bold">{stats.pendingOrders}</div>
                <div className="text-sm text-green-300">+5% increase</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="stats-card p-6"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Task Completion</div>
                <div className="text-5xl stat-number text-white font-bold">{taskCompletion}%</div>
                <div className="text-sm text-green-300">+5% progress</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="stats-card p-6"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">Avg. Response Time</div>
                <div className="text-5xl stat-number text-white font-bold">32 min</div>
                <div className="text-sm text-green-300">+0% change</div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="stats-card p-4 sm:p-6"
            >
              {/* Header */}
              <h3 className="text-lg font-semibold text-white mb-4">Quick Tasks</h3>

              {/* Segmented Control */}
              <div className="relative mb-4 p-1 glass rounded-xl border border-white/10">
                <div className="grid grid-cols-2 gap-1 relative">
                  {/* Animated Background Slider */}
                  <motion.div
                    className="absolute inset-y-1 w-[calc(50%-4px)] bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg"
                    initial={false}
                    animate={{
                      x: taskFilter === 'active' ? 4 : 'calc(100% + 4px)'
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />

                  {/* Active Button */}
                  <button
                    onClick={() => setTaskFilter('active')}
                    className={`relative z-10 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      taskFilter === 'active'
                        ? 'text-white'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Active
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        taskFilter === 'active'
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-500/20 text-blue-200'
                      }`}>
                        {tasks.filter(t => !t.completed).length}
                      </span>
                    </span>
                  </button>

                  {/* Completed Button */}
                  <button
                    onClick={() => setTaskFilter('completed')}
                    className={`relative z-10 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      taskFilter === 'completed'
                        ? 'text-white'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Done
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        taskFilter === 'completed'
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-500/20 text-blue-200'
                      }`}>
                        {tasks.filter(t => t.completed).length}
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-2 mb-4 min-h-[180px]">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`group flex items-center gap-3 py-3 px-4 rounded-xl border transition-all duration-300 ${
                        task.completed
                          ? 'bg-white/5 border-white/5 opacity-60'
                          : 'bg-gradient-to-r from-white/10 to-white/5 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/10'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <button
                        onClick={async () => {
                          const updatedCompleted = !task.completed;

                          try {
                            const { error } = await supabase
                              .from('tasks')
                              .update({ completed: updatedCompleted, updated_at: new Date().toISOString() })
                              .eq('id', task.id);

                            if (error) throw error;
                          } catch (error) {
                            console.error('Error updating task:', error);
                          }
                        }}
                        className={`relative flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                          task.completed
                            ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50'
                            : 'border-blue-300/50 hover:border-blue-400 hover:shadow-md hover:shadow-blue-400/30'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px', width: '20px', height: '20px' }}
                      >
                        {task.completed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </button>

                      {/* Task Text */}
                      <span className={`flex-1 text-sm leading-snug transition-all duration-300 ${
                        task.completed
                          ? 'line-through text-blue-200/50'
                          : 'text-white'
                      }`}>
                        <span className="line-clamp-1">{task.title}</span>
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredTasks.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-blue-200/50">
                    {taskFilter === 'active' ? 'No active tasks' : 'No completed tasks'}
                  </div>
                )}
              </div>

              {/* Add Task Input */}
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyPress={handleTaskKeyPress}
                    placeholder="Add a new task..."
                    className="flex-1 px-4 py-2.5 rounded-xl glass border border-white/10 text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all text-sm"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTaskInput.trim()}
                    className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium text-sm ${
                      newTaskInput.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/50 active:scale-95'
                        : 'bg-white/5 text-blue-200/30 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                {/* Toast Feedback */}
                <AnimatePresence>
                  {showTaskFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-12 left-0 right-0 flex items-center justify-center"
                    >
                      <div className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
                        <Check size={16} />
                        Task added!
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
