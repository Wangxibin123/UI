// src/components/features/ai/AICopilotPanel/NodeMentionSuggestions.tsx
import React, { useEffect, useRef, forwardRef } from 'react'; // 1. Import forwardRef
import styles from './NodeMentionSuggestions.module.css';
import { DagNodeInfo } from './AICopilotPanel';
import Latex from 'react-latex-next';

// 2. Define props (containerRef will be removed as ref from forwardRef will serve its purpose)
export interface NodeMentionSuggestionsProps {
  suggestions: DagNodeInfo[];
  activeSuggestionIndex: number;
  onSelectNode: (node: DagNodeInfo) => void;
  suggestionsRef: React.RefObject<HTMLUListElement>;
  // removed: containerRef?: React.RefObject<HTMLDivElement>; 
}

// 3. Use forwardRef. The first generic is the type of the DOM element the ref points to (HTMLUListElement).
// The second generic is the type of the props.
const NodeMentionSuggestions = forwardRef<HTMLUListElement, NodeMentionSuggestionsProps>(({
  suggestions,
  activeSuggestionIndex,
  onSelectNode,
  suggestionsRef,
}, ref) => { // 4. 'ref' is now the second argument, passed by React.forwardRef

  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  useEffect(() => {
    // Use 'ref' (which is suggestionsRef from AICopilotPanel) as the scroll container
    const suggestionsContainer = typeof ref === 'function' ? null : ref?.current;

    if (
      activeSuggestionIndex >= 0 &&
      activeSuggestionIndex < suggestions.length &&
      itemRefs.current[activeSuggestionIndex] &&
      suggestionsContainer // Check if the container (the <ul> itself) is available
    ) {
      const activeItem = itemRefs.current[activeSuggestionIndex];
      
      // Attempt scrollIntoView first
      activeItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });

      // Fallback manual scroll logic (can be refined or removed if scrollIntoView is sufficient)
      // const itemTop = activeItem.offsetTop;
      // const itemBottom = itemTop + activeItem.offsetHeight;
      // const containerScrollTop = suggestionsContainer.scrollTop;
      // const containerHeight = suggestionsContainer.clientHeight;

      // if (itemTop < containerScrollTop) {
      //   suggestionsContainer.scrollTop = itemTop;
      // } else if (itemBottom > containerScrollTop + containerHeight) {
      //   suggestionsContainer.scrollTop = itemBottom - containerHeight;
      // }
    }
  }, [activeSuggestionIndex, suggestions, ref]); // Add ref to dependencies

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    // 5. Attach the 'ref' to the root ul element.
    // This ul element should have styles for max-height and overflow-y: auto in its CSS module.
    <ul className={styles.suggestionsList} ref={ref}>
      {suggestions.map((node, index) => (
        <li
          key={node.id}
          ref={el => (itemRefs.current[index] = el)}
          className={`${styles.suggestionItem} ${
            index === activeSuggestionIndex ? styles.activeSuggestion : '' // Using your class name
          }`}
          onClick={() => onSelectNode(node)}
          onMouseEnter={() => { /* Optionally handle mouse enter for active state */ }}
        >
          {/* Display node.label first, then node.id as fallback or secondary info */}
          <span className={styles.nodePrimaryDisplay}>{node.label || node.id}</span>
          {node.label && <span className={styles.nodeIdSecondary}> (ID: {node.id})</span>} {/* Show ID additionally if label exists */}
          
          {node.content && (
            <div className={styles.nodeContentPreview}>
              <Latex delimiters={[
                { left: "$$", right: "$$", display: false }, // Use display:false for compact preview
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false },
                // No block display needed for previews generally
              ]}>
                {/* Truncate long content for preview if necessary */}
                {node.content.length > 70 ? `${node.content.substring(0, 67)}...` : node.content}
              </Latex>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
});

// 6. Add displayName for better debugging in React DevTools
NodeMentionSuggestions.displayName = 'NodeMentionSuggestions';

export default NodeMentionSuggestions;