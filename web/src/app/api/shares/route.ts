import { NextRequest, NextResponse } from 'next/server';
import { isOwner } from '@/lib/auth';
import { getShareTokens, createShareToken, deactivateShareToken } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    if (!isOwner(request)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const tokens = getShareTokens();
    return NextResponse.json(tokens);
  } catch (error) {
    console.error('[API] GET /api/shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isOwner(request)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const body = await request.json();
    const { label, permissions, expiresAt } = body;

    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    const validPermissions = ['view', 'chat', 'edit'];
    const permList = (permissions || 'view').split(',').map((p: string) => p.trim());
    for (const perm of permList) {
      if (!validPermissions.includes(perm)) {
        return NextResponse.json(
          { error: `Invalid permission: ${perm}. Valid: ${validPermissions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const { groupFolder } = body;
    if (!groupFolder || typeof groupFolder !== 'string') {
      return NextResponse.json({ error: 'groupFolder is required' }, { status: 400 });
    }

    const token = uuidv4();
    const shareToken = createShareToken(
      token,
      label,
      permList.join(','),
      expiresAt || null,
      groupFolder
    );

    return NextResponse.json(shareToken, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isOwner(request)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'token parameter is required' }, { status: 400 });
    }

    deactivateShareToken(token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
