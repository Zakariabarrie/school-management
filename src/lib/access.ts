import { CLASSES } from '../data/school';
import type { Role, Student, Teacher } from '../types';

export function visibleStudents(
  role: Role,
  studentId: string | undefined,
  teacherId: string | undefined,
  students: Student[],
  teachers: Teacher[],
): Student[] {
  if (role === 'administrator' || role === 'libraryManager' || role === 'registrar' || role === 'register') return students;
  if (role === 'teacher') {
    const teacher = teachers.find((item) => item.id === teacherId);
    if (!teacher) return [];
    return students.filter((student) => teacher.classes.includes(student.className));
  }
  return students.filter((student) => student.id === studentId);
}

export function canViewStudent(
  role: Role,
  studentId: string | undefined,
  teacherId: string | undefined,
  targetId: string,
  students: Student[],
  teachers: Teacher[],
): boolean {
  return visibleStudents(role, studentId, teacherId, students, teachers).some((student) => student.id === targetId);
}

export function visibleClasses(role: Role, teacher: Teacher | undefined, ownClass?: string): string[] {
  if (role === 'teacher') return teacher?.classes ?? [];
  if (role === 'student' || role === 'parent') return ownClass ? [ownClass] : [];
  return CLASSES.map((item) => item.name);
}
