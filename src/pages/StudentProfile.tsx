import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Restricted } from '../components/Restricted';
import { TimetableView } from '../components/TimetableView';
import { Avatar, Button, ConfirmDialog, EmptyState, PageHeader, Progress, StatusBadge, Tabs } from '../components/ui';
import { TERMS, subjectsForClass } from '../data/school';
import { termReport } from '../lib/assessments';
import { canViewStudent } from '../lib/access';
import { formatDate, formatMoney, formatPercent, fullName, ordinal, todayISO } from '../lib/format';
import { can } from '../lib/permissions';
import { attendanceCounts, attendanceRate, balanceOf, feeStatus, loanViewStatus } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';

type TabId = 'personal' | 'guardian' | 'attendance' | 'academic' | 'fees' | 'timetable' | 'library';

export function StudentProfilePage() {
  const { studentId = '' } = useParams();
  const { state, session, deleteStudent } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('personal');
  const [removing, setRemoving] = useState(false);
  const student = state.students.find((item) => item.id === studentId);
  const allowed = Boolean(session && student && canViewStudent(session.role, session.studentId, session.teacherId, student.id, state.students, state.teachers));
  usePageTitle(allowed && student ? fullName(student) : 'Student');

  if (!session) return null;
  if (!student) {
    return (
      <div className="page">
        <EmptyState title="Student not found" text="That record is not in the demonstration register." action={<Link className="btn btn-primary" to="/students">Back to students</Link>} />
      </div>
    );
  }
  if (!canViewStudent(session.role, session.studentId, session.teacherId, student.id, state.students, state.teachers)) {
    return <Restricted text="This student is outside the classes or family link for the current role." />;
  }

  const admit = can(session.role, 'registerStudents');
  const parentAccount = state.users.find((user) => user.role === 'parent' && user.studentId === student.id);
  const studentAccount = state.users.find((user) => user.role === 'student' && user.studentId === student.id);
  const records = state.attendance.filter((item) => item.studentId === student.id);
  const counts = attendanceCounts(records);
  const rate = attendanceRate(records);
  const classmates = state.students.filter((item) => item.className === student.className).map((item) => item.id);
  const subjects = subjectsForClass(student.className);
  const termResults = TERMS.map((term) => ({
    term,
    result: termReport(student.id, classmates, state.marks, state.settings.academicYear, term, subjects, state.settings),
  }));
  const accounts = state.fees.filter((item) => item.studentId === student.id);
  const payments = state.payments.filter((item) => item.studentId === student.id);
  const loans = state.loans.filter((item) => item.studentId === student.id);
  const slots = state.timetable.filter((slot) => slot.className === student.className);
  const today = todayISO();

  return (
    <div className="page">
      <PageHeader
        title={fullName(student)}
        subtitle={`${student.id} · ${student.className}`}
        actions={
          <div className="cluster">
            {admit ? <Link className="btn btn-secondary" to={`/register?edit=${student.id}`}>Update admission</Link> : null}
            {admit ? <Button variant="danger" onClick={() => setRemoving(true)}>Remove student</Button> : null}
            <Link className="btn btn-primary" to={`/report-card/${student.id}?year=${encodeURIComponent(state.settings.academicYear)}`}>Report card</Link>
          </div>
        }
      />
      <section className="card hero">
        <Avatar name={fullName(student)} photo={student.photo} size={72} />
        <div>
          <h2>{fullName(student)}</h2>
          <div className="cluster" style={{ marginTop: 6 }}>
            <StatusBadge status={student.status} />
            <span className="small">{student.gender}</span>
            <span className="small">Admitted {formatDate(student.admissionDate)}</span>
          </div>
        </div>
      </section>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'personal', label: 'Personal' },
          { id: 'guardian', label: 'Guardian' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'academic', label: 'Academic' },
          { id: 'fees', label: 'Fees' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'library', label: 'Library' },
        ]}
      />
      <div className="card" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'personal' ? (
          <dl className="kv">
            <div><dt>Student ID</dt><dd>{student.id}</dd></div>
            <div><dt>Class</dt><dd>{student.className}</dd></div>
            <div><dt>Gender</dt><dd>{student.gender}</dd></div>
            <div><dt>Date of birth</dt><dd>{formatDate(student.dateOfBirth)}</dd></div>
            <div><dt>Place of birth</dt><dd>{student.placeOfBirth || '—'}</dd></div>
            <div><dt>Previous school</dt><dd>{student.previousSchool || '—'}</dd></div>
            <div><dt>Admission date</dt><dd>{formatDate(student.admissionDate)}</dd></div>
            <div><dt>Status</dt><dd>{student.status}</dd></div>
            <div><dt>Student sign-in</dt><dd>{studentAccount?.email ?? '—'}</dd></div>
            <div className="span-2"><dt>Address</dt><dd>{student.address}</dd></div>
          </dl>
        ) : null}
        {tab === 'guardian' ? (
          <dl className="kv">
            <div><dt>Name</dt><dd>{student.guardianName}</dd></div>
            <div><dt>Relationship</dt><dd>{student.guardianRelation}</dd></div>
            <div><dt>Phone</dt><dd>{student.guardianPhone}</dd></div>
            <div><dt>Student contact</dt><dd>{student.contact}</dd></div>
            <div><dt>Parent sign-in</dt><dd>{parentAccount ? parentAccount.email : 'Not linked'}</dd></div>
          </dl>
        ) : null}
        {tab === 'attendance' ? (
          <div className="stack">
            <Progress value={rate ?? 0} label="Term attendance" />
            <p className="small">Present {counts.present} · Absent {counts.absent} · Sick {counts.sick}. Only Present counts as attending.</p>
            {can(session.role, 'recordAttendance') ? <Link className="link" to={`/attendance?class=${encodeURIComponent(student.className)}`}>Record class attendance</Link> : null}
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Recent attendance</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {[...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((record) => (
                    <tr key={record.id}><td>{formatDate(record.date)}</td><td><StatusBadge status={record.status} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {tab === 'academic' ? (
          <div className="stack">
            {termResults.map(({ term, result }) => (
              <section key={term} className="stack">
                <h3>{term}</h3>
                <div className="summary-row">
                  <span>Final percentage <strong>{formatPercent(result.percentage)}</strong></span>
                  <span>Grade <strong>{result.band ? `${result.band.grade} · ${result.band.label}` : '—'}</strong></span>
                  <span>Position <strong>{result.position ? `${ordinal(result.position)} of ${result.classSize}` : 'Not ready'}</strong></span>
                  <StatusBadge status={result.status} />
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <caption className="sr-only">{term} subject results</caption>
                    <thead><tr><th scope="col">Subject</th><th scope="col">Final %</th><th scope="col">Grade</th><th scope="col">Status</th><th scope="col">Missing</th></tr></thead>
                    <tbody>
                      {result.subjects.map((row) => (
                        <tr key={row.subject}>
                          <td>{row.subject}</td>
                          <td className="num">{formatPercent(row.percentage)}</td>
                          <td>{row.band ? row.band.grade : '—'}</td>
                          <td><StatusBadge status={row.status} /></td>
                          <td>{row.missing.length ? row.missing.join(', ') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {can(session.role, 'enterScores') ? <Link className="link" to={`/examinations?class=${encodeURIComponent(student.className)}&term=${encodeURIComponent(term)}&year=${encodeURIComponent(state.settings.academicYear)}`}>Enter {term} marks</Link> : null}
              </section>
            ))}
          </div>
        ) : null}
        {tab === 'fees' ? (
          <div className="stack">
            {accounts.length === 0 ? <p className="muted">No fee account is open for this student.</p> : null}
            {accounts.map((account) => (
              <div key={account.id} className="stack">
                <p><strong>{account.description}</strong></p>
                <div className="summary-row">
                  <span>Expected <strong>{formatMoney(account.expected)}</strong></span>
                  <span>Paid <strong>{formatMoney(account.paid)}</strong></span>
                  <span>
                    Payments
                    <ol className="pay-lines">
                      {payments.filter((payment) => payment.feeAccountId === account.id).sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id)).map((payment) => (
                        <li key={payment.id}>{formatDate(payment.date)} · {formatMoney(payment.amount)}</li>
                      ))}
                    </ol>
                    {payments.some((payment) => payment.feeAccountId === account.id) ? null : <strong>—</strong>}
                  </span>
                  <span>Balance <strong>{formatMoney(balanceOf(account.expected, account.paid))}</strong></span>
                  <StatusBadge status={feeStatus(account.expected, account.paid)} />
                </div>
              </div>
            ))}
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Payment history</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Reference</th></tr></thead>
                <tbody>
                  {payments.length === 0 ? <tr><td colSpan={4}>No payment has been recorded.</td></tr> : null}
                  {[...payments].sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id)).map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.date)}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>{payment.method}</td>
                      <td>{payment.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {tab === 'timetable' ? <TimetableView slots={slots} teachers={state.teachers} day="all" /> : null}
        {tab === 'library' ? (
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Library history</caption>
              <thead><tr><th scope="col">Book</th><th scope="col">Borrowed</th><th scope="col">Due</th><th scope="col">Returned</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {loans.length === 0 ? <tr><td colSpan={5}>No borrowing history yet.</td></tr> : null}
                {loans.map((loan) => {
                  const book = state.books.find((item) => item.id === loan.bookId);
                  return (
                    <tr key={loan.id}>
                      <td>{book?.title ?? loan.bookId}</td>
                      <td>{formatDate(loan.borrowDate)}</td>
                      <td>{formatDate(loan.dueDate)}</td>
                      <td>{loan.returnDate ? formatDate(loan.returnDate) : '—'}</td>
                      <td><StatusBadge status={loanViewStatus(loan, today)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={removing}
        title="Remove student"
        message={`Remove ${fullName(student)} from the register? The student sign-in and fee account go with the record. A linked parent sign-in stays.`}
        confirmLabel="Remove"
        danger
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          deleteStudent(student.id);
          navigate('/students');
        }}
      />
    </div>
  );
}
