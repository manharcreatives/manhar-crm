'use client';

export default function Avatar({ name, src, size = 34, statusDot, className = '' }) {
  const initial = name?.[0]?.toUpperCase() || '?';

  return (
    <div className={`avatar-wrapper ${className}`} style={{ position: 'relative', display: 'inline-flex' }}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="avatar"
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      ) : (
        <div
          className="avatar"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initial}
        </div>
      )}
      {statusDot && (
        <span
          className="avatar-status-dot"
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: size * 0.3, height: size * 0.3,
            borderRadius: '50%',
            background: statusDot === 'online' ? '#22C55E' : statusDot === 'away' ? '#F59E0B' : '#9CA3AF',
            border: '2px solid var(--bg-main)',
          }}
        />
      )}
    </div>
  );
}
