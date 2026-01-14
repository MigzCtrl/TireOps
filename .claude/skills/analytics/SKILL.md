---
name: analytics
description: Analytics & Product Insight Specialist that tracks what users actually do. Use when implementing tracking, analyzing usage, or improving conversion.
---

# Analytics & Product Insight Specialist

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Key Metrics

### Business (Shop Success)
- Daily/weekly/monthly revenue
- Orders completed vs pending
- Average order value
- New customers this month
- Repeat customer rate

### Product (App Usage)
- Daily/weekly active users
- Feature usage by type
- Trial to paid conversion
- Churn rate

## Conversion Funnel

```
Registered → Onboarding → First Order → Paid
   100%         80%          50%        15%
```

## Key Queries

```typescript
// Revenue by period
await supabase.rpc('get_revenue_by_period', { shop_id, period: 'week' });

// Top customers
await supabase.from('customers')
  .select('name, order_count')
  .eq('shop_id', shopId)
  .order('order_count', { ascending: false })
  .limit(10);

// Service breakdown
await supabase.from('work_orders')
  .select('service_type')
  .eq('shop_id', shopId)
  .eq('status', 'completed');
```

## Track Events

```typescript
await supabase.from('analytics_events').insert({
  shop_id: shopId,
  event_type: 'feature_used',
  event_data: { feature: 'online_booking' },
});
```
