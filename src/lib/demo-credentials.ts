/** Exhibition sign-in emails and passwords (standalone demo). */

export function studentIndexFromId(studentId: string): number {
  const match = studentId.match(/STU-2026-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function studentLoginEmail(index: number): string {
  if (index === 1) return 'student@rokelvalley.edu.sl';
  return `student${String(index).padStart(3, '0')}@rokelvalley.edu.sl`;
}

export function parentLoginEmail(index: number): string {
  if (index === 1) return 'parent@rokelvalley.edu.sl';
  return `parent${String(index).padStart(3, '0')}@rokelvalley.edu.sl`;
}

export function teacherLoginEmail(index: number): string {
  if (index === 1) return 'teacher@rokelvalley.edu.sl';
  return `teacher${String(index).padStart(3, '0')}@rokelvalley.edu.sl`;
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

export function normalizeLoginInput(value: string): string {
  return value.trim().normalize('NFKC');
}

export function studentIndexFromEmail(email: string): number | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'student@rokelvalley.edu.sl') return 1;
  const match = normalized.match(/^student(\d{1,3})@rokelvalley\.edu\.sl$/);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function teacherIndexFromEmail(email: string): number | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'teacher@rokelvalley.edu.sl') return 1;
  const match = normalized.match(/^teacher(\d{1,3})@rokelvalley\.edu\.sl$/);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function parentIndexFromEmail(email: string): number | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'parent@rokelvalley.edu.sl') return 1;
  const match = normalized.match(/^parent(\d{1,3})@rokelvalley\.edu\.sl$/);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

/** Accepts canonical demo passwords plus common case/legacy variants at exhibition. */
export function exhibitionPasswordMatches(email: string, expected: string, given: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
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

  if (normalizedEmail === 'register@rokelvalley.edu.sl') {
    if (attempt.toLowerCase() === REGISTRAR_LOGIN_PASSWORD.toLowerCase()) return true;
    if (attempt.toLowerCase() === FINANCE_LOGIN_PASSWORD.toLowerCase()) return true;
  }
  if (normalizedEmail === 'registrar@rokelvalley.edu.sl') {
    if (attempt.toLowerCase() === FINANCE_LOGIN_PASSWORD.toLowerCase()) return true;
    if (attempt.toLowerCase() === REGISTRAR_LOGIN_PASSWORD.toLowerCase()) return true;
  }
  if (normalizedEmail === 'library@rokelvalley.edu.sl') {
    if (attempt.toLowerCase() === LIBRARY_LOGIN_PASSWORD.toLowerCase()) return true;
  }

  return false;
}
