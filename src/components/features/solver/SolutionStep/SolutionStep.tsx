import React, { useState, useEffect, useCallback } from 'react';
import { SolutionStepData, VerificationStatus } from '../../../../types';
import Latex from 'react-latex-next';
import styles from './SolutionStep.module.css';
import { 
  Pencil, Save, Undo2, Trash2, SearchCode, Scissors, 
  CheckCircle2, XCircle, RefreshCw, Check, X // Check for confirm split, X for cancel split
} from 'lucide-react';

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
  onAnalyze: (stepId: string) => void;
  onSplit: (originalStepId: string, part1Content: string, part2Content: string) => void; // New prop
}

const SolutionStep: React.FC<SolutionStepProps> = ({ step, onContentChange, onDelete, onAnalyze, onSplit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditText, setCurrentEditText] = useState(step.latexContent);

  const [isSplitting, setIsSplitting] = useState(false);
  const [splitPart1Text, setSplitPart1Text] = useState('');
  const [splitPart2Text, setSplitPart2Text] = useState('');

  useEffect(() => {
    if (!isEditing && step.latexContent !== currentEditText) {
      setCurrentEditText(step.latexContent);
    }
    if (!isEditing && isSplitting) {
        setIsSplitting(false); 
    }
  }, [step.latexContent, isEditing, currentEditText, isSplitting]);

  const handleEnterEditMode = useCallback(() => {
    setCurrentEditText(step.latexContent);
    setIsEditing(true);
    setIsSplitting(false); 
  }, [step.latexContent]);

  const handleSaveEdit = useCallback(() => {
    const trimmedEditText = currentEditText.trim();
    if (trimmedEditText !== step.latexContent.trim() && trimmedEditText !== '') {
      onContentChange(step.id, trimmedEditText);
    }
    setIsEditing(false);
  }, [currentEditText, step.id, step.latexContent, onContentChange]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setCurrentEditText(step.latexContent);
    setIsSplitting(false); 
  }, [step.latexContent]);

  const handleEditTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentEditText(event.target.value);
  };

  const handleDelete = useCallback(() => {
    onDelete(step.id);
  }, [step.id, onDelete]);

  const handleAnalyze = useCallback(() => {
    onAnalyze(step.id);
  }, [step.id, onAnalyze]);

  const handleEnterSplitMode = useCallback(() => {
    setIsSplitting(true);
    setSplitPart1Text(currentEditText); 
    setSplitPart2Text('');
  }, [currentEditText]);

  const handleCancelSplit = useCallback(() => {
    setIsSplitting(false);
  }, []);

  const handleConfirmSplit = useCallback(() => {
    const part1Trimmed = splitPart1Text.trim();
    const part2Trimmed = splitPart2Text.trim();

    if (part1Trimmed === '' || part2Trimmed === '') {
      alert('拆分后的两个部分均不能为空内容！'); 
      return;
    }
    onSplit(step.id, part1Trimmed, part2Trimmed);
    setIsSplitting(false);
    setIsEditing(false); 
  }, [splitPart1Text, splitPart2Text, step.id, onSplit]);

  const handleSplitPart1TextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSplitPart1Text(event.target.value);
  };
    
  const handleSplitPart2TextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSplitPart2Text(event.target.value);
  };

  const getVerificationIcon = () => {
    let iconElement: JSX.Element | null = null;
    let titleText = '';
    switch (step.verificationStatus) {
      case VerificationStatus.VerifiedCorrect:
        iconElement = <CheckCircle2 className={`${styles.icon} ${styles.correct}`} size={18} />;
        titleText = "已验证正确";
        break;
      case VerificationStatus.VerifiedIncorrect:
        iconElement = <XCircle className={`${styles.icon} ${styles.incorrect}`} size={18} />;
        titleText = "已验证错误";
        break;
      case VerificationStatus.Verifying:
        iconElement = <RefreshCw className={`${styles.icon} ${styles.verifying} ${styles.spin}`} size={18} />;
        titleText = "验证中...";
        break;
      case VerificationStatus.NotVerified:
      default:
        return null; 
    }
    return <span title={titleText}>{iconElement}</span>;
  };
  
  const canSaveRegularEdit = currentEditText.trim() !== step.latexContent.trim() && currentEditText.trim() !== '';
  const canConfirmSplit = splitPart1Text.trim() !== '' && splitPart2Text.trim() !== '';

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
            isSplitting ? (
              <div className={styles.splitEditorContainer}>
                <textarea
                  value={splitPart1Text}
                  onChange={handleSplitPart1TextChange}
                  className={`${styles.latexEditor} ${styles.splitTextarea}`}
                  rows={2}
                  aria-label="拆分内容第一部分"
                  placeholder="第一部分内容"
                />
                <textarea
                  value={splitPart2Text}
                  onChange={handleSplitPart2TextChange}
                  className={`${styles.latexEditor} ${styles.splitTextarea}`}
                  rows={2}
                  aria-label="拆分内容第二部分"
                  placeholder="第二部分内容"
                />
              </div>
            ) : (
              <textarea
                value={currentEditText}
                onChange={handleEditTextChange}
                className={styles.latexEditor}
                rows={3}
                aria-label="编辑步骤内容"
              />
            )
          ) : (
            <Latex>{`$$${step.latexContent.replace(/^(\$\$)+|(\$?\$)+$/g, '')}$$`}</Latex>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        {isEditing ? (
          isSplitting ? (
            <>
              <button onClick={handleConfirmSplit} className={styles.iconButton} title="确认拆分" disabled={!canConfirmSplit} aria-label="确认拆分">
                <Check size={18} />
              </button>
              <button onClick={handleCancelSplit} className={styles.iconButton} title="取消拆分" aria-label="取消拆分">
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSaveEdit} className={styles.iconButton} title="保存更改" disabled={!canSaveRegularEdit} aria-label="保存更改">
                <Save size={18} />
              </button>
              <button onClick={handleCancelEdit} className={styles.iconButton} title="放弃更改" aria-label="放弃更改">
                <Undo2 size={18} />
              </button>
              <button onClick={handleEnterSplitMode} className={styles.iconButton} title="拆分此步骤" aria-label="拆分此步骤">
                <Scissors size={18} />
              </button>
            </>
          )
        ) : (
          <button onClick={handleEnterEditMode} className={styles.iconButton} title="编辑此步骤" aria-label="编辑此步骤">
            <Pencil size={18} />
          </button>
        )}
        {/* Delete and Analyze buttons are available in all modes except deep split editing */}
        {!(isEditing && isSplitting) && (
             <>
                <button onClick={handleDelete} className={styles.iconButton} title="删除此步骤" aria-label="删除此步骤">
                    <Trash2 size={18} />
                </button>
                <button onClick={handleAnalyze} className={styles.iconButton} title="AI解析此步骤" aria-label="AI解析此步骤">
                    <SearchCode size={18} />
                </button>
             </>
        )}
      </div>
    </div>
  );
};

export default SolutionStep; 