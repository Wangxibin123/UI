import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './WelcomeMessage.module.css';

interface WelcomeMessageProps {
  onClose?: () => void;
  autoShow?: boolean;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  onClose,
  autoShow = false
}) => {
  const [isVisible, setIsVisible] = useState(autoShow);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'intro',
      title: '欢迎使用 AI-MATH',
      subtitle: '智能数学问题解决助手',
      content: '这是一个集成了先进AI技术的数学学习工具，能够帮助您解决各种数学问题，并提供详细的步骤解析。',
      icon: '🧮',
      features: [
        '智能LaTeX数学公式编辑',
        'DAG可视化解题过程',
        'AI实时解题指导',
        '步骤验证与优化建议'
      ]
    },
    {
      id: 'features',
      title: '核心功能介绍',
      subtitle: '让数学学习更智能',
      content: '我们为您提供了三个主要的工作区域，每一个都专为提升您的数学学习体验而设计。',
      icon: '🎯',
      features: [
        'DAG区域：可视化解题过程与步骤关系',
        '求解器区域：编辑问题和解题步骤',
        'AI面板：智能分析与实时指导'
      ]
    },
    {
      id: 'getting-started',
      title: '快速开始',
      subtitle: '三步开启智能学习之旅',
      content: '只需几个简单步骤，您就可以开始使用我们的AI数学助手来解决问题。',
      icon: '🚀',
      features: [
        '1. 在问题块中输入您的数学问题',
        '2. 添加解题步骤，AI会实时验证',
        '3. 查看DAG图了解解题思路结构',
        '4. 使用AI助手获得智能建议'
      ]
    }
  ];

  useEffect(() => {
    if (autoShow) {
      const hasSeenWelcome = localStorage.getItem('ai-math-welcome-seen');
      if (!hasSeenWelcome) {
        setIsVisible(true);
      }
    }
  }, [autoShow]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ai-math-welcome-seen', 'true');
    if (onClose) {
      onClose();
    }
    toast.success('🎉 欢迎使用 AI-MATH！开始您的智能数学之旅吧！');
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const handleStartNow = () => {
    toast.info('🎯 让我们开始解决数学问题吧！');
    handleClose();
  };

  if (!isVisible) {
    return null;
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <button className={styles.closeButton} onClick={handleClose}>
          ✕
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.icon}>{currentSlideData.icon}</div>
            <h1 className={styles.title}>{currentSlideData.title}</h1>
            <h2 className={styles.subtitle}>{currentSlideData.subtitle}</h2>
          </div>

          <div className={styles.body}>
            <p className={styles.description}>
              {currentSlideData.content}
            </p>

            <div className={styles.features}>
              {currentSlideData.features.map((feature, index) => (
                <div key={index} className={styles.featureItem}>
                  <span className={styles.featureBullet}>•</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.navigation}>
            <div className={styles.slideIndicators}>
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${
                    index === currentSlide ? styles.active : ''
                  }`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>

            <div className={styles.controls}>
              <button
                className={styles.navButton}
                onClick={prevSlide}
                disabled={currentSlide === 0}
              >
                ← 上一页
              </button>

              {currentSlide === slides.length - 1 ? (
                <button
                  className={styles.startButton}
                  onClick={handleStartNow}
                >
                  🚀 开始使用
                </button>
              ) : (
                <button
                  className={styles.navButton}
                  onClick={nextSlide}
                >
                  下一页 →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <p>
            💡 提示：您可以随时点击右上角的"?"图标查看帮助信息
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage; 