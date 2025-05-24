import { MarkerType } from "@reactflow/core";

/**
 * Represents the verification status of a DAG node or a step.
 */
export enum VerificationStatus {
  NotVerified = 'NotVerified',
  Verifying = 'Verifying',
  VerifiedCorrect = 'VerifiedCorrect',
  VerifiedIncorrect = 'VerifiedIncorrect',
  Error = 'Error',
}

/**
 * Represents the status of forward derivation for a step.
 */
export enum ForwardDerivationStatus {
  Undetermined = 'undetermined', // Not yet determined
  Pending = 'pending',           // Determination in progress
  Correct = 'correct',           // Determined to be correct
  Incorrect = 'incorrect',       // Determined to be incorrect
}

/**
 * Represents the data associated with a DAG node when used with React Flow.
 * This is typically passed to the `data` prop of a React Flow node.
 */
export interface DagNodeRfData {
  label: string; // The primary display text of the node
  verificationStatus: VerificationStatus;
  fullLatexContent?: string; // Full LaTeX content, might be truncated for display
  stepNumber?: number; // Added if CustomStepNode uses it from here
  isDeleted?: boolean; // Added for soft delete visuals in DAG node
  isDerived?: boolean;
  hidden?: boolean;
  highlightColor?: string;
  notes?: string;
  isOnNewPath?: boolean; // Added for highlighting nodes on a new path
  interpretationIdea?: string; // <--- 新增的行
  forwardDerivationDisplayStatus?: ForwardDerivationStatus; // <<< ADDED for DAG node display
  backwardDerivationDisplayStatus?: ForwardDerivationStatus; // <<< ADDED for DAG node display
  // --- C1: Add fields for Focus Analysis ---
  isFocusPath?: boolean; // True if the node is part of the current focus path
  isFocusSource?: boolean; // True if this node is the source of the current focus analysis
  // --- End C1 ---
  // --- T_FIX_1: Add isMainPathNode to DagNodeRfData ---
  isMainPathNode?: boolean; // True if the node is part of the main path
  // --- End T_FIX_1 ---
  // +++ NP_FEAT_1: Add isNewPathStart to DagNodeRfData +++
  isNewPathStart?: boolean; // True if this node is the starting point of a new path being created
  // +++ End NP_FEAT_1 +++
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
  markerEnd?: {
    type: MarkerType;
    width?: number;
    height?: number;
    color?: string;
  };
  data?: { // Added data field for custom properties like isOnNewPath
    isOnNewPath?: boolean;
    isDeleted?: boolean;
    // --- C1: Add field for Focus Analysis to Edge Data ---
    isFocusPath?: boolean; // True if the edge is part of the current focus path
    // --- End C1 ---
    // --- T_FIX_1: Add isMainPathEdge to DagEdge data ---
    isMainPathEdge?: boolean; // True if the edge is part of the main path
    // --- End T_FIX_1 ---
    // +++ EDGE_SELECTION: Add edge selection state +++
    isSelected?: boolean; // True if the edge is currently selected
    pathGroupId?: string; // ID of the path group this edge belongs to
    // +++ End EDGE_SELECTION +++
    [key: string]: any; // Allows for other arbitrary data
  };
  // --- T_FIX_LINTER_ZINDEX: Add zIndex to DagEdge ---
  zIndex?: number; // For React Flow edge rendering order
  // --- End T_FIX_LINTER_ZINDEX ---
  // Potentially add a deleted flag for edges too if they need special styling
  // isDeleted?: boolean;
}

/**
 * Represents the data for a single step in the solution process.
 */
export interface SolutionStepData {
  id: string;
  stepNumber: number;
  latexContent: string;
  verificationStatus: VerificationStatus;
  isDeleted?: boolean; // Added for soft delete tracking
  isHardDeleted?: boolean;
  notes?: string;
  forwardDerivationStatus?: ForwardDerivationStatus; // New field for forward derivation status
  backwardDerivationStatus?: ForwardDerivationStatus; // <<< ADDED LINE: New field for backward derivation status
}

/**
 * Represents the data for the problem statement.
 */
export interface ProblemData {
  id: string;
  title: string;
  latexContent: string;
}

export enum LayoutMode {
  DEFAULT_THREE_COLUMN = 'defaultThreeColumn',
  DAG_COLLAPSED_SIMPLE = 'dagCollapsedSimple',
  DAG_EXPANDED_FULL = 'dagExpandedFull',
  AI_PANEL_ACTIVE = 'aiPanelActive',
}

// --- C1: Define FocusAnalysisType ---
export type FocusAnalysisType = 'forward' | 'backward' | 'full' | null;
// --- End C1 ---

// +++ PATH_GROUPS: Define path group types +++
export interface PathGroup {
  id: string;
  nodeIds: string[]; // Nodes in this path group
  edgeIds: string[]; // Edges in this path group
  isMainPath: boolean; // Whether this is the main path group
  startNodeId: string; // Starting node of this path
  endNodeId: string; // Ending node of this path
  layoutPosition?: { x: number; y: number }; // Position for group layout
}

export interface PathGroupState {
  groups: PathGroup[];
  mainPathGroupId: string | null;
  selectedEdgeId: string | null;
}

// +++ DAG_PAGES: Add DAG page management types +++
export interface DagPage {
  id: string;
  name: string;
  nodes: DagNode[];
  edges: DagEdge[];
  pathGroups: PathGroup[];
  mainPathGroupId: string | null;
  createdAt: Date;
  isActive: boolean;
  // 🔥 每个页面独立的解题步骤（从全局solutionSteps中筛选出的）
  solutionSteps: SolutionStepData[]; // 每个页面独立的解题步骤
  // 注意：题目数据（problemData）应该是全局共享的，不存储在单个页面中
  highlightColor?: string | null; // 🔥 页面高亮颜色
}

export interface DagPageState {
  pages: DagPage[];
  activePageId: string | null;
  maxPages: number; // 限制最大页面数量
}
// +++ End DAG_PAGES +++ 