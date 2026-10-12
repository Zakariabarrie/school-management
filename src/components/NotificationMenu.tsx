import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatWhen } from '../lib/format';
import { canAccess, type ModuleId } from '../lib/permissions';
import { useApp } from '../state/store';
import type { AppNotification } from '../types';
import { cx } from '../lib/format';

function moduleFor(category: AppNotification['category']): ModuleId {
  switch (category) {
    case 'exam':
      return 'examinations';
    case 'fee':
      return 'fees';
    case 'attendance':
      return 'attendance';
    case 'library':
      return 'library';
    case 'student':
      return 'students';
  }
}

export function NotificationMenu() {
  const { state, session, markNotification, markAllNotifications } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = state.notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session) return null;

  function openNote(item: AppNotification) {
    markNotification(item.id);
    const moduleId = moduleFor(item.category);
    if (canAccess(session!.role, moduleId)) navigate(`/${moduleId === 'examinations' ? 'examinations' : moduleId}`);
    setOpen(false);
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unread > 0 ? <span className="count">{unread}</span> : null}
      </button>
      {open ? (
        <div className="menu" role="region" aria-label="Notifications">
          <div className="notes-head">
            <strong>Notifications</strong>
            <button type="button" className="link" onClick={markAllNotifications}>Mark all read</button>
          </div>
          {state.notifications.length === 0 ? <p className="search-hint">No notices yet.</p> : null}
          {state.notifications.map((item) => (
            <button key={item.id} type="button" className={cx('note', !item.read && 'note-unread')} onClick={() => openNote(item)}>
              <strong>{item.title}</strong>
              <span className="small">{item.message}</span>
              <span className="small">{formatWhen(item.time)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
