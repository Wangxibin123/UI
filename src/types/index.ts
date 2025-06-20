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
  interpretationIdea?: string; // 思路解读内容，支持LaTeX
  interpretationStatus?: 'pending' | 'reviewed' | 'replied'; // 思路解读状态
  interpretationTimestamp?: Date; // 思路解读提交时间
  aiAnalysisContent?: string; // AI解析内容
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

// +++ SIMILAR_PROBLEMS: Add similar problems types +++
export interface SimilarProblem {
  id: string;
  stem: string;
  score: number;
}
// +++ End SIMILAR_PROBLEMS +++

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
  // 🔥 每个页面独立的解题步骤
  solutionSteps: SolutionStepData[];
  // 🔥 每个页面独立的题目数据
  problemData: ProblemData | null;
  // 🔥 每个页面独立的总结内容
  summaryContent: string;
  // 🔥 每个页面独立的类似题目
  similarProblems: SimilarProblem[];
  highlightColor?: string | null; // 🔥 页面高亮颜色
}

export interface DagPageState {
  pages: DagPage[];
  activePageId: string | null;
  maxPages: number; // 限制最大页面数量
}
// +++ End DAG_PAGES +++

// +++ INTERPRETATION: Add interpretation-related types +++
export interface InterpretationEntry {
  id: string;
  stepId: string; // 关联的解题步骤ID
  stepNumber: number; // 步骤编号（用于显示）
  stepLatexContent: string; // 步骤内容（快照，防止原步骤被修改）
  userIdea: string; // 用户输入的思路解读内容，支持LaTeX
  status: 'pending' | 'reviewed' | 'replied'; // 状态：待反馈、已查看、已回复
  timestamp: Date; // 提交时间
  teacherFeedback?: string; // 教师反馈内容
  teacherReplyTimestamp?: Date; // 教师回复时间
}

export interface InterpretationState {
  entries: InterpretationEntry[]; // 所有思路解读条目
  selectedEntryId: string | null; // 当前选中的条目ID
}
// +++ End INTERPRETATION +++

// +++ VERSION_HISTORY: Add version history types +++
export interface StepVersion {
  id: string; // 版本唯一ID
  stepId: string; // 关联的解题步骤ID
  content: string; // 版本的LaTeX内容
  timestamp: Date; // 版本创建时间
  description: string; // 版本描述（如："添加因式分解"、"修正错误"等）
  isOriginal: boolean; // 是否为原始版本（步骤创建时的第一个版本）
  versionNumber: number; // 版本号，从1开始
}

export interface StepVersionHistory {
  stepId: string; // 步骤ID
  versions: StepVersion[]; // 该步骤的所有版本
  currentVersionIndex: number; // 当前显示的版本索引
}

export interface VersionHistoryState {
  stepVersions: { [stepId: string]: StepVersionHistory }; // 按步骤ID索引的版本历史
}
// +++ End VERSION_HISTORY +++ 