import { useState } from 'react';
import { Logo } from '../components/Logo';
import { Button, ConfirmDialog, Field, GradeScale, Modal, PageHeader, SelectInput, StatusBadge, TextInput } from '../components/ui';
import { INITIAL_DATA } from '../data/seed';
import { ASSESSMENT_KINDS, TERMS } from '../data/school';
import { assessmentProblem, calculationNote } from '../lib/assessments';
import { COLOUR_PRESETS, DEFAULT_COLOURS, isHexColour, mixColour, onColour, sameColours, schoolColours, type SchoolColours } from '../lib/colours';
import { fullName, nextNumberedId, uid } from '../lib/format';
import { imageProblem, prepareSchoolImage, type SchoolImageKind } from '../lib/images';
import { ROLE_LABELS, accountRoleChoices } from '../lib/permissions';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { AssessmentCategory, DemoUser, GradeBand, Role, SchoolSettings } from '../types';

export function SettingsPage() {
  const { state, session, settings, updateSettings, updateBranding, updateColours, addUser, updateUser, deleteUser, resetDemo, notify } = useApp();
  usePageTitle('Settings');
  const [form, setForm] = useState(settings);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<DemoUser | null>(null);
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null);
  const [account, setAccount] = useState({ name: '', email: '', password: 'demo123', role: 'teacher' as Role, teacherId: '', studentId: '', active: true });

  if (!session) return null;

  function applyImage(kind: SchoolImageKind, file: File | undefined) {
    if (!file) return;
    prepareSchoolImage(file, kind).then(
      (src) => {
        const patch = kind === 'logo' ? { logo: src } : { campusImage: src };
        setForm((current) => ({ ...current, ...patch }));
        updateBranding(patch);
      },
      (error: unknown) => notify(imageProblem(error), 'warning'),
    );
  }

  function clearImage(kind: SchoolImageKind) {
    setForm((current) => {
      const next: SchoolSettings = { ...current };
      if (kind === 'logo') delete next.logo;
      else delete next.campusImage;
      return next;
    });
    updateBranding(kind === 'logo' ? { logo: null } : { campusImage: null });
  }

  function applyColours(next: SchoolColours, quiet = false) {
    setForm((current) => ({ ...current, colours: next }));
    updateColours(next, quiet);
  }

  function saveSchool() {
    const problem = gradeProblem(form.grades) ?? assessmentProblem(form.assessments, form.calculationMethod);
    if (!form.name.trim() || !form.shortName.trim()) {
      setError('Enter the school name and short name.');
      return;
    }
    if (!Number.isFinite(form.passMark) || form.passMark < 0 || form.passMark > 100) {
      setError('The pass mark must be between 0 and 100.');
      return;
    }
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    updateSettings({
      ...form,
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      grades: form.grades.map((band) => ({ ...band, label: band.label.trim() })),
      assessments: form.assessments.map((item) => ({ ...item, name: item.name.trim() })),
    });
  }

  function updateCategory(index: number, patch: Partial<AssessmentCategory>) {
    setForm({
      ...form,
      assessments: form.assessments.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  }

  function openAccount(user?: DemoUser) {
    setEditingUser(user ?? null);
    setAccount({
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: user?.password ?? 'demo123',
      role: user?.role ?? 'libraryManager',
      teacherId: user?.teacherId ?? '',
      studentId: user?.studentId ?? '',
      active: user?.active !== false,
    });
    setAdding(true);
  }

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="School images, colours, profile, grading scale, and demonstration accounts. Changes stay in this browser." />
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <section className="card">
        <h2>School images</h2>
        <p className="small">The logo is used in the menu, on the sign-in page, on report cards, and as the browser icon. The campus photograph appears on the sign-in page and the dashboard.</p>
        <div className="brand-studio">
          <aside className="brand-preview" aria-label="Preview">
            <Logo light size={56} />
            <div>
              <strong>{form.shortName || 'School name'}</strong>
              <p className="motto">{form.motto || 'School motto'}</p>
            </div>
            {form.campusImage ? (
              <figure className="campus-frame">
                <img src={form.campusImage} alt="" />
              </figure>
            ) : (
              <div className="campus-placeholder">Campus photograph</div>
            )}
          </aside>
          <div className="brand-slots">
            <article className="image-slot">
              <div className="image-well">{form.logo ? <img src={form.logo} alt="" /> : <Logo size={72} />}</div>
              <div className="stack">
                <h3>School logo</h3>
                <p className="small">A crest or wordmark. It sits on a light plate so it stays clear on the dark menu.</p>
                <div className="cluster">
                  <label className="btn btn-secondary btn-sm file-btn">
                    {form.logo ? 'Change logo' : 'Choose logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="School logo file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        applyImage('logo', file);
                      }}
                    />
                  </label>
                  {form.logo ? <Button size="sm" variant="ghost" onClick={() => clearImage('logo')}>Restore crest</Button> : null}
                </div>
              </div>
            </article>
            <article className="image-slot">
              <div className="image-well is-photo">
                {form.campusImage ? <img src={form.campusImage} alt="" /> : <span>No photograph</span>}
              </div>
              <div className="stack">
                <h3>Campus photograph</h3>
                <p className="small">A wide picture of the school. It is cropped to fit the sign-in page and the dashboard banner.</p>
                <div className="cluster">
                  <label className="btn btn-secondary btn-sm file-btn">
                    {form.campusImage ? 'Change photograph' : 'Choose photograph'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Campus photograph file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        applyImage('campus', file);
                      }}
                    />
                  </label>
                  {form.campusImage ? <Button size="sm" variant="ghost" onClick={() => clearImage('campus')}>Remove</Button> : null}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      <ColourSettings colours={schoolColours(form.colours)} onChange={applyColours} />
      <div className="split" style={{ marginTop: 12 }}>
        <section className="card stack">
          <h2>School profile</h2>
          <Field label="School name"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Short name"><TextInput value={form.shortName} onChange={(event) => setForm({ ...form, shortName: event.target.value })} /></Field>
          <Field label="Motto"><TextInput value={form.motto} onChange={(event) => setForm({ ...form, motto: event.target.value })} /></Field>
          <Field label="Address"><TextInput value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Email"><TextInput value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Principal"><TextInput value={form.principal} onChange={(event) => setForm({ ...form, principal: event.target.value })} /></Field>
          <Field label="Academic year"><TextInput value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} /></Field>
          <Field label="Current term">
            <SelectInput value={form.currentTerm} onChange={(event) => setForm({ ...form, currentTerm: event.target.value })}>
              {TERMS.map((term) => <option key={term}>{term}</option>)}
            </SelectInput>
          </Field>
          <Button onClick={saveSchool}>Save settings</Button>
        </section>
        <section className="card stack">
          <h2>Grading scale</h2>
          <p className="small">Grades are calculated from these minimum marks everywhere in the system.</p>
          {form.grades.map((band, index) => (
            <div key={band.grade} className="cluster">
              <strong style={{ width: 24 }}>{band.grade}</strong>
              <TextInput aria-label={`${band.grade} description`} value={band.label} onChange={(event) => {
                const grades = form.grades.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item);
                setForm({ ...form, grades });
              }} />
              <TextInput aria-label={`${band.grade} minimum mark`} type="number" min={0} max={100} style={{ maxWidth: 90 }} value={band.min} onChange={(event) => {
                const grades = form.grades.map((item, itemIndex) => itemIndex === index ? { ...item, min: Number(event.target.value) } : item);
                setForm({ ...form, grades });
              }} />
            </div>
          ))}
          <GradeScale bands={form.grades} />
          <Field label="Pass mark (%)">
            <TextInput type="number" min={0} max={100} value={form.passMark} onChange={(event) => setForm({ ...form, passMark: Number(event.target.value) })} />
          </Field>
          <Field label="Calculation method">
            <SelectInput value={form.calculationMethod} onChange={(event) => setForm({ ...form, calculationMethod: event.target.value as typeof form.calculationMethod })}>
              <option value="simple">Simple total</option>
              <option value="weighted">Weighted categories</option>
            </SelectInput>
          </Field>
          <p className="small">{calculationNote(form.calculationMethod)} Missing required marks are not treated as zero.</p>
        </section>
      </div>
      <section className="card stack" style={{ marginTop: 12 }}>
        <h2>Assessment categories</h2>
        <p className="small">These categories apply to every class, subject, and term. Changing a maximum does not rewrite marks already entered.</p>
        {form.assessments.map((item, index) => (
          <div key={item.id} className="cluster">
            <TextInput aria-label={`${item.name} name`} value={item.name} onChange={(event) => updateCategory(index, { name: event.target.value })} />
            <SelectInput aria-label={`${item.name} type`} value={item.kind} onChange={(event) => updateCategory(index, { kind: event.target.value as AssessmentCategory['kind'] })}>
              {ASSESSMENT_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
            </SelectInput>
            <TextInput aria-label={`${item.name} maximum`} type="number" min={1} style={{ maxWidth: 90 }} value={item.maxMarks} onChange={(event) => updateCategory(index, { maxMarks: Number(event.target.value) })} />
            <TextInput aria-label={`${item.name} weight`} type="number" min={0} style={{ maxWidth: 90 }} value={item.weight} onChange={(event) => updateCategory(index, { weight: Number(event.target.value) })} />
            <label className="check"><input type="checkbox" checked={item.required} onChange={(event) => updateCategory(index, { required: event.target.checked })} /> Required</label>
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, assessments: form.assessments.filter((category) => category.id !== item.id) })}>Remove</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setForm({
          ...form,
          assessments: [...form.assessments, { id: uid('cat'), name: 'New assessment', kind: 'continuous', maxMarks: 10, weight: 0, required: false }],
        })}>Add category</Button>
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2>Demonstration accounts</h2>
          <Button onClick={() => openAccount()}>Add account</Button>
        </div>
        <p className="small">The administrator opens accounts for the Register, the Library Manager, Finance, teachers, and parents. The Register admits students and opens their sign-in. This list stays in this browser.</p>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">User accounts</caption>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Linked record</th><th>Action</th></tr></thead>
            <tbody>
              {state.users.map((user) => {
                const teacher = state.teachers.find((item) => item.id === user.teacherId);
                const student = state.students.find((item) => item.id === user.studentId);
                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><StatusBadge status={user.roleLabel} /></td>
                    <td><StatusBadge status={user.active === false ? 'Inactive' : 'Active'} /></td>
                    <td>{teacher ? fullName(teacher) : student ? fullName(student) : '—'}</td>
                    <td className="row-actions">
                      <Button size="sm" variant="secondary" onClick={() => openAccount(user)}>Edit</Button>
                      <Button size="sm" variant="ghost" disabled={user.id === session.userId} onClick={() => {
                        const message = updateUser({ ...user, active: user.active === false });
                        if (message) notify(message, 'warning');
                      }}>{user.active === false ? 'Restore' : 'Deactivate'}</Button>
                      <Button size="sm" variant="danger" disabled={user.id === session.userId} onClick={() => setPendingUser(user)}>Remove</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2>Reset demo data</h2>
        <p className="small">
          Removes your local demo edits and reloads the original fictional exhibition dataset in this browser only.
        </p>
        <Button variant="danger" onClick={() => setResetOpen(true)}>Reset demo data…</Button>
      </section>
      <Modal open={adding} title={editingUser ? 'Edit account' : 'Add demonstration account'} onClose={() => { setAdding(false); setEditingUser(null); }}>
        <div className="modal-body stack">
          <Field label="Name"><TextInput value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} /></Field>
          <Field label="Email"><TextInput type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} /></Field>
          <Field label="Password"><TextInput value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} /></Field>
          <Field label="Role">
            <SelectInput value={account.role} disabled={editingUser?.id === session.userId} onChange={(event) => setAccount({ ...account, role: event.target.value as Role })}>
              {accountRoleChoices(editingUser?.role ?? account.role).filter((role) => role !== 'student' || editingUser?.role === 'student').map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </SelectInput>
          </Field>
          {account.role === 'teacher' ? (
            <Field label="Teacher record">
              <SelectInput value={account.teacherId} onChange={(event) => setAccount({ ...account, teacherId: event.target.value })}>
                <option value="">Select</option>
                {state.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{fullName(teacher)}</option>)}
              </SelectInput>
            </Field>
          ) : null}
          {account.role === 'student' || account.role === 'parent' ? (
            <Field label="Student" hint={account.role === 'parent' ? 'Leave blank until the Register admits the student.' : undefined}>
              <SelectInput value={account.studentId} onChange={(event) => setAccount({ ...account, studentId: event.target.value })}>
                <option value="">{account.role === 'parent' ? 'Not linked yet' : 'Select'}</option>
                {state.students.map((student) => <option key={student.id} value={student.id}>{fullName(student)} · {student.className}</option>)}
              </SelectInput>
            </Field>
          ) : null}
          <label className="check"><input type="checkbox" checked={account.active} disabled={editingUser?.id === session.userId} onChange={(event) => setAccount({ ...account, active: event.target.checked })} /> Account can sign in</label>
        </div>
        <div className="modal-foot">
          <Button variant="ghost" onClick={() => { setAdding(false); setEditingUser(null); }}>Cancel</Button>
          <Button onClick={() => {
            void (async () => {
              if (!account.name.trim() || !account.email.includes('@') || account.password.trim().length < 4) {
                notify('Enter a name, a valid email, and a password of at least 4 characters.', 'danger');
                return;
              }
              if (account.role === 'teacher' && !account.teacherId) {
                notify('Choose the teacher record this account should open.', 'warning');
                return;
              }
              if (account.role === 'student' && !account.studentId) {
                notify('Choose the student this account should open.', 'warning');
                return;
              }
              const next: DemoUser = {
                id: editingUser?.id ?? nextNumberedId(state.users.map((user) => user.id), 'USR'),
                name: account.name.trim(),
                email: account.email.trim(),
                password: account.password,
                role: account.role,
                roleLabel: ROLE_LABELS[account.role],
                teacherId: account.role === 'teacher' ? account.teacherId : undefined,
                studentId: account.role === 'student' || account.role === 'parent' ? account.studentId : undefined,
                active: account.active,
              };
              const message = editingUser ? updateUser(next) : await addUser(next);
              if (message) {
                notify(message, 'danger');
                return;
              }
              setAdding(false);
              setEditingUser(null);
            })();
          }}>{editingUser ? 'Save account' : 'Add account'}</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!pendingUser}
        title="Remove account"
        message={pendingUser ? `Remove ${pendingUser.name} from the demonstration sign-in list?` : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setPendingUser(null)}
        onConfirm={() => {
          if (!pendingUser) return;
          const message = deleteUser(pendingUser.id);
          if (message) notify(message, 'danger');
          setPendingUser(null);
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Reset demo data?"
        message="This clears local demo storage and restores the original fictional sample data. Your sign-in stays active. Continue?"
        confirmLabel="Reset demo data"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo();
          setForm(structuredClone(INITIAL_DATA.settings));
          setResetOpen(false);
        }}
      />
    </div>
  );
}

const COLOUR_GROUPS: { title: string; fields: { key: keyof SchoolColours; label: string; hint: string }[] }[] = [
  {
    title: 'School',
    fields: [
      { key: 'menu', label: 'Menu', hint: 'Sidebar, sign-in panel, and dashboard banner' },
      { key: 'button', label: 'Buttons', hint: 'Primary buttons and links' },
      { key: 'highlight', label: 'Highlight', hint: 'Steps, charts, and secondary buttons' },
      { key: 'page', label: 'Page', hint: 'Background behind the cards' },
      { key: 'card', label: 'Cards', hint: 'Panels, tables, and forms' },
    ],
  },
  {
    title: 'Text',
    fields: [
      { key: 'text', label: 'Text', hint: 'Headings and body text' },
      { key: 'muted', label: 'Secondary text', hint: 'Hints, labels, and dates' },
      { key: 'line', label: 'Borders', hint: 'Lines around cards and tables' },
    ],
  },
  {
    title: 'Status',
    fields: [
      { key: 'success', label: 'Success', hint: 'Paid, present, and active' },
      { key: 'warning', label: 'Warning', hint: 'Sick, partial, and on leave' },
      { key: 'danger', label: 'Danger', hint: 'Absent, overdue, and outstanding' },
    ],
  },
];

function ColourSettings({ colours, onChange }: { colours: SchoolColours; onChange: (next: SchoolColours, quiet?: boolean) => void }) {
  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="dash-card-head">
        <h2>School colours</h2>
        <Button size="sm" variant="ghost" disabled={sameColours(colours, DEFAULT_COLOURS)} onClick={() => onChange(DEFAULT_COLOURS)}>Restore original colours</Button>
      </div>
      <p className="small">These colours cover the menu, pages, text, charts, and status marks. A change shows across the school office.</p>
      <div className="colour-studio">
        <aside className="colour-preview" style={{ background: colours.page, color: colours.text }} aria-label="Colour preview">
          <div className="colour-menu" style={{ background: `linear-gradient(145deg, ${colours.menu}, ${mixColour(colours.menu, '#ffffff', 0.16)})`, color: onColour(colours.menu, colours.text) }}>
            <i style={{ background: colours.highlight }} />
            Menu
          </div>
          <div className="colour-preview-body" style={{ background: colours.card, borderTop: `1px solid ${colours.line}` }}>
            <strong>School text</strong>
            <span className="small" style={{ color: colours.muted }}>Secondary text</span>
            <span className="btn btn-sm" style={{ background: colours.button, color: onColour(colours.button, colours.text) }}>Button</span>
            <span className="colour-chip" style={{ background: mixColour(colours.highlight, '#ffffff', 0.86), color: colours.highlight }}>Highlight</span>
            <span className="colour-chip" style={{ background: mixColour(colours.success, '#ffffff', 0.86), color: colours.success }}>Paid</span>
            <span className="colour-chip" style={{ background: mixColour(colours.warning, '#ffffff', 0.86), color: colours.warning }}>Sick</span>
            <span className="colour-chip" style={{ background: mixColour(colours.danger, '#ffffff', 0.86), color: colours.danger }}>Absent</span>
          </div>
        </aside>
        <div className="stack">
          <div className="preset-row" role="group" aria-label="Colour presets">
            {COLOUR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={sameColours(colours, preset.colours) ? 'preset is-current' : 'preset'}
                aria-pressed={sameColours(colours, preset.colours)}
                onClick={() => onChange(preset.colours)}
              >
                <span className="preset-dots" aria-hidden="true">
                  <i style={{ background: preset.colours.menu }} />
                  <i style={{ background: preset.colours.button }} />
                  <i style={{ background: preset.colours.highlight }} />
                  <i style={{ background: preset.colours.success }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
          {COLOUR_GROUPS.map((group) => (
            <div key={group.title} className="colour-group">
              <h3>{group.title}</h3>
              <div className="colour-grid">
                {group.fields.map((field) => (
                  <label key={field.key} className="colour-field">
                    <span>{field.label}</span>
                    <span className="colour-control">
                      <input
                        type="color"
                        aria-label={`${field.label} colour`}
                        value={colours[field.key]}
                        onChange={(event) => {
                          if (!isHexColour(event.target.value)) return;
                          onChange({ ...colours, [field.key]: event.target.value }, true);
                        }}
                      />
                      <TextInput
                        key={colours[field.key]}
                        aria-label={`${field.label} hex`}
                        defaultValue={colours[field.key]}
                        spellCheck={false}
                        onChange={(event) => {
                          const value = event.target.value.trim();
                          if (isHexColour(value)) onChange({ ...colours, [field.key]: value.toLowerCase() }, true);
                        }}
                        onBlur={(event) => {
                          if (!isHexColour(event.currentTarget.value.trim())) event.currentTarget.value = colours[field.key];
                        }}
                      />
                    </span>
                    <span className="small">{field.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function gradeProblem(bands: GradeBand[]): string | null {
  if (bands.some((band) => band.label.trim() === '')) return 'Each grade needs a description.';
  if (bands.some((band) => !Number.isFinite(band.min) || band.min < 0 || band.min > 100)) return 'Each minimum mark must be between 0 and 100.';
  if (!bands.some((band) => band.min === 0)) return 'One grade must start at 0 so every score has a grade.';
  if (new Set(bands.map((band) => band.min)).size !== bands.length) return 'Each grade needs a different minimum mark.';
  return null;
}
