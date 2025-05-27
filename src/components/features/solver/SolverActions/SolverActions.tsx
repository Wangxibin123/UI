import React, { useState, useEffect } from 'react';
import { ChevronDown, Book, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './SolverActions.module.css';

// 思考方向类型
type ThinkingDirection = 'forward' | 'backward';

interface SolverActionsProps {
  onAddStep: (latexContent: string, direction: ThinkingDirection) => void;
  // Future props for other actions:
  // onFindSimilar: () => void;
  // onGetHint: () => void;
  // onAnalyzeAllSteps: () => void;
  // onSummarize: () => void;
}

const SolverActions: React.FC<SolverActionsProps> = ({ onAddStep }) => {
  const [nextStepLatex, setNextStepLatex] = useState('');
  const [thinkingDirection, setThinkingDirection] = useState<ThinkingDirection>('backward');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleAddStepClick = () => {
    if (nextStepLatex.trim()) {
      onAddStep(nextStepLatex.trim(), thinkingDirection);
      setNextStepLatex(''); // Clear input after adding
      
      // 提供用户反馈
      const directionText = thinkingDirection === 'forward' ? '向前思考' : '向后思考';
      console.log(`✅ 已添加${directionText}步骤: ${nextStepLatex.trim()}`);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddStepClick();
    } else if (event.key === 'Escape') {
      setNextStepLatex('');
      setIsDropdownOpen(false);
    }
  };

  const handleDirectionSelect = (direction: ThinkingDirection) => {
    setThinkingDirection(direction);
    setIsDropdownOpen(false);
    
    // 键盘焦点返回到输入框
    const inputElement = document.querySelector(`.${styles.stepInput}`) as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  // 监听全局键盘事件
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + F: 切换到向前思考
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        setThinkingDirection('forward');
        console.log('🔄 快捷键切换到向前思考');
      }
      // Ctrl/Cmd + Shift + B: 切换到向后思考  
      else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'B') {
        event.preventDefault();
        setThinkingDirection('backward');
        console.log('🔄 快捷键切换到向后思考');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.thinkingSelector}`)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const getCurrentDirectionConfig = () => {
    switch (thinkingDirection) {
      case 'forward':
        return {
          icon: <ArrowUp size={16} />,
          text: '向前思考',
          description: '在第一个解题块前生成',
          shortcut: '⌘⇧F'
        };
      case 'backward':
        return {
          icon: <ArrowDown size={16} />,
          text: '向后思考', 
          description: '在最后一个解题块后生成',
          shortcut: '⌘⇧B'
        };
    }
  };

  const currentConfig = getCurrentDirectionConfig();

  return (
    <div className={styles.solverActions}>
      {/* 书本按键移到最左侧 */}
      <div className={styles.leftActions}>
        <button 
          className={`${styles.actionButton} ${styles.bookButton}`} 
          title="查找类似题目"
          onClick={() => console.log('📚 查找类似题目功能暂未实现')}
        >
          <Book size={16} />
        </button>
      </div>

      {/* 输入区域 */}
      <div className={styles.inputArea}>
        <input
          type="text"
          value={nextStepLatex}
          onChange={(e) => setNextStepLatex(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="输入下一步解答 (支持 LaTeX)..."
          className={styles.stepInput}
          autoComplete="off"
        />
        {nextStepLatex.trim() && (
          <div className={styles.inputHint}>
            按 Enter 提交，Esc 清空
          </div>
        )}
      </div>

      {/* 右侧提交区域 - 前向/向后思考选择 */}
      <div className={styles.rightActions}>
        <div className={styles.thinkingSelector}>
          <button
            className={`${styles.thinkingButton} ${isDropdownOpen ? styles.open : ''}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title={`${currentConfig.description} (${currentConfig.shortcut})`}
          >
            <div className={styles.thinkingContent}>
              {currentConfig.icon}
              <span className={styles.thinkingText}>{currentConfig.text}</span>
              <ChevronDown 
                size={14} 
                className={`${styles.chevron} ${isDropdownOpen ? styles.chevronUp : ''}`}
              />
            </div>
          </button>
          
          {isDropdownOpen && (
            <div className={styles.thinkingDropdown}>
              <div 
                className={`${styles.dropdownItem} ${thinkingDirection === 'forward' ? styles.active : ''}`}
                onClick={() => handleDirectionSelect('forward')}
              >
                <ArrowUp size={16} />
                <div className={styles.itemContent}>
                  <span className={styles.itemTitle}>向前思考</span>
                  <span className={styles.itemDesc}>在第一个解题块前生成</span>
                </div>
                <span className={styles.itemShortcut}>⌘⇧F</span>
              </div>
              <div 
                className={`${styles.dropdownItem} ${thinkingDirection === 'backward' ? styles.active : ''}`}
                onClick={() => handleDirectionSelect('backward')}
              >
                <ArrowDown size={16} />
                <div className={styles.itemContent}>
                  <span className={styles.itemTitle}>向后思考</span>
                  <span className={styles.itemDesc}>在最后一个解题块后生成</span>
                </div>
                <span className={styles.itemShortcut}>⌘⇧B</span>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleAddStepClick} 
          className={`${styles.actionButton} ${styles.submitButton}`}
          disabled={!nextStepLatex.trim()}
          title={`提交解题步骤 (${currentConfig.text})`}
        >
          <span>✏️</span>提交
        </button>

        {/* 其他功能按键 */}
        <div className={styles.otherActions}>
          <button 
            className={styles.actionButton} 
            title="获取AI提示"
            onClick={() => console.log('💡 AI提示功能暂未实现')}
          >
            💡
          </button>
          <button 
            className={styles.actionButton} 
            title="分析所有步骤"
            onClick={() => console.log('🔬 步骤分析功能暂未实现')}
          >
            🔬
          </button>
          <button 
            className={styles.actionButton} 
            title="总结解题过程"
            onClick={() => console.log('📝 总结功能暂未实现')}
          >
            📝
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolverActions; 