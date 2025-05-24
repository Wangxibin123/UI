import React, { ForwardRefExoticComponent, RefAttributes } from 'react';
import styles from './ModeCardsPanel.module.css';
import { Sigma, Brain, AlignLeft, LucideProps } from 'lucide-react';
import { CopilotMode } from '../AICopilotPanel/AICopilotPanel'; // Re-use from AICopilotPanel

// Define the type for Lucide icons more precisely
// Lucide icons are ForwardRefExoticComponent that take LucideProps (excluding ref) and have an SVGSVGElement ref.
export type LucideIconType = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

// Define a consistent structure for mode details, including descriptions from the image
export const modeCardDetails: Record<CopilotMode, { name: string; description: string; Icon: LucideIconType }> = {
  latex: {
    name: 'LaTeX 格式化',
    description: '快速将数学公式、代码或文本转换为规范的 LaTeX 格式。',
    Icon: Sigma,
  },
  analysis: {
    name: '解析分析',
    description: '深入分析代码、解释复杂概念、提供步骤化解决方案。',
    Icon: Brain,
  },
  summary: {
    name: '总结归纳',
    description: '从长文本、对话或代码中提取核心要点，生成简洁摘要。',
    Icon: AlignLeft,
  },
};

interface ModeCardsPanelProps {
  currentMode: CopilotMode;
  onModeSelect: (mode: CopilotMode) => void;
  // isVisible might not be needed if MainLayout controls rendering directly
}

const ModeCardsPanel: React.FC<ModeCardsPanelProps> = ({ currentMode, onModeSelect }) => {
  return (
    <div className={styles.modeCardsPanelContainer}>
      {(Object.keys(modeCardDetails) as CopilotMode[]).map((modeId) => {
        const card = modeCardDetails[modeId];
        return (
          <div
            key={modeId}
            className={`${styles.modeCard} ${currentMode === modeId ? styles.activeCard : ''}`}
            onClick={() => onModeSelect(modeId)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onModeSelect(modeId)} // Accessibility
          >
            <div className={styles.cardHeader}>
              <card.Icon size={22} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>{card.name}</h3>
            </div>
            <p className={styles.cardDescription}>{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};

export default ModeCardsPanel; 