import React from 'react';
import { useReactFlow } from '@reactflow/core';
import styles from './ControlBar.module.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Expand, Minimize2, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { LayoutMode } from '../../../../types';

interface ControlBarProps {
  isDagCollapsed: boolean;
  onToggleCollapse: () => void;
  currentLayoutMode: LayoutMode;
  onExpandDagFully: () => void;
  onActivateAiPanel: () => void;
  isAiCopilotPanelOpen?: boolean;
  onToggleAiCopilotPanel?: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  isDagCollapsed,
  onToggleCollapse,
  currentLayoutMode,
  onExpandDagFully,
  onActivateAiPanel,
  isAiCopilotPanelOpen,
  onToggleAiCopilotPanel,
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFitView = () => fitView({ duration: 300, padding: 0.1 });

  const showDetailedControls =
    currentLayoutMode === LayoutMode.DEFAULT_THREE_COLUMN ||
    currentLayoutMode === LayoutMode.DAG_EXPANDED_FULL;

  const isDagFullyExpandedMode = currentLayoutMode === LayoutMode.DAG_EXPANDED_FULL;
  const isAiPanelActiveMode = currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE;
  const isDagCollapsedSimpleMode = currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE;

  const panelClassName = `${styles.controlBarContainer} ${!showDetailedControls ? styles.compactMode : ''}`.trim();

  return (
    <div className={panelClassName}>
      <button 
        onClick={onToggleCollapse} 
        className={styles.iconButton} 
        title={isDagCollapsed ? "展开视图" : "收起侧栏"}
      >
        {isDagCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {showDetailedControls && <div className={styles.title}>DAG 控制与概览</div>}

      <button
        onClick={onExpandDagFully}
        className={`${styles.iconButton} ${isDagFullyExpandedMode ? styles.activeButton : ''}`}
        title={isDagFullyExpandedMode ? "恢复默认视图" : "全屏展示DAG"}
      >
        {isDagFullyExpandedMode ? <Minimize2 size={18}/> : <Expand size={18} /> }
      </button>

      <button
        onClick={onActivateAiPanel}
        className={`${styles.iconButton} ${isAiPanelActiveMode ? styles.activeButton : ''}`}
        title={isAiPanelActiveMode ? "退出AI助手视图" : "进入AI助手视图"}
      >
        <Sparkles size={18} className={isAiPanelActiveMode ? styles.activeIcon : ''}/>
      </button>

      {onToggleAiCopilotPanel && (
        <button
          onClick={onToggleAiCopilotPanel}
          className={`${styles.iconButton} ${isAiCopilotPanelOpen ? styles.activeButton : ''}`}
          title={isAiCopilotPanelOpen ? "关闭 AI Copilot" : "打开 AI Copilot"}
        >
          <Bot size={18} className={isAiCopilotPanelOpen ? styles.activeIcon : ''}/>
        </button>
      )}

      {showDetailedControls && (
        <div className={styles.zoomControls}>
          <button onClick={handleZoomIn} className={styles.iconButton} title="放大">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} className={styles.iconButton} title="缩小">
            <ZoomOut size={18} />
          </button>
          <button onClick={handleFitView} className={styles.iconButton} title="适应屏幕">
            <Minimize2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlBar; 