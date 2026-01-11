'use server';

import { z } from 'zod';
import { getCurrentShopId } from '@/lib/supabase/auth';
import * as vehicleService from '@/lib/services/vehicle.service';
import type { Vehicle } from '@/types/database';

/**
 * Vehicle Server Actions
 *
 * These are Next.js 16 Server Actions that can be called from Client Components.
 * They handle authentication, validation, and call the service layer.
 *
 * All actions return a consistent response shape:
 * { success: boolean, data?: T, error?: string }
 *
 * @module actions/vehicles
 */

// ==========================================
// Validation Schemas
// ==========================================

const createVehicleSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable(),
  make: z.string().max(50, 'Make too long').nullable(),
  model: z.string().max(100, 'Model too long').nullable(),
  trim: z.string().max(50, 'Trim too long').nullable().optional(),
  tire_size: z.string().max(20, 'Tire size too long').nullable().optional(),
  recommended_tire_size: z.string().max(20, 'Tire size too long').optional(),
  plate: z.string().max(20, 'License plate too long').nullable().optional(),
  vin: z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format')
    .nullable()
    .optional(),
  notes: z.string().max(1000, 'Notes too long').nullable().optional(),
});

const updateVehicleSchema = z.object({
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),
  make: z.string().max(50, 'Make too long').nullable().optional(),
  model: z.string().max(100, 'Model too long').nullable().optional(),
  trim: z.string().max(50, 'Trim too long').nullable().optional(),
  tire_size: z.string().max(20, 'Tire size too long').nullable().optional(),
  recommended_tire_size: z.string().max(20, 'Tire size too long').optional(),
  plate: z.string().max(20, 'License plate too long').nullable().optional(),
  vin: z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format')
    .nullable()
    .optional(),
  notes: z.string().max(1000, 'Notes too long').nullable().optional(),
});

const listVehiclesSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  searchTerm: z.string().max(100).default(''),
  customerId: z.string().uuid('Invalid customer ID').optional(),
});

// ==========================================
// Action Response Types
// ==========================================

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type VehicleListResponse = {
  vehicles: Vehicle[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ==========================================
// Server Actions
// ==========================================

/**
 * Gets a paginated list of vehicles with filtering and search
 *
 * @param params - List parameters (page, pageSize, searchTerm, customerId)
 * @returns ActionResponse with vehicle list and pagination info
 *
 * @example
 * ```tsx
 * const result = await getVehiclesAction({ customerId: '123...' });
 * if (result.success) {
 *   console.log(result.data.vehicles);
 * }
 * ```
 */
export async function getVehiclesAction(
  params?: Partial<z.infer<typeof listVehiclesSchema>>
): Promise<ActionResponse<VehicleListResponse>> {
  try {
    // Validate input
    const validatedParams = listVehiclesSchema.parse(params || {});

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await vehicleService.listVehicles({
      shopId,
      ...validatedParams,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        vehicles: result.data,
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
    return { success: false, error: 'Failed to fetch vehicles' };
  }
}

/**
 * Gets a single vehicle by ID
 *
 * @param vehicleId - Vehicle UUID
 * @returns ActionResponse with vehicle data
 *
 * @example
 * ```tsx
 * const result = await getVehicleByIdAction('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export async function getVehicleByIdAction(
  vehicleId: string
): Promise<ActionResponse<Vehicle>> {
  try {
    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid vehicle ID');
    const validatedId = uuidSchema.parse(vehicleId);

    // Call service layer
    const result = await vehicleService.getVehicle(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Vehicle not found' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to fetch vehicle' };
  }
}

/**
 * Gets all vehicles for a specific customer
 *
 * @param customerId - Customer UUID
 * @returns ActionResponse with vehicles array
 *
 * @example
 * ```tsx
 * const result = await getCustomerVehiclesAction('123...');
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export async function getCustomerVehiclesAction(
  customerId: string
): Promise<ActionResponse<Vehicle[]>> {
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
    const result = await vehicleService.getCustomerVehicles(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to fetch customer vehicles' };
  }
}

/**
 * Creates a new vehicle
 *
 * @param input - Vehicle creation data
 * @returns ActionResponse with created vehicle
 *
 * @example
 * ```tsx
 * const result = await createVehicleAction({
 *   customer_id: '123...',
 *   year: 2020,
 *   make: 'Toyota',
 *   model: 'Camry',
 *   tire_size: '225/45R17',
 * });
 * if (result.success) {
 *   console.log('Created:', result.data);
 * }
 * ```
 */
export async function createVehicleAction(
  input: z.infer<typeof createVehicleSchema>
): Promise<ActionResponse<Vehicle>> {
  try {
    // Validate input
    const validatedData = createVehicleSchema.parse(input);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await vehicleService.createVehicle(validatedData, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Failed to create vehicle' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create vehicle' };
  }
}

/**
 * Updates an existing vehicle
 *
 * @param vehicleId - Vehicle UUID
 * @param input - Partial vehicle data to update
 * @returns ActionResponse with updated vehicle
 *
 * @example
 * ```tsx
 * const result = await updateVehicleAction('123...', {
 *   tire_size: '225/50R17',
 * });
 * if (result.success) {
 *   console.log('Updated:', result.data);
 * }
 * ```
 */
export async function updateVehicleAction(
  vehicleId: string,
  input: z.infer<typeof updateVehicleSchema>
): Promise<ActionResponse<Vehicle>> {
  try {
    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid vehicle ID');
    const validatedId = uuidSchema.parse(vehicleId);

    // Validate input
    const validatedData = updateVehicleSchema.parse(input);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await vehicleService.updateVehicle(
      validatedId,
      validatedData,
      shopId
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Failed to update vehicle' };
    }

    // @ts-ignore - TypeScript has issues narrowing this union type
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update vehicle' };
  }
}

/**
 * Deletes a vehicle
 *
 * @param vehicleId - Vehicle UUID
 * @returns ActionResponse with success status
 *
 * @example
 * ```tsx
 * const result = await deleteVehicleAction('123...');
 * if (result.success) {
 *   console.log('Vehicle deleted');
 * }
 * ```
 */
export async function deleteVehicleAction(
  vehicleId: string
): Promise<ActionResponse<void>> {
  try {
    // Validate UUID
    const uuidSchema = z.string().uuid('Invalid vehicle ID');
    const validatedId = uuidSchema.parse(vehicleId);

    // Check authentication
    const shopId = await getCurrentShopId();
    if (!shopId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call service layer
    const result = await vehicleService.deleteVehicle(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to delete vehicle' };
  }
}

/**
 * Gets vehicle count for a customer
 *
 * @param customerId - Customer UUID
 * @returns ActionResponse with vehicle count
 *
 * @example
 * ```tsx
 * const result = await getCustomerVehicleCountAction('123...');
 * if (result.success) {
 *   console.log('Vehicle count:', result.data);
 * }
 * ```
 */
export async function getCustomerVehicleCountAction(
  customerId: string
): Promise<ActionResponse<number>> {
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
    const result = await vehicleService.getCustomerVehicleCount(validatedId, shopId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.count };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to get vehicle count' };
  }
}
