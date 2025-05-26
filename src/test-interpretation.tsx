import React from 'react';
import ReactDOM from 'react-dom/client';
import InterpretationManagementView from './components/views/InterpretationManagementView/InterpretationManagementView';
import { InterpretationEntry } from './types';

// 测试数据
const mockInterpretationEntries: InterpretationEntry[] = [
  {
    id: '1',
    stepId: 'step-1',
    stepNumber: 1,
    stepLatexContent: '设函数 $f(x) = x^2 + 2x + 1$，求导数 $f\'(x)$',
    userIdea: '根据幂函数求导法则，$\\frac{d}{dx}(x^n) = nx^{n-1}$，所以 $f\'(x) = 2x + 2$',
    status: 'pending',
    timestamp: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    stepId: 'step-2',
    stepNumber: 2,
    stepLatexContent: '计算积分 $\\int_0^1 x^2 dx$',
    userIdea: '使用不定积分公式 $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$，得到 $\\int x^2 dx = \\frac{x^3}{3} + C$，然后计算定积分 $\\left[\\frac{x^3}{3}\\right]_0^1 = \\frac{1}{3} - 0 = \\frac{1}{3}$',
    status: 'replied',
    timestamp: new Date('2024-01-15T11:15:00'),
    teacherFeedback: '思路正确！积分计算步骤清晰，最终答案 $\\frac{1}{3}$ 是正确的。',
    teacherReplyTimestamp: new Date('2024-01-15T14:20:00'),
  },
  {
    id: '3',
    stepId: 'step-3',
    stepNumber: 3,
    stepLatexContent: '解方程 $x^2 - 5x + 6 = 0$',
    userIdea: '我尝试用因式分解法，找两个数相加等于-5，相乘等于6。应该是-2和-3，所以 $(x-2)(x-3) = 0$，得到 $x = 2$ 或 $x = 3$',
    status: 'reviewed',
    timestamp: new Date('2024-01-15T15:45:00'),
  },
];

// 测试组件
const TestApp: React.FC = () => {
  const handleBack = () => {
    console.log('返回主界面');
  };

  const handleUpdateEntry = (entryId: string, updates: Partial<InterpretationEntry>) => {
    console.log('更新条目:', entryId, updates);
  };

  return (
    <div style={{ height: '100vh' }}>
      <InterpretationManagementView
        interpretationEntries={mockInterpretationEntries}
        onBack={handleBack}
        onUpdateEntry={handleUpdateEntry}
      />
    </div>
  );
};

// 渲染测试应用
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TestApp />); 