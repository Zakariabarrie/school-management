import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { TeacherDialog } from '../components/TeacherDialog';
import { Button, ConfirmDialog, DataTable, EmptyState, PageHeader, SelectInput, StatusBadge, TextInput, type Column } from '../components/ui';
import { CLASSES, JSS_SUBJECTS, SSS_SUBJECTS } from '../data/school';
import { withTitle } from '../lib/format';
import { can } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { Teacher } from '../types';

const SUBJECTS = [...new Set([...JSS_SUBJECTS, ...SSS_SUBJECTS])];

export function TeachersPage() {
  const { state, session, deleteTeacher } = useApp();
  const [params, setParams] = useSearchParams();
  usePageTitle('Teachers');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [className, setClassName] = useState('all');
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null);
  const [pending, setPending] = useState<Teacher | null>(null);
  const opened = useRef<string | null>(null);
  const manage = session ? can(session.role, 'manageTeachers') : false;

  useEffect(() => {
    const key = params.get('action') === 'add' ? 'add' : params.get('edit');
    if (!key) {
      opened.current = null;
      return;
    }
    if (opened.current === key || !manage) return;
    opened.current = key;
    if (key === 'add') setEditing('new');
    else {
      const found = state.teachers.find((teacher) => teacher.id === key);
      if (found) setEditing(found);
    }
  }, [params, manage, state.teachers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.teachers
      .filter((teacher) => (subject === 'all' ? true : teacher.subjects.includes(subject)))
      .filter((teacher) => (className === 'all' ? true : teacher.classes.includes(className)))
      .filter((teacher) => {
        if (!q) return true;
        return `${withTitle(teacher)} ${teacher.id} ${teacher.phone}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [state.teachers, query, subject, className]);

  if (!session) return null;

  function closeDialog() {
    setEditing(null);
    opened.current = null;
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('edit');
    setParams(next, { replace: true });
  }

  const columns: Column<Teacher>[] = [
    { key: 'id', header: 'Teacher ID', sortValue: (row) => row.id, render: (row) => row.id },
    { key: 'name', header: 'Name', sortValue: (row) => withTitle(row), render: (row) => <strong>{withTitle(row)}</strong> },
    { key: 'gender', header: 'Gender', sortValue: (row) => row.gender, render: (row) => row.gender },
    { key: 'subject', header: 'Subject', sortValue: (row) => row.subjects.join(', '), render: (row) => row.subjects.join(', ') },
    { key: 'class', header: 'Assigned class', sortValue: (row) => row.classes.join(', '), render: (row) => row.classes.join(', ') },
    { key: 'phone', header: 'Phone', render: (row) => row.phone },
    { key: 'status', header: 'Status', sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <Link className="btn btn-ghost btn-sm" to={`/teachers/${row.id}`}>View</Link>
          {manage ? <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>Edit</Button> : null}
          {manage ? <Button size="sm" variant="danger" onClick={() => setPending(row)}>Delete</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Teachers"
        subtitle="Staff directory, subject allocation, and class assignment for the demonstration."
        actions={manage ? <Button onClick={() => setEditing('new')}><Plus size={16} /> Register teacher</Button> : undefined}
      />
      <div className="filters">
        <TextInput className="grow" placeholder="Search name, ID, or phone" aria-label="Search teachers" value={query} onChange={(event) => setQuery(event.target.value)} />
        <SelectInput aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="all">All subjects</option>
          {SUBJECTS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          <option value="all">All classes</option>
          {CLASSES.map((item) => <option key={item.name}>{item.name}</option>)}
        </SelectInput>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption="Teacher directory"
        empty={<EmptyState title="No teachers match" text="Try another subject or class." />}
      />
      {editing ? <TeacherDialog teacher={editing === 'new' ? null : editing} onClose={closeDialog} /> : null}
      <ConfirmDialog
        open={!!pending}
        title="Remove teacher"
        message={pending ? `Remove ${withTitle(pending)} from the demonstration directory? You can restore the original data from Settings.` : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteTeacher(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
