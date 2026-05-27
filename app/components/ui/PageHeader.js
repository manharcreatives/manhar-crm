'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function PageHeader({
  title, description, icon: Icon, action, breadcrumbs, className = ''
}) {
  return (
    <div className={`page-header ${className}`}>
      <div className="page-header-left">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="breadcrumbs">
            <Link href="/dashboard" className="breadcrumb-link">
              <Home size={14} />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="breadcrumb-item">
                <ChevronRight size={12} className="breadcrumb-sep" />
                {crumb.href ? (
                  <Link href={crumb.href} className="breadcrumb-link">{crumb.label}</Link>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="page-header-title-row">
          {Icon && (
            <div className="page-header-icon">
              <Icon size={22} />
            </div>
          )}
          <div>
            <h1 className="page-header-title">{title}</h1>
            {description && <p className="page-header-desc">{description}</p>}
          </div>
        </div>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}
