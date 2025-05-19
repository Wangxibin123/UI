import React, { useEffect, useRef } from 'react';
import styles from './NodeMentionSuggestions.module.css';
import { DagNodeInfo } from './AICopilotPanel'; // Assuming DagNodeInfo is exported from AICopilotPanel.tsx

interface NodeMentionSuggestionsProps {
  suggestions: DagNodeInfo[];
  activeSuggestionIndex: number;
  onSelectNode: (node: DagNodeInfo) => void;
  // We need a ref for the main container of this component for scrolling
  containerRef?: React.RefObject<HTMLDivElement>; 
}

const NodeMentionSuggestions: React.FC<NodeMentionSuggestionsProps> = ({
  suggestions,
  activeSuggestionIndex,
  onSelectNode,
  containerRef, // Use the passed ref for the scrollable container
}) => {
  // Create a ref for each item in the list to scroll to it
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Ensure itemRefs array is the same length as suggestions
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  useEffect(() => {
    if (
      activeSuggestionIndex >= 0 &&
      activeSuggestionIndex < suggestions.length &&
      itemRefs.current[activeSuggestionIndex] &&
      containerRef?.current // Check if the containerRef is provided and current
    ) {
      const activeItem = itemRefs.current[activeSuggestionIndex];
      // const suggestionsContainer = containerRef.current; // Needed for manual scroll

      // --- 优先尝试 scrollIntoView --- 
      activeItem.scrollIntoView({
        block: 'nearest', // 'start', 'center', 'end', or 'nearest'
        // inline: 'nearest', // Usually not needed for vertical lists
        behavior: 'smooth',
      });

      /* --- 手动滚动逻辑 (如果 scrollIntoView 效果不佳则启用) ---
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerScrollTop = suggestionsContainer.scrollTop;
      const containerHeight = suggestionsContainer.clientHeight;

      if (itemTop < containerScrollTop) {
        suggestionsContainer.scrollTop = itemTop;
      } else if (itemBottom > containerScrollTop + containerHeight) {
        suggestionsContainer.scrollTop = itemBottom - containerHeight;
      }
      */
    }
  }, [activeSuggestionIndex, suggestions, containerRef]);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    // The main container div of this component is what containerRef from AICopilotPanel will point to.
    // Thus, this component doesn't need its own separate scrollable div if containerRef is properly used.
    // The original styles.suggestionsContainer should be applied to the div that containerRef points to.
    // For this to work, AICopilotPanel must pass its suggestionsRef (which has styles.suggestionsPanel)
    // to this component as containerRef.
    <ul className={styles.suggestionsList}>
      {suggestions.map((node, index) => (
        <li
          key={node.id}
          ref={el => (itemRefs.current[index] = el)} // Assign ref to each item
          className={`${styles.suggestionItem} ${
            index === activeSuggestionIndex ? styles.activeSuggestion : ''
          }`}
          onClick={() => onSelectNode(node)}
          onMouseEnter={() => {
            // Optional: If you want mouse hover to also update activeSuggestionIndex for consistent highlight
            // This would require another prop like onHoverItem(index: number)
            // For now, only keyboard controls activeSuggestionIndex, hover has its own CSS style.
          }}
        >
          <span className={styles.nodeLabel}>{node.label || node.id}</span>
          {/* 节点 ID 已决定不显示, 所以下一行注释掉或删除 */}
          {/* <span className={styles.nodeIdAside}>(ID: {node.id})</span> */}
        </li>
      ))}
    </ul>
  );
};

export default NodeMentionSuggestions; 