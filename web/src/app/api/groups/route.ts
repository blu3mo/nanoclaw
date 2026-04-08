import { NextRequest, NextResponse } from 'next/server';
import { isOwner } from '@/lib/auth';
import { getAllGroups } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!isOwner(request)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const groups = getAllGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('[API] GET /api/groups error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
