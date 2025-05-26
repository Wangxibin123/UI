import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import type { DagNodeRfData } from '../../../../types';
import { VerificationStatus, ForwardDerivationStatus } from '../../../../types';
import styles from './CustomStepNode.module.css';
import Latex from 'react-latex-next';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
  StickyNote,
  ArrowRightCircle,
  ArrowLeftCircle,
  Lightbulb
} from 'lucide-react';

// TEMPORARY basic classNames utility - UPDATED TYPE SIGNATURE
const classNames = (...classes: (string | null | undefined | {[key: string]: boolean | undefined})[]): string => {
  const result: string[] = [];
  classes.forEach(item => {
    if (typeof item === 'string') {
      result.push(item);
    } else if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => {
        if (item[key]) { // This check implicitly handles undefined as falsey
          result.push(key);
        }
      });
    }
  });
  return result.join(' ').trim(); // Added trim() for safety
};

const CustomStepNode: React.FC<NodeProps<DagNodeRfData>> = ({ data, selected, id }) => {
  const getStatusStyleAndIcon = (status?: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VerifiedCorrect:
        return { className: styles.verifiedCorrect, IconComponent: CheckCircle2, iconClass: styles.iconCorrect };
      case VerificationStatus.VerifiedIncorrect:
        return { className: styles.verifiedIncorrect, IconComponent: XCircle, iconClass: styles.iconIncorrect };
      case VerificationStatus.Verifying:
        return { className: styles.verifying, IconComponent: Loader2, iconClass: styles.iconVerifying };
      default:
        return { className: styles.notVerified, IconComponent: HelpCircle, iconClass: styles.iconNotVerified };
    }
  };

  const { className: statusClassNameBase, IconComponent, iconClass: statusIconSpecificClass } = getStatusStyleAndIcon(data.verificationStatus);

  // const displayLatex = data.fullLatexContent && data.fullLatexContent.length > 40
  //   ? `${data.fullLatexContent.substring(0, 37)}...`
  //   : data.fullLatexContent || '';
  // 对于节点内部显示，我们总是尝试渲染，截断交给CSS处理（如果需要）
  const nodeContentToRender = data.fullLatexContent || '';

  const nodeStyle: React.CSSProperties = {
    // control panel overrides position, so we don't need to set it here
    // position: 'absolute',
    // left: xPos,
    // top: yPos,
    // visibility: data.hidden ? 'hidden' : 'visible',
  };

  // Apply highlight color if present
  if (data.highlightColor) {
    nodeStyle.backgroundColor = data.highlightColor;
  }
  // Potentially, you might want a default background color if no highlightColor is set
  // else {
  //   nodeStyle.backgroundColor = '#f0f0f0'; // A default background
  // }

  const isActuallyDeleted = !!data.isDeleted;

  const hasNotes = data.notes && data.notes.trim() !== '';
  const hasInterpretation = data.interpretationIdea && data.interpretationIdea.trim() !== '';

  // Build up className string for the node
  const nodeClasses = classNames(
    styles.customNode,
    statusClassNameBase,
    { 
      [styles.selected]: selected, 
      [styles.deletedNode]: data.isDeleted,
      [styles.onNewPath]: data.isOnNewPath,
      [styles.focusSourceNode]: data.isFocusSource,
      [styles.focusPathNode]: data.isFocusPath && !data.isFocusSource,
      [styles.mainPathNode]: data.isMainPathNode,
      [styles.newPathStartNode]: data.isNewPathStart,
    },
    data.isDeleted ? styles.deletedNode : ''
  );

  return (
    <div className={nodeClasses} style={nodeStyle}>
      <Handle type="target" position={Position.Top} className={styles.handle} id={`${id}-target-top`} />
      <Handle type="target" position={Position.Left} className={styles.handle} id={`${id}-target-left`} />
      
      <div className={styles.nodeHeader}>
        <span className={styles.nodeLabel}>{data.label || `步骤 ${data.stepNumber || id}`}</span>
        <div className={styles.nodeHeaderIcons}>
          {hasNotes && ( 
            <span title={data.notes}>
              <StickyNote 
                size={14} 
                className={styles.noteIndicatorIcon} 
              />
            </span>
          )}
          {hasInterpretation && ( 
            <span title="已提交思路解读">
              <Lightbulb 
                size={14} 
                className={styles.interpretationIndicatorIcon} 
              />
            </span>
          )}
          <IconComponent 
            size={16} 
            className={classNames(
              styles.statusIcon, 
              statusIconSpecificClass, 
              { [styles.spin]: data.verificationStatus === VerificationStatus.Verifying }
            )} 
          />
          {(data.forwardDerivationDisplayStatus || data.backwardDerivationDisplayStatus) && (
            <div className={styles.derivationStatusIconsContainerInHeader}>
              {data.forwardDerivationDisplayStatus === ForwardDerivationStatus.Correct && 
                <span title="Forward derivation correct">
                  <ArrowRightCircle size={12} className={`${styles.derivationIcon} ${styles.forwardCorrectIcon}`} />
                </span>}
              {data.forwardDerivationDisplayStatus === ForwardDerivationStatus.Incorrect && 
                <span title="Forward derivation incorrect">
                  <XCircle size={12} className={`${styles.derivationIcon} ${styles.forwardIncorrectIcon}`} />
                </span>}
              {data.backwardDerivationDisplayStatus === ForwardDerivationStatus.Correct && 
                <span title="Backward derivation correct">
                  <ArrowLeftCircle size={12} className={`${styles.derivationIcon} ${styles.backwardCorrectIcon}`} />
                </span>}
              {data.backwardDerivationDisplayStatus === ForwardDerivationStatus.Incorrect && 
                <span title="Backward derivation incorrect">
                  <XCircle size={12} className={`${styles.derivationIcon} ${styles.backwardIncorrectIcon}`} />
                </span>}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.nodeContent}>
        {nodeContentToRender ? (
          <Latex delimiters={[
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ]}>
            {nodeContentToRender}
          </Latex>
        ) : (
          <span className={styles.noContentFallback}>无内容</span>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className={styles.handle} id={`${id}-source-bottom`} />
      <Handle type="source" position={Position.Right} className={styles.handle} id={`${id}-source-right`} />
    </div>
  );
};

export default React.memo(CustomStepNode);