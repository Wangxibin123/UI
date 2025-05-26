import React, { useState, useEffect } from 'react';
import styles from './InterpretationModal.module.css';
import Latex from 'react-latex-next';
import { Eye, EyeOff } from 'lucide-react';

interface InterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nodeId: string, userIdea: string) => void;
  nodeId: string | null;
  nodeLabel?: string;
  nodeContent?: string; // e.g., LaTeX content of the node
  initialIdea?: string;
}

const InterpretationModal: React.FC<InterpretationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nodeId,
  nodeLabel,
  nodeContent,
  initialIdea = '',
}) => {
  const [userIdea, setUserIdea] = useState<string>(initialIdea);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setUserIdea(initialIdea || ''); // Reset/initialize idea when modal opens
    }
  }, [isOpen, initialIdea]);

  if (!isOpen || !nodeId) {
    return null;
  }

  const handleSubmit = () => {
    onSubmit(nodeId, userIdea);
    // setUserIdea(''); // Optionally clear after submit, or let onClose handle reset
  };

  const handleCancel = () => {
    onClose();
    // setUserIdea(''); // Reset idea on explicit cancel
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          解读节点: {nodeLabel || `ID: ${nodeId}`}
        </h2>
        
        {nodeContent && (
          <div className={styles.nodeInfoSection}>
            <h3 className={styles.sectionTitle}>节点内容:</h3>
            <div className={styles.nodeContentPreview}>
              {/* Assuming nodeContent is LaTeX. Adjust if it's plain text. */}
              <Latex>{`$$${nodeContent.replace(/^\$\$|\$\$$/g, '')}$$`}</Latex>
            </div>
          </div>
        )}

        <div className={styles.ideaSection}>
          <div className={styles.ideaSectionHeader}>
            <h3 className={styles.sectionTitle}>你的思路/想法:</h3>
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={styles.previewToggleButton}
              title={showPreview ? "隐藏预览" : "显示LaTeX预览"}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPreview ? "隐藏预览" : "LaTeX预览"}
            </button>
          </div>
          
          {showPreview ? (
            <div className={styles.latexPreviewContainer}>
              <div className={styles.latexPreview}>
                {userIdea.trim() ? (
                  <Latex delimiters={[
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\\(", right: "\\)", display: false },
                    { left: "\\[", right: "\\]", display: true }
                  ]}>
                    {userIdea}
                  </Latex>
                ) : (
                  <div className={styles.emptyPreviewPlaceholder}>
                    在左侧输入内容以查看LaTeX渲染效果...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <textarea
              className={styles.ideaTextarea}
              value={userIdea}
              onChange={(e) => setUserIdea(e.target.value)}
              placeholder="请输入你对这个步骤的理解、解题思路、可能的疑问或改进建议... 支持LaTeX语法，使用 $ 包围行内公式，$$ 包围块级公式。"
              rows={6}
            />
          )}
          
          <div className={styles.latexHint}>
            💡 提示：支持LaTeX数学公式。使用 $公式$ 表示行内公式，$$公式$$ 表示块级公式。
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={handleCancel} className={`${styles.modalButton} ${styles.cancelButton}`}>
            取消
          </button>
          <button onClick={handleSubmit} className={`${styles.modalButton} ${styles.submitButton}`}>
            提交解读
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterpretationModal; 