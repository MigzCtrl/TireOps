import * as customerQueries from '@/lib/queries/customer.queries';
import type { Customer } from '@/types/database';
import { sanitizeInput } from '@/lib/validations/schemas';

/**
 * Customer Service Layer
 *
 * This module contains business logic for customer operations.
 * It sits between the Server Actions and the Database Query layer.
 *
 * @module customer.service
 */

export interface CustomerCreateInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tire_size?: string;
  notes?: string;
}

export interface CustomerUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tire_size?: string;
  notes?: string;
}

export interface CustomerListParams {
  shopId: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  filterType?: 'all' | 'active' | 'inactive' | 'new';
}

/**
 * Gets a paginated list of customers with filtering and search
 *
 * @param params - List parameters including shopId, pagination, search, and filters
 * @returns Promise with customers, total count, and pagination info
 */
export async function listCustomers(params: CustomerListParams) {
  const {
    shopId,
    page = 1,
    pageSize = 10,
    searchTerm = '',
    filterType = 'all',
  } = params;

  // If searching, use search query
  if (searchTerm.trim()) {
    const result = await customerQueries.searchCustomers(
      shopId,
      sanitizeInput(searchTerm),
      page,
      pageSize
    );

    if (result.error) {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
        error: result.error.message,
      };
    }

    return {
      data: result.data || [],
      count: result.count,
      page,
      pageSize,
      totalPages: Math.ceil(result.count / pageSize),
      error: null,
    };
  }

  // Handle filter type
  if (filterType === 'new') {
    // Get all customers and filter in-memory for new ones
    // In a production app, you'd want to add this as a database query
    const result = await customerQueries.getCustomers(shopId, page, pageSize);

    if (result.error) {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
        error: result.error.message,
      };
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const filteredData = (result.data || []).filter((customer: Customer) => {
      if (!customer.created_at) return false;
      return new Date(customer.created_at) >= oneWeekAgo;
    });

    return {
      data: filteredData,
      count: filteredData.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredData.length / pageSize),
      error: null,
    };
  }

  // Handle active/inactive filters
  if (filterType === 'active' || filterType === 'inactive') {
    const result = await customerQueries.getCustomersWithOrderCount(
      shopId,
      filterType,
      page,
      pageSize
    );

    if (result.error) {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
        error: result.error.message,
      };
    }

    return {
      data: result.data || [],
      count: result.count,
      page,
      pageSize,
      totalPages: Math.ceil(result.count / pageSize),
      error: null,
    };
  }

  // Default: get all customers
  const result = await customerQueries.getCustomers(shopId, page, pageSize);

  if (result.error) {
    return {
      data: [],
      count: 0,
      page,
      pageSize,
      totalPages: 0,
      error: result.error.message,
    };
  }

  return {
    data: result.data || [],
    count: result.count,
    page,
    pageSize,
    totalPages: Math.ceil(result.count / pageSize),
    error: null,
  };
}

/**
 * Gets a single customer by ID
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID for validation
 * @returns Promise with customer data or error
 */
export async function getCustomer(customerId: string, shopId: string) {
  const result = await customerQueries.getCustomerById(customerId, shopId);

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  if (!result.data) {
    return { data: null, error: 'Customer not found' };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Creates a new customer with business logic validation
 *
 * @param input - Customer creation data
 * @param shopId - Shop UUID
 * @returns Promise with created customer or error
 */
export async function createCustomer(input: CustomerCreateInput, shopId: string) {
  // Sanitize inputs
  const sanitizedData = {
    name: sanitizeInput(input.name.trim()),
    email: input.email ? sanitizeInput(input.email.trim().toLowerCase()) : undefined,
    phone: input.phone ? sanitizeInput(input.phone.trim()) : undefined,
    address: input.address ? sanitizeInput(input.address.trim()) : undefined,
    tire_size: input.tire_size ? sanitizeInput(input.tire_size.trim()) : undefined,
    notes: input.notes ? sanitizeInput(input.notes.trim()) : undefined,
  };

  // Business rule: Name is required
  if (!sanitizedData.name) {
    return { data: null, error: 'Customer name is required' };
  }

  // Business rule: Either email or phone must be provided for contact
  if (!sanitizedData.email && !sanitizedData.phone) {
    return {
      data: null,
      error: 'At least one contact method (email or phone) is required',
    };
  }

  const result = await customerQueries.createCustomer(sanitizedData, shopId);

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Updates an existing customer
 *
 * @param customerId - Customer UUID
 * @param input - Partial customer data to update
 * @param shopId - Shop UUID for validation
 * @returns Promise with updated customer or error
 */
export async function updateCustomer(
  customerId: string,
  input: CustomerUpdateInput,
  shopId: string
) {
  // Sanitize inputs
  const sanitizedData: Partial<Customer> = {};

  if (input.name !== undefined) {
    sanitizedData.name = sanitizeInput(input.name.trim());
    if (!sanitizedData.name) {
      return { data: null, error: 'Customer name cannot be empty' };
    }
  }

  if (input.email !== undefined) {
    sanitizedData.email = input.email ? sanitizeInput(input.email.trim().toLowerCase()) : undefined;
  }

  if (input.phone !== undefined) {
    sanitizedData.phone = input.phone ? sanitizeInput(input.phone.trim()) : undefined;
  }

  if (input.address !== undefined) {
    sanitizedData.address = input.address ? sanitizeInput(input.address.trim()) : undefined;
  }

  if (input.tire_size !== undefined) {
    sanitizedData.tire_size = input.tire_size ? sanitizeInput(input.tire_size.trim()) : undefined;
  }

  if (input.notes !== undefined) {
    sanitizedData.notes = input.notes ? sanitizeInput(input.notes.trim()) : undefined;
  }

  // Business rule: If updating contact info, ensure at least one method remains
  const currentCustomer = await customerQueries.getCustomerById(customerId, shopId);
  if (currentCustomer.error) {
    return { data: null, error: 'Customer not found' };
  }

  // @ts-ignore - TypeScript narrowing issue
  const updatedEmail = sanitizedData.email !== undefined ? sanitizedData.email : currentCustomer.data?.email;
  // @ts-ignore - TypeScript narrowing issue
  const updatedPhone = sanitizedData.phone !== undefined ? sanitizedData.phone : currentCustomer.data?.phone;

  if (!updatedEmail && !updatedPhone) {
    return {
      data: null,
      error: 'At least one contact method (email or phone) must be provided',
    };
  }

  const result = await customerQueries.updateCustomer(customerId, sanitizedData, shopId);

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Deletes a customer
 * Business rule: Checks for related records before deletion
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID for validation
 * @returns Promise with success status or error
 */
export async function deleteCustomer(customerId: string, shopId: string) {
  // First verify customer exists and belongs to shop
  const customer = await customerQueries.getCustomerById(customerId, shopId);

  if (customer.error || !customer.data) {
    return { success: false, error: 'Customer not found' };
  }

  // Business rule: Warn if customer has orders
  // @ts-ignore - TypeScript narrowing issue
  if (customer.data.order_count && customer.data.order_count > 0) {
    // In production, you might want to prevent deletion or cascade delete
    // For now, we'll allow it but the database FK constraints will handle it
  }

  const result = await customerQueries.deleteCustomer(customerId, shopId);

  if (result.error) {
    // Check if it's a FK constraint error
    if (result.error.message.includes('foreign key') || result.error.message.includes('violates')) {
      return {
        success: false,
        error: 'Cannot delete customer with existing work orders or vehicles. Delete those first.',
      };
    }
    return { success: false, error: result.error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets statistics about new customers
 *
 * @param shopId - Shop UUID
 * @param days - Number of days to look back (default 7)
 * @returns Promise with count of new customers
 */
export async function getNewCustomersStats(shopId: string, days: number = 7) {
  const result = await customerQueries.getNewCustomersCount(shopId, days);

  if (result.error) {
    return { count: 0, error: result.error.message };
  }

  return { count: result.count, error: null };
}
