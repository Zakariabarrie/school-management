import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { INITIAL_DATA } from '../data/seed';
import { TERM_FEE } from '../data/school';
import type { SchoolColours } from '../lib/colours';
import { findDemoAccount } from '../lib/demo-auth';
import { normalizeSchoolData, normalizeSession, PERSIST_VERSION, SEED_ROSTER_REVISION } from '../lib/persist-normalize';
import { mergeSeedUsers } from '../lib/seed-users';
import { formatDate, formatMoney, fullName, uid, withTitle } from '../lib/format';
import type {
  AppNotification,
  AppState,
  AttendanceStatus,
  AssessmentMark,
  Book,
  DemoUser,
  PaymentMethod,
  SchoolSettings,
  Session,
  Student,
  Teacher,
  DemoData,
  TimetableSlot,
  ToastMessage,
} from '../types';

/** Standalone demo persistence (does not read or write legacy `rvss-sms-demo-v2`). */
export const STORAGE_KEY = 'scieneworld-sms-demo-v1';
export const PREVIOUS_STORAGE_KEYS = [
  'rvss-sms-standalone-demo-v4',
  'rvss-sms-standalone-demo-v3',
  'rvss-sms-standalone-demo-v2',
  'rvss-sms-standalone-demo-v1',
] as const;
export const LEGACY_STORAGE_KEY = 'rvss-sms-demo-v2';

function readStoredPayload(): string | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return current;
    for (const key of PREVIOUS_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) return legacy;
    }
  } catch {
    // Ignore storage access errors.
  }
  return null;
}

export function clearStoredPayload(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of PREVIOUS_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors.
  }
}

type Action =
  | { type: 'set-session'; session: Session | null }
  | { type: 'toast'; title: string; tone?: ToastMessage['tone'] }
  | { type: 'dismiss-toast'; id: string }
  | { type: 'add-student'; student: Student }
  | { type: 'update-student'; student: Student }
  | { type: 'delete-student'; id: string }
  | { type: 'add-teacher'; teacher: Teacher }
  | { type: 'update-teacher'; teacher: Teacher }
  | { type: 'delete-teacher'; id: string }
  | { type: 'save-attendance'; date: string; className: string; marks: { studentId: string; status: AttendanceStatus }[] }
  | { type: 'save-marks'; year: string; term: AssessmentMark['term']; subject: string; className: string; entries: { studentId: string; categoryId: string; score: number | null; teacherId: string }[] }
  | { type: 'record-payment'; feeAccountId: string; amount: number; date: string; method: PaymentMethod; reference: string }
  | { type: 'update-fee'; id: string; expected: number }
  | { type: 'add-book'; book: Book }
  | { type: 'update-book'; book: Book }
  | { type: 'delete-book'; id: string }
  | { type: 'borrow'; studentId: string; bookId: string; borrowDate: string; dueDate: string }
  | { type: 'return-book'; loanId: string; date: string }
  | { type: 'read-note'; id: string }
  | { type: 'read-all-notes' }
  | { type: 'add-user'; user: DemoUser }
  | { type: 'update-user'; user: DemoUser }
  | { type: 'delete-user'; id: string }
  | { type: 'update-settings'; settings: SchoolSettings }
  | { type: 'update-branding'; logo?: string | null; campusImage?: string | null }
  | { type: 'update-colours'; colours: SchoolColours; quiet?: boolean }
  | { type: 'update-slot'; slot: TimetableSlot; notice?: string }
  | { type: 'reset' }
  | { type: 'replace-data'; data: DemoData; session?: Session | null }
  | { type: 'sync-admin-user'; user: DemoUser }
  | { type: 'sync-demo-users' };

function fresh(): AppState {
  const data = normalizeSchoolData(structuredClone(INITIAL_DATA));
  return { ...data, session: null, toasts: [] };
}

function toastOf(title: string, tone: ToastMessage['tone'] = 'success'): ToastMessage {
  return { id: uid('toast'), title, tone };
}

function noteOf(title: string, message: string, category: AppNotification['category']): AppNotification {
  return { id: uid('note'), title, message, time: new Date().toISOString(), read: false, category };
}

function toSession(user: DemoUser): Session {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: user.roleLabel,
    teacherId: user.teacherId,
    studentId: user.studentId,
  };
}

function hydrate(): AppState {
  const blank = fresh();
  try {
    const raw = readStoredPayload();
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as { version?: number; seedRosterRevision?: number; data?: AppState };
    if (parsed.version !== PERSIST_VERSION || !parsed.data?.students || !parsed.data.marks || !parsed.data.settings?.assessments) {
      return blank;
    }
    const data = normalizeSchoolData(parsed.data);
    return { ...blank, ...data, session: normalizeSession(parsed.data.session), toasts: [] };
  } catch {
    return blank;
  }
}

function mergeRemoteData(state: AppState, data: DemoData, session?: Session | null): AppState {
  const nextSession = session === undefined ? state.session : normalizeSession(session);
  return { ...state, ...data, session: nextSession, toasts: state.toasts };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-session':
      return { ...state, session: action.session };
    case 'toast':
      return { ...state, toasts: [...state.toasts, toastOf(action.title, action.tone)] };
    case 'dismiss-toast':
      return { ...state, toasts: state.toasts.filter((item) => item.id !== action.id) };
    case 'add-student': {
      if (state.students.some((item) => item.id === action.student.id)) {
        return { ...state, toasts: [...state.toasts, toastOf('That student ID already exists', 'danger')] };
      }
      const fee = {
        id: `FEE-${action.student.id}`,
        studentId: action.student.id,
        academicYear: state.settings.academicYear,
        term: state.settings.currentTerm,
        description: `${state.settings.currentTerm} fees (tuition, development levy, and ICT levy)`,
        expected: TERM_FEE,
        paid: 0,
      };
      return {
        ...state,
        students: [action.student, ...state.students],
        fees: [fee, ...state.fees],
        notifications: [
          noteOf('New student registered', `${fullName(action.student)} was added to ${action.student.className}.`, 'student'),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Student added in this browser')],
      };
    }
    case 'update-student':
      return {
        ...state,
        students: state.students.map((item) => (item.id === action.student.id ? action.student : item)),
        toasts: [...state.toasts, toastOf('Student record updated in this browser')],
      };
    case 'delete-student': {
      let books = state.books;
      for (const loan of state.loans) {
        if (loan.studentId === action.id && !loan.returnDate) {
          books = books.map((book) => (book.id === loan.bookId ? { ...book, available: book.available + 1 } : book));
        }
      }
      const student = state.students.find((item) => item.id === action.id);
      return {
        ...state,
        students: state.students.filter((item) => item.id !== action.id),
        attendance: state.attendance.filter((item) => item.studentId !== action.id),
        marks: state.marks.filter((item) => item.studentId !== action.id),
        fees: state.fees.filter((item) => item.studentId !== action.id),
        payments: state.payments.filter((item) => item.studentId !== action.id),
        loans: state.loans.filter((item) => item.studentId !== action.id),
        users: state.users.flatMap((user) => {
          if (user.studentId !== action.id) return [user];
          if (user.role === 'student') return [];
          return [{ ...user, studentId: undefined }];
        }),
        books,
        notifications: [
          noteOf('Student record removed', `${student ? fullName(student) : 'A student'} was removed from the demonstration register.`, 'student'),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Student removed in this browser')],
      };
    }
    case 'add-teacher':
      return {
        ...state,
        teachers: [action.teacher, ...state.teachers],
        toasts: [...state.toasts, toastOf('Teacher added in this browser')],
      };
    case 'update-teacher':
      return {
        ...state,
        teachers: state.teachers.map((item) => (item.id === action.teacher.id ? action.teacher : item)),
        toasts: [...state.toasts, toastOf('Teacher record updated in this browser')],
      };
    case 'delete-teacher':
      return {
        ...state,
        teachers: state.teachers.filter((item) => item.id !== action.id),
        toasts: [...state.toasts, toastOf('Teacher removed in this browser')],
      };
    case 'save-attendance': {
      const kept = state.attendance.filter(
        (record) => !(record.date === action.date && record.className === action.className),
      );
      const added = action.marks.map((mark) => ({
        id: `${action.date}:${mark.studentId}`,
        studentId: mark.studentId,
        className: action.className,
        date: action.date,
        status: mark.status,
      }));
      return {
        ...state,
        attendance: [...kept, ...added],
        notifications: [
          noteOf('Attendance saved', `${action.className} register for ${formatDate(action.date)} was updated.`, 'attendance'),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Attendance saved in this browser')],
      };
    }
    case 'save-marks': {
      const touched = new Set(action.entries.map((entry) => `${action.year}|${action.term}|${entry.studentId}|${action.subject}|${entry.categoryId}`));
      const kept = state.marks.filter((mark) => !touched.has(mark.id));
      const added = action.entries
        .filter((entry) => entry.score != null)
        .map((entry) => ({
          id: `${action.year}|${action.term}|${entry.studentId}|${action.subject}|${entry.categoryId}`,
          studentId: entry.studentId,
          academicYear: action.year,
          term: action.term,
          className: action.className,
          subject: action.subject,
          categoryId: entry.categoryId,
          score: entry.score as number,
          teacherId: entry.teacherId,
        }));
      return {
        ...state,
        marks: [...kept, ...added],
        notifications: [
          noteOf('Examination results entered', `${action.subject} marks for ${action.term} were updated.`, 'exam'),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Assessment marks saved in this browser')],
      };
    }
    case 'record-payment': {
      const fee = state.fees.find((item) => item.id === action.feeAccountId);
      if (!fee) return state;
      const due = fee.expected - fee.paid;
      if (action.amount <= 0 || action.amount > due) return state;
      const student = state.students.find((item) => item.id === fee.studentId);
      const payment = {
        id: uid('pay'),
        studentId: fee.studentId,
        feeAccountId: fee.id,
        amount: action.amount,
        date: action.date,
        method: action.method,
        reference: action.reference.trim() || 'Office receipt',
        recordedBy: state.session?.name ?? 'School office',
      };
      return {
        ...state,
        fees: state.fees.map((item) => (item.id === fee.id ? { ...item, paid: item.paid + action.amount } : item)),
        payments: [payment, ...state.payments],
        notifications: [
          noteOf(
            'Fee payment recorded',
            `${student ? fullName(student) : 'A student'} — ${formatMoney(action.amount)} received for ${fee.term}.`,
            'fee',
          ),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Payment recorded in this browser')],
      };
    }
    case 'update-fee':
      return {
        ...state,
        fees: state.fees.map((item) => (item.id === action.id ? { ...item, expected: action.expected } : item)),
        toasts: [...state.toasts, toastOf('Fee updated in this browser')],
      };
    case 'add-book':
      if (state.books.some((item) => item.id === action.book.id)) return state;
      return {
        ...state,
        books: [action.book, ...state.books],
        toasts: [...state.toasts, toastOf('Book added in this browser')],
      };
    case 'update-book':
      return {
        ...state,
        books: state.books.map((item) => (item.id === action.book.id ? action.book : item)),
        toasts: [...state.toasts, toastOf('Book details updated in this browser')],
      };
    case 'delete-book':
      return {
        ...state,
        books: state.books.filter((item) => item.id !== action.id),
        toasts: [...state.toasts, toastOf('Book removed in this browser')],
      };
    case 'borrow': {
      const book = state.books.find((item) => item.id === action.bookId);
      if (!book || book.available <= 0) return state;
      const student = state.students.find((item) => item.id === action.studentId);
      return {
        ...state,
        books: state.books.map((item) => (item.id === book.id ? { ...item, available: item.available - 1 } : item)),
        loans: [
          {
            id: uid('loan'),
            studentId: action.studentId,
            bookId: action.bookId,
            borrowDate: action.borrowDate,
            dueDate: action.dueDate,
          },
          ...state.loans,
        ],
        notifications: [
          noteOf(
            'Library book borrowed',
            `${student ? fullName(student) : 'A student'} borrowed ${book.title}. Due ${formatDate(action.dueDate)}.`,
            'library',
          ),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Borrowing recorded in this browser')],
      };
    }
    case 'return-book': {
      const loan = state.loans.find((item) => item.id === action.loanId);
      if (!loan || loan.returnDate) return state;
      const book = state.books.find((item) => item.id === loan.bookId);
      return {
        ...state,
        loans: state.loans.map((item) => (item.id === loan.id ? { ...item, returnDate: action.date } : item)),
        books: state.books.map((item) => (item.id === loan.bookId ? { ...item, available: item.available + 1 } : item)),
        notifications: [
          noteOf('Library book returned', `${book?.title ?? 'A book'} was marked returned.`, 'library'),
          ...state.notifications,
        ].slice(0, 30),
        toasts: [...state.toasts, toastOf('Book returned in this browser')],
      };
    }
    case 'read-note':
      return {
        ...state,
        notifications: state.notifications.map((item) => (item.id === action.id ? { ...item, read: true } : item)),
      };
    case 'read-all-notes':
      return { ...state, notifications: state.notifications.map((item) => ({ ...item, read: true })) };
    case 'add-user':
      return {
        ...state,
        users: [...state.users, action.user],
        toasts: [...state.toasts, toastOf('Demonstration account added in this browser')],
      };
    case 'update-user': {
      const users = state.users.map((item) => (item.id === action.user.id ? action.user : item));
      const session = state.session?.userId === action.user.id ? toSession(action.user) : state.session;
      return {
        ...state,
        users,
        session,
        toasts: [...state.toasts, toastOf('Account updated in this browser')],
      };
    }
    case 'delete-user':
      return {
        ...state,
        users: state.users.filter((item) => item.id !== action.id),
        toasts: [...state.toasts, toastOf('Demonstration account removed in this browser')],
      };
    case 'update-settings':
      return {
        ...state,
        settings: action.settings,
        toasts: [...state.toasts, toastOf('Settings saved in this browser')],
      };
    case 'update-colours':
      return {
        ...state,
        settings: { ...state.settings, colours: action.colours },
        toasts: action.quiet ? state.toasts : [...state.toasts, toastOf('School colours updated in this browser')],
      };
    case 'update-branding': {
      const settings = { ...state.settings };
      if (action.logo === null) delete settings.logo;
      else if (typeof action.logo === 'string') settings.logo = action.logo;
      if (action.campusImage === null) delete settings.campusImage;
      else if (typeof action.campusImage === 'string') settings.campusImage = action.campusImage;
      return {
        ...state,
        settings,
        toasts: [...state.toasts, toastOf('School images updated in this browser')],
      };
    }
    case 'update-slot':
      return {
        ...state,
        timetable: state.timetable.map((slot) => (slot.id === action.slot.id ? action.slot : slot)),
        toasts: [...state.toasts, toastOf(action.notice ?? 'Timetable updated in this browser', action.notice ? 'warning' : 'success')],
      };
    case 'reset': {
      const next = fresh();
      const current = state.session;
      const user = current ? next.users.find((item) => item.id === current.userId) : undefined;
      return {
        ...next,
        session: user ? toSession(user) : null,
        toasts: [toastOf('Demonstration data restored')],
      };
    }
    case 'replace-data':
      return mergeRemoteData(state, action.data, action.session);
    case 'sync-admin-user': {
      const users = state.users.some((item) => item.id === action.user.id)
        ? state.users.map((item) => (item.id === action.user.id ? action.user : item))
        : [action.user, ...state.users];
      return { ...state, users };
    }
    case 'sync-demo-users':
      return { ...state, users: mergeSeedUsers(state.users) };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  session: Session | null;
  settings: SchoolSettings;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  notify: (title: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  saveAttendance: (date: string, className: string, marks: { studentId: string; status: AttendanceStatus }[]) => void;
  saveMarks: (input: {
    year: string;
    term: AssessmentMark['term'];
    subject: string;
    className: string;
    entries: { studentId: string; categoryId: string; score: number | null; teacherId: string }[];
  }) => void;
  recordPayment: (input: {
    feeAccountId: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string;
  }) => string | null;
  updateFee: (id: string, expected: number) => string | null;
  addBook: (book: Book) => string | null;
  updateBook: (book: Book) => string | null;
  deleteBook: (id: string) => string | null;
  borrowBook: (input: { studentId: string; bookId: string; borrowDate: string; dueDate: string }) => string | null;
  returnBook: (loanId: string, date: string) => string | null;
  markNotification: (id: string) => void;
  markAllNotifications: () => void;
  addUser: (user: DemoUser) => Promise<string | null>;
  updateUser: (user: DemoUser) => string | null;
  deleteUser: (id: string) => string | null;
  updateSettings: (settings: SchoolSettings) => void;
  updateBranding: (patch: { logo?: string | null; campusImage?: string | null }) => void;
  updateColours: (colours: SchoolColours, quiet?: boolean) => void;
  updateSlot: (slot: TimetableSlot) => string | null;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    dispatch({ type: 'sync-demo-users' });
  }, []);

  useEffect(() => {
    const { toasts, ...data } = state;
    void toasts;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: PERSIST_VERSION, seedRosterRevision: SEED_ROSTER_REVISION, data }),
      );
    } catch {
      // The visit can continue even when this browser refuses to store the demonstration.
    }
  }, [state]);

  const api = useMemo<StoreValue>(() => {
    return {
      state,
      session: state.session,
      settings: state.settings,
      login: async (email, password) => {
        const account = findDemoAccount(email, password, stateRef.current.users);
        if (!account) return 'Those details do not match a demonstration account.';
        if (account.role === 'administrator') {
          dispatch({ type: 'sync-admin-user', user: account });
        }
        dispatch({ type: 'set-session', session: toSession(account) });
        return null;
      },
      logout: () => {
        dispatch({ type: 'set-session', session: null });
      },
      notify: (title, tone) => dispatch({ type: 'toast', title, tone }),
      dismissToast: (id) => dispatch({ type: 'dismiss-toast', id }),
      addStudent: (student) => dispatch({ type: 'add-student', student }),
      updateStudent: (student) => dispatch({ type: 'update-student', student }),
      deleteStudent: (id) => dispatch({ type: 'delete-student', id }),
      addTeacher: (teacher) => dispatch({ type: 'add-teacher', teacher }),
      updateTeacher: (teacher) => dispatch({ type: 'update-teacher', teacher }),
      deleteTeacher: (id) => dispatch({ type: 'delete-teacher', id }),
      saveAttendance: (date, className, marks) => dispatch({ type: 'save-attendance', date, className, marks }),
      saveMarks: (input) => dispatch({ type: 'save-marks', ...input }),
      recordPayment: (input) => {
        const fee = stateRef.current.fees.find((item) => item.id === input.feeAccountId);
        if (!fee) return 'That fee account could not be found.';
        const due = fee.expected - fee.paid;
        if (due <= 0) return 'This account is already paid in full.';
        if (!Number.isFinite(input.amount) || input.amount <= 0) return 'Enter an amount greater than zero.';
        if (input.amount > due) return `The balance is ${formatMoney(due)}. Enter that amount or less.`;
        dispatch({ type: 'record-payment', ...input });
        return null;
      },
      updateFee: (id, expected) => {
        const fee = stateRef.current.fees.find((item) => item.id === id);
        if (!fee) return 'That fee account could not be found.';
        if (!Number.isFinite(expected) || expected < 0) return 'Enter a fee of zero or more.';
        if (expected < fee.paid) return `This student has already paid ${formatMoney(fee.paid)}. Set the fee to at least that amount.`;
        dispatch({ type: 'update-fee', id, expected });
        return null;
      },
      addBook: (book) => {
        if (stateRef.current.books.some((item) => item.id.toLowerCase() === book.id.toLowerCase())) {
          return 'That book ID is already in the catalogue.';
        }
        dispatch({ type: 'add-book', book });
        return null;
      },
      updateBook: (book) => {
        const current = stateRef.current.books.find((item) => item.id === book.id);
        if (!current) return 'That book is no longer in the catalogue.';
        const out = current.quantity - current.available;
        if (!Number.isInteger(book.quantity) || book.quantity < 1) return 'Quantity must be at least 1.';
        if (book.quantity < out) return `${out} ${out === 1 ? 'copy is' : 'copies are'} still on loan. Set the quantity to at least ${out}.`;
        dispatch({ type: 'update-book', book: { ...book, available: book.quantity - out } });
        return null;
      },
      deleteBook: (id) => {
        const open = stateRef.current.loans.some((loan) => loan.bookId === id && !loan.returnDate);
        if (open) return 'This book has an active borrowing record. Mark every copy returned before removing the title.';
        dispatch({ type: 'delete-book', id });
        return null;
      },
      borrowBook: (input) => {
        const book = stateRef.current.books.find((item) => item.id === input.bookId);
        if (!book || book.available <= 0) return 'That title has no copies available.';
        if (input.dueDate < input.borrowDate) return 'The due date must be on or after the borrow date.';
        dispatch({ type: 'borrow', ...input });
        return null;
      },
      returnBook: (loanId, date) => {
        const loan = stateRef.current.loans.find((item) => item.id === loanId);
        if (!loan) return 'That borrowing record could not be found.';
        if (loan.returnDate) return 'This borrowing record has already been returned.';
        dispatch({ type: 'return-book', loanId, date });
        return null;
      },
      markNotification: (id) => dispatch({ type: 'read-note', id }),
      markAllNotifications: () => dispatch({ type: 'read-all-notes' }),
      addUser: async (user) => {
        if (stateRef.current.users.some((item) => item.email.toLowerCase() === user.email.toLowerCase())) {
          return 'That email is already used by a demonstration account.';
        }
        dispatch({ type: 'add-user', user });
        return null;
      },
      updateUser: (user) => {
        const taken = stateRef.current.users.some((item) => item.id !== user.id && item.email.toLowerCase() === user.email.toLowerCase());
        if (taken) return 'That email is already used by a demonstration account.';
        if (stateRef.current.session?.userId === user.id && user.active === false) return 'You cannot deactivate the account you are using.';
        dispatch({ type: 'update-user', user });
        return null;
      },
      deleteUser: (id) => {
        if (stateRef.current.session?.userId === id) return 'You cannot remove the account you are using.';
        dispatch({ type: 'delete-user', id });
        return null;
      },
      updateSettings: (settings) => dispatch({ type: 'update-settings', settings }),
      updateBranding: (patch) => dispatch({ type: 'update-branding', ...patch }),
      updateColours: (colours, quiet) => dispatch({ type: 'update-colours', colours, quiet }),
      updateSlot: (slot) => {
        const current = stateRef.current;
        const teacher = current.teachers.find((item) => item.id === slot.teacherId);
        if (!teacher) return 'Choose a teacher for this lesson.';
        if (!slot.subject.trim()) return 'Choose a subject.';
        if (!slot.room.trim()) return 'Enter a room.';
        const clash = current.timetable.find(
          (item) => item.id !== slot.id && item.teacherId === slot.teacherId && item.day === slot.day && item.start === slot.start,
        );
        dispatch({
          type: 'update-slot',
          slot: { ...slot, subject: slot.subject.trim(), room: slot.room.trim() },
          notice: clash ? `${withTitle(teacher)} also teaches ${clash.subject} to ${clash.className} at this time.` : undefined,
        });
        return null;
      },
      resetDemo: () => {
        clearStoredPayload();
        dispatch({ type: 'reset' });
      },
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useApp(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useApp must be used within StoreProvider');
  return value;
}
