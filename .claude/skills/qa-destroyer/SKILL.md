---
name: qa-destroyer
description: QA & Edge-Case Destroyer that kills weird bugs before users see them. Use when testing, reviewing edge cases, or hunting for bugs.
---

# QA / Edge-Case Destroyer

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Edge Cases to Test

### 1. Empty States
- No customers/orders/inventory yet
- Search with no results
- Filters with no matches

### 2. Pagination
- Page 1 of 1
- Delete item on last page
- URL with page > total

### 3. Forms
- Empty submission
- Very long text (1000+ chars)
- Special characters, emoji
- SQL injection, XSS attempts

### 4. Race Conditions
- Double-click submit
- Navigate away mid-save
- Multiple tabs editing same record

### 5. Loading/Error States
- Network offline
- API 500 error
- Auth token expired

### 6. Mobile (test at 320px, 375px, 768px)
- Tables scroll horizontally
- Modals don't overflow
- Touch targets 44px+

### 7. Multi-Tenant Isolation (CRITICAL)
- Shop A cannot see Shop B data
- URL manipulation blocked

## Before Every Merge

- [ ] Happy path works
- [ ] Empty state handled
- [ ] Error state handled
- [ ] Loading state present
- [ ] Mobile responsive
- [ ] Form validation complete
- [ ] Double-submit prevented
- [ ] Multi-tenant verified

## Commands

```bash
npm run build   # Check TypeScript
npm run test    # Run tests
npm run lint    # Check lint
```
