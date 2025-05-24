import React, { useState, useRef, useEffect } from 'react';
import { DagPage } from '../../../../types';
import styles from './DagPageTabs.module.css';

interface DagPageTabsProps {
  pages: DagPage[];
  activePageId: string | null;
  onPageSelect: (pageId: string) => void;
  onAddPage: () => void;
  onClosePage: (pageId: string) => void;
  onRenamePage?: (pageId: string, newName: string) => void; // 🔥 添加重命名回调
  onHighlightPage?: (pageId: string, color: string | null) => void; // 🔥 添加高亮回调
  maxPages: number;
}

const DagPageTabs: React.FC<DagPageTabsProps> = ({
  pages,
  activePageId,
  onPageSelect,
  onAddPage,
  onClosePage,
  onRenamePage,
  onHighlightPage,
  maxPages,
}) => {
  const canAddMore = pages.length < maxPages;
  
  // 🔥 重命名状态管理
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  
  // 🔥 右键菜单状态管理
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pageId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    pageId: null,
  });
  
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 🔥 重命名处理函数
  const handleStartRename = (page: DagPage) => {
    if (!onRenamePage) return;
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleConfirmRename = () => {
    if (editingPageId && editingName.trim() && onRenamePage) {
      onRenamePage(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // 🔥 右键菜单处理函数
  const handleContextMenu = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      pageId,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleHighlight = (color: string | null) => {
    if (contextMenu.pageId && onHighlightPage) {
      onHighlightPage(contextMenu.pageId, color);
    }
    handleCloseContextMenu();
  };

  const handleRenameFromContext = () => {
    if (contextMenu.pageId) {
      const page = pages.find(p => p.id === contextMenu.pageId);
      if (page) {
        handleStartRename(page);
      }
    }
    handleCloseContextMenu();
  };

  // 🔥 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        handleCloseContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible]);

  return (
    <div className={styles.dagPageTabsContainer}>
      <div className={styles.tabsList}>
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`${styles.tab} ${page.id === activePageId ? styles.activeTab : ''}`}
            onClick={() => onPageSelect(page.id)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
            style={{
              borderLeftColor: page.highlightColor || undefined,
              borderLeftWidth: page.highlightColor ? '4px' : undefined,
            }}
          >
            <span className={styles.tabNumber}>{index + 1}</span>
            {/* 🔥 重命名功能：双击编辑或显示标签 */}
            {editingPageId === page.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleConfirmRename}
                onKeyDown={handleKeyDown}
                className={styles.renameInput}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className={styles.tabLabel}
                onDoubleClick={() => handleStartRename(page)}
                title="双击重命名"
              >
                {page.name}
              </span>
            )}
            {pages.length > 1 && (
              <button
                className={styles.closeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onClosePage(page.id);
                }}
                title="关闭页面"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {canAddMore && (
          <button
            className={styles.addTab}
            onClick={onAddPage}
            title="添加新的DAG页面"
          >
            <span className={styles.addIcon}>+</span>
          </button>
        )}
      </div>
      
      <div className={styles.pageInfo}>
        <span className={styles.pageCount}>
          {pages.length}/{maxPages} 页面
        </span>
      </div>
      
      {/* 🔥 右键菜单 */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          <div className={styles.contextMenuItem} onClick={handleRenameFromContext}>
            <span className={styles.contextMenuIcon}>✏️</span>
            重命名
          </div>
          <div className={styles.contextMenuSeparator}></div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight('#ff6b6b')}>
            <span className={styles.contextMenuIcon} style={{ color: '#ff6b6b' }}>●</span>
            红色高亮
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight('#4ecdc4')}>
            <span className={styles.contextMenuIcon} style={{ color: '#4ecdc4' }}>●</span>
            青色高亮
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight('#45b7d1')}>
            <span className={styles.contextMenuIcon} style={{ color: '#45b7d1' }}>●</span>
            蓝色高亮
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight('#96ceb4')}>
            <span className={styles.contextMenuIcon} style={{ color: '#96ceb4' }}>●</span>
            绿色高亮
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight('#feca57')}>
            <span className={styles.contextMenuIcon} style={{ color: '#feca57' }}>●</span>
            黄色高亮
          </div>
          <div className={styles.contextMenuSeparator}></div>
          <div className={styles.contextMenuItem} onClick={() => handleHighlight(null)}>
            <span className={styles.contextMenuIcon}>🚫</span>
            清除高亮
          </div>
        </div>
      )}
    </div>
  );
};

export default DagPageTabs; 