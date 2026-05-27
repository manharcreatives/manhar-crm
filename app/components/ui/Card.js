'use client';

export function Card({ children, className = '', hover = true, glow = false, accent = false, style, ...props }) {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${glow ? 'card-glow' : ''} ${accent ? 'card-accent' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`card-header ${className}`}>
      <div>
        <span className="card-title">{title}</span>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </div>
      {action && <div className="card-action">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}
