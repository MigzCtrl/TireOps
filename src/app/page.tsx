'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Package, ClipboardList, TrendingUp, DollarSign,
  Clock, Cloud, Plus, Check, Trash2, Edit3, X,
  Calendar, ChevronLeft, ChevronRight, AlertCircle, UserPlus, FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { profile, shop, loading: authLoading } = useAuth();
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    revenueToday: 0,
    revenueWeek: 0,
    lowStockItems: 0,
    totalInventory: 0,
    todayAppointments: 0
  });
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showTaskFeedback, setShowTaskFeedback] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allOrders, setAllOrders] = useState<Array<{ id: string; customer_name: string; service_type: string; scheduled_date: string; scheduled_time: string | null; status: string }>>([]);
  const [showDayOverlay, setShowDayOverlay] = useState(false);
  const [overlayDate, setOverlayDate] = useState<Date | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile?.shop_id) return;

    loadStats();
    loadAllOrders();

    const statsRefreshInterval = setInterval(() => {
      loadStats();
      loadAllOrders();
    }, 30000);

    return () => clearInterval(statsRefreshInterval);
  }, [profile?.shop_id]);

  useEffect(() => {
    if (!profile?.shop_id) return;

    loadTasks();

    // Subscribe to task changes with proper cleanup
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tasks',
          filter: `shop_id=eq.${profile.shop_id}`,
        },
        (payload) => {
          // Optimistic update based on event type
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === (payload.new as any).id ? payload.new as any : t));
          }
        }
      )
      .subscribe();

    // ✅ PROPER CLEANUP - prevents memory leak
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.shop_id]);

  async function loadTasks() {
    if (!profile?.shop_id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }


  async function loadStats() {
    if (!profile?.shop_id) return;

    try {
      const [customersRes, ordersRes, inventoryRes] = await Promise.all([
        supabase.from('customers').select('*').eq('shop_id', profile.shop_id),
        supabase.from('work_orders').select('*, total_amount, status, created_at, scheduled_date').eq('shop_id', profile.shop_id),
        supabase.from('inventory').select('quantity').eq('shop_id', profile.shop_id),
      ]);

      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];

      const totalInventoryCount = inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      const todayDateStr = today.toISOString().split('T')[0];

      const revenueToday = orders
        .filter((o: any) => {
          if (o.status !== 'completed' || !o.total_amount) return false;
          const orderDate = new Date(o.created_at);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === todayTimestamp;
        })
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

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

      const todayAppointments = orders.filter((o: any) => o.scheduled_date === todayDateStr).length;

      setStats({
        totalCustomers: customers.length,
        totalOrders: orders.length,
        completedOrders: orders.filter((o: any) => o.status === 'completed').length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
        revenueToday: revenueToday,
        revenueWeek: revenueWeek,
        lowStockItems: lowStock,
        totalInventory: totalInventoryCount,
        todayAppointments: todayAppointments
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadAllOrders() {
    if (!profile?.shop_id) return;

    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, scheduled_date, scheduled_time, service_type, status, customers(name)')
        .eq('shop_id', profile.shop_id)
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
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase().replace(/\s/g, '');
  };

  const addTask = async () => {
    if (!newTaskInput.trim() || !profile?.shop_id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tasks')
        .insert([
          {
            shop_id: profile.shop_id,
            user_id: user.id,
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
    const previousTasks = tasks;
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        setTasks(previousTasks);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting task:', error);
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

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-muted">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text mb-2">Profile Not Found</h2>
            <p className="text-text-muted">Please contact support to set up your shop profile.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Compact Header with Key Metrics */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Dashboard</h1>
            <p className="text-sm text-text mt-1" suppressHydrationWarning>
              {formatDate(time)} • {formatTime(time)}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-2">
            <Link href="/work-orders">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-highlight hover:text-text transition-colors cursor-pointer">
                <FileText size={16} />
                <span className="hidden sm:inline">New Order</span>
              </button>
            </Link>
            <Link href="/customers">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-highlight hover:text-text transition-colors cursor-pointer">
                <UserPlus size={16} />
                <span className="hidden sm:inline">Add Customer</span>
              </button>
            </Link>
            <Link href="/inventory">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-highlight hover:text-text transition-colors cursor-pointer">
                <Package size={16} />
                <span className="hidden sm:inline">Add Inventory</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - Centered data, semantic text colors, no icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg border border-border-muted rounded-lg p-6 text-center"
          >
            <p className="text-sm text-success uppercase tracking-wider mb-2">Today's Revenue</p>
            <p className="text-3xl font-bold text-text-muted">${stats.revenueToday.toFixed(0)}</p>
            <p className="text-xs text-text-muted mt-2">Week: ${stats.revenueWeek.toFixed(0)}</p>
          </motion.div>

          <Link href="/work-orders?status=pending">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <p className="text-sm text-warning uppercase tracking-wider mb-2">Pending Orders</p>
              <p className="text-3xl font-bold text-text-muted">{stats.pendingOrders}</p>
              <p className="text-xs text-text-muted mt-2">Needs attention</p>
            </motion.div>
          </Link>

          <Link href="/inventory?stock=low-stock">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <p className="text-sm text-danger uppercase tracking-wider mb-2">Low Stock Items</p>
              <p className="text-3xl font-bold text-text-muted">{stats.lowStockItems}</p>
              <p className="text-xs text-text-muted mt-2">Requires reorder</p>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-bg border border-border-muted rounded-lg p-6 text-center"
          >
            <p className="text-sm text-info uppercase tracking-wider mb-2">Today's Appointments</p>
            <p className="text-3xl font-bold text-text-muted">{stats.todayAppointments}</p>
            <p className="text-xs text-text-muted mt-2">Scheduled today</p>
          </motion.div>
        </div>

        {/* 2-Column Layout: Calendar Left, Quick Tasks Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-bg border border-border-muted rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Schedule</h3>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1.5 text-sm rounded-lg bg-bg-light text-text-muted hover:bg-primary hover:text-text-muted transition-colors"
              >
                Today
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2 rounded-lg text-text-muted hover:bg-bg-light transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h4 className="text-base font-semibold text-text">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2 rounded-lg text-text-muted hover:bg-bg-light transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-xs font-semibold text-text-muted pb-2">
                    {day}
                  </div>
                ))}
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);
                  const days = [];

                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day);
                    const isToday = isSameDay(currentDate, new Date());
                    const isSelected = isSameDay(currentDate, selectedDate);
                    const ordersOnThisDay = getOrdersOnDate(day, month, year);
                    const hasOrder = ordersOnThisDay.length > 0;
                    const isPast = isPastDate(currentDate);

                    days.push(
                      <button
                        key={day}
                        onClick={() => {
                          const clickedDate = new Date(year, month, day);
                          setSelectedDate(clickedDate);
                          setOverlayDate(clickedDate);
                          setShowDayOverlay(true);
                        }}
                        className={`aspect-square rounded-lg text-sm font-medium transition-all relative flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-text-muted shadow-md'
                            : isToday
                            ? 'bg-info/20 text-info ring-2 ring-info'
                            : isPast
                            ? 'text-text-muted/50 hover:bg-bg-light'
                            : 'text-text hover:bg-bg-light'
                        }`}
                      >
                        <span>{day}</span>
                        {hasOrder && (
                          <div
                            className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                              isSelected
                                ? 'bg-white'
                                : 'bg-primary'
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

            <div className="text-xs text-text-muted text-center pt-2 border-t border-border-muted">
              {allOrders.length} total appointments
            </div>
          </motion.div>

          {/* Quick Tasks Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-bg border border-border-muted rounded-lg p-6 flex flex-col"
          >
            <h3 className="text-lg font-semibold text-text mb-4">Quick Tasks</h3>

            {/* Compact Task List */}
            <div className="flex-1 overflow-y-auto space-y-1 mb-4" style={{ maxHeight: '300px' }}>
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex items-center gap-2 py-2 px-3 rounded-lg transition-all ${
                      task.completed
                        ? 'bg-bg-light opacity-60'
                        : 'hover:bg-bg-light'
                    }`}
                  >
                    <button
                      onClick={async () => {
                        const updatedCompleted = !task.completed;
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
                            setTasks(previousTasks);
                            throw error;
                          }
                        } catch (error) {
                          console.error('Error updating task:', error);
                        }
                      }}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 transition-all ${
                        task.completed
                          ? 'bg-primary border-primary'
                          : 'border-border-muted hover:border-primary'
                      }`}
                    >
                      {task.completed && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center"
                        >
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>

                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingTaskText}
                        onChange={(e) => setEditingTaskText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyPress(e, task.id)}
                        onBlur={() => saveEditedTask(task.id)}
                        autoFocus
                        className="flex-1 px-2 py-1 text-sm bg-bg-light border border-border-muted rounded text-text focus:outline-none focus:ring-2 focus:ring-highlight"
                      />
                    ) : (
                      <span className={`flex-1 text-sm ${
                        task.completed
                          ? 'line-through text-text-muted'
                          : 'text-text'
                      }`}>
                        {task.title}
                      </span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingTaskId === task.id ? (
                        <button
                          onClick={cancelEditingTask}
                          className="p-1 rounded hover:bg-danger/10 text-danger"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditingTask(task)}
                            className="p-1 rounded hover:bg-info/10 text-info"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded hover:bg-danger/10 text-danger"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredTasks.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-text-muted">
                  {taskFilter === 'active' ? 'No active tasks' : 'No completed tasks'}
                </div>
              )}
            </div>

            {/* Task Filter Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTaskFilter('active')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  taskFilter === 'active'
                    ? 'bg-primary text-text'
                    : 'bg-bg-light text-text-muted hover:bg-bg-light/80'
                }`}
              >
                Active ({tasks.filter(t => !t.completed).length})
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  taskFilter === 'completed'
                    ? 'bg-primary text-text'
                    : 'bg-bg-light text-text-muted hover:bg-bg-light/80'
                }`}
              >
                Done ({tasks.filter(t => t.completed).length})
              </button>
            </div>

            {/* Add Task Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyPress={handleTaskKeyPress}
                placeholder="Add a new task..."
                className="flex-1 px-3 py-2 rounded-lg bg-bg-light border border-border-muted text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-highlight text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTaskInput.trim()}
                className="px-3 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted disabled:opacity-50 disabled:hover:bg-bg-light transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Day Detail Dialog */}
      {overlayDate && (
        <Dialog open={showDayOverlay} onOpenChange={setShowDayOverlay}>
          <DialogContent className="max-w-2xl max-h-[85vh] bg-bg border-border-muted">
            <DialogHeader>
              <DialogTitle className="text-text">
                {isSameDay(overlayDate, new Date())
                  ? 'Today'
                  : overlayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </DialogTitle>
              <DialogDescription>
                {allOrders.filter(order => isSameDay(parseLocalDate(order.scheduled_date), overlayDate)).length} {allOrders.filter(order => isSameDay(parseLocalDate(order.scheduled_date), overlayDate)).length === 1 ? 'appointment' : 'appointments'}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[calc(85vh-120px)] pt-4">
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
                      <div className="p-4 rounded-full bg-bg-light mb-4">
                        <Clock size={32} className="text-text-muted" />
                      </div>
                      <p className="text-text font-medium text-sm">No appointments scheduled</p>
                      <p className="text-text-muted text-xs mt-1">This day is free</p>
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
                                ? 'bg-bg-light border-border-muted opacity-70 hover:opacity-90'
                                : 'bg-bg-light border-border-muted hover:bg-bg-light/80 hover:shadow-sm'
                            }`}
                          >
                            <div className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[56px] h-14 rounded-md border ${
                              isPastOrder || isCompleted
                                ? 'bg-bg border-border-muted'
                                : 'bg-primary/10 border-primary/30'
                            }`}>
                              <div className={`text-base font-bold leading-none ${
                                isPastOrder || isCompleted
                                  ? 'text-text-muted'
                                  : 'text-primary'
                              }`}>
                                {order.scheduled_time ? order.scheduled_time.slice(0, 5) : '--:--'}
                              </div>
                              <div className={`text-[9px] uppercase font-semibold mt-1 ${
                                isPastOrder || isCompleted
                                  ? 'text-text-muted'
                                  : 'text-primary'
                              }`}>
                                {order.scheduled_time && parseInt(order.scheduled_time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className={`text-sm font-semibold mb-0.5 ${
                                isPastOrder || isCompleted
                                  ? 'text-text-muted line-through'
                                  : 'text-text'
                              }`}>
                                {order.customer_name}
                              </h4>
                              <p className={`text-xs ${
                                isPastOrder || isCompleted
                                  ? 'text-text-muted'
                                  : 'text-text-muted'
                              }`}>
                                {order.service_type}
                              </p>
                            </div>

                            <div className="flex-shrink-0 flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                order.status === 'completed'
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : order.status === 'in_progress'
                                  ? 'bg-primary/20 text-primary border border-primary/30'
                                  : order.status === 'pending'
                                  ? 'bg-secondary/20 text-secondary border border-secondary/30'
                                  : order.status === 'cancelled'
                                  ? 'bg-danger/20 text-danger border border-danger/30'
                                  : 'bg-bg-light text-text-muted border border-border-muted'
                              }`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              <ChevronRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
