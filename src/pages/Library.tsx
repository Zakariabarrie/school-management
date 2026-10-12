import { useEffect, useMemo, useState } from 'react';
import { Library, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button, ConfirmDialog, Field, Modal, PageHeader, SelectInput, StatCard, StatusBadge, Tabs, TextInput } from '../components/ui';
import { BOOK_CATEGORIES } from '../data/school';
import { visibleStudents } from '../lib/access';
import { addDays, formatDate, fullName, nextNumberedId, todayISO } from '../lib/format';
import { can } from '../lib/permissions';
import { bookAvailability, loanViewStatus } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { Book } from '../types';

const EMPTY_BOOK = { title: '', author: '', category: BOOK_CATEGORIES[0], quantity: '1' };

export function LibraryPage() {
  const { state, session, addBook, updateBook, deleteBook, borrowBook, returnBook, notify } = useApp();
  const [params] = useSearchParams();
  usePageTitle('Library');
  const [tab, setTab] = useState<'inventory' | 'borrowing'>(params.get('action') === 'borrow' ? 'borrowing' : 'inventory');
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState('all');
  const [loanQuery, setLoanQuery] = useState('');
  const [loanStatus, setLoanStatus] = useState('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [removing, setRemoving] = useState<Book | null>(null);
  const [form, setForm] = useState(EMPTY_BOOK);
  const [borrowing, setBorrowing] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [borrowDate, setBorrowDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14));
  const [error, setError] = useState('');
  const today = todayISO();
  const manage = session ? can(session.role, 'manageLibrary') : false;
  const people = session ? visibleStudents(session.role, session.studentId, session.teacherId, state.students, state.teachers) : [];

  useEffect(() => {
    if (!manage) return;
    if (params.get('action') === 'borrow') setBorrowing(true);
    if (params.get('action') === 'add') setAdding(true);
  }, [params, manage]);

  const books = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.books.filter((book) => {
      if (category !== 'all' && book.category !== category) return false;
      if (!q) return true;
      return `${book.title} ${book.author} ${book.id} ${book.category}`.toLowerCase().includes(q);
    });
  }, [state.books, query, category]);

  const loans = state.loans.filter((loan) => {
    if (!manage && !people.some((student) => student.id === loan.studentId)) return false;
    const student = state.students.find((item) => item.id === loan.studentId);
    const book = state.books.find((item) => item.id === loan.bookId);
    const q = loanQuery.trim().toLowerCase();
    if (q && !`${student ? fullName(student) : ''} ${book?.title ?? ''} ${loan.bookId}`.toLowerCase().includes(q)) return false;
    if (loanStatus !== 'all' && loanViewStatus(loan, today) !== loanStatus) return false;
    return true;
  });

  if (!session) return null;
  const copies = state.books.reduce((sum, book) => sum + book.quantity, 0);
  const available = state.books.reduce((sum, book) => sum + book.available, 0);
  const borrowed = state.loans.filter((loan) => !loan.returnDate && (manage || people.some((student) => student.id === loan.studentId))).length;
  const overdue = state.loans.filter((loan) => loanViewStatus(loan, today) === 'Overdue' && (manage || people.some((student) => student.id === loan.studentId))).length;

  function openEdit(book: Book) {
    setEditing(book);
    setForm({ title: book.title, author: book.author, category: book.category, quantity: String(book.quantity) });
    setError('');
  }

  return (
    <div className="page">
      <PageHeader
        title="Library"
        subtitle={
          manage
            ? 'Catalogue, loans, and returns for the demonstration library.'
            : session.role === 'administrator'
              ? 'View the catalogue and borrowing records. The Library Manager records issues and returns.'
              : 'Your borrowing history and the book catalogue.'
        }
        actions={manage ? (
          <div className="cluster">
            <Button variant="secondary" onClick={() => { setError(''); setBorrowing(true); }}>Issue book</Button>
            <Button onClick={() => { setForm(EMPTY_BOOK); setError(''); setAdding(true); }}><Plus size={16} /> Add book</Button>
          </div>
        ) : undefined}
      />
      <section className="stat-grid cols-4" style={{ marginBottom: 14 }}>
        <StatCard icon={<Library size={18} />} label="Total copies" value={String(copies)} hint={`${state.books.length} titles`} />
        <StatCard icon={<Library size={18} />} label="Available copies" value={String(available)} hint="Ready to issue" />
        <StatCard icon={<Library size={18} />} label="Borrowed copies" value={String(borrowed)} hint="Still out" />
        <StatCard icon={<Library size={18} />} label="Overdue books" value={String(overdue)} hint="Past the due date" />
      </section>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[{ id: 'inventory', label: 'Inventory' }, { id: 'borrowing', label: 'Borrowing history' }]}
      />
      {tab === 'inventory' ? (
        <div>
          <div className="filters">
            <TextInput className="grow" placeholder="Search title, author, or ID" aria-label="Search books" value={query} onChange={(event) => setQuery(event.target.value)} />
            <SelectInput aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {[...new Set(state.books.map((book) => book.category))].map((item) => <option key={item}>{item}</option>)}
            </SelectInput>
          </div>
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Book inventory</caption>
              <thead>
                <tr>
                  <th scope="col">Book ID</th><th scope="col">Title</th><th scope="col">Author</th><th scope="col">Category</th>
                  <th scope="col">Quantity</th><th scope="col">Available</th><th scope="col">Status</th>
                  {manage ? <th scope="col">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {books.length === 0 ? <tr><td colSpan={manage ? 8 : 7}>No books match this search.</td></tr> : null}
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>{book.id}</td>
                    <td><strong>{book.title}</strong></td>
                    <td>{book.author}</td>
                    <td>{book.category}</td>
                    <td>{book.quantity}</td>
                    <td>{book.available}</td>
                    <td><StatusBadge status={bookAvailability(book)} /></td>
                    {manage ? (
                      <td className="row-actions">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(book)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => setRemoving(book)}>Remove</Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="filters">
            <TextInput className="grow" placeholder="Search student or book" aria-label="Search borrowing records" value={loanQuery} onChange={(event) => setLoanQuery(event.target.value)} />
            <SelectInput aria-label="Borrowing status" value={loanStatus} onChange={(event) => setLoanStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option>Borrowed</option>
              <option>Overdue</option>
              <option>Returned</option>
            </SelectInput>
          </div>
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Borrowing history</caption>
              <thead><tr><th scope="col">Student</th><th scope="col">Book</th><th scope="col">Borrow date</th><th scope="col">Due date</th><th scope="col">Return date</th><th scope="col">Status</th>{manage ? <th scope="col">Action</th> : null}</tr></thead>
              <tbody>
                {loans.length === 0 ? <tr><td colSpan={manage ? 7 : 6}>No borrowing records match this filter.</td></tr> : null}
                {loans.map((loan) => {
                  const student = state.students.find((item) => item.id === loan.studentId);
                  const book = state.books.find((item) => item.id === loan.bookId);
                  const status = loanViewStatus(loan, today);
                  return (
                    <tr key={loan.id}>
                      <td>{student ? fullName(student) : loan.studentId}</td>
                      <td>{book?.title ?? loan.bookId}</td>
                      <td>{formatDate(loan.borrowDate)}</td>
                      <td>{formatDate(loan.dueDate)}</td>
                      <td>{loan.returnDate ? formatDate(loan.returnDate) : '—'}</td>
                      <td><StatusBadge status={status} /></td>
                      {manage ? (
                        <td>{status === 'Returned' ? '—' : <Button size="sm" variant="secondary" onClick={() => {
                          const message = returnBook(loan.id, today);
                          if (message) notify(message, 'warning');
                        }}>Return</Button>}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={adding || !!editing} title={editing ? 'Edit book' : 'Add book'} description={editing ? 'Borrowing history stays linked to this book ID.' : 'The new title is stored in this browser.'} onClose={() => { setAdding(false); setEditing(null); setError(''); }}>
        <div className="modal-body stack">
          {error ? <p className="alert" role="alert">{error}</p> : null}
          {editing ? <p className="small">Book ID {editing.id}</p> : null}
          <Field label="Title"><TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Author"><TextInput value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
          <Field label="Category">
            <SelectInput value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {BOOK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </SelectInput>
          </Field>
          <Field label="Quantity"><TextInput type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
        </div>
        <div className="modal-foot">
          <Button variant="ghost" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</Button>
          <Button onClick={() => {
            const copiesCount = Number(form.quantity);
            if (!form.title.trim() || !form.author.trim() || !Number.isInteger(copiesCount) || copiesCount < 1) {
              setError('Enter a title, author, and a quantity of at least 1.');
              return;
            }
            if (editing) {
              const message = updateBook({ ...editing, title: form.title.trim(), author: form.author.trim(), category: form.category, quantity: copiesCount, available: editing.available });
              if (message) {
                setError(message);
                return;
              }
              setEditing(null);
              return;
            }
            const message = addBook({
              id: nextNumberedId(state.books.map((book) => book.id), 'BK'),
              title: form.title.trim(),
              author: form.author.trim(),
              category: form.category,
              quantity: copiesCount,
              available: copiesCount,
            });
            if (message) {
              setError(message);
              return;
            }
            setForm(EMPTY_BOOK);
            setAdding(false);
          }}>{editing ? 'Save book' : 'Add book'}</Button>
        </div>
      </Modal>
      <Modal open={borrowing} title="Issue book" description="A copy can be issued only when one is available. The return date is recorded later." onClose={() => { setBorrowing(false); setError(''); }}>
        <div className="modal-body stack">
          {error ? <p className="alert" role="alert">{error}</p> : null}
          <Field label="Student">
            <SelectInput value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Select a student</option>
              {state.students.filter((student) => student.status === 'Active').map((student) => (
                <option key={student.id} value={student.id}>{fullName(student)} · {student.className}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Book">
            <SelectInput value={bookId} onChange={(event) => setBookId(event.target.value)}>
              <option value="">Select a book</option>
              {state.books.filter((book) => book.available > 0).map((book) => (
                <option key={book.id} value={book.id}>{book.title} · {book.available} available</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Issue date"><TextInput type="date" value={borrowDate} onChange={(event) => setBorrowDate(event.target.value)} /></Field>
          <Field label="Due date"><TextInput type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
        </div>
        <div className="modal-foot">
          <Button variant="ghost" onClick={() => setBorrowing(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!studentId || !bookId) {
              setError('Choose a student and a book.');
              return;
            }
            const message = borrowBook({ studentId, bookId, borrowDate, dueDate });
            if (message) {
              setError(message);
              return;
            }
            setBorrowing(false);
            setError('');
            setTab('borrowing');
          }}>Confirm issue</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!removing}
        title="Remove book"
        message={removing ? `Remove ${removing.title} from the catalogue? This is blocked while a copy is still on loan.` : ''}
        confirmLabel="Remove"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const message = deleteBook(removing.id);
          if (message) notify(message, 'warning');
          setRemoving(null);
        }}
      />
    </div>
  );
}
