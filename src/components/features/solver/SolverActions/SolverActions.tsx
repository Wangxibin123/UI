import React from 'react';
import styles from './SolverActions.module.css';

// Placeholder icons (can be replaced or removed if not used)
const SimilarIcon = () => <span>📚</span>; // Find similar problems
const HintIcon = () => <span>💡</span>;    // Get a hint
const VerifyIcon = () => <span>✔️</span>;  // Verify current step/solution
const SubmitIcon = () => <span>➡️</span>;  // Submit final solution
const AddStepIcon = () => <span>➕</span>; // Icon for Add Step button

interface SolverActionsProps {
  onAddNewStep: (latexInput: string) => void; // Callback to add a new step
  // We can add more callbacks here later for other actions like verify, submit, etc.
}

const SolverActions: React.FC<SolverActionsProps> = ({ onAddNewStep }) => {

  const handleAddStepClick = () => {
    const latexInput = window.prompt("请输入新步骤的LaTeX内容：");
    if (latexInput !== null) { // prompt returns null if user cancels
      onAddNewStep(latexInput);
    }
  };

  return (
    <div className={styles.solverActionsContainer}>
      <button onClick={handleAddStepClick} className={`${styles.actionButton} ${styles.addStepButton}`}>
        <AddStepIcon /> 添加新步骤
      </button>
      <button className={styles.actionButton} aria-label="获取提示">
        <HintIcon /> 获取提示
      </button>
      <button className={styles.actionButton} aria-label="验证步骤">
        <VerifyIcon /> 验证步骤
      </button>
      <button className={styles.actionButton} aria-label="查找相似题目">
        <SimilarIcon /> 相似题目
      </button>
      <button className={`${styles.actionButton} ${styles.submitButton}`} aria-label="提交解答">
        <SubmitIcon /> 提交解答
      </button>
    </div>
  );
};

export default SolverActions; 