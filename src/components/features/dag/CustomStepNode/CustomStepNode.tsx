import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import type { DagNodeRfData } from '../../../../types';
import { VerificationStatus } from '../../../../types';
import styles from './CustomStepNode.module.css';
import Latex from 'react-latex-next';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
  StickyNote
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

  const { className: statusClassName, IconComponent, iconClass: statusIconSpecificClass } = getStatusStyleAndIcon(data.verificationStatus);

  const displayLatex = data.fullLatexContent && data.fullLatexContent.length > 40
    ? `${data.fullLatexContent.substring(0, 37)}...`
    : data.fullLatexContent || '';

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

  return (
    <div
      className={classNames(
        styles.customNode,
        statusClassName,
        { 
          [styles.deletedNode]: isActuallyDeleted,
          [styles.selected]: !!selected,            
          [styles.inferenceNode]: !!data.isDerived,
          [styles.onNewPath]: !!data.isOnNewPath,
        }
      )}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} id={`${id}-target`} />
      
      <div className={styles.nodeHeaderIcons}> 
        {IconComponent && (
          <IconComponent className={`${styles.statusIcon} ${statusIconSpecificClass}`} size={20} />
        )}
        {hasNotes && ( 
          <span title="包含备注">
            <StickyNote className={styles.noteIndicatorIcon} size={16} />
          </span>
        )}
      </div>
      
      <div className={styles.nodeLabel}>{data.label}</div>
      
      {displayLatex && (
        <div className={styles.nodeContent}>
          <Latex>{`$$${displayLatex.replace(/^\$\$|\$\$$/g, '')}$$`}</Latex>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className={styles.handle} id={`${id}-source`} />
    </div>
  );
};

export default React.memo(CustomStepNode);