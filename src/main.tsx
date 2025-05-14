import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 在 src/main.tsx 或 src/index.tsx 文件的顶部添加
import 'katex/dist/katex.min.css';

// Import global styles
import './styles/_reset.css';      // CSS Reset
import './styles/_variables.css'; // CSS Variables
import './styles/global.css';     // Global application styles
// App.css is imported within App.tsx

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. Please ensure an element with id 'root' exists in your HTML.");
} 