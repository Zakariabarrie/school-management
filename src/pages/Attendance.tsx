import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, PageHeader, Progress, SelectInput, StatusBadge } from '../components/ui';
import { visibleClasses, visibleStudents } from '../lib/access';
import { formatDate, formatLongDate, formatMonth, formatPercent, fullName, isWeekend, todayISO } from '../lib/format';
import { can } from '../lib/permissions';
import { attendanceCounts, attendanceRate } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { AttendanceStatus } from '../types';

const STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Sick'];

export function AttendancePage() {
  const { session } = useApp();
  usePageTitle('Attendance');
  if (!session) return null;
  if (session.role === 'student' || session.role === 'parent') return <PersonalAttendance />;
  return <ClassRegister />;
}

function PersonalAttendance() {
  const { state, session } = useApp();
  const student = state.students.find((item) => item.id === session?.studentId);
  const [month, setMonth] = useState('2026-09');
  if (!student) return <EmptyState title="No student is linked" text="This account does not point to a student record." />;
  const records = state.attendance.filter((record) => record.studentId === student.id && record.date.startsWith(month));
  const counts = attendanceCounts(records);
  const rate = attendanceRate(records);
  return (
    <div className="page">
      <PageHeader
        title={session?.role === 'parent' ? `${fullName(student)}'s attendance` : 'My attendance'}
        subtitle={session?.role === 'parent' ? `${student.className} · only this child's register. Present is the only attending mark.` : `${student.className} · only your register. Present is the only attending mark.`}
      />
      <section className="card stack">
        <label className="field" style={{ maxWidth: 240 }}>
          <span className="field-label">Month</span>
          <SelectInput value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="2026-09">September 2026</option>
          </SelectInput>
        </label>
        <Progress value={rate ?? 0} label={`${formatMonth(month)} attendance`} />
        <p className="summary-row">
          <span>Present <strong>{counts.present}</strong></span>
          <span>Absent <strong>{counts.absent}</strong></span>
          <span>Sick <strong>{counts.sick}</strong></span>
          <span>Rate <strong>{formatPercent(rate)}</strong></span>
        </p>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Attendance days</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {records.length === 0 ? <tr><td colSpan={2}>No marks for this month.</td></tr> : null}
              {[...records].sort((a, b) => b.date.localeCompare(a.date)).map((record) => (
                <tr key={record.id}><td>{formatDate(record.date)}</td><td><StatusBadge status={record.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ClassRegister() {
  const { state, session, saveAttendance } = useApp();
  const [params] = useSearchParams();
  const teacher = state.teachers.find((item) => item.id === session?.teacherId);
  const classes = session ? visibleClasses(session.role, teacher) : [];
  const initialClass = params.get('class');
  const [className, setClassName] = useState(initialClass && classes.includes(initialClass) ? initialClass : classes[0] ?? 'JSS 3');
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);
  const classStudents = useMemo(
    () =>
      state.students
        .filter((student) => student.className === className && student.status === 'Active')
        .filter((student) => (session?.role === 'teacher' ? visibleStudents(session.role, session.studentId, session.teacherId, [student], state.teachers).length > 0 : true))
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [state.students, state.teachers, className, session],
  );

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    for (const student of classStudents) {
      const saved = state.attendance.find((record) => record.studentId === student.id && record.date === date);
      next[student.id] = saved?.status ?? 'Present';
    }
    setDraft(next);
    setDirty(false);
  }, [classStudents, date, state.attendance]);

  if (!session) return null;
  const editable = can(session.role, 'recordAttendance');

  const values = classStudents.map((student) => {
    if (editable) return draft[student.id] ?? 'Present';
    return state.attendance.find((record) => record.studentId === student.id && record.date === date)?.status;
  }).filter((status): status is AttendanceStatus => status != null);
  const present = values.filter((status) => status === 'Present').length;
  const absent = values.filter((status) => status === 'Absent').length;
  const sick = values.filter((status) => status === 'Sick').length;
  const rate = values.length ? (present / values.length) * 100 : 0;
  const month = date.slice(0, 7);
  const monthRecords = state.attendance.filter((record) => record.className === className && record.date.startsWith(month));

  return (
    <div className="page">
      <PageHeader
        title="Attendance"
        subtitle={editable ? 'Select a class and date, mark each student, then save. The dashboard uses the saved register.' : 'View the saved register. Only a teacher can mark attendance.'}
        actions={editable ? (
          <div className="cluster">
            <Button variant="secondary" onClick={() => {
              const next: Record<string, AttendanceStatus> = {};
              for (const student of classStudents) next[student.id] = 'Present';
              setDraft(next);
              setDirty(true);
            }}>Mark all present</Button>
            <Button
              onClick={() => {
                saveAttendance(date, className, classStudents.map((student) => ({ studentId: student.id, status: draft[student.id] ?? 'Present' })));
                setDirty(false);
              }}
              disabled={classStudents.length === 0}
            >
              Save register
            </Button>
          </div>
        ) : undefined}
      />
      <div className="filters">
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          {classes.map((name) => <option key={name}>{name}</option>)}
        </SelectInput>
        <label className="field">
          <span className="sr-only">Date</span>
          <input className="input" type="date" value={date} aria-label="Attendance date" onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <section className="card stack">
        <h2>{formatLongDate(date)}</h2>
        {editable && isWeekend(date) ? <p className="small">This date falls on a weekend. You can still mark a demonstration register.</p> : null}
        {editable && dirty ? <p className="small">Unsaved changes. Save the register to update the dashboard.</p> : null}
        <div className="summary-row">
          <span>Present <strong>{present}</strong></span>
          <span>Absent <strong>{absent}</strong></span>
          <span>Sick <strong>{sick}</strong></span>
        </div>
        <Progress value={rate} label="Attendance percentage" />
        {classStudents.length === 0 ? (
          <EmptyState title={`No active students in ${className}`} text="Add a student to this class, or choose another class from the list." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">{className} register</caption>
              <thead><tr><th scope="col">Student</th><th scope="col">Mark</th></tr></thead>
              <tbody>
                {classStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{fullName(student)}</td>
                    <td>
                      {editable ? (
                        <div className="mark" role="group" aria-label={`Attendance for ${fullName(student)}`}>
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`mark-btn ${draft[student.id] === status ? `is-${status.toLowerCase()}` : ''}`}
                              aria-pressed={draft[student.id] === status}
                              onClick={() => {
                                setDraft((current) => ({ ...current, [student.id]: status }));
                                setDirty(true);
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <StatusBadge status={state.attendance.find((record) => record.studentId === student.id && record.date === date)?.status ?? 'Not marked'} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2>{formatMonth(month)} report · {className}</h2>
        <p className="small">These figures use saved marks, not unsaved changes on the register above.</p>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Monthly attendance</caption>
            <thead><tr><th scope="col">Student</th><th scope="col">Present</th><th scope="col">Absent</th><th scope="col">Sick</th><th scope="col">Percentage</th></tr></thead>
            <tbody>
              {state.students.filter((student) => student.className === className).map((student) => {
                const mine = monthRecords.filter((record) => record.studentId === student.id);
                const summary = attendanceCounts(mine);
                return (
                  <tr key={student.id}>
                    <td>{fullName(student)}</td>
                    <td>{summary.present}</td>
                    <td>{summary.absent}</td>
                    <td>{summary.sick}</td>
                    <td>{formatPercent(attendanceRate(mine))}</td>
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
