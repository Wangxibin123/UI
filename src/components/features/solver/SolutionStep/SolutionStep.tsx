import React, { useState, useEffect } from 'react';
import { SolutionStepData, VerificationStatus } from '../../../../types';
import Latex from 'react-latex-next';
import styles from './SolutionStep.module.css';

// Placeholder icons
const EditIcon = () => <span>✏️</span>;
const DeleteIcon = () => <span>🗑️</span>;
const AnalyzeIcon = () => <span>🔍</span>;
const CorrectIcon = () => <span className={styles.correctIcon}>✔️</span>;
const IncorrectIcon = () => <span className={styles.incorrectIcon}>❌</span>;
const NotValidatedIcon = () => <span className={styles.notValidatedIcon}>?</span>;

interface SolutionStepProps {
  step: SolutionStepData;
  onContentChange: (stepId: string, newLatexContent: string) => void;
  onDelete: (stepId: string) => void;
  onAnalyze: (stepId: string) => void; // Future: To trigger AI analysis
  // onVerify: (stepId: string, currentStatus: VerificationStatus) => void; // Future: To manually change verification
}

const SolutionStep: React.FC<SolutionStepProps> = ({ step, onContentChange, onDelete, onAnalyze }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(step.latexContent);

  useEffect(() => {
    // If external changes to step.latexContent occur (e.g., AI updates it),
    // and we are NOT currently editing this step, update the local editText.
    if (step.latexContent !== editText && !isEditing) {
      setEditText(step.latexContent);
    }
  }, [step.latexContent, editText, isEditing]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Only call onContentChange if the content actually changed
      if (editText !== step.latexContent) {
        onContentChange(step.id, editText);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(event.target.value);
  };

  const getVerificationIcon = () => {
    switch (step.verificationStatus) {
      case VerificationStatus.VerifiedCorrect:
        return <span className={`${styles.icon} ${styles.correct}`} title="Verified Correct">✅</span>;
      case VerificationStatus.VerifiedIncorrect:
        return <span className={`${styles.icon} ${styles.incorrect}`} title="Verified Incorrect">❌</span>;
      case VerificationStatus.Verifying:
        return <span className={`${styles.icon} ${styles.notVerified}`} title="Verifying...">🔄</span>; // Example
      case VerificationStatus.NotVerified:
      default:
        // return <span className={`${styles.icon} ${styles.notVerified}`} title="Not Verified">❓</span>;
        return null; // Or no icon if not verified
    }
  };

  return (
    <div className={styles.solutionStep}>
      <div className={styles.stepNumberContainer}>
        <span className={styles.stepNumber}>{step.stepNumber}</span>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.stepHeader}>
          {getVerificationIcon()}
        </div>
        <div className={styles.contentArea}>
          {isEditing ? (
            <textarea
              value={editText}
              onChange={handleTextChange}
              className={styles.latexEditor}
            />
          ) : (
            <Latex>{`$$${step.latexContent.replace(/^\$\$|\$\$$/g, '')}$$`}</Latex>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={handleEditToggle} className={styles.iconButton} title={isEditing ? "保存" : "编辑"}>
          {isEditing ? '💾' : '✏️'}
        </button>
        <button onClick={() => onDelete(step.id)} className={styles.iconButton} title="删除">
          🗑️
        </button>
        <button onClick={() => onAnalyze(step.id)} className={styles.iconButton} title="解析此步骤 (暂未实现)">
          🔍
        </button>
        {/* Future buttons for manual verification change could go here */}
      </div>
    </div>
  );
};

export default SolutionStep; 