import { INITIAL_DATA } from '../data/seed';
import type { DemoUser } from '../types';

/** Bundled demonstration accounts (names, emails, passwords) from seed. */
export function mergeSeedUsers(users: DemoUser[]): DemoUser[] {
  const safe = Array.isArray(users) ? users : [];
  const seedIds = new Set(INITIAL_DATA.users.map((user) => user.id));
  const seedEmails = new Set(INITIAL_DATA.users.map((user) => user.email.toLowerCase()));
  const custom = safe.filter(
    (user) => !seedIds.has(user.id) && !seedEmails.has(user.email.toLowerCase()),
  );
  return [...INITIAL_DATA.users.map((user) => structuredClone(user)), ...custom];
}

export function seedUserForEmail(email: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return INITIAL_DATA.users.find((user) => user.email.toLowerCase() === normalized);
}

export function demoPasswordForUser(user: DemoUser): string {
  const byId = INITIAL_DATA.users.find((item) => item.id === user.id);
  if (byId?.password) return byId.password;
  const byEmail = seedUserForEmail(user.email);
  if (byEmail?.password) return byEmail.password;
  return user.password?.trim() ?? '';
}
