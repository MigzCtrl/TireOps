# Server Actions (Next.js 16)

This directory contains Server Actions that can be called from Client Components.

## Architecture Pattern

```
Client Component
    ↓ (calls)
Server Action (validates, authenticates)
    ↓ (calls)
Service Layer (business logic)
    ↓ (calls)
Query Layer (database access)
```

## Usage in Client Components

```tsx
'use client';

import { getCustomersAction, createCustomerAction } from '@/app/actions';
import { useState } from 'react';

export function CustomerList() {
  const [loading, setLoading] = useState(false);

  async function handleCreate(formData: FormData) {
    setLoading(true);

    const result = await createCustomerAction({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    });

    if (result.success) {
      console.log('Created:', result.data);
    } else {
      console.error('Error:', result.error);
    }

    setLoading(false);
  }

  return (
    <form action={handleCreate}>
      {/* form fields */}
    </form>
  );
}
```

## Response Format

All actions return a consistent response shape:

```ts
type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

## Available Actions

### Customer Actions (`customers.ts`)
- `getCustomersAction(params)` - List customers with pagination/filtering
- `getCustomerByIdAction(id)` - Get single customer
- `createCustomerAction(data)` - Create new customer
- `updateCustomerAction(id, data)` - Update customer
- `deleteCustomerAction(id)` - Delete customer
- `getNewCustomersCountAction(days)` - Get count of new customers

### Vehicle Actions (`vehicles.ts`)
- `getVehiclesAction(params)` - List vehicles with pagination/filtering
- `getVehicleByIdAction(id)` - Get single vehicle
- `getCustomerVehiclesAction(customerId)` - Get all vehicles for a customer
- `createVehicleAction(data)` - Create new vehicle
- `updateVehicleAction(id, data)` - Update vehicle
- `deleteVehicleAction(id)` - Delete vehicle
- `getCustomerVehicleCountAction(customerId)` - Get vehicle count for customer

## Validation

All actions use Zod schemas for input validation. Validation errors are returned in the error field.

## Authentication

All actions check for:
1. Valid user session
2. User's shop_id for multi-tenant isolation

Unauthorized requests return `{ success: false, error: 'Unauthorized' }`.

## Error Handling

Actions catch and handle:
- Zod validation errors
- Service layer errors
- Database errors
- Authentication errors

All errors are returned as user-friendly messages.
