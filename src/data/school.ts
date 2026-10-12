import type {
  AssessmentCategory,
  DayName,
  Exam,
  Gender,
  GradeBand,
  PaymentMethod,
  Period,
  SchoolClass,
  StudentStatus,
  TermName,
  TimetableSlot,
} from '../types';

export const ACADEMIC_YEAR = '2026/2027';
export const CURRENT_TERM = 'First Term';
export const TERM_FEE = 2200;
export const PARTIAL_FEE = 1100;
export const DEMO_PASSWORD = 'demo123';

export const SHOWCASE = {
  studentId: 'STU-2026-001',
  className: 'JSS 3',
  subject: 'Mathematics',
  term: 'First Term' as TermName,
  year: ACADEMIC_YEAR,
};

export const DEFAULT_ASSESSMENTS: AssessmentCategory[] = [
  { id: 'asg', name: 'Assignments', kind: 'assignment', maxMarks: 20, weight: 20, required: true },
  { id: 'test', name: 'Class tests', kind: 'class-test', maxMarks: 30, weight: 30, required: true },
  { id: 'final', name: 'Final examination', kind: 'final', maxMarks: 50, weight: 50, required: true },
];

export const ASSESSMENT_KINDS: { id: AssessmentCategory['kind']; label: string }[] = [
  { id: 'assignment', label: 'Assignment' },
  { id: 'class-test', label: 'Class test' },
  { id: 'continuous', label: 'Continuous assessment' },
  { id: 'mid-term', label: 'Mid-term examination' },
  { id: 'final', label: 'Final examination' },
];

export const DEFAULT_GRADES: GradeBand[] = [
  { grade: 'A', min: 80, label: 'Excellent' },
  { grade: 'B', min: 70, label: 'Very Good' },
  { grade: 'C', min: 60, label: 'Good' },
  { grade: 'D', min: 50, label: 'Pass' },
  { grade: 'F', min: 0, label: 'Fail' },
];

export const CLASSES: SchoolClass[] = [
  { name: 'JSS 1', level: 'Junior Secondary', formTeacherId: 'TCH-019' },
  { name: 'JSS 2', level: 'Junior Secondary', formTeacherId: 'TCH-027' },
  { name: 'JSS 3', level: 'Junior Secondary', formTeacherId: 'TCH-014' },
  { name: 'SSS 1', level: 'Senior Secondary', formTeacherId: 'TCH-021' },
  { name: 'SSS 2', level: 'Senior Secondary', formTeacherId: 'TCH-033' },
  { name: 'SSS 3', level: 'Senior Secondary', formTeacherId: 'TCH-012' },
];

export const JSS_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Integrated Science',
  'ICT',
  'Social Studies',
  'French',
  'Religious & Moral Education',
];

export const SSS_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Integrated Science',
  'ICT',
  'French',
  'Agricultural Science',
];

export const CORE_SUBJECTS = ['Mathematics', 'English Language', 'Integrated Science', 'ICT'];

export const GENDERS: Gender[] = ['Female', 'Male'];
export const STUDENT_STATUSES: StudentStatus[] = ['Active', 'Inactive'];
export const RELATIONS = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Sibling', 'Other'];
export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank deposit', 'Mobile money'];
export const BOOK_CATEGORIES = [
  'Mathematics',
  'Science',
  'ICT',
  'Literature',
  'English',
  'Social Studies',
  'Agriculture',
  'Languages',
  'Reference',
];
export const TERMS: TermName[] = ['First Term', 'Second Term', 'Third Term'];
export const ACADEMIC_YEARS = [ACADEMIC_YEAR, '2025/2026'];
export const TITLES = ['Mrs.', 'Mr.', 'Ms.', 'Dr.'];

export const EXAMS: Exam[] = [
  { id: 'mid-2026', name: 'Mid-Term Test', term: CURRENT_TERM, academicYear: ACADEMIC_YEAR },
  { id: 'first-2026', name: 'First Term Examination', term: CURRENT_TERM, academicYear: ACADEMIC_YEAR },
];

export const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const PERIODS: Period[] = [
  { id: 'p1', start: '08:00', end: '09:00' },
  { id: 'p2', start: '09:00', end: '10:00' },
  { id: 'p3', start: '10:20', end: '11:20' },
  { id: 'p4', start: '11:20', end: '12:20' },
  { id: 'p5', start: '13:00', end: '14:00' },
];

export const ATTENDANCE_TREND = [
  { month: 'Jan', rate: 91.2 },
  { month: 'Feb', rate: 92.4 },
  { month: 'Mar', rate: 93.1 },
  { month: 'Apr', rate: 90.8 },
  { month: 'May', rate: 94.0 },
  { month: 'Jun', rate: 92.6 },
  { month: 'Jul', rate: 93.8 },
];

export function subjectsForClass(className: string): string[] {
  return className.startsWith('SSS') ? SSS_SUBJECTS : JSS_SUBJECTS;
}

export function teacherForSubject(subject: string): string {
  return SUBJECT_TEACHER[subject] ?? 'TCH-014';
}

const SUBJECT_TEACHER: Record<string, string> = {
  Mathematics: 'TCH-014',
  'English Language': 'TCH-021',
  ICT: 'TCH-008',
  'Integrated Science': 'TCH-033',
  'Social Studies': 'TCH-019',
  French: 'TCH-027',
  'Agricultural Science': 'TCH-041',
  'Religious & Moral Education': 'TCH-012',
};

const JSS3_PLAN: Record<DayName, string[]> = {
  Monday: ['Mathematics', 'Integrated Science', 'English Language', 'ICT', 'Social Studies'],
  Tuesday: ['English Language', 'Mathematics', 'French', 'Integrated Science', 'ICT'],
  Wednesday: ['ICT', 'English Language', 'Mathematics', 'Integrated Science', 'Religious & Moral Education'],
  Thursday: ['Integrated Science', 'ICT', 'English Language', 'Mathematics', 'French'],
  Friday: ['Mathematics', 'Social Studies', 'French', 'ICT', 'Integrated Science'],
};

function planFor(className: string): Record<DayName, string[]> {
  if (className === 'JSS 3') return JSS3_PLAN;
  const subjects = subjectsForClass(className);
  const offset = Math.max(0, CLASSES.findIndex((item) => item.name === className));
  const plan = {} as Record<DayName, string[]>;
  DAYS.forEach((day, dayIndex) => {
    plan[day] = PERIODS.map((_, periodIndex) => subjects[(dayIndex * 2 + periodIndex + offset) % subjects.length]);
  });
  return plan;
}

function roomFor(subject: string, className: string): string {
  if (subject === 'ICT') return 'ICT Lab';
  if (subject === 'Integrated Science') return 'Science Lab';
  if (subject === 'Agricultural Science') return 'School garden';
  const rooms: Record<string, string> = {
    'JSS 1': 'Room 8',
    'JSS 2': 'Room 10',
    'JSS 3': 'Room 12',
    'SSS 1': 'Room 14',
    'SSS 2': 'Room 16',
    'SSS 3': 'Room 18',
  };
  return rooms[className] ?? 'Room 12';
}

export function buildTimetable(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (const schoolClass of CLASSES) {
    const plan = planFor(schoolClass.name);
    for (const day of DAYS) {
      plan[day].forEach((subject, index) => {
        const period = PERIODS[index];
        slots.push({
          id: `${schoolClass.name}-${day}-${period.start}`,
          className: schoolClass.name,
          day,
          start: period.start,
          end: period.end,
          subject,
          teacherId: SUBJECT_TEACHER[subject] ?? 'TCH-014',
          room: roomFor(subject, schoolClass.name),
        });
      });
    }
  }
  return slots;
}
