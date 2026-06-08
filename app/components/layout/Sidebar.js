'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Target, CreditCard, FileText,
  History, Zap, ChevronLeft, Menu, X, LogOut
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    section: 'Client Management',
    items: [
      { href: '/clients', label: 'Client Database', icon: Users },
      { href: '/crm', label: 'CRM & Leads', icon: Target },
    ]
  },
  {
    section: 'Finance',
    items: [
      { href: '/payments', label: 'Payment Tracker', icon: CreditCard },
      { href: '/invoice', label: 'Invoice Generator', icon: FileText },
      { href: '/history', label: 'Invoice History', icon: History },
    ]
  },
  {
    section: 'Operations',
    items: [
      { href: '/services', label: 'Services List', icon: Zap },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed(prev => !prev);
      }
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarClass = `sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`;

  return (
    <>
      {mobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={sidebarClass}>
        <div className="sidebar-logo">
          <img
            src="https://res.cloudinary.com/dm2hjn5wp/image/upload/q_auto/f_auto/v1778926797/manhar_affwok.png"
            alt="Manhar Creatives"
            className="sidebar-logo-img"
          />
          <div className="sidebar-logo-text">
            <h2>Manhar Creatives</h2>
            <p>We Design, We Build, You Grow</p>
          </div>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? 'Expand (⌘B)' : 'Collapse (⌘B)'}
        >
          <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }} />
        </button>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={logout} title="Logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          <p>© 2026 Manhar Creatives</p>
        </div>
      </aside>

      <button
        className="hamburger-btn"
        style={{ position: 'fixed', top: 14, left: 12, zIndex: 55 }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={18} />
      </button>
    </>
  );
}
