import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (auth.isOwnerUser) {
      return NextResponse.json({ role: 'owner', groupFolder: null });
    }

    if (auth.isUser) {
      return NextResponse.json({ role: 'user', groupFolder: auth.groupFolder });
    }

    // Share tokens and unauthenticated requests
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[API] GET /api/auth/me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
