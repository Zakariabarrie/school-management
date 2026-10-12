import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, DataTable, EmptyState, Field, Modal, PageHeader, SelectInput, StatCard, StatusBadge, TextInput, type Column } from '../components/ui';
import { CLASSES, PAYMENT_METHODS } from '../data/school';
import { formatDate, formatMoney, fullName, todayISO } from '../lib/format';
import { can } from '../lib/permissions';
import { balanceOf, feeStatus, schoolFigures } from '../lib/stats';
import { usePageTitle } from '../lib/usePageTitle';
import { useApp } from '../state/store';
import type { FeeAccount, FeeStatus, Payment, PaymentMethod } from '../types';

function paymentsFor(payments: Payment[], feeId: string): Payment[] {
  return payments.filter((payment) => payment.feeAccountId === feeId).sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
}

function PaymentLines({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <>—</>;
  return (
    <ol className="pay-lines">
      {payments.map((payment) => (
        <li key={payment.id}>{formatDate(payment.date)} · {formatMoney(payment.amount)}</li>
      ))}
    </ol>
  );
}

export function FeesPage() {
  const { session } = useApp();
  usePageTitle('Fees');
  if (!session) return null;
  if (session.role === 'student' || session.role === 'parent') return <PersonalFees />;
  return <FeeOffice />;
}

function PersonalFees() {
  const { state, session } = useApp();
  const student = state.students.find((item) => item.id === session?.studentId);
  if (!student) return <EmptyState title="No fee account" text="This login is not linked to a student." />;
  const accounts = state.fees.filter((item) => item.studentId === student.id);
  const payments = state.payments.filter((item) => item.studentId === student.id);
  return (
    <div className="page">
      <PageHeader title={session?.role === 'parent' ? `${fullName(student)}'s fees` : 'My fee balance'} subtitle={`${student.className} · balances in this demonstration stay in the browser.`} />
      <div className="stack">
        {accounts.map((account) => (
          <section key={account.id} className="card stack">
            <h2>{account.term} · {account.academicYear}</h2>
            <div className="summary-row">
              <span>Expected <strong>{formatMoney(account.expected)}</strong></span>
              <span>Paid <strong>{formatMoney(account.paid)}</strong></span>
              <span>Balance <strong>{formatMoney(balanceOf(account.expected, account.paid))}</strong></span>
              <StatusBadge status={feeStatus(account.expected, account.paid)} />
            </div>
            <div>
              <p className="small">Payments</p>
              <PaymentLines payments={paymentsFor(payments, account.id)} />
            </div>
          </section>
        ))}
        <section className="card">
          <h2>Payment history</h2>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="data">
              <caption className="sr-only">Payments</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Reference</th><th scope="col">Recorded by</th></tr></thead>
              <tbody>
                {payments.length === 0 ? <tr><td colSpan={5}>No payment has been recorded.</td></tr> : null}
                {[...payments].sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id)).map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference}</td>
                    <td>{payment.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeeOffice() {
  const { state, session, recordPayment, updateFee, notify } = useApp();
  const figures = schoolFigures(state.students, state.teachers, state.fees);
  const [query, setQuery] = useState('');
  const [className, setClassName] = useState('all');
  const [status, setStatus] = useState<'all' | FeeStatus>('all');
  const [target, setTarget] = useState<FeeAccount | null>(null);
  const [editing, setEditing] = useState<FeeAccount | null>(null);
  const [expected, setExpected] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const manage = session ? can(session.role, 'manageFees') : false;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.fees.filter((fee) => {
      const student = state.students.find((item) => item.id === fee.studentId);
      if (!student) return false;
      if (className !== 'all' && student.className !== className) return false;
      const current = feeStatus(fee.expected, fee.paid);
      if (status !== 'all' && current !== status) return false;
      if (!q) return true;
      return `${fullName(student)} ${student.id}`.toLowerCase().includes(q);
    });
  }, [state.fees, state.students, query, className, status]);

  const columns: Column<FeeAccount>[] = [
    { key: 'student', header: 'Student', sortValue: (row) => state.students.find((item) => item.id === row.studentId)?.lastName ?? '', render: (row) => {
      const student = state.students.find((item) => item.id === row.studentId);
      return student ? <><strong>{fullName(student)}</strong><div className="small">{student.id}</div></> : row.studentId;
    } },
    { key: 'class', header: 'Class', render: (row) => state.students.find((item) => item.id === row.studentId)?.className ?? '—' },
    { key: 'expected', header: 'Expected', sortValue: (row) => row.expected, render: (row) => formatMoney(row.expected) },
    { key: 'paid', header: 'Paid', sortValue: (row) => row.paid, render: (row) => formatMoney(row.paid) },
    { key: 'paidOn', header: 'Payments', sortValue: (row) => paymentsFor(state.payments, row.id).at(-1)?.date ?? '', render: (row) => <PaymentLines payments={paymentsFor(state.payments, row.id)} /> },
    { key: 'balance', header: 'Balance', sortValue: (row) => balanceOf(row.expected, row.paid), render: (row) => formatMoney(balanceOf(row.expected, row.paid)) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={feeStatus(row.expected, row.paid)} /> },
    ...(manage ? [{ key: 'action', header: 'Action', render: (row: FeeAccount) => (
      <div className="row-actions">
        <Button size="sm" variant="secondary" onClick={() => { setEditing(row); setExpected(String(row.expected)); setError(''); }}>Edit fee</Button>
        <Button size="sm" variant="secondary" disabled={row.paid >= row.expected} onClick={() => { setTarget(row); setAmount(''); setDate(todayISO()); setReference(''); setError(''); }}>Record payment</Button>
      </div>
    ) } satisfies Column<FeeAccount>] : []),
  ];

  return (
    <div className="page">
      <PageHeader
        title="Fees"
        subtitle={manage
          ? 'Change a student’s fee, or record the amount when they pay. The balance updates in this browser.'
          : 'View the fee ledger. Finance changes fees and records payments.'}
      />
      <section className="stat-grid cols-4">
        <StatCard icon={<Wallet size={18} />} label="Total expected" value={formatMoney(figures.expected)} hint="School fee position" />
        <StatCard icon={<Wallet size={18} />} label="Total collected" value={formatMoney(figures.collected)} hint="Includes new payments" />
        <StatCard icon={<Wallet size={18} />} label="Outstanding" value={formatMoney(figures.outstanding)} hint="Still to collect" />
        <StatCard icon={<Wallet size={18} />} label="Paid students" value={String(figures.paidStudents)} hint="Fully paid accounts" />
      </section>
      <div className="filters" style={{ marginTop: 14 }}>
        <TextInput className="grow" placeholder="Search student" aria-label="Search fee records" value={query} onChange={(event) => setQuery(event.target.value)} />
        <SelectInput aria-label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
          <option value="all">All classes</option>
          {CLASSES.map((item) => <option key={item.name}>{item.name}</option>)}
        </SelectInput>
        <SelectInput aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value as 'all' | FeeStatus)}>
          <option value="all">All statuses</option>
          <option>Paid</option>
          <option>Partially Paid</option>
          <option>Outstanding</option>
        </SelectInput>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} caption="Student fee records" empty={<EmptyState title="No fee records" text="Try another class or status." />} />
      <section className="card" style={{ marginTop: 12 }}>
        <h2>Recent payments</h2>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <caption className="sr-only">Recent payments</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Student</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Reference</th></tr></thead>
            <tbody>
              {state.payments.slice(0, 8).map((payment) => {
                const student = state.students.find((item) => item.id === payment.studentId);
                return (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{student ? fullName(student) : payment.studentId}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {manage ? <>
      <Modal open={!!editing} title="Edit fee" description={editing ? `${editing.term} · ${editing.academicYear}` : undefined} onClose={() => setEditing(null)}>
        {editing ? (
          <>
            <div className="modal-body stack">
              <p><strong>{fullName(state.students.find((item) => item.id === editing.studentId) ?? { firstName: 'Student', lastName: '' })}</strong></p>
              <p className="small">Already paid {formatMoney(editing.paid)}. The fee cannot be set below that amount.</p>
              {error ? <p className="alert" role="alert">{error}</p> : null}
              <Field label="Fee amount">
                <TextInput type="number" min={editing.paid} value={expected} onChange={(event) => setExpected(event.target.value)} />
              </Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => {
                const message = updateFee(editing.id, Number(expected));
                if (message) {
                  setError(message);
                  return;
                }
                setEditing(null);
              }}>Save fee</Button>
            </div>
          </>
        ) : null}
      </Modal>
      <Modal open={!!target} title="Record payment" description="Enter the amount received today. Each part payment is kept as its own record." onClose={() => setTarget(null)}>
        {target ? (
          <>
            <div className="modal-body stack">
              <p><strong>{fullName(state.students.find((item) => item.id === target.studentId) ?? { firstName: 'Student', lastName: '' })}</strong></p>
              <p className="small">Balance still to pay {formatMoney(balanceOf(target.expected, target.paid))}</p>
              <div>
                <p className="small">Payments already recorded</p>
                <PaymentLines payments={paymentsFor(state.payments, target.id)} />
              </div>
              {error ? <p className="alert" role="alert">{error}</p> : null}
              <Field label="Amount received" hint="Enter this part only. A later payment can be recorded on its own.">
                <TextInput type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
              </Field>
              <Field label="Date">
                <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <Field label="Method">
                <SelectInput value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}
                </SelectInput>
              </Field>
              <Field label="Reference" hint="Optional.">
                <TextInput value={reference} onChange={(event) => setReference(event.target.value)} />
              </Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button onClick={() => {
                const message = recordPayment({ feeAccountId: target.id, amount: Number(amount), date, method, reference });
                if (message) {
                  setError(message);
                  notify(message, 'danger');
                  return;
                }
                setTarget(null);
              }}>Save payment</Button>
            </div>
          </>
        ) : null}
      </Modal>
      </> : null}
    </div>
  );
}
