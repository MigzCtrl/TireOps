// Type definitions for the Tire Shop MVP application

export type UserRole = 'owner' | 'staff';
export type WorkOrderStatus = 'scheduled' | 'in_progress' | 'done' | 'cancelled';
export type LineType = 'tire' | 'service';

export interface Profile {
  id: string;
  shop_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  shop_id: string;
  customer_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  tire_size: string | null;
  plate: string | null;
  vin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface InventoryItem {
  id: string;
  shop_id: string;
  sku: string | null;
  brand: string;
  model: string;
  size: string;
  qty_on_hand: number;
  cost: number | null;
  price: number;
  supplier: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  shop_id: string;
  customer_id: string;
  vehicle_id: string | null;
  status: WorkOrderStatus;
  scheduled_at: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  lines?: WorkOrderLine[];
}

export interface WorkOrderLine {
  id: string;
  work_order_id: string;
  type: LineType;
  inventory_item_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface WorkOrderLineInput {
  type: LineType;
  inventory_item_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
}
