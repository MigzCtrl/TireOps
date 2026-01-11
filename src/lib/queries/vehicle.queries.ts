import { createSupabaseServerClient } from '@/lib/supabase/client.server';
import type { Vehicle } from '@/types/database';

/**
 * Vehicle Database Query Layer
 *
 * This module contains all database operations for vehicles.
 * Vehicles are associated with customers and shops for multi-tenant isolation.
 *
 * @module vehicle.queries
 */

/**
 * Gets all vehicles for a specific customer
 *
 * @param customerId - The customer's UUID
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with vehicles array or error
 */
export async function getVehiclesByCustomer(customerId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Gets a single vehicle by ID
 *
 * @param vehicleId - The vehicle's UUID
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with vehicle data or error
 */
export async function getVehicleById(vehicleId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select('*, customer:customers(*)')
    .eq('id', vehicleId)
    .eq('shop_id', shopId)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Creates a new vehicle
 *
 * @param vehicleData - Vehicle data to insert
 * @param shopId - The shop_id to associate with the vehicle
 * @returns Promise with created vehicle or error
 */
export async function createVehicle(
  vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'customer'>,
  shopId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    // @ts-ignore - Supabase types not generated yet
    .insert({
      ...vehicleData,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Updates an existing vehicle
 *
 * @param vehicleId - The vehicle's UUID
 * @param vehicleData - Partial vehicle data to update
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with updated vehicle or error
 */
export async function updateVehicle(
  vehicleId: string,
  vehicleData: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'customer_id' | 'customer'>>,
  shopId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    // @ts-ignore - Supabase types not generated yet
    .update({
      ...vehicleData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Deletes a vehicle
 *
 * @param vehicleId - The vehicle's UUID
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with error if any
 */
export async function deleteVehicle(vehicleId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('shop_id', shopId);

  if (error) {
    return { error };
  }

  return { error: null };
}

/**
 * Gets all vehicles for a shop with customer info
 * Useful for vehicle management pages
 *
 * @param shopId - The shop_id
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise with vehicles and pagination info
 */
export async function getVehicles(
  shopId: string,
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('vehicles')
    .select('*, customer:customers(name, email, phone)', { count: 'exact' })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  return { data, count: count || 0, error: null };
}

/**
 * Searches vehicles by make, model, or license plate
 *
 * @param shopId - The shop_id
 * @param searchTerm - Search term
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise with matching vehicles
 */
export async function searchVehicles(
  shopId: string,
  searchTerm: string,
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('vehicles')
    .select('*, customer:customers(name, email, phone)', { count: 'exact' })
    .eq('shop_id', shopId)
    .or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,plate.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  return { data, count: count || 0, error: null };
}

/**
 * Gets count of vehicles for a customer
 *
 * @param customerId - The customer's UUID
 * @param shopId - The shop_id
 * @returns Promise with vehicle count
 */
export async function getVehicleCount(customerId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('shop_id', shopId);

  if (error) {
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
}
