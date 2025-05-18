import React, { useState, useEffect } from 'react';
import styles from './NodeNoteModal.module.css';

interface NodeNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote?: string;
  onSave: (note: string) => void;
  nodeLabel?: string;
  title?: string; // More generic title prop
}

const NodeNoteModal: React.FC<NodeNoteModalProps> = ({
  isOpen,
  onClose,
  initialNote = '',
  onSave,
  nodeLabel,
  title = '节点备注'
}) => {
  const [currentNote, setCurrentNote] = useState(initialNote);

  useEffect(() => {
    if (isOpen) {
      setCurrentNote(initialNote || ''); // Reset when opened, handling undefined initialNote
    }
  }, [isOpen, initialNote]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(currentNote);
    // onClose(); // Usually, the parent component closes the modal after save logic
  };

  const modalTitle = nodeLabel ? `备注: ${nodeLabel}` : title;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{modalTitle}</h3>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <textarea
            className={styles.noteTextarea}
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="在此输入备注信息..."
            rows={10}
          />
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>取消</button>
          <button onClick={handleSave} className={styles.saveButton}>保存备注</button>
        </div>
      </div>
    </div>
  );
};

export default NodeNoteModal; 