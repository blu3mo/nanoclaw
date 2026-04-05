import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getMessages, getMessagesSince, sendMessage, getChatJidForMain } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('view')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const chatJid = searchParams.get('chatJid') || getChatJidForMain() || '';
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!chatJid) {
      return NextResponse.json({ error: 'No chat JID provided and no main group found' }, { status: 400 });
    }

    const messages = since
      ? getMessagesSince(chatJid, since)
      : getMessages(chatJid, limit);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('[API] GET /api/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('chat')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, senderName = 'Owner', isFromMe = true } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const chatJid = getChatJidForMain() || '';
    if (!chatJid) {
      return NextResponse.json({ error: 'No main group configured' }, { status: 400 });
    }

    const message = sendMessage(chatJid, senderName, content, isFromMe);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
