import React, { useState } from 'react';
import styles from './SolverActions.module.css';

// Placeholder icons (can be replaced or removed if not used)
const SimilarIcon = () => <span>📚</span>; // Find similar problems
const HintIcon = () => <span>💡</span>;    // Get a hint
const VerifyIcon = () => <span>✔️</span>;  // Verify current step/solution
const SubmitIcon = () => <span>➡️</span>;  // Submit final solution
const AddStepIcon = () => <span>➕</span>; // Icon for Add Step button

interface SolverActionsProps {
  onAddStep: (latexContent: string) => void;
  // Future props for other actions:
  // onFindSimilar: () => void;
  // onGetHint: () => void;
  // onAnalyzeAllSteps: () => void;
  // onSummarize: () => void;
}

const SolverActions: React.FC<SolverActionsProps> = ({ onAddStep }) => {
  const [nextStepLatex, setNextStepLatex] = useState('');

  const handleAddStepClick = () => {
    if (nextStepLatex.trim()) {
      onAddStep(nextStepLatex.trim());
      setNextStepLatex(''); // Clear input after adding
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddStepClick();
    }
  };

  return (
    <div className={styles.solverActions}>
      <div className={styles.inputArea}>
        <input
          type="text"
          value={nextStepLatex}
          onChange={(e) => setNextStepLatex(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入下一步解答 (支持 LaTeX)..."
          className={styles.stepInput}
        />
      </div>
      <div className={styles.buttonGroup}>
        {/* Placeholder buttons for future functionality */}
        <button className={styles.actionButton} title="查找类似题目 (暂未实现)">📚</button>
        <button 
          onClick={handleAddStepClick} 
          className={`${styles.actionButton} ${styles.submitButton}`}
          title="提交此步骤"
        >
          <span>🖊️</span>提交
        </button>
        <button className={styles.actionButton} title="获取AI提示 (暂未实现)">💡</button>
        <button className={styles.actionButton} title="分析所有步骤 (暂未实现)">🔬</button>
        <button className={styles.actionButton} title="总结解题过程 (暂未实现)">📝</button>
      </div>
    </div>
  );
};

export default SolverActions; 