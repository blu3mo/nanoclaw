import { v4 as uuidv4 } from 'uuid';
import { getShareToken as dbGetShareToken, getUserToken as dbGetUserToken } from './db';

function initOwnerToken(): string {
  if (process.env.BLUECLAW_OWNER_TOKEN) {
    return process.env.BLUECLAW_OWNER_TOKEN;
  }

  // Generate a fallback token and log it
  const generated = uuidv4();
  console.log(`[Blueclaw] No BLUECLAW_OWNER_TOKEN set. Generated fallback: ${generated}`);
  return generated;
}

export const OWNER_TOKEN: string = initOwnerToken();

export function isOwner(request: Request): boolean {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === OWNER_TOKEN) return true;
  }

  // Check cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies['blueclaw-token'] === OWNER_TOKEN) return true;
  }

  return false;
}

export function isValidShareToken(token: string): boolean {
  const shareToken = dbGetShareToken(token);
  return shareToken !== null;
}

export function getSharePermissions(token: string): string[] {
  const shareToken = dbGetShareToken(token);
  if (!shareToken) return [];
  return shareToken.permissions.split(',').map((p) => p.trim());
}

export function getShareGroupFolder(token: string): string | null {
  const shareToken = dbGetShareToken(token);
  if (!shareToken) return null;
  return shareToken.group_folder;
}

/**
 * Extract a bearer token, share token, or user token from a request.
 * Returns { isOwnerUser, isUser, shareToken, permissions, groupFolder }.
 */
export function authenticateRequest(request: Request): {
  isOwnerUser: boolean;
  isUser: boolean;
  shareToken: string | null;
  permissions: string[];
  groupFolder: string | null;
} {
  if (isOwner(request)) {
    return { isOwnerUser: true, isUser: false, shareToken: null, permissions: ['view', 'chat', 'edit'], groupFolder: null };
  }

  // Check for user token or share token in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    let token = authHeader.replace(/^Bearer\s+/i, '');
    // Strip "share:" prefix if present
    if (token.startsWith('share:')) {
      token = token.slice(6);
    }

    // Check user tokens first
    const userToken = dbGetUserToken(token);
    if (userToken) {
      return {
        isOwnerUser: false,
        isUser: true,
        shareToken: null,
        permissions: ['view', 'chat', 'edit'],
        groupFolder: userToken.group_folder,
      };
    }

    if (isValidShareToken(token)) {
      return {
        isOwnerUser: false,
        isUser: false,
        shareToken: token,
        permissions: getSharePermissions(token),
        groupFolder: getShareGroupFolder(token),
      };
    }
  }

  // Check cookie for user token or share token
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const token = cookies['blueclaw-token'];
    if (token) {
      // Check user tokens first
      const userToken = dbGetUserToken(token);
      if (userToken) {
        return {
          isOwnerUser: false,
          isUser: true,
          shareToken: null,
          permissions: ['view', 'chat', 'edit'],
          groupFolder: userToken.group_folder,
        };
      }

      if (isValidShareToken(token)) {
        return {
          isOwnerUser: false,
          isUser: false,
          shareToken: token,
          permissions: getSharePermissions(token),
          groupFolder: getShareGroupFolder(token),
        };
      }
    }
  }

  return { isOwnerUser: false, isUser: false, shareToken: null, permissions: [], groupFolder: null };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}
