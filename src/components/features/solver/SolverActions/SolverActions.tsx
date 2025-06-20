import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Book, ArrowUp, ArrowDown, Send } from 'lucide-react';
import styles from './SolverActions.module.css';
import { toast } from 'react-hot-toast';
import { SolutionStepData } from '../../../../types';

// 思考方向类型
type ThinkingDirection = 'forward' | 'backward';

interface SolverActionsProps {
  onAddStep: (latexContent: string, thinkingDirection: 'forward' | 'backward') => void;
  problemLatex: string;
  onAnalysisComplete?: (result: any) => void;
  onSummarize?: (summary: string) => void;
  getCurrentPageSolutionSteps: () => SolutionStepData[];
  onFindSimilar?: (problems: any[]) => void;
  // Future props for other actions:
  // onGetHint: () => void;
  // onAnalyzeAllSteps: () => void;
}

const SolverActions: React.FC<SolverActionsProps> = ({ onAddStep, problemLatex, onAnalysisComplete, onSummarize, getCurrentPageSolutionSteps, onFindSimilar }) => {
  const [nextStepLatex, setNextStepLatex] = useState('');
  const [thinkingDirection, setThinkingDirection] = useState<ThinkingDirection>('backward');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);

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

  const handleAnalyzeAllSteps = async () => {
    if (!problemLatex) {
      toast.error('请先输入问题内容');
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.loading('正在分析解题步骤...', { id: 'analyze' });

      // 添加日志输出
      console.log('发送到后端的请求内容:', {
        raw_text: problemLatex
      });

      const response = await fetch('http://localhost:8000/chat/solve_complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: problemLatex
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Analysis result:', data);
      
      // 调用回调函数处理结果
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
        toast.success('分析完成', { id: 'analyze' });
      }
    } catch (error) {
      console.error('Error analyzing steps:', error);
      toast.error('分析步骤时出错，请重试', { id: 'analyze' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummarize = async () => {
    if (!problemLatex) {
      toast.error('请先输入题目内容');
      return;
    }

    try {
      setIsSummarizing(true);
      // 获取所有步骤的历史记录
      const currentSolutionSteps = getCurrentPageSolutionSteps();
      const allSteps = currentSolutionSteps
        .map((step: SolutionStepData) => `${step.notes || ''}: ${step.latexContent}`)
        .join('\n');

      toast.loading('正在生成总结...', { id: 'summarize' });

      const response = await fetch('http://localhost:8000/chat/summarize_history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawLatex: problemLatex,
          all_steps: allSteps,
          maxLen: 200
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Summary result:', data);
      
      if (data.payload?.summary) {
        // 调用回调函数，传递总结内容
        onSummarize?.(data.payload.summary);
        toast.success('总结生成成功！', { id: 'summarize' });
      } else {
        throw new Error('总结生成失败：返回数据格式不正确');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('生成总结时出错，请重试', { id: 'summarize' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleFindSimilar = async () => {
    if (!problemLatex) {
      toast.error('请先输入题目内容');
      return;
    }

    try {
      setIsFindingSimilar(true);
      toast.loading('正在查找类似题目...', { id: 'findSimilar' });

      const response = await fetch('http://localhost:8080/api/v1/match_problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_stem: problemLatex,
          top_k: 3
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Similar problems result:', data);
      
      if (data.matched_problems) {
        onFindSimilar?.(data.matched_problems);
        toast.success('已找到类似题目！', { id: 'findSimilar' });
      } else {
        throw new Error('查找类似题目失败：返回数据格式不正确');
      }
    } catch (error) {
      console.error('Error finding similar problems:', error);
      toast.error('查找类似题目时出错，请重试', { id: 'findSimilar' });
    } finally {
      setIsFindingSimilar(false);
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
          className={`${styles.actionButton} ${styles.bookButton} ${isFindingSimilar ? styles.loading : ''}`}
          title="查找类似题目"
          onClick={handleFindSimilar}
          disabled={isFindingSimilar || !problemLatex}
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
            className={`${styles.actionButton} ${isAnalyzing ? styles.loading : ''}`}
            title={!problemLatex ? "请先输入问题内容" : "分析所有步骤"}
            onClick={handleAnalyzeAllSteps}
            disabled={isAnalyzing || !problemLatex}
          >
            {isAnalyzing ? '⏳' : '🔬'}
          </button>
          <button 
            className={`${styles.actionButton} ${isSummarizing ? styles.loading : ''}`}
            title="总结解题过程"
            onClick={handleSummarize}
            disabled={isSummarizing || !problemLatex}
          >
            {isSummarizing ? '⏳' : '📝'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolverActions; 