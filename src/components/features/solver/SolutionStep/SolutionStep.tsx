import React, { useState, useEffect, useCallback } from 'react';
import { SolutionStepData, VerificationStatus, ForwardDerivationStatus } from '../../../../types';
import Latex from 'react-latex-next';
import styles from './SolutionStep.module.css';
import { 
  Pencil, Save, Undo2, Trash2, /* SearchCode, */ Scissors, 
  CheckCircle2, XCircle, RefreshCw, Check, X, // Check for confirm split, X for cancel split
  ArrowRightCircle, ArrowLeftCircle, Wand2 // <<< ADDED: Wand2 for AI Analysis
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
  onInitiateAiAnalysisWithChecks: (stepId: string, currentForwardStatus?: ForwardDerivationStatus, currentBackwardStatus?: ForwardDerivationStatus) => void;
  onSplit: (originalStepId: string, part1Content: string, part2Content: string) => void;
  onCheckForwardDerivation?: (stepId: string) => void;
  onCheckBackwardDerivation?: (stepId: string) => void;
}

const SolutionStep: React.FC<SolutionStepProps> = ({ step, onContentChange, onDelete, onInitiateAiAnalysisWithChecks, onSplit, onCheckForwardDerivation, onCheckBackwardDerivation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditText, setCurrentEditText] = useState(step.latexContent);

  const [isSplitting, setIsSplitting] = useState(false);
  const [splitPart1Text, setSplitPart1Text] = useState('');
  const [splitPart2Text, setSplitPart2Text] = useState('');

  // --- States for AI Analysis ---
  const [aiAnalysisContent, setAiAnalysisContent] = useState<string | null>(null);
  const [isAiAnalysisLoading, setIsAiAnalysisLoading] = useState<boolean>(false);
  const [isAiOutputVisible, setIsAiOutputVisible] = useState<boolean>(false);
  // --- End States for AI Analysis ---

  // Log when the component receives step prop updates
  useEffect(() => {
    // console.log(`[SolutionStep ${step.id}] received step.forwardDerivationStatus: ${step.forwardDerivationStatus}`);
  }, [step.forwardDerivationStatus, step.id]);

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

  const handleAiAnalysisClick = useCallback(() => {
    // AI Analysis button itself no longer directly shows loading or content.
    // It delegates to MainLayout, which will handle the sequence of checks and then the actual AI call.
    // The UI for loading/content of AI analysis will still be managed by SolutionStep based on props from MainLayout if needed,
    // or MainLayout could manage a global AI analysis display.
    // For now, SolutionStep retains its local AI display state, assuming onInitiateAiAnalysisWithChecks will trigger MainLayout
    // which then might update props that cause SolutionStep to show loading/results.

    // Call the new handler in MainLayout, passing current derivation statuses
    onInitiateAiAnalysisWithChecks(step.id, step.forwardDerivationStatus, step.backwardDerivationStatus);
    
    // We can optimistically show the AI output area and a loading state here, 
    // assuming the MainLayout will proceed with the AI call.
    // However, the actual API call and content setting should be driven by MainLayout.
    // For this iteration, to keep SolutionStep simpler, we'll let MainLayout manage the AI call fully.
    // The local AI display state in SolutionStep might become redundant or repurposed later.
    // For now, let's just ensure the AI panel opens and shows a generic loading message
    // if it's not already visible.
    if (!isAiOutputVisible) {
        setIsAiOutputVisible(true); // Show the panel
        setIsAiAnalysisLoading(true); // Assume loading will start
        setAiAnalysisContent(null); // Clear previous content
    }

  }, [step.id, step.forwardDerivationStatus, step.backwardDerivationStatus, onInitiateAiAnalysisWithChecks, isAiOutputVisible]);

  const handleCheckForwardDerivationClick = useCallback(() => {
    if (step.forwardDerivationStatus === ForwardDerivationStatus.Pending) {
      return;
    }
    if (onCheckForwardDerivation) {
      onCheckForwardDerivation(step.id);
    }
  }, [step.id, step.forwardDerivationStatus, onCheckForwardDerivation]);

  const handleCheckBackwardDerivationClick = useCallback(() => {
    if (step.backwardDerivationStatus === ForwardDerivationStatus.Pending) {
      return;
    }
    if (onCheckBackwardDerivation) {
      onCheckBackwardDerivation(step.id);
    }
  }, [step.id, step.backwardDerivationStatus, onCheckBackwardDerivation]);

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

  const getStepVerificationClassName = () => {
    switch (step.verificationStatus) {
      case VerificationStatus.VerifiedCorrect:
        return styles.verifiedCorrectStep;
      case VerificationStatus.VerifiedIncorrect:
        return styles.verifiedIncorrectStep;
      case VerificationStatus.Error:
        return styles.errorStep;
      case VerificationStatus.Verifying:
        return styles.verifyingStep;
      case VerificationStatus.NotVerified:
      default:
        return styles.notVerifiedStep;
    }
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
        // For NotVerified, we won't show an icon in the header next to the content,
        // but the overall step style will reflect this state.
        return null; 
    }
    return <span title={titleText}>{iconElement}</span>;
  };
  
  const canSaveRegularEdit = currentEditText.trim() !== step.latexContent.trim() && currentEditText.trim() !== '';
  const canConfirmSplit = splitPart1Text.trim() !== '' && splitPart2Text.trim() !== '';

  const getForwardDerivationButtonClassName = () => {
    let className = styles.iconButton; // Base class
    if (step.forwardDerivationStatus === ForwardDerivationStatus.Correct) {
      className += ` ${styles.forwardCorrect}`;
    } else if (step.forwardDerivationStatus === ForwardDerivationStatus.Incorrect) {
      className += ` ${styles.forwardIncorrect}`;
    } else if (step.forwardDerivationStatus === ForwardDerivationStatus.Pending) {
      className += ` ${styles.forwardPending}`;
    }
    // console.log(`[SolutionStep ${step.id}] getForwardDerivationButtonClassName generated: ${className}`); // Log generated class name
    return className;
  };

  const isForwardDerivationDisabled = 
    step.forwardDerivationStatus === ForwardDerivationStatus.Correct ||
    step.forwardDerivationStatus === ForwardDerivationStatus.Incorrect ||
    step.forwardDerivationStatus === ForwardDerivationStatus.Pending;

  const getBackwardDerivationButtonClassName = () => {
    let className = styles.iconButton; // Base class
    if (step.backwardDerivationStatus === ForwardDerivationStatus.Correct) {
      className += ` ${styles.forwardCorrect}`;
    } else if (step.backwardDerivationStatus === ForwardDerivationStatus.Incorrect) {
      className += ` ${styles.forwardIncorrect}`;
    } else if (step.backwardDerivationStatus === ForwardDerivationStatus.Pending) {
      className += ` ${styles.forwardPending}`;
    }
    return className;
  };

  const isBackwardDerivationDisabled = 
    step.backwardDerivationStatus === ForwardDerivationStatus.Correct ||
    step.backwardDerivationStatus === ForwardDerivationStatus.Incorrect ||
    step.backwardDerivationStatus === ForwardDerivationStatus.Pending;

  // <<< ADDED: Tooltip function for forward derivation >>>
  const getForwardDerivationTooltip = () => {
    switch (step.forwardDerivationStatus) {
      case ForwardDerivationStatus.Pending:
        return "正在检查正向推导...";
      case ForwardDerivationStatus.Correct:
        return "正向推导已验证正确";
      case ForwardDerivationStatus.Incorrect:
        return "正向推导已验证错误";
      case ForwardDerivationStatus.Undetermined:
      default:
        return "正向推导正确性（检查能否从头推导至此）";
    }
  };

  // <<< ADDED: Tooltip function for backward derivation >>>
  const getBackwardDerivationTooltip = () => {
    switch (step.backwardDerivationStatus) {
      case ForwardDerivationStatus.Pending:
        return "正在检查反向推导...";
      case ForwardDerivationStatus.Correct:
        return "反向推导已验证正确";
      case ForwardDerivationStatus.Incorrect:
        return "反向推导已验证错误";
      case ForwardDerivationStatus.Undetermined:
      default:
        return "反向推导正确性（检查能否从此步骤反向推导至最终目标或已知结论）";
    }
  };

  return (
    <div className={`${styles.solutionStep} ${getStepVerificationClassName()}`}>
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
            <Latex
              delimiters={[
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true }
              ]}
              strict={false}
            >
              {step.latexContent}
            </Latex>
          )}
        </div>
        {/* --- AI Analysis Output Area --- */}
        {isAiOutputVisible && (
          <div className={styles.aiAnalysisOutputArea}>
            {isAiAnalysisLoading ? (
              <div className={styles.aiLoadingIndicator}>
                <RefreshCw className={`${styles.icon} ${styles.spin}`} size={18} />
                <span>AI 分析中...</span>
              </div>
            ) : (
              aiAnalysisContent && (
                <div className={styles.aiAnalysisContent}>
                  <Latex delimiters={[
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\(", right: "\)", display: false },
                    { left: "\[", right: "\]", display: true }
                  ]}>
                    {aiAnalysisContent}
                  </Latex>
                </div>
              )
            )}
          </div>
        )}
        {/* --- End AI Analysis Output Area --- */}
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
                {/* AI Analysis Button */}
                <button 
                  onClick={handleAiAnalysisClick} 
                  className={`${styles.iconButton} ${isAiAnalysisLoading ? styles.disabledButton : ''}`}
                  title="AI 解析此步骤" 
                  aria-label="AI 解析此步骤"
                  disabled={isAiAnalysisLoading}
                >
                  <Wand2 size={18} />
                </button>
                <button 
                  onClick={handleCheckForwardDerivationClick} 
                  className={getForwardDerivationButtonClassName()}
                  title={getForwardDerivationTooltip()}
                  aria-label="正向推导正确性检查" 
                  disabled={isForwardDerivationDisabled}
                >
                  <ArrowRightCircle size={18} />
                </button>
                <button 
                  onClick={handleCheckBackwardDerivationClick} 
                  className={getBackwardDerivationButtonClassName()}
                  title={getBackwardDerivationTooltip()}
                  aria-label="反向推导正确性检查" 
                  disabled={isBackwardDerivationDisabled}
                >
                  <ArrowLeftCircle size={18} />
                </button>
             </>
        )}
      </div>
    </div>
  );
};

export default SolutionStep; 