import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar, Button, ConfirmDialog, Field, PageHeader, SelectInput, StatusBadge, TextArea, TextInput } from '../components/ui';
import { CLASSES, DEMO_PASSWORD, GENDERS, RELATIONS, STUDENT_STATUSES, TERM_FEE } from '../data/school';
import { digitsOnly, formatDate, formatMoney, fullName, nextNumberedId, todayISO } from '../lib/format';
import { ACCOUNT_ROLES, ROLE_LABELS, accountRoleChoices } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { DemoUser, Gender, Role, Student, StudentStatus } from '../types';

type RoleGlyph = 'register' | 'library' | 'finance' | 'teacher' | 'parent';

function RoleIcon({ glyph }: { glyph: RoleGlyph }) {
  return (
    <svg className="role-glyph" viewBox="0 0 24 24" aria-hidden="true">
      {glyph === 'register' && (
        <>
          <circle cx="9" cy="8" r="2.35" />
          <path d="M4.2 18.4v-1a4.6 4.6 0 0 1 8.3-2.7" />
          <path d="M16.2 9.2v5.6" />
          <path d="M13.4 12h5.6" />
        </>
      )}
      {glyph === 'library' && (
        <>
          <path d="M12 6.2C10.3 5.2 8.4 4.8 5.5 4.8v13.2c2.9 0 4.8.4 6.5 1.4 1.7-1 3.6-1.4 6.5-1.4V4.8c-2.9 0-4.8.4-6.5 1.4z" />
          <path d="M12 6.2v13.2" />
        </>
      )}
      {glyph === 'finance' && (
        <>
          <ellipse cx="12" cy="7.1" rx="6.2" ry="2.15" />
          <path d="M5.8 7.1v3.8c0 1.2 2.8 2.15 6.2 2.15s6.2-.95 6.2-2.15V7.1" />
          <path d="M5.8 10.9v3.8c0 1.2 2.8 2.15 6.2 2.15s6.2-.95 6.2-2.15v-3.8" />
        </>
      )}
      {glyph === 'teacher' && (
        <>
          <path d="M3.2 10.4 12 6.2l8.8 4.2L12 14.6 3.2 10.4z" />
          <path d="M7.1 12.4v3c0 .9 2.1 2.4 4.9 2.4s4.9-1.5 4.9-2.4v-3" />
          <path d="M20.8 10.4v4.8" />
        </>
      )}
      {glyph === 'parent' && (
        <>
          <circle cx="16.2" cy="8.4" r="1.85" />
          <path d="M19.7 16.4v-.4a3.3 3.3 0 0 0-3.1-2.3" />
          <circle cx="9" cy="9.2" r="2.25" />
          <path d="M4.1 18.7v-.7a4.7 4.7 0 0 1 9.4 0v.7" />
        </>
      )}
    </svg>
  );
}

const ROLE_CARDS: { role: Role; hint: string; glyph: RoleGlyph; tone: string }[] = [
  { role: 'register', hint: 'Admits students and opens their sign-in.', glyph: 'register', tone: 'register' },
  { role: 'libraryManager', hint: 'Books, loans, and returns only.', glyph: 'library', tone: 'library' },
  { role: 'registrar', hint: 'Fees and payments only.', glyph: 'finance', tone: 'finance' },
  { role: 'teacher', hint: 'Classes, attendance, and marks.', glyph: 'teacher', tone: 'teacher' },
  { role: 'parent', hint: 'A read-only view of one student.', glyph: 'parent', tone: 'parent' },
];

interface StaffDraft {
  name: string;
  email: string;
  password: string;
  role: Role;
  teacherId: string;
  studentId: string;
  active: boolean;
}

interface AdmissionDraft {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender | '';
  dateOfBirth: string;
  placeOfBirth: string;
  className: string;
  previousSchool: string;
  address: string;
  admissionDate: string;
  status: StudentStatus;
  photo?: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  contact: string;
  parentUserId: string;
  email: string;
  password: string;
}

function blankStaff(role: Role = 'register'): StaffDraft {
  return { name: '', email: '', password: DEMO_PASSWORD, role, teacherId: '', studentId: '', active: true };
}

function blankAdmission(id: string): AdmissionDraft {
  return {
    id,
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    className: 'JSS 1',
    previousSchool: '',
    address: '',
    admissionDate: todayISO(),
    status: 'Active',
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
    contact: '',
    parentUserId: '',
    email: '',
    password: DEMO_PASSWORD,
  };
}

function suggestEmail(firstName: string, lastName: string): string {
  const slug = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]+/g, '').replace(/^\.+|\.+$/g, '');
  return slug.length > 1 ? `${slug}@rokelvalley.edu.sl` : '';
}

export function RegisterPage() {
  const { session } = useApp();
  usePageTitle('Register');
  if (!session) return null;
  if (session.role === 'register') return <StudentAdmission />;
  return <StaffRegistration />;
}

function accountRemovalMessage(user: DemoUser): string {
  if (user.role === 'teacher') return `Remove ${user.name}'s sign-in? The teaching record stays on the Teachers page.`;
  if (user.role === 'parent') return `Remove ${user.name}'s sign-in? The student's school record stays on the roll.`;
  return `Remove ${user.name} from the staff register? This person will no longer be able to sign in.`;
}

function StaffRegistration() {
  const { state, session, addUser, updateUser, deleteUser, notify } = useApp();
  const [editing, setEditing] = useState<DemoUser | null>(null);
  const [account, setAccount] = useState<StaffDraft>(() => blankStaff());
  const [pendingUser, setPendingUser] = useState<DemoUser | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  if (!session) return null;

  const people = state.users.filter((user) => ACCOUNT_ROLES.includes(user.role));
  const studentText = studentQuery.trim().toLowerCase();
  const admissions = [...state.students]
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
    .filter((student) => !studentText || `${fullName(student)} ${student.id} ${student.className} ${student.guardianName}`.toLowerCase().includes(studentText));

  function begin(role: Role) {
    setEditing(null);
    setAccount(blankStaff(role));
  }

  function edit(user: DemoUser) {
    setEditing(user);
    setAccount({
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      teacherId: user.teacherId ?? '',
      studentId: user.studentId ?? '',
      active: user.active !== false,
    });
  }

  async function save() {
    if (!account.name.trim() || !account.email.includes('@') || account.password.trim().length < 4) {
      notify('Enter a name, a valid email, and a password of at least 4 characters.', 'danger');
      return;
    }
    if (account.role === 'teacher' && !account.teacherId) {
      notify('Choose the teacher record this account should open. Add the teacher on the Teachers page first.', 'warning');
      return;
    }
    if (account.role === 'student' && !account.studentId) {
      notify('The Register admits students. Choose a student only when editing an existing student sign-in.', 'warning');
      return;
    }
    const next: DemoUser = {
      id: editing?.id ?? nextNumberedId(state.users.map((user) => user.id), 'USR'),
      name: account.name.trim(),
      email: account.email.trim(),
      password: account.password,
      role: account.role,
      roleLabel: ROLE_LABELS[account.role],
      teacherId: account.role === 'teacher' ? account.teacherId : undefined,
      studentId: account.role === 'parent' || account.role === 'student' ? account.studentId || undefined : undefined,
      active: account.active,
    };
    if (editing) {
      const message = updateUser(next);
      if (message) {
        notify(message, 'danger');
        return;
      }
    } else {
      const message = await addUser(next);
      if (message) {
        notify(message, 'danger');
        return;
      }
    }
    begin(account.role);
  }

  return (
    <div className="page">
      <PageHeader
        title="Register"
        subtitle="Open a sign-in for the Register, the Library Manager, Finance, a teacher, or a parent. The Register admits each student."
      />
      <div className="role-picks" role="group" aria-label="Account to open">
        {ROLE_CARDS.map(({ role, hint, glyph, tone }) => {
          const count = state.users.filter((user) => user.role === role).length;
          const selected = account.role === role;
          return (
            <button key={role} type="button" className={selected && !editing ? 'role-pick is-current' : 'role-pick'} aria-pressed={selected} onClick={() => begin(role)}>
              <span className={`role-mark role-mark-${tone}`} aria-hidden="true"><RoleIcon glyph={glyph} /></span>
              <strong>{ROLE_LABELS[role]}</strong>
              <span className="sr-only">{hint}</span>
              <small>{count} {count === 1 ? 'account' : 'accounts'}</small>
            </button>
          );
        })}
      </div>
      <div className="register-layout">
        <section className="card">
          <p className="dash-kicker">{editing ? 'Edit sign-in' : 'New sign-in'}</p>
          <h2>{editing ? editing.name : ROLE_LABELS[account.role]}</h2>
          <p className="small">{ROLE_CARDS.find((item) => item.role === account.role)?.hint} The demonstration password can stay {DEMO_PASSWORD}.</p>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <Field label="Full name">
              <TextInput value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} placeholder="name@rokelvalley.edu.sl" />
            </Field>
            {editing ? (
              <Field label="Role">
                <SelectInput value={account.role} disabled={editing.id === session.userId} onChange={(event) => setAccount({ ...account, role: event.target.value as Role, teacherId: '', studentId: '' })}>
                  {accountRoleChoices(editing.role).filter((role) => role !== 'student' || editing.role === 'student').map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </SelectInput>
              </Field>
            ) : null}
            <Field label="Password">
              <TextInput value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} />
            </Field>
            <label className="check register-check">
              <input type="checkbox" checked={account.active} disabled={editing?.id === session.userId} onChange={(event) => setAccount({ ...account, active: event.target.checked })} /> Account can sign in
            </label>
            {account.role === 'teacher' ? (
              <div className="span-2">
                <Field label="Teacher record" hint="The teaching record is added on the Teachers page, then linked here.">
                  <SelectInput value={account.teacherId} onChange={(event) => setAccount({ ...account, teacherId: event.target.value })}>
                    <option value="">Select a teacher</option>
                    {state.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{fullName(teacher)} · {teacher.subjects[0]}</option>)}
                  </SelectInput>
                </Field>
              </div>
            ) : null}
            {account.role === 'parent' ? (
              <div className="span-2">
                <Field label="Student" hint="Leave this blank until the Register admits the student, then link them.">
                  <SelectInput value={account.studentId} onChange={(event) => setAccount({ ...account, studentId: event.target.value })}>
                    <option value="">Not linked yet</option>
                    {state.students.map((student) => <option key={student.id} value={student.id}>{fullName(student)} · {student.className}</option>)}
                  </SelectInput>
                </Field>
              </div>
            ) : null}
          </div>
          <div className="register-actions">
            <Button onClick={save}>{editing ? 'Save account' : 'Open account'}</Button>
            {editing ? <Button variant="ghost" onClick={() => begin(account.role)}>Cancel</Button> : null}
            {account.role === 'teacher' ? <Link className="btn btn-secondary" to="/teachers">Teachers page</Link> : null}
            {editing && editing.id !== session.userId ? <Button className="push" variant="danger" onClick={() => setPendingUser(editing)}>Remove account</Button> : null}
          </div>
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Staff and parent accounts</h2>
        <p className="small">Remove takes away the sign-in only. A teacher record or a student record stays in the school.</p>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Staff and parent accounts</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Linked record</th><th scope="col">Access</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {people.map((user) => {
                const teacher = state.teachers.find((item) => item.id === user.teacherId);
                const student = state.students.find((item) => item.id === user.studentId);
                return (
                  <tr key={user.id}>
                    <td>
                      <span className="register-person">
                        <strong>{user.name}</strong>
                        <span className="small">{user.email}</span>
                      </span>
                    </td>
                    <td><StatusBadge status={user.roleLabel} /></td>
                    <td>{teacher ? fullName(teacher) : student ? fullName(student) : '—'}</td>
                    <td><StatusBadge status={user.active === false ? 'Inactive' : 'Active'} /></td>
                    <td>
                      <div className="row-actions">
                        <Button size="sm" variant="secondary" onClick={() => edit(user)}>Edit</Button>
                        <Button size="sm" variant="danger" disabled={user.id === session.userId} onClick={() => setPendingUser(user)}>Remove</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="register-tools">
          <h2>Admissions</h2>
          <TextInput className="grow" placeholder="Search name, ID, class, or guardian" aria-label="Search admissions" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} />
          <span className="small">{admissions.length} {admissions.length === 1 ? 'student' : 'students'} · view only</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Admitted students</caption>
            <thead><tr><th scope="col">Student ID</th><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Guardian</th><th scope="col">Admitted</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {admissions.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td><Link className="link" to={`/students/${student.id}`}>{fullName(student)}</Link></td>
                  <td>{student.className}</td>
                  <td>{student.guardianName}</td>
                  <td>{formatDate(student.admissionDate)}</td>
                  <td><StatusBadge status={student.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {admissions.length === 0 ? <p className="muted">No student matches that search.</p> : null}
      </section>
      <ConfirmDialog
        open={!!pendingUser}
        title="Remove account"
        message={pendingUser ? accountRemovalMessage(pendingUser) : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setPendingUser(null)}
        onConfirm={() => {
          if (!pendingUser) return;
          const message = deleteUser(pendingUser.id);
          if (message) notify(message, 'danger');
          else if (editing?.id === pendingUser.id) begin(account.role);
          setPendingUser(null);
        }}
      />
    </div>
  );
}

function StudentAdmission() {
  const { state, addStudent, updateStudent, deleteStudent, addUser, updateUser, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const editId = params.get('edit');
  const emailTouched = useRef(false);
  const loadedEdit = useRef<string | null>(null);
  const [form, setForm] = useState<AdmissionDraft>(() => blankAdmission(nextNumberedId(state.students.map((student) => student.id), 'STU-2026')));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Student | null>(null);
  const [rollQuery, setRollQuery] = useState('');
  const editing = state.students.find((student) => student.id === editId) ?? null;

  useEffect(() => {
    if (!editId) {
      loadedEdit.current = null;
      return;
    }
    if (loadedEdit.current === editId) return;
    const student = state.students.find((item) => item.id === editId);
    if (!student) return;
    loadedEdit.current = editId;
    const login = state.users.find((user) => user.role === 'student' && user.studentId === student.id);
    const parent = state.users.find((user) => user.role === 'parent' && user.studentId === student.id);
    emailTouched.current = true;
    setForm({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth ?? '',
      className: student.className,
      previousSchool: student.previousSchool ?? '',
      address: student.address,
      admissionDate: student.admissionDate,
      status: student.status,
      photo: student.photo,
      guardianName: student.guardianName,
      guardianRelation: student.guardianRelation,
      guardianPhone: student.guardianPhone,
      contact: student.contact,
      parentUserId: parent?.id ?? '',
      email: login?.email ?? '',
      password: login?.password ?? DEMO_PASSWORD,
    });
    setErrors({});
  }, [editId, state.students, state.users]);

  function set<K extends keyof AdmissionDraft>(key: K, value: AdmissionDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setName(key: 'firstName' | 'lastName', value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!emailTouched.current && !editId) {
        next.email = suggestEmail(key === 'firstName' ? value : current.firstName, key === 'lastName' ? value : current.lastName);
      }
      return next;
    });
  }

  function startNew() {
    emailTouched.current = false;
    setErrors({});
    setParams({}, { replace: true });
    setForm(blankAdmission(nextNumberedId(state.students.map((student) => student.id), 'STU-2026')));
  }

  async function save() {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'Enter the first name.';
    if (!form.lastName.trim()) next.lastName = 'Enter the surname.';
    if (!form.gender) next.gender = 'Select a gender.';
    if (!form.dateOfBirth) next.dateOfBirth = 'Enter the date of birth.';
    if (!form.className) next.className = 'Select a class.';
    if (!form.address.trim()) next.address = 'Enter the address.';
    if (!form.admissionDate) next.admissionDate = 'Enter the admission date.';
    if (!form.guardianName.trim()) next.guardianName = 'Enter the parent or guardian.';
    if (digitsOnly(form.guardianPhone).length < 7) next.guardianPhone = 'Enter a usable phone number.';
    if (form.contact.trim() && digitsOnly(form.contact).length < 7) next.contact = 'Enter a usable contact number.';
    if (!form.email.includes('@')) next.email = 'Enter the student sign-in email.';
    if (form.password.trim().length < 4) next.password = 'Use at least 4 characters.';
    const parent = state.users.find((user) => user.id === form.parentUserId);
    if (parent?.studentId && parent.studentId !== form.id) next.parentUserId = 'That parent account is already linked to another student.';
    const emailTaken = state.users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase() && !(user.role === 'student' && user.studentId === form.id));
    if (emailTaken) next.email = 'That email is already used by another account.';
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
      placeOfBirth: form.placeOfBirth.trim() || undefined,
      previousSchool: form.previousSchool.trim() || undefined,
      photo: form.photo,
    };
    const existingLogin = state.users.find((user) => user.role === 'student' && user.studentId === record.id);
    const login: DemoUser = {
      id: existingLogin?.id ?? nextNumberedId(state.users.map((user) => user.id), 'USR'),
      name: fullName(record),
      email: form.email.trim(),
      password: form.password,
      role: 'student',
      roleLabel: 'Student',
      studentId: record.id,
      active: existingLogin?.active !== false,
    };
    if (!existingLogin) {
      const loginMessage = await addUser(login);
      if (loginMessage) {
        notify(loginMessage, 'danger');
        return;
      }
    }
    if (editing) updateStudent(record);
    else addStudent(record);
    if (existingLogin) {
      const loginMessage = updateUser(login);
      if (loginMessage) {
        notify(loginMessage, 'danger');
        return;
      }
    }

    for (const user of state.users) {
      if (user.role !== 'parent' || user.studentId !== record.id || user.id === parent?.id) continue;
      updateUser({ ...user, studentId: undefined });
    }
    if (parent) updateUser({ ...parent, studentId: record.id });

    if (editing) notify('Admission updated in this browser.');
    else {
      notify(`${fullName(record)} is admitted to ${record.className}.`);
      emailTouched.current = false;
      setParams({}, { replace: true });
      setForm(blankAdmission(nextNumberedId([...state.students.map((student) => student.id), record.id], 'STU-2026')));
      setErrors({});
    }
  }

  const rollText = rollQuery.trim().toLowerCase();
  const roll = [...state.students]
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate) || a.id.localeCompare(b.id))
    .filter((student) => !rollText || `${fullName(student)} ${student.id} ${student.className} ${student.guardianName}`.toLowerCase().includes(rollText));
  const parents = state.users.filter((user) => user.role === 'parent');
  const selectedParent = parents.find((user) => user.id === form.parentUserId);
  const linkedStudent = selectedParent?.studentId ? state.students.find((student) => student.id === selectedParent.studentId) : undefined;

  return (
    <div className="page">
      <PageHeader
        title={editing ? `Update ${fullName(editing)}` : 'Admit a student'}
        subtitle="Record the student, the parent or guardian, and the student sign-in. Staff and parent accounts are opened by the administrator."
        actions={editing ? <Button variant="ghost" onClick={startNew}>New admission</Button> : undefined}
      />
      <div className="register-layout">
        <section className="card">
          <div className="register-section">
            <h3>Student</h3>
            <div className="form-grid">
              <Field label="Student ID"><TextInput value={form.id} readOnly /></Field>
              <Field label="Status">
                <SelectInput value={form.status} onChange={(event) => set('status', event.target.value as StudentStatus)}>
                  {STUDENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </SelectInput>
              </Field>
              <Field label="First name" error={errors.firstName}>
                <TextInput value={form.firstName} aria-invalid={!!errors.firstName} onChange={(event) => setName('firstName', event.target.value)} />
              </Field>
              <Field label="Surname" error={errors.lastName}>
                <TextInput value={form.lastName} aria-invalid={!!errors.lastName} onChange={(event) => setName('lastName', event.target.value)} />
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
              <Field label="Place of birth" hint="Optional.">
                <TextInput value={form.placeOfBirth} onChange={(event) => set('placeOfBirth', event.target.value)} />
              </Field>
              <Field label="Previous school" hint="Optional.">
                <TextInput value={form.previousSchool} onChange={(event) => set('previousSchool', event.target.value)} />
              </Field>
              <div className="span-2">
                <Field label="Address" error={errors.address}>
                  <TextArea value={form.address} onChange={(event) => set('address', event.target.value)} />
                </Field>
              </div>
              <div className="span-2">
                <Field label="Photograph" hint="Optional. Keep it under 1 MB. It stays in this browser.">
                  <div className="photo-row">
                    <Avatar name={`${form.firstName} ${form.lastName}`.trim() || 'Student'} photo={form.photo} size={56} />
                    <TextInput
                      type="file"
                      accept="image/*"
                      aria-label="Student photograph"
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
          <div className="register-section">
            <h3>Admission</h3>
            <div className="form-grid">
              <Field label="Class" error={errors.className}>
                <SelectInput value={form.className} onChange={(event) => set('className', event.target.value)}>
                  {CLASSES.map((item) => <option key={item.name}>{item.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Admission date" error={errors.admissionDate}>
                <TextInput type="date" value={form.admissionDate} onChange={(event) => set('admissionDate', event.target.value)} />
              </Field>
            </div>
          </div>
          <div className="register-section">
            <h3>Parent or guardian</h3>
            <div className="form-grid">
              <div className="span-2">
                <Field label="Parent account" hint="Choose a parent the administrator has already opened, or leave this blank and record the guardian below." error={errors.parentUserId}>
                  <SelectInput value={form.parentUserId} aria-invalid={!!errors.parentUserId} onChange={(event) => {
                    const parentUserId = event.target.value;
                    const parent = parents.find((user) => user.id === parentUserId);
                    setForm((current) => ({
                      ...current,
                      parentUserId,
                      guardianName: current.guardianName.trim() ? current.guardianName : parent?.name ?? '',
                    }));
                  }}>
                    <option value="">No parent sign-in yet</option>
                    {parents.map((parent) => {
                      const linked = state.students.find((student) => student.id === parent.studentId);
                      const note = linked && linked.id !== form.id ? ` · linked to ${fullName(linked)}` : '';
                      return <option key={parent.id} value={parent.id}>{parent.name}{note}</option>;
                    })}
                  </SelectInput>
                </Field>
              </div>
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
              <Field label="Student contact" hint="Leave blank to use the guardian phone." error={errors.contact}>
                <TextInput value={form.contact} onChange={(event) => set('contact', event.target.value)} />
              </Field>
            </div>
          </div>
          <div className="register-section">
            <h3>Student sign-in</h3>
            <div className="form-grid">
              <Field label="Email" error={errors.email}>
                <TextInput type="email" value={form.email} aria-invalid={!!errors.email} onChange={(event) => { emailTouched.current = true; set('email', event.target.value); }} />
              </Field>
              <Field label="Password" error={errors.password}>
                <TextInput value={form.password} onChange={(event) => set('password', event.target.value)} />
              </Field>
            </div>
          </div>
          <div className="register-actions">
            <Button onClick={save}>{editing ? 'Save admission' : 'Admit a student'}</Button>
            {editing ? <Button variant="ghost" onClick={startNew}>Cancel</Button> : null}
            {editing ? <Button className="push" variant="danger" onClick={() => setPending(editing)}>Remove student</Button> : null}
          </div>
        </section>
        <aside className="card register-note">
          <h2>This admission</h2>
          <dl className="register-summary">
            <div><dt>Student</dt><dd>{`${form.firstName} ${form.lastName}`.trim() || 'Not named yet'}</dd></div>
            <div><dt>Class</dt><dd>{form.className || '—'}</dd></div>
            <div><dt>Parent account</dt><dd>{selectedParent ? selectedParent.name : 'Not linked'}</dd></div>
            <div><dt>Sign-in</dt><dd>{form.email || '—'}</dd></div>
          </dl>
          {linkedStudent && linkedStudent.id !== form.id ? <p className="alert">This parent account already opens {fullName(linkedStudent)}.</p> : null}
          <p className="small">Admitting a student opens a {formatMoney(TERM_FEE)} fee account for {state.settings.currentTerm}. Finance records the payments.</p>
        </aside>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="register-tools">
          <h2>Admissions</h2>
          <TextInput className="grow" placeholder="Search name, ID, class, or guardian" aria-label="Search admissions" value={rollQuery} onChange={(event) => setRollQuery(event.target.value)} />
          <Link className="link" to="/students">Student roll</Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Admissions</caption>
            <thead><tr><th scope="col">Student ID</th><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Guardian</th><th scope="col">Admitted</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {roll.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{fullName(student)}</td>
                  <td>{student.className}</td>
                  <td>{student.guardianName}</td>
                  <td>{formatDate(student.admissionDate)}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-ghost btn-sm" to={`/register?edit=${student.id}`}>Update</Link>
                      <Button size="sm" variant="danger" onClick={() => setPending(student)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {roll.length === 0 ? <p className="muted">No student matches that search.</p> : null}
      </section>
      <ConfirmDialog
        open={!!pending}
        title="Remove student"
        message={pending ? `Remove ${fullName(pending)} from the register? The student sign-in and fee account go with the record. A linked parent sign-in stays.` : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          deleteStudent(pending.id);
          const remaining = state.students.filter((student) => student.id !== pending.id);
          const nextId = nextNumberedId(remaining.map((student) => student.id), 'STU-2026');
          const draftIsEmpty = !form.firstName.trim() && !form.lastName.trim() && !form.guardianName.trim();
          if (editId === pending.id || (!editId && (form.id === pending.id || (draftIsEmpty && form.id !== nextId)))) {
            emailTouched.current = false;
            loadedEdit.current = null;
            setErrors({});
            setParams({}, { replace: true });
            setForm(blankAdmission(nextId));
          }
          setPending(null);
        }}
      />
    </div>
  );
}
