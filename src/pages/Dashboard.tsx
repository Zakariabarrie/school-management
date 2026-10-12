import {
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Library,
  Presentation,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AttendanceChart, FeeChart, GenderChart, SubjectChart } from '../components/Charts';
import { Avatar, EmptyState, PageHeader, StatCard, StatusBadge } from '../components/ui';
import { ATTENDANCE_TREND, CORE_SUBJECTS, SHOWCASE } from '../data/school';
import { classSubjectSummary, termReport } from '../lib/assessments';
import { visibleStudents } from '../lib/access';
import { cx, formatDate, formatMoney, formatNumber, formatPercent, formatWhen, fullName, shortSubject, todayISO, weekdayName } from '../lib/format';
import { attendanceCounts, attendanceRate, balanceOf, bookAvailability, feeStatus, genderCounts, loanViewStatus, schoolFigures } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';

const STEPS = [
  { n: '01', label: 'Open the register', to: '/register' },
  { n: '02', label: 'Open Isata Alpha Bah', to: `/students/${SHOWCASE.studentId}` },
  { n: '03', label: 'View the JSS 3 register', to: `/attendance?class=${encodeURIComponent(SHOWCASE.className)}` },
  { n: '04', label: 'View a Mathematics result', to: `/examinations?class=${encodeURIComponent(SHOWCASE.className)}&year=${encodeURIComponent(SHOWCASE.year)}&term=${encodeURIComponent(SHOWCASE.term)}&subject=${encodeURIComponent(SHOWCASE.subject)}` },
  { n: '05', label: 'Open the report card', to: `/report-card/${SHOWCASE.studentId}` },
  { n: '06', label: 'Review fees', to: '/fees' },
  { n: '07', label: 'View the timetable', to: `/timetable?class=${encodeURIComponent(SHOWCASE.className)}` },
  { n: '08', label: 'Open the library', to: '/library' },
  { n: '09', label: 'Generate a report', to: '/reports' },
];

function CampusBanner() {
  const { settings } = useApp();
  if (!settings.campusImage) return null;
  return (
    <figure className="campus-banner">
      <img src={settings.campusImage} alt="" />
      <figcaption>
        <strong>{settings.shortName}</strong>
        <span>{settings.motto}</span>
      </figcaption>
    </figure>
  );
}

export function DashboardPage() {
  const { session } = useApp();
  usePageTitle('Dashboard');
  if (!session) return null;
  if (session.role === 'administrator') return <AdminDashboard />;
  if (session.role === 'teacher') return <TeacherDashboard />;
  if (session.role === 'libraryManager') return <LibraryDashboard />;
  if (session.role === 'registrar') return <RegistrarDashboard />;
  if (session.role === 'register') return <RegisterDashboard />;
  return <FamilyDashboard />;
}

function AdminDashboard() {
  const { state, session, settings } = useApp();
  const figures = schoolFigures(state.students, state.teachers, state.fees);
  const septemberRecords = state.attendance.filter((record) => record.date.startsWith('2026-09'));
  const rate = attendanceRate(septemberRecords);
  const septemberCounts = attendanceCounts(septemberRecords);
  const gender = genderCounts(state.students);
  const core = CORE_SUBJECTS.map((subject) => classSubjectSummary(state.students.map((student) => student.id), state.marks, settings.academicYear, SHOWCASE.term, subject, settings));
  const ready = core.flatMap((item) => (item.average == null ? [] : [item.average]));
  const average = ready.length ? ready.reduce((sum, value) => sum + value, 0) / ready.length : null;
  const subjects = CORE_SUBJECTS.map((subject, index) => ({ subject, average: core[index].average ?? 0 })).filter((_, index) => core[index].average != null);
  const trend = [...ATTENDANCE_TREND, { month: 'Sep', rate: rate ?? 0 }];
  const recent = [...state.students].sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)).slice(0, 5);

  const greeting = session?.name.split(' ')[0] || settings.shortName;

  return (
    <div className="page dash">
      <header
        className={cx('dash-welcome', Boolean(settings.campusImage) && 'has-photo')}
        style={settings.campusImage ? { backgroundImage: `linear-gradient(100deg, rgba(28, 49, 68, 0.94) 0%, rgba(28, 49, 68, 0.82) 46%, rgba(28, 49, 68, 0.45) 100%), url(${settings.campusImage})` } : undefined}
      >
        <div>
          <p className="dash-kicker">{settings.currentTerm} · {settings.academicYear}</p>
          <h1>Good day, {greeting}</h1>
          <p className="dash-school">{settings.name}</p>
          <p className="motto">{settings.motto}</p>
        </div>
        <dl className="dash-facts">
          <div><dt>Principal</dt><dd>{settings.principal}</dd></div>
          <div><dt>Office</dt><dd>{settings.address}</dd></div>
          <div><dt>Telephone</dt><dd>{settings.phone}</dd></div>
        </dl>
      </header>
      <section className="stat-board" aria-label="School summary">
        <StatCard tone="blue" icon={<GraduationCap size={18} />} label="Total students" value={formatNumber(figures.students)} hint={`${state.students.filter((student) => student.status === 'Active').length} active on the register`} />
        <StatCard tone="teal" icon={<Presentation size={18} />} label="Teachers" value={formatNumber(figures.teachers)} hint="ScienceWorld teaching staff" />
        <StatCard tone="green" icon={<CalendarCheck size={18} />} label="September attendance" value={formatPercent(rate)} hint={septemberCounts.total ? `${septemberCounts.present} present · ${septemberCounts.absent} absent · ${septemberCounts.sick} sick` : 'No register yet'} />
        <StatCard tone="teal" icon={<Wallet size={18} />} label="Fee collection" value={formatMoney(figures.collected)} hint="First Term · demonstration register" />
        <StatCard tone="amber" icon={<TriangleAlert size={18} />} label="Outstanding fees" value={formatMoney(figures.outstanding)} hint="Still to be collected this term" />
        <StatCard tone="blue" icon={<ClipboardList size={18} />} label="Examination average" value={formatPercent(average)} hint={`First Term · ${ready.length} core subjects`} />
      </section>
      <section className="card dash-block">
        <div className="dash-card-head">
          <h2>Exhibition path</h2>
          <p className="small">Walk a visitor from registration through to a report.</p>
        </div>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <Link to={step.to} aria-label={`Step ${Number(step.n)}, ${step.label}`}>
                <span aria-hidden="true">{step.n}</span>
                <strong>{step.label}</strong>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="chart-grid">
        <article className="card chart-card">
          <h2>Student statistics</h2>
          <p className="small">{gender.female} female · {gender.male} male in the demonstration register.</p>
          <GenderChart male={gender.male} female={gender.female} />
        </article>
        <article className="card chart-card">
          <h2>Attendance overview</h2>
          <p className="small">September 2026 register for all demonstration students.</p>
          <AttendanceChart labels={trend.map((item) => item.month)} values={trend.map((item) => item.rate)} />
        </article>
        <article className="card chart-card">
          <h2>Examination performance</h2>
          <p className="small">Average mark by core subject, First Term.</p>
          <SubjectChart labels={subjects.map((item) => shortSubject(item.subject))} values={subjects.map((item) => item.average)} />
        </article>
        <article className="card chart-card">
          <h2>Fee collection</h2>
          <p className="small">Paid and outstanding across the school position.</p>
          <FeeChart paid={figures.collected} outstanding={figures.outstanding} />
        </article>
      </section>
      <section className="split dash-block">
        <article className="card">
          <div className="dash-card-head">
            <h2>Recent admissions</h2>
            <Link className="link" to="/students">All students</Link>
          </div>
          <div className="roster">
            {recent.map((student) => (
              <Link key={student.id} className="roster-row" to={`/students/${student.id}`}>
                <span className="person">
                  <Avatar name={fullName(student)} photo={student.photo} size={38} />
                  <span>
                    <strong>{fullName(student)}</strong>
                    <span className="small">{student.className}</span>
                  </span>
                </span>
                <span className="small">{formatDate(student.admissionDate)}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="card">
          <div className="dash-card-head">
            <h2>Notices</h2>
          </div>
          <div className="notice-list">
            {state.notifications.slice(0, 4).map((item) => (
              <article key={item.id} className={cx('notice-row', !item.read && 'is-unread')}>
                <div className="notice-top">
                  <strong>{item.title}</strong>
                  <span className="small">{formatWhen(item.time)}</span>
                </div>
                <p className="small">{item.message}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function TeacherDashboard() {
  const { state, session, settings } = useApp();
  if (!session) return null;
  const teacher = state.teachers.find((item) => item.id === session.teacherId);
  const students = visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers);
  const classes = teacher?.classes ?? [];
  const subjects = teacher?.subjects ?? [];
  const subject = subjects[0] ?? 'Mathematics';
  const today = todayISO();
  const registerDate = state.attendance.some((record) => record.date === today) ? today : '2026-09-29';
  const usingToday = registerDate === today;
  const day = weekdayName(registerDate);
  const register = state.attendance.filter((record) => record.date === registerDate && students.some((student) => student.id === record.studentId));
  const rate = attendanceRate(register);
  const counts = attendanceCounts(register);
  const away = register.filter((record) => record.status !== 'Present').flatMap((record) => {
    const student = students.find((item) => item.id === record.studentId);
    return student ? [{ student, status: record.status }] : [];
  });
  const summary = classSubjectSummary(students.map((item) => item.id), state.marks, settings.academicYear, SHOWCASE.term, subject, settings);
  const lessons = state.timetable.filter((slot) => slot.teacherId === session.teacherId && slot.day === day).sort((a, b) => a.start.localeCompare(b.start));
  const greeting = teacher?.firstName ?? session.name.split(' ')[0];
  const classLine = classes.length ? classes.join(' · ') : 'No class assigned';

  return (
    <div className="page dash">
      <header
        className={cx('dash-welcome', Boolean(settings.campusImage) && 'has-photo')}
        style={settings.campusImage ? { backgroundImage: `linear-gradient(100deg, rgba(28, 49, 68, 0.94) 0%, rgba(28, 49, 68, 0.82) 46%, rgba(28, 49, 68, 0.45) 100%), url(${settings.campusImage})` } : undefined}
      >
        <div>
          <p className="dash-kicker">{settings.currentTerm} · {settings.academicYear}</p>
          <h1>Good day, {greeting}</h1>
          <p className="dash-school">{subject}</p>
          <p className="motto">{classLine}</p>
        </div>
        <dl className="dash-facts">
          <div><dt>Staff number</dt><dd>{teacher?.id ?? '—'}</dd></div>
          <div><dt>Classes</dt><dd>{classes.join(', ') || 'None assigned'}</dd></div>
          <div><dt>{usingToday ? 'Register' : 'Latest register'}</dt><dd>{day ? `${day}, ${formatDate(registerDate)}` : formatDate(registerDate)}</dd></div>
        </dl>
      </header>
      <section className="stat-board cols-4" aria-label="Teaching summary">
        <StatCard tone="blue" icon={<GraduationCap size={18} />} label="My students" value={formatNumber(students.length)} hint={classLine} />
        <StatCard tone="green" icon={<CalendarCheck size={18} />} label="Attendance" value={formatPercent(rate)} hint={counts.total ? `${counts.present} present · ${counts.absent} absent · ${counts.sick} sick` : 'No register for this day'} />
        <StatCard tone="teal" icon={<ClipboardList size={18} />} label={`${shortSubject(subject)} average`} value={formatPercent(summary.average)} hint={`${summary.complete} of ${summary.total} complete · First Term`} />
        <StatCard tone="amber" icon={<Presentation size={18} />} label={day ? `${day}'s lessons` : 'Lessons'} value={formatNumber(lessons.length)} hint={subjects.join(', ') || 'No subject assigned'} />
      </section>
      <section className="split dash-block">
        <article className="card">
          <div className="dash-card-head">
            <div>
              <h2>{day ? `${day}'s lessons` : 'No school day'}</h2>
              <p className="small">{usingToday ? 'Lessons on your timetable for today.' : `Showing the demonstration register for ${formatDate(registerDate)}.`}</p>
            </div>
            <Link className="link" to="/timetable">Full timetable</Link>
          </div>
          <div className="teach-lessons">
            {lessons.length === 0 ? <p className="muted">No lesson is on your timetable for this day.</p> : null}
            {lessons.map((slot) => (
              <Link key={slot.id} className="teach-lesson" to={`/attendance?class=${encodeURIComponent(slot.className)}`}>
                <span className="teach-when">{slot.start}–{slot.end}</span>
                <span>
                  <strong>{slot.subject}</strong>
                  <span className="small">{slot.className}</span>
                </span>
                <span className="teach-room">{slot.room}</span>
              </Link>
            ))}
          </div>
          <div className="cluster" style={{ marginTop: 14 }}>
            <Link className="btn btn-primary btn-sm" to="/attendance">Record attendance</Link>
            <Link className="btn btn-secondary btn-sm" to={`/examinations?subject=${encodeURIComponent(subject)}`}>Enter marks</Link>
          </div>
        </article>
        <article className="card">
          <div className="dash-card-head">
            <h2>Classes</h2>
            <Link className="link" to="/students">Student roll</Link>
          </div>
          <div className="teach-classes">
            {classes.length === 0 ? <p className="muted">No class is assigned yet.</p> : null}
            {classes.map((className) => {
              const group = students.filter((student) => student.className === className);
              const classRegister = register.filter((record) => record.className === className);
              const classRate = attendanceRate(classRegister);
              return (
                <Link key={className} className="teach-class" to={`/students?class=${encodeURIComponent(className)}`}>
                  <span className="teach-class-top">
                    <strong>{className}</strong>
                    <span className="small">{group.length} {group.length === 1 ? 'student' : 'students'}</span>
                  </span>
                  <span className="small">{subject} · {formatPercent(classRate)} present</span>
                </Link>
              );
            })}
          </div>
        </article>
      </section>
      <section className="card dash-block">
        <div className="dash-card-head">
          <div>
            <h2>Not in class</h2>
            <p className="small">{counts.total ? `${counts.absent + counts.sick} of ${counts.total} students were absent or sick.` : 'The register has not been taken.'}</p>
          </div>
          <Link className="link" to="/attendance">Open the register</Link>
        </div>
        {away.length === 0 ? <p className="muted" style={{ marginTop: 10 }}>Everyone in your classes was marked present.</p> : null}
        <div className="roster">
          {away.slice(0, 8).map(({ student, status }) => (
            <Link key={student.id} className="roster-row" to={`/students/${student.id}`}>
              <span className="person">
                <Avatar name={fullName(student)} photo={student.photo} size={38} />
                <span>
                  <strong>{fullName(student)}</strong>
                  <span className="small">{student.className}</span>
                </span>
              </span>
              <StatusBadge status={status} />
            </Link>
          ))}
        </div>
        {away.length > 8 ? <p className="small" style={{ marginTop: 8 }}>{away.length - 8} more on the register.</p> : null}
      </section>
    </div>
  );
}

function LibraryDashboard() {
  const { state, session } = useApp();
  if (!session) return null;
  const today = todayISO();
  const copies = state.books.reduce((sum, book) => sum + book.quantity, 0);
  const available = state.books.reduce((sum, book) => sum + book.available, 0);
  const borrowed = state.loans.filter((loan) => !loan.returnDate).length;
  const overdue = state.loans.filter((loan) => loanViewStatus(loan, today) === 'Overdue').length;
  const recent = state.loans.slice(0, 6);

  return (
    <div className="page">
      <PageHeader
        title={`Library desk, ${session.name.split(' ')[0]}`}
        subtitle="Books, loans, and returns for this demonstration. Other school records stay with the administrator."
        actions={<Link className="btn btn-primary" to="/library?action=borrow">Issue a book</Link>}
      />
      <CampusBanner />
      <section className="stat-grid cols-4">
        <StatCard icon={<Library size={18} />} label="Total copies" value={formatNumber(copies)} hint={`${state.books.length} titles`} />
        <StatCard icon={<Library size={18} />} label="Available copies" value={formatNumber(available)} hint={bookAvailability({ id: '', title: '', author: '', category: '', quantity: copies, available })} />
        <StatCard icon={<ClipboardList size={18} />} label="Borrowed copies" value={formatNumber(borrowed)} hint="Not yet returned" />
        <StatCard icon={<TriangleAlert size={18} />} label="Overdue books" value={formatNumber(overdue)} hint="Past the due date" />
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2>Recent borrowing</h2>
          <Link className="btn btn-secondary btn-sm" to="/library">Open the catalogue</Link>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Recent loans</caption>
            <thead><tr><th scope="col">Student</th><th scope="col">Book</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {recent.map((loan) => {
                const student = state.students.find((item) => item.id === loan.studentId);
                const book = state.books.find((item) => item.id === loan.bookId);
                return (
                  <tr key={loan.id}>
                    <td>{student ? fullName(student) : loan.studentId}</td>
                    <td>{book?.title ?? loan.bookId}</td>
                    <td>{formatDate(loan.dueDate)}</td>
                    <td><StatusBadge status={loanViewStatus(loan, today)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RegistrarDashboard() {
  const { state, session } = useApp();
  if (!session) return null;
  const figures = schoolFigures(state.students, state.teachers, state.fees);
  const recent = state.payments.slice(0, 6);

  return (
    <div className="page">
      <PageHeader
        title={`Fees desk, ${session.name.split(' ')[0]}`}
        subtitle="Change fees and record payments. Other school records stay with the administrator."
        actions={<Link className="btn btn-primary" to="/fees">Open the fee ledger</Link>}
      />
      <CampusBanner />
      <section className="stat-grid cols-4">
        <StatCard icon={<Wallet size={18} />} label="Total expected" value={formatMoney(figures.expected)} hint="School fee position" />
        <StatCard icon={<Wallet size={18} />} label="Total collected" value={formatMoney(figures.collected)} hint="Includes new payments" />
        <StatCard icon={<TriangleAlert size={18} />} label="Outstanding" value={formatMoney(figures.outstanding)} hint="Still to collect" />
        <StatCard icon={<ClipboardList size={18} />} label="Paid students" value={formatNumber(figures.paidStudents)} hint="Fully paid accounts" />
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2>Recent payments</h2>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Recent payments</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Student</th><th scope="col">Amount</th><th scope="col">Method</th></tr></thead>
            <tbody>
              {recent.map((payment) => {
                const student = state.students.find((item) => item.id === payment.studentId);
                return (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{student ? fullName(student) : payment.studentId}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.method}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RegisterDashboard() {
  const { state, session } = useApp();
  if (!session) return null;
  const recent = [...state.students].sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)).slice(0, 6);
  const waiting = state.users.filter((user) => user.role === 'parent' && !user.studentId).length;

  return (
    <div className="page">
      <PageHeader
        title={`Register desk, ${session.name.split(' ')[0]}`}
        subtitle="Admit students, record the parent or guardian, and open the student sign-in. Staff accounts are opened by the administrator."
        actions={<Link className="btn btn-primary" to="/register">Admit a student</Link>}
      />
      <CampusBanner />
      <section className="stat-grid cols-4">
        <StatCard icon={<GraduationCap size={18} />} label="Students on roll" value={formatNumber(state.students.length)} hint="Demonstration register" />
        <StatCard icon={<ClipboardList size={18} />} label="Active students" value={formatNumber(state.students.filter((student) => student.status === 'Active').length)} hint="Currently enrolled" />
        <StatCard icon={<Presentation size={18} />} label="Parent accounts" value={formatNumber(state.users.filter((user) => user.role === 'parent').length)} hint={waiting ? `${waiting} not linked to a student yet` : 'Opened by the administrator'} />
        <StatCard icon={<GraduationCap size={18} />} label="Student sign-ins" value={formatNumber(state.users.filter((user) => user.role === 'student').length)} hint="Created with an admission" />
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2>Recent admissions</h2>
          <Link className="btn btn-secondary btn-sm" to="/students">Open the student roll</Link>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Recent admissions</caption>
            <thead><tr><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Guardian</th><th scope="col">Admitted</th></tr></thead>
            <tbody>
              {recent.map((student) => (
                <tr key={student.id}>
                  <td><Link className="link" to={`/register?edit=${student.id}`}>{fullName(student)}</Link></td>
                  <td>{student.className}</td>
                  <td>{student.guardianName}</td>
                  <td>{formatDate(student.admissionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FamilyDashboard() {
  const { state, session, settings } = useApp();
  if (!session?.studentId) {
    return (
      <div className="page">
        <EmptyState title="No student is linked" text="This sign-in can only open one student, and none is linked yet." />
      </div>
    );
  }
  const student = state.students.find((item) => item.id === session.studentId);
  if (!student) {
    return (
      <div className="page">
        <EmptyState title="Student not found" text="The linked student is not on the demonstration register." />
      </div>
    );
  }
  const child = session.role === 'parent';
  const classmates = state.students.filter((item) => item.className === student.className).map((item) => item.id);
  const result = termReport(student.id, classmates, state.marks, settings.academicYear, SHOWCASE.term, CORE_SUBJECTS, settings);
  const records = state.attendance.filter((record) => record.studentId === student.id);
  const rate = attendanceRate(records);
  const counts = attendanceCounts(records);
  const fee = state.fees.find((item) => item.studentId === student.id);
  const paidDates = state.payments.filter((payment) => payment.studentId === student.id).map((payment) => payment.date).sort();
  const paidOn = paidDates.at(-1);
  const day = weekdayName(todayISO());
  const lessons = state.timetable.filter((slot) => slot.className === student.className && slot.day === day).sort((a, b) => a.start.localeCompare(b.start));
  const loans = state.loans.filter((loan) => loan.studentId === student.id && !loan.returnDate);
  const greeting = child ? session.name.split(' ')[0] : student.firstName;

  return (
    <div className="page dash">
      <header
        className={cx('dash-welcome', Boolean(settings.campusImage) && 'has-photo')}
        style={settings.campusImage ? { backgroundImage: `linear-gradient(100deg, rgba(28, 49, 68, 0.94) 0%, rgba(28, 49, 68, 0.82) 46%, rgba(28, 49, 68, 0.45) 100%), url(${settings.campusImage})` } : undefined}
      >
        <div>
          <p className="dash-kicker">{settings.currentTerm} · {settings.academicYear}</p>
          <h1>Good day, {greeting}</h1>
          <p className="dash-school">{child ? fullName(student) : student.className}</p>
          <p className="motto">{child ? 'Only your child is open on this sign-in.' : 'Only your records are open on this sign-in.'}</p>
        </div>
        <dl className="dash-facts">
          <div><dt>{child ? 'Child' : 'Student number'}</dt><dd>{child ? fullName(student) : student.id}</dd></div>
          <div><dt>Class</dt><dd>{student.className}</dd></div>
          <div><dt>{child ? 'Student number' : 'Guardian'}</dt><dd>{child ? student.id : student.guardianName}</dd></div>
        </dl>
      </header>
      <section className="stat-board cols-4" aria-label={child ? 'Child summary' : 'My summary'}>
        <StatCard tone="green" icon={<CalendarCheck size={18} />} label="Attendance" value={formatPercent(rate)} hint={counts.total ? `${counts.present} present · ${counts.absent} absent · ${counts.sick} sick` : 'No register yet'} />
        <StatCard tone="teal" icon={<ClipboardList size={18} />} label="First Term average" value={formatPercent(result.percentage)} hint={result.band ? `${result.band.grade} · ${result.band.label}` : 'Not complete yet'} />
        <StatCard tone="amber" icon={<Wallet size={18} />} label="Fee balance" value={fee ? formatMoney(balanceOf(fee.expected, fee.paid)) : '—'} hint={fee ? `${feeStatus(fee.expected, fee.paid)}${paidOn ? ` · last paid ${formatDate(paidOn)}` : ''}` : 'No fee account'} />
        <StatCard tone="blue" icon={<GraduationCap size={18} />} label="Class position" value={result.position ? `${result.position}` : '—'} hint={result.classSize ? `of ${result.classSize} in ${student.className}` : 'First Term'} />
      </section>
      <section className="split dash-block">
        <article className="card">
          <div className="dash-card-head">
            <div>
              <h2>{day ? `${day}'s lessons` : 'No school day'}</h2>
              <p className="small">{student.className} only.</p>
            </div>
            <Link className="link" to="/timetable">Timetable</Link>
          </div>
          <div className="teach-lessons">
            {lessons.length === 0 ? <p className="muted">No lesson is listed for this day.</p> : null}
            {lessons.map((slot) => (
              <div key={slot.id} className="teach-lesson">
                <span className="teach-when">{slot.start}–{slot.end}</span>
                <span>
                  <strong>{slot.subject}</strong>
                  <span className="small">{slot.className}</span>
                </span>
                <span className="teach-room">{slot.room}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="card">
          <div className="dash-card-head">
            <div>
              <h2>First Term results</h2>
              <p className="small">{child ? `${fullName(student)} only.` : 'Your subjects only.'}</p>
            </div>
            <Link className="link" to="/examinations">Results</Link>
          </div>
          <div className="roster">
            {result.subjects.map((row) => (
              <div key={row.subject} className="roster-row">
                <span>{row.subject}</span>
                <span className="cluster"><strong>{formatPercent(row.percentage)}</strong><StatusBadge status={row.band?.grade ?? row.status} /></span>
              </div>
            ))}
          </div>
          <div className="cluster" style={{ marginTop: 14 }}>
            <Link className="btn btn-primary btn-sm" to={`/report-card/${student.id}`}>Report card</Link>
            <Link className="btn btn-secondary btn-sm" to="/attendance">Attendance</Link>
          </div>
          {session.role === 'student' ? <p className="small" style={{ marginTop: 12 }}>{loans.length} library {loans.length === 1 ? 'book' : 'books'} still out.</p> : null}
        </article>
      </section>
    </div>
  );
}
