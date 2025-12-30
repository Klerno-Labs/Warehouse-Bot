# Warehouse Core Platform - Design Guidelines

## Design Approach
**Selected Approach**: Design System (Linear + Carbon Design hybrid)

**Justification**: Enterprise warehouse platform requiring clarity, efficiency, and data-dense displays. Linear's modern dashboard aesthetics combined with Carbon's enterprise data patterns provide optimal user experience for multi-role warehouse operations.

**Key Principles**:
- Information clarity over visual flourish
- Consistent patterns for cognitive ease
- Scannable data hierarchies
- Purposeful density - efficient use of screen real estate

---

## Typography

**Font Stack**: Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600)
- Mono: Inter for data/codes

**Hierarchy**:
- Page Headers: text-2xl font-semibold tracking-tight
- Section Headers: text-lg font-semibold
- Card/Panel Titles: text-base font-medium
- Body Text: text-sm font-normal
- Labels: text-xs font-medium uppercase tracking-wide
- Data Values: text-sm font-mono
- Metadata/Timestamps: text-xs

---

## Layout System

**Spacing Primitives**: Tailwind units of 1, 2, 4, 6, 8, 12, 16
- Component padding: p-4 or p-6
- Section spacing: gap-6 or gap-8
- Card margins: mb-6
- Form field spacing: space-y-4
- Sidebar width: w-64

**Grid Structure**:
- Dashboard: grid grid-cols-12 gap-6
- Stat cards: col-span-3 (4 across)
- Main content: col-span-8, sidebar col-span-4
- Tables: full width within container

---

## Component Library

### Navigation
**Left Sidebar** (fixed, w-64):
- Tenant/site selector at top (h-16)
- Module sections with grouped nav items
- Collapsible module groups with chevron icons
- Active state: subtle background, border-l-2 accent
- User profile/logout at bottom

**Top Bar** (fixed, h-14):
- Breadcrumb navigation (left)
- Global search (center)
- Notifications + user menu (right)

### Dashboard Components

**Stat Cards**:
- Compact design: p-4, rounded-lg border
- Label (text-xs uppercase), Value (text-2xl font-semibold), Change indicator
- Icon in top-right (size-5)

**Data Tables**:
- Striped rows for scannability
- Fixed header on scroll
- Row actions (right-aligned icon buttons)
- Pagination footer: compact, showing "1-10 of 245"
- Column headers: text-xs font-medium uppercase

**Forms**:
- Stacked labels above inputs
- Input height: h-10
- Consistent border, rounded-md
- Helper text: text-xs below field
- Required indicators: asterisk
- Button groups: justify-end space-x-3

**Panels/Cards**:
- Border design, rounded-lg
- Header with title + optional actions
- Content padding: p-6
- Dividers between sections

### Authentication

**Login Page**:
- Centered card (max-w-md mx-auto)
- Logo/brand at top (h-12)
- Form with email + password
- Remember me checkbox
- Primary CTA button (w-full)

**Tenant Selector**:
- Modal or dedicated page
- Card grid of available tenants/sites
- Each card: clickable, hover state, shows tenant name + site count
- "Continue as [user]" header

### Module Pages (Placeholders)

**Standard Layout**:
- Page header with title + primary action button
- Tab navigation if multiple views
- Content area with appropriate component (table, form, cards)
- Empty states with icon + message + CTA

### Status Indicators
- Badges for role/status: px-2 py-0.5 rounded text-xs font-medium
- Alert banners: p-4 rounded border-l-4

### Icons
**Library**: Heroicons (via CDN)
- Navigation: size-5
- Buttons: size-4
- Stat cards: size-5
- Table actions: size-4

---

## Animation
Minimal, purposeful animations only:
- Sidebar collapse/expand: transition-all duration-200
- Dropdown menus: fade + slide (150ms)
- Modal overlays: fade in backdrop
- No scroll animations or decorative motion

---

## Responsive Behavior

**Desktop-first** (primary: 1280px+):
- Full sidebar visible
- Multi-column dashboards
- Expanded data tables

**Tablet** (768px-1279px):
- Collapsible sidebar (icon only)
- 2-column stat cards
- Horizontal scroll for tables

**Mobile** (< 768px):
- Hidden sidebar, hamburger menu
- Stacked single-column layout
- Card-based table views

---

## Page-Specific Layouts

**Dashboard**: 4-column stat grid, followed by 2-column layout (main content + activity feed)

**Inventory/Jobs Lists**: Full-width table with filters sidebar (1/4 width, collapsible)

**Workcell Configuration**: 2-column form layout (settings left, preview/status right)

**Audit Log**: Single-column timeline with timestamps, filtering toolbar at top

---

This design system prioritizes operational efficiency, data clarity, and rapid task completion for warehouse personnel across all roles.