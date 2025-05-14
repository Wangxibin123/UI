import React, { useState, useEffect } from 'react';
import { ProblemData } from '../../../../types';
import Latex from 'react-latex-next';
import styles from './ProblemBlock.module.css';

interface ProblemBlockProps {
  data: ProblemData | null;
  onContentChange: (newLatexContent: string) => void;
  // onUploadClick: () => void; // Future implementation
}

const ProblemBlock: React.FC<ProblemBlockProps> = ({ data, onContentChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    // Update editText when data.latexContent changes and not in editing mode
    if (data && !isEditing) {
      setEditText(data.latexContent);
    }
  }, [data, isEditing]);

  const handleEditToggle = () => {
    if (isEditing && data) {
      if (editText !== data.latexContent) {
        onContentChange(editText);
      }
    } else if (data) {
      setEditText(data.latexContent); // Load current content when starting to edit
    }
    setIsEditing(!isEditing);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(event.target.value);
  };

  if (!data) {
    // Display a message or a loader if there's no problem data yet
    // Or, allow creating a new problem directly from here
    return (
      <div className={styles.problemBlock}>
        <div className={styles.sideLabel}>题目</div>
        <div className={styles.contentArea}>
          <textarea
            value={editText}
            onChange={handleTextChange}
            className={styles.latexEditor}
            placeholder="在此输入或粘贴您的问题（支持LaTeX格式）：\n例如：\nint_1^x t^2 dt"
          />
        </div>
        <div className={styles.actions}>
          <button onClick={() => onContentChange(editText)} className={styles.iconButton} title="保存新题目">
            💾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.problemBlock}>
      <div className={styles.sideLabel}>题目</div>
      <div className={styles.contentArea}>
        {isEditing ? (
          <textarea
            value={editText}
            onChange={handleTextChange}
            className={styles.latexEditor}
            placeholder="在此输入或粘贴您的问题（支持LaTeX格式）：\n例如：\nint_1^x t^2 dt"
          />
        ) : (
          <div className={styles.latexDisplay}>
            {/* Add $$ if not present for react-latex-next default delimiters */}
            <Latex>{`$$${data.latexContent.replace(/^\$\$|\$\$$/g, '')}$$`}</Latex>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button onClick={handleEditToggle} className={styles.iconButton} title={isEditing ? "保存" : "编辑"}>
          {isEditing ? '💾' : '✏️'}
        </button>
        <button className={styles.iconButton} title="上传图片 (暂未实现)">
          📷
        </button>
      </div>
    </div>
  );
};

export default ProblemBlock; 