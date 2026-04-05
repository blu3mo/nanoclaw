import { NextRequest, NextResponse } from 'next/server';
import { isOwner } from '@/lib/auth';
import { getScheduledTasks } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!isOwner(request)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const tasks = getScheduledTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[API] GET /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
