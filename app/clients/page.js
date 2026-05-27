'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore, generateClientId, formatDate } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import SearchBar from '@/app/components/ui/SearchBar';
import { Card, CardHeader } from '@/app/components/ui/Card';
import Modal, { ModalFooter, ModalSection } from '@/app/components/ui/Modal';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import EmptyState from '@/app/components/ui/EmptyState';
import { useToast } from '@/app/components/ui/Toast';
import {
  Users, Plus, Download, LayoutGrid, Table, Pencil, Trash2, ChevronRight
} from 'lucide-react';

const SOURCE_OPTIONS = ['Direct', 'Instagram', 'Facebook', 'Google', 'Reference', 'WhatsApp', 'Website', 'Walk-in', 'Other'];
const BUDGET_OPTIONS = ['Under ₹5,000', '₹5,000 - ₹10,000', '₹10,000 - ₹20,000', '₹20,000 - ₹30,000', '₹30,000 - ₹50,000', '₹50,000+'];
const CONTACT_METHODS = ['WhatsApp', 'Phone', 'Email', 'In-person'];
const CONTACT_TIMES = ['Morning (9-12)', 'Afternoon (12-4)', 'Evening (4-8)', 'Anytime'];
const BUSINESS_TYPES = ['Restaurant', 'Retail/Fashion', 'Electronics', 'Healthcare', 'Education', 'Hotel/Hospitality', 'Real Estate', 'Manufacturing', 'IT/Software', 'Service', 'Other'];
const STATES = ['Gujarat', 'Maharashtra', 'Rajasthan', 'Delhi', 'Uttar Pradesh', 'Karnataka', 'Tamil Nadu', 'Other'];

const EMPTY_CLIENT = {
  id: '', timestamp: '', source: 'Direct', sourceOther: '',
  name: '', business: '', phone: '', whatsapp: '', email: '',
  location: '', state: 'Gujarat', city: '',
  businessType: '', website: '', instagram: '', requirement: '', services: '',
  documents: '', notes: '', budget: '', contactMethod: 'WhatsApp', contactTime: '',
  formStatus: 'Received', verificationStatus: 'Pending',
};

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient, deleteClients } = useStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [selected, setSelected] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isDirty) {
      const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isDirty]);

  useEffect(() => {
    if (showModal && !editId) {
      const saved = sessionStorage.getItem('mc_new_client_form');
      if (saved) {
        try { setForm(JSON.parse(saved)); setIsDirty(true); } catch {}
      }
    }
  }, [showModal, editId]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.business?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q) || c.phone?.includes(q);
      const matchSource = !filterSource || c.source === filterSource;
      const matchStatus = !filterStatus || c.verificationStatus === filterStatus;
      return matchSearch && matchSource && matchStatus;
    });
  }, [clients, search, filterSource, filterStatus]);

  const columns = [
    { key: 'id', label: 'Client ID', width: 110, render: (v) => <span className="font-mono" style={{ fontSize: 12, color: '#22C55E' }}>{v}</span> },
    { key: 'name', label: 'Name', sortable: true, render: (v, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{v?.[0]}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{v}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>{r.business}</div>
        </div>
      </div>
    )},
    { key: 'phone', label: 'Phone', width: 120 },
    { key: 'city', label: 'Location', render: (v, r) => `${v || ''}, ${r.state || ''}` },
    { key: 'source', label: 'Source', width: 100, render: (v, r) => <Badge status={v === 'Other' ? (r.sourceOther || 'other') : v.toLowerCase()} label={v === 'Other' ? (r.sourceOther || v) : v} /> },
    { key: 'services', label: 'Services', render: (v) => (
      <span className="truncate" style={{ display: 'block', maxWidth: 150 }}>{v || '—'}</span>
    )},
    { key: 'budget', label: 'Budget', width: 120 },
    { key: 'verificationStatus', label: 'Status', width: 100, render: (v) => (
      <Badge status={v === 'Verified' ? 'verified' : 'pending'} />
    )},
    { key: 'timestamp', label: 'Date', width: 100, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
  ];

  function openAdd() {
    setForm({ ...EMPTY_CLIENT, timestamp: new Date().toISOString() });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(client) {
    setForm({ ...client });
    setEditId(client.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.phone) {
      toast.warning('Client Name and Phone are required');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    if (editId) {
      await updateClient(editId, form);
      toast.success('Client updated successfully');
    } else {
      const newId = generateClientId(clients);
      await addClient({ ...form, id: newId, timestamp: new Date().toISOString() });
      toast.success('Client added successfully');
    }
    sessionStorage.removeItem('mc_new_client_form');
    setIsDirty(false);
    setShowModal(false);
    setSaving(false);
  }

  async function handleDelete(id) {
    await deleteClient(id);
    toast.success('Client deleted');
    setDeleteTarget(null);
  }

  async function handleBulkDelete() {
    await deleteClients(selected);
    toast.success(`${selected.length} clients deleted`);
    setSelected([]);
  }

  function exportCSV() {
    const headers = ['ID', 'Name', 'Business', 'Phone', 'Email', 'City', 'State', 'Source', 'Services', 'Budget', 'Status', 'Date'];
    const rows = filtered.map(c => [
      c.id, c.name, c.business, c.phone, c.email, c.city, c.state, c.source,
      c.services, c.budget, c.verificationStatus, c.timestamp
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  const f = (key) => (e) => setForm(prev => {
    const next = { ...prev, [key]: e.target.value };
    if (!editId) sessionStorage.setItem('mc_new_client_form', JSON.stringify(next));
    setIsDirty(true);
    return next;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><Users size={22} /></div>
            <div>
              <h1 className="page-header-title">Client Database</h1>
              <p className="page-header-desc">{filtered.length} clients · Manage all client inquiries and lead records</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={Download} onClick={exportCSV}>Export CSV</Button>
          <Button icon={Plus} onClick={openAdd}>Add Client</Button>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Filters */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, business, phone..."
          filters={[
            { placeholder: 'All Sources', value: filterSource, onChange: setFilterSource, options: SOURCE_OPTIONS },
            { placeholder: 'All Status', value: filterStatus, onChange: setFilterStatus, options: ['Verified', 'Pending'] },
          ]}
        />

        {/* Bulk actions + View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selected.length > 0 && (
              <>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>{selected.length} selected</span>
                <Button variant="danger" size="sm" icon={Trash2} onClick={handleBulkDelete}>
                  Delete Selected
                </Button>
              </>
            )}
          </div>
          <div className="btn-group">
            <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} size="sm" icon={Table} onClick={() => setViewMode('table')} />
            <Button variant={viewMode === 'cards' ? 'primary' : 'secondary'} size="sm" icon={LayoutGrid} onClick={() => setViewMode('cards')} />
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' ? (
          <Card style={{ padding: 0 }}>
            <DataTable
              columns={columns}
              data={filtered}
              pageSize={10}
              sortable
              emptyMessage="No clients found"
              emptyIcon={Users}
              selectedRows={selected}
              onSelectRow={(id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              onSelectAll={(ids) => setSelected(ids)}
              actions={(row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={14} /></button>
                  <button className="btn-icon" style={{ color: '#EF4444' }} onClick={() => setDeleteTarget(row.id)} title="Delete"><Trash2 size={14} /></button>
                </div>
              )}
            />
          </Card>
        ) : (
          /* Cards View */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No clients found" message="Try adjusting your search or filters" />
            ) : filtered.map(c => (
              <Card key={c.id} hover accent>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{c.name?.[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{c.business || '—'}</div>
                    </div>
                  </div>
                  <Badge status={c.verificationStatus === 'Verified' ? 'verified' : 'pending'} dot={false} />
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.8 }}>
                  <div>📞 {c.phone}</div>
                  <div>📍 {c.city}, {c.state}</div>
                  <div>🔗 {c.source}</div>
                  <div>💰 {c.budget || '—'}</div>
                </div>
                {c.services && (
                  <div style={{ marginTop: 10 }}>
                    <Badge status="new" label={c.services.split(',')[0]} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(c.id)} style={{ color: '#EF4444' }}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => {
        if (isDirty && !confirm('You have unsaved changes. Are you sure you want to close?')) return;
        setIsDirty(false);
        sessionStorage.removeItem('mc_new_client_form');
        setShowModal(false);
      }} title={editId ? 'Edit Client' : 'Add New Client'} size="lg">
        <ModalSection title="Client Information">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input className="form-input" value={form.name} onChange={f('name')} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input className="form-input" value={form.business} onChange={f('business')} placeholder="Business / company name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone} onChange={f('phone')} placeholder="+91 9XXXXXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp} onChange={f('whatsapp')} placeholder="Same as phone if same" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} placeholder="client@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Business Type</label>
              <select className="form-select" value={form.businessType} onChange={f('businessType')}>
                <option value="">Select type</option>
                {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.city} onChange={f('city')} placeholder="City" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-select" value={form.state} onChange={f('state')}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={(e) => {
                const val = e.target.value;
                setForm(prev => ({ ...prev, source: val, sourceOther: val !== 'Other' ? '' : prev.sourceOther }));
              }}>
                {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              {form.source === 'Other' && (
                <input className="form-input" value={form.sourceOther} onChange={f('sourceOther')} placeholder="Specify source" style={{ marginTop: 8 }} />
              )}
            </div>
          </div>
        </ModalSection>

        <div className="divider" />

        <ModalSection title="Business Details">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={f('website')} placeholder="https://" />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input className="form-input" value={form.instagram} onChange={f('instagram')} placeholder="@handle" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Services Interested In</label>
            <input className="form-input" value={form.services} onChange={f('services')} placeholder="Website, Logo Design..." />
          </div>
          <div className="form-group">
            <label className="form-label">Requirement Details</label>
            <textarea className="form-textarea" value={form.requirement} onChange={f('requirement')} placeholder="Describe what the client needs..." rows={2} />
          </div>
        </ModalSection>

        <div className="divider" />

        <ModalSection title="Budget & Preferences">
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Budget Range</label>
              <select className="form-select" value={form.budget} onChange={f('budget')}>
                <option value="">Select range</option>
                {BUDGET_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact Method</label>
              <select className="form-select" value={form.contactMethod} onChange={f('contactMethod')}>
                {CONTACT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact Time</label>
              <select className="form-select" value={form.contactTime} onChange={f('contactTime')}>
                <option value="">Select</option>
                {CONTACT_TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Form Status</label>
              <select className="form-select" value={form.formStatus} onChange={f('formStatus')}>
                <option>Received</option><option>Processing</option><option>Archived</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Verification</label>
              <select className="form-select" value={form.verificationStatus} onChange={f('verificationStatus')}>
                <option>Pending</option><option>Verified</option><option>Rejected</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={f('notes')} placeholder="Any additional notes..." rows={2} />
          </div>
        </ModalSection>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editId ? 'Update Client' : 'Add Client'}</Button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Client"
        message="This will permanently remove this client and all associated data."
      />
    </div>
  );
}


