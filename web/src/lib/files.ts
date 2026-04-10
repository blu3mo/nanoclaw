import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function getGroupPath(groupFolder?: string): string {
  // Base groups directory: use NANOCLAW_GROUPS_DIR if set, otherwise derive from NANOCLAW_GROUP_PATH
  const defaultGroupPath = process.env.NANOCLAW_GROUP_PATH || '/root/nanoclaw/groups/discord_main';
  const groupsBaseDir = process.env.NANOCLAW_GROUPS_DIR || path.dirname(path.resolve(defaultGroupPath));

  if (groupFolder) {
    return path.resolve(groupsBaseDir, groupFolder);
  }
  return path.resolve(defaultGroupPath);
}

export interface MarkdownFile {
  content: string;
  metadata: Record<string, unknown>;
}

export function readMarkdownFile(filename: string, groupFolder?: string): MarkdownFile {
  const filePath = path.join(getGroupPath(groupFolder), filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { content, metadata: data };
}

export function writeMarkdownFile(filename: string, content: string, groupFolder?: string): void {
  const filePath = path.join(getGroupPath(groupFolder), filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function listDailyFiles(groupFolder?: string): string[] {
  const dailyDir = path.join(getGroupPath(groupFolder), 'daily');
  if (!fs.existsSync(dailyDir)) return [];

  return fs.readdirSync(dailyDir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .reverse();
}

export function listWeeklyFiles(groupFolder?: string): string[] {
  const weeklyDir = path.join(getGroupPath(groupFolder), 'weekly');
  if (!fs.existsSync(weeklyDir)) return [];

  return fs.readdirSync(weeklyDir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .reverse();
}

export function readFile(relativePath: string, groupFolder?: string): string {
  // Path traversal protection
  const groupPath = getGroupPath(groupFolder);
  const resolved = path.resolve(groupPath, relativePath);

  if (!resolved.startsWith(groupPath)) {
    throw new Error('Path traversal not allowed');
  }

  return fs.readFileSync(resolved, 'utf-8');
}
