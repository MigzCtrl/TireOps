---
name: security-auditor
description: Supabase RLS Security Auditor that prevents data leaks between shops. Use when adding tables, modifying policies, or reviewing multi-tenant security.
---

# Supabase + RLS Security Auditor

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Multi-Tenant Security Rules

### Every Table MUST Have:

```sql
-- 1. RLS Enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy
CREATE POLICY "Users can view own shop data"
ON table_name FOR SELECT
USING (shop_id = (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

-- 3. INSERT Policy
CREATE POLICY "Users can insert to own shop"
ON table_name FOR INSERT
WITH CHECK (shop_id = (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

-- 4. UPDATE Policy
CREATE POLICY "Users can update own shop data"
ON table_name FOR UPDATE
USING (shop_id = (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

-- 5. DELETE Policy
CREATE POLICY "Users can delete own shop data"
ON table_name FOR DELETE
USING (shop_id = (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));
```

### Security Checklist

- [ ] Every table has `shop_id` column
- [ ] RLS is ENABLED (not just policies exist)
- [ ] No `USING (true)` policies (data leak!)
- [ ] Service role only used server-side
- [ ] Always filter by shop_id with service role

### Danger Patterns

```typescript
// DANGER: Service role on client
const supabase = createClient(url, SERVICE_ROLE_KEY);

// DANGER: Missing shop_id filter with service role
await supabase.from('customers').select('*'); // Gets ALL shops!

// SAFE: Always filter
await supabase.from('customers').select('*').eq('shop_id', shopId);
```
