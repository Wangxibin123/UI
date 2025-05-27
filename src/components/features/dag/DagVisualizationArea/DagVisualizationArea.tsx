import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { 
  ReactFlow, 
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  NodeOrigin,
  useReactFlow,
  ProOptions,
  Position,
  type Connection,
  type Edge,
  type Node,
  type Viewport,
  type ReactFlowInstance,
} from '@reactflow/core';

import { Controls } from '@reactflow/controls';
import { MiniMap } from '@reactflow/minimap';
import { Background, BackgroundVariant } from '@reactflow/background';

import { NodeTypes } from '@reactflow/core';

import { DagNode, DagEdge, VerificationStatus, FocusAnalysisType, type DagNodeRfData, type SolutionStepData } from '../../../../types';
import styles from './DagVisualizationArea.module.css';
import CustomStepNode from '../CustomStepNode/CustomStepNode';
import ContextMenu, { type ContextMenuHandle } from '../../../common/ContextMenu/ContextMenu';
import { type MenuItemProps } from '../../../common/MenuItem/MenuItem';
import {
  ArrowUpLeft, ArrowDownRight, Search, Copy, Maximize, Minimize, Link, Eye,
  GitFork, MessageSquare, StickyNote, Edit3, Trash2, RotateCcw, CheckCircle,
  XCircle, Lightbulb, Waypoints, Wand, Zap, ChevronRight, HelpCircle, LogOut, Anchor
} from 'lucide-react';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  onSoftDeleteStep: (stepId: string) => void;
  onUndoSoftDeleteStep: (stepId: string) => void;
  onUpdateStepVerificationStatus: (stepId: string, newStatus: VerificationStatus) => void;
  onInitiateSplitStep: (stepId: string) => void;
  onViewEditStepDetails: (stepId: string) => void;
  onRenameStep: (stepId: string, newName: string) => void;
  onInterpretIdea: (stepId: string, idea: string) => void;
  onHighlightNode: (stepId: string, color: string | null) => void;
  onAddOrUpdateNote: (stepId: string) => void;
  onNewPathFromNode: (stepId: string) => void;
  isCreatingNewPath?: boolean;
  startNewPathNodeId?: string | null;
  onSelectNewPathTargetNode?: (nodeId: string) => void;
  previewPathElements?: { nodes: string[]; edges: string[] } | null;
  onNodeMouseEnterForPathPreview?: (nodeId: string) => void;
  onNodeMouseLeaveForPathPreview?: () => void;
  onCopyNodeInfo: (stepId: string) => void;
  onCopyPathInfo: (targetNodeId: string) => void;
  onStartNewPathFromNode?: (nodeId: string) => void;
  onPaneClickFromLayout?: () => void;
  onNodeSelectedForCopilot?: (nodeId: string, nodeData: DagNodeRfData) => void;
  onInitiateFocusAnalysis: (nodeId: string, type: FocusAnalysisType) => void;
  onCancelFocusAnalysis: () => void;
  currentFocusAnalysisNodeId: string | null;
  onSetAsMainPath: (nodeId: string) => void;
  onCancelMainPath?: () => void;
  mainPathNodeId?: string | null;
  // +++ EDGE_SELECTION: Add edge selection props +++
  onEdgeSelect?: (edgeId: string | null) => void;
  onDeleteEdge?: (edgeId: string) => void;
  selectedEdgeId?: string | null;
  // +++ End EDGE_SELECTION +++
  // +++ PATH_GROUPS: Add path group connection props +++
  onPathGroupConnect?: (sourceNodeId: string, targetNodeId: string, newEdgeId: string) => void;
  // +++ End PATH_GROUPS +++
}

// Helper to get DagNodeRfData from a generic Node
const getNodeRfData = (node: Node | undefined): DagNodeRfData | undefined => {
  return node?.data as DagNodeRfData;
};

const isTerminalNode = (nodeId: string, nodes: DagNode[], edges: Edge[]): boolean => {
  const activeOutgoingEdges = edges.filter(
    edge => edge.source === nodeId &&
            !nodes.find(n => n.id === edge.target)?.data.isDeleted
  );
  return activeOutgoingEdges.length === 0;
};

const isStartNode = (nodeId: string, nodes: DagNode[], edges: Edge[]): boolean => {
  const activeIncomingEdges = edges.filter(
    edge => edge.target === nodeId &&
            !nodes.find(n => n.id === edge.source)?.data.isDeleted
  );
  return activeIncomingEdges.length === 0;
};

const isEndNode = (nodeId: string, nodes: DagNode[], edges: Edge[]): boolean => {
    if (!edges || edges.length === 0) return true; // No edges, every node is an end node
    return !edges.some(edge => edge.source === nodeId && nodes.some(n => n.id === edge.target && !n.data.isDeleted));
};

const nodeTypes: NodeTypes = {
    customStepNode: CustomStepNode,
};

const generateContextMenuItems = (
  node: Node<DagNodeRfData>,
  actions: Pick<
    DagVisualizationAreaProps,
    | 'onHighlightNode'
    | 'onAddOrUpdateNote'
    | 'onNewPathFromNode'
    | 'onCopyNodeInfo'
    | 'onCopyPathInfo'
    | 'onViewEditStepDetails'
    | 'onRenameStep'
    | 'onInitiateSplitStep'
    | 'onInterpretIdea'
    | 'onSoftDeleteStep'
    | 'onUndoSoftDeleteStep'
    | 'onUpdateStepVerificationStatus'
    | 'onInitiateFocusAnalysis'
    | 'onCancelFocusAnalysis'
    | 'onSetAsMainPath'
    | 'onCancelMainPath'
  >,
  initialNodesFromProps: DagNode[],
  currentReactFlowEdges: Edge[],
  currentFocusAnalysisNodeId: string | null,
  contextMenuRef: React.RefObject<ContextMenuHandle>,
  mainPathNodeId?: string | null
): MenuItemProps[] => {
  const menuItems: MenuItemProps[] = [];
  const nodeId = node.id;
  const nodeData = getNodeRfData(node);

  if (!nodeData) return menuItems;

  menuItems.push({
    id: 'rename-step',
    label: '重命名',
    icon: <Edit3 size={16} />,
    onClick: () => { 
      const currentLabel = nodeData.label || `步骤 ${nodeData.stepNumber}`;
      const newName = prompt('请输入新的步骤名称:', currentLabel);
      if (newName && newName.trim() && newName.trim() !== currentLabel) {
        actions.onRenameStep(nodeId, newName.trim());
      }
      contextMenuRef.current?.close(); 
    },
    disabled: nodeData.isDeleted,
  });

  menuItems.push({
    id: 'view-edit-details',
    label: '查看/编辑步骤详情',
    icon: <Eye size={16} />,
    onClick: () => { actions.onViewEditStepDetails(nodeId); contextMenuRef.current?.close(); },
    disabled: nodeData.isDeleted,
  });
  
  menuItems.push({ id: 'separator-group1', type: 'separator' });

  const hasNote = nodeData.notes && nodeData.notes.trim() !== '';
  menuItems.push({
    id: 'add-edit-note',
    label: hasNote ? '查看/编辑备注' : '添加备注',
    icon: <MessageSquare size={16} />,
    onClick: () => { actions.onAddOrUpdateNote(nodeId); contextMenuRef.current?.close(); },
    disabled: nodeData.isDeleted,
  });

  if (actions.onInitiateSplitStep) {
    menuItems.push({
      id: 'split-step',
      label: '拆分此步骤',
      icon: <GitFork size={16} />,
      onClick: () => { actions.onInitiateSplitStep(nodeId); contextMenuRef.current?.close(); },
      disabled: nodeData.isDeleted || isEndNode(nodeId, initialNodesFromProps, currentReactFlowEdges),
    });
  }
  
  menuItems.push({ id: 'separator-groupN-actions1', type: 'separator' });

  menuItems.push({
    id: 'interpret-idea',
    label: '思路解读',
    icon: <Lightbulb size={16} />,
    onClick: () => { actions.onInterpretIdea(nodeId, ''); contextMenuRef.current?.close(); },
    disabled: nodeData.isDeleted,
  });
  
  if (currentFocusAnalysisNodeId === nodeId) {
    menuItems.push({
      id: 'cancel-focus-analysis',
      label: '取消聚焦分析',
      icon: <XCircle size={16} />,
      onClick: () => { actions.onCancelFocusAnalysis(); contextMenuRef.current?.close(); },
    });
  } else {
    const focusSubItems: MenuItemProps[] = [
      { id: 'focus-forward', label: '向前路径分析', icon: <ArrowUpLeft size={16} />, onClick: () => { actions.onInitiateFocusAnalysis(nodeId, 'forward'); contextMenuRef.current?.close(); } },
      { id: 'focus-backward', label: '向后路径分析', icon: <ArrowDownRight size={16} />, onClick: () => { actions.onInitiateFocusAnalysis(nodeId, 'backward'); contextMenuRef.current?.close(); } },
      { id: 'focus-full', label: '全路径分析', icon: <Waypoints size={16} />, onClick: () => { actions.onInitiateFocusAnalysis(nodeId, 'full'); contextMenuRef.current?.close(); } },
    ];

    menuItems.push({
      id: 'focus-analysis-group',
      label: '聚焦分析',
      icon: <Search size={16} />,
      disabled: nodeData.isDeleted || !!currentFocusAnalysisNodeId,
      subMenu: focusSubItems,
    });
  }
  
  if (nodeData && !nodeData.isDeleted) {
    if (mainPathNodeId === nodeId) {
      menuItems.push({
        id: 'cancel-main-path',
        label: '取消设置主路径',
        icon: <LogOut size={16} />,
        onClick: () => {
          if (actions.onCancelMainPath) {
            actions.onCancelMainPath();
          }
          contextMenuRef.current?.close();
        },
      });
    } else {
      menuItems.push({
        id: 'set-as-main-path',
        label: '设置为主路径',
        icon: <Anchor size={16} />,
        onClick: () => {
          actions.onSetAsMainPath(nodeId);
          contextMenuRef.current?.close();
        },
      });
    }
  }

  const isCurrentlyTerminal = isTerminalNode(nodeId, initialNodesFromProps, currentReactFlowEdges);
  menuItems.push({
    id: 'new-path-from-node',
    label: '从此处开始新路径',
    icon: <GitFork size={16} />,
    onClick: () => { actions.onNewPathFromNode(nodeId); contextMenuRef.current?.close(); },
    disabled: isCurrentlyTerminal || nodeData.isDeleted, 
  });

  if (!nodeData.isDeleted) {
    if (nodeData.verificationStatus === VerificationStatus.VerifiedCorrect || nodeData.verificationStatus === VerificationStatus.VerifiedIncorrect) {
      menuItems.push({
        id: 'unmark-verified',
        label: '取消验证状态',
        icon: <XCircle size={16} />,
        onClick: () => { actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.NotVerified); contextMenuRef.current?.close(); },
      });
    } else {
      menuItems.push({
        id: 'mark-verified-correct',
        label: '标记为已验证 (正确)',
        icon: <CheckCircle size={16} color="green" />,
        onClick: () => { actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.VerifiedCorrect); contextMenuRef.current?.close(); },
      });
      menuItems.push({
        id: 'mark-verified-incorrect',
        label: '标记为已验证 (错误)',
        icon: <XCircle size={16} color="red" />,
        onClick: () => { actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.VerifiedIncorrect); contextMenuRef.current?.close(); },
      });
    }
  }

  menuItems.push({ id: 'separator-nodeactions-delete', type: 'separator' });
  if (nodeData.isDeleted) {
    menuItems.push({
      id: 'undo-soft-delete',
      label: '撤销删除',
      icon: <Trash2 size={16} />,
      onClick: () => { actions.onUndoSoftDeleteStep(nodeId); contextMenuRef.current?.close(); },
    });
  } else {
    menuItems.push({
      id: 'soft-delete',
      label: '删除此步骤',
      icon: <Trash2 size={16} />,
      onClick: () => { actions.onSoftDeleteStep(nodeId); contextMenuRef.current?.close(); },
    });
  }
  
  menuItems.push({ id: 'separator-groupN-copy', type: 'separator' });
  menuItems.push({
      id: 'copy-path-info',
      label: '复制路径信息',
      icon: <Copy size={16} />,
      onClick: () => { actions.onCopyPathInfo(nodeId); contextMenuRef.current?.close(); },
      disabled: isStartNode(nodeId, initialNodesFromProps, currentReactFlowEdges) || nodeData.isDeleted,
  });

  menuItems.push({
    id: 'copy-node-info',
    label: '复制当前信息',
    icon: <Copy size={16} />,
    onClick: () => { actions.onCopyNodeInfo(nodeId); contextMenuRef.current?.close(); },
    disabled: nodeData.isDeleted, 
  });

  menuItems.push({ id: 'separator-highlight-main', type: 'separator' });
  menuItems.push({
    id: 'highlight-actions-main',
    label: '标记高亮',
    icon: <Waypoints size={16} />,
    disabled: nodeData.isDeleted,
    subMenu: [
      {
        id: 'highlight-color-yellow',
        label: '黄色',
        onClick: () => { actions.onHighlightNode(nodeId, 'yellow'); contextMenuRef.current?.close(); },
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-blue',
        label: '蓝色',
        onClick: () => { actions.onHighlightNode(nodeId, 'dodgerblue'); contextMenuRef.current?.close(); },
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-green',
        label: '绿色',
        onClick: () => { actions.onHighlightNode(nodeId, 'lightgreen'); contextMenuRef.current?.close(); },
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-pink',
        label: '粉色',
        onClick: () => { actions.onHighlightNode(nodeId, 'lightpink'); contextMenuRef.current?.close(); },
        disabled: nodeData.isDeleted,
      },
      { id: 'highlight-submenu-separator', type: 'separator' },
      {
        id: 'highlight-action-clear',
        label: '清除高亮',
        icon: <Wand size={16} />,
        onClick: () => { actions.onHighlightNode(nodeId, null); contextMenuRef.current?.close(); },
        disabled: !nodeData.highlightColor || nodeData.isDeleted,
      },
    ],
  });

  return menuItems;
};

const DagVisualizationArea: React.FC<DagVisualizationAreaProps> = ({
  dagNodes: initialNodesFromProps,
  dagEdges: initialEdgesFromProps,
  onNodeSelect,
  onSoftDeleteStep,
  onUndoSoftDeleteStep,
  onUpdateStepVerificationStatus,
  onInitiateSplitStep,
  onViewEditStepDetails,
  onRenameStep,
  onInterpretIdea,
  onHighlightNode,
  onAddOrUpdateNote,
  onNewPathFromNode,
  isCreatingNewPath,
  startNewPathNodeId,
  onSelectNewPathTargetNode,
  previewPathElements,
  onNodeMouseEnterForPathPreview,
  onNodeMouseLeaveForPathPreview,
  onCopyNodeInfo,
  onCopyPathInfo,
  onPaneClickFromLayout,
  onNodeSelectedForCopilot,
  onInitiateFocusAnalysis,
  onCancelFocusAnalysis,
  currentFocusAnalysisNodeId,
  onSetAsMainPath,
  onCancelMainPath,
  mainPathNodeId,
  // +++ EDGE_SELECTION: Add edge selection parameters +++
  onEdgeSelect,
  onDeleteEdge,
  selectedEdgeId,
  // +++ End EDGE_SELECTION +++
  // +++ PATH_GROUPS: Add path group connection parameters +++
  onPathGroupConnect,
  // +++ End PATH_GROUPS +++
}) => {
  // --- T_FIX_LINTER_DAGAREA_STATE: Restore useNodesState and useEdgesState ---
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<DagNodeRfData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // --- End T_FIX_LINTER_DAGAREA_STATE ---
  
  const { project, fitView, getNode } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const contextMenuRef = useRef<ContextMenuHandle>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const contextMenuActions = useMemo(() => ({
    onHighlightNode,
    onAddOrUpdateNote,
    onNewPathFromNode,
    onCopyNodeInfo,
    onCopyPathInfo,
    onViewEditStepDetails,
    onRenameStep,
    onInitiateSplitStep,
    onInterpretIdea,
    onSoftDeleteStep,
    onUndoSoftDeleteStep,
    onUpdateStepVerificationStatus,
    onInitiateFocusAnalysis,
    onCancelFocusAnalysis,
    onSetAsMainPath,
    onCancelMainPath,
  }), [
    onHighlightNode,
    onAddOrUpdateNote,
    onNewPathFromNode,
    onCopyNodeInfo,
    onCopyPathInfo,
    onViewEditStepDetails,
    onRenameStep,
    onInitiateSplitStep,
    onInterpretIdea,
    onSoftDeleteStep,
    onUndoSoftDeleteStep,
    onUpdateStepVerificationStatus,
    onInitiateFocusAnalysis,
    onCancelFocusAnalysis,
    onSetAsMainPath,
    onCancelMainPath,
  ]);

  useEffect(() => {
    const reactFlowNodes: Node<DagNodeRfData>[] = initialNodesFromProps.map(appNode => ({
      id: appNode.id,
      type: appNode.type || 'customStepNode',
      position: appNode.position,
      data: {
        ...appNode.data,
        label: appNode.data.label || `步骤 ${appNode.data.stepNumber}`,
        fullLatexContent: appNode.data.fullLatexContent || '',
        verificationStatus: appNode.data.verificationStatus || VerificationStatus.NotVerified,
        stepNumber: appNode.data.stepNumber,
        isDeleted: appNode.data.isDeleted || false,
        notes: appNode.data.notes,
        highlightColor: appNode.data.highlightColor,
        isFocusPath: appNode.data.isFocusPath,
        isFocusSource: appNode.data.isFocusSource,
        isMainPathNode: appNode.data.isMainPathNode,
      },
      style: appNode.style,
      sourcePosition: appNode.sourcePosition as Position | undefined,
      targetPosition: appNode.targetPosition as Position | undefined,
    }));
    setRfNodes(reactFlowNodes);
  }, [initialNodesFromProps, setRfNodes]);

  useEffect(() => {
    const reactFlowEdges: Edge[] = initialEdgesFromProps.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type,
      animated: e.data?.isMainPathEdge || e.data?.isFocusPath || e.data?.isOnNewPath || e.animated,
      style: {
        ...e.style,
        stroke: e.data?.isMainPathEdge ? 'gold' : (e.data?.isFocusPath ? '#ff0072' : (e.data?.isOnNewPath ? '#2ecc71' : undefined)),
        strokeWidth: e.data?.isMainPathEdge ? 3 : (e.data?.isFocusPath ? 2 : (e.data?.isOnNewPath ? 2 : e.style?.strokeWidth)),
      },
      markerEnd: e.markerEnd,
      data: { ...e.data },
      zIndex: e.zIndex,
    }));
    setRfEdges(reactFlowEdges);
  }, [initialEdgesFromProps, setRfEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const newEdge = addEdge(params, rfEdges)[rfEdges.length]; // Get the newly added edge
      const newEdgeId = newEdge?.id || `edge-${Date.now()}`;
      
      setRfEdges((eds) => addEdge(params, eds));
      
      // +++ PATH_GROUPS: Notify parent about new connection for path group merging +++
      if (onPathGroupConnect && params.source && params.target) {
        onPathGroupConnect(params.source, params.target, newEdgeId);
      }
      // +++ End PATH_GROUPS +++
    },
    [setRfEdges, rfEdges, onPathGroupConnect],
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<DagNodeRfData>) => {
    if (isCreatingNewPath && onSelectNewPathTargetNode && node.id !== startNewPathNodeId) {
      onSelectNewPathTargetNode(node.id);
      return;
    }
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
    if (onNodeSelectedForCopilot && node.data) {
      onNodeSelectedForCopilot(node.id, node.data);
    }
  }, [isCreatingNewPath, onSelectNewPathTargetNode, onNodeSelect, startNewPathNodeId, onNodeSelectedForCopilot]);

  const handlePaneClickInternal = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null);
    // +++ EDGE_SELECTION: Clear edge selection on pane click +++
    if (onEdgeSelect) onEdgeSelect(null);
    // +++ End EDGE_SELECTION +++
    contextMenuRef.current?.close();

    if (onPaneClickFromLayout) {
      onPaneClickFromLayout();
    }
  }, [onNodeSelect, onEdgeSelect, contextMenuRef, onPaneClickFromLayout]);

  // +++ EDGE_SELECTION: Add edge click handler +++
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (onEdgeSelect) {
      onEdgeSelect(edge.id);
    }
  }, [onEdgeSelect]);
  // +++ End EDGE_SELECTION +++

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<DagNodeRfData>) => {
      event.preventDefault();
      if (contextMenuRef.current) {
        const items = generateContextMenuItems(
          node, 
          contextMenuActions, 
          initialNodesFromProps, 
          rfEdges,
          currentFocusAnalysisNodeId,
          contextMenuRef,
          mainPathNodeId
        );
        contextMenuRef.current.open(event.clientX, event.clientY, items, node.id);
      }
    },
    [contextMenuActions, initialNodesFromProps, rfEdges, currentFocusAnalysisNodeId, mainPathNodeId]
  );

  const handleNodeMouseEnterInternal = useCallback((event: React.MouseEvent, node: Node<DagNodeRfData>) => {
    if (isCreatingNewPath && onNodeMouseEnterForPathPreview) {
      onNodeMouseEnterForPathPreview(node.id);
    }
  }, [isCreatingNewPath, onNodeMouseEnterForPathPreview]);

  const handleNodeMouseLeaveInternal = useCallback((event: React.MouseEvent, node: Node<DagNodeRfData>) => {
    if (isCreatingNewPath && onNodeMouseLeaveForPathPreview) {
      onNodeMouseLeaveForPathPreview();
    }
  }, [isCreatingNewPath, onNodeMouseLeaveForPathPreview]);
  
  const nodesWithPreview = useMemo(() => {
    return rfNodes.map(node => {
      const isPreviewNode = previewPathElements?.nodes.includes(node.id) || false;
      return {
        ...node,
        data: {
          ...node.data,
          isPreviewingPath: isPreviewNode,
        },
      };
    });
  }, [rfNodes, previewPathElements]);

  const edgesWithPreview = useMemo(() => {
    return rfEdges.map(edge => {
      const edgeSpecificData = edge.data as DagEdge['data'];

      const isPreviewEdge = previewPathElements?.edges.includes(edge.id) || false;
      const isOnNewPath = edgeSpecificData?.isOnNewPath;
      const isFocusPathEdge = edgeSpecificData?.isFocusPath;
      // +++ EDGE_SELECTION: Check if edge is selected +++
      const isSelected = selectedEdgeId === edge.id;
      // +++ End EDGE_SELECTION +++

      let style = { ...(edge.style || {}) };
      let animated = edge.animated || false;

      // +++ EDGE_SELECTION: Priority order for edge styling +++
      if (isSelected) {
        // Selected edges have highest priority
        style = { ...style, stroke: '#ff6b35', strokeWidth: 4, strokeDasharray: '3,3' };
        animated = true;
      } else if (isFocusPathEdge) {
        style = { ...style, stroke: '#ff0072', strokeWidth: 2 };
        animated = true;
      } else if (isPreviewEdge) {
        style = { ...style, stroke: '#e74c3c', strokeDasharray: '5,5' };
        animated = true;
      } else if (isOnNewPath) {
        style = { ...style, stroke: '#2ecc71' };
        animated = true;
      } else {
        style = { ...style, stroke: edgeSpecificData?.isDeleted ? '#ccc' : undefined };
        animated = !(edgeSpecificData?.isDeleted);
      }
      // +++ End EDGE_SELECTION +++
      
      return { 
        ...edge, 
        style, 
        animated,
        data: edge.data
      };
    });
  }, [rfEdges, previewPathElements, selectedEdgeId]);

  const miniMapNodeColor = (node: Node<DagNodeRfData>): string => {
    if (node.data?.isDeleted) return '#aaaaaa';
    if (node.data?.isFocusSource) return '#1976D2';
    if (node.data?.isFocusPath) return '#FFA000';
    if (node.data?.isPreviewingPath) return '#e74c3c';
    if (node.data?.highlightColor) return node.data.highlightColor;
    if (node.data?.verificationStatus) {
      switch (node.data.verificationStatus) {
        case VerificationStatus.VerifiedCorrect: return '#4CAF50';
        case VerificationStatus.VerifiedIncorrect: return '#F44336';
        case VerificationStatus.Verifying: return '#2196F3';
        case VerificationStatus.NotVerified: return '#FFC107';
        case VerificationStatus.Error: return '#757575';
        default: return '#9e9e9e';
      }
    }
    return '#9e9e9e';
  };

  return (
    <div 
      data-testid="dag-visualization-area"
      className={`${styles.dagVisualizationAreaContainer} ${isCreatingNewPath ? styles.pathCreationMode : ''}`}
      ref={reactFlowWrapper} 
      onClick={handlePaneClickInternal}
    >
      <ReactFlow
        nodes={nodesWithPreview}
        edges={edgesWithPreview}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClickInternal}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeMouseEnter={handleNodeMouseEnterInternal}
        onNodeMouseLeave={handleNodeMouseLeaveInternal}
        // +++ EDGE_SELECTION: Add edge click handler +++
        onEdgeClick={handleEdgeClick}
        // +++ End EDGE_SELECTION +++
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#ddd" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={miniMapNodeColor}
          pannable
          zoomable
          className={styles.miniMap}
        />
      </ReactFlow>
      <ContextMenu ref={contextMenuRef} />
    </div>
  );
};

export default DagVisualizationArea;