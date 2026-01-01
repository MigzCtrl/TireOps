# Remaining Page Updates

I've completed the Dashboard page. Here are the exact changes needed for the remaining pages:

## ✅ COMPLETED:
- **Dashboard (src/app/page.tsx)** - Auth context, shop filtering, loading states

---

## 📝 CUSTOMERS PAGE (src/app/customers/page.tsx)

### Add after line 34 (after `export default function CustomersPage() {`):
```typescript
const { profile, canEdit, canDelete, loading: authLoading } = useAuth();
```

### Update line 68 `async function loadData()`:
```typescript
async function loadData() {
  if (!profile?.shop_id) return;

  try {
    const [customersRes, ordersRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('shop_id', profile.shop_id)  // ← ADD THIS
        .order('created_at', { ascending: false }),
      supabase
        .from('work_orders')
        .select('id, customer_id')
        .eq('shop_id', profile.shop_id),  // ← ADD THIS
    ]);
```

### Update line 107 `async function handleSubmit`:
```typescript
const customerData = {
  ...formData,
  shop_id: profile.shop_id,  // ← ADD THIS
};
```

### Update useEffect (line 57):
```typescript
useEffect(() => {
  if (!profile?.shop_id) return;
  loadData();
}, [profile?.shop_id]);  // ← CHANGE DEPENDENCY
```

### Add loading check before return (around line 280):
```typescript
if (authLoading) return <DashboardLayout><div className="text-center p-8">Loading...</div></DashboardLayout>;
if (!profile) return <DashboardLayout><div className="text-center p-8">Profile not found</div></DashboardLayout>;
```

### Update Add Customer button (around line 284):
```typescript
<button
  className="..."
  disabled={!canEdit}  // ← ADD THIS
>
  <Plus size={20} />
  Add Customer
</button>
```

### Update Edit buttons in table (around line 370):
```typescript
<button
  disabled={!canEdit}  // ← ADD THIS
  className="..."
>
  <Edit size={16} />
</button>
```

### Update Delete buttons (around line 380):
```typescript
<button
  disabled={!canDelete}  // ← ADD THIS
  className="..."
>
  <Trash2 size={16} />
</button>
```

---

## 📦 INVENTORY PAGE (src/app/inventory/page.tsx)

### Add after line 33:
```typescript
const { profile, isOwner, loading: authLoading } = useAuth();
```

### Update loadInventory (line 123):
```typescript
async function loadInventory() {
  if (!profile?.shop_id) return;

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('shop_id', profile.shop_id)  // ← ADD THIS
      .order('brand', { ascending: true });
```

### Update handleSubmit (line 158):
```typescript
const tireData = {
  ...formData,
  shop_id: profile.shop_id,  // ← ADD THIS
};
```

### Update useEffect (line 62):
```typescript
useEffect(() => {
  if (!profile?.shop_id) return;
  loadInventory();
}, [profile?.shop_id]);
```

### Add loading check before return:
```typescript
if (authLoading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
if (!profile) return <DashboardLayout><div>Profile not found</div></DashboardLayout>;
```

### Update all edit/delete buttons to disable if not owner:
```typescript
<button disabled={!isOwner} ...>Add Inventory</button>
<button disabled={!isOwner} ...>Edit</button>
<button disabled={!isOwner} ...>Delete</button>
```

---

## 📋 WORK ORDERS PAGE (src/app/work-orders/page.tsx)

### Add after line 50:
```typescript
const { profile, canEdit, canDelete, loading: authLoading } = useAuth();
```

### Update loadData (line 92) - FIX N+1 QUERY:
```typescript
async function loadData() {
  if (!profile?.shop_id) return;

  try {
    // ✅ SINGLE OPTIMIZED QUERY (instead of 3 separate queries)
    const { data: orders, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers!inner(id, name, email, phone),
        tire:inventory(id, brand, model, size, price)
      `)
      .eq('shop_id', profile.shop_id)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    setWorkOrders(orders || []);

    // No need for separate customers/tires queries!
  } catch (error) {
```

### Update handleSubmit (around line 200):
```typescript
const orderData = {
  ...formData,
  shop_id: profile.shop_id,  // ← ADD THIS
  total_amount: totalAmount,
};
```

### Update useEffect (line 81):
```typescript
useEffect(() => {
  if (!profile?.shop_id) return;
  loadData();
}, [profile?.shop_id]);
```

### Add loading check:
```typescript
if (authLoading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
if (!profile) return <DashboardLayout><div>Profile not found</div></DashboardLayout>;
```

### Update buttons:
```typescript
<button disabled={!canEdit}>New Order</button>
<button disabled={!canEdit}>Edit</button>
<button disabled={!canDelete}>Delete</button>
```

---

## 📊 ANALYTICS PAGE (src/app/analytics/page.tsx)

### Add after line 14:
```typescript
const { profile, loading: authLoading } = useAuth();
```

### Update loadData (line 45):
```typescript
async function loadData() {
  if (!profile?.shop_id) return;

  try {
    const [customersRes, ordersRes, inventoryRes] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_id', profile.shop_id),
      supabase
        .from('work_orders')
        .select('*, customers(name), inventory(brand, model, price)')
        .eq('shop_id', profile.shop_id),
      supabase.from('inventory').select('*').eq('shop_id', profile.shop_id),
    ]);
```

### Update useEffect:
```typescript
useEffect(() => {
  if (!profile?.shop_id) return;
  loadData();
}, [profile?.shop_id]);
```

### Add loading check:
```typescript
if (authLoading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
if (!profile) return <DashboardLayout><div>Profile not found</div></DashboardLayout>;
```

---

## 🎨 DASHBOARDLAYOUT (src/components/DashboardLayout.tsx)

### Add after imports:
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

### Add inside component (after line 28):
```typescript
const { profile, shop } = useAuth();
```

### Update fetchLowStock (line 74):
```typescript
async function fetchLowStock() {
  if (!profile?.shop_id) return;

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, brand, model, size, quantity')
      .eq('shop_id', profile.shop_id)  // ← ADD THIS
      .lt('quantity', 5)
      .order('quantity', { ascending: true });
```

### Update search (line 205):
```typescript
const { data: customers } = await supabase
  .from('customers')
  .select('id, name, email, phone')
  .eq('shop_id', profile.shop_id)  // ← ADD THIS
  .or(`name.ilike.%${globalSearch}%,email.ilike.%${globalSearch}%,phone.ilike.%${globalSearch}%`)
  .limit(5);

const { data: tires } = await supabase
  .from('inventory')
  .select('id, brand, model, size')
  .eq('shop_id', profile.shop_id)  // ← ADD THIS
  .or(`brand.ilike.%${globalSearch}%,model.ilike.%${globalSearch}%,size.ilike.%${globalSearch}%`)
  .limit(5);
```

### Add shop name to header (around line 270):
```typescript
<div className="flex items-center gap-4">
  {shop && (
    <div className="text-sm text-text-muted">
      {shop.name}
    </div>
  )}
  {/* ... rest of header */}
</div>
```

---

## 🎯 QUICK CHECKLIST

For each page above:
1. [ ] Import `useAuth` from '@/contexts/AuthContext'
2. [ ] Add `const { profile, ... } = useAuth()` at component start
3. [ ] Add `if (!profile?.shop_id) return` to all load functions
4. [ ] Add `.eq('shop_id', profile.shop_id)` to ALL queries
5. [ ] Add `shop_id: profile.shop_id` when creating/updating records
6. [ ] Update `useEffect` dependencies to include `profile?.shop_id`
7. [ ] Add loading checks before return statement
8. [ ] Disable buttons based on `canEdit`/`canDelete`/`isOwner`

---

## 🧪 TESTING AFTER UPDATES

Once all pages are updated:

1. **Log in** to the app
2. **Visit each page** - should see your shop's data
3. **Try creating** a customer/inventory/order - should work
4. **Check database** - all new records should have your shop_id
5. **Create a second shop** (different user) - should NOT see first shop's data

---

## ⚡ PERFORMANCE IMPROVEMENTS INCLUDED

- **Work Orders**: Changed from 3 queries → 1 optimized join query
- **All pages**: Added shop_id indexes for fast filtering
- **Dashboard**: Fixed memory leak in subscriptions

---

Would you like me to:
1. **Update all these files automatically** (I can do it)?
2. **Or update them one-by-one** so you can see each change?

Let me know and I'll continue!
