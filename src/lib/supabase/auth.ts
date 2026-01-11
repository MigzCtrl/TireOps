import { createSupabaseServerClient } from './client.server';
import type { Profile } from '@/types/database';

/**
 * Gets the current authenticated user from the session
 *
 * @returns Promise<User | null> - The authenticated user or null if not logged in
 *
 * @example
 * ```ts
 * const user = await getCurrentUser();
 * if (!user) {
 *   return { success: false, error: 'Unauthorized' };
 * }
 * ```
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Gets the current user's profile including their shop_id
 * This is essential for multi-tenant data isolation
 *
 * @returns Promise<Profile | null> - The user profile with shop_id or null
 *
 * @example
 * ```ts
 * const profile = await getCurrentUserProfile();
 * if (!profile) {
 *   return { success: false, error: 'Unauthorized' };
 * }
 * const shopId = profile.shop_id;
 * ```
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

/**
 * Gets the shop_id for the current user
 * Shorthand for getting just the shop_id when that's all you need
 *
 * @returns Promise<string | null> - The shop_id or null if not authenticated
 *
 * @example
 * ```ts
 * const shopId = await getCurrentShopId();
 * if (!shopId) {
 *   return { success: false, error: 'Unauthorized' };
 * }
 * ```
 */
export async function getCurrentShopId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.shop_id || null;
}

/**
 * Checks if the current user has permission to perform an action
 *
 * @param requiredRole - Minimum role required ('admin' | 'manager' | 'staff' | 'viewer')
 * @returns Promise<boolean> - True if user has required permission
 *
 * @example
 * ```ts
 * const canEdit = await hasPermission('staff');
 * if (!canEdit) {
 *   return { success: false, error: 'Insufficient permissions' };
 * }
 * ```
 */
export async function hasPermission(requiredRole: 'admin' | 'manager' | 'staff' | 'viewer'): Promise<boolean> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return false;
  }

  const roleHierarchy = {
    admin: 4,
    manager: 3,
    staff: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[profile.role];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}
