import { Fragment } from 'react';
import { DAYS, PERIODS } from '../data/school';
import type { DayName, Teacher, TimetableSlot } from '../types';

function teacherLabel(teachers: Teacher[], id: string): string {
  const teacher = teachers.find((item) => item.id === id);
  return teacher ? `${teacher.title} ${teacher.lastName}` : 'Teacher not listed';
}

export function TimetableView({
  slots,
  teachers,
  highlightTeacherId,
  day,
  onEdit,
}: {
  slots: TimetableSlot[];
  teachers: Teacher[];
  highlightTeacherId?: string;
  day: DayName | 'all';
  onEdit?: (slot: TimetableSlot) => void;
}) {
  const days = day === 'all' ? DAYS : [day];
  const multiClass = new Set(slots.map((slot) => slot.className)).size > 1;

  function cell(dayName: DayName, start: string) {
    return slots.filter((slot) => slot.day === dayName && slot.start === start);
  }

  function Lesson({ slot }: { slot: TimetableSlot }) {
    const className = slot.teacherId === highlightTeacherId ? 'lesson is-mine' : 'lesson';
    const body = (
      <>
        <strong>{slot.subject}</strong>
        <span className="small">{teacherLabel(teachers, slot.teacherId)} · {slot.room}</span>
        {multiClass ? <span className="small">{slot.className}</span> : null}
      </>
    );
    if (!onEdit) return <div className={className}>{body}</div>;
    return (
      <button
        type="button"
        className={className}
        onClick={() => onEdit(slot)}
        aria-label={`Assign a teacher for ${slot.className} ${slot.day} ${slot.start} ${slot.subject}`}
      >
        {body}
      </button>
    );
  }

  return (
    <div>
      <div className="tt-wrap card" style={{ padding: 0 }}>
        <table className="tt">
          <caption className="sr-only">Weekly timetable</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              {days.map((item) => (
                <th key={item} scope="col">{item}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <Fragment key={period.id}>
                <tr>
                  <th scope="row">{period.start}–{period.end}</th>
                  {days.map((item) => {
                    const found = cell(item, period.start);
                    return (
                      <td key={item}>
                        {found.length === 0 ? <span className="muted">Free</span> : found.map((slot) => <Lesson key={slot.id} slot={slot} />)}
                      </td>
                    );
                  })}
                </tr>
                {period.end === '10:00' ? (
                  <tr className="tt-break"><td colSpan={days.length + 1}>Break · 10:00–10:20</td></tr>
                ) : null}
                {period.end === '12:20' ? (
                  <tr className="tt-break"><td colSpan={days.length + 1}>Lunch · 12:20–13:00</td></tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tt-mobile">
        {days.map((item) => (
          <section key={item} className="card day-card">
            <h3>{item}</h3>
            {PERIODS.map((period) => {
              const found = cell(item, period.start);
              return (
                <div key={period.id} className="lesson-row">
                  <span className="small">{period.start}–{period.end}</span>
                  <div>
                    {found.length === 0 ? <span className="muted">Free</span> : found.map((slot) => <Lesson key={slot.id} slot={slot} />)}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
