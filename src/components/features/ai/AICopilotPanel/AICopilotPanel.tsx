import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './AICopilotPanel.module.css';
import { Send, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'; // Added Trash2 icon

// Define the structure for a chat message
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: Date;
}

// Define the props for the AICopilotPanel
export interface AICopilotPanelProps {
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
  initialMessages?: Message[]; // Allow passing initial messages
  contextNodeInfo?: CopilotContextNodeInfo | null;
}

// --- 1. Define CopilotContextNodeInfo interface (can also be imported if shared) ---
export interface CopilotContextNodeInfo {
  id: string;
  label?: string;
  content?: string; 
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  isOpen = true, // Default to open if not controlled externally
  onToggle,
  title = 'AI Copilot',
  initialMessages = [],
  contextNodeInfo,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isInputUserModified, setIsInputUserModified] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- 1. Create a ref for the messages container ---
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // --- 1. Create a ref for the input textarea ---
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // <<< 确保 messagesEndRef 的定义存在

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentInput(event.target.value);
    setIsInputUserModified(true);
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

  }, [currentInput, isInputUserModified, contextNodeInfo, messages, setIsLoading]);

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

  if (!isOpen && !onToggle) { // If controlled externally and told to be closed, render nothing or a placeholder
      // If onToggle is not provided, it implies the panel's open state is fully controlled externally.
      // If isOpen is false in that case, we shouldn't render the main panel.
      // Optionally, render a small "tab" or button if onToggle IS provided, allowing it to be opened.
      return null; // Or a collapsed view if designed
  }


  return (
    <div className={`${styles.aiCopilotPanel} ${isOpen || !onToggle ? styles.open : styles.closed}`}>
      <div className={styles.panelHeader}>
        <h3>{title}</h3>
        <div className={styles.headerActions}> {/* Wrapper for header buttons */}
          {messages.length > 0 && ( // Conditionally render clear button
            <button 
              onClick={handleClearMessages}
              className={`${styles.iconButton} ${styles.clearButton}`}
              title="清空对话记录"
            >
              <Trash2 size={16} />
            </button>
          )}
          {onToggle && (
            <button onClick={onToggle} className={styles.iconButton} title={isOpen ? "收起面板" : "展开面板"}>
              {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          )}
        </div>
        <div className={styles.headerButtons}>
          {/* ... header buttons ... */}
        </div>
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
        <div ref={messagesEndRef} /> {/* Use messagesEndRef here */}
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <textarea
          ref={inputRef}
          value={currentInput}
          onChange={handleInputChange}
          placeholder="输入你的问题或指令..."
          rows={3}
          className={styles.inputTextArea}
        />
        <button 
          type="submit"
          disabled={!currentInput.trim() || isLoading}
          className={styles.sendButton}
        >
          {isLoading ? '发送中...' : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};

export default AICopilotPanel; 