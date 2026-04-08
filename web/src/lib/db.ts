import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.NANOCLAW_DB_PATH || path.resolve(process.cwd(), '..', 'store/messages.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Ensure share_tokens table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      token TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT 'view',
      group_folder TEXT NOT NULL DEFAULT 'discord_main',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  // Add group_folder column if it doesn't exist (migration for existing installs)
  try {
    db.exec(`ALTER TABLE share_tokens ADD COLUMN group_folder TEXT NOT NULL DEFAULT 'discord_main'`);
  } catch {
    // Column already exists — ignore
  }

  // Ensure user_tokens table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_tokens (
      token TEXT PRIMARY KEY,
      group_folder TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      active INTEGER DEFAULT 1
    )
  `);

  return db;
}

export interface Message {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: number;
  is_bot_message: number;
  reply_to_message_id: string | null;
  reply_to_message_content: string | null;
  reply_to_sender_name: string | null;
}

export interface ScheduledTask {
  id: number;
  name: string;
  cron: string;
  command: string;
  enabled: number;
  last_run: string | null;
  next_run: string | null;
  [key: string]: unknown;
}

export interface ShareToken {
  token: string;
  label: string;
  permissions: string;
  group_folder: string;
  created_at: string;
  expires_at: string | null;
  active: number;
}

export interface RegisteredGroup {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  container_config: string | null;
  requires_trigger: number;
  is_main: number;
}

export function getMessages(chatJid: string, limit: number = 50): Message[] {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM messages WHERE chat_jid = ? ORDER BY timestamp DESC LIMIT ?'
  );
  return stmt.all(chatJid, limit) as Message[];
}

export function getMessagesSince(chatJid: string, since: string): Message[] {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM messages WHERE chat_jid = ? AND timestamp > ? ORDER BY timestamp DESC'
  );
  return stmt.all(chatJid, since) as Message[];
}

export function sendMessage(
  chatJid: string,
  senderName: string,
  content: string,
  isFromMe: boolean
): Message {
  const database = getDb();
  const id = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO messages (id, chat_jid, sender, sender_name, content, timestamp, is_from_me, is_bot_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);

  stmt.run(id, chatJid, senderName, senderName, content, timestamp, isFromMe ? 1 : 0);

  return {
    id,
    chat_jid: chatJid,
    sender: senderName,
    sender_name: senderName,
    content,
    timestamp,
    is_from_me: isFromMe ? 1 : 0,
    is_bot_message: 0,
    reply_to_message_id: null,
    reply_to_message_content: null,
    reply_to_sender_name: null,
  };
}

export function getScheduledTasks(): ScheduledTask[] {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT * FROM scheduled_tasks');
    return stmt.all() as ScheduledTask[];
  } catch {
    // Table may not exist
    return [];
  }
}

export function getShareTokens(): ShareToken[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM share_tokens ORDER BY created_at DESC');
  return stmt.all() as ShareToken[];
}

export function createShareToken(
  token: string,
  label: string,
  permissions: string,
  expiresAt: string | null,
  groupFolder: string = 'discord_main'
): ShareToken {
  const database = getDb();
  const createdAt = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO share_tokens (token, label, permissions, group_folder, created_at, expires_at, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  stmt.run(token, label, permissions, groupFolder, createdAt, expiresAt);

  return {
    token,
    label,
    permissions,
    group_folder: groupFolder,
    created_at: createdAt,
    expires_at: expiresAt,
    active: 1,
  };
}

export function getShareToken(token: string): ShareToken | null {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM share_tokens WHERE token = ? AND active = 1'
  );
  const row = stmt.get(token) as ShareToken | undefined;

  if (!row) return null;

  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null;
  }

  return row;
}

export function deactivateShareToken(token: string): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE share_tokens SET active = 0 WHERE token = ?');
  stmt.run(token);
}

export function getChatJidForMain(): string | null {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT jid FROM registered_groups WHERE is_main = 1');
    const row = stmt.get() as { jid: string } | undefined;
    return row?.jid ?? null;
  } catch {
    // Table may not exist
    return null;
  }
}

export function getAllGroups(): { jid: string; name: string; folder: string; is_main: number }[] {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT jid, name, folder, is_main FROM registered_groups ORDER BY name');
    return stmt.all() as { jid: string; name: string; folder: string; is_main: number }[];
  } catch {
    // Table may not exist
    return [];
  }
}

export function getGroupByFolder(folder: string): RegisteredGroup | null {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT * FROM registered_groups WHERE folder = ?');
    const row = stmt.get(folder) as RegisteredGroup | undefined;
    return row ?? null;
  } catch {
    // Table may not exist
    return null;
  }
}

export function getGroupByJid(jid: string): RegisteredGroup | null {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT * FROM registered_groups WHERE jid = ?');
    const row = stmt.get(jid) as RegisteredGroup | undefined;
    return row ?? null;
  } catch {
    // Table may not exist
    return null;
  }
}

// --- User tokens (per-user authentication) ---

export interface UserToken {
  token: string;
  group_folder: string;
  label: string;
  created_at: string;
  active: number;
}

export function createUserToken(token: string, groupFolder: string, label: string): UserToken {
  const database = getDb();
  const createdAt = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO user_tokens (token, group_folder, label, created_at, active)
    VALUES (?, ?, ?, ?, 1)
  `);

  stmt.run(token, groupFolder, label, createdAt);

  return {
    token,
    group_folder: groupFolder,
    label,
    created_at: createdAt,
    active: 1,
  };
}

export function getUserToken(token: string): UserToken | null {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM user_tokens WHERE token = ? AND active = 1'
  );
  const row = stmt.get(token) as UserToken | undefined;
  return row ?? null;
}

export function getUserTokensForGroup(groupFolder: string): UserToken[] {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM user_tokens WHERE group_folder = ? ORDER BY created_at DESC'
  );
  return stmt.all(groupFolder) as UserToken[];
}

export function getAllUserTokens(): UserToken[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM user_tokens ORDER BY created_at DESC');
  return stmt.all() as UserToken[];
}

export function deactivateUserToken(token: string): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE user_tokens SET active = 0 WHERE token = ?');
  stmt.run(token);
}
