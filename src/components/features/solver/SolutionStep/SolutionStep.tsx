import React from 'react';
import styles from './SolutionStep.module.css';
import Latex from 'react-latex-next';

// Placeholder icons
const EditIcon = () => <span>✏️</span>;
const DeleteIcon = () => <span>🗑️</span>;
const AnalyzeIcon = () => <span>🔍</span>;
const CorrectIcon = () => <span className={styles.correctIcon}>✔️</span>;
const IncorrectIcon = () => <span className={styles.incorrectIcon}>❌</span>;
const NotValidatedIcon = () => <span className={styles.notValidatedIcon}>?</span>;

interface SolutionStepProps {
  stepNumber: number;
  latexContent: string;
  isCorrect?: boolean; // true, false, or undefined (not validated)
}

const SolutionStep: React.FC<SolutionStepProps> = ({
  stepNumber,
  latexContent,
  isCorrect,
}) => {
  const getStatusIcon = () => {
    if (isCorrect === true) {
      return <CorrectIcon />;
    }
    if (isCorrect === false) {
      return <IncorrectIcon />;
    }
    return null;
  };

  return (
    <div className={`${styles.solutionStepContainer} ${isCorrect === false ? styles.incorrectStep : ''}`}>
      <div className={styles.stepNumberCircle}>{stepNumber}</div>
      <div className={styles.stepContent}>
        <Latex>{latexContent}</Latex>
      </div>
      <div className={styles.stepActions}>
        {getStatusIcon()}
        <button className={styles.actionButton} aria-label={`编辑步骤 ${stepNumber}`}>
          <EditIcon />
        </button>
        <button className={styles.iconButton} aria-label="删除步骤">
          <DeleteIcon />
        </button>
        <button className={styles.iconButton} aria-label="解析步骤">
          <AnalyzeIcon />
        </button>
      </div>
    </div>
  );
};

export default SolutionStep; 