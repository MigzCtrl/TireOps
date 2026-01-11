'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer, WorkOrder as BaseWorkOrder, Vehicle } from '@/types/database';
import { CustomerHeader } from './_components/CustomerHeader';
import { ContactInfo } from './_components/ContactInfo';
import { VehiclesList } from './_components/VehiclesList';
import { OrderHistory } from './_components/OrderHistory';
import { VehicleFormDialog } from './_components/VehicleFormDialog';
import { EditCustomerDialog } from './_components/EditCustomerDialog';
import { DeleteCustomerDialog } from './_components/DeleteCustomerDialog';

// Extended WorkOrder type with tire_info for display
interface WorkOrder extends BaseWorkOrder {
  tire_info?: string;
}

// Common tire sizes by vehicle type (simplified lookup)
const TIRE_SIZE_SUGGESTIONS: Record<string, string[]> = {
  // Sedans
  'sedan': ['205/55R16', '215/55R17', '225/45R18', '235/40R19'],
  // SUVs
  'suv': ['235/65R17', '245/60R18', '255/55R19', '265/50R20', '275/45R21'],
  // Trucks
  'truck': ['265/70R17', '275/65R18', '285/60R20', '275/55R20', '33X12.50R20'],
  // Sports cars
  'sports': ['225/40R18', '245/35R19', '255/35R19', '275/30R20', '295/30R20'],
  // Compact
  'compact': ['185/65R15', '195/65R15', '205/55R16', '215/50R17'],
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    year: '',
    make: '',
    model: '',
    trim: '',
    recommended_tire_size: '',
    notes: '',
  });
  const [suggestedSizes, setSuggestedSizes] = useState<string[]>([]);

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

      // Load vehicles for this customer
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      // Vehicles table might not exist yet, so handle gracefully
      if (vehiclesError && vehiclesError.code !== '42P01') {
        console.error('Error loading vehicles:', vehiclesError);
      }

      const ordersWithTireInfo = ordersData.map((order: any) => ({
        ...order,
        tire_info: order.inventory
          ? `${order.inventory.brand} ${order.inventory.model} (${order.inventory.size})`
          : 'No tire specified',
      }));

      setCustomer(customerData);
      setWorkOrders(ordersWithTireInfo);
      setVehicles(vehiclesData || []);
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

  const completedOrders = workOrders.filter((o) => o.status === 'completed');
  const totalSpent = completedOrders
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const avgOrderValue = completedOrders.length > 0
    ? totalSpent / completedOrders.length
    : 0;

  const lastVisit = workOrders.length > 0
    ? new Date(workOrders[0].scheduled_date)
    : null;

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

  // Vehicle management functions
  const getSuggestedTireSizes = (make: string, model: string) => {
    const makeLower = make.toLowerCase();
    const modelLower = model.toLowerCase();

    // Simple heuristic based on common vehicle types
    if (modelLower.includes('truck') || modelLower.includes('f-150') || modelLower.includes('silverado') || modelLower.includes('ram') || modelLower.includes('tundra') || modelLower.includes('titan')) {
      return TIRE_SIZE_SUGGESTIONS['truck'];
    }
    if (modelLower.includes('suv') || modelLower.includes('explorer') || modelLower.includes('tahoe') || modelLower.includes('4runner') || modelLower.includes('pilot') || modelLower.includes('highlander') || modelLower.includes('cx-') || modelLower.includes('rav4') || modelLower.includes('cr-v')) {
      return TIRE_SIZE_SUGGESTIONS['suv'];
    }
    if (modelLower.includes('mustang') || modelLower.includes('camaro') || modelLower.includes('corvette') || modelLower.includes('charger') || modelLower.includes('challenger') || modelLower.includes('gt') || modelLower.includes('911')) {
      return TIRE_SIZE_SUGGESTIONS['sports'];
    }
    if (modelLower.includes('civic') || modelLower.includes('corolla') || modelLower.includes('mazda3') || modelLower.includes('focus') || modelLower.includes('golf') || modelLower.includes('jetta')) {
      return TIRE_SIZE_SUGGESTIONS['compact'];
    }
    // Default to sedan sizes
    return TIRE_SIZE_SUGGESTIONS['sedan'];
  };

  const handleVehicleFormChange = (field: string, value: string) => {
    setVehicleForm(prev => ({ ...prev, [field]: value }));

    // Update tire size suggestions when make/model changes
    if (field === 'make' || field === 'model') {
      const make = field === 'make' ? value : vehicleForm.make;
      const model = field === 'model' ? value : vehicleForm.model;
      if (make && model) {
        setSuggestedSizes(getSuggestedTireSizes(make, model));
      }
    }
  };

  const openVehicleForm = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        year: vehicle.year?.toString() || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        trim: vehicle.trim || '',
        recommended_tire_size: vehicle.recommended_tire_size || '',
        notes: vehicle.notes || '',
      });
      if (vehicle.make && vehicle.model) {
        setSuggestedSizes(getSuggestedTireSizes(vehicle.make, vehicle.model));
      }
    } else {
      setEditingVehicle(null);
      setVehicleForm({
        year: '',
        make: '',
        model: '',
        trim: '',
        recommended_tire_size: '',
        notes: '',
      });
      setSuggestedSizes([]);
    }
    setShowVehicleForm(true);
  };

  const closeVehicleForm = () => {
    setShowVehicleForm(false);
    setEditingVehicle(null);
    setVehicleForm({
      year: '',
      make: '',
      model: '',
      trim: '',
      recommended_tire_size: '',
      notes: '',
    });
    setSuggestedSizes([]);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.year || !vehicleForm.make || !vehicleForm.model) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Year, Make, and Model are required",
      });
      return;
    }

    try {
      const vehicleData = {
        customer_id: customerId,
        year: parseInt(vehicleForm.year),
        make: vehicleForm.make.trim(),
        model: vehicleForm.model.trim(),
        trim: vehicleForm.trim.trim() || null,
        recommended_tire_size: vehicleForm.recommended_tire_size.trim() || null,
        notes: vehicleForm.notes.trim() || null,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('customer_vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Vehicle updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('customer_vehicles')
          .insert([vehicleData]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Vehicle added successfully",
        });
      }

      closeVehicleForm();
      loadCustomerData();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message?.includes('customer_vehicles')
          ? "Please run database migration to enable vehicle tracking"
          : "Failed to save vehicle",
      });
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from('customer_vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Vehicle deleted successfully",
      });
      loadCustomerData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete vehicle",
      });
    }
  };

  // Early return while auth is loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-muted">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

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
        <CustomerHeader
          customer={customer}
          onEdit={handleEditClick}
          onDelete={() => setShowDeleteModal(true)}
        />

        <ContactInfo customer={customer} />

        <VehiclesList
          vehicles={vehicles}
          onAddVehicle={() => openVehicleForm()}
          onEditVehicle={openVehicleForm}
          onDeleteVehicle={handleDeleteVehicle}
        />

        <OrderHistory
          workOrders={workOrders}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalSpent={totalSpent}
          avgOrderValue={avgOrderValue}
          lastVisit={lastVisit}
        />

        <EditCustomerDialog
          isOpen={isEditing}
          customer={editedCustomer}
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          onInputChange={handleInputChange}
        />

        <DeleteCustomerDialog
          isOpen={showDeleteModal}
          customer={customer}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCustomer}
        />

        <VehicleFormDialog
          isOpen={showVehicleForm}
          editingVehicle={editingVehicle}
          vehicleForm={vehicleForm}
          suggestedSizes={suggestedSizes}
          onClose={closeVehicleForm}
          onSave={handleSaveVehicle}
          onFormChange={handleVehicleFormChange}
        />
      </div>
    </DashboardLayout>
  );
}
