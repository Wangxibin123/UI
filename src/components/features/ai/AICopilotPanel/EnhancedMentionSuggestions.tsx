import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Hash, FileText, Package, Target } from 'lucide-react';
import styles from './EnhancedMentionSuggestions.module.css';

export interface DagNodeInfo {
  id: string;
  label?: string;
  content?: string;
  stepNumber?: number;
}

export interface ProblemInfo {
  id: string;
  title: string;
  content: string;
}

export interface MentionGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  items: (DagNodeInfo | ProblemInfo)[];
  description: string;
}

export interface EnhancedMentionSuggestionsProps {
  suggestions: DagNodeInfo[];
  problemInfo?: ProblemInfo | null;
  activeSuggestionIndex: number;
  onSelectNode: (node: DagNodeInfo | ProblemInfo) => void;
  query: string;
  mode: 'latex' | 'analysis' | 'summary';
}

const EnhancedMentionSuggestions: React.FC<EnhancedMentionSuggestionsProps> = ({
  suggestions,
  problemInfo,
  activeSuggestionIndex,
  onSelectNode,
  query,
  mode
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // 根据step number对节点进行分组
  const createMentionGroups = (): MentionGroup[] => {
    const groups: MentionGroup[] = [];

    // 添加题目组（如果存在）
    if (problemInfo) {
      groups.push({
        id: 'problem',
        name: '题目',
        icon: Target,
        items: [problemInfo],
        description: '引用原题目内容'
      });
    }

    // 按步骤号分组节点
    const nodesByStep = suggestions.reduce((acc, node) => {
      const stepNum = node.stepNumber || parseInt(node.label?.match(/\d+/)?.[0] || '0');
      if (!acc[stepNum]) acc[stepNum] = [];
      acc[stepNum].push(node);
      return acc;
    }, {} as Record<number, DagNodeInfo[]>);

    // 创建不同的分组
    const steps1to8: DagNodeInfo[] = [];
    const steps9to11: DagNodeInfo[] = [];
    const otherSteps: DagNodeInfo[] = [];

    Object.entries(nodesByStep).forEach(([stepNum, nodes]) => {
      const num = parseInt(stepNum);
      if (num >= 1 && num <= 8) {
        steps1to8.push(...nodes);
      } else if (num >= 9 && num <= 11) {
        steps9to11.push(...nodes);
      } else {
        otherSteps.push(...nodes);
      }
    });

    // 添加1-8步骤组
    if (steps1to8.length > 0) {
      groups.push({
        id: 'steps-1-8',
        name: '步骤 1-8',
        icon: Hash,
        items: steps1to8.sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)),
        description: '基础解题步骤'
      });
    }

    // 添加9-11步骤组
    if (steps9to11.length > 0) {
      groups.push({
        id: 'steps-9-11',
        name: '步骤 9-11',
        icon: Package,
        items: steps9to11.sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)),
        description: '进阶解题步骤'
      });
    }

    // 添加其他步骤组
    if (otherSteps.length > 0) {
      groups.push({
        id: 'other-steps',
        name: '其他步骤',
        icon: FileText,
        items: otherSteps.sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)),
        description: '其他编号的步骤'
      });
    }

    // 添加全部组
    groups.unshift({
      id: 'all',
      name: '全部',
      icon: FileText,
      items: [...(problemInfo ? [problemInfo] : []), ...suggestions],
      description: '所有可引用项目'
    });

    return groups;
  };

  const mentionGroups = createMentionGroups();
  const currentGroup = mentionGroups.find(g => g.id === selectedGroup) || mentionGroups[0];
  
  // 过滤当前组的项目
  const filteredItems = currentGroup.items.filter(item => {
    const searchText = query.toLowerCase();
    if ('title' in item) {
      // 这是题目
      return item.title.toLowerCase().includes(searchText) || 
             item.content.toLowerCase().includes(searchText);
    } else {
      // 这是节点
      return item.id.toLowerCase().includes(searchText) ||
             (item.label && item.label.toLowerCase().includes(searchText)) ||
             (item.content && item.content.toLowerCase().includes(searchText));
    }
  });

  // 分页逻辑
  const itemsPerPage = mode === 'latex' ? 5 : 8; // LaTeX模式显示更少项目
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  const currentPageItems = filteredItems.slice(startIndex, endIndex);

  // 重置页面当组改变时
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedGroup, query]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const getItemDisplayName = (item: DagNodeInfo | ProblemInfo): string => {
    if ('title' in item) {
      return `题目: ${item.title}`;
    } else {
      return item.label || item.id;
    }
  };

  const getItemPreview = (item: DagNodeInfo | ProblemInfo): string => {
    if ('title' in item) {
      return item.content.length > 60 ? item.content.substring(0, 57) + '...' : item.content;
    } else {
      return item.content ? 
        (item.content.length > 60 ? item.content.substring(0, 57) + '...' : item.content) :
        '无内容预览';
    }
  };

  return (
    <div className={styles.enhancedSuggestionPanel} ref={containerRef}>
      {/* 分组选择器 */}
      <div className={styles.groupSelector}>
        {mentionGroups.map(group => {
          const IconComponent = group.icon;
          return (
            <button
              key={group.id}
              className={`${styles.groupButton} ${selectedGroup === group.id ? styles.activeGroup : ''}`}
              onClick={() => setSelectedGroup(group.id)}
              title={group.description}
            >
              <IconComponent size={14} />
              <span>{group.name}</span>
              <span className={styles.itemCount}>({group.items.length})</span>
            </button>
          );
        })}
      </div>

      {/* 当前分组信息 */}
      <div className={styles.groupInfo}>
        <span className={styles.groupDescription}>{currentGroup.description}</span>
        {totalPages > 1 && (
          <span className={styles.pageInfo}>
            第 {currentPage + 1} 页，共 {totalPages} 页
          </span>
        )}
      </div>

      {/* 项目列表 */}
      <div className={styles.itemsList}>
        {currentPageItems.length === 0 ? (
          <div className={styles.noResults}>
            没有找到匹配的项目
          </div>
        ) : (
          currentPageItems.map((item, index) => {
            const globalIndex = startIndex + index;
            const isActive = globalIndex === activeSuggestionIndex;
            const IconComponent = 'title' in item ? Target : Hash;
            
            return (
              <div
                key={('title' in item) ? `problem-${item.id}` : `node-${item.id}`}
                className={`${styles.suggestionItem} ${isActive ? styles.activeSuggestion : ''}`}
                onClick={() => onSelectNode(item)}
              >
                <div className={styles.itemHeader}>
                  <IconComponent size={16} className={styles.itemIcon} />
                  <span className={styles.itemName}>{getItemDisplayName(item)}</span>
                  {'stepNumber' in item && item.stepNumber && (
                    <span className={styles.stepBadge}>#{item.stepNumber}</span>
                  )}
                </div>
                <div className={styles.itemPreview}>
                  {getItemPreview(item)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页控制器 */}
      {totalPages > 1 && (
        <div className={styles.paginationControls}>
          <button
            className={styles.pageButton}
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            title="上一页"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className={styles.pageIndicators}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${styles.pageIndicator} ${i === currentPage ? styles.activePage : ''}`}
                onClick={() => setCurrentPage(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <button
            className={styles.pageButton}
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            title="下一页"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 使用提示 */}
      <div className={styles.usageHint}>
        <span>💡 使用方向键导航，回车选择，ESC关闭</span>
      </div>
    </div>
  );
};

export default EnhancedMentionSuggestions; 