'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  children, open, onClose, title, size = 'md', className = ''
}) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeMap = {
    sm: 'modal-sm', md: '', lg: 'modal-lg', xl: 'modal-xl', full: 'modal-full'
  };

  return (
    <div
      className={`modal-overlay ${className}`}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className={`modal ${sizeMap[size] || ''}`} ref={contentRef}>
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({ children, align = 'right' }) {
  return (
    <div className={`modal-footer modal-footer-${align}`}>
      {children}
    </div>
  );
}

export function ModalSection({ title, children }) {
  return (
    <>
      {title && (
        <div className="modal-section-title">
          <span>{title}</span>
        </div>
      )}
      {children}
    </>
  );
}
