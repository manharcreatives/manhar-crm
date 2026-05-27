'use client';

import { useState } from 'react';
import { useStore, formatCurrency, formatDate, generatePaymentId } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import StatCard from '@/app/components/ui/StatCard';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { Card, CardHeader } from '@/app/components/ui/Card';
import Modal, { ModalFooter } from '@/app/components/ui/Modal';
import SearchBar from '@/app/components/ui/SearchBar';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { useToast } from '@/app/components/ui/Toast';
import {
  CreditCard, DollarSign, Clock, AlertTriangle,
  Download, Pencil, Trash2, Plus, CheckCircle,
  Landmark, Smartphone, Wallet, Ban as Bank, ChevronRight as ChevronRightIcon
} from 'lucide-react';

const PAYMENT_STATUSES = ['Paid', 'Partial', 'Pending', 'Overdue'];
const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash', 'Cheque'];
const SERVICE_CATEGORIES = [
  'Website Development', 'Restaurant Digital Solutions', 'Branding & Identity Design',
  'Print & Offline Branding', 'Social Media Design', 'Digital Presence Setup', 'Content & Communication'
];
const REMINDER_STATUSES = ['None', 'Sent', 'Pending', 'Repeated'];

const MODE_ICONS = { 'UPI': Smartphone, 'Bank Transfer': Landmark, 'Cash': Wallet, 'Cheque': Bank };

const EMPTY_PAYMENT = {
  id: '', clientId: '', invoiceNo: '', category: '', serviceName: '',
  projectValue: '', discount: 0, finalAmount: '',
  advance: 0, remaining: '', due: '', dueDate: '',
  status: 'Pending', mode: '', paymentDate: '',
  reminderStatus: 'None', latePayment: false,
};

export default function PaymentsPage() {
  const { clients, payments, addPayment, updatePayment, deletePayment } = useStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = payments.filter(p => {
    const client = clients.find(c => c.id === p.clientId);
    const q = search.toLowerCase();
    const matchSearch = !q || client?.name?.toLowerCase().includes(q) || p.invoiceNo?.toLowerCase().includes(q) || p.clientId?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalBilled = payments.reduce((s, p) => s + (Number(p.finalAmount) || 0), 0);
  const totalReceived = payments.reduce((s, p) => s + (Number(p.advance) || 0), 0);
  const totalDue = payments.reduce((s, p) => s + (Number(p.due) || 0), 0);
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;

  function openAdd() {
    setForm({ ...EMPTY_PAYMENT });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(p) {
    setForm({ ...p });
    setEditId(p.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.clientId) { toast.warning('Client is required'); return; }
    const data = { ...form };
    data.finalAmount = Number(data.projectValue || 0) - Number(data.discount || 0);
    data.remaining = data.finalAmount - Number(data.advance || 0);
    data.due = data.status === 'Paid' ? 0 : data.remaining;

    if (editId) {
      await updatePayment(editId, data);
      toast.success('Payment updated');
    } else {
      data.id = generatePaymentId(payments);
      await addPayment(data);
      toast.success('Payment recorded');
    }
    setShowModal(false);
  }

  async function handleDelete(id) {
    await deletePayment(id);
    toast.success('Payment deleted');
    setDeleteTarget(null);
  }

  function exportExcel() {
    const headers = ['ID', 'Client', 'Invoice', 'Service', 'Project Value', 'Discount', 'Final', 'Advance', 'Due', 'Due Date', 'Status', 'Mode'];
    const rows = filtered.map(p => {
      const client = clients.find(c => c.id === p.clientId);
      return [p.id, client?.name || p.clientId, p.invoiceNo, p.serviceName, p.projectValue, p.discount, p.finalAmount, p.advance, p.due, p.dueDate, p.status, p.mode];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payments exported');
  }

  const f = (key) => (e) => setForm(prev => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const next = { ...prev, [key]: val };
    const pv = Number(next.projectValue || 0);
    const disc = Number(next.discount || 0);
    next.finalAmount = pv - disc;
    next.remaining = next.finalAmount - Number(next.advance || 0);
    next.due = next.status === 'Paid' ? 0 : next.remaining;
    return next;
  });

  const getClientName = (id) => clients.find(c => c.id === id)?.name || id;

  const columns = [
    { key: 'id', label: 'ID', width: 90, render: (v) => <span className="font-mono" style={{ fontSize: 11, color: '#6B7280' }}>{v}</span> },
    { key: 'clientId', label: 'Client', sortable: true, render: (v) => <strong>{getClientName(v)}</strong> },
    { key: 'invoiceNo', label: 'Invoice', width: 110, render: (v) => <span style={{ fontSize: 12, color: '#22C55E' }}>{v || '—'}</span> },
    { key: 'finalAmount', label: 'Amount', width: 100, render: (v) => <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span> },
    { key: 'advance', label: 'Received', width: 100, render: (v) => <span style={{ color: '#22C55E' }}>{formatCurrency(v)}</span> },
    { key: 'due', label: 'Due', width: 100, render: (v, r) => (
      <span style={{ color: r.status !== 'Paid' && Number(v) > 0 ? '#EF4444' : '#6B7280', fontWeight: r.status !== 'Paid' && Number(v) > 0 ? 600 : 400 }}>
        {Number(v) > 0 ? formatCurrency(v) : '—'}
      </span>
    )},
    { key: 'dueDate', label: 'Due Date', width: 100, render: (v, r) => (
      <span style={{ fontSize: 12, color: v && new Date(v) < new Date() && r.status !== 'Paid' ? '#EF4444' : '#9CA3AF' }}>
        {formatDate(v)}
      </span>
    )},
    { key: 'status', label: 'Status', width: 90, render: (v) => <Badge status={v.toLowerCase()} /> },
    { key: 'mode', label: 'Mode', width: 100, render: (v) => {
      const Icon = MODE_ICONS[v];
      return v ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={14} style={{ opacity: 0.6 }} />}
          <span style={{ fontSize: 12 }}>{v}</span>
        </div>
      ) : <span style={{ color: '#6B7280' }}>—</span>;
    }},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><CreditCard size={22} /></div>
            <div>
              <h1 className="page-header-title">Payment Tracker</h1>
              <p className="page-header-desc">{payments.length} transactions · Track payments, dues, and revenue</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={Download} onClick={exportExcel}>Export</Button>
          <Button icon={Plus} onClick={openAdd}>Add Payment</Button>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Summary */}
        <div className="stats-grid">
          <StatCard icon={DollarSign} color="blue" value={formatCurrency(totalBilled)} label="Total Billed" />
          <StatCard icon={CheckCircle} color="green" value={formatCurrency(totalReceived)} label="Total Received" />
          <StatCard icon={Clock} color="yellow" value={formatCurrency(totalDue)} label="Pending Due" />
          <StatCard icon={AlertTriangle} color="red" value={overdueCount} label="Overdue" />
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by client, invoice..."
          filters={[
            { placeholder: 'All Statuses', value: filterStatus, onChange: setFilterStatus,
              options: PAYMENT_STATUSES },
          ]}
        />

        <Card style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            sortable
            emptyMessage="No payment records found"
            emptyIcon={CreditCard}
            actions={(row) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={14} /></button>
                <button className="btn-icon" style={{ color: '#EF4444' }} onClick={() => setDeleteTarget(row.id)} title="Delete"><Trash2 size={14} /></button>
              </div>
            )}
          />
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editId ? 'Edit Payment' : 'Add Payment Record'} size="lg">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select className="form-select" value={form.clientId} onChange={(e) => setForm(prev => ({ ...prev, clientId: e.target.value }))}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Invoice</label>
            <input className="form-input" value={form.invoiceNo} onChange={f('invoiceNo')} placeholder="MC/0001/2026-27" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={f('category')}>
              <option value="">Select</option>
              {SERVICE_CATEGORIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service</label>
            <input className="form-input" value={form.serviceName} onChange={f('serviceName')} placeholder="Services provided" />
          </div>
        </div>
        <div className="divider" />
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Project Value (₹)</label>
            <input className="form-input" type="number" value={form.projectValue} onChange={f('projectValue')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Discount (₹)</label>
            <input className="form-input" type="number" value={form.discount} onChange={f('discount')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Final Amount</label>
            <input className="form-input" value={formatCurrency(form.finalAmount)} readOnly style={{ color: '#22C55E', fontWeight: 600 }} />
          </div>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Advance (₹)</label>
            <input className="form-input" type="number" value={form.advance} onChange={f('advance')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Remaining</label>
            <input className="form-input" value={formatCurrency(form.remaining)} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Due Amount</label>
            <input className="form-input" value={formatCurrency(form.due)} readOnly style={{ color: form.due > 0 ? '#EF4444' : '#9CA3AF', fontWeight: 600 }} />
          </div>
        </div>
        <div className="divider" />
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mode</label>
            <select className="form-select" value={form.mode} onChange={f('mode')}>
              <option value="">Select</option>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input className="form-input" type="date" value={form.paymentDate} onChange={f('paymentDate')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={f('dueDate')} />
          </div>
          <div className="form-group">
            <label className="form-label">Reminder Status</label>
            <select className="form-select" value={form.reminderStatus} onChange={f('reminderStatus')}>
              {REMINDER_STATUSES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editId ? 'Update' : 'Save Payment'}</Button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Payment"
        message="This will permanently remove this payment record."
      />
    </div>
  );
}


