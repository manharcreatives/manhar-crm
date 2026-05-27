'use client';

import { useState } from 'react';
import { useStore, generateServiceId } from '@/app/lib/store';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { Card, CardHeader } from '@/app/components/ui/Card';
import SearchBar from '@/app/components/ui/SearchBar';
import Modal, { ModalFooter, ModalSection } from '@/app/components/ui/Modal';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import EmptyState from '@/app/components/ui/EmptyState';
import { useToast } from '@/app/components/ui/Toast';
import {
  Zap, Globe, Store, Palette, Printer as PrinterIcon,
  Share2, Wifi, MessageSquare, Plus, Pencil, Trash2, Eye, EyeOff
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  'Website Development', 'Restaurant Digital Solutions', 'Branding & Identity Design',
  'Print & Offline Branding', 'Social Media Design', 'Digital Presence Setup', 'Content & Communication'
];

const CATEGORY_ICONS = {
  'Website Development': Globe,
  'Restaurant Digital Solutions': Store,
  'Branding & Identity Design': Palette,
  'Print & Offline Branding': PrinterIcon,
  'Social Media Design': Share2,
  'Digital Presence Setup': Wifi,
  'Content & Communication': MessageSquare,
};

const EMPTY_SERVICE = {
  id: '', category: '', name: '', description: '', price: '', delivery: '', status: 'active'
};

export default function ServicesPage() {
  const { services, addService, updateService, deleteService } = useStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    const matchCat = !filterCategory || s.category === filterCategory;
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  function openAdd() {
    setForm({ ...EMPTY_SERVICE });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(service) {
    setForm({ ...service });
    setEditId(service.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.category) { toast.warning('Name and category are required'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 200));
    if (editId) {
      await updateService(editId, form);
      toast.success('Service updated');
    } else {
      const newId = generateServiceId(services);
      await addService({ ...form, id: newId });
      toast.success('Service added');
    }
    setShowModal(false);
    setSaving(false);
  }

  async function toggleStatus(id) {
    const svc = services.find(s => s.id === id);
    const newStatus = svc?.status === 'active' ? 'inactive' : 'active';
    await updateService(id, { status: newStatus });
    toast.info(`${svc?.name} ${svc?.status === 'active' ? 'deactivated' : 'activated'}`);
  }

  async function handleDelete(id) {
    await deleteService(id);
    toast.success('Service deleted');
    setDeleteTarget(null);
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const totalActive = services.filter(s => s.status === 'active').length;
  const groupedCategories = SERVICE_CATEGORIES.filter(cat => filtered.some(s => s.category === cat));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><Zap size={22} /></div>
            <div>
              <h1 className="page-header-title">Services List</h1>
              <p className="page-header-desc">{totalActive} active services · Master service catalog</p>
            </div>
          </div>
        </div>
        <Button icon={Plus} onClick={openAdd}>Add Service</Button>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Category Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
          {SERVICE_CATEGORIES.map(cat => {
            const count = services.filter(s => s.category === cat && s.status === 'active').length;
            const Icon = CATEGORY_ICONS[cat] || Zap;
            return (
              <div key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                style={{
                  background: filterCategory === cat ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${filterCategory === cat ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                <Icon size={18} style={{ color: filterCategory === cat ? '#22C55E' : '#6B7280', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: filterCategory === cat ? '#22C55E' : 'var(--text-primary)' }}>{count}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.2 }}>{cat}</div>
                </div>
              </div>
            );
          })}
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search services..."
          filters={[
            { placeholder: 'All Categories', value: filterCategory, onChange: setFilterCategory,
              options: SERVICE_CATEGORIES },
            { placeholder: 'All Status', value: filterStatus, onChange: setFilterStatus,
              options: ['active', 'inactive'] },
          ]}
        />

        {/* Grouped cards */}
        {groupedCategories.length === 0 ? (
          <EmptyState icon={Zap} title="No services found"
            message="Try adjusting your search or filters"
            action={<Button onClick={openAdd}>Add Service</Button>}
          />
        ) : groupedCategories.map(cat => {
          const catServices = filtered.filter(s => s.category === cat);
          const Icon = CATEGORY_ICONS[cat] || Zap;
          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Icon size={20} style={{ color: '#22C55E' }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>{cat}</h2>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{catServices.filter(s => s.status === 'active').length} active</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {catServices.map(s => (
                  <Card key={s.id} hover={s.status === 'active'} accent={s.status === 'active'} style={{ opacity: s.status === 'active' ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{s.description || '—'}</div>
                      </div>
                      <Badge status={s.status === 'active' ? 'active' : 'inactive'} dot={false} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#22C55E', fontFamily: 'Outfit, sans-serif' }}>
                        {s.price ? `₹${Number(s.price).toLocaleString('en-IN')}+` : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockIcon size={12} />
                        {s.delivery || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(s)}>Edit</Button>
                      <Button
                        variant="ghost" size="sm"
                        icon={s.status === 'active' ? EyeOff : Eye}
                        onClick={() => toggleStatus(s.id)}
                      >
                        {s.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(s.id)} style={{ color: '#EF4444' }} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editId ? 'Edit Service' : 'Add New Service'}>
        <ModalSection title="Service Details">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={f('category')}>
              <option value="">Select category</option>
              {SERVICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service Name *</label>
            <input className="form-input" value={form.name} onChange={f('name')} placeholder="E.g. Logo Design" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={f('description')}
              placeholder="Brief service description..." rows={2} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Starting Price (₹)</label>
              <input className="form-input" type="number" value={form.price} onChange={f('price')} placeholder="0" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Delivery Time</label>
              <input className="form-input" value={form.delivery} onChange={f('delivery')} placeholder="E.g. 7 days" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </ModalSection>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editId ? 'Update' : 'Add Service'}</Button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Service"
        message="This will permanently remove this service from the catalog."
      />
    </div>
  );
}

function ChevronRightIcon(size) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}

function ClockIcon(size) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
