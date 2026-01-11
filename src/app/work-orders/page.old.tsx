'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Plus, Calendar, Clock, Trash2, Edit, Search, Eye, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2, XCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import DateTimePicker from '@/components/DateTimePicker';
import TireSelector, { type SelectedTire } from '@/components/TireSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkOrderWithDetails } from '@/types/database';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

// Minimal customer type for dropdown
interface CustomerBasic {
  id: string;
  name: string;
}

// Minimal tire type for dropdown and cart
interface TireBasic {
  id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
}

type SortField = 'customer_name' | 'service_type' | 'scheduled_date' | 'status' | 'total_amount';
type SortDirection = 'asc' | 'desc';

export default function WorkOrdersPage() {
  const { profile, shop, canEdit, canDelete, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([]);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [tires, setTires] = useState<TireBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedTires, setSelectedTires] = useState<SelectedTire[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [stockError, setStockError] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('scheduled_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  // Double-booking warning state
  const [showDoubleBookingWarning, setShowDoubleBookingWarning] = useState(false);
  const [conflictingOrders, setConflictingOrders] = useState<WorkOrderWithDetails[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    status: 'pending',
  });

  useEffect(() => {
    if (!profile?.shop_id) return;

    let isMounted = true;

    const loadDataSafe = async () => {
      if (isMounted) {
        loadData();
      }
    };

    loadDataSafe();

    // UNIQUE channel name to prevent collisions with inventory page
    const channelName = `work-orders-inventory-${profile.shop_id}`;

    const inventoryChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `shop_id=eq.${profile.shop_id}`,
        },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'UPDATE') {
            setTires(prev => prev.map(t =>
              t.id === (payload.new as any).id
                ? { ...t, quantity: (payload.new as any).quantity }
                : t
            ));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(inventoryChannel);
    };
  }, [profile?.shop_id]);

  async function loadData() {
    if (!profile?.shop_id) return;

    try {
      // ✅ SINGLE OPTIMIZED QUERY (instead of 3 separate queries)
      const { data: orders, error: ordersError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:customers!inner(id, name, email, phone),
          tire:inventory(id, brand, model, size, price),
          work_order_items(id, tire_id, quantity, inventory(brand, model, size))
        `)
        .eq('shop_id', profile.shop_id)
        .order('scheduled_date', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithNames = (orders || []).map((order: any) => ({
        ...order,
        customer_name: order.customer?.name || 'Unknown',
        tire_info: order.work_order_items && order.work_order_items.length > 0
          ? order.work_order_items.map((item: any) =>
              item.inventory ? `${item.inventory.brand} ${item.inventory.model} x${item.quantity}` : ''
            ).filter(Boolean).join(', ') || 'No tire selected'
          : order.tire
            ? `${order.tire.brand} ${order.tire.model} (${order.tire.size})`
            : 'No tire selected',
      }));

      setWorkOrders(ordersWithNames);

      // Load customers and tires for the form dropdowns (filtered by shop)
      const [customersRes, tiresRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('shop_id', profile.shop_id).order('name'),
        supabase.from('inventory').select('id, brand, model, size, price, quantity').eq('shop_id', profile.shop_id).order('brand'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (tiresRes.error) throw tiresRes.error;

      setCustomers(customersRes.data || []);
      setTires(tiresRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load work orders data",
      });
    } finally {
      setLoading(false);
    }
  }

  function calculateTotal() {
    const subtotal = selectedTires.reduce((sum, st) => sum + (st.quantity * st.tire.price), 0);
    const taxRate = shop?.tax_rate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, taxRate, total };
  }

  // Update inventory atomically (prevents race conditions)
  async function handleInventoryUpdate(tireId: string, quantityChange: number) {
    if (!profile?.shop_id) return;

    try {
      const { data, error } = await supabase.rpc('update_inventory_atomic', {
        p_tire_id: tireId,
        p_quantity_change: quantityChange,
        p_shop_id: profile.shop_id
      });

      if (error) throw error;

      if (data && data[0] && !data[0].success) {
        throw new Error(data[0].error_message || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inventory",
      });
    }
  }

  // Restore inventory when canceling edit (for items that were in the original order)
  async function restoreCartInventory() {
    if (selectedTires.length === 0) return;

    for (const st of selectedTires) {
      await handleInventoryUpdate(st.tire.id, st.quantity);
    }
  }

  // Check for conflicting appointments at the same date/time
  function checkForConflicts(): WorkOrderWithDetails[] {
    if (!formData.scheduled_date || !formData.scheduled_time) return [];

    return workOrders.filter(order => {
      // Skip the order being edited
      if (editingOrderId && order.id === editingOrderId) return false;
      // Skip cancelled orders
      if (order.status === 'cancelled') return false;
      // Check if same date and time
      return order.scheduled_date === formData.scheduled_date &&
             order.scheduled_time === formData.scheduled_time;
    });
  }

  async function handleSubmit(e: React.FormEvent, skipWarning = false) {
    e.preventDefault();

    if (selectedTires.length === 0 && !editingOrderId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one tire to the order",
      });
      return;
    }

    if (!profile?.shop_id) return;

    // Check for double-booking conflicts (unless user already acknowledged)
    if (!skipWarning && formData.scheduled_time) {
      const conflicts = checkForConflicts();
      if (conflicts.length > 0) {
        setConflictingOrders(conflicts);
        setShowDoubleBookingWarning(true);
        return;
      }
    }

    try {
      const totals = selectedTires.length > 0 ? calculateTotal() : null;
      const totalAmount = totals?.total || null;

      if (editingOrderId) {
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
          .eq('id', editingOrderId)
          .eq('shop_id', profile.shop_id);

        if (updateError) {
          console.error('Order update error:', updateError);
          throw updateError;
        }

        if (selectedTires.length > 0) {
          await supabase
            .from('work_order_items')
            .delete()
            .eq('work_order_id', editingOrderId);

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

        toast({
          title: "Success!",
          description: "Work order updated successfully",
        });
      } else {
        const orderData = {
          customer_id: formData.customer_id || null,
          service_type: formData.service_type,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          notes: formData.notes || null,
          total_amount: totalAmount,
          status: 'pending',
          tire_id: null,
          shop_id: profile.shop_id,
        };
        const { data: insertedOrder, error: orderError } = await supabase
          .from('work_orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        const workOrderItems = selectedTires.map(st => ({
          work_order_id: insertedOrder.id,
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

          if (itemsError.message?.includes('relation "work_order_items" does not exist')) {
            toast({
              variant: "destructive",
              title: "Database Setup Required",
              description: "Please run the migration SQL in your Supabase dashboard",
            });
            console.log('=== MIGRATION REQUIRED ===');
            console.log('Go to your Supabase Dashboard > SQL Editor and run the migration file:');
            console.log('Location: D:\\Tire-Shop-MVP\\supabase\\migrations\\add_work_order_items.sql');
          }
          throw itemsError;
        }

        toast({
          title: "Success!",
          description: "Work order created successfully",
        });
      }

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
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingOrderId ? 'update' : 'create'} work order`,
      });
    }
  }

  async function startEditingOrder(order: WorkOrderWithDetails) {
    setEditingOrderId(order.id);
    setFormData({
      customer_id: order.customer_id,
      service_type: order.service_type,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time || '',
      notes: order.notes || '',
      status: order.status,
    });

    // Load existing work order items for the cart
    if (profile?.shop_id) {
      const { data: items } = await supabase
        .from('work_order_items')
        .select('tire_id, quantity, unit_price, inventory(id, brand, model, size, price, quantity)')
        .eq('work_order_id', order.id);

      if (items && items.length > 0) {
        // First, restore inventory for original order items so user sees full available stock
        for (const item of items) {
          if (item.tire_id) {
            await handleInventoryUpdate(item.tire_id, item.quantity);
          }
        }

        // Reload tires to get updated quantities
        const { data: updatedTires } = await supabase
          .from('inventory')
          .select('id, brand, model, size, price, quantity')
          .eq('shop_id', profile.shop_id)
          .order('brand');

        if (updatedTires) {
          setTires(updatedTires);
        }

        const existingTires: SelectedTire[] = items
          .filter((item: any) => item.inventory)
          .map((item: any) => {
            const updatedTire = updatedTires?.find(t => t.id === item.inventory.id);
            return {
              tire: {
                id: item.inventory.id,
                brand: item.inventory.brand,
                model: item.inventory.model,
                size: item.inventory.size,
                price: item.unit_price || item.inventory.price,
                quantity: updatedTire?.quantity || item.inventory.quantity + item.quantity,
              },
              quantity: item.quantity,
            };
          });

        // Now decrement inventory for items going into cart
        for (const st of existingTires) {
          await handleInventoryUpdate(st.tire.id, -st.quantity);
        }

        setSelectedTires(existingTires);
      } else {
        setSelectedTires([]);
      }
    }

    setShowForm(true);
  }

  async function cancelEdit() {
    // Restore inventory for items in cart
    await restoreCartInventory();

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
    if (!profile?.shop_id) return;

    try {
      // Direct status update - inventory is already updated when adding to cart
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: newStatus === 'completed'
          ? "Order completed!"
          : "Status updated successfully",
      });

      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status",
      });
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
    if (!orderToDelete || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', orderToDelete)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Work order deleted successfully",
      });
      closeDeleteModal();
      loadData();
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete work order",
      });
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
          <AlertCircle size={12} />
          Pending
        </span>
      ),
      in_progress: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
          <Loader2 size={12} className="animate-spin" />
          In Progress
        </span>
      ),
      completed: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
          <CheckCircle2 size={12} />
          Completed
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger border border-danger/30">
          <XCircle size={12} />
          Cancelled
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.pending;
  }

  // Filter work orders
  const filteredWorkOrders = workOrders.filter((order) => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    // Service type filter
    if (serviceTypeFilter !== 'all' && order.service_type !== serviceTypeFilter) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesCustomer = order.customer_name?.toLowerCase().includes(search);
      const matchesService = order.service_type.toLowerCase().includes(search);
      const matchesTire = order.tire_info?.toLowerCase().includes(search);
      if (!matchesCustomer && !matchesService && !matchesTire) return false;
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const orderDate = new Date(order.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateRangeFilter === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (orderDate < today || orderDate >= tomorrow) return false;
      } else if (dateRangeFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        if (orderDate < today || orderDate >= weekFromNow) return false;
      } else if (dateRangeFilter === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        if (orderDate < today || orderDate >= monthFromNow) return false;
      } else if (dateRangeFilter === 'past') {
        if (orderDate >= today) return false;
      }
    }

    return true;
  });

  // Sort work orders
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Convert to comparable values
    if (sortField === 'scheduled_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, serviceTypeFilter, searchTerm, dateRangeFilter, sortField, sortDirection]);

  // Paginate sorted work orders
  const totalFilteredCount = sortedWorkOrders.length;
  const totalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE);
  const paginatedWorkOrders = sortedWorkOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(o => o.status === 'pending').length,
    inProgress: workOrders.filter(o => o.status === 'in_progress').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
  };

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
          <div className="text-xl text-text">Loading...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-text mb-2">Work Orders</h1>
            <p className="text-sm text-text-muted">
              Manage service appointments and work orders
            </p>
          </div>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <button
                disabled={!canEdit}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
              >
                <Plus size={20} />
                New Work Order
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOrderId ? 'Edit Work Order' : 'New Work Order'}
                </DialogTitle>
                <DialogDescription>
                  {editingOrderId ? 'Update the work order details below.' : 'Create a new work order for a customer.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Basic Info Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-text uppercase tracking-wide mb-4">
                        Basic Information
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer">Customer *</Label>
                          <Select
                            value={formData.customer_id}
                            onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                          >
                            <SelectTrigger id="customer">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="service_type">Service Type *</Label>
                          <Select
                            value={formData.service_type}
                            onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                          >
                            <SelectTrigger id="service_type">
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Tire Installation">Tire Installation</SelectItem>
                              <SelectItem value="Tire Rotation">Tire Rotation</SelectItem>
                              <SelectItem value="Tire Repair">Tire Repair</SelectItem>
                              <SelectItem value="Wheel Alignment">Wheel Alignment</SelectItem>
                              <SelectItem value="Tire Balance">Tire Balance</SelectItem>
                            </SelectContent>
                          </Select>
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
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any special instructions or notes..."
                        className="w-full h-24 px-3 py-2 rounded-lg border border-border-muted bg-bg-light text-text text-sm focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent transition-shadow resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Right Column - Tire Selection */}
                  <div>
                    <AnimatePresence>
                      {stockError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30"
                        >
                          <p className="text-sm font-medium text-danger">{stockError}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <TireSelector
                      tires={tires}
                      selectedTires={selectedTires}
                      onTiresChange={setSelectedTires}
                      customerTireSize=""
                      onStockError={(message) => {
                        setStockError(message);
                        setTimeout(() => setStockError(''), 5000);
                      }}
                      onInventoryUpdate={handleInventoryUpdate}
                    />
                  </div>
                </div>

                {/* Order Summary with Tax */}
                {selectedTires.length > 0 && (
                  <div className="p-4 rounded-lg bg-bg-light border border-border-muted">
                    <h4 className="text-sm font-semibold text-text mb-3">Order Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Subtotal</span>
                        <span className="text-text">${calculateTotal().subtotal.toFixed(2)}</span>
                      </div>
                      {calculateTotal().taxRate > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Tax ({calculateTotal().taxRate}%)</span>
                          <span className="text-text">${calculateTotal().tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold pt-2 border-t border-border-muted">
                        <span className="text-text">Total</span>
                        <span className="text-primary">${calculateTotal().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-muted">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="sm:flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sm:flex-1 px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
                  >
                    {editingOrderId ? 'Update Work Order' : 'Create Work Order'}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards - Centered data, semantic text colors, no icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg border border-border-muted rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 text-center"
          >
            <p className="text-sm text-info uppercase tracking-wider mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-text-muted">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg border border-border-muted rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 text-center"
          >
            <p className="text-sm text-warning uppercase tracking-wider mb-2">Pending</p>
            <p className="text-3xl font-bold text-text-muted">{stats.pending}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg border border-border-muted rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 text-center"
          >
            <p className="text-sm text-primary uppercase tracking-wider mb-2">In Progress</p>
            <p className="text-3xl font-bold text-text-muted">{stats.inProgress}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-bg border border-border-muted rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 text-center"
          >
            <p className="text-sm text-success uppercase tracking-wider mb-2">Completed</p>
            <p className="text-3xl font-bold text-text-muted">{stats.completed}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="bg-bg border border-border-muted rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
              <Input
                type="text"
                placeholder="Search customer, service, tire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-bg-light border-border-muted"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-bg-light border-border-muted">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="bg-bg-light border-border-muted">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="Tire Installation">Tire Installation</SelectItem>
                <SelectItem value="Tire Rotation">Tire Rotation</SelectItem>
                <SelectItem value="Tire Repair">Tire Repair</SelectItem>
                <SelectItem value="Wheel Alignment">Wheel Alignment</SelectItem>
                <SelectItem value="Tire Balance">Tire Balance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="bg-bg-light border-border-muted">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
                <SelectItem value="past">Past Orders</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Work Orders Table */}
        <div className="bg-bg border border-border-muted rounded-lg shadow-md overflow-hidden">
          {paginatedWorkOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted">
                {workOrders.length === 0
                  ? 'No work orders yet. Click "New Work Order" to get started.'
                  : 'No work orders match your filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-light border-b border-border-muted">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                      onClick={() => handleSort('customer_name')}
                    >
                      <div className="flex items-center gap-2">
                        Customer
                        {sortField === 'customer_name' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                      onClick={() => handleSort('service_type')}
                    >
                      <div className="flex items-center gap-2">
                        Service Type
                        {sortField === 'service_type' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                      onClick={() => handleSort('scheduled_date')}
                    >
                      <div className="flex items-center gap-2">
                        Scheduled
                        {sortField === 'scheduled_date' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                      onClick={() => handleSort('total_amount')}
                    >
                      <div className="flex items-center gap-2">
                        Amount
                        {sortField === 'total_amount' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-bg divide-y divide-border-muted">
                  {paginatedWorkOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className="hover:bg-bg-light transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">{order.customer_name}</div>
                        <div className="text-xs text-text-muted">{order.tire_info}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">{order.service_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">
                          {new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString()}
                        </div>
                        {order.scheduled_time && (
                          <div className="text-xs text-text-muted">{formatTime(order.scheduled_time)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={order.status}
                          onValueChange={(newStatus) => updateStatus(order.id, newStatus)}
                        >
                          <SelectTrigger className="w-[160px] h-7 text-xs border-0 shadow-none px-2 gap-4 hover:bg-transparent">
                            <div>{getStatusBadge(order.status)}</div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">
                          {order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/work-orders/${order.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-text-muted hover:text-text hover:bg-bg-light"
                            >
                              <Eye size={16} />
                            </Button>
                          </Link>
                          <Link href={`/invoice/${order.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-info hover:bg-info/10"
                              title="View Invoice"
                            >
                              <FileText size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canEdit}
                            onClick={() => startEditingOrder(order)}
                            className="h-8 w-8 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canDelete}
                            onClick={() => openDeleteModal(order.id)}
                            className="h-8 w-8 text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalFilteredCount > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-muted">
              <div className="text-sm text-text-muted">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredCount)} of {totalFilteredCount} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                <span className="text-sm text-text-muted px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteModalOpen && (
          <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-danger/20">
                    <Trash2 size={20} className="text-danger" />
                  </div>
                  Delete Work Order?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-text-muted">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDeleteModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmDelete}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Double-Booking Warning Dialog */}
        {showDoubleBookingWarning && (
          <Dialog open={showDoubleBookingWarning} onOpenChange={setShowDoubleBookingWarning}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-warning/20">
                    <AlertCircle size={20} className="text-warning" />
                  </div>
                  Schedule Conflict
                </DialogTitle>
                <DialogDescription>
                  There {conflictingOrders.length === 1 ? 'is' : 'are'} already {conflictingOrders.length} appointment{conflictingOrders.length !== 1 ? 's' : ''} scheduled at this time.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {conflictingOrders.map(order => (
                    <div key={order.id} className="p-3 bg-bg-light rounded-lg border border-border-muted">
                      <p className="font-medium text-text text-sm">{order.customer_name}</p>
                      <p className="text-xs text-text-muted">{order.service_type.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-text-muted">
                  Do you still want to schedule this appointment at the same time?
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDoubleBookingWarning(false)}
                    className="flex-1"
                  >
                    Change Time
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      setShowDoubleBookingWarning(false);
                      handleSubmit(e as any, true);
                    }}
                    className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
                  >
                    Schedule Anyway
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
