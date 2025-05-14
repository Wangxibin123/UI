/**
 * Represents the verification status of a DAG node or a step.
 */
export enum VerificationStatus {
  NotVerified = 'NotVerified',
  Verifying = 'Verifying',
  VerifiedCorrect = 'VerifiedCorrect',
  VerifiedIncorrect = 'VerifiedIncorrect',
}

/**
 * Represents the data associated with a DAG node when used with React Flow.
 * This is typically passed to the `data` prop of a React Flow node.
 */
export interface DagNodeRfData {
  label: string; // The primary display text of the node
  verificationStatus: VerificationStatus;
  fullLatexContent?: string; // Full LaTeX content, might be truncated for display
  // Add any other custom data your nodes might need
  [key: string]: any; // Allows for other arbitrary data
}

/**
 * Represents a node in the application's DAG structure before being transformed for React Flow.
 */
export interface DagNode {
  id: string;
  type?: string; // e.g., 'customStepNode', or other types you define
  data: DagNodeRfData; // Embeds the React Flow compatible data structure
  position: { x: number; y: number }; // Absolute position for React Flow
  style?: React.CSSProperties;
  sourcePosition?: string; // e.g., 'bottom', 'top', 'left', 'right'
  targetPosition?: string;
}

/**
 * Represents an edge in the application's DAG structure.
 */
export interface DagEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  label?: string; // Optional label for the edge
  type?: string; // e.g., 'default', 'step', 'smoothstep'
  animated?: boolean;
  style?: React.CSSProperties;
} 