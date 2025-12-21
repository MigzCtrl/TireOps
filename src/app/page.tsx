'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Package, ClipboardList, TrendingUp,
  Clock, Cloud, Plus, Check, Trash2, Edit3, X,
  Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    revenueToday: 0,
    revenueWeek: 0,
    lowStockItems: 0,
    totalInventory: 0
  });
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showTaskFeedback, setShowTaskFeedback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allOrders, setAllOrders] = useState<Array<{ id: string; customer_name: string; service_type: string; scheduled_date: string; scheduled_time: string | null; status: string }>>([]);
  const [showDayOverlay, setShowDayOverlay] = useState(false);
  const [overlayDate, setOverlayDate] = useState<Date | null>(null);
  const [personalNote, setPersonalNote] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStats();
    loadUser();
    loadAllOrders();

    // Auto-refresh stats every 30 seconds
    const statsRefreshInterval = setInterval(() => {
      loadStats();
      loadAllOrders();
    }, 30000);

    return () => clearInterval(statsRefreshInterval);
  }, []);

  useEffect(() => {
    if (userId) {
      loadTasks();
      subscribeToTasks();
    }
  }, [userId]);

  useEffect(() => {
    if (showDayOverlay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDayOverlay]);

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading user:', error);
      setUserId(null);
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
          event: 'INSERT',
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
        supabase.from('work_orders').select('*, total_amount, status, created_at'),
        supabase.from('inventory').select('quantity'),
      ]);

      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];

      // Calculate total inventory count (sum of all quantities)
      const totalInventoryCount = inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

      // Calculate revenue from completed orders
      const totalRevenue = orders
        .filter((o: any) => o.status === 'completed' && o.total_amount)
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      // Calculate today's revenue (orders created today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const revenueToday = orders
        .filter((o: any) => {
          if (o.status !== 'completed' || !o.total_amount) return false;
          const orderDate = new Date(o.created_at);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === todayTimestamp;
        })
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      // Calculate this week's revenue (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();

      const revenueWeek = orders
        .filter((o: any) => {
          if (o.status !== 'completed' || !o.total_amount) return false;
          const orderDate = new Date(o.created_at);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() >= sevenDaysAgoTimestamp;
        })
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      const lowStock = inventory.filter((item: any) => item.quantity < 10).length;

      setStats({
        totalCustomers: customers.length,
        totalOrders: orders.length,
        completedOrders: orders.filter((o: any) => o.status === 'completed').length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
        revenueToday: revenueToday,
        revenueWeek: revenueWeek,
        lowStockItems: lowStock,
        totalInventory: totalInventoryCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadAllOrders() {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, scheduled_date, scheduled_time, service_type, status, customers(name)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((order: any) => ({
        id: order.id,
        customer_name: order.customers?.name || 'Unknown',
        service_type: order.service_type,
        scheduled_date: order.scheduled_date,
        scheduled_time: order.scheduled_time,
        status: order.status,
      }));

      setAllOrders(formatted);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // Helper function to parse date string in local timezone (avoids day-off issues)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  };

  const getOrdersOnDate = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allOrders.filter(order => order.scheduled_date === dateStr);
  };

  const hasOrderOnDate = (day: number, month: number, year: number) => {
    return getOrdersOnDate(day, month, year).length > 0;
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

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

  const deleteTask = async (taskId: string) => {
    // Optimistic UI: Remove from state immediately
    const previousTasks = tasks;
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        // Rollback on error
        setTasks(previousTasks);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      // State already rolled back above
    }
  };

  const startEditingTask = (task: { id: string; title: string }) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.title);
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const saveEditedTask = async (taskId: string) => {
    if (!editingTaskText.trim()) {
      cancelEditingTask();
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editingTaskText.trim(), updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      setEditingTaskId(null);
      setEditingTaskText('');
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditedTask(taskId);
    } else if (e.key === 'Escape') {
      cancelEditingTask();
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

  const taskCompletion = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

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
                  <div className="text-4xl font-bold">${stats.revenueToday.toFixed(0)}</div>
                  <div className="text-xs text-blue-300 mt-2">Week: ${stats.revenueWeek.toFixed(0)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-sm text-blue-200 mb-2">Active Orders</div>
                  <div className="text-4xl font-bold">{stats.pendingOrders}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <Link href="/customers">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="stats-card p-4 lg:p-5 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 h-full"
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 h-full">
                  <div className="text-xs stat-label text-blue-200 uppercase tracking-wider">Total Customers</div>
                  <div className="text-4xl stat-number text-white font-bold">{stats.totalCustomers}</div>
                  <div className="text-xs text-green-300">+12% from last month</div>
                </div>
              </motion.div>
            </Link>

            <Link href="/work-orders">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="stats-card p-4 lg:p-5 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 h-full"
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 h-full">
                  <div className="text-xs stat-label text-blue-200 uppercase tracking-wider">Active Orders</div>
                  <div className="text-4xl stat-number text-white font-bold">{stats.pendingOrders}</div>
                  <div className="text-xs text-green-300">+5% increase</div>
                </div>
              </motion.div>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="stats-card p-4 lg:p-5 h-full"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-1 h-full">
                <div className="text-xs stat-label text-blue-200 uppercase tracking-wider">Task Completion</div>
                <div className="text-4xl stat-number text-white font-bold">{taskCompletion}%</div>
                <div className="text-xs text-green-300">+5% progress</div>
              </div>
            </motion.div>

            <Link href="/inventory">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="stats-card p-4 lg:p-5 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 h-full"
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 h-full">
                  <div className="text-xs stat-label text-blue-200 uppercase tracking-wider">Total Inventory</div>
                  <div className="text-4xl stat-number text-white font-bold">{stats.totalInventory}</div>
                  <div className="text-xs text-green-300">Items in stock</div>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl border border-gray-700 shadow-md p-4 sm:p-6 flex flex-col h-[520px]"
            >
              {/* Header - Fixed */}
              <h3 className="text-lg font-semibold text-gray-100 dark:text-white mb-4 flex-shrink-0">Quick Tasks</h3>

              {/* Segmented Control - Fixed */}
              <div className="relative mb-4 p-1 bg-gray-700 dark:bg-gray-800 rounded-lg border border-gray-600 flex-shrink-0">
                <div className="grid grid-cols-2 gap-1 relative">
                  {/* Animated Background Slider */}
                  <motion.div
                    className="absolute inset-y-1 w-[calc(50%-4px)] bg-blue-600 rounded-md shadow-sm"
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

              {/* Task List - Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2" style={{ maxHeight: '280px' }}>
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`group flex items-center gap-3 py-3 px-4 rounded-lg border transition-all duration-200 ${
                        task.completed
                          ? 'bg-gray-700/50 dark:bg-gray-800/50 border-gray-600 opacity-60'
                          : 'bg-gray-700 dark:bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-600 dark:hover:bg-gray-750'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <button
                        onClick={async () => {
                          const updatedCompleted = !task.completed;

                          // Optimistic UI: Update state immediately
                          const previousTasks = tasks;
                          setTasks(tasks.map(t =>
                            t.id === task.id ? { ...t, completed: updatedCompleted } : t
                          ));

                          try {
                            const { error } = await supabase
                              .from('tasks')
                              .update({ completed: updatedCompleted, updated_at: new Date().toISOString() })
                              .eq('id', task.id);

                            if (error) {
                              // Rollback on error
                              setTasks(previousTasks);
                              throw error;
                            }
                          } catch (error) {
                            console.error('Error updating task:', error);
                            // State already rolled back above
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

                      {/* Task Text or Edit Input */}
                      {editingTaskId === task.id ? (
                        <input
                          type="text"
                          value={editingTaskText}
                          onChange={(e) => setEditingTaskText(e.target.value)}
                          onKeyDown={(e) => handleEditKeyPress(e, task.id)}
                          onBlur={() => saveEditedTask(task.id)}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                        />
                      ) : (
                        <span className={`flex-1 text-sm leading-snug transition-all duration-300 ${
                          task.completed
                            ? 'line-through text-blue-200/50'
                            : 'text-white'
                        }`}>
                          <span className="line-clamp-1">{task.title}</span>
                        </span>
                      )}

                      {/* Edit and Delete Buttons */}
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {editingTaskId === task.id ? (
                          <button
                            onClick={cancelEditingTask}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingTask(task);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300 hover:text-blue-200 transition-colors"
                              title="Edit task"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredTasks.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-blue-200/50">
                    {taskFilter === 'active' ? 'No active tasks' : 'No completed tasks'}
                  </div>
                )}
              </div>

              {/* Add Task Input - Fixed at Bottom */}
              <div className="relative flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyPress={handleTaskKeyPress}
                    placeholder="Add a new task..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 dark:bg-gray-800 border border-gray-600 text-gray-100 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTaskInput.trim()}
                    className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium text-sm ${
                      newTaskInput.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
                        : 'bg-gray-700 dark:bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-600'
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

            {/* Calendar + Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl border border-gray-700 shadow-md p-4 sm:p-6 overflow-hidden relative flex flex-col h-[520px]"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600">
                      <Calendar size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-100 dark:text-white">Schedule</h3>
                      <p className="text-[10px] text-gray-400">Upcoming appointments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 transition-all duration-200"
                  >
                    Today
                  </button>
                </div>

                {/* Calendar Section */}
                <div className="mb-3 p-3 rounded-lg bg-gray-750 dark:bg-gray-850 border border-gray-600 flex-shrink-0">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setSelectedDate(newDate);
                      }}
                      className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition-all duration-200"
                    >
                      <ChevronLeft size={14} className="text-gray-300" />
                    </button>
                    <h4 className="text-xs font-semibold text-gray-100 dark:text-white tracking-wide">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setSelectedDate(newDate);
                      }}
                      className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition-all duration-200"
                    >
                      <ChevronRight size={14} className="text-gray-300" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={idx} className="text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wide pb-1">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);
                      const days = [];

                      // Empty cells for days before month starts
                      for (let i = 0; i < startingDayOfWeek; i++) {
                        days.push(<div key={`empty-${i}`} className="aspect-square" />);
                      }

                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const currentDate = new Date(year, month, day);
                        const isToday = isSameDay(currentDate, new Date());
                        const isSelected = isSameDay(currentDate, selectedDate);
                        const ordersOnThisDay = getOrdersOnDate(day, month, year);
                        const hasOrder = ordersOnThisDay.length > 0;
                        const isPast = isPastDate(currentDate);
                        const hasUpcomingOrders = ordersOnThisDay.some(o => !isPast);
                        const hasPastOrders = ordersOnThisDay.some(o => isPast);

                        days.push(
                          <button
                            key={day}
                            onClick={() => {
                              const clickedDate = new Date(year, month, day);
                              setSelectedDate(clickedDate);
                              setOverlayDate(clickedDate);
                              setShowDayOverlay(true);
                            }}
                            className={`aspect-square rounded-md text-[11px] font-semibold transition-all duration-200 relative flex items-center justify-center border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-400 shadow-sm'
                                : isToday
                                ? 'bg-gray-700 text-white border-blue-500 ring-1 ring-blue-500'
                                : isPast
                                ? 'text-gray-500 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
                                : 'text-gray-200 border-gray-700 hover:bg-gray-700 hover:border-gray-600 hover:text-white'
                            }`}
                          >
                            <span>{day}</span>
                            {hasOrder && (
                              <div
                                className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full ${
                                  isSelected
                                    ? 'bg-white'
                                    : isPast && hasPastOrders && !hasUpcomingOrders
                                    ? 'bg-gray-500'
                                    : 'bg-blue-400'
                                }`}
                              />
                            )}
                          </button>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </div>

                {/* Personal Notes */}
                <div className="flex-shrink-0 mt-auto">
                  <div className="p-3 rounded-lg bg-gray-750 dark:bg-gray-850 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-300">Personal Notes</h4>
                      <span className="text-[9px] text-gray-500">{allOrders.length} appointments</span>
                    </div>
                    <textarea
                      value={personalNote}
                      onChange={(e) => setPersonalNote(e.target.value)}
                      placeholder="Quick notes for today..."
                      className="w-full h-16 px-2 py-1.5 text-xs bg-gray-700 dark:bg-gray-800 border border-gray-600 rounded-md text-gray-100 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
      </div>

      {/* Day Detail Overlay */}
      <AnimatePresence>
        {showDayOverlay && overlayDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDayOverlay(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isSameDay(overlayDate, new Date())
                        ? 'Today'
                        : overlayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                      {allOrders.filter(order => isSameDay(parseLocalDate(order.scheduled_date), overlayDate)).length} {allOrders.filter(order => isSameDay(parseLocalDate(order.scheduled_date), overlayDate)).length === 1 ? 'appointment' : 'appointments'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDayOverlay(false)}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
                {(() => {
                  const dayOrders = allOrders
                    .filter(order => isSameDay(parseLocalDate(order.scheduled_date), overlayDate))
                    .sort((a, b) => {
                      const timeA = a.scheduled_time || '23:59';
                      const timeB = b.scheduled_time || '23:59';
                      return timeA.localeCompare(timeB);
                    });

                  if (dayOrders.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700/50 mb-4">
                          <Clock size={32} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">No appointments scheduled</p>
                        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">This day is free</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {dayOrders.map((order, idx) => {
                        const isPastOrder = isPastDate(overlayDate);
                        const isCompleted = order.status === 'completed';

                        return (
                          <Link key={order.id} href="/work-orders">
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className={`group flex gap-3 p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                                isPastOrder || isCompleted
                                  ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-90'
                                  : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                              }`}
                            >
                              {/* Time Badge */}
                              <div className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[56px] h-14 rounded-md border ${
                                isPastOrder || isCompleted
                                  ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
                                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              }`}>
                                <div className={`text-base font-bold leading-none ${
                                  isPastOrder || isCompleted
                                    ? 'text-gray-600 dark:text-gray-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                  {order.scheduled_time ? order.scheduled_time.slice(0, 5) : '--:--'}
                                </div>
                                <div className={`text-[9px] uppercase font-semibold mt-1 ${
                                  isPastOrder || isCompleted
                                    ? 'text-gray-500'
                                    : 'text-blue-500 dark:text-blue-500'
                                }`}>
                                  {order.scheduled_time && parseInt(order.scheduled_time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className={`text-sm font-semibold mb-0.5 ${
                                  isPastOrder || isCompleted
                                    ? 'text-gray-600 dark:text-gray-400 line-through'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {order.customer_name}
                                </h4>
                                <p className={`text-xs ${
                                  isPastOrder || isCompleted
                                    ? 'text-gray-500 dark:text-gray-500'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {order.service_type}
                                </p>
                              </div>

                              {/* Status Pill */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                  order.status === 'completed'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                                    : order.status === 'in_progress'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                    : order.status === 'pending'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                                }`}>
                                  {order.status.replace('_', ' ')}
                                </span>
                                <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </motion.div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
