# Database Schema Documentation

This document provides a comprehensive overview of the Tire Shop MVP database schema, including all tables, relationships, indexes, and security policies.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Tables](#core-tables)
  - [shops](#shops)
  - [profiles](#profiles)
  - [customers](#customers)
  - [customer_vehicles](#customer_vehicles)
  - [inventory](#inventory)
  - [work_orders](#work_orders)
  - [work_order_items](#work_order_items)
  - [tasks](#tasks)
  - [shop_invitations](#shop_invitations)
- [Database Functions](#database-functions)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Multi-Tenancy](#multi-tenancy)
- [Authentication & Authorization](#authentication--authorization)

---

## Overview

The Tire Shop MVP uses PostgreSQL (via Supabase) with a multi-tenant architecture. Each shop's data is completely isolated using Row Level Security (RLS) policies that enforce access control based on user roles.

**Key Features:**
- Multi-tenant with shop-level isolation
- Role-based access control (Owner, Staff, Viewer)
- Row Level Security on all tables
- Optimized indexes for performance
- Atomic transactions for complex operations
- Real-time subscriptions via Supabase

---

## Architecture

### Multi-Tenant Design

The database uses a **shared database, shared schema** approach with logical isolation:

1. Each shop has a unique `shop_id`
2. All tenant-specific tables include a `shop_id` foreign key
3. RLS policies enforce that users can only access data for their shop
4. Helper functions provide context-aware access control

### Data Flow

```
auth.users (Supabase Auth)
    ↓
profiles (links users to shops + role)
    ↓
shops (tenant container)
    ↓
├── customers
│   └── customer_vehicles
├── inventory
├── work_orders
│   └── work_order_items
├── tasks
└── shop_invitations
```

---

## Core Tables

### shops

The tenant container table. Each shop represents a separate tire shop business.

**Purpose:** Store shop-level information and settings.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique shop identifier |
| `name` | TEXT | NOT NULL | Shop name |
| `owner_id` | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Shop owner (creator) |
| `email` | TEXT | | Shop contact email |
| `phone` | TEXT | | Shop phone number |
| `address` | TEXT | | Shop physical address |
| `tax_rate` | DECIMAL(5,2) | DEFAULT 0 | Default tax rate percentage (e.g., 8.25 for 8.25%) |
| `currency` | VARCHAR(3) | DEFAULT 'USD' | Currency code (USD, EUR, GBP, etc.) |
| `email_notifications` | BOOLEAN | DEFAULT true | Whether email notifications are enabled |
| `low_stock_threshold` | INTEGER | DEFAULT 10 | Threshold for low stock alerts |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Shop creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_shops_owner` on `owner_id`
- `idx_shops_name` on `name`
- `idx_shops_created_at` on `created_at DESC`

**RLS Policies:**
- **View:** Users can view their own shop (via profiles.shop_id)
- **Update:** Only owners can update shop settings

**Relationships:**
- Referenced by: `profiles`, `customers`, `inventory`, `work_orders`, `tasks`, `shop_invitations`

**Triggers:**
- `update_shops_updated_at` - Updates `updated_at` on row changes

---

### profiles

Links users to shops and defines their role. One profile per user.

**Purpose:** Connect Supabase auth.users to shops with role-based permissions.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID (from Supabase Auth) |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop this user belongs to |
| `role` | TEXT | NOT NULL, CHECK (role IN ('owner', 'staff', 'viewer')) | User role |
| `full_name` | TEXT | | User's full name |
| `email` | TEXT | | User's email (denormalized from auth.users) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Profile creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_profiles_shop` on `shop_id`
- `idx_profiles_role` on `shop_id, role` (composite)
- `idx_profiles_shop_id` on `shop_id`
- `idx_profiles_shop_role` on `shop_id, role` (composite)

**RLS Policies:**
- **View:** Users can view profiles in their shop
- **Manage:** Only owners can create/update/delete profiles

**Relationships:**
- References: `shops`, `auth.users`

**Triggers:**
- `update_profiles_updated_at` - Updates `updated_at` on row changes
- `on_auth_user_created` - Automatically creates profile + shop for new users

**Notes:**
- One user can only belong to one shop at a time
- When accepting an invitation, user's profile is moved to the new shop
- Role determines permissions across the entire application

---

### customers

Stores customer information for each shop.

**Purpose:** Track tire shop customers with contact information.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique customer identifier |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop this customer belongs to |
| `name` | TEXT | NOT NULL | Customer name |
| `email` | TEXT | | Customer email |
| `phone` | TEXT | NOT NULL | Customer phone number (required) |
| `address` | TEXT | | Customer address |
| `notes` | TEXT | | Additional notes about customer |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Customer creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_customers_shop_id` on `shop_id`
- `idx_customers_shop_name` on `shop_id, name` (composite)
- `idx_customers_shop_created` on `shop_id, created_at DESC` (composite)
- `idx_customers_email` on `email` WHERE email IS NOT NULL (partial)
- `idx_customers_phone` on `phone`
- `idx_customers_created_at` on `created_at DESC`
- `idx_customers_shop_phone` on `shop_id, phone` (composite)

**Constraints:**
- `customers_shop_phone_unique` - Unique constraint on (shop_id, phone) to prevent duplicate customers

**RLS Policies:**
- **View:** All roles can view their shop's customers
- **Create:** Owner and Staff can create customers
- **Update:** Owner and Staff can update customers
- **Delete:** Only Owner can delete customers

**Relationships:**
- References: `shops`
- Referenced by: `customer_vehicles`, `work_orders`

---

### customer_vehicles

Stores vehicle information for customers.

**Purpose:** Track which vehicles each customer owns for service history and recommendations.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique vehicle identifier |
| `customer_id` | UUID | NOT NULL, REFERENCES customers(id) ON DELETE CASCADE | Customer who owns this vehicle |
| `year` | INTEGER | NOT NULL, CHECK (year >= 1900 AND year <= 2100) | Vehicle year |
| `make` | VARCHAR(100) | NOT NULL | Vehicle manufacturer (e.g., Toyota, Honda) |
| `model` | VARCHAR(100) | NOT NULL | Vehicle model (e.g., Camry, Civic) |
| `trim` | VARCHAR(100) | | Vehicle trim level (optional) |
| `recommended_tire_size` | VARCHAR(50) | | Recommended tire size for this vehicle |
| `notes` | TEXT | | Additional notes about the vehicle |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_customer_vehicles_customer_id` on `customer_id`

**RLS Policies:**
- **View:** Users can view vehicles for customers in their shop
- **Insert:** Users can add vehicles for customers in their shop
- **Update:** Users can update vehicles for customers in their shop
- **Delete:** Users can delete vehicles for customers in their shop

**Relationships:**
- References: `customers`

**Triggers:**
- `update_customer_vehicles_updated_at` - Updates `updated_at` on row changes

**Notes:**
- Customers can have multiple vehicles
- Isolation is indirect via customers table (shop_id)

---

### inventory

Stores tire inventory for each shop.

**Purpose:** Track tire stock levels, pricing, and specifications.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique inventory item identifier |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop this inventory belongs to |
| `brand` | TEXT | NOT NULL | Tire brand (e.g., Michelin, Goodyear) |
| `model` | TEXT | NOT NULL | Tire model name |
| `size` | TEXT | NOT NULL | Tire size (e.g., 205/55R16) |
| `quantity` | INTEGER | NOT NULL, DEFAULT 0 | Current stock quantity |
| `price` | DECIMAL(10,2) | NOT NULL | Price per tire |
| `cost` | DECIMAL(10,2) | | Cost per tire (for profit tracking) |
| `season` | TEXT | | Tire season type (all-season, winter, summer) |
| `notes` | TEXT | | Additional notes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_inventory_shop` on `shop_id`
- `idx_inventory_shop_brand` on `shop_id, brand, model` (composite)
- `idx_inventory_shop_quantity` on `shop_id, quantity` (composite)
- `idx_inventory_shop_id` on `shop_id`
- `idx_inventory_brand` on `brand`
- `idx_inventory_size` on `size`
- `idx_inventory_quantity` on `quantity`
- `idx_inventory_search` on `brand, model, size` (composite)

**RLS Policies:**
- **View:** All roles can view their shop's inventory
- **Create:** Only Owner can add inventory
- **Update:** Only Owner can update inventory
- **Delete:** Only Owner can delete inventory

**Relationships:**
- References: `shops`
- Referenced by: `work_order_items`

**Notes:**
- Use `update_inventory_atomic()` function for concurrent-safe quantity updates
- Low stock alerts triggered when quantity <= shop.low_stock_threshold

---

### work_orders

Stores service appointments and work orders.

**Purpose:** Track scheduled tire services and installations for customers.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique work order identifier |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop this work order belongs to |
| `customer_id` | UUID | REFERENCES customers(id) ON DELETE SET NULL | Customer for this service |
| `service_type` | TEXT | NOT NULL | Type of service (e.g., "Tire Installation") |
| `scheduled_date` | DATE | NOT NULL | Date of scheduled service |
| `scheduled_time` | TIME | | Time of scheduled service |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | Order status (pending, in_progress, completed, cancelled) |
| `total_amount` | DECIMAL(10,2) | | Total order amount (calculated from items) |
| `notes` | TEXT | | Service notes and special instructions |
| `tire_id` | UUID | REFERENCES inventory(id) ON DELETE SET NULL | Legacy: single tire reference (optional, superseded by work_order_items) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_work_orders_shop` on `shop_id`
- `idx_work_orders_shop_date` on `shop_id, scheduled_date DESC` (composite)
- `idx_work_orders_shop_status` on `shop_id, status` (composite)
- `idx_work_orders_customer` on `customer_id`
- `idx_work_orders_shop_id` on `shop_id`
- `idx_work_orders_customer_id` on `customer_id` WHERE customer_id IS NOT NULL (partial)
- `idx_work_orders_tire_id` on `tire_id` WHERE tire_id IS NOT NULL (partial)
- `idx_work_orders_schedule` on `scheduled_date, scheduled_time` (composite)
- `idx_work_orders_status` on `status`
- `idx_work_orders_created_at` on `created_at DESC`

**RLS Policies:**
- **View:** All roles can view their shop's work orders
- **Create:** Owner and Staff can create work orders
- **Update:** Owner and Staff can update work orders
- **Delete:** Only Owner can delete work orders

**Relationships:**
- References: `shops`, `customers`, `inventory` (legacy)
- Referenced by: `work_order_items`

**Notes:**
- Use `create_work_order_with_items()` function to create order with items atomically
- Use `complete_work_order()` function to mark completed and deduct inventory atomically

---

### work_order_items

Line items for work orders, allowing multiple tires per order.

**Purpose:** Support multiple different tires in a single work order.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique line item identifier |
| `work_order_id` | UUID | NOT NULL, REFERENCES work_orders(id) ON DELETE CASCADE | Work order this item belongs to |
| `tire_id` | UUID | NOT NULL, REFERENCES inventory(id) | Tire being installed |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Quantity of this tire |
| `unit_price` | DECIMAL(10,2) | NOT NULL | Price per tire at time of order |
| `subtotal` | DECIMAL(10,2) | NOT NULL | Calculated: quantity × unit_price |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes:**
- `idx_work_order_items_work_order_id` on `work_order_id`
- `idx_work_order_items_tire_id` on `tire_id`
- `idx_work_order_items_composite` on `work_order_id, tire_id` (composite)
- `idx_work_order_items_order` on `work_order_id`
- `idx_work_order_items_tire` on `tire_id`

**RLS Policies:**
- **View:** Users can view items for their shop's work orders (via work_orders table)
- **Create:** Owner and Staff can create items for their shop's work orders
- **Update:** Owner and Staff can update items for their shop's work orders
- **Delete:** Only Owner can delete items

**Relationships:**
- References: `work_orders`, `inventory`

**Notes:**
- Isolation is indirect via work_orders.shop_id
- RLS policies check work_order_id IN (SELECT id FROM work_orders WHERE shop_id = user_shop_id())

---

### tasks

Quick tasks/todos for shop management (shop-scoped, not user-scoped).

**Purpose:** Allow shop team members to collaborate on shared tasks.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique task identifier |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop this task belongs to |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE | User who created the task (historical) |
| `title` | TEXT | NOT NULL | Task title/description |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false | Whether task is completed |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Task creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_tasks_user_id` on `user_id`
- `idx_tasks_completed` on `completed`
- `idx_tasks_shop_id` on `shop_id`
- `idx_tasks_shop_completed` on `shop_id, completed` (composite)

**RLS Policies:**
- **View:** All users in shop can view shop tasks
- **Create:** Owner and Staff can create tasks
- **Update:** Owner and Staff can update tasks
- **Delete:** Owner and Staff can delete tasks

**Relationships:**
- References: `shops`, `auth.users`

**Real-time:**
- Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks`

**Notes:**
- Tasks are shared across all shop members (not user-specific)
- Any shop member can complete/uncomplete tasks
- user_id tracks who created it but doesn't restrict access

---

### shop_invitations

Email invitations for adding staff members to shops.

**Purpose:** Allow shop owners to invite staff via email with expiring tokens.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique invitation identifier |
| `shop_id` | UUID | NOT NULL, REFERENCES shops(id) ON DELETE CASCADE | Shop the invitation is for |
| `email` | TEXT | NOT NULL | Email address invited |
| `role` | TEXT | NOT NULL, DEFAULT 'staff', CHECK (role IN ('staff', 'viewer')) | Role being offered |
| `token` | UUID | NOT NULL, DEFAULT gen_random_uuid() | Unique token for accepting invitation |
| `invited_by` | UUID | NOT NULL, REFERENCES auth.users(id) | User who sent the invitation |
| `expires_at` | TIMESTAMPTZ | NOT NULL, DEFAULT (now() + interval '7 days') | Invitation expiration timestamp |
| `accepted_at` | TIMESTAMPTZ | | When invitation was accepted (NULL if not accepted) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Invitation creation timestamp |

**Indexes:**
- `idx_invitations_token` on `token`
- `idx_invitations_email` on `email`

**Constraints:**
- `UNIQUE(shop_id, email)` - Can't invite same email twice to same shop

**RLS Policies:**
- **Manage:** Only shop owners can create/view/manage invitations for their shop
- **View by token:** Anyone can view invitation by token (for accepting)

**Relationships:**
- References: `shops`, `auth.users` (invited_by)

**Notes:**
- Invitations expire after 7 days by default
- Use `accept_invitation()` function to accept and create/update profile
- Accepting invitation moves user to new shop (updates existing profile)

---

## Database Functions

### Helper Functions (for RLS)

These functions provide context-aware access control in RLS policies.

#### `public.user_shop_id()`

Returns the current user's shop_id from their profile.

```sql
CREATE OR REPLACE FUNCTION public.user_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage in RLS:**
```sql
USING (shop_id = public.user_shop_id())
```

#### `public.user_role()`

Returns the current user's role from their profile.

```sql
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

#### `public.is_owner()`

Returns true if current user is a shop owner.

```sql
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
    SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage in RLS:**
```sql
USING (shop_id = public.user_shop_id() AND public.is_owner())
```

#### `public.can_edit()`

Returns true if current user is owner or staff (can edit data).

```sql
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN AS $$
    SELECT role IN ('owner', 'staff') FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage in RLS:**
```sql
WITH CHECK (shop_id = public.user_shop_id() AND public.can_edit())
```

---

### Transaction Functions

#### `complete_work_order(p_work_order_id UUID, p_shop_id UUID)`

Atomically completes a work order and deducts inventory.

**Returns:** JSON with success status

```sql
SELECT complete_work_order(
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001'
);
```

**Behavior:**
1. Validates work order exists and isn't already completed
2. Updates work order status to 'completed'
3. Deducts inventory quantities for each work_order_item
4. Prevents negative inventory (uses GREATEST(0, quantity - deduction))
5. All operations in single transaction (all succeed or all fail)

#### `calculate_work_order_total(p_work_order_id UUID)`

Calculates total amount from work order items.

**Returns:** NUMERIC (total amount)

```sql
SELECT calculate_work_order_total('123e4567-e89b-12d3-a456-426614174000');
```

#### `create_work_order_with_items(...)`

Creates a work order with multiple items in a single transaction.

**Parameters:**
- `p_shop_id` - Shop ID
- `p_customer_id` - Customer ID
- `p_service_type` - Service type string
- `p_scheduled_date` - Date of service
- `p_scheduled_time` - Time of service
- `p_notes` - Service notes
- `p_items` - JSON array of items: `[{tire_id, quantity, unit_price}, ...]`

**Returns:** JSON with work_order_id and total_amount

```sql
SELECT create_work_order_with_items(
  'shop-uuid',
  'customer-uuid',
  'Tire Installation',
  '2025-01-15',
  '10:00:00',
  'Customer requested alignment check',
  '[{"tire_id": "tire-uuid", "quantity": 4, "unit_price": 120.00}]'
);
```

#### `update_inventory_atomic(p_tire_id UUID, p_quantity_change INTEGER, p_shop_id UUID)`

Thread-safe inventory quantity update (prevents race conditions).

**Returns:** TABLE(new_quantity INTEGER, success BOOLEAN, error_message TEXT)

```sql
SELECT * FROM update_inventory_atomic(
  'tire-uuid',
  -4,  -- Negative to decrease, positive to increase
  'shop-uuid'
);
```

**Behavior:**
- Locks row during update (FOR UPDATE)
- Prevents negative quantities (uses GREATEST(0, ...))
- Returns new quantity and success status

#### `accept_invitation(p_token UUID, p_user_id UUID)`

Accepts a shop invitation and creates/updates user profile.

**Returns:** JSONB with success status, shop_id, and role

```sql
SELECT accept_invitation('token-uuid', auth.uid());
```

**Behavior:**
1. Validates invitation exists and hasn't expired
2. Creates new profile if user doesn't have one
3. Updates existing profile to new shop if user already has profile
4. Marks invitation as accepted

#### `handle_new_user()`

Trigger function that runs when a new user signs up.

**Trigger:** `on_auth_user_created` ON `auth.users` AFTER INSERT

**Behavior:**
1. Creates a new shop with default name "My Tire Shop"
2. Creates a profile linking user to shop with 'owner' role
3. Populates profile with user metadata from auth

---

### Trigger Functions

#### `update_updated_at_column()`

Generic trigger function to update `updated_at` timestamp.

**Used by:** shops, profiles, customer_vehicles, and other tables with `updated_at` column

```sql
CREATE TRIGGER update_table_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Entity Relationship Diagram

```
┌─────────────┐
│ auth.users  │ (Supabase Auth)
└──────┬──────┘
       │
       │ 1:1
       ↓
┌─────────────┐      ┌──────────────┐
│  profiles   │ N:1  │    shops     │
│             ├─────→│              │
│ - id (PK)   │      │ - id (PK)    │
│ - shop_id   │      │ - owner_id   │
│ - role      │      │ - name       │
└─────────────┘      │ - settings   │
                     └──────┬───────┘
                            │
       ┌────────────────────┼────────────────────┬──────────────────┐
       │                    │                    │                  │
       ↓ 1:N                ↓ 1:N                ↓ 1:N              ↓ 1:N
┌──────────────┐     ┌──────────────┐    ┌─────────────┐   ┌──────────────┐
│  customers   │     │  inventory   │    │    tasks    │   │ shop_invites │
│              │     │              │    │             │   │              │
│ - id (PK)    │     │ - id (PK)    │    │ - id (PK)   │   │ - id (PK)    │
│ - shop_id    │     │ - shop_id    │    │ - shop_id   │   │ - shop_id    │
│ - name       │     │ - brand      │    │ - title     │   │ - email      │
│ - phone      │     │ - model      │    │ - completed │   │ - token      │
└──────┬───────┘     │ - size       │    └─────────────┘   └──────────────┘
       │             │ - quantity   │
       │             │ - price      │
       │             └──────┬───────┘
       │                    │
       │ 1:N                │
       ↓                    │
┌──────────────┐            │
│customer_veh. │            │
│              │            │
│ - id (PK)    │            │
│ - customer_id│            │
│ - year       │            │
│ - make       │            │
│ - model      │            │
└──────────────┘            │
       │                    │
       │ N:1                │ N:1
       ↓                    │
┌──────────────┐            │
│ work_orders  │←───────────┘
│              │
│ - id (PK)    │
│ - shop_id    │
│ - customer_id│
│ - status     │
│ - total      │
└──────┬───────┘
       │
       │ 1:N
       ↓
┌──────────────┐     N:1    ┌──────────────┐
│ work_order_  │───────────→│  inventory   │
│    items     │            └──────────────┘
│              │
│ - id (PK)    │
│ - order_id   │
│ - tire_id    │
│ - quantity   │
│ - price      │
└──────────────┘
```

**Relationship Summary:**

- **1:1** - `auth.users` ↔ `profiles`
- **1:N** - `shops` → `profiles`, `customers`, `inventory`, `work_orders`, `tasks`, `shop_invitations`
- **1:N** - `customers` → `customer_vehicles`, `work_orders`
- **1:N** - `work_orders` → `work_order_items`
- **N:1** - `work_order_items` → `inventory` (tire_id)

---

## Multi-Tenancy

The application uses **shop-level multi-tenancy** where each shop's data is completely isolated.

### Isolation Mechanism

1. **Schema Design:**
   - All tenant-specific tables have a `shop_id` column
   - Foreign keys ensure referential integrity
   - ON DELETE CASCADE ensures data cleanup

2. **Row Level Security:**
   - RLS enabled on all tables
   - Policies check `shop_id = public.user_shop_id()`
   - No user can access data from other shops

3. **Helper Functions:**
   - `user_shop_id()` returns current user's shop
   - Functions are SECURITY DEFINER to access profiles
   - Functions are STABLE for query optimization

### Access Control Matrix

| Table | Viewer | Staff | Owner |
|-------|--------|-------|-------|
| shops | View | View | View, Update |
| profiles | View | View | Full Control |
| customers | View | View, Create, Update | Full Control |
| customer_vehicles | View, Create, Update, Delete | View, Create, Update, Delete | Full Control |
| inventory | View | View | Full Control |
| work_orders | View | View, Create, Update | Full Control |
| work_order_items | View | View, Create, Update | Full Control |
| tasks | View | View, Create, Update, Delete | Full Control |
| shop_invitations | - | - | Full Control |

### Data Isolation Examples

**Query:** `SELECT * FROM customers`

**Without RLS:** Returns all customers from all shops (security breach!)

**With RLS:** Only returns customers where `shop_id = user_shop_id()` (secure!)

**Behind the scenes:**
```sql
SELECT * FROM customers
WHERE shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid())
```

---

## Authentication & Authorization

### Authentication Flow

1. **Sign Up:**
   - User creates account via Supabase Auth
   - `on_auth_user_created` trigger fires
   - New shop created with default name
   - Profile created linking user to shop as owner

2. **Sign In:**
   - User authenticates via Supabase Auth
   - JWT token issued with user ID
   - Profile loaded to determine shop_id and role
   - RLS policies enforce access control

3. **Invitation Flow:**
   - Owner creates invitation via app
   - Invitation email sent with token link
   - New user signs up or existing user logs in
   - `accept_invitation()` called with token
   - User's profile created/updated with new shop

### Authorization Levels

**Owner (Full Control):**
- Manage shop settings
- Invite/remove staff
- Full CRUD on all data
- Delete customers and work orders

**Staff (Operational):**
- View shop data
- Create/update customers
- Create/update work orders
- Manage vehicles
- Manage tasks

**Viewer (Read-Only):**
- View all shop data
- Cannot create or modify data
- Good for accountants or external auditors

### Security Best Practices

1. **Never bypass RLS:**
   - Always use authenticated connections
   - Never disable RLS in production
   - Test policies thoroughly

2. **Use helper functions:**
   - Don't hardcode shop_id in queries
   - Let RLS policies enforce isolation
   - Use `user_shop_id()`, `is_owner()`, etc.

3. **Validate on server:**
   - Use database functions for complex operations
   - Don't trust client-side validation
   - Enforce constraints at database level

4. **Audit access:**
   - Track who creates/modifies records
   - Use `created_at`/`updated_at` timestamps
   - Consider adding `created_by`/`updated_by` columns

---

## Performance Considerations

### Indexes Strategy

All indexes follow these principles:

1. **Foreign Keys:** Always indexed for JOIN performance
2. **Filter Columns:** Status, dates, flags indexed
3. **Composite Indexes:** Shop + filter column for common queries
4. **Partial Indexes:** Use WHERE clause for sparse data

### Query Optimization

**Good Query:**
```sql
SELECT * FROM work_orders
WHERE shop_id = user_shop_id()
  AND status = 'pending'
ORDER BY scheduled_date DESC
LIMIT 20;
```
Uses: `idx_work_orders_shop_status`

**Bad Query:**
```sql
SELECT * FROM work_orders
WHERE LOWER(notes) LIKE '%tire%';
```
No index, full table scan!

### Database Maintenance

Run periodically:

```sql
-- Update statistics
ANALYZE customers;
ANALYZE inventory;
ANALYZE work_orders;

-- Check table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5;
```

---

## Schema Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2025-01-01 | Initial multi-tenant schema with shops, profiles, RLS |
| 1.1 | 2025-01-01 | Added work_order_items for multiple tires per order |
| 1.2 | 2025-01-01 | Fixed work_order_items RLS policies |
| 1.3 | 2025-01-01 | Migrated tasks to shop-scoped |
| 1.4 | 2025-01-01 | Added comprehensive indexes |
| 1.5 | 2025-01-04 | Added transaction functions |
| 1.6 | 2025-01-05 | Added shop settings columns |
| 1.7 | 2025-01-06 | Added shop_invitations, atomic inventory, unique constraints |
| 1.8 | 2026-01-08 | Added customer_vehicles table |

---

## Appendix

### Useful Queries

**Check RLS status:**
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**List all policies:**
```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Check indexes:**
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Find largest tables:**
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

**Count rows per table:**
```sql
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

**Last Updated:** 2026-01-09
