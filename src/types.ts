export interface SolutionStepData {
  id: string;
  stepNumber: number;
  latexContent: string;
  isCorrect?: boolean;
}

export interface DagNode {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  type?: string; // Optional: for custom node types
}

export interface DagEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
} 