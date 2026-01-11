/**
 * Server Actions Exports
 *
 * This module provides a centralized export point for all server actions.
 * Import actions from here for consistency in client components.
 *
 * @example
 * ```tsx
 * import { getCustomersAction, createCustomerAction } from '@/app/actions';
 * ```
 */

// Export customer actions
export {
  getCustomersAction,
  getCustomerByIdAction,
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  getNewCustomersCountAction,
  type CustomerListResponse,
} from './customers';

// Export vehicle actions
export {
  getVehiclesAction,
  getVehicleByIdAction,
  getCustomerVehiclesAction,
  createVehicleAction,
  updateVehicleAction,
  deleteVehicleAction,
  getCustomerVehicleCountAction,
  type VehicleListResponse,
} from './vehicles';

// Export shared type (only once)
export type { ActionResponse } from './customers';
