import { INITIAL_DATA } from '../data/seed';
import { demoPasswordForUser, mergeSeedUsers } from './seed-users';
import type { DemoUser } from '../types';

/** Exhibition administrator — kept in one place for seed sync and login. */
export const EXHIBITION_ADMIN = {
  id: 'USR-001',
  name: 'Alie Tarawallie',
  /** Primary sign-in email */
  email: 'olaraymohammed@gmail.com',
  password: 'Olaray@2026',
  role: 'administrator' as const,
  roleLabel: 'Administrator',
};

/** Any of these emails sign in as the administrator with EXHIBITION_ADMIN.password */
export const ADMIN_LOGIN_EMAILS = new Set(
  [
    EXHIBITION_ADMIN.email,
    'olaraymohammad@gmail.com',
    'admin@rokelvalley.edu.sl',
    'olaraymohammad@rokelvalley.edu.sl',
  ].map((value) => value.toLowerCase()),
);

export function seedAdministratorUser(): DemoUser {
  const fromSeed = INITIAL_DATA.users.find((user) => user.role === 'administrator');
  return {
    ...(fromSeed ?? {
      id: EXHIBITION_ADMIN.id,
      name: EXHIBITION_ADMIN.name,
      email: EXHIBITION_ADMIN.email,
      password: EXHIBITION_ADMIN.password,
      role: EXHIBITION_ADMIN.role,
      roleLabel: EXHIBITION_ADMIN.roleLabel,
      active: true,
    }),
    ...EXHIBITION_ADMIN,
    name: EXHIBITION_ADMIN.name,
    password: EXHIBITION_ADMIN.password,
    active: true,
  };
}

export function usersForLogin(users: DemoUser[]): DemoUser[] {
  const seedAdmin = seedAdministratorUser();
  const list = users.length ? [...users] : [...INITIAL_DATA.users];
  const index = list.findIndex((user) => user.role === 'administrator' || user.id === seedAdmin.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...seedAdmin, id: list[index].id, password: seedAdmin.password };
  } else {
    list.unshift(seedAdmin);
  }
  return list;
}

export function findDemoAccount(email: string, password: string, users: DemoUser[]): DemoUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const list = usersForLogin(mergeSeedUsers(users));

  if (ADMIN_LOGIN_EMAILS.has(normalizedEmail)) {
    if (normalizedPassword !== EXHIBITION_ADMIN.password) return null;
    const admin = list.find((user) => user.role === 'administrator') ?? seedAdministratorUser();
    return { ...admin, email: normalizedEmail, password: EXHIBITION_ADMIN.password };
  }

  const user = list.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) return null;
  if (demoPasswordForUser(user) !== normalizedPassword) return null;
  if (user.active === false) return null;
  return { ...user, password: demoPasswordForUser(user) };
}
