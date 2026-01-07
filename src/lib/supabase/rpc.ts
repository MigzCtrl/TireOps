/**
 * Supabase RPC (Remote Procedure Call) utilities
 * These functions call server-side PostgreSQL functions for atomic operations
 */

import { createClient } from './client';

interface WorkOrderItem {
  tire_id: string;
  quantity: number;
  unit_price: number;
}

interface CreateWorkOrderParams {
  shop_id: string;
  customer_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string;
  items: WorkOrderItem[];
}

interface RpcResult {
  success: boolean;
  error?: string;
  message?: string;
  work_order_id?: string;
  total_amount?: number;
}

/**
 * Complete a work order with atomic inventory deduction
 * All operations succeed or all fail together
 */
export async function completeWorkOrder(
  workOrderId: string,
  shopId: string
): Promise<RpcResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('complete_work_order', {
    p_work_order_id: workOrderId,
    p_shop_id: shopId,
  });

  if (error) {
    console.error('RPC error:', error);
    return { success: false, error: error.message };
  }

  return data as RpcResult;
}

/**
 * Calculate work order total on the server side
 */
export async function calculateWorkOrderTotal(
  workOrderId: string
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('calculate_work_order_total', {
    p_work_order_id: workOrderId,
  });

  if (error) {
    console.error('RPC error:', error);
    return 0;
  }

  return data as number;
}

/**
 * Create a work order with items in a single transaction
 * Total is calculated server-side
 */
export async function createWorkOrderWithItems(
  params: CreateWorkOrderParams
): Promise<RpcResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_work_order_with_items', {
    p_shop_id: params.shop_id,
    p_customer_id: params.customer_id,
    p_service_type: params.service_type,
    p_scheduled_date: params.scheduled_date,
    p_scheduled_time: params.scheduled_time,
    p_notes: params.notes,
    p_items: params.items,
  });

  if (error) {
    console.error('RPC error:', error);
    return { success: false, error: error.message };
  }

  return data as RpcResult;
}

/**
 * Check if RPC functions are available
 * Useful for graceful degradation if migrations haven't been run
 */
export async function checkRpcAvailability(): Promise<boolean> {
  const supabase = createClient();

  try {
    // Try calling with invalid params - we just want to check if function exists
    const { error } = await supabase.rpc('calculate_work_order_total', {
      p_work_order_id: '00000000-0000-0000-0000-000000000000',
    });

    // If error is about the function not existing, return false
    if (error?.message?.includes('function') && error?.message?.includes('does not exist')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
