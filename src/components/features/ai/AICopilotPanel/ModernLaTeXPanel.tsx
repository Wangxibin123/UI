import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Upload, X, ArrowLeft, ArrowRight, 
  Clock, Copy, Edit3, Plus, ChevronDown, 
  ChevronUp, Settings, List, Eye, Save,
  Check, RotateCcw, FileText, ImageIcon,
  Trash2, MoreVertical, Menu, Maximize2, Minimize2,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import Latex from 'react-latex-next';
import styles from './ModernLaTeXPanel.module.css';
import { aiModelService } from '../../../../services/aiModelService';
import type { AIModel, ChatMessage as AIChatMessage } from '../../../../services/aiModelService';
import { openRouterApi } from '../../../../services/openRouterApi';

// 🎯 TypeScript接口定义
export interface StepInfo {
  id: string;
  stepNumber: number;
  title: string;
  content: string;
  preview: string;
}

export interface DagPageInfo {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AnswerBlockInfo {
  id: string;
  stepNumber: number;
  content: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export interface VersionHistory {
  id: string;
  content: string;
  timestamp: Date;
  stepNumber: number;
  description: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
}

export interface ContextItem {
  id: string;
  type: 'step' | 'page';
  label: string;
  stepNumber?: number;
  content?: string;
}

export interface ModernLaTeXPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextStepInfo?: StepInfo;
  onContentChange?: (content: string) => void;
  // 真实DAG数据
  dagPages?: DagPageInfo[];
  answerBlocks?: AnswerBlockInfo[];
  problemData?: {
    id: string;
    title: string;
    content: string;
  };
  // 回调函数
  onPageSelect?: (pageId: string) => void;
  onAnswerBlockSelect?: (blockId: string) => void;
}

// 🎯 默认提示词模板
const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'latex-format',
    name: 'LaTeX格式化',
    prompt: '请帮我格式化这个LaTeX公式，使其更加规范和美观：',
    category: 'latex'
  },
  {
    id: 'math-analysis',
    name: '数学分析',
    prompt: '请分析这个数学问题的解题思路：',
    category: 'analysis'
  },
  {
    id: 'step-summary',
    name: '步骤总结',
    prompt: '请总结这个解题步骤的要点：',
    category: 'summary'
  }
];

// 🎯 模拟数据
const MOCK_DAG_PAGES: DagPageInfo[] = [
  { id: 'page1', name: '页面1 - 数学求解', isActive: true },
  { id: 'page2', name: '页面2 - 扩展应用', isActive: false },
];

const MOCK_ANSWER_BLOCKS: AnswerBlockInfo[] = [
  { id: 'step1', stepNumber: 1, content: 'x^2 + 5x + 6 = 0', title: '原方程' },
  { id: 'step2', stepNumber: 2, content: '(x+2)(x+3) = 0', title: '因式分解' },
  { id: 'step3', stepNumber: 3, content: 'x = -2 \\text{ 或 } x = -3', title: '求解' },
];

const ModernLaTeXPanel: React.FC<ModernLaTeXPanelProps> = ({
  isOpen,
  onClose,
  contextStepInfo,
  onContentChange,
  dagPages = MOCK_DAG_PAGES,
  answerBlocks = MOCK_ANSWER_BLOCKS,
  problemData,
  onPageSelect,
  onAnswerBlockSelect,
}) => {
  // 🎯 创建完整的答案块列表（包含题目）
  const allAnswerBlocks: AnswerBlockInfo[] = [
    // 🔧 修改：只有当有真实题目数据时才添加题目块
    ...(problemData?.content ? [{
      id: 'problem-content',
      stepNumber: 0,
      content: problemData.content,
      title: problemData.title || '题目内容'
    }] : []),
    // 🔧 修改：过滤掉重复的数据
    ...answerBlocks.filter(block => block.stepNumber > 0)
  ];

  // 🎯 主要状态管理
  const [selectedDagPage, setSelectedDagPage] = useState<DagPageInfo>(dagPages[0] || MOCK_DAG_PAGES[0]);
  const [selectedAnswerBlock, setSelectedAnswerBlock] = useState<AnswerBlockInfo>(() => {
    if (allAnswerBlocks.length > 0) {
      return allAnswerBlocks[0];
    }
    return MOCK_ANSWER_BLOCKS[0];
  });
  const [isDagPageDropdownOpen, setIsDagPageDropdownOpen] = useState(false);
  const [isAnswerBlockDropdownOpen, setIsAnswerBlockDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(openRouterApi.getAvailableModels()[0]?.modelId || 'anthropic/claude-3.5-sonnet');
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileListExpanded, setIsFileListExpanded] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 🎯 引用
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🎯 初始化
  useEffect(() => {
    if (contextStepInfo) {
      const matchingBlock = allAnswerBlocks.find(block => 
        block.id === contextStepInfo.id || 
        block.stepNumber === contextStepInfo.stepNumber
      );
      if (matchingBlock) {
        setSelectedAnswerBlock(matchingBlock);
      }
    }
  }, [contextStepInfo, allAnswerBlocks]);

  // 🎯 消息显示函数
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // 🎯 编辑功能处理
  const handleStartEdit = useCallback(() => {
    setEditContent(selectedAnswerBlock.content);
    setIsEditing(true);
    setIsPreviewMode(false);
  }, [selectedAnswerBlock.content]);

  const handlePreview = useCallback(() => {
    setIsPreviewMode(!isPreviewMode);
  }, [isPreviewMode]);

  const handleSave = useCallback(() => {
    // 保存编辑内容
    const updatedBlock = { ...selectedAnswerBlock, content: editContent };
    setSelectedAnswerBlock(updatedBlock);
    onContentChange?.(editContent);
    setIsEditing(false);
    setIsPreviewMode(false);
    showSuccessMessage('内容已保存');
  }, [editContent, selectedAnswerBlock, onContentChange]);

  const handleCancel = useCallback(() => {
    setEditContent(selectedAnswerBlock.content);
    setIsEditing(false);
    setIsPreviewMode(false);
  }, [selectedAnswerBlock.content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedAnswerBlock.content);
      showSuccessMessage('内容已复制到剪贴板');
    } catch (err) {
      showErrorMessage('复制失败');
    }
  }, [selectedAnswerBlock.content]);

  // 🎯 文件上传处理
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newFiles = Array.from(files);
      
      // 验证文件类型
      const validFiles = newFiles.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                      file.type === 'application/msword';
        const isText = file.type === 'text/plain';
        return isImage || isPDF || isWord || isText;
      });

      if (validFiles.length !== newFiles.length) {
        showErrorMessage('只支持图片、PDF、Word文档和文本文件');
      }

      setUploadedFiles(prev => [...prev, ...validFiles]);
      showSuccessMessage(`已上传 ${validFiles.length} 个文件`);
    } catch (error) {
      showErrorMessage('文件上传失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 🎯 选择器处理
  const handleDagPageSelect = useCallback((page: DagPageInfo) => {
    setSelectedDagPage(page);
    setIsDagPageDropdownOpen(false);
    onPageSelect?.(page.id);
    showSuccessMessage(`已切换到${page.name}`);
  }, [onPageSelect]);

  const handleAnswerBlockSelect = useCallback((block: AnswerBlockInfo) => {
    setSelectedAnswerBlock(block);
    setIsAnswerBlockDropdownOpen(false);
    setIsEditing(false);
    setIsPreviewMode(false);
    onAnswerBlockSelect?.(block.id);
    showSuccessMessage(`已选择${block.title}`);
  }, [onAnswerBlockSelect]);

  // 🎯 AI聊天处理 - 使用真实的OpenRouter API
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const originalMessage = inputMessage;
    setInputMessage('');
    setIsAILoading(true);

    try {
      // 构建系统提示词和上下文信息
      let systemPrompt = `你是一个专业的LaTeX和数学问题助手。请帮助用户处理LaTeX格式化、数学分析等问题。

对于用户关心的重要内容，请使用以下格式输出：
[LATEX_BLOCK_START]
LaTeX内容
[LATEX_BLOCK_END]

这样的块会被特殊处理，用户可以复制其中的LaTeX内容。`;

      let contextInfo = `当前DAG页面：${selectedDagPage.name}\n`;
      contextInfo += `当前步骤：步骤${selectedAnswerBlock.stepNumber} - ${selectedAnswerBlock.title}\n`;
      contextInfo += `步骤内容：${selectedAnswerBlock.content}\n`;
      
      if (problemData) {
        contextInfo += `题目：${problemData.title}\n${problemData.content}\n`;
      }

      // 准备消息历史
      const messagesHistory = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `${originalMessage}\n\n上下文信息：\n${contextInfo}` }
      ];

      // 创建流式响应的AI消息
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        content: '',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // 使用OpenRouter API进行流式调用
      const streamGenerator = openRouterApi.streamChat(
        messagesHistory,
        selectedModel,
        uploadedFiles,
        {
          temperature: 0.7,
          maxTokens: 4000
        }
      );

      // 处理流式响应
      for await (const chunk of streamGenerator) {
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      }
      
      // 清除上传的文件
      setUploadedFiles([]);
      
    } catch (error) {
      console.error('OpenRouter API调用失败:', error);
      showErrorMessage(`AI回复失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 移除失败的AI消息
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAILoading(false);
    }
  }, [inputMessage, selectedAnswerBlock, selectedDagPage, problemData, selectedModel, uploadedFiles]);

  // 🎯 LaTeX块解析和渲染
  const parseLaTeXBlocks = (content: string) => {
    const latexBlockRegex = /\[LATEX_BLOCK_START\]([\s\S]*?)\[LATEX_BLOCK_END\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = latexBlockRegex.exec(content)) !== null) {
      // 添加LaTeX块之前的文本
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }

      // 添加LaTeX块
      parts.push({
        type: 'latex',
        content: match[1].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    return parts;
  };

  const handleCopyLatex = async (latexContent: string) => {
    try {
      await navigator.clipboard.writeText(latexContent);
      showSuccessMessage('LaTeX内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      showErrorMessage('复制失败，请手动选择复制');
    }
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.sender === 'user') {
      return <div>{message.content}</div>;
    }

    const parts = parseLaTeXBlocks(message.content);
    
    return (
      <div>
        {parts.map((part, index) => {
          if (part.type === 'latex') {
            return (
              <div key={index} className={styles.latexBlock}>
                <div className={styles.latexBlockHeader}>
                  <span className={styles.latexBlockLabel}>LaTeX内容</span>
                  <button
                    className={styles.copyLatexButton}
                    onClick={() => handleCopyLatex(part.content)}
                    title="复制LaTeX代码"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className={styles.latexBlockContent}>
                  <BlockMath>{part.content}</BlockMath>
                </div>
              </div>
            );
          } else {
            return (
              <div key={index} className={styles.textContent}>
                {/* 🔧 修改：支持混合LaTeX文本的渲染 */}
                {part.content.includes('$') ? (
                  // 包含LaTeX的混合文本
                  <div dangerouslySetInnerHTML={{
                    __html: part.content
                      .replace(/\$\$(.*?)\$\$/g, '<div class="katex-display">$$$1$$</div>')
                      .replace(/\$(.*?)\$/g, '<span class="katex-inline">$$1$</span>')
                  }} />
                ) : (
                  // 普通文本
                  <span>{part.content}</span>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  };

  // 🎯 渲染头部
  const renderHeader = () => (
    <div className={styles.panelHeader}>
      <div className={styles.headerLeft}>
        <h3 className={styles.panelTitle}>🔧 LaTeX格式化</h3>
      </div>
      <div className={styles.headerRight}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="关闭"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  // 🎯 渲染选择器区域
  const renderSelectorArea = () => (
    <div className={styles.selectorArea}>
      {/* DAG页面选择器 */}
      <div className={styles.selectorGroup}>
        <label className={styles.selectorLabel}>DAG页面</label>
        <div className={styles.dropdownWrapper}>
          <button
            className={styles.dropdownButton}
            onClick={() => setIsDagPageDropdownOpen(!isDagPageDropdownOpen)}
          >
            <span>{selectedDagPage.name}</span>
            <ChevronDown size={16} />
          </button>
          {isDagPageDropdownOpen && (
            <div className={styles.dropdownMenu}>
              {dagPages.map((page) => (
                <div
                  key={page.id}
                  className={`${styles.dropdownItem} ${page.id === selectedDagPage.id ? styles.active : ''}`}
                  onClick={() => handleDagPageSelect(page)}
                >
                  {page.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 解答块选择器 */}
      <div className={styles.selectorGroup}>
        <label className={styles.selectorLabel}>步骤</label>
        <div className={styles.dropdownWrapper}>
          <button
            className={styles.dropdownButton}
            onClick={() => setIsAnswerBlockDropdownOpen(!isAnswerBlockDropdownOpen)}
          >
            <span>
              {selectedAnswerBlock.stepNumber === 0 
                ? `📋 ${selectedAnswerBlock.title}`
                : `步骤${selectedAnswerBlock.stepNumber} - ${selectedAnswerBlock.title}`
              }
            </span>
            <ChevronDown size={16} />
          </button>
          {isAnswerBlockDropdownOpen && (
            <div className={styles.dropdownMenu}>
              {allAnswerBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`${styles.dropdownItem} ${block.id === selectedAnswerBlock.id ? styles.active : ''}`}
                  onClick={() => handleAnswerBlockSelect(block)}
                >
                  {block.stepNumber === 0 
                    ? `📋 ${block.title}`
                    : `步骤${block.stepNumber} - ${block.title}`
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 🎯 渲染内容编辑区域
  const renderContentEditArea = () => (
    <div className={styles.contentEditArea}>
      {/* 工具栏 */}
      <div className={styles.editToolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.contentLabel}>
            {selectedAnswerBlock.stepNumber === 0 
              ? `@📋 ${selectedAnswerBlock.title}`
              : `@步骤 ${selectedAnswerBlock.stepNumber} 解答内容`
            }
          </span>
        </div>
        <div className={styles.toolbarRight}>
          {!isEditing ? (
            <>
              <button
                className={styles.toolButton}
                onClick={handleStartEdit}
                title="编辑"
              >
                <Edit3 size={16} />
              </button>
              <button
                className={styles.toolButton}
                onClick={handleCopy}
                title="复制"
              >
                <Copy size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.toolButton}
                onClick={handlePreview}
                title={isPreviewMode ? "编辑" : "预览"}
              >
                {isPreviewMode ? <Edit3 size={16} /> : <Eye size={16} />}
              </button>
              <button
                className={`${styles.toolButton} ${styles.saveButton}`}
                onClick={handleSave}
                title="保存"
              >
                <Save size={16} />
              </button>
              <button
                className={`${styles.toolButton} ${styles.cancelButton}`}
                onClick={handleCancel}
                title="复原"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.contentContainer}>
        {!isEditing ? (
          // 显示模式：LaTeX渲染
          <div className={styles.latexDisplay}>
            {/* 🔧 修复：改进LaTeX内容处理，确保正确的数学公式渲染 */}
            {selectedAnswerBlock.content ? (
              <BlockMath>
                {/* 清理内容：移除外层的$$符号，因为BlockMath会自动添加 */}
                {selectedAnswerBlock.content.replace(/^\$\$/, '').replace(/\$\$$/, '')}
              </BlockMath>
            ) : (
              <div className={styles.emptyContent}>
                <p>选择一个步骤以查看内容</p>
              </div>
            )}
          </div>
        ) : (
          // 编辑模式
          <div className={styles.editMode}>
            {isPreviewMode ? (
              // 预览模式
              <div className={styles.previewContainer}>
                <div className={styles.previewHeader}>
                  <span className={styles.previewLabel}>预览效果</span>
                </div>
                <div className={styles.latexDisplay}>
                  {/* 🔧 修复：改进预览模式的LaTeX渲染 */}
                  {editContent ? (
                    <BlockMath>
                      {/* 清理内容：移除外层的$$符号，因为BlockMath会自动添加 */}
                      {editContent.replace(/^\$\$/, '').replace(/\$\$$/, '')}
                    </BlockMath>
                  ) : (
                    <div className={styles.emptyContent}>
                      <p>输入内容以查看预览</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // 编辑文本区域
              <textarea
                className={styles.editTextarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="请输入LaTeX内容..."
                rows={8}
              />
            )}
            <div className={styles.editHint}>
              💡 支持LaTeX语法，如：$x^2 + y^2 = r^2$ 或 $$\int_0^1 f(x)dx$$
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 🎯 渲染AI聊天区域
  const renderAIChatArea = () => (
    <div className={styles.aiChatArea}>
      <div className={styles.chatHeader}>
        <h4 className={styles.chatTitle}>选择提示词开始AI对话</h4>
      </div>

      {/* 聊天消息 */}
      <div className={styles.chatMessages} ref={chatContainerRef}>
        {chatMessages.length === 0 ? (
          <div className={styles.emptyChatState}>
            <div className={styles.chatIcon}>💬</div>
            <p>选择提示词开始AI对话</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.chatMessage} ${styles[message.sender]}`}
            >
              <div className={styles.messageContent}>
                {renderMessageContent(message)}
              </div>
              <div className={styles.messageTime}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {isAILoading && (
          <div className={styles.loadingMessage}>
            <div className={styles.loadingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* 文件上传区域 */}
      {uploadedFiles.length > 0 && (
        <div className={styles.uploadedFiles}>
          <div 
            className={styles.uploadedFilesHeader}
            onClick={() => setIsFileListExpanded(!isFileListExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <span>已上传文件 ({uploadedFiles.length})</span>
            <ChevronDown 
              size={16} 
              style={{ 
                transform: isFileListExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} 
            />
          </div>
          {isFileListExpanded && (
            <div className={styles.filesList}>
              {uploadedFiles.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    {file.type.startsWith('image/') ? (
                      <ImageIcon size={16} />
                    ) : file.type === 'application/pdf' ? (
                      <span style={{ fontSize: '16px' }}>📄</span>
                    ) : file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx') ? (
                      <span style={{ fontSize: '16px' }}>📝</span>
                    ) : (
                      <FileText size={16} />
                    )}
                    <span className={styles.fileName}>{file.name}</span>
                  </div>
                  <button
                    className={styles.removeFileButton}
                    onClick={() => handleRemoveFile(index)}
                    title="移除文件"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 输入区域 */}
      <div className={styles.chatInputArea}>
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            className={styles.chatTextarea}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="询问AI关于LaTeX格式化、数学分析等问题..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </div>
        
        <div className={styles.inputFooter}>
          <div className={styles.inputFooterLeft}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={styles.modelSelector}
            >
              {openRouterApi.getAvailableModels().map((model) => (
                <option key={model.modelId} value={model.modelId}>
                  {model.name} {model.supportsImages ? '🖼️' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.inputFooterRight}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="上传图片、PDF、Word文档或文本文件"
            >
              📎
            </button>
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isAILoading}
            >
              <Send size={16} />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 🎯 渲染通知消息
  const renderNotifications = () => (
    <>
      {successMessage && (
        <div className={styles.notification + ' ' + styles.success}>
          <Check size={16} />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className={styles.notification + ' ' + styles.error}>
          <X size={16} />
          {errorMessage}
        </div>
      )}
    </>
  );

  // 🎯 主要渲染
  if (!isOpen) return null;

  return (
    <div className={styles.modernLaTeXPanel}>
      {renderHeader()}
      <div className={styles.panelBody}>
        {renderSelectorArea()}
        {renderContentEditArea()}
        {renderAIChatArea()}
      </div>
      {renderNotifications()}
    </div>
  );
};

export default ModernLaTeXPanel; 