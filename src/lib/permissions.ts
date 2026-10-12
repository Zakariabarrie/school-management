import type { ReportCategory, Role } from '../types';

export type ModuleId =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'attendance'
  | 'examinations'
  | 'fees'
  | 'timetable'
  | 'library'
  | 'reports'
  | 'settings'
  | 'register';

export type Action =
  | 'registerStudents'
  | 'manageTeachers'
  | 'recordAttendance'
  | 'enterScores'
  | 'manageFees'
  | 'manageLibrary'
  | 'manageTimetable'
  | 'manageSettings'
  | 'manageUsers';

const MODULES: Record<Role, ModuleId[]> = {
  administrator: [
    'dashboard',
    'students',
    'teachers',
    'attendance',
    'examinations',
    'fees',
    'timetable',
    'library',
    'reports',
    'settings',
    'register',
  ],
  teacher: ['dashboard', 'students', 'attendance', 'examinations', 'timetable', 'reports'],
  libraryManager: ['dashboard', 'library'],
  registrar: ['dashboard', 'fees'],
  register: ['dashboard', 'register', 'students'],
  student: ['dashboard', 'students', 'attendance', 'examinations', 'fees', 'timetable', 'library'],
  parent: ['dashboard', 'students', 'attendance', 'examinations', 'fees', 'timetable'],
};

const ACTIONS: Record<Role, Action[]> = {
  administrator: [
    'manageTeachers',
    'manageTimetable',
    'manageSettings',
    'manageUsers',
  ],
  teacher: ['recordAttendance', 'enterScores'],
  libraryManager: ['manageLibrary'],
  registrar: ['manageFees'],
  register: ['registerStudents'],
  student: [],
  parent: [],
};

const LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  teachers: 'Teachers',
  attendance: 'Attendance',
  examinations: 'Examinations & Results',
  fees: 'Fees',
  timetable: 'Timetable',
  library: 'Library',
  reports: 'Reports',
  settings: 'Settings',
  register: 'Register',
};

export const ACCOUNT_ROLES: Role[] = ['register', 'libraryManager', 'registrar', 'teacher', 'parent'];

export function accountRoleChoices(current?: Role): Role[] {
  if (current && !ACCOUNT_ROLES.includes(current)) return [current, ...ACCOUNT_ROLES];
  return ACCOUNT_ROLES;
}

export function canAccess(role: Role, moduleId: ModuleId): boolean {
  return MODULES[role].includes(moduleId);
}

export function can(role: Role, action: Action): boolean {
  return ACTIONS[role].includes(action);
}

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator',
  teacher: 'Teacher',
  libraryManager: 'Library Manager',
  registrar: 'Finance',
  register: 'Register',
  student: 'Student',
  parent: 'Parent / Guardian',
};

export function reportCategoriesFor(role: Role): ReportCategory[] {
  if (role === 'administrator') return ['student', 'attendance', 'examination', 'fees', 'teacher', 'library'];
  if (role === 'teacher') return ['student', 'attendance', 'examination', 'teacher'];
  return [];
}

export function navLabel(role: Role, moduleId: ModuleId): string {
  if (moduleId === 'students') {
    if (role === 'student') return 'My profile';
    if (role === 'parent') return 'My child';
    if (role === 'teacher') return 'My students';
    if (role === 'register') return 'Student roll';
  }
  if (moduleId === 'dashboard' && role === 'register') return 'Register desk';
  if (moduleId === 'examinations' && (role === 'student' || role === 'parent')) return 'Results';
  if (moduleId === 'fees' && role !== 'administrator' && role !== 'registrar') return 'Fee balance';
  if (moduleId === 'dashboard' && role === 'libraryManager') return 'Library desk';
  if (moduleId === 'dashboard' && role === 'registrar') return 'Fees desk';
  if (moduleId === 'library' && role === 'libraryManager') return 'Library';
  return LABELS[moduleId];
}

export function navGroups(role: Role): { group: string; items: ModuleId[] }[] {
  const allowed = new Set(MODULES[role]);
  const groups: { group: string; items: ModuleId[] }[] =
    role === 'administrator'
      ? [
          { group: 'Overview', items: ['dashboard'] },
          { group: 'People', items: ['students', 'teachers', 'register'] },
          { group: 'Academic', items: ['attendance', 'examinations', 'timetable', 'library'] },
          { group: 'Administration', items: ['fees', 'reports', 'settings'] },
        ]
      : role === 'teacher'
        ? [
            { group: 'Overview', items: ['dashboard'] },
            { group: 'Teaching', items: ['students', 'attendance', 'examinations', 'timetable'] },
            { group: 'Records', items: ['reports'] },
          ]
        : role === 'libraryManager'
          ? [{ group: 'Library', items: ['dashboard', 'library'] }]
        : role === 'registrar'
          ? [{ group: 'Fees', items: ['dashboard', 'fees'] }]
        : role === 'register'
          ? [{ group: 'Admissions', items: ['dashboard', 'register', 'students'] }]
        : role === 'student'
          ? [
              { group: 'My school', items: ['dashboard', 'students', 'attendance', 'examinations'] },
              { group: 'School life', items: ['timetable', 'fees', 'library'] },
            ]
          : [
              { group: 'My child', items: ['dashboard', 'students', 'attendance', 'examinations'] },
              { group: 'School life', items: ['timetable', 'fees'] },
            ];
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.has(item)) }))
    .filter((group) => group.items.length > 0);
}
