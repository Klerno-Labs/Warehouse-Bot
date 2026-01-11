import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle authentication and public routes
 * Ensures manifest.json, icons, and other static assets are publicly accessible
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to these paths without authentication
  const publicPaths = [
    '/manifest.json',
    '/icons/',
    '/offline.html',
    '/service-worker.js',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/register',
    '/login',
    '/register',
    '/_next/',
    '/favicon.ico',
  ];

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other routes, continue (authentication is handled in API routes)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
