'use client';

import { useState, useRef } from 'react';
import { useStore, generateInvoiceNumber, generatePaymentId, formatCurrency, formatDate } from '@/app/lib/store';
import Button from '@/app/components/ui/Button';
import { Card, CardHeader } from '@/app/components/ui/Card';
import { useToast } from '@/app/components/ui/Toast';
import { FileText, Printer, Plus, Trash2, Eye, CheckCircle, ChevronRight as ChevronRightIcon } from 'lucide-react';

const EMPTY_LINE = { description: '', qty: 1, rate: '', amount: 0 };
const TERMS = `1. Revisions beyond the agreed scope may incur additional charges.
2. All digital files remain property of Manhar Creatives until full payment.
3. For any queries, contact us at manharcreatives@gmail.com`;

export default function InvoicePage() {
  const { clients, invoices, addInvoice, payments, addPayment } = useStore();
  const toast = useToast();

  const [clientId, setClientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountVal, setDiscountVal] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [paymentMode, setPaymentMode] = useState('');
  const [advancePaid, setAdvancePaid] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedInvoiceNo, setSavedInvoiceNo] = useState('');
  const printRef = useRef(null);

  const client = clients.find(c => c.id === clientId);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * Number(discountVal) / 100) : Number(discountVal) || 0;
  const total = subtotal - discountAmount;
  const balance = total - Number(advancePaid || 0);

  function updateLine(index, key, value) {
    setLines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      if (key === 'qty' || key === 'rate') {
        next[index].amount = Number(next[index].qty || 0) * Number(next[index].rate || 0);
      }
      return next;
    });
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(i) { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleGenerate() {
    if (!clientId) { toast.warning('Please select a client'); return; }
    if (lines.every(l => !l.description)) { toast.warning('Add at least one service'); return; }

    const invoiceNo = generateInvoiceNumber(invoices);
    const servicesStr = lines.filter(l => l.description).map(l => l.description).join(', ');
    const newInvoice = {
      id: invoiceNo, date: invoiceDate, clientId,
      clientName: client?.name || '', business: client?.business || '',
      services: servicesStr, amount: subtotal, discount: discountAmount,
      final: total, status: paymentStatus, mode: paymentMode, pdfLink: '',
      lineItems: lines.filter(l => l.description).map(l => ({
        description: l.description,
        qty: Number(l.qty) || 1,
        rate: Number(l.rate) || 0,
        amount: Number(l.amount) || 0,
      })),
    };
    await addInvoice(newInvoice);
    setSavedInvoiceNo(invoiceNo);
    setSaved(true);

    const effectiveAdvance = paymentStatus === 'Paid'
      ? Number(total) : Number(advancePaid || 0);
    const newPayment = {
      id: generatePaymentId(payments),
      clientId, invoiceNo, category: '', serviceName: servicesStr,
      projectValue: subtotal, discount: discountAmount, finalAmount: total,
      advance: effectiveAdvance, remaining: total - effectiveAdvance, due: paymentStatus === 'Paid' ? 0 : (total - effectiveAdvance),
      dueDate: dueDate || '', status: paymentStatus, mode: paymentMode,
      paymentDate: paymentStatus === 'Paid' ? invoiceDate : '',
      reminderStatus: 'None', latePayment: false,
    };
    await addPayment(newPayment);
    toast.success(`Invoice ${invoiceNo} generated successfully`);
  }

  function handlePrint() {
    const el = document.getElementById('invoice-print');
    if (!el) return;
    // Open at exact A4 pixel size (210mm × 297mm at 96dpi = 794×1123px)
    const w = window.open('', '_blank', 'width=900,height=700,menubar=no,toolbar=no,location=no,scrollbars=yes');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=210mm">
  <title>${invoiceNo} — Manhar Creatives</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
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
    #invoice-print {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
  </style>
</head>
<body>
${el.outerHTML}
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
<\/script>
</body>
</html>`);
    w.document.close();
  }

  function resetForm() {
    setClientId(''); setLines([{ ...EMPTY_LINE }]); setDiscountVal(0);
    setNotes('');
    setPaymentStatus('Pending'); setPaymentMode(''); setAdvancePaid(0);
    setSaved(false); setSavedInvoiceNo('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
  }

  const invoiceNo = saved ? savedInvoiceNo : generateInvoiceNumber(invoices);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><FileText size={22} /></div>
            <div>
              <h1 className="page-header-title">Invoice Generator</h1>
              <p className="page-header-desc">Create professional invoices for clients</p>
            </div>
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          {saved && <span className="badge badge-paid"><CheckCircle size={10} /> Invoice Saved</span>}
          {!saved ? (
            <Button icon={FileText} onClick={handleGenerate}>Generate & Save</Button>
          ) : (
            <>
              <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print / PDF</Button>
              <Button icon={Plus} onClick={resetForm}>New Invoice</Button>
            </>
          )}
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        <div className="invoice-layout">
          {/* Invoice Preview */}
          <div>
            <div ref={printRef} id="invoice-print" style={{
              background: '#fff', color: '#111', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)', fontFamily: "'Inter', sans-serif",
            }}>
              <div style={{ background: 'linear-gradient(135deg, #0B0F0E 0%, #111827 100%)', padding: '32px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://res.cloudinary.com/dm2hjn5wp/image/upload/q_auto/f_auto/v1779002789/Manhar_Creatives_Logo_lgwias.png"
                        alt="Manhar Creatives"
                        style={{ height: 52, width: 'auto', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.8, marginTop: 8 }}>
                      <div>Visnagar, Mahesana, Gujarat — 384315</div>
                      <div>+91 97145 71522 | manharcreatives@gmail.com</div>
                      <div>www.manharcreatives.com</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', fontFamily: 'Outfit, sans-serif', letterSpacing: -1 }}>INVOICE</div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginTop: 4 }}>{invoiceNo}</div>
                    <div style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
                      <div>Date: <span style={{ color: '#fff' }}>{formatDate(invoiceDate)}</span></div>
                      {dueDate && <div>Due: <span style={{ color: '#F59E0B' }}>{formatDate(dueDate)}</span></div>}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                        background: paymentStatus === 'Paid' ? 'rgba(34,197,94,0.2)' : paymentStatus === 'Partial' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                        color: paymentStatus === 'Paid' ? '#22C55E' : paymentStatus === 'Partial' ? '#3B82F6' : '#F59E0B',
                        border: `1px solid ${paymentStatus === 'Paid' ? '#22C55E' : paymentStatus === 'Partial' ? '#3B82F6' : '#F59E0B'}`,
                      }}>{paymentStatus.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px 40px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 8 }}>Bill To</div>
                    {client ? (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{client.name}</div>
                        <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 4 }}>{client.business}</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>
                          {client.city && client.state && <div>{client.city}, {client.state}</div>}
                          {client.location && <div>{client.location}</div>}
                          {client.phone && <div>{client.phone}</div>}
                          {client.email && <div>{client.email}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>Select a client to populate details</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 8 }}>Payment Info</div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.9 }}>
                      <div><strong>Bank:</strong> Bank of Baroda</div>
                      <div><strong>A/C:</strong> Prajapati Utsav Dineshbhai</div>
                      <div><strong>A/C No:</strong> 40840100012114</div>
                      <div><strong>IFSC:</strong> BARB0SONVIS</div>
                      <div><strong>Branch:</strong> Sona Complex, Visnagar</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 40px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', borderBottom: '2px solid #e5e7eb' }}>#</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', borderBottom: '2px solid #e5e7eb' }}>Service</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', borderBottom: '2px solid #e5e7eb' }}>Qty</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', borderBottom: '2px solid #e5e7eb' }}>Rate (₹)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', borderBottom: '2px solid #e5e7eb' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px', color: '#888', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '14px', fontWeight: 500, color: '#222', fontSize: 13, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{line.description || <span style={{ color: '#ccc', fontStyle: 'italic' }}>—</span>}</td>
                        <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: '#555' }}>{line.qty}</td>
                        <td style={{ padding: '14px', textAlign: 'right', fontSize: 13, color: '#555' }}>{line.rate ? `₹${Number(line.rate).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#111', fontSize: 13 }}>{line.amount ? `₹${Number(line.amount).toLocaleString('en-IN')}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '20px 40px 28px', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <div style={{ minWidth: 260, maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#555' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600, color: '#222' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#F59E0B' }}>
                      <span>Discount {discountType === 'percent' ? `(${discountVal}%)` : ''}</span>
                      <span>— ₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: 8, background: '#0B0F0E', borderRadius: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total Amount</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#22C55E' }}>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  {Number(advancePaid) > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 8, fontSize: 13, color: '#22C55E' }}>
                        <span>Advance Received</span>
                        <span>₹{Number(advancePaid).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: '#fff3cd', borderRadius: 8, border: '1px solid #F59E0B' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Balance Due</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#92400e' }}>₹{balance.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {notes && (
                <div style={{ padding: '0 40px 20px' }}>
                  <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, borderLeft: '3px solid #22C55E' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>{notes}</div>
                  </div>
                </div>
              )}

              <div style={{ padding: '0 40px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 8 }}>Terms & Conditions</div>
                <div style={{ fontSize: 11, color: '#999', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{TERMS}</div>
              </div>

              <div style={{ padding: '16px 40px 32px', display: 'flex', justifyContent: 'center', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://res.cloudinary.com/dm2hjn5wp/image/upload/q_auto/f_png/v1779208013/1000223413-removebg-preview_nthrxg.png" alt="Signature" style={{ height: 70, width: 'auto', objectFit: 'contain', marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: '#888' }}>Authorized Signature</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginTop: 2 }}>Manhar Creatives</div>
                </div>
              </div>

              <div style={{ background: '#0B0F0E', padding: '14px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Thank you for your business!</div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>Manhar Creatives — Visnagar, Mahesana, Gujarat</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>+91 97145 71522 | manharcreatives@gmail.com | www.manharcreatives.com</div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <CardHeader title="Client Details" />
              <div className="form-group">
                <label className="form-label">Search Client (ID or Name)</label>
                <input className="form-input" list="client-options" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Type to search..." />
                <datalist id="client-options">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </datalist>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Invoice Date</label>
                  <input className="form-input" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span className="card-title">Services</span>
                <Button variant="secondary" size="sm" icon={Plus} onClick={addLine}>Add Line</Button>
              </div>
              {lines.map((line, i) => (
                <div key={i} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>Line {i + 1}</span>
                    {lines.length > 1 && (
                      <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14 }} onClick={() => removeLine(i)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <input className="form-input" placeholder="Service description" value={line.description}
                    onChange={e => updateLine(i, 'description', e.target.value)} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>QTY</label>
                      <input className="form-input" type="number" min={1} value={line.qty}
                        onChange={e => updateLine(i, 'qty', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>RATE (₹)</label>
                      <input className="form-input" type="number" value={line.rate}
                        onChange={e => updateLine(i, 'rate', e.target.value)} />
                    </div>
                  </div>
                  {line.amount > 0 && (
                    <div style={{ marginTop: 8, textAlign: 'right', color: '#22C55E', fontWeight: 600, fontSize: 13 }}>
                      ₹{Number(line.amount).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </Card>

            <Card>
              <CardHeader title="Discount & Payment" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['fixed', 'percent'].map(t => (
                  <Button key={t} size="sm" variant={discountType === t ? 'primary' : 'secondary'} onClick={() => setDiscountType(t)}>
                    {t === 'fixed' ? '₹ Fixed' : '% Percent'}
                  </Button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Discount {discountType === 'percent' ? '(%)' : '(₹)'}</label>
                <input className="form-input" type="number" value={discountVal} onChange={e => setDiscountVal(e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Advance Paid (₹)</label>
                <input className="form-input" type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} placeholder="0" />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                    <option>Pending</option><option>Partial</option><option>Paid</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                    <option value="">Select</option>
                    <option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Notes" />
              <textarea className="form-textarea" rows={3} value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="Custom message..." />
            </Card>

            <Card style={{ background: 'var(--bg-main)', border: '1px solid var(--primary-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#22C55E', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Summary</div>
              {[
                ['Subtotal', formatCurrency(subtotal), ''],
                ['Discount', `— ${formatCurrency(discountAmount)}`, '#F59E0B'],
                ['Total', formatCurrency(total), '#22C55E'],
                ['Advance', formatCurrency(advancePaid), '#22C55E'],
                ['Balance Due', formatCurrency(balance), balance > 0 ? '#EF4444' : '#22C55E'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: '#9CA3AF' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color || 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!saved ? (
                <Button className="w-full" style={{ justifyContent: 'center' }} onClick={handleGenerate}>
                  Generate & Save Invoice
                </Button>
              ) : (
                <>
                  <div style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary-border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>✓ Invoice Saved</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{savedInvoiceNo}</div>
                  </div>
                  <Button className="w-full" style={{ justifyContent: 'center' }} onClick={handlePrint}>
                    Print / Save as PDF
                  </Button>
                  <Button variant="secondary" className="w-full" style={{ justifyContent: 'center' }} onClick={resetForm}>
                    New Invoice
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


