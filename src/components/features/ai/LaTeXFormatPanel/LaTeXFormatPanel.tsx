import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Send, Copy, ImageIcon, FileText, Plus, Minus, Upload, Sparkles } from 'lucide-react';
import Latex from 'react-latex-next';
import { aiModelService } from '../../../../services/aiModelService';
import DraggableSeparator from '../../../common/DraggableSeparator/DraggableSeparator';
import styles from './LaTeXFormatPanel.module.css';

// 🎯 5种提示词模版
const PROMPT_TEMPLATES = {
  general: {
    id: 'general',
    name: '通用模式',
    icon: <Sparkles size={16} />,
    systemPrompt: `你是一个专业的LaTeX格式化助手。请帮助用户处理LaTeX文档和数学公式。
你需要：
1. 提供准确的LaTeX语法指导
2. 修复格式错误
3. 优化公式和文档结构
4. 解释LaTeX命令的用法

请用中文回复，输出的LaTeX代码应该用代码块包围以便复制。`,
  },
  recognition: {
    id: 'recognition',
    name: '题目识别',
    icon: <ImageIcon size={16} />,
    systemPrompt: `你是一个专业的题目识别助手。你需要：
1. 准确识别图片中的数学题目内容
2. 将题目转换为标准的LaTeX格式
3. 保持题目的原始结构和格式
4. 确保数学公式的准确性

请先识别图片内容，然后提供完整的LaTeX格式化版本。`,
  },
  repair: {
    id: 'repair',
    name: 'LaTeX修复',
    icon: <FileText size={16} />,
    systemPrompt: `你是一个专业的LaTeX修复专家。请帮助用户：
1. 修复LaTeX语法错误
2. 优化公式格式
3. 统一符号使用
4. 改进文档结构

请分析输入的LaTeX内容，指出问题并提供修复后的完整版本。`,
  },
  detailed: {
    id: 'detailed',
    name: 'LaTeX详细化',
    icon: <Plus size={16} />,
    systemPrompt: `你是一个LaTeX详细化专家。请帮助用户：
1. 将简化的LaTeX内容详细化
2. 添加详细的解题步骤和说明
3. 补充必要的数学推导过程
4. 增强公式的可读性和完整性

请将用户提供的内容进行详细扩展，保持数学准确性。`,
  },
  simplified: {
    id: 'simplified',
    name: 'LaTeX精简化',
    icon: <Minus size={16} />,
    systemPrompt: `你是一个LaTeX精简化专家。请帮助用户：
1. 简化冗长的LaTeX内容
2. 保留核心要点和关键步骤
3. 优化公式表达的简洁性
4. 移除不必要的细节

请将用户提供的内容进行合理精简，确保核心信息不丢失。`,
  },
};

// 消息接口
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

// 组件属性接口
interface LaTeXFormatPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  initialContent?: string;
  contextStepInfo?: {
    id: string;
    content: string;
    stepNumber: number;
  } | null;
}

const LaTeXFormatPanel: React.FC<LaTeXFormatPanelProps> = ({
  isOpen,
  onClose,
  initialContent = '',
  contextStepInfo,
}) => {
  // 🎨 上半部分状态：LaTeX编辑和预览
  const [latexContent, setLatexContent] = useState(initialContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // 🤖 下半部分状态：AI聊天
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('general');
  
  // 📏 布局状态
  const [topPanelHeight, setTopPanelHeight] = useState(50); // 百分比
  
  // 🎯 引用
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const latexEditorRef = useRef<HTMLTextAreaElement>(null);

  // 🔄 当传入新的初始内容时更新
  useEffect(() => {
    if (initialContent !== latexContent) {
      setLatexContent(initialContent);
    }
  }, [initialContent]);

  // 🔄 当有上下文步骤信息时，自动填充内容
  useEffect(() => {
    if (contextStepInfo && contextStepInfo.content) {
      setLatexContent(contextStepInfo.content);
      // 根据情况添加提示信息到聊天
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        content: `已加载步骤 ${contextStepInfo.stepNumber} 的内容。您可以选择相应的模式对LaTeX内容进行处理。`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setChatMessages([welcomeMessage]);
    }
  }, [contextStepInfo]);

  // 🎯 处理垂直分隔栏拖拽
  const handleVerticalDrag = useCallback((delta: { dx: number; dy: number }) => {
    const containerHeight = 600; // 假设容器高度
    const heightChange = (delta.dy / containerHeight) * 100;
    
    setTopPanelHeight(prev => {
      const newHeight = Math.max(20, Math.min(80, prev + heightChange));
      return newHeight;
    });
  }, []);

  // 🎨 切换预览模式
  const handleTogglePreview = useCallback(() => {
    setIsPreviewMode(prev => !prev);
  }, []);

  // 📋 复制LaTeX内容
  const handleCopyLatex = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      // 这里可以添加toast提示
      console.log('LaTeX内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, [latexContent]);

  // 🎯 选择提示词模版
  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
  }, []);

  // 💬 发送聊天消息
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // 构建上下文内容
      let contextContent = '';
      if (latexContent.trim()) {
        contextContent = `当前LaTeX内容：\n\`\`\`latex\n${latexContent}\n\`\`\`\n\n`;
      }

      // 获取选中的模版
      const template = PROMPT_TEMPLATES[selectedTemplate as keyof typeof PROMPT_TEMPLATES];
      
      // 使用deepseek v3模型进行聊天
      const modelId = 'deepseek-chat'; // 使用OpenRouter的deepseek模型
      const availableModels = aiModelService.getAvailableModels();
      const selectedModel = availableModels.find(m => m.id.includes('deepseek')) || availableModels[0];

      if (!selectedModel) {
        throw new Error('没有可用的AI模型');
      }

            // 使用streamChatCompletion方法进行流式对话
      let fullResponse = '';
      await aiModelService.streamChatCompletion(
        {
          model: selectedModel.id,
          messages: [
            { role: 'system', content: template.systemPrompt },
            { role: 'user', content: `${contextContent}${userMessage.content}` }
          ],
          temperature: 0,
          stream: true,
        },
        (chunk: string) => {
          fullResponse += chunk;
          // 更新消息
          setChatMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: fullResponse }
              : msg
          ));
        }
      );

      // 完成流式响应
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('发送消息失败:', error);
      setChatMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
      setChatMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: '发送消息失败，请检查网络连接或API配置。',
        sender: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, latexContent, selectedTemplate]);

  // 🎯 处理回车发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // 🔄 自动滚动到最新消息
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  return (
    <div className={styles.container}>
      {/* 顶部标题栏 */}
      <div className={styles.header}>
        <h2 className={styles.title}>LaTeX 格式化助手</h2>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        )}
      </div>

      {/* 主要内容区域 */}
      <div className={styles.content}>
        {/* 上半部分：LaTeX编辑与预览 */}
        <div 
          className={styles.topPanel} 
          style={{ height: `${topPanelHeight}%` }}
        >
          <div className={styles.topPanelHeader}>
            <div className={styles.topPanelTitle}>
              {isPreviewMode ? 'LaTeX 预览' : 'LaTeX 编辑'}
            </div>
            <div className={styles.topPanelActions}>
              <button
                onClick={handleCopyLatex}
                className={styles.actionButton}
                title="复制LaTeX内容"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleTogglePreview}
                className={styles.actionButton}
                title={isPreviewMode ? "切换到编辑模式" : "切换到预览模式"}
              >
                {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
                {isPreviewMode ? "编辑" : "预览"}
              </button>
            </div>
          </div>

          <div className={styles.topPanelContent}>
            {isPreviewMode ? (
              <div className={styles.latexPreview}>
                {latexContent.trim() ? (
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
                    暂无内容预览
                  </div>
                )}
              </div>
            ) : (
              <textarea
                ref={latexEditorRef}
                value={latexContent}
                onChange={(e) => setLatexContent(e.target.value)}
                className={styles.latexEditor}
                placeholder="在此输入或粘贴LaTeX内容...&#10;&#10;提示：&#10;• 使用 $ 包围行内公式：$E = mc^2$&#10;• 使用 $$ 包围块级公式：$$\\int_a^b f(x)dx$$&#10;• 支持完整的LaTeX数学语法"
              />
            )}
          </div>
        </div>

        {/* 可拖拽分隔栏 */}
        <DraggableSeparator
          orientation="vertical"
          onDrag={handleVerticalDrag}
          className={styles.separator}
        />

        {/* 下半部分：AI聊天区域 */}
        <div 
          className={styles.bottomPanel}
          style={{ height: `${100 - topPanelHeight}%` }}
        >
          {/* 模版选择器 */}
          <div className={styles.templateSelector}>
            {Object.values(PROMPT_TEMPLATES).map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`${styles.templateButton} ${selectedTemplate === template.id ? styles.active : ''}`}
                title={template.name}
              >
                {template.icon}
                <span className={styles.templateName}>{template.name}</span>
              </button>
            ))}
          </div>

          {/* 聊天消息区域 */}
          <div 
            ref={chatContainerRef}
            className={styles.chatContainer}
          >
            {chatMessages.length === 0 ? (
              <div className={styles.chatWelcome}>
                <Sparkles size={32} className={styles.welcomeIcon} />
                <p>选择一个模式开始与AI助手对话</p>
                <div className={styles.welcomeHints}>
                  <div className={styles.hint}>💡 上方编辑区的内容会自动作为上下文</div>
                  <div className={styles.hint}>🎯 选择不同模式获得专业的LaTeX帮助</div>
                </div>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.chatMessage} ${message.sender === 'user' ? styles.userMessage : styles.assistantMessage}`}
                >
                  <div className={styles.messageContent}>
                    {message.sender === 'assistant' ? (
                      <Latex delimiters={[
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                        { left: "\\(", right: "\\)", display: false },
                        { left: "\\[", right: "\\]", display: true }
                      ]}>
                        {message.content}
                      </Latex>
                    ) : (
                      message.content
                    )}
                    {message.isStreaming && (
                      <span className={styles.streamingIndicator}>●</span>
                    )}
                  </div>
                  <div className={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 输入区域 */}
          <div className={styles.inputArea}>
            <div className={styles.inputContainer}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述您需要的LaTeX处理需求... (Shift+Enter换行，Enter发送)"
                className={styles.messageInput}
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={styles.sendButton}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaTeXFormatPanel; 