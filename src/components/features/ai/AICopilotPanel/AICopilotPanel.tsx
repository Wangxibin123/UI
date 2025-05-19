import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './AICopilotPanel.module.css';
import { Send, ChevronDown, ChevronUp, Trash2, PlusCircle, Settings, Wand2, Paperclip, Sigma, Brain, AlignLeft, Check } from 'lucide-react'; // Added Sigma, Brain, AlignLeft, Check
import NodeMentionSuggestions from './NodeMentionSuggestions'; // Import the new component

// Define the structure for a chat message
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: Date;
}

// --- Define DagNodeInfo interface ---
export interface DagNodeInfo {
  id: string;
  label?: string;
  content?: string; // Added optional content property
  // Potentially other simple data useful for suggestions, like type
}

// Define the props for the AICopilotPanel
export interface AICopilotPanelProps {
  isOpen: boolean;
  onToggle?: () => void;
  dagNodes?: DagNodeInfo[];
  contextNodeInfo?: DagNodeInfo | null;
  onSendMessage: (message: string, mode: CopilotMode, model: string, contextNode?: DagNodeInfo | null) => void;
  currentMode: CopilotMode;
  onModeChange: (mode: CopilotMode) => void;
  title?: string;
  className?: string;
}

// Define mode type and display names
export type CopilotMode = 'latex' | 'analysis' | 'summary';

const modeDisplayNames: Record<CopilotMode, string> = {
  latex: 'LaTeX 格式化',
  analysis: '解析分析',
  summary: '总结归纳',
};

const modeIcons: Record<CopilotMode, React.ElementType> = {
  latex: Sigma,     // Sigma for LaTeX/Math
  analysis: Brain,  // Brain for Analysis
  summary: AlignLeft, // AlignLeft for Summarization (like document icon)
};

// --- Model Definitions ---
const availableModels: string[] = [
  'openai/o3',
  'openai/gpt-4.5-preview',
  'google/gemini-2.5-flash-preview:thinking',
  'deepseek/deepseek-prover-v2 (671 B)', // Default
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1',
  'qwen/qwen3-30b-a3b',
  'qwen/qwen3-235b-a22b',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.7-sonnet:thinking',
];

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  isOpen,
  onToggle,
  dagNodes,
  contextNodeInfo,
  onSendMessage,
  currentMode,
  onModeChange,
  title = "AI Copilot",
  className,
}) => {
  console.log('Received dagNodes:', dagNodes); // <--- 添加这行来调试
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isInputUserModified, setIsInputUserModified] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModeDropdown, setShowModeDropdown] = useState<boolean>(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // --- 1. Create a ref for the messages container ---
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // --- 1. Create a ref for the input textarea ---
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // <<< 确保 messagesEndRef 的定义存在

  // --- States for Node Mention Suggestions ---
  const [showNodeSuggestions, setShowNodeSuggestions] = useState<boolean>(false);
  const [nodeSuggestionQuery, setNodeSuggestionQuery] = useState<string>('');
  const [filteredDagNodes, setFilteredDagNodes] = useState<DagNodeInfo[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const suggestionsRef = useRef<HTMLDivElement>(null); // Ref for the suggestions panel itself

  // --- States for Model Selector ---
  const [selectedModel, setSelectedModel] = useState<string>(availableModels[3]); // Default to deepseek/deepseek-prover-v2 (671 B)
  const [showModelSelectorDropdown, setShowModelSelectorDropdown] = useState<boolean>(false);
  const modelSelectorDropdownRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setCurrentInput(newValue);
    setIsInputUserModified(true);

    const cursorPos = event.target.selectionStart;
    let showSuggestions = false;
    let currentMentionQuery = '';

    // Check for an active mention trigger: an '@' symbol not preceded by a non-whitespace character
    // and not followed immediately by a space (if it's the last char, that's ok for now)
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (newValue[i] === '@') {
        if (i === 0 || /\s/.test(newValue[i - 1])) {
          const query = newValue.substring(i + 1, cursorPos);
          // A mention query part itself should not contain spaces.
          // If it does, the part before the space might be the query.
          // For simplicity now, we assume the query is up to the cursor or next space.
          const spaceAfterQueryIndex = query.indexOf(' ');
          if (spaceAfterQueryIndex === -1) { // No space within the query part itself
            currentMentionQuery = query;
            showSuggestions = true;
          } else {
            // If there is a space after the @query, then suggestions should not be shown for this segment
            // currentMentionQuery = query.substring(0, spaceAfterQueryIndex);
            // showSuggestions = true; // Uncomment and adjust if you want to allow query then space
            showSuggestions = false; // For now, space in query hides suggestions
          }
        }
        break; // Found the nearest '@' to the left, process and exit loop
      }
      // If we hit a space walking backwards and haven't found an '@', it's not an active mention from this point
      if (newValue[i] === ' ') {
        break;
      }
    }

    if (showSuggestions && dagNodes && dagNodes.length > 0) {
      console.log('Trying to filter. Query:', currentMentionQuery, 'Nodes:', dagNodes); // <---
      const normalizedQuery = currentMentionQuery.toLowerCase();
      const filtered = dagNodes.filter(
        (node) =>
          node.id.toLowerCase().includes(normalizedQuery) ||
          (node.label && node.label.toLowerCase().includes(normalizedQuery))
      );

      if (filtered.length > 0) {
        setFilteredDagNodes(filtered);
        setNodeSuggestionQuery(currentMentionQuery); // Store the actual query used
        setShowNodeSuggestions(true);
        setActiveSuggestionIndex(0); // Reset active index
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

  // --- Handle selecting a node from suggestions ---
  const handleNodeSelect = (node: DagNodeInfo) => {
    const mentionText = `@[${node.label || node.id}]`; // Simple format, can be customized
    
    const currentVal = currentInput;
    const cursorPos = inputRef.current?.selectionStart ?? currentVal.length;

    let beforeCursor = currentVal.substring(0, cursorPos);
    const afterCursor = currentVal.substring(cursorPos);

    // Find the start of the @mention query
    const atSymbolIndex = beforeCursor.lastIndexOf('@');
    
    if (atSymbolIndex !== -1) {
      // Ensure this @ is the one that triggered the suggestions
      // (e.g. not part of some other text unrelated to current mention query)
      // This check can be more robust if needed, but for now, lastIndexOf is a good start.
      const partBeforeAt = beforeCursor.substring(0, atSymbolIndex);
      const newText = partBeforeAt + mentionText + afterCursor;
      
      setCurrentInput(newText);
      setShowNodeSuggestions(false);
      setFilteredDagNodes([]);
      setNodeSuggestionQuery('');
      setIsInputUserModified(true); // User has made a selection

      // Focus and set cursor position after the inserted mention
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = partBeforeAt.length + mentionText.length;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // --- Handle keyboard navigation for suggestions ---
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
          event.preventDefault(); // Prevent form submission & newline
          if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredDagNodes.length) {
            handleNodeSelect(filteredDagNodes[activeSuggestionIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowNodeSuggestions(false);
          // Optionally clear filteredDagNodes and nodeSuggestionQuery here as well
          // setFilteredDagNodes([]);
          // setNodeSuggestionQuery('');
          break;
        default:
          break;
      }
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // 当没有显示建议时，按 Enter 直接提交消息
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault(); // Prevent default form submission if event is passed
    if (!currentInput.trim()) {
        inputRef.current?.focus();
        return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: currentInput.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    const userInput = currentInput.trim();
    setCurrentInput(''); 
    setIsInputUserModified(false); 

    // Simulate AI response (replace with actual API call)
    console.log(`User sent to AI (simulated): ${userInput}, Context: ${contextNodeInfo?.id}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      text: `模拟AI回复针对: "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}"`,
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, aiResponse]);
    setIsLoading(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    // Pass currentMode and selectedModel to onSendMessage
    onSendMessage(userInput, currentMode, selectedModel, contextNodeInfo);
  }, [currentInput, isInputUserModified, contextNodeInfo, messages, setIsLoading, onSendMessage, currentMode, selectedModel]);

  // --- Callback to clear messages ---
  const handleClearMessages = useCallback(() => {
    if (messages.length === 0) return; // No need to confirm if already empty

    if (window.confirm("您确定要清空所有对话记录吗？此操作无法撤销。")) {
      setMessages([]);
      // Optionally, focus input after clearing if desired, though not strictly necessary here
      // inputRef.current?.focus(); 
    }
  }, [messages]); // Dependency on messages to re-evaluate if it's empty

  // --- 2. useEffect to scroll to bottom when messages change ---
  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
      // For a more instant scroll, you can also use:
      // messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]); // Dependency is messages array

  // --- 4. useEffect to update input when contextNodeInfo changes ---
  useEffect(() => {
    if (contextNodeInfo && contextNodeInfo.id) {
      // To prevent re-filling if the input was manually cleared after context was set
      // We can compare with previous contextNodeInfo.id if we store it, or just always fill.
      // For simplicity now, always fill if contextNodeInfo has an id.
      // A more robust way might be to check if currentInput is empty or doesn't already contain this context.
      
      let pretext = `关于节点 "${contextNodeInfo.label || contextNodeInfo.id}":\n`;
      if (contextNodeInfo.content) {
        // Keep content short for the input field
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

      inputRef.current?.focus(); // Focus input when context is set
      // Optionally, scroll the input to the top if the pretext is multi-line
      if(inputRef.current) inputRef.current.scrollTop = 0;

    } else {
      // Optional: Clear input if context is removed, but only if the input still contains context-specific text.
      // This part can be tricky. For now, let's not auto-clear when contextNodeInfo becomes null to avoid deleting user's manual input.
      // setCurrentInput(''); 
    }
    // Dependency array: listen to changes in contextNodeInfo object itself.
    // If contextNodeInfo is an object, React compares it by reference. 
    // A new object from MainLayout will trigger this effect.
  }, [contextNodeInfo, currentInput, isInputUserModified]);

  useEffect(() => {
    // 点击外部区域时关闭节点建议面板
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

  // --- Helper function to format model name for display on button ---
  const formatDisplayModelName = (modelId: string): string => {
    if (!modelId) return 'Select Model';
    // Example: "deepseek/deepseek-prover-v2 (671 B)" -> "DeepSeek Prover v2"
    // Example: "google/gemini-2.5-flash-preview:thinking" -> "Gemini Flash Preview"
    let name = modelId.substring(modelId.indexOf('/') + 1);
    name = name.replace(/:thinking/g, '').replace(/ \(.*\)/g, ''); // Remove :thinking and (XXX B)
    name = name.replace(/-/g, ' ').replace(/preview/g, 'Preview');
    // Capitalize words
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
  };
  
  // --- Helper function to format model name for list items ---
  const formatModelListItem = (modelId: string): React.ReactNode => {
    // Show the full ID, perhaps with parts styled differently if needed later
    // For now, just the ID. Can be enhanced to return JSX with styled suffixes.
    return modelId;
  };

  // Update textarea placeholder based on props.currentMode
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

  // Effect to handle clicks outside the mode dropdown
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

  // --- useEffect for Model Selector Dropdown outside click ---
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
        <button onClick={onToggle} className={styles.toggleButton}>
          {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
      {/* --- Move context display text here --- */}
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

      {/* Modified input area to be a form directly */}
      <form className={styles.inputSection} onSubmit={handleSubmit}>
        <div className={styles.contextBar}>
          <PlusCircle size={16} className={styles.contextBarIcon} />
          <span className={styles.contextBarText}>Add context</span>
        </div>

        <div className={styles.textAreaWrapper}>
          {showNodeSuggestions && filteredDagNodes.length > 0 && (
            <div ref={suggestionsRef} className={styles.suggestionsPanel}>
              <NodeMentionSuggestions
                suggestions={filteredDagNodes}
                activeSuggestionIndex={activeSuggestionIndex}
                onSelectNode={handleNodeSelect}
                containerRef={suggestionsRef}
              />
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

        {/* Fully implemented Bottom Action Bar - MODIFIED */}
        <div className={styles.bottomActionBar}> 
          <div className={styles.actionBarLeft}>
            {/* Model Selector Dropdown */}
            <div className={styles.modelSelectorWrapper} ref={modelSelectorDropdownRef}>
              <button 
                type="button" 
                className={`${styles.actionButton} ${styles.modelSelectorButton}`}
                onClick={() => setShowModelSelectorDropdown(!showModelSelectorDropdown)}
                title={`Current model: ${selectedModel}. Click to switch.`}
              >
                <Brain size={16} className={styles.selectedModelPrefixIcon} /> {/* Cursor-like brain icon */}
                <span className={styles.selectedModelName}>{formatDisplayModelName(selectedModel)}</span>
                <ChevronDown size={14} className={`${styles.modelSelectorChevronIcon} ${showModelSelectorDropdown ? styles.chevronUp : ''}`}/>
              </button>
              {showModelSelectorDropdown && (
                <ul className={styles.modelSelectorDropdownList}>
                  {availableModels.map(modelId => (
                    <li 
                      key={modelId}
                      className={selectedModel === modelId ? styles.activeModelOption : ''}
                      onClick={() => { setSelectedModel(modelId); setShowModelSelectorDropdown(false); }}
                      title={modelId} // Show full ID on hover for clarity
                    >
                      {formatModelListItem(modelId)} {/* Shows full ID for now */}
                      {selectedModel === modelId && <Check size={16} className={styles.selectedModelCheckmarkIcon} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Other future left action buttons can go here */}
            {/* Removed Wand2 placeholder, Settings was replaced by model selector */}
          </div>
          <div className={styles.actionBarRight}>
            <button type="button" className={styles.actionButton} title="Attach file (Coming Soon)">
              <Paperclip size={16} />
            </button>
            <button 
              type="submit"
              className={`${styles.sendButton} ${styles.actionBarSendButton}`} 
              disabled={!currentInput.trim() || isLoading}
            >
              {isLoading ? 'Sending...' : <Send size={16} />}
            </button>
          </div>
        </div>
      </form>

    </div>
  );
};

export default AICopilotPanel; 