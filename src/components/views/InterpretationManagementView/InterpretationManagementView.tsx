import React, { useState, useCallback } from 'react';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, Eye, EyeOff, Send } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { InterpretationEntry } from '../../../types';
import styles from './InterpretationManagementView.module.css';

interface InterpretationManagementViewProps {
  interpretationEntries: InterpretationEntry[];
  onBack: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<InterpretationEntry>) => void;
}

const InterpretationManagementView: React.FC<InterpretationManagementViewProps> = ({
  interpretationEntries,
  onBack,
  onUpdateEntry,
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    interpretationEntries.length > 0 ? interpretationEntries[0].id : null
  );
  const [teacherReply, setTeacherReply] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const selectedEntry = interpretationEntries.find(entry => entry.id === selectedEntryId);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className={`${styles.statusBadge} ${styles.pending}`}>待反馈</span>;
      case 'reviewed':
        return <span className={`${styles.statusBadge} ${styles.reviewed}`}>已查看</span>;
      case 'replied':
        return <span className={`${styles.statusBadge} ${styles.replied}`}>已回复</span>;
      default:
        return null;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const stats = {
    total: interpretationEntries.length,
    pending: interpretationEntries.filter(e => e.status === 'pending').length,
    reviewed: interpretationEntries.filter(e => e.status === 'reviewed').length,
    replied: interpretationEntries.filter(e => e.status === 'replied').length,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={onBack} className={styles.backButton}>
            <ArrowLeft size={20} />
          </button>
          <h1 className={styles.title}>思路解读管理</h1>
        </div>
        <div className={styles.stats}>
          <span className={styles.statItem}>总计: {stats.total}</span>
          <span className={styles.statItem}>待处理: {stats.pending}</span>
          <span className={styles.statItem}>已回复: {stats.replied}</span>
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Sidebar - Entry List */}
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>思路解读列表</h3>
          <div className={styles.entryList}>
            {interpretationEntries.map(entry => (
              <div
                key={entry.id}
                className={`${styles.entryItem} ${selectedEntryId === entry.id ? styles.selected : ''}`}
                onClick={() => handleEntrySelect(entry.id)}
              >
                <div className={styles.entryHeader}>
                  <span className={styles.stepNumber}>步骤 {entry.stepNumber}</span>
                  {getStatusBadge(entry.status)}
                </div>
                <div className={styles.entryPreview}>
                  {entry.userIdea.length > 50 
                    ? `${entry.userIdea.substring(0, 50)}...` 
                    : entry.userIdea}
                </div>
                <div className={styles.entryTime}>
                  <Clock size={12} />
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Area */}
        <div className={styles.detailArea}>
          {selectedEntry ? (
            <>
              {/* Step Content Section */}
              <div className={styles.stepSection}>
                <h3 className={styles.sectionTitle}>步骤内容</h3>
                <div className={styles.stepContent}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNumber}>步骤 {selectedEntry.stepNumber}</span>
                  </div>
                  <div className={styles.latexContent}>
                    <Latex>{selectedEntry.stepLatexContent}</Latex>
                  </div>
                </div>
              </div>

              {/* User Idea Section */}
              <div className={styles.ideaSection}>
                <h3 className={styles.sectionTitle}>学生思路解读</h3>
                <div className={styles.ideaContent}>
                  <Latex>{selectedEntry.userIdea}</Latex>
                </div>
                <div className={styles.ideaTime}>
                  提交时间: {formatDateTime(selectedEntry.timestamp)}
                </div>
              </div>

              {/* Teacher Feedback Section */}
              <div className={styles.feedbackSection}>
                <h3 className={styles.sectionTitle}>教师反馈</h3>
                {selectedEntry.teacherFeedback ? (
                  <div className={styles.existingFeedback}>
                    <div className={styles.feedbackContent}>
                      <Latex>{selectedEntry.teacherFeedback}</Latex>
                    </div>
                    <div className={styles.feedbackTime}>
                      回复时间: {selectedEntry.teacherReplyTimestamp ? formatDateTime(selectedEntry.teacherReplyTimestamp) : ''}
                    </div>
                  </div>
                ) : (
                  <div className={styles.noFeedback}>暂无教师反馈</div>
                )}
              </div>

              {/* Chat Interface for Teacher Reply */}
              <div className={styles.chatSection}>
                <h3 className={styles.sectionTitle}>
                  <MessageSquare size={18} />
                  回复学生
                </h3>
                <div className={styles.chatInput}>
                  <div className={styles.inputHeader}>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={styles.previewToggle}
                      title={showPreview ? "隐藏预览" : "显示预览"}
                    >
                      {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showPreview ? "隐藏预览" : "显示预览"}
                    </button>
                  </div>
                  
                  <div className={styles.inputContainer}>
                    <textarea
                      value={teacherReply}
                      onChange={(e) => setTeacherReply(e.target.value)}
                      placeholder="在此输入您的反馈，支持LaTeX语法..."
                      className={styles.textarea}
                      rows={4}
                    />
                    
                    {showPreview && (
                      <div className={styles.previewContainer}>
                        <div className={styles.previewLabel}>预览:</div>
                        <div className={styles.previewContent}>
                          {teacherReply ? (
                            <Latex>{teacherReply}</Latex>
                          ) : (
                            <span className={styles.emptyPreview}>输入内容将在此预览...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.chatActions}>
                    <button
                      onClick={handleSendReply}
                      disabled={!teacherReply.trim()}
                      className={styles.sendButton}
                    >
                      <Send size={16} />
                      发送回复
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <MessageSquare size={48} />
              <p>请从左侧选择一个思路解读条目</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterpretationManagementView; 