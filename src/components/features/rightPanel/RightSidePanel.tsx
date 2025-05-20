import React from 'react';
import { Sigma, Brain, AlignLeft } from 'lucide-react';
import styles from './RightSidePanel.module.css';
import { CopilotMode } from '../ai/AICopilotPanel/AICopilotPanel';

interface RightSidePanelProps {
  currentMode: CopilotMode;
  onModeChange: (mode: CopilotMode) => void;
  className?: string;
  isChatActive?: boolean;
}

const modeDetails: Record<CopilotMode, { Icon: React.ElementType, title: string, description: string }> = {
  latex: { Icon: Sigma, title: 'LaTeX 格式化', description: '快速将数学公式、代码或文本转换为规范的 LaTeX 格式。' },
  analysis: { Icon: Brain, title: '解析分析', description: '深入分析代码、解释复杂概念、提供步骤化解决方案。' },
  summary: { Icon: AlignLeft, title: '总结归纳', description: '从长文本、对话或代码中提取核心要点，生成简洁摘要。' },
};

const RightSidePanel: React.FC<RightSidePanelProps> = ({
  currentMode,
  onModeChange,
  className,
  isChatActive,
}) => {
  return (
    <div className={`${styles.rightSidePanelContainer} ${className || ''}`}>
      <div className={styles.quickModeSwitcher}>
        {(Object.keys(modeDetails) as CopilotMode[]).map((modeKey) => {
          const { Icon, title } = modeDetails[modeKey];
          return (
            <button 
              key={modeKey}
              title={title}
              className={`${styles.quickModeButton} ${currentMode === modeKey ? styles.activeQuickModeButton : ''}`}
              onClick={() => onModeChange(modeKey)}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>
      
      {/* --- MODIFICATION START: Conditional Rendering --- */}
      {!isChatActive && (
        <div className={styles.modeFunctionPanelsContainer}>
          {(Object.keys(modeDetails) as CopilotMode[]).map((modeKey) => {
            const { Icon, title, description } = modeDetails[modeKey];
            return (
              <div 
                key={`${modeKey}-panel`}
                className={`${styles.modeFunctionPanelItem} ${currentMode === modeKey ? styles.activeModeFunctionPanel : ''}`}
                onClick={() => onModeChange(modeKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onModeChange(modeKey); }}
              >
                <div className={styles.modePanelHeader}>
                  <Icon size={22} className={styles.modePanelIcon} />
                  <h4 className={styles.modePanelTitle}>{title}</h4>
                </div>
                <p className={styles.modePanelDescription}>{description}</p>
                {/* Future: Add mode-specific content or controls here */}
              </div>
            );
          })}
        </div>
      )}
      {/* --- MODIFICATION END: Conditional Rendering --- */}
    </div>
  );
};

export default RightSidePanel; 