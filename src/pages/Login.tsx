import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, Field, Modal, TextInput } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';

const REMEMBER_KEY = 'rvss-remember-email';

export function LoginPage() {
  const { session, settings, login } = useApp();
  const navigate = useNavigate();
  usePageTitle('Sign in');
  const remembered = localStorage.getItem(REMEMBER_KEY) ?? '';
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function signIn(nextEmail: string, nextPassword: string) {
    setError('');
    const problem = await login(nextEmail.trim(), nextPassword.trim());
    if (problem) {
      setError(problem);
      return;
    }
    if (remember) localStorage.setItem(REMEMBER_KEY, nextEmail);
    else localStorage.removeItem(REMEMBER_KEY);
    navigate('/');
  }

  return (
    <div className="login">
      <section className="login-aside">
        <div>
          <Logo light size={64} />
          <h1 style={{ marginTop: 18 }}>{settings.name}</h1>
          <p className="motto">{settings.motto}</p>
          {settings.campusImage ? (
            <figure className="campus-frame">
              <img src={settings.campusImage} alt={`${settings.shortName} campus`} />
            </figure>
          ) : null}
          <p style={{ marginTop: 18, maxWidth: '36ch' }}>
            One office for students, staff, attendance, examinations, fees, the timetable, and the library.
          </p>
        </div>
        <div>
          <p>{settings.address}</p>
          <p>{settings.phone}</p>
          <p className="small" style={{ marginTop: 16 }}>ICT exhibition · {settings.academicYear}</p>
        </div>
      </section>
      <section className="login-panel">
        <h1>Welcome back</h1>
        <p className="page-sub">Sign in to the school office.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            signIn(email.trim(), password.trim());
          }}
        >
          {error ? <p className="alert" role="alert">{error}</p> : null}
          <div className="stack">
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Password">
              <div className="password">
                <TextInput
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((value) => !value)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div className="cluster" style={{ justifyContent: 'space-between' }}>
              <label className="check">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Remember me
              </label>
              <button type="button" className="link" onClick={() => setForgot(true)}>Forgot password</button>
            </div>
            <Button type="submit">Sign in</Button>
          </div>
        </form>
      </section>
      <Modal open={forgot} title="Password help" onClose={() => setForgot(false)}>
        <div className="modal-body">
          <p>
            This demonstration does not send reset emails. Ask whoever set up the exhibition for the demo password, or use Reset demo data in Settings after signing in as an administrator.
          </p>
        </div>
        <div className="modal-foot">
          <Button onClick={() => setForgot(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
