import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './MainLayout.module.css';
import panelStyles from '../../common/CollapsiblePanel/CollapsiblePanel.module.css';
import ControlBar from '../../features/dag/ControlBar/ControlBar';
import DagVisualizationArea from '../../features/dag/DagVisualizationArea/DagVisualizationArea';
import ProblemBlock from '../../features/solver/ProblemBlock/ProblemBlock';
import SolutionStep from '../../features/solver/SolutionStep/SolutionStep';
import SolverActions from '../../features/solver/SolverActions/SolverActions';
import CollapsiblePanel from '../../common/CollapsiblePanel/CollapsiblePanel';
import DraggableSeparator from '../../common/DraggableSeparator/DraggableSeparator';
import {
  type SolutionStepData,
  type DagNode,
  type DagEdge,
  type ProblemData,
  VerificationStatus,
  LayoutMode,
  DagNodeRfData,
} from '../../../types';
import { MarkerType, ReactFlowProvider } from '@reactflow/core';
import ConfirmationDialog from '../../common/ConfirmationDialog/ConfirmationDialog';

import { toast } from 'react-toastify';
import NodeNoteModal from '../../common/NodeNoteModal/NodeNoteModal';
import SplitStepModal from '../../common/SplitStepModal/SplitStepModal';
import InterpretationModal from '../../common/InterpretationModal/InterpretationModal';
import AICopilotPanel, { type AICopilotPanelProps, type Message as AICopilotMessage } from '../../features/ai/AICopilotPanel/AICopilotPanel';
import { Bot } from 'lucide-react';

interface PanelWidthsType {
  dag: number;
  solver: number;
  ai: number;
}

// MainLayout.tsx
// ... (所有 import 语句) ...

// Helper function to find a path between two nodes using BFS
const findPathBetweenNodes = (
  sourceId: string,
  targetId: string,
  nodes: DagNode[], // 注意：这里用 DagNode[]，因为我们操作的是应用状态里的节点
  edges: DagEdge[]  // 注意：这里用 DagEdge[]
): { pathNodes: string[]; pathEdges: string[] } | null => {
  const adj: Map<string, { neighbor: string; edgeId: string }[]> = new Map();
  edges.forEach(edge => {
    // Ensure nodes for edge exist and are not deleted before adding to adjacency list
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (sourceNode && !sourceNode.data.isDeleted && targetNode && !targetNode.data.isDeleted) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push({ neighbor: edge.target, edgeId: edge.id });
    }
  });

  const queue: { nodeId: string; path: string[]; currentEdges: string[] }[] = [{ nodeId: sourceId, path: [sourceId], currentEdges: [] }];
  const visited: Set<string> = new Set([sourceId]);

  while (queue.length > 0) {
    const { nodeId, path, currentEdges } = queue.shift()!;

    if (nodeId === targetId) {
      return { pathNodes: path, pathEdges: currentEdges };
    }

    const neighbors = adj.get(nodeId) || [];
    for (const { neighbor, edgeId } of neighbors) {
      if (!visited.has(neighbor)) {
        const neighborNode = nodes.find(n => n.id === neighbor);
        if (neighborNode && !neighborNode.data.isDeleted) { // Check if neighbor is not deleted
            visited.add(neighbor);
            queue.push({
              nodeId: neighbor,
              path: [...path, neighbor],
              currentEdges: [...currentEdges, edgeId]
            });
        }
      }
    }
  }
  return null; // Path not found
};


const LOCAL_STORAGE_PREFIX = 'aiMath_layoutPrefs_';

function saveUserPreferenceForMode(mode: LayoutMode, widths: PanelWidthsType): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${mode}`, JSON.stringify(widths));
  } catch (error) {
    console.warn("Could not save user layout preference:", error);
  }
}

function loadUserPreferenceForMode(mode: LayoutMode): PanelWidthsType | null {
  try {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${mode}`);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not load user layout preference:", error);
    return null;
  }
}

// initialSolutionStepsData should use SolutionStepData type
const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", verificationStatus: VerificationStatus.NotVerified },
];

const MIN_PANEL_PERCENTAGE = 10; // Minimum width for any panel in percentage

// --- Define a type for the context node info to be passed to AICopilotPanel ---
interface CopilotContextNodeInfo {
  id: string;
  label?: string;
  content?: string; // This would typically be node.data.fullLatexContent
  // Add any other relevant fields from DagNodeRfData you want to pass
}

const MainLayout: React.FC = () => {
  const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(() => {
    return LayoutMode.DEFAULT_THREE_COLUMN;
  });

  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
    return initialSolutionStepsData.map(step => ({ ...step, isDeleted: step.isDeleted || false }));
  });
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);

  const mainLayoutRef = useRef<HTMLDivElement>(null);
  
  const initialPanelWidths = useRef<PanelWidthsType>({ dag: 25, solver: 50, ai: 25 });
  
  const [panelWidths, setPanelWidths] = useState<PanelWidthsType>(() => {
    const persistedDefault = loadUserPreferenceForMode(LayoutMode.DEFAULT_THREE_COLUMN);
    return persistedDefault || initialPanelWidths.current;
  });

  // State for ConfirmationDialog
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: '',
    message: '' as string | React.ReactNode,
    confirmText: '确认',
    cancelText: '取消',
    onConfirm: () => {},
    confirmButtonVariant: 'default' as 'default' | 'destructive' | 'constructive',
  });

  // State for NodeNoteModal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteForNodeId, setEditingNoteForNodeId] = useState<string | null>(null);
  const [currentEditingNote, setCurrentEditingNote] = useState<string>('');
  const [currentEditingNodeLabel, setCurrentEditingNodeLabel] = useState<string>('');

  // State for SplitStepModal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splittingStepId, setSplittingStepId] = useState<string | null>(null);
  const [splittingStepOriginalContent, setSplittingStepOriginalContent] = useState<string>('');
  const [splittingStepOriginalLabel, setSplittingStepOriginalLabel] = useState<string>('');

  // State for 'Start New Path' functionality
  const [startNewPathNodeId, setStartNewPathNodeId] = useState<string | null>(null);
  const [isCreatingNewPath, setIsCreatingNewPath] = useState<boolean>(false);

  // State for InterpretationModal
  const [isInterpretationModalOpen, setIsInterpretationModalOpen] = useState<boolean>(false);
  const [interpretingNodeInfo, setInterpretingNodeInfo] = useState<{
    id: string;
    label?: string;
    content?: string;
    initialIdea?: string;
  } | null>(null);

  // State for 'Start New Path' preview highlighting
  const [previewPathElements, setPreviewPathElements] = useState<{ nodes: string[]; edges: string[] } | null>(null);

  // --- 2. STATE FOR AI COPILOT PANEL ---
  const [isAiCopilotPanelOpen, setIsAiCopilotPanelOpen] = useState<boolean>(false);
  // --- END AI COPILOT PANEL STATE ---

  // --- 1. Add state for Copilot context node info ---
  const [copilotContextNodeInfo, setCopilotContextNodeInfo] = useState<CopilotContextNodeInfo | null>(null);

  // --- Path Preview Callbacks (MOVED EARLIER) ---
  const clearPreviewPath = useCallback(() => {
    setPreviewPathElements(null);
  }, [setPreviewPathElements]);

  const handleNodeMouseEnterForPathPreview = useCallback((hoveredNodeId: string) => {
    if (isCreatingNewPath && startNewPathNodeId && hoveredNodeId !== startNewPathNodeId) {
      const pathResult = findPathBetweenNodes(startNewPathNodeId, hoveredNodeId, dagNodes, dagEdges);
      if (pathResult) {
        setPreviewPathElements({ nodes: pathResult.pathNodes, edges: pathResult.pathEdges });
      } else {
        setPreviewPathElements(null); // No path found or invalid target
      }
    }
  }, [isCreatingNewPath, startNewPathNodeId, dagNodes, dagEdges, /* findPathBetweenNodes is stable */ setPreviewPathElements]);

  const handleNodeMouseLeaveForPathPreview = useCallback(() => {
    clearPreviewPath();
  }, [clearPreviewPath]);

  // Helper function to open confirmation dialog
  const openConfirmationDialog = useCallback((
    title: string,
    message: string | React.ReactNode,
    onConfirmCallback: () => void,
    options?: { confirmText?: string; cancelText?: string; variant?: 'default' | 'destructive' | 'constructive' }
  ) => {
    setConfirmDialogState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirmCallback();
        closeConfirmationDialog(); // Automatically close dialog after confirmation
      },
      confirmText: options?.confirmText || '确认',
      cancelText: options?.cancelText || '取消',
      confirmButtonVariant: options?.variant || 'default',
    });
  }, []);

  // Helper function to close confirmation dialog
  const closeConfirmationDialog = useCallback(() => {
    setConfirmDialogState(prevState => ({ ...prevState, isOpen: false }));
  }, []);

  useEffect(() => {
    const generateDagData = () => {
      // console.log("Attempting to generate DAG data. solutionSteps:", JSON.parse(JSON.stringify(solutionSteps)));

      // Filter out hard-deleted steps for DAG generation if any (though current logic is soft delete)
      // const activeSteps = solutionSteps.filter(step => !step.isHardDeleted); // Example if using a different flag

      if (!solutionSteps || solutionSteps.length === 0) {
        // console.log("No solution steps, clearing DAG.");
        setDagNodes([]);
        setDagEdges([]);
        return;
      }

      const newNodes: DagNode[] = solutionSteps.map((step, index) => {
        return {
          id: step.id,
          type: 'customStepNode',
          data: {
            label: `步骤 ${step.stepNumber}`,
            fullLatexContent: step.latexContent,
            verificationStatus: step.verificationStatus,
            stepNumber: step.stepNumber,
            isDeleted: step.isDeleted || false, // Pass the isDeleted status
            notes: step.notes,
            highlightColor: dagNodes.find(n => n.id === step.id)?.data.highlightColor,
            isOnNewPath: dagNodes.find(n => n.id === step.id)?.data.isOnNewPath || false,
          },
          // Adjust position for deleted nodes? For now, keep them in sequence.
          position: { x: 150, y: index * 120 + 50 }, 
        };
      });

      const newEdges: DagEdge[] = [];
      if (solutionSteps.length > 1) {
        for (let i = 1; i < solutionSteps.length; i++) {
          // Only create edges between non-deleted steps
          // In generateDagData, inside the loop for newEdges
          if (!solutionSteps[i - 1].isDeleted && !solutionSteps[i].isDeleted) {
            const edgeId = `e-${solutionSteps[i - 1].id}-${solutionSteps[i].id}`;
            const existingEdge = dagEdges.find(e => e.id === edgeId);
            newEdges.push({
              id: edgeId,
              source: solutionSteps[i - 1].id,
              target: solutionSteps[i].id,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              data: {
                isOnNewPath: existingEdge?.data?.isOnNewPath || false,
                isDeleted: false, // Assuming new edges are not created for deleted steps paths
              },
              // Preserve existing style if any, otherwise default. Animation determined by isOnNewPath or other logic.
              style: existingEdge?.style || { stroke: undefined }, // Default stroke or preserved
              animated: existingEdge?.data?.isOnNewPath ? true : !(existingEdge?.data?.isDeleted), // Animate if on new path or default active
            });
          }
// ...
        }
      }
      
      // console.log("Generated New DAG Nodes:", JSON.parse(JSON.stringify(newNodes)));
      // console.log("Generated New DAG Edges:", JSON.parse(JSON.stringify(newEdges)));

      setDagNodes(newNodes);
      setDagEdges(newEdges);
    };

    generateDagData();

  }, [solutionSteps]);

  useEffect(() => {
    setProblemData({
      id: 'problem-init-1',
      title: '示例题目',
      latexContent: '$$\\frac{d^2y}{dx^2} + 5\\frac{dy}{dx} + 6y = 0$$'
    });

    const initialStepsExample: SolutionStepData[] = [
      { id: 'step-init-1', stepNumber: 1, latexContent: '$$\\lambda^2 + 5\\lambda + 6 = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false },
      { id: 'step-init-2', stepNumber: 2, latexContent: '$$(\\lambda+2)(\\lambda+3) = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false },
      { id: 'step-init-3', stepNumber: 3, latexContent: '$$\\lambda_1 = -2, \\lambda_2 = -3$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false },
    ];
    setSolutionSteps(initialStepsExample);
  }, []);

  const handleAddSolutionStep = (latexInput: string) => {
    if (!latexInput.trim()) return;
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: solutionSteps.filter(s => !s.isDeleted).length + 1,
      latexContent: latexInput,
      verificationStatus: VerificationStatus.NotVerified,
      isDeleted: false,
    };
    setSolutionSteps(prevSteps => [...prevSteps, newStep]);
  };

  // <<< 辅助函数：确保宽度总和为100%并处理精度 >>>
  const ensurePanelWidthsSumTo100AndPrecision = useCallback((widths: PanelWidthsType): PanelWidthsType => {
    let { dag, solver, ai } = widths;
    dag = parseFloat(dag.toFixed(1));
    solver = parseFloat(solver.toFixed(1));
    ai = parseFloat((100 - dag - solver).toFixed(1));

    if (ai < 0) { 
        const deficit = -ai;
        ai = 0;
        const totalDagSolver = dag + solver + deficit; 
        if (totalDagSolver > 0) {
            const dagProportion = (dag + deficit/2) / totalDagSolver; 
            dag = parseFloat((dagProportion * (100 - ai)).toFixed(1));
            solver = parseFloat((100 - ai - dag).toFixed(1));
        } else { 
            dag = 50; 
            solver = 50;
            ai = 0;
        }
    }
    // Ensure no panel is negative after adjustment, especially if MIN_PANEL_PERCENTAGE is involved elsewhere
    // This is a simplified ensure sum, primary clamping should happen before this.
    if (dag < 0) dag = 0;
    if (solver < 0) solver = 0;
    if (ai < 0) ai = 0;
    // Re-check sum after clamping negatives (though ideally clamping prevents this)
    const currentSum = dag + solver + ai;
    if (currentSum !== 100 && currentSum > 0) {
        const scale = 100 / currentSum;
        dag = parseFloat((dag*scale).toFixed(1));
        solver = parseFloat((solver*scale).toFixed(1));
        ai = parseFloat((100 - dag - solver).toFixed(1)); // last one gets remainder
    }

    return { dag, solver, ai };
  }, []);

  // <<< 核心 useEffect，用于根据 currentLayoutMode 设置 panelWidths >>>
  useEffect(() => {
    let targetWidths: PanelWidthsType;
    const userPrefsForMode = loadUserPreferenceForMode(currentLayoutMode);

    switch (currentLayoutMode) {
      case LayoutMode.DAG_EXPANDED_FULL:
        targetWidths = userPrefsForMode || { dag: 70, solver: 30, ai: 0 };
        break;
      case LayoutMode.AI_PANEL_ACTIVE:
        targetWidths = userPrefsForMode || { dag: 2, solver: 49, ai: 49 }; 
        break;
      case LayoutMode.DAG_COLLAPSED_SIMPLE:
        if (userPrefsForMode) {
          targetWidths = userPrefsForMode;
        } else {
          const defaultModeUserPrefs = loadUserPreferenceForMode(LayoutMode.DEFAULT_THREE_COLUMN);
          const lastKnownDefaultWidths = defaultModeUserPrefs || initialPanelWidths.current;
          const solverAiTotalInDefault = lastKnownDefaultWidths.solver + lastKnownDefaultWidths.ai;
          if (solverAiTotalInDefault > 0) {
            const solverProportion = lastKnownDefaultWidths.solver / solverAiTotalInDefault;
            const availableForSolverAndAi = 98; 
            let calculatedSolver = Math.round(availableForSolverAndAi * solverProportion);
            let calculatedAi = availableForSolverAndAi - calculatedSolver;
            
            const minSolverAiWidth = MIN_PANEL_PERCENTAGE > 0 ? MIN_PANEL_PERCENTAGE : 1;
            if (calculatedSolver < minSolverAiWidth && (calculatedSolver + calculatedAi) >= minSolverAiWidth + minSolverAiWidth ) {
                calculatedSolver = minSolverAiWidth;
                calculatedAi = availableForSolverAndAi - calculatedSolver;
            } else if (calculatedAi < minSolverAiWidth && (calculatedSolver + calculatedAi) >= minSolverAiWidth + minSolverAiWidth ) {
                calculatedAi = minSolverAiWidth;
                calculatedSolver = availableForSolverAndAi - calculatedAi;
            }
            // Ensure they are not negative after adjustment
            if(calculatedSolver < 0) calculatedSolver = 0;
            if(calculatedAi < 0) calculatedAi = 0;
            if(calculatedSolver + calculatedAi > availableForSolverAndAi) { // if sum too high, adjust
                const excess = (calculatedSolver + calculatedAi) - availableForSolverAndAi;
                // reduce proportionally, or just from the larger one
                if (calculatedSolver > calculatedAi) calculatedSolver -= excess;
                else calculatedAi -= excess;
            }

            targetWidths = { dag: 2, solver: calculatedSolver, ai: calculatedAi };
          } else {
            targetWidths = { dag: 2, solver: 58, ai: 40 };
          }
        }
        break;
      case LayoutMode.DEFAULT_THREE_COLUMN:
      default:
        targetWidths = userPrefsForMode || initialPanelWidths.current;
        break;
    }
    setPanelWidths(ensurePanelWidthsSumTo100AndPrecision(targetWidths));
  }, [currentLayoutMode, ensurePanelWidthsSumTo100AndPrecision]); // ensurePanelWidthsSumTo100AndPrecision is memoized

  // <<< 模式切换处理函数 >>>
  const handleToggleDagCollapse = () => {
    setCurrentLayoutMode(prevMode => {
      if (prevMode === LayoutMode.DAG_COLLAPSED_SIMPLE ||
          prevMode === LayoutMode.AI_PANEL_ACTIVE ||
          prevMode === LayoutMode.DAG_EXPANDED_FULL) {
        return LayoutMode.DEFAULT_THREE_COLUMN;
      } else { 
        return LayoutMode.DAG_COLLAPSED_SIMPLE;
      }
    });
  };

  const handleExpandDagFully = () => {
    setCurrentLayoutMode(LayoutMode.DAG_EXPANDED_FULL);
  };

  const handleActivateAiPanel = () => {
    setCurrentLayoutMode(LayoutMode.AI_PANEL_ACTIVE);
  };
  
  // Separator Drag Handlers
  const handleSeparator1Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;
      const dxPercent = (dx / containerWidth) * 100;

      let newDag = prevWidths.dag;
      let newSolver = prevWidths.solver;
      let newAi = prevWidths.ai;

      switch (currentLayoutMode) {
        case LayoutMode.DAG_EXPANDED_FULL: // AI is 0, separator 1 adjusts DAG vs Solver
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          newAi = 0;
          // Clamp DAG and Solver
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          // Ensure sum is 100 (since AI is 0)
          if (newDag + newSolver > 100) {
            if (prevWidths.dag + dxPercent > newDag) { // Dragged to increase DAG
              newSolver = 100 - newDag;
            } else { // Dragged to increase Solver (or DAG hit min and dx was negative)
              newDag = 100 - newSolver;
            }
          }
          // Final check for min widths after sum adjustment
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag);
          break;

        case LayoutMode.AI_PANEL_ACTIVE: // DAG is ~2%, separator 1 adjusts this nominal DAG vs Solver, AI is passive recipient
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          // newAi = 100 - newDag - newSolver; (calculated later by ensure)
          
          newDag = Math.max(2, newDag); // DAG nominal min
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag - newSolver);

          // If AI becomes too small, adjust solver and dag
          if (100 - newDag - newSolver < MIN_PANEL_PERCENTAGE) {
            newAi = MIN_PANEL_PERCENTAGE;
            const remainingForDagSolver = 100 - newAi;
            if (prevWidths.dag + dxPercent > newDag) { // Dragged to increase DAG
              newDag = Math.min(newDag, remainingForDagSolver - MIN_PANEL_PERCENTAGE); // Solver needs min
              newSolver = remainingForDagSolver - newDag;
            } else { // Dragged to increase Solver
              newSolver = Math.min(newSolver, remainingForDagSolver - 2); // DAG needs min (2)
              newDag = remainingForDagSolver - newSolver;
            }
          }
          newDag = Math.max(2, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          break;

        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.DAG_COLLAPSED_SIMPLE: // Separator 1 adjusts DAG vs Solver, AI is passive
        default:
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          // newAi = 100 - newDag - newSolver; (calculated later by ensure)
          
          const minDagCurrentMode = currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE ? 2 : MIN_PANEL_PERCENTAGE;
          newDag = Math.max(minDagCurrentMode, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag - newSolver);

          // If AI becomes too small due to dag/solver expansion, take from the one that expanded
          if (100 - newDag - newSolver < MIN_PANEL_PERCENTAGE) {
            newAi = MIN_PANEL_PERCENTAGE;
            const remainingForDagSolver = 100 - newAi;
            if (prevWidths.dag + dxPercent > newDag) { // DAG was expanding
              newDag = Math.min(newDag, remainingForDagSolver - MIN_PANEL_PERCENTAGE); // Solver needs min
              newSolver = remainingForDagSolver - newDag;
            } else { // Solver was expanding (or DAG shrinking)
              newSolver = Math.min(newSolver, remainingForDagSolver - minDagCurrentMode); // DAG needs its min
              newDag = remainingForDagSolver - newSolver;
            }
          }
          newDag = Math.max(minDagCurrentMode, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          break;
      }

      const finalWidths = ensurePanelWidthsSumTo100AndPrecision({ dag: newDag, solver: newSolver, ai: newAi });
      saveUserPreferenceForMode(currentLayoutMode, finalWidths);
      return finalWidths;
    });
  }, [currentLayoutMode, MIN_PANEL_PERCENTAGE, ensurePanelWidthsSumTo100AndPrecision]);

  const handleSeparator2Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;
      const dxPercent = (dx / containerWidth) * 100;

      let newDag = prevWidths.dag;
      let newSolver = prevWidths.solver;
      let newAi = prevWidths.ai;

      switch (currentLayoutMode) {
        case LayoutMode.DAG_EXPANDED_FULL: // AI is 0, separator 2 should be inactive/hidden
          // No change expected if separator is somehow active
          return prevWidths; 

        case LayoutMode.AI_PANEL_ACTIVE: // DAG is ~2% (fixed), separator 2 adjusts Solver vs AI
          newDag = prevWidths.dag; // DAG width remains fixed (e.g. 2%)
          newSolver = prevWidths.solver + dxPercent;
          newAi = prevWidths.ai - dxPercent;

          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);

          // Ensure sum of Solver + AI is (100 - newDag)
          const availableForSolverAi = 100 - newDag;
          if (newSolver + newAi > availableForSolverAi) {
            if (prevWidths.solver + dxPercent > newSolver) { // Dragged to increase Solver
              newAi = availableForSolverAi - newSolver;
            } else { // Dragged to increase AI (or Solver hit min)
              newSolver = availableForSolverAi - newAi;
            }
          }
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, availableForSolverAi - newSolver);
          break;

        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.DAG_COLLAPSED_SIMPLE: // Separator 2 adjusts Solver vs AI, DAG is passive
        default:
          newDag = prevWidths.dag; // DAG width is not directly changed by separator 2
          newSolver = prevWidths.solver + dxPercent;
          newAi = prevWidths.ai - dxPercent;

          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);
          
          // DAG must also be respected, it might get squashed if Solver+AI take too much
          const minDagCurrentMode = currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE ? 2 : MIN_PANEL_PERCENTAGE;
          if (100 - newSolver - newAi < minDagCurrentMode) {
             newDag = minDagCurrentMode;
             const availableForSolverAiActive = 100 - newDag;
             if (prevWidths.solver + dxPercent > newSolver) { // Solver expanding
                newSolver = Math.min(newSolver, availableForSolverAiActive - MIN_PANEL_PERCENTAGE); // AI needs min
                newAi = availableForSolverAiActive - newSolver;
             } else { // AI expanding
                newAi = Math.min(newAi, availableForSolverAiActive - MIN_PANEL_PERCENTAGE); // Solver needs min
                newSolver = availableForSolverAiActive - newAi;
             }
          }
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);
          break;
      }
      
      const finalWidths = ensurePanelWidthsSumTo100AndPrecision({ dag: newDag, solver: newSolver, ai: newAi });
      saveUserPreferenceForMode(currentLayoutMode, finalWidths);
      return finalWidths;
    });
  }, [currentLayoutMode, MIN_PANEL_PERCENTAGE, ensurePanelWidthsSumTo100AndPrecision]);

  const handleProblemChange = (newLatexContent: string) => {
    if (problemData) {
      setProblemData({ ...problemData, latexContent: newLatexContent });
    } else {
      // Create a new problem if one doesn't exist
      setProblemData({
        id: `problem-${Date.now()}`,
        title: '新问题',
        latexContent: newLatexContent,
      });
    }
  };

  const handleStepContentChange = (stepId: string, newLatexContent: string) => {
    setSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId 
          ? { 
              ...step, 
              latexContent: newLatexContent, 
              verificationStatus: VerificationStatus.NotVerified
            } 
          : step
      )
    );
  };

  const handleDeleteStep = (stepId: string) => {
    setSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, isDeleted: true } : step
      )
    );
  };

  const handleAnalyzeStep = (stepId: string) => {
    console.log("Analyze step requested:", stepId);
    // Future: Trigger AI analysis, update step verificationStatus, etc.
    // For now, let's toggle verification status as a demo
    setSolutionSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          let newStatus = VerificationStatus.NotVerified;
          if (step.verificationStatus === VerificationStatus.NotVerified) newStatus = VerificationStatus.VerifiedCorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedCorrect) newStatus = VerificationStatus.VerifiedIncorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedIncorrect) newStatus = VerificationStatus.NotVerified;
          return { ...step, verificationStatus: newStatus };
        }
        return step;
      })
    );
  };

  // Core split logic - this remains mostly the same
  const handleSplitStep = (originalStepId: string, part1Content: string, part2Content: string) => {
    setSolutionSteps(prevSteps => {
      const originalStepIndex = prevSteps.findIndex(step => step.id === originalStepId);
      if (originalStepIndex === -1) {
        console.error("Original step not found for splitting:", originalStepId);
        toast.error("拆分失败：未找到原始步骤。");
        return prevSteps; 
      }

      const newStepsArray = prevSteps.map(s => ({...s}));
      const originalStepData = newStepsArray[originalStepIndex];

      newStepsArray[originalStepIndex] = {
        ...originalStepData,
        latexContent: part1Content,
        verificationStatus: VerificationStatus.NotVerified, // Reset verification for the first part
        notes: originalStepData.notes, // Preserve notes for the first part
        // highlightColor: originalStepData.highlightColor, // Preserve highlight - dagNode generation should handle this
      };

      const newStepPart2: SolutionStepData = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        latexContent: part2Content,
        verificationStatus: VerificationStatus.NotVerified,
        stepNumber: 0, // Will be re-numbered
        isDeleted: false, // New step is not deleted
        // notes: undefined, // New step starts without notes
        // highlightColor: undefined, // New step starts without highlight
      };

      newStepsArray.splice(originalStepIndex + 1, 0, newStepPart2);

      // Re-number all non-deleted steps for display
      let currentStepNumber = 1;
      for (let i = 0; i < newStepsArray.length; i++) {
        if (!newStepsArray[i].isDeleted) {
          newStepsArray[i].stepNumber = currentStepNumber++;
        }
      }
      toast.success(`步骤 ${originalStepData.stepNumber} 已成功拆分！`);
      return newStepsArray;
    });
  };

  // Modified handler functions for DagVisualizationArea context menu to use ConfirmationDialog
  const handleSoftDeleteStep = useCallback((stepId: string) => {
    const stepToDelete = solutionSteps.find(s => s.id === stepId);
    if (!stepToDelete) return;

    openConfirmationDialog(
      '确认删除步骤',
      <span>您确定要将步骤 <strong>"步骤 {stepToDelete.stepNumber}"</strong> (ID: {stepToDelete.id}) 标记为删除吗？</span>,
      () => {
        setSolutionSteps(prevSteps =>
          prevSteps.map(step =>
            step.id === stepId ? { ...step, isDeleted: true } : step
          )
        );
        toast.success(`步骤 ${stepToDelete.stepNumber} 已成功标记为删除！`);
      },
      { confirmText: '删除', variant: 'destructive' }
    );
  }, [solutionSteps, openConfirmationDialog]);

  const handleUndoSoftDeleteStep = useCallback((stepId: string) => {
    const stepToUndo = solutionSteps.find(s => s.id === stepId);
    if (!stepToUndo) return;

    openConfirmationDialog(
      '确认恢复步骤',
      <span>您确定要恢复步骤 <strong>"步骤 {stepToUndo.stepNumber}"</strong> (ID: {stepToUndo.id}) 吗？</span>,
      () => {
        setSolutionSteps(prevSteps =>
          prevSteps.map(step =>
            step.id === stepId ? { ...step, isDeleted: false } : step
          )
        );
        toast.success(`步骤 ${stepToUndo.stepNumber} 已成功恢复！`);
      },
      { confirmText: '恢复', variant: 'constructive' } 
    );
  }, [solutionSteps, openConfirmationDialog]);

  const handleUpdateStepVerificationStatus = useCallback(
    (stepId: string, newStatus: VerificationStatus) => {
      setSolutionSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === stepId ? { ...step, verificationStatus: newStatus } : step
        )
      );
      // Providing a more user-friendly status message for the toast
      let statusMessage = '';
      switch (newStatus) {
        case VerificationStatus.VerifiedCorrect:
          statusMessage = '标记为 已验证 (正确)';
          break;
        case VerificationStatus.VerifiedIncorrect:
          statusMessage = '标记为 已验证 (错误)';
          break;
        case VerificationStatus.NotVerified:
          statusMessage = '标记为 未验证';
          break;
        default:
          statusMessage = '状态已更新'; // Fallback
      }
      toast.success(`步骤状态已更新为: ${statusMessage}`);
    },
    [] // Removed solutionSteps from dependencies as it's not directly used in callback logic, setSolutionSteps handles closure correctly
  );

  // This is for the CONTEXT MENU item for initiating a split
  const handleInitiateSplitStepFromContextMenu = useCallback((stepId: string) => {
    const stepToSplit = solutionSteps.find(s => s.id === stepId);
    const nodeToSplit = dagNodes.find(n => n.id === stepId);

    if (stepToSplit && nodeToSplit) {
      setSplittingStepId(stepId);
      setSplittingStepOriginalContent(stepToSplit.latexContent);
      setSplittingStepOriginalLabel(nodeToSplit.data.label || `步骤 ${stepToSplit.stepNumber}`);
      setIsSplitModalOpen(true);
    } else {
      toast.error("无法启动拆分：未找到步骤数据。");
      console.warn(`[SplitStep] Could not find step or node data for ID: ${stepId}`);
    }
  }, [solutionSteps, dagNodes]);

  // Callback for SplitStepModal confirmation
  const handleConfirmSplitStepModal = useCallback((part1Content: string, part2Content: string) => {
    if (splittingStepId) {
      handleSplitStep(splittingStepId, part1Content, part2Content);
      setIsSplitModalOpen(false); // Close modal on successful confirmation
      // Toast for success is handled within handleSplitStep
    } else {
      toast.error("拆分确认失败：步骤ID丢失。");
      console.error("[SplitStep] splittingStepId is null on confirm.");
    }
  }, [splittingStepId, handleSplitStep]);

  const handleCloseSplitStepModal = useCallback(() => {
    setIsSplitModalOpen(false);
    setSplittingStepId(null);
    setSplittingStepOriginalContent('');
    setSplittingStepOriginalLabel('');
  }, []);

  // Callbacks for InterpretationModal
  const handleOpenInterpretationModal = useCallback((nodeId: string, currentIdea?: string) => {
    const node = dagNodes.find(n => n.id === nodeId);
    const step = solutionSteps.find(s => s.id === nodeId);
    if (node && step) {
      setInterpretingNodeInfo({
        id: nodeId,
        label: node.data.label || `步骤 ${step.stepNumber}`,
        content: step.latexContent,
        initialIdea: currentIdea || node.data.interpretationIdea || '', // Use passed idea, then stored idea, then empty
      });
      setIsInterpretationModalOpen(true);
    }
  }, [dagNodes, solutionSteps]);

  const handleCloseInterpretationModal = useCallback(() => {
    setIsInterpretationModalOpen(false);
    setInterpretingNodeInfo(null);
  }, []);

  // ...other callbacks...

  const handleSubmitInterpretation = useCallback((nodeId: string, idea: string) => {
    console.log(`Interpretation submitted for node ${nodeId}: ${idea}`);
    
    // 更新 dagNodes 状态以保存解读想法
    setDagNodes(prevNodes =>
      prevNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              interpretationIdea: idea, // 保存新的解读想法
            },
          };
        }
        return node;
      })
    );

    toast.success(`节点 ${nodeId} 的解读想法已提交处理。`);
    handleCloseInterpretationModal();
  }, [handleCloseInterpretationModal, setDagNodes]); // 添加 setDagNodes 到依赖数组

  // Modify handleInterpretIdea to use handleOpenInterpretationModal
  const handleInterpretIdea = useCallback((stepId: string, idea?: string) => { 
    const node = dagNodes.find(n => n.id === stepId);
    handleOpenInterpretationModal(stepId, idea || node?.data.interpretationIdea);
  }, [handleOpenInterpretationModal, dagNodes]);

  // <<< RE-ADD handleHighlightNode DEFINITION HERE >>>
  const handleHighlightNode = useCallback(
    (stepId: string, color: string | null) => {
      setDagNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === stepId) {
            const newData = { ...node.data };
            if (color) {
              newData.highlightColor = color;
            } else {
              // If color is null, remove the highlightColor property
              delete newData.highlightColor;
            }
            return { 
              ...node, 
              data: newData 
            };
          }
          return node;
        })
      );
      if (color) {
        toast.success(`节点 ${stepId} 已标记为 ${color}`);
      } else {
        toast.info(`节点 ${stepId} 的高亮已清除`);
      }
    },
    [setDagNodes] // Dependency: setDagNodes
  );

  // REMOVE THIS CALLBACK as its functionality is replaced by handleOpenNoteModal via onAddOrUpdateNote
  // const handleAddNote = useCallback((stepId: string) => { ... });

  // const handleNewPathFromNode = useCallback((stepId: string) => { ... }); // This should be the one defined earlier for new path
  // ... (rest of the callbacks like handleCopyNodeInfo, etc.)

  // <<< RESTORE THE ACTUAL DEFINITION of handleNewPathFromNode >>>
  const handleNewPathFromNode = useCallback((nodeId: string) => {
    clearPreviewPath(); // Clear any previous preview
    // Clear previous path highlights before starting a new one
    setDagNodes(prevNodes => prevNodes.map(n => ({ ...n, data: { ...n.data, isOnNewPath: false } })));
    setDagEdges(prevEdges => prevEdges.map(e => ({ ...e, data: { ...e.data, isOnNewPath: false }, animated: false, style: { ...e.style, stroke: undefined } })));
    
    setStartNewPathNodeId(nodeId);
    setIsCreatingNewPath(true);
    toast.info(`从节点 ${nodeId} 开始创建新路径。请点击目标节点。`);
  }, [setDagNodes, setDagEdges, setIsCreatingNewPath, setStartNewPathNodeId, clearPreviewPath]);

  const handleSelectNewPathTargetNode = useCallback((targetNodeId: string) => {
    clearPreviewPath(); // Clear preview when a target is selected
    if (!startNewPathNodeId) {
      toast.error("错误：没有选择起始节点。");
      setIsCreatingNewPath(false);
      return;
    }
    if (targetNodeId === startNewPathNodeId) {
      toast.warn("目标节点不能与起始节点相同。");
      return;
    }

    const pathResult = findPathBetweenNodes(startNewPathNodeId, targetNodeId, dagNodes, dagEdges);

    if (pathResult && pathResult.pathNodes.length > 0) {
      setDagNodes(prevNodes =>
        prevNodes.map(node =>
          pathResult.pathNodes.includes(node.id)
            ? { ...node, data: { ...node.data, isOnNewPath: true } }
            : { ...node, data: { ...node.data, isOnNewPath: node.data.isOnNewPath || false } } // Preserve existing paths
        )
      );
      setDagEdges(prevEdges =>
        prevEdges.map(edge =>
          pathResult.pathEdges.includes(edge.id)
            ? { ...edge, data: { ...edge.data, isOnNewPath: true }, animated: true, style: { ...edge.style, stroke: '#2ecc71' } } // Green for new path
            : edge
        )
      );
      toast.success(`已创建从节点 ${startNewPathNodeId} 到 ${targetNodeId} 的新路径。`);
    } else {
      toast.error(`无法找到从节点 ${startNewPathNodeId} 到 ${targetNodeId} 的有效路径。`);
    }
    setIsCreatingNewPath(false);
    setStartNewPathNodeId(null);
  }, [
    startNewPathNodeId, 
    dagNodes, 
    dagEdges, 
    setDagNodes, 
    setDagEdges, 
    setIsCreatingNewPath, 
    setStartNewPathNodeId, 
    clearPreviewPath 
  ]);

  const handleCancelNewPathCreation = useCallback(() => {
    clearPreviewPath(); // Clear preview on cancellation
    setIsCreatingNewPath(false);
    setStartNewPathNodeId(null);
    toast.info("已取消创建新路径。");
  }, [setIsCreatingNewPath, setStartNewPathNodeId, clearPreviewPath]);

  // --- NEW: Callback for pane click, primarily to cancel new path creation ---
  const handlePaneClickedInMainLayout = useCallback(() => {
    if (isCreatingNewPath) {
      handleCancelNewPathCreation();
    }
    setCopilotContextNodeInfo(null); // <--- 代码修改：清除 Copilot 上下文
    // Note: Node deselection (setSelectedNodeId(null)) is not handled here directly,
    // as its state management (selectedNodeId) isn't passed to DagVisualizationArea via onNodeSelect.
    // DagVisualizationArea can handle its own deselection if its onNodeSelect prop is utilized internally by it.
  }, [isCreatingNewPath, handleCancelNewPathCreation, setCopilotContextNodeInfo]); // <--- 代码修改：更新依赖数组

  // --- NEW IMPLEMENTATION FOR CopyNodeInfo ---
  const handleCopyNodeInfo = useCallback(async (stepId: string) => {
    const nodeToCopy = dagNodes.find(n => n.id === stepId);
    const stepDetails = solutionSteps.find(s => s.id === stepId);

    if (nodeToCopy && stepDetails) {
      const nodeSpecificData = nodeToCopy.data; 
      const id = stepId;
      const stepNumberDisplay = nodeSpecificData.label || `步骤 ${nodeSpecificData.stepNumber || 'N/A'}`;
      const fullLatex = stepDetails.latexContent || 'LaTeX内容未提供';
      const verificationStatusDisplay = nodeSpecificData.verificationStatus || VerificationStatus.NotVerified;
      // const methodConcept = nodeSpecificData.methodConcept || '未指定'; // Uncomment if you add this field

      let textToCopy = `步骤详情:
-------------------------
ID: ${id}
编号: ${stepNumberDisplay}
LaTeX:
${fullLatex}
-------------------------
验证状态: ${verificationStatusDisplay}
`;
      // textToCopy += `方法/概念: ${methodConcept}\n`; // Uncomment if field exists

      try {
        await navigator.clipboard.writeText(textToCopy);
        toast.success("节点信息已复制到剪贴板！");
      } catch (err) {
        console.error('无法复制节点信息: ', err);
        toast.error("复制失败。请检查浏览器权限或手动复制。");
      }
    } else {
      toast.error("找不到要复制的节点数据。");
      if (!nodeToCopy) console.warn(`[handleCopyNodeInfo] Node with id ${stepId} not found in dagNodes`);
      if (!stepDetails) console.warn(`[handleCopyNodeInfo] Step details for id ${stepId} not found in solutionSteps`);
    }
  }, [dagNodes, solutionSteps]); // Dependencies: dagNodes and solutionSteps

  // <<< NEW HELPER FUNCTION FOR PATH FINDING (DFS approach) >>>
  // Find one path from any root node to the targetNodeId, excluding deleted nodes
  const findPathToNodeRecursive = (
    targetNodeId: string,
    allNodes: DagNode[],
    allEdges: DagEdge[],
    currentPath: string[] = [],
    visited: Set<string> = new Set()
  ): string[] | null => {
    const lastNodeIdInPath = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;

    // If currentPath is empty, we need to find a root node to start from.
    if (!lastNodeIdInPath) {
      const rootNodes = allNodes.filter(n => 
        !n.data.isDeleted &&
        !allEdges.some(edge => edge.target === n.id && !allNodes.find(srcNode => srcNode.id === edge.source)?.data.isDeleted)
      );

      for (const root of rootNodes) {
        if (root.id === targetNodeId) return [root.id]; // Target is a root node
        visited.clear(); // Clear visited for new search from new root
        const path = findPathToNodeRecursive(targetNodeId, allNodes, allEdges, [root.id], new Set([root.id]));
        if (path) return path;
      }
      return null; // No path found from any root
    }

    // We are in a recursive call with a currentPath
    const currentNodeId = lastNodeIdInPath;
    if (currentNodeId === targetNodeId) {
      return [...currentPath]; // Found the target
    }

    visited.add(currentNodeId);

    // Find outgoing edges from the current node
    const outgoingEdges = allEdges.filter(
      edge => edge.source === currentNodeId && 
              !allNodes.find(n => n.id === edge.target)?.data.isDeleted
    );

    for (const edge of outgoingEdges) {
      const neighborNodeId = edge.target;
      if (!visited.has(neighborNodeId)) {
        currentPath.push(neighborNodeId);
        const result = findPathToNodeRecursive(targetNodeId, allNodes, allEdges, currentPath, visited);
        if (result) return result; // Path found
        currentPath.pop(); // Backtrack
      }
    }

    return null; // No path from this branch
  };

  // --- NEW IMPLEMENTATION FOR CopyPathInfo ---
  const handleCopyPathInfo = useCallback(async (targetNodeId: string) => {
    const activeNodes = dagNodes.filter(n => !n.data.isDeleted);
    const activeEdges = dagEdges.filter(edge => {
      const sourceNode = dagNodes.find(n => n.id === edge.source);
      const targetNode = dagNodes.find(n => n.id === edge.target);
      return sourceNode && !sourceNode.data.isDeleted && targetNode && !targetNode.data.isDeleted;
    });
  
    const pathNodeIds = findPathToNodeRecursive(targetNodeId, activeNodes, activeEdges);

    if (pathNodeIds && pathNodeIds.length > 0) {
      let textToCopy = "路径信息:\n=========================\n";
      let pathStepCounter = 1;

      for (const nodeId of pathNodeIds) {
        const nodeDetails = dagNodes.find(n => n.id === nodeId);
        const stepDetails = solutionSteps.find(s => s.id === nodeId);

        if (nodeDetails && stepDetails && !nodeDetails.data.isDeleted) { // Ensure node is not deleted
          const nodeSpecificData = nodeDetails.data;
          const id = nodeId;
          const stepNumberDisplay = nodeSpecificData.label || `步骤 ${nodeSpecificData.stepNumber || 'N/A'}`;
          const fullLatex = stepDetails.latexContent || 'LaTeX内容未提供';
          const verificationStatusDisplay = nodeSpecificData.verificationStatus || VerificationStatus.NotVerified;

          textToCopy += `\n--- 路径步骤 ${pathStepCounter++} ---\n`;
          textToCopy += `ID: ${id}\n`;
          textToCopy += `原始编号: ${stepNumberDisplay}\n`;
          textToCopy += `LaTeX:\n${fullLatex}\n`;
          textToCopy += `验证状态: ${verificationStatusDisplay}\n`;
          textToCopy += "-------------------------\n";
        }
      }

      if (pathStepCounter === 1) { // No actual nodes were added to text (e.g. target was deleted or only root was deleted)
        toast.error("未能构建有效路径的文本信息。");
        return;
      }

      try {
        await navigator.clipboard.writeText(textToCopy);
        toast.success("路径信息已复制到剪贴板！");
      } catch (err) {
        console.error('无法复制路径信息: ', err);
        toast.error("复制路径失败。请检查浏览器权限。");
      }
    } else {
      toast.info("未找到到达当前节点的有效路径，或当前节点是孤立节点。将仅复制当前节点信息。");
      // Fallback to copying just the current node's info if no path is found
      // This reuses the existing single node copy logic for convenience
      await handleCopyNodeInfo(targetNodeId); 
    }
  }, [dagNodes, dagEdges, solutionSteps, handleCopyNodeInfo]); // Added handleCopyNodeInfo to dependencies

  // <<< NEW CALLBACKS FOR NOTE MODAL >>>
  const handleOpenNoteModal = useCallback((stepId: string) => {
    const stepToEdit = solutionSteps.find(s => s.id === stepId);
    const nodeToEdit = dagNodes.find(n => n.id === stepId);
    if (stepToEdit) {
      setEditingNoteForNodeId(stepId);
      setCurrentEditingNote(stepToEdit.notes || '');
      setCurrentEditingNodeLabel(nodeToEdit?.data?.label || stepToEdit.stepNumber?.toString() || 'N/A');
      setIsNoteModalOpen(true);
    } else {
      toast.error(`无法找到ID为 ${stepId} 的步骤以添加备注。`);
    }
  }, [solutionSteps, dagNodes]);

  const handleCloseNoteModal = useCallback(() => {
    setIsNoteModalOpen(false);
    setEditingNoteForNodeId(null);
    setCurrentEditingNote('');
    setCurrentEditingNodeLabel('');
  }, []);

  const handleSaveNote = useCallback(async (noteContent: string) => {
    if (!editingNoteForNodeId) {
      toast.error("无法保存备注：未指定目标节点。");
      return;
    }

    const trimmedNote = noteContent.trim();

    setSolutionSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === editingNoteForNodeId ? { ...step, notes: trimmedNote } : step
      )
    );
    // Note: generateAndSetDagData will be called automatically if solutionSteps is a dependency of the useEffect that calls it.
    // If not, we need to call it manually here to update dagNodes' notes.
    // For now, assuming solutionSteps change triggers dag regeneration.
    // We might need to explicitly update dagNodes here too if generateDagData is complex or not triggered.
    setDagNodes(prevDagNodes => 
      prevDagNodes.map(node => 
        node.id === editingNoteForNodeId 
          ? { ...node, data: { ...node.data, notes: trimmedNote } } 
          : node
      )
    );

    toast.success(`节点 ${editingNoteForNodeId} 的备注已保存。`);
    handleCloseNoteModal();
  }, [editingNoteForNodeId, setSolutionSteps, setDagNodes, handleCloseNoteModal]);

  // <<< RESTORE THESE CALLBACKS >>>
  const handleAnalyzeStepFromContextMenu = useCallback((stepId: string) => {
    console.log(`Context menu: Analyze step ${stepId}`);
    toast.info("聚焦分析功能尚未实现。");
  }, []);

  const handleViewEditStepDetails = useCallback((stepId: string) => {
    console.log(`Context menu: View/Edit details for step ${stepId}`);
    toast.info("查看/编辑详情功能尚未实现。");
  }, []);

  const handleDeleteStepFromSolutionList = useCallback((stepId: string) => {
    const stepToDelete = solutionSteps.find(s => s.id === stepId);
    if (!stepToDelete) return;
    openConfirmationDialog(
      '确认删除步骤 (来自列表)',
      <span>您确定要从列表中删除步骤 <strong>"步骤 {stepToDelete.stepNumber}"</strong> (ID: {stepToDelete.id}) 吗？此操作会将其标记为已删除。</span>,
      () => {
        setSolutionSteps(prevSteps =>
          prevSteps.map(step => (step.id === stepId ? { ...step, isDeleted: true } : step))
        );
        toast.success(`步骤 ${stepToDelete.stepNumber} 已从列表标记为删除。`);
      },
      { confirmText: '删除', variant: 'destructive' }
    );
  }, [solutionSteps, openConfirmationDialog, setSolutionSteps]); // Added missing dependencies

  const handleAnalyzeStepFromSolutionList = useCallback((stepId: string) => {
    console.log("Analyze step requested from SolutionStep list:", stepId);
    // Logic from existing handleAnalyzeStep (toggling verification status)
    setSolutionSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          let newStatus = VerificationStatus.NotVerified;
          if (step.verificationStatus === VerificationStatus.NotVerified) newStatus = VerificationStatus.VerifiedCorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedCorrect) newStatus = VerificationStatus.VerifiedIncorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedIncorrect) newStatus = VerificationStatus.NotVerified;
          toast.info(`步骤 ${step.stepNumber} 状态已模拟切换。`); // Added toast
          return { ...step, verificationStatus: newStatus };
        }
        return step;
      })
    );
  }, [setSolutionSteps]); // Added missing dependencies

  // --- 3. CALLBACK TO TOGGLE AI COPILOT PANEL (ENHANCED) ---
  const toggleAiCopilotPanel = useCallback(() => {
    const newOpenState = !isAiCopilotPanelOpen;
    setIsAiCopilotPanelOpen(newOpenState);

    if (newOpenState) { // When opening the panel
      if (panelWidths.ai < MIN_PANEL_PERCENTAGE) {
        if (currentLayoutMode !== LayoutMode.AI_PANEL_ACTIVE) {
            setCurrentLayoutMode(LayoutMode.AI_PANEL_ACTIVE);
        } else {
            const userPrefsForAiMode = loadUserPreferenceForMode(LayoutMode.AI_PANEL_ACTIVE);
            const targetAiModeWidths = userPrefsForAiMode || { dag: 2, solver: 49, ai: 49 }; 
            setPanelWidths(ensurePanelWidthsSumTo100AndPrecision(targetAiModeWidths));
        }
      } 
    } 
  }, [isAiCopilotPanelOpen, panelWidths.ai, currentLayoutMode, setCurrentLayoutMode, setPanelWidths, ensurePanelWidthsSumTo100AndPrecision]);
  // --- END AI COPILOT PANEL TOGGLE CALLBACK ---

  // --- 2. Implement the callback to receive node info from DagVisualizationArea ---
  const handleNodeSelectedForCopilot = useCallback((nodeId: string, nodeData: DagNodeRfData) => {
    // Extract relevant information. nodeData directly comes from React Flow node.data
    // which we mapped from our appNode.data in DagVisualizationArea.
    console.log(`[MainLayout] Node selected for Copilot: ID=${nodeId}, Label=${nodeData.label}`);
    setCopilotContextNodeInfo({
      id: nodeId,
      label: nodeData.label,
      content: nodeData.fullLatexContent, // Assuming fullLatexContent is what we want for 'content'
    });
    // Optionally, if the AI Copilot panel isn't open, open it.
    if (!isAiCopilotPanelOpen) {
      toggleAiCopilotPanel(); // This will also handle layout adjustments if needed
    }
  }, [isAiCopilotPanelOpen, toggleAiCopilotPanel]);

  return (
    <main className={styles.mainLayoutContainer} ref={mainLayoutRef}>
      {/* TEMPORARY BUTTON IS REMOVED */}

      <ReactFlowProvider>
        <div
          className={`${styles.dagRegion} ${ 
            (currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) ? styles.dagRegionCollapsed : ''
          }`}
          style={{
            flexBasis: (currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) 
                       ? undefined 
                       : `${panelWidths.dag}%` 
           }}
        >
          <ControlBar
            currentLayoutMode={currentLayoutMode}
            isDagCollapsed={currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE}
            onToggleCollapse={handleToggleDagCollapse}
            onExpandDagFully={handleExpandDagFully}
            onActivateAiPanel={handleActivateAiPanel}
            isAiCopilotPanelOpen={isAiCopilotPanelOpen} 
            onToggleAiCopilotPanel={toggleAiCopilotPanel}
          />
          { (currentLayoutMode !== LayoutMode.DAG_COLLAPSED_SIMPLE && 
             currentLayoutMode !== LayoutMode.AI_PANEL_ACTIVE && 
             panelWidths.dag > 5) && 
            <DagVisualizationArea
              dagNodes={dagNodes}
              dagEdges={dagEdges}
              onSoftDeleteStep={handleSoftDeleteStep}
              onUndoSoftDeleteStep={handleUndoSoftDeleteStep}
              onUpdateStepVerificationStatus={handleUpdateStepVerificationStatus}
              onInitiateSplitStep={handleInitiateSplitStepFromContextMenu}
              onAnalyzeStep={handleAnalyzeStepFromContextMenu}
              onViewEditStepDetails={handleViewEditStepDetails}
              onInterpretIdea={handleInterpretIdea}
              onHighlightNode={handleHighlightNode}
              onNewPathFromNode={handleNewPathFromNode}
              onCopyNodeInfo={handleCopyNodeInfo}
              onCopyPathInfo={handleCopyPathInfo}
              onAddOrUpdateNote={handleOpenNoteModal}
              isCreatingNewPath={isCreatingNewPath}
              onSelectNewPathTargetNode={handleSelectNewPathTargetNode}
              previewPathElements={previewPathElements}
              onNodeMouseEnterForPathPreview={handleNodeMouseEnterForPathPreview}
              onNodeMouseLeaveForPathPreview={handleNodeMouseLeaveForPathPreview}
              onPaneClickFromLayout={handlePaneClickedInMainLayout}
              onNodeSelectedForCopilot={handleNodeSelectedForCopilot}
            />
          }
        </div>
      </ReactFlowProvider>

      {/* Separator 1: Between DAG and Solver */}
      { currentLayoutMode !== LayoutMode.AI_PANEL_ACTIVE && (
          <DraggableSeparator orientation="vertical" onDrag={handleSeparator1Drag} />
      )}
      
      <div
        className={styles.solverRegion}
        style={{
          flexBasis: `${panelWidths.solver}%`,
          display: panelWidths.solver === 0 ? 'none' : 'flex',
        }}
      >
        <ProblemBlock data={problemData} onContentChange={handleProblemChange} />
        <div className={styles.solutionStepsContainer}>
          {solutionSteps
            .filter(step => !step.isDeleted)
            .map((step) => (
            <SolutionStep
              key={step.id}
              step={step}
              onContentChange={handleStepContentChange}
              onDelete={handleDeleteStepFromSolutionList}
              onAnalyze={handleAnalyzeStepFromSolutionList}
              onSplit={handleSplitStep}
            />
          ))}
        </div>
        <SolverActions onAddStep={handleAddSolutionStep} />
      </div>

      {/* Separator 2: Between Solver and AI */}
      {currentLayoutMode !== LayoutMode.DAG_EXPANDED_FULL && panelWidths.ai > 0 && (
        <DraggableSeparator orientation="vertical" onDrag={handleSeparator2Drag} />
      )}

      <div
        className={styles.aiPanelRegion}
        style={{
          flexBasis: `${panelWidths.ai}%`,
          display: panelWidths.ai === 0 ? 'none' : 'flex',
          flexDirection: 'column', 
        }}
      >
        {isAiCopilotPanelOpen ? (
          <AICopilotPanel 
            isOpen={true} 
            onToggle={toggleAiCopilotPanel} 
            title="AI Copilot"
            // --- 4. Pass the context node info to AICopilotPanel ---
            contextNodeInfo={copilotContextNodeInfo} 
            // Prop name in AICopilotPanelProps needs to be defined as contextNodeInfo (or similar)
          />
        ) : (
          <>
            {/* Original content of aiPanelRegion */}
            <CollapsiblePanel title="LaTeX格式化" headerStyle={panelStyles.latexHeader} previewTextWhenCollapsed="点击展开LaTeX格式优化面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
            <div className={styles.draggableSeparatorHorizontal}></div>
            <CollapsiblePanel title="解释分析" headerStyle={panelStyles.explainHeader} previewTextWhenCollapsed="点击展开解题步骤分析面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
            <div className={styles.draggableSeparatorHorizontal}></div>
            <CollapsiblePanel title="总结归纳" headerStyle={panelStyles.summaryHeader} previewTextWhenCollapsed="点击展开解题过程总结面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
          </>
        )}
      </div>

      {/* Render ConfirmationDialog globally */}
      <ConfirmationDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        onConfirm={confirmDialogState.onConfirm}
        onCancel={closeConfirmationDialog} // Ensure cancel always closes the dialog
        confirmButtonVariant={confirmDialogState.confirmButtonVariant}
      />

      {/* <<< RENDER NodeNoteModal >>> */}
      <NodeNoteModal 
        isOpen={isNoteModalOpen}
        onClose={handleCloseNoteModal}
        initialNote={currentEditingNote}
        onSave={handleSaveNote}
        nodeLabel={currentEditingNodeLabel}
        title={`编辑备注 - 节点 ${currentEditingNodeLabel}`}
      />

      {/* Render SplitStepModal */}
      <SplitStepModal
        isOpen={isSplitModalOpen}
        onClose={handleCloseSplitStepModal}
        originalStepContent={splittingStepOriginalContent}
        originalStepLabel={splittingStepOriginalLabel}
        onConfirmSplit={handleConfirmSplitStepModal}
      />

      {/* Render InterpretationModal */}
      {isInterpretationModalOpen && interpretingNodeInfo && (
        <InterpretationModal
          isOpen={isInterpretationModalOpen}
          onClose={handleCloseInterpretationModal}
          onSubmit={handleSubmitInterpretation}
          nodeId={interpretingNodeInfo.id}
          nodeLabel={interpretingNodeInfo.label}
          nodeContent={interpretingNodeInfo.content}
          initialIdea={interpretingNodeInfo.initialIdea}
        />
      )}

      {/* AICopilotPanel OVERLAY IS REMOVED */}
    </main>
  );
};

export default MainLayout; 