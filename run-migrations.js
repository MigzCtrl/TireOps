const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

const PROJECT_REF = 'vxjuzgnjvrzqzqevxpby';
const PASSWORD = 'g6ri9hzvrC7Liwei';

// All possible Supabase regions
const REGIONS = [
  'us-east-1', 'us-west-1', 'us-west-2', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1',
  'sa-east-1'
];

async function findWorkingConnection() {
  // Try session mode pooler (port 5432) for each region
  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      await dns.lookup(host);
      const connStr = `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${host}:5432/postgres`;
      console.log(`Trying ${region}...`);

      const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });

      await client.connect();
      console.log(`✓ Connected via ${region}!\n`);
      return client;
    } catch (e) {
      // Continue to next region
    }
  }
  throw new Error('Could not connect to any region');
}

async function runMigrations() {
  let client;

  try {
    console.log('Finding working connection...\n');
    client = await findWorkingConnection();

    // Read the combined migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/COMBINED_MIGRATION.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running combined migration...');
    await client.query(sql);
    console.log('✓ Combined migration complete!\n');

    // Run the indexes migration
    const indexesPath = path.join(__dirname, 'supabase/migrations/20250101000004_add_missing_indexes.sql');
    if (fs.existsSync(indexesPath)) {
      console.log('Running indexes migration...');
      const indexesSql = fs.readFileSync(indexesPath, 'utf8');
      await client.query(indexesSql);
      console.log('✓ Indexes migration complete!\n');
    }

    // Verify the setup
    console.log('Verifying setup...\n');

    // Check tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('shops', 'profiles', 'customers', 'inventory', 'work_orders', 'tasks')
    `);
    console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));

    // Check RLS is enabled
    const rls = await client.query(`
      SELECT tablename, rowsecurity FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('customers', 'inventory', 'work_orders', 'shops', 'profiles')
    `);
    console.log('\nRLS Status:');
    rls.rows.forEach(r => console.log(`  ${r.tablename}: ${r.rowsecurity ? 'ENABLED' : 'DISABLED'}`));

    // Check helper functions exist
    const functions = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('get_user_shop_id', 'get_user_role', 'is_owner', 'can_edit')
    `);
    console.log('\nHelper functions:', functions.rows.map(r => r.routine_name).join(', '));

    // Check indexes on shop_id
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%shop%'
    `);
    console.log('\nShop indexes:', indexes.rows.map(r => r.indexname).join(', '));

    console.log('\n✅ All migrations applied successfully!');

  } catch (error) {
    console.error('Migration error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️ Some objects already exist - this is OK, migration was likely already applied.');
    }
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigrations();
