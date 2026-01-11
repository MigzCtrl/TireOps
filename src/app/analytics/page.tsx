'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, DollarSign, Users, Package, AlertTriangle, Award, ClipboardList, CheckCircle2, Loader2, XCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

interface Analytics {
  totalCustomers: number;
  totalWorkOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  lowStockItems: number;
  inventoryValue: number;
  recentOrders: any[];
  topCustomers: any[];
  popularTires: any[];
}

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export default function AnalyticsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allInventory, setAllInventory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.shop_id) return;
    loadData();
  }, [profile?.shop_id]);

  useEffect(() => {
    if (allOrders.length > 0 || allCustomers.length > 0 || allInventory.length > 0) {
      calculateAnalytics();
    }
  }, [timePeriod, allOrders, allCustomers, allInventory]);

  async function loadData() {
    if (!profile?.shop_id) return;

    try {
      const [customersRes, ordersRes, inventoryRes] = await Promise.all([
        supabase.from('customers').select('*').eq('shop_id', profile.shop_id),
        supabase
          .from('work_orders')
          .select('*, customers(name), inventory(brand, model, price), work_order_items(quantity, inventory(brand, model))')
          .eq('shop_id', profile.shop_id),
        supabase.from('inventory').select('*').eq('shop_id', profile.shop_id),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      setAllCustomers(customersRes.data || []);
      setAllOrders(ordersRes.data || []);
      setAllInventory(inventoryRes.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      });
    } finally {
      setLoading(false);
    }
  }

  function getDateRange(): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (timePeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all':
      default:
        start = new Date(0); // Beginning of time
        break;
    }

    return { start, end };
  }

  function calculateAnalytics() {
    const { start, end } = getDateRange();

    // Filter orders by time period
    const filteredOrders = allOrders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= start && orderDate <= end;
    });

    // Filter customers by time period
    const filteredCustomers = timePeriod === 'all'
      ? allCustomers
      : allCustomers.filter((customer: any) => {
          const joinDate = new Date(customer.created_at);
          return joinDate >= start && joinDate <= end;
        });

    // Calculate metrics
    const totalRevenue = filteredOrders
      .filter((o: any) => o.status === 'completed' && o.total_amount)
      .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

    const inventoryValue = allInventory.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const lowStockItems = allInventory.filter((item) => item.quantity < 10).length;

    // Top customers by order count with IDs
    const customerOrderCounts: any = {};
    filteredOrders.forEach((order: any) => {
      const customerId = order.customer_id;
      const customerName = order.customers?.name || 'Unknown';
      if (!customerOrderCounts[customerId]) {
        customerOrderCounts[customerId] = { id: customerId, name: customerName, count: 0 };
      }
      customerOrderCounts[customerId].count += 1;
    });

    const topCustomers = Object.values(customerOrderCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    // Popular tires by usage in orders (from work_order_items)
    const tireUsage: any = {};
    filteredOrders.forEach((order: any) => {
      // Check work_order_items first (new system)
      if (order.work_order_items && order.work_order_items.length > 0) {
        order.work_order_items.forEach((item: any) => {
          if (item.inventory) {
            const tireKey = `${item.inventory.brand} ${item.inventory.model}`;
            tireUsage[tireKey] = (tireUsage[tireKey] || 0) + (item.quantity || 1);
          }
        });
      }
      // Fallback to legacy tire_id (old system)
      else if (order.inventory) {
        const tireKey = `${order.inventory.brand} ${order.inventory.model}`;
        tireUsage[tireKey] = (tireUsage[tireKey] || 0) + 1;
      }
    });

    const popularTires = Object.entries(tireUsage)
      .map(([tire, count]) => ({ tire, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    // Recent orders (from filtered set)
    const recentOrders = [...filteredOrders]
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);

    setAnalytics({
      totalCustomers: filteredCustomers.length,
      totalWorkOrders: filteredOrders.length,
      pendingOrders: filteredOrders.filter((o: any) => o.status === 'pending').length,
      inProgressOrders: filteredOrders.filter((o: any) => o.status === 'in_progress').length,
      completedOrders: filteredOrders.filter((o: any) => o.status === 'completed').length,
      cancelledOrders: filteredOrders.filter((o: any) => o.status === 'cancelled').length,
      totalRevenue,
      lowStockItems,
      inventoryValue,
      recentOrders,
      topCustomers,
      popularTires,
    });
  }

  function getStatusBadge(status: string) {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
          <AlertTriangle size={12} />
          Pending
        </span>
      ),
      in_progress: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20">
          <Loader2 size={12} className="animate-spin" />
          In Progress
        </span>
      ),
      completed: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
          <CheckCircle2 size={12} />
          Completed
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          <XCircle size={12} />
          Cancelled
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.pending;
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-text">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text mb-2">Profile Not Found</h2>
            <p className="text-text-muted">Please contact support to set up your shop profile.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-text">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-text">Failed to load analytics</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text mb-2">Analytics</h1>
            <p className="text-sm text-text-muted">
              Business insights and performance metrics
            </p>
          </div>

          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[180px] bg-bg border-border">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics - Centered data, semantic text colors, no icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg border border-border-muted rounded-lg p-6 text-center"
          >
            <p className="text-sm text-success uppercase tracking-wider mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-text-muted">${analytics.totalRevenue.toFixed(0)}</p>
          </motion.div>

          <Link href="/customers">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-info uppercase tracking-wider mb-2">Total Customers</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.totalCustomers}</p>
            </motion.div>
          </Link>

          <Link href="/work-orders">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-primary uppercase tracking-wider mb-2">Work Orders</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.totalWorkOrders}</p>
            </motion.div>
          </Link>

          <Link href="/inventory">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-warning uppercase tracking-wider mb-2">Inventory Value</p>
              <p className="text-3xl font-bold text-text-muted">${analytics.inventoryValue.toFixed(0)}</p>
            </motion.div>
          </Link>
        </div>

        {/* Order Status Overview - Centered data, semantic text colors, no icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/work-orders?status=pending">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-warning uppercase tracking-wider mb-2">Pending</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.pendingOrders}</p>
            </motion.div>
          </Link>

          <Link href="/work-orders?status=in_progress">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-primary uppercase tracking-wider mb-2">In Progress</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.inProgressOrders}</p>
            </motion.div>
          </Link>

          <Link href="/work-orders?status=completed">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-success uppercase tracking-wider mb-2">Completed</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.completedOrders}</p>
            </motion.div>
          </Link>

          <Link href="/inventory?stock=low-stock">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-bg border border-border-muted rounded-lg p-6 text-center cursor-pointer hover:scale-105 transition-transform"
            >
              <p className="text-sm text-danger uppercase tracking-wider mb-2">Low Stock</p>
              <p className="text-3xl font-bold text-text-muted">{analytics.lowStockItems}</p>
            </motion.div>
          </Link>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-bg border border-border-muted rounded-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-info/10">
                <Award className="text-info" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-text">Top Customers</h3>
            </div>
            {analytics.topCustomers.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No customer data for this period
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.topCustomers.map((customer: any, index) => (
                  <Link
                    key={index}
                    href={`/customers/${customer.id}`}
                    className="flex items-center justify-between p-3 bg-bg-light rounded-lg hover:bg-bg-light/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-info text-text-muted rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-text">{customer.name}</span>
                    </div>
                    <span className="text-sm text-text-muted">
                      {customer.count} {customer.count === 1 ? 'order' : 'orders'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-bg border border-border-muted rounded-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="text-success" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-text">Popular Tires</h3>
            </div>
            {analytics.popularTires.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No tire usage data for this period
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.popularTires.map((item: any, index) => (
                  <Link
                    key={index}
                    href={`/inventory?search=${encodeURIComponent(item.tire)}`}
                    className="flex items-center justify-between p-3 bg-bg-light rounded-lg hover:bg-bg-light/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success text-text-muted rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-text">{item.tire}</span>
                    </div>
                    <span className="text-sm text-text-muted">
                      {item.count} {item.count === 1 ? 'order' : 'orders'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-bg border border-border-muted rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-border-muted">
            <h3 className="text-lg font-semibold text-text">Recent Work Orders</h3>
          </div>
          {analytics.recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted">No recent orders for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-light border-b border-border-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-bg divide-y divide-border-muted">
                  {analytics.recentOrders.map((order: any, index) => (
                    <tr
                      key={order.id}
                      className="hover:bg-bg-light transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.customer_id ? (
                          <Link
                            href={`/customers/${order.customer_id}`}
                            className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            {order.customers?.name || 'Unknown'}
                          </Link>
                        ) : (
                          <div className="text-sm font-medium text-text">
                            {order.customers?.name || 'Unknown'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">
                          {order.service_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">
                          {new Date(order.scheduled_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">
                          {order.total_amount ? `$${parseFloat(order.total_amount).toFixed(2)}` : '-'}
                        </div>
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
