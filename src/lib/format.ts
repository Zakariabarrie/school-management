import type { DayName } from '../types';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

export function withTitle(person: { title?: string; firstName: string; lastName: string }): string {
  return [person.title, person.firstName, person.lastName].filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter((part) => part && !['Mrs.', 'Mr.', 'Ms.', 'Dr.'].includes(part))
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function formatMoney(value: number): string {
  return `SLE ${Math.round(value).toLocaleString('en-GB')}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-GB');
}

export function formatAverage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

function parts(iso: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function formatDate(iso: string): string {
  const value = parts(iso);
  if (!value) return iso;
  return new Date(value.y, value.m - 1, value.d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLongDate(iso: string): string {
  const value = parts(iso);
  if (!value) return iso;
  return new Date(value.y, value.m - 1, value.d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return `Today, ${time}`;
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const value = parts(iso);
  if (!value) return iso;
  const date = new Date(value.y, value.m - 1, value.d);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isWeekend(iso: string): boolean {
  const value = parts(iso);
  if (!value) return false;
  const day = new Date(value.y, value.m - 1, value.d).getDay();
  return day === 0 || day === 6;
}

export function weekdayName(iso: string): DayName | null {
  const value = parts(iso);
  if (!value) return null;
  const day = new Date(value.y, value.m - 1, value.d).getDay();
  const names: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (day < 1 || day > 5) return null;
  return names[day - 1] ?? null;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function ordinal(position: number): string {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

export function shortSubject(subject: string): string {
  if (subject === 'English Language') return 'English';
  if (subject === 'Integrated Science') return 'Science';
  if (subject === 'Religious & Moral Education') return 'RME';
  if (subject === 'Agricultural Science') return 'Agriculture';
  return subject;
}

export function nextNumberedId(existing: string[], prefix: string): string {
  const nums = existing.map((id) => Number(id.split('-').pop())).filter((num) => !Number.isNaN(num));
  const next = Math.max(0, ...nums) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

let sequence = 0;

export function uid(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
