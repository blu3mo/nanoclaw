import { NextRequest, NextResponse } from 'next/server';
import { OWNER_TOKEN } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    if (token !== OWNER_TOKEN) {
      return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
    }

    const response = NextResponse.json({ valid: true });

    response.cookies.set('blueclaw-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
