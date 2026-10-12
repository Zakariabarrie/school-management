import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TimetableView } from '../components/TimetableView';
import { Button, Field, Modal, PageHeader, SelectInput, TextInput } from '../components/ui';
import { DAYS, SHOWCASE, subjectsForClass } from '../data/school';
import { visibleClasses } from '../lib/access';
import { fullName, todayISO, weekdayName, withTitle } from '../lib/format';
import { can } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { DayName, TimetableSlot } from '../types';

export function TimetablePage() {
  const { state, session, updateSlot } = useApp();
  const [params] = useSearchParams();
  usePageTitle('Timetable');
  const teacher = state.teachers.find((item) => item.id === session?.teacherId);
  const own = state.students.find((item) => item.id === session?.studentId);
  const family = session?.role === 'student' || session?.role === 'parent';
  const classes = session ? visibleClasses(session.role, teacher, own?.className) : [];
  const requested = params.get('class');
  const [className, setClassName] = useState(
    family
      ? own?.className ?? ''
      : requested && (requested === 'all' || classes.includes(requested))
        ? requested
        : classes.includes(SHOWCASE.className)
          ? SHOWCASE.className
          : classes[0] ?? 'JSS 3',
  );
  const [teacherId, setTeacherId] = useState(params.get('teacher') ?? 'all');
  const [day, setDay] = useState<DayName | 'all'>((params.get('day') as DayName | null) ?? 'all');
  const [draft, setDraft] = useState<TimetableSlot | null>(null);
  const [error, setError] = useState('');
  if (!session) return null;

  const editable = can(session.role, 'manageTimetable');
  const activeClass = family ? own?.className ?? '' : className;
  const slots = state.timetable
    .filter((slot) => (activeClass === 'all' ? true : slot.className === activeClass))
    .filter((slot) => (family || teacherId === 'all' ? true : slot.teacherId === teacherId));
  const today = weekdayName(todayISO());
  const subjects = draft ? subjectsForClass(draft.className) : [];
  const subjectOptions = draft && !subjects.includes(draft.subject) ? [draft.subject, ...subjects] : subjects;
  const teachers = [...state.teachers].sort((left, right) => {
    const leftMatch = draft && left.subjects.includes(draft.subject) ? 0 : 1;
    const rightMatch = draft && right.subjects.includes(draft.subject) ? 0 : 1;
    return leftMatch - rightMatch || left.lastName.localeCompare(right.lastName);
  });

  function save() {
    if (!draft) return;
    const message = updateSlot(draft);
    if (message) {
      setError(message);
      return;
    }
    setDraft(null);
    setError('');
  }

  return (
    <div className="page">
      <PageHeader
        title="Timetable"
        subtitle={
          family
            ? own
              ? `${own.className} only. ${session.role === 'parent' ? `${fullName(own)}'s class timetable` : 'Your class timetable'}.`
              : 'This sign-in is not linked to a student.'
            : editable
              ? 'Select a lesson to assign the teacher, subject, or room.'
              : today
                ? `Today is ${today}. Break and lunch sit between the teaching periods.`
                : 'Weekend. The weekly grid is still available.'
        }
      />
      <div className="filters">
        {family ? null : (
          <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
            {session.role === 'administrator' ? <option value="all">All classes</option> : null}
            {classes.map((name) => <option key={name}>{name}</option>)}
          </SelectInput>
        )}
        {family ? null : (
          <SelectInput aria-label="Teacher" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="all">All teachers</option>
            {state.teachers.map((item) => <option key={item.id} value={item.id}>{withTitle(item)}</option>)}
          </SelectInput>
        )}
        <SelectInput aria-label="Day" value={day} onChange={(event) => setDay(event.target.value as DayName | 'all')}>
          <option value="all">Full week</option>
          {DAYS.map((item) => <option key={item}>{item}</option>)}
        </SelectInput>
      </div>
      <TimetableView
        slots={slots}
        teachers={state.teachers}
        highlightTeacherId={teacherId === 'all' ? session.teacherId : teacherId}
        day={day}
        onEdit={editable ? (slot) => { setDraft({ ...slot }); setError(''); } : undefined}
      />
      <Modal
        open={draft !== null}
        title="Assign teacher"
        description={draft ? `${draft.className} · ${draft.day} · ${draft.start}–${draft.end}` : undefined}
        onClose={() => setDraft(null)}
      >
        {draft ? (
          <>
            <div className="modal-body stack">
              <Field label="Subject">
                <SelectInput
                  value={draft.subject}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                >
                  {subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}
                </SelectInput>
              </Field>
              <Field label="Teacher" error={error || undefined} hint="Teachers who already teach this subject are listed first.">
                <SelectInput
                  value={draft.teacherId}
                  onChange={(event) => { setDraft({ ...draft, teacherId: event.target.value }); setError(''); }}
                >
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {withTitle(item)}{item.subjects.includes(draft.subject) ? '' : ` · ${item.subjects[0] ?? 'General'}`}
                      {item.status === 'On leave' ? ' · On leave' : ''}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Room">
                <TextInput value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} />
              </Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={save}>Save lesson</Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
