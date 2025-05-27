import React, { useState, useCallback } from 'react';
import Latex from 'react-latex-next';
import styles from './EnhancedProblemBlock.module.css';

interface EnhancedProblemBlockProps {
  title: string;
  latexContent: string;
  onContentChange: (newContent: string) => void;
  onSave?: (newContent: string) => void;
  className?: string;
}

const EnhancedProblemBlock: React.FC<EnhancedProblemBlockProps> = ({
  title,
  latexContent,
  onContentChange,
  onSave,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(latexContent);
  const [showPreview, setShowPreview] = useState(false);

  // 处理编辑模式切换
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // 退出编辑模式，恢复原内容
      setEditContent(latexContent);
      setIsEditing(false);
      setShowPreview(false);
    } else {
      // 进入编辑模式
      setEditContent(latexContent);
      setIsEditing(true);
      setShowPreview(false);
    }
  }, [isEditing, latexContent]);

  // 处理保存
  const handleSave = useCallback(() => {
    onContentChange(editContent);
    onSave?.(editContent);
    setIsEditing(false);
    setShowPreview(false);
  }, [editContent, onContentChange, onSave]);

  // 处理复制
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      // 可以添加toast提示
      console.log('内容已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [latexContent]);

  // 处理预览切换
  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // 处理文本区域变化
  const handleTextareaChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(event.target.value);
  }, []);

  return (
    <div className={`${styles.problemBlock} ${className}`}>
      {/* 头部工具栏 */}
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
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
            <Latex>{latexContent}</Latex>
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
                  rows={6}
                />
                <div className={styles.editHint}>
                  💡 支持LaTeX语法，如：$x^2 + y^2 = r^2$ 或 $$\int_0^1 f(x)dx$$
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedProblemBlock; 