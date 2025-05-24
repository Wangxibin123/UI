import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './AIAssistantDemo.module.css';

interface AIAssistantDemoProps {
  isActive?: boolean;
  onToggle?: () => void;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  mathContent: string;
  aiResponse: string;
  isCompleted: boolean;
  isActive: boolean;
}

const AIAssistantDemo: React.FC<AIAssistantDemoProps> = ({
  isActive = false,
  onToggle
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([
    {
      id: 'step-1',
      title: '问题理解',
      description: 'AI首先分析数学问题的类型和结构',
      mathContent: '解方程：$x^2 + 5x + 6 = 0$',
      aiResponse: '这是一个二次方程。我将使用因式分解方法来解决这个问题。',
      isCompleted: false,
      isActive: true,
    },
    {
      id: 'step-2',
      title: '策略选择',
      description: 'AI选择最适合的解题策略',
      mathContent: '寻找两个数，使得它们的乘积为6，和为5',
      aiResponse: '我需要找到两个数字，它们相乘等于6，相加等于5。这两个数字是2和3。',
      isCompleted: false,
      isActive: false,
    },
    {
      id: 'step-3',
      title: '步骤执行',
      description: 'AI执行具体的数学运算',
      mathContent: '$(x + 2)(x + 3) = 0$',
      aiResponse: '因式分解：$(x + 2)(x + 3) = x^2 + 3x + 2x + 6 = x^2 + 5x + 6$',
      isCompleted: false,
      isActive: false,
    },
    {
      id: 'step-4',
      title: '解答验证',
      description: 'AI验证解答的正确性',
      mathContent: '$x_1 = -2, x_2 = -3$',
      aiResponse: '验证：将$x = -2$代入原方程：$(-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0$ ✓',
      isCompleted: false,
      isActive: false,
    },
  ]);

  const [currentAIMessage, setCurrentAIMessage] = useState('');
  const [showTypewriter, setShowTypewriter] = useState(false);

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentStepIndex(0);
    toast.info('🤖 AI数学助手演示开始！');
    
    setDemoSteps(prev => prev.map((step, index) => ({
      ...step,
      isActive: index === 0,
      isCompleted: false,
    })));
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setCurrentAIMessage('');
    setShowTypewriter(false);
    
    setDemoSteps(prev => prev.map((step, index) => ({
      ...step,
      isActive: index === 0,
      isCompleted: false,
    })));
    
    toast.info('🔄 演示已重置');
  };

  if (!isActive) {
    return (
      <div className={styles.demoToggle}>
        <button 
          className={styles.toggleButton}
          onClick={onToggle}
          title="查看AI助手演示"
        >
          🤖 AI演示
        </button>
      </div>
    );
  }

  return (
    <div className={styles.demoContainer}>
      <div className={styles.header}>
        <h3>🤖 AI数学助手 - 智能求解演示</h3>
        <button className={styles.closeButton} onClick={onToggle}>✕</button>
      </div>

      <div className={styles.content}>
        <div className={styles.controlPanel}>
          <div className={styles.controls}>
            <button 
              className={styles.controlButton}
              onClick={startDemo}
              disabled={isPlaying}
            >
              {isPlaying ? '⏸️ 播放中' : '▶️ 开始演示'}
            </button>
            
            <button 
              className={styles.controlButton}
              onClick={resetDemo}
            >
              🔄 重置
            </button>
          </div>
          
          <div className={styles.progressBar}>
            <div 
              className={styles.progress}
              style={{ width: `${(currentStepIndex / demoSteps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.stepsList}>
          {demoSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`${styles.stepItem} ${
                step.isActive ? styles.active : ''
              } ${step.isCompleted ? styles.completed : ''}`}
            >
              <div className={styles.stepNumber}>
                {step.isCompleted ? '✅' : step.isActive ? '🔄' : index + 1}
              </div>
              
              <div className={styles.stepContent}>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
                
                <div className={styles.mathDisplay}>
                  {step.mathContent}
                </div>
                
                {step.isCompleted && (
                  <div className={styles.aiResponse}>
                    <div className={styles.aiAvatar}>🤖</div>
                    <div className={styles.aiMessage}>
                      {step.aiResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.features}>
          <h4>🌟 AI助手核心功能</h4>
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🧮</span>
              <span>智能识别题型</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>💡</span>
              <span>最优策略选择</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>⚡</span>
              <span>实时步骤引导</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>✅</span>
              <span>自动答案验证</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantDemo; 