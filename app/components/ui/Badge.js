'use client';

import { Circle, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

const statusMap = {
  paid: { label: 'Paid', className: 'badge badge-paid', icon: CheckCircle },
  active: { label: 'Active', className: 'badge badge-active', icon: CheckCircle },
  converted: { label: 'Converted', className: 'badge badge-converted', icon: CheckCircle },
  pending: { label: 'Pending', className: 'badge badge-pending', icon: Clock },
  partial: { label: 'Partial', className: 'badge badge-partial', icon: Clock },
  overdue: { label: 'Overdue', className: 'badge badge-overdue', icon: AlertTriangle },
  lost: { label: 'Lost', className: 'badge badge-lost', icon: XCircle },
  new: { label: 'New', className: 'badge badge-new', icon: Circle },
  contacted: { label: 'Contacted', className: 'badge badge-contacted', icon: Circle },
  interested: { label: 'Interested', className: 'badge badge-interested', icon: Circle },
  inactive: { label: 'Inactive', className: 'badge badge-inactive', icon: XCircle },
  negotiation: { label: 'Negotiation', className: 'badge badge-negotiation', icon: Clock },
  proposal: { label: 'Proposal Sent', className: 'badge badge-proposal', icon: Clock },
  high: { label: 'High', className: 'badge badge-high', icon: AlertTriangle },
  medium: { label: 'Medium', className: 'badge badge-medium', icon: Clock },
  low: { label: 'Low', className: 'badge badge-low', icon: CheckCircle },
  verified: { label: 'Verified', className: 'badge badge-paid', icon: CheckCircle },
};

export default function Badge({ status, label, className = '', dot = true }) {
  const match = statusMap[status?.toLowerCase()] || statusMap[status?.toLowerCase()] || {};
  const displayLabel = label || match.label || status;
  const Icon = match.icon;

  return (
    <span className={`${match.className || 'badge'} ${className}`}>
      {dot && Icon && <Icon size={10} />}
      {displayLabel}
    </span>
  );
}
