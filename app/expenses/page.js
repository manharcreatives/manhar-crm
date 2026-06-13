'use client';

import { useState } from 'react';
import { useStore, formatCurrency, formatDate, generateExpenseId, getPaymentExpenses } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import StatCard from '@/app/components/ui/StatCard';
import Button from '@/app/components/ui/Button';
import { Card, CardHeader } from '@/app/components/ui/Card';
import Modal, { ModalFooter } from '@/app/components/ui/Modal';
import SearchBar from '@/app/components/ui/SearchBar';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { useToast } from '@/app/components/ui/Toast';
import { Receipt, Pencil, Trash2, Plus, DollarSign, TrendingDown, PieChart } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Domain', 'Hosting', 'SSL', 'Development', 'Design', 'API', 'Marketing', 'Tools', 'Other'];

export default function ExpensesPage() {
  const { clients, payments, expenses, addExpense, updateExpense, deleteExpense } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formPaymentId, setFormPaymentId] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formVendor, setFormVendor] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const getClientName = (id) => clients.find(c => c.id === id)?.name || id;

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    const payment = payments.find(p => p.id === e.paymentId);
    const client = clients.find(c => c.id === (payment?.clientId || e.clientId));
    const matchSearch = !q
      || e.id?.toLowerCase().includes(q)
      || client?.name?.toLowerCase().includes(q)
      || e.description?.toLowerCase().includes(q)
      || e.category?.toLowerCase().includes(q);
    const matchCategory = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalExpenses = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpensesAll = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const linkedPayments = new Set(expenses.map(e => e.paymentId)).size;
  const avgPerProject = linkedPayments > 0 ? Math.round(totalExpensesAll / linkedPayments) : 0;

  function resetForm() {
    setFormPaymentId('');
    setFormCategory('Other');
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormVendor('');
    setFormNotes('');
  }

  function openAdd() {
    resetForm();
    setEditExpense(null);
    setShowModal(true);
  }

  function openEdit(exp) {
    setEditExpense(exp);
    setFormPaymentId(exp.paymentId || '');
    setFormCategory(exp.category || 'Other');
    setFormDescription(exp.description || '');
    setFormAmount(exp.amount || '');
    setFormDate(exp.date || new Date().toISOString().split('T')[0]);
    setFormVendor(exp.vendor || '');
    setFormNotes(exp.notes || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!formPaymentId) { toast.warning('Please select a payment'); return; }
    if (!formAmount || Number(formAmount) <= 0) { toast.warning('Amount is required and must be positive'); return; }
    if (formDate && formDate > todayStr) { toast.warning('Expense date cannot be in the future'); return; }

    const payment = payments.find(p => p.id === formPaymentId);
    if (!payment) { toast.warning('Payment not found'); return; }

    const expenseData = {
      paymentId: formPaymentId,
      clientId: payment.clientId,
      category: formCategory,
      description: formDescription,
      amount: Number(formAmount),
      date: formDate,
      vendor: formVendor,
      notes: formNotes,
    };

    if (editExpense) {
      await updateExpense(editExpense.id, expenseData);
      toast.success('Expense updated');
    } else {
      expenseData.id = generateExpenseId(expenses);
      await addExpense(expenseData);
      toast.success('Expense added');
    }

    setShowModal(false);
    setEditExpense(null);
    resetForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteExpense(deleteTarget);
    toast.success('Expense deleted');
    setDeleteTarget(null);
  }

  function getExpensePayment(exp) {
    return payments.find(p => p.id === exp.paymentId);
  }

  const columns = [
    { key: 'id', label: 'ID', width: 90, render: (v) => <span className="font-mono" style={{ fontSize: 11, color: '#EF4444' }}>{v}</span> },
    { key: 'paymentId', label: 'Payment', width: 100, sortable: true, render: (v) => {
      const p = payments.find(p => p.id === v);
      return <span style={{ fontSize: 12, color: '#22C55E' }}>{p?.invoiceNo || v}</span>;
    }},
    { key: 'clientId', label: 'Client', sortable: true, render: (v, row) => {
      const payment = getExpensePayment(row);
      const clientId = payment?.clientId || v;
      return <strong>{getClientName(clientId)}</strong>;
    }},
    { key: 'category', label: 'Category', width: 100, render: (v) => (
      <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{v}</span>
    )},
    { key: 'description', label: 'Description', minWidth: 150, render: (v) => <span style={{ fontSize: 12, color: '#9CA3AF' }}>{v || '—'}</span> },
    { key: 'amount', label: 'Amount', width: 100, render: (v) => <span style={{ fontWeight: 600, color: '#EF4444' }}>{formatCurrency(v)}</span> },
    { key: 'date', label: 'Date', width: 100, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
    { key: 'vendor', label: 'Vendor', width: 100, render: (v) => <span style={{ fontSize: 12, color: '#9CA3AF' }}>{v || '—'}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><Receipt size={22} /></div>
            <div>
              <h1 className="page-header-title">Project Expenses</h1>
              <p className="page-header-desc">{expenses.length} expenses · Track project costs and profitability</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={Plus} size="sm" onClick={openAdd}>Add Expense</Button>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Summary */}
        <div className="stats-grid">
          <StatCard icon={TrendingDown} color="red" value={totalExpensesAll} prefix="₹" label="Total Expenses" />
          <StatCard icon={Receipt} color="yellow" value={expenses.length} label="Expenses Count" />
          <StatCard icon={PieChart} color="purple" value={avgPerProject} prefix="₹" label="Avg Expense / Project" />
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by client, description, category..."
          filters={[
            { placeholder: 'All Categories', value: filterCategory, onChange: setFilterCategory,
              options: EXPENSE_CATEGORIES },
          ]}
        />

        <Card style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            sortable
            emptyMessage="No expenses recorded yet"
            emptyIcon={Receipt}
            actions={(row) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={14} /></button>
                <button className="btn-icon" style={{ color: '#EF4444' }} onClick={() => setDeleteTarget(row.id)} title="Delete"><Trash2 size={14} /></button>
              </div>
            )}
          />
        </Card>
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditExpense(null); resetForm(); }}
        title={editExpense ? 'Edit Expense' : 'Add Expense'} size="md">
        <div className="form-group">
          <label className="form-label">Payment / Project *</label>
          <select className="form-select" value={formPaymentId} onChange={e => setFormPaymentId(e.target.value)}>
            <option value="">Select a payment</option>
            {payments.map(p => {
              const client = clients.find(c => c.id === p.clientId);
              return (
                <option key={p.id} value={p.id}>
                  {p.invoiceNo || p.id} — {client?.name || p.clientId} ({formatCurrency(p.finalAmount)})
                </option>
              );
            })}
          </select>
        </div>
        {formPaymentId && (() => {
          const p = payments.find(x => x.id === formPaymentId);
          if (!p) return null;
          const existingExpenses = getPaymentExpenses(expenses, formPaymentId);
          const net = Number(p.advance || 0) - existingExpenses - Number(formAmount || 0);
          return (
            <div style={{ marginBottom: 16, padding: 10, background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.15)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Received: <strong style={{ color: '#22C55E' }}>{formatCurrency(p.advance)}</strong></span>
              <span>Current Expenses: <strong style={{ color: '#EF4444' }}>{formatCurrency(existingExpenses)}</strong></span>
              <span>Net Profit: <strong style={{ color: net >= 0 ? '#22C55E' : '#EF4444' }}>{formatCurrency(net)}</strong></span>
            </div>
          );
        })()}
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Category *</label>
            <select className="form-select" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" min={0} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Domain renewal, Hosting fee..." />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} max={todayStr} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vendor</label>
            <input className="form-input" type="text" value={formVendor} onChange={e => setFormVendor(e.target.value)} placeholder="e.g. GoDaddy, Namecheap" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); setEditExpense(null); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSave}>{editExpense ? 'Update' : 'Add'} Expense</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="This will permanently remove this expense record."
      />
    </div>
  );
}
