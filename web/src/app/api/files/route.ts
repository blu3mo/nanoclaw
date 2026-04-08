import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { readFile, writeMarkdownFile } from '@/lib/files';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('view')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filePath = request.nextUrl.searchParams.get('path');
    if (!filePath) {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
    }

    // Determine group folder
    const groupFolder = request.nextUrl.searchParams.get('groupFolder') || undefined;

    // Share tokens can only access their own group
    if (!auth.isOwnerUser && auth.groupFolder && groupFolder && auth.groupFolder !== groupFolder) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }

    const effectiveGroupFolder = groupFolder || (auth.groupFolder ?? undefined);
    const content = readFile(filePath, effectiveGroupFolder);
    const filename = path.basename(filePath);

    return NextResponse.json({ content, filename });
  } catch (error) {
    if (error instanceof Error && error.message === 'Path traversal not allowed') {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('[API] GET /api/files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('edit')) {
      return NextResponse.json({ error: 'Edit access required' }, { status: 403 });
    }

    const body = await request.json();
    const { path: filePath, content, groupFolder } = body;

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }
    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // User tokens can only edit files within their own group
    if (!auth.isOwnerUser && auth.groupFolder) {
      const effectiveGroupFolder = groupFolder || auth.groupFolder;
      if (effectiveGroupFolder !== auth.groupFolder) {
        return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
      }
    }

    writeMarkdownFile(filePath, content, groupFolder || undefined);

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error('[API] PUT /api/files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
