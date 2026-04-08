export async function getSession(): Promise<{ role: 'owner' | 'user' | null; groupFolder: string | null }> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return { role: null, groupFolder: null };
  return res.json();
}
