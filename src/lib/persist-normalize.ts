import { INITIAL_DATA, SEED_ROSTER_REVISION } from '../data/seed';
import { buildTimetable } from '../data/school';
import { seedAdministratorUser } from './demo-auth';
import { mergeSeedUsers } from './seed-users';
import { addDays, fullName } from './format';
import type { AppState, DemoData, DemoUser, Student } from '../types';

export const PERSIST_VERSION = 2;
export { SEED_ROSTER_REVISION };

function rosterMatchesSeed(students: Student[]): boolean {
  if (students.length !== INITIAL_DATA.students.length) return false;
  const expected = new Map(INITIAL_DATA.students.map((student) => [student.id, student]));
  for (const student of students) {
    const seed = expected.get(student.id);
    if (!seed) return false;
    if (fullName(student) !== fullName(seed) || student.className !== seed.className) return false;
  }
  return true;
}

/** Replaces register and related demonstration rows when the bundled roster changed. */
export function applySeedRoster(data: DemoData): DemoData {
  if (rosterMatchesSeed(data.students)) return data;
  const next = structuredClone(data);
  const seed = INITIAL_DATA;
  next.students = structuredClone(seed.students);
  next.attendance = structuredClone(seed.attendance);
  next.marks = structuredClone(seed.marks);
  next.fees = structuredClone(seed.fees);
  next.payments = structuredClone(seed.payments);
  next.loans = structuredClone(seed.loans);
  next.notifications = structuredClone(seed.notifications);
  next.teachers = structuredClone(seed.teachers);
  next.users = mergeSeedUsers(next.users);
  return next;
}

export function splitStoredPartPayments(fees: DemoData['fees'], payments: DemoData['payments']): DemoData['payments'] {
  const drop = new Set<string>();
  const extra: DemoData['payments'] = [];
  for (const fee of fees) {
    if (fee.paid <= 0 || fee.paid >= fee.expected) continue;
    const list = payments.filter((payment) => payment.feeAccountId === fee.id);
    if (list.length !== 1) continue;
    const payment = list[0];
    if (!payment.id.startsWith('PAY-') || payment.amount !== fee.paid) continue;
    const firstAmount = Math.min(600, payment.amount - 100);
    if (firstAmount <= 0 || firstAmount >= payment.amount) continue;
    drop.add(payment.id);
    extra.push(
      { ...payment, id: `${payment.id}-1`, amount: firstAmount },
      {
        ...payment,
        id: `${payment.id}-2`,
        amount: payment.amount - firstAmount,
        date: addDays(payment.date, 14),
        reference: `${payment.reference}B`,
      },
    );
  }
  if (drop.size === 0) return payments;
  return [...payments.filter((payment) => !drop.has(payment.id)), ...extra];
}

export function normalizeSchoolData(raw: DemoData): DemoData {
  const data = structuredClone(raw);
  if (!Array.isArray(data.users)) data.users = [];
  if (!data.timetable?.length) data.timetable = buildTimetable();
  for (const seeded of INITIAL_DATA.users.filter((user) => user.role === 'registrar' || user.role === 'register')) {
    if (!data.users.some((user) => user.role === seeded.role || user.email.toLowerCase() === seeded.email.toLowerCase())) {
      data.users = [...data.users, seeded];
    }
  }
  data.users = data.users.map((user) => normalizeUser(user));
  data.attendance = data.attendance.map((record) =>
    (record.status as string) === 'Late' ? { ...record, status: 'Sick' } : record,
  );
  data.payments = splitStoredPartPayments(data.fees, data.payments);
  data.users = mergeSeedUsers(data.users);
  if (INITIAL_DATA.teachers.length) {
    data.teachers = structuredClone(INITIAL_DATA.teachers);
  }
  return applySeedAdministrator(applySeedSchoolIdentity(applySeedRoster(data)));
}

/** Keeps school name and office contact aligned with the bundled seed. */
function applySeedSchoolIdentity(data: DemoData): DemoData {
  const seed = INITIAL_DATA.settings;
  return {
    ...data,
    settings: {
      ...data.settings,
      name: seed.name,
      shortName: seed.shortName,
      email: seed.email,
    },
  };
}

/** Keeps exhibition administrator in sync with seed (name, email, password) when local data is older. */
export function applySeedAdministrator(data: DemoData): DemoData {
  const seedAdmin = seedAdministratorUser();
  const next = structuredClone(data);
  if (!Array.isArray(next.users)) next.users = [];
  const index = next.users.findIndex((user) => user.role === 'administrator' || user.id === seedAdmin.id);
  const merged: DemoUser = {
    ...(index >= 0 ? next.users[index] : seedAdmin),
    ...seedAdmin,
    id: index >= 0 ? next.users[index].id : seedAdmin.id,
    password: seedAdmin.password,
  };
  if (index >= 0) next.users[index] = merged;
  else next.users = [merged, ...next.users];
  return next;
}

function normalizeUser(user: DemoUser): DemoUser {
  let next = { ...user, password: user.password ?? '' };
  if (next.role === 'registrar') next = { ...next, roleLabel: 'Finance' };
  if (next.role === 'register') next = { ...next, roleLabel: 'Register' };
  return next;
}

export function normalizeSession(session: AppState['session']): AppState['session'] {
  if (!session) return null;
  if (session.role === 'registrar') return { ...session, roleLabel: 'Finance' };
  if (session.role === 'register') return { ...session, roleLabel: 'Register' };
  return session;
}

export function schoolDataFromState(state: AppState): DemoData {
  const { session: _session, toasts: _toasts, ...data } = state;
  void _session;
  void _toasts;
  return {
    ...data,
    users: data.users.map((user) => ({ ...user, password: '' })),
  };
}

export function initialSchoolData(): DemoData {
  return normalizeSchoolData(structuredClone(INITIAL_DATA));
}
