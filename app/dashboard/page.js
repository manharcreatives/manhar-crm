'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore, formatCurrency, formatDate } from '@/app/lib/store';
import StatCard from '@/app/components/ui/StatCard';
import { Card, CardHeader } from '@/app/components/ui/Card';
import { useToast } from '@/app/components/ui/Toast';
import Link from 'next/link';
import {
  DollarSign, FileText, CheckCircle, Clock, Users, TrendingUp,
  UserPlus, CreditCard, Target, Calendar, LayoutDashboard
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
  const { clients, crm, payments, invoices, services, stats } = useStore();
  useToast();

  const monthlyData = MONTHS.map((month, idx) => {
    const revenue = invoices
      .filter(inv => new Date(inv.date).getMonth() === idx)
      .reduce((sum, inv) => sum + (inv.final || 0), 0);
    const received = payments
      .filter(p => {
        const date = p.paymentDate ? new Date(p.paymentDate) : null;
        return date && date.getMonth() === idx;
      })
      .reduce((sum, p) => sum + (p.advance || 0), 0);
    return { month, revenue, received };
  });

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

  const categoryMap = {};
  payments.forEach(p => {
    const cat = p.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (p.finalAmount || 0);
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.split(' ').slice(0, 2).join(' '), value
  }));

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const clientRevMap = {};
  payments.forEach(p => {
    if (!clientRevMap[p.clientId]) clientRevMap[p.clientId] = { revenue: 0, projects: 0 };
    clientRevMap[p.clientId].revenue += (p.finalAmount || 0);
    clientRevMap[p.clientId].projects += 1;
  });
  const topClients = Object.entries(clientRevMap)
    .map(([id, data]) => {
      const client = clients.find(c => c.id === id);
      return { id, name: client?.name || id, business: client?.business || '', ...data };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const upcomingFollowups = crm
    .filter(c => c.nextFollowup && new Date(c.nextFollowup) >= new Date())
    .sort((a, b) => new Date(a.nextFollowup) - new Date(b.nextFollowup))
    .slice(0, 5)
    .map(c => ({ ...c, client: clients.find(cl => cl.id === c.clientId) }));

  const [today, setToday] = useState('');
  const [revenuePeriod, setRevenuePeriod] = useState('year');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const filteredMonthlyData = useMemo(() => {
    const now = new Date();
    if (revenuePeriod === 'month') {
      const currentMonth = now.getMonth();
      return monthlyData.filter((_, idx) => idx === currentMonth);
    }
    if (revenuePeriod === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      const todayRevenue = invoices
        .filter(inv => inv.date === todayStr)
        .reduce((sum, inv) => sum + (inv.final || 0), 0);
      const todayReceived = payments
        .filter(p => p.paymentDate === todayStr)
        .reduce((sum, p) => sum + (p.advance || 0), 0);
      return [{ month: 'Today', revenue: todayRevenue, received: todayReceived }];
    }
    return monthlyData;
  }, [monthlyData, revenuePeriod, invoices, payments]);

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
          <StatCard icon={DollarSign} color="green" value={stats.totalRevenue} label="Total Revenue" trend={12} />
          <StatCard icon={FileText} color="blue" value={stats.totalInvoices} label="Total Invoices" />
          <StatCard icon={CheckCircle} color="green" value={stats.paidPayments} label="Paid Payments" prefix="₹" />
          <StatCard icon={Clock} color="yellow" value={stats.pendingPayments} label="Pending Payments" prefix="₹" />
          <StatCard icon={TrendingUp} color="purple" value={stats.avgInvoice} label="Avg Invoice Value" prefix="₹" />
        </div>

        {/* Charts */}
        <div className="grid-2 mb-6">
          <Card>
            <CardHeader title="Revenue Overview" subtitle="Monthly — FY 2026-27"
              action={
                <div style={{ display: 'flex', gap: 6 }}>
                  {['today', 'month', 'year'].map(p => (
                    <button key={p} onClick={() => setRevenuePeriod(p)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        background: revenuePeriod === p ? 'var(--primary)' : 'var(--bg-card)',
                        color: revenuePeriod === p ? '#0B0F0E' : 'var(--text-secondary)',
                      }}>{p === 'today' ? 'Today' : p === 'month' ? 'This Month' : 'This Year'}</button>
                  ))}
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Invoice Value" stroke="#22C55E" strokeWidth={2} fill="url(#revG)" />
                <Area type="monotone" dataKey="received" name="Received" stroke="#3B82F6" strokeWidth={2} fill="url(#recG)" />
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

        {/* Service Revenue */}
        <Card className="mb-6">
          <CardHeader title="Revenue by Service Category" />
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₹${v/1000}k`} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Revenue" fill="#22C55E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state-compact" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
              No service data yet
            </div>
          )}
        </Card>

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

        {/* Top Clients */}
        <Card className="mb-6">
          <CardHeader title="Top Clients by Revenue" />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Revenue</th>
                  <th>Projects</th>
                </tr>
              </thead>
              <tbody>
                {topClients.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>No client data</td></tr>
                ) : topClients.map(c => (
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
                    <td>{c.projects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom Stats */}
        <div className="stats-grid">
          <StatCard icon={FileText} color="blue" value={stats.totalProjects} label="Total Projects" />
          <StatCard icon={CheckCircle} color="green" value={stats.completedProjects} label="Completed" />
          <StatCard icon={Clock} color="yellow" value={stats.ongoingProjects} label="Ongoing" />
          <StatCard icon={Calendar} color="purple" value={stats.upcomingProjects} label="Upcoming" />
          <StatCard icon={TrendingUp} color="teal" value={`${clientRetention}%`} label="Client Retention" />
          <StatCard icon={Users} color="green" value={clients.length} label="Total Leads" />
        </div>
      </div>
    </div>
  );
}


