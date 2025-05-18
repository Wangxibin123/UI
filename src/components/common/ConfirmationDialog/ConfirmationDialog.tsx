import React from 'react';
import styles from './ConfirmationDialog.module.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonVariant?: 'default' | 'destructive' | 'constructive';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmButtonVariant = 'default',
}) => {
  if (!isOpen) {
    return null;
  }

  let confirmButtonClass = styles.confirmButton;
  if (confirmButtonVariant === 'destructive') {
    confirmButtonClass = `${styles.confirmButton} ${styles.destructive}`;
  } else if (confirmButtonVariant === 'constructive') {
    confirmButtonClass = `${styles.confirmButton} ${styles.constructive}`;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
      <div className={styles.dialog}>
        <h2 id="dialogTitle" className={styles.title}>{title}</h2>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            {cancelText}
          </button>
          <button className={confirmButtonClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog; 