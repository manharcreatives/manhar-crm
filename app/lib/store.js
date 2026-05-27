'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import supabase from './supabase';

const StoreContext = createContext(null);

function toSnake(str) {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}

function objToDb(obj) {
  const result = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[toSnake(key)] = obj[key];
    }
  }
  return result;
}

function rowToJs(row) {
  const result = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
}

async function fetchAll(table, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase.from(table).select('*');
    if (!error) return (data || []).map(rowToJs);
    const msg = error?.message || '';
    if (msg.includes('Could not find the table') && attempt < retries - 1) {
      const delay = (attempt + 1) * 2000;
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    console.error(`Error loading ${table}:`, msg);
    return [];
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

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return dateStr; }
}

function computeStats(clients, crm, payments, invoices) {
  return {
    totalRevenue: payments.reduce((sum, p) => sum + (p.advance || 0), 0),
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let [c, cr, p, i, s] = await Promise.all([
        fetchAll('clients'),
        fetchAll('crm'),
        fetchAll('payments'),
        fetchAll('invoices'),
        fetchAll('services'),
      ]);
      const hasLocal = typeof window !== 'undefined' && localStorage.getItem('mc_clients');
      if (c.length === 0 && hasLocal) {
        const localClients = JSON.parse(localStorage.getItem('mc_clients') || '[]');
        const localCrm = JSON.parse(localStorage.getItem('mc_crm') || '[]');
        const localPayments = JSON.parse(localStorage.getItem('mc_payments') || '[]');
        const localInvoices = JSON.parse(localStorage.getItem('mc_invoices') || '[]');
        const localServices = JSON.parse(localStorage.getItem('mc_services') || '[]');
        if (localClients.length > 0) {
          const { error: ce } = await supabase.from('clients').insert(localClients.map(objToDb));
          if (!ce) c = localClients;
        }
        if (localCrm.length > 0) {
          const { error: cme } = await supabase.from('crm').insert(localCrm.map(objToDb));
          if (!cme) cr = localCrm;
        }
        if (localPayments.length > 0) {
          const { error: pe } = await supabase.from('payments').insert(localPayments.map(objToDb));
          if (!pe) p = localPayments;
        }
        if (localInvoices.length > 0) {
          const { error: ie } = await supabase.from('invoices').insert(localInvoices.map(objToDb));
          if (!ie) i = localInvoices;
        }
        if (localServices.length > 0) {
          const { error: se } = await supabase.from('services').insert(localServices.map(objToDb));
          if (!se) s = localServices;
        }
      }
      if (!cancelled) {
        setClientsState(c);
        setCrmState(cr);
        setPaymentsState(p);
        setInvoicesState(i);
        setServicesState(s);
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function logErr(context, error) {
    console.error(`${context}:`, error?.message || error?.details || error?.hint || JSON.stringify(error));
  }

  const addClient = useCallback(async (client) => {
    const { error } = await supabase.from('clients').insert([objToDb(client)]);
    if (error) { logErr('addClient error', error); return; }
    setClientsState(prev => [...prev, client]);
  }, []);

  const updateClient = useCallback(async (id, data) => {
    const { error } = await supabase.from('clients').update(objToDb(data)).eq('id', id);
    if (error) { logErr('updateClient error', error); return; }
    setClientsState(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { logErr('deleteClient error', error); return; }
    setClientsState(prev => prev.filter(c => c.id !== id));
  }, []);

  const deleteClients = useCallback(async (ids) => {
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (error) { logErr('deleteClients error', error); return; }
    setClientsState(prev => prev.filter(c => !ids.includes(c.id)));
  }, []);

  const addCrmEntry = useCallback(async (entry) => {
    const dbData = objToDb(entry);
    const { error } = await supabase.from('crm').insert([dbData]);
    if (error) { logErr('addCrmEntry error', error); return; }
    setCrmState(prev => [...prev, entry]);
  }, []);

  const updateCrmEntry = useCallback(async (clientId, data) => {
    const { error } = await supabase.from('crm').update(objToDb(data)).eq('client_id', clientId);
    if (error) { logErr('updateCrmEntry error', error); return; }
    setCrmState(prev => prev.map(c => c.clientId === clientId ? { ...c, ...data } : c));
  }, []);

  const deleteCrmEntry = useCallback(async (clientId) => {
    const { error } = await supabase.from('crm').delete().eq('client_id', clientId);
    if (error) { logErr('deleteCrmEntry error', error); return; }
    setCrmState(prev => prev.filter(c => c.clientId !== clientId));
  }, []);

  const addPayment = useCallback(async (payment) => {
    const { error } = await supabase.from('payments').insert([objToDb(payment)]);
    if (error) { logErr('addPayment error', error); return; }
    setPaymentsState(prev => [...prev, payment]);
  }, []);

  const updatePayment = useCallback(async (id, data) => {
    const { error } = await supabase.from('payments').update(objToDb(data)).eq('id', id);
    if (error) { logErr('updatePayment error', error); return; }
    setPaymentsState(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) { logErr('deletePayment error', error); return; }
    setPaymentsState(prev => prev.filter(p => p.id !== id));
  }, []);

  const addInvoice = useCallback(async (invoice) => {
    const { error } = await supabase.from('invoices').insert([objToDb(invoice)]);
    if (error) { logErr('addInvoice error', error); return; }
    setInvoicesState(prev => [...prev, invoice]);
  }, []);

  const updateInvoice = useCallback(async (id, data) => {
    const { error } = await supabase.from('invoices').update(objToDb(data)).eq('id', id);
    if (error) { logErr('updateInvoice error', error); return; }
    setInvoicesState(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv));
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { logErr('deleteInvoice error', error); return; }
    setInvoicesState(prev => prev.filter(i => i.id !== id));
  }, []);

  const addService = useCallback(async (service) => {
    const { error } = await supabase.from('services').insert([objToDb(service)]);
    if (error) { logErr('addService error', error); return; }
    setServicesState(prev => [...prev, service]);
  }, []);

  const updateService = useCallback(async (id, data) => {
    const { error } = await supabase.from('services').update(objToDb(data)).eq('id', id);
    if (error) { logErr('updateService error', error); return; }
    setServicesState(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const deleteService = useCallback(async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { logErr('deleteService error', error); return; }
    setServicesState(prev => prev.filter(s => s.id !== id));
  }, []);

  const stats = computeStats(clients, crm, payments, invoices);

  return (
    <StoreContext.Provider value={{
      clients, crm, payments, invoices, services, stats, loading,
      addClient, updateClient, deleteClient, deleteClients,
      addCrmEntry, updateCrmEntry, deleteCrmEntry,
      addPayment, updatePayment, deletePayment,
      addInvoice, updateInvoice, deleteInvoice,
      addService, updateService, deleteService,
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
