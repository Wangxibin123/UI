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
  ForwardDerivationStatus,
  FocusAnalysisType,
} from '../../../types';
import { MarkerType, ReactFlowProvider } from '@reactflow/core';
import ConfirmationDialog from '../../common/ConfirmationDialog/ConfirmationDialog';

import { toast } from 'react-toastify';
import NodeNoteModal from '../../common/NodeNoteModal/NodeNoteModal';
import SplitStepModal from '../../common/SplitStepModal/SplitStepModal';
import InterpretationModal from '../../common/InterpretationModal/InterpretationModal';
import AICopilotPanel, { type AICopilotPanelProps, type Message as AICopilotMessage, type DagNodeInfo as CopilotDagNodeInfo, type CopilotMode } from '../../features/ai/AICopilotPanel/AICopilotPanel';
import RightSidePanel from '../../features/rightPanel/RightSidePanel';
import { Bot } from 'lucide-react';

interface PanelWidthsType {
  dag: number;
  solver: number;
  ai: number;
}

// Helper function to find a path between two nodes using BFS (ENSURE THIS IS RETAINED)
const findPathBetweenNodes = (
  sourceId: string,
  targetId: string,
  nodes: DagNode[],
  edges: DagEdge[]
): { pathNodes: string[]; pathEdges: string[] } | null => {
  // ... (implementation of findPathBetweenNodes) ...
  const adj: Map<string, { neighbor: string; edgeId: string }[]> = new Map();
  edges.forEach(edge => {
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
        if (neighborNode && !neighborNode.data.isDeleted) {
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
  return null;
};

// --- C3: Pathfinding utilities for Focus Analysis ---
const findForwardPath = (
  startNodeId: string,
  nodes: DagNode[],
  edges: DagEdge[]
): { pathNodes: string[]; pathEdges: string[] } => {
  const pathNodesSet: Set<string> = new Set();
  const pathEdgesSet: Set<string> = new Set();
  const queue: string[] = [];
  const visitedNodes: Set<string> = new Set();

  const startNode = nodes.find(n => n.id === startNodeId);
  if (startNode && !startNode.data.isDeleted) {
    queue.push(startNodeId);
    visitedNodes.add(startNodeId);
    pathNodesSet.add(startNodeId);
  }

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++];
    edges.forEach(edge => {
      if (edge.source === currentId) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode && !targetNode.data.isDeleted) {
          pathEdgesSet.add(edge.id);
          if (!visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            pathNodesSet.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
    });
  }
  return { pathNodes: Array.from(pathNodesSet), pathEdges: Array.from(pathEdgesSet) };
};

const findBackwardPath = (
  endNodeId: string,
  nodes: DagNode[],
  edges: DagEdge[]
): { pathNodes: string[]; pathEdges: string[] } => {
  const pathNodesSet: Set<string> = new Set();
  const pathEdgesSet: Set<string> = new Set();
  const queue: string[] = [];
  const visitedNodes: Set<string> = new Set();

  const endNode = nodes.find(n => n.id === endNodeId);
  if (endNode && !endNode.data.isDeleted) {
    queue.push(endNodeId);
    visitedNodes.add(endNodeId);
    pathNodesSet.add(endNodeId);
  }

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++];
    edges.forEach(edge => {
      if (edge.target === currentId) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode && !sourceNode.data.isDeleted) {
          pathEdgesSet.add(edge.id);
          if (!visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            pathNodesSet.add(edge.source);
            queue.push(edge.source);
          }
        }
      }
    });
  }
  return { pathNodes: Array.from(pathNodesSet), pathEdges: Array.from(pathEdgesSet) };
};
// --- End C3 ---

// --- ADD COMPARISON FUNCTIONS HERE ---
const compareNodeData = (dataA: DagNodeRfData, dataB: DagNodeRfData): boolean => {
  // ... (implementation of compareNodeData) ...
  return (
    dataA.label === dataB.label &&
    dataA.fullLatexContent === dataB.fullLatexContent &&
    dataA.verificationStatus === dataB.verificationStatus &&
    dataA.stepNumber === dataB.stepNumber &&
    (dataA.isDeleted || false) === (dataB.isDeleted || false) && // Normalize undefined to false
    dataA.notes === dataB.notes &&
    dataA.highlightColor === dataB.highlightColor &&
    (dataA.isOnNewPath || false) === (dataB.isOnNewPath || false) &&
    dataA.interpretationIdea === dataB.interpretationIdea
  );
};

const areNodesEqual = (nodesA: DagNode[], nodesB: DagNode[]): boolean => {
  // ... (implementation of areNodesEqual) ...
  if (nodesA.length !== nodesB.length) return false;
  for (let i = 0; i < nodesA.length; i++) {
    const nodeA = nodesA[i];
    const nodeB = nodesB.find(n => n.id === nodeA.id);
    if (!nodeB) return false;
    if (
      nodeA.id !== nodeB.id ||
      nodeA.type !== nodeB.type ||
      nodeA.position.x !== nodeB.position.x ||
      nodeA.position.y !== nodeB.position.y ||
      !compareNodeData(nodeA.data, nodeB.data)
    ) {
      return false;
    }
  }
  return true;
};

const compareEdgeData = (dataA: any, dataB: any): boolean => {
  // ... (implementation of compareEdgeData) ...
  if (!dataA && !dataB) return true;
  if (!dataA || !dataB) return false;
  return (
    (dataA.isOnNewPath || false) === (dataB.isOnNewPath || false) &&
    (dataA.isDeleted || false) === (dataB.isDeleted || false)
  );
};

const areEdgesEqual = (edgesA: DagEdge[], edgesB: DagEdge[]): boolean => {
  // ... (implementation of areEdgesEqual) ...
  if (edgesA.length !== edgesB.length) return false;
  for (let i = 0; i < edgesA.length; i++) {
    const edgeA = edgesA[i];
    const edgeB = edgesB.find(e => e.id === edgeA.id);
    if (!edgeB) return false;
    if (
      edgeA.id !== edgeB.id ||
      edgeA.source !== edgeB.source ||
      edgeA.target !== edgeB.target ||
      edgeA.type !== edgeB.type ||
      (edgeA.markerEnd?.type !== edgeB.markerEnd?.type) || 
      (JSON.stringify(edgeA.style) !== JSON.stringify(edgeB.style)) || 
      (edgeA.animated || false) === (edgeB.animated || false) || 
      !compareEdgeData(edgeA.data, edgeB.data)
    ) {
      return false;
    }
  }
  return true;
};
// --- END COMPARISON FUNCTIONS ---

const LOCAL_STORAGE_PREFIX = 'aiMath_layoutPrefs_';

function saveUserPreferenceForMode(mode: LayoutMode, widths: PanelWidthsType): void {
  // ... (implementation of saveUserPreferenceForMode) ...
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${mode}`, JSON.stringify(widths));
  } catch (error) {
    console.warn("Could not save user layout preference:", error);
  }
}

function loadUserPreferenceForMode(mode: LayoutMode): PanelWidthsType | null {
  // ... (implementation of loadUserPreferenceForMode) ...
  try {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${mode}`);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not load user layout preference:", error);
    return null;
  }
}

const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", verificationStatus: VerificationStatus.NotVerified, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
];

const MIN_PANEL_PERCENTAGE = 10; // Minimum width for any panel in percentage

interface CopilotContextNodeInfo {
  id: string;
  label?: string;
  content?: string; 
}

// MOVED MainLayout COMPONENT DEFINITION DOWN HERE
const MainLayout: React.FC = () => {
  // MOVED HOOKS INSIDE
  const [isAICopilotChatActive, setIsAICopilotChatActive] = useState(false);
  // console.log('[MainLayout] Initial isAICopilotChatActive:', isAICopilotChatActive); // DEBUG LINE REMOVED

  const handleAICopilotChatStateChange = useCallback((isActive: boolean) => {
    // console.log('[MainLayout] handleAICopilotChatStateChange called with isActive:', isActive); // DEBUG LINE REMOVED
    setIsAICopilotChatActive(isActive);
  }, []);

  const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(() => {
    return LayoutMode.DEFAULT_THREE_COLUMN;
  });
  // ... (rest of the MainLayout component's state, effects, callbacks, and return JSX) ...
  // ... ENSURE ALL OTHER HOOKS (useState, useEffect, useCallback, useMemo, useRef) ARE WITHIN THIS MainLayout SCOPE ...

  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
    return initialSolutionStepsData.map(step => ({ 
      ...step, 
      isDeleted: step.isDeleted || false,
      forwardDerivationStatus: step.forwardDerivationStatus || ForwardDerivationStatus.Undetermined, // Ensure it has a default
      backwardDerivationStatus: step.backwardDerivationStatus || ForwardDerivationStatus.Undetermined // Ensure it has a default for backward
    }));
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

  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: '',
    message: '' as string | React.ReactNode,
    confirmText: '确认',
    cancelText: '取消',
    onConfirm: () => {},
    confirmButtonVariant: 'default' as 'default' | 'destructive' | 'constructive',
  });

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteForNodeId, setEditingNoteForNodeId] = useState<string | null>(null);
  const [currentEditingNote, setCurrentEditingNote] = useState<string>('');
  const [currentEditingNodeLabel, setCurrentEditingNodeLabel] = useState<string>('');

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splittingStepId, setSplittingStepId] = useState<string | null>(null);
  const [splittingStepOriginalContent, setSplittingStepOriginalContent] = useState<string>('');
  const [splittingStepOriginalLabel, setSplittingStepOriginalLabel] = useState<string>('');

  const [startNewPathNodeId, setStartNewPathNodeId] = useState<string | null>(null);
  const [isCreatingNewPath, setIsCreatingNewPath] = useState<boolean>(false);

  const [isInterpretationModalOpen, setIsInterpretationModalOpen] = useState<boolean>(false);
  const [interpretingNodeInfo, setInterpretingNodeInfo] = useState<{
    id: string;
    label?: string;
    content?: string;
    initialIdea?: string;
  } | null>(null);

  const [previewPathElements, setPreviewPathElements] = useState<{ nodes: string[]; edges: string[] } | null>(null);

  const [showSimilarProblems, setShowSimilarProblems] = useState(true);
  const [showAiHints, setShowAiHints] = useState(true);
  const [showSummary, setShowSummary] = useState(true);

  const solverColumnRef = useRef<HTMLDivElement>(null);
  const dagColumnRef = useRef<HTMLDivElement>(null);

  const [isAiCopilotPanelOpen, setIsAiCopilotPanelOpen] = useState<boolean>(true);
  const [copilotContextNodeInfo, setCopilotContextNodeInfo] = useState<CopilotContextNodeInfo | null>(null);
  const [copilotCurrentMode, setCopilotCurrentMode] = useState<CopilotMode>('analysis');

  const [currentFocusAnalysisNodeId, setCurrentFocusAnalysisNodeId] = useState<string | null>(null);
  const [currentFocusAnalysisType, setCurrentFocusAnalysisType] = useState<FocusAnalysisType>(null);
  // --- End C2 ---

  // --- C4: Core handlers for Focus Analysis ---
  const handleInitiateFocusAnalysis = useCallback((nodeId: string, type: FocusAnalysisType) => {
    if (!type) return; // Should not happen if called correctly

    // Clear previous focus highlights first
    const clearedNodes = dagNodes.map(n => ({
      ...n,
      data: { ...n.data, isFocusPath: false, isFocusSource: false },
    }));
    const clearedEdges = dagEdges.map(e => ({
      ...e,
      data: { ...e.data, isFocusPath: false },
      animated: e.data?.isOnNewPath || false, // Keep new path animation, remove focus animation
      style: { ...e.style, stroke: e.data?.isOnNewPath ? '#2ecc71' : undefined }, // Reset stroke unless on new path
    }));

    let focusNodesIds: string[] = [];
    let focusEdgesIds: string[] = [];

    if (type === 'forward') {
      const { pathNodes, pathEdges } = findForwardPath(nodeId, clearedNodes, clearedEdges);
      focusNodesIds = pathNodes;
      focusEdgesIds = pathEdges;
    } else if (type === 'backward') {
      const { pathNodes, pathEdges } = findBackwardPath(nodeId, clearedNodes, clearedEdges);
      focusNodesIds = pathNodes;
      focusEdgesIds = pathEdges;
    } else if (type === 'full') {
      const forward = findForwardPath(nodeId, clearedNodes, clearedEdges);
      const backward = findBackwardPath(nodeId, clearedNodes, clearedEdges);
      focusNodesIds = Array.from(new Set([...forward.pathNodes, ...backward.pathNodes]));
      focusEdgesIds = Array.from(new Set([...forward.pathEdges, ...backward.pathEdges]));
    }

    if (focusNodesIds.length === 0 && type !== null) {
        toast.info(`节点 ${nodeId} 未找到 ${type === 'forward' ? '向前' : type === 'backward' ? '向后' : '相关'} 路径。`);
        setCurrentFocusAnalysisNodeId(nodeId); // Still set source for context
        setCurrentFocusAnalysisType(type);
        setDagNodes(clearedNodes.map(n => n.id === nodeId ? {...n, data: {...n.data, isFocusSource: true}} : n));
        setDagEdges(clearedEdges);
        return;
    }

    setDagNodes(
      clearedNodes.map(n => {
        const isSource = n.id === nodeId;
        const isOnPath = focusNodesIds.includes(n.id);
        if (isSource || isOnPath) {
          return {
            ...n,
            data: { ...n.data, isFocusPath: isOnPath, isFocusSource: isSource },
          };
        }
        return n;
      })
    );

    setDagEdges(
      clearedEdges.map(e => {
        if (focusEdgesIds.includes(e.id)) {
          return {
            ...e,
            data: { ...e.data, isFocusPath: true },
            animated: true, // Animate focused edges
            style: { ...e.style, stroke: '#ff0072' }, // Example focus color
          };
        }
        return e;
      })
    );

    setCurrentFocusAnalysisNodeId(nodeId);
    setCurrentFocusAnalysisType(type);
    toast.success(`已聚焦分析节点 ${nodeId} 的 ${type} 路径。`);

  }, [dagNodes, dagEdges]);

  const handleCancelFocusAnalysis = useCallback(() => {
    if (!currentFocusAnalysisNodeId) return; // No focus to cancel

    setDagNodes(prevNodes =>
      prevNodes.map(n => ({
        ...n,
        data: { ...n.data, isFocusPath: false, isFocusSource: false },
      }))
    );
    setDagEdges(prevEdges =>
      prevEdges.map(e => ({
        ...e,
        data: { ...e.data, isFocusPath: false },
        animated: e.data?.isOnNewPath || false, // Keep new path animation
        style: { ...e.style, stroke: e.data?.isOnNewPath ? '#2ecc71' : undefined }, // Reset stroke unless on new path
      }))
    );

    toast.info(`已取消对节点 ${currentFocusAnalysisNodeId} 的聚焦分析。`);
    setCurrentFocusAnalysisNodeId(null);
    setCurrentFocusAnalysisType(null);
  }, [currentFocusAnalysisNodeId]);
  // --- End C4 ---

  const copilotDagNodes: CopilotDagNodeInfo[] = useMemo(() => {
    if (!dagNodes) return [];
    return dagNodes
      .filter(node => !node.data.isDeleted)
      .map(node => ({
        id: node.id,
        label: node.data.label,
      }));
  }, [dagNodes]);

  const clearPreviewPath = useCallback(() => {
    setPreviewPathElements(null);
  }, [setPreviewPathElements]);

  const handleNodeMouseEnterForPathPreview = useCallback((hoveredNodeId: string) => {
    if (isCreatingNewPath && startNewPathNodeId && hoveredNodeId !== startNewPathNodeId) {
      const pathResult = findPathBetweenNodes(startNewPathNodeId, hoveredNodeId, dagNodes, dagEdges);
      if (pathResult) {
        setPreviewPathElements({ nodes: pathResult.pathNodes, edges: pathResult.pathEdges });
      } else {
        setPreviewPathElements(null);
      }
    }
  }, [isCreatingNewPath, startNewPathNodeId, dagNodes, dagEdges, setPreviewPathElements]);

  const handleNodeMouseLeaveForPathPreview = useCallback(() => {
    clearPreviewPath();
  }, [clearPreviewPath]);

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
        closeConfirmationDialog();
      },
      confirmText: options?.confirmText || '确认',
      cancelText: options?.cancelText || '取消',
      confirmButtonVariant: options?.variant || 'default',
    });
  }, []); // Removed closeConfirmationDialog from dependency array as it's defined below and stable

  const closeConfirmationDialog = useCallback(() => {
    setConfirmDialogState(prevState => ({ ...prevState, isOpen: false }));
  }, []);
  
  useEffect(() => {
    const generateDagData = () => {
      // console.log('[MainLayout] generateDagData called. solutionSteps:', JSON.parse(JSON.stringify(solutionSteps)));
      // console.log('[MainLayout] Current dagNodes:', JSON.parse(JSON.stringify(dagNodes)));
      // console.log('[MainLayout] Current dagEdges:', JSON.parse(JSON.stringify(dagEdges)));

      if (!solutionSteps || solutionSteps.length === 0) {
        // console.log('[MainLayout] No solution steps, clearing DAG.');
        setDagNodes([]);
        setDagEdges([]);
        return;
      }

      let visibleNodeIndex = 0;
      const parkedNodeXPosition = 30;
      const activeNodeXPosition = 200;
      const verticalSpacing = 120;
      const baseOffsetY = 50;

      const newNodes: DagNode[] = solutionSteps.map((step, index) => {
        let xPos, yPos;

        if (step.isDeleted) {
          xPos = parkedNodeXPosition;
          // Deleted nodes can maintain a Y position relative to their original sequence order,
          // but are shifted to the 'parked' X position.
          // Or, you could assign them a yPos based on a separate counter for deleted items if preferred.
          // For simplicity here, using original index for Y helps maintain some vertical order sense.
          yPos = index * verticalSpacing + baseOffsetY; 
        } else {
          xPos = activeNodeXPosition;
          yPos = visibleNodeIndex * verticalSpacing + baseOffsetY;
          visibleNodeIndex++; // Increment index only for visible (non-deleted) nodes
        }

        // Try to find existing node data to preserve highlightColor and isOnNewPath if they exist
        const existingNode = dagNodes.find(n => n.id === step.id);

        return {
          id: step.id,
          type: 'customStepNode',
          data: {
            label: `步骤 ${step.stepNumber}`,
            fullLatexContent: step.latexContent,
            verificationStatus: step.verificationStatus,
            stepNumber: step.stepNumber,
            isDeleted: step.isDeleted || false,
            notes: step.notes,
            highlightColor: existingNode?.data.highlightColor,
            isOnNewPath: existingNode?.data.isOnNewPath || false,
            interpretationIdea: existingNode?.data.interpretationIdea,
            forwardDerivationDisplayStatus: step.forwardDerivationStatus,
            backwardDerivationDisplayStatus: step.backwardDerivationStatus,
          },
          position: { x: xPos, y: yPos },
        };
      });

      // --- REPLACE THE ENTIRE OLD EDGE GENERATION LOGIC FROM HERE ---
      const visibleSteps = solutionSteps.filter(s => !s.isDeleted);
      const newEdges: DagEdge[] = [];

      if (visibleSteps.length > 1) {
        for (let i = 1; i < visibleSteps.length; i++) {
          const sourceStep = visibleSteps[i - 1];
          const targetStep = visibleSteps[i];
          
          if (sourceStep && targetStep) { // Ensure steps are valid
            const edgeId = `e-${sourceStep.id}-${targetStep.id}`;
            
            // Find existing edge by source and target to preserve its properties if it still connects the same nodes.
            // The useEffect dependency on dagEdges ensures we have the latest dagEdges here.
            const existingEdge = dagEdges.find(e => e.source === sourceStep.id && e.target === targetStep.id);

            newEdges.push({
              id: edgeId, 
              source: sourceStep.id,
              target: targetStep.id,
              type: 'smoothstep', 
              markerEnd: { type: MarkerType.ArrowClosed },
              data: {
                isOnNewPath: existingEdge?.data?.isOnNewPath || false,
                isDeleted: false, 
              },
              style: existingEdge?.style || { stroke: undefined }, 
              animated: existingEdge?.data?.isOnNewPath || false, 
            });
          }
        }
      }
      // --- UNTIL HERE --- (The lines for setDagNodes and setDagEdges remain after this block)
      
      // console.log('[MainLayout] Generated newNodes:', JSON.parse(JSON.stringify(newNodes))); // DEBUG LINE
      // console.log('[MainLayout] Generated newEdges:', JSON.parse(JSON.stringify(newEdges))); // DEBUG LINE

      // --- MODIFICATION START: Conditional state updates ---
      if (!areNodesEqual(dagNodes, newNodes)) {
        // console.log('[MainLayout] Updating dagNodes because they are different.'); // DEBUG LINE
        setDagNodes(newNodes);
      } else {
        // console.log('[MainLayout] Skipping dagNodes update, no change.'); // DEBUG LINE
      }

      if (!areEdgesEqual(dagEdges, newEdges)) {
        // console.log('[MainLayout] Updating dagEdges because they are different.'); // DEBUG LINE
        setDagEdges(newEdges);
      } else {
        // console.log('[MainLayout] Skipping dagEdges update, no change.'); // DEBUG LINE
      }
      // --- MODIFICATION END: Conditional state updates ---
    };

    generateDagData();

  }, [solutionSteps, dagNodes, dagEdges]);

  useEffect(() => {
    setProblemData({
      id: 'problem-init-1',
      title: '示例题目',
      latexContent: '$$\\frac{d^2y}{dx^2} + 5\\frac{dy}{dx} + 6y = 0$$'
    });

    const initialStepsExample: SolutionStepData[] = [
      { id: 'step-init-1', stepNumber: 1, latexContent: '$$\\lambda^2 + 5\\lambda + 6 = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
      { id: 'step-init-2', stepNumber: 2, latexContent: '$$(\\lambda+2)(\\lambda+3) = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
      { id: 'step-init-3', stepNumber: 3, latexContent: '$$\\lambda_1 = -2, \\lambda_2 = -3$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
    ];
    setSolutionSteps(initialStepsExample.map(step => ({ // Ensure mapping includes new status on init
      ...step,
      forwardDerivationStatus: step.forwardDerivationStatus || ForwardDerivationStatus.Undetermined,
      backwardDerivationStatus: step.backwardDerivationStatus || ForwardDerivationStatus.Undetermined
    })));
  }, []);

  const handleAddSolutionStep = (latexInput: string) => {
    if (!latexInput.trim()) return;
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: solutionSteps.filter(s => !s.isDeleted).length + 1,
      latexContent: latexInput,
      verificationStatus: VerificationStatus.NotVerified,
      isDeleted: false,
      forwardDerivationStatus: ForwardDerivationStatus.Undetermined, // Add default status
      backwardDerivationStatus: ForwardDerivationStatus.Undetermined, // Add default backward status
    };
    setSolutionSteps(prevSteps => [...prevSteps, newStep]);
  };

  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({}); // Ref to store timeout IDs
  const prevSolutionStepsForToastRef = useRef<SolutionStepData[]>(); // Dedicated ref for toast comparison

  // useEffect for triggering toast notifications based on status changes
  useEffect(() => {
    const currentSteps = solutionSteps; // Capture current solutionSteps from the closure
    const prevSteps = prevSolutionStepsForToastRef.current; // Get what was stored last time THIS effect ran

    if (prevSteps) { // Only proceed if we have a previous state to compare against
      // console.log('[ToastEffect] Checking for status changes. Prev count:', prevSteps.length, 'Curr count:', currentSteps.length);
      
      currentSteps.forEach((currentStep) => {
        const prevStep = prevSteps.find(ps => ps.id === currentStep.id);
        
        if (!prevStep) {
          // console.log(`[ToastEffect] No prevStep found for currentStep ID: ${currentStep.id} (likely new step)`); 
          return;
        }

        // Check Forward Derivation: Pending -> Incorrect
        if (prevStep.forwardDerivationStatus === ForwardDerivationStatus.Pending &&
            currentStep.forwardDerivationStatus === ForwardDerivationStatus.Incorrect) {
          // console.log(`[ToastEffect] Forward derivation INCORRECT for step ${currentStep.stepNumber} (ID: ${currentStep.id}). Prev: Pending, Curr: Incorrect. TRIGGERING TOAST.`); 
          toast.error(`步骤 ${currentStep.stepNumber} 正向推导验证失败！`);
        }

        // Check Backward Derivation: Pending -> Incorrect
        if (prevStep.backwardDerivationStatus === ForwardDerivationStatus.Pending &&
            currentStep.backwardDerivationStatus === ForwardDerivationStatus.Incorrect) {
          // console.log(`[ToastEffect] Backward derivation INCORRECT for step ${currentStep.stepNumber} (ID: ${currentStep.id}). Prev: Pending, Curr: Incorrect. TRIGGERING TOAST.`);
          toast.error(`步骤 ${currentStep.stepNumber} 反向推导验证失败！`);
        }
      });
    } else {
      // console.log('[ToastEffect] Initial run or prevSteps was undefined, no comparison done.');
    }

    // After checking (or on initial run), update the ref to the current steps for the NEXT run of this effect.
    prevSolutionStepsForToastRef.current = currentSteps; 

  }, [solutionSteps]); // Still depends on solutionSteps to re-run when it changes

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const handleCheckForwardDerivation = useCallback((stepId: string) => {
    setSolutionSteps(prevSteppz => {
      const targetStep = prevSteppz.find(s => s.id === stepId);
      if (targetStep && targetStep.forwardDerivationStatus === ForwardDerivationStatus.Pending) {
        return prevSteppz;
      }
      const timeoutKey = `forward-${stepId}`;
      if (timeoutRefs.current[timeoutKey]) {
        clearTimeout(timeoutRefs.current[timeoutKey]);
      }
      return prevSteppz.map(step => {
        if (step.id === stepId) {
          const pendingStep = { ...step, forwardDerivationStatus: ForwardDerivationStatus.Pending };
          timeoutRefs.current[timeoutKey] = setTimeout(() => {
            setSolutionSteps(currentSteps => {
              const updatedSteps = currentSteps.map(s => {
                if (s.id === stepId) {
                  const nextStatus = Math.random() < 0.7 ? ForwardDerivationStatus.Correct : ForwardDerivationStatus.Incorrect;
                  const finalStepWithStatus = { ...s, forwardDerivationStatus: nextStatus };
                  // Update DAG node data directly for immediate visual feedback
                  setDagNodes(prevDagNodes => prevDagNodes.map(node => 
                    node.id === stepId 
                      ? { ...node, data: { ...node.data, forwardDerivationDisplayStatus: nextStatus } } 
                      : node
                  ));
                  return finalStepWithStatus;
                }
                return s;
              });
              delete timeoutRefs.current[timeoutKey];
              return updatedSteps;
            });
          }, 1500);
          return pendingStep;
        }
        return step;
      });
    });
  }, [setDagNodes]); // Ensure setDagNodes is in dependencies

  const handleCheckBackwardDerivation = useCallback((stepId: string) => {
    setSolutionSteps(prevSteppz => {
      const targetStep = prevSteppz.find(s => s.id === stepId);
      if (targetStep && targetStep.backwardDerivationStatus === ForwardDerivationStatus.Pending) {
        return prevSteppz;
      }
      const timeoutKey = `backward-${stepId}`;
      if (timeoutRefs.current[timeoutKey]) {
        clearTimeout(timeoutRefs.current[timeoutKey]);
      }
      return prevSteppz.map(step => {
        if (step.id === stepId) {
          const pendingStep = { ...step, backwardDerivationStatus: ForwardDerivationStatus.Pending };
          timeoutRefs.current[timeoutKey] = setTimeout(() => {
            setSolutionSteps(currentSteps => {
              const updatedSteps = currentSteps.map(s => {
                if (s.id === stepId) {
                  const nextStatus = Math.random() < 0.7 ? ForwardDerivationStatus.Correct : ForwardDerivationStatus.Incorrect;
                  const finalStepWithStatus = { ...s, backwardDerivationStatus: nextStatus };
                  // Update DAG node data directly for immediate visual feedback
                  setDagNodes(prevDagNodes => prevDagNodes.map(node => 
                    node.id === stepId 
                      ? { ...node, data: { ...node.data, backwardDerivationDisplayStatus: nextStatus } } 
                      : node
                  ));
                  return finalStepWithStatus;
                }
                return s;
              });
              delete timeoutRefs.current[timeoutKey];
              return updatedSteps;
            });
          }, 1500);
          return pendingStep;
        }
        return step;
      });
    });
  }, [setDagNodes]); // Ensure setDagNodes is in dependencies

  // <<< 辅助函数：确保宽度总和为100%并处理精度 >>>
  const ensurePanelWidthsSumTo100AndPrecision = useCallback((
    currentWidths: PanelWidthsType,
    mode: LayoutMode // Pass mode to know which panels are active/fixed
  ): PanelWidthsType => {
    // console.log('[ensurePanelWidths] Input:', JSON.parse(JSON.stringify(currentWidths)), 'Mode:', mode);
    let { dag, solver, ai } = currentWidths;

    // Apply MIN_PANEL_PERCENTAGE to panels that should be active and non-zero
    if (mode === LayoutMode.DEFAULT_THREE_COLUMN || mode === LayoutMode.AI_PANEL_ACTIVE || mode === LayoutMode.DAG_COLLAPSED_SIMPLE) {
      if (dag < MIN_PANEL_PERCENTAGE && mode !== LayoutMode.AI_PANEL_ACTIVE) dag = MIN_PANEL_PERCENTAGE; // DAG can be very small in AI_PANEL_ACTIVE
      if (solver < MIN_PANEL_PERCENTAGE) solver = MIN_PANEL_PERCENTAGE;
      if (ai < MIN_PANEL_PERCENTAGE && (mode === LayoutMode.DEFAULT_THREE_COLUMN || mode === LayoutMode.AI_PANEL_ACTIVE)) ai = MIN_PANEL_PERCENTAGE; 
      // In DAG_COLLAPSED_SIMPLE, AI might be 0 if DAG takes up space, or also min if active.
      // This part needs careful state definition for DAG_COLLAPSED_SIMPLE if AI can be 0.
    }
    if (mode === LayoutMode.AI_PANEL_ACTIVE) { // Specific for AI_PANEL_ACTIVE
      if (dag > 2 && dag < MIN_PANEL_PERCENTAGE) dag = MIN_PANEL_PERCENTAGE; // If not the fixed 2%, ensure it's at least MIN
      else if (dag !== 2) dag = 2; // Enforce 2% for DAG if it was something else
    }
    if (mode === LayoutMode.DAG_EXPANDED_FULL) {
      if (dag < MIN_PANEL_PERCENTAGE) dag = MIN_PANEL_PERCENTAGE;
      if (solver < MIN_PANEL_PERCENTAGE) solver = MIN_PANEL_PERCENTAGE;
      ai = 0;
    }
    if (mode === LayoutMode.DAG_COLLAPSED_SIMPLE) {
        // Assuming DAG is fixed small, e.g. 2% or MIN_PANEL_PERCENTAGE
        if (dag > 2 && dag < MIN_PANEL_PERCENTAGE) dag = MIN_PANEL_PERCENTAGE;
        else if (dag !== 2 && dag !== MIN_PANEL_PERCENTAGE) dag = 2; // Or some defined small value
        if (solver < MIN_PANEL_PERCENTAGE) solver = MIN_PANEL_PERCENTAGE;
        // AI can be 0 or MIN_PANEL_PERCENTAGE depending on space
    }

    // Ensure sum is 100% after applying MIN_PANEL_PERCENTAGE and mode-specific fixed widths
    let currentTotal = dag + solver + ai;
    if (Math.abs(currentTotal - 100) > 0.01) {
      if (currentTotal <= 0) { // Avoid division by zero or negative; reset to a default for the mode
          // This case indicates a significant issue; log and reset might be best
          // console.error("[ensurePanelWidths] Total width is zero or negative before scaling! Resetting based on mode.", mode, {dag, solver, ai});
          // Reset logic here based on mode, e.g., for DEFAULT_THREE_COLUMN:
          // dag = 33.3; solver = 33.4; ai = 33.3;
          // This is a fallback, the logic before should prevent this.
          // For now, let's just ensure they are at least MIN_PANEL_PERCENTAGE if active in mode
      } else {
          const scaleFactor = 100 / currentTotal;
          // Scale only panels that are supposed to be flexible
          // This needs more sophisticated logic based on which panel caused the sum error
          // For now, a simple proportional scaling, but it might violate MIN_PANEL_PERCENTAGE again.
          dag = parseFloat((dag * scaleFactor).toFixed(1));
          solver = parseFloat((solver * scaleFactor).toFixed(1));
          ai = parseFloat((100 - dag - solver).toFixed(1)); // Last one takes remainder to ensure 100 sum
      }
    }
    
    // Final check for negative values that might have occurred due to parseFloat and toFixed(1) for the remainder
    if (dag < 0) dag = 0;
    if (solver < 0) solver = 0;
    if (ai < 0) ai = 0;
    // And re-ensure sum is 100, adjusting the largest panel or solver typically.
    currentTotal = dag + solver + ai;
    if (Math.abs(currentTotal - 100) > 0.01) {
      const diff = 100 - currentTotal;
      // Add difference to solver, or the largest panel, or distribute proportionally again
      solver = parseFloat((solver + diff).toFixed(1)); 
    }


    const finalWidths = { dag, solver, ai }; // Use the corrected dag, solver, ai
    // console.log('[ensurePanelWidths] Output:', JSON.parse(JSON.stringify(finalWidths)));
    return finalWidths;
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
    setPanelWidths(ensurePanelWidthsSumTo100AndPrecision(targetWidths, currentLayoutMode));
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
  const handleSeparator1Drag = useCallback(
    (delta: { dx: number }) => { // MODIFIED: Expect an object with dx property
      const { dx } = delta; // Destructure dx
      const dragPercent = (dx / mainLayoutRef.current!.offsetWidth) * 100;
      let newDag = panelWidths.dag + dragPercent;
      let newSolver = panelWidths.solver - dragPercent;
      let newAi = panelWidths.ai; // AI panel is not directly affected by separator 1 in 3-column mode

      // Apply constraints based on layout mode
      switch (currentLayoutMode) {
        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.DAG_COLLAPSED_SIMPLE: // DAG has min width, AI might be 0 or have min width
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          // AI width remains, but newDag + newSolver + newAi must be 100.
          // If newDag + newSolver > (100 - MIN_PANEL_PERCENTAGE for AI, if AI is active and minned), adjust.
          if (newDag + newSolver > 100 - (newAi > 0 ? Math.max(0, newAi, MIN_PANEL_PERCENTAGE) : 0) ) {
            if (panelWidths.dag + dragPercent > newDag) { // Dragging right, solver hit min
              newSolver = MIN_PANEL_PERCENTAGE;
              newDag = 100 - newSolver - newAi; // newAi could be 0 or MIN_PANEL_PERCENTAGE
            } else { // Dragging left, dag hit min
              newDag = MIN_PANEL_PERCENTAGE;
              newSolver = 100 - newDag - newAi;
            }
          }
          break;
        case LayoutMode.DAG_EXPANDED_FULL: // Only DAG and Solver, AI is 0
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = 0;
          if (newDag + newSolver > 100) {
            if (panelWidths.dag + dragPercent > newDag) { // Dragging right, solver hit min
              newSolver = MIN_PANEL_PERCENTAGE;
              newDag = 100 - newSolver;
            } else { // Dragging left, dag hit min
              newDag = MIN_PANEL_PERCENTAGE;
              newSolver = 100 - newDag;
            }
          }
          break;
        case LayoutMode.AI_PANEL_ACTIVE: // DAG is fixed (e.g., 2%), Solver and AI are adjusted by Separator 1 (? This seems off, Sep1 usually for DAG)
                                      // Assuming Separator 1 still primarily affects DAG and the (Solver+AI block)
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag); // Or newDag = 2; if it's strictly fixed and sep1 moves solver+ai block
          // This mode for sep1 is tricky. If DAG is fixed, sep1 dx should apply to (solver+ai) vs dag.
          // Let's assume for now it behaves like DEFAULT_THREE_COLUMN for newDag, and solver/ai are adjusted later.
          // This part of the logic for AI_PANEL_ACTIVE + Separator 1 needs review based on desired UX.
          // For now, treat like DEFAULT_THREE_COLUMN regarding newDag and newSolver, newAi is panelWidths.ai
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag); 
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver); 
          // AI width is fixed or adjusted by Separator 2. Here we ensure Dag+Solver respects AI.
          if (newDag + newSolver > 100 - Math.max(MIN_PANEL_PERCENTAGE, panelWidths.ai)) {
             // Simplified: if pushing into AI space too much, limit one of the active panels.
             // This needs refinement.
          }
          break;
      }

      const newWidthsToEnsure = { dag: newDag, solver: newSolver, ai: newAi };
      // console.log('[handleSeparator1Drag] Before ensure:', JSON.parse(JSON.stringify(newWidthsToEnsure)), 'Mode:', currentLayoutMode, 'dx:', dragPercent);
      const ensuredWidths = ensurePanelWidthsSumTo100AndPrecision(newWidthsToEnsure, currentLayoutMode);
      // console.log('[handleSeparator1Drag] After ensure:', JSON.parse(JSON.stringify(ensuredWidths)));
      setPanelWidths(ensuredWidths);
      saveUserPreferenceForMode(currentLayoutMode, ensuredWidths);
    },
    [panelWidths, mainLayoutRef, currentLayoutMode, ensurePanelWidthsSumTo100AndPrecision]
  );

  const handleSeparator2Drag = useCallback(
    (delta: { dx: number }) => { // MODIFIED: Expect an object with dx property
      const { dx } = delta; // Destructure dx
      const dragPercent = (dx / mainLayoutRef.current!.offsetWidth) * 100;
      let newDag = panelWidths.dag; // DAG panel is not directly affected by separator 2
      let newSolver = panelWidths.solver + dragPercent;
      let newAi = panelWidths.ai - dragPercent;

      switch (currentLayoutMode) {
        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.AI_PANEL_ACTIVE:
        case LayoutMode.DAG_COLLAPSED_SIMPLE:
          const availableWidthForSolverAndAi = 100 - newDag;

          // Apply initial minimums
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);

          // If total exceeds available, one panel was clamped and the other needs to yield
          if (newSolver + newAi > availableWidthForSolverAndAi) {
            if (dragPercent > 0) { // Solver was trying to grow, so AI is at its min
              newAi = MIN_PANEL_PERCENTAGE;
              newSolver = availableWidthForSolverAndAi - newAi;
            } else if (dragPercent < 0) { // AI was trying to grow, so Solver is at its min
              newSolver = MIN_PANEL_PERCENTAGE;
              newAi = availableWidthForSolverAndAi - newSolver;
            } else { // No change in drag, but sum is still off (e.g. initial state before drag)
              // This case should ideally be handled by initial setup or ensure function.
              // For safety, we can try to proportionally adjust or pick one.
              // Let's assume AI cedes space if newDag is such that both can't meet MIN_PANEL_PERCENTAGE
              if (availableWidthForSolverAndAi < 2 * MIN_PANEL_PERCENTAGE) {
                  if (panelWidths.solver > panelWidths.ai) { // Solver was larger, try to keep it that way
                      newSolver = availableWidthForSolverAndAi - MIN_PANEL_PERCENTAGE;
                      newAi = MIN_PANEL_PERCENTAGE;
                  } else {
                      newAi = availableWidthForSolverAndAi - MIN_PANEL_PERCENTAGE;
                      newSolver = MIN_PANEL_PERCENTAGE;
                  }
              } else {
                // Fallback if still not resolved, could be due to newDag taking too much.
                // This state should ideally be prevented by ensurePanelWidths for newDag.
              }
            }
          } else if (newSolver + newAi < availableWidthForSolverAndAi) {
            // If there's a gap (e.g. due to float precision or if one was clamped too much previously)
            // Give the remainder to the panel that was trying to grow, or solver by default.
            if (dragPercent > 0) { // Solver was growing
                newSolver = availableWidthForSolverAndAi - newAi;
            } else if (dragPercent < 0) { // AI was growing
                newAi = availableWidthForSolverAndAi - newSolver;
            } else { // No drag, fill to solver
                newSolver = availableWidthForSolverAndAi - newAi;
            }
          }
          // Final safety clamp, ensure they are not negative if availableWidthForSolverAndAi was very small
          newSolver = Math.max(0, newSolver);
          newAi = Math.max(0, newAi);
          // And ensure they don't individually exceed the total available if the other is 0 (or min)
          newSolver = Math.min(newSolver, availableWidthForSolverAndAi - ( (availableWidthForSolverAndAi - newSolver) >= MIN_PANEL_PERCENTAGE ? MIN_PANEL_PERCENTAGE : Math.max(0, availableWidthForSolverAndAi - newSolver) ) );
          newAi = Math.min(newAi, availableWidthForSolverAndAi - ( (availableWidthForSolverAndAi - newAi) >= MIN_PANEL_PERCENTAGE ? MIN_PANEL_PERCENTAGE : Math.max(0, availableWidthForSolverAndAi - newAi) ) );

          break;
        case LayoutMode.DAG_EXPANDED_FULL: // AI is 0, Separator 2 should ideally not be active or visible
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = 0; // AI is always 0
          // DAG takes the rest, but must also be at least MIN_PANEL_PERCENTAGE
          if (100 - newSolver < MIN_PANEL_PERCENTAGE) {
            newSolver = 100 - MIN_PANEL_PERCENTAGE;
          }
          newDag = 100 - newSolver - newAi; // newAi is 0 here
          break;
      }
      const newWidthsToEnsure = { dag: newDag, solver: newSolver, ai: newAi };
      // console.log('[handleSeparator2Drag] Before ensure:', JSON.parse(JSON.stringify(newWidthsToEnsure)), 'Mode:', currentLayoutMode, 'dx:', dragPercent);
      const ensuredWidths = ensurePanelWidthsSumTo100AndPrecision(newWidthsToEnsure, currentLayoutMode);
      // console.log('[handleSeparator2Drag] After ensure:', JSON.parse(JSON.stringify(ensuredWidths)));
      setPanelWidths(ensuredWidths);
      saveUserPreferenceForMode(currentLayoutMode, ensuredWidths);
    },
    [panelWidths, mainLayoutRef, currentLayoutMode, ensurePanelWidthsSumTo100AndPrecision]
  );

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
    setSolutionSteps(prevSteps => {
      const editedStepIndex = prevSteps.findIndex(step => step.id === stepId);
      if (editedStepIndex === -1) return prevSteps; // Should not happen

      return prevSteps.map((step, index) => {
        if (step.id === stepId) {
          // This is the EDITED step
          return {
            ...step,
            latexContent: newLatexContent,
            verificationStatus: VerificationStatus.NotVerified, // Always reset verification status
            forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
            backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        } else if (index < editedStepIndex) {
          // For steps BEFORE the edited one
          return {
            ...step,
            // forwardDerivationStatus remains unchanged
            backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        } else { // index > editedStepIndex
          // For steps AFTER the edited one
          return {
            ...step,
            forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
            // backwardDerivationStatus remains unchanged
          };
        }
      });
    });
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

      let newStepsArray = [...prevSteps]; // Create a mutable copy
      const originalStepData = newStepsArray[originalStepIndex];

      // Part 1 (modifies the original step)
      const newStepPart1: SolutionStepData = {
        ...originalStepData,
        latexContent: part1Content,
        verificationStatus: VerificationStatus.NotVerified,
        forwardDerivationStatus: ForwardDerivationStatus.Undetermined, // Reset for edited part 1
        backwardDerivationStatus: ForwardDerivationStatus.Undetermined, // Reset for edited part 1
        // notes, highlightColor etc. are preserved from originalStepData
      };
      newStepsArray[originalStepIndex] = newStepPart1;

      // Part 2 (new step)
      const newStepPart2: SolutionStepData = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        latexContent: part2Content,
        verificationStatus: VerificationStatus.NotVerified,
        stepNumber: 0, // Will be re-numbered shortly
        isDeleted: false,
        forwardDerivationStatus: ForwardDerivationStatus.Undetermined, // New step starts undetermined
        backwardDerivationStatus: ForwardDerivationStatus.Undetermined, // New step starts undetermined
        notes: undefined,
        // highlightColor: undefined, // No highlight for new part2
      };
      newStepsArray.splice(originalStepIndex + 1, 0, newStepPart2);

      // Re-number all non-deleted steps for display
      let currentStepNumber = 1;
      newStepsArray = newStepsArray.map(step => {
        if (!step.isDeleted) {
          return { ...step, stepNumber: currentStepNumber++ };
        }
        return step;
      });

      // Apply cascading derivation status resets based on the "edit" of part1 (originalStepIndex)
      // and insertion of part2
      newStepsArray = newStepsArray.map((step, index) => {
        // Rule for steps BEFORE the edited original step (part1)
        if (index < originalStepIndex) {
          return {
            ...step,
            // forwardDerivationStatus remains unchanged
            backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        }
        // Rule for the EDITED original step (part1) - already handled during its creation above
        if (index === originalStepIndex) { // This is newStepPart1
          return step; // Its statuses were set correctly when newStepPart1 was defined
        }
        // Rule for the NEWLY INSERTED step (part2) - already handled during its creation above
        if (index === originalStepIndex + 1) { // This is newStepPart2
          return step; // Its statuses were set correctly when newStepPart2 was defined
        }
        // Rule for steps AFTER the newly inserted step (part2)
        // These are affected as if newStepPart1 was "edited"
        if (index > originalStepIndex + 1) {
          return {
            ...step,
            forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
            // backwardDerivationStatus remains unchanged
          };
        }
        return step; // Should not be reached if logic is correct, but as a fallback
      });

      toast.success(`步骤 ${originalStepData.stepNumber} 已成功拆分！`);
      return newStepsArray;
    });
  };

  // Modified handler functions for DagVisualizationArea context menu to use ConfirmationDialog
  const handleSoftDeleteStep = useCallback((stepId: string) => {
    const stepToDelete = solutionSteps.find(s => s.id === stepId);
    if (!stepToDelete) return;

    const originalStepIndex = solutionSteps.findIndex(s => s.id === stepId);

    openConfirmationDialog(
      '确认删除步骤',
      <span>您确定要将步骤 <strong>"步骤 {stepToDelete.stepNumber}"</strong> (ID: {stepToDelete.id}) 标记为删除吗？</span>,
      () => {
        setSolutionSteps(prevSteps => {
          // First, mark the target step as deleted
          const stepsWithDeletionMarked = prevSteps.map(step =>
            step.id === stepId ? { ...step, isDeleted: true, verificationStatus: VerificationStatus.NotVerified } : step // Also reset verification status
          );

          // Then, apply cascading derivation status resets to other non-deleted steps
          if (originalStepIndex !== -1) {
            return stepsWithDeletionMarked.map((step, index) => {
              // Skip the step that was just marked for deletion OR any other already deleted step
              if (step.isDeleted && step.id !== stepId) return step; 
              // For the step that was just deleted, its derivation statuses are no longer relevant for display/interaction.
              // However, its original position (originalStepIndex) is used to affect others.
              if (step.id === stepId) return step; // Return the just-deleted step as is (already marked isDeleted:true)

              // For other non-deleted steps (step.id !== stepId AND !step.isDeleted implicitly by not returning above for deleted ones)
              if (index < originalStepIndex) { // Steps BEFORE the deleted one
                return {
                  ...step,
                  // forwardDerivationStatus remains unchanged
                  backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
                };
              }
              if (index > originalStepIndex) { // Steps AFTER the deleted one
                return {
                  ...step,
                  forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
                  // backwardDerivationStatus remains unchanged
                };
              }
              return step; // Should only be reached by steps that are not before/after and not the deleted one (e.g. if originalStepIndex was -1, though guarded)
            });
          }
          return stepsWithDeletionMarked; // Fallback if originalStepIndex was -1
        });
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
  }, [handleCloseInterpretationModal, setDagNodes]);

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
    setSolutionSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          let newStatus = VerificationStatus.NotVerified;
          if (step.verificationStatus === VerificationStatus.NotVerified) newStatus = VerificationStatus.VerifiedCorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedCorrect) newStatus = VerificationStatus.VerifiedIncorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedIncorrect) newStatus = VerificationStatus.NotVerified;
          toast.info(`步骤 ${step.stepNumber} 状态已模拟切换。`);
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
            setPanelWidths(ensurePanelWidthsSumTo100AndPrecision(targetAiModeWidths, LayoutMode.AI_PANEL_ACTIVE));
        }
      } 
    } 
  }, [isAiCopilotPanelOpen, panelWidths.ai, currentLayoutMode, setCurrentLayoutMode, setPanelWidths, ensurePanelWidthsSumTo100AndPrecision]);
  // --- END AI COPILOT PANEL TOGGLE CALLBACK ---

  // --- 2. Implement the callback to receive node info from DagVisualizationArea ---
  const handleNodeSelectedForCopilot = useCallback((nodeId: string, nodeData: DagNodeRfData) => {
    // Extract relevant information. nodeData directly comes from React Flow node.data
    // which we mapped from our appNode.data in DagVisualizationArea.
    // console.log(`[MainLayout] Node selected for Copilot: ID=${nodeId}, Label=${nodeData.label}`);
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

  // --- ADDED handleCopilotSendMessage callback ---
  const handleCopilotSendMessage = useCallback((message: string, mode: CopilotMode, model: string, contextNode?: CopilotDagNodeInfo | null) => {
    console.log('MainLayout: Copilot Message Sent', {
      message,
      mode,
      model,
      contextNodeId: contextNode?.id,
    });
    // Placeholder for actual message sending logic
  }, []);

  // DEBUG: Log state right before rendering DagVisualizationArea
  // console.log('[MainLayout Render] dagNodes to pass:', JSON.parse(JSON.stringify(dagNodes)));
  // console.log('[MainLayout Render] dagEdges to pass:', JSON.parse(JSON.stringify(dagEdges)));

  const ঐতিহাসিকPanelWidthsRef = useRef<PanelWidthsType | null>(null); // This was a typo in the original file, removing 'PanelWidthsRef' from the name. Assuming it should be 'historicalPanelWidthsRef' or similar, but keeping as is if it was intentional.

  // console.log('[MainLayout] Rendering, isAICopilotChatActive to pass to RightSidePanel:', isAICopilotChatActive); // DEBUG LINE ADDED

  // New handler for AI analysis with pre-checks for derivation
  const handleInitiateAiAnalysisWithChecks = useCallback((stepId: string, currentForwardStatus?: ForwardDerivationStatus, currentBackwardStatus?: ForwardDerivationStatus) => {
    let didTriggerForward = false;
    let didTriggerBackward = false;

    const stepToAnalyze = solutionSteps.find(s => s.id === stepId);
    if (!stepToAnalyze) {
      toast.error("AI分析失败：找不到步骤。");
      return;
    }

    // Check and trigger forward derivation if undetermined
    const forwardStatus = currentForwardStatus || stepToAnalyze.forwardDerivationStatus;
    if (forwardStatus === ForwardDerivationStatus.Undetermined) {
      console.log(`[MainLayout] AI Analysis for step ${stepId}: Forward derivation is Undetermined. Triggering check.`);
      handleCheckForwardDerivation(stepId);
      didTriggerForward = true;
    }

    // Check and trigger backward derivation if undetermined
    const backwardStatus = currentBackwardStatus || stepToAnalyze.backwardDerivationStatus;
    if (backwardStatus === ForwardDerivationStatus.Undetermined) {
      console.log(`[MainLayout] AI Analysis for step ${stepId}: Backward derivation is Undetermined. Triggering check.`);
      handleCheckBackwardDerivation(stepId);
      didTriggerBackward = true;
    }

    if (didTriggerForward || didTriggerBackward) {
      toast.info("部分推导检查已启动，请稍后重试AI分析以获得最准确结果，或直接查看当前分析（可能基于不完整推导）。");
      // Even if derivations were triggered, proceed to call the (simulated) analysis part.
      // The SolutionStep component will show its own loading indicator.
      // In a real scenario, we might wait for derivations to complete or manage a more complex state.
    }
    
    // Proceed with the original analysis logic (which currently is a simulation)
    // This will allow SolutionStep to show its loading/content optimistically.
    console.log(`[MainLayout] Proceeding with AI analysis part for step ${stepId} after derivation checks.`);
    handleAnalyzeStepFromSolutionList(stepId); // This is the placeholder for actual AI analysis trigger

  }, [solutionSteps, handleCheckForwardDerivation, handleCheckBackwardDerivation, handleAnalyzeStepFromSolutionList]);

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
              // --- C6: Pass Focus Analysis props ---
              onInitiateFocusAnalysis={handleInitiateFocusAnalysis}
              onCancelFocusAnalysis={handleCancelFocusAnalysis}
              currentFocusAnalysisNodeId={currentFocusAnalysisNodeId}
              // --- End C6 ---
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
        <div className={styles.problemBlockWrapper}> {/* ADDED WRAPPER */}
          <ProblemBlock data={problemData} onContentChange={handleProblemChange} />
        </div>

        <div className={styles.solutionStepsContainer}>
          {solutionSteps
            .filter(step => !step.isDeleted)
            .map((step) => (
            <SolutionStep
              key={step.id}
              step={step}
              onContentChange={handleStepContentChange}
              onDelete={handleDeleteStepFromSolutionList}
              onInitiateAiAnalysisWithChecks={handleInitiateAiAnalysisWithChecks}
              onSplit={handleSplitStep}
              onCheckForwardDerivation={handleCheckForwardDerivation}
              onCheckBackwardDerivation={handleCheckBackwardDerivation}
            />
          ))}
        </div>

        <div className={styles.solverActionsWrapper}> {/* ADDED WRAPPER */}
          <SolverActions onAddStep={handleAddSolutionStep} />
        </div>

        {/* New Content Area: Similar Problems, AI Hints, Summary */}
        <div className={styles.solverZusatzContentContainer}>
          {showSimilarProblems && (
            <div className={styles.similarProblemsSection}>
              <h4>类似题目</h4>
              <p>类似题目占位内容...</p>
              {/* Future: Component to render actual similar problems */}
            </div>
          )}

          {showAiHints && (
            <div className={styles.aiHintsSection}>
              <h4>AI 提示思路</h4>
              <p>AI 提示思路占位内容...</p>
              {/* Future: Component to render actual AI hints */}
            </div>
          )}

          {showSummary && (
            <div className={styles.summarySection}>
              <h4>总结</h4>
              <p>总结内容占位内容...</p>
              {/* Future: Component to render actual summary */}
            </div>
          )}
        </div>
      </div>

      {/* Separator 2: Between Solver and AI */}
      {currentLayoutMode !== LayoutMode.DAG_EXPANDED_FULL && panelWidths.ai > 0 && (
        <DraggableSeparator orientation="vertical" onDrag={handleSeparator2Drag} />
      )}

      {/* MODIFIED aiPanelRegion */}
      <div
        className={`${styles.aiPanelRegion} ${styles.aiPanelRegionCustom}`}
        style={{
          flexBasis: `${panelWidths.ai}%`,
          display: panelWidths.ai === 0 ? 'none' : 'flex',
        }}
      >
        {/* Wrapper for AICopilotPanel and RightSidePanel to control their layout */}
        {/* This assumes aiPanelRegion uses flex-direction: column in its CSS */}
        <div className={styles.aiCopilotPanelWrapper}> {/* Ensure this wrapper allows AICopilotPanel to take necessary space */}
            <AICopilotPanel 
                isOpen={isAiCopilotPanelOpen}
                onToggle={toggleAiCopilotPanel}
                dagNodes={copilotDagNodes}
                contextNodeInfo={copilotContextNodeInfo}
                onSendMessage={handleCopilotSendMessage}
                currentMode={copilotCurrentMode}
                onModeChange={setCopilotCurrentMode}
                onChatStateChange={handleAICopilotChatStateChange}
            />
        </div>
        <div 
          className={styles.rightSidePanelContainer} // This is the wrapper for RightSidePanel
          style={isAICopilotChatActive ? { flex: '0 0 auto' } : { flex: '1 1 auto' }} // Dynamic style
        >
          <RightSidePanel
            currentMode={copilotCurrentMode}
            onModeChange={setCopilotCurrentMode}
            // isChatActive={isAICopilotChatActive} // REMOVED
          />
        </div>
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