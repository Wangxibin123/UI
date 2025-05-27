import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import EnhancedMentionSuggestions from './EnhancedMentionSuggestions';
import styles from './EnhancedMentionDemo.module.css';

interface EnhancedMentionDemoProps {
  isVisible: boolean;
  onClose: () => void;
}

const EnhancedMentionDemo: React.FC<EnhancedMentionDemoProps> = ({
  isVisible,
  onClose
}) => {
  const [selectedMode, setSelectedMode] = useState<'latex' | 'analysis' | 'summary'>('analysis');

  // 模拟数据
  const mockProblemInfo = {
    id: 'problem-1',
    title: '求解二次方程',
    content: '解方程 $x^2 + 5x + 6 = 0$，并求出所有实数解。'
  };

  const mockSuggestions = [
    {
      id: 'step-1',
      label: '步骤 1',
      content: '将二次方程写成标准形式 $ax^2 + bx + c = 0$',
      stepNumber: 1
    },
    {
      id: 'step-2',
      label: '步骤 2',
      content: '识别系数：$a = 1$, $b = 5$, $c = 6$',
      stepNumber: 2
    },
    {
      id: 'step-3',
      label: '步骤 3',
      content: '应用因式分解法：寻找两个数，它们的乘积是6，和是5',
      stepNumber: 3
    },
    {
      id: 'step-4',
      label: '步骤 4',
      content: '找到数字2和3：$2 \\times 3 = 6$，$2 + 3 = 5$',
      stepNumber: 4
    },
    {
      id: 'step-5',
      label: '步骤 5',
      content: '将方程因式分解：$(x + 2)(x + 3) = 0$',
      stepNumber: 5
    },
    {
      id: 'step-6',
      label: '步骤 6',
      content: '求解每个因子：$x + 2 = 0$ 或 $x + 3 = 0$',
      stepNumber: 6
    },
    {
      id: 'step-7',
      label: '步骤 7',
      content: '得到解：$x = -2$ 或 $x = -3$',
      stepNumber: 7
    },
    {
      id: 'step-8',
      label: '步骤 8',
      content: '验证解的正确性',
      stepNumber: 8
    },
    {
      id: 'step-9',
      label: '步骤 9',
      content: '用二次公式验证：$x = \\frac{-5 \\pm \\sqrt{25-24}}{2}$',
      stepNumber: 9
    },
    {
      id: 'step-10',
      label: '步骤 10',
      content: '计算：$x = \\frac{-5 \\pm 1}{2}$',
      stepNumber: 10
    },
    {
      id: 'step-11',
      label: '步骤 11',
      content: '最终解：$x = -2$ 或 $x = -3$（与因式分解结果一致）',
      stepNumber: 11
    },
  ];

  const handleNodeSelect = (node: any) => {
    console.log('选择了节点:', node);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.demoOverlay}>
      <div className={styles.demoContainer}>
        <div className={styles.demoHeader}>
          <div className={styles.headerLeft}>
            <Lightbulb className={styles.demoIcon} />
            <span className={styles.demoTitle}>增强@逻辑功能演示</span>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.demoContent}>
          <div className={styles.modeSelector}>
            <span className={styles.modeLabel}>模式:</span>
            {(['analysis', 'latex', 'summary'] as const).map(mode => (
              <button
                key={mode}
                className={`${styles.modeButton} ${selectedMode === mode ? styles.activeModeButton : ''}`}
                onClick={() => setSelectedMode(mode)}
              >
                {mode === 'analysis' ? '分析' : mode === 'latex' ? 'LaTeX' : '总结'}
              </button>
            ))}
          </div>

          <div className={styles.description}>
            <h3>功能特点：</h3>
            <ul>
              <li><strong>智能分组</strong>：支持@1-8、@9-11、@题目、@其他步骤等分组</li>
              <li><strong>分页显示</strong>：LaTeX模式显示5项/页，其他模式8项/页</li>
              <li><strong>搜索过滤</strong>：支持按内容、标题、ID搜索</li>
              <li><strong>题目引用</strong>：可以直接引用原题目内容</li>
              <li><strong>步骤预览</strong>：显示每个步骤的内容预览</li>
            </ul>
          </div>

          <div className={styles.suggestionDemo}>
            <div className={styles.suggestionWrapper}>
              <EnhancedMentionSuggestions
                suggestions={mockSuggestions}
                problemInfo={mockProblemInfo}
                activeSuggestionIndex={0}
                onSelectNode={handleNodeSelect}
                query=""
                mode={selectedMode}
              />
            </div>
          </div>

          <div className={styles.instructions}>
            <h4>使用说明：</h4>
            <ol>
              <li>在AI对话框中输入<code>@</code>符号即可触发增强@逻辑</li>
              <li>点击顶部分组按钮可以切换不同的项目组</li>
              <li>使用底部分页控制器浏览更多项目</li>
              <li>在不同模式下，分页显示项目数量会有所不同</li>
              <li>支持键盘导航：方向键选择，回车确认，ESC关闭</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMentionDemo; 