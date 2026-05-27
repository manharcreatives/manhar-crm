'use client';

import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
  outline: 'btn btn-outline',
};

const sizes = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  icon: Icon, loading, disabled, className = '', onClick, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      className={`${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  );
}
