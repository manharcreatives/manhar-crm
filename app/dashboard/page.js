'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore, formatCurrency, formatDate, getPaymentExpenses } from '@/app/lib/store';
import StatCard from '@/app/components/ui/StatCard';
import { Card, CardHeader } from '@/app/components/ui/Card';
import { useToast } from '@/app/components/ui/Toast';
import Link from 'next/link';
import {
  DollarSign, FileText, CheckCircle, Clock, Users, TrendingUp,
  UserPlus, CreditCard, Target, Calendar, LayoutDashboard,
  TrendingDown, Receipt, Percent
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(31,41,55,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '10px 14px', fontSize: 13
      }}>
        <p style={{ color: '#9CA3AF', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { clients, crm, payments, invoices, services, expenses, stats } = useStore();
  useToast();

  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;

  const pieData = [
    { name: 'Paid', value: paidCount, color: '#22C55E' },
    { name: 'Partial', value: partialCount, color: '#3B82F6' },
    { name: 'Pending', value: pendingCount, color: '#F59E0B' },
    { name: 'Overdue', value: overdueCount, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const upcomingFollowups = crm
    .filter(c => c.nextFollowup && new Date(c.nextFollowup) >= new Date())
    .sort((a, b) => new Date(a.nextFollowup) - new Date(b.nextFollowup))
    .slice(0, 5)
    .map(c => ({ ...c, client: clients.find(cl => cl.id === c.clientId) }));

  const todayStr = new Date().toISOString().split('T')[0];
  const [today, setToday] = useState('');
  const [rangePreset, setRangePreset] = useState('year');
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [rangeEnd, setRangeEnd] = useState(todayStr);

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  function setDateRange(preset) {
    setRangePreset(preset);
    const now = new Date();
    let start;
    switch (preset) {
      case 'today':
        start = now;
        break;
      case 'week':
        start = new Date(now); start.setDate(now.getDate() - now.getDay());
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
      default:
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    setRangeStart(start.toISOString().split('T')[0]);
    setRangeEnd(todayStr);
  }

  function handleRangeStart(e) {
    setRangeStart(e.target.value);
    setRangePreset('custom');
  }

  function handleRangeEnd(e) {
    setRangeEnd(e.target.value);
    setRangePreset('custom');
  }

  const filteredMonthlyData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const s = new Date(rangeStart);
    const e = new Date(rangeEnd);
    const months = [];
    let cur = new Date(s.getFullYear(), s.getMonth(), 1);
    const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);
    while (cur <= endMonth) {
      const mi = cur.getMonth();
      const yr = cur.getFullYear();
      const monthName = MONTHS[mi] + (yr !== new Date().getFullYear() ? ` ${yr}` : '');
      months.push({
        month: monthName,
        revenue: invoices.filter(inv => { const d = new Date(inv.date); return d >= s && d <= e && d.getMonth() === mi && d.getFullYear() === yr; }).reduce((sum, inv) => sum + (inv.final || 0), 0),
        received: payments.filter(p => { if (!p.paymentDate) return false; const d = new Date(p.paymentDate); return d >= s && d <= e && d.getMonth() === mi && d.getFullYear() === yr; }).reduce((sum, p) => sum + (p.advance || 0), 0),
        expenses: expenses.filter(ex => { if (!ex.date) return false; const d = new Date(ex.date); return d >= s && d <= e && d.getMonth() === mi && d.getFullYear() === yr; }).reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }, [rangeStart, rangeEnd, invoices, payments, expenses]);

  const profitCategories = {};
  payments.forEach(p => {
    const cat = p.category || 'Other';
    if (!profitCategories[cat]) profitCategories[cat] = { revenue: 0, expenses: 0 };
    profitCategories[cat].revenue += (p.finalAmount || p.projectValue || p.advance || 0);
    profitCategories[cat].expenses += getPaymentExpenses(expenses, p.id);
  });
  const profitCategoryData = Object.entries(profitCategories)
    .map(([name, data]) => ({
      name: name.split(' ').slice(0, 2).join(' '),
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
      margin: data.revenue > 0 ? Math.round(((data.revenue - data.expenses) / data.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  const clientProfitMap = {};
  payments.forEach(p => {
    if (!clientProfitMap[p.clientId]) clientProfitMap[p.clientId] = { revenue: 0, expenses: 0, projects: 0 };
    clientProfitMap[p.clientId].revenue += (p.finalAmount || p.projectValue || p.advance || 0);
    clientProfitMap[p.clientId].expenses += getPaymentExpenses(expenses, p.id);
    clientProfitMap[p.clientId].projects += 1;
  });
  const topProfitClients = Object.entries(clientProfitMap)
    .map(([id, data]) => {
      const client = clients.find(c => c.id === id);
      const profit = data.revenue - data.expenses;
      const margin = data.revenue > 0 ? Math.round((profit / data.revenue) * 100) : 0;
      return { id, name: client?.name || id, business: client?.business || '', ...data, profit, margin };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const clientRetention = clients.length > 0
    ? Math.round((crm.filter(c => c.leadStatus === 'Converted').length / clients.length) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <div className="page-header-icon"><LayoutDashboard size={22} /></div>
            <div>
              <h1 className="page-header-title">Dashboard</h1>
              <p className="page-header-desc">
                {today}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Quick Actions */}
        <div className="quick-actions">
          <Link href="/clients" className="quick-action-card">
            <div className="quick-action-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
              <UserPlus size={20} />
            </div>
            <span className="quick-action-label">New Client</span>
          </Link>
          <Link href="/invoice" className="quick-action-card">
            <div className="quick-action-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              <FileText size={20} />
            </div>
            <span className="quick-action-label">New Invoice</span>
          </Link>
          <Link href="/payments" className="quick-action-card">
            <div className="quick-action-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <CreditCard size={20} />
            </div>
            <span className="quick-action-label">Record Payment</span>
          </Link>
          <Link href="/crm" className="quick-action-card">
            <div className="quick-action-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
              <Target size={20} />
            </div>
            <span className="quick-action-label">View Pipeline</span>
          </Link>
        </div>

        {/* Top Stats */}
        <div className="stats-grid">
          <StatCard icon={DollarSign} color="green" value={stats.totalRevenue} label="Total Revenue" prefix="₹" />
          <StatCard icon={TrendingDown} color="red" value={stats.totalExpenses} label="Total Expenses" prefix="₹" />
          <StatCard icon={TrendingUp} color={stats.netProfit >= 0 ? 'green' : 'red'} value={stats.netProfit} label="Net Profit" prefix="₹" />
          <StatCard icon={Percent} color={stats.profitMargin > 0 ? 'green' : 'yellow'} value={stats.profitMargin} label="Profit Margin" suffix="%" />
          <StatCard icon={Clock} color="yellow" value={stats.pendingPayments} label="Pending Payments" prefix="₹" />
        </div>

        {/* Charts */}
        <div className="grid-2 mb-6">
          <Card>
            <CardHeader title="Revenue Overview"
              subtitle={rangeStart && rangeEnd ? `${new Date(rangeStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${new Date(rangeEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Select a date range'}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' },
                      { key: 'year', label: 'This Year' },
                    ].map(p => (
                      <button key={p.key} onClick={() => setDateRange(p.key)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                          background: rangePreset === p.key ? 'var(--primary)' : 'var(--bg-card)',
                          color: rangePreset === p.key ? '#0B0F0E' : 'var(--text-secondary)',
                        }}>{p.label}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <input type="date" value={rangeStart} onChange={handleRangeStart}
                      style={{
                        padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)',
                        fontSize: 11, width: 130, cursor: 'pointer',
                      }} />
                    <span>—</span>
                    <input type="date" value={rangeEnd} onChange={handleRangeEnd}
                      style={{
                        padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)',
                        fontSize: 11, width: 130, cursor: 'pointer',
                      }} />
                  </div>
                </div>
              }
            />
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={filteredMonthlyData}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="recG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Invoice Value" stroke="#22C55E" strokeWidth={2} fill="url(#revG)" />
                <Area type="monotone" dataKey="received" name="Received" stroke="#3B82F6" strokeWidth={2} fill="url(#recG)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expG)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader title="Payment Status" subtitle={`${payments.length} transactions`} />
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#9CA3AF' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-compact" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                No payment data yet
              </div>
            )}
          </Card>
        </div>

        {/* Top Profitable Services */}
        <div className="grid-2 mb-6">
          <Card>
            <CardHeader title="Top Profitable Services" subtitle="Revenue vs Expenses by category" />
            {profitCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profitCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₹${v/1000}k`} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#22C55E" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-compact" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                No service data yet
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Profit Margin by Service" />
            {profitCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profitCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="margin" name="Margin %" fill="#A78BFA" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-compact" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                No service data yet
              </div>
            )}
          </Card>
        </div>

        {/* Tables + Follow-ups */}
        <div className="grid-2 mb-6">
          <Card>
            <CardHeader
              title="Recent Invoices"
              action={<Link href="/history" style={{ fontSize: 12, color: '#22C55E', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>}
            />
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>No invoices yet</td></tr>
                  ) : recentInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td><span className="font-mono" style={{ fontSize: 12, color: '#22C55E' }}>{inv.id}</span></td>
                      <td><strong>{inv.clientName}</strong></td>
                      <td style={{ color: '#22C55E', fontWeight: 600 }}>{formatCurrency(inv.final)}</td>
                      <td>
                        <span className={`badge badge-${inv.status.toLowerCase()}`}>
                          <CheckCircle size={10} /> {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Upcoming Follow-ups" />
            {upcomingFollowups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingFollowups.map(c => (
                  <div key={c.clientId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                      {c.client?.name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {c.client?.name || c.clientId}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {formatDate(c.nextFollowup)} — {c.leadStatus}
                      </div>
                    </div>
                    <span className={`badge badge-${(c.priority || 'medium').toLowerCase()}`}>
                      {c.priority || 'Medium'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6B7280', padding: 24, fontSize: 13 }}>No upcoming follow-ups</div>
            )}
          </Card>
        </div>

        {/* Top Profitable Clients */}
        <Card className="mb-6">
          <CardHeader title="Top Profitable Clients" subtitle="Ranked by net profit" />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
                  <th>Margin</th>
                  <th>Projects</th>
                </tr>
              </thead>
              <tbody>
                {topProfitClients.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>No client data</td></tr>
                ) : topProfitClients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{c.name?.[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{c.business}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#22C55E', fontWeight: 600 }}>{formatCurrency(c.revenue)}</td>
                    <td style={{ color: '#EF4444' }}>{formatCurrency(c.expenses)}</td>
                    <td style={{ color: c.profit >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{formatCurrency(c.profit)}</td>
                    <td>
                      <span className="badge" style={{
                        background: c.margin >= 50 ? 'rgba(34,197,94,0.15)' : c.margin >= 20 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: c.margin >= 50 ? '#22C55E' : c.margin >= 20 ? '#F59E0B' : '#EF4444',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600
                      }}>{c.margin}%</span>
                    </td>
                    <td>{c.projects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom Stats */}
        <div className="stats-grid">
          <StatCard icon={DollarSign} color="blue" value={stats.totalInvoices} label="Total Invoices" />
          <StatCard icon={FileText} color="blue" value={stats.totalProjects} label="Total Projects" />
          <StatCard icon={CheckCircle} color="green" value={stats.completedProjects} label="Completed" />
          <StatCard icon={Clock} color="yellow" value={stats.ongoingProjects} label="Ongoing" />
          <StatCard icon={TrendingUp} color="teal" value={`${clientRetention}%`} label="Client Retention" />
          <StatCard icon={Users} color="green" value={clients.length} label="Total Leads" />
        </div>
      </div>
    </div>
  );
}


