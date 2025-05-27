import React, { useState, useCallback } from 'react';
import Latex from 'react-latex-next';
import { SolutionStepData, VerificationStatus, ForwardDerivationStatus } from '../../../../types';
import styles from './EnhancedSolutionStep.module.css';

interface EnhancedSolutionStepProps {
  step: SolutionStepData;
  onContentChange: (stepId: string, newLatexContent: string) => void;
  onDelete: (stepId: string) => void;
  onSplit?: (originalStepId: string, part1Content: string, part2Content: string) => void;
  onCheckForwardDerivation?: (stepId: string) => void;
  onCheckBackwardDerivation?: (stepId: string) => void;
  onOpenLatexFormat?: (stepId: string, content: string) => void;
  className?: string;
}

const EnhancedSolutionStep: React.FC<EnhancedSolutionStepProps> = ({
  step,
  onContentChange,
  onDelete,
  onSplit,
  onCheckForwardDerivation,
  onCheckBackwardDerivation,
  onOpenLatexFormat,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(step.latexContent);
  const [showPreview, setShowPreview] = useState(false);

  // 处理编辑模式切换
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // 退出编辑模式，恢复原内容
      setEditContent(step.latexContent);
      setIsEditing(false);
      setShowPreview(false);
    } else {
      // 进入编辑模式
      setEditContent(step.latexContent);
      setIsEditing(true);
      setShowPreview(false);
    }
  }, [isEditing, step.latexContent]);

  // 处理保存
  const handleSave = useCallback(() => {
    onContentChange(step.id, editContent);
    setIsEditing(false);
    setShowPreview(false);
  }, [editContent, onContentChange, step.id]);

  // 处理复制
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(step.latexContent);
      console.log('步骤内容已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [step.latexContent]);

  // 处理预览切换
  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // 处理文本区域变化
  const handleTextareaChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(event.target.value);
  }, []);

  // 处理删除
  const handleDelete = useCallback(() => {
    onDelete(step.id);
  }, [onDelete, step.id]);

  // 处理LaTeX格式化
  const handleLatexFormat = useCallback(() => {
    onOpenLatexFormat?.(step.id, step.latexContent);
  }, [onOpenLatexFormat, step.id, step.latexContent]);

  // 获取验证状态样式
  const getVerificationClassName = () => {
    switch (step.verificationStatus) {
      case VerificationStatus.VerifiedCorrect:
        return styles.verified;
      case VerificationStatus.VerifiedIncorrect:
        return styles.incorrect;
      case VerificationStatus.Verifying:
        return styles.verifying;
      default:
        return styles.notVerified;
    }
  };

  // 获取验证图标
  const getVerificationIcon = () => {
    switch (step.verificationStatus) {
      case VerificationStatus.VerifiedCorrect:
        return '✅';
      case VerificationStatus.VerifiedIncorrect:
        return '❌';
      case VerificationStatus.Verifying:
        return '⏳';
      default:
        return '❓';
    }
  };

  // 获取推导状态样式
  const getDerivationStatusClass = (status?: ForwardDerivationStatus) => {
    switch (status) {
      case ForwardDerivationStatus.Correct:
        return styles.derivationCorrect;
      case ForwardDerivationStatus.Incorrect:
        return styles.derivationIncorrect;
      case ForwardDerivationStatus.Pending:
        return styles.derivationPending;
      default:
        return styles.derivationUndetermined;
    }
  };

  return (
    <div className={`${styles.solutionStep} ${getVerificationClassName()} ${className}`}>
      {/* 头部工具栏 */}
      <div className={styles.header}>
        <div className={styles.stepInfo}>
          <span className={styles.stepNumber}>@步骤 {step.stepNumber}</span>
          <span className={styles.verificationIcon} title={`验证状态: ${step.verificationStatus}`}>
            {getVerificationIcon()}
          </span>
        </div>
        
        <div className={styles.toolbar}>
          {!isEditing && (
            <>
              <button
                className={styles.toolButton}
                onClick={handleEditToggle}
                title="编辑"
              >
                ✏️
              </button>
              <button
                className={styles.toolButton}
                onClick={handleCopy}
                title="复制"
              >
                📋
              </button>
              <button
                className={styles.toolButton}
                onClick={handleLatexFormat}
                title="LaTeX格式化"
              >
                📐
              </button>
              <button
                className={`${styles.toolButton} ${styles.deleteButton}`}
                onClick={handleDelete}
                title="删除"
              >
                🗑️
              </button>
            </>
          )}
          
          {isEditing && (
            <>
              <button
                className={styles.toolButton}
                onClick={handlePreviewToggle}
                title={showPreview ? "编辑" : "预览"}
              >
                {showPreview ? "✏️" : "👁️"}
              </button>
              <button
                className={`${styles.toolButton} ${styles.saveButton}`}
                onClick={handleSave}
                title="保存"
              >
                💾
              </button>
              <button
                className={`${styles.toolButton} ${styles.cancelButton}`}
                onClick={handleEditToggle}
                title="取消"
              >
                ❌
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {!isEditing ? (
          // 显示模式：LaTeX渲染
          <div className={styles.latexDisplay}>
            <Latex>{step.latexContent}</Latex>
          </div>
        ) : (
          // 编辑模式
          <div className={styles.editMode}>
            {showPreview ? (
              // 预览模式
              <div className={styles.previewMode}>
                <div className={styles.previewHeader}>
                  <span className={styles.previewLabel}>预览效果</span>
                </div>
                <div className={styles.latexDisplay}>
                  <Latex>{editContent}</Latex>
                </div>
              </div>
            ) : (
              // 编辑文本区域
              <div className={styles.editArea}>
                <textarea
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={handleTextareaChange}
                  placeholder="请输入LaTeX内容..."
                  rows={4}
                />
                <div className={styles.editHint}>
                  💡 支持LaTeX语法，如：$x^2 + y^2 = r^2$ 或 $$\int_0^1 f(x)dx$$
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 推导状态指示器 */}
      <div className={styles.derivationStatus}>
        <div className={styles.derivationIndicators}>
          <button
            className={`${styles.derivationButton} ${getDerivationStatusClass(step.forwardDerivationStatus)}`}
            onClick={() => onCheckForwardDerivation?.(step.id)}
            title={`前向推导: ${step.forwardDerivationStatus || 'Undetermined'}`}
          >
            ⬇️
          </button>
          <button
            className={`${styles.derivationButton} ${getDerivationStatusClass(step.backwardDerivationStatus)}`}
            onClick={() => onCheckBackwardDerivation?.(step.id)}
            title={`后向推导: ${step.backwardDerivationStatus || 'Undetermined'}`}
          >
            ⬆️
          </button>
        </div>
      </div>

      {/* 备注区域 */}
      {step.notes && (
        <div className={styles.notes}>
          <span className={styles.notesLabel}>备注:</span>
          <span className={styles.notesContent}>{step.notes}</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedSolutionStep; 