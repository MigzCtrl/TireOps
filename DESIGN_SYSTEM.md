# Tire Shop MVP - Design System

## Overview

This design system defines the visual language, component patterns, and code conventions for the Tire Shop MVP application. It uses **Tailwind CSS** with **custom CSS variables** based on the **OKLCH color system** for better color consistency across light and dark modes.

---

## Color System

### Design Tokens

All colors are defined using CSS custom properties (CSS variables) to ensure consistency and enable automatic dark mode support.

#### Background Colors
```css
--bg-dark: oklch(...)  /* Lightest - Main page background */
--bg: oklch(...)       /* Middle - Cards, tables, panels */
--bg-light: oklch(...) /* Inputs, hover states, elevated */
```

**Usage:**
- `bg-bg-dark` - Page backgrounds
- `bg-bg` - Card backgrounds, panels
- `bg-bg-light` - Input fields, hover states

#### Text Colors
```css
--text: oklch(...)       /* Main text */
--text-muted: oklch(...) /* Secondary text, labels */
```

**Usage:**
- `text-text` - Headings, body text, primary content
- `text-text-muted` - Labels, placeholder text, secondary information

#### Border Colors
```css
--border: oklch(...)       /* Emphasis borders */
--border-muted: oklch(...) /* Default borders */
--highlight: oklch(...)    /* Focus rings, selected borders */
```

**Usage:**
- `border-border` - Important borders
- `border-border-muted` - Default borders for cards, inputs
- `ring-highlight` - Focus states

#### Semantic Colors
```css
--primary: oklch(...)   /* Purple - Primary actions */
--secondary: oklch(...) /* Yellow-green - Secondary actions */
--danger: oklch(...)    /* Red - Destructive actions */
--warning: oklch(...)   /* Yellow - Warnings */
--success: oklch(...)   /* Green - Success states */
--info: oklch(...)      /* Blue - Informational */
```

**Usage:**
- `bg-primary` / `text-primary` - Primary buttons, links
- `bg-secondary` / `text-secondary` - Secondary actions
- `bg-danger` / `text-danger` - Delete buttons, error states
- `bg-warning` / `text-warning` - Warning alerts
- `bg-success` / `text-success` - Success messages
- `bg-info` / `text-info` - Informational badges

Each semantic color has a corresponding foreground color:
- `text-primary-foreground` - Text on primary backgrounds
- `text-danger-foreground` - Text on danger backgrounds
- etc.

---

## Z-Index Scale

Consistent layering system for overlays and elevated elements:

```css
--z-base: 0           /* Default layer */
--z-dropdown: 1000    /* Dropdowns, selects */
--z-sticky: 1020      /* Sticky headers */
--z-fixed: 1030       /* Fixed positioning */
--z-modal-backdrop: 1040  /* Modal backdrops */
--z-modal: 1050       /* Modal dialogs */
--z-popover: 1060     /* Popovers, tooltips */
--z-tooltip: 1070     /* Tooltips (highest) */
```

**Usage in CSS:**
```css
.dropdown-menu {
  z-index: var(--z-dropdown);
}
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

Special typography for stats/numbers:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Typography Scale (Tailwind)

Use Tailwind's built-in typography scale:

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, captions |
| `text-sm` | 0.875rem (14px) | Body text (compact) |
| `text-base` | 1rem (16px) | Body text (default) |
| `text-lg` | 1.125rem (18px) | Subheadings |
| `text-xl` | 1.25rem (20px) | Section headings |
| `text-2xl` | 1.5rem (24px) | Page titles |
| `text-3xl` | 1.875rem (30px) | Hero headings |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, emphasis |
| `font-semibold` | 600 | Subheadings |
| `font-bold` | 700 | Headings, stats |

---

## Spacing System

Use Tailwind's spacing scale (4px increments):

| Class | Size | Usage |
|-------|------|-------|
| `p-2` / `m-2` | 0.5rem (8px) | Tight spacing |
| `p-4` / `m-4` | 1rem (16px) | Standard spacing |
| `p-6` / `m-6` | 1.5rem (24px) | Section spacing |
| `p-8` / `m-8` | 2rem (32px) | Large spacing |

**Gap utilities:**
- `gap-2`, `gap-3`, `gap-4` for flex/grid layouts

---

## Component Guidelines

### Buttons

#### Primary Button
```tsx
<button className="bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="bg-secondary text-secondary-foreground py-3 px-6 rounded-lg font-medium hover:bg-secondary/90 focus:ring-4 focus:ring-secondary/20 transition-all">
  Secondary Action
</button>
```

#### Danger Button
```tsx
<button className="bg-danger text-danger-foreground py-3 px-6 rounded-lg font-medium hover:bg-danger/90 focus:ring-4 focus:ring-danger/20 transition-all">
  Delete
</button>
```

#### Glass Button (utility class)
```tsx
<button className="btn-glass">
  Glass Effect
</button>
```

### Cards

#### Standard Card
```tsx
<div className="card-glass p-6">
  {/* Card content */}
</div>
```

The `.card-glass` utility provides:
- `bg-bg` background
- `border-border-muted` border
- `rounded-2xl` rounded corners
- Shadow and hover effects

#### Stats Card
```tsx
<div className="stats-card p-6">
  <div className="stats-card-content">
    <h3 className="stat-number text-3xl">$1,234</h3>
    <p className="stat-label text-text-muted">Revenue</p>
  </div>
</div>
```

### Forms

#### Input Field
```tsx
<input
  type="text"
  className="w-full px-4 py-3 rounded-lg border border-border-muted bg-bg-light text-text focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
  placeholder="Enter text..."
/>
```

#### Label
```tsx
<label className="block text-sm font-medium text-text mb-2">
  Field Label
</label>
```

### Dropdowns

Use the custom `<Dropdown>` component or utility classes:

```tsx
import Dropdown from '@/components/Dropdown';

<Dropdown
  options={[
    { value: '1', label: 'Option 1', description: 'Description' },
    { value: '2', label: 'Option 2' }
  ]}
  value={selected}
  onChange={setSelected}
  placeholder="Select option"
/>
```

Or with utility classes:
```css
.dropdown-trigger      /* Full-size dropdown trigger */
.dropdown-trigger-compact  /* Compact dropdown trigger */
.dropdown-menu         /* Dropdown menu container */
.dropdown-item         /* Individual dropdown item */
.dropdown-item-selected /* Selected item state */
```

### Stepper (Quantity Input)

```tsx
import Stepper from '@/components/Stepper';

<Stepper value={quantity} onChange={setQuantity} min={0} max={100} />
```

Utility classes available:
- `.stepper-button` - Increment/decrement buttons
- `.stepper-input` - Numeric input field
- `.stepper-display` - Read-only display

---

## Common Patterns

### Loading States

**Spinner:**
```tsx
<div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
```

### Error States

```tsx
<div className="p-3 bg-danger/10 border border-danger rounded-lg">
  <p className="text-sm text-danger">Error message here</p>
</div>
```

### Success States

```tsx
<div className="p-3 bg-success/10 border border-success rounded-lg flex items-center gap-2">
  <CheckCircle className="text-success" size={20} />
  <p className="text-sm text-success">Success message</p>
</div>
```

### Empty States

```tsx
<div className="px-6 py-16 text-center">
  <p className="text-sm text-text-muted">No items found</p>
</div>
```

### Badges

```tsx
<span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
  Badge Text
</span>
```

Semantic variants:
- `bg-success/10 text-success` - Success badge
- `bg-warning/10 text-warning` - Warning badge
- `bg-danger/10 text-danger` - Danger badge
- `bg-info/10 text-info` - Info badge

---

## Accessibility

### Focus States

Always use visible focus indicators:
```css
focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
```

### Touch Targets

Minimum touch target size: **44x44px** (iOS/Material Design standard)

For small icons, add adequate padding:
```tsx
<button className="p-2">  {/* Ensures 44x44px minimum */}
  <Icon size={20} />
</button>
```

### Color Contrast

All color combinations meet **WCAG AA** standards:
- Text on `bg-bg`: 7:1 contrast ratio
- Primary button text: 4.5:1 minimum

### ARIA Labels

Add labels for interactive elements without visible text:
```tsx
<button aria-label="Close dialog" onClick={onClose}>
  <X size={20} />
</button>
```

---

## Dark Mode

Dark mode is handled automatically via CSS variables. The `.dark` class switches all theme variables.

**Manual toggling:**
```tsx
import { useTheme } from '@/contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();
```

### Dark Mode Best Practices

1. **Always use theme variables** - Never hardcode colors
2. **Test in both modes** - Ensure readability
3. **Use opacity for overlays** - e.g., `bg-primary/10`
4. **Avoid pure black/white** - Use theme colors instead

---

## Animation & Motion

### Transitions

Standard transition:
```css
transition-all duration-200
```

Longer transitions for transforms:
```css
transition-all duration-300 ease-out
```

### Hover Effects

**Lift effect:**
```css
hover:-translate-y-1 hover:shadow-lg
```

**Press effect:**
```css
active:scale-[0.98]
```

Use `.btn-press` utility class for buttons:
```tsx
<button className="btn-press ...">
```

### Loading Animations

**Shimmer effect:**
```css
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

**Pulse:**
```css
animate-pulse
```

---

## Code Conventions

### Component Structure

```tsx
'use client'; // If using React hooks

import { useState } from 'react';
import Link from 'next/link';
// ... other imports

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState('');

  return (
    <div className="card-glass p-6">
      <h2 className="text-2xl font-bold text-text mb-4">{title}</h2>
      {/* Component content */}
    </div>
  );
}
```

### CSS Class Order

Follow this order for readability:
1. Layout (flex, grid, position)
2. Sizing (w-, h-, max-w-)
3. Spacing (p-, m-, gap-)
4. Typography (text-, font-)
5. Colors (bg-, text-, border-)
6. Effects (rounded-, shadow-, transition-)
7. States (hover:, focus:, active:)

**Example:**
```tsx
<div className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium bg-bg border border-border-muted rounded-lg shadow-md hover:bg-bg-light focus:ring-2 focus:ring-primary transition-all">
```

### Avoiding Anti-Patterns

**DON'T:**
```tsx
// Hardcoded colors
<div className="bg-gray-800 text-gray-100 border-gray-700">

// Inline styles for theme colors
<div style={{ backgroundColor: '#f0f0f0' }}>
```

**DO:**
```tsx
// Use theme variables
<div className="bg-bg text-text border-border-muted">

// Use CSS variables for custom values
<div style={{ zIndex: 'var(--z-modal)' }}>
```

---

## File Organization

```
src/
├── app/                    # Next.js app routes
│   ├── globals.css         # Global styles & CSS variables
│   ├── layout.tsx          # Root layout
│   └── [feature]/          # Feature pages
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── Dropdown.tsx        # Custom dropdown
│   ├── Stepper.tsx         # Quantity stepper
│   └── DashboardLayout.tsx # Main layout wrapper
├── contexts/               # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── lib/                    # Utilities
│   ├── supabase/
│   └── utils.ts
└── types/                  # TypeScript types
    └── database.ts
```

---

## Component Inventory

### Custom Components
- `<Dropdown>` - Custom dropdown with search
- `<CustomSelect>` - Portal-based select with keyboard navigation
- `<Stepper>` - Numeric input with +/- buttons
- `<DashboardLayout>` - Main app layout with sidebar & header
- `<TireSelector>` - Tire selection interface

### shadcn/ui Components
- `<Button>` - Button variants
- `<Dialog>` - Modal dialogs
- `<Input>` - Form inputs
- `<Card>` - Card containers
- `<Table>` - Data tables
- `<Badge>` - Status badges
- `<Calendar>` - Date picker
- `<Select>` - Native select (Radix UI)
- `<Popover>` - Popover menus
- `<Toast>` - Toast notifications

---

## Migration Guide

### Replacing Hardcoded Colors

| Old (Hardcoded) | New (Theme Variable) |
|----------------|---------------------|
| `text-gray-900` | `text-text` |
| `text-gray-600` | `text-text-muted` |
| `bg-gray-800` | `bg-bg` |
| `bg-gray-700` | `bg-bg-light` |
| `border-gray-700` | `border-border-muted` |
| `text-blue-600` | `text-primary` |
| `bg-blue-600` | `bg-primary` |
| `text-red-600` | `text-danger` |
| `text-green-600` | `text-success` |
| `text-yellow-600` | `text-warning` |

### Example Migration

**Before:**
```tsx
<button className="bg-blue-600 text-white hover:bg-blue-700 border border-blue-500">
  Click Me
</button>
```

**After:**
```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90 border border-primary">
  Click Me
</button>
```

---

## Tailwind Configuration

The theme is extended in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      'bg-dark': 'var(--bg-dark)',
      'bg': 'var(--bg)',
      'bg-light': 'var(--bg-light)',
      'text': 'var(--text)',
      'text-muted': 'var(--text-muted)',
      'border': 'var(--border)',
      'border-muted': 'var(--border-muted)',
      'highlight': 'var(--highlight)',
      'primary': 'var(--primary)',
      'primary-foreground': 'var(--primary-foreground)',
      // ... etc
    }
  }
}
```

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [OKLCH Color Picker](https://oklch.com/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Changelog

### 2026-01-09
- Initial design system documentation
- Added z-index scale
- Standardized color variables across components
- Cleaned up hardcoded colors in globals.css
- Documented component patterns and utilities
