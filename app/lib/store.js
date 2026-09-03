'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const StoreContext = createContext(null);

function toSnake(str) {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}

function rowToJs(row) {
  const result = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
}

async function apiGet(table) {
  const res = await fetch(`/api/data/${table}`);
  if (!res.ok) throw new Error(`Failed to fetch ${table}`);
  const data = await res.json();
  return (data || []).map(rowToJs);
}

async function apiPost(table, record) {
  const res = await fetch(`/api/data/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Failed to insert into ${table}`);
  return await res.json();
}

async function apiPatch(table, payload) {
  const res = await fetch(`/api/data/${table}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update ${table}`);
  return await res.json();
}

async function apiDelete(table, payload) {
  const res = await fetch(`/api/data/${table}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to delete from ${table}`);
  return await res.json();
}

async function fetchAll(table, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiGet(table);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') && attempt < retries - 1) {
        const delay = (attempt + 1) * 2000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.error(`Error loading ${table}:`, msg);
      return [];
    }
  }
  return [];
}

export function generateClientId(clients) {
  const max = clients.reduce((acc, c) => Math.max(acc, parseInt(c.id?.replace('MC-CL-', '') || '0', 10)), 0);
  return `MC-CL-${String(max + 1).padStart(4, '0')}`;
}

export function generatePaymentId(payments) {
  const max = payments.reduce((acc, p) => Math.max(acc, parseInt(p.id?.replace('PAY-', '') || '0', 10)), 0);
  return `PAY-${String(max + 1).padStart(4, '0')}`;
}

export function generateInvoiceNumber(invoices) {
  const currentYear = new Date().getFullYear();
  const fy = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  const max = invoices.filter(i => i.id?.includes(fy)).reduce((acc, inv) => Math.max(acc, parseInt(inv.id?.split('/')[1] || '0', 10)), 0);
  return `MC/${String(max + 1).padStart(4, '0')}/${fy}`;
}

export function generateServiceId(services) {
  const max = services.reduce((acc, s) => Math.max(acc, parseInt(s.id?.replace('SRV-', '') || '0', 10)), 0);
  return `SRV-${String(max + 1).padStart(3, '0')}`;
}

export function generateExpenseId(expenses) {
  const max = expenses.reduce((acc, e) => Math.max(acc, parseInt(e.id?.replace('EXP-', '') || '0', 10)), 0);
  return `EXP-${String(max + 1).padStart(4, '0')}`;
}

export function getPaymentExpenses(expenses, paymentId) {
  return expenses.filter(e => e.paymentId === paymentId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

export function calcPaymentProfit(payment, expenses) {
  const totalExpenses = getPaymentExpenses(expenses, payment.id);
  const revenue = Number(payment.finalAmount || payment.projectValue || payment.advance || 0);
  const profit = revenue - totalExpenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100 * 100) / 100 : 0;
  return { revenue, expenses: totalExpenses, profit, margin };
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

export function sanitizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return cleaned;
}

export function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return dateStr; }
}

function computeStats(clients, crm, payments, invoices, expenses) {
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.finalAmount || p.projectValue || p.advance || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100 * 100) / 100 : 0;
  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    totalInvoices: invoices.length,
    paidPayments: payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.finalAmount || 0), 0),
    pendingPayments: payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + (p.due || 0), 0),
    activeClients: clients.filter(c => { const e = crm.find(cr => cr.clientId === c.id); return e?.leadStatus === 'Converted'; }).length,
    avgInvoice: invoices.length ? Math.round(invoices.reduce((s, i) => s + (i.final || 0), 0) / invoices.length) : 0,
    totalProjects: payments.length,
    completedProjects: payments.filter(p => p.status === 'Paid').length,
    ongoingProjects: payments.filter(p => p.status === 'Partial').length,
    upcomingProjects: payments.filter(p => p.status === 'Pending').length,
  };
}

export function StoreProvider({ children }) {
  const [clients, setClientsState] = useState([]);
  const [crm, setCrmState] = useState([]);
  const [payments, setPaymentsState] = useState([]);
  const [invoices, setInvoicesState] = useState([]);
  const [services, setServicesState] = useState([]);
  const [expenses, setExpensesState] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let [c, cr, p, i, s, e] = await Promise.all([
        fetchAll('clients'),
        fetchAll('crm'),
        fetchAll('payments'),
        fetchAll('invoices'),
        fetchAll('services'),
        fetchAll('expenses'),
      ]);
      if (!cancelled) {
        setClientsState(c);
        setCrmState(cr);
        setPaymentsState(p);
        setInvoicesState(i);
        setServicesState(s);
        setExpensesState(e);
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function logErr(context, error) {
    console.error(`${context}:`, error?.message || error);
  }

  const addClient = useCallback(async (client) => {
    try {
      await apiPost('clients', client);
      setClientsState(prev => [...prev, client]);
    } catch (error) { logErr('addClient error', error); }
  }, []);

  const updateClient = useCallback(async (id, data) => {
    try {
      await apiPatch('clients', { id, data });
      setClientsState(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) { logErr('updateClient error', error); }
  }, []);

  const deleteClient = useCallback(async (id) => {
    try {
      await apiDelete('clients', { id });
      setClientsState(prev => prev.filter(c => c.id !== id));
    } catch (error) { logErr('deleteClient error', error); }
  }, []);

  const deleteClients = useCallback(async (ids) => {
    try {
      await apiDelete('clients', { ids });
      setClientsState(prev => prev.filter(c => !ids.includes(c.id)));
    } catch (error) { logErr('deleteClients error', error); }
  }, []);

  const addCrmEntry = useCallback(async (entry) => {
    try {
      await apiPost('crm', entry);
      setCrmState(prev => [...prev, entry]);
    } catch (error) { logErr('addCrmEntry error', error); }
  }, []);

  const updateCrmEntry = useCallback(async (clientId, data) => {
    try {
      await apiPatch('crm', { client_id: clientId, data });
      setCrmState(prev => prev.map(c => c.clientId === clientId ? { ...c, ...data } : c));
    } catch (error) { logErr('updateCrmEntry error', error); }
  }, []);

  const deleteCrmEntry = useCallback(async (clientId) => {
    try {
      await apiDelete('crm', { client_id: clientId });
      setCrmState(prev => prev.filter(c => c.clientId !== clientId));
    } catch (error) { logErr('deleteCrmEntry error', error); }
  }, []);

  const addPayment = useCallback(async (payment) => {
    try {
      await apiPost('payments', payment);
      setPaymentsState(prev => [...prev, payment]);
    } catch (error) { logErr('addPayment error', error); }
  }, []);

  const updatePayment = useCallback(async (id, data) => {
    try {
      await apiPatch('payments', { id, data });
      setPaymentsState(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (error) { logErr('updatePayment error', error); }
  }, []);

  const deletePayment = useCallback(async (id) => {
    try {
      await apiDelete('payments', { id });
      setPaymentsState(prev => prev.filter(p => p.id !== id));
    } catch (error) { logErr('deletePayment error', error); }
  }, []);

  const addInvoice = useCallback(async (invoice) => {
    try {
      await apiPost('invoices', invoice);
      setInvoicesState(prev => [...prev, invoice]);
    } catch (error) { logErr('addInvoice error', error); }
  }, []);

  const updateInvoice = useCallback(async (id, data) => {
    try {
      await apiPatch('invoices', { id, data });
      setInvoicesState(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv));
    } catch (error) { logErr('updateInvoice error', error); }
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    try {
      await apiDelete('invoices', { id });
      setInvoicesState(prev => prev.filter(i => i.id !== id));
    } catch (error) { logErr('deleteInvoice error', error); }
  }, []);

  const addService = useCallback(async (service) => {
    try {
      await apiPost('services', service);
      setServicesState(prev => [...prev, service]);
    } catch (error) { logErr('addService error', error); }
  }, []);

  const updateService = useCallback(async (id, data) => {
    try {
      await apiPatch('services', { id, data });
      setServicesState(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (error) { logErr('updateService error', error); }
  }, []);

  const deleteService = useCallback(async (id) => {
    try {
      await apiDelete('services', { id });
      setServicesState(prev => prev.filter(s => s.id !== id));
    } catch (error) { logErr('deleteService error', error); }
  }, []);

  const addExpense = useCallback(async (expense) => {
    try {
      await apiPost('expenses', expense);
      setExpensesState(prev => [...prev, expense]);
    } catch (error) { logErr('addExpense error', error); }
  }, []);

  const updateExpense = useCallback(async (id, data) => {
    try {
      await apiPatch('expenses', { id, data });
      setExpensesState(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    } catch (error) { logErr('updateExpense error', error); }
  }, []);

  const deleteExpense = useCallback(async (id) => {
    try {
      await apiDelete('expenses', { id });
      setExpensesState(prev => prev.filter(e => e.id !== id));
    } catch (error) { logErr('deleteExpense error', error); }
  }, []);

  const stats = computeStats(clients, crm, payments, invoices, expenses);

  return (
    <StoreContext.Provider value={{
      clients, crm, payments, invoices, services, expenses, stats, loading,
      addClient, updateClient, deleteClient, deleteClients,
      addCrmEntry, updateCrmEntry, deleteCrmEntry,
      addPayment, updatePayment, deletePayment,
      addInvoice, updateInvoice, deleteInvoice,
      addService, updateService, deleteService,
      addExpense, updateExpense, deleteExpense,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
