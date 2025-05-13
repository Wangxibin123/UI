import React, { useState } from 'react';
import styles from './ProblemBlock.module.css';
import Latex from 'react-latex-next'; // Import Latex component

// Placeholder icons (can be replaced with actual icons later)
const EditIcon = () => <span>✏️</span>; // Placeholder for an edit icon
const FormatIcon = () => <span>✒️</span>; // Placeholder for a formatting icon

const ProblemBlock: React.FC = () => {
  const [problemText, setProblemText] = useState<string>("请在此输入或粘贴您的问题（支持LaTeX格式）：\n例如： $$\int_0^1 x^2 dx$$");
  const [isEditing, setIsEditing] = useState<boolean>(true); // Start in editing mode initially

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProblemText(event.target.value);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className={styles.problemBlockContainer}>
      <div className={styles.problemHeader}>
        <span className={styles.problemTitle}>问题描述</span>
        <div className={styles.problemActions}>
          <button onClick={toggleEditMode} className={styles.actionButton} aria-label={isEditing ? "完成编辑" : "编辑问题"}>
            {isEditing ? "完成" : <EditIcon />}
          </button>
          {/* Placeholder for a potential formatting action */}
          {!isEditing && (
            <button className={styles.actionButton} aria-label="格式化LaTeX">
              <FormatIcon />
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          className={styles.problemTextarea}
          value={problemText}
          onChange={handleTextChange}
          placeholder="在此输入或粘贴您的问题（支持LaTeX格式）"
        />
      ) : (
        <div className={styles.problemDisplay}>
          {/* Use Latex component here */}
          <Latex>{problemText}</Latex>
        </div>
      )}
    </div>
  );
};

export default ProblemBlock; 