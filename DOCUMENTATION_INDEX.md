# Warehouse Builder - Complete Documentation Index

## 📚 Table of Contents

1. [System Overview](#system-overview)
2. [Feature Documentation](#feature-documentation)
3. [API Reference](#api-reference)
4. [User Guides](#user-guides)
5. [Admin Guides](#admin-guides)
6. [Development Resources](#development-resources)

---

## System Overview

### Platform Architecture
- **Frontend:** Next.js 14 (App Router) + React + TypeScript
- **Backend:** Next.js API Routes + Prisma ORM
- **Database:** PostgreSQL
- **Authentication:** Clerk
- **Deployment:** Vercel-ready

### Core Modules
1. **Inventory Management** - Items, locations, balances, transactions
2. **Manufacturing** - Production orders, BOMs, job tracking
3. **Purchasing** - Purchase orders, suppliers, receiving
4. **Quality Control** - Inspections, cycle counts, variance tracking
5. **Analytics** - KPIs, dashboards, reports
6. **Mobile/PWA** - Offline-capable progressive web app

---

## Feature Documentation

### Phase 1: Core Infrastructure ✅
**Files:** See `CODEBASE_CLEANUP_COMPLETE.md`
- Multi-tenant architecture
- Role-based access control
- Site/location management
- Base inventory operations

### Phase 2: Dashboard Enhancements ✅
**Reference:** Previous implementation
- Advanced charts and visualizations
- Low stock alerts
- Filtering and exports
- Real-time updates

### Phase 3: Module Integrations ✅
**Reference:** Previous implementation
- Purchasing module
- Manufacturing module
- Quality control
- Multi-site support

### Phase 4: Advanced Features ✅
**Reference:** Previous implementation
- Barcode scanning
- Batch operations
- Data migration
- Advanced search

### Phase 5: Enterprise Features ✅
**Reference:** `PHASE_5_ENHANCEMENTS.md`

#### 1. Inventory Forecasting & Demand Planning
**Files:**
- `server/forecasting.ts` - Forecasting engine
- `app/api/forecasting/route.ts` - API endpoints
- `client/src/components/forecasting/ForecastDashboard.tsx` - UI

**Key Features:**
- 4 forecasting methods (Moving Average, Exponential Smoothing, Linear Regression, Seasonal)
- Trend and seasonality detection
- Stockout risk assessment
- AI-generated recommendations
- 30-365 day forecasts

**Usage:**
```typescript
// Get forecast for all items
GET /api/forecasting?forecastDays=30&historicalDays=90

// Get forecast for specific item
GET /api/forecasting?itemId=xxx&forecastDays=30
```

#### 2. Printable Shipping Labels & Packing Slips
**Files:**
- `server/labels.ts` - Label generation service
- `app/api/labels/route.ts` - API endpoints
- `client/src/components/shipping/LabelPrinter.tsx` - UI

**Key Features:**
- 4x6" thermal shipping labels
- QR code/barcode generation
- Professional packing slips
- Return label generation
- Multi-box shipment labels

**Usage:**
```typescript
// Generate shipping label
GET /api/labels?orderId=xxx&action=shipping

// Generate packing slip
GET /api/labels?orderId=xxx&action=packing

// Generate return label
GET /api/labels?orderId=xxx&action=return
```

#### 3. Automated Alerts & Threshold Monitoring
**Files:**
- `server/alerts.ts` - Alert monitoring service
- `app/api/alerts/route.ts` - API endpoints
- `client/src/components/alerts/AlertsDashboard.tsx` - UI

**Key Features:**
- 12 alert types
- Multi-channel notifications (email, in-app, SMS, webhook)
- Severity levels (info, warning, critical)
- Auto-refresh monitoring
- Acknowledgment and resolution workflow

**Alert Types:**
- LOW_STOCK
- OUT_OF_STOCK
- OVERSTOCK
- EXPIRING_INVENTORY
- QUALITY_ISSUE
- CYCLE_COUNT_VARIANCE
- SLOW_MOVING
- PRODUCTION_DELAY
- PURCHASE_ORDER_DUE
- REORDER_POINT_REACHED
- SAFETY_STOCK_BREACH
- HIGH_SCRAP_RATE

**Usage:**
```typescript
// Get active alerts
GET /api/alerts?severity=critical

// Check alerts manually
POST /api/alerts?action=check

// Acknowledge alert
POST /api/alerts?action=acknowledge&id=xxx

// Resolve alert
POST /api/alerts?action=resolve&id=xxx
```

#### 4. Workflow Automation & Business Rules Engine
**Files:**
- `server/workflows.ts` - Workflow execution engine
- `app/api/workflows/route.ts` - API endpoints
- `client/src/components/workflows/WorkflowBuilder.tsx` - UI

**Key Features:**
- Visual workflow builder
- 10 trigger types
- 11 condition operators
- 10 action types
- Template variable system
- Execution tracking

**Trigger Types:**
- ITEM_CREATED, ITEM_UPDATED
- STOCK_BELOW_THRESHOLD, STOCK_ABOVE_THRESHOLD
- TRANSACTION_CREATED
- ORDER_CREATED, ORDER_COMPLETED
- CYCLE_COUNT_COMPLETED
- SCHEDULED (cron-based)
- MANUAL

**Action Types:**
- SEND_EMAIL
- CREATE_PURCHASE_ORDER
- ADJUST_INVENTORY
- UPDATE_ITEM
- CREATE_ALERT
- CALL_WEBHOOK
- UPDATE_STATUS
- RUN_REPORT
- ASSIGN_TO_USER
- EXECUTE_SCRIPT

**Usage:**
```typescript
// Get all workflows
GET /api/workflows

// Create workflow
POST /api/workflows
Body: { name, trigger, conditions, actions }

// Execute workflow manually
POST /api/workflows?action=execute&id=xxx

// Trigger workflows based on event
POST /api/workflows?action=trigger
Body: { triggerType, context }
```

**Example Workflow:**
```json
{
  "name": "Auto-Reorder on Low Stock",
  "trigger": { "type": "STOCK_BELOW_THRESHOLD" },
  "conditions": [
    { "field": "currentStock", "operator": "less_than", "value": "{{reorderPoint}}" }
  ],
  "actions": [
    {
      "type": "CREATE_PURCHASE_ORDER",
      "config": {
        "supplierId": "{{item.defaultSupplierId}}",
        "items": [{ "itemId": "{{item.id}}", "quantity": "{{item.reorderQtyBase}}" }]
      },
      "order": 1
    },
    {
      "type": "SEND_EMAIL",
      "config": {
        "to": "purchasing@company.com",
        "subject": "Auto-PO Created: {{item.name}}",
        "template": "A purchase order has been created for {{item.name}}."
      },
      "order": 2
    }
  ]
}
```

#### 5. Supplier Management & Vendor Scorecards
**Files:**
- `server/vendor-scorecards.ts` - Scorecard generation service
- `app/api/vendors/scorecards/route.ts` - API endpoints
- `client/src/components/vendors/VendorScorecard.tsx` - UI

**Key Features:**
- Performance metrics (on-time delivery, quality, fill rate, etc.)
- Cost analysis (unit cost, total spend, price variance)
- Quality tracking (defect rate, return rate, compliance)
- Overall scoring (0-100 with letter grades)
- Trend analysis (12-month history)
- AI-generated recommendations

**Metrics Categories:**
1. **Performance:** On-time delivery, quality rate, fill rate, lead time accuracy
2. **Costs:** Average unit cost, total spend, price variance, shipping costs
3. **Quality:** Defect rate, return rate, compliance rate, certifications
4. **Orders:** Total orders, completed, cancelled, average value

**Usage:**
```typescript
// Get supplier scorecard
GET /api/vendors/scorecards?supplierId=xxx&periodDays=90

// Compare suppliers
GET /api/vendors/scorecards?action=compare&category=xxx

// Get supplier trends
GET /api/vendors/scorecards?action=trends&supplierId=xxx&months=12
```

#### 6. Mobile App Manifest & Offline Capabilities
**Files:**
- `public/manifest.json` - PWA manifest
- `public/service-worker.js` - Service worker
- `public/offline.html` - Offline fallback page
- `client/src/lib/offline-manager.ts` - Offline management utilities

**Key Features:**
- Progressive Web App (installable)
- Complete offline functionality
- Background sync
- Push notifications
- IndexedDB storage
- Cache strategies (cache-first, network-first, stale-while-revalidate)

**Offline Capabilities:**
- View cached inventory data
- Record transactions (sync when online)
- Browse previous reports
- Access saved dashboards

**Usage:**
```typescript
import { OfflineManager } from '@/lib/offline-manager';

// Save transaction for offline sync
await OfflineManager.savePendingTransaction(transactionData);

// Check if online
const online = OfflineManager.isOnline();

// Request background sync
await OfflineManager.requestSync('sync-transactions');

// Get storage usage
const { usage, quota, percentUsed } = await OfflineManager.getStorageEstimate();
```

---

## API Reference

### Core Endpoints

#### Inventory
```
GET    /api/inventory/items
POST   /api/inventory/items
PUT    /api/inventory/items/:id
DELETE /api/inventory/items/:id

GET    /api/inventory/locations
GET    /api/inventory/balances
GET    /api/inventory/events
POST   /api/inventory/events

POST   /api/inventory/batch
```

#### Manufacturing
```
GET    /api/manufacturing/orders
POST   /api/manufacturing/orders
PUT    /api/manufacturing/orders/:id

GET    /api/job-tracking/overview
GET    /api/job-tracking/analytics/:days
```

#### Purchasing
```
GET    /api/purchasing/orders
POST   /api/purchasing/orders
PUT    /api/purchasing/orders/:id

GET    /api/purchasing/suppliers
POST   /api/purchasing/suppliers
```

#### Enterprise Features
```
# Forecasting
GET    /api/forecasting
POST   /api/forecasting

# Labels
GET    /api/labels
POST   /api/labels

# Alerts
GET    /api/alerts
POST   /api/alerts

# Workflows
GET    /api/workflows
POST   /api/workflows
PUT    /api/workflows
DELETE /api/workflows

# Vendor Scorecards
GET    /api/vendors/scorecards
```

#### Analytics
```
GET    /api/dashboard/stats
GET    /api/analytics/kpis
GET    /api/reports/export
```

---

## User Guides

### Getting Started
1. **Login** - Use Clerk authentication
2. **Select Site** - Choose your warehouse location
3. **Dashboard** - View KPIs and recent activity
4. **Navigation** - Use sidebar menu to access modules

### Daily Operations

#### Receiving Inventory
1. Navigate to Stations → Receiving
2. Scan or enter item barcode
3. Enter quantity and location
4. Review and submit transaction

#### Issuing to Production
1. Navigate to Stations → Stockroom
2. Select job or work order
3. Scan items to issue
4. Confirm quantities

#### Cycle Counting
1. Navigate to Quality → Cycle Counts
2. Create new count
3. Scan locations and verify quantities
4. Submit and review variance

#### Production Board
1. Navigate to Manufacturing → Production Board
2. View job status by workcell
3. Update job progress
4. Complete jobs

### Advanced Features

#### Setting Up Forecasting
1. Navigate to Forecasting Dashboard
2. Select forecast period (7-90 days)
3. Choose historical period (30-365 days)
4. Review forecasts and recommendations
5. Export forecast data

#### Creating Workflows
1. Navigate to Workflow Automation
2. Click "Create Workflow"
3. Select trigger event
4. Add conditions (optional)
5. Add actions
6. Test and enable workflow

#### Monitoring Alerts
1. Navigate to Alert Monitor
2. Review active alerts by severity
3. Acknowledge critical alerts
4. Resolve issues
5. Configure alert thresholds

#### Vendor Scorecards
1. Navigate to Purchasing → Suppliers
2. Select supplier
3. Click "View Scorecard"
4. Review metrics and trends
5. Download report

---

## Admin Guides

### Initial Setup

#### 1. Tenant Configuration
- Set company information
- Configure sites and locations
- Set up user roles
- Define UOMs

#### 2. Email Service
```bash
# Add to .env
RESEND_API_KEY=your_resend_key
APP_URL=https://your-domain.com
```

#### 3. PWA Deployment
- Generate icon set (72px - 512px)
- Place in `/public` folder
- Verify manifest.json
- Test service worker registration

#### 4. Workflow Templates
- Import pre-built workflows
- Customize for your processes
- Test thoroughly before enabling
- Monitor execution logs

### Maintenance

#### Database Backups
```bash
# Automated daily backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

#### Cache Management
- Clear service worker cache periodically
- Monitor IndexedDB storage usage
- Clean up old transactions

#### Performance Monitoring
- Review API response times
- Check database query performance
- Monitor alert execution times
- Track workflow success rates

---

## Development Resources

### Tech Stack
- **Frontend:** Next.js 14, React 18, TypeScript 5
- **Styling:** Tailwind CSS, shadcn/ui
- **Charts:** Recharts
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** Clerk
- **Email:** Resend
- **PDF:** jsPDF
- **Barcode:** QRCode

### Project Structure
```
warehouse-builder/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated routes
│   ├── api/               # API routes
│   └── auth/              # Auth pages
├── client/                # React components
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       └── pages/         # Legacy pages
├── server/                # Server-side services
│   ├── forecasting.ts
│   ├── labels.ts
│   ├── alerts.ts
│   ├── workflows.ts
│   ├── vendor-scorecards.ts
│   └── ...
├── prisma/                # Database schema
├── public/                # Static assets
└── docs/                  # Documentation
```

### Adding New Features

#### 1. Server Service
```typescript
// server/my-feature.ts
export class MyFeatureService {
  static async doSomething(tenantId: string) {
    // Implementation
  }
}
```

#### 2. API Route
```typescript
// app/api/my-feature/route.ts
import { MyFeatureService } from '@server/my-feature';

export async function GET(req: Request) {
  const context = await requireAuth();
  const result = await MyFeatureService.doSomething(context.user.tenantId);
  return NextResponse.json(result);
}
```

#### 3. UI Component
```typescript
// client/src/components/my-feature/MyFeature.tsx
export function MyFeature() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/my-feature').then(r => r.json()).then(setData);
  }, []);

  return <div>{/* UI */}</div>;
}
```

### Testing
```bash
# Run tests
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Format code
npm run format
```

### Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy --prod

# Run migrations
npx prisma migrate deploy
```

---

## Support

### Documentation Updates
- Feature documentation: `PHASE_5_ENHANCEMENTS.md`
- Codebase cleanup: `CODEBASE_CLEANUP_COMPLETE.md`
- API reference: This document

### Community Resources
- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Wiki: Community-contributed guides

### Commercial Support
- Email: support@warehousebuilder.com
- Enterprise support: Available for Business and Enterprise tiers
- Training: Custom training sessions available

---

## Changelog

### Phase 5 (2026-01-04)
- ✅ Inventory forecasting & demand planning
- ✅ Printable shipping labels & packing slips
- ✅ Automated alerts & threshold monitoring
- ✅ Workflow automation & business rules engine
- ✅ Supplier management & vendor scorecards
- ✅ Mobile app manifest & offline capabilities

### Phase 4 (Previous)
- Advanced search engine
- Batch operations
- Data migration wizard
- Analytics dashboard
- Audit log viewer

### Phase 3 (Previous)
- Purchasing module
- Manufacturing module
- Quality control
- Multi-site support

### Phase 2 (Previous)
- Dashboard enhancements
- Low stock alerts
- Filtering and exports
- Real-time updates

### Phase 1 (Previous)
- Core infrastructure
- Multi-tenant architecture
- RBAC
- Base inventory operations

---

*Last Updated: 2026-01-04*
*Version: 5.0.0*
*Status: Production Ready*
