import React, { useState, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, Clock, MessageSquare, Eye, EyeOff, Send, 
  Lightbulb, TrendingUp, CheckCircle, AlertCircle,
  Filter, Search, Calendar, User, Zap, Star,
  ChevronRight, ChevronDown, Copy, Download
} from 'lucide-react';
import Latex from 'react-latex-next';
import styles from './ModernInterpretationView.module.css';
import { InterpretationEntry } from '../../../types';

interface ModernInterpretationViewProps {
  interpretationEntries: InterpretationEntry[];
  onBack: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<InterpretationEntry>) => void;
}

const ModernInterpretationView: React.FC<ModernInterpretationViewProps> = ({
  interpretationEntries,
  onBack,
  onUpdateEntry,
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    interpretationEntries.length > 0 ? interpretationEntries[0].id : null
  );
  const [teacherReply, setTeacherReply] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'replied'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedSections, setExpandedSections] = useState({
    analytics: true,
    filters: false,
    quickActions: false,
  });

  const selectedEntry = interpretationEntries.find(entry => entry.id === selectedEntryId);

  // 过滤和搜索逻辑
  const filteredEntries = interpretationEntries.filter(entry => {
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    const matchesSearch = !searchQuery || 
      entry.userIdea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.stepNumber.toString().includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // 统计数据
  const stats = {
    total: interpretationEntries.length,
    pending: interpretationEntries.filter(e => e.status === 'pending').length,
    reviewed: interpretationEntries.filter(e => e.status === 'reviewed').length,
    replied: interpretationEntries.filter(e => e.status === 'replied').length,
    avgResponseTime: '2.3小时', // 模拟数据
    satisfaction: '94%', // 模拟数据
  };

  const handleEntrySelect = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    setTeacherReply('');
    setShowPreview(false);
  }, []);

  const handleSendReply = useCallback(() => {
    if (!selectedEntry || !teacherReply.trim()) return;

    onUpdateEntry(selectedEntry.id, {
      teacherFeedback: teacherReply.trim(),
      status: 'replied',
      teacherReplyTimestamp: new Date(),
    });

    setTeacherReply('');
    setShowPreview(false);
  }, [selectedEntry, teacherReply, onUpdateEntry]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { 
        icon: <AlertCircle size={12} />, 
        text: '待反馈', 
        className: styles.pendingBadge 
      },
      reviewed: { 
        icon: <Eye size={12} />, 
        text: '已查看', 
        className: styles.reviewedBadge 
      },
      replied: { 
        icon: <CheckCircle size={12} />, 
        text: '已回复', 
        className: styles.repliedBadge 
      },
    };
    
    const config = configs[status as keyof typeof configs];
    if (!config) return null;

    return (
      <span className={`${styles.statusBadge} ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    return `${Math.floor(diffInMinutes / 1440)}天前`;
  };

  return (
    <div className={styles.container}>
      {/* 现代化标题栏 */}
      <div className={styles.modernHeader}>
        <div className={styles.headerLeft}>
          <button onClick={onBack} className={styles.backButton}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>思路解读管理</h1>
            <p className={styles.subtitle}>智能分析学生思维过程，提供个性化指导</p>
          </div>
        </div>
        
        {/* 实时统计卡片 */}
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <TrendingUp className={styles.statIcon} />
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats.total}</span>
              <span className={styles.statLabel}>总计</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Clock className={styles.statIcon} />
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats.pending}</span>
              <span className={styles.statLabel}>待处理</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Star className={styles.statIcon} />
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats.satisfaction}</span>
              <span className={styles.statLabel}>满意度</span>
            </div>
          </div>
        </div>
      </div>

      {/* 智能分析面板 */}
      <div className={styles.analyticsPanel}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('analytics')}
        >
          <div className={styles.sectionTitle}>
            <Zap size={16} />
            <span>智能分析洞察</span>
          </div>
          {expandedSections.analytics ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        
        {expandedSections.analytics && (
          <div className={styles.analyticsContent}>
            <div className={styles.insightCards}>
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <Lightbulb className={styles.insightIcon} />
                  <span>热点问题</span>
                </div>
                <p>代数运算错误占比较高</p>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <TrendingUp className={styles.insightIcon} />
                  <span>改进趋势</span>
                </div>
                <p>逻辑推理能力显著提升</p>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <User className={styles.insightIcon} />
                  <span>学习风格</span>
                </div>
                <p>偏向视觉化理解方式</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.mainContent}>
        {/* 现代化侧边栏 */}
        <div className={styles.modernSidebar}>
          {/* 搜索和过滤器 */}
          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="搜索思路解读..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterButtons}>
              {(['all', 'pending', 'reviewed', 'replied'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`${styles.filterButton} ${filterStatus === status ? styles.active : ''}`}
                >
                  {status === 'all' ? '全部' : 
                   status === 'pending' ? '待处理' :
                   status === 'reviewed' ? '已查看' : '已回复'}
                </button>
              ))}
            </div>
          </div>

          {/* 条目列表 */}
          <div className={styles.entriesList}>
            {filteredEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={32} className={styles.emptyIcon} />
                <p>没有找到匹配的思路解读</p>
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`${styles.entryCard} ${selectedEntryId === entry.id ? styles.selected : ''}`}
                  onClick={() => handleEntrySelect(entry.id)}
                >
                  <div className={styles.entryHeader}>
                    <div className={styles.stepInfo}>
                      <span className={styles.stepNumber}>步骤 {entry.stepNumber}</span>
                      {getStatusBadge(entry.status)}
                    </div>
                    <span className={styles.timeAgo}>{getTimeAgo(entry.timestamp)}</span>
                  </div>
                  
                  <div className={styles.entryPreview}>
                    {entry.userIdea.length > 80 
                      ? `${entry.userIdea.substring(0, 80)}...` 
                      : entry.userIdea}
                  </div>
                  
                  <div className={styles.entryMeta}>
                    <Clock size={12} />
                    <span>{formatDateTime(entry.timestamp)}</span>
                    {entry.teacherFeedback && (
                      <span className={styles.repliedIndicator}>已回复</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 现代化详情面板 */}
        <div className={styles.modernDetailPanel}>
          {selectedEntry ? (
            <div className={styles.detailContent}>
              {/* 步骤内容展示 */}
              <div className={styles.stepSection}>
                <div className={styles.sectionHeader}>
                  <h3>步骤内容</h3>
                  <div className={styles.sectionActions}>
                    <button className={styles.actionBtn}>
                      <Copy size={14} />
                    </button>
                    <button className={styles.actionBtn}>
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.latexContainer}>
                  <Latex>{selectedEntry.stepLatexContent}</Latex>
                </div>
              </div>

              {/* 学生思路解读 */}
              <div className={styles.ideaSection}>
                <div className={styles.sectionHeader}>
                  <h3>学生思路解读</h3>
                  <span className={styles.timestamp}>
                    {formatDateTime(selectedEntry.timestamp)}
                  </span>
                </div>
                <div className={styles.ideaContent}>
                  <Latex>{selectedEntry.userIdea}</Latex>
                </div>
              </div>

              {/* 教师反馈区域 */}
              <div className={styles.feedbackSection}>
                <div className={styles.sectionHeader}>
                  <h3>教师反馈</h3>
                  {selectedEntry.teacherReplyTimestamp && (
                    <span className={styles.timestamp}>
                      {formatDateTime(selectedEntry.teacherReplyTimestamp)}
                    </span>
                  )}
                </div>
                
                {selectedEntry.teacherFeedback ? (
                  <div className={styles.existingFeedback}>
                    <Latex>{selectedEntry.teacherFeedback}</Latex>
                  </div>
                ) : (
                  <div className={styles.noFeedback}>暂无教师反馈</div>
                )}
              </div>

              {/* 现代化回复界面 */}
              <div className={styles.replySection}>
                <div className={styles.replyHeader}>
                  <h3>回复学生</h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={styles.previewToggle}
                  >
                    {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showPreview ? '编辑' : '预览'}
                  </button>
                </div>
                
                <div className={styles.replyInterface}>
                  {showPreview ? (
                    <div className={styles.previewArea}>
                      {teacherReply ? (
                        <Latex>{teacherReply}</Latex>
                      ) : (
                        <div className={styles.emptyPreview}>输入内容将在此预览...</div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={teacherReply}
                      onChange={(e) => setTeacherReply(e.target.value)}
                      placeholder="在此输入您的反馈，支持LaTeX语法..."
                      className={styles.replyTextarea}
                      rows={4}
                    />
                  )}
                  
                  <div className={styles.replyActions}>
                    <div className={styles.actionTips}>
                      <span>💡 支持LaTeX语法</span>
                      <span>🎯 建议提供具体指导</span>
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!teacherReply.trim()}
                      className={styles.sendReplyBtn}
                    >
                      <Send size={16} />
                      发送回复
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noSelection}>
              <Lightbulb size={64} className={styles.noSelectionIcon} />
              <h3>选择一个思路解读条目</h3>
              <p>从左侧列表选择条目开始查看和回复</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernInterpretationView; 