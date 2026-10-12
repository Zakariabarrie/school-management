import { useState } from 'react';
import { CLASSES, GENDERS, JSS_SUBJECTS, SSS_SUBJECTS, TITLES } from '../data/school';
import { digitsOnly, nextNumberedId, todayISO } from '../lib/format';
import { useApp } from '../state/store';
import type { Gender, Teacher } from '../types';
import { Button, Field, Modal, SelectInput, TextInput } from './ui';

interface Draft {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  gender: Gender | '';
  subjects: string[];
  classes: string[];
  phone: string;
  email: string;
  qualification: string;
  status: Teacher['status'];
  joinedDate: string;
}

const SUBJECTS = [...new Set([...JSS_SUBJECTS, ...SSS_SUBJECTS])];

function blank(id: string): Draft {
  return {
    id,
    title: 'Mrs.',
    firstName: '',
    lastName: '',
    gender: '',
    subjects: [],
    classes: [],
    phone: '',
    email: '',
    qualification: '',
    status: 'Active',
    joinedDate: todayISO(),
  };
}

export function TeacherDialog({ teacher, onClose }: { teacher: Teacher | null; onClose: () => void }) {
  const { state, addTeacher, updateTeacher } = useApp();
  const [form, setForm] = useState<Draft>(() =>
    teacher
      ? { ...teacher, gender: teacher.gender }
      : blank(nextNumberedId(state.teachers.map((item) => item.id), 'TCH')),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggle(list: 'subjects' | 'classes', value: string) {
    setForm((current) => {
      const has = current[list].includes(value);
      return { ...current, [list]: has ? current[list].filter((item) => item !== value) : [...current[list], value] };
    });
  }

  function save() {
    const next: Record<string, string> = {};
    if (!form.firstName.trim() || !form.lastName.trim()) next.name = 'Enter the teacher’s full name.';
    if (!form.gender) next.gender = 'Select a gender.';
    if (form.subjects.length === 0) next.subjects = 'Allocate at least one subject.';
    if (form.classes.length === 0) next.classes = 'Assign at least one class.';
    if (digitsOnly(form.phone).length < 7) next.phone = 'Enter a usable phone number.';
    if (!form.email.includes('@')) next.email = 'Enter a school email address.';
    if (!form.qualification.trim()) next.qualification = 'Enter the qualification.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const record: Teacher = {
      id: form.id,
      title: form.title,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender as Gender,
      subjects: form.subjects,
      classes: form.classes,
      phone: form.phone.trim(),
      email: form.email.trim(),
      qualification: form.qualification.trim(),
      status: form.status,
      joinedDate: form.joinedDate,
    };
    if (teacher) updateTeacher(record);
    else addTeacher(record);
    onClose();
  }

  return (
    <Modal open wide title={teacher ? 'Edit teacher' : 'Register teacher'} description="Subject allocation and class assignment are saved in this browser." onClose={onClose}>
      <div className="modal-body">
        <div className="form-grid">
          <Field label="Teacher ID"><TextInput value={form.id} readOnly /></Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Teacher['status'] })}>
              <option>Active</option>
              <option>On leave</option>
            </SelectInput>
          </Field>
          <Field label="Title">
            <SelectInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}>
              {TITLES.map((title) => <option key={title}>{title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Gender" error={errors.gender}>
            <SelectInput value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender | '' })}>
              <option value="">Select</option>
              {GENDERS.map((gender) => <option key={gender}>{gender}</option>)}
            </SelectInput>
          </Field>
          <Field label="First name" error={errors.name}>
            <TextInput value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          </Field>
          <Field label="Surname">
            <TextInput value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Joined">
            <TextInput type="date" value={form.joinedDate} onChange={(event) => setForm({ ...form, joinedDate: event.target.value })} />
          </Field>
          <div className="span-2">
            <Field label="Qualification" error={errors.qualification}>
              <TextInput value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} />
            </Field>
          </div>
          <div className="field span-2">
            <span className="field-label">Subject allocation</span>
            <div className="checks">
              {SUBJECTS.map((subject) => (
                <label key={subject} className="check chip-check">
                  <input type="checkbox" checked={form.subjects.includes(subject)} onChange={() => toggle('subjects', subject)} />
                  {subject}
                </label>
              ))}
            </div>
            {errors.subjects ? <span className="field-error">{errors.subjects}</span> : null}
          </div>
          <div className="field span-2">
            <span className="field-label">Class assignment</span>
            <div className="checks">
              {CLASSES.map((item) => (
                <label key={item.name} className="check chip-check">
                  <input type="checkbox" checked={form.classes.includes(item.name)} onChange={() => toggle('classes', item.name)} />
                  {item.name}
                </label>
              ))}
            </div>
            {errors.classes ? <span className="field-error">{errors.classes}</span> : null}
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>{teacher ? 'Save changes' : 'Register teacher'}</Button>
      </div>
    </Modal>
  );
}
