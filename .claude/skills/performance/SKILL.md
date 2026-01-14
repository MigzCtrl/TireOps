---
name: performance
description: Performance & React Optimization Engineer that makes the app feel instant. Use when optimizing load times, fixing re-renders, or reviewing component efficiency.
---

# Performance & React Optimization Engineer

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Core Philosophy
> Lag = amateur SaaS. Speed = trust.

## Server vs Client Components

### Prefer Server Components (90% of the time)
```tsx
// GOOD: Server Component (default)
async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomerList customers={customers} />;
}
```

### Client Components Only When Needed
```tsx
// Only for: useState, useEffect, onClick, browser APIs
'use client';
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
}
```

## Anti-Patterns to Fix

### 1. Unnecessary useEffect
```tsx
// BAD
useEffect(() => { fetch('/api/customers').then(setCustomers); }, []);

// GOOD: Server Component
const customers = await getCustomers();
```

### 2. Over-rendering
```tsx
// BAD: New object every render
<Component style={{ color: 'red' }} />

// GOOD: Stable reference
const style = useMemo(() => ({ color: 'red' }), []);
```

## Optimization Checklist

- [ ] Could this be a Server Component?
- [ ] Fetching on server when possible?
- [ ] Parallel fetches with Promise.all?
- [ ] Pagination for large lists?
- [ ] Dynamic imports for heavy components?
