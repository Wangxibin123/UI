import React, { useState, useEffect } from 'react';
import styles from './SplitStepModal.module.css'; // We'll create this CSS file next

interface SplitStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalStepContent: string;
  originalStepLabel?: string; // For modal title
  onConfirmSplit: (part1Content: string, part2Content: string) => void;
}

const SplitStepModal: React.FC<SplitStepModalProps> = ({
  isOpen,
  onClose,
  originalStepContent,
  originalStepLabel,
  onConfirmSplit,
}) => {
  const [part1Text, setPart1Text] = useState('');
  const [part2Text, setPart2Text] = useState('');

  useEffect(() => {
    if (isOpen) {
      // When the modal opens, pre-fill part1 with the original content
      // and clear part2, or a smarter split could be attempted.
      setPart1Text(originalStepContent || '');
      setPart2Text('');
    }
  }, [isOpen, originalStepContent]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    const trimmedPart1 = part1Text.trim();
    const trimmedPart2 = part2Text.trim();
    if (!trimmedPart1 || !trimmedPart2) {
      alert('拆分后的两个部分均不能为空内容！'); // Simple validation, consider using toast for consistency
      return;
    }
    onConfirmSplit(trimmedPart1, trimmedPart2);
    // onClose(); // Parent should close after successful operation and toast
  };

  const modalTitle = originalStepLabel ? `拆分步骤: ${originalStepLabel}` : '拆分步骤';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{modalTitle}</h3>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.instructionText}>请输入拆分后两个部分的内容：</p>
          <label htmlFor="splitPart1Input" className={styles.label}>第一部分 (原步骤内容更新为):</label>
          <textarea
            id="splitPart1Input"
            className={styles.splitTextarea}
            value={part1Text}
            onChange={(e) => setPart1Text(e.target.value)}
            placeholder="第一部分内容..."
            rows={4}
          />
          <label htmlFor="splitPart2Input" className={styles.label}>第二部分 (新步骤内容):</label>
          <textarea
            id="splitPart2Input"
            className={styles.splitTextarea}
            value={part2Text}
            onChange={(e) => setPart2Text(e.target.value)}
            placeholder="第二部分内容..."
            rows={4}
          />
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>取消</button>
          <button onClick={handleConfirm} className={styles.confirmButton}>确认拆分</button>
        </div>
      </div>
    </div>
  );
};

export default SplitStepModal; 