import { CLASSES, CORE_SUBJECTS, subjectsForClass } from '../data/school';
import type { AppState, ReportCategory, SearchHit, Session } from '../types';
import { visibleStudents } from './access';
import { fullName } from './format';
import { canAccess, reportCategoriesFor } from './permissions';

const REPORT_COPY: Record<ReportCategory, { title: string; meta: string }> = {
  student: { title: 'Student report', meta: 'Enrolment by class' },
  attendance: { title: 'Attendance report', meta: 'Monthly register' },
  examination: { title: 'Examination report', meta: 'Scores and grades' },
  fees: { title: 'Fees report', meta: 'Balances and payments' },
  teacher: { title: 'Teacher report', meta: 'Staff and subjects' },
  library: { title: 'Library report', meta: 'Stock and loans' },
};

export function buildSearch(state: AppState, session: Session, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const students = visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers);

  if (canAccess(session.role, 'students')) {
    for (const student of students) {
      const name = fullName(student);
      const hay = `${name} ${student.id} ${student.className} ${student.guardianName}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `s-${student.id}`,
          kind: 'Student',
          title: name,
          meta: `${student.id} · ${student.className}`,
          to: `/students/${student.id}`,
        });
      }
    }
  }

  if (canAccess(session.role, 'teachers')) {
    for (const teacher of state.teachers) {
      const name = `${teacher.title} ${teacher.firstName} ${teacher.lastName}`;
      const hay = `${name} ${teacher.id} ${teacher.subjects.join(' ')} ${teacher.classes.join(' ')}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `t-${teacher.id}`,
          kind: 'Teacher',
          title: name,
          meta: `${teacher.id} · ${teacher.subjects.join(', ')}`,
          to: `/teachers/${teacher.id}`,
        });
      }
    }
  }

  if (canAccess(session.role, 'timetable') || canAccess(session.role, 'students')) {
    const family = session.role === 'student' || session.role === 'parent';
    const classNames = family
      ? [...new Set(students.map((student) => student.className))]
      : CLASSES.map((item) => item.name);
    for (const name of classNames) {
      const schoolClass = CLASSES.find((item) => item.name === name);
      if (!name.toLowerCase().includes(q) && !schoolClass?.level.toLowerCase().includes(q)) continue;
      const to =
        session.role === 'administrator' || session.role === 'teacher' || session.role === 'register'
          ? `/students?class=${encodeURIComponent(name)}`
          : `/timetable?class=${encodeURIComponent(name)}`;
      hits.push({
        id: `c-${name}`,
        kind: 'Class',
        title: name,
        meta: schoolClass?.level ?? 'Class',
        to,
      });
    }
  }

  if (canAccess(session.role, 'examinations')) {
    const subjects = new Set<string>([...CORE_SUBJECTS, ...CLASSES.flatMap((item) => subjectsForClass(item.name))]);
    for (const subject of subjects) {
      if (!subject.toLowerCase().includes(q)) continue;
      hits.push({
        id: `sub-${subject}`,
        kind: 'Subject',
        title: subject,
        meta: 'Examination entry',
        to: `/examinations?subject=${encodeURIComponent(subject)}`,
      });
    }
  }

  if (canAccess(session.role, 'library')) {
    for (const book of state.books) {
      const hay = `${book.title} ${book.author} ${book.category} ${book.id}`.toLowerCase();
      if (!hay.includes(q)) continue;
      hits.push({
        id: `b-${book.id}`,
        kind: 'Book',
        title: book.title,
        meta: `${book.id} · ${book.author}`,
        to: `/library?q=${encodeURIComponent(book.title)}`,
      });
    }
  }

  if (canAccess(session.role, 'reports')) {
    for (const category of reportCategoriesFor(session.role)) {
      const copy = REPORT_COPY[category];
      if (!`${copy.title} ${copy.meta} ${category}`.toLowerCase().includes(q)) continue;
      hits.push({
        id: `r-${category}`,
        kind: 'Report',
        title: copy.title,
        meta: copy.meta,
        to: `/reports?category=${category}`,
      });
    }
  }

  return hits.slice(0, 12);
}
