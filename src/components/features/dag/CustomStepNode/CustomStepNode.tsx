import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import type { DagNodeRfData } from '../../../../types';
import { VerificationStatus } from '../../../../types';
import styles from './CustomStepNode.module.css';
import Latex from 'react-latex-next'; // Assuming katex.min.css is globally imported

const CustomStepNode: React.FC<NodeProps<DagNodeRfData>> = ({ data, selected, id }) => {
  let nodeClassName = styles.customNode;
  if (selected) {
    nodeClassName += ` ${styles.selected}`;
  }
  // Apply verification status class directly for styling
  if (data.verificationStatus === VerificationStatus.VerifiedCorrect) {
    nodeClassName += ` ${styles.correct}`;
  } else if (data.verificationStatus === VerificationStatus.VerifiedIncorrect) {
    nodeClassName += ` ${styles.incorrect}`;
  }

  // Truncate LaTeX for display in node, prevent overly long strings
  const displayLatex = data.fullLatexContent.length > 40 
    ? `${data.fullLatexContent.substring(0, 37)}...` 
    : data.fullLatexContent;

  return (
    <div className={nodeClassName}>
      {/* NodeResizer can be added if you want nodes to be user-resizable */}
      {/* <NodeResizer minWidth={180} minHeight={80} /> */}
      
      {/* Handles: Connection points */}
      <Handle type="target" position={Position.Top} className={styles.handle} id={`${id}-target`} />
      
      <div className={styles.nodeHeader}>
        <span>{data.label}</span>
        {data.verificationStatus === VerificationStatus.VerifiedCorrect && 
          <span className={styles.icon} title="Verified Correct">✅</span>}
        {data.verificationStatus === VerificationStatus.VerifiedIncorrect && 
          <span className={styles.icon} title="Verified Incorrect">❌</span>}
        {data.verificationStatus === VerificationStatus.NotVerified && 
          <span className={styles.icon} title="Not Verified">❔</span>}
        {data.verificationStatus === VerificationStatus.Verifying && 
          <span className={styles.icon} title="Verifying...">⏳</span>}
      </div>
      
      <div className={styles.nodeContent}>
        {/* Render the (potentially truncated) LaTeX content */}
        {/* Ensure LaTeX delimiters are present if react-latex-next requires them explicitly */}
        <Latex>{`$$${displayLatex.replace(/^\$\$|\$\$$/g, '')}$$`}</Latex>
      </div>
      
      <Handle type="source" position={Position.Bottom} className={styles.handle} id={`${id}-source`} />
    </div>
  );
};

export default React.memo(CustomStepNode); 