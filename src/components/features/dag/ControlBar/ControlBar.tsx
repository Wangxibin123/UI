import React from 'react';
import styles from './ControlBar.module.css';

// Updated placeholder icons
const ExpandIcon = () => <span className={styles.toggleButtonExpanded}>→</span>; // For collapsed state, shows "Expand"
const CollapseIcon = () => <span className={styles.toggleButtonCollapsed}>⟷</span>; // For expanded state, shows "Collapse"
const PlusIcon = () => <span>+</span>;
const MinusIcon = () => <span>-</span>;

interface ControlBarProps {
  isDagCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({ isDagCollapsed, onToggleCollapse }) => {
  return (
    <div className={styles.controlBar}>
      <button
        className={styles.toggleButton}
        onClick={onToggleCollapse}
        aria-label={isDagCollapsed ? "展开DAG" : "折叠DAG"}
      >
        {isDagCollapsed ? <ExpandIcon /> : <CollapseIcon />}
      </button>
      {!isDagCollapsed && <span className={styles.controlBarTitle}>DAG历史</span>}
      <div className={styles.zoomControls}>
        <button className={styles.zoomButton} aria-label="Zoom In">
          <PlusIcon />
        </button>
        <button className={styles.zoomButton} aria-label="Zoom Out">
          <MinusIcon />
        </button>
      </div>
    </div>
  );
};

export default ControlBar; 