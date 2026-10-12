import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button, ConfirmDialog, DataTable, EmptyState, PageHeader, SelectInput, StatusBadge, TextInput, type Column } from '../components/ui';
import { CLASSES, GENDERS, STUDENT_STATUSES } from '../data/school';
import { visibleClasses, visibleStudents } from '../lib/access';
import { formatDate, fullName } from '../lib/format';
import { can } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { Student } from '../types';

export function StudentsPage() {
  const { state, session, deleteStudent } = useApp();
  const [params] = useSearchParams();
  usePageTitle('Students');
  const [query, setQuery] = useState('');
  const [className, setClassName] = useState(params.get('class') ?? 'all');
  const [gender, setGender] = useState('all');
  const [status, setStatus] = useState('all');
  const [pending, setPending] = useState<Student | null>(null);
  useEffect(() => {
    const value = params.get('class');
    if (value) setClassName(value);
  }, [params]);

  const rows = useMemo(() => {
    if (!session) return [];
    const people = visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers);
    const q = query.trim().toLowerCase();
    return people
      .filter((student) => (className === 'all' ? true : student.className === className))
      .filter((student) => (gender === 'all' ? true : student.gender === gender))
      .filter((student) => (status === 'all' ? true : student.status === status))
      .filter((student) => {
        if (!q) return true;
        return `${fullName(student)} ${student.id} ${student.guardianName} ${student.contact}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [state.students, state.teachers, session, query, className, gender, status]);

  if (!session) return null;
  if (session.role === 'student' || session.role === 'parent') {
    if (!session.studentId) {
      return (
        <div className="page">
          <EmptyState title="No student is linked" text="This sign-in can only open one student, and none is linked yet." />
        </div>
      );
    }
    return <Navigate to={`/students/${session.studentId}`} replace />;
  }

  const teacher = state.teachers.find((item) => item.id === session.teacherId);
  const classes = visibleClasses(session.role, teacher);
  const admit = can(session.role, 'registerStudents');

  const columns: Column<Student>[] = [
    { key: 'id', header: 'Student ID', sortValue: (row) => row.id, render: (row) => row.id },
    { key: 'name', header: 'Student name', sortValue: (row) => fullName(row), render: (row) => <strong>{fullName(row)}</strong> },
    { key: 'gender', header: 'Gender', sortValue: (row) => row.gender, render: (row) => row.gender },
    { key: 'dob', header: 'Date of birth', sortValue: (row) => row.dateOfBirth, render: (row) => formatDate(row.dateOfBirth) },
    { key: 'class', header: 'Class', sortValue: (row) => row.className, render: (row) => row.className },
    { key: 'guardian', header: 'Guardian', sortValue: (row) => row.guardianName, render: (row) => row.guardianName },
    { key: 'contact', header: 'Contact', render: (row) => row.contact },
    { key: 'status', header: 'Status', sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <Link className="btn btn-ghost btn-sm" to={`/students/${row.id}`}>View</Link>
          {admit ? <Link className="btn btn-ghost btn-sm" to={`/register?edit=${row.id}`}>Update</Link> : null}
          {admit ? <Button size="sm" variant="danger" onClick={() => setPending(row)}>Remove</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title={session.role === 'teacher' ? 'My students' : session.role === 'register' ? 'Student roll' : 'Students'}
        subtitle={
          admit
            ? 'Update an admission, or remove a student who should not stay on the roll.'
            : session.role === 'administrator'
              ? 'The Register admits students. This roll is view only.'
              : 'Students in the classes assigned to you. Records are read-only in the teacher view.'
        }
        actions={admit ? <Link className="btn btn-primary" to="/register">Admit a student</Link> : undefined}
      />
      <div className="filters">
        <TextInput className="grow" placeholder="Search name, ID, guardian, or contact" aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} />
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          <option value="all">All classes</option>
          {(session.role === 'teacher' ? classes : CLASSES.map((item) => item.name)).map((name) => <option key={name}>{name}</option>)}
        </SelectInput>
        <SelectInput aria-label="Gender" value={gender} onChange={(event) => setGender(event.target.value)}>
          <option value="all">All genders</option>
          {GENDERS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
        <SelectInput aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {STUDENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
      </div>
      <p className="small" style={{ marginBottom: 8 }}>{rows.length} {rows.length === 1 ? 'student' : 'students'}</p>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption="Student register"
        empty={<EmptyState title="No students match" text="Change the class, gender, or status filter." />}
      />
      <ConfirmDialog
        open={!!pending}
        title="Remove student"
        message={pending ? `Remove ${fullName(pending)} from the register? The student sign-in and fee account go with the record. A linked parent sign-in stays.` : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteStudent(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
