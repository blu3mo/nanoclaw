import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isOwner } from '@/lib/auth';
import { createUserToken, getAllUserTokens, deactivateUserToken } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  try {
    const tokens = getAllUserTokens();
    return NextResponse.json(tokens);
  } catch (error) {
    console.error('[API] GET /api/user-tokens error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { groupFolder, label } = body;

    if (!groupFolder || typeof groupFolder !== 'string') {
      return NextResponse.json({ error: 'groupFolder is required' }, { status: 400 });
    }

    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    const token = uuidv4();
    const userToken = createUserToken(token, groupFolder, label);
    return NextResponse.json(userToken, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/user-tokens error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token query parameter is required' }, { status: 400 });
    }

    deactivateUserToken(token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/user-tokens error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
