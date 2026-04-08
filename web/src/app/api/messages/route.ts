import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getMessages, getMessagesSince, sendMessage, getChatJidForMain, getGroupByFolder } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.isOwnerUser && !auth.permissions.includes('view')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const groupFolder = searchParams.get('groupFolder');

    // Determine chatJid: owner can access any group, share tokens are restricted
    let chatJid = searchParams.get('chatJid') || '';

    if (!chatJid && groupFolder) {
      // Resolve chatJid from groupFolder
      if (!auth.isOwnerUser && auth.groupFolder && auth.groupFolder !== groupFolder) {
        return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
      }
      const group = getGroupByFolder(groupFolder);
      chatJid = group?.jid || '';
    }

    if (!chatJid) {
      // Fall back to share token's group or main group
      if (!auth.isOwnerUser && auth.groupFolder) {
        const group = getGroupByFolder(auth.groupFolder);
        chatJid = group?.jid || '';
      } else {
        chatJid = getChatJidForMain() || '';
      }
    }

    if (!chatJid) {
      return NextResponse.json({ error: 'No chat JID provided and no main group found' }, { status: 400 });
    }

    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

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
    const { content, senderName = 'Owner', isFromMe = true, groupFolder } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Determine chatJid from groupFolder or fall back to main/share token group
    let chatJid = '';

    if (groupFolder) {
      if (!auth.isOwnerUser && auth.groupFolder && auth.groupFolder !== groupFolder) {
        return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
      }
      const group = getGroupByFolder(groupFolder);
      chatJid = group?.jid || '';
    } else if (!auth.isOwnerUser && auth.groupFolder) {
      const group = getGroupByFolder(auth.groupFolder);
      chatJid = group?.jid || '';
    } else {
      chatJid = getChatJidForMain() || '';
    }

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
