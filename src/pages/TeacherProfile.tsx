import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TeacherDialog } from '../components/TeacherDialog';
import { TimetableView } from '../components/TimetableView';
import { Button, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import { formatDate, fullName, withTitle } from '../lib/format';
import { can } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';

export function TeacherProfilePage() {
  const { teacherId = '' } = useParams();
  const { state, session } = useApp();
  const [editing, setEditing] = useState(false);
  const teacher = state.teachers.find((item) => item.id === teacherId);
  usePageTitle(teacher ? withTitle(teacher) : 'Teacher');
  if (!session) return null;
  if (!teacher) {
    return (
      <div className="page">
        <EmptyState title="Teacher not found" text="That member of staff is not in the demonstration directory." action={<Link className="btn btn-primary" to="/teachers">Back to teachers</Link>} />
      </div>
    );
  }
  const manage = can(session.role, 'manageTeachers');
  const classStudents = state.students.filter((student) => teacher.classes.includes(student.className) && student.status === 'Active');
  const slots = state.timetable.filter((slot) => slot.teacherId === teacher.id);

  return (
    <div className="page">
      <PageHeader
        title={withTitle(teacher)}
        subtitle={`${teacher.id} · ${teacher.subjects.join(', ')}`}
        actions={manage ? <Button onClick={() => setEditing(true)}>Edit allocation</Button> : undefined}
      />
      <section className="card stack">
        <div className="cluster">
          <StatusBadge status={teacher.status} />
          <span className="small">{teacher.gender}</span>
        </div>
        <dl className="kv">
          <div><dt>Qualification</dt><dd>{teacher.qualification}</dd></div>
          <div><dt>Joined</dt><dd>{formatDate(teacher.joinedDate)}</dd></div>
          <div><dt>Phone</dt><dd>{teacher.phone}</dd></div>
          <div><dt>Email</dt><dd>{teacher.email}</dd></div>
          <div><dt>Subjects</dt><dd>{teacher.subjects.join(', ')}</dd></div>
          <div><dt>Assigned classes</dt><dd>{teacher.classes.join(', ')}</dd></div>
        </dl>
      </section>
      <section className="split" style={{ marginTop: 12 }}>
        <article className="card">
          <h2>Students in assigned classes</h2>
          <div className="stack" style={{ marginTop: 10 }}>
            {classStudents.map((student) => (
              <Link key={student.id} to={`/students/${student.id}`} className="cluster" style={{ justifyContent: 'space-between', textDecoration: 'none' }}>
                <span>{fullName(student)}</span>
                <span className="small">{student.className}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="card">
          <h2>Weekly lessons</h2>
          <div style={{ marginTop: 10 }}>
            <TimetableView slots={slots} teachers={state.teachers} highlightTeacherId={teacher.id} day="all" />
          </div>
        </article>
      </section>
      {editing ? <TeacherDialog teacher={teacher} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
