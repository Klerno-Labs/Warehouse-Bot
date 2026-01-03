# Production Deployment Guide - Warehouse Builder

**Version:** 1.0.0
**Date:** January 2, 2026
**Status:** Production Ready with Action Items

---

## Executive Summary

Warehouse Builder is now production-ready with **Phase 1** of the competitive upgrade roadmap complete:
- ✅ **Barcode Scanning** - Camera-based scanning with multi-format support
- ✅ **Progressive Web App (PWA)** - Installable, offline-capable mobile app
- ✅ **Service Worker** - Offline support & background sync
- ✅ **Mobile Scanner** - Dedicated mobile interface for warehouse floor

**Estimated Time to Production:** 2-4 hours (following this checklist)

---

## Pre-Deployment Checklist

### 1. Environment Configuration ✅

#### Database (Neon PostgreSQL)
- [x] Database schema migrated (`npx prisma db push` completed)
- [ ] Production database connection string in `.env`
- [ ] Database backups configured
- [ ] Connection pooling enabled (Neon default)

#### Environment Variables
Create `.env.production` with:

```bash
# Database
DATABASE_URL="postgresql://user:pass@your-neon-db.neon.tech/main?sslmode=require&pgbouncer=true"

# Auth
NEXTAUTH_SECRET="[Generate with: openssl rand -base64 32]"
NEXTAUTH_URL="https://your-domain.com"

# Session
SESSION_SECRET="[Generate with: openssl rand -base64 32]"

# Email (if using email auth)
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="Warehouse Builder <noreply@your-domain.com>"

# Optional: Push Notifications
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
```

**Action Required:**
```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For SESSION_SECRET

# Update .env file with production values
```

---

### 2. PWA Icon Generation 🎨

#### Current Status:
- ✅ Manifest.json created
- ✅ Icon template (SVG) created
- ⚠️ PNG icons need to be generated

#### Generate Production Icons:

**Option A: Online Tool (Easiest)**
1. Visit: https://www.pwabuilder.com/imageGenerator
2. Upload: `client/public/icons/icon.svg`
3. Download all sizes
4. Extract to: `client/public/icons/`

**Option B: ImageMagick (Command Line)**
```bash
cd client/public/icons

# Install ImageMagick first, then:
for size in 72 96 128 144 152 192 384 512; do
  magick convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done

# Optimize with TinyPNG or similar
```

**Required Files:**
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png` (Apple touch icon)
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

**Validation:**
```bash
# Check all icons exist
ls -lh client/public/icons/icon-*.png

# Should see 8 PNG files
```

---

### 3. Build & Test 🏗️

#### TypeScript Validation
```bash
cd client
npx tsc --noEmit
```
**Status:** ✅ Zero errors

#### Production Build
```bash
npm run build
```

**Expected Output:**
- Next.js production build
- Static assets optimization
- Route pre-rendering
- Build time: ~2-5 minutes

#### Build Size Check
```bash
# After build completes
du -sh .next

# Should be < 100MB
```

---

### 4. Security Hardening 🔒

#### HTTPS Configuration
- [ ] SSL certificate installed (Let's Encrypt recommended)
- [ ] Force HTTPS redirect
- [ ] HSTS header enabled
- [ ] Security headers configured

**Next.js Security Headers** (`next.config.js`):
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

#### Rate Limiting
Consider adding rate limiting to API routes:
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

### 5. Performance Optimization ⚡

#### Image Optimization
- [ ] Compress all images with TinyPNG
- [ ] Use WebP format where supported
- [ ] Implement lazy loading

#### Bundle Size
```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

#### Caching Strategy
- [ ] Static assets: Cache-Control: public, max-age=31536000, immutable
- [ ] HTML pages: Cache-Control: no-cache
- [ ] API responses: No caching or short TTL

---

### 6. Monitoring & Logging 📊

#### Error Tracking
**Recommended:** Sentry

```bash
npm install @sentry/nextjs

# Run setup
npx @sentry/wizard@latest -i nextjs
```

**sentry.client.config.js:**
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

#### Analytics
**Recommended:** Plausible (privacy-friendly) or Google Analytics

```bash
npm install next-plausible
```

#### Logging
- [ ] Application logs to CloudWatch/LogDNA
- [ ] Database query logging (development only)
- [ ] Error logs centralized

---

### 7. Deployment Platforms 🚀

#### Recommended: Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd "c:\Users\Somli\OneDrive\Desktop\My Apps\Warehouse Builder"
vercel --prod

# Follow prompts:
# - Project name: warehouse-builder
# - Framework: Next.js
# - Build command: npm run build
# - Output directory: .next
```

**Vercel Environment Variables:**
Add all `.env.production` variables in Vercel dashboard:
- Settings → Environment Variables
- Add each variable
- Redeploy

**Custom Domain:**
- Settings → Domains
- Add your domain: `app.your-domain.com`
- Configure DNS: Point to Vercel IP

---

#### Alternative: AWS / DigitalOcean / Self-Hosted

**Docker Deployment:**

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Deploy to DigitalOcean App Platform:**
```bash
# Push to GitHub
git push origin main

# In DigitalOcean:
# 1. Create → Apps
# 2. Connect GitHub repo
# 3. Configure:
#    - Build: npm run build
#    - Run: npm start
#    - Port: 3000
# 4. Add environment variables
# 5. Deploy
```

---

### 8. PWA Testing 📱

#### Desktop Testing (Chrome)
1. Open: http://localhost:3004
2. Chrome DevTools → Application
3. Check:
   - ✅ Manifest loads correctly
   - ✅ Service worker registered
   - ✅ Icons display properly
   - ✅ Install button appears

#### Mobile Testing (Required)

**Android (Chrome):**
1. Deploy to staging URL (Vercel preview or ngrok)
2. Open in Chrome on Android
3. Look for "Add to Home Screen" prompt
4. Install and test:
   - [ ] App launches full-screen
   - [ ] Camera scanner works
   - [ ] Offline mode functions
   - [ ] Background sync works

**iOS (Safari):**
1. Open in Safari on iPhone
2. Tap Share → Add to Home Screen
3. Test:
   - [ ] App launches
   - [ ] Camera permissions work
   - [ ] Icons display correctly
   - [ ] Offline capabilities work

#### Testing Tools:
```bash
# Lighthouse PWA audit
npx lighthouse http://localhost:3004 --view

# PWA Score should be 100%
```

---

### 9. Database Migrations 🗄️

#### Production Migration Steps:

```bash
# 1. Backup current production DB
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Apply schema changes
npx prisma db push

# 3. Verify migration
npx prisma studio
# Check Item table has barcode fields

# 4. Rollback plan (if needed)
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

---

### 10. Post-Deployment Verification ✅

#### Smoke Tests (Run in Production)

**Test 1: User Authentication**
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Session persists across pages

**Test 2: Barcode Scanning**
- [ ] Camera permission request appears
- [ ] Scanner recognizes barcodes
- [ ] Items populate correctly
- [ ] Scanner closes after scan

**Test 3: PWA Installation**
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] App launches from home screen
- [ ] Service worker registers

**Test 4: Offline Mode**
- [ ] Disable network
- [ ] Navigate to cached pages (works)
- [ ] Attempt new page load (shows offline page)
- [ ] Re-enable network
- [ ] Data syncs automatically

**Test 5: Critical Workflows**
- [ ] Receive items at station
- [ ] Issue items to workcell
- [ ] View inventory balances
- [ ] Print barcode labels

---

## Production URLs & Resources

### Post-Deployment Setup

**Update these URLs after deployment:**

```javascript
// client/public/manifest.json
{
  "start_url": "https://your-actual-domain.com/",
  "scope": "https://your-actual-domain.com/"
}

// .env.production
NEXTAUTH_URL=https://your-actual-domain.com
```

### Monitoring Dashboards

- **Application:** https://vercel.com/your-org/warehouse-builder
- **Database:** https://console.neon.tech/
- **Errors:** https://sentry.io/organizations/your-org/
- **Analytics:** https://plausible.io/your-domain.com

---

## Rollback Plan 🔄

If deployment fails:

```bash
# 1. Revert to previous deployment
vercel rollback

# 2. Restore database
psql $DATABASE_URL < backup_YYYYMMDD.sql

# 3. Clear service worker cache
# (Users need to uninstall/reinstall PWA)
```

---

## Performance Benchmarks 📈

### Expected Performance Metrics:

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Lighthouse PWA Score:** 100/100
- **Bundle Size:** < 500KB (gzipped)
- **API Response Time:** < 200ms (p95)

### Monitor These Metrics:

```bash
# Run lighthouse after deployment
npx lighthouse https://your-domain.com \
  --only-categories=performance,pwa,accessibility \
  --view
```

---

## Security Checklist 🔐

- [ ] HTTPS enforced on all routes
- [ ] Environment variables not exposed to client
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Rate limiting on API routes
- [ ] User input sanitized
- [ ] File upload validation
- [ ] Session timeout configured
- [ ] Password hashing (bcrypt/argon2)

---

## Compliance & Legal ⚖️

### Data Privacy (GDPR/CCPA)
- [ ] Privacy policy created
- [ ] Cookie consent banner (if using analytics)
- [ ] User data export functionality
- [ ] User data deletion functionality
- [ ] Data retention policy defined

### Terms of Service
- [ ] Terms of Service page
- [ ] Acceptable use policy
- [ ] SLA guarantees documented

---

## Cost Optimization 💰

### Current Stack Costs (Estimated):

| Service | Tier | Cost/Month |
|---------|------|------------|
| Vercel | Pro | $20/user |
| Neon DB | Paid | $19-69 |
| Domain | Annual | $12/year |
| **Total** | | **~$40-90/mo** |

### Free Tier Alternative:
- Vercel Hobby (free for personal)
- Neon Free tier (0.5GB)
- **Total: $0/month** (development/small teams)

---

## Support & Maintenance 🛠️

### Daily Tasks:
- Monitor error logs (Sentry)
- Check database health
- Review user feedback

### Weekly Tasks:
- Review performance metrics
- Check bundle size
- Update dependencies

### Monthly Tasks:
- Security audit
- Database backups verification
- User analytics review
- Feature usage analysis

---

## Success Criteria ✨

### Deployment is successful when:

1. ✅ Zero build errors
2. ✅ All smoke tests pass
3. ✅ PWA score = 100
4. ✅ Mobile scanner works on real devices
5. ✅ Offline mode functions correctly
6. ✅ Database migrations applied
7. ✅ HTTPS certificate valid
8. ✅ Monitoring dashboards active

---

## Next Steps (Phase 1 Remaining)

After production deployment, continue with Phase 1 features:

1. **Real-Time Dashboard** (1-2 weeks)
   - WebSocket integration
   - Live stock updates
   - Activity feed

2. **Low Stock Alerts** (1 week)
   - Email notifications
   - Push notifications
   - Configurable thresholds

3. **Dashboard Widgets** (1 week)
   - KPI cards
   - Charts & graphs
   - Quick stats

---

## Emergency Contacts

### Support Escalation:

1. **Application Issues:**
   - Check Vercel logs
   - Review Sentry errors
   - Contact: [Your team email]

2. **Database Issues:**
   - Check Neon dashboard
   - Review connection pool
   - Contact: Neon support

3. **Critical Outage:**
   - Trigger rollback
   - Post status update
   - Investigate root cause

---

## Documentation Links

- **Deployment Guide:** This document
- **API Documentation:** `/docs/api.md`
- **Architecture:** `/docs/architecture.md`
- **User Manual:** `/docs/user-guide.md`
- **Contributing:** `/CONTRIBUTING.md`

---

## Conclusion

Warehouse Builder is **production-ready** with these completion steps:

**Critical (Do Before Deploy):**
1. Generate PWA icons (15 min)
2. Configure environment variables (10 min)
3. Run production build (5 min)
4. Deploy to Vercel (30 min)
5. Test on mobile devices (30 min)

**Post-Deploy (Within 24 hours):**
6. Set up monitoring (Sentry) (30 min)
7. Configure backups (15 min)
8. Add custom domain (15 min)
9. Enable SSL (automatic with Vercel)
10. Run full smoke tests (30 min)

**Total Time to Production:** ~2-4 hours

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0
**Status:** ✅ READY FOR PRODUCTION
