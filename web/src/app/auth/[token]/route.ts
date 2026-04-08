import { NextRequest, NextResponse } from 'next/server';
import { OWNER_TOKEN } from '@/lib/auth';
import { getUserToken } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token
  const isOwner = token === OWNER_TOKEN;
  const userToken = !isOwner ? getUserToken(token) : null;

  // Build base URL from request headers (standalone mode uses localhost internally)
  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  if (!isOwner && !userToken) {
    return NextResponse.redirect(new URL('/login?error=invalid', baseUrl));
  }

  // Set cookie and redirect to dashboard
  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.set('blueclaw-token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
