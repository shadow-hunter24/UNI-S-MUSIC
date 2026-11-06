import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED = [
  '/home',
  '/search',
  '/player',
  '/library',
  '/connect',
  '/earn',
  '/artist',
  '/admin',
  '/playlists',
  '/tracks',
  '/genre',
  '/artists',
  '/browse',
];

// Routes that logged-in users should be bounced away from
const AUTH_ONLY = ['/', '/onboarding', '/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('access_token')?.value;

  // Logged-in user hitting splash / onboarding / auth pages → send to /home
  if (token && AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // Unauthenticated user hitting a protected route → send to /auth/login
  if (!token && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
};
