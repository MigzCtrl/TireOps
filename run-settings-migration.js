/**
 * Run this script to add settings columns to the shops table
 *
 * Usage:
 *   1. Get your service role key from Supabase Dashboard > Settings > API
 *   2. Run: node run-settings-migration.js YOUR_SERVICE_ROLE_KEY
 */

const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  SETTINGS MIGRATION SCRIPT                                     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  To run this migration, you need your Supabase Service Role    ║
║  Key (NOT the anon key).                                       ║
║                                                                ║
║  1. Go to: https://supabase.com/dashboard                      ║
║  2. Select your project                                        ║
║  3. Go to Settings > API                                       ║
║  4. Copy the "service_role" key (under Project API keys)       ║
║  5. Run:                                                       ║
║                                                                ║
║     node run-settings-migration.js YOUR_SERVICE_ROLE_KEY       ║
║                                                                ║
║  OR paste this SQL directly in Supabase SQL Editor:            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
  `);
  process.exit(1);
}

const SUPABASE_URL = 'https://vxjuzgnjvrzqzqevxpby.supabase.co';

async function runMigration() {
  console.log('🔄 Running settings migration...\n');

  const sql = `
    ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Try alternative: direct postgres connection via REST
      console.log('⚠️  RPC method not available, trying alternative...\n');

      // Test if columns exist by trying to select them
      const testResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/shops?select=tax_rate,currency,email_notifications,low_stock_threshold&limit=1`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (testResponse.ok) {
        console.log('✅ Columns already exist! Migration not needed.\n');
        return;
      }

      // If we get here, we need manual intervention
      console.log(`
❌ Automatic migration failed. Please run this SQL manually:

   1. Go to: https://supabase.com/dashboard/project/vxjuzgnjvrzqzqevxpby/sql
   2. Paste this SQL and click "Run":

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

   3. You should see "Success. No rows returned"
   4. Go back to your app and refresh the settings page
      `);
      return;
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('You can now use tax rate and notification settings.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log(`
Please run this SQL manually in Supabase Dashboard:

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
    `);
  }
}

runMigration();
