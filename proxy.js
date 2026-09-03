import { NextResponse } from 'next/server';

const COOKIE_KEY = 'manhar_auth';
const PROTECTED_ROUTES = ['/dashboard', '/clients', '/crm', '/payments', '/invoice', '/history', '/services', '/expenses'];

export default function proxy(request) {
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
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://files.catbox.moe data: blob:; connect-src 'self' https://oziifcbufuxjifspjooy.supabase.co; frame-ancestors 'none';"
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
