import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, PageHeader, Progress, SelectInput, StatusBadge } from '../components/ui';
import { ACADEMIC_YEARS, SHOWCASE, TERMS, subjectsForClass, teacherForSubject } from '../data/school';
import { classSubjectSummary, calculationNote, subjectTermResult, termReport } from '../lib/assessments';
import { visibleClasses, visibleStudents } from '../lib/access';
import { formatPercent, fullName, ordinal } from '../lib/format';
import { can } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { AssessmentMark, TermName } from '../types';

export function ExaminationsPage() {
  const { session } = useApp();
  usePageTitle('Examinations');
  if (!session) return null;
  if (session.role === 'student' || session.role === 'parent') return <PersonalResults />;
  return <ScoreEntry />;
}

function PersonalResults() {
  const { state, session, settings } = useApp();
  const [year, setYear] = useState(settings.academicYear);
  const student = state.students.find((item) => item.id === session?.studentId);
  if (!student || !session) return <EmptyState title="No results to show" text="This account is not linked to a student." />;
  const classmates = state.students.filter((item) => item.className === student.className).map((item) => item.id);
  const subjects = subjectsForClass(student.className);
  const reports = TERMS.map((term) => ({
    term,
    report: termReport(student.id, classmates, state.marks, year, term, subjects, settings),
  }));
  return (
    <div className="page">
      <PageHeader
        title={session.role === 'parent' ? `${fullName(student)}'s results` : 'My results'}
        subtitle={session.role === 'parent' ? 'Only this child. First, Second and Third Term stay separate. A blank assessment is missing, not zero.' : 'Only your results. First, Second and Third Term stay separate. A blank assessment is missing, not zero.'}
        actions={<Link className="btn btn-primary" to={`/report-card/${student.id}?year=${encodeURIComponent(year)}`}>Report card</Link>}
      />
      <div className="filters">
        <SelectInput aria-label="Academic year" value={year} onChange={(event) => setYear(event.target.value)}>
          {ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
      </div>
      <div className="stat-grid cols-4" style={{ marginBottom: 12 }}>
        {reports.map(({ term, report }) => (
          <a key={term} className="card" href={`#term-${term.replace(/\s+/g, '-').toLowerCase()}`} style={{ textAlign: 'left' }}>
            <p className="small">{term}</p>
            <strong>{formatPercent(report.percentage)}</strong>
            <p className="small">{report.band ? `${report.band.grade} · ${report.band.label}` : report.status}</p>
          </a>
        ))}
      </div>
      <div className="stack">
        {reports.map(({ term, report }) => (
          <div key={term} id={`term-${term.replace(/\s+/g, '-').toLowerCase()}`}>
            <TermDetail report={report} term={term} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TermDetail({ report, term }: { report: ReturnType<typeof termReport>; term: string }) {
  return (
    <div className="card stack">
      <h2>{term}</h2>
      <p className="summary-row">
        <span>Final percentage <strong>{formatPercent(report.percentage)}</strong></span>
        <span>Grade <strong>{report.band ? `${report.band.grade} · ${report.band.label}` : '—'}</strong></span>
        <span>Position <strong>{report.position ? `${ordinal(report.position)} of ${report.classSize}` : 'Not ready'}</strong></span>
        <StatusBadge status={report.status} />
      </p>
      <p className="small">Position uses every subject in the class. It appears only when every student has a complete result, and equal percentages share a place.</p>
      {report.subjects.map((subject) => (
        <div key={subject.subject}>
          <div className="cluster" style={{ justifyContent: 'space-between' }}>
            <strong>{subject.subject}</strong>
            <span className="cluster">
              <span className="small">{formatPercent(subject.percentage)}</span>
              <StatusBadge status={subject.status} />
              {subject.position ? <span className="small">{ordinal(subject.position)}</span> : null}
            </span>
          </div>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="data">
              <caption className="sr-only">{subject.subject} assessments</caption>
              <thead><tr><th scope="col">Assessment</th><th scope="col">Score</th><th scope="col">Maximum</th></tr></thead>
              <tbody>
                {subject.components.map((item) => (
                  <tr key={item.categoryId}>
                    <td>{item.name}{item.required ? '' : ' (optional)'}</td>
                    <td className="num">{item.score == null ? 'Missing' : item.score}</td>
                    <td className="num">{item.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreEntry() {
  const { state, session, settings, saveMarks, notify } = useApp();
  const [params] = useSearchParams();
  const teacher = state.teachers.find((item) => item.id === session?.teacherId);
  const classes = session ? visibleClasses(session.role, teacher) : [];
  const requestedClass = params.get('class');
  const [year, setYear] = useState(params.get('year') || settings.academicYear);
  const [term, setTerm] = useState<TermName>((TERMS as string[]).includes(params.get('term') ?? '') ? (params.get('term') as TermName) : settings.currentTerm as TermName);
  const [className, setClassName] = useState(requestedClass && classes.includes(requestedClass) ? requestedClass : classes.includes(SHOWCASE.className) ? SHOWCASE.className : classes[0] ?? 'JSS 3');
  const classSubjects = useMemo(() => subjectsForClass(className), [className]);
  const entrySubjects = useMemo(() => {
    if (session?.role === 'teacher' && teacher) return classSubjects.filter((subject) => teacher.subjects.includes(subject));
    return classSubjects;
  }, [classSubjects, session?.role, teacher]);
  const requestedSubject = params.get('subject');
  const [subject, setSubject] = useState(requestedSubject && entrySubjects.includes(requestedSubject) ? requestedSubject : entrySubjects[0] ?? '');
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (entrySubjects.length > 0 && !entrySubjects.includes(subject)) setSubject(entrySubjects[0]);
  }, [entrySubjects, subject]);

  const classStudents = useMemo(
    () =>
      (session ? visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers) : [])
        .filter((student) => student.className === className)
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [session, state.students, state.teachers, className],
  );

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    for (const student of classStudents) {
      next[student.id] = {};
      for (const category of settings.assessments) {
        const saved = state.marks.find(
          (mark) =>
            mark.studentId === student.id &&
            mark.academicYear === year &&
            mark.term === term &&
            mark.subject === subject &&
            mark.categoryId === category.id,
        );
        next[student.id][category.id] = saved ? String(saved.score) : '';
      }
    }
    setDraft(next);
    setDirty(false);
  }, [classStudents, year, term, subject, state.marks, settings.assessments]);

  const previewMarks = useMemo(() => {
    const ids = new Set(classStudents.map((student) => student.id));
    const kept = state.marks.filter(
      (mark) => !(mark.academicYear === year && mark.term === term && mark.subject === subject && ids.has(mark.studentId)),
    );
    const added: AssessmentMark[] = [];
    for (const student of classStudents) {
      for (const category of settings.assessments) {
        const raw = (draft[student.id]?.[category.id] ?? '').trim();
        if (raw === '') continue;
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > category.maxMarks) continue;
        added.push({
          id: `${year}|${term}|${student.id}|${subject}|${category.id}`,
          studentId: student.id,
          academicYear: year,
          term,
          className,
          subject,
          categoryId: category.id,
          score: value,
          teacherId: session?.teacherId || teacherForSubject(subject),
        });
      }
    }
    return [...kept, ...added];
  }, [state.marks, classStudents, draft, settings.assessments, year, term, subject, className, session?.teacherId]);

  if (!session) return null;
  const classmates = state.students.filter((student) => student.className === className).map((student) => student.id);
  const summary = classSubjectSummary(classmates, previewMarks, year, term, subject, settings);
  const editable = can(session.role, 'enterScores');

  function save() {
    const entries: { studentId: string; categoryId: string; score: number | null; teacherId: string }[] = [];
    for (const student of classStudents) {
      for (const category of settings.assessments) {
        const raw = (draft[student.id]?.[category.id] ?? '').trim();
        if (raw === '') {
          entries.push({ studentId: student.id, categoryId: category.id, score: null, teacherId: session?.teacherId || teacherForSubject(subject) });
          continue;
        }
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > category.maxMarks) {
          notify(`${fullName(student)} · ${category.name} must be a whole number from 0 to ${category.maxMarks}. Leave it blank if it has not been marked.`, 'danger');
          return;
        }
        entries.push({ studentId: student.id, categoryId: category.id, score: value, teacherId: session?.teacherId || teacherForSubject(subject) });
      }
    }
    saveMarks({ year, term, subject, className, entries });
  }

  return (
    <div className="page">
      <PageHeader
        title="Examinations & results"
        subtitle={editable ? 'First, Second and Third Term stay separate. Totals and grades update from the marks on this page.' : 'First, Second and Third Term stay separate. This account can view results, not change them.'}
        actions={editable ? <Button onClick={save} disabled={!subject}>Save marks</Button> : undefined}
      />
      <div className="filters">
        <SelectInput aria-label="Academic year" value={year} onChange={(event) => setYear(event.target.value)}>
          {ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
        <SelectInput aria-label="Term" value={term} onChange={(event) => setTerm(event.target.value as TermName)}>
          {TERMS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          {classes.map((name) => <option key={name}>{name}</option>)}
        </SelectInput>
        <SelectInput aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
          {entrySubjects.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <strong>{subject || 'Subject'} · {term}</strong>
          <span className="small">{summary.complete} of {summary.total} students complete · class average {formatPercent(summary.average)}</span>
        </div>
        <Progress value={summary.total ? (summary.complete / summary.total) * 100 : 0} label="Assessment completion" />
        <p className="small">{calculationNote(settings.calculationMethod)} Pass mark {settings.passMark}%. A blank cell is missing. Zero is a real score. Class position appears only when every student in {className} has the required marks. Equal percentages share a position and the next one is skipped.</p>
        {editable && dirty ? <p className="small">Unsaved marks. The percentages below follow what is typed; save to keep them in this browser.</p> : null}
      </div>
      {entrySubjects.length === 0 ? (
        <EmptyState title="No subject to enter" text="This teacher view only opens subjects allocated to you in the selected class." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Assessment entry</caption>
            <thead>
              <tr>
                <th scope="col">Student ID</th>
                <th scope="col">Student name</th>
                {settings.assessments.map((category) => (
                  <th key={category.id} scope="col">{category.name}<span className="small"> / {category.maxMarks}</span></th>
                ))}
                <th scope="col">Obtained</th>
                <th scope="col">Available</th>
                <th scope="col">Final %</th>
                <th scope="col">Grade</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student) => {
                const result = subjectTermResult(student.id, classmates, previewMarks, year, term, subject, settings);
                return (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{fullName(student)}</td>
                    {settings.assessments.map((category) => (
                      <td key={category.id}>
                        {editable ? (
                          <input
                            className="input"
                            style={{ maxWidth: 88 }}
                            inputMode="numeric"
                            aria-label={`${category.name} for ${fullName(student)}`}
                            value={draft[student.id]?.[category.id] ?? ''}
                            placeholder="Missing"
                            onChange={(event) => {
                              const value = event.target.value;
                              setDraft((current) => ({
                                ...current,
                                [student.id]: { ...current[student.id], [category.id]: value },
                              }));
                              setDirty(true);
                            }}
                          />
                        ) : (
                          draft[student.id]?.[category.id] || 'Missing'
                        )}
                      </td>
                    ))}
                    <td className="num">{result.obtained ?? '—'}</td>
                    <td className="num">{result.available ?? '—'}</td>
                    <td className="num">{formatPercent(result.percentage)}</td>
                    <td>{result.band ? `${result.band.grade} · ${result.band.label}` : '—'}</td>
                    <td>
                      <StatusBadge status={result.status} />
                      {result.missing.length ? <div className="small">Missing: {result.missing.join(', ')}</div> : null}
                      {result.position ? <div className="small">{ordinal(result.position)} in class</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
