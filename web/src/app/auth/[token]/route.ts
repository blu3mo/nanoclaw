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

  if (!isOwner && !userToken) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }

  // Set cookie and redirect to dashboard
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('blueclaw-token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
