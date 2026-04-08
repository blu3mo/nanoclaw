import { NextRequest, NextResponse } from 'next/server';
import { getShareToken } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'token parameter is required' }, { status: 400 });
    }

    const shareToken = getShareToken(token);
    if (!shareToken) {
      return NextResponse.json({ error: 'Invalid or expired share token' }, { status: 401 });
    }

    return NextResponse.json({
      label: shareToken.label,
      permissions: shareToken.permissions,
      group_folder: shareToken.group_folder,
    });
  } catch (error) {
    console.error('[API] GET /api/shares/info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
