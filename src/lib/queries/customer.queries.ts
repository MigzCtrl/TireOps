import { createSupabaseServerClient } from '@/lib/supabase/client.server';
import type { Customer } from '@/types/database';

/**
 * Customer Database Query Layer
 *
 * This module contains all database operations for customers.
 * All queries enforce shop_id isolation through RLS policies.
 *
 * @module customer.queries
 */

/**
 * Gets all customers for a specific shop with pagination
 *
 * @param shopId - The shop_id to filter customers by
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise with customers data, total count, and error if any
 */
export async function getCustomers(
  shopId: string,
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  return { data, count: count || 0, error: null };
}

/**
 * Gets a single customer by ID
 * RLS policies ensure the customer belongs to the current user's shop
 *
 * @param customerId - The customer's UUID
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with customer data or null if not found
 */
export async function getCustomerById(customerId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('shop_id', shopId)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Creates a new customer
 *
 * @param customerData - Customer data to insert
 * @param shopId - The shop_id to associate with the customer
 * @returns Promise with created customer or error
 */
export async function createCustomer(
  customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'order_count'>,
  shopId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('customers')
    // @ts-ignore - Supabase types not generated yet
    .insert({
      ...customerData,
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
 * Updates an existing customer
 *
 * @param customerId - The customer's UUID
 * @param customerData - Partial customer data to update
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with updated customer or error
 */
export async function updateCustomer(
  customerId: string,
  customerData: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'shop_id'>>,
  shopId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('customers')
    // @ts-ignore - Supabase types not generated yet
    .update({
      ...customerData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Deletes a customer
 * Note: This will fail if there are related records (vehicles, work orders)
 * unless CASCADE is configured in the database
 *
 * @param customerId - The customer's UUID
 * @param shopId - The shop_id to verify ownership
 * @returns Promise with error if any
 */
export async function deleteCustomer(customerId: string, shopId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('shop_id', shopId);

  if (error) {
    return { error };
  }

  return { error: null };
}

/**
 * Searches customers by name, email, or phone
 *
 * @param shopId - The shop_id to filter customers by
 * @param searchTerm - The search term
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise with matching customers
 */
export async function searchCustomers(
  shopId: string,
  searchTerm: string,
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId)
    .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  return { data, count: count || 0, error: null };
}

/**
 * Gets customers created within the last N days
 *
 * @param shopId - The shop_id to filter customers by
 * @param days - Number of days to look back
 * @returns Promise with count of new customers
 */
export async function getNewCustomersCount(shopId: string, days: number = 7) {
  const supabase = await createSupabaseServerClient();

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .gte('created_at', dateThreshold.toISOString());

  if (error) {
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
}

/**
 * Gets customers with their order count
 * Useful for filtering active vs inactive customers
 *
 * @param shopId - The shop_id to filter customers by
 * @param filterType - 'all' | 'active' | 'inactive'
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise with customers and their order counts
 */
export async function getCustomersWithOrderCount(
  shopId: string,
  filterType: 'all' | 'active' | 'inactive' = 'all',
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId);

  if (filterType === 'active') {
    query = query.gt('order_count', 0);
  } else if (filterType === 'inactive') {
    query = query.eq('order_count', 0);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  return { data, count: count || 0, error: null };
}
