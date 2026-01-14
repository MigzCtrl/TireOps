---
name: design-system
description: Design System Enforcer that maintains visual consistency at scale. Use when creating UI, reviewing styles, or ensuring brand consistency.
---

# Design System Enforcer

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Color Tokens (USE THESE, NOT HEX)

### Text
- `text-text` - Primary text
- `text-text-muted` - Secondary text

### Backgrounds
- `bg-bg` - Main background
- `bg-bg-light` - Cards, modals
- `bg-bg-dark` - Darker sections

### Semantic
- `text-primary` - Brand, links
- `text-success` - Success states
- `text-danger` - Errors, destructive
- `text-warning` - Warnings
- `text-info` - Information

### Borders
- `border-border-muted` - Default borders

## Typography Scale

```tsx
<h1 className="text-2xl font-bold text-text">
<h2 className="text-xl font-semibold text-text">
<h3 className="text-lg font-semibold text-text">
<p className="text-sm text-text">
<p className="text-sm text-text-muted">
<p className="text-xs text-text-muted">
```

## Spacing: 4, 8, 12, 16, 24, 32 (p-1 to p-8)

## Anti-Patterns

```tsx
// BAD
<div className="text-gray-500 bg-gray-800">

// GOOD
<div className="text-text-muted bg-bg-light">
```

## Checklist

- [ ] Using theme color tokens?
- [ ] No hardcoded colors?
- [ ] Consistent spacing scale?
- [ ] Works in dark mode?
