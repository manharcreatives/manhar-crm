'use client';

import { AlertTriangle } from 'lucide-react';
import Modal, { ModalFooter } from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirm Action',
  message = 'Are you sure? This action cannot be undone.',
  confirmLabel = 'Delete', cancelLabel = 'Cancel',
  variant = 'danger', loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          <AlertTriangle size={32} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
