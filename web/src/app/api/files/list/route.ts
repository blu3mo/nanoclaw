import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { listDailyFiles, listWeeklyFiles } from '@/lib/files';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('view')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dir = request.nextUrl.searchParams.get('dir');
    const groupFolder = request.nextUrl.searchParams.get('groupFolder') || undefined;

    // Share tokens can only access their own group
    if (!auth.isOwnerUser && auth.groupFolder && groupFolder && auth.groupFolder !== groupFolder) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }

    const effectiveGroupFolder = groupFolder || (auth.groupFolder ?? undefined);

    if (dir === 'daily') {
      return NextResponse.json(listDailyFiles(effectiveGroupFolder));
    } else if (dir === 'weekly') {
      return NextResponse.json(listWeeklyFiles(effectiveGroupFolder));
    } else {
      return NextResponse.json(
        { error: "dir parameter must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] GET /api/files/list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
