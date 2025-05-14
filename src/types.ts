export interface SolutionStepData {
  id: string;
  stepNumber: number;
  latexContent: string;
  verificationStatus: VerificationStatus;
  explanation?: string;
}

export interface DagNode {
  id: string;
  type?: string; // 'custom', 'input', 'output', 'default'
  data: { label: string; [key: string]: any };
  position: { x: number; y: number };
  style?: React.CSSProperties;
  sourcePosition?: 'left' | 'right' | 'top' | 'bottom';
  targetPosition?: 'left' | 'right' | 'top' | 'bottom';
}

// Specific type for the data payload that React Flow Node will carry
export type DagNodeRfData = DagNode['data'];

export interface DagEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string; // 'custom', 'default', 'step', 'bezier'
  animated?: boolean;
  style?: React.CSSProperties;
  // Make markerEnd compatible with React Flow's EdgeMarkerType (string | MarkerProps)
  // MarkerProps is roughly { type: MarkerType; color?: string; width?: number; height?: number; strokeWidth?: number; orient?: string; }
  // We use a more general object structure here if we can't import MarkerType enum directly.
  markerEnd?: string | { type: string; color?: string; width?: number; height?: number; strokeWidth?: number; orient?: string; [key: string]: any; };
}

export interface ProblemData {
  id: string;
  title: string;
  latexContent: string;
}

export enum VerificationStatus {
  VerifiedCorrect = 'VERIFIED_CORRECT',
  VerifiedIncorrect = 'VERIFIED_INCORRECT',
  NotVerified = 'NOT_VERIFIED',
  Verifying = 'VERIFYING',
} 