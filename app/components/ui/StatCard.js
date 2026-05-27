'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numeric = Number(value) || 0;
    const startTime = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numeric * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{prefix}{display.toLocaleString('en-IN')}{suffix}</>;
}

export default function StatCard({
  icon: Icon, label, value, subtitle, trend, trendLabel,
  color = 'green', prefix = '', suffix = '', animate = true,
  className = '', onClick, compact
}) {
  const colorMap = {
    green: 'stat-icon-green', yellow: 'stat-icon-yellow', blue: 'stat-icon-blue',
    red: 'stat-icon-red', purple: 'stat-icon-purple', teal: 'stat-icon-teal',
  };

  return (
    <div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''} ${compact ? 'stat-card-compact' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-card-inner">
        <div className="stat-card-top">
          {Icon && (
            <div className={`stat-icon ${colorMap[color] || colorMap.green}`}>
              <Icon size={compact ? 16 : 18} />
            </div>
          )}
          {trend !== undefined && (
            <div className={`stat-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="stat-value">
          {animate ? (
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          ) : (
            <>{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}</>
          )}
        </div>
        <div className="stat-label">{label}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        {trendLabel && <div className="stat-trend-label">{trendLabel}</div>}
      </div>
    </div>
  );
}
