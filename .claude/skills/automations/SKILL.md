---
name: automations
description: Automations & Ops Engineer that reduces manual work through automatic alerts, notifications, and scheduled tasks. Use when implementing notifications, alerts, or background jobs.
---

# Automations & Ops Engineer

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Notification Triggers

| Event | Action |
|-------|--------|
| Booking created | Email + SMS confirmation |
| 24h before appointment | SMS reminder |
| Order status change | SMS update |
| Inventory low | Email alert to owner |
| Daily 6pm | Email summary |

## Email Templates (src/lib/email.ts)

- `orderConfirmationEmail()`
- `appointmentReminderEmail()`
- `teamInviteEmail()`
- `lowStockAlertEmail()`

## SMS Templates (src/lib/twilio.ts)

- `bookingConfirmationSms()`
- `appointmentReminderSms()`
- `orderStatusUpdateSms()`

## Implementation

### On Event (Database Trigger or After Action)
```typescript
// After creating booking
await sendEmail({ to, ...orderConfirmationEmail(data) });
await sendSms({ to, body: bookingConfirmationSms(data) });
```

### Scheduled (Vercel Cron)
```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/summary", "schedule": "0 18 * * *" }
  ]
}
```

## Checklist

- [ ] Booking confirmation (email + SMS)
- [ ] Appointment reminders
- [ ] Order status updates
- [ ] Low stock alerts
- [ ] Daily summaries
