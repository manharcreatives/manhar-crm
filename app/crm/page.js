'use client';

import { useState, useMemo } from 'react';
import { useStore, formatDate, sanitizePhone } from '@/app/lib/store';
import DataTable from '@/app/components/ui/DataTable';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import Tabs from '@/app/components/ui/Tabs';
import { Card, CardHeader } from '@/app/components/ui/Card';
import SearchBar from '@/app/components/ui/SearchBar';
import Modal, { ModalFooter, ModalSection } from '@/app/components/ui/Modal';
import { useToast } from '@/app/components/ui/Toast';
import {
  Target, Phone, MessageSquare, Mail, Zap, Pencil,
  ArrowRight, GripVertical, TrendingUp, ChevronRight as ChevronRightIcon, Calendar
} from 'lucide-react';

const LEAD_STATUSES = ['New Lead', 'Contacted', 'Interested', 'Proposal Sent', 'Negotiation', 'Converted', 'Work In Progress', 'Delivered', 'Completed', 'Lost'];
const INTEREST_LEVELS = ['Low', 'Medium', 'High'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const FOLLOWUP_STATUSES = ['Pending', 'Done', 'Skipped'];
const NEGOTIATION_STATUSES = ['Not Started', 'In Progress', 'Closed', 'Lost'];

const STATUS_COLORS = {
  'New Lead': '#3B82F6', 'Contacted': '#A78BFA', 'Interested': '#2DD4BF',
  'Proposal Sent': '#F472B6', 'Negotiation': '#FB923C',
  'Converted': '#22C55E', 'Work In Progress': '#F59E0B', 'Delivered': '#8B5CF6',
  'Completed': '#22C55E', 'Lost': '#EF4444',
};

const EMPTY_CRM = {
  clientId: '', hasWebsite: 'No', websiteQuality: 'N/A', interestLevel: 'Medium',
  priority: 'Medium', behaviorNotes: '', competitorAnalysis: '', businessPotential: 5,
  lastContact: '', nextFollowup: '', followupStatus: 'Pending', meetingScheduled: 'No',
  meetingDate: '', meetingTime: '',
  proposalSent: 'No', negotiationStatus: 'Not Started', leadStatus: 'New Lead',
  reasonLost: '', competitorChosen: '', budgetIssue: false, noResponse: false, delayedDecision: false,
  staffNotes: '', personalityNotes: '', futureNotes: '',
  followupHistory: [],
  workStartDate: '', workEndDate: '', deliveryDate: '', completionNotes: '',
};

export default function CRMPage() {
  const { clients, crm, addCrmEntry, updateCrmEntry } = useStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editClientId, setEditClientId] = useState(null);
  const [form, setForm] = useState(EMPTY_CRM);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [view, setView] = useState('pipeline');
  const [showFollowupHistory, setShowFollowupHistory] = useState(false);
  const [followupHistoryClientId, setFollowupHistoryClientId] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  const [editingFollowupIdx, setEditingFollowupIdx] = useState(null);
  const [editFollowupForm, setEditFollowupForm] = useState(null);

  const crmRows = useMemo(() => {
    return clients.map(client => {
      const crmEntry = crm.find(c => c.clientId === client.id) || {};
      return { ...client, ...crmEntry, clientId: client.id };
    });
  }, [clients, crm]);

  const filtered = useMemo(() => {
    return crmRows.filter(row => {
      const q = search.toLowerCase();
      const matchSearch = !q || row.name?.toLowerCase().includes(q) || row.business?.toLowerCase().includes(q) || row.clientId?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || row.leadStatus === filterStatus;
      const matchPriority = !filterPriority || row.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [crmRows, search, filterStatus, filterPriority]);

  function openEdit(clientId) {
    const existing = crm.find(c => c.clientId === clientId) || { ...EMPTY_CRM, clientId };
    setForm({ ...EMPTY_CRM, ...existing, clientId });
    setEditClientId(clientId);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.clientId) { toast.warning('Client is required'); return; }
    const entry = { ...form, followupHistory: form.followupHistory || [] };
    const exists = crm.find(c => c.clientId === form.clientId);
    if (exists) {
      await updateCrmEntry(form.clientId, entry);
      toast.success('CRM entry updated');
    } else {
      await addCrmEntry(entry);
      toast.success('CRM entry added');
    }
    setShowModal(false);
  }

  async function quickStatusChange(clientId, newStatus) {
    const existing = crm.find(c => c.clientId === clientId);
    if (existing) {
      await updateCrmEntry(clientId, { leadStatus: newStatus });
    } else {
      await addCrmEntry({ clientId, leadStatus: newStatus });
    }
    toast.info(`Status updated to ${newStatus}`);
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const clientForId = (id) => clients.find(c => c.id === id);

  const statusCounts = {};
  LEAD_STATUSES.forEach(s => { statusCounts[s] = crmRows.filter(r => r.leadStatus === s).length; });

  const columns = [
    { key: 'name', label: 'Client', sortable: true, render: (v, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{v?.[0]}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{v}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>{r.clientId}</div>
        </div>
      </div>
    )},
    { key: 'leadStatus', label: 'Status', width: 130, render: (v) => <Badge status={v?.toLowerCase().replace(/\s+/g, '')} label={v} /> },
    { key: 'priority', label: 'Priority', width: 90, render: (v) => <Badge status={v?.toLowerCase()} /> },
    { key: 'interestLevel', label: 'Interest', width: 80 },
    { key: 'lastContact', label: 'Last Contact', width: 110, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
    { key: 'nextFollowup', label: 'Next Follow-up', width: 110, render: (v, r) => (
      <span style={{ fontSize: 12, color: v && new Date(v) < new Date() ? '#EF4444' : '#9CA3AF' }}>
        {formatDate(v)}
      </span>
    )},
    { key: 'meetingScheduled', label: 'Meeting', width: 120, render: (v, r) => (
      v === 'Yes' ? (
        <span style={{ fontSize: 11, color: '#22C55E' }}>
          {r.meetingDate ? formatDate(r.meetingDate) : '—'} {r.meetingTime ? `at ${r.meetingTime}` : ''}
        </span>
      ) : <span style={{ color: '#6B7280' }}>No</span>
    )},
    { key: 'proposalSent', label: 'Proposal', width: 70, render: (v) => <span style={{ color: v === 'Yes' ? '#22C55E' : '#6B7280' }}>{v || 'No'}</span> },
    { key: 'businessPotential', label: 'Potential', width: 80, render: (v) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(v || 0) * 10}%`, background: '#22C55E', borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>{v || 0}/10</span>
      </div>
    )},
    { key: 'actions', label: 'Actions', width: 200, render: (_, row) => {
      const client = clientForId(row.clientId);
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => openEdit(row.clientId)} title="Edit CRM"><Target size={14} /></button>
          <a href={`tel:+91${sanitizePhone(client?.phone || '')}`} className="btn-icon" style={{ color: '#3B82F6' }} title="Call"><Phone size={14} /></a>
          <a href={`https://wa.me/91${sanitizePhone(client?.phone || '')}`} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ color: '#25D366' }} title="WhatsApp"><MessageSquare size={14} /></a>
          <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(client?.email || '')}`} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ color: '#EA4335' }} title="Email"><Mail size={14} /></a>
        </div>
      );
    }},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><Target size={22} /></div>
            <div>
              <h1 className="page-header-title">CRM & Lead Management</h1>
              <p className="page-header-desc">Track leads, follow-ups, and client pipeline</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Pipeline Summary */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {LEAD_STATUSES.map(s => (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              style={{
                background: filterStatus === s ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${filterStatus === s ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.2s',
                minWidth: 90, textAlign: 'center', flex: 1
              }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_COLORS[s] }}>{statusCounts[s] || 0}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, whiteSpace: 'nowrap' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <Tabs
          tabs={[
            { id: 'pipeline', label: 'Kanban Pipeline' },
            { id: 'table', label: 'Table View' },
          ]}
          activeTab={view}
          onChange={setView}
        />

        {/* Pipeline View */}
        {view === 'pipeline' ? (
          <>
            {/* Quick status badges per column */}
            <div className="kanban-board">
              {LEAD_STATUSES.map(status => {
                const items = filtered.filter(r => (r.leadStatus || 'New Lead') === status);
                return (
                  <div key={status} className="kanban-column">
                    <div className="kanban-column-header">
                      <span>{status}</span>
                      <span className="kanban-column-count">{items.length}</span>
                    </div>
                    <div className="kanban-column-body">
                      {items.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
                          No leads in {status}
                        </div>
                      ) : items.map(item => (
                        <div key={item.clientId} className="kanban-card"
                          onClick={() => openEdit(item.clientId)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <GripVertical size={14} style={{ color: '#4B5563', flexShrink: 0 }} />
                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                              {item.name?.[0] || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="kanban-card-title">{item.name}</div>
                              <div className="kanban-card-subtitle">{item.business}</div>
                            </div>
                          </div>
                          <div className="kanban-card-footer">
                            <Badge status={item.priority?.toLowerCase()} dot={false} />
                            {item.businessPotential > 0 && (
                              <div className="kanban-card-potential">
                                <TrendingUp size={12} />
                                {item.businessPotential}/10
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            {item.leadStatus !== 'Converted' && item.leadStatus !== 'Lost' && (
                              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {LEAD_STATUSES[LEAD_STATUSES.indexOf(status) + 1] && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: 10, padding: '3px 6px' }}
                                    onClick={(e) => { e.stopPropagation(); quickStatusChange(item.clientId, LEAD_STATUSES[LEAD_STATUSES.indexOf(status) + 1]); }}
                                    title={`Move to ${LEAD_STATUSES[LEAD_STATUSES.indexOf(status) + 1]}`}
                                  >
                                    <ArrowRight size={10} /> {LEAD_STATUSES[LEAD_STATUSES.indexOf(status) + 1]}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <a href={`tel:+91${sanitizePhone(item.phone || '')}`} className="btn-icon" style={{ width: 24, height: 24 }} title="Call"><Phone size={11} /></a>
                            <a href={`https://wa.me/91${sanitizePhone(item.phone || '')}`} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ width: 24, height: 24, color: '#25D366' }} title="WhatsApp"><MessageSquare size={11} /></a>
                            <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.email || '')}`} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ width: 24, height: 24, color: '#3B82F6' }} title="Email"><Mail size={11} /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Table View */
          <>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search clients..."
              filters={[
                { placeholder: 'All Statuses', value: filterStatus, onChange: setFilterStatus,
                  options: LEAD_STATUSES.map(s => ({ value: s, label: s })) },
                { placeholder: 'All Priorities', value: filterPriority, onChange: setFilterPriority,
                  options: PRIORITIES.map(p => ({ value: p, label: p })) },
              ]}
            />
            <Card style={{ padding: 0 }}>
              <DataTable
                columns={columns}
                data={filtered}
                pageSize={10}
                sortable
                emptyMessage="No CRM records found"
                emptyIcon={Target}
                onRowClick={(row) => openEdit(row.clientId)}
              />
            </Card>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={`CRM Entry — ${clientForId(form.clientId)?.name || form.clientId}`}
        size="lg">
        <div className="form-group">
          <label className="form-label">Client (Search ID or Name) *</label>
          <input className="form-input" list="crm-clients-list" value={form.clientId} onChange={f('clientId')} disabled={!!editClientId} placeholder="Type to search..." />
          <datalist id="crm-clients-list">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </datalist>
        </div>

        <div className="divider" />
        <ModalSection title="Internal Analysis">
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Has Website?</label>
              <select className="form-select" value={form.hasWebsite} onChange={f('hasWebsite')}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Website Quality</label>
              <select className="form-select" value={form.websiteQuality} onChange={f('websiteQuality')}>
                <option>N/A</option><option>Poor</option><option>Average</option><option>Good</option><option>Excellent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Potential (1-10)</label>
              <input className="form-input" type="number" min={1} max={10} value={form.businessPotential} onChange={f('businessPotential')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Interest Level</label>
              <select className="form-select" value={form.interestLevel} onChange={f('interestLevel')}>
                {INTEREST_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={f('priority')}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Competitor Analysis</label>
            <input className="form-input" value={form.competitorAnalysis} onChange={f('competitorAnalysis')} placeholder="Which agencies/freelancers are they considering?" />
          </div>
        </ModalSection>

        <div className="divider" />
        <ModalSection title="Follow-up System">
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Last Contact</label>
              <input className="form-input" type="date" value={form.lastContact} onChange={f('lastContact')} />
            </div>
            <div className="form-group">
              <label className="form-label">Next Follow-up</label>
              <input className="form-input" type="date" value={form.nextFollowup} onChange={f('nextFollowup')} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Follow-up Status</label>
                {form.followupHistory?.length > 0 && (
                  <button type="button" onClick={() => {
                    setFollowupHistoryClientId(form.clientId);
                    setShowFollowupHistory(true);
                  }} style={{ fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View Log ({form.followupHistory.length})
                  </button>
                )}
              </div>
              <select className="form-select" value={form.followupStatus} onChange={(e) => {
                const val = e.target.value;
                if (val !== form.followupStatus) {
                  const nextDate = prompt('Set next follow-up date (YYYY-MM-DD):');
                  if (nextDate) {
                    const prevStatus = form.followupStatus;
                    setForm(prev => {
                      const historyEntry = {
                        date: new Date().toISOString(), status: val, nextFollowup: nextDate,
                        notes: prevStatus === 'Done' ? `Follow-up completed on ${formatDate(form.lastContact)}` : `Follow-up ${val.toLowerCase()}`,
                        staffNotes: form.staffNotes || '',
                        personalityNotes: form.personalityNotes || '',
                        futureNotes: form.futureNotes || '',
                        meetingScheduled: form.meetingScheduled,
                        meetingDate: form.meetingDate || '',
                        meetingTime: form.meetingTime || '',
                      };
                      return { ...prev, followupStatus: val, nextFollowup: nextDate, followupHistory: [...(prev.followupHistory || []), historyEntry] };
                    });
                  }
                }
              }}>
                {FOLLOWUP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Meeting Scheduled?</label>
              <select className="form-select" value={form.meetingScheduled} onChange={f('meetingScheduled')}>
                <option>No</option><option>Yes</option>
              </select>
              {form.meetingScheduled === 'Yes' && (
                <div style={{ marginTop: 8 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Meeting Date</label>
                      <input className="form-input" type="date" value={form.meetingDate} onChange={f('meetingDate')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meeting Time</label>
                      <input className="form-input" type="time" value={form.meetingTime} onChange={f('meetingTime')} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Proposal Sent?</label>
              <select className="form-select" value={form.proposalSent} onChange={f('proposalSent')}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Negotiation Status</label>
              <select className="form-select" value={form.negotiationStatus} onChange={f('negotiationStatus')}>
                {NEGOTIATION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lead Status *</label>
              <select className="form-select" value={form.leadStatus} onChange={f('leadStatus')}>
                {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </ModalSection>

        {(form.leadStatus === 'Work In Progress' || form.leadStatus === 'Delivered' || form.leadStatus === 'Completed') && (
          <>
            <div className="divider" />
            <ModalSection title="Work Progress">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Work Start Date</label>
                  <input className="form-input" type="date" value={form.workStartDate} onChange={f('workStartDate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Work End Date</label>
                  <input className="form-input" type="date" value={form.workEndDate} onChange={f('workEndDate')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Delivery Date</label>
                  <input className="form-input" type="date" value={form.deliveryDate} onChange={f('deliveryDate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.leadStatus} onChange={f('leadStatus')}>
                    <option>Work In Progress</option><option>Delivered</option><option>Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Completion Notes</label>
                <textarea className="form-textarea" value={form.completionNotes} onChange={f('completionNotes')} rows={2} placeholder="Project completion summary..." />
              </div>
            </ModalSection>
          </>
        )}

        {form.leadStatus === 'Lost' && (
          <>
            <div className="divider" />
            <ModalSection title="Lost Lead Analysis">
              <div className="form-group">
                <label className="form-label">Reason Lost</label>
                <input className="form-input" value={form.reasonLost} onChange={f('reasonLost')} placeholder="Why was this lead lost?" />
              </div>
              <div className="form-group">
                <label className="form-label">Competitor Chosen</label>
                <input className="form-input" value={form.competitorChosen} onChange={f('competitorChosen')} placeholder="Which competitor?" />
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                {[['budgetIssue', 'Budget Issue'], ['noResponse', 'No Response'], ['delayedDecision', 'Delayed Decision']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#9CA3AF' }}>
                    <input type="checkbox" checked={form[key]} onChange={f(key)} style={{ accentColor: '#22C55E' }} />
                    {label}
                  </label>
                ))}
              </div>
            </ModalSection>
          </>
        )}

        <div className="divider" />
        <ModalSection title="Internal Notes">
          <div className="form-group">
            <label className="form-label">Staff Notes</label>
            <textarea className="form-textarea" value={form.staffNotes} onChange={f('staffNotes')} rows={2} placeholder="Internal notes for staff..." />
          </div>
          <div className="form-group">
            <label className="form-label">Personality Notes</label>
            <textarea className="form-textarea" value={form.personalityNotes} onChange={f('personalityNotes')} rows={2} placeholder="Decision style, communication preferences..." />
          </div>
          <div className="form-group">
            <label className="form-label">Future Opportunities</label>
            <textarea className="form-textarea" value={form.futureNotes} onChange={f('futureNotes')} rows={2} placeholder="Potential upsell opportunities..." />
          </div>
        </ModalSection>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save CRM Entry</Button>
        </ModalFooter>
      </Modal>

      {/* Follow-up History Modal */}
      <Modal open={showFollowupHistory} onClose={() => { setShowFollowupHistory(false); setExpandedLog(null); setEditingFollowupIdx(null); setEditFollowupForm(null); }} title="Follow-up History">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          {form.followupHistory?.length > 0 ? (
            [...form.followupHistory].reverse().map((h, i) => {
              const idx = [...form.followupHistory].reverse().length - 1 - i;
              const isOpen = expandedLog === idx;
              const isEditing = editingFollowupIdx === idx;
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: 12, transition: 'all 0.2s'
                }}>
                  {isEditing ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>Edit Entry</div>
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={editFollowupForm?.date?.split('T')[0] || ''} onChange={(e) => setEditFollowupForm(prev => ({ ...prev, date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={editFollowupForm?.status || ''} onChange={(e) => setEditFollowupForm(prev => ({ ...prev, status: e.target.value }))}>
                          {FOLLOWUP_STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Notes</label>
                        <input className="form-input" value={editFollowupForm?.notes || ''} onChange={(e) => setEditFollowupForm(prev => ({ ...prev, notes: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Next Follow-up</label>
                        <input className="form-input" type="date" value={editFollowupForm?.nextFollowup || ''} onChange={(e) => setEditFollowupForm(prev => ({ ...prev, nextFollowup: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Button size="sm" onClick={() => {
                          const history = [...form.followupHistory];
                          history[editingFollowupIdx] = editFollowupForm;
                          setForm(prev => ({ ...prev, followupHistory: history }));
                          setEditingFollowupIdx(null);
                          setEditFollowupForm(null);
                          toast.success('Follow-up entry updated');
                        }}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setEditingFollowupIdx(null); setEditFollowupForm(null); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setExpandedLog(isOpen ? null : idx)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB' }}>{formatDate(h.date)}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Badge status={h.status.toLowerCase()} label={h.status} />
                          <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); setEditFollowupForm({ ...h }); setEditingFollowupIdx(idx); }} title="Edit"><Pencil size={12} /></button>
                        </div>
                      </div>
                      {h.notes && <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>{h.notes}</div>}
                      {h.nextFollowup && <div style={{ fontSize: 12, color: '#3B82F6' }}>Next: {formatDate(h.nextFollowup)}</div>}

                      {isOpen && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {h.meetingScheduled === 'Yes' && (
                            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                              <span style={{ color: '#22C55E', fontWeight: 600 }}>Meeting:</span> {formatDate(h.meetingDate)} {h.meetingTime ? `at ${h.meetingTime}` : ''}
                            </div>
                          )}
                          {h.staffNotes && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Staff Notes</div>
                              <div style={{ fontSize: 12, color: '#D1D5DB' }}>{h.staffNotes}</div>
                            </div>
                          )}
                          {h.personalityNotes && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Personality Notes</div>
                              <div style={{ fontSize: 12, color: '#D1D5DB' }}>{h.personalityNotes}</div>
                            </div>
                          )}
                          {h.futureNotes && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Future Opportunities</div>
                              <div style={{ fontSize: 12, color: '#D1D5DB' }}>{h.futureNotes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: 20 }}>No follow-up history found.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}


