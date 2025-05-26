import React, { useState, useEffect } from 'react';
import styles from './NodeNoteModal.module.css';
import Latex from 'react-latex-next';
import { Eye, EyeOff, Edit2, Copy } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentNote(initialNote || ''); // Reset when opened, handling undefined initialNote
      // 如果有内容，默认显示渲染后的效果；如果没有内容，默认进入编辑模式
      setIsEditing(!initialNote || initialNote.trim() === '');
      setShowPreview(false);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(currentNote);
    setIsEditing(false); // 保存后退出编辑模式
    // onClose(); // Usually, the parent component closes the modal after save logic
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentNote);
      // 这里可以添加一个简单的提示，但为了不依赖toast，我们暂时省略
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const modalTitle = nodeLabel ? `备注: ${nodeLabel}` : title;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{modalTitle}</h3>
          <div className={styles.headerActions}>
            {!isEditing && (
              <>
                <button 
                  onClick={handleCopy} 
                  className={styles.actionButton}
                  title="复制备注"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className={styles.actionButton}
                  title="编辑备注"
                >
                  <Edit2 size={16} />
                </button>
              </>
            )}
            <button onClick={onClose} className={styles.closeButton}>&times;</button>
          </div>
        </div>
        <div className={styles.modalBody}>
          {isEditing ? (
            <div className={styles.editingContainer}>
              <div className={styles.editingHeader}>
                <span className={styles.editingLabel}>编辑备注 (支持LaTeX)</span>
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className={styles.previewToggleButton}
                  title={showPreview ? "隐藏预览" : "显示LaTeX预览"}
                >
                  {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPreview ? "隐藏预览" : "预览"}
                </button>
              </div>
              <textarea
                className={styles.noteTextarea}
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="在此输入备注信息... 支持LaTeX公式，如: $x^2$ 或 $$\int f(x)dx$$"
                rows={showPreview ? 6 : 12}
              />
              {showPreview && (
                <div className={styles.latexPreviewContainer}>
                  <div className={styles.previewLabel}>LaTeX预览：</div>
                  <div className={styles.latexPreview}>
                    {currentNote.trim() ? (
                      <Latex>{currentNote}</Latex>
                    ) : (
                      <div className={styles.emptyPreviewPlaceholder}>
                        输入内容后将显示LaTeX渲染效果
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.renderedContainer}>
              <div className={styles.renderedContent}>
                {currentNote.trim() ? (
                  <Latex>{currentNote}</Latex>
                ) : (
                  <div className={styles.emptyNote}>暂无备注内容</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>
            {isEditing ? '取消' : '关闭'}
          </button>
          {isEditing && (
            <button onClick={handleSave} className={styles.saveButton}>保存备注</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeNoteModal; 