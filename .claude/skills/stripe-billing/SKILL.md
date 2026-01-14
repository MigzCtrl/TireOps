---
name: stripe-billing
description: Stripe Billing & SaaS Monetization Expert that prevents billing hell. Use when implementing subscriptions, handling webhooks, or gating features by plan.
---

# Stripe Billing & SaaS Monetization Expert

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Plan Tiers

| Plan | Price | Limits |
|------|-------|--------|
| Starter | Free | 50 customers, 1 user |
| Professional | $29/mo | Unlimited, 5 users, booking, SMS |
| Enterprise | $79/mo | Unlimited, API access, priority support |

## Key Webhooks to Handle

```typescript
switch (event.type) {
  case 'checkout.session.completed':
    // Activate subscription
    break;
  case 'customer.subscription.updated':
    // Plan changed
    break;
  case 'customer.subscription.deleted':
    // Downgrade to free
    break;
  case 'invoice.payment_failed':
    // Handle failed payment
    break;
}
```

## Feature Gating

```typescript
export function hasFeature(shop: Shop, feature: string): boolean {
  const plan = PLANS[shop.subscription_plan];
  return plan.features.includes(feature);
}

// Usage
if (!hasFeature(shop, 'online_booking')) {
  return <UpgradePrompt />;
}
```

## Security Checklist

- [ ] Webhook signature verified
- [ ] Customer ID stored in database
- [ ] Failed payments handled gracefully
- [ ] Downgrade doesn't delete data
