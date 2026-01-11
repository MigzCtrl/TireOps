'use server';

import { z } from 'zod';
import { getCurrentShopId } from '@/lib/supabase/auth';
import * as customerService from '@/lib/services/customer.service';
import type { Customer } from '@/types/database';

/**
 * Customer Server Actions
 *
 * These are Next.js 16 Server Actions that can be called from Client Components.
 * They handle authentication, validation, and call the service layer.
 *
 * All actions return a consistent response shape:
 * { success: boolean, data?: T, error?: string }
 *
 * @module actions/customers
 */

// ==========================================
// Validation Schemas
// ==========================================

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  tire_size: z.string().max(20, 'Tire size too long').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  tire_size: z.string().max(20, 'Tire size too long').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
});

const listCustomersSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  searchTerm: z.string().max(100).default(''),
  filterType: z.enum(['all', 'active', 'inactive', 'new']).default('all'),
});

// ==========================================
// Action Response Types
// ==========================================

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CustomerListResponse = {
  customers: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ==========================================
// Server Actions
// ==========================================

/**
 * Gets a paginated list of customers with filtering and search
 *
 * @param params - List parameters (page, pageSize, searchTerm, filterType)
 * @returns ActionResponse with customer list and pagination info
 *
 * @example
 * ```tsx
 * const result = await getCustomersAction({ page: 1, pageSize: 10 });
 * if (result.success) {
 *   console.log(result.data.customers);
 * }
 * ```
 */
export async function getCustomersAction(
  params?: Partial<z.infer<typeof listCustomersSchema>>
): Promise<ActionResponse<CustomerListResponse>> {
  try {
    // Validate input
    const validatedParams = listCustomersSchema.parse(params || {});

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await customerService.listCustomers({
      shopId,
      ...validatedParams,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        customers: result.data,
        totalCount: result.count,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to fetch customers' };
  }
}

/**
 * Gets a single customer by ID
 *
 * @param customerId - Customer UUID
 * @returns ActionResponse with customer data
 *
 * @example
 * ```tsx
 * const result = await getCustomerByIdAction('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export async function getCustomerByIdAction(
  customerId: string
): Promise<ActionResponse<Customer>> {
  try {
    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid customer ID');
    const validatedId = uuidSchema.parse(customerId);

    // Call service layer
    const result = await customerService.getCustomer(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Customer not found' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to fetch customer' };
  }
}

/**
 * Creates a new customer
 *
 * @param input - Customer creation data
 * @returns ActionResponse with created customer
 *
 * @example
 * ```tsx
 * const result = await createCustomerAction({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   phone: '555-0100',
 * });
 * if (result.success) {
 *   console.log('Created:', result.data);
 * }
 * ```
 */
export async function createCustomerAction(
  input: z.infer<typeof createCustomerSchema>
): Promise<ActionResponse<Customer>> {
  try {
    // Validate input
    const validatedData = createCustomerSchema.parse(input);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await customerService.createCustomer(validatedData, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Failed to create customer' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create customer' };
  }
}

/**
 * Updates an existing customer
 *
 * @param customerId - Customer UUID
 * @param input - Partial customer data to update
 * @returns ActionResponse with updated customer
 *
 * @example
 * ```tsx
 * const result = await updateCustomerAction('123...', {
 *   phone: '555-0101',
 * });
 * if (result.success) {
 *   console.log('Updated:', result.data);
 * }
 * ```
 */
export async function updateCustomerAction(
  customerId: string,
  input: z.infer<typeof updateCustomerSchema>
): Promise<ActionResponse<Customer>> {
  try {
    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid customer ID');
    const validatedId = uuidSchema.parse(customerId);

    // Validate input
    const validatedData = updateCustomerSchema.parse(input);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await customerService.updateCustomer(
      validatedId,
      validatedData,
      shopId
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Failed to update customer' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update customer' };
  }
}

/**
 * Deletes a customer
 *
 * @param customerId - Customer UUID
 * @returns ActionResponse with success status
 *
 * @example
 * ```tsx
 * const result = await deleteCustomerAction('123...');
 * if (result.success) {
 *   console.log('Customer deleted');
 * }
 * ```
 */
export async function deleteCustomerAction(
  customerId: string
): Promise<ActionResponse<void>> {
  try {
    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid customer ID');
    const validatedId = uuidSchema.parse(customerId);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await customerService.deleteCustomer(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to delete customer' };
  }
}

/**
 * Gets count of new customers in the last N days
 *
 * @param days - Number of days to look back (default 7)
 * @returns ActionResponse with count
 *
 * @example
 * ```tsx
 * const result = await getNewCustomersCountAction(7);
 * if (result.success) {
 *   console.log('New customers:', result.data);
 * }
 * ```
 */
export async function getNewCustomersCountAction(
  days: number = 7
): Promise<ActionResponse<number>> {
  try {
    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await customerService.getNewCustomersStats(shopId, days);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.count };
  } catch (error) {
    return { success: false, error: 'Failed to fetch new customers count' };
  }
}
