import React, { useState, useCallback } from 'react';
import styles from './ModernAnalysisPanel.module.css';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Search, 
  Target, 
  BookOpen, 
  HelpCircle,
  Plus,
  Copy,
  Edit,
  Save,
  Share,
  Download,
  MessageCircle,
  Lightbulb
} from 'lucide-react';

// 🎯 DAG页面信息接口
export interface DagPageInfo {
  id: string;
  name: string;
  isActive: boolean;
  highlightColor?: string;
}

// 🎯 解答步骤信息接口
export interface StepBlockInfo {
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
}

// 🎯 解析分析面板的接口定义
export interface ModernAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  totalSteps: number;
  contextStepInfo?: {
    id: string;
    content: string;
    stepNumber: number;
  } | null;
  // 新增：真实DAG数据支持
  dagPages?: DagPageInfo[];
  stepBlocks?: StepBlockInfo[];
  selectedDagPageId?: string;
  selectedStepId?: string;
  onPageSelect?: (pageId: string) => void;
  onStepSelect?: (stepId: string) => void;
}

// 🎯 分析标签页类型定义
interface AnalysisTab {
  id: string;
  name: string;
  icon: React.ElementType;
  isActive: boolean;
  isCustom?: boolean;
}

// 🎯 解析分析专用标签页配置
const defaultTabs: AnalysisTab[] = [
  { id: 'problem', name: '问题解析', icon: HelpCircle, isActive: true },
  { id: 'reasoning', name: '推理过程', icon: Target, isActive: false },
  { id: 'explore', name: '深度探索', icon: Search, isActive: false },
  { id: 'knowledge', name: '知识关联', icon: BookOpen, isActive: false },
];



// 🎯 主要的ModernAnalysisPanel组件
const ModernAnalysisPanel: React.FC<ModernAnalysisPanelProps> = ({
  isOpen,
  onClose,
  currentStep,
  totalSteps,
  contextStepInfo,
  dagPages = [],
  stepBlocks = [],
  selectedDagPageId,
  selectedStepId,
  onPageSelect,
  onStepSelect,
}) => {
  const [activeTab, setActiveTab] = useState<string>('problem');
  const [tabs, setTabs] = useState<AnalysisTab[]>(defaultTabs);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([currentStep]);
  const [isMultiCompareMode, setIsMultiCompareMode] = useState<boolean>(false);
  const [isDagPageDropdownOpen, setIsDagPageDropdownOpen] = useState(false);
  
  // 🎯 当前选中的DAG页面
  const selectedDagPage = dagPages.find(page => page.id === selectedDagPageId) || dagPages[0];
  const currentStepBlocks = stepBlocks.filter(block => selectedDagPageId ? true : true); // 根据页面过滤步骤

  // 🎯 步骤切换处理
  const handleStepChange = useCallback((newStep: number) => {
    if (newStep >= 1 && newStep <= totalSteps) {
      // 这里应该通知父组件步骤变化
      console.log('切换到步骤:', newStep);
    }
  }, [totalSteps]);

  // 🎯 多题对比模式切换
  const handleMultiCompareMode = useCallback(() => {
    setIsMultiCompareMode(!isMultiCompareMode);
  }, [isMultiCompareMode]);

  // 🎯 步骤选择切换
  const handleStepToggle = useCallback((step: number) => {
    setSelectedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  }, []);

  // 🎯 标签页切换
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setTabs(prev => prev.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    })));
  }, []);

  // 🎯 DAG页面选择处理
  const handlePageSelect = useCallback((page: DagPageInfo) => {
    setIsDagPageDropdownOpen(false);
    onPageSelect?.(page.id);
  }, [onPageSelect]);

  // 🎯 步骤块选择处理
  const handleStepBlockSelect = useCallback((stepBlock: StepBlockInfo) => {
    onStepSelect?.(stepBlock.id);
  }, [onStepSelect]);

  // 🎯 获取状态图标
  const getStatusIcon = useCallback((block: StepBlockInfo) => {
    const icons = [];
    
    if (block.forwardDerivationStatus === 'correct') icons.push('✅');
    else if (block.forwardDerivationStatus === 'incorrect') icons.push('❌');
    
    if (block.backwardDerivationStatus === 'correct') icons.push('⬅️✅');
    else if (block.backwardDerivationStatus === 'incorrect') icons.push('⬅️❌');
    
    if (block.hasInterpretation) icons.push('💭');
    if (block.hasNotes) icons.push('📝');
    if (block.isHighlighted) icons.push('⭐');
    if (block.isFocused) icons.push('🎯');
    
    return icons.join(' ');
  }, []);

  // 🎯 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'problem':
        return (
          <div className={styles.problemAnalysisContent}>
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <Lightbulb size={20} className={styles.cardIcon} />
                <h3>针对您的数学问题进行个性化解析</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.questionSection}>
                  <h4>📌 学生提问</h4>
                  <div className={styles.questionInput}>
                    <textarea 
                      placeholder="请输入您的问题..."
                      className={styles.questionTextarea}
                    />
                  </div>
                </div>
                
                <div className={styles.analysisSection}>
                  <h4>💡 AI导师解析</h4>
                  <div className={styles.analysisContent}>
                    <p>这是一个很好的问题！让我们用几何直观来理解：</p>
                    <ul>
                      <li>导数代表函数在某点的变化率</li>
                      <li>x²的几何意义是边长为x的正方形面积</li>
                      <li>当x增加Δx时，面积增加了多少？</li>
                    </ul>
                  </div>
                </div>
                
                <div className={styles.memoryTipsSection}>
                  <h4>🔧 记忆技巧</h4>
                  <div className={styles.tipsList}>
                    <div className={styles.tip}>1. 几何方法：正方形面积变化可视化</div>
                                         <div className={styles.tip}>2. 代数方法：$(x+h)^2 - x^2 = 2xh + h^2$</div>
                    <div className={styles.tip}>3. 口诀："幂函数求导，指数前提，幂次减一"</div>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button className={styles.actionButton}>
                    <Edit size={16} />
                    编辑
                  </button>
                  <button className={styles.actionButton}>
                    <Copy size={16} />
                    复制
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.bottomActions}>
              <button className={styles.primaryButton}>
                <Plus size={16} />
                提出新问题
              </button>
              <button className={styles.secondaryButton}>
                🔄 重新解析
              </button>
            </div>
          </div>
        );
        
      case 'reasoning':
        return (
          <div className={styles.reasoningContent}>
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <Target size={20} className={styles.cardIcon} />
                <h3>解题推理过程分析</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.reasoningChain}>
                  <h4>🔗 推理链条分析</h4>
                  <div className={styles.reasoningSteps}>
                    <div className={styles.reasoningStep}>
                      <div className={styles.stepHeader}>
                        <span className={styles.stepNumber}>1</span>
                        <h5>识别问题类型</h5>
                      </div>
                      <div className={styles.stepContent}>
                        <p>这是一个幂函数求导问题，需要应用基本导数公式</p>
                        <div className={styles.logicAnalysis}>
                          <span className={styles.logicLabel}>逻辑依据:</span>
                          <span>函数形式为 $f(x) = x^2$，符合幂函数 $x^n$ 模式</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.reasoningStep}>
                      <div className={styles.stepHeader}>
                        <span className={styles.stepNumber}>2</span>
                        <h5>选择求导方法</h5>
                      </div>
                      <div className={styles.stepContent}>
                        <p>应用幂函数求导公式: {'$(x^n)\' = nx^{n-1}$'}</p>
                        <div className={styles.logicAnalysis}>
                          <span className={styles.logicLabel}>推理过程:</span>
                          <span>n=2 → {'$(x^2)\' = 2x^{2-1} = 2x^1 = 2x$'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.reasoningStep}>
                      <div className={styles.stepHeader}>
                        <span className={styles.stepNumber}>3</span>
                        <h5>验证结果合理性</h5>
                      </div>
                      <div className={styles.stepContent}>
                        <p>从几何意义验证：{'$y=x^2$'} 在任意点的切线斜率为 {'$2x$'}</p>
                        <div className={styles.logicAnalysis}>
                          <span className={styles.logicLabel}>验证逻辑:</span>
                          <span>当 x{'>'} 0 时斜率为正（函数递增），当 x{'<'} 0 时斜率为负（函数递减）</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.reasoningInsights}>
                  <h4>💡 推理洞察</h4>
                  <div className={styles.insightsList}>
                    <div className={styles.insight}>
                      <span className={styles.insightIcon}>🔍</span>
                      <div className={styles.insightContent}>
                        <strong>模式识别:</strong> 看到幂函数形式，立即联想到幂函数求导公式
                      </div>
                    </div>
                    <div className={styles.insight}>
                      <span className={styles.insightIcon}>⚡</span>
                      <div className={styles.insightContent}>
                        <strong>策略选择:</strong> 直接应用公式比从定义推导更高效
                      </div>
                    </div>
                    <div className={styles.insight}>
                      <span className={styles.insightIcon}>✅</span>
                      <div className={styles.insightContent}>
                        <strong>结果验证:</strong> 通过几何意义确认代数结果的正确性
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.bottomActions}>
              <button className={styles.primaryButton}>
                <Plus size={16} />
                分析推理漏洞
              </button>
              <button className={styles.secondaryButton}>
                🔄 重新构建推理链
              </button>
            </div>
          </div>
        );
        
      case 'explore':
        return (
          <div className={styles.exploreContent}>
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <Search size={20} className={styles.cardIcon} />
                <h3>数学原理深度探索</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.deepThinking}>
                  <h4>💭 深度思考：导数概念的历史发展</h4>
                  <div className={styles.thinkingContent}>
                    <div className={styles.section}>
                      <h5>📊 数学背景</h5>
                      <p>导数概念由牛顿和莱布尼茨在17世纪独立发现，最初是为了解决物理学中的运动问题和几何学中的切线问题</p>
                    </div>
                    
                    <div className={styles.section}>
                      <h5>🔬 严格定义</h5>
                      <div className={styles.formula}>
                        {'$$f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$'}
                      </div>
                    </div>
                    
                    <div className={styles.section}>
                      <h5>🌐 应用拓展</h5>
                      <p>导数不仅用于数学，还广泛应用于物理、经济、工程等领域</p>
                    </div>
                    
                    <div className={styles.sectionActions}>
                      <button className={styles.expandButton}>🔍 展开详情</button>
                      <button className={styles.addThinkingButton}>📝 添加思考</button>
                      <button className={styles.linkConceptsButton}>🔗 关联概念</button>
                    </div>
                  </div>
                </div>
                
                <div className={styles.conceptMap}>
                  <h4>💡 概念关系图</h4>
                  <div className={styles.mapContent}>
                    <div className={styles.conceptNode}>导数</div>
                    <div className={styles.conceptBranches}>
                      <div className={styles.branch}>
                        <span>几何意义</span>
                        <div className={styles.subBranches}>
                          <span>切线斜率</span>
                          <span>变化率</span>
                        </div>
                      </div>
                      <div className={styles.branch}>
                        <span>代数定义</span>
                        <div className={styles.subBranches}>
                          <span>极限</span>
                          <span>差商</span>
                        </div>
                      </div>
                    </div>
                    <button className={styles.editMapButton}>📐 编辑图表</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'knowledge':
        return (
          <div className={styles.knowledgeContent}>
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <BookOpen size={20} className={styles.cardIcon} />
                <h3>相关知识点与概念关联</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.knowledgeFilters}>
                  <button className={styles.filterButton}>🏷️ 分类</button>
                  <button className={styles.filterButton}>📊 难度</button>
                  <button className={styles.filterButton}>💡 概念</button>
                  <button className={styles.filterButton}>🔗 关联</button>
                  <div className={styles.searchBox}>
                    <Search size={16} />
                    <input type="text" placeholder="搜索知识点..." />
                  </div>
                </div>
                
                <div className={styles.knowledgePoints}>
                  <div className={styles.knowledgePoint}>
                    <h4>🔸 导数的定义与性质</h4>
                    <ul>
                      <li>定义：函数在某点处的瞬时变化率</li>
                      <li>几何意义：切线斜率</li>
                      <li>物理意义：速度、加速度</li>
                    </ul>
                    <button className={styles.learnButton}>📖 详细学习</button>
                  </div>
                  
                  <div className={styles.knowledgePoint}>
                    <h4>🔸 常见函数求导公式</h4>
                    <ul>
                      <li>幂函数：{'$(x^n)\' = nx^{n-1}$'}</li>
                      <li>指数函数：$(e^x)' = e^x$</li>
                      <li>三角函数：$(\sin x)' = \cos x$</li>
                    </ul>
                    <button className={styles.practiceButton}>🔗 练习题集</button>
                  </div>
                  
                  <div className={styles.knowledgePoint}>
                    <h4>🔸 求导法则</h4>
                    <ul>
                      <li>加法法则：$(f+g)' = f' + g'$</li>
                      <li>乘积法则：$(fg)' = f'g + fg'$</li>
                      <li>链式法则：$[f(g(x))]' = f'(g(x)) \cdot g'(x)$</li>
                    </ul>
                    <button className={styles.exampleButton}>💼 应用实例</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.bottomActions}>
              <button className={styles.primaryButton}>🎯 添加知识点</button>
              <button className={styles.secondaryButton}>📊 知识图谱</button>
              <button className={styles.secondaryButton}>🔄 智能关联</button>
              <button className={styles.secondaryButton}>📤 导出笔记</button>
            </div>
          </div>
        );
        
      default:
        return <div>选择一个标签页查看内容</div>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.container}>
        {/* 🎯 顶部控制栏 */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Search size={20} className={styles.headerIcon} />
            <h2 className={styles.title}>🧠 解析分析</h2>
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
                      onClick={() => handlePageSelect(page)}
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
            <button 
              className={styles.multiCompareButton}
              onClick={handleMultiCompareMode}
            >
              📋 多题对比
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 🎯 功能标签页区域 */}
        <div className={styles.tabsArea}>
          <div className={styles.tabsList}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${tab.isActive ? styles.activeTab : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <tab.icon size={16} className={styles.tabIcon} />
                <span className={styles.tabName}>{tab.name}</span>
              </button>
            ))}
            <button className={styles.addTabButton}>
              <Plus size={16} />
            </button>
          </div>
          
          <div className={styles.tabIndicator} />
        </div>

        {/* 🎯 主内容区域 - 改为上下布局 */}
        <div className={styles.mainContent}>
          {/* 上方：小型DAG画布区域 */}
          <div className={styles.topPanel}>
            <div className={styles.miniCanvasArea}>
              <div className={styles.canvasHeader}>
                <h4>📊 DAG解答块画布</h4>
                <span className={styles.canvasInfo}>
                  当前页面: {selectedDagPage?.name || '未选择'} | 
                  共 {currentStepBlocks.length} 个步骤块
                </span>
              </div>
              <div className={styles.miniCanvas}>
                {/* 横向滚动的步骤块容器 */}
                <div className={styles.stepBlocksContainer}>
                  {currentStepBlocks.map((block) => (
                    <div 
                      key={block.id} 
                      className={`${styles.stepBlock} ${
                        block.id === selectedStepId ? styles.selectedBlock : ''
                      } ${
                        block.isFocused ? styles.focusedBlock : ''
                      }`}
                      onClick={() => handleStepBlockSelect(block)}
                      style={{
                        backgroundColor: block.isHighlighted ? block.highlightColor : undefined,
                        borderColor: block.isFocused ? '#007ACC' : undefined,
                        borderWidth: block.isFocused ? '2px' : '1px'
                      }}
                    >
                      {/* 步骤编号 */}
                      <div className={styles.blockNumber}>
                        {block.stepNumber}
                      </div>
                      
                      {/* 状态指示器 */}
                      <div className={styles.statusIndicators}>
                        <div className={styles.statusRow}>
                          {/* 前向推导状态 */}
                          {block.forwardDerivationStatus === 'correct' && (
                            <span className={styles.forwardCorrect} title="前向推导正确">✅</span>
                          )}
                          {block.forwardDerivationStatus === 'incorrect' && (
                            <span className={styles.forwardIncorrect} title="前向推导错误">❌</span>
                          )}
                          
                          {/* 后向推导状态 */}
                          {block.backwardDerivationStatus === 'correct' && (
                            <span className={styles.backwardCorrect} title="后向推导正确">⬅️✅</span>
                          )}
                          {block.backwardDerivationStatus === 'incorrect' && (
                            <span className={styles.backwardIncorrect} title="后向推导错误">⬅️❌</span>
                          )}
                        </div>
                        
                        <div className={styles.statusRow}>
                          {/* 其他状态标识 */}
                          {block.hasInterpretation && (
                            <span className={styles.hasInterpretation} title="已提交思路解读">💭</span>
                          )}
                          {block.hasNotes && (
                            <span className={styles.hasNotes} title="有备注">📝</span>
                          )}
                          {block.isHighlighted && (
                            <span className={styles.highlighted} title="已高亮">⭐</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 验证状态边框指示 */}
                      <div className={`${styles.verificationBorder} ${
                        block.verificationStatus === 'verified' ? styles.verified :
                        block.verificationStatus === 'error' ? styles.verificationError :
                        styles.unverified
                      }`} />
                    </div>
                  ))}
                  
                  {/* 如果没有步骤块 */}
                  {currentStepBlocks.length === 0 && (
                    <div className={styles.emptySteps}>
                      <span>📝 当前页面暂无解答步骤</span>
                    </div>
                  )}
                </div>
                
                {/* 滚动指示器（如果需要滚动） */}
                {currentStepBlocks.length > 6 && (
                  <div className={styles.scrollHint}>
                    <span>← 左右滚动查看更多步骤 →</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 下方：标签页内容 */}
          <div className={styles.bottomPanel}>
            {renderTabContent()}
          </div>
        </div>
      </div>
  );
};

export default ModernAnalysisPanel; 