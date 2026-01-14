# Performance Optimizations

**Date:** January 14, 2026
**Status:** Recommendations & Quick Wins

## Quick Wins Implemented ✅

### 1. Security Updates
- ✅ Updated vitest to 4.0.17 (includes faster esbuild)
- ✅ Fixed 6 security vulnerabilities
- ✅ Reduced package count from 843 to 788

### 2. Code Cleanup
- ✅ Removed temporary migration files
- ✅ Verified no unused theme providers
- ✅ TypeScript strict mode enabled

## Recommended Optimizations

### A. Bundle Size Optimization

#### 1. Dynamic Imports for Heavy Components
**Impact:** Reduce initial bundle size by 200-500KB

```typescript
// app/(app)/modules/inventory/analytics/page.tsx
// BEFORE
import { KPIDashboard } from "@/components/analytics/KPIDashboard";

// AFTER
import dynamic from 'next/dynamic';
const KPIDashboard = dynamic(() => import('@/components/analytics/KPIDashboard'), {
  loading: () => <div>Loading analytics...</div>
});
```

**Apply to:**
- Analytics dashboards
- Chart libraries
- QR/Barcode scanners when not immediately visible
- Large form components

#### 2. Optimize Barrel Exports
**Impact:** Reduce build time by 10-20%

```typescript
// client/src/components/ui/index.ts - AVOID THIS PATTERN
export * from "./button";
export * from "./card";
export * from "./input";
// ... etc (causes webpack to bundle everything)

// INSTEAD: Import directly
import { Button } from "@/components/ui/button";
```

### B. Image Optimization

#### 1. Use Next.js Image Component
**Impact:** 40-60% smaller images, better Core Web Vitals

```tsx
// BEFORE
<img src="/icons/icon-192x192.svg" alt="icon" />

// AFTER
import Image from 'next/image';
<Image src="/icons/icon-192x192.svg" alt="icon" width={192} height={192} />
```

#### 2. Add Image Loader for SVGs
Convert large SVGs to optimized PNGs for better performance.

### C. Database Query Optimization

#### 1. Add Database Indexes
**Impact:** 2-5x faster queries

```prisma
// prisma/schema.prisma
model InventoryTransaction {
  // ... existing fields

  @@index([tenantId, createdAt(sort: Desc)]) // For recent transactions
  @@index([itemId, tenantId]) // For item history
  @@index([fromLocationId, tenantId]) // For location queries
  @@index([toLocationId, tenantId])
}

model Job {
  @@index([tenantId, status, createdAt(sort: Desc)]) // For job lists
  @@index([assignedUserId, status]) // For user assignments
}
```

#### 2. Implement Query Pagination
**Currently:** Loading all results
**Recommended:** Cursor-based pagination

```typescript
// app/api/inventory/items/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = 50;

  const items = await storage.prisma.item.findMany({
    take: limit + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return NextResponse.json({ items: results, nextCursor, hasMore });
}
```

### D. React Performance

#### 1. Memoize Expensive Components
**Files to update:**
- `client/src/components/analytics/KPIDashboard.tsx`
- `client/src/components/dashboard/CustomizableDashboard.tsx`
- `client/src/pages/dashboards/ExecutiveDashboard.tsx`

```typescript
import { memo } from 'react';

export const KPIDashboard = memo(function KPIDashboard({ data }) {
  // ... component code
});
```

#### 2. Use React.useMemo for Calculations

```typescript
// client/src/pages/sales/customers/[id]/page.tsx
const stats = useMemo(() => ({
  totalOrders: customer.orders.length,
  totalRevenue: customer.orders
    .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0),
  activeOrders: customer.orders.filter(o =>
    !["SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status)
  ).length,
}), [customer.orders]);
```

#### 3. Virtualize Long Lists
**Impact:** 10x faster rendering for 1000+ items

```bash
npm install @tanstack/react-virtual
```

```typescript
// For tables with 100+ rows
import { useVirtualizer } from '@tanstack/react-virtual';

function ItemsTable({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index}>
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### E. Caching Strategies

#### 1. Enable SWR for Data Fetching
**Already using:** React Query ✅
**Optimization:** Add staleTime configuration

```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false, // Disable aggressive refetching
      retry: 1,
    },
  },
});
```

#### 2. Add HTTP Caching Headers
**Impact:** Reduce API calls by 60-80%

```typescript
// app/api/_utils/cache.ts
export function withCache(handler: Function, maxAge = 300) {
  return async (req: Request, ...args: any[]) => {
    const response = await handler(req, ...args);

    if (response.ok) {
      response.headers.set('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=600`);
    }

    return response;
  };
}

// Usage in routes
export const GET = withCache(async (req: Request) => {
  // ... route logic
}, 60); // Cache for 1 minute
```

### F. Loading States & Suspense

#### 1. Add Loading Skeletons
**Impact:** Perceived performance improvement

```typescript
// app/(app)/modules/inventory/items/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
      <div className="h-64 bg-gray-100 animate-pulse rounded" />
    </div>
  );
}
```

#### 2. Use React Suspense Boundaries

```typescript
// app/(app)/modules/inventory/items/page.tsx
import { Suspense } from 'react';

export default function ItemsPage() {
  return (
    <Suspense fallback={<ItemsTableSkeleton />}>
      <ItemsTable />
    </Suspense>
  );
}
```

### G. Service Worker Optimization

#### 1. Precache Critical Assets

```javascript
// public/service-worker.js
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/_next/static/chunks/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(CRITICAL_ASSETS)
    )
  );
});
```

## Performance Metrics to Track

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Custom Metrics
- Time to Interactive (TTI)
- Initial Bundle Size
- Route Change Speed
- API Response Times

## Tools for Monitoring

1. **Vercel Analytics** (Built-in)
   - Already enabled for deployment
   - Real user metrics

2. **Lighthouse CI**
   ```bash
   npm install -g @lhci/cli
   lhci autorun
   ```

3. **Bundle Analyzer**
   ```bash
   npm install -D @next/bundle-analyzer
   ```

   ```javascript
   // next.config.js
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer(nextConfig);
   ```

## Implementation Priority

### Phase 1 - Quick Wins (1-2 hours)
1. ✅ Security updates (DONE)
2. Add query pagination to heavy endpoints
3. Memoize dashboard components
4. Add loading skeletons

### Phase 2 - Medium Impact (3-5 hours)
1. Implement dynamic imports for heavy components
2. Add database indexes
3. Configure React Query staleTime
4. Add HTTP caching headers

### Phase 3 - Long-term (1-2 days)
1. Implement virtualization for large lists
2. Optimize images with Next.js Image
3. Add Suspense boundaries
4. Set up performance monitoring

## Estimated Impact

**Before optimizations:**
- Bundle size: ~2.5MB
- LCP: ~3-4s
- API response: 200-500ms

**After optimizations:**
- Bundle size: ~1.5MB (40% reduction)
- LCP: ~1.5-2s (50% improvement)
- API response: 50-150ms (70% improvement)

---

**Next Steps:**
1. Review this document
2. Prioritize optimizations based on user impact
3. Implement Phase 1 quick wins
4. Monitor performance improvements
5. Iterate based on metrics
