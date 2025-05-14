import React from 'react';
import { useReactFlow, Panel } from '@reactflow/core';
import styles from './ControlBar.module.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Expand, Minimize2 } from 'lucide-react';

interface ControlBarProps {
  isDagCollapsed: boolean;
  onToggleCollapse: () => void;
  // No need for zoom/fitview props anymore, as we'll use the hook
}

const ControlBar: React.FC<ControlBarProps> = ({ isDagCollapsed, onToggleCollapse }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFitView = () => fitView({ duration: 300, padding: 0.1 });

  return (
    <Panel position="top-left" className={styles.controlBarContainer}>
      <button onClick={onToggleCollapse} className={styles.iconButton} title={isDagCollapsed ? "展开DAG区域" : "收起DAG区域"}>
        {isDagCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className={styles.title}>{!isDagCollapsed && "DAG 控制与概览"}</div>
      {!isDagCollapsed && (
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
    </Panel>
  );
};

export default ControlBar; 