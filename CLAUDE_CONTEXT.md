# Claude Code Context - Big Boy Tires Project

**Last Updated:** December 14, 2025
**Project Location:** `D:\Tire-Shop-MVP`

---

## 🎯 QUICK RESUME PROMPT

Copy and paste this section to Claude Code to resume exactly where we left off:

```
I'm working on a Next.js tire shop management system called "Big Boy Tires" in Warren, Ohio.
Read the file D:\Tire-Shop-MVP\CLAUDE_CONTEXT.md for complete project context and continue
from where we left off. The project has a complete glassmorphism design with blue gradient
stat boxes across all pages.
```

---

## 📋 PROJECT OVERVIEW

**Business Name:** Big Boy Tires
**Location:** Warren, Ohio (changed from Los Angeles)
**Purpose:** Tire shop management system (customers, inventory, work orders, analytics)

**Tech Stack:**
- Next.js 16 (App Router with Turbopack)
- TypeScript (strict mode)
- Tailwind CSS (custom utilities)
- Supabase (backend/database)
- Framer Motion (animations)

**Running Commands:**
```bash
npm run dev          # Development server
npm run build        # Production build
```

---

## 🎨 DESIGN SYSTEM

### Core Design Philosophy
- **Style:** Premium glassmorphism with dark blue gradients
- **Goal:** Professional, clean, modern tire shop dashboard
- **Key Feature:** Consistent blue gradient stat boxes across all pages

### Color Palette
```css
/* Primary Gradient (Stats Cards) */
background: linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%);

/* Text Colors */
- Labels: text-blue-200
- Numbers: text-white
- Descriptions: text-green-300 (success), text-yellow-300 (warning), text-red-300 (danger)
- Secondary text: text-blue-100

/* Glass Effects */
- Backdrop blur: backdrop-blur-xl
- Border: border-blue-700/30
- Shadow: shadow-2xl with blue glow
```

### Key CSS Classes (in globals.css)

#### `.stats-card`
Main stat box style with blue gradient background:
```css
.stats-card {
  background: linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%);
  @apply backdrop-blur-xl border border-blue-700/30 rounded-2xl shadow-2xl
         hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:-translate-y-1
         transition-all duration-300;
}
```

#### `.stat-number`
Premium number styling with shadows:
```css
.stat-number {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark .stat-number {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(59, 130, 246, 0.1);
}
```

#### `.stat-label`
Label text styling:
```css
.stat-label {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

#### `.card-glass`
Secondary card style (used for non-stat cards):
```css
.card-glass {
  @apply bg-white/70 dark:bg-gray-900/40 backdrop-blur-2xl
         border border-gray-200/50 dark:border-gray-700/50
         rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1
         transition-all duration-300;
}
```

#### `.btn-glass-primary`
Primary button style:
```css
.btn-glass-primary {
  @apply bg-blue-500/90 backdrop-blur-xl border border-blue-400/50
         hover:bg-blue-600 hover:border-blue-400/70
         hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]
         active:scale-[0.98] transition-all duration-200
         rounded-xl px-6 py-3 font-semibold text-white shadow-xl;
}
```

### Standard Stat Box Pattern

Use this pattern for all stat boxes:

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
  className="stats-card p-6"
>
  <div className="flex flex-col items-center justify-center text-center space-y-2">
    <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">
      LABEL TEXT
    </div>
    <div className="text-5xl stat-number text-white font-bold">
      {value}
    </div>
    <div className="text-sm text-green-300">
      Description text
    </div>
  </div>
</motion.div>
```

---

## 📁 PROJECT STRUCTURE

```
D:\Tire-Shop-MVP\
├── src/
│   ├── app/
│   │   ├── page.tsx                    ✅ UPDATED (Overview/Dashboard)
│   │   ├── globals.css                 ✅ UPDATED (All design utilities)
│   │   ├── customers/
│   │   │   └── page.tsx               ✅ UPDATED (Customers list)
│   │   ├── inventory/
│   │   │   └── page.tsx               ✅ UPDATED (Inventory management)
│   │   ├── work-orders/
│   │   │   └── page.tsx               ✅ UPDATED (Work orders)
│   │   └── analytics/
│   │       └── page.tsx               ✅ UPDATED (Analytics dashboard)
│   ├── components/
│   │   └── DashboardLayout.tsx        ✅ UPDATED (Main layout with sidebar)
│   └── lib/
│       └── supabase/
│           └── client.ts              (Supabase client)
├── CLAUDE_CONTEXT.md                  📄 THIS FILE
└── package.json
```

---

## 🔄 COMPLETE CHANGE HISTORY

### Phase 1: Initial Glassmorphism Design
**When:** Early in project
**What:** Applied glassmorphism design system across entire application
**Changes:**
- Added glass utilities to `globals.css`
- Updated `DashboardLayout.tsx` with glass sidebar and header
- Applied glass effects to all pages

### Phase 2: Branding Update
**When:** After initial design
**What:** Changed location from Los Angeles to Warren, Ohio
**Changes:**
- Updated hero section in `src/app/page.tsx`
- Changed "Fresh start, Demo" text to professional branding
- Updated to "Big Boy Tires Dashboard - Warren, Ohio • Professional Tire Management"

### Phase 3: Typography Enhancement
**User Request:** "Make text look professional with shadows so numbers pop and don't look flat. Use bubble-like effect with shadows."
**Changes:**
- Added `.stat-number` class with Inter font and text shadows
- Added `.stat-label` class for premium labels
- Applied to all stat boxes across all pages

### Phase 4: Dark Box Attempt (REJECTED)
**User Request:** "Make stats boxes look like dark black boxes"
**What Happened:** Created dark gray gradient stat boxes
**User Response:** "Reverse everything you just did"
**Action:** Reverted back to original glass design
**Lesson Learned:** User didn't want dark gray, wanted blue gradient

### Phase 5: Blue Gradient Stat Boxes (CURRENT DESIGN)
**User Request:** "Give all those boxes this background [showed hero section image] and center all texts inside"
**What:** Applied blue gradient from hero section to ALL stat boxes
**Changes Made:**

1. **Updated `globals.css`:**
   - Created `.stats-card` class with blue gradient `linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%)`

2. **Updated `src/app/page.tsx` (Overview):**
   - Changed 4 stat boxes to use `stats-card p-6`
   - Centered content with `flex flex-col items-center justify-center text-center space-y-2`
   - Updated colors: text-blue-200 labels, text-white numbers, text-green-300 descriptions
   - Increased number size to text-5xl
   - Stat boxes: Total Customers, Active Orders, Task Completion, Avg Response Time

3. **Updated `src/app/inventory/page.tsx`:**
   - Applied same pattern to 3 stat boxes
   - Stat boxes: Total Items, Total Units, Total Value

4. **Updated `src/app/work-orders/page.tsx`:**
   - Applied same pattern to 4 stat boxes
   - Stat boxes: Total Orders, Pending, In Progress, Completed

5. **Updated `src/app/analytics/page.tsx`:**
   - **Top row (4 stat boxes):** Total Revenue, Total Customers, Work Orders, Inventory Value
   - **Middle row (3 stat boxes):** Pending Orders, Completed Orders, Low Stock Items
   - **Bottom sections:**
     - Top Customers box: Changed from `card-glass` to `stats-card`
     - Popular Tires box: Changed from `card-glass` to `stats-card`
     - Recent Work Orders table: Changed from `card-glass` to `stats-card`
   - Updated all text colors to match (white for main text, blue-200 for labels, blue-100 for secondary)
   - Updated table styling with blue gradient theme

**User Feedback:** "Looks good now"

---

## 🎯 CURRENT STATE (AS OF LAST SESSION)

### ✅ Completed Features
- [x] Glassmorphism design system implemented
- [x] Blue gradient stat boxes on all pages
- [x] Centered, consistent stat box layout
- [x] Premium typography with shadows
- [x] Warren, Ohio branding
- [x] All stat boxes match hero section design
- [x] Analytics page bottom sections updated (Top Customers, Popular Tires, Recent Work Orders)

### 📍 Pages Status

#### ✅ Overview Page (`src/app/page.tsx`)
- Hero section: ✅ Complete with time, date, revenue, active orders
- 4 stat boxes: ✅ All using blue gradient design
- Tasks section: ✅ Using card-glass
- Performance insights: ✅ Using card-glass

#### ✅ Customers Page (`src/app/customers/page.tsx`)
- Uses `card-glass` for forms and tables
- No stat boxes on this page
- Status: Complete as-is

#### ✅ Inventory Page (`src/app/inventory/page.tsx`)
- 3 stat boxes: ✅ All using blue gradient design
- Table: ✅ Using card-glass
- Forms: ✅ Using card-glass

#### ✅ Work Orders Page (`src/app/work-orders/page.tsx`)
- 4 stat boxes: ✅ All using blue gradient design
- Table: ✅ Using card-glass
- Forms: ✅ Using card-glass

#### ✅ Analytics Page (`src/app/analytics/page.tsx`)
- 7 stat boxes: ✅ All using blue gradient design
- Top Customers: ✅ Using stats-card with blue gradient
- Popular Tires: ✅ Using stats-card with blue gradient
- Recent Work Orders table: ✅ Using stats-card with blue gradient

### 🎨 Design Consistency
- ✅ All stat boxes use identical blue gradient
- ✅ All stat boxes have centered layout
- ✅ All typography is consistent
- ✅ All colors match the design system
- ✅ Hover effects are consistent

---

## 🔍 KEY DECISIONS & USER PREFERENCES

### User Design Preferences
1. **Blue gradient over glass/gray:** User explicitly rejected dark gray boxes, wants blue gradient matching hero section
2. **Centered content:** User wants all stat box content centered (not left-aligned)
3. **Consistency:** User wants ALL stat boxes across ALL pages to look identical
4. **Professional look:** Numbers should "pop" with shadows, not look flat
5. **Clean and smooth:** Design should be polished and professional

### Technical Decisions
1. **Use `stats-card` for all stat boxes** - Not `card-glass`
2. **Use `card-glass` for tables, forms, and secondary cards** - Not stat boxes
3. **Always center stat box content** - Use flexbox column with centering
4. **Text hierarchy:**
   - Label: text-sm, text-blue-200, uppercase
   - Number: text-5xl, text-white
   - Description: text-sm, text-green-300 (or yellow/red based on context)

### Patterns to Follow
```jsx
// ✅ CORRECT - Use this for stat boxes
<div className="stats-card p-6">
  <div className="flex flex-col items-center justify-center text-center space-y-2">
    <div className="text-sm stat-label text-blue-200 uppercase tracking-wider">LABEL</div>
    <div className="text-5xl stat-number text-white font-bold">{value}</div>
    <div className="text-sm text-green-300">Description</div>
  </div>
</div>

// ❌ WRONG - Don't use this for stat boxes
<div className="card-glass p-6">
  <div className="flex items-center justify-between">
    <div className="text-sm text-gray-600 dark:text-gray-400">Label</div>
    <div className="text-3xl font-bold">{value}</div>
  </div>
</div>
```

---

## 🚀 NEXT STEPS / TODO

### Potential Future Work
- [ ] Add more animations/transitions if requested
- [ ] Customize customer detail pages
- [ ] Add more analytics visualizations
- [ ] Mobile responsiveness testing
- [ ] Deploy to Vercel (already deployed once before)

### If User Requests More Changes
1. **Read this context file first** - `D:\Tire-Shop-MVP\CLAUDE_CONTEXT.md`
2. **Maintain consistency** - Use the same patterns documented here
3. **Ask for clarification** - If user request is ambiguous
4. **Show examples** - Reference existing code patterns

---

## 📝 CONVERSATION HISTORY SUMMARY

### Key User Quotes
1. "I need to fix the text in the boxes... make all the text bubble like with shadows so it doesn't look so flat but make it really clean and professional"
2. "I want it to look more like the black boxes" [showed image]
3. "Reverse everything you just did" [after dark gray attempt]
4. "Now give all those boxes, including analytics boxes this background and center all texts inside those boxes to make it clean and smooth" [showed hero section]
5. "Okay looks good now do the same here on the analytics page"
6. "Literally nothing changed make the bottom boxes look like the top fix it" [Analytics page]
7. "Finish the bottom half" [Analytics page - Top Customers, Popular Tires, Recent Work Orders]

### User Behavior Patterns
- Shows images to clarify what they want
- Expects immediate visual consistency
- Will tell you to reverse if wrong direction
- Wants professional, clean, smooth results
- Likes the blue gradient aesthetic
- Values organization and context preservation

---

## 🛠️ DEVELOPMENT ENVIRONMENT

### Running Processes
Multiple `npm run dev` instances may be running in background. To check:
```bash
# Check if dev server is running
netstat -ano | findstr :3000

# Kill if needed
taskkill /PID <pid> /F

# Start fresh
cd D:\Tire-Shop-MVP
npm run dev
```

### Common Commands
```bash
# Development
npm run dev

# Build
npm run build

# Clean build
rm -rf .next
npm run build

# Database (Supabase)
# Uses createClient() from @/lib/supabase/client
```

---

## 📞 SUPPORT & REFERENCES

### Claude Code Usage
- User has Claude Pro subscription
- Wants to use Pro plan instead of API credits
- Needs to configure account-based authentication in settings

### Project Documentation
- This file: `D:\Tire-Shop-MVP\CLAUDE_CONTEXT.md`
- Always update this file when making significant changes
- User values having complete context preservation

---

## ⚠️ IMPORTANT REMINDERS

1. **ALWAYS read this file first** when resuming work
2. **Use `stats-card` for stat boxes** - Not `card-glass`
3. **Center all stat box content** - Use the standard pattern
4. **Maintain color consistency** - Blue-200 labels, white numbers, green-300 descriptions
5. **User prefers blue gradient** - Don't suggest gray/black alternatives
6. **Update this file** - When making significant changes
7. **Ask for images** - If user request is unclear, they'll show examples

---

## 🎓 LESSONS LEARNED

### What Works
- Following the exact stat box pattern documented here
- Applying changes consistently across all pages
- Using blue gradient from hero section
- Centered, clean layouts

### What Doesn't Work
- Dark gray/black gradients (user rejected)
- Left-aligned stat content (user wants centered)
- Inconsistent styling across pages
- Using `card-glass` for stat boxes

### User Communication Style
- Direct and to the point
- Shows images when text isn't clear
- Expects fast, consistent results
- Will explicitly say "reverse" if wrong direction
- Appreciates organization and context preservation

---

**END OF CONTEXT FILE**

*Keep this file updated as the project evolves. This is your source of truth for resuming work on Big Boy Tires.*
