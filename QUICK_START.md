# Warehouse Builder - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Start the Application

```bash
npm run dev
```

Server will start at: **http://localhost:3000**

### 2. Login

```
Email: c.hatfield309@gmail.com
Password: Hearing2026!
```

### 3. Explore the Application

**Dashboard** → Overview of your warehouse
**Modules > Inventory** → Manage items, locations, stock
**Modules > Cycle Counts** → Physical inventory audits
**Modules > Jobs** → Work orders and transfers
**Admin** → Users, facilities, audit trail

---

## 📚 Common Tasks

### Create a New Inventory Item

1. Go to **Modules > Inventory > Items**
2. Click **"New Item"**
3. Fill in:
   - SKU (e.g., "WIDGET-001")
   - Name (e.g., "Widget Assembly")
   - Category (PRODUCTION, PACKAGING, etc.)
   - Base UOM (EA, FT, etc.)
   - Min/Max quantities
4. Click **"Create Item"**

### Receive Inventory

1. Go to **Modules > Inventory > Events**
2. Click **"New Transaction"**
3. Select:
   - Event Type: **RECEIVE**
   - Item
   - Quantity
   - To Location (e.g., RECEIVING-01)
4. Click **"Submit"**

### Create a Cycle Count

1. Go to **Modules > Cycle Counts**
2. Click **"New Count"**
3. Fill in:
   - Name (e.g., "Zone A - Monthly Count")
   - Type (FULL, SPOT, ABC)
   - Site
   - Optional: Select specific locations/items
4. Click **"Create"**
5. System generates count lines automatically

### Record Count Results

1. Open the cycle count
2. For each line, enter the **Counted Quantity**
3. System calculates variance automatically
4. Click **"Record Count"**

### Approve Cycle Count Variance

1. Open completed cycle count
2. Review variance for each line
3. Click **"Approve"** on lines with variance
4. System automatically adjusts inventory

### Create a Job/Work Order

1. Go to **Modules > Jobs**
2. Click **"New Job"**
3. Fill in:
   - Site
   - Type (TRANSFER, PRODUCTION, etc.)
   - Description
   - Assigned To (optional)
4. Add lines:
   - Item
   - Quantity Ordered
   - From/To Locations (for transfers)
5. Click **"Create Job"**

---

## 🔧 Development Commands

### Database

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database and reseed
npx prisma migrate reset --force

# Push schema changes without migration
npx prisma db push

# Run seed script
npm run prisma:seed

# Format Prisma schema
npx prisma format

# Generate Prisma Client
npx prisma generate
```

### Building

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 📁 Project Structure

```
warehouse-builder/
├── app/                    # Next.js App Router
│   ├── (app)/             # Main application routes
│   │   ├── page.tsx       # Dashboard
│   │   ├── modules/       # Module pages
│   │   ├── admin/         # Admin pages
│   │   └── stations/      # Station UIs
│   ├── api/               # API routes
│   │   ├── auth/
│   │   ├── inventory/
│   │   ├── cycle-counts/
│   │   ├── jobs/
│   │   └── ...
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # Context providers
├── client/src/            # React components
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   └── app-sidebar.tsx
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── server/                # Server-side logic
│   ├── storage.ts        # Data access layer (50+ methods)
│   ├── inventory.ts      # Business logic
│   ├── audit.ts          # Audit helpers
│   └── prisma.ts         # Prisma client
├── shared/                # Shared types/schemas
│   ├── schema.ts         # Common types
│   ├── inventory.ts      # Inventory schemas
│   ├── cycle-counts.ts   # Cycle count schemas
│   ├── jobs.ts           # Job schemas
│   └── validation.ts     # Zod schemas
├── prisma/
│   ├── schema.prisma     # Database schema (19 models)
│   └── seed.ts           # Seed data
└── public/               # Static assets
```

---

## 🗄️ Database Schema Overview

### Core Models (19 total)

**Organization**:
- Tenant → Site → Department → Workcell → Device

**Users**:
- User (9 roles)
- Badge
- AuditEvent

**Inventory**:
- Item (with multi-UOM)
- Location (5 types)
- ReasonCode (3 types)
- InventoryEvent (10 event types)
- InventoryBalance

**Operations**:
- CycleCount + CycleCountLine
- Job + JobLine

### Key Relationships

```
Tenant (1) ──┬── (N) Sites
             ├── (N) Users
             ├── (N) Items
             ├── (N) Locations
             └── (N) CycleCounts

Site (1) ─────┬── (N) Departments
              ├── (N) Workcells
              ├── (N) Locations
              └── (N) InventoryBalances

Item (1) ─────┬── (N) InventoryEvents
              ├── (N) InventoryBalances
              └── (N) JobLines

CycleCount (1) ── (N) CycleCountLines
Job (1) ────────── (N) JobLines
```

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Inventory
- `GET /api/inventory/items` - List items (with pagination)
- `POST /api/inventory/items` - Create item
- `GET /api/inventory/items/[id]` - Get item
- `PUT /api/inventory/items/[id]` - Update item
- `GET /api/inventory/locations` - List locations
- `POST /api/inventory/locations` - Create location
- `GET /api/inventory/events` - List transactions
- `POST /api/inventory/events` - Record transaction
- `GET /api/inventory/balances` - View stock levels

### Cycle Counts
- `GET /api/cycle-counts` - List counts
- `POST /api/cycle-counts` - Create count
- `GET /api/cycle-counts/[id]` - Get count with lines
- `POST /api/cycle-counts/[id]/record` - Record count
- `POST /api/cycle-counts/[id]/approve` - Approve variance

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/[id]` - Get job with lines
- `PUT /api/jobs/[id]` - Update job
- `POST /api/jobs/[id]/complete` - Complete job line

### Admin
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/sites` - List sites
- `GET /api/audit` - View audit trail
- `GET /api/dashboard/stats` - Dashboard metrics

---

## 🎨 UI Components

### Available shadcn/ui Components

Located in `client/src/components/ui/`:

- Button, Input, Label, Textarea
- Card, Dialog, Sheet, Tabs
- Table, Badge, Avatar
- Select, Checkbox, Switch
- Alert, Toast
- Calendar, DatePicker
- Dropdown Menu, Context Menu
- Popover, Tooltip
- Progress, Skeleton
- And more...

### Custom Components

- `AppSidebar` - Navigation sidebar with module filtering
- `DataTable` - Reusable table with sorting/filtering
- `DeleteConfirmDialog` - Confirmation dialog
- Various form components

---

## 🔐 User Roles & Permissions

### Roles (9 total)

1. **Admin** - Full access to everything
2. **Supervisor** - Manage operations, approve variances
3. **Inventory** - Manage items, locations, transactions
4. **Operator** - Execute operations, record counts
5. **Sales** - View inventory, create sales orders (future)
6. **Purchasing** - View inventory, create POs (future)
7. **Maintenance** - Equipment maintenance (future)
8. **QC** - Quality control (future)
9. **Viewer** - Read-only access

### Current Permission Logic

- **Admin/Supervisor/Inventory**: Can create/edit items, locations, reason codes
- **Admin/Supervisor**: Can approve cycle count variances
- **Admin**: Can manage users, facilities, tenant settings
- **All authenticated users**: Can view inventory, create transactions

> ⚠️ **Note**: Permission enforcement is partially implemented. Phase 2 will add complete RBAC enforcement.

---

## 📊 Sample Data

The database is seeded with:

### Users (5)
- Admin (c.hatfield309@gmail.com)
- Supervisor (supervisor@acme.com)
- Inventory Manager (inventory@acme.com)
- Operator (operator@acme.com)
- Viewer (viewer@acme.com)

All passwords: `Hearing2026!`

### Sites (2)
- Main Warehouse
- Distribution Center

### Items (3)
- Paper Media 24" (PAPER-MEDIA-24)
- End Caps - Black (CAPS-BLACK)
- Core Material 12" (CORE-STOCK-12)

### Locations (3)
- RECEIVING-01 (Receiving)
- STOCK-A1 (Stock)
- PLEATER-STAGE (WIP)

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Database Connection Error
```bash
# Check .env file has correct DATABASE_URL
# Verify Neon database is active
# Try reconnecting:
npx prisma db push
```

### Build Errors
```bash
# Clean build
rm -rf .next
npm run build
```

### Type Errors
```bash
# Regenerate Prisma Client
npx prisma generate

# Check TypeScript
npx tsc --noEmit
```

### Missing Dependencies
```bash
npm install
```

---

## 📞 Quick Links

- **Dev Server**: http://localhost:3000
- **Prisma Studio**: `npx prisma studio` (http://localhost:5555)
- **GitHub Issues**: (your repo URL)
- **Documentation**: See [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md)
- **Session Summary**: See [SESSION_SUMMARY.md](SESSION_SUMMARY.md)

---

## ⚡ Pro Tips

1. **Use Prisma Studio** to view/edit data directly: `npx prisma studio`
2. **Check the Network tab** in DevTools to debug API calls
3. **Use React Query DevTools** to inspect cache (enabled in dev mode)
4. **Seed data anytime** with `npm run prisma:seed`
5. **Reset database** completely with `npx prisma migrate reset --force`
6. **Generate QR labels** from Items page → Item detail → QR Code icon
7. **Filter inventory** by category, search, low stock status
8. **Export reports** (coming in Phase 2)

---

## 🎯 Next Steps

1. ✅ Login and explore the dashboard
2. ✅ Create a test inventory item
3. ✅ Record a receive transaction
4. ✅ Create and execute a cycle count
5. ✅ Create a transfer job
6. 📖 Read [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) for roadmap
7. 🚀 Start Phase 2 development (see recommendations in progress doc)

---

**Happy Coding! 🎉**
