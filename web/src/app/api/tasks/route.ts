import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getScheduledTasks } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.isUser) {
      return NextResponse.json({ error: 'Access required' }, { status: 403 });
    }

    const groupFolder = request.nextUrl.searchParams.get('groupFolder');
    let tasks = getScheduledTasks();

    // Users can only see their own group's tasks
    if (auth.isUser && auth.groupFolder) {
      tasks = tasks.filter((t) => t.group_folder === auth.groupFolder);
    } else if (groupFolder) {
      tasks = tasks.filter((t) => t.group_folder === groupFolder);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[API] GET /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
