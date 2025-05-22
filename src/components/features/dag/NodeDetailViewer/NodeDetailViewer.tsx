import React, { useState, useCallback } from 'react';
import Latex from 'react-latex-next';
import styles from './NodeDetailViewer.module.css';
import { Save, X } from 'lucide-react';

interface NodeDetailViewerProps {
  nodeId: string;
  initialLatexContent: string;
  nodeLabel: string;
  onSave: (nodeId: string, newLatexContent: string) => void;
  onCancel: () => void;
}

const NodeDetailViewer: React.FC<NodeDetailViewerProps> = ({
  nodeId,
  initialLatexContent,
  nodeLabel,
  onSave,
  onCancel,
}) => {
  const [currentLatex, setCurrentLatex] = useState(initialLatexContent);

  const handleLatexChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentLatex(event.target.value);
  };

  const handleSave = useCallback(() => {
    if (currentLatex.trim() !== initialLatexContent.trim()) {
        onSave(nodeId, currentLatex.trim());
    } else {
        // If no change, just cancel to avoid unnecessary processing or notifications
        onCancel(); 
    }
  }, [nodeId, currentLatex, initialLatexContent, onSave, onCancel]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <div className={styles.nodeDetailViewerContainer}>
      <div className={styles.header}>
        <h3>{nodeLabel} - 详细信息</h3>
        <div className={styles.actions}>
          <button onClick={handleSave} className={`${styles.iconButton} ${styles.saveButton}`} title="保存更改">
            <Save size={18} /> 保存
          </button>
          <button onClick={handleCancel} className={`${styles.iconButton} ${styles.cancelButton}`} title="取消编辑">
            <X size={18} /> 取消
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.renderedLatexSection}>
          <h4>渲染效果:</h4>
          <div className={styles.latexDisplayBox}>
            {initialLatexContent.trim() ? (
                <Latex delimiters={[
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\\(", right: "\\)", display: false },
                    { left: "\\[", right: "\\]", display: true }
                ]}>{initialLatexContent}</Latex>
            ) : (
                <p className={styles.emptyContentPlaceholder}>无内容可预览</p>
            )}
          </div>
        </div>

        <div className={styles.editableLatexSection}>
          <h4>编辑 LaTeX:</h4>
          <textarea
            value={currentLatex}
            onChange={handleLatexChange}
            className={styles.latexTextarea}
            rows={10} // Adjust as needed
            placeholder="在此输入 LaTeX 内容..."
          />
        </div>
      </div>
    </div>
  );
};

export default NodeDetailViewer; 