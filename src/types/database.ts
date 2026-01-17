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
  // Subscription fields
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | null;
  subscription_tier?: 'starter' | 'basic' | 'pro' | 'enterprise' | null; // 'basic' is legacy, maps to 'starter'
  subscription_id?: string | null;
  stripe_customer_id?: string | null;
  subscription_current_period_end?: string | null;
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

// ============ SERVICES SYSTEM ============

// Service category for organization
export type ServiceCategory =
  | 'installation'
  | 'maintenance'
  | 'repair'
  | 'tpms'
  | 'fees'
  | 'protection';

// How service is priced
export type ServicePriceType = 'per_tire' | 'flat' | 'per_unit';

// Shop service (editable by shop owner)
export interface ShopService extends BaseRecord {
  shop_id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  price_type: ServicePriceType;
  is_active: boolean;
  is_taxable: boolean;
  sort_order: number;
}

// Work order line item (products, services, fees)
export type LineItemType = 'product' | 'service' | 'fee';

export interface WorkOrderLineItem extends BaseRecord {
  work_order_id: string;
  item_type: LineItemType;
  item_id?: string; // Reference to tire or service
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_taxable: boolean;
}

// Service form data
export interface ServiceFormData {
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  price_type: ServicePriceType;
  is_active: boolean;
  is_taxable: boolean;
}

// Default services for new shops
export const DEFAULT_SERVICES: Omit<ShopService, 'id' | 'shop_id' | 'created_at' | 'updated_at'>[] = [
  // Installation Services
  { name: 'Mount & Balance', description: 'Mount tire on wheel and balance', category: 'installation', price: 20, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 1 },
  { name: 'Mount Only', description: 'Mount tire on wheel without balancing', category: 'installation', price: 12, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 2 },
  { name: 'Balance Only', description: 'Balance wheel', category: 'installation', price: 10, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 3 },
  { name: 'Dismount Only', description: 'Remove tire from wheel', category: 'installation', price: 8, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 4 },
  { name: 'Valve Stem', description: 'New rubber valve stem', category: 'installation', price: 3, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 5 },

  // Maintenance Services
  { name: 'Tire Rotation', description: 'Rotate tires to promote even wear', category: 'maintenance', price: 30, price_type: 'flat', is_active: true, is_taxable: true, sort_order: 10 },
  { name: 'Wheel Alignment - 2 Wheel', description: 'Front wheel alignment', category: 'maintenance', price: 80, price_type: 'flat', is_active: true, is_taxable: true, sort_order: 11 },
  { name: 'Wheel Alignment - 4 Wheel', description: 'Full four wheel alignment', category: 'maintenance', price: 120, price_type: 'flat', is_active: true, is_taxable: true, sort_order: 12 },
  { name: 'Tire Inspection', description: 'Visual inspection of tire condition', category: 'maintenance', price: 0, price_type: 'flat', is_active: true, is_taxable: false, sort_order: 13 },

  // Repair Services
  { name: 'Flat Repair - Plug', description: 'Plug repair for puncture', category: 'repair', price: 15, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 20 },
  { name: 'Flat Repair - Patch', description: 'Internal patch repair', category: 'repair', price: 25, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 21 },
  { name: 'Flat Repair - Patch/Plug', description: 'Combination patch and plug repair', category: 'repair', price: 30, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 22 },
  { name: 'Bead Seal', description: 'Seal bead area for slow leak', category: 'repair', price: 20, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 23 },

  // TPMS Services
  { name: 'TPMS Service Kit', description: 'Valve core, seal, cap replacement', category: 'tpms', price: 5, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 30 },
  { name: 'TPMS Reprogram', description: 'Reprogram sensor to vehicle', category: 'tpms', price: 10, price_type: 'per_unit', is_active: true, is_taxable: true, sort_order: 31 },
  { name: 'TPMS Sensor Replace', description: 'Install new TPMS sensor', category: 'tpms', price: 50, price_type: 'per_unit', is_active: true, is_taxable: true, sort_order: 32 },

  // Fees
  { name: 'Tire Disposal', description: 'State-required disposal fee', category: 'fees', price: 3, price_type: 'per_tire', is_active: true, is_taxable: false, sort_order: 40 },
  { name: 'Environmental Fee', description: 'Environmental handling fee', category: 'fees', price: 2, price_type: 'per_tire', is_active: true, is_taxable: false, sort_order: 41 },

  // Protection Plans
  { name: 'Road Hazard Protection', description: '2-year road hazard warranty', category: 'protection', price: 25, price_type: 'per_tire', is_active: true, is_taxable: true, sort_order: 50 },
];
