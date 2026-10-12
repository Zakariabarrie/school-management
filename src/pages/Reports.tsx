import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, EmptyState, LoadingState, PageHeader, SelectInput } from '../components/ui';
import { CLASSES, TERMS, subjectsForClass } from '../data/school';
import { termReport } from '../lib/assessments';
import { visibleStudents } from '../lib/access';
import { formatDate, formatMoney, formatMonth, formatPercent, fullName, ordinal, todayISO, withTitle } from '../lib/format';
import { reportCategoriesFor } from '../lib/permissions';
import { attendanceCounts, attendanceRate, balanceOf, bookAvailability, feeStatus, genderCounts, loanViewStatus } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { Payment, ReportCategory, Student } from '../types';

const LABELS: Record<ReportCategory, string> = {
  student: 'Student report',
  attendance: 'Attendance report',
  examination: 'Examination report',
  fees: 'Fees report',
  teacher: 'Teacher report',
  library: 'Library report',
};

export function ReportsPage() {
  const { state, session, settings } = useApp();
  const [params] = useSearchParams();
  usePageTitle('Reports');
  const allowed = session ? reportCategoriesFor(session.role) : [];
  const requested = params.get('category');
  const [category, setCategory] = useState<ReportCategory>(allowed.includes(requested as ReportCategory) ? (requested as ReportCategory) : allowed[0] ?? 'student');
  const [className, setClassName] = useState('all');
  const [term, setTerm] = useState(settings.currentTerm);
  const [year, setYear] = useState(settings.academicYear);
  const [month, setMonth] = useState('2026-09');
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [stamp, setStamp] = useState({ category, className, term, year, month });

  if (!session) return null;

  function generate() {
    setPreparing(true);
    window.setTimeout(() => {
      setStamp({ category, className, term, year, month });
      setPreparing(false);
      setReady(true);
    }, 280);
  }

  const students = visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers).filter((student) =>
    stamp.className === 'all' ? true : student.className === stamp.className,
  );
  const yearOk = stamp.year === settings.academicYear;
  const termOk = TERMS.includes(stamp.term as (typeof TERMS)[number]);
  const classLabel = stamp.className === 'all' ? 'All classes' : stamp.className;
  const period = stamp.category === 'attendance'
    ? formatMonth(stamp.month)
    : stamp.category === 'examination'
      ? 'First Term, Second Term and Third Term'
      : stamp.category === 'fees'
        ? stamp.term
        : stamp.year;

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        subtitle="Choose a report, set the filters, then generate a preview. Printing uses this browser."
        actions={ready ? <Button className="no-print" variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print preview</Button> : undefined}
      />
      <div className="filters no-print">
        <SelectInput aria-label="Report" value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)}>
          {allowed.map((item) => <option key={item} value={item}>{LABELS[item]}</option>)}
        </SelectInput>
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          <option value="all">All classes</option>
          {CLASSES.map((item) => <option key={item.name}>{item.name}</option>)}
        </SelectInput>
        {category === 'fees' || category === 'examination' ? (
          <SelectInput aria-label="Academic year" value={year} onChange={(event) => setYear(event.target.value)}>
            <option>{settings.academicYear}</option>
            <option>2025/2026</option>
          </SelectInput>
        ) : null}
        {category === 'fees' ? (
          <SelectInput aria-label="Term" value={term} onChange={(event) => setTerm(event.target.value)}>
            {TERMS.map((item) => <option key={item}>{item}</option>)}
          </SelectInput>
        ) : null}
        {category === 'attendance' ? (
          <label className="field">
            <span className="sr-only">Month</span>
            <input className="input" type="month" aria-label="Month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
        ) : null}
        <Button onClick={generate}>Generate report</Button>
      </div>
      {preparing ? <LoadingState label="Preparing the report" /> : null}
      {!preparing && !ready ? <EmptyState title="No preview yet" text="Choose the report and filters, then generate a preview." /> : null}
      {!preparing && ready ? (
        <article className="card report-preview">
          <header className="report-head">
            <div className="report-brand-row">
              <Logo size={48} />
              <div>
                <p className="small">{settings.name} · {settings.address}</p>
                <h2>{LABELS[stamp.category]}</h2>
                <p className="small">{classLabel} · {period} · Generated {formatDate(todayISO())}</p>
              </div>
            </div>
          </header>
          {!yearOk && (stamp.category === 'examination' || stamp.category === 'fees') ? (
            <EmptyState title="No records for that year" text="This demonstration holds 2026/2027." />
          ) : stamp.category === 'fees' && !termOk ? (
            <EmptyState title="No records for that term" text="Choose First Term, Second Term, or Third Term." />
          ) : stamp.category === 'student' ? (
            <StudentReport students={students} />
          ) : stamp.category === 'attendance' ? (
            <AttendanceReport students={students} month={stamp.month} />
          ) : stamp.category === 'examination' ? (
            <ExaminationReport students={students} year={stamp.year} />
          ) : stamp.category === 'fees' ? (
            <FeesReport students={students} term={stamp.term} />
          ) : stamp.category === 'teacher' ? (
            <TeacherReport className={stamp.className} />
          ) : (
            <LibraryReport className={stamp.className} />
          )}
        </article>
      ) : null}
    </div>
  );
}

function StudentReport({ students }: { students: Student[] }) {
  const gender = genderCounts(students);
  const active = students.filter((student) => student.status === 'Active').length;
  return (
    <>
      <div className="summary-row">
        <span>Students <strong>{students.length}</strong></span>
        <span>Active <strong>{active}</strong></span>
        <span>Female <strong>{gender.female}</strong></span>
        <span>Male <strong>{gender.male}</strong></span>
      </div>
      <table className="data">
        <caption className="sr-only">Student report</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Gender</th><th>Class</th><th>Guardian</th><th>Phone</th><th>Status</th></tr></thead>
        <tbody>
          {students.length === 0 ? <tr><td colSpan={7}>No students match this class.</td></tr> : null}
          {students.map((student) => (
            <tr key={student.id}>
              <td>{student.id}</td>
              <td>{fullName(student)}</td>
              <td>{student.gender}</td>
              <td>{student.className}</td>
              <td>{student.guardianName}</td>
              <td>{student.guardianPhone}</td>
              <td>{student.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function AttendanceReport({ students, month }: { students: Student[]; month: string }) {
  const { state } = useApp();
  const rows = students.map((student) => {
    const records = state.attendance.filter((record) => record.studentId === student.id && record.date.startsWith(month));
    return { student, records, counts: attendanceCounts(records) };
  });
  const present = rows.reduce((sum, row) => sum + row.counts.present, 0);
  const absent = rows.reduce((sum, row) => sum + row.counts.absent, 0);
  const sick = rows.reduce((sum, row) => sum + row.counts.sick, 0);
  const marked = present + absent + sick;
  return (
    <>
      <div className="summary-row">
        <span>Present <strong>{present}</strong></span>
        <span>Absent <strong>{absent}</strong></span>
        <span>Sick <strong>{sick}</strong></span>
        <span>Attendance <strong>{formatPercent(marked === 0 ? null : (present / marked) * 100)}</strong></span>
      </div>
      <table className="data">
        <caption className="sr-only">Attendance report</caption>
        <thead><tr><th>Student</th><th>Class</th><th>Present</th><th>Absent</th><th>Sick</th><th>Days</th><th>Percentage</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={7}>No students match this class.</td></tr> : null}
          {rows.map(({ student, records, counts }) => (
            <tr key={student.id}>
              <td>{fullName(student)}</td>
              <td>{student.className}</td>
              <td>{counts.present}</td>
              <td>{counts.absent}</td>
              <td>{counts.sick}</td>
              <td>{counts.total}</td>
              <td>{formatPercent(attendanceRate(records))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small report-note">Only Present counts as attending. Sick is recorded and is not counted as present.</p>
    </>
  );
}

function ExaminationReport({ students, year }: { students: Student[]; year: string }) {
  const { state, settings } = useApp();
  return (
    <>
      <table className="data">
        <caption className="sr-only">Examination report for First, Second and Third Term</caption>
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            {TERMS.map((term) => <th key={term}>{term}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? <tr><td colSpan={5}>No students match this class.</td></tr> : null}
          {students.map((student) => {
            const classmates = state.students.filter((item) => item.className === student.className).map((item) => item.id);
            return (
              <tr key={student.id}>
                <td>{fullName(student)}</td>
                <td>{student.className}</td>
                {TERMS.map((term) => {
                  const result = termReport(student.id, classmates, state.marks, year, term, subjectsForClass(student.className), settings);
                  return (
                    <td key={term}>
                      {result.percentage == null ? result.status : formatPercent(result.percentage)}
                      {result.band ? ` · ${result.band.grade}` : ''}
                      {result.position ? ` · ${ordinal(result.position)}` : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small report-note">A term shows a percentage, grade, and position only when the required marks are complete. A missing term is not treated as zero.</p>
    </>
  );
}

function FeesReport({ students, term }: { students: Student[]; term: string }) {
  const { state } = useApp();
  const accounts = students.map((student) => ({
    student,
    fee: state.fees.find((item) => item.studentId === student.id && item.term === term),
  }));
  const withFee = accounts.filter((row) => row.fee);
  const expected = withFee.reduce((sum, row) => sum + (row.fee?.expected ?? 0), 0);
  const paid = withFee.reduce((sum, row) => sum + (row.fee?.paid ?? 0), 0);
  const payments = state.payments
    .filter((payment) => withFee.some((row) => row.fee?.id === payment.feeAccountId))
    .sort((left, right) => left.date.localeCompare(right.date) || left.studentId.localeCompare(right.studentId));
  return (
    <>
      <div className="summary-row">
        <span>Expected <strong>{formatMoney(expected)}</strong></span>
        <span>Paid <strong>{formatMoney(paid)}</strong></span>
        <span>Balance <strong>{formatMoney(balanceOf(expected, paid))}</strong></span>
        <span>Payments <strong>{payments.length}</strong></span>
      </div>
      <table className="data">
        <caption className="sr-only">Fees report</caption>
        <thead><tr><th>Student</th><th>Class</th><th>Expected</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody>
          {accounts.length === 0 ? <tr><td colSpan={6}>No students match this class.</td></tr> : null}
          {accounts.map(({ student, fee }) => (
            <tr key={student.id}>
              <td>{fullName(student)}</td>
              <td>{student.className}</td>
              {fee ? (
                <>
                  <td>{formatMoney(fee.expected)}</td>
                  <td>{formatMoney(fee.paid)}</td>
                  <td>{formatMoney(balanceOf(fee.expected, fee.paid))}</td>
                  <td>{feeStatus(fee.expected, fee.paid)}</td>
                </>
              ) : <td colSpan={4}>No account for this term</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="report-note">Payments, one by one</h3>
      <PaymentRegister payments={payments} students={students} />
    </>
  );
}

function PaymentRegister({ payments, students }: { payments: Payment[]; students: Student[] }) {
  return (
    <table className="data">
      <caption className="sr-only">Each payment</caption>
      <thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
      <tbody>
        {payments.length === 0 ? <tr><td colSpan={6}>No payment has been recorded for this report.</td></tr> : null}
        {payments.map((payment) => {
          const student = students.find((item) => item.id === payment.studentId);
          return (
            <tr key={payment.id}>
              <td>{formatDate(payment.date)}</td>
              <td>{student ? fullName(student) : payment.studentId}</td>
              <td>{student?.className ?? '—'}</td>
              <td>{formatMoney(payment.amount)}</td>
              <td>{payment.method}</td>
              <td>{payment.reference}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TeacherReport({ className }: { className: string }) {
  const { state } = useApp();
  const teachers = state.teachers.filter((teacher) => className === 'all' || teacher.classes.includes(className));
  return (
    <>
      <div className="summary-row">
        <span>Teachers <strong>{teachers.length}</strong></span>
        <span>Active <strong>{teachers.filter((teacher) => teacher.status === 'Active').length}</strong></span>
        <span>On leave <strong>{teachers.filter((teacher) => teacher.status === 'On leave').length}</strong></span>
      </div>
      <table className="data">
        <caption className="sr-only">Teacher report</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Subjects</th><th>Classes</th><th>Lessons</th><th>Phone</th><th>Status</th></tr></thead>
        <tbody>
          {teachers.length === 0 ? <tr><td colSpan={7}>No teacher is allocated to this class.</td></tr> : null}
          {teachers.map((teacher) => (
            <tr key={teacher.id}>
              <td>{teacher.id}</td>
              <td>{withTitle(teacher)}</td>
              <td>{teacher.subjects.join(', ')}</td>
              <td>{teacher.classes.join(', ')}</td>
              <td>{state.timetable.filter((slot) => slot.teacherId === teacher.id).length}</td>
              <td>{teacher.phone}</td>
              <td>{teacher.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function LibraryReport({ className }: { className: string }) {
  const { state } = useApp();
  const today = todayISO();
  const copies = state.books.reduce((sum, book) => sum + book.quantity, 0);
  const available = state.books.reduce((sum, book) => sum + book.available, 0);
  const loans = state.loans.filter((loan) => {
    const student = state.students.find((item) => item.id === loan.studentId);
    return className === 'all' || student?.className === className;
  });
  const overdue = loans.filter((loan) => loanViewStatus(loan, today) === 'Overdue').length;
  return (
    <div className="stack">
      <div className="summary-row">
        <span>Titles <strong>{state.books.length}</strong></span>
        <span>Copies <strong>{copies}</strong></span>
        <span>Available <strong>{available}</strong></span>
        <span>Overdue <strong>{overdue}</strong></span>
      </div>
      <table className="data">
        <caption className="sr-only">Library stock</caption>
        <thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Category</th><th>Quantity</th><th>Available</th><th>Status</th></tr></thead>
        <tbody>
          {state.books.map((book) => (
            <tr key={book.id}>
              <td>{book.id}</td>
              <td>{book.title}</td>
              <td>{book.author}</td>
              <td>{book.category}</td>
              <td>{book.quantity}</td>
              <td>{book.available}</td>
              <td>{bookAvailability(book)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Borrowing records</h3>
      <table className="data">
        <caption className="sr-only">Borrowing records</caption>
        <thead><tr><th>Student</th><th>Class</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th></tr></thead>
        <tbody>
          {loans.length === 0 ? <tr><td colSpan={7}>No borrowing records match this class.</td></tr> : null}
          {loans.map((loan) => {
            const student = state.students.find((item) => item.id === loan.studentId);
            return (
              <tr key={loan.id}>
                <td>{student ? fullName(student) : loan.studentId}</td>
                <td>{student?.className ?? '—'}</td>
                <td>{state.books.find((book) => book.id === loan.bookId)?.title ?? loan.bookId}</td>
                <td>{formatDate(loan.borrowDate)}</td>
                <td>{formatDate(loan.dueDate)}</td>
                <td>{loan.returnDate ? formatDate(loan.returnDate) : '—'}</td>
                <td>{loanViewStatus(loan, today)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
