# Warehouse Core Platform

## Overview
A modular, multi-tenant web-based "warehouse-in-a-box" platform providing core infrastructure for warehouse management. The system supports authentication, multi-tenancy, role-based access control (RBAC), facility modeling, module management, and event auditing.

## Tech Stack
- **Frontend**: Next.js App Router + React 18 + TypeScript
- **Backend**: Next.js Route Handlers
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Validation**: Zod
- **Storage**: In-memory (development), portable to PostgreSQL

## Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── lib/            # Utilities, contexts, providers
│   │   ├── pages/          # Page components
│   │   │   └── admin/      # Admin pages
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── storage.ts          # In-memory storage with seed data
│   └── index.ts            # Server entry point
├── shared/                 # Shared code
│   └── schema.ts           # Data models, types, Zod schemas
└── design_guidelines.md    # UI/UX design system
```

## Core Features

### Authentication
- Email/password login
- Session-based authentication with secure cookies
- Remember me functionality

### Multi-Tenant Model
- **Tenant**: Organization with configurable modules
- **Site**: Physical location within a tenant
- **Department**: Logical grouping within a site
- **Workcell**: Work area within a department
- **Device**: Equipment/hardware within a workcell
- **User**: Person with role and site access
- **Badge**: Operator identification

### RBAC (Role-Based Access Control)
Roles: Admin, Supervisor, Inventory, Operator, Sales, Purchasing, Maintenance, QC, Viewer

### Module Registry
Configurable modules per tenant:
- Inventory
- Jobs
- Purchasing
- Cycle Counts
- Maintenance
- Sales ATP
- Dashboards

### Audit Framework
Append-only event logging with:
- User identification (who)
- Action type (what)
- Timestamp (when)
- Entity tracking (what entity was affected)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user session

### Tenant
- `GET /api/tenant/modules` - Get enabled modules
- `PATCH /api/tenant/modules` - Update enabled modules (Admin)

### Users
- `GET /api/users` - List users (Admin/Supervisor)
- `POST /api/users` - Create user (Admin)
- `PATCH /api/users/:id` - Update user (Admin)

### Facilities
- `GET /api/sites` - Get user's sites
- `GET /api/sites/:siteId/departments` - Get departments
- `GET /api/sites/:siteId/workcells` - Get workcells
- `GET /api/sites/:siteId/devices` - Get devices
- `POST /api/workcells` - Create workcell
- `PATCH /api/workcells/:id` - Update workcell
- `POST /api/devices` - Create device

### Audit
- `GET /api/audit` - Get audit events (Admin/Supervisor)

### Inventory
- `GET /api/inventory/items` - List items
- `POST /api/inventory/items` - Create item (Admin/Supervisor/Inventory)
- `PATCH /api/inventory/items/:id` - Update item (Admin/Supervisor/Inventory)
- `GET /api/inventory/locations` - List locations (query `siteId`)
- `POST /api/inventory/locations` - Create location (Admin/Supervisor/Inventory)
- `PATCH /api/inventory/locations/:id` - Update location (Admin/Supervisor/Inventory)
- `GET /api/inventory/reason-codes` - List reason codes
- `POST /api/inventory/reason-codes` - Create reason code (Admin/Supervisor/Inventory)
- `PATCH /api/inventory/reason-codes/:id` - Update reason code (Admin/Supervisor/Inventory)
- `GET /api/inventory/events` - List events (Admin/Supervisor/Inventory)
- `POST /api/inventory/events` - Create event
- `GET /api/inventory/balances` - List balances (query `siteId`)

## Seed Data
Default login credentials:
- Email: `admin@example.com`
- Password: `password123`

The seed data includes:
- 1 Tenant (Acme Warehouse)
- 2 Sites (Main Warehouse, Distribution Center)
- 4 Departments (Receiving, Stockroom/Kitting, Production, Packing/Shipping)
- 8 Workcells with descriptions
- 6 Devices
- 5 Users with different roles
- Inventory items: Paper Media (FT base, FT/YD/ROLL entry), Caps (EA), Core Material (FT)
- Inventory locations: RECEIVING-01, STOCK-A1, PLEATER-STAGE
- Reason codes: SCRAP-DAMAGE, ADJUST-AUDIT, HOLD-QC

## Development

### Running the Application
```bash
npm run dev
```
The application runs on port 5000.

### Station Mode URLs
- `http://localhost:5000/stations/receiving`
- `http://localhost:5000/stations/stockroom`
- `http://localhost:5000/stations/pleater1`
- `http://localhost:5000/stations/packing`

### Testing
```bash
npm test
npm run test:e2e
```

### Scanning Simulation
Most fields accept barcode-style input; scan or type the value and press Enter to move forward.

### Design Guidelines
See `design_guidelines.md` for the complete design system including:
- Typography scale (Inter font)
- Color tokens
- Component patterns
- Layout guidelines
- Responsive behavior

## Recent Changes
- 2024-01-15: Initial platform scaffold with all core features
  - Authentication with session management
  - Multi-tenant data model with full entity hierarchy
  - RBAC middleware with role checking
  - Module registry with dynamic sidebar
  - Audit framework for event logging
  - Comprehensive seed data for development
