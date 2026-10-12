import type { SchoolColours } from './lib/colours';

export type Role = 'administrator' | 'teacher' | 'libraryManager' | 'registrar' | 'register' | 'student' | 'parent';

export type Gender = 'Male' | 'Female';

export type StudentStatus = 'Active' | 'Inactive';

export type AttendanceStatus = 'Present' | 'Absent' | 'Sick';

export type FeeStatus = 'Paid' | 'Partially Paid' | 'Outstanding';

export type BookAvailability = 'Available' | 'Low stock' | 'Unavailable';

export type LoanViewStatus = 'Borrowed' | 'Returned' | 'Overdue';

export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export type PaymentMethod = 'Cash' | 'Bank deposit' | 'Mobile money';

export type ReportCategory = 'student' | 'attendance' | 'examination' | 'fees' | 'teacher' | 'library';

export type TermName = 'First Term' | 'Second Term' | 'Third Term';

export type AssessmentKind = 'assignment' | 'class-test' | 'continuous' | 'mid-term' | 'final';

export type CalculationMethod = 'simple' | 'weighted';

export interface GradeBand {
  grade: string;
  min: number;
  label: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  className: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  contact: string;
  address: string;
  admissionDate: string;
  status: StudentStatus;
  placeOfBirth?: string;
  previousSchool?: string;
  photo?: string;
}

export interface Teacher {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  subjects: string[];
  classes: string[];
  phone: string;
  email: string;
  qualification: string;
  status: 'Active' | 'On leave';
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  className: string;
  date: string;
  status: AttendanceStatus;
}

export interface Score {
  id: string;
  studentId: string;
  examId: string;
  subject: string;
  value: number;
}

export interface AssessmentCategory {
  id: string;
  name: string;
  kind: AssessmentKind;
  maxMarks: number;
  weight: number;
  required: boolean;
}

export interface AssessmentMark {
  id: string;
  studentId: string;
  academicYear: string;
  term: TermName;
  className: string;
  subject: string;
  categoryId: string;
  score: number;
  teacherId: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  academicYear: string;
}

export interface FeeAccount {
  id: string;
  studentId: string;
  academicYear: string;
  term: string;
  description: string;
  expected: number;
  paid: number;
}

export interface Payment {
  id: string;
  studentId: string;
  feeAccountId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
  recordedBy: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  available: number;
}

export interface Loan {
  id: string;
  studentId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
}

export interface TimetableSlot {
  id: string;
  className: string;
  day: DayName;
  start: string;
  end: string;
  subject: string;
  teacherId: string;
  room: string;
}

export interface Period {
  id: string;
  start: string;
  end: string;
}

export interface SchoolClass {
  name: string;
  level: 'Junior Secondary' | 'Senior Secondary';
  formTeacherId: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: 'exam' | 'fee' | 'attendance' | 'library' | 'student';
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  roleLabel: string;
  teacherId?: string;
  studentId?: string;
  authUserId?: string;
  active: boolean;
}

export interface SchoolSettings {
  name: string;
  shortName: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  academicYear: string;
  currentTerm: string;
  currency: string;
  principal: string;
  grades: GradeBand[];
  calculationMethod: CalculationMethod;
  passMark: number;
  assessments: AssessmentCategory[];
  logo?: string;
  campusImage?: string;
  colours?: SchoolColours;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  teacherId?: string;
  studentId?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

export interface DemoData {
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  marks: AssessmentMark[];
  fees: FeeAccount[];
  payments: Payment[];
  books: Book[];
  loans: Loan[];
  timetable: TimetableSlot[];
  notifications: AppNotification[];
  users: DemoUser[];
  settings: SchoolSettings;
}

export interface AppState extends DemoData {
  session: Session | null;
  toasts: ToastMessage[];
}

export interface SearchHit {
  id: string;
  kind: 'Student' | 'Teacher' | 'Class' | 'Subject' | 'Book' | 'Report';
  title: string;
  meta: string;
  to: string;
}
