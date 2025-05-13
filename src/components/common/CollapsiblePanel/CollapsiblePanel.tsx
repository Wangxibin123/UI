import React, { useState } from 'react'; // useState for future collapse/expand
import styles from './CollapsiblePanel.module.css';

// Placeholder icons for panel controls
const MinimizeIcon = () => <span>_</span>;
const MaximizeIcon = () => <span>□</span>;
const CloseIcon = () => <span>X</span>;

interface CollapsiblePanelProps {
  title: string;
  headerStyle?: string; // To pass specific header background styles e.g., styles.latexHeader
  children?: React.ReactNode; // For expanded content
  previewTextWhenCollapsed: string;
  statusTextWhenCollapsed?: string;
  initialCollapsed?: boolean;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  headerStyle = '',
  children,
  previewTextWhenCollapsed,
  statusTextWhenCollapsed,
  initialCollapsed = true, // Default to collapsed for Scene 1
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const handleHeaderClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={styles.panel}>
      <div
        className={`${styles.header} ${headerStyle}`}
        onClick={handleHeaderClick}
      >
        <span className={styles.title}>{title}</span>
        <div className={styles.controls}>
          <button onClick={(e) => { e.stopPropagation(); /* Add specific minimize logic later */ }} aria-label="最小化"><MinimizeIcon /></button>
          <button onClick={(e) => { e.stopPropagation(); /* Add specific maximize logic later */ }} aria-label="最大化"><MaximizeIcon /></button>
          <button onClick={(e) => { e.stopPropagation(); /* Add specific close logic later */ }} aria-label="关闭"><CloseIcon /></button>
        </div>
      </div>
      {isCollapsed ? (
        <div className={styles.content}>
          <p className={styles.previewText}>{previewTextWhenCollapsed}</p>
          {statusTextWhenCollapsed && (
            <p className={styles.statusIndicator}>{statusTextWhenCollapsed}</p>
          )}
        </div>
      ) : (
        /* If there are no children, perhaps show a default "No content" message or an empty div */
        children ? <div className={styles.content}>{children}</div> : <div className={styles.content}></div>
      )}
    </div>
  );
};

export default CollapsiblePanel; 