import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { Shell } from './components/Layout';
import { Restricted } from './components/Restricted';
import { EmptyState } from './components/ui';
import { applySchoolColours } from './lib/colours';
import { canAccess, type ModuleId } from './lib/permissions';
import { usePageTitle } from './lib/usePageTitle';
import { AttendancePage } from './pages/Attendance';
import { DashboardPage } from './pages/Dashboard';
import { ExaminationsPage } from './pages/Examinations';
import { FeesPage } from './pages/Fees';
import { LibraryPage } from './pages/Library';
import { LoginPage } from './pages/Login';
import { ReportCardPage } from './pages/ReportCard';
import { RegisterPage } from './pages/Register';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { StudentProfilePage } from './pages/StudentProfile';
import { StudentsPage } from './pages/Students';
import { TeacherProfilePage } from './pages/TeacherProfile';
import { TeachersPage } from './pages/Teachers';
import { TimetablePage } from './pages/Timetable';
import { useApp } from './state/store';

function Guard({ module, children }: { module: ModuleId; children: ReactNode }) {
  const { session } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess(session.role, module)) {
    return <Restricted text={`${session.roleLabel} access does not include this part of the system. Open an area assigned to this role from the menu.`} />;
  }
  return children;
}

function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="page">
      <EmptyState title="This page is not part of the system" text="The address does not match a school office screen." action={<a className="btn btn-primary" href="/">Go to dashboard</a>} />
    </div>
  );
}

function SchoolTheme() {
  const { settings } = useApp();
  applySchoolColours(settings.colours);
  return null;
}

function SchoolIcon() {
  const { settings } = useApp();
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (settings.logo) {
      link.href = settings.logo;
      link.type = settings.logo.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }, [settings.logo]);
  return null;
}

export function App() {
  return (
    <>
    <SchoolTheme />
    <SchoolIcon />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Shell />}>
          <Route index element={<Guard module="dashboard"><DashboardPage /></Guard>} />
          <Route path="students" element={<Guard module="students"><StudentsPage /></Guard>} />
          <Route path="students/:studentId" element={<Guard module="students"><StudentProfilePage /></Guard>} />
          <Route path="teachers" element={<Guard module="teachers"><TeachersPage /></Guard>} />
          <Route path="teachers/:teacherId" element={<Guard module="teachers"><TeacherProfilePage /></Guard>} />
          <Route path="attendance" element={<Guard module="attendance"><AttendancePage /></Guard>} />
          <Route path="examinations" element={<Guard module="examinations"><ExaminationsPage /></Guard>} />
          <Route path="report-card/:studentId" element={<Guard module="examinations"><ReportCardPage /></Guard>} />
          <Route path="fees" element={<Guard module="fees"><FeesPage /></Guard>} />
          <Route path="timetable" element={<Guard module="timetable"><TimetablePage /></Guard>} />
          <Route path="library" element={<Guard module="library"><LibraryPage /></Guard>} />
          <Route path="reports" element={<Guard module="reports"><ReportsPage /></Guard>} />
          <Route path="register" element={<Guard module="register"><RegisterPage /></Guard>} />
          <Route path="settings" element={<Guard module="settings"><SettingsPage /></Guard>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  );
}

export function AppRoot() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
