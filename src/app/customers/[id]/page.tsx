'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Calendar, DollarSign, ClipboardList, ArrowLeft, Edit, Trash2, Plus, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  scheduled_time: string | null;
  status: string;
  total_amount: number | null;
  notes: string;
  tire_info?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const supabase = createClient();

  useEffect(() => {
    if (customerId && profile?.shop_id) {
      loadCustomerData();
    }
  }, [customerId, profile?.shop_id]);

  async function loadCustomerData() {
    if (!profile?.shop_id) return;

    try {
      // Load customer info - with shop_id verification
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('shop_id', profile.shop_id)
        .single();

      if (customerError) throw customerError;

      // Load work orders - with shop_id verification
      const { data: ordersData, error: ordersError } = await supabase
        .from('work_orders')
        .select('*, inventory(brand, model, size)')
        .eq('customer_id', customerId)
        .eq('shop_id', profile.shop_id)
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load customer data",
      });
    } finally {
      setLoading(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const completedOrders = workOrders.filter((o) => o.status === 'completed');
  const totalSpent = completedOrders
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const avgOrderValue = completedOrders.length > 0
    ? totalSpent / completedOrders.length
    : 0;

  const lastVisit = workOrders.length > 0
    ? new Date(workOrders[0].scheduled_date)
    : null;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  const handleEditClick = () => {
    setEditedCustomer(customer);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedCustomer(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editedCustomer || !profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editedCustomer.name,
          email: editedCustomer.email,
          phone: editedCustomer.phone,
          address: editedCustomer.address,
        })
        .eq('id', customerId)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      setCustomer(editedCustomer);
      setIsEditing(false);
      toast({
        title: "Success!",
        description: "Customer updated successfully",
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update customer",
      });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!profile?.shop_id) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer deleted successfully",
      });

      setTimeout(() => {
        router.push('/customers');
      }, 1000);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete customer",
      });
    }
  };

  const handleInputChange = (field: keyof Customer, value: string) => {
    if (editedCustomer) {
      setEditedCustomer({
        ...editedCustomer,
        [field]: value,
      });
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? workOrders
    : workOrders.filter(order => order.status === statusFilter);

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
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Home
          </Link>
          <ChevronRight size={16} />
          <Link href="/customers" className="hover:text-blue-600 dark:hover:text-blue-400">
            Customers
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 dark:text-white font-medium">{customer.name}</span>
        </div>

        {/* Header with Avatar */}
        <div className="card-glass p-6">
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ArrowLeft size={20} />
            Back to Customers
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Customer Avatar with Initials */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {getInitials(customer.name)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold dark:text-white">{customer.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">Customer Profile</p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleEditClick} variant="default" className="flex-1 sm:flex-none">
                <Edit size={18} className="mr-2" />
                Edit
              </Button>
              <Button onClick={() => setShowDeleteModal(true)} variant="destructive" className="flex-1 sm:flex-none">
                <Trash2 size={18} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <User className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-semibold dark:text-white">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail className="text-blue-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text">{customer.email || 'Not provided'}</p>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Mail size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="text-green-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text">{customer.phone}</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-green-600 dark:text-green-400 hover:underline cursor-pointer"
                  >
                    <Phone size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="text-red-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
                <p className="font-medium text-text">{customer.address || 'Not provided'}</p>
              </div>
            </div>

            {/* Customer Since */}
            <div className="flex items-start gap-3">
              <Calendar className="text-purple-400 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Since</p>
                <p className="font-medium text-text">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Compact Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="stats-card p-3 flex flex-col items-center text-center">
            <div className="p-2 rounded-lg bg-blue-500/20 mb-2">
              <ClipboardList className="text-blue-500" size={18} />
            </div>
            <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">{workOrders.length}</p>
            <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
          </div>

          <div className="stats-card p-3 flex flex-col items-center text-center">
            <div className="p-2 rounded-lg bg-green-500/20 mb-2">
              <DollarSign className="text-green-500" size={18} />
            </div>
            <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">${totalSpent.toFixed(2)}</p>
            <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
          </div>

          <div className="stats-card p-3 flex flex-col items-center text-center">
            <div className="p-2 rounded-lg bg-purple-500/20 mb-2">
              <TrendingUp className="text-purple-500" size={18} />
            </div>
            <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">${avgOrderValue.toFixed(2)}</p>
            <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Avg Order Value</p>
          </div>

          <div className="stats-card p-3 flex flex-col items-center text-center">
            <div className="p-2 rounded-lg bg-pink-500/20 mb-2">
              <Clock className="text-pink-500" size={18} />
            </div>
            <p className="text-base stat-number font-bold text-gray-900 dark:text-white mb-1">
              {lastVisit ? lastVisit.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
            </p>
            <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Last Visit</p>
          </div>
        </motion.div>

        {/* Work Orders Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card-glass p-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ClipboardList className="text-blue-400" size={20} />
              </div>
              <h2 className="text-xl font-semibold dark:text-white">Work Order History</h2>
            </div>
            <Link href="/work-orders">
              <Button>
                <Plus size={18} className="mr-2" />
                New Order
              </Button>
            </Link>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
                {status !== 'all' && (
                  <span className="ml-2 text-xs opacity-75">
                    ({workOrders.filter(o => o.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {statusFilter === 'all'
                ? 'No work orders yet for this customer'
                : `No ${statusFilter.replace('_', ' ')} orders`}
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"></div>

              <div className="space-y-6">
                {filteredOrders.map((order, index) => (
                  <Link key={order.id} href={`/work-orders`}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-12 cursor-pointer group"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        order.status === 'completed'
                          ? 'bg-green-500 border-green-400'
                          : order.status === 'in_progress'
                          ? 'bg-blue-500 border-blue-400'
                          : order.status === 'pending'
                          ? 'bg-yellow-500 border-yellow-400'
                          : 'bg-red-500 border-red-400'
                      }`}>
                        <ClipboardList size={14} className="text-white" />
                      </div>

                      {/* Order Card */}
                      <div className="bg-bg-light rounded-lg p-4 border border-border-muted hover:bg-bg transition-all group-hover:shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-text">{order.service_type}</h3>
                            <p className="text-sm text-text-muted">{order.tire_info}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${
                              statusColors[order.status as keyof typeof statusColors]
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-text-muted text-xs mb-1">Date</p>
                            <p className="font-medium text-text">
                              {new Date(order.scheduled_date).toLocaleDateString()}
                            </p>
                          </div>
                          {order.scheduled_time && (
                            <div>
                              <p className="text-text-muted text-xs mb-1">Time</p>
                              <p className="font-medium text-text">{formatTime(order.scheduled_time)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-text-muted text-xs mb-1">Amount</p>
                            <p className="font-medium text-text">
                              {order.total_amount ? `$${order.total_amount.toFixed(2)}` : 'Not set'}
                            </p>
                          </div>
                        </div>

                        {order.notes && (
                          <div className="mt-3 pt-3 border-t border-border-muted">
                            <p className="text-text-muted text-xs mb-1">Notes</p>
                            <p className="text-sm text-text">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update customer information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editedCustomer?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editedCustomer?.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editedCustomer?.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editedCustomer?.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                  <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                </div>
                Delete Customer?
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. This will permanently delete{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{customer.name}</span>{' '}
                and all associated data.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCustomer}
                  className="flex-1"
                >
                  Delete Customer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
