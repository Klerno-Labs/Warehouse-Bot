import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle public routes
 * Ensures manifest.json, icons, and other static assets are publicly accessible
 * Note: Authentication is handled in individual API routes, not here
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Explicitly allow these paths without any processing
  const publicPaths = [
    '/manifest.json',
    '/icons',
    '/offline.html',
    '/service-worker.js',
    '/favicon.ico',
    '/_next',
    '/api/auth',
    '/login',
    '/register',
    '/signup',
  ];

  // Check if path matches any public path
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Add explicit header for static assets to prevent authentication challenges
  if (pathname === '/manifest.json' || pathname.startsWith('/icons/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  }

  // Allow all other requests through - auth is handled per-route
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - manifest.json (PWA manifest)
     * - icons/ (PWA icons)
     * - service-worker.js (service worker)
     * - offline.html (offline page)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|service-worker.js|offline.html).*)',
  ],
};
