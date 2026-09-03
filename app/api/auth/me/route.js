import { NextResponse } from 'next/server';

const COOKIE_KEY = 'manhar_auth';

export async function GET(request) {
  const authCookie = request.cookies.get(COOKIE_KEY)?.value;
  if (authCookie === 'true') {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
