# Warehouse Builder - Developer Guide

**Version:** 1.0
**Last Updated:** January 14, 2026
**Tech Stack:** Next.js 15.5.9, React 19, Prisma, PostgreSQL

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [API Routes](#api-routes)
6. [Authentication & Authorization](#authentication--authorization)
7. [Database & Prisma](#database--prisma)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Klerno-Labs/Warehouse-Bot
cd Warehouse-Bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Run database migrations
npx prisma migrate dev

# Seed database with sample data
npx prisma db seed

# Start development server
npm run dev
```

Access the app at http://localhost:3000

### Default Credentials
- **Email:** admin@example.com
- **Password:** password123

---

## Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 15.5.9 (App Router)
- React 19
- TanStack Query (React Query)
- Tailwind CSS + shadcn/ui
- TypeScript (strict mode)

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- JWT Sessions (cookie-based)

**Additional:**
- PWA (Progressive Web App)
- Service Workers for offline support
- Real-time updates via SSE

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              Client Layer                        │
│  ┌─────────────┐  ┌──────────────┐             │
│  │   Pages     │  │  Components  │             │
│  │  (Routes)   │  │   (UI/UX)    │             │
│  └──────┬──────┘  └──────┬───────┘             │
│         │                 │                      │
│         └─────────┬───────┘                      │
│                   │                              │
│         ┌─────────▼────────┐                    │
│         │  React Query     │                    │
│         │  (State/Cache)   │                    │
│         └─────────┬────────┘                    │
└───────────────────┼─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              API Layer                           │
│  ┌────────────────────────────────────────┐    │
│  │        API Routes                      │    │
│  │  /api/auth/*                          │    │
│  │  /api/inventory/*                     │    │
│  │  /api/manufacturing/*                 │    │
│  │  /api/quality/*                       │    │
│  └──────────────┬─────────────────────────┘    │
│                 │                                │
│      ┌──────────▼─────────┐                    │
│      │   Middleware       │                    │
│      │  (Auth, RBAC)      │                    │
│      └──────────┬─────────┘                    │
└─────────────────┼───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│          Business Logic Layer                    │
│  ┌──────────────────────────────────────┐      │
│  │       Server Modules                 │      │
│  │  storage.ts                          │      │
│  │  manufacturing.ts                    │      │
│  │  workflows.ts                        │      │
│  │  inventory.ts                        │      │
│  └──────────────┬───────────────────────┘      │
└─────────────────┼───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│           Data Layer                             │
│  ┌──────────────────────────────────────┐      │
│  │     Prisma ORM                       │      │
│  │     PostgreSQL Database              │      │
│  └──────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

---

## Project Structure

```
warehouse-builder/
├── app/                      # Next.js 15 App Router
│   ├── (app)/               # Authenticated routes
│   │   ├── layout.tsx       # App shell with auth check
│   │   └── modules/         # Feature modules
│   │       ├── inventory/
│   │       ├── manufacturing/
│   │       ├── quality/
│   │       └── sales/
│   ├── (marketing)/         # Public routes
│   │   ├── page.tsx         # Landing page
│   │   └── docs/
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── inventory/       # Inventory management
│   │   └── _utils/          # Shared API utilities
│   ├── layout.tsx           # Root layout
│   └── providers.tsx        # Context providers
│
├── client/                  # Client-side code
│   └── src/
│       ├── components/      # React components
│       │   ├── ui/          # Base UI components (shadcn)
│       │   ├── dashboard/   # Dashboard widgets
│       │   └── barcode/     # Barcode/QR scanning
│       ├── pages/           # Page-level components
│       ├── lib/             # Client utilities
│       │   ├── auth-context.tsx
│       │   ├── queryClient.ts
│       │   └── offline-manager.ts
│       └── hooks/           # Custom React hooks
│
├── server/                  # Server-side business logic
│   ├── storage.ts           # Data access layer
│   ├── manufacturing.ts     # Manufacturing logic
│   ├── workflows.ts         # Workflow engine
│   ├── inventory.ts         # Inventory operations
│   ├── audit.ts             # Audit logging
│   └── email.ts             # Email notifications
│
├── shared/                  # Shared code (client + server)
│   ├── schema.ts            # TypeScript types
│   ├── validation.ts        # Zod schemas
│   └── permissions.ts       # Permission definitions
│
├── prisma/                  # Database
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.ts              # Seed data
│
├── public/                  # Static assets
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Service worker
│   └── icons/               # App icons
│
└── tests/                   # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Development Workflow

### Running the App

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm run start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Commands

```bash
# Create a new migration
npx prisma migrate dev --name description_of_changes

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Git Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Descriptive commit message"

# Push to GitHub
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

---

## API Routes

### Route Structure

All API routes follow REST conventions:

```
GET    /api/resource         # List all
POST   /api/resource         # Create new
GET    /api/resource/[id]    # Get one
PATCH  /api/resource/[id]    # Update
DELETE /api/resource/[id]    # Delete
```

### Example: Creating an API Route

```typescript
// app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';
import { itemSchema } from '@shared/validation';

export async function GET(req: NextRequest) {
  // 1. Authenticate
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch data
  const items = await storage.getItems(user.tenantId);

  // 3. Return response
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Validate input
  const body = await req.json();
  const validated = itemSchema.parse(body);

  // 2. Business logic
  const item = await storage.createItem({
    ...validated,
    tenantId: user.tenantId,
  });

  // 3. Return created resource
  return NextResponse.json({ item }, { status: 201 });
}
```

### Dynamic Routes (Next.js 15)

**IMPORTANT:** In Next.js 15, `params` is async!

```typescript
// app/api/items/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Must await params!
  const { id } = await params;

  const item = await storage.getItem(id);
  return NextResponse.json({ item });
}
```

### Error Handling

```typescript
try {
  // ... business logic
} catch (error) {
  logger.error('Operation failed', error as Error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

**6-tier role system:**

1. **SuperAdmin (Tier 6)** - Platform owner, all access
2. **Executive (Tier 5)** - Company-wide visibility
3. **Admin (Tier 4)** - Department management
4. **Manager (Tier 3)** - Team management
5. **Operator (Tier 2)** - Execute tasks
6. **Guest (Tier 1)** - Read-only access

### Checking Permissions

```typescript
// In API routes
import { getSessionUser } from '@app/api/_utils/session';
import { hasPermission } from '@shared/permissions';

const user = await getSessionUser();

if (!hasPermission(user.role, 'items', 'create')) {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

### Auth Context (Client)

```typescript
import { useAuth } from '@/lib/auth-context';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <div>Welcome, {user.firstName}!</div>;
}
```

---

## Database & Prisma

### Schema Design

**Key entities:**
- **Tenant** - Multi-tenancy root
- **User** - System users
- **Site** - Physical locations
- **Item** - Inventory items
- **InventoryTransaction** - Stock movements
- **Job** - Work orders
- **ProductionOrder** - Manufacturing orders

### Common Queries

```typescript
// Get items with relationships
const items = await prisma.item.findMany({
  where: { tenantId },
  include: {
    baseUom: true,
    defaultLocation: true,
    balances: {
      include: { location: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 100,
});

// Transaction with rollback
await prisma.$transaction(async (tx) => {
  const order = await tx.productionOrder.create({ data: orderData });
  await tx.inventoryTransaction.create({ data: txnData });
});
```

### Migrations Best Practices

1. **Always review generated migration**
   ```bash
   npx prisma migrate dev --create-only --name add_user_role
   # Review prisma/migrations/xxx/migration.sql
   npx prisma migrate dev
   ```

2. **Never edit schema directly in production**
   - Always create migrations locally
   - Test thoroughly
   - Deploy via `prisma migrate deploy`

3. **Add indexes for performance**
   ```prisma
   model Item {
     // ...
     @@index([tenantId, createdAt(sort: Desc)])
     @@index([tenantId, sku])
   }
   ```

---

## Testing

### Unit Tests

```typescript
// tests/unit/manufacturing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBomRequirements } from '@server/manufacturing';

describe('BOM Calculations', () => {
  it('should calculate material requirements', () => {
    const bom = {
      components: [
        { itemId: '1', quantity: 2 },
        { itemId: '2', quantity: 0.5 },
      ],
    };

    const result = calculateBomRequirements(bom, 10);

    expect(result).toEqual({
      '1': 20,
      '2': 5,
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/api/items.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestContext } from '@/tests/helpers';

describe('Items API', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  it('should create an item', async () => {
    const response = await context.client.post('/api/items', {
      sku: 'TEST-001',
      name: 'Test Item',
    });

    expect(response.status).toBe(201);
    expect(response.body.item).toHaveProperty('id');
  });
});
```

---

## Deployment

### Environment Variables

Required for production:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Security
SESSION_SECRET="generate-random-32-char-string"
ENCRYPTION_KEY="generate-random-32-char-string"

# Optional
ALLOWED_ORIGINS="https://yourapp.com"
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-key"
```

### Vercel Deployment

1. **Connect Repository**
   - Link GitHub repo to Vercel
   - Auto-deploy on push to main

2. **Configure Environment**
   - Add all environment variables in Vercel dashboard
   - Set `DATABASE_URL` to production database

3. **Database Migrations**
   ```bash
   # Run migrations on deploy
   npm run deploy:migrate
   ```

4. **Monitor**
   - Check Vercel Analytics
   - Monitor logs for errors

---

## Troubleshooting

### Common Issues

#### 1. "Prisma Client not generated"
```bash
npx prisma generate
```

#### 2. "Database connection failed"
- Check `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Verify credentials

#### 3. "Type errors after upgrade"
- Ensure all dynamic routes use `Promise<params>`
- Run `npm run type-check`

#### 4. "401 Unauthorized on API calls"
- Check session cookie
- Verify authentication in browser DevTools
- Clear cookies and re-login

#### 5. "Module not found errors"
- Clear `.next` cache: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`

### Debugging Tips

```typescript
// Enable query logging
// In prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add this for SQL logging
  log      = ["query", "info", "warn", "error"]
}
```

```bash
# Check build errors
npm run build 2>&1 | tee build.log

# Test API route directly
curl -X GET http://localhost:3000/api/auth/me \\
  -H "Cookie: session=your-session-token"
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Questions or Issues?**
- GitHub Issues: https://github.com/Klerno-Labs/Warehouse-Bot/issues
- Internal Documentation: See `/docs` folder
