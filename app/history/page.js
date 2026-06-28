'use client';

import { useState } from 'react';
import { useStore, formatCurrency, formatDate, sanitizePhone } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import StatCard from '@/app/components/ui/StatCard';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { Card, CardHeader } from '@/app/components/ui/Card';
import SearchBar from '@/app/components/ui/SearchBar';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { useToast } from '@/app/components/ui/Toast';
import {
  History, Download, Trash2, CheckCircle, Clock, Printer, Mail,
  DollarSign, FileText, MessageCircle
} from 'lucide-react';

const LOGO_URL = 'https://files.catbox.moe/uuh5ur.png';

const TERMS = [
  'Work will begin only after advance payment confirmation.',
  'Revisions beyond the agreed scope may incur additional charges.',
  'All digital files remain property of Manhar Creatives until full payment.',
  'For queries: manharcreatives@gmail.com',
];

export default function InvoiceHistoryPage() {
  const { clients, invoices, payments, expenses, deleteInvoice, deletePayment, deleteExpense } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.id?.toLowerCase().includes(q) || inv.clientName?.toLowerCase().includes(q) || inv.business?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || inv.status === filterStatus;
    const matchMonth = !filterMonth || inv.date?.startsWith(filterMonth);
    return matchSearch && matchStatus && matchMonth;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalInvoiced = sorted.reduce((s, i) => s + (i.final || 0), 0);
  const totalPaid = sorted.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.final || 0), 0);
  const totalPending = sorted.filter(i => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + (i.final || 0), 0);

  const paidCount = invoices.filter(i => i.status === 'Paid').length;
  const pendingCount = invoices.filter(i => i.status === 'Pending').length;
  const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

  const months = [...new Set(invoices.map(i => i.date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  async function handleDelete(id) {
    await deleteInvoice(id);
    const linkedPayments = payments.filter(p => p.invoiceNo === id);
    for (const payment of linkedPayments) {
      const linkedExpenses = expenses.filter(e => e.paymentId === payment.id);
      for (const exp of linkedExpenses) {
        await deleteExpense(exp.id);
      }
      await deletePayment(payment.id);
    }
    toast.success('Invoice deleted successfully');
    setDeleteTarget(null);
  }

  function handlePrint(inv) {
    // Open at exact A4 pixel size (210mm × 297mm at 96dpi = 794×1123px)
    const w = window.open('', '_blank', 'width=900,height=700,menubar=no,toolbar=no,location=no,scrollbars=yes');
    if (!w) return;

    const client = clients.find(c => c.id === inv.clientId);
    const statusColor = inv.status === 'Paid' ? '#22C55E' : inv.status === 'Partial' ? '#3B82F6' : '#F59E0B';
    const statusBg   = inv.status === 'Paid' ? 'rgba(34,197,94,0.18)' : inv.status === 'Partial' ? 'rgba(59,130,246,0.18)' : 'rgba(245,158,11,0.18)';

    const lineItems = inv.lineItems?.length
      ? inv.lineItems
      : (inv.services || '').split(',').map(s => s.trim()).filter(Boolean).map((s, i, arr) => {
          const total = inv.amount || 0;
          const each = arr.length > 0 ? Math.floor(total / arr.length) : total;
          const amt = i === arr.length - 1 ? total - each * (arr.length - 1) : each;
          return { description: s, qty: 1, rate: amt, amount: amt };
        });

    const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

    const serviceRowsHtml = lineItems.length > 0
      ? lineItems.map((item, i) => `
        <tr>
          <td style="padding:7px 10px;color:#888;font-size:11px;border-bottom:1px solid #f0f0f0">${i + 1}</td>
          <td style="padding:7px 10px;font-weight:500;color:#111;font-size:12px;border-bottom:1px solid #f0f0f0">${item.description || '—'}</td>
          <td style="padding:7px 10px;text-align:center;font-size:11px;color:#555;border-bottom:1px solid #f0f0f0">${item.qty || 1}</td>
          <td style="padding:7px 10px;text-align:right;font-size:11px;color:#555;border-bottom:1px solid #f0f0f0">${item.rate ? fmt(item.rate) : '—'}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:600;color:#111;font-size:11px;border-bottom:1px solid #f0f0f0">${item.amount ? fmt(item.amount) : '—'}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="padding:12px;color:#bbb;text-align:center;font-size:11px">No services listed</td></tr>`;

    const discountHtml = inv.discount > 0
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:11px;color:#F59E0B"><span>Discount</span><span>— ${formatCurrency(inv.discount)}</span></div>`
      : '';

    const termsHtml = TERMS.map((t, i) =>
      `<div style="margin-bottom:3px"><span style="color:#22C55E;font-weight:700">${i+1}.</span> ${t}</div>`
    ).join('');

    w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=210mm">
  <title>${inv.id} — Manhar Creatives</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    html {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      font-family: 'Inter', sans-serif;
      color: #111;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .page {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
    }

    .hdr {
      background: linear-gradient(135deg, #0B0F0E 0%, #111827 100%) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 16px 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .ftr {
      background: #0B0F0E !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 14px 15px;
      text-align: center;
      page-break-inside: avoid;
    }

    .total-box {
      background: #0B0F0E !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      margin-top: 5px;
    }

    .notes-box {
      background: #f8f9fa !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      border-radius: 5px;
      padding: 10px 12px;
      border-left: 3px solid #22C55E;
    }

    table { width:100%; border-collapse:collapse; }
    thead tr {
      background: #f5f6f8 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    th {
      padding: 7px 10px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #888;
      border-bottom: 2px solid #e5e7eb;
      text-align: left;
    }
    th:nth-child(3) { text-align: center; }
    th:nth-child(4), th:nth-child(5) { text-align: right; }

    @page {
      size: A4 portrait;
      margin: 15mm;
    }
  </style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <div>
      <img src="${LOGO_URL}" alt="Manhar Creatives"
           style="height:44px;width:auto;object-fit:contain;display:block;margin-bottom:7px" />
      <div style="font-size:9px;color:#9CA3AF;line-height:1.75">
        <div>Visnagar, Mahesana, Gujarat — 384315</div>
        <div>+91 97145 71522 &nbsp;|&nbsp; manharcreatives@gmail.com</div>
        <div>www.manharcreatives.com</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:900;color:#22C55E;font-family:'Outfit',sans-serif;letter-spacing:-1px;line-height:1">INVOICE</div>
      <div style="font-size:11.5px;color:#fff;font-weight:600;margin-top:4px">${inv.id}</div>
      <div style="margin-top:8px;font-size:10px;color:#9CA3AF;line-height:1.7">
        <div>Date: <span style="color:#fff">${formatDate(inv.date)}</span></div>
      </div>
      <div style="margin-top:6px">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:0.6px;background:${statusBg};color:${statusColor};border:1px solid ${statusColor}">
          ${(inv.status || 'PENDING').toUpperCase()}
        </span>
      </div>
    </div>
  </div>

  <div style="padding:12px 15px;border-bottom:1px solid #eee;display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div>
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px">Bill To</div>
      <div style="font-size:15px;font-weight:800;color:#0B0F0E;margin-bottom:2px">${inv.clientName || '—'}</div>
      <div style="font-size:11.5px;color:#444;font-weight:600">${inv.business || ''}</div>
      ${client ? `<div style="font-size:10px;color:#666;margin-top:4px;line-height:1.6">${client.city && client.state ? `<div>${client.city}, ${client.state}</div>` : ''}${client.location ? `<div>${client.location}</div>` : ''}${client.phone ? `<div>${client.phone}</div>` : ''}${client.email ? `<div>${client.email}</div>` : ''}</div>` : ''}
    </div>
    <div>
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px">Payment Info</div>
      <div style="font-size:10px;color:#555;line-height:1.85">
        <div><strong style="color:#333">Bank:</strong> Bank of Baroda</div>
        <div><strong style="color:#333">A/C Name:</strong> Prajapati Utsav Dineshbhai</div>
        <div><strong style="color:#333">A/C No:</strong> 40840100012114</div>
        <div><strong style="color:#333">IFSC:</strong> BARB0SONVIS &nbsp;|&nbsp; <strong style="color:#333">Branch:</strong> Sona Complex, Visnagar</div>
      </div>
    </div>
  </div>

  <div style="padding:0 15px">
    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th>Service / Description</th>
          <th style="width:42px;text-align:center">Qty</th>
          <th style="width:78px;text-align:right">Rate (₹)</th>
          <th style="width:88px;text-align:right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${serviceRowsHtml}</tbody>
    </table>
  </div>

  <div style="padding:8px 15px 12px;display:flex;justify-content:flex-end">
    <div style="min-width:220px">
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555">
        <span>Subtotal</span>
        <span style="font-weight:600;color:#222">${formatCurrency(inv.amount)}</span>
      </div>
      ${discountHtml}
      <div class="total-box">
        <span style="font-size:12px;font-weight:700;color:#fff">Total Amount</span>
        <span style="font-size:14px;font-weight:800;color:#22C55E">${formatCurrency(inv.final)}</span>
      </div>
    </div>
  </div>

  ${inv.notes ? `
  <div style="padding:0 15px 10px;display:grid;grid-template-columns:1fr 1.3fr;gap:12px">
    <div class="notes-box">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Notes</div>
      <div style="font-size:10px;color:#444;line-height:1.6">${inv.notes}</div>
    </div>
    <div>
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Terms &amp; Conditions</div>
      <div style="font-size:9px;color:#666;line-height:1.7">${termsHtml}</div>
    </div>
  </div>
  ` : `
  <div style="padding:0 15px 10px">
    <div>
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Terms &amp; Conditions</div>
      <div style="font-size:9px;color:#666;line-height:1.7">${termsHtml}</div>
    </div>
  </div>
  `}

  <div style="padding:8px 15px 12px;display:flex;justify-content:center;border-top:1px solid #eee">
    <div style="text-align:center">
      <img src="https://files.catbox.moe/6y64bb.png" alt="Signature" style="height:60px;width:auto;object-fit:contain;display:block;margin:0 auto 4px" />
      <div style="font-size:9px;color:#888">Authorized Signature</div>
      <div style="font-size:10px;font-weight:700;color:#333;margin-top:2px">Manhar Creatives</div>
    </div>
  </div>

  <div class="ftr">
    <div style="font-size:9.5px;color:#9CA3AF">Thank you for your business! We look forward to working with you again.</div>
    <div style="font-size:8.5px;color:#6B7280;margin-top:2px">www.manharcreatives.com &nbsp;|&nbsp; +91 97145 71522 &nbsp;|&nbsp; manharcreatives@gmail.com</div>
  </div>

</div>
<script>
  var imgs = document.querySelectorAll('img');
  var total = imgs.length, loaded = 0;
  function doPrint() { setTimeout(function(){ window.focus(); window.print(); }, 500); }
  if (total === 0) { doPrint(); }
  else {
    imgs.forEach(function(img) {
      if (img.complete) { if (++loaded >= total) doPrint(); }
      else { img.onload = img.onerror = function() { if (++loaded >= total) doPrint(); }; }
    });
  }
</script>
</body>
</html>`);
    w.document.close();
  }

  const columns = [
    { key: 'id', label: 'Invoice No.', width: 130, sortable: true, render: (v) => (
      <span className="font-mono" style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>{v}</span>
    )},
    { key: 'date', label: 'Date', width: 100, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
    { key: 'clientName', label: 'Client', sortable: true, render: (v) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{v?.[0]}</div>
        <strong>{v}</strong>
      </div>
    )},
    { key: 'amount', label: 'Amount', width: 100, render: (v) => formatCurrency(v) },
    { key: 'discount', label: 'Discount', width: 90, render: (v) => v ? <span style={{ color: '#F59E0B' }}>{formatCurrency(v)}</span> : '—' },
    { key: 'final', label: 'Final', width: 100, render: (v) => <span style={{ fontWeight: 700, color: '#22C55E', fontSize: 14 }}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', width: 100, render: (v) => <Badge status={v.toLowerCase()} /> },
    { key: 'mode', label: 'Mode', width: 80, render: (v) => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { key: 'actions', label: 'Actions', width: 160, render: (_, row) => {
      const client = clients.find(c => c.id === row.clientId);
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => handlePrint(row)} title="Print"><Printer size={14} /></button>
          <button className="btn-icon" style={{ color: '#3B82F6' }} onClick={() => {
            if (!client) { toast.warning('Client not found'); return; }
            const subject = encodeURIComponent(`Invoice ${row.id} — Manhar Creatives`);
            const body = encodeURIComponent(`Dear ${row.clientName},\n\nPlease find the invoice ${row.id} for ₹${Number(row.final).toLocaleString('en-IN')} attached.\n\nThank you,\nManhar Creatives`);
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(client.email || '')}&su=${subject}&body=${body}`, '_blank');
          }} title="Email"><Mail size={14} /></button>
          <button className="btn-icon" style={{ color: '#25D366' }} onClick={() => {
            if (!client) { toast.warning('Client not found'); return; }
            window.open(`https://wa.me/91${sanitizePhone(client.phone || '')}?text=${encodeURIComponent(`Dear ${row.clientName}, Invoice ${row.id} for ₹${Number(row.final).toLocaleString('en-IN')}. Kindly check and pay. - Manhar Creatives`)}`, '_blank');
          }} title="WhatsApp"><MessageCircle size={14} /></button>
          <button className="btn-icon" style={{ color: '#EF4444' }} onClick={() => setDeleteTarget(row.id)} title="Delete"><Trash2 size={14} /></button>
        </div>
      );
    }},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><History size={22} /></div>
            <div>
              <h1 className="page-header-title">Invoice History</h1>
              <p className="page-header-desc">{sorted.length} invoices · Complete log of all generated invoices</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        <div className="stats-grid">
          <StatCard icon={DollarSign} color="blue" value={totalInvoiced} prefix="₹" label="Total Invoiced" />
          <StatCard icon={CheckCircle} color="green" value={totalPaid} prefix="₹" label="Total Paid" />
          <StatCard icon={Clock} color="yellow" value={totalPending} prefix="₹" label="Pending / Overdue" />
          <StatCard icon={FileText} color="purple" value={invoices.length} label="Total Invoices" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Paid', count: paidCount, color: '#22C55E' },
            { label: 'Pending', count: pendingCount, color: '#F59E0B' },
            { label: 'Overdue', count: overdueCount, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '12px 16px', textAlign: 'center'
            }}>
              <div suppressHydrationWarning style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search invoice, client..."
          filters={[
            { placeholder: 'All Statuses', value: filterStatus, onChange: setFilterStatus,
              options: ['Paid', 'Partial', 'Pending', 'Overdue'] },
            { placeholder: 'All Months', value: filterMonth, onChange: setFilterMonth,
              options: months.map(m => ({
                value: m,
                label: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              })) },
          ]}
        />

        <Card style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={sorted}
            pageSize={10}
            sortable
            emptyMessage="No invoices found"
            emptyIcon={History}
            selectedRows={[]}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Invoice"
        message="This will permanently remove this invoice and all linked payments and expenses. This action cannot be undone."
      />
    </div>
  );
}
