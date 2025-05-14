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
  HelpCircle
} from 'lucide-react';

const CustomStepNode: React.FC<NodeProps<DagNodeRfData>> = ({ data, selected, id }) => {
  const getStatusStyleAndIcon = (status?: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VerifiedCorrect:
        return { className: styles.verifiedCorrect, IconComponent: CheckCircle2, iconClass: styles.iconCorrect };
      case VerificationStatus.VerifiedIncorrect:
        return { className: styles.verifiedIncorrect, IconComponent: XCircle, iconClass: styles.iconIncorrect };
      case VerificationStatus.Verifying:
        return { className: styles.verifying, IconComponent: Loader2, iconClass: styles.iconVerifying };
      case VerificationStatus.NotVerified:
      default:
        return { className: styles.notVerified, IconComponent: HelpCircle, iconClass: styles.iconNotVerified };
    }
  };

  const { className: statusClassName, IconComponent, iconClass: statusIconSpecificClass } = getStatusStyleAndIcon(data.verificationStatus);

  const baseNodeClasses = selected ? `${styles.nodeBase} ${styles.selected}` : styles.nodeBase;

  const displayLatex = data.fullLatexContent && data.fullLatexContent.length > 40
    ? `${data.fullLatexContent.substring(0, 37)}...`
    : data.fullLatexContent || '';

  return (
    <div className={`${baseNodeClasses} ${statusClassName}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} id={`${id}-target`} />
      
      {IconComponent && (
        <IconComponent className={`${styles.statusIcon} ${statusIconSpecificClass}`} size={20} />
      )}
      
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