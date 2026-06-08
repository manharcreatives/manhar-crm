import { NextResponse } from 'next/server';

const COOKIE_KEY = 'manhar_auth';
const PROTECTED_ROUTES = ['/dashboard', '/clients', '/crm', '/payments', '/invoice', '/history', '/services'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get(COOKIE_KEY)?.value;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) || pathname === '/';

  if (isProtected && authCookie !== 'true') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && authCookie === 'true') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
