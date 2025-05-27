import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './AICopilotPanel.module.css';
import { Send, ChevronDown, ChevronUp, Trash2, PlusCircle, Settings, Wand2, Paperclip, Sigma, Brain, AlignLeft, Check, FileText } from 'lucide-react';
import { aiModelService, type AIModel } from '../../../../services/aiModelService';
import NodeMentionSuggestions from './NodeMentionSuggestions';
import EnhancedMentionSuggestions from './EnhancedMentionSuggestions';
import LaTeXFormatPanel from '../LaTeXFormatPanel/LaTeXFormatPanel';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: Date;
}

export interface DagNodeInfo {
  id: string;
  label?: string;
  content?: string;
}

export type CopilotMode = 'latex' | 'analysis' | 'summary';

export interface ProblemInfo {
  id: string;
  title: string;
  content: string;
}

export interface AICopilotPanelProps {
  isOpen: boolean;
  onToggle?: () => void;
  dagNodes?: DagNodeInfo[];
  contextNodeInfo?: DagNodeInfo | null;
  problemInfo?: ProblemInfo | null;  // 新增题目信息支持
  onSendMessage: (message: string, mode: CopilotMode, model: string, contextNode?: DagNodeInfo | null) => void;
  currentMode: CopilotMode;
  onModeChange: (mode: CopilotMode) => void;
  title?: string;
  className?: string;
  onChatStateChange?: (isActive: boolean) => void;
}

const modeDisplayNames: Record<CopilotMode, string> = {
  latex: 'LaTeX 格式化',
  analysis: '解析分析',
  summary: '总结归纳',
};

const modeIcons: Record<CopilotMode, React.ElementType> = {
  latex: Sigma,
  analysis: Brain,
  summary: AlignLeft,
};

// 🎯 从新的AI模型服务获取可用模型
const getAvailableModels = (): AIModel[] => {
  return aiModelService.getAvailableModels();
};

const getAvailableModelIds = (): string[] => {
  return getAvailableModels().map(model => model.id);
};

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  isOpen,
  onToggle,
  dagNodes,
  contextNodeInfo,
  problemInfo,
  onSendMessage,
  currentMode,
  onModeChange,
  title = "AI Copilot",
  className,
  onChatStateChange,
}) => {
  console.log('Received dagNodes:', dagNodes);
  // 为每种模式创建独立的聊天状态
  const [modeMessages, setModeMessages] = useState<Record<CopilotMode, Message[]>>({
    analysis: [],
    latex: [],
    summary: [],
  });
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isInputUserModified, setIsInputUserModified] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModeDropdown, setShowModeDropdown] = useState<boolean>(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // 获取当前模式的聊天记录
  const messages = modeMessages[currentMode] || [];

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showNodeSuggestions, setShowNodeSuggestions] = useState<boolean>(false);
  const [nodeSuggestionQuery, setNodeSuggestionQuery] = useState<string>('');
  const [filteredDagNodes, setFilteredDagNodes] = useState<DagNodeInfo[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  
  // 增强@逻辑功能状态
  const [useEnhancedMentions, setUseEnhancedMentions] = useState<boolean>(true);

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const models = getAvailableModelIds();
    return models.length > 3 ? models[3] : (models[0] || 'deepseek-prover-v2');
  });
  const [showModelSelectorDropdown, setShowModelSelectorDropdown] = useState<boolean>(false);
  const modelSelectorDropdownRef = useRef<HTMLDivElement>(null);
  
  // 文件上传相关状态
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LaTeX格式化面板状态
  const [showLatexFormatPanel, setShowLatexFormatPanel] = useState<boolean>(false);
  const [latexPanelInitialContent, setLatexPanelInitialContent] = useState<string>('');
  const [latexPanelContextStep, setLatexPanelContextStep] = useState<{
    id: string;
    content: string;
    stepNumber: number;
  } | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setCurrentInput(newValue);
    setIsInputUserModified(true);

    const cursorPos = event.target.selectionStart;
    let showSuggestions = false;
    let currentMentionQuery = '';

    for (let i = cursorPos - 1; i >= 0; i--) {
      if (newValue[i] === '@') {
        if (i === 0 || /\s/.test(newValue[i - 1])) {
          const query = newValue.substring(i + 1, cursorPos);
          const spaceAfterQueryIndex = query.indexOf(' ');
          if (spaceAfterQueryIndex === -1) {
            currentMentionQuery = query;
            showSuggestions = true;
          } else {
            showSuggestions = false;
          }
        }
        break;
      }
      if (newValue[i] === ' ') {
        break;
      }
    }

    if (showSuggestions && dagNodes && dagNodes.length > 0) {
      console.log('Trying to filter. Query:', currentMentionQuery, 'Nodes:', dagNodes);
      const normalizedQuery = currentMentionQuery.toLowerCase();
      const filtered = dagNodes.filter(
        (node) =>
          node.id.toLowerCase().includes(normalizedQuery) ||
          (node.label && node.label.toLowerCase().includes(normalizedQuery))
      );

      if (filtered.length > 0) {
        setFilteredDagNodes(filtered);
        setNodeSuggestionQuery(currentMentionQuery);
        setShowNodeSuggestions(true);
        setActiveSuggestionIndex(0);
      } else {
        setShowNodeSuggestions(false);
        setFilteredDagNodes([]);
      }
    } else {
      setShowNodeSuggestions(false);
      setNodeSuggestionQuery('');
      setFilteredDagNodes([]);
    }
  };

  const handleNodeSelect = (node: DagNodeInfo | import('./EnhancedMentionSuggestions').ProblemInfo) => {
    const mentionText = 'title' in node 
      ? `@[题目: ${node.title}]` 
      : `@[${node.label || node.id}]`;
    
    const currentVal = currentInput;
    const cursorPos = inputRef.current?.selectionStart ?? currentVal.length;

    let beforeCursor = currentVal.substring(0, cursorPos);
    const afterCursor = currentVal.substring(cursorPos);

    const atSymbolIndex = beforeCursor.lastIndexOf('@');
    
    if (atSymbolIndex !== -1) {
      const partBeforeAt = beforeCursor.substring(0, atSymbolIndex);
      const newText = partBeforeAt + mentionText + afterCursor;
      
      setCurrentInput(newText);
      setShowNodeSuggestions(false);
      setFilteredDagNodes([]);
      setNodeSuggestionQuery('');
      setIsInputUserModified(true);

      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = partBeforeAt.length + mentionText.length;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showNodeSuggestions && filteredDagNodes.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveSuggestionIndex((prevIndex) =>
            prevIndex === filteredDagNodes.length - 1 ? 0 : prevIndex + 1
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveSuggestionIndex((prevIndex) =>
            prevIndex === 0 ? filteredDagNodes.length - 1 : prevIndex - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredDagNodes.length) {
            handleNodeSelect(filteredDagNodes[activeSuggestionIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowNodeSuggestions(false);
          break;
        default:
          break;
      }
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // 文件上传处理函数
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      // 支持的文件类型：图片、文档
      const supportedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const maxSize = 10 * 1024 * 1024; // 10MB限制
      
      if (!supportedTypes.includes(file.type)) {
        alert(`不支持的文件类型: ${file.name}`);
        return false;
      }
      
      if (file.size > maxSize) {
        alert(`文件过大: ${file.name} (最大支持10MB)`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      // 清空input以允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleRemoveFile = useCallback((fileIndex: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== fileIndex));
  }, []);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 处理文件上传到后端（模拟）
  const uploadFilesToBackend = useCallback(async (files: File[]): Promise<string[]> => {
    setIsUploading(true);
    try {
      // 这里是模拟的上传逻辑，实际情况下需要调用后端API
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 实际情况下，这里应该是:
        // const response = await fetch('/api/upload', {
        //   method: 'POST',
        //   body: formData,
        // });
        // const result = await response.json();
        // return result.fileUrl || result.fileId;
        
        // 模拟返回文件URL或ID
        return `uploaded_${file.name}_${Date.now()}`;
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      console.log('文件上传成功:', uploadResults);
      return uploadResults;
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
      return [];
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!currentInput.trim() && uploadedFiles.length === 0) {
        inputRef.current?.focus();
        return;
    }

    // 🎯 LaTeX模式特殊处理：打开LaTeX格式化面板
    if (currentMode === 'latex') {
      // 如果有上下文节点信息，传递给LaTeX面板
      if (contextNodeInfo && contextNodeInfo.content) {
        setLatexPanelContextStep({
          id: contextNodeInfo.id,
          content: contextNodeInfo.content,
          stepNumber: parseInt(contextNodeInfo.label?.match(/\d+/)?.[0] || '0')
        });
        setLatexPanelInitialContent(contextNodeInfo.content);
      } else {
        setLatexPanelInitialContent(currentInput.trim());
      }
      setShowLatexFormatPanel(true);
      return;
    }

    // 处理文件上传（如果有文件的话）
    let uploadResults: string[] = [];
    if (uploadedFiles.length > 0) {
      uploadResults = await uploadFilesToBackend(uploadedFiles);
      if (uploadResults.length === 0) {
        // 如果文件上传失败，不继续发送消息
        return;
      }
    }

    // 创建包含文件信息的消息文本
    let messageText = currentInput.trim();
    if (uploadedFiles.length > 0) {
      const fileNames = uploadedFiles.map(f => f.name).join(', ');
      messageText += uploadedFiles.length > 0 ? `\n\n📎 已上传文件: ${fileNames}` : '';
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

          // 向当前模式添加用户消息
      setModeMessages(prev => ({
        ...prev,
        [currentMode]: [...prev[currentMode], userMessage],
      }));
    setIsLoading(true);
    const userInput = currentInput.trim();
    
    // 清空输入和文件
    setCurrentInput(''); 
    setIsInputUserModified(false);
    setUploadedFiles([]);

    console.log(`User sent to AI (simulated): ${userInput}, Files: ${uploadResults.join(', ')}, Context: ${contextNodeInfo?.id}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      text: `模拟AI回复针对: "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}"${uploadResults.length > 0 ? ` (已处理 ${uploadResults.length} 个文件)` : ''}`,
      sender: 'ai',
      timestamp: new Date(),
    };
          // 向当前模式添加AI响应
      setModeMessages(prev => ({
        ...prev,
        [currentMode]: [...prev[currentMode], aiResponse],
      }));
    setIsLoading(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    // 将文件信息传递给父组件（这里需要扩展onSendMessage接口以支持文件）
    onSendMessage(userInput, currentMode, selectedModel, contextNodeInfo);
  }, [currentInput, isInputUserModified, contextNodeInfo, messages, setIsLoading, onSendMessage, currentMode, selectedModel, uploadedFiles, uploadFilesToBackend]);

  const handleClearMessages = useCallback(() => {
    if (messages.length === 0) return;

    if (window.confirm("您确定要清空所有对话记录吗？此操作无法撤销。")) {
      // 清空当前模式的聊天记录
    setModeMessages(prev => ({
      ...prev,
      [currentMode]: [],
    }));
    }
  }, [messages]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
    if (onChatStateChange) {
      onChatStateChange(messages.length > 0);
    }
  }, [messages, onChatStateChange]);

  useEffect(() => {
    if (contextNodeInfo && contextNodeInfo.id) {
      let pretext = `关于节点 "${contextNodeInfo.label || contextNodeInfo.id}":\n`;
      if (contextNodeInfo.content) {
        const summarizedContent = contextNodeInfo.content.length > 70 
            ? contextNodeInfo.content.substring(0, 67) + "..." 
            : contextNodeInfo.content;
        pretext += `内容摘要: "${summarizedContent}"\n请帮我分析一下这个步骤，或者解释一下相关概念。
`;
      } else {
        pretext += `请帮我分析一下这个节点，或者解释一下相关概念。
`;
      }
      
      if (!isInputUserModified || currentInput === '') {
        setCurrentInput(pretext);
        setIsInputUserModified(false);
      }

      inputRef.current?.focus();
      if(inputRef.current) inputRef.current.scrollTop = 0;

    } else {
    }
  }, [contextNodeInfo, currentInput, isInputUserModified]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowNodeSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestionsRef, inputRef]);

  const formatDisplayModelName = (modelId: string): string => {
    if (!modelId) return 'Select Model';
    const model = getAvailableModels().find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  const getPlaceholderText = () => {
    switch (currentMode) {
      case 'latex':
        return '输入内容以格式化为 LaTeX...';
      case 'analysis':
        return '输入问题或代码进行解析分析...';
      case 'summary':
        return '粘贴文本或描述内容以获取摘要...';
      default:
        return '开始输入...';
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modeDropdownRef]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorDropdownRef.current && !modelSelectorDropdownRef.current.contains(event.target as Node)) {
        setShowModelSelectorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelSelectorDropdownRef]);

  if (!isOpen && !onToggle && !className) {
    return null;
  }

  return (
    <div className={`${styles.aiCopilotPanel} ${className || ''} ${isOpen || !onToggle ? styles.open : styles.closed}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{title}</span>
        
        <div className={styles.mainModeSelectorWrapper} ref={modeDropdownRef}>
          <button onClick={() => setShowModeDropdown(!showModeDropdown)} className={styles.mainModeButton}>
            {React.createElement(modeIcons[currentMode], { size: 16, className: styles.currentModeIcon })}
            <span className={styles.currentModeText}>{modeDisplayNames[currentMode]}</span>
            <ChevronDown size={16} className={`${styles.modeSelectorChevron} ${showModeDropdown ? styles.chevronUp : ''}`} />
          </button>
          {showModeDropdown && (
            <ul className={styles.mainModeDropdownList}>
              {(Object.keys(modeDisplayNames) as CopilotMode[]).map((modeId) => (
                <li 
                  key={modeId} 
                  onClick={() => { onModeChange(modeId); setShowModeDropdown(false); }}
                  className={currentMode === modeId ? styles.activeModeOption : ''}
                >
                  {React.createElement(modeIcons[modeId], { size: 16, className: styles.dropdownModeIcon })}
                  {modeDisplayNames[modeId]}
                  {currentMode === modeId && <Check size={14} className={styles.selectedModeCheckmark} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.headerActionButtons}> 
          <button
            type="button"
            onClick={handleClearMessages}
            className={`${styles.iconButton} ${styles.clearChatButton}`}
            title="清空聊天记录"
          >
            <Trash2 size={18} />
          </button>
          
          {onToggle && (
            <button onClick={onToggle} className={`${styles.iconButton} ${styles.toggleButton}`} title={isOpen ? "折叠面板" : "展开面板"}>
              {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          )}
        </div>
      </div>
      {contextNodeInfo && (contextNodeInfo.label || contextNodeInfo.id) && (
        <div className={styles.contextDisplay}>
          当前分析节点: {contextNodeInfo.label || contextNodeInfo.id}
        </div>
      )}
      <div className={styles.messagesArea} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <p className={styles.noMessagesText}>开始对话或提问...</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`${styles.message} ${styles[msg.sender]}`}>
              <p className={styles.messageText}>{msg.text}</p>
              {msg.timestamp && (
                <span className={styles.timestamp}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputSection} onSubmit={handleSubmit}>
        <div className={styles.contextBar}>
          <PlusCircle size={16} className={styles.contextBarIcon} />
          <span className={styles.contextBarText}>Add context</span>
        </div>

                 {/* 文件显示区域 */}
        {uploadedFiles.length > 0 && (
          <div className={styles.uploadedFilesContainer}>
            {uploadedFiles.map((file, index) => (
              <div key={index} className={styles.uploadedFileItem}>
                <span className={styles.fileName}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className={styles.removeFileButton}
                  title="移除文件"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.textAreaWrapper}>
           {showNodeSuggestions && (filteredDagNodes.length > 0 || problemInfo) && (
             <div className={styles.suggestionsPanel}>
               {useEnhancedMentions ? (
                 <EnhancedMentionSuggestions
                   suggestions={filteredDagNodes}
                   problemInfo={problemInfo}
                   activeSuggestionIndex={activeSuggestionIndex}
                   onSelectNode={handleNodeSelect}
                   query={nodeSuggestionQuery}
                   mode={currentMode}
                 />
               ) : (
                 <NodeMentionSuggestions
                   ref={suggestionsRef}
                   suggestions={filteredDagNodes}
                   activeSuggestionIndex={activeSuggestionIndex}
                   onSelectNode={handleNodeSelect}
                   suggestionsRef={suggestionsRef}
                 />
               )}
             </div>
           )}
          <textarea
            ref={inputRef}
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            rows={3}
            className={styles.inputTextArea}
          />
        </div>

        <div className={styles.bottomActionBar}> 
          <div className={styles.actionBarLeft}>
            <div className={styles.modelSelectorWrapper} ref={modelSelectorDropdownRef}>
              <button 
                type="button" 
                className={`${styles.actionButton} ${styles.modelSelectorButton}`}
                onClick={() => setShowModelSelectorDropdown(!showModelSelectorDropdown)}
                title={`Current model: ${selectedModel}. Click to switch.`}
              >
                <Brain size={16} className={styles.selectedModelPrefixIcon} />
                <span className={styles.selectedModelName}>{formatDisplayModelName(selectedModel)}</span>
                <ChevronDown size={14} className={`${styles.modelSelectorChevronIcon} ${showModelSelectorDropdown ? styles.chevronUp : ''}`}/>
              </button>
              {showModelSelectorDropdown && (
                <ul className={styles.modelSelectorDropdownList}>
                  {getAvailableModels().map((model: AIModel) => (
                    <li 
                      key={model.id}
                      className={selectedModel === model.id ? styles.activeModelOption : ''}
                      onClick={() => { setSelectedModel(model.id); setShowModelSelectorDropdown(false); }}
                      title={`${model.name} - ${model.description || ''}`}
                    >
                      <div className={styles.modelItemContent}>
                        <span className={styles.modelName}>{model.name}</span>
                        <span className={styles.modelProvider}>{model.provider.toUpperCase()}</span>
                        {model.supportsImages && <span className={styles.imageSupport}>📷</span>}
                      </div>
                      {selectedModel === model.id && <Check size={16} className={styles.selectedModelCheckmarkIcon} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.actionBarRight}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button 
              type="button" 
              className={styles.actionButton} 
              onClick={handleAttachmentClick}
              disabled={isUploading}
              title={isUploading ? "上传中..." : "上传文件"}
            >
              <Paperclip size={16} />
            </button>
            <button 
              type="submit"
              className={`${styles.sendButton} ${styles.actionBarSendButton}`} 
              disabled={(!currentInput.trim() && uploadedFiles.length === 0) || isLoading || isUploading}
            >
              {isLoading || isUploading ? 'Sending...' : <Send size={16} />}
            </button>
          </div>
        </div>
      </form>

      {/* 🎨 LaTeX格式化面板 */}
      <LaTeXFormatPanel
        isOpen={showLatexFormatPanel}
        onClose={() => {
          setShowLatexFormatPanel(false);
          setLatexPanelInitialContent('');
          setLatexPanelContextStep(null);
        }}
        initialContent={latexPanelInitialContent}
        contextStepInfo={latexPanelContextStep}
      />
    </div>
  );
};

export default AICopilotPanel; 