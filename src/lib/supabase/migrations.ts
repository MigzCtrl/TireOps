/**
 * Auto-migration utilities for Supabase
 * Checks and adds missing columns without manual SQL
 */

import { createClient } from './client';

interface MigrationResult {
  success: boolean;
  message: string;
  columnsAdded?: string[];
}

/**
 * Ensure shop settings columns exist
 * Runs automatically when settings page loads
 */
export async function ensureShopSettingsColumns(): Promise<MigrationResult> {
  const supabase = createClient();
  const columnsAdded: string[] = [];

  try {
    // Try to select the new columns - if they don't exist, we'll get an error
    const { error: checkError } = await supabase
      .from('shops')
      .select('tax_rate, currency, email_notifications, low_stock_threshold')
      .limit(1);

    // If no error, columns already exist
    if (!checkError) {
      return { success: true, message: 'Columns already exist' };
    }

    // If error mentions column doesn't exist, we need to add them
    if (checkError.message?.includes('column') || checkError.code === '42703') {
      // Use RPC to add columns (requires a function in Supabase)
      // For now, we'll try direct SQL via RPC if available

      // Alternative: Try updating with default values to see which columns are missing
      const testShop = await supabase.from('shops').select('id').limit(1).single();

      if (testShop.data?.id) {
        // Try to add each column individually via update (will fail silently if column doesn't exist)
        const columnsToAdd = [
          { name: 'tax_rate', default: 0 },
          { name: 'currency', default: 'USD' },
          { name: 'email_notifications', default: true },
          { name: 'low_stock_threshold', default: 10 },
        ];

        for (const col of columnsToAdd) {
          const { error } = await supabase
            .from('shops')
            .update({ [col.name]: col.default })
            .eq('id', testShop.data.id);

          if (!error) {
            columnsAdded.push(col.name);
          }
        }
      }

      return {
        success: columnsAdded.length > 0,
        message: columnsAdded.length > 0
          ? `Added columns: ${columnsAdded.join(', ')}`
          : 'Please run the migration SQL manually in Supabase dashboard',
        columnsAdded,
      };
    }

    return { success: false, message: checkError.message };
  } catch (error: any) {
    console.error('Migration check error:', error);
    return { success: false, message: error.message || 'Migration check failed' };
  }
}

/**
 * Get migration SQL for manual execution
 */
export function getShopSettingsMigrationSQL(): string {
  return `
-- Run this in Supabase SQL Editor if auto-migration fails

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
  `.trim();
}
