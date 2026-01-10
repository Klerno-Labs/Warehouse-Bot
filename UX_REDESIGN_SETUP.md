# UX Redesign - Setup & Deployment Guide

This guide covers everything needed to get the UX redesign running in development and production.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Testing the New Features](#testing-the-new-features)
6. [Email Configuration](#email-configuration)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon, Supabase, or local)
- Package manager (npm, yarn, or pnpm)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see below)
cp .env.example .env.local

# 3. Run database migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. (Optional) Generate sample data
npm run generate-sample-data

# 6. Start development server
npm run dev
```

---

## Environment Variables

Create a `.env.local` file in the root directory with the following:

```bash
# === DATABASE ===
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"

# === APP URLs ===
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Change to production URL in prod

# === EMAIL (Resend) ===
RESEND_API_KEY="re_your_api_key_here"       # Get from https://resend.com
EMAIL_FROM="noreply@yourdomain.com"          # Verified sender address

# === AUTH (if using custom auth) ===
JWT_SECRET="your-super-secret-jwt-key-here"
SESSION_SECRET="your-session-secret-here"

# === OPTIONAL: Email Provider ===
EMAIL_PROVIDER="resend"                      # Options: resend, sendgrid, ses, console
# EMAIL_API_KEY="your-api-key"               # If using SendGrid/SES/etc

# === OPTIONAL: Analytics ===
# SENTRY_DSN="your-sentry-dsn"
# GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
```

---

## Database Setup

### Option 1: Run Migrations (Recommended)

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or create a new migration if schema changed
npx prisma migrate dev --name add_ux_redesign_fields
```

### Option 2: Push Schema (Development Only)

```bash
# Push schema changes without creating migrations
npx prisma db push
```

### Generate Sample Data

To populate the database with realistic test data:

```bash
# Via command line (requires tenant ID)
npx ts-node --esm scripts/generate-sample-data.ts <tenantId>

# Via API (after app is running)
# POST /api/admin/generate-sample-data
# Requires Admin or SuperAdmin role
```

This generates:
- 5 system roles
- 7 departments
- 14+ workstations
- 16 users across all roles
- 8 inventory items
- 5 customers
- 30 production orders
- 20 quality records

---

## Running the Application

### Development Mode

```bash
# Standard Next.js development server
npm run dev

# Access at http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Testing Specific Features

#### Test Onboarding Wizard
1. Visit `/signup` or `/setup`
2. Complete 8-step wizard
3. Check that tenant settings are updated
4. Verify departments and devices created

#### Test Role-Based Dashboards
1. Log in as different roles:
   - **Executive**: Full analytics dashboard
   - **Manager**: Team oversight and active jobs
   - **Operator**: Single-job focus interface
   - **Inventory**: Bin lookup and stock management
   - **Sales**: Quote pipeline

2. Each dashboard refreshes automatically:
   - Operator: 10 seconds
   - Manager: 30 seconds
   - Executive: 60 seconds

#### Test TV Board
1. Visit `/tv-board`
2. Optionally add `?departmentId=<id>` to filter
3. Should display:
   - Real-time clock
   - Active jobs (up to 6)
   - Team status
   - Key metrics
   - Alerts

4. Auto-refreshes every 10 seconds

#### Test Mobile Job Scanner
1. Visit `/mobile/job-scanner` on mobile device or browser
2. Options:
   - **Camera mode**: Scan QR code (requires camera permission)
   - **Manual mode**: Enter job order number
3. Look up job → Start working
4. Returns to operator dashboard

#### Test Role Management
1. Log in as Admin/Executive
2. Visit `/admin/roles` page
3. Drag permissions from left panel onto roles
4. Click role to see detailed permissions
5. Use Copy/Delete buttons

---

## Email Configuration

### Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use test domain
3. Get API key from dashboard
4. Add to `.env.local`:
   ```bash
   RESEND_API_KEY="re_your_key"
   EMAIL_FROM="noreply@yourdomain.com"
   ```

### Using Other Providers

#### SendGrid
```bash
EMAIL_PROVIDER="sendgrid"
EMAIL_API_KEY="SG.your_key"
```

#### AWS SES
```bash
EMAIL_PROVIDER="ses"
AWS_ACCESS_KEY_ID="your_key"
AWS_SECRET_ACCESS_KEY="your_secret"
AWS_REGION="us-east-1"
```

### Console Mode (Development)

For development without email service:
```bash
EMAIL_PROVIDER="console"
```
Emails will be logged to console instead of sent.

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add UX redesign"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Add environment variables
   - Deploy!

3. **Run Migrations**
   ```bash
   # In Vercel terminal or locally against prod DB
   npx prisma migrate deploy
   ```

### Railway

1. **Connect Repository**
   - Visit [railway.app](https://railway.app)
   - New Project → Deploy from GitHub

2. **Add Environment Variables**
   - Add all `.env` variables in Railway dashboard

3. **Deploy**
   - Railway auto-deploys on git push

### Docker

```dockerfile
# Dockerfile included in project
docker build -t warehouse-builder .
docker run -p 3000:3000 --env-file .env warehouse-builder
```

---

## Testing the New Features

### Manual Testing Checklist

#### ✅ Onboarding Wizard
- [ ] All 8 steps load correctly
- [ ] Department templates display
- [ ] Device mapping works
- [ ] Sample job creation
- [ ] Team invitations sent
- [ ] Data persists in database

#### ✅ Executive Dashboard
- [ ] Financial metrics display
- [ ] Operations KPIs shown
- [ ] Department breakdown loads
- [ ] Top customers list
- [ ] Alerts appear for critical issues
- [ ] Data refreshes every minute

#### ✅ Manager Dashboard
- [ ] Team status shows correctly
- [ ] Active jobs list populates
- [ ] Bottleneck detection works
- [ ] Real-time updates (30s)
- [ ] Overdue jobs highlighted

#### ✅ Operator Dashboard
- [ ] No job → Shows scanner link
- [ ] Active job → Shows full details
- [ ] Progress tracking works
- [ ] Checklist items toggle
- [ ] Pause/Resume functionality
- [ ] Complete job action

#### ✅ TV Board
- [ ] Large fonts readable from distance
- [ ] Active jobs (max 6) display
- [ ] Team status cards show
- [ ] Metrics update
- [ ] Alerts appear
- [ ] Auto-refresh (10s) works

#### ✅ Job Scanner
- [ ] Camera permission requested
- [ ] QR scanning functional
- [ ] Manual entry works
- [ ] Job lookup successful
- [ ] Start job transitions to dashboard

#### ✅ Role Management
- [ ] Drag-and-drop works
- [ ] Permissions categorized by color
- [ ] Role details expand
- [ ] Copy role duplicates
- [ ] Delete role (with validation)
- [ ] System roles protected

#### ✅ Email Invitations
- [ ] Invitation email sends
- [ ] HTML template renders correctly
- [ ] Invitation link works
- [ ] Expiration enforced (7 days)

---

## API Endpoints Reference

### Onboarding
- `POST /api/onboarding/complete` - Process wizard completion

### Executive Dashboard
- `GET /api/dashboard/executive/metrics` - Financial & operational KPIs
- `GET /api/dashboard/executive/departments` - Department performance
- `GET /api/dashboard/executive/customers` - Top customers

### Manager Dashboard
- `GET /api/dashboard/manager/metrics` - Team & production metrics
- `GET /api/dashboard/manager/team` - Real-time team status
- `GET /api/dashboard/manager/active-jobs` - All department jobs

### Operator Dashboard
- `GET /api/dashboard/operator/current-job` - Active job details
- `PATCH /api/dashboard/operator/current-job` - Update progress
- `GET /api/dashboard/operator/next-jobs` - Available jobs
- `POST /api/dashboard/operator/next-jobs` - Start new job

### TV Board
- `GET /api/tv-board/data` - Production board data

### Role Management
- `GET /api/admin/roles` - List all roles
- `POST /api/admin/roles` - Create role
- `PUT /api/admin/roles/:id` - Update role
- `DELETE /api/admin/roles/:id` - Delete role
- `GET /api/admin/permissions` - List permissions

### Utilities
- `GET /api/jobs/lookup?code=PO-00123` - Lookup job by code
- `POST /api/admin/generate-sample-data` - Generate test data

---

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# If fails, check:
# 1. DATABASE_URL is correct
# 2. Database is running
# 3. Firewall allows connections
# 4. SSL mode correct (sslmode=require)
```

### Migration Errors
```bash
# Reset database (DEVELOPMENT ONLY - DESTROYS DATA)
npx prisma migrate reset

# Or manually fix:
npx prisma migrate resolve --applied <migration-name>
```

### Email Not Sending
1. Check `EMAIL_PROVIDER` env variable
2. Verify API key is correct
3. Check sender domain is verified
4. Review console logs for errors
5. Test with `EMAIL_PROVIDER=console` first

### Dashboard Not Loading
1. Open browser dev tools (F12)
2. Check Network tab for API errors
3. Verify authentication token
4. Check API endpoint URLs
5. Review server logs

### Blank Screen / White Screen
```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Check for console errors
# Verify all environment variables set
```

### Sample Data Generation Fails
```bash
# Check you're passing correct tenant ID
npm run generate-sample-data -- <valid-tenant-id>

# Verify database schema is up to date
npx prisma migrate deploy

# Check for foreign key constraints
```

---

## Performance Tips

### Optimize Dashboard Load Times
1. Enable caching in TanStack Query (already configured)
2. Use CDN for static assets
3. Enable Vercel Analytics
4. Monitor with Sentry

### Database Performance
```sql
-- Add indexes if queries are slow
CREATE INDEX idx_production_orders_tenant ON "ProductionOrder"("tenantId", "status");
CREATE INDEX idx_users_tenant_active ON "User"("tenantId", "isActive");
```

### TV Board Optimization
- Use dedicated machine/tablet
- Full screen mode (F11)
- Disable sleep mode
- Wired network connection preferred
- Chrome/Edge recommended

---

## Next Steps

### Production Readiness
- [ ] Set up error monitoring (Sentry)
- [ ] Configure analytics (Google Analytics, Plausible)
- [ ] Set up uptime monitoring (Better Uptime, Pingdom)
- [ ] Create backup strategy
- [ ] Document runbooks
- [ ] Set up CI/CD pipeline

### Feature Enhancements
- [ ] Add notification system
- [ ] Implement file uploads
- [ ] Create mobile apps (React Native)
- [ ] Add multi-language support
- [ ] Build reporting engine
- [ ] Implement audit logging

### Security Hardening
- [ ] Enable rate limiting
- [ ] Add CSRF protection
- [ ] Implement 2FA
- [ ] Set up WAF (Cloudflare)
- [ ] Regular security audits
- [ ] Pen testing

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation: [API_IMPLEMENTATION_SUMMARY.md](./API_IMPLEMENTATION_SUMMARY.md)
3. Review UX design docs: [UX_DESIGN_DOCUMENTATION.md](./UX_DESIGN_DOCUMENTATION.md)
4. Open GitHub issue

## License

[Your License Here]
