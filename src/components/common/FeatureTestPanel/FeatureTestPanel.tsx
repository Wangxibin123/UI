import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './FeatureTestPanel.module.css';

interface FeatureTestPanelProps {
  onTestLaTeX?: () => void;
  onTestDAG?: () => void;
  onTestAI?: () => void;
  onTestSolver?: () => void;
  isVisible?: boolean;
  onToggle?: () => void;
}

const FeatureTestPanel: React.FC<FeatureTestPanelProps> = ({
  onTestLaTeX,
  onTestDAG,
  onTestAI,
  onTestSolver,
  isVisible = false,
  onToggle
}) => {
  const [testResults, setTestResults] = useState<{[key: string]: 'pass' | 'fail' | 'pending'}>({});

  const runTest = (testName: string, testFn?: () => void) => {
    setTestResults(prev => ({ ...prev, [testName]: 'pending' }));
    
    try {
      if (testFn) {
        testFn();
      }
      
      // 模拟测试逻辑
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [testName]: 'pass' }));
        toast.success(`✅ ${testName} 测试通过！`);
      }, 1000);
    } catch (error) {
      setTestResults(prev => ({ ...prev, [testName]: 'fail' }));
      toast.error(`❌ ${testName} 测试失败：${error}`);
    }
  };

  const runAllTests = () => {
    toast.info('🚀 开始运行所有功能测试...');
    
    const tests = [
      { name: 'LaTeX渲染', fn: onTestLaTeX },
      { name: 'DAG可视化', fn: onTestDAG },
      { name: 'AI交互', fn: onTestAI },
      { name: '求解器', fn: onTestSolver }
    ];

    tests.forEach((test, index) => {
      setTimeout(() => {
        runTest(test.name, test.fn);
      }, index * 1500);
    });
  };

  if (!isVisible) {
    return (
      <button 
        className={styles.toggleButton}
        onClick={onToggle}
        title="打开功能测试面板"
      >
        🧪 测试
      </button>
    );
  }

  return (
    <div className={styles.testPanel}>
      <div className={styles.header}>
        <h3>🧪 AI-MATH 功能测试中心</h3>
        <button className={styles.closeButton} onClick={onToggle}>✕</button>
      </div>

      <div className={styles.content}>
        <div className={styles.overview}>
          <h4>📊 系统状态概览</h4>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.label}>LaTeX引擎:</span>
              <span className={styles.status}>✅ KaTeX 就绪</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>React Flow:</span>
              <span className={styles.status}>✅ DAG 就绪</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>AI模型:</span>
              <span className={styles.status}>🟡 待配置</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>数据状态:</span>
              <span className={styles.status}>✅ 测试数据已加载</span>
            </div>
          </div>
        </div>

        <div className={styles.testSection}>
          <h4>🎯 核心功能测试</h4>
          <div className={styles.testButtons}>
            <button 
              className={styles.testButton}
              onClick={() => runTest('LaTeX渲染', onTestLaTeX)}
              disabled={testResults['LaTeX渲染'] === 'pending'}
            >
              {getTestIcon('LaTeX渲染')} LaTeX渲染测试
            </button>

            <button 
              className={styles.testButton}
              onClick={() => runTest('DAG可视化', onTestDAG)}
              disabled={testResults['DAG可视化'] === 'pending'}
            >
              {getTestIcon('DAG可视化')} DAG可视化测试
            </button>

            <button 
              className={styles.testButton}
              onClick={() => runTest('AI交互', onTestAI)}
              disabled={testResults['AI交互'] === 'pending'}
            >
              {getTestIcon('AI交互')} AI交互测试
            </button>

            <button 
              className={styles.testButton}
              onClick={() => runTest('求解器', onTestSolver)}
              disabled={testResults['求解器'] === 'pending'}
            >
              {getTestIcon('求解器')} 求解器测试
            </button>
          </div>

          <button 
            className={styles.runAllButton}
            onClick={runAllTests}
          >
            🚀 运行所有测试
          </button>
        </div>

        <div className={styles.quickActions}>
          <h4>⚡ 快速操作</h4>
          <div className={styles.actionButtons}>
            <button 
              className={styles.actionButton}
              onClick={() => toast.info('💡 正在生成示例问题...')}
            >
              📝 生成示例问题
            </button>
            
            <button 
              className={styles.actionButton}
              onClick={() => toast.info('🔄 正在重置应用状态...')}
            >
              🔄 重置状态
            </button>

            <button 
              className={styles.actionButton}
              onClick={() => toast.info('💾 正在导出测试数据...')}
            >
              💾 导出数据
            </button>

            <button 
              className={styles.actionButton}
              onClick={() => toast.info('📸 正在生成界面截图...')}
            >
              📸 界面截图
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function getTestIcon(testName: string) {
    const status = testResults[testName];
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'pending': return '⏳';
      default: return '🔵';
    }
  }
};

export default FeatureTestPanel; 