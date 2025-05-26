import React from 'react';
import ReactDOM from 'react-dom/client';
import LaTeXFormatPanel from './components/features/solver/LaTeXFormatPanel/LaTeXFormatPanel';
import './index.css';

// 测试数据
const testContextNodes = [
  {
    id: 'step-1',
    label: '步骤 1',
    content: '设函数 $f(x) = x^2 + 2x + 1$，求导数 $f\'(x)$',
  },
  {
    id: 'step-2',
    label: '步骤 2',
    content: '根据幂函数求导法则：$\\frac{d}{dx}(x^n) = nx^{n-1}$',
  },
  {
    id: 'step-3',
    label: '步骤 3',
    content: '因此 $f\'(x) = 2x + 2$',
  },
];

const TestApp: React.FC = () => {
  const [latexContent, setLatexContent] = React.useState(
    '\\begin{align}\nf(x) &= x^2 + 2x + 1 \\\\\nf\'(x) &= 2x + 2\n\\end{align}'
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        flexShrink: 0,
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#343a40' }}>
          LaTeX 格式化面板测试
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
          测试上下分离界面、模式切换、AI聊天等功能
        </p>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <LaTeXFormatPanel
          initialLatexContent={latexContent}
          onContentChange={setLatexContent}
          contextNodes={testContextNodes}
        />
      </div>
      
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: '#e9ecef', 
        borderTop: '1px solid #dee2e6',
        fontSize: '12px',
        color: '#6c757d',
        flexShrink: 0,
      }}>
        <strong>测试说明：</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>上半部分：LaTeX编辑器，点击眼睛图标切换预览</li>
          <li>下半部分：AI聊天，选择不同模式测试功能</li>
          <li>拖拽中间分隔栏调整上下面板高度</li>
          <li>点击节点按钮导入内容到编辑器</li>
          <li>如未配置API Key，将显示模拟回复</li>
        </ul>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<TestApp />); 