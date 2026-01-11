import * as vehicleQueries from '@/lib/queries/vehicle.queries';
import * as customerQueries from '@/lib/queries/customer.queries';
import type { Vehicle } from '@/types/database';
import { sanitizeInput } from '@/lib/validations/schemas';

/**
 * Vehicle Service Layer
 *
 * This module contains business logic for vehicle operations.
 * It sits between the Server Actions and the Database Query layer.
 *
 * @module vehicle.service
 */

export interface VehicleCreateInput {
  customer_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  tire_size?: string | null;
  recommended_tire_size?: string;
  plate?: string | null;
  vin?: string | null;
  notes?: string | null;
}

export interface VehicleUpdateInput {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  tire_size?: string | null;
  recommended_tire_size?: string;
  plate?: string | null;
  vin?: string | null;
  notes?: string | null;
}

export interface VehicleListParams {
  shopId: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  customerId?: string;
}

/**
 * Gets vehicles with filtering and search
 *
 * @param params - List parameters
 * @returns Promise with vehicles and pagination info
 */
export async function listVehicles(params: VehicleListParams) {
  const { shopId, page = 1, pageSize = 10, searchTerm = '', customerId } = params;

  // If filtering by customer, get customer's vehicles
  if (customerId) {
    const result = await vehicleQueries.getVehiclesByCustomer(customerId, shopId);

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

    const vehicles = result.data || [];

    return {
      data: vehicles,
      count: vehicles.length,
      page,
      pageSize,
      totalPages: Math.ceil(vehicles.length / pageSize),
      error: null,
    };
  }

  // If searching, use search query
  if (searchTerm.trim()) {
    const result = await vehicleQueries.searchVehicles(
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

  // Default: get all vehicles
  const result = await vehicleQueries.getVehicles(shopId, page, pageSize);

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
 * Gets a single vehicle by ID
 *
 * @param vehicleId - Vehicle UUID
 * @param shopId - Shop UUID for validation
 * @returns Promise with vehicle data or error
 */
export async function getVehicle(vehicleId: string, shopId: string) {
  const result = await vehicleQueries.getVehicleById(vehicleId, shopId);

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  if (!result.data) {
    return { data: null, error: 'Vehicle not found' };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Gets all vehicles for a specific customer
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID
 * @returns Promise with vehicles array
 */
export async function getCustomerVehicles(customerId: string, shopId: string) {
  const result = await vehicleQueries.getVehiclesByCustomer(customerId, shopId);

  if (result.error) {
    return { data: [], error: result.error.message };
  }

  return { data: result.data || [], error: null };
}

/**
 * Creates a new vehicle with business logic validation
 *
 * @param input - Vehicle creation data
 * @param shopId - Shop UUID
 * @returns Promise with created vehicle or error
 */
export async function createVehicle(input: VehicleCreateInput, shopId: string) {
  // Verify customer exists and belongs to shop
  const customer = await customerQueries.getCustomerById(input.customer_id, shopId);

  if (customer.error || !customer.data) {
    return { data: null, error: 'Customer not found' };
  }

  // Sanitize inputs
  const sanitizedData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'customer'> = {
    customer_id: input.customer_id,
    year: input.year,
    make: input.make ? sanitizeInput(input.make.trim()) : null,
    model: input.model ? sanitizeInput(input.model.trim()) : null,
    trim: input.trim ? sanitizeInput(input.trim.trim()) : null,
    tire_size: input.tire_size ? sanitizeInput(input.tire_size.trim()) : null,
    recommended_tire_size: input.recommended_tire_size
      ? sanitizeInput(input.recommended_tire_size.trim())
      : undefined,
    plate: input.plate ? sanitizeInput(input.plate.trim().toUpperCase()) : null,
    vin: input.vin ? sanitizeInput(input.vin.trim().toUpperCase()) : null,
    notes: input.notes ? sanitizeInput(input.notes.trim()) : null,
  };

  // Business rule: At least make and model should be provided
  if (!sanitizedData.make && !sanitizedData.model) {
    return {
      data: null,
      error: 'Vehicle make or model is required',
    };
  }

  // Business rule: Validate VIN format if provided
  if (sanitizedData.vin && sanitizedData.vin.length !== 17) {
    return {
      data: null,
      error: 'VIN must be exactly 17 characters',
    };
  }

  const result = await vehicleQueries.createVehicle(sanitizedData, shopId);

  if (result.error) {
    // Check for duplicate VIN or plate
    if (result.error.message.includes('duplicate') || result.error.message.includes('unique')) {
      return {
        data: null,
        error: 'A vehicle with this VIN or license plate already exists',
      };
    }
    return { data: null, error: result.error.message };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Updates an existing vehicle
 *
 * @param vehicleId - Vehicle UUID
 * @param input - Partial vehicle data to update
 * @param shopId - Shop UUID for validation
 * @returns Promise with updated vehicle or error
 */
export async function updateVehicle(
  vehicleId: string,
  input: VehicleUpdateInput,
  shopId: string
) {
  // Verify vehicle exists and belongs to shop
  const existingVehicle = await vehicleQueries.getVehicleById(vehicleId, shopId);

  if (existingVehicle.error || !existingVehicle.data) {
    return { data: null, error: 'Vehicle not found' };
  }

  // Sanitize inputs
  const sanitizedData: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'customer_id' | 'customer'>> = {};

  if (input.year !== undefined) {
    sanitizedData.year = input.year;
  }

  if (input.make !== undefined) {
    sanitizedData.make = input.make ? sanitizeInput(input.make.trim()) : null;
  }

  if (input.model !== undefined) {
    sanitizedData.model = input.model ? sanitizeInput(input.model.trim()) : null;
  }

  if (input.trim !== undefined) {
    sanitizedData.trim = input.trim ? sanitizeInput(input.trim.trim()) : null;
  }

  if (input.tire_size !== undefined) {
    sanitizedData.tire_size = input.tire_size ? sanitizeInput(input.tire_size.trim()) : null;
  }

  if (input.recommended_tire_size !== undefined) {
    sanitizedData.recommended_tire_size = input.recommended_tire_size
      ? sanitizeInput(input.recommended_tire_size.trim())
      : undefined;
  }

  if (input.plate !== undefined) {
    sanitizedData.plate = input.plate ? sanitizeInput(input.plate.trim().toUpperCase()) : null;
  }

  if (input.vin !== undefined) {
    sanitizedData.vin = input.vin ? sanitizeInput(input.vin.trim().toUpperCase()) : null;
    // Validate VIN format if provided
    if (sanitizedData.vin && sanitizedData.vin.length !== 17) {
      return {
        data: null,
        error: 'VIN must be exactly 17 characters',
      };
    }
  }

  if (input.notes !== undefined) {
    sanitizedData.notes = input.notes ? sanitizeInput(input.notes.trim()) : null;
  }

  const result = await vehicleQueries.updateVehicle(vehicleId, sanitizedData, shopId);

  if (result.error) {
    // Check for duplicate VIN or plate
    if (result.error.message.includes('duplicate') || result.error.message.includes('unique')) {
      return {
        data: null,
        error: 'A vehicle with this VIN or license plate already exists',
      };
    }
    return { data: null, error: result.error.message };
  }

  // @ts-ignore - TypeScript narrowing issue
  return { data: result.data, error: null };
}

/**
 * Deletes a vehicle
 *
 * @param vehicleId - Vehicle UUID
 * @param shopId - Shop UUID for validation
 * @returns Promise with success status or error
 */
export async function deleteVehicle(vehicleId: string, shopId: string) {
  // Verify vehicle exists and belongs to shop
  const vehicle = await vehicleQueries.getVehicleById(vehicleId, shopId);

  if (vehicle.error || !vehicle.data) {
    return { success: false, error: 'Vehicle not found' };
  }

  const result = await vehicleQueries.deleteVehicle(vehicleId, shopId);

  if (result.error) {
    // Check if it's a FK constraint error
    if (result.error.message.includes('foreign key') || result.error.message.includes('violates')) {
      return {
        success: false,
        error: 'Cannot delete vehicle with existing work orders. Delete those first.',
      };
    }
    return { success: false, error: result.error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets vehicle count for a customer
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID
 * @returns Promise with vehicle count
 */
export async function getCustomerVehicleCount(customerId: string, shopId: string) {
  const result = await vehicleQueries.getVehicleCount(customerId, shopId);

  if (result.error) {
    return { count: 0, error: result.error.message };
  }

  return { count: result.count, error: null };
}
