'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePagination, useSort, useFilters, useModal } from '@/hooks';
import type { WorkOrderWithDetails, ShopService } from '@/types/database';
import type { SelectedTire } from '@/components/TireSelector';
import type { SelectedService } from '@/components/ServiceSelector';
import { WorkOrderList, WorkOrderForm, WorkOrderFilters, DoubleBookingDialog } from './_components';

const supabase = createClient();

interface CustomerBasic {
  id: string;
  name: string;
}

interface TireBasic {
  id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
}

type SortField = 'customer_name' | 'service_type' | 'scheduled_date' | 'status' | 'total_amount';

export default function WorkOrdersPage() {
  const { profile, shop, canEdit, canDelete, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Data state
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([]);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [tires, setTires] = useState<TireBasic[]>([]);
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const formModal = useModal<string | null>(); // editingOrderId
  const deleteModal = useModal<string>(); // orderToDelete
  const [showDoubleBookingWarning, setShowDoubleBookingWarning] = useState(false);
  const [conflictingOrders, setConflictingOrders] = useState<WorkOrderWithDetails[]>([]);

  // Form state
  const [selectedTires, setSelectedTires] = useState<SelectedTire[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [stockError, setStockError] = useState<string>('');
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    status: 'pending',
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  // Search hook
  const { filteredData: searchFilteredData, searchTerm, setSearchTerm } = useFilters(
    workOrders,
    (order, search) => {
      const searchLower = search.toLowerCase();
      return (
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.service_type.toLowerCase().includes(searchLower) ||
        (order.tire_info?.toLowerCase().includes(searchLower) || false)
      );
    }
  );

  // Apply custom filters (status, service type, date range)
  const customFilteredData = useMemo(() => {
    return searchFilteredData.filter((order) => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Service type filter
      if (serviceTypeFilter !== 'all' && order.service_type !== serviceTypeFilter) return false;

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
  }, [searchFilteredData, statusFilter, serviceTypeFilter, dateRangeFilter]);

  // Sort hook
  const { sortedData, sortField, sortDirection, toggleSort } = useSort<WorkOrderWithDetails, SortField>(
    customFilteredData,
    'scheduled_date',
    'desc'
  );

  // Pagination hook
  const {
    paginatedData,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    goToPage,
  } = usePagination(sortedData, 10);

  useEffect(() => {
    if (!profile?.shop_id) return;
    let isMounted = true;
    let inventoryChannel: any = null;

    const loadDataSafe = async () => {
      if (isMounted) await loadData();
    };
    loadDataSafe();

    // Realtime subscription for inventory
    const channelName = `work-orders-inventory-${profile.shop_id}`;
    inventoryChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `shop_id=eq.${profile.shop_id}`,
      }, (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'UPDATE') {
          setTires(prev => prev.map(t =>
            t.id === (payload.new as any).id
              ? { ...t, quantity: (payload.new as any).quantity }
              : t
          ));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      // CRITICAL FIX: Ensure channel cleanup
      if (inventoryChannel) {
        supabase.removeChannel(inventoryChannel);
      }
    };
  }, [profile?.shop_id]);

  async function loadData() {
    if (!profile?.shop_id) return;

    try {
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

      const [customersRes, tiresRes, servicesRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('shop_id', profile.shop_id).order('name'),
        supabase.from('inventory').select('id, brand, model, size, price, quantity').eq('shop_id', profile.shop_id).order('brand'),
        fetch('/api/services').then(r => r.json()),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (tiresRes.error) throw tiresRes.error;

      setCustomers(customersRes.data || []);
      setTires(tiresRes.data || []);
      setServices(servicesRes.services || []);
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
    // Tires subtotal
    const tiresSubtotal = selectedTires.reduce((sum, st) => sum + (st.quantity * st.tire.price), 0);

    // Services subtotals (taxable and non-taxable)
    let servicesSubtotal = 0;
    let taxableServicesSubtotal = 0;
    for (const ss of selectedServices) {
      const amount = ss.service.price * ss.quantity;
      servicesSubtotal += amount;
      if (ss.service.is_taxable) {
        taxableServicesSubtotal += amount;
      }
    }

    // Tax calculation (tires are taxable, services depend on is_taxable flag)
    const taxRate = shop?.tax_rate || 0;
    const taxableAmount = tiresSubtotal + taxableServicesSubtotal;
    const tax = taxableAmount * (taxRate / 100);

    const subtotal = tiresSubtotal + servicesSubtotal;
    const total = subtotal + tax;

    return { subtotal, tiresSubtotal, servicesSubtotal, tax, taxRate, total };
  }

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

      // Optimistic update - immediately update local state
      setTires(prev => prev.map(t =>
        t.id === tireId ? { ...t, quantity: t.quantity + quantityChange } : t
      ));
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inventory",
      });
    }
  }

  async function restoreCartInventory() {
    if (selectedTires.length === 0) return;
    for (const st of selectedTires) {
      await handleInventoryUpdate(st.tire.id, st.quantity);
    }
  }

  function checkForConflicts(): WorkOrderWithDetails[] {
    if (!formData.scheduled_date || !formData.scheduled_time) return [];

    const editingOrderId = formModal.data;

    // Normalize time format (strip seconds for comparison)
    const normalizeTime = (time: string | null | undefined) => {
      if (!time) return '';
      // Strip seconds: '14:00:00' -> '14:00'
      return time.substring(0, 5);
    };

    const formTime = normalizeTime(formData.scheduled_time);

    const conflicts = workOrders.filter(order => {
      const isSelf = editingOrderId && order.id === editingOrderId;
      const isCancelled = order.status === 'cancelled';
      const sameDate = order.scheduled_date === formData.scheduled_date;
      const sameTime = normalizeTime(order.scheduled_time) === formTime;
      const sameDateTime = sameDate && sameTime;

      if (isSelf) return false;
      if (isCancelled) return false;
      return sameDateTime;
    });

    return conflicts;
  }

  async function handleSubmit(e: React.FormEvent, skipWarning = false) {
    e.preventDefault();

    const editingOrderId = formModal.data;

    if (selectedTires.length === 0 && !editingOrderId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one tire to the order",
      });
      return;
    }

    if (!profile?.shop_id) return;

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

        if (updateError) throw updateError;

        if (selectedTires.length > 0) {
          await supabase.from('work_order_items').delete().eq('work_order_id', editingOrderId);

          const workOrderItems = selectedTires.map(st => ({
            work_order_id: editingOrderId,
            tire_id: st.tire.id,
            quantity: st.quantity,
            unit_price: st.tire.price,
            subtotal: st.quantity * st.tire.price,
          }));

          const { error: itemsError } = await supabase.from('work_order_items').insert(workOrderItems);
          if (itemsError) throw itemsError;
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

        if (orderError) throw orderError;

        const workOrderItems = selectedTires.map(st => ({
          work_order_id: insertedOrder.id,
          tire_id: st.tire.id,
          quantity: st.quantity,
          unit_price: st.tire.price,
          subtotal: st.quantity * st.tire.price,
        }));

        const { error: itemsError} = await supabase.from('work_order_items').insert(workOrderItems);
        if (itemsError) throw itemsError;

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
      setSelectedServices([]);
      await loadData();
      formModal.close();
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
    formModal.open(order.id);
    setFormData({
      customer_id: order.customer_id,
      service_type: order.service_type,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time || '',
      notes: order.notes || '',
      status: order.status,
    });

    if (profile?.shop_id) {
      const { data: items } = await supabase
        .from('work_order_items')
        .select('tire_id, quantity, unit_price, inventory(id, brand, model, size, price, quantity)')
        .eq('work_order_id', order.id);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.tire_id) {
            await handleInventoryUpdate(item.tire_id, item.quantity);
          }
        }

        const { data: updatedTires } = await supabase
          .from('inventory')
          .select('id, brand, model, size, price, quantity')
          .eq('shop_id', profile.shop_id)
          .order('brand');

        if (updatedTires) setTires(updatedTires);

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

        for (const st of existingTires) {
          await handleInventoryUpdate(st.tire.id, -st.quantity);
        }

        setSelectedTires(existingTires);
      } else {
        setSelectedTires([]);
      }
      // TODO: Load selected services when editing (need to store service line items in DB)
      setSelectedServices([]);
    }
  }

  async function cancelEdit() {
    await restoreCartInventory();
    formModal.close();
    setFormData({
      customer_id: '',
      service_type: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
      status: 'pending',
    });
    setSelectedTires([]);
    setSelectedServices([]);
  }

  async function updateStatus(id: string, newStatus: string) {
    if (!profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: newStatus === 'completed' ? "Order completed!" : "Status updated successfully",
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

  async function confirmDelete() {
    if (!deleteModal.data || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', deleteModal.data)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Work order deleted successfully",
      });
      deleteModal.close();
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

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(o => o.status === 'pending').length,
    inProgress: workOrders.filter(o => o.status === 'in_progress').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
  };

  if (authLoading || loading) {
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

          <Dialog open={formModal.isOpen} onOpenChange={(open) => open ? formModal.open(null) : formModal.close()}>
            <DialogTrigger asChild>
              <button
                disabled={!canEdit}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-light disabled:hover:text-text-muted"
              >
                <Plus size={20} />
                New Work Order
              </button>
            </DialogTrigger>
            <WorkOrderForm
              open={formModal.isOpen}
              onOpenChange={(open) => open ? formModal.open(formModal.data) : formModal.close()}
              editingId={formModal.data || null}
              formData={formData}
              onFormDataChange={setFormData}
              customers={customers}
              tires={tires}
              services={services}
              selectedTires={selectedTires}
              onSelectedTiresChange={setSelectedTires}
              selectedServices={selectedServices}
              onSelectedServicesChange={setSelectedServices}
              stockError={stockError}
              onStockError={setStockError}
              taxRate={shop?.tax_rate || 0}
              onSubmit={handleSubmit}
              onCancel={cancelEdit}
              onInventoryUpdate={handleInventoryUpdate}
            />
          </Dialog>
        </div>

        {/* Stats Cards */}
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

        {/* Filters */}
        <WorkOrderFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          serviceTypeFilter={serviceTypeFilter}
          onServiceTypeFilterChange={setServiceTypeFilter}
          dateRangeFilter={dateRangeFilter}
          onDateRangeFilterChange={setDateRangeFilter}
        />

        {/* Work Orders List */}
        <WorkOrderList
          orders={paginatedData}
          sortField={sortField}
          sortDirection={sortDirection}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={10}
          totalCount={totalItems}
          canEdit={canEdit}
          canDelete={canDelete}
          onSort={toggleSort}
          onPageChange={goToPage}
          onStatusChange={updateStatus}
          onEdit={startEditingOrder}
          onDelete={(id) => deleteModal.open(id)}
        />

        {/* Double-Booking Warning Dialog */}
        <DoubleBookingDialog
          open={showDoubleBookingWarning}
          onOpenChange={setShowDoubleBookingWarning}
          conflictingOrders={conflictingOrders}
          onChangeTime={() => setShowDoubleBookingWarning(false)}
          onScheduleAnyway={() => {
            setShowDoubleBookingWarning(false);
            handleSubmit({ preventDefault: () => {} } as React.FormEvent, true);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteModal.isOpen}
          onOpenChange={(open) => !open && deleteModal.close()}
        >
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
                Are you sure you want to delete this work order? This will permanently remove it from your records.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => deleteModal.close()}
                  className="flex-1 px-4 py-2 rounded-lg border border-border-muted text-text hover:bg-bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
