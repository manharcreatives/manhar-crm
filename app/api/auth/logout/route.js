import { NextResponse } from 'next/server';

const COOKIE_KEY = 'manhar_auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_KEY, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
