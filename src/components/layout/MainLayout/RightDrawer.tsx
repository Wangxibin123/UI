import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import styles from './RightDrawer.module.css';
import ModernLaTeXPanel from '../../features/ai/AICopilotPanel/ModernLaTeXPanel';

// 抽屉类型枚举
export type DrawerType = 'history' | 'features' | null;

interface StepInfo {
  id: string;
  stepNumber: number;
  title: string;
  content: string;
  preview: string;
}

interface DagPageInfo {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
  highlightColor?: string;
}

interface AnswerBlockInfo {
  id: string;
  stepNumber: number;
  content: string;
  title: string;
  verificationStatus?: 'verified' | 'unverified' | 'error';
}

interface FeatureTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface RightDrawerProps {
  isOpen: boolean;
  drawerType: DrawerType;
  onToggle: (type: DrawerType) => void;
  contextStepInfo?: StepInfo;
  onContentChange?: (content: string) => void;
  // 版本历史相关
  dagPages?: DagPageInfo[];
  answerBlocks?: AnswerBlockInfo[];
  onPageSelect?: (pageId: string) => void;
  onPageCreate?: () => void;
  onPageDelete?: (pageId: string) => void;
  onAnswerBlockSelect?: (blockId: string) => void;
  // 新增：真实版本历史相关函数
  getStepVersionHistory?: (stepId: string) => { stepId: string; versions: any[]; currentVersionIndex: number } | null;
  switchStepVersion?: (stepId: string, versionIndex: number) => void;
  addVersionToStep?: (stepId: string, newContent: string, description?: string) => void;
  // 功能选择相关
  onFeatureSelect?: (featureId: string) => void;
  // LaTeX面板状态 - 从MainLayout传入
  isLaTeXPanelVisible?: boolean;
}

// 模拟数据
const MOCK_DAG_PAGES: DagPageInfo[] = [
  { id: 'page1', name: '页面1 - 数学求解', createdAt: new Date(), isActive: true },
  { id: 'page2', name: '页面2 - 扩展应用', createdAt: new Date(), isActive: false },
];

const MOCK_ANSWER_BLOCKS: AnswerBlockInfo[] = [
  { id: 'step1', stepNumber: 1, content: '\\begin{align} \\text{Given: } f(x) = x^2 + 2x + 1 \\end{align}', title: '题目内容', verificationStatus: 'verified' },
  { id: 'step2', stepNumber: 2, content: '\\begin{align} x^2 + 5x + 6 &= 0 \\\\ (x+2) (x+3) &= 0 \\end{align}', title: '因式分解方法', verificationStatus: 'verified' },
  { id: 'step3', stepNumber: 3, content: '\\begin{align} x = -2 \\text{ or } x = -3 \\end{align}', title: '求解结果', verificationStatus: 'unverified' },
];

// 默认功能模板
const DEFAULT_FEATURES: FeatureTemplate[] = [
  {
    id: 'latex-format',
    name: 'LaTeX格式化',
    description: '请帮我格式化这个LaTeX公式，使其更加规范和美观。检查语法错误，优化排版，确保数学符号正确显示。',
    icon: '📝',
    category: 'formatting'
  },
  {
    id: 'math-analysis',
    name: '数学分析',
    description: '请分析这个数学问题的解题思路。解释每个步骤的数学原理，指出关键的推理过程，并提供替代解法。',
    icon: '📊',
    category: 'analysis'
  },
  {
    id: 'step-summary',
    name: '步骤总结',
    description: '请总结这个解题步骤的要点。提炼核心概念，归纳解题方法，并指出需要注意的关键细节。',
    icon: '📋',
    category: 'summary'
  },
  {
    id: 'error-check',
    name: '错误检查',
    description: '检查数学推导中的逻辑错误。验证计算过程，识别概念误用，确保推理链条的完整性和正确性。',
    icon: '🔍',
    category: 'validation'
  }
];

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  drawerType,
  onToggle,
  contextStepInfo,
  onContentChange,
  dagPages = MOCK_DAG_PAGES,
  answerBlocks = MOCK_ANSWER_BLOCKS,
  onPageSelect,
  onPageCreate,
  onPageDelete,
  onAnswerBlockSelect,
  getStepVersionHistory,
  switchStepVersion,
  addVersionToStep,
  onFeatureSelect,
  isLaTeXPanelVisible = false,
}) => {
  const [drawerWidth, setDrawerWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState(dagPages[0]?.id || 'page1');
  const [selectedBlockId, setSelectedBlockId] = useState(() => {
    const firstRealAnswerBlock = answerBlocks.find(block => block.stepNumber > 0);
    return firstRealAnswerBlock?.id || answerBlocks[0]?.id || 'step1';
  });
  
  // 🎯 版本历史状态管理
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // 🎯 自定义功能状态管理
  const [customFeatures, setCustomFeatures] = useState<FeatureTemplate[]>([]);
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [selectedFeatureForPrompt, setSelectedFeatureForPrompt] = useState<string | null>(null);
  
  // 模拟版本历史数据 - 每个步骤可能有多个版本
  const getVersionHistory = (blockId: string) => {
    // 🔧 新增：使用真实版本历史数据
    if (getStepVersionHistory) {
      const realHistory = getStepVersionHistory(blockId);
      if (realHistory) {
        return realHistory.versions.map((version: any) => ({
          id: version.id,
          content: version.content,
          timestamp: version.timestamp,
          description: version.description,
          isOriginal: version.isOriginal
        }));
      }
    }

    // 🔧 保留模拟数据作为fallback
    return [
      {
        id: `${blockId}-v1`,
        content: '\\begin{align} \\text{Given: } f(x) = x^2 + 2x + 1 \\end{align}',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
        description: '初始版本',
        isOriginal: true
      },
      {
        id: `${blockId}-v2`, 
        content: '\\begin{align} \\text{Given: } f(x) = x^2 + 2x + 1 = (x+1)^2 \\end{align}',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
        description: '添加因式分解',
        isOriginal: false
      },
      {
        id: `${blockId}-v3`,
        content: '\\begin{align} \\text{Given: } f(x) = x^2 + 2x + 1 = (x+1)^2 \\geq 0 \\end{align}',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5分钟前
        description: '添加不等式性质',
        isOriginal: false
      }
    ];
  };
  
  const currentVersions = getVersionHistory(selectedBlockId);
  const currentVersion = currentVersions[currentVersionIndex] || currentVersions[0];


  // ESC键关闭抽屉
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onToggle(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle]);

  // 处理遮罩点击关闭
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onToggle(null);
    }
  }, [onToggle]);

  // 处理抽屉宽度调整
  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const newWidth = window.innerWidth - event.clientX;
      setDrawerWidth(Math.max(400, Math.min(window.innerWidth * 0.8, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 处理页面选择
  const handlePageSelect = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    onPageSelect?.(pageId);
  }, [onPageSelect]);

  // 处理解答块选择
  const handleAnswerBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    setCurrentVersionIndex(0); // 重置版本索引
    setIsEditing(false); // 重置编辑状态
    onAnswerBlockSelect?.(blockId);
  }, [onAnswerBlockSelect]);

  // 🎯 版本历史处理函数
  const handleVersionNavigation = (direction: 'prev' | 'next') => {
    // 🔧 使用真实版本历史切换
    if (switchStepVersion) {
      let newIndex = currentVersionIndex;
      if (direction === 'prev' && currentVersionIndex > 0) {
        newIndex = currentVersionIndex - 1;
      } else if (direction === 'next' && currentVersionIndex < currentVersions.length - 1) {
        newIndex = currentVersionIndex + 1;
      }
      
      if (newIndex !== currentVersionIndex) {
        switchStepVersion(selectedBlockId, newIndex);
        setCurrentVersionIndex(newIndex);
      }
    } else {
      // 🔧 保留原有的本地切换逻辑作为fallback
      if (direction === 'prev' && currentVersionIndex > 0) {
        setCurrentVersionIndex(prev => prev - 1);
      } else if (direction === 'next' && currentVersionIndex < currentVersions.length - 1) {
        setCurrentVersionIndex(prev => prev + 1);
      }
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(currentVersion.content);
    setIsPreviewMode(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
    setIsPreviewMode(false);
  };

  const handleSaveEdit = () => {
    // 🔧 使用真实版本历史保存
    if (addVersionToStep && editContent.trim()) {
      const description = '手动编辑';
      addVersionToStep(selectedBlockId, editContent.trim(), description);
      
      // 通知父组件内容变化
      onContentChange?.(editContent.trim());
      
      setIsEditing(false);
      setEditContent('');
      setIsPreviewMode(false);
    } else {
      // 🔧 保留原有逻辑作为fallback
      console.log('保存编辑内容:', editContent);
      onContentChange?.(editContent);
      setIsEditing(false);
      setEditContent('');
      setIsPreviewMode(false);
    }
  };

  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // 🎯 自定义功能处理函数
  const handleAddCustomFeature = () => {
    if (newFeatureName.trim() && newFeatureDescription.trim()) {
      const newFeature: FeatureTemplate = {
        id: `custom-${Date.now()}`,
        name: newFeatureName.trim(),
        description: newFeatureDescription.trim(),
        icon: '🔧', // 默认自定义功能图标
        category: 'custom'
      };
      
      setCustomFeatures(prev => [...prev, newFeature]);
      setNewFeatureName('');
      setNewFeatureDescription('');
      setIsAddingFeature(false);
    }
  };

  const handleCancelAddFeature = () => {
    setNewFeatureName('');
    setNewFeatureDescription('');
    setIsAddingFeature(false);
  };

  const handleFeatureClick = (featureId: string) => {
    const allFeatures = [...DEFAULT_FEATURES, ...customFeatures];
    const feature = allFeatures.find(f => f.id === featureId);
    
    if (feature) {
      setSelectedFeatureForPrompt(featureId);
      // 这里可以显示提示词输入框或直接调用功能
      onFeatureSelect?.(featureId);
    }
  };

  const handleDeleteCustomFeature = (featureId: string) => {
    setCustomFeatures(prev => prev.filter(f => f.id !== featureId));
  };

  // 获取验证状态图标
  const getVerificationIcon = (status?: string) => {
    switch (status) {
      case 'verified': return '✅';
      case 'error': return '❌';
      case 'unverified': return '⏳';
      default: return '❓';
    }
  };

  // 渲染版本历史内容
  const renderHistoryContent = () => (
    <div className={styles.historyContent}>
      <div className={styles.historyHeader}>
        <h4>版本历史区域</h4>
      </div>
      
      {/* DAG页面选择器 */}
      <div className={styles.selectorSection}>
        <label className={styles.selectorLabel}>DAG页面</label>
        <select 
          className={styles.pageSelector}
          value={selectedPageId}
          onChange={(e) => handlePageSelect(e.target.value)}
        >
          {dagPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </div>

      {/* 步骤选择器 */}
      <div className={styles.selectorSection}>
        <label className={styles.selectorLabel}>步骤</label>
        <select 
          className={styles.stepSelector}
          value={selectedBlockId}
          onChange={(e) => handleAnswerBlockSelect(e.target.value)}
        >
          {answerBlocks.map((block) => (
            <option key={block.id} value={block.id}>
              步骤{block.stepNumber} - {block.title}
            </option>
          ))}
        </select>
      </div>
      
      {/* 历史时间线 */}
      <div className={styles.historyTimeline}>
        <div className={styles.timelineHeader}>
          <span className={styles.timelineIcon}>📚</span>
          <span>版本历史</span>
          {/* 🎯 版本切换按键 */}
          <div className={styles.versionNavigation}>
            <button
              className={styles.versionNavButton}
              onClick={() => handleVersionNavigation('prev')}
              disabled={currentVersionIndex === 0}
              title="上一版本"
            >
              ⬅️
            </button>
            <span className={styles.versionInfo}>
              {currentVersionIndex + 1}/{currentVersions.length}
            </span>
            <button
              className={styles.versionNavButton}
              onClick={() => handleVersionNavigation('next')}
              disabled={currentVersionIndex === currentVersions.length - 1}
              title="下一版本"
            >
              ➡️
            </button>
          </div>
        </div>
        
        {/* 🎯 显示当前版本 */}
        {currentVersion && (
          <div className={styles.historyItem}>
            <div className={styles.historyStep}>
              {currentVersion.isOriginal ? '🎯' : '📝'}
              <span>{currentVersionIndex + 1}/{currentVersions.length}</span>
            </div>
            <div className={styles.historyDetails}>
              <div className={styles.historyTitleRow}>
                <h5>{currentVersion.description}</h5>
                <div className={styles.historyActions}>
                  <button
                    className={styles.editButton}
                    onClick={handleStartEdit}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.copyButton}
                    onClick={() => navigator.clipboard.writeText(currentVersion.content)}
                    title="复制"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className={styles.historyTimestamp}>
                🕐 {currentVersion.timestamp.toLocaleString()}
              </div>
              <div className={styles.historyLatex}>
                <BlockMath>{currentVersion.content.replace(/^\$\$/, '').replace(/\$\$$/, '')}</BlockMath>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑功能区域 */}
      <div className={styles.editingSection}>
        <div className={styles.editingHeader}>
          <h5>可编辑区域</h5>
          <div className={styles.editingControls}>
            {!isEditing ? (
              // 🎯 非编辑状态：只显示复制和编辑按键
              <>
                <button 
                  className={styles.editControl}
                  onClick={() => currentVersion && navigator.clipboard.writeText(currentVersion.content)}
                  title="复制"
                >
                  📋 复制
                </button>
                <button 
                  className={styles.editControl}
                  onClick={handleStartEdit}
                  title="编辑"
                >
                  ✏️ 编辑
                </button>
              </>
            ) : (
              // 🎯 编辑状态：显示预览、复原和保存按键
              <>
                <button 
                  className={styles.editControl}
                  onClick={handleTogglePreview}
                  title={isPreviewMode ? "编辑模式" : "预览模式"}
                >
                  {isPreviewMode ? "✏️ 编辑" : "👁️ 预览"}
                </button>
                <button 
                  className={styles.editControl}
                  onClick={handleCancelEdit}
                  title="复原"
                >
                  🔄 复原
                </button>
                <button 
                  className={styles.editControl}
                  onClick={handleSaveEdit}
                  title="保存"
                >
                  💾 保存
                </button>
              </>
            )}
          </div>
        </div>
        <div className={styles.editingContent}>
          {!isEditing ? (
            <div className={styles.latexPreview}>
              {/* 🔧 修复：使用LaTeX渲染组件 */}
              {currentVersion ? (
                <BlockMath>{currentVersion.content.replace(/^\$\$/, '').replace(/\$\$$/, '')}</BlockMath>
              ) : (
                '选择上方步骤进行编辑和预览'
              )}
            </div>
          ) : (
            <div className={styles.editingArea}>
              {isPreviewMode ? (
                <div className={styles.latexPreview}>
                  {/* 🔧 修复：预览模式使用LaTeX渲染 */}
                  {editContent ? (
                    <BlockMath>{editContent.replace(/^\$\$/, '').replace(/\$\$$/, '')}</BlockMath>
                  ) : (
                    '预览内容为空'
                  )}
                </div>
              ) : (
                <textarea
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="请输入LaTeX内容..."
                  rows={8}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 渲染功能选择内容
  const renderFeaturesContent = () => {
    const allFeatures = [...DEFAULT_FEATURES, ...customFeatures];
    
    return (
      <div className={styles.featuresContent}>
        <div className={styles.featuresHeader}>
          <h4 className={styles.featuresTitle}>🔧 功能选择</h4>
          <button 
            className={styles.addFeatureButton}
            onClick={() => setIsAddingFeature(true)}
            title="添加自定义功能"
          >
            ➕ 添加功能
          </button>
        </div>
        
        {/* 🎯 添加自定义功能表单 */}
        {isAddingFeature && (
          <div className={styles.addFeatureForm}>
            <div className={styles.formHeader}>
              <h5>✨ 创建自定义功能</h5>
              <button 
                className={styles.cancelButton}
                onClick={handleCancelAddFeature}
              >
                ✕
              </button>
            </div>
            <div className={styles.formFields}>
              <input
                type="text"
                placeholder="功能名称（如：公式验证）"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                className={styles.featureNameInput}
                maxLength={20}
              />
              <textarea
                placeholder="功能描述（如：请验证这个数学公式的正确性）"
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
                className={styles.featureDescInput}
                rows={3}
                maxLength={100}
              />
              <div className={styles.formActions}>
                <button 
                  className={styles.saveFeatureButton}
                  onClick={handleAddCustomFeature}
                  disabled={!newFeatureName.trim() || !newFeatureDescription.trim()}
                >
                  💾 保存功能
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className={styles.featuresGrid}>
          {allFeatures.map((feature) => (
            <div 
              key={feature.id}
              className={`${styles.featureCard} ${feature.category === 'custom' ? styles.customFeatureCard : ''}`}
              onClick={() => handleFeatureClick(feature.id)}
            >
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h5 className={styles.featureName}>{feature.name}</h5>
              <p className={styles.featureDescription}>{feature.description}</p>
              <div className={styles.featureActions}>
                <button className={styles.featureButton}>使用模板</button>
                {feature.category === 'custom' && (
                  <button 
                    className={styles.deleteFeatureButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomFeature(feature.id);
                    }}
                    title="删除自定义功能"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* 🎯 功能提示词输入框 */}
        {selectedFeatureForPrompt && (
          <div className={styles.promptInputOverlay}>
            <div className={styles.promptInputModal}>
              <div className={styles.promptHeader}>
                <h5>📝 输入具体要求</h5>
                <button 
                  className={styles.closePromptButton}
                  onClick={() => setSelectedFeatureForPrompt(null)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.promptContent}>
                <p>选择的功能：{allFeatures.find(f => f.id === selectedFeatureForPrompt)?.name}</p>
                <textarea
                  placeholder="请输入具体的要求或问题..."
                  className={styles.promptTextarea}
                  rows={4}
                />
                <div className={styles.promptActions}>
                  <button className={styles.submitPromptButton}>
                    🚀 提交
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染抽屉内容
  const renderDrawerContent = () => {
    switch (drawerType) {
      case 'history':
        return renderHistoryContent();
      case 'features':
        return renderFeaturesContent();
      default:
        return null;
    }
  };

  return (
    <>
      {/* 右侧触发器组 - 只在LaTeX格式化时显示 */}
      {isLaTeXPanelVisible && (
        <div className={styles.triggerGroup}>
          <button
            className={`${styles.trigger} ${drawerType === 'history' ? styles.triggerActive : ''}`}
            onClick={() => onToggle(drawerType === 'history' ? null : 'history')}
            title="版本历史"
          >
            📚
          </button>
          <button
            className={`${styles.trigger} ${drawerType === 'features' ? styles.triggerActive : ''}`}
            onClick={() => onToggle(drawerType === 'features' ? null : 'features')}
            title="功能选择"
          >
            🔧
          </button>
        </div>
      )}

      {/* 抽屉容器 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div className={styles.overlay} onClick={handleOverlayClick} />
          
          {/* 抽屉主体 */}
          <div 
            className={styles.drawer}
            style={{ width: `${drawerWidth}px` }}
          >
            {/* 调整大小手柄 */}
            <div 
              className={styles.resizeHandle}
              onMouseDown={handleResizeStart}
            />
            
            {/* 抽屉头部 */}
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>
                {drawerType === 'history' ? '📚 版本历史区域' : '🔧 功能选择'}
              </h3>
              <button 
                className={styles.closeButton}
                onClick={() => onToggle(null)}
                title="关闭"
              >
                ✕
              </button>
            </div>

            {/* 抽屉内容 */}
            <div className={styles.drawerContent}>
              {renderDrawerContent()}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default RightDrawer; 