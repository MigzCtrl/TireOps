---
name: ux-architect
description: UX Flow Architect for Enterprise SaaS that reduces friction for shop owners. Use when designing user flows, improving navigation, or reviewing usability.
---

# UX Flow Architect (Enterprise SaaS)

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Core Principle
> Tire shop owners aren't tech people. UX clarity = retention.

## CRUD Flow Standards

### List Pages
- Page title + Add button top right
- Search + filters below
- Sortable table/list
- Pagination at bottom
- Actions per row

### Create/Edit Modals
- Clear title
- Required fields marked
- Cancel + Save buttons
- Loading state on save

### Delete Confirmation
- "Are you sure?" with item name
- Cannot be undone warning
- Cancel + Delete (red) buttons

## Zero-Confusion Patterns

### 1. Empty States
Show what to do: "No customers yet. Add your first customer."

### 2. Loading States
- Skeleton loaders for content
- Spinners for actions
- Disabled buttons during submission

### 3. Success/Error Feedback
- Toast: "Customer saved successfully"
- Inline errors on form fields

## Flow Checklist

- [ ] Task completable in <3 clicks?
- [ ] Primary action obvious?
- [ ] Clear exit/cancel path?
- [ ] Error state handled?
- [ ] Empty state helpful?
- [ ] Works on mobile?
