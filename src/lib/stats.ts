import { OFFSETS } from '../data/seed';
import type {
  AttendanceRecord,
  Book,
  BookAvailability,
  FeeAccount,
  FeeStatus,
  Loan,
  LoanViewStatus,
  Student,
  Teacher,
} from '../types';

export function schoolFigures(students: Student[], teachers: Teacher[], fees: FeeAccount[]) {
  const collected = OFFSETS.collected + fees.reduce((sum, fee) => sum + fee.paid, 0);
  const outstanding =
    OFFSETS.outstanding + fees.reduce((sum, fee) => sum + Math.max(0, fee.expected - fee.paid), 0);
  const expected = OFFSETS.expected + fees.reduce((sum, fee) => sum + fee.expected, 0);
  const paidStudents =
    OFFSETS.paidStudents + fees.filter((fee) => fee.expected > 0 && fee.paid >= fee.expected).length;
  return {
    students: OFFSETS.students + students.length,
    teachers: OFFSETS.teachers + teachers.length,
    collected,
    outstanding,
    expected,
    paidStudents,
  };
}

export function feeStatus(expected: number, paid: number): FeeStatus {
  if (paid <= 0) return 'Outstanding';
  if (paid + 0.001 < expected) return 'Partially Paid';
  return 'Paid';
}

export function balanceOf(expected: number, paid: number): number {
  return Math.max(0, expected - paid);
}

export function attendanceRate(records: AttendanceRecord[]): number | null {
  if (records.length === 0) return null;
  const attended = records.filter((record) => record.status === 'Present').length;
  return (attended / records.length) * 100;
}

export function attendanceCounts(records: AttendanceRecord[]) {
  return {
    present: records.filter((record) => record.status === 'Present').length,
    absent: records.filter((record) => record.status === 'Absent').length,
    sick: records.filter((record) => record.status === 'Sick').length,
    total: records.length,
  };
}

export function bookAvailability(book: Book): BookAvailability {
  if (book.available <= 0) return 'Unavailable';
  if (book.available <= 5) return 'Low stock';
  return 'Available';
}

export function loanViewStatus(loan: Loan, today: string): LoanViewStatus {
  if (loan.returnDate) return 'Returned';
  if (loan.dueDate < today) return 'Overdue';
  return 'Borrowed';
}

export function genderCounts(students: Student[]) {
  return {
    male: students.filter((student) => student.gender === 'Male').length,
    female: students.filter((student) => student.gender === 'Female').length,
  };
}
