import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  ChartBar,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PanelLeft,
  Presentation,
  Settings,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cx, initials } from '../lib/format';
import { canAccess, navGroups, navLabel, type ModuleId } from '../lib/permissions';
import { useApp } from '../state/store';
import { Logo } from './Logo';
import { NotificationMenu } from './NotificationMenu';
import { SearchBox } from './SearchBox';
import { ToastViewport } from './Toasts';

const ICONS: Record<ModuleId, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: GraduationCap,
  teachers: Presentation,
  attendance: CalendarCheck,
  examinations: ClipboardList,
  fees: Wallet,
  timetable: CalendarDays,
  library: Library,
  reports: ChartBar,
  settings: Settings,
  register: UserPlus,
};

function pathFor(moduleId: ModuleId, role: string, studentId?: string): string {
  if (moduleId === 'dashboard') return '/';
  if (moduleId === 'students' && (role === 'student' || role === 'parent') && studentId) return `/students/${studentId}`;
  return `/${moduleId}`;
}

function isCurrent(moduleId: ModuleId, pathname: string): boolean {
  if (moduleId === 'dashboard') return pathname === '/';
  if (moduleId === 'examinations') return pathname.startsWith('/examinations') || pathname.startsWith('/report-card');
  if (moduleId === 'students') return pathname.startsWith('/students');
  if (moduleId === 'teachers') return pathname.startsWith('/teachers');
  return pathname.startsWith(`/${moduleId}`);
}

export function Shell() {
  const { session } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  return <ShellFrame />;
}

function ShellFrame() {
  const { session, settings, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 960px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  if (!session) return null;
  const groups = navGroups(session.role);

  return (
    <div className={cx('shell', !narrow && collapsed && 'is-collapsed')}>
      <a className="skip" href="#content">Skip to content</a>
      {narrow && mobileOpen ? <button type="button" className="scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={cx('sidebar', narrow && mobileOpen && 'mobile-open')} inert={narrow && !mobileOpen ? true : undefined}>
        <div className="brand">
          <Logo light size={42} />
          <div className="brand-copy">
            <strong>{settings.shortName}</strong>
            <span>School office</span>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="nav-label">{group.group}</p>
              {group.items.map((item) => {
                const Icon = ICONS[item];
                const label = navLabel(session.role, item);
                const to = pathFor(item, session.role, session.studentId);
                return (
                  <NavLink
                    key={item}
                    to={to}
                    end={item === 'dashboard'}
                    className={() => cx('nav-link', isCurrent(item, location.pathname) && 'active')}
                    title={!narrow && collapsed ? label : undefined}
                    aria-current={isCurrent(item, location.pathname) ? 'page' : undefined}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p><strong>{settings.academicYear}</strong></p>
          <p>{settings.currentTerm}</p>
          <p>{settings.motto}</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>
          <button
            type="button"
            className="icon-btn desktop-only"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((value) => !value)}
          >
            <PanelLeft size={18} />
          </button>
          <SearchBox />
          <p className="year-pill">{settings.currentTerm} · {settings.academicYear}</p>
          <NotificationMenu />
          <div className="menu-wrap">
            <button type="button" className="profile-btn" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen((value) => !value)}>
              <span className="avatar" style={{ width: 36, height: 36 }} aria-hidden="true">{initials(session.name)}</span>
              <span>
                <strong>{session.name}</strong>
                <small>{session.roleLabel}</small>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {profileOpen ? (
              <div className="menu" role="menu">
                <div className="menu-item">
                  <strong>{session.roleLabel}</strong>
                  <span className="small">{session.email}</span>
                  <span className="small">Demonstration session · stored in this browser</span>
                </div>
                {canAccess(session.role, 'settings') ? (
                  <button type="button" className="menu-item" role="menuitem" onClick={() => navigate('/settings')}>Settings</button>
                ) : null}
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  <LogOut size={16} aria-hidden="true" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main id="content" className="content">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
