/** Exhibition sign-in emails and passwords (standalone demo). */

import { SCHOOL_EMAIL_DOMAIN, schoolEmail } from '../data/school';

export function studentIndexFromId(studentId: string): number {
  const match = studentId.match(/STU-2026-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function studentLoginEmail(index: number): string {
  if (index === 1) return schoolEmail('student');
  return schoolEmail(`student${String(index).padStart(3, '0')}`);
}

export function parentLoginEmail(index: number): string {
  if (index === 1) return schoolEmail('parent');
  return schoolEmail(`parent${String(index).padStart(3, '0')}`);
}

export function teacherLoginEmail(index: number): string {
  if (index === 1) return schoolEmail('teacher');
  return schoolEmail(`teacher${String(index).padStart(3, '0')}`);
}

export function studentLoginPassword(index: number): string {
  return `Student@${String(index).padStart(3, '0')}`;
}

export function teacherLoginPassword(index: number): string {
  return `teacher@${String(index).padStart(3, '0')}`;
}

export const FINANCE_LOGIN_PASSWORD = 'Finance@2026';
export const REGISTRAR_LOGIN_PASSWORD = 'Registrar@2026';
export const LIBRARY_LOGIN_PASSWORD = 'Librarian@2026';
export const LEGACY_DEMO_PASSWORD = 'demo123';

const LEGACY_EMAIL_DOMAIN = 'rokelvalley.edu.sl';

export function normalizeLoginInput(value: string): string {
  return value.trim().normalize('NFKC');
}

/** Maps old exhibition emails to the current school domain. */
export function normalizeDemoLoginEmail(email: string): string {
  const normalized = normalizeLoginInput(email).toLowerCase();
  if (normalized.endsWith(`@${LEGACY_EMAIL_DOMAIN}`)) {
    return normalized.replace(`@${LEGACY_EMAIL_DOMAIN}`, `@${SCHOOL_EMAIL_DOMAIN}`);
  }
  return normalized;
}

function emailDomainPattern(): string {
  return SCHOOL_EMAIL_DOMAIN.replace(/\./g, '\\.');
}

export function studentIndexFromEmail(email: string): number | null {
  const normalized = normalizeDemoLoginEmail(email);
  if (normalized === schoolEmail('student')) return 1;
  const match = normalized.match(new RegExp(`^student(\\d{1,3})@${emailDomainPattern()}$`));
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function teacherIndexFromEmail(email: string): number | null {
  const normalized = normalizeDemoLoginEmail(email);
  if (normalized === schoolEmail('teacher')) return 1;
  const match = normalized.match(new RegExp(`^teacher(\\d{1,3})@${emailDomainPattern()}$`));
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function parentIndexFromEmail(email: string): number | null {
  const normalized = normalizeDemoLoginEmail(email);
  if (normalized === schoolEmail('parent')) return 1;
  const match = normalized.match(new RegExp(`^parent(\\d{1,3})@${emailDomainPattern()}$`));
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

/** Accepts canonical demo passwords plus common case/legacy variants at exhibition. */
export function exhibitionPasswordMatches(email: string, expected: string, given: string): boolean {
  const normalizedEmail = normalizeDemoLoginEmail(email);
  const attempt = normalizeLoginInput(given);
  const canonical = normalizeLoginInput(expected);

  if (attempt === canonical) return true;
  if (attempt.toLowerCase() === canonical.toLowerCase()) return true;
  if (attempt === LEGACY_DEMO_PASSWORD) return true;

  const studentIndex = studentIndexFromEmail(normalizedEmail);
  if (studentIndex != null) {
    const full = studentLoginPassword(studentIndex);
    if (attempt === full || attempt.toLowerCase() === full.toLowerCase()) return true;
    const short = `Student@${studentIndex}`;
    if (attempt.toLowerCase() === short.toLowerCase()) return true;
  }

  const parentIndex = parentIndexFromEmail(normalizedEmail);
  if (parentIndex != null) {
    const full = studentLoginPassword(parentIndex);
    if (attempt === full || attempt.toLowerCase() === full.toLowerCase()) return true;
    const short = `Student@${parentIndex}`;
    if (attempt.toLowerCase() === short.toLowerCase()) return true;
  }

  const teacherIndex = teacherIndexFromEmail(normalizedEmail);
  if (teacherIndex != null) {
    const full = teacherLoginPassword(teacherIndex);
    if (attempt === full || attempt.toLowerCase() === full.toLowerCase()) return true;
    const short = `teacher@${teacherIndex}`;
    if (attempt.toLowerCase() === short.toLowerCase()) return true;
  }

  if (normalizedEmail === schoolEmail('register')) {
    if (attempt.toLowerCase() === REGISTRAR_LOGIN_PASSWORD.toLowerCase()) return true;
    if (attempt.toLowerCase() === FINANCE_LOGIN_PASSWORD.toLowerCase()) return true;
  }
  if (normalizedEmail === schoolEmail('registrar')) {
    if (attempt.toLowerCase() === FINANCE_LOGIN_PASSWORD.toLowerCase()) return true;
    if (attempt.toLowerCase() === REGISTRAR_LOGIN_PASSWORD.toLowerCase()) return true;
  }
  if (normalizedEmail === schoolEmail('library')) {
    if (attempt.toLowerCase() === LIBRARY_LOGIN_PASSWORD.toLowerCase()) return true;
  }

  return false;
}
