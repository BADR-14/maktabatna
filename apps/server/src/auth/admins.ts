/**
 * Admins (the parents) manage challenges, points and badge rewards. They are named in the
 * server's .env, so nobody can make themselves an admin from a phone:
 *   ADMIN_USERNAMES=abu-ahmad,umm-ahmad
 */
export function isAdmin(username: string | null | undefined): boolean {
  if (!username) return false;
  const list = (process.env.ADMIN_USERNAMES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(username.toLowerCase());
}
