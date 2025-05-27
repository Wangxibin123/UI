import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  Plus,
  Edit3,
  Download,
  Star,
  MessageSquare,
  Send,
  Copy,
  RefreshCw,
  X
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import styles from './ModernSummaryPanel.module.css';

interface SummaryEntry {
  id: string;
  title: string;
  content: string;
  stepNumbers: number[];
  timestamp: Date;
  type: 'auto' | 'manual';
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

// 🎯 DAG页面信息接口（与ModernAnalysisPanel保持一致）
interface DagPageInfo {
  id: string;
  name: string;
  isActive: boolean;
  highlightColor?: string;
}

// 🎯 解答步骤信息接口（与ModernAnalysisPanel保持一致）
interface StepBlockInfo {
  id: string;
  stepNumber: number;
  content: string;
  title: string;
  verificationStatus?: 'verified' | 'unverified' | 'error';
  forwardDerivationStatus?: 'correct' | 'incorrect' | 'undetermined';
  backwardDerivationStatus?: 'correct' | 'incorrect' | 'undetermined';
  hasInterpretation?: boolean;
  hasNotes?: boolean;
  isHighlighted?: boolean;
  highlightColor?: string;
  isFocused?: boolean;
  isProblem?: boolean; // 新增：标识是否为题目内容
}

interface ModernSummaryPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  contextStepInfo?: {
    id: string;
    content: string;
    stepNumber: number;
  } | null;
  onContentChange?: (content: string) => void;
  // 新增：真实DAG数据支持
  dagPages?: DagPageInfo[];
  stepBlocks?: StepBlockInfo[];
  selectedDagPageId?: string;
  selectedStepId?: string;
  onPageSelect?: (pageId: string) => void;
  onStepSelect?: (stepId: string) => void;
  // 新增：题目信息支持
  problemData?: {
    id: string;
    title: string;
    content: string;
  } | null;
}

const SUMMARY_TEMPLATES = {
  keyPoints: {
    id: 'keyPoints',
    name: '关键要点',
    icon: '🎯',
    description: '提取解题过程中的关键要点',
    color: '#6366f1',
  },
  methodology: {
    id: 'methodology',
    name: '方法总结',
    icon: '🔄',
    description: '总结解题方法和策略',
    color: '#8b5cf6',
  },
  insights: {
    id: 'insights',
    name: '深度洞察',
    icon: '💡',
    description: '发现问题的深层次理解',
    color: '#06b6d4',
  },
  verification: {
    id: 'verification',
    name: '验证总结',
    icon: '✅',
    description: '总结验证过程和结果',
    color: '#10b981',
  },
  comparison: {
    id: 'comparison',
    name: '方法对比',
    icon: '⚖️',
    description: '对比不同解题方法',
    color: '#f59e0b',
  },
  optimization: {
    id: 'optimization',
    name: '优化建议',
    icon: '🚀',
    description: '提供解题优化建议',
    color: '#ef4444',
  }
};

const ModernSummaryPanel: React.FC<ModernSummaryPanelProps> = ({
  isOpen,
  onClose,
  contextStepInfo,
  onContentChange,
  dagPages = [],
  stepBlocks = [],
  selectedDagPageId,
  selectedStepId,
  onPageSelect,
  onStepSelect,
  problemData,
}) => {
  // 节点状态管理 - 🎯 与真实DAG数据同步
  const [isDagPageDropdownOpen, setIsDagPageDropdownOpen] = useState(false);
  
  // 🎯 当前选中的DAG页面和步骤数据
  const selectedDagPage = dagPages.find(page => page.id === selectedDagPageId) || dagPages[0];
  const currentStepBlocks = stepBlocks.filter(block => selectedDagPageId ? true : true); // 根据页面过滤步骤
  
  // 🎯 创建完整的步骤选项列表（包含题目）
  const allStepOptions = [
    {
      id: 'problem-content',
      stepNumber: 0,
      content: problemData?.content || '',
      title: '题目内容',
      isProblem: true
    },
    ...currentStepBlocks
  ];
  
  // 🔧 添加调试信息
  useEffect(() => {
    console.log('总结归纳面板数据更新:', {
      selectedDagPageId,
      selectedStepId,
      currentStepBlocks: currentStepBlocks.length,
      allStepOptions: allStepOptions.length,
      problemData: !!problemData?.content,
      stepBlocks: stepBlocks.length
    });
  }, [selectedDagPageId, selectedStepId, stepBlocks, problemData]);
  
  const maxSteps = allStepOptions.length - 1; // 不包含题目的步骤数量
  
  // 当前选中的步骤（可能是题目或普通步骤）
  const selectedItem = selectedStepId === 'problem-content' 
    ? allStepOptions[0] 
    : currentStepBlocks.find(block => block.id === selectedStepId) || allStepOptions[1]; // 默认选第一个真实步骤
  
  const currentNodeStep = selectedItem ? (selectedItem.isProblem ? 0 : selectedItem.stepNumber) : 1;
  
  // 总结内容管理
  const [summaryEntries, setSummaryEntries] = useState<SummaryEntry[]>([
    {
      id: 'summary-1',
      title: '解题核心要点',
      content: '本题通过因式分解和换元法相结合，有效简化了复杂的代数表达式。关键在于识别表达式的对称性和应用合适的数学技巧。',
      stepNumbers: [1, 2, 3],
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      type: 'auto'
    },
    {
      id: 'summary-2', 
      title: '方法优化建议',
      content: '在第2步可以考虑使用更直接的配方法，这样能够减少计算步骤并降低出错概率。建议在类似问题中优先考虑这种方法。',
      stepNumbers: [2, 4],
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      type: 'manual'
    }
  ]);

  // 模板和对话状态
  const [selectedTemplate, setSelectedTemplate] = useState('keyPoints');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // UI状态
  const [activeTab, setActiveTab] = useState<'summaries' | 'templates' | 'chat'>('summaries');
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);

  // 引用
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🎯 Hooks必须在所有条件语句和早期返回之前调用
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const template = SUMMARY_TEMPLATES[selectedTemplate as keyof typeof SUMMARY_TEMPLATES];
      const systemPrompt = `你是一个专业的数学总结助手，当前模式：${template.name}。请根据用户的需求生成总结内容。`;
      
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: '正在生成总结内容...',
        sender: 'assistant',
        timestamp: new Date(),
        isStreaming: true,
      };

      setChatMessages(prev => [...prev, aiResponse]);

      // 模拟流式响应
      setTimeout(() => {
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === aiResponse.id 
              ? { ...msg, content: '基于您的解题过程，我为您生成了以下总结：这是一道典型的代数化简问题，主要考查因式分解和代数恒等式的应用。解题关键在于识别表达式结构，选择合适的变换方法。', isStreaming: false }
              : msg
          )
        );
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      console.error('发送消息失败:', error);
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, selectedTemplate]);

  // 根据contextStepInfo初始化内容
  useEffect(() => {
    if (contextStepInfo && contextStepInfo.content && onStepSelect) {
      // 找到对应步骤编号的步骤块
      const targetStepBlock = currentStepBlocks.find(block => block.stepNumber === contextStepInfo.stepNumber);
      if (targetStepBlock) {
        onStepSelect(targetStepBlock.id);
      }
    }
  }, [contextStepInfo, currentStepBlocks, onStepSelect]);

  // 🎯 早期返回必须在所有Hooks之后
  if (!isOpen) return null;

  const handleNodeNavigation = (direction: 'prev' | 'next') => {
    const currentIndex = allStepOptions.findIndex(option => 
      selectedStepId === 'problem-content' ? option.id === 'problem-content' : option.id === selectedStepId
    );
    
    // 🔧 添加调试日志
    console.log('导航操作:', {
      direction,
      currentIndex,
      selectedStepId,
      allStepOptionsLength: allStepOptions.length,
      allStepOptions: allStepOptions.map(opt => ({ id: opt.id, stepNumber: opt.stepNumber }))
    });
    
    let targetIndex: number;
    if (direction === 'prev' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < allStepOptions.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      console.log('导航无效:', { direction, currentIndex, max: allStepOptions.length - 1 });
      return; // 没有有效的导航动作
    }
    
    const targetOption = allStepOptions[targetIndex];
    console.log('导航到:', { targetIndex, targetOption });
    
    if (targetOption && onStepSelect) {
      onStepSelect(targetOption.id);
    }
  };

  const handleSliderChange = (value: number) => {
    // 🔧 添加调试日志和边界检查
    console.log('滑栏变化:', {
      value,
      allStepOptionsLength: allStepOptions.length,
      allStepOptions: allStepOptions.map(opt => ({ id: opt.id, stepNumber: opt.stepNumber }))
    });
    
    // 边界检查
    if (value < 0 || value >= allStepOptions.length) {
      console.warn('滑栏值超出范围:', value);
      return;
    }
    
    // 根据滑块值找到对应的选项（包括题目）
    const targetOption = allStepOptions[value];
    console.log('滑栏选择:', { value, targetOption });
    
    if (targetOption && onStepSelect) {
      onStepSelect(targetOption.id);
    } else {
      console.warn('滑栏选择失败:', { value, targetOption, hasOnStepSelect: !!onStepSelect });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleCreateSummary = (templateId: string) => {
    const template = SUMMARY_TEMPLATES[templateId as keyof typeof SUMMARY_TEMPLATES];
    const newSummary: SummaryEntry = {
      id: `summary-${Date.now()}`,
      title: `${template.name} - 步骤 ${currentNodeStep}`,
      content: `基于${template.description}生成的总结内容...`,
      stepNumbers: [currentNodeStep],
      timestamp: new Date(),
      type: 'manual'
    };
    
    setSummaryEntries(prev => [newSummary, ...prev]);
    setSelectedSummary(newSummary.id);
    setActiveTab('summaries');
  };

  const handleCopySummary = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加 toast 提示
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleReplaceStep = (content: string) => {
    if (selectedItem && !selectedItem.isProblem && onContentChange) {
      // 替换当前选中步骤的内容（不能替换题目）
      onContentChange(content);
      console.log('一键替换步骤内容:', selectedItem.id, content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      
      {/* 顶部导航栏 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>📊 总结归纳</h2>
        </div>
        
        <div className={styles.headerCenter}>
          {/* DAG页面选择器 */}
          <div className={styles.dagPageSelector}>
            <button 
              className={styles.selectorButton}
              onClick={() => setIsDagPageDropdownOpen(!isDagPageDropdownOpen)}
            >
              <span>{selectedDagPage?.name || '选择DAG页面'}</span>
              <ChevronDown size={16} />
            </button>
            {isDagPageDropdownOpen && (
              <div className={styles.dropdownMenu}>
                {dagPages.map((page) => (
                  <div
                    key={page.id}
                    className={`${styles.dropdownItem} ${page.id === selectedDagPageId ? styles.active : ''}`}
                    onClick={() => {
                      setIsDagPageDropdownOpen(false);
                      onPageSelect?.(page.id);
                    }}
                    style={{
                      borderLeft: page.highlightColor ? `3px solid ${page.highlightColor}` : 'none'
                    }}
                  >
                    <span className={styles.pageName}>{page.name}</span>
                    {page.isActive && <span className={styles.activeIndicator}>●</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {/* 🎯 新增：返回模式选择按钮 */}
          {onClose && (
            <button 
              onClick={onClose} 
              className={styles.backToModeButton}
              title="返回模式选择"
            >
              <ChevronLeft size={16} />
              <span>模式选择</span>
            </button>
          )}
        </div>
      </div>

      {/* 节点状态控制区域 */}
      <div className={styles.nodeControl}>
        <div className={styles.nodeStatus}>
          <Lightbulb size={16} className={styles.nodeIcon} />
          <span className={styles.nodeText}>
            当前分析节点：{selectedItem?.isProblem ? '题目内容' : `步骤 ${currentNodeStep}`}
          </span>
        </div>
        <div className={styles.nodeNavigation}>
          <button 
            onClick={() => handleNodeNavigation('prev')}
            disabled={allStepOptions.findIndex(option => 
              selectedStepId === 'problem-content' ? option.id === 'problem-content' : option.id === selectedStepId
            ) <= 0}
            className={styles.navButton}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={styles.navText}>切换</span>
          <button 
            onClick={() => handleNodeNavigation('next')}
            disabled={allStepOptions.findIndex(option => 
              selectedStepId === 'problem-content' ? option.id === 'problem-content' : option.id === selectedStepId
            ) >= allStepOptions.length - 1}
            className={styles.navButton}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 滑动条控制 */}
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min="0"
          max={allStepOptions.length - 1}
          value={allStepOptions.findIndex(option => 
            selectedStepId === 'problem-content' ? option.id === 'problem-content' : option.id === selectedStepId
          )}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className={styles.nodeSlider}
        />
        <div className={styles.sliderLabels}>
          {allStepOptions.map((option, index) => (
            <span 
              key={option.id} 
              className={`${styles.sliderLabel} ${
                (selectedStepId === 'problem-content' ? option.id === 'problem-content' : option.id === selectedStepId) ? styles.active : ''
              }`}
              onClick={() => onStepSelect && onStepSelect(option.id)}
              style={{ cursor: 'pointer' }}
            >
              {option.isProblem ? '题' : option.stepNumber}
            </span>
          ))}
        </div>
      </div>

      {/* 🎯 新增：题目信息显示区域 */}
      {problemData && (
        <div className={styles.problemDisplay}>
          <div className={styles.problemDisplayHeader}>
            <h4>📋 题目内容</h4>
            <button 
              className={styles.problemCallButton}
              onClick={() => {
                // 调用中间解题部分的题目信息
                console.log('调用题目信息:', problemData);
              }}
              title="调用到解题区域"
            >
              📤 调用
            </button>
          </div>
          <div className={styles.problemDisplayContent}>
            <div className={styles.problemLatexContent}>
              {/* 🔧 修复：改进LaTeX内容处理，确保正确渲染 */}
              {problemData.content ? (
                <BlockMath>
                  {/* 清理LaTeX内容，移除外层的$$符号 */}
                  {problemData.content.replace(/^\$\$/, '').replace(/\$\$$/, '')}
                </BlockMath>
              ) : (
                <div className={styles.emptyContent}>
                  <p>暂无题目内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎯 当前步骤内容显示区域 */}
      {selectedItem && (
        <div className={styles.currentStepDisplay}>
          <div className={styles.stepDisplayHeader}>
            <h4>{selectedItem.isProblem ? '📋 题目内容' : `解答步骤内容 - 步骤 ${selectedItem.stepNumber}`}</h4>
            <div className={styles.stepDisplayMeta}>
              {!selectedItem.isProblem && selectedItem.verificationStatus && (
                <span className={`${styles.stepStatus} ${styles[selectedItem.verificationStatus]}`}>
                  {selectedItem.verificationStatus === 'verified' ? '✅ 已验证' : 
                   selectedItem.verificationStatus === 'error' ? '❌ 错误' : '⏳ 未验证'}
                </span>
              )}
            </div>
          </div>
          <div className={styles.stepDisplayContent}>
            <div className={styles.latexContent}>
              {/* 🔧 修复：改进步骤内容LaTeX渲染 */}
              {selectedItem.content ? (
                <BlockMath>
                  {/* 清理LaTeX内容，移除外层的$$符号 */}
                  {selectedItem.content.replace(/^\$\$/, '').replace(/\$\$$/, '')}
                </BlockMath>
              ) : (
                <div className={styles.emptyContent}>
                  <p>暂无步骤内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className={styles.tabNavigation}>
        <button 
          onClick={() => setActiveTab('summaries')}
          className={`${styles.tabButton} ${activeTab === 'summaries' ? styles.active : ''}`}
        >
          📝 总结内容
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`${styles.tabButton} ${activeTab === 'templates' ? styles.active : ''}`}
        >
          🎯 总结模板
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`${styles.tabButton} ${activeTab === 'chat' ? styles.active : ''}`}
        >
          💬 AI对话
        </button>
      </div>

      {/* 主内容区域 */}
      <div className={styles.contentArea}>
        
        {/* 总结内容标签页 */}
        {activeTab === 'summaries' && (
          <div className={styles.summariesTab}>
            <div className={styles.summariesHeader}>
              <h3>解题总结</h3>
              <p className={styles.summariesDescription}>
                查看和管理解题过程的各类总结，支持按步骤筛选和编辑。
              </p>
            </div>
            
            <div className={styles.summariesList}>
              {summaryEntries.map((summary) => (
                <div 
                  key={summary.id}
                  className={`${styles.summaryCard} ${selectedSummary === summary.id ? styles.selected : ''}`}
                  onClick={() => setSelectedSummary(selectedSummary === summary.id ? null : summary.id)}
                >
                  <div className={styles.summaryHeader}>
                    <h4 className={styles.summaryTitle}>{summary.title}</h4>
                    <div className={styles.summaryMeta}>
                      <span className={`${styles.summaryType} ${styles[summary.type]}`}>
                        {summary.type === 'auto' ? '自动' : '手动'}
                      </span>
                      <span className={styles.summarySteps}>
                        步骤 {summary.stepNumbers.join(', ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.summaryContent}>
                    <div className={styles.latexSummaryContent}>
                      <BlockMath>{summary.content}</BlockMath>
                    </div>
                  </div>
                  
                  <div className={styles.summaryActions}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplaceStep(summary.content);
                      }}
                      className={`${styles.actionButton} ${styles.replaceButton}`}
                      title="一键替换当前步骤内容"
                      disabled={selectedItem?.isProblem}
                    >
                      <RefreshCw size={14} />
                      替换
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySummary(summary.content);
                      }}
                      className={styles.actionButton}
                    >
                      <Copy size={14} />
                      复制
                    </button>
                    <button className={styles.actionButton}>
                      <Edit3 size={14} />
                      编辑
                    </button>
                    <span className={styles.timestamp}>
                      {summary.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 总结模板标签页 */}
        {activeTab === 'templates' && (
          <div className={styles.templatesTab}>
            <div className={styles.templatesHeader}>
              <h3>总结模板</h3>
              <p className={styles.templatesDescription}>
                选择合适的模板快速生成不同类型的总结内容。
              </p>
            </div>
            
            <div className={styles.templateGrid}>
              {Object.values(SUMMARY_TEMPLATES).map((template) => (
                <div
                  key={template.id}
                  className={`${styles.templateCard} ${selectedTemplate === template.id ? styles.selected : ''}`}
                  style={{ '--template-color': template.color } as React.CSSProperties}
                >
                  <div className={styles.templateIcon}>
                    {template.icon}
                  </div>
                  <div className={styles.templateInfo}>
                    <h4 className={styles.templateName}>{template.name}</h4>
                    <p className={styles.templateDescription}>{template.description}</p>
                  </div>
                  <div className={styles.templateActions}>
                    <button 
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`${styles.selectButton} ${selectedTemplate === template.id ? styles.selected : ''}`}
                    >
                      {selectedTemplate === template.id ? '已选择' : '选择'}
                    </button>
                    <button 
                      onClick={() => handleCreateSummary(template.id)}
                      className={styles.createButton}
                    >
                      <Plus size={14} />
                      生成
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI对话标签页 */}
        {activeTab === 'chat' && (
          <div className={styles.chatTab}>
            <div className={styles.chatHeader}>
              <h3>AI总结助手</h3>
              <p className={styles.chatDescription}>
                与AI助手对话，获取个性化的总结和建议。
              </p>
            </div>
            
            <div className={styles.chatContainer} ref={chatContainerRef}>
              <div className={styles.chatMessages}>
                {chatMessages.length === 0 && (
                  <div className={styles.chatEmpty}>
                    <MessageSquare size={48} className={styles.emptyIcon} />
                    <p>开始与AI助手对话，获取解题总结...</p>
                  </div>
                )}
                
                {chatMessages.map((message) => (
                  <div 
                    key={message.id}
                    className={`${styles.chatMessage} ${styles[message.sender]}`}
                  >
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                    <div className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className={`${styles.chatMessage} ${styles.assistant}`}>
                    <div className={styles.messageContent}>
                      <div className={styles.loadingIndicator}>
                        <RefreshCw size={16} className={styles.spin} />
                        AI正在思考...
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 重新设计的现代化输入区域 */}
              <div className={styles.chatInput}>
                <div className={styles.inputContainer}>
                  <div className={styles.textareaWrapper}>
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="询问AI关于解题总结的问题，或使用 📎 上传文件..."
                      className={styles.modernTextarea}
                      rows={2}
                    />
                    <div className={styles.inputFooter}>
                      <div className={styles.footerLeft}>
                        <button 
                          className={styles.attachButton}
                          onClick={() => console.log('文件上传功能')}
                          title="上传文件"
                        >
                          📎
                        </button>
                        <span className={styles.characterCount}>
                          {inputMessage.length}/500
                        </span>
                      </div>
                      <div className={styles.footerRight}>
                        <button 
                          onClick={handleSendMessage}
                          disabled={!inputMessage.trim() || isLoading}
                          className={styles.modernSendButton}
                        >
                          {isLoading ? (
                            <RefreshCw size={16} className={styles.spin} />
                          ) : (
                            <Send size={16} />
                          )}
                          {!isLoading && '发送'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernSummaryPanel; 