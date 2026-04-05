import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function getGroupPath(): string {
  const groupPath = process.env.NANOCLAW_GROUP_PATH || path.resolve(process.cwd(), '..', 'groups/discord_main');
  return path.resolve(groupPath);
}

export interface MarkdownFile {
  content: string;
  metadata: Record<string, unknown>;
}

export function readMarkdownFile(filename: string): MarkdownFile {
  const filePath = path.join(getGroupPath(), filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { content, metadata: data };
}

export function writeMarkdownFile(filename: string, content: string): void {
  const filePath = path.join(getGroupPath(), filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function listDailyFiles(): string[] {
  const dailyDir = path.join(getGroupPath(), 'daily');
  if (!fs.existsSync(dailyDir)) return [];

  return fs.readdirSync(dailyDir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .reverse();
}

export function listWeeklyFiles(): string[] {
  const weeklyDir = path.join(getGroupPath(), 'weekly');
  if (!fs.existsSync(weeklyDir)) return [];

  return fs.readdirSync(weeklyDir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .reverse();
}

export function readFile(relativePath: string): string {
  // Path traversal protection
  const groupPath = getGroupPath();
  const resolved = path.resolve(groupPath, relativePath);

  if (!resolved.startsWith(groupPath)) {
    throw new Error('Path traversal not allowed');
  }

  return fs.readFileSync(resolved, 'utf-8');
}
