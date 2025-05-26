import React, { useState, useEffect } from 'react';
import { CopilotMode } from '../../ai/AICopilotPanel/AICopilotPanel';
import { SolutionStepData } from '../../../../types';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { Eye, EyeOff, Copy, Download, FileText, BarChart3, Lightbulb } from 'lucide-react';
import LaTeXFormatPanel from '../LaTeXFormatPanel/LaTeXFormatPanel';
import styles from './RightPanelContent.module.css';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface RightPanelContentProps {
  currentMode: CopilotMode;
  solutionSteps?: SolutionStepData[];
  problemContent?: string;
  className?: string;
}

const RightPanelContent: React.FC<RightPanelContentProps> = ({
  currentMode,
  solutionSteps = [],
  problemContent = '',
  className,
}) => {
  const [latexInput, setLatexInput] = useState('');
  const [showLatexPreview, setShowLatexPreview] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 为每种模式创建独立的聊天状态
  const [chatStates, setChatStates] = useState<Record<CopilotMode, ChatMessage[]>>({
    analysis: [],
    latex: [],
    summary: [],
  });
  
  // 获取当前模式的聊天记录
  const currentModeMessages = chatStates[currentMode] || [];
  
  // 当模式切换时，清除不相关的状态
  useEffect(() => {
    if (currentMode !== 'analysis') {
      setAnalysisResult(null);
      setIsAnalyzing(false);
    }
    if (currentMode !== 'latex') {
      // LaTeX输入在模式切换时保持，因为用户可能需要在不同模式间操作
    }
  }, [currentMode]);

  const addMessageToCurrentMode = (text: string, sender: 'user' | 'ai') => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      sender,
      timestamp: new Date(),
    };
    
    setChatStates(prev => ({
      ...prev,
      [currentMode]: [...(prev[currentMode] || []), newMessage],
    }));
  };

  const handleLatexInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLatexInput(e.target.value);
  };

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexInput);
      // 这里可以添加提示信息
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleExportLatex = () => {
    const blob = new Blob([latexInput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solution.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    
    // 向分析模式添加用户消息
    addMessageToCurrentMode('开始AI分析当前解题过程', 'user');
    
    // 模拟AI分析过程
    setTimeout(() => {
      const analysisText = `
### 解题分析报告

**问题概览：**
${problemContent ? problemContent.substring(0, 100) : '当前解题问题'}...

**解题步骤分析：**
${solutionSteps.map((step, index) => `
${index + 1}. **步骤 ${step.stepNumber}：** 
   - 状态：${step.verificationStatus === 'VerifiedCorrect' ? '✅ 正确' : step.verificationStatus === 'VerifiedIncorrect' ? '❌ 错误' : '⏳ 待验证'}
   - 内容：${step.latexContent.substring(0, 80)}...
   ${step.notes ? `- 备注：${step.notes}` : ''}
`).join('')}

**关键洞察：**
- 解题路径清晰，逻辑连贯
- 各步骤之间的因果关系明确
- 建议在关键步骤增加验证

**优化建议：**
- 可以添加更多中间步骤，增强可理解性
- 某些复杂推导可以分解为更小的子步骤
- 建议添加图形化说明来辅助理解
      `;
      
      setAnalysisResult(analysisText);
      addMessageToCurrentMode(analysisText, 'ai');
      setIsAnalyzing(false);
    }, 2000);
  };

  const generateSummary = () => {
    const totalSteps = solutionSteps.length;
    const verifiedSteps = solutionSteps.filter(step => 
      step.verificationStatus === 'VerifiedCorrect'
    ).length;
    const incorrectSteps = solutionSteps.filter(step => 
      step.verificationStatus === 'VerifiedIncorrect'
    ).length;

    return {
      totalSteps,
      verifiedSteps,
      incorrectSteps,
      completionRate: totalSteps > 0 ? (verifiedSteps / totalSteps * 100).toFixed(1) : '0',
      stepsWithNotes: solutionSteps.filter(step => step.notes).length,
      stepsWithInterpretation: solutionSteps.filter(step => step.interpretationIdea).length,
    };
  };

  const renderChatHistory = () => {
    if (currentModeMessages.length === 0) {
      return (
        <div className={styles.emptyChatState}>
          <p>暂无对话记录</p>
          <p>开始与AI交互来获得帮助</p>
        </div>
      );
    }

    return (
      <div className={styles.chatHistory}>
        {currentModeMessages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.chatMessage} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}
          >
            <div className={styles.messageContent}>
              {message.sender === 'ai' ? (
                <Latex>{message.text}</Latex>
              ) : (
                <span>{message.text}</span>
              )}
            </div>
            <div className={styles.messageTime}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalysisMode = () => (
    <div className={styles.analysisMode}>
      <div className={styles.modeHeader}>
        <BarChart3 size={24} />
        <h3>解析分析</h3>
      </div>
      
      <div className={styles.analysisActions}>
        <button
          onClick={handleStartAnalysis}
          disabled={isAnalyzing}
          className={styles.analyzeButton}
        >
          {isAnalyzing ? (
            <>
              <div className={styles.spinner} />
              分析中...
            </>
          ) : (
            <>
              <Lightbulb size={16} />
              开始AI分析
            </>
          )}
        </button>
      </div>

      <div className={styles.chatContainer}>
        {renderChatHistory()}
      </div>

      {!analysisResult && !isAnalyzing && currentModeMessages.length === 0 && (
        <div className={styles.placeholder}>
          <p>点击"开始AI分析"按钮，获取当前解题过程的深度分析报告。</p>
          <p>分析将包括：</p>
          <ul>
            <li>解题步骤完整性检查</li>
            <li>逻辑关系分析</li>
            <li>错误识别和建议</li>
            <li>优化方向建议</li>
          </ul>
        </div>
      )}
    </div>
  );

  const renderLatexMode = () => {
    // 准备节点数据供LaTeX面板使用
    const contextNodes = solutionSteps.map(step => ({
      id: step.id,
      label: `步骤 ${step.stepNumber}`,
      content: step.latexContent,
    }));

    return (
      <LaTeXFormatPanel
        initialLatexContent={latexInput}
        onContentChange={setLatexInput}
        contextNodes={contextNodes}
      />
    );
  };

  const renderSummaryMode = () => {
    const summary = generateSummary();
    
    return (
      <div className={styles.summaryMode}>
        <div className={styles.modeHeader}>
          <BarChart3 size={24} />
          <h3>总结归纳</h3>
        </div>

        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{summary.totalSteps}</div>
            <div className={styles.statLabel}>总步骤数</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{summary.verifiedSteps}</div>
            <div className={styles.statLabel}>已验证正确</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{summary.completionRate}%</div>
            <div className={styles.statLabel}>完成率</div>
          </div>
        </div>

        <div className={styles.summarySection}>
          <h4>解题进展概况</h4>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
          <p>已完成 {summary.verifiedSteps} / {summary.totalSteps} 个步骤</p>
        </div>

        <div className={styles.summarySection}>
          <h4>详细统计</h4>
          <ul className={styles.summaryList}>
            <li>✅ 验证正确的步骤：{summary.verifiedSteps} 个</li>
            <li>❌ 需要修正的步骤：{summary.incorrectSteps} 个</li>
            <li>📝 包含备注的步骤：{summary.stepsWithNotes} 个</li>
            <li>💡 有思路解读的步骤：{summary.stepsWithInterpretation} 个</li>
          </ul>
        </div>

        <div className={styles.summarySection}>
          <h4>下一步建议</h4>
          <div className={styles.suggestions}>
            {summary.incorrectSteps > 0 && (
              <div className={styles.suggestion}>
                <span className={styles.suggestionIcon}>⚠️</span>
                <span>优先修正 {summary.incorrectSteps} 个错误步骤</span>
              </div>
            )}
            {summary.totalSteps - summary.verifiedSteps - summary.incorrectSteps > 0 && (
              <div className={styles.suggestion}>
                <span className={styles.suggestionIcon}>🔍</span>
                <span>验证剩余 {summary.totalSteps - summary.verifiedSteps - summary.incorrectSteps} 个待检查步骤</span>
              </div>
            )}
            {summary.stepsWithNotes < summary.totalSteps * 0.5 && (
              <div className={styles.suggestion}>
                <span className={styles.suggestionIcon}>📝</span>
                <span>建议为更多步骤添加备注说明</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.chatContainer}>
          {renderChatHistory()}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentMode) {
      case 'analysis':
        return renderAnalysisMode();
      case 'latex':
        return renderLatexMode();
      case 'summary':
        return renderSummaryMode();
      default:
        return <div className={styles.placeholder}>请选择一个模式</div>;
    }
  };

  return (
    <div className={`${styles.rightPanelContent} ${className || ''}`}>
      {renderContent()}
    </div>
  );
};

export default RightPanelContent; 