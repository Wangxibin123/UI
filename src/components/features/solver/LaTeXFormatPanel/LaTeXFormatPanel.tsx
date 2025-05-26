import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Copy, Download, Send, RotateCcw, FileImage, Settings, Lightbulb, Zap, Minimize2, Maximize2 } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { openRouterService } from '../../../../services/openRouterService';
import styles from './LaTeXFormatPanel.module.css';

// 聊天消息接口
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'latex' | 'text';
}

// 模式类型
type LaTeXMode = 'general' | 'recognition' | 'repair' | 'detailed' | 'simplified';

// 组件属性接口
interface LaTeXFormatPanelProps {
  initialLatexContent?: string;
  onContentChange?: (content: string) => void;
  contextNodes?: Array<{
    id: string;
    label: string;
    content: string;
  }>;
}

const LaTeXFormatPanel: React.FC<LaTeXFormatPanelProps> = ({
  initialLatexContent = '',
  onContentChange,
  contextNodes = [],
}) => {
  // 上半部分状态
  const [latexContent, setLatexContent] = useState(initialLatexContent);
  const [showPreview, setShowPreview] = useState(false); // 默认显示原始内容
  const [upperPanelHeight, setUpperPanelHeight] = useState(300);
  
  // 下半部分状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentMode, setCurrentMode] = useState<LaTeXMode>('general');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 引用
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // 提示词模版
  const promptTemplates = {
    general: {
      name: '通用模式',
      icon: Settings,
      system: '你是一个专业的LaTeX专家，帮助用户处理LaTeX相关问题。请用LaTeX格式回复，并确保输出的内容可以直接复制使用。\n\n规则：\n1. 优先使用LaTeX语法\n2. 确保数学公式正确\n3. 保持格式整洁易读\n4. 在必要时提供解释',
    },
    recognition: {
      name: '题目识别',
      icon: FileImage,
      system: '你是一个专业的数学题目识别专家。请将用户提供的图片或文字内容识别并转换为标准的LaTeX格式。\n\n要求：\n1. 准确识别数学公式和符号\n2. 使用标准LaTeX语法\n3. 保持原始内容的逻辑结构\n4. 如有不确定的部分，请标注',
    },
    repair: {
      name: '内容修复',
      icon: RotateCcw,
      system: '你是一个LaTeX修复专家。请修复用户提供的LaTeX内容中的错误，使其符合标准LaTeX语法并能正确渲染。\n\n修复要点：\n1. 检查语法错误\n2. 补充缺失的标记\n3. 修正符号使用\n4. 确保可正确编译',
    },
    detailed: {
      name: '详细化',
      icon: Maximize2,
      system: '你是一个LaTeX详细化专家。请将用户提供的LaTeX内容进行详细化处理，添加更多步骤说明和中间过程。\n\n详细化要求：\n1. 添加中间推导步骤\n2. 增加解释性文字\n3. 使用更清晰的格式\n4. 保持逻辑连贯性',
    },
    simplified: {
      name: '精简化',
      icon: Minimize2,
      system: '你是一个LaTeX精简专家。请将用户提供的LaTeX内容进行精简处理，保留核心要点，去除冗余信息。\n\n精简要求：\n1. 保留关键信息\n2. 去除冗余步骤\n3. 使用简洁格式\n4. 保持核心逻辑',
    },
  };

  // 监听内容变化
  useEffect(() => {
    onContentChange?.(latexContent);
  }, [latexContent, onContentChange]);

  // 自动滚动到聊天底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 处理上半部分内容变化
  const handleLatexContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLatexContent(e.target.value);
  };

  // 切换预览模式
  const handleTogglePreview = () => {
    setShowPreview(!showPreview);
  };

  // 复制LaTeX内容
  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      // TODO: 添加成功提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 导出LaTeX文件
  const handleExportLatex = () => {
    const blob = new Blob([latexContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `latex-${Date.now()}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 从节点导入内容
  const handleImportFromNode = (nodeContent: string) => {
    setLatexContent(nodeContent);
    setShowPreview(false); // 导入后显示原始内容便于编辑
  };

  // 模式切换
  const handleModeChange = (mode: LaTeXMode) => {
    setCurrentMode(mode);
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsProcessing(true);

    try {
      if (!openRouterService.isConfigured()) {
        // 如果没有配置API Key，显示模拟回复
        setTimeout(() => {
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: `**模拟回复** (请配置OpenRouter API Key以启用真实AI功能)\n\n针对您的请求："${currentInput}"\n\n这里是一个示例LaTeX公式：\n\n$$f(x) = \\int_0^1 x^2 dx = \\frac{x^3}{3}\\bigg|_0^1 = \\frac{1}{3}$$\n\n配置方法：在项目根目录创建 .env 文件，添加：\n\`REACT_APP_OPENROUTER_API_KEY=your_api_key_here\``,
            sender: 'ai',
            timestamp: new Date(),
            type: 'latex',
          };
          setChatMessages(prev => [...prev, aiMessage]);
          setIsProcessing(false);
        }, 1000);
        return;
      }

      // 构建上下文消息历史
      const contextMessages = chatMessages
        .filter(msg => msg.type !== undefined) // 过滤掉可能的无效消息
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.text,
        }));

      // 添加系统提示和当前LaTeX内容
      const messages = [
        {
          role: 'system' as const,
          content: promptTemplates[currentMode].system,
        },
        ...contextMessages,
        {
          role: 'user' as const,
          content: latexContent ? 
            `当前LaTeX内容：\n\`\`\`latex\n${latexContent}\n\`\`\`\n\n用户请求：${currentInput}` :
            currentInput,
        },
      ];

      // 创建AI消息占位符
      const aiMessageId = `ai-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        type: 'latex',
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // 使用流式API
      let accumulatedText = '';
      await openRouterService.sendChatMessageStream(
        messages,
        'deepseek/deepseek-chat',
        (chunk: string) => {
          accumulatedText += chunk;
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, text: accumulatedText }
                : msg
            )
          );
        },
        {
          temperature: 0,
          maxTokens: 4000,
        }
      );

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 显示错误消息
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: `**错误**：发送消息失败。\n\n错误信息：${error instanceof Error ? error.message : '未知错误'}\n\n请检查网络连接和API配置。`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSendMessage();
    }
  };

  // 渲染上半部分
  const renderUpperPanel = () => (
    <div className={styles.upperPanel} style={{ height: `${upperPanelHeight}px` }}>
      <div className={styles.upperHeader}>
        <div className={styles.headerLeft}>
          <h3>LaTeX 内容</h3>
          <span className={styles.contentLength}>
            {latexContent.length} 字符
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={handleTogglePreview}
            className={`${styles.actionButton} ${showPreview ? styles.active : ''}`}
            title={showPreview ? '显示原始内容' : '显示渲染预览'}
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={handleCopyLatex}
            className={styles.actionButton}
            title="复制LaTeX代码"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleExportLatex}
            className={styles.actionButton}
            title="导出LaTeX文件"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className={styles.upperContent}>
        {showPreview ? (
          <div className={styles.previewArea}>
            {latexContent ? (
              <Latex delimiters={[
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true }
              ]}>
                {latexContent}
              </Latex>
            ) : (
              <div className={styles.emptyPreview}>
                <p>在左侧编辑器中输入LaTeX代码，预览将在这里显示</p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={latexContent}
            onChange={handleLatexContentChange}
            className={styles.latexEditor}
            placeholder="在此输入或粘贴LaTeX代码...&#10;&#10;示例：&#10;f(x) = \\int_0^1 x^2 dx = \\frac{1}{3}&#10;&#10;\\begin{align}&#10;E &= mc^2 \\\\&#10;F &= ma&#10;\\end{align}"
          />
        )}
      </div>

      {/* 节点导入区域 */}
      {contextNodes.length > 0 && (
        <div className={styles.nodesImport}>
          <span className={styles.importLabel}>从节点导入：</span>
          {contextNodes.map(node => (
            <button
              key={node.id}
              onClick={() => handleImportFromNode(node.content)}
              className={styles.nodeButton}
              title={`导入节点：${node.label}`}
            >
              {node.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // 渲染聊天消息
  const renderChatMessages = () => (
    <div className={styles.chatMessages}>
      {chatMessages.map(message => (
        <div
          key={message.id}
          className={`${styles.message} ${styles[message.sender]}`}
        >
          <div className={styles.messageContent}>
            {message.type === 'latex' && message.sender === 'ai' ? (
              <div className={styles.latexMessage}>
                <Latex>{message.text}</Latex>
                <button
                  onClick={() => navigator.clipboard.writeText(message.text)}
                  className={styles.copyMessageButton}
                  title="复制LaTeX代码"
                >
                  <Copy size={14} />
                </button>
              </div>
            ) : (
              <span>{message.text}</span>
            )}
          </div>
          <div className={styles.messageTime}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
      {isProcessing && (
        <div className={`${styles.message} ${styles.ai}`}>
          <div className={styles.messageContent}>
            <div className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );

  // 渲染下半部分
  const renderLowerPanel = () => (
    <div className={styles.lowerPanel}>
      <div className={styles.lowerHeader}>
        <h3>AI 助手</h3>
        <div className={styles.modeButtons}>
          {Object.entries(promptTemplates).map(([key, template]) => {
            const IconComponent = template.icon;
            return (
              <button
                key={key}
                onClick={() => handleModeChange(key as LaTeXMode)}
                className={`${styles.modeButton} ${currentMode === key ? styles.active : ''}`}
                title={template.name}
              >
                <IconComponent size={16} />
                <span>{template.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.chatContainer}>
        {chatMessages.length === 0 ? (
          <div className={styles.emptyChatState}>
            <Lightbulb size={48} className={styles.emptyIcon} />
            <h4>AI LaTeX 助手</h4>
            <p>当前模式：{promptTemplates[currentMode].name}</p>
            <p>开始对话，获得LaTeX格式化帮助</p>
          </div>
        ) : (
          renderChatMessages()
        )}
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputContainer}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`${promptTemplates[currentMode].name}模式下，请描述您的需求...`}
            className={styles.messageInput}
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className={styles.sendButton}
          >
            <Send size={16} />
          </button>
        </div>
        <div className={styles.inputHint}>
          <span>Ctrl/Cmd + Enter 发送</span>
          <span>当前模式：{promptTemplates[currentMode].name}</span>
        </div>
      </div>
    </div>
  );

  // 渲染分隔栏
  const renderResizeHandle = () => (
    <div
      ref={resizeRef}
      className={styles.resizeHandle}
      onMouseDown={(e) => {
        const startY = e.clientY;
        const startHeight = upperPanelHeight;

        const handleMouseMove = (e: MouseEvent) => {
          const deltaY = e.clientY - startY;
          const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
          setUpperPanelHeight(newHeight);
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
    >
      <div className={styles.resizeBar} />
    </div>
  );

  return (
    <div className={styles.latexFormatPanel}>
      {renderUpperPanel()}
      {renderResizeHandle()}
      {renderLowerPanel()}
    </div>
  );
};

export default LaTeXFormatPanel; 