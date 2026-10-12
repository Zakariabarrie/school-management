import { useState } from 'react';
import { CLASSES, GENDERS, RELATIONS, STUDENT_STATUSES } from '../data/school';
import { digitsOnly, nextNumberedId, todayISO } from '../lib/format';
import { useApp } from '../state/store';
import type { Gender, Student, StudentStatus } from '../types';
import { Avatar, Button, Field, Modal, SelectInput, TextArea, TextInput } from './ui';

interface Draft {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender | '';
  dateOfBirth: string;
  className: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  contact: string;
  address: string;
  admissionDate: string;
  status: StudentStatus;
  photo?: string;
}

function fromStudent(student: Student): Draft {
  return { ...student, gender: student.gender };
}

function blank(id: string): Draft {
  return {
    id,
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    className: 'JSS 3',
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
    contact: '',
    address: '',
    admissionDate: todayISO(),
    status: 'Active',
  };
}

export function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const { state, addStudent, updateStudent, notify } = useApp();
  const [form, setForm] = useState<Draft>(() =>
    student ? fromStudent(student) : blank(nextNumberedId(state.students.map((item) => item.id), 'STU-2026')),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'Enter the first name.';
    if (!form.lastName.trim()) next.lastName = 'Enter the surname.';
    if (!form.gender) next.gender = 'Select a gender.';
    if (!form.dateOfBirth) next.dateOfBirth = 'Enter the date of birth.';
    if (!form.className) next.className = 'Select a class.';
    if (!form.guardianName.trim()) next.guardianName = 'Enter the parent or guardian.';
    if (digitsOnly(form.guardianPhone).length < 7) next.guardianPhone = 'Enter a usable phone number.';
    if (form.contact.trim() && digitsOnly(form.contact).length < 7) next.contact = 'Enter a usable contact number.';
    if (!form.address.trim()) next.address = 'Enter the address.';
    if (!form.admissionDate) next.admissionDate = 'Enter the admission date.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const record: Student = {
      id: form.id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender as Gender,
      dateOfBirth: form.dateOfBirth,
      className: form.className,
      guardianName: form.guardianName.trim(),
      guardianRelation: form.guardianRelation,
      guardianPhone: form.guardianPhone.trim(),
      contact: (form.contact.trim() || form.guardianPhone).trim(),
      address: form.address.trim(),
      admissionDate: form.admissionDate,
      status: form.status,
      photo: form.photo,
    };
    if (student) updateStudent(record);
    else addStudent(record);
    onClose();
  }

  return (
    <Modal
      open
      wide
      title={student ? 'Edit student' : 'Add student'}
      description="This record is kept in the browser for the demonstration."
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="form-grid">
          <Field label="Student ID">
            <TextInput value={form.id} readOnly />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(event) => set('status', event.target.value as StudentStatus)}>
              {STUDENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </SelectInput>
          </Field>
          <Field label="First name" error={errors.firstName}>
            <TextInput value={form.firstName} aria-invalid={!!errors.firstName} onChange={(event) => set('firstName', event.target.value)} />
          </Field>
          <Field label="Surname" error={errors.lastName}>
            <TextInput value={form.lastName} aria-invalid={!!errors.lastName} onChange={(event) => set('lastName', event.target.value)} />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth}>
            <TextInput type="date" value={form.dateOfBirth} aria-invalid={!!errors.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} />
          </Field>
          <Field label="Gender" error={errors.gender}>
            <SelectInput value={form.gender} aria-invalid={!!errors.gender} onChange={(event) => set('gender', event.target.value as Gender | '')}>
              <option value="">Select</option>
              {GENDERS.map((gender) => <option key={gender}>{gender}</option>)}
            </SelectInput>
          </Field>
          <Field label="Class" error={errors.className}>
            <SelectInput value={form.className} onChange={(event) => set('className', event.target.value)}>
              {CLASSES.map((item) => <option key={item.name}>{item.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Admission date" error={errors.admissionDate}>
            <TextInput type="date" value={form.admissionDate} onChange={(event) => set('admissionDate', event.target.value)} />
          </Field>
          <Field label="Parent / guardian" error={errors.guardianName}>
            <TextInput value={form.guardianName} onChange={(event) => set('guardianName', event.target.value)} />
          </Field>
          <Field label="Relationship">
            <SelectInput value={form.guardianRelation} onChange={(event) => set('guardianRelation', event.target.value)}>
              {RELATIONS.map((relation) => <option key={relation}>{relation}</option>)}
            </SelectInput>
          </Field>
          <Field label="Guardian phone" error={errors.guardianPhone}>
            <TextInput value={form.guardianPhone} onChange={(event) => set('guardianPhone', event.target.value)} placeholder="+232 …" />
          </Field>
          <Field label="Contact number" hint="Leave blank to use the guardian phone." error={errors.contact}>
            <TextInput value={form.contact} onChange={(event) => set('contact', event.target.value)} />
          </Field>
          <div className="span-2">
            <Field label="Address" error={errors.address}>
              <TextArea value={form.address} onChange={(event) => set('address', event.target.value)} />
            </Field>
          </div>
          <div className="span-2">
            <Field label="Student photo" hint="Optional. A photo stays in this browser and should be under 1 MB.">
              <div className="photo-row">
                <Avatar name={`${form.firstName} ${form.lastName}`.trim() || 'Student'} photo={form.photo} size={56} />
                <TextInput
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_200_000) {
                      notify('Choose a photo smaller than 1 MB.', 'warning');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') set('photo', reader.result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {form.photo ? <Button variant="ghost" onClick={() => set('photo', undefined)}>Remove</Button> : null}
              </div>
            </Field>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>{student ? 'Save changes' : 'Add student'}</Button>
      </div>
    </Modal>
  );
}
