# Tire Shop MVP - Server Architecture

## Overview

This application follows a 3-tier server-side architecture optimized for Next.js 16 App Router with Server Actions.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│     Client Components (UI)              │
│  src/app/*/page.tsx, components/        │
└────────────────┬────────────────────────┘
                 │
                 │ import & call
                 │
┌────────────────▼────────────────────────┐
│     Server Actions Layer                │
│  src/app/actions/*.ts                   │
│  - Input validation (Zod)               │
│  - Authentication checks                │
│  - Error handling                       │
│  - Response formatting                  │
└────────────────┬────────────────────────┘
                 │
                 │ import & call
                 │
┌────────────────▼────────────────────────┐
│     Service Layer                       │
│  src/lib/services/*.service.ts          │
│  - Business logic                       │
│  - Data validation                      │
│  - Multi-step operations                │
│  - Domain rules enforcement             │
└────────────────┬────────────────────────┘
                 │
                 │ import & call
                 │
┌────────────────▼────────────────────────┐
│     Query Layer                         │
│  src/lib/queries/*.queries.ts           │
│  - Database operations                  │
│  - RLS enforcement (shop_id)            │
│  - Type-safe queries                    │
│  - No business logic                    │
└────────────────┬────────────────────────┘
                 │
                 │ Supabase client
                 │
┌────────────────▼────────────────────────┐
│     Supabase (PostgreSQL)               │
│  - Database                             │
│  - Row Level Security (RLS)             │
│  - Multi-tenant isolation               │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app/
│   ├── actions/                    # Server Actions (Next.js 16)
│   │   ├── customers.ts           # Customer CRUD actions
│   │   ├── vehicles.ts            # Vehicle CRUD actions
│   │   ├── index.ts               # Centralized exports
│   │   └── README.md              # Usage documentation
│   │
├── lib/
│   ├── services/                   # Business Logic Layer
│   │   ├── customer.service.ts    # Customer business logic
│   │   ├── vehicle.service.ts     # Vehicle business logic
│   │   └── index.ts               # Centralized exports
│   │
│   ├── queries/                    # Database Query Layer
│   │   ├── customer.queries.ts    # Customer DB queries
│   │   ├── vehicle.queries.ts     # Vehicle DB queries
│   │   └── index.ts               # Centralized exports
│   │
│   ├── supabase/                   # Supabase Utilities
│   │   ├── client.server.ts       # Server-side Supabase client
│   │   └── auth.ts                # Auth helpers (getCurrentUser, etc.)
│   │
│   └── validations/
│       └── schemas.ts              # Zod validation schemas
```

## Layer Responsibilities

### 1. Server Actions (`src/app/actions/`)

**Purpose**: API endpoints for Client Components

**Responsibilities**:
- Validate input with Zod schemas
- Check authentication and permissions
- Call service layer functions
- Handle errors and return structured responses
- Format responses consistently

**Example**:
```ts
'use server';

export async function createCustomerAction(input) {
  try {
    // 1. Validate input
    const validatedData = createCustomerSchema.parse(input);

    // 2. Check auth
    const shopId = await getCurrentShopId();
    if (!shopId) return { success: false, error: 'Unauthorized' };

    // 3. Call service
    const result = await customerService.createCustomer(validatedData, shopId);

    // 4. Return formatted response
    if (result.error) return { success: false, error: result.error };
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Failed to create customer' };
  }
}
```

### 2. Service Layer (`src/lib/services/`)

**Purpose**: Business logic and domain rules

**Responsibilities**:
- Implement business rules (e.g., "customer needs email or phone")
- Sanitize and normalize data
- Orchestrate multi-step operations
- Call query layer for database access
- Return typed results

**Example**:
```ts
export async function createCustomer(input, shopId) {
  // Business rule: sanitize inputs
  const sanitized = {
    name: sanitizeInput(input.name.trim()),
    email: input.email?.trim().toLowerCase(),
  };

  // Business rule: require contact method
  if (!sanitized.email && !input.phone) {
    return { data: null, error: 'Email or phone required' };
  }

  // Call query layer
  return await customerQueries.createCustomer(sanitized, shopId);
}
```

### 3. Query Layer (`src/lib/queries/`)

**Purpose**: Raw database access

**Responsibilities**:
- Execute Supabase queries
- Enforce shop_id filtering (RLS)
- Handle pagination and sorting
- Return typed results
- **NO** business logic

**Example**:
```ts
export async function createCustomer(data, shopId) {
  const supabase = await createSupabaseServerClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({ ...data, shop_id: shopId })
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: customer, error: null };
}
```

## Multi-Tenant Isolation

All queries enforce `shop_id` filtering to ensure data isolation between tenants:

```ts
// Always filter by shop_id
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('shop_id', shopId);  // ← CRITICAL for multi-tenant isolation
```

## Authentication Helpers

### `getCurrentUser()`
Returns the current authenticated user

### `getCurrentUserProfile()`
Returns the user's profile including `shop_id` and `role`

### `getCurrentShopId()`
Returns just the shop_id (most commonly used)

### `hasPermission(role)`
Checks if user has required permission level

## Usage Examples

### In a Client Component

```tsx
'use client';

import { getCustomersAction, createCustomerAction } from '@/app/actions';

export function CustomersPage() {
  async function loadCustomers() {
    const result = await getCustomersAction({ page: 1, pageSize: 10 });

    if (result.success) {
      setCustomers(result.data.customers);
    } else {
      showError(result.error);
    }
  }

  async function handleCreate(formData) {
    const result = await createCustomerAction({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
    });

    if (result.success) {
      console.log('Created:', result.data);
    }
  }
}
```

## Extending the Architecture

### Adding a New Domain (e.g., Inventory)

1. **Create Query Layer** (`src/lib/queries/inventory.queries.ts`)
   ```ts
   export async function getInventoryItems(shopId, page, pageSize) {
     // Database queries
   }
   ```

2. **Create Service Layer** (`src/lib/services/inventory.service.ts`)
   ```ts
   export async function createInventoryItem(input, shopId) {
     // Business logic + call queries
   }
   ```

3. **Create Server Actions** (`src/app/actions/inventory.ts`)
   ```ts
   'use server';
   export async function createInventoryItemAction(input) {
     // Validate, auth, call service
   }
   ```

4. **Export from index files**
   - Add to `src/lib/queries/index.ts`
   - Add to `src/lib/services/index.ts`
   - Add to `src/app/actions/index.ts`

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to test each layer independently
3. **Reusability**: Services can be called from multiple actions
4. **Type Safety**: TypeScript types flow through all layers
5. **Consistency**: Standardized patterns across the codebase
6. **Multi-tenant Safe**: shop_id enforcement at query layer
7. **Maintainability**: Easy to locate and modify code

## Response Format Standard

All Server Actions return:

```ts
type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

This provides a consistent interface for Client Components to handle success/error cases.

## Next Steps

To expand this architecture to other domains:

1. **Work Orders**
   - `work-order.queries.ts`
   - `work-order.service.ts` (handle scheduling conflicts, total calculations)
   - `work-orders.ts` actions

2. **Inventory**
   - `inventory.queries.ts`
   - `inventory.service.ts` (stock validation, low stock alerts)
   - `inventory.ts` actions

3. **Analytics**
   - `analytics.queries.ts` (aggregate queries)
   - `analytics.service.ts` (calculations, trending)
   - `analytics.ts` actions
