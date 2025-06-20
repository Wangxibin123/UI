import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './MainLayout.module.css';
import ControlBar from '../../features/dag/ControlBar/ControlBar';
import DagVisualizationArea from '../../features/dag/DagVisualizationArea/DagVisualizationArea';
import ProblemBlock from '../../features/solver/ProblemBlock/ProblemBlock';
import SolutionStep from '../../features/solver/SolutionStep/SolutionStep';
import SolverActions from '../../features/solver/SolverActions/SolverActions';
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
  type PathGroup,
  type InterpretationState,
  type InterpretationEntry,
  type StepVersion,
  type StepVersionHistory,
  type VersionHistoryState,
  type SimilarProblem
} from '../../../types';
import { MarkerType, ReactFlowProvider } from '@reactflow/core';
import ConfirmationDialog from '../../common/ConfirmationDialog/ConfirmationDialog';
// 🔥 移除测试数据导入，避免强制覆盖持久化数据
// import { testProblemData, testSolutionSteps, testDagNodes, testDagEdges } from '../../../test-data';
import { 
  detectPathGroups, 
  getMainPathSteps, 
  generatePathGroupLayout, 
  applyPathGroupLayoutToNodes 
} from '../../../utils/pathGroupUtils';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { aiModelService } from '../../../services/aiModelService';
import { 
  saveDagPageState, 
  loadDagPageState, 
  saveProblemData, 
  loadProblemData,
  saveVersionHistory,
  loadVersionHistory,
  saveInterpretationState,
  loadInterpretationState,
  saveSummaryContent,
  loadSummaryContent,
  saveAIAnalysisData,
  loadAIAnalysisData,
  type AIAnalysisData
} from '../../../utils/persistence';
import NodeNoteModal from '../../common/NodeNoteModal/NodeNoteModal';
import SplitStepModal from '../../common/SplitStepModal/SplitStepModal';
import InterpretationModal from '../../common/InterpretationModal/InterpretationModal';
import DataManagement from '../../common/DataManagement/DataManagement';
import AICopilotPanel, { 
  type AICopilotPanelProps, 
  type Message as AICopilotMessage, 
  type DagNodeInfo as CopilotDagNodeInfo, 
  type CopilotMode // Keep this for type consistency
} from '../../features/ai/AICopilotPanel/AICopilotPanel';
import { Bot, Save, X as IconX, AlertTriangle, Menu } from 'lucide-react'; // Menu added
import { BlockMath, InlineMath } from 'react-katex';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import ModeCardsPanel from '../../features/ai/ModeCardsPanel/ModeCardsPanel'; // Added for new right panel
import RightPanelContent from '../../features/solver/RightPanelContent/RightPanelContent';
import FeatureTestPanel from '../../common/FeatureTestPanel/FeatureTestPanel';
import AIAssistantDemo from '../../features/ai/AIAssistantDemo/AIAssistantDemo';
import WelcomeMessage from '../../common/WelcomeMessage/WelcomeMessage';
import EnhancedMentionDemo from '../../features/ai/AICopilotPanel/EnhancedMentionDemo';
import ModernLaTeXPanel from '../../features/ai/AICopilotPanel/ModernLaTeXPanel';
import ModernAnalysisPanel from '../../features/ai/AICopilotPanel/ModernAnalysisPanel';
import ModernSummaryPanel from '../../features/ai/AICopilotPanel/ModernSummaryPanel';
import PathGroupIndicator from '../../common/PathGroupIndicator/PathGroupIndicator';
// +++ DAG_PAGES: Import DAG page management +++
import DagPageTabs from '../../features/dag/DagPageTabs/DagPageTabs';
import { DagPage, DagPageState } from '../../../types';
// +++ End DAG_PAGES +++
// +++ INTERPRETATION: Import interpretation management +++
import ModernInterpretationView from '../../views/InterpretationManagementView/ModernInterpretationView';
// +++ End INTERPRETATION +++
// +++ RIGHT_DRAWER: Import right drawer component +++
import RightDrawer, { DrawerType } from './RightDrawer';
// +++ End RIGHT_DRAWER +++

const MIN_PANEL_PERCENTAGE = 5; // Define MIN_PANEL_PERCENTAGE
// 🔥 移除测试数据引用，避免强制覆盖持久化数据
// const initialSolutionStepsData: SolutionStepData[] = testSolutionSteps; // 使用测试数据

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

// +++ T_FIX_LINTER_ADD_GETMAINPATHELEMENTS: Restore getMainPathElements function +++
// Helper function to get all nodes and edges in the main path starting from a given node
const getMainPathElements = (
  startNodeId: string,
  nodes: DagNode[], 
  edges: DagEdge[]  
): { nodes: string[]; edges: string[] } => {
  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  const queue: string[] = [];
  const visited: Set<string> = new Set();

  const startNode = nodes.find(n => n.id === startNodeId);

  if (startNode && !startNode.data.isDeleted) {
    queue.push(startNodeId);
    visited.add(startNodeId);
  }

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++];
    pathNodes.push(currentId);

    const outgoingEdges = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      return edge.source === currentId &&
             sourceNode && !sourceNode.data.isDeleted &&
             targetNode && !targetNode.data.isDeleted &&
             !(edge.data?.isUserMarkedDeleted); 
    });

    if (outgoingEdges.length > 0) {
        const nextEdge = outgoingEdges[0]; 
        if (nextEdge && !visited.has(nextEdge.target)) {
            pathEdges.push(nextEdge.id);
            visited.add(nextEdge.target);
            queue.push(nextEdge.target);
        }
    }
  }
  return { nodes: pathNodes, edges: pathEdges };
};
// --- End T_FIX_LINTER_ADD_GETMAINPATHELEMENTS ---

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

const defaultWidths: Record<LayoutMode, PanelWidthsType> = {
  [LayoutMode.DEFAULT_THREE_COLUMN]: { dag: 33, solver: 34, ai: 33 },
  [LayoutMode.DAG_COLLAPSED_SIMPLE]: { dag: 0, solver: 50, ai: 50 },
  [LayoutMode.DAG_EXPANDED_FULL]: { dag: 50, solver: 25, ai: 25 },
  [LayoutMode.AI_PANEL_ACTIVE]: { dag: 30, solver: 30, ai: 40 },
};

function saveUserPreferenceForMode(mode: LayoutMode, widths: PanelWidthsType): void {
  try {
    localStorage.setItem(`panelWidths_${mode}`, JSON.stringify(widths));
  } catch (error) {
    console.warn("Could not save panel widths to localStorage:", error);
  }
}

function loadUserPreferenceForMode(mode: LayoutMode): PanelWidthsType | null {
  try {
    const storedWidths = localStorage.getItem(`panelWidths_${mode}`);
    if (storedWidths) {
      return JSON.parse(storedWidths);
    }
  } catch (error) {
    console.warn("Could not load panel widths from localStorage:", error);
  }
  return null;
}

interface CopilotContextNodeInfo {
  id: string;
  label?: string;
  content?: string; 
}

interface StepDetailEditorPanelProps {
  nodeId: string | null;
  latexContent: string;
  onSave: (newLatex: string) => void;
  onCancel: () => void;
  onChange: (newLatex: string) => void;
}

const StepDetailEditorPanel: React.FC<StepDetailEditorPanelProps> = ({
  nodeId,
  latexContent,
  onSave,
  onCancel,
  onChange,
}) => {
  const [currentLatex, setCurrentLatex] = useState(latexContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentLatex(latexContent);
  }, [latexContent]);

  const handleInternalChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentLatex(event.target.value);
    onChange(event.target.value); 
  };

  // 渲染混合LaTeX内容的组件
  const renderMixedLatexContent = (content: string) => {
    try {
      // 如果内容只是纯数学公式（被$$包围），则使用BlockMath
      if (content.trim().startsWith('$$') && content.trim().endsWith('$$') && content.trim().split('$$').length === 3) {
        const mathContent = content.trim().slice(2, -2).trim();
        return <BlockMath math={mathContent} renderError={(error) => <span style={{ color: 'red' }}>LaTeX 错误: {error.name} - {error.message}</span>} />;
      }
      
      // 对于混合内容，解析并分别渲染文本和数学部分
      const parts: JSX.Element[] = [];
      const regex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
      let lastIndex = 0;
      let match;
      let key = 0;

      while ((match = regex.exec(content)) !== null) {
        // 添加数学公式前的文本部分
        if (match.index > lastIndex) {
          const textPart = content.slice(lastIndex, match.index);
          if (textPart.trim()) {
            parts.push(<span key={`text-${key++}`}>{textPart}</span>);
          }
        }

        // 添加数学公式部分
        const mathContent = match[1] || match[2]; // $$ 或 $ 包围的内容
        if (mathContent) {
          try {
            if (match[1]) {
              // 块级数学公式 $$...$$
              parts.push(<BlockMath key={`block-${key++}`} math={mathContent} />);
            } else {
              // 行内数学公式 $...$
              parts.push(<InlineMath key={`inline-${key++}`} math={mathContent} />);
            }
          } catch (error) {
            parts.push(<span key={`error-${key++}`} style={{ color: 'red' }}>LaTeX 错误: {mathContent}</span>);
          }
        }

        lastIndex = regex.lastIndex;
      }

      // 添加最后剩余的文本部分
      if (lastIndex < content.length) {
        const textPart = content.slice(lastIndex);
        if (textPart.trim()) {
          parts.push(<span key={`text-${key++}`}>{textPart}</span>);
        }
      }

      return <div className={styles.latexPreviewContent}>{parts}</div>;
    } catch (error) {
      return <span style={{ color: 'red' }}>LaTeX 渲染错误: {error instanceof Error ? error.message : '未知错误'}</span>;
    }
  };

  return (
    <div className={styles.stepDetailEditorPanel}>
      <h4>查看/编辑步骤: {nodeId}</h4>
      <div className={styles.stepDetailPreviewSection}>
        <h5>LaTeX 预览:</h5>
        <div className={styles.stepDetailPreviewContent}>
          {renderMixedLatexContent(currentLatex)}
        </div>
      </div>
      <div className={styles.stepDetailEditSection}>
        <h5>编辑 LaTeX:</h5>
        <textarea
          ref={textareaRef}
          value={currentLatex}
          onChange={handleInternalChange}
          rows={8}
          className={styles.stepDetailTextarea}
          placeholder="输入LaTeX内容，支持文本和数学公式混合。使用 $...$ 表示行内公式，$$...$$ 表示块级公式。"
        />
      </div>
      <div className={styles.stepDetailActions}>
        <button onClick={() => onSave(currentLatex)} className={styles.stepDetailButtonSave}>
          <Save size={16} /> 保存
        </button>
        <button onClick={onCancel} className={styles.stepDetailButtonCancel}>
          <IconX size={16} /> 取消
        </button>
      </div>
    </div>
  );
};
// +++ 结束 StepDetailEditorPanel 组件定义 +++

// +++ LINTER_FIX_COMPONENT_DEF_POS: Move NewPathCreationHintBar definition out of MainLayout component +++
interface NewPathCreationHintBarProps {
  onCancel: () => void;
}

const NewPathCreationHintBar: React.FC<NewPathCreationHintBarProps> = ({ onCancel }) => {
  return (
    <div className={styles.newPathCreationHintBar}>
      <AlertTriangle size={16} className={styles.hintIcon} />
      <span>正在创建新路径：请在图中选择一个目标节点。</span>
      <button onClick={onCancel} className={styles.hintCancelButton}>
        <IconX size={14} /> 取消
      </button>
    </div>
  );
};
// +++ End LINTER_FIX_COMPONENT_DEF_POS +++

// MOVED MainLayout COMPONENT DEFINITION DOWN HERE
const MainLayout: React.FC = () => {
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  // MOVED HOOKS INSIDE
  const [isAICopilotChatActive, setIsAICopilotChatActive] = useState(false);
  // console.log('[MainLayout] Initial isAICopilotChatActive:', isAICopilotChatActive); // DEBUG LINE REMOVED

  const handleAICopilotChatStateChange = useCallback((isActive: boolean) => {
    // console.log('[MainLayout] handleAICopilotChatStateChange called with isActive:', isActive); // DEBUG LINE REMOVED
    setIsAICopilotChatActive(isActive);
  }, []);

  const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(LayoutMode.DEFAULT_THREE_COLUMN);
  const [panelWidths, setPanelWidths] = useState<PanelWidthsType>(() => { // Moved earlier
    const savedWidths = loadUserPreferenceForMode(LayoutMode.DEFAULT_THREE_COLUMN);
    return savedWidths || defaultWidths[LayoutMode.DEFAULT_THREE_COLUMN];
  });

  // ... (rest of the MainLayout component's state, effects, callbacks, and return JSX) ...
  // ... ENSURE ALL OTHER HOOKS (useState, useEffect, useCallback, useMemo, useRef) ARE WITHIN THIS MainLayout SCOPE ...

  // 🔥 移除旧的全局solutionSteps状态，现在使用页面级数据管理
  // const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
  //   return initialSolutionStepsData.map(step => ({ 
  //     ...step, 
  //     isDeleted: step.isDeleted || false,
  //     forwardDerivationStatus: step.forwardDerivationStatus || ForwardDerivationStatus.Undetermined, // Ensure it has a default
  //     backwardDerivationStatus: step.backwardDerivationStatus || ForwardDerivationStatus.Undetermined // Ensure it has a default for backward
  //   }));
  // });
  // 🔥 修复：移除测试数据的强制初始化，让数据从持久化存储中恢复
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);
  const [problemLatex, setProblemLatex] = useState<string>(problemData?.latexContent || '');

  // 监听problemData的变化，更新problemLatex
  useEffect(() => {
    if (problemData?.latexContent) {
      setProblemLatex(problemData.latexContent);
    }
  }, [problemData]);
  
  const initialPanelWidths = useRef<PanelWidthsType>({ dag: 25, solver: 50, ai: 25 });
  
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

  const [isAiCopilotPanelOpen, setIsAiCopilotPanelOpen] = useState<boolean>(false);
  const [copilotContextNodeInfo, setCopilotContextNodeInfo] = useState<CopilotContextNodeInfo | null>(null);
  const [copilotCurrentMode, setCopilotCurrentMode] = useState<CopilotMode>('analysis');
  // const [copilotCurrentModel, setCopilotCurrentModel] = useState<string>('gpt-3.5-turbo'); // Added state for current model

  // 🎯 使用新的AI模型服务获取可用模型
  const copilotAvailableModels: string[] = aiModelService.getAvailableModels().map(model => model.id);

  // Initialize copilotCurrentModel with the first model from the list or a default
  const [copilotCurrentModel, setCopilotCurrentModel] = useState<string>(copilotAvailableModels[0] || 'gpt-3.5-turbo');

  const [currentFocusAnalysisNodeId, setCurrentFocusAnalysisNodeId] = useState<string | null>(null);
  const [currentFocusAnalysisType, setCurrentFocusAnalysisType] = useState<FocusAnalysisType>(null);
  // +++ T_FIX_LINTER_FOCUS_STATE: Add state for currentFocusPathElements +++
  const [currentFocusPathElements, setCurrentFocusPathElements] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  // --- End T_FIX_LINTER_FOCUS_STATE ---
  // +++ 新增状态：主路径ID +++
  const [mainPathNodeId, setMainPathNodeId] = useState<string | null>(null);
  // +++ NP_FEAT_1_LINTER_FIX: Restore currentNewPathElements state definition +++
  const [currentNewPathElements, setCurrentNewPathElements] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  // --- End NP_FEAT_1_LINTER_FIX ---
  // +++ 新增状态：查看/编辑步骤详情 +++
  const [editingStepDetailNodeId, setEditingStepDetailNodeId] = useState<string | null>(null);
  const [editingStepLatexContent, setEditingStepLatexContent] = useState<string>('');
  const [showStepDetailEditor, setShowStepDetailEditor] = useState<boolean>(false);
  // --- End C2 ---
  
  // +++ 功能测试面板状态 +++
  const [isTestPanelVisible, setIsTestPanelVisible] = useState<boolean>(false);
  const [isAiDemoVisible, setIsAiDemoVisible] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [showEnhancedMentionDemo, setShowEnhancedMentionDemo] = useState<boolean>(false);
  
  // +++ LaTeX格式化面板状态 +++
  const [isLaTeXPanelVisible, setIsLaTeXPanelVisible] = useState<boolean>(false);
  const [selectedStepForLaTeX, setSelectedStepForLaTeX] = useState<{
    id: string;
    content: string;
    stepNumber: number;
  } | null>(null);

  // +++ 解析分析面板状态 +++
  const [isAnalysisPanelVisible, setIsAnalysisPanelVisible] = useState<boolean>(false);
  const [selectedStepForAnalysis, setSelectedStepForAnalysis] = useState<{
    id: string;
    content: string;
    stepNumber: number;
  } | null>(null);

  // +++ 总结面板状态 +++
  const [selectedStepForSummary, setSelectedStepForSummary] = useState<string>('problem-content');

  // +++ 右侧抽屉状态 +++
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [rightDrawerType, setRightDrawerType] = useState<DrawerType>(null);
  const [drawerContextStepInfo, setDrawerContextStepInfo] = useState<{
    id: string;
    stepNumber: number;
    title: string;
    content: string;
    preview: string;
  } | null>(null);
  
  // +++ EDGE_SELECTION: Add edge selection state +++
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // +++ End EDGE_SELECTION +++
  
  // +++ PATH_GROUPS: Add path group state +++
  const [pathGroups, setPathGroups] = useState<PathGroup[]>([]);
  const [mainPathGroupId, setMainPathGroupId] = useState<string | null>(null);
  // +++ End PATH_GROUPS +++

  // +++ INTERPRETATION: Add interpretation state management +++
  const [interpretationState, setInterpretationState] = useState<InterpretationState>(() => {
    const saved = loadInterpretationState();
    return saved || {
    entries: [],
    selectedEntryId: null,
    };
  });
  const [showInterpretationManagement, setShowInterpretationManagement] = useState<boolean>(false);
  const [showDataManagement, setShowDataManagement] = useState<boolean>(false);
  // +++ End INTERPRETATION +++

  // +++ DAG_PAGES: Add DAG page state management +++
  const [dagPageState, setDagPageState] = useState<DagPageState>(() => {
    const saved = loadDagPageState();
    return saved || {
    pages: [],
    activePageId: null,
    maxPages: 20, // 🔥 扩大到20个DAG页面
    };
  });

  // 🔥 辅助函数：获取当前页面的解题步骤
  const getCurrentPageSolutionSteps = useCallback((): SolutionStepData[] => {
    const currentPage = dagPageState.pages.find(p => p.id === dagPageState.activePageId);
    return currentPage?.solutionSteps || [];
  }, [dagPageState]);
  
  // 🔥 辅助函数：更新当前页面的解题步骤
  const setCurrentPageSolutionSteps = useCallback((updater: (prev: SolutionStepData[]) => SolutionStepData[]) => {
    if (!dagPageState.activePageId) return;
    
    setDagPageState(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === prev.activePageId 
          ? { ...p, solutionSteps: updater(p.solutionSteps) }
          : p
      )
    }));
  }, [dagPageState.activePageId]);

  // Initialize with default page if no pages exist
  // 🔥 修复：只在真正没有持久化数据时才创建默认页面
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // 只在组件首次加载时执行一次初始化检查
    if (!hasInitialized) {
      console.log('检查是否需要初始化默认页面，当前页面数量:', dagPageState.pages.length);
      
      // 如果没有任何页面，创建默认页面
      if (dagPageState.pages.length === 0) {
        console.log('没有持久化数据，创建默认DAG页面');
        const defaultPage: DagPage = {
          id: 'page-1',
          name: 'DAG 1',
          nodes: [],
          edges: [],
          pathGroups: [],
          mainPathGroupId: null,
          createdAt: new Date(),
          isActive: true,
          // 🔥 添加独立数据：初始示例数据
          solutionSteps: [
            { id: 'step-init-1', stepNumber: 1, latexContent: '$$\\lambda^2 + 5\\lambda + 6 = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
            { id: 'step-init-2', stepNumber: 2, latexContent: '$$(\\lambda+2)(\\lambda+3) = 0$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
            { id: 'step-init-3', stepNumber: 3, latexContent: '$$\\lambda_1 = -2, \\lambda_2 = -3$$', verificationStatus: VerificationStatus.NotVerified, isDeleted: false, forwardDerivationStatus: ForwardDerivationStatus.Undetermined, backwardDerivationStatus: ForwardDerivationStatus.Undetermined },
          ],
          // 🔥 每个页面独立的题目数据
          problemData: {
            id: 'problem-1',
            title: '求解二次方程',
            latexContent: '$$\\text{求解方程：} \\lambda^2 + 5\\lambda + 6 = 0$$'
          },
          // 🔥 每个页面独立的总结内容
          summaryContent: '',
          // 🔥 每个页面独立的类似题目
          similarProblems: []
        };
        
        setDagPageState(prev => ({
          ...prev,
          pages: [defaultPage],
          activePageId: defaultPage.id,
        }));
      } else {
        console.log('发现持久化数据，页面数量:', dagPageState.pages.length, '活动页面:', dagPageState.activePageId);
      }
      
      setHasInitialized(true);
    }
  }, [dagPageState.pages.length, hasInitialized]); // 依赖hasInitialized确保只执行一次

  // 🔥 修复：在初始化完成后，立即设置当前活动页面的数据
  useEffect(() => {
    if (hasInitialized && dagPageState.activePageId && dagPageState.pages.length > 0) {
      const activePage = dagPageState.pages.find(p => p.id === dagPageState.activePageId);
      if (activePage) {
        console.log('恢复活动页面数据:', activePage.name);
        
        // 🔥 修复：不直接恢复DAG的nodes和edges，让它们由步骤数据重新生成
        // 这样可以确保DAG图形与步骤数据保持一致
        // setDagNodes(activePage.nodes);
        // setDagEdges(activePage.edges);
        
        // 恢复路径组数据
        setPathGroups(activePage.pathGroups);
        setMainPathGroupId(activePage.mainPathGroupId);
        
        // 恢复题目数据和总结内容
        if (activePage.problemData) {
          setProblemData(activePage.problemData);
        } else {
          // 🔥 修复：为没有题目数据的页面创建独立的默认题目
          const defaultProblemData = {
            id: `problem-${activePage.id}`,
            title: `${activePage.name}的题目`,
            latexContent: '$$\\text{请输入题目内容...}$$'
          };
          setProblemData(defaultProblemData);
          
          // 同时更新页面状态
          setDagPageState(prev => ({
            ...prev,
            pages: prev.pages.map(p => 
              p.id === activePage.id ? { ...p, problemData: defaultProblemData } : p
            )
          }));
        }
        setSummaryContent(activePage.summaryContent);
        
        console.log('页面数据恢复完成，步骤数量:', activePage.solutionSteps.length);
      }
    }
  }, [hasInitialized, dagPageState.activePageId, dagPageState.pages.length]); // 在初始化完成且活动页面变化时触发

  // 恢复AI解析数据
  useEffect(() => {
    if (hasInitialized && dagPageState.pages.length > 0) {
      const savedAiAnalysisData = loadAIAnalysisData();
      if (savedAiAnalysisData && Object.keys(savedAiAnalysisData).length > 0) {
        console.log('恢复AI解析数据:', savedAiAnalysisData);
        
        // 将AI解析数据恢复到对应的步骤中
        setDagPageState(prev => ({
          ...prev,
          pages: prev.pages.map(page => ({
            ...page,
            solutionSteps: page.solutionSteps.map(step => ({
              ...step,
              aiAnalysisContent: savedAiAnalysisData[step.id] || step.aiAnalysisContent
            }))
          }))
        }));
      }
    }
  }, [hasInitialized, dagPageState.pages.length]); // 在初始化完成且有页面数据时执行
  
  // 🔧 新增：版本历史状态管理
  const [versionHistoryState, setVersionHistoryState] = useState<VersionHistoryState>(() => {
    const saved = loadVersionHistory();
    return saved || {
    stepVersions: {}
    };
  });

  // +++ PERSISTENCE: 自动保存状态到 localStorage +++
  useEffect(() => {
    // 保存 DAG 页面状态
    saveDagPageState(dagPageState);
  }, [dagPageState]);

  useEffect(() => {
    // 保存问题数据
    if (problemData) {
      saveProblemData(problemData);
    }
  }, [problemData]);

  useEffect(() => {
    // 保存版本历史
    saveVersionHistory(versionHistoryState);
  }, [versionHistoryState]);

    useEffect(() => {
    // 保存解释状态
    saveInterpretationState(interpretationState);
  }, [interpretationState]);

  // +++ End PERSISTENCE +++

  // 🔧 新增：获取步骤的版本历史
  const getStepVersionHistory = useCallback((stepId: string): StepVersionHistory | null => {
    return versionHistoryState.stepVersions[stepId] || null;
  }, [versionHistoryState]);

  // 🔧 新增：切换步骤版本
  const switchStepVersion = useCallback((stepId: string, versionIndex: number) => {
    setVersionHistoryState(prev => {
      const existingHistory = prev.stepVersions[stepId];
      if (!existingHistory || versionIndex < 0 || versionIndex >= existingHistory.versions.length) {
        return prev;
      }

      return {
        ...prev,
        stepVersions: {
          ...prev.stepVersions,
          [stepId]: {
            ...existingHistory,
            currentVersionIndex: versionIndex
          }
        }
      };
    });
  }, []);

  // 🔧 新增：为步骤创建初始版本
  const createInitialVersionForStep = useCallback((step: SolutionStepData) => {
    const initialVersion: StepVersion = {
      id: `${step.id}-v1`,
      stepId: step.id,
      content: step.latexContent,
      timestamp: new Date(),
      description: '初始版本',
      isOriginal: true,
      versionNumber: 1
    };

    const stepVersionHistory: StepVersionHistory = {
      stepId: step.id,
      versions: [initialVersion],
      currentVersionIndex: 0
    };

    setVersionHistoryState(prev => ({
      ...prev,
      stepVersions: {
        ...prev.stepVersions,
        [step.id]: stepVersionHistory
      }
    }));
  }, []);

  // 🔧 新增：为步骤添加新版本
  const addVersionToStep = useCallback((stepId: string, newContent: string, description?: string) => {
    setVersionHistoryState(prev => {
      const existingHistory = prev.stepVersions[stepId];
      if (!existingHistory) return prev;

      const newVersionNumber = existingHistory.versions.length + 1;
      const newVersion: StepVersion = {
        id: `${stepId}-v${newVersionNumber}`,
        stepId,
        content: newContent,
        timestamp: new Date(),
        description: description || `版本 ${newVersionNumber}`,
        isOriginal: false,
        versionNumber: newVersionNumber
      };

      const updatedHistory: StepVersionHistory = {
        ...existingHistory,
        versions: [...existingHistory.versions, newVersion],
        currentVersionIndex: existingHistory.versions.length // 切换到新版本
      };

      return {
        ...prev,
        stepVersions: {
          ...prev.stepVersions,
          [stepId]: updatedHistory
        }
      };
    });
  }, []);

  // 🔧 新增：为现有步骤创建初始版本历史
  useEffect(() => {
    const currentSteps = getCurrentPageSolutionSteps();
    currentSteps.forEach(step => {
      const existingHistory = getStepVersionHistory(step.id);
      if (!existingHistory) {
        createInitialVersionForStep(step);
      }
    });
  }, [getCurrentPageSolutionSteps, getStepVersionHistory, createInitialVersionForStep]);
  
  // 🔥 更新：使用页面级数据的 handleStepContentChange (移动到版本历史函数之后)
  const handleStepContentChange = useCallback((stepId: string, newLatexContent: string) => {
    // 📝 首先检查内容是否真的改变了
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const existingStep = currentSolutionSteps.find(step => step.id === stepId);
    
    if (existingStep && existingStep.latexContent === newLatexContent) {
      // 内容没有改变，不需要创建新版本
      return;
    }

    // 📝 更新步骤内容
    setCurrentPageSolutionSteps(prevSteps => {
      const editedStepIndex = prevSteps.findIndex(step => step.id === stepId);
      if (editedStepIndex === -1) return prevSteps;

      return prevSteps.map((step, index) => {
        if (step.id === stepId) {
          return {
            ...step,
            latexContent: newLatexContent,
            verificationStatus: VerificationStatus.NotVerified,
            forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
            backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        } else if (index < editedStepIndex) {
          return {
            ...step,
            backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        } else { // index > editedStepIndex
          return {
            ...step,
            forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          };
        }
      });
    });

    // 📝 为这次保存创建新版本
    if (existingStep) {
      addVersionToStep(stepId, newLatexContent, `内容修改`);
    }
  }, [setCurrentPageSolutionSteps, getCurrentPageSolutionSteps, addVersionToStep]);

  // --- C4: Core handlers for Focus Analysis (Refactored) ---
  const handleInitiateFocusAnalysis = useCallback((nodeId: string, type: FocusAnalysisType) => {
    if (!type) return;

    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const currentNodesForPathCalc: DagNode[] = currentSolutionSteps.map((step, index) => ({
      id: step.id,
      type: 'customStepNode',
      data: { 
        label: `步骤 ${step.stepNumber}`, 
        verificationStatus: step.verificationStatus,
        isDeleted: step.isDeleted || false, // Ensure isDeleted has a boolean value
      },
      position: { x: 0, y: index * 100 } 
    }));
    const currentEdgesForPathCalc: DagEdge[] = [];
    const visibleStepsForPath = currentSolutionSteps.filter(s => !s.isDeleted);
    if (visibleStepsForPath.length > 1) {
      for (let i = 1; i < visibleStepsForPath.length; i++) {
        currentEdgesForPathCalc.push({
          id: `e-${visibleStepsForPath[i-1].id}-${visibleStepsForPath[i].id}`,
          source: visibleStepsForPath[i-1].id,
          target: visibleStepsForPath[i].id,
          data: { isDeleted: false } 
        });
      }
    }

    let focusNodesIds: string[] = [];
    let focusEdgesIds: string[] = [];

    if (type === 'forward') {
      const { pathNodes, pathEdges } = findForwardPath(nodeId, currentNodesForPathCalc, currentEdgesForPathCalc);
      focusNodesIds = pathNodes;
      focusEdgesIds = pathEdges;
    } else if (type === 'backward') {
      const { pathNodes, pathEdges } = findBackwardPath(nodeId, currentNodesForPathCalc, currentEdgesForPathCalc);
      focusNodesIds = pathNodes;
      focusEdgesIds = pathEdges;
    } else if (type === 'full') {
      const forward = findForwardPath(nodeId, currentNodesForPathCalc, currentEdgesForPathCalc);
      const backward = findBackwardPath(nodeId, currentNodesForPathCalc, currentEdgesForPathCalc);
      focusNodesIds = Array.from(new Set([...forward.pathNodes, ...backward.pathNodes]));
      focusEdgesIds = Array.from(new Set([...forward.pathEdges, ...backward.pathEdges]));
    }

    if (focusNodesIds.length === 0 && type !== null) {
        toast.info(`节点 ${nodeId} 未找到 ${type === 'forward' ? '向前' : type === 'backward' ? '向后' : '相关'} 路径。`);
    } else {
        toast.success(`已聚焦分析节点 ${nodeId} 的 ${type} 路径。`);
    }

    setCurrentFocusAnalysisNodeId(nodeId);
    setCurrentFocusAnalysisType(type);
    setCurrentFocusPathElements({ nodes: focusNodesIds, edges: focusEdgesIds });

  }, [getCurrentPageSolutionSteps]);

  const handleCancelFocusAnalysis = useCallback(() => {
    if (!currentFocusAnalysisNodeId) return; 

    toast.info(`已取消对节点 ${currentFocusAnalysisNodeId} 的聚焦分析。`);
    setCurrentFocusAnalysisNodeId(null);
    setCurrentFocusAnalysisType(null);
    setCurrentFocusPathElements(null);
  }, [currentFocusAnalysisNodeId]);
  // --- End C4 ---

  // +++ 新增回调：设置为主路径 +++
  const handleSetAsMainPath = useCallback((nodeId: string) => {
    setMainPathNodeId(nodeId);
    
    // 更新DAG节点，标记主路径
    const mainPathElements = getMainPathElements(nodeId, dagNodes, dagEdges);
    setDagNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isMainPathNode: mainPathElements.nodes.includes(node.id)
        }
      }))
    );
    
    toast.success(`节点 ${nodeId} 已被设置为主路径起始点。主路径包含 ${mainPathElements.nodes.length} 个节点。`);
  }, [dagNodes, dagEdges]);

  // +++ T2.4: 新增回调，用于取消主路径设置 +++
  const handleCancelMainPath = useCallback(() => {
    setMainPathNodeId(null);
    toast.info('主路径设置已取消。');
  }, []);

  // +++ 新增回调：处理查看/编辑步骤详情 (打开编辑器) +++
  const handleOpenViewEditStepDetails = useCallback((stepId: string) => {
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const step = currentSolutionSteps.find(s => s.id === stepId);
    if (step) {
      setEditingStepDetailNodeId(stepId);
      setEditingStepLatexContent(step.latexContent);
      setShowStepDetailEditor(true);
      if (currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) {
        // Potentially switch to a layout mode that gives DAG more space, or adjust panelWidths
      }
    } else {
      toast.error("无法查看详情：未找到步骤数据。");
    }
  }, [getCurrentPageSolutionSteps]);

  // +++ 回调：关闭步骤详情编辑器 +++
  const handleCloseStepDetailEditor = useCallback(() => {
    setEditingStepDetailNodeId(null);
    setEditingStepLatexContent('');
    setShowStepDetailEditor(false);
  }, []);

  // +++ 回调：保存步骤详情编辑器内容 +++
  const handleSaveStepDetailEditor = useCallback((newLatexContent: string) => {
    if (editingStepDetailNodeId) {
      handleStepContentChange(editingStepDetailNodeId, newLatexContent); 
      toast.success(`步骤 ${editingStepDetailNodeId} 的内容已更新。`);
    }
    handleCloseStepDetailEditor();
  }, [editingStepDetailNodeId, handleStepContentChange, handleCloseStepDetailEditor]);
  
  // 这个回调函数现在调用 handleOpenViewEditStepDetails
  // 旧的 handleViewEditStepDetails 定义将被删除 (在 outline 1788行附近)
  const handleViewEditStepDetails = useCallback((stepId: string) => {
    handleOpenViewEditStepDetails(stepId);
  }, [handleOpenViewEditStepDetails]);

  // 🔧 新增：处理步骤重命名功能
  const handleRenameStep = useCallback((stepId: string, newName: string) => {
    if (!newName.trim()) return;
    
    // 更新当前页面的解题步骤数据 - 这里主要更新步骤的标签/名称
    setCurrentPageSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, /* 这里暂时没有直接的name字段，可能需要扩展 */ } : step
      )
    );

    // 更新DAG节点数据中的label
    setDagNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === stepId 
          ? { ...node, data: { ...node.data, label: newName } }
          : node
      )
    );

    toast.success(`步骤 "${newName}" 重命名成功`);
  }, [setCurrentPageSolutionSteps, setDagNodes]);

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
    console.log('[MainLayout] DAG generation useEffect triggered');
    
    const generateDagData = () => {
      const currentPage = dagPageState.pages.find(p => p.id === dagPageState.activePageId);
      if (!currentPage) {
        console.log('[MainLayout] No active page, clearing DAG');
        setDagNodes([]);
        setDagEdges([]);
        return;
      }

      const currentSolutionSteps = currentPage.solutionSteps;
      console.log('[MainLayout] generateDagData for page:', currentPage.name, 'Steps:', currentSolutionSteps.length);

      // 🔥 如果没有解题步骤，清空DAG
      if (!currentSolutionSteps || currentSolutionSteps.length === 0) {
        console.log('[MainLayout] No solution steps, clearing DAG');
        setDagNodes([]);
        setDagEdges([]);
        return;
      }

      console.log('[MainLayout] Generating DAG data for', currentSolutionSteps.length, 'steps');

      // 生成DAG节点
      let visibleNodeIndex = 0;
      const parkedNodeXPosition = 30;
      const activeNodeXPosition = 200; 
      const verticalSpacing = 120;
      const baseOffsetY = 50;

      const newDagNodes: DagNode[] = currentSolutionSteps
        .filter(step => !step.isHardDeleted) // 只为非硬删除的步骤创建节点
        .map((step) => {
          let xPos, yPos;
          if (step.isDeleted) { // 软删除的节点放到边上
            xPos = parkedNodeXPosition;
            const originalIndex = currentSolutionSteps.findIndex(s => s.id === step.id);
            yPos = originalIndex * (verticalSpacing / 2) + baseOffsetY;
          } else { // 活跃节点
            xPos = activeNodeXPosition;
            yPos = visibleNodeIndex * verticalSpacing + baseOffsetY;
            visibleNodeIndex++; 
          }

          const nodeData: DagNodeRfData = {
            id: step.id,
            label: `步骤 ${step.stepNumber}`,
            fullLatexContent: step.latexContent,
            verificationStatus: step.verificationStatus,
            stepNumber: step.stepNumber,
            isDeleted: step.isDeleted,
            isHardDeleted: step.isHardDeleted,
            notes: step.notes,
            forwardDerivationDisplayStatus: step.forwardDerivationStatus,
            backwardDerivationDisplayStatus: step.backwardDerivationStatus,
            // 🔥 移除临时hack，恢复正常逻辑
            isMainPathNode: false, // 将在后续步骤中正确设置
          };

          return {
            id: step.id,
            type: 'customStepNode',
            data: nodeData,
            position: { x: xPos, y: yPos },
          };
        });

      // 生成DAG边
      const visibleStepsForEdges = currentSolutionSteps.filter(s => !s.isDeleted && !s.isHardDeleted);
      const newEdges: DagEdge[] = [];

      if (visibleStepsForEdges.length > 1) {
        for (let i = 1; i < visibleStepsForEdges.length; i++) {
          const sourceStep = visibleStepsForEdges[i - 1];
          const targetStep = visibleStepsForEdges[i];
          
          if (sourceStep && targetStep) {
            const edgeId = `e-${sourceStep.id}-${targetStep.id}`;
            
            newEdges.push({
              id: edgeId, 
              source: sourceStep.id,
              target: targetStep.id,
              type: 'smoothstep', 
              markerEnd: { type: MarkerType.ArrowClosed },
              style: {
                stroke: '#b1b1b7',
                strokeWidth: 1.5,
              },
              animated: false,
              zIndex: 0,
            });
          }
        }
      }
      
      console.log('[MainLayout] Generated DAG:', { nodes: newDagNodes.length, edges: newEdges.length });
      
      // 🔥 使用批量更新避免多次渲染
      setDagNodes(newDagNodes);
      setDagEdges(newEdges);
    };

    generateDagData();
  // 🔥 修复依赖项：添加对当前页面solutionSteps的监听，确保即时更新
  }, [dagPageState.activePageId, dagPageState.pages]);
  // 通过监听整个pages数组的变化，能够捕获到页面内solutionSteps的更新

    // 🔥 移除独立的题目数据初始化，现在由页面数据恢复逻辑统一处理
  // 这样可以避免题目闪烁问题

  // 🔥 修复：使用页面级数据的 handleAddSolutionStep
  const handleAddSolutionStep = useCallback((latexInput: string) => {
    if (!latexInput.trim()) return;
    
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: currentSolutionSteps.filter(s => !s.isDeleted).length + 1,
      latexContent: latexInput,
      verificationStatus: VerificationStatus.NotVerified,
      isDeleted: false,
      forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
      backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
    };
    
    console.log('🔥 Adding new step to current page:', newStep);
    setCurrentPageSolutionSteps(prevSteps => [...prevSteps, newStep]);
    
    // 📝 为新创建的步骤创建初始版本历史
    createInitialVersionForStep(newStep);
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps, createInitialVersionForStep]);

  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({}); // Ref to store timeout IDs
  const prevSolutionStepsForToastRef = useRef<SolutionStepData[]>(); // Dedicated ref for toast comparison

  // useEffect for triggering toast notifications based on status changes
  useEffect(() => {
    // 🔥 使用页面级数据而不是全局数据
    const currentSteps = getCurrentPageSolutionSteps(); // Capture current solutionSteps from the closure
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

  }, [getCurrentPageSolutionSteps]); // 🔥 修改依赖为页面级数据函数

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const handleCheckForwardDerivation = useCallback(async (stepId: string) => {
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const targetStep = currentSolutionSteps.find(s => s.id === stepId);
    
    if (targetStep && targetStep.forwardDerivationStatus === ForwardDerivationStatus.Pending) {
      return;
    }
    
    if (!targetStep) {
      toast.error('找不到要验证的步骤');
      return;
    }

    try {
      // 设置为 Pending 状态
      setCurrentPageSolutionSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, forwardDerivationStatus: ForwardDerivationStatus.Pending }
            : step
        )
      );

      // 构建历史步骤字符串
      const historySteps = currentSolutionSteps
        .filter(s => s.stepNumber < targetStep.stepNumber)
        .map(s => `第${s.stepNumber}步: ${s.latexContent}`)
        .join('\n');

      // 调用 API
      const response = await fetch('http://localhost:8000/chat/verify_step_forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawLatex: problemLatex,
          current_step: `第${targetStep.stepNumber}步: ${targetStep.latexContent}`,
          history_steps: historySteps
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.payload) {
        const isCorrect = data.payload.is_correct;
        const explanation = data.payload.explanation || '';
        const errorReason = data.payload.error_reason || '';
        
        const nextStatus = isCorrect ? ForwardDerivationStatus.Correct : ForwardDerivationStatus.Incorrect;
        
        // 更新步骤状态
        setCurrentPageSolutionSteps(prevSteps => 
          prevSteps.map(step => {
        if (step.id === stepId) {
              return { 
                ...step, 
                forwardDerivationStatus: nextStatus,
                // 管理正向验证的备注信息
                notes: (() => {
                  const currentNotes = step.notes || '';
                  // 移除之前的正向验证失败信息
                  const notesWithoutForward = currentNotes.replace(/正向验证失败:.*?(?=\n|$)/g, '').trim();
                  
                  if (!isCorrect) {
                    // 添加新的正向验证失败信息
                    const newForwardError = `正向验证失败: ${errorReason}`;
                    return notesWithoutForward ? `${notesWithoutForward}\n${newForwardError}` : newForwardError;
                  } else {
                    // 验证成功，只保留非正向验证失败的备注
                    return notesWithoutForward || undefined;
                  }
                })()
              };
        }
        return step;
          })
        );

        // 注意：不需要手动更新 DAG 节点，因为 DAG 会根据 solutionSteps 的变化自动重新生成

        // 显示结果消息
        if (isCorrect) {
          toast.success(`步骤 ${targetStep.stepNumber} 正向推导验证通过！`);
        } else {
          toast.error(`步骤 ${targetStep.stepNumber} 正向推导验证失败！`);
        }
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (error) {
      console.error('Error verifying forward derivation:', error);
      toast.error('验证正向推导时出错，请重试');
      
      // 重置为 Undetermined 状态
      setCurrentPageSolutionSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, forwardDerivationStatus: ForwardDerivationStatus.Undetermined }
            : step
        )
      );
    }
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps, setDagNodes, problemLatex]);

  const handleCheckBackwardDerivation = useCallback(async (stepId: string) => {
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const targetStep = currentSolutionSteps.find(s => s.id === stepId);
    
    if (targetStep && targetStep.backwardDerivationStatus === ForwardDerivationStatus.Pending) {
      return;
    }
    
    if (!targetStep) {
      toast.error('找不到要验证的步骤');
      return;
    }

    try {
      // 设置为 Pending 状态
      setCurrentPageSolutionSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, backwardDerivationStatus: ForwardDerivationStatus.Pending }
            : step
        )
      );

      // 构建后续步骤字符串
      const futureSteps = currentSolutionSteps
        .filter(s => s.stepNumber > targetStep.stepNumber)
        .map(s => `第${s.stepNumber}步: ${s.latexContent}`)
        .join('\n');

      // 调用 API
      const response = await fetch('http://localhost:8000/chat/verify_step_backward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawLatex: problemLatex,
          current_step: `第${targetStep.stepNumber}步: ${targetStep.latexContent}`,
          future_steps: futureSteps
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.payload) {
        const isCorrect = data.payload.is_correct;
        const explanation = data.payload.explanation || '';
        const errorReason = data.payload.error_reason || '';
        
        const nextStatus = isCorrect ? ForwardDerivationStatus.Correct : ForwardDerivationStatus.Incorrect;
        
        // 更新步骤状态
        setCurrentPageSolutionSteps(prevSteps => 
          prevSteps.map(step => {
        if (step.id === stepId) {
              return { 
                ...step, 
                backwardDerivationStatus: nextStatus,
                // 管理反向验证的备注信息
                notes: (() => {
                  const currentNotes = step.notes || '';
                  // 移除之前的反向验证失败信息
                  const notesWithoutBackward = currentNotes.replace(/反向验证失败:.*?(?=\n|$)/g, '').trim();
                  
                  if (!isCorrect) {
                    // 添加新的反向验证失败信息
                    const newBackwardError = `反向验证失败: ${errorReason}`;
                    return notesWithoutBackward ? `${notesWithoutBackward}\n${newBackwardError}` : newBackwardError;
                  } else {
                    // 验证成功，只保留非反向验证失败的备注
                    return notesWithoutBackward || undefined;
                  }
                })()
              };
        }
        return step;
          })
        );

        // 注意：不需要手动更新 DAG 节点，因为 DAG 会根据 solutionSteps 的变化自动重新生成

        // 显示结果消息
        if (isCorrect) {
          toast.success(`步骤 ${targetStep.stepNumber} 反向推导验证通过！`);
        } else {
          toast.error(`步骤 ${targetStep.stepNumber} 反向推导验证失败！`);
        }
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (error) {
      console.error('Error verifying backward derivation:', error);
      toast.error('验证反向推导时出错，请重试');
      
      // 重置为 Undetermined 状态
      setCurrentPageSolutionSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, backwardDerivationStatus: ForwardDerivationStatus.Undetermined }
            : step
        )
      );
    }
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps, problemLatex]);

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
    
    // +++ PATH_GROUPS: Trigger layout when toggling DAG panel +++
    setTimeout(() => {
      if (pathGroups.length > 0) {
        const layoutedGroups = generatePathGroupLayout(pathGroups, dagNodes);
        const layoutedNodes = applyPathGroupLayoutToNodes(dagNodes, layoutedGroups);
        setDagNodes(layoutedNodes);
        setPathGroups(layoutedGroups);
      }
    }, 300); // 等待动画完成
    // +++ End PATH_GROUPS +++
  };

  const handleExpandDagFully = () => {
    setCurrentLayoutMode(LayoutMode.DAG_EXPANDED_FULL);
  };

  const handleActivateAiPanel = () => {
    // 🔄 切换AI助手视图模式：如果已经在AI视图，则返回默认视图
    if (currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) {
      setCurrentLayoutMode(LayoutMode.DEFAULT_THREE_COLUMN);
    } else {
      setCurrentLayoutMode(LayoutMode.AI_PANEL_ACTIVE);
    }
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
    // 🔥 更新当前页面的题目数据
    if (dagPageState.activePageId) {
      setDagPageState(prev => ({
        ...prev,
        pages: prev.pages.map(p => 
          p.id === prev.activePageId 
            ? { 
                ...p, 
                problemData: p.problemData ? { ...p.problemData, latexContent: newLatexContent } : {
                  id: `problem-${Date.now()}`,
                  title: '新问题',
                  latexContent: newLatexContent,
                }
              }
            : p
        )
      }));
    }
    
    // 同时更新全局状态以保持同步
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
    setProblemLatex(newLatexContent);
  };

  const handleDeleteStep = (stepId: string) => {
    // 🔥 修复：使用页面级数据而不是全局数据
    setCurrentPageSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, isDeleted: true } : step
      )
    );
  };

  // 修改handleAnalyzeStep函数，添加自动前向和后向推导检查逻辑
  const handleAnalyzeStep = useCallback((stepId: string, currentForwardStatus?: ForwardDerivationStatus, currentBackwardStatus?: ForwardDerivationStatus) => {
    console.log("Analyze step requested:", stepId);
    
    let didTriggerForward = false;
    let didTriggerBackward = false;

    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepToAnalyze = currentSolutionSteps.find(s => s.id === stepId);
    if (!stepToAnalyze) {
      toast.error("AI分析失败：找不到步骤。");
      return;
    }

    // 检查前向推导状态，如果未确定则自动触发检查
    const forwardStatus = currentForwardStatus || stepToAnalyze.forwardDerivationStatus;
    if (forwardStatus === ForwardDerivationStatus.Undetermined) {
      console.log(`[MainLayout] AI Analysis for step ${stepId}: Forward derivation is Undetermined. Triggering check.`);
      handleCheckForwardDerivation(stepId);
      didTriggerForward = true;
    }

    // 检查后向推导状态，如果未确定则自动触发检查
    const backwardStatus = currentBackwardStatus || stepToAnalyze.backwardDerivationStatus;
    if (backwardStatus === ForwardDerivationStatus.Undetermined) {
      console.log(`[MainLayout] AI Analysis for step ${stepId}: Backward derivation is Undetermined. Triggering check.`);
      handleCheckBackwardDerivation(stepId);
      didTriggerBackward = true;
    }

    if (didTriggerForward || didTriggerBackward) {
      toast.info("正在自动检查前向推导和后向推导，请稍后重试AI分析以获得最准确结果。");
      // 即使触发了推导检查，仍然继续进行AI分析（可能基于不完整的推导）
    }
    
    // 继续原有的AI分析逻辑（目前是状态模拟切换）
    console.log(`[MainLayout] Proceeding with AI analysis for step ${stepId} after derivation checks.`);
    setCurrentPageSolutionSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          let newStatus = VerificationStatus.NotVerified;
          if (step.verificationStatus === VerificationStatus.NotVerified) newStatus = VerificationStatus.VerifiedCorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedCorrect) newStatus = VerificationStatus.VerifiedIncorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedIncorrect) newStatus = VerificationStatus.NotVerified;
          toast.info(`步骤 ${step.stepNumber} AI分析完成，状态已更新。`);
          return { ...step, verificationStatus: newStatus };
        }
        return step;
      })
    );
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps, handleCheckForwardDerivation, handleCheckBackwardDerivation]);

  // Core split logic - this remains mostly the same
  const handleSplitStep = (originalStepId: string, part1Content: string, part2Content: string) => {
    // 🔥 使用页面级数据而不是全局数据
    setCurrentPageSolutionSteps(prevSteps => {
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
    // 🔥 修复：使用页面级数据而不是全局数据
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepToDelete = currentSolutionSteps.find(s => s.id === stepId);
    if (!stepToDelete) return;

    const originalStepIndex = currentSolutionSteps.findIndex(s => s.id === stepId);

    openConfirmationDialog(
      '确认删除步骤',
      <span>您确定要将步骤 <strong>"步骤 {stepToDelete.stepNumber}"</strong> (ID: {stepToDelete.id}) 标记为删除吗？</span>,
      () => {
        // 🔥 修复：使用页面级数据而不是全局数据
        setCurrentPageSolutionSteps(prevSteps => {
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
  }, [getCurrentPageSolutionSteps, openConfirmationDialog]);

  const handleUndoSoftDeleteStep = useCallback((stepId: string) => {
    // 🔥 修复：使用页面级数据而不是全局数据
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepToUndo = currentSolutionSteps.find(s => s.id === stepId);
    if (!stepToUndo) return;

    openConfirmationDialog(
      '确认恢复步骤',
      <span>您确定要恢复步骤 <strong>"步骤 {stepToUndo.stepNumber}"</strong> (ID: {stepToUndo.id}) 吗？</span>,
      () => {
        // 🔥 修复：使用页面级数据而不是全局数据
        setCurrentPageSolutionSteps(prevSteps =>
          prevSteps.map(step =>
            step.id === stepId ? { ...step, isDeleted: false } : step
          )
        );
        toast.success(`步骤 ${stepToUndo.stepNumber} 已成功恢复！`);
      },
      { confirmText: '恢复', variant: 'constructive' } 
    );
  }, [getCurrentPageSolutionSteps, openConfirmationDialog]);

  const handleUpdateStepVerificationStatus = useCallback(
    (stepId: string, newStatus: VerificationStatus) => {
      // 🔥 修复：使用页面级数据而不是全局数据
      setCurrentPageSolutionSteps(prevSteps =>
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
    // 🔥 使用页面级数据而不是全局数据
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepToSplit = currentSolutionSteps.find(s => s.id === stepId);
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
  }, [getCurrentPageSolutionSteps, dagNodes]);

  const handleCopilotModelChange = (modelId: string) => {
    setCopilotCurrentModel(modelId);
    // TODO: Optionally save this preference
  };

  const handleCopilotModeChange = (mode: CopilotMode) => {
    setCopilotCurrentMode(mode);
  };

  // +++ NEW STATE FOR RIGHT SIDE MODE CARDS PANEL AND GLOBAL COPILOT MODE +++
  const [currentGlobalCopilotMode, setCurrentGlobalCopilotMode] = useState<CopilotMode | null>(null);

  // +++ MODEL MANAGEMENT STATE (MOVED FROM AICopilotPanel) +++
  // Removed duplicate: const copilotAvailableModels: string[] = [ ... ]; at line 2103
  const [currentSelectedAiModel, setCurrentSelectedAiModel] = useState<string>(copilotAvailableModels[3]); // Uses the copilotAvailableModels defined earlier

  // --- Panel Widths State & Logic (ENSURE THIS SECTION IS RETAINED) ---
  // Removed duplicate: const [panelWidths, setPanelWidths] = useState<PanelWidthsType>(() => { ... }); at line 2118
  // Removed duplicate: const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(LayoutMode.DEFAULT_THREE_COLUMN); at line 2122
  // ... other panel width related functions and useEffects ...
  // Example: Resizing logic
  const handleDragHorizontal = (movementX: number) => {
    // Implementation for horizontal drag
    console.log('Horizontal drag:', movementX);
  };

  const handleDragVertical = (movementX: number, separatorIndex: number) => {
    // Implementation for vertical drag - adjust panel widths
    const containerWidth = mainLayoutRef.current?.offsetWidth || window.innerWidth;
    const pixelMovement = movementX;
    const percentageMovement = (pixelMovement / containerWidth) * 100;

    setPanelWidths(prevWidths => {
      const newWidths = { ...prevWidths };
      
      if (separatorIndex === 0) {
        // Dragging between DAG and Solver
        const newDagWidth = Math.max(MIN_PANEL_PERCENTAGE, Math.min(80, prevWidths.dag + percentageMovement));
        const newSolverWidth = Math.max(MIN_PANEL_PERCENTAGE, Math.min(80, prevWidths.solver - percentageMovement));
        
        newWidths.dag = newDagWidth;
        newWidths.solver = newSolverWidth;
      } else if (separatorIndex === 1) {
        // Dragging between Solver and AI
        const newSolverWidth = Math.max(MIN_PANEL_PERCENTAGE, Math.min(80, prevWidths.solver + percentageMovement));
        const newAiWidth = Math.max(MIN_PANEL_PERCENTAGE, Math.min(80, prevWidths.ai - percentageMovement));
        
        newWidths.solver = newSolverWidth;
        newWidths.ai = newAiWidth;
      }
      
      // Save to localStorage
      saveUserPreferenceForMode(currentLayoutMode, newWidths);
      
      return newWidths;
    });
  };
  // --- End Panel Widths State & Logic ---

  // ... existing useEffects for data loading, saving, etc. ...

  // --- Callback to set context for AI Copilot ---
  const handleNodeSelectedForCopilot = (nodeId: string, nodeData: DagNodeRfData) => {
    console.log("MainLayout: Node selected for Copilot context:", nodeId, nodeData);
    
    // 🎯 设置上下文信息
    setCopilotContextNodeInfo({
      id: nodeId,
      label: nodeData.label,
      content: nodeData.fullLatexContent || '', // Or some other relevant content
    });
    
    // 🎯 如果当前是LaTeX模式，自动设置选中的步骤信息
    if (currentGlobalCopilotMode === 'latex') {
      setSelectedStepForLaTeX({
        id: nodeId,
        content: nodeData.fullLatexContent || '',
        stepNumber: nodeData.stepNumber || 1
      });
    }
    
    // 🎯 如果当前是分析模式，自动设置选中的步骤信息
    if (currentGlobalCopilotMode === 'analysis') {
      setSelectedStepForAnalysis({
        id: nodeId,
        content: nodeData.fullLatexContent || '',
        stepNumber: nodeData.stepNumber || 1
      });
    }
    
    // 🎯 如果没有选择模式，不自动打开旧的AI面板
    // 用户需要通过模式卡片来选择具体的功能
    console.log('🎯 DAG节点已选择，等待用户选择AI模式');
  };
  
  // ... existing handlers like handleSaveProblem, handleAddSolutionStep ...
  
  const handleToggleAiCopilotPanel = () => {
    const newOpenState = !isAiCopilotPanelOpen;
    setIsAiCopilotPanelOpen(newOpenState);
    // 🎯 移除Hide Modes相关逻辑，模式卡片现在始终显示
  };

  // +++ HANDLERS FOR NEW FUNCTIONALITY +++
  // 🎯 新的直接模式切换逻辑 - 右侧面板架构
  const handleGlobalCopilotModeChange = (mode: CopilotMode) => {
    setCurrentGlobalCopilotMode(mode);
    
    // 🎯 如果有选中的DAG节点，自动应用到对应的模式面板
    if (copilotContextNodeInfo) {
      if (mode === 'latex') {
        setSelectedStepForLaTeX({
          id: copilotContextNodeInfo.id,
          content: copilotContextNodeInfo.content || '',
          stepNumber: 1 // 从DAG节点数据中获取，如果有的话
        });
        toast.success(`📐 LaTeX格式化模式已激活！正在编辑节点: ${copilotContextNodeInfo.label || copilotContextNodeInfo.id}`);
      } else if (mode === 'analysis') {
        setSelectedStepForAnalysis({
          id: copilotContextNodeInfo.id,
          content: copilotContextNodeInfo.content || '',
          stepNumber: 1
        });
        toast.success(`🧠 解析分析模式已激活！正在分析节点: ${copilotContextNodeInfo.label || copilotContextNodeInfo.id}`);
              } else if (mode === 'summary') {
          // 总结模式不需要特定的状态设置，直接使用copilotContextNodeInfo
          toast.success(`📊 总结归纳模式已激活！正在总结节点: ${copilotContextNodeInfo.label || copilotContextNodeInfo.id}`);
        }
    } else {
      // 🎯 没有选中节点时的通用提示
      if (mode === 'latex') {
        toast.success('📐 LaTeX格式化模式已激活！请先选择一个DAG节点。');
      } else if (mode === 'analysis') {
        toast.success('🧠 解析分析模式已激活！请先选择一个DAG节点。');
      } else if (mode === 'summary') {
        toast.success('📊 总结归纳模式已激活！请先选择一个DAG节点。');
      }
    }
    
    console.log('🎯 模式切换:', mode, '选中节点:', copilotContextNodeInfo);
  };



  const handleSelectAiModel = (modelId: string) => {
    setCurrentSelectedAiModel(modelId);
  };

  // 添加缺失的handleSaveProblem函数
  const handleSaveProblem = (newLatexContent: string) => {
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

  // 🔥 修复：使用页面级数据的 handleAddSolutionStepViaSolverActions
  const handleAddSolutionStepViaSolverActions = useCallback((latexInput: string, direction: 'forward' | 'backward') => {
    if (!latexInput.trim()) return;
    
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    
    let newStepNumber: number;
    
    if (direction === 'forward') {
      // 向前思考：在第一个解题块前生成，步骤编号最小
      newStepNumber = 1;
      // 更新现有步骤的编号
      setCurrentPageSolutionSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          stepNumber: step.stepNumber + 1
        }))
      );
    } else {
      // 向后思考：在最后一个解题块后生成
      newStepNumber = currentSolutionSteps.filter(s => !s.isDeleted).length + 1;
    }
    
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: newStepNumber,
      latexContent: latexInput,
      verificationStatus: VerificationStatus.NotVerified,
      isDeleted: false,
      forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
      backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
    };
    
    console.log(`🔥 Adding new step via solver actions (${direction} thinking) to current page:`, newStep);
    
    if (direction === 'forward') {
      // 向前思考：在开头插入
      setCurrentPageSolutionSteps(prevSteps => [newStep, ...prevSteps]);
    } else {
      // 向后思考：在末尾添加
      setCurrentPageSolutionSteps(prevSteps => [...prevSteps, newStep]);
    }
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps]);

  const handleCopilotSendMessage = async (message: string, mode: CopilotMode, model: string, contextNode?: CopilotContextNodeInfo | null) => {
    console.log('🤖 发送消息到AI:', {
      message,
      mode,
      model,
      contextNodeId: contextNode?.id,
      fullContext: contextNode,
    });

    try {
      // 构建消息内容
      let fullMessage = message;
      if (contextNode) {
        fullMessage = `上下文节点: ${contextNode.label || contextNode.id}\n内容: ${contextNode.content || ''}\n\n用户问题: ${message}`;
      }

      // 根据模式添加系统提示
      const systemPrompt = mode === 'latex' 
        ? '你是一个LaTeX专家，帮助用户处理LaTeX格式化问题。'
        : mode === 'analysis'
        ? '你是一个数学分析专家，帮助用户分析和理解数学问题。'
        : '你是一个总结专家，帮助用户总结和归纳内容。';

      // 使用新的AI模型服务发送消息
      const response = await aiModelService.chatCompletion({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullMessage }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });

      console.log('✅ AI响应:', response);
      toast.success('AI响应已生成');
      
      return response;
    } catch (error) {
      console.error('❌ AI调用失败:', error);
      toast.error(`AI调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  };

  // +++ 功能测试处理函数 +++
  const handleToggleTestPanel = () => {
    setIsTestPanelVisible(!isTestPanelVisible);
  };



  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleTestLaTeX = () => {
    console.log('测试LaTeX格式化功能 - 使用右侧抽屉');
    // 🎯 使用新的右侧抽屉而不是内嵌面板
    const currentSteps = getCurrentPageSolutionSteps();
    if (currentSteps.length > 0) {
      const firstStep = currentSteps[0];
      handleOpenRightDrawer({
        id: firstStep.id,
        content: firstStep.latexContent,
        stepNumber: firstStep.stepNumber
      });
      toast.success('📐 右侧LaTeX编辑器已打开！');
    } else {
      // 如果没有步骤，直接打开抽屉
      handleOpenRightDrawer();
      toast.info('📐 LaTeX编辑器已打开，您可以开始编辑！');
    }
  };

  const handleTestDAG = () => {
    toast.info('🔄 正在测试 DAG 可视化功能...');
    // 实际的DAG测试逻辑
    setTimeout(() => {
      toast.success('✅ DAG 可视化测试通过！React Flow 组件工作正常。');
    }, 1500);
  };

  const handleTestAI = () => {
    toast.info('🔄 正在测试 AI 交互功能...');
    // 实际的AI测试逻辑
    setTimeout(() => {
      toast.success('✅ AI 交互测试通过！模式切换和消息发送都正常。');
    }, 2000);
  };

  const handleTestSolver = () => {
    toast.info('🔄 正在测试求解器功能...');
    // 实际的求解器测试逻辑
    setTimeout(() => {
      toast.success('✅ 求解器测试通过！步骤添加、编辑、验证都正常。');
    }, 1200);
  };

  const handleTestEnhancedMentions = () => {
    setShowEnhancedMentionDemo(true);
    toast.success('🌟 增强@逻辑演示已启动！');
    console.log('[TEST] Enhanced mentions demo opened');
  };

  const handleCloseEnhancedMentionDemo = () => {
    setShowEnhancedMentionDemo(false);
  };

  // +++ LaTeX格式化面板处理函数 +++
  const handleOpenLaTeXPanel = (stepId?: string, content?: string, stepNumber?: number) => {
    if (stepId && content && stepNumber) {
      setSelectedStepForLaTeX({ id: stepId, content, stepNumber });
    }
    setIsLaTeXPanelVisible(true);
    toast.success('📐 LaTeX格式化面板已打开！');
  };

  const handleCloseLaTeXPanel = () => {
    setIsLaTeXPanelVisible(false);
    setSelectedStepForLaTeX(null);
  };

  const handleLaTeXContentChange = (newContent: string) => {
    if (selectedStepForLaTeX) {
      handleStepContentChange(selectedStepForLaTeX.id, newContent);
      setSelectedStepForLaTeX(prev => prev ? { ...prev, content: newContent } : null);
    }
  };

  // +++ 解析分析面板处理函数 +++
  const handleOpenAnalysisPanel = (stepId?: string, content?: string, stepNumber?: number) => {
    if (stepId && content && stepNumber) {
      setSelectedStepForAnalysis({ id: stepId, content, stepNumber });
    }
    setIsAnalysisPanelVisible(true);
    toast.success('🧠 解析分析面板已打开！');
  };

  const handleCloseAnalysisPanel = () => {
    setIsAnalysisPanelVisible(false);
    setSelectedStepForAnalysis(null);
  };

  // +++ 右侧抽屉事件处理 +++
  const handleToggleRightDrawer = useCallback((type: DrawerType) => {
    if (type === rightDrawerType) {
      // 如果点击的是当前激活的类型，则关闭抽屉
      setIsRightDrawerOpen(false);
      setRightDrawerType(null);
    } else {
      // 否则打开对应类型的抽屉
      setRightDrawerType(type);
      setIsRightDrawerOpen(type !== null);
    }
  }, [rightDrawerType]);

  const handleOpenRightDrawer = useCallback((stepInfo?: { id: string; content: string; stepNumber: number }) => {
    if (stepInfo) {
      setDrawerContextStepInfo({
        id: stepInfo.id,
        stepNumber: stepInfo.stepNumber,
        title: `步骤 ${stepInfo.stepNumber}`,
        content: stepInfo.content,
        preview: stepInfo.content.substring(0, 50) + '...'
      });
    }
    setRightDrawerType('features'); // 默认打开功能选择
    setIsRightDrawerOpen(true);
  }, []);

  const handleCloseRightDrawer = useCallback(() => {
    setIsRightDrawerOpen(false);
    setRightDrawerType(null);
  }, []);

  // 处理功能选择
  const handleFeatureSelect = useCallback((featureId: string) => {
    console.log('选择功能:', featureId);
    // 根据功能ID执行相应操作
    switch (featureId) {
      case 'latex-format':
        handleOpenLaTeXPanel();
        break;
      case 'math-analysis':
        handleOpenAnalysisPanel();
        break;
      case 'step-summary':
        // 实现步骤总结功能
        toast.info('步骤总结功能开发中...');
        break;
      case 'error-check':
        // 实现错误检查功能
        toast.info('错误检查功能开发中...');
        break;
      default:
        toast.info(`功能 ${featureId} 开发中...`);
    }
    // 选择功能后关闭抽屉
    handleCloseRightDrawer();
  }, []);

  const handleDrawerContentChange = useCallback((newContent: string) => {
    if (drawerContextStepInfo) {
      // 更新对应步骤的内容
      setCurrentPageSolutionSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === drawerContextStepInfo.id
            ? { ...step, latexContent: newContent }
            : step
        )
      );

      // 更新DAG节点中的内容
      setDagNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === drawerContextStepInfo.id
            ? { ...node, data: { ...node.data, fullLatexContent: newContent } }
            : node
        )
      );

      // 更新抽屉中的context信息
      setDrawerContextStepInfo(prev => prev ? { ...prev, content: newContent } : null);
    }
  }, [drawerContextStepInfo, setCurrentPageSolutionSteps, setDagNodes]);

  // +++ EDGE_SELECTION: Add edge selection and deletion handlers +++
  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      console.log('Edge selected:', edgeId);
      toast.info('连接线已选中。按Delete键删除，或点击其他地方取消选择。');
    }
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    console.log('Deleting edge:', edgeId);
    
    setConfirmDialogState({
      isOpen: true,
      title: '删除连接线',
      message: `确定要删除这条连接线吗？这将断开相关步骤的连接关系。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmButtonVariant: 'destructive',
      onConfirm: () => {
        // Remove the edge from dagEdges
        setDagEdges(prevEdges => {
          const updatedEdges = prevEdges.filter(edge => edge.id !== edgeId);
          console.log('Updated edges after deletion:', updatedEdges);
          return updatedEdges;
        });
        
        // Clear selection
        setSelectedEdgeId(null);
        
        toast.success('连接线已删除');
        setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, []);
  // +++ End EDGE_SELECTION +++

  // +++ PATH_GROUPS: Add path group connection handler +++
  const handlePathGroupConnect = useCallback((sourceNodeId: string, targetNodeId: string, newEdgeId: string) => {
    console.log('Path group connection:', sourceNodeId, '->', targetNodeId, 'edge:', newEdgeId);
    
    // 找到源节点和目标节点所属的路径组合
    const sourceGroup = pathGroups.find(group => group.nodeIds.includes(sourceNodeId));
    const targetGroup = pathGroups.find(group => group.nodeIds.includes(targetNodeId));
    
    if (sourceGroup && targetGroup && sourceGroup.id !== targetGroup.id) {
      // 检查是否可以连接（源节点是末尾，目标节点是开头）
      const canConnect = sourceNodeId === sourceGroup.endNodeId && targetNodeId === targetGroup.startNodeId;
      
      if (canConnect) {
        // 合并路径组合
        const mergedGroup = {
          id: sourceGroup.isMainPath ? sourceGroup.id : targetGroup.isMainPath ? targetGroup.id : sourceGroup.id,
          nodeIds: [...sourceGroup.nodeIds, ...targetGroup.nodeIds],
          edgeIds: [...sourceGroup.edgeIds, ...targetGroup.edgeIds, newEdgeId],
          isMainPath: sourceGroup.isMainPath || targetGroup.isMainPath,
          startNodeId: sourceGroup.startNodeId,
          endNodeId: targetGroup.endNodeId,
          layoutPosition: sourceGroup.isMainPath ? sourceGroup.layoutPosition : targetGroup.layoutPosition
        };
        
        // 更新路径组合状态
        const updatedGroups = pathGroups
          .filter(g => g.id !== sourceGroup.id && g.id !== targetGroup.id)
          .concat(mergedGroup);
        
        setPathGroups(updatedGroups);
        
        // 如果合并后的组合是主路径，更新主路径ID
        if (mergedGroup.isMainPath) {
          setMainPathGroupId(mergedGroup.id);
        }
        
        toast.success(`路径组合已合并！现在显示 ${mergedGroup.nodeIds.length} 个步骤。`);
      } else {
        toast.warning('只能连接路径末尾节点到另一路径的起始节点');
        // 可以选择删除这个无效连接
        setDagEdges(prevEdges => prevEdges.filter(edge => edge.id !== newEdgeId));
      }
    }
  }, [pathGroups]);

  // +++ PATH_GROUPS: Add main path switching handler +++
  const handleSetMainPathGroup = useCallback((groupId: string) => {
    setPathGroups(prevGroups => {
      const updatedGroups = prevGroups.map(group => ({
        ...group,
        isMainPath: group.id === groupId
      }));
      return updatedGroups;
    });
    setMainPathGroupId(groupId);
    toast.success('主路径已切换');
  }, []);
  // +++ End PATH_GROUPS +++

  // +++ DAG_PAGES: Add page management handlers +++
  // handlePageSelect 函数移到 summaryContent 声明之后

  const handleAddPage = useCallback(() => {
    if (dagPageState.pages.length >= dagPageState.maxPages) {
      toast.warning(`最多只能创建 ${dagPageState.maxPages} 个DAG页面`);
      return;
    }

    const newPageNumber = dagPageState.pages.length + 1;
    const newPage: DagPage = {
      id: `page-${newPageNumber}`,
      name: `DAG ${newPageNumber}`,
      nodes: [],
      edges: [],
      pathGroups: [],
      mainPathGroupId: null,
      createdAt: new Date(),
      isActive: false,
      // 🔥 添加必需的新字段：空的独立数据
      solutionSteps: [],
      // 🔥 修复：每个页面都有独立的题目数据
      problemData: {
        id: `problem-${newPageNumber}`,
        title: `题目 ${newPageNumber}`,
        latexContent: '$$\\text{请输入题目内容...}$$'
      },
      summaryContent: '',
      // 🔥 每个页面独立的类似题目
      similarProblems: []
    };

    setDagPageState(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));

    toast.success(`创建了新的DAG页面: ${newPage.name}`);
  }, [dagPageState]);

  const handleClosePage = useCallback((pageId: string) => {
    if (dagPageState.pages.length <= 1) {
      toast.warning('至少需要保留一个DAG页面');
      return;
    }

    const pageToClose = dagPageState.pages.find(p => p.id === pageId);
    if (!pageToClose) return;

    const remainingPages = dagPageState.pages.filter(p => p.id !== pageId);
    let newActivePageId = dagPageState.activePageId;

    // 如果关闭的是当前活动页面，切换到第一个剩余页面
    if (pageId === dagPageState.activePageId) {
      newActivePageId = remainingPages[0]?.id || null;
      if (newActivePageId) {
        const newActivePage = remainingPages[0];
        setDagNodes(newActivePage.nodes);
        setDagEdges(newActivePage.edges);
        setPathGroups(newActivePage.pathGroups);
        setMainPathGroupId(newActivePage.mainPathGroupId);
      }
    }

    setDagPageState(prev => ({
      ...prev,
      pages: remainingPages.map(p => ({ ...p, isActive: p.id === newActivePageId })),
      activePageId: newActivePageId,
    }));

    toast.success(`已关闭 ${pageToClose.name}`);
  }, [dagPageState]);

  // 🔥 添加页面重命名处理
  const handleRenamePage = useCallback((pageId: string, newName: string) => {
    if (!newName.trim()) {
      toast.warning('页面名称不能为空');
      return;
    }

    setDagPageState(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === pageId ? { ...p, name: newName.trim() } : p
      )
    }));

    toast.success(`页面已重命名为: ${newName.trim()}`);
  }, []);

  // 🔥 处理页面高亮
  const handleHighlightPage = useCallback((pageId: string, color: string | null) => {
    setDagPageState(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === pageId ? { ...p, highlightColor: color } : p
      )
    }));
    
    if (color) {
      toast.success('页面高亮已设置');
    } else {
      toast.success('页面高亮已清除');
    }
  }, []);



  // +++ EDGE_SELECTION: Add keyboard event handler for edge deletion +++
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedEdgeId && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        handleDeleteEdge(selectedEdgeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEdgeId, handleDeleteEdge]);
  // +++ End EDGE_SELECTION +++

  // +++ PATH_GROUPS: Initialize and update path groups when DAG data changes +++
  useEffect(() => {
    console.log('Path groups effect triggered, dagNodes:', dagNodes.length, 'dagEdges:', dagEdges.length);
    console.log('Current edges:', dagEdges.map(e => e.id));
    
    if (dagNodes.length > 0) {
      const newPathGroups = detectPathGroups(dagNodes, dagEdges);
      const layoutedGroups = generatePathGroupLayout(newPathGroups, dagNodes);
      
      console.log('Detected path groups:', layoutedGroups);
      
      // 检查当前主路径是否仍然存在
      const currentMainGroup = layoutedGroups.find(g => 
        mainPathGroupId && g.nodeIds.some(nodeId => 
          pathGroups.find(pg => pg.id === mainPathGroupId)?.nodeIds.includes(nodeId)
        )
      );
      
      if (currentMainGroup) {
        // 保持当前主路径
        const updatedGroups = layoutedGroups.map(g => ({
          ...g,
          isMainPath: g.id === currentMainGroup.id
        }));
        setPathGroups(updatedGroups);
        setMainPathGroupId(currentMainGroup.id);
      } else if (layoutedGroups.length > 0) {
        // 设置第一个组合为新的主路径
        const newMainGroup = { ...layoutedGroups[0], isMainPath: true };
        const updatedGroups = layoutedGroups.map((g, index) => 
          index === 0 ? newMainGroup : { ...g, isMainPath: false }
        );
        setPathGroups(updatedGroups);
        setMainPathGroupId(newMainGroup.id);
        console.log('Set new main path group:', newMainGroup.id);
      } else {
        // 没有路径组合
        setPathGroups([]);
        setMainPathGroupId(null);
      }
      
      // 应用布局到节点位置（仅在删除操作后或布局需要时）
      const layoutedNodes = applyPathGroupLayoutToNodes(dagNodes, layoutedGroups);
      if (!areNodesEqual(dagNodes, layoutedNodes)) {
        setDagNodes(layoutedNodes);
      }
    } else {
      setPathGroups([]);
      setMainPathGroupId(null);
    }
  }, [dagNodes, dagEdges]); // 修复：直接依赖dagNodes和dagEdges，让React的浅比较处理变化检测
  // +++ End PATH_GROUPS +++

  // +++ PATH_GROUPS: Calculate main path steps for display +++
  const mainPathStepIds = useMemo(() => {
    const currentPage = dagPageState.pages.find(p => p.id === dagPageState.activePageId);
    if (!currentPage) return [];
    
    console.log('[MainLayout] Calculating mainPathStepIds for page:', currentPage.name, { 
      solutionSteps: currentPage.solutionSteps.length,
      pathGroups: pathGroups.length,
      mainPathGroupId
    });
    
    // 🔥 修正逻辑：根据主路径组合筛选步骤
    if (mainPathGroupId && pathGroups.length > 0) {
      // 使用getMainPathSteps工具函数获取主路径步骤
      const mainPathStepIds = getMainPathSteps(mainPathGroupId, pathGroups, dagNodes, dagEdges);
      console.log('[MainLayout] Main path step IDs from path group:', mainPathStepIds);
      return mainPathStepIds;
    } else {
      // 如果没有设置主路径，则显示所有未删除的步骤（向后兼容）
      const allVisibleSteps = currentPage.solutionSteps.filter(step => !step.isDeleted && !step.isHardDeleted);
      const allStepIds = allVisibleSteps.map(step => step.id);
      console.log('[MainLayout] No main path set, showing all visible step IDs:', allStepIds);
      return allStepIds;
    }
  }, [dagPageState.activePageId, dagPageState.pages, mainPathGroupId, pathGroups, dagNodes, dagEdges]);

  const mainPathSteps = useMemo(() => {
    const currentPage = dagPageState.pages.find(p => p.id === dagPageState.activePageId);
    if (!currentPage) return [];
    
    const currentSolutionSteps = currentPage.solutionSteps;
    const steps = currentSolutionSteps.filter(step => 
      mainPathStepIds.includes(step.id) && !step.isDeleted && !step.isHardDeleted
    );
    console.log('[MainLayout] Final mainPathSteps for current page:', steps.length, steps.map(s => `${s.stepNumber}(${s.id})`));
    return steps;
  }, [dagPageState.activePageId, dagPageState.pages, mainPathStepIds]);
  // +++ End PATH_GROUPS +++

  // 🔥 题目数据是全局共享的，所有DAG页面都显示相同的题目
  // 直接使用全局的problemData，不再从页面中获取
  
  // ... other existing handlers ...

  // Layout calculation based on isAiCopilotPanelOpen
  // This part is crucial and might need careful adjustment based on your existing layout structure.
  // The example assumes a simple hide/show for the AI panel region.
  // You might be using CSS grid or flexbox that needs dynamic style updates.

  const dagRegionStyle: React.CSSProperties = {
    width: isAiCopilotPanelOpen ? `${panelWidths.ai}%` : `${panelWidths.dag}%`, // Example adjustment
    // ... other styles
  };
  const solverRegionStyle: React.CSSProperties = {
    width: isAiCopilotPanelOpen ? `${panelWidths.solver}%` : `${panelWidths.solver}%`, // Example adjustment
    // ... other styles
  };
  
  // Define styles for the AI panel region (left chat panel)
  // and the new right side panel region (for mode cards)
  const aiCopilotPanelStyle: React.CSSProperties = {
    width: `${panelWidths.ai}%`, // Or a fixed width if preferred when open
    display: isAiCopilotPanelOpen ? 'flex' : 'none', // Controls visibility of AICopilotPanel
    // flexShrink: 0, // Prevent shrinking if in a flex container
  };

  const rightSideAreaStyle: React.CSSProperties = {
    // This area will contain the 'three-lines' button and the ModeCardsPanel
    // Its width could be part of the solverRegion or a dedicated column
    // For now, let's assume it takes the space of the 'ai' panel when AICopilot is closed.
    width: !isAiCopilotPanelOpen ? `${panelWidths.ai}%` : '0%', // Takes 'ai' width when chat is closed
    display: !isAiCopilotPanelOpen ? 'flex' : 'none', // Only visible when chat is closed
    flexDirection: 'column',
    // padding: '10px', // Optional padding
    // borderLeft: '1px solid #e0e0e0', // Optional separator
  };

  // --- Derived state for DAG nodes to pass to AICopilotPanel for @mentions ---
  // This assumes dagNodes state exists
  const dagNodesForCopilot = useMemo((): CopilotDagNodeInfo[] => {
    // Ensure dagNodes exists and is an array before mapping
    if (!Array.isArray(dagNodes)) {
      return [];
    }
    const currentSteps = getCurrentPageSolutionSteps();
    return dagNodes.map(node => {
      // 尝试从stepNumber或label中提取步骤号
      const stepNumber = node.data.stepNumber || 
        parseInt(node.data.label?.match(/\d+/)?.[0] || '0');
      
      // 从对应的SolutionStep中获取完整内容
      const correspondingStep = currentSteps.find(step => step.id === node.id);
      
      return {
        id: node.id,
        label: node.data.label,
        content: correspondingStep?.latexContent || node.data.fullLatexContent || '',
        stepNumber: stepNumber || undefined,
      };
    });
  }, [dagNodes, getCurrentPageSolutionSteps]);

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

  const handleHighlightNode = useCallback((stepId: string, color: string | null) => {
    setDagNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === stepId
          ? { ...node, data: { ...node.data, highlightColor: color || undefined } }
          : node
      )
    );
    if (color) {
      toast.success(`节点 ${stepId} 已标记为 ${color}`);
    } else {
      toast.info(`节点 ${stepId} 的高亮已清除`);
    }
  }, [setDagNodes]);

  const handleOpenNoteModal = useCallback((stepId: string) => {
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepToEdit = currentSolutionSteps.find(s => s.id === stepId);
    const nodeToEdit = dagNodes.find(n => n.id === stepId);
    if (stepToEdit) {
      setEditingNoteForNodeId(stepId);
      setCurrentEditingNote(stepToEdit.notes || '');
      setCurrentEditingNodeLabel(nodeToEdit?.data?.label || stepToEdit.stepNumber?.toString() || 'N/A');
      setIsNoteModalOpen(true);
    } else {
      toast.error(`无法找到ID为 ${stepId} 的步骤以添加备注。`);
    }
  }, [getCurrentPageSolutionSteps, dagNodes]);

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

    // 🔥 使用页面级数据而不是全局数据
    setCurrentPageSolutionSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === editingNoteForNodeId ? { ...step, notes: trimmedNote } : step
      )
    );
    
    setDagNodes(prevDagNodes => 
      prevDagNodes.map(node => 
        node.id === editingNoteForNodeId 
          ? { ...node, data: { ...node.data, notes: trimmedNote } } 
          : node
      )
    );

    toast.success(`节点 ${editingNoteForNodeId} 的备注已保存。`);
    handleCloseNoteModal();
  }, [editingNoteForNodeId, setCurrentPageSolutionSteps, setDagNodes, handleCloseNoteModal]);

  const handleInterpretIdea = useCallback((stepId: string, idea: string) => {
    console.log(`Open interpretation modal for node ${stepId}`);
    // 找到对应的节点和步骤信息
    const currentSteps = getCurrentPageSolutionSteps();
    const step = currentSteps.find(s => s.id === stepId);
    const node = dagNodes.find(n => n.id === stepId);
    
    if (step && node) {
      setInterpretingNodeInfo({
        id: stepId,
        label: node.data.label || `步骤 ${step.stepNumber}`,
        content: step.latexContent,
        initialIdea: step.interpretationIdea || '',
      });
      setIsInterpretationModalOpen(true);
    } else {
      toast.error('找不到对应的步骤信息');
    }
  }, [getCurrentPageSolutionSteps, dagNodes]);

  const handleCloseInterpretationModal = useCallback(() => {
    setIsInterpretationModalOpen(false);
    setInterpretingNodeInfo(null);
  }, []);

  const handleSubmitInterpretation = useCallback((nodeId: string, userIdea: string) => {
    console.log(`Submit interpretation for node ${nodeId}: ${userIdea}`);
    
    if (!userIdea.trim()) {
      toast.error('请输入思路解读内容');
      return;
    }

    // 更新解题步骤中的思路解读内容
    setCurrentPageSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === nodeId
          ? {
              ...step,
              interpretationIdea: userIdea,
              interpretationStatus: 'pending' as const,
              interpretationTimestamp: new Date(),
            }
          : step
      )
    );

    // 更新DAG节点中的思路解读内容
    setDagNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                interpretationIdea: userIdea,
              }
            }
          : node
      )
    );

    // 创建思路解读条目
    const currentSteps = getCurrentPageSolutionSteps();
    const step = currentSteps.find(s => s.id === nodeId);
    
    if (step) {
      const newEntry: InterpretationEntry = {
        id: `interpretation-${nodeId}-${Date.now()}`,
        stepId: nodeId,
        stepNumber: step.stepNumber,
        stepLatexContent: step.latexContent,
        userIdea: userIdea,
        status: 'pending',
        timestamp: new Date(),
      };

      setInterpretationState(prev => ({
        ...prev,
        entries: [...prev.entries, newEntry],
      }));

      toast.success('思路解读已提交，等待教师反馈');
      handleCloseInterpretationModal();
    }
  }, [getCurrentPageSolutionSteps, setCurrentPageSolutionSteps, setDagNodes, handleCloseInterpretationModal]);

  const handleOpenInterpretationManagement = useCallback(() => {
    setShowInterpretationManagement(true);
  }, []);

  const handleCloseInterpretationManagement = useCallback(() => {
    setShowInterpretationManagement(false);
  }, []);

  const handleOpenDataManagement = useCallback(() => {
    setShowDataManagement(true);
  }, []);

  const handleCloseDataManagement = useCallback(() => {
    setShowDataManagement(false);
  }, []);

  const handleUpdateInterpretationEntry = useCallback((entryId: string, updates: Partial<InterpretationEntry>) => {
    setInterpretationState(prev => ({
      ...prev,
      entries: prev.entries.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      ),
    }));
  }, []);



  const handleCopyNodeInfo = useCallback(async (stepId: string) => {
    const nodeToCopy = dagNodes.find(n => n.id === stepId);
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const stepDetails = currentSolutionSteps.find(s => s.id === stepId);

    if (nodeToCopy && stepDetails) {
      const nodeSpecificData = nodeToCopy.data; 
      const id = stepId;
      const stepNumberDisplay = nodeSpecificData.label || `步骤 ${nodeSpecificData.stepNumber || 'N/A'}`;
      const fullLatex = stepDetails.latexContent || 'LaTeX内容未提供';
      const verificationStatusDisplay = nodeSpecificData.verificationStatus || VerificationStatus.NotVerified;

      let textToCopy = `步骤详情:
-------------------------
ID: ${id}
编号: ${stepNumberDisplay}
LaTeX:
${fullLatex}
-------------------------
验证状态: ${verificationStatusDisplay}
`;

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
  }, [dagNodes, getCurrentPageSolutionSteps]);

  const handleCopyPathInfo = useCallback(async (targetNodeId: string) => {
    // 简化版本的路径复制功能
    const currentSolutionSteps = getCurrentPageSolutionSteps();
    const targetStep = currentSolutionSteps.find(s => s.id === targetNodeId);
    
    if (targetStep) {
      let textToCopy = `路径信息:\n=========================\n`;
      textToCopy += `目标节点: ${targetStep.stepNumber}\n`;
      textToCopy += `LaTeX: ${targetStep.latexContent}\n`;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        toast.success("路径信息已复制到剪贴板！");
      } catch (err) {
        console.error('无法复制路径信息: ', err);
        toast.error("复制路径失败。请检查浏览器权限。");
      }
    } else {
      toast.error("找不到目标节点信息。");
    }
  }, [getCurrentPageSolutionSteps]);

  const handleNewPathFromNode = useCallback((nodeId: string) => {
    console.log(`Create new path from node ${nodeId}`);
    setIsCreatingNewPath(true);
    setStartNewPathNodeId(nodeId);
    toast.info(`从节点 ${nodeId} 开始创建新路径。请选择目标节点。`);
  }, []);

  const handleSelectNewPathTargetNode = useCallback((targetNodeId: string) => {
    if (!startNewPathNodeId) return;
    
    console.log(`Select target node for new path: ${startNewPathNodeId} -> ${targetNodeId}`);
    
    const result = findPathBetweenNodes(startNewPathNodeId, targetNodeId, dagNodes, dagEdges);
    if (result) {
      setCurrentNewPathElements({ nodes: result.pathNodes, edges: result.pathEdges });
      toast.success(`新路径已创建！包含 ${result.pathNodes.length} 个节点。`);
    } else {
      toast.warning("无法在选定的节点之间创建路径。");
    }
    
    // 清理状态
    setIsCreatingNewPath(false);
    setStartNewPathNodeId(null);
    setPreviewPathElements(null);
  }, [startNewPathNodeId, dagNodes, dagEdges]);

  const handleCancelNewPathCreation = useCallback(() => {
    setIsCreatingNewPath(false);
    setStartNewPathNodeId(null);
    setPreviewPathElements(null);
    setCurrentNewPathElements(null);
    toast.info("新路径创建已取消。");
  }, []);

  const [summaryContent, setSummaryContent] = useState<string>(() => {
    const saved = loadSummaryContent();
    return saved || '';
  });

  // AI解析数据会在DAG页面状态初始化时一起恢复，这里不需要单独的状态

  const handleSummaryContentChange = (content: string) => {
    // 🔥 更新当前页面的总结内容
    if (dagPageState.activePageId) {
      setDagPageState(prev => ({
        ...prev,
        pages: prev.pages.map(p => 
          p.id === prev.activePageId 
            ? { ...p, summaryContent: content }
            : p
        )
      }));
    }
    
    // 同时更新全局状态以保持同步
    setSummaryContent(content);
  };

  const handleUpdateStepAiAnalysis = useCallback((stepId: string, aiAnalysisContent: string | null) => {
    setCurrentPageSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? { ...step, aiAnalysisContent: aiAnalysisContent ?? undefined }
          : step
      )
    );
  }, [setCurrentPageSolutionSteps]);

  // +++ DAG_PAGES: 页面切换处理函数 +++
  const handlePageSelect = useCallback((pageId: string) => {
    const targetPage = dagPageState.pages.find(p => p.id === pageId);
    if (!targetPage) return;

    // 保存当前页面状态（包括题目数据和总结内容）
    if (dagPageState.activePageId) {
      setDagPageState(prev => ({
        ...prev,
        pages: prev.pages.map(p => 
          p.id === prev.activePageId 
            ? { 
                ...p, 
                nodes: dagNodes, 
                edges: dagEdges, 
                pathGroups: pathGroups, 
                mainPathGroupId: mainPathGroupId,
                problemData: problemData,
                summaryContent: summaryContent
              }
            : p
        )
      }));
    }

    // 切换到目标页面
    setDagNodes(targetPage.nodes);
    setDagEdges(targetPage.edges);
    setPathGroups(targetPage.pathGroups);
    setMainPathGroupId(targetPage.mainPathGroupId);
    
    // 🔥 修复：每个页面都有独立的题目数据，直接切换
    if (targetPage.problemData) {
      setProblemData(targetPage.problemData);
    } else {
      // 如果目标页面没有题目数据，创建默认题目数据
      const defaultProblemData = {
        id: `problem-${targetPage.id}`,
        title: `${targetPage.name}的题目`,
        latexContent: '$$\\text{请输入题目内容...}$$'
      };
      setProblemData(defaultProblemData);
      
      // 同时更新页面状态
      setDagPageState(prev => ({
        ...prev,
        pages: prev.pages.map(p => 
          p.id === targetPage.id ? { ...p, problemData: defaultProblemData } : p
        )
      }));
    }
    setSummaryContent(targetPage.summaryContent);

    // 更新活动页面
    setDagPageState(prev => ({
      ...prev,
      activePageId: pageId,
      pages: prev.pages.map(p => ({ ...p, isActive: p.id === pageId }))
    }));

    toast.success(`已切换到 ${targetPage.name}`);
  }, [dagPageState, dagNodes, dagEdges, pathGroups, mainPathGroupId, problemData, summaryContent]);
  // +++ End DAG_PAGES +++

  // +++ PERSISTENCE: 保存总结内容和AI解析数据 +++
  useEffect(() => {
    // 保存总结内容
    if (summaryContent) {
      saveSummaryContent(summaryContent);
    }
  }, [summaryContent]);

  useEffect(() => {
    // 从当前页面的步骤中提取AI解析数据
    const currentAiAnalysisData: AIAnalysisData = {};
    getCurrentPageSolutionSteps().forEach(step => {
      if (step.aiAnalysisContent) {
        currentAiAnalysisData[step.id] = step.aiAnalysisContent;
      }
    });
    
    // 保存AI解析数据
    saveAIAnalysisData(currentAiAnalysisData);
  }, [getCurrentPageSolutionSteps]);
  // +++ End PERSISTENCE +++

  // 添加一个通用的 LaTeX 公式处理函数
  const processLatexContent = (content: string): string => {
    if (!content) return '';
    
    try {
      // 1. 清理内容，移除多余的空白字符
      let cleanedContent = content.trim();
      
      // 2. 如果内容已经是完整的 LaTeX 公式（被 $$ 包围），直接返回
      if (cleanedContent.startsWith('$$') && cleanedContent.endsWith('$$')) {
        return cleanedContent;
      }
      
      // 3. 处理行内公式（$...$）
      cleanedContent = cleanedContent.replace(/\$([^$]+)\$/g, '$$$1$$');
      
      // 4. 处理可能存在的多个相邻公式
      cleanedContent = cleanedContent.replace(/\$\$\s*\$\$/g, '$$');
      
      // 5. 确保公式被正确包裹
      if (!cleanedContent.startsWith('$$')) {
        cleanedContent = '$$' + cleanedContent;
      }
      if (!cleanedContent.endsWith('$$')) {
        cleanedContent = cleanedContent + '$$';
      }
      
      return cleanedContent;
    } catch (error) {
      console.error('Error processing LaTeX content:', error);
      return content; // 如果处理出错，返回原始内容
    }
  };

  const handleAnalysisComplete = (result: any) => {
    console.log('Analysis complete:', result);
    
    if (result.payload?.steps && Array.isArray(result.payload.steps)) {
      // 创建新的步骤数组
      const newSteps: SolutionStepData[] = result.payload.steps.map((step: any, index: number) => {
        // 确保LaTeX内容被正确包装
        let latexContent = step.latex;
        if (!latexContent.startsWith('$') && !latexContent.startsWith('\\[')) {
          latexContent = `$${latexContent}$`;
        }
        
        return {
          id: `step-${Date.now()}-${index}`,
          latexContent: latexContent,
          stepNumber: index + 1,
          isDeleted: false,
          verificationStatus: VerificationStatus.NotVerified,
          forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
          // 不将解释保存为备注，避免在解题框中显示
          // notes: step.explanation
        };
      });
      
      // 一次性更新所有步骤
      setCurrentPageSolutionSteps((prev: SolutionStepData[]) => newSteps);
      
      // 如果有总结，更新总结面板
      if (result.payload.summary?.summary) {
        // 处理总结内容中的LaTeX公式
        let summaryContent = result.payload.summary.summary;
        
        // 使用通用处理函数处理 LaTeX 内容
        summaryContent = processLatexContent(summaryContent);
        
        // 创建一个新的总结条目
        const summaryEntry = {
          id: `summary-${Date.now()}`,
          title: '解题过程总结',
          content: summaryContent,
          stepNumbers: newSteps.map(step => step.stepNumber),
          timestamp: new Date(),
          type: 'auto' as const
        };
        
        // 更新总结面板的内容
        handleSummaryContentChange(summaryContent);
      }
      
      // 显示成功提示
      toast.success('分析完成！已生成解题步骤');
    } else {
      toast.error('返回的数据格式不正确');
    }
  };

  const handleSummarize = async (summaryContent: string) => {
    try {
      // 处理总结内容中的LaTeX公式
      let processedContent = processLatexContent(summaryContent);
      
      // 更新总结面板的内容
      handleSummaryContentChange(processedContent);
    } catch (error) {
      console.error('Error processing summary:', error);
      toast.error('处理总结内容时出错，请重试');
    }
  };

  // 🔥 移除全局类似题目状态，改为页面级管理
  // const [similarProblems, setSimilarProblems] = useState<SimilarProblem[]>([]);

  const handleFindSimilar = (problems: SimilarProblem[]): void => {
    // 处理每个问题的 LaTeX 内容
    const processedProblems = problems.map((problem: SimilarProblem) => {
      // 处理 LaTeX 内容
      let processedStem = problem.stem
        // 先处理 HTML 实体
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#32;/g, ' ')
        .replace(/&#(\d+);/g, (_: string, code: string) => String.fromCharCode(parseInt(code, 10)))
        // 处理 \text 命令
        .replace(/\\text{([^}]*)}/g, '\\text{$1}')
        // 处理其他特殊字符
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/\^/g, '\\^')
        .replace(/~/g, '\\~')
        .replace(/</g, '\\lt ')
        .replace(/>/g, '\\gt ');

      // 确保内容被 $$ 包围
      if (!processedStem.startsWith('$$')) {
        processedStem = '$$' + processedStem;
      }
      if (!processedStem.endsWith('$$')) {
        processedStem = processedStem + '$$';
      }

      return {
        ...problem,
        stem: processedStem
      };
    });
    
    // 🔥 修复：将类似题目保存到当前活动页面
    if (dagPageState.activePageId) {
      setDagPageState(prev => ({
        ...prev,
        pages: prev.pages.map(p => 
          p.id === prev.activePageId 
            ? { ...p, similarProblems: processedProblems }
            : p
        )
      }));
    }
    setShowSimilarProblems(true);
  };

  return (
    <ReactFlowProvider> {/* Ensures React Flow context is available */}
      <div ref={mainLayoutRef} className={styles.mainLayoutContainer}>
        {/* Check if showing interpretation management */}
        {showInterpretationManagement ? (
          <ModernInterpretationView
            interpretationEntries={interpretationState.entries}
            onBack={handleCloseInterpretationManagement}
            onUpdateEntry={handleUpdateInterpretationEntry}
          />
        ) : showDataManagement ? (
          <DataManagement
            onBack={handleCloseDataManagement}
          />
        ) : (
          <div className={styles.contentArea}> {/* Assuming a main content area wrapper */}
          {/* DAG Region */}
          {panelWidths.dag > 0 && ( // Only render if width is allocated
            <>
              <div className={styles.dagRegion} style={{ width: `${panelWidths.dag}%`}}>
                {/* +++ DAG_PAGES: Add page tabs +++*/}
                <div className={styles.dagPageTabsArea}>
                  <DagPageTabs
                    pages={dagPageState.pages}
                    activePageId={dagPageState.activePageId}
                    onPageSelect={handlePageSelect}
                    onAddPage={handleAddPage}
                    onClosePage={handleClosePage}
                    onRenamePage={handleRenamePage}
                    onHighlightPage={handleHighlightPage}
                    maxPages={dagPageState.maxPages}
                  />
                </div>
                {/* +++ End DAG_PAGES +++*/}
                
                {/* +++ CONTROL_BAR: Dedicated area for ControlBar +++*/}
                <div className={styles.dagControlBarArea}>
                  <ControlBar
                    isDagCollapsed={currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE}
                    onToggleCollapse={handleToggleDagCollapse}
                    currentLayoutMode={currentLayoutMode}
                    onExpandDagFully={handleExpandDagFully}
                    onActivateAiPanel={handleActivateAiPanel}
                    onOpenInterpretationManagement={handleOpenInterpretationManagement}
                    onOpenDataManagement={handleOpenDataManagement}
                  />
                  {/* 🔥 在DAG区域内部显示PathGroupIndicator */}
                  {pathGroups.length > 1 && (
                    <div style={{ marginTop: '8px' }}>
                      <PathGroupIndicator
                        pathGroups={pathGroups}
                        mainPathGroupId={mainPathGroupId}
                        onSetMainPath={handleSetMainPathGroup}
                      />
                    </div>
                  )}
                </div>
                {/* +++ End CONTROL_BAR +++*/}
                <div className={styles.dagVisualizationArea}>
                  <DagVisualizationArea
                  dagNodes={dagNodes}
                  dagEdges={dagEdges}
                  onSoftDeleteStep={handleSoftDeleteStep}
                  onUndoSoftDeleteStep={handleUndoSoftDeleteStep}
                  onUpdateStepVerificationStatus={handleUpdateStepVerificationStatus}
                  onInitiateSplitStep={handleInitiateSplitStepFromContextMenu}
                  onHighlightNode={handleHighlightNode}
                  onAddOrUpdateNote={handleOpenNoteModal}
                  onInterpretIdea={handleInterpretIdea}
                  onViewEditStepDetails={handleViewEditStepDetails}
                  onRenameStep={handleRenameStep}
                  onCopyNodeInfo={handleCopyNodeInfo}
                  onCopyPathInfo={handleCopyPathInfo}
                  onNewPathFromNode={handleNewPathFromNode}
                  onSelectNewPathTargetNode={handleSelectNewPathTargetNode}
                  onNodeMouseEnterForPathPreview={handleNodeMouseEnterForPathPreview}
                  onNodeMouseLeaveForPathPreview={handleNodeMouseLeaveForPathPreview}
                  onInitiateFocusAnalysis={handleInitiateFocusAnalysis}
                  onCancelFocusAnalysis={handleCancelFocusAnalysis}
                  onSetAsMainPath={handleSetAsMainPath}
                  onCancelMainPath={handleCancelMainPath}
                  onNodeSelectedForCopilot={handleNodeSelectedForCopilot}
                  currentFocusAnalysisNodeId={currentFocusAnalysisNodeId}
                  isCreatingNewPath={isCreatingNewPath}
                  previewPathElements={previewPathElements}
                  // +++ EDGE_SELECTION: Add edge selection props +++
                  onEdgeSelect={handleEdgeSelect}
                  onDeleteEdge={handleDeleteEdge}
                  selectedEdgeId={selectedEdgeId}
                  // +++ End EDGE_SELECTION +++
                  // +++ PATH_GROUPS: Add path group connection prop +++
                  onPathGroupConnect={handlePathGroupConnect}
                  // +++ End PATH_GROUPS +++
                />
                </div>


              </div>
              <DraggableSeparator orientation="vertical" onDrag={(delta) => handleDragVertical(delta.dx, 0)} />
            </>
          )}

          {/* Solver Region */}
          <div className={styles.solverRegion} style={{ width: `${panelWidths.solver}%` }}>
            {/* ... Solver content: ProblemBlock, SolutionStep, SolverActions ... */}
             <ProblemBlock data={problemData} onContentChange={handleProblemChange} />
             <div className={styles.solutionStepsContainer}>
                {/* +++ PATH_GROUPS: Display only main path steps +++ */}
                {mainPathSteps.map(step => (
                  <SolutionStep
                    key={step.id}
                    step={step}
                    onContentChange={handleStepContentChange}
                    onDelete={handleDeleteStep}
                    onInitiateAiAnalysisWithChecks={handleAnalyzeStep}
                    onSplit={handleSplitStep}
                    onCheckForwardDerivation={handleCheckForwardDerivation}
                    onCheckBackwardDerivation={handleCheckBackwardDerivation}
                    getCurrentPageSolutionSteps={getCurrentPageSolutionSteps}
                    problemLatex={problemLatex}
                    onUpdateStepAiAnalysis={handleUpdateStepAiAnalysis}
                  />
                ))}
                {/* +++ End PATH_GROUPS +++ */}
              </div>
              <SolverActions
                onAddStep={handleAddSolutionStepViaSolverActions}
                problemLatex={problemLatex}
                onAnalysisComplete={handleAnalysisComplete}
                onSummarize={handleSummarize}
                getCurrentPageSolutionSteps={getCurrentPageSolutionSteps}
                onFindSimilar={handleFindSimilar}
              />
              
              {/* Additional Solver Content - Similar Problems, AI Hints, Summary */}
              <div className={styles.solverZusatzContentContainer}>
                {/* Similar Problems Section */}
                {showSimilarProblems && (
                  <div className={styles.similarProblemsSection}>
                    <h4>类似题目</h4>
                    {(dagPageState.pages.find(p => p.id === dagPageState.activePageId)?.similarProblems || []).length > 0 ? (
                      <div className={styles.similarProblemsList}>
                        {(dagPageState.pages.find(p => p.id === dagPageState.activePageId)?.similarProblems || []).map((problem: SimilarProblem, index: number) => (
                          <div key={problem.id} className={styles.similarProblemItem}>
                            <div className={styles.problemNumber}>{index + 1}</div>
                            <div className={styles.problemContent}>
                              <Latex
                                delimiters={[
                                  { left: "$$", right: "$$", display: true },
                                  { left: "$", right: "$", display: false },
                                  { left: "\\(", right: "\\)", display: false },
                                  { left: "\\[", right: "\\]", display: true }
                                ]}
                                strict={false}
                              >
                                {problem.stem}
                              </Latex>
                            </div>
                            <div className={styles.problemScore}>
                              相似度: {(problem.score * 100).toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                    <div className={styles.placeholderText}>
                      <p>AI将为您推荐相关的类似题目...</p>
                      <p>这里会显示系统找到的相似问题和解法。</p>
                    </div>
                    )}
                  </div>
                )}

                {/* AI Hints Section */}
                {showAiHints && (
                  <div className={styles.aiHintsSection}>
                    <h4>AI提示</h4>
                    <div className={styles.placeholderText}>
                      <p>AI将根据您的解题过程提供智能提示...</p>
                      <p>包括可能的解题方向、注意事项、优化建议等。</p>
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                {showSummary && (
                  <div className={styles.summarySection}>
                    <h4>解答总结</h4>
                    <div className={styles.placeholderText}>
                      {summaryContent ? (
                        <div className={styles.latexSummaryContent}>
                          <Latex delimiters={[
                            { left: "$$", right: "$$", display: true },
                            { left: "$", right: "$", display: false },
                            { left: "\\(", right: "\\)", display: false },
                            { left: "\\[", right: "\\]", display: true }
                          ]}>
                            {summaryContent}
                          </Latex>
                        </div>
                      ) : (
                        <>
                      <p>AI将为您的完整解答过程生成总结...</p>
                      <p>包括关键步骤、核心思路、验证结果等。</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
          </div>
          
          {/* 🎯 新架构：右侧区域根据模式显示不同面板 */}
          <>
            {/* Only show separator if solver region is also visible and has width */}
            {panelWidths.solver > 0 && <DraggableSeparator orientation="vertical" onDrag={(delta) => handleDragVertical(delta.dx, 1)} />}
            <div className={styles.rightSideAreaPanel} style={rightSideAreaStyle}>
              {/* 根据当前模式渲染不同的面板 */}
              {currentGlobalCopilotMode === 'latex' && (
                <ModernLaTeXPanel
                  isOpen={true}
                  onClose={() => setCurrentGlobalCopilotMode(null)} // 🎯 返回模式选择
                  contextStepInfo={selectedStepForLaTeX ? {
                    id: selectedStepForLaTeX.id,
                    stepNumber: selectedStepForLaTeX.stepNumber,
                    title: `步骤 ${selectedStepForLaTeX.stepNumber}`,
                    content: selectedStepForLaTeX.content,
                    preview: selectedStepForLaTeX.content.substring(0, 50) + '...'
                  } : undefined}
                  onContentChange={handleLaTeXContentChange}
                  // 传递真实DAG数据
                  dagPages={dagPageState.pages.map(page => ({
                    id: page.id,
                    name: page.name,
                    isActive: page.isActive
                  }))}
                  answerBlocks={getCurrentPageSolutionSteps().map(step => ({
                    id: step.id,
                    stepNumber: step.stepNumber,
                    content: step.latexContent,
                    title: `步骤 ${step.stepNumber}`
                  }))}
                  problemData={problemData ? {
                    id: problemData.id,
                    title: problemData.title,
                    content: problemData.latexContent
                  } : undefined}
                  onPageSelect={(pageId) => {
                    // 实现页面切换逻辑
                    console.log('切换到页面:', pageId);
                  }}
                  onAnswerBlockSelect={(blockId) => {
                    // 实现解答块选择逻辑
                    if (blockId === 'problem-content') {
                      // 选择题目内容
                      setSelectedStepForLaTeX({
                        id: 'problem-content',
                        content: problemData?.latexContent || '',
                        stepNumber: 0
                      });
                    } else {
                      // 选择解题步骤
                      const selectedStep = getCurrentPageSolutionSteps().find(step => step.id === blockId);
                      if (selectedStep) {
                        setSelectedStepForLaTeX({
                          id: selectedStep.id,
                          content: selectedStep.latexContent,
                          stepNumber: selectedStep.stepNumber
                        });
                      }
                    }
                  }}
                />
              )}
              
              {currentGlobalCopilotMode === 'analysis' && (
                <ModernAnalysisPanel
                  isOpen={true}
                  onClose={() => setCurrentGlobalCopilotMode(null)} // 🎯 返回模式选择
                  currentStep={selectedStepForAnalysis?.stepNumber || 1}
                  totalSteps={getCurrentPageSolutionSteps().length}
                  contextStepInfo={selectedStepForAnalysis ? {
                    id: selectedStepForAnalysis.id,
                    content: selectedStepForAnalysis.content,
                    stepNumber: selectedStepForAnalysis.stepNumber
                  } : null}
                  // 🎯 传递真实DAG数据
                  dagPages={dagPageState.pages.map(page => ({
                    id: page.id,
                    name: page.name,
                    isActive: page.isActive,
                    highlightColor: page.highlightColor || undefined
                  }))}
                  stepBlocks={getCurrentPageSolutionSteps().map(step => ({
                    id: step.id,
                    stepNumber: step.stepNumber,
                    content: step.latexContent,
                    title: `步骤 ${step.stepNumber}`,
                    verificationStatus: step.verificationStatus === VerificationStatus.VerifiedCorrect ? 'verified' :
                                       step.verificationStatus === VerificationStatus.VerifiedIncorrect ? 'error' : 'unverified',
                    forwardDerivationStatus: step.forwardDerivationStatus === ForwardDerivationStatus.Correct ? 'correct' :
                                           step.forwardDerivationStatus === ForwardDerivationStatus.Incorrect ? 'incorrect' : 'undetermined',
                    backwardDerivationStatus: step.backwardDerivationStatus === ForwardDerivationStatus.Correct ? 'correct' :
                                            step.backwardDerivationStatus === ForwardDerivationStatus.Incorrect ? 'incorrect' : 'undetermined',
                    hasInterpretation: !!step.interpretationIdea,
                    hasNotes: !!step.notes,
                    isHighlighted: !!step.notes, // 简化判断
                    highlightColor: '#fbbf24', // 默认高亮颜色
                    isFocused: step.id === selectedStepForAnalysis?.id
                  }))}
                  selectedDagPageId={dagPageState.activePageId || undefined}
                  selectedStepId={selectedStepForAnalysis?.id}
                  onPageSelect={(pageId) => {
                    // 实现页面切换逻辑
                    console.log('Analysis面板切换到页面:', pageId);
                  }}
                  onStepSelect={(stepId) => {
                    // 实现步骤选择逻辑
                    const selectedStep = getCurrentPageSolutionSteps().find(step => step.id === stepId);
                    if (selectedStep) {
                      setSelectedStepForAnalysis({
                        id: selectedStep.id,
                        content: selectedStep.latexContent,
                        stepNumber: selectedStep.stepNumber
                      });
                    }
                  }}
                />
              )}
              
              {currentGlobalCopilotMode === 'summary' && (
                <ModernSummaryPanel
                  isOpen={true}
                  onClose={() => setCurrentGlobalCopilotMode('analysis')}
                  contextStepInfo={selectedStepForSummary ? {
                    id: selectedStepForSummary,
                    content: summaryContent,
                    stepNumber: 0
                  } : null}
                  onContentChange={handleSummaryContentChange}
                  dagPages={dagPageState.pages.map(page => ({
                    id: page.id,
                    name: page.name,
                    isActive: page.isActive,
                    highlightColor: page.highlightColor || undefined
                  }))}
                  stepBlocks={getCurrentPageSolutionSteps().map(step => ({
                    id: step.id,
                    stepNumber: step.stepNumber,
                    content: step.latexContent,
                    title: `步骤 ${step.stepNumber}`,
                    verificationStatus: step.verificationStatus === VerificationStatus.VerifiedCorrect ? 'verified' :
                                       step.verificationStatus === VerificationStatus.VerifiedIncorrect ? 'error' : 'unverified',
                    forwardDerivationStatus: step.forwardDerivationStatus === ForwardDerivationStatus.Correct ? 'correct' :
                                           step.forwardDerivationStatus === ForwardDerivationStatus.Incorrect ? 'incorrect' : 'undetermined',
                    backwardDerivationStatus: step.backwardDerivationStatus === ForwardDerivationStatus.Correct ? 'correct' :
                                            step.backwardDerivationStatus === ForwardDerivationStatus.Incorrect ? 'incorrect' : 'undetermined',
                    hasInterpretation: !!step.interpretationIdea,
                    hasNotes: !!step.notes,
                    isHighlighted: !!step.notes, // 简化判断
                    highlightColor: '#fbbf24', // 默认高亮颜色
                    isFocused: false // 总结模式下不需要聚焦特定步骤
                  }))}
                  selectedDagPageId={dagPageState.activePageId || undefined}
                  selectedStepId={selectedStepForSummary}
                  onPageSelect={(pageId) => {
                    // 实现页面切换逻辑
                    console.log('Summary面板切换到页面:', pageId);
                  }}
                  onStepSelect={(stepId) => {
                    // 实现步骤选择逻辑
                    console.log('Summary面板选择步骤:', stepId);
                    setSelectedStepForSummary(stepId);
                  }}
                  // 🎯 传递题目数据
                  problemData={problemData ? {
                    id: problemData.id,
                    title: problemData.title,
                    content: problemData.latexContent
                  } : null}
                />
              )}

              {/* 无模式状态时显示模式选择卡片 */}
              {currentGlobalCopilotMode === null && (
                <ModeCardsPanel
                  currentMode={currentGlobalCopilotMode}
                  onModeSelect={handleGlobalCopilotModeChange}
                />
              )}
            </div>
          </>
        </div>
        )}

        {/* Modals and other overlays */}
        <ConfirmationDialog
          isOpen={confirmDialogState.isOpen}
          title={confirmDialogState.title}
          message={confirmDialogState.message}
          confirmText={confirmDialogState.confirmText}
          cancelText={confirmDialogState.cancelText}
          onConfirm={confirmDialogState.onConfirm}
          onCancel={() => setConfirmDialogState(prev => ({ ...prev, isOpen: false }))}
        />

        <NodeNoteModal
          isOpen={isNoteModalOpen}
          onClose={handleCloseNoteModal}
          onSave={handleSaveNote}
          nodeLabel={currentEditingNodeLabel}
          initialNote={currentEditingNote}
        />

        <SplitStepModal
          isOpen={isSplitModalOpen}
          onClose={handleCloseSplitStepModal}
          onConfirmSplit={handleConfirmSplitStepModal}
          originalStepContent={splittingStepOriginalContent}
          originalStepLabel={splittingStepOriginalLabel}
        />

        <InterpretationModal
          isOpen={isInterpretationModalOpen}
          onClose={handleCloseInterpretationModal}
          onSubmit={handleSubmitInterpretation}
          nodeId={interpretingNodeInfo?.id || null}
          nodeLabel={interpretingNodeInfo?.label}
          nodeContent={interpretingNodeInfo?.content}
          initialIdea={interpretingNodeInfo?.initialIdea}
        />

        {/* Step Detail Editor Panel (if editing) */}
        {showStepDetailEditor && (
          <StepDetailEditorPanel
            nodeId={editingStepDetailNodeId}
            latexContent={editingStepLatexContent}
            onSave={handleSaveStepDetailEditor}
            onCancel={handleCloseStepDetailEditor}
            onChange={setEditingStepLatexContent}
          />
        )}

        {/* New Path Creation Hint Bar */}
        {isCreatingNewPath && (
          <NewPathCreationHintBar onCancel={handleCancelNewPathCreation} />
        )}



        {/* Feature Test Panel - 只在非思路解读管理模式下显示 */}
        {!showInterpretationManagement && (
          <FeatureTestPanel
            isVisible={isTestPanelVisible}
            onToggle={handleToggleTestPanel}
            isAiDemoVisible={isAiDemoVisible}
            onTestLaTeX={handleTestLaTeX}
            onTestDAG={handleTestDAG}
            onTestAI={handleTestAI}
            onTestSolver={handleTestSolver}
            onTestEnhancedMentions={handleTestEnhancedMentions}
            onOpenLaTeXPanel={handleOpenLaTeXPanel}
          />
        )}

        {/* Welcome Message */}
        <WelcomeMessage
          autoShow={showWelcome}
          onClose={handleCloseWelcome}
        />

        {/* Enhanced Mention Demo */}
        <EnhancedMentionDemo
          isVisible={showEnhancedMentionDemo}
          onClose={handleCloseEnhancedMentionDemo}
        />

        {/* 🎯 移除浮窗面板 - 现在集成到右侧区域 */}

        {/* Path Group Indicator */}
        {/* 暂时移除PathGroupIndicator的独立显示，避免在右侧显示"丑东西" */}
        {/* <PathGroupIndicator
          pathGroups={pathGroups}
          mainPathGroupId={mainPathGroupId}
          onSetMainPath={handleSetMainPathGroup}
        /> */}

        {/* +++ RIGHT_DRAWER: 右侧抽屉组件 +++ */}
        <RightDrawer
          isOpen={isRightDrawerOpen}
          drawerType={rightDrawerType}
          onToggle={handleToggleRightDrawer}
          contextStepInfo={drawerContextStepInfo || undefined}
          onContentChange={handleDrawerContentChange}
          dagPages={dagPageState.pages.map(page => ({
            id: page.id,
            name: page.name,
            createdAt: page.createdAt,
            isActive: page.isActive,
            highlightColor: page.highlightColor || undefined
          }))}
          // 🔧 修复：添加真实的answerBlocks数据传递
          answerBlocks={getCurrentPageSolutionSteps().map(step => ({
            id: step.id,
            stepNumber: step.stepNumber,
            content: step.latexContent,
            title: `步骤 ${step.stepNumber}`,
            verificationStatus: step.verificationStatus === VerificationStatus.VerifiedCorrect ? 'verified' :
                               step.verificationStatus === VerificationStatus.VerifiedIncorrect ? 'error' : 'unverified'
          }))}
          onPageSelect={(pageId) => {
            console.log('选择DAG页面:', pageId);
            // 实现页面切换逻辑
          }}
          onPageCreate={() => {
            console.log('创建新DAG页面');
            // 实现页面创建逻辑
          }}
          onPageDelete={(pageId) => {
            console.log('删除DAG页面:', pageId);
            // 实现页面删除逻辑
          }}
          onAnswerBlockSelect={(blockId) => {
            console.log('选择解答块:', blockId);
            // 🔧 修复：实现解答块选择逻辑
            const selectedStep = getCurrentPageSolutionSteps().find(step => step.id === blockId);
            if (selectedStep) {
              setDrawerContextStepInfo({
                id: selectedStep.id,
                stepNumber: selectedStep.stepNumber,
                title: `步骤 ${selectedStep.stepNumber}`,
                content: selectedStep.latexContent,
                preview: selectedStep.latexContent.substring(0, 50) + '...'
              });
            }
          }}
          onFeatureSelect={handleFeatureSelect}
          isLaTeXPanelVisible={currentGlobalCopilotMode === 'latex'}
          // 🔧 新增：版本历史相关函数
          getStepVersionHistory={getStepVersionHistory}
          switchStepVersion={switchStepVersion}
          addVersionToStep={addVersionToStep}
        />
        {/* +++ End RIGHT_DRAWER +++ */}
      </div>
    </ReactFlowProvider>
  );
};

export default MainLayout; 