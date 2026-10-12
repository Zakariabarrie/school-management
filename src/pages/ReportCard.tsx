import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Restricted } from '../components/Restricted';
import { Button, EmptyState, PageHeader, SelectInput } from '../components/ui';
import { ACADEMIC_YEARS, CLASSES, SHOWCASE, TERMS, subjectsForClass } from '../data/school';
import { termReport, yearSummary, type SubjectTermResult } from '../lib/assessments';
import { canViewStudent } from '../lib/access';
import { formatPercent, fullName, ordinal, withTitle } from '../lib/format';
import { principalComment, teacherComment } from '../lib/grading';
import { attendanceCounts, attendanceRate } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { TermName } from '../types';

const TERM_MONTHS: Record<TermName, string[]> = {
  'First Term': ['-09-', '-10-', '-11-', '-12-'],
  'Second Term': ['-01-', '-02-', '-03-', '-04-'],
  'Third Term': ['-05-', '-06-', '-07-', '-08-'],
};

function markCell(row: SubjectTermResult, categoryId: string) {
  const item = row.components.find((component) => component.categoryId === categoryId);
  if (!item || item.score == null) return item?.required === false ? '—' : 'Missing';
  return `${item.score}/${item.maxMarks}`;
}

function totalCell(row: SubjectTermResult) {
  if (row.obtained == null || row.available == null || row.percentage == null) return '—';
  return `${row.obtained}/${row.available}`;
}

export function ReportCardPage() {
  const { studentId = '' } = useParams();
  const [params] = useSearchParams();
  const { state, session, settings, notify } = useApp();
  const [year, setYear] = useState(params.get('year') || SHOWCASE.year);
  const student = state.students.find((item) => item.id === studentId);
  const allowed = Boolean(session && student && canViewStudent(session.role, session.studentId, session.teacherId, student.id, state.students, state.teachers));
  usePageTitle(allowed && student ? `${fullName(student)} report` : 'Report card');

  if (!session) return null;
  if (!student) {
    return <div className="page"><EmptyState title="Report not available" text="That student is not in the demonstration register." action={<Link className="btn btn-primary" to="/">Dashboard</Link>} /></div>;
  }
  if (!canViewStudent(session.role, session.studentId, session.teacherId, student.id, state.students, state.teachers)) {
    return <Restricted text="This report card is outside the current role." />;
  }

  const subjects = subjectsForClass(student.className);
  const classmates = state.students.filter((item) => item.className === student.className).map((item) => item.id);
  const reports = TERMS.map((term) => ({
    term,
    result: termReport(student.id, classmates, state.marks, year, term, subjects, settings),
  }));
  const yearTotal = yearSummary(student.id, classmates, state.marks, year, subjects, TERMS, settings);
  const attendance = TERMS.map((term) => {
    const records = state.attendance.filter((record) => record.studentId === student.id && TERM_MONTHS[term].some((month) => record.date.includes(month)));
    return { term, rate: attendanceRate(records), counts: attendanceCounts(records) };
  });
  const formTeacherId = CLASSES.find((item) => item.name === student.className)?.formTeacherId;
  const formTeacher = state.teachers.find((item) => item.id === formTeacherId);

  function printSheet() {
    window.print();
  }

  return (
    <div className="page">
      <div className="no-print">
        <PageHeader
          title="Report card"
          subtitle="Page 1 is the mark sheet for all three terms. Comments are on page 2. Print, or choose Save as PDF in the browser print dialog."
          actions={
            <div className="cluster">
              <SelectInput aria-label="Academic year" value={year} onChange={(event) => setYear(event.target.value)}>
                {ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}
              </SelectInput>
              <Button variant="secondary" onClick={printSheet}><Printer size={16} /> Print report</Button>
              <Button
                onClick={() => {
                  notify('In the print dialog, choose Save as PDF. This demonstration does not create a file on a server.', 'info');
                  window.print();
                }}
              >
                <Download size={16} /> Download PDF
              </Button>
            </div>
          }
        />
      </div>
      <article className="report-sheet">
        <div className="report-brand">
          <Logo size={58} />
          <div>
            <h2>{settings.name}</h2>
            <p>{settings.address}</p>
            <p className="motto">{settings.motto}</p>
          </div>
        </div>
        <h3 className="center" style={{ margin: '18px 0 4px', fontFamily: 'var(--serif)' }}>Final report card</h3>
        <p className="center small">{year} · First Term, Second Term and Third Term on one card</p>
        <dl className="kv" style={{ marginTop: 18 }}>
          <div><dt>Student</dt><dd>{fullName(student)}</dd></div>
          <div><dt>Student ID</dt><dd>{student.id}</dd></div>
          <div><dt>Class</dt><dd>{student.className}</dd></div>
          <div><dt>Gender</dt><dd>{student.gender}</dd></div>
        </dl>
        {reports.map(({ term, result }) => {
          const register = attendance.find((item) => item.term === term);
          return (
            <section key={term} className="term-sheet">
              <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3>{term}</h3>
                <p className="small">
                  Attendance{' '}
                  <strong>{register && register.counts.total > 0 ? formatPercent(register.rate) : 'Not recorded'}</strong>
                  {register && register.counts.total > 0 ? ` · Present ${register.counts.present} · Sick ${register.counts.sick} · Absent ${register.counts.absent}` : ''}
                </p>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">{term} subject results</caption>
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      {settings.assessments.map((item) => <th key={item.id} scope="col">{item.name}</th>)}
                      <th scope="col">Total</th>
                      <th scope="col">Final %</th>
                      <th scope="col">Grade</th>
                      <th scope="col">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.map((row) => (
                      <tr key={row.subject}>
                        <td>{row.subject}</td>
                        {settings.assessments.map((item) => <td key={item.id} className="num">{markCell(row, item.id)}</td>)}
                        <td className="num">{totalCell(row)}</td>
                        <td className="num">{formatPercent(row.percentage)}</td>
                        <td>{row.band ? `${row.band.grade} · ${row.band.label}` : '—'}</td>
                        <td className="num">{row.position ? ordinal(row.position) : '—'}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Term result</th>
                      {settings.assessments.map((item) => <td key={item.id} />)}
                      <td className="num">{result.percentage == null || result.obtained == null || result.available == null ? '—' : `${result.obtained}/${result.available}`}</td>
                      <td className="num">{formatPercent(result.percentage)}</td>
                      <td>{result.band ? `${result.band.grade} · ${result.band.label}` : '—'}</td>
                      <td className="num">{result.position ? `${ordinal(result.position)} of ${result.classSize}` : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        <section className="term-sheet">
          <h3>Total of all terms</h3>
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Total of First, Second and Third Term</caption>
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  {TERMS.map((term) => <th key={term} scope="col">{term}</th>)}
                  <th scope="col">Total</th>
                  <th scope="col">Final %</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Position</th>
                </tr>
              </thead>
              <tbody>
                {yearTotal.subjects.map((row) => (
                  <tr key={row.subject}>
                    <td>{row.subject}</td>
                    {row.terms.map((cell) => (
                      <td key={cell.term} className="num">{cell.obtained == null || cell.available == null ? '—' : `${cell.obtained}/${cell.available}`}</td>
                    ))}
                    <td className="num">{row.obtained == null || row.available == null ? '—' : `${row.obtained}/${row.available}`}</td>
                    <td className="num">{formatPercent(row.percentage)}</td>
                    <td>{row.band ? `${row.band.grade} · ${row.band.label}` : '—'}</td>
                    <td className="num">{row.position ? ordinal(row.position) : '—'}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">All subjects</th>
                  {yearTotal.terms.map((cell) => (
                    <td key={cell.term} className="num">{cell.obtained == null || cell.available == null ? '—' : `${cell.obtained}/${cell.available}`}</td>
                  ))}
                  <td className="num">{yearTotal.obtained == null || yearTotal.available == null ? '—' : `${yearTotal.obtained}/${yearTotal.available}`}</td>
                  <td className="num">{formatPercent(yearTotal.percentage)}</td>
                  <td>{yearTotal.band ? `${yearTotal.band.grade} · ${yearTotal.band.label}` : '—'}</td>
                  <td className="num">{yearTotal.position ? `${ordinal(yearTotal.position)} of ${yearTotal.classSize}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className="small" style={{ marginTop: 12 }}>
          The total of all terms adds the marks from each completed term. A missing term is not counted as zero. The final percentage, grade, and position for that total appear when First, Second and Third Term are all complete. Attendance is not added to the total.
        </p>
        <p className="small center" style={{ marginTop: 18 }}>Page 1 of 2 · {settings.name}</p>
      </article>
      <article className="report-sheet report-next-page">
        <div className="report-brand">
          <Logo size={48} />
          <div>
            <h2>{settings.name}</h2>
            <p className="motto">{settings.motto}</p>
          </div>
        </div>
        <h3 className="center" style={{ margin: '18px 0 4px', fontFamily: 'var(--serif)' }}>Comments</h3>
        <p className="center small">{fullName(student)} · {student.id} · {student.className} · {year}</p>
        <div className="stack" style={{ marginTop: 18 }}>
          {reports.map(({ term, result }) => (
            <section key={term} className="stack">
              <h3>{term}</h3>
              <div className="comment">
                <strong>Class teacher’s comment</strong>
                <p>{result.band ? teacherComment(student.firstName, result.band.grade) : 'This comment is waiting until the term result is complete.'}</p>
              </div>
              <div className="comment">
                <strong>Principal’s comment</strong>
                <p>{result.band ? principalComment(student.firstName, result.band.grade) : 'This comment is waiting until the term result is complete.'}</p>
              </div>
            </section>
          ))}
        </div>
        <div className="sign-off">
          <div>
            <div className="sign-line">{formTeacher ? withTitle(formTeacher) : 'Class teacher'}</div>
            <p className="small">Class teacher</p>
          </div>
          <div>
            <div className="sign-line">{settings.principal}</div>
            <p className="small">Principal</p>
          </div>
        </div>
        <p className="small center" style={{ marginTop: 22 }}>
          Page 2 of 2 · {settings.name} · {settings.phone} · Generated in this browser for the school demonstration.
        </p>
      </article>
    </div>
  );
}
