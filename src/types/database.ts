/**
 * Database types for the tire shop application
 * These types match the Supabase database schema
 */

// Base type for all database records
export interface BaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// Booking settings type
export interface BookingSettings {
  business_hours: {
    [key: string]: { open: string; close: string; enabled: boolean }
  };
  slot_duration: number;
  buffer_time: number;
  max_days_ahead: number;
  services: string[];
}

// Shop (tenant)
export interface Shop extends BaseRecord {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number;
  currency?: string;
  email_notifications?: boolean;
  low_stock_threshold?: number;
  onboarding_completed?: boolean;
  slug?: string;
  booking_enabled?: boolean;
  booking_settings?: BookingSettings;
}

// User profile
export interface Profile extends BaseRecord {
  user_id: string;
  shop_id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  avatar_url?: string;
}

// Customer
export interface Customer extends BaseRecord {
  shop_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tire_size?: string;
  notes?: string;
  order_count?: number;
}

// Inventory item (tire)
export interface InventoryItem extends BaseRecord {
  shop_id: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
  sku?: string;
  description?: string;
  min_quantity?: number;
}

// Work order status
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Work order service types
export type ServiceType =
  | 'Tire Installation'
  | 'Tire Rotation'
  | 'Tire Repair'
  | 'Wheel Alignment'
  | 'Tire Balance';

// Work order
export interface WorkOrder extends BaseRecord {
  shop_id: string;
  customer_id: string;
  tire_id?: string | null;
  status: WorkOrderStatus;
  service_type: ServiceType | string;
  scheduled_date: string;
  scheduled_time?: string | null;
  notes?: string;
  total_amount?: number | null;
}

// Work order with joined data
export interface WorkOrderWithDetails extends WorkOrder {
  customer?: Customer;
  tire?: InventoryItem;
  customer_name?: string;
  tire_info?: string;
}

// Work order item (for multi-tire orders)
export interface WorkOrderItem extends BaseRecord {
  work_order_id: string;
  tire_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Analytics types
export interface DashboardStats {
  totalCustomers: number;
  totalInventory: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  todayAppointments: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  count: number;
}

export interface PopularTire {
  name: string;
  count: number;
}

// Form data types
export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  tire_size: string;
  notes: string;
}

export interface InventoryFormData {
  brand: string;
  model: string;
  size: string;
  price: number;
  quantity: number;
  sku?: string;
  description?: string;
}

export interface WorkOrderFormData {
  customer_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  status: WorkOrderStatus;
}

// Pagination types
export interface PaginationState {
  currentPage: number;
  totalCount: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Sort types
export type SortDirection = 'asc' | 'desc';

export interface SortState<T extends string> {
  field: T;
  direction: SortDirection;
}

// Filter types for work orders
export interface WorkOrderFilters {
  status: string;
  serviceType: string;
  searchTerm: string;
  dateRange: string;
}

// Vehicle
export interface Vehicle extends BaseRecord {
  shop_id?: string;
  customer_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  tire_size: string | null;
  recommended_tire_size?: string;
  plate: string | null;
  vin: string | null;
  notes: string | null;
  customer?: Customer;
}

// Order items
export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  tire: {
    brand: string;
    model: string;
    size: string;
  } | null;
}

// Alternative Tire interface (alias for InventoryItem)
export type Tire = InventoryItem;
