const { Client } = require('pg');
const dns = require('dns').promises;

const PROJECT_REF = 'vxjuzgnjvrzqzqevxpby';
const PASSWORD = 'g6ri9hzvrC7Liwei';

async function getClient() {
  const regions = ['us-west-2', 'us-east-1', 'us-west-1', 'eu-west-1'];
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      await dns.lookup(host);
      const connStr = `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${host}:5432/postgres`;
      const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });
      await client.connect();
      console.log(`Connected via ${region}\n`);
      return client;
    } catch (e) { /* try next */ }
  }
  throw new Error('Could not connect');
}

async function main() {
  const client = await getClient();

  try {
    console.log('=== CURRENT DATABASE STATE ===\n');

    // 1. Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    // 2. Check shop_id columns
    const shopIdCols = await client.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'shop_id'
    `);
    console.log('\nshop_id columns:');
    shopIdCols.rows.forEach(r => console.log(`  ${r.table_name}: ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`));

    // 3. Check RLS
    const rls = await client.query(`
      SELECT tablename, rowsecurity FROM pg_tables
      WHERE schemaname = 'public'
    `);
    console.log('\nRLS Status:');
    rls.rows.forEach(r => console.log(`  ${r.tablename}: ${r.rowsecurity ? 'ENABLED' : 'DISABLED'}`));

    // 4. Check policies
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    console.log('\nPolicies:');
    policies.rows.forEach(r => console.log(`  ${r.tablename}: ${r.policyname}`));

    // 5. Check helper functions
    const functions = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    `);
    console.log('\nFunctions:', functions.rows.map(r => r.routine_name).join(', '));

    // 6. Check indexes
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%shop%'
    `);
    console.log('\nShop-related indexes:', indexes.rows.map(r => r.indexname).join(', '));

    // 7. Check data counts
    console.log('\n=== DATA COUNTS ===\n');
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM shops) as shops,
        (SELECT COUNT(*) FROM profiles) as profiles,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM inventory) as inventory,
        (SELECT COUNT(*) FROM work_orders) as work_orders
    `);
    console.log(counts.rows[0]);

    // Now apply any missing pieces
    console.log('\n=== APPLYING FIXES ===\n');

    // Ensure RLS is enabled on all tables
    const tablesToSecure = ['customers', 'inventory', 'work_orders', 'shops', 'profiles', 'tasks'];
    for (const table of tablesToSecure) {
      try {
        await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
        console.log(`✓ RLS enabled on ${table}`);
      } catch (e) {
        if (!e.message.includes('does not exist')) {
          console.log(`  ${table}: RLS already enabled or table doesn't exist`);
        }
      }
    }

    // Add missing indexes
    const indexSql = `
      CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON public.inventory(shop_id);
      CREATE INDEX IF NOT EXISTS idx_work_orders_shop_id ON public.work_orders(shop_id);
      CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
      CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);
    `;
    await client.query(indexSql);
    console.log('✓ Indexes added/verified');

    // Run ANALYZE for query optimizer
    await client.query('ANALYZE public.customers');
    await client.query('ANALYZE public.inventory');
    await client.query('ANALYZE public.work_orders');
    console.log('✓ Tables analyzed');

    console.log('\n=== DATABASE IS READY ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
