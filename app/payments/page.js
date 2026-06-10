'use client';

import { useState } from 'react';
import { useStore, formatCurrency, formatDate, getPaymentExpenses, calcPaymentProfit } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import StatCard from '@/app/components/ui/StatCard';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { Card, CardHeader } from '@/app/components/ui/Card';
import Modal, { ModalFooter } from '@/app/components/ui/Modal';
import SearchBar from '@/app/components/ui/SearchBar';
import { useToast } from '@/app/components/ui/Toast';
import {
  CreditCard, DollarSign, Clock, AlertTriangle,
  Download, Pencil, CheckCircle, ArrowRightCircle,
  Landmark, Smartphone, Wallet, Ban as Bank, Receipt, Eye
} from 'lucide-react';

const PAYMENT_STATUSES = ['Paid', 'Partial', 'Pending', 'Overdue'];
const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash', 'Cheque'];

const MODE_ICONS = { 'UPI': Smartphone, 'Bank Transfer': Landmark, 'Cash': Wallet, 'Cheque': Bank };

export default function PaymentsPage() {
  const { clients, payments, invoices, expenses, updatePayment, updateInvoice } = useStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [editAdvance, setEditAdvance] = useState(0);
  const [editStatus, setEditStatus] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editDate, setEditDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fullPayId, setFullPayId] = useState(null);
  const [fullPayMode, setFullPayMode] = useState('');
  const [fullPayDate, setFullPayDate] = useState('');
  const [expenseViewPayment, setExpenseViewPayment] = useState(null);

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

  function openEdit(p) {
    setEditPayment(p);
    setEditAdvance(Number(p.advance || 0));
    setEditStatus(p.status);
    setEditMode(p.mode || '');
    setEditDate(p.paymentDate || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editPayment) return;
    const remaining = Number(editPayment.finalAmount || 0) - Number(editAdvance || 0);
    const due = editStatus === 'Paid' ? 0 : remaining;

    await updatePayment(editPayment.id, {
      advance: Number(editAdvance || 0),
      remaining, due,
      status: editStatus,
      mode: editMode,
      paymentDate: editDate,
    });

    await updateInvoice(editPayment.invoiceNo, {
      status: editStatus,
      mode: editMode,
    });

    toast.success('Payment updated');
    setShowModal(false);
    setEditPayment(null);
  }

  async function handleFullPayment() {
    if (!fullPayId) return;
    const p = payments.find(x => x.id === fullPayId);
    if (!p) return;
    const advance = Number(p.finalAmount || 0);

    await updatePayment(p.id, {
      advance, remaining: 0, due: 0,
      status: 'Paid',
      mode: fullPayMode,
      paymentDate: fullPayDate || new Date().toISOString().split('T')[0],
    });

    await updateInvoice(p.invoiceNo, {
      status: 'Paid',
      mode: fullPayMode,
    });

    toast.success('Full payment received');
    setFullPayId(null);
    setFullPayMode('');
    setFullPayDate('');
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

  const getClientName = (id) => clients.find(c => c.id === id)?.name || id;

  const columns = [
    { key: 'id', label: 'ID', width: 90, render: (v) => <span className="font-mono" style={{ fontSize: 11, color: '#6B7280' }}>{v}</span> },
    { key: 'clientId', label: 'Client', sortable: true, render: (v) => <strong>{getClientName(v)}</strong> },
    { key: 'invoiceNo', label: 'Invoice', width: 110, render: (v) => <span style={{ fontSize: 12, color: '#22C55E' }}>{v || '—'}</span> },
    { key: 'finalAmount', label: 'Amount', width: 100, render: (v) => <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span> },
    { key: 'advance', label: 'Received', width: 100, render: (v) => <span style={{ color: '#22C55E' }}>{formatCurrency(v)}</span> },
    { key: 'expenses', label: 'Expenses', width: 90, render: (_, row) => {
      const amt = getPaymentExpenses(expenses, row.id);
      return amt > 0 ? <span style={{ color: '#EF4444', fontWeight: 600 }}>{formatCurrency(amt)}</span> : <span style={{ color: '#6B7280' }}>—</span>;
    }},
    { key: 'profit', label: 'Net Profit', width: 100, render: (_, row) => {
      const { profit, margin } = calcPaymentProfit(row, expenses);
      const color = profit > 0 ? '#22C55E' : profit < 0 ? '#EF4444' : '#6B7280';
      return (
        <div>
          <div style={{ color, fontWeight: 600, fontSize: 13 }}>{formatCurrency(profit)}</div>
          <div style={{ fontSize: 10, color: margin > 0 ? '#22C55E' : '#6B7280' }}>{margin > 0 ? `${margin}%` : '—'}</div>
        </div>
      );
    }},
    { key: 'due', label: 'Due', width: 90, render: (v, r) => (
      <span style={{ color: r.status !== 'Paid' && Number(v) > 0 ? '#EF4444' : '#6B7280', fontWeight: r.status !== 'Paid' && Number(v) > 0 ? 600 : 400 }}>
        {Number(v) > 0 ? formatCurrency(v) : '—'}
      </span>
    )},
    { key: 'status', label: 'Status', width: 90, render: (v) => <Badge status={v.toLowerCase()} /> },
    { key: 'mode', label: 'Mode', width: 80, render: (v) => {
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
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Summary */}
        <div className="stats-grid">
          <StatCard icon={DollarSign} color="blue" value={totalBilled} label="Total Billed" prefix="₹" />
          <StatCard icon={CheckCircle} color="green" value={totalReceived} label="Total Received" prefix="₹" />
          <StatCard icon={Clock} color="yellow" value={totalDue} label="Pending Due" prefix="₹" />
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
                <button className="btn-icon" style={{ color: '#EF4444' }} onClick={() => setExpenseViewPayment(row)} title="View Expenses"><Receipt size={14} /></button>
                <button className="btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={14} /></button>
                {row.status === 'Partial' && (
                  <button className="btn-icon" style={{ color: '#22C55E' }} onClick={() => {
                    setFullPayId(row.id);
                    setFullPayMode(row.mode || '');
                    setFullPayDate(row.paymentDate || new Date().toISOString().split('T')[0]);
                  }} title="Full Payment Received"><ArrowRightCircle size={14} /></button>
                )}
              </div>
            )}
          />
        </Card>
      </div>

      {/* Edit Payment Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditPayment(null); }}
        title="Edit Payment" size="md">
        {editPayment && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{getClientName(editPayment.clientId)}</div>
              <div style={{ fontSize: 12, color: '#22C55E', marginTop: 2 }}>{editPayment.invoiceNo}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Total: {formatCurrency(editPayment.finalAmount)} · Due: {formatCurrency(editPayment.due)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Advance Received (₹)</label>
              <input className="form-input" type="number" value={editAdvance} onChange={e => setEditAdvance(e.target.value)} placeholder="0" />
            </div>
            {(editStatus === 'Partial' || editStatus === 'Paid') && (
              <div style={{ fontSize: 12, color: '#F59E0B', marginBottom: 12 }}>
                Remaining: {formatCurrency(Number(editPayment.finalAmount || 0) - Number(editAdvance || 0))}
              </div>
            )}
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mode</label>
                <select className="form-select" value={editMode} onChange={e => setEditMode(e.target.value)}>
                  <option value="">Select</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Date</label>
                <input className="form-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => { setShowModal(false); setEditPayment(null); }}>Cancel</Button>
              <Button onClick={handleSave}>Update Payment</Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Full Payment Received Modal */}
      <Modal open={!!fullPayId} onClose={() => { setFullPayId(null); setFullPayMode(''); setFullPayDate(''); }}
        title="Full Payment Received" size="sm">
        {fullPayId && (() => {
          const p = payments.find(x => x.id === fullPayId);
          if (!p) return null;
          const remainingAmt = Number(p.finalAmount || 0) - Number(p.advance || 0);
          return (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{getClientName(p.clientId)}</div>
                <div style={{ fontSize: 12, color: '#22C55E', marginTop: 2 }}>{p.invoiceNo}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#22C55E', marginTop: 8 }}>{formatCurrency(remainingAmt)}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Remaining amount to collect</div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={fullPayMode} onChange={e => setFullPayMode(e.target.value)}>
                    <option value="">Select</option>
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Date</label>
                  <input className="form-input" type="date" value={fullPayDate} onChange={e => setFullPayDate(e.target.value)} />
                </div>
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => { setFullPayId(null); setFullPayMode(''); setFullPayDate(''); }}>Cancel</Button>
                <Button onClick={handleFullPayment}>Confirm Full Payment</Button>
              </ModalFooter>
            </>
          );
        })()}
      </Modal>

      {/* Expense View Modal */}
      <Modal open={!!expenseViewPayment} onClose={() => setExpenseViewPayment(null)}
        title="Project Expenses" size="md">
        {expenseViewPayment && (() => {
          const p = expenseViewPayment;
          const paymentExpenses = expenses.filter(e => e.paymentId === p.id);
          const { revenue, expenses: totalExp, profit, margin } = calcPaymentProfit(p, expenses);
          return (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{getClientName(p.clientId)}</div>
                <div style={{ fontSize: 12, color: '#22C55E', marginTop: 2 }}>{p.invoiceNo}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                  <span>Received: <strong style={{ color: '#22C55E' }}>{formatCurrency(revenue)}</strong></span>
                  <span>Expenses: <strong style={{ color: '#EF4444' }}>{formatCurrency(totalExp)}</strong></span>
                  <span>Profit: <strong style={{ color: profit >= 0 ? '#22C55E' : '#EF4444' }}>{formatCurrency(profit)}</strong></span>
                  <span>Margin: <strong style={{ color: margin > 0 ? '#22C55E' : '#6B7280' }}>{margin}%</strong></span>
                </div>
              </div>
              {paymentExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#6B7280', fontSize: 13 }}>
                  No expenses recorded for this project
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Vendor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentExpenses.map(e => (
                        <tr key={e.id}>
                          <td><span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{e.category}</span></td>
                          <td style={{ fontSize: 12, color: '#9CA3AF' }}>{e.description || '—'}</td>
                          <td style={{ color: '#EF4444', fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                          <td style={{ fontSize: 12 }}>{formatDate(e.date)}</td>
                          <td style={{ fontSize: 12 }}>{e.vendor || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>Total</td>
                        <td style={{ fontWeight: 700, color: '#EF4444', padding: '8px 12px', borderTop: '1px solid var(--border)' }}>{formatCurrency(totalExp)}</td>
                        <td colSpan={2} style={{ borderTop: '1px solid var(--border)' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <ModalFooter>
                <Button variant="secondary" onClick={() => setExpenseViewPayment(null)}>Close</Button>
              </ModalFooter>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}


