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
