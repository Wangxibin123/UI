import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  type Position
} from '@reactflow/core';
import { Controls } from '@reactflow/controls';
import { Background, BackgroundVariant } from '@reactflow/background';
import { MiniMap } from '@reactflow/minimap';
import type { DagNode, DagEdge, DagNodeRfData, SolutionStepData } from '../../../../types';
import { VerificationStatus } from '../../../../types';
import styles from './DagVisualizationArea.module.css';
import CustomStepNode from '../CustomStepNode/CustomStepNode';
import ContextMenu, { type ContextMenuHandle } from '../../../common/ContextMenu/ContextMenu';
import { type MenuItemProps } from '../../../common/MenuItem/MenuItem';
import { Lightbulb, Star, FileText, GitFork, Trash2, CheckCircle, XCircle, Edit3, MessageSquarePlus, Copy, CopyPlus, ClipboardCopy, GitBranchPlus, Palette, Eraser } from 'lucide-react';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  onSoftDeleteStep: (stepId: string) => void;
  onUndoSoftDeleteStep: (stepId: string) => void;
  onUpdateStepVerificationStatus: (stepId: string, newStatus: VerificationStatus) => void;
  onInitiateSplitStep: (stepId: string) => void;
  onAnalyzeStep: (stepId: string) => void;
  onViewEditStepDetails: (stepId: string) => void;
  onInterpretIdea: (stepId: string, idea: string) => void;
  onHighlightNode: (stepId: string, color: string | null) => void;
  onAddOrUpdateNote: (stepId: string) => void;
  onNewPathFromNode: (stepId: string) => void;
  onStartNewPathFromNode?: (nodeId: string) => void;
  isCreatingNewPath?: boolean;
  onSelectNewPathTargetNode?: (nodeId: string) => void;
  onCopyNodeInfo: (stepId: string) => void;
  onCopyPathInfo: (targetNodeId: string) => void;
}

const isTerminalNode = (nodeId: string, nodes: DagNode[], edges: RFEdge[]): boolean => {
  const activeOutgoingEdges = edges.filter(
    edge => edge.source === nodeId &&
            !nodes.find(n => n.id === edge.target)?.data.isDeleted
  );
  return activeOutgoingEdges.length === 0;
};

const isStartNode = (nodeId: string, nodes: DagNode[], edges: RFEdge[]): boolean => {
  const activeIncomingEdges = edges.filter(
    edge => edge.target === nodeId &&
            !nodes.find(n => n.id === edge.source)?.data.isDeleted
  );
  return activeIncomingEdges.length === 0;
};

const isEndNode = (nodeId: string, nodes: DagNode[], edges: RFEdge[]): boolean => {
    if (!edges || edges.length === 0) return true; // No edges, every node is an end node
    return !edges.some(edge => edge.source === nodeId && nodes.some(n => n.id === edge.target && !n.data.isDeleted));
};

const generateContextMenuItems = (
  node: RFNode<DagNodeRfData>,
  actions: Pick<
    DagVisualizationAreaProps,
    'onHighlightNode'
    | 'onAddOrUpdateNote'
    | 'onNewPathFromNode'
    | 'onCopyNodeInfo'
    | 'onCopyPathInfo'
    | 'onViewEditStepDetails'
    | 'onInitiateSplitStep'
    | 'onAnalyzeStep'
    | 'onInterpretIdea'
    | 'onSoftDeleteStep'
    | 'onUndoSoftDeleteStep'
    | 'onUpdateStepVerificationStatus'
  >,
  initialNodesFromProps: DagNode[],
  currentReactFlowEdges: RFEdge[]
): MenuItemProps[] => {
  const menuItems: MenuItemProps[] = [];
  const nodeId = node.id;
  const nodeData = node.data;

  if (!nodeData) return menuItems;

  menuItems.push({
    id: 'view-edit-details',
    label: '查看/编辑步骤详情',
    icon: <FileText size={16} />,
    onClick: () => actions.onViewEditStepDetails(nodeId),
    disabled: nodeData.isDeleted,
  });
  
  menuItems.push({ id: 'separator-group1', type: 'separator' });

  const hasNote = nodeData.notes && nodeData.notes.trim() !== '';
  menuItems.push({
    id: 'add-edit-note',
    label: hasNote ? '查看/编辑备注' : '添加备注',
    icon: <MessageSquarePlus size={16} />,
    onClick: () => actions.onAddOrUpdateNote(nodeId),
    disabled: nodeData.isDeleted,
  });

  if (actions.onInitiateSplitStep) {
    menuItems.push({
      id: 'split-step',
      label: '拆分此步骤',
      icon: <GitFork size={16} />,
      onClick: () => actions.onInitiateSplitStep(nodeId),
      disabled: nodeData.isDeleted || isEndNode(nodeId, initialNodesFromProps, currentReactFlowEdges),
    });
  }
  
  menuItems.push({ id: 'separator-groupN-actions1', type: 'separator' });

  menuItems.push({
    id: 'interpret-idea',
    label: '思路解读',
    icon: <Lightbulb size={16} />,
    onClick: () => actions.onInterpretIdea(nodeId, ''),
    disabled: nodeData.isDeleted,
  });

  menuItems.push({
    id: 'analyze-step-from-menu',
    label: '聚焦分析',
    icon: <MessageSquarePlus size={16} />,
    onClick: () => actions.onAnalyzeStep(nodeId),
    disabled: nodeData.isDeleted,
  });
  
  const isCurrentlyTerminal = isTerminalNode(nodeId, initialNodesFromProps, currentReactFlowEdges);
  menuItems.push({
    id: 'new-path-from-node',
    label: '从此处开始新路径',
    icon: <GitBranchPlus size={16} />,
    onClick: () => actions.onNewPathFromNode(nodeId),
    disabled: isCurrentlyTerminal || nodeData.isDeleted, 
  });

  if (!nodeData.isDeleted) {
    if (nodeData.verificationStatus === VerificationStatus.VerifiedCorrect || nodeData.verificationStatus === VerificationStatus.VerifiedIncorrect) {
      menuItems.push({
        id: 'unmark-verified',
        label: '取消验证状态',
        icon: <XCircle size={16} />,
        onClick: () => actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.NotVerified),
      });
    } else {
      menuItems.push({
        id: 'mark-verified-correct',
        label: '标记为已验证 (正确)',
        icon: <CheckCircle size={16} color="green" />,
        onClick: () => actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.VerifiedCorrect),
      });
      menuItems.push({
        id: 'mark-verified-incorrect',
        label: '标记为已验证 (错误)',
        icon: <XCircle size={16} color="red" />,
        onClick: () => actions.onUpdateStepVerificationStatus(nodeId, VerificationStatus.VerifiedIncorrect),
      });
    }
  }

  menuItems.push({ id: 'separator-nodeactions-delete', type: 'separator' });
  if (nodeData.isDeleted) {
    menuItems.push({
      id: 'undo-soft-delete',
      label: '撤销删除',
      icon: <Trash2 size={16} />,
      onClick: () => actions.onUndoSoftDeleteStep(nodeId),
    });
  } else {
    menuItems.push({
      id: 'soft-delete',
      label: '删除此步骤',
      icon: <Trash2 size={16} />,
      onClick: () => actions.onSoftDeleteStep(nodeId),
    });
  }
  
  menuItems.push({ id: 'separator-groupN-copy', type: 'separator' });
  menuItems.push({
      id: 'copy-path-info',
      label: '复制路径信息',
      icon: <CopyPlus size={16} />,
      onClick: () => actions.onCopyPathInfo(nodeId),
      disabled: isStartNode(nodeId, initialNodesFromProps, currentReactFlowEdges) || nodeData.isDeleted,
  });

  menuItems.push({
    id: 'copy-node-info',
    label: '复制当前信息',
    icon: <ClipboardCopy size={18} />,
    onClick: () => actions.onCopyNodeInfo(nodeId),
    disabled: nodeData.isDeleted, 
  });

  menuItems.push({ id: 'separator-highlight-main', type: 'separator' });
  menuItems.push({
    id: 'highlight-actions-main',
    label: '标记高亮',
    icon: <Palette size={16} />,
    disabled: nodeData.isDeleted,
    subMenu: [
      {
        id: 'highlight-color-yellow',
        label: '黄色',
        onClick: () => actions.onHighlightNode(nodeId, 'yellow'),
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-blue',
        label: '蓝色',
        onClick: () => actions.onHighlightNode(nodeId, 'dodgerblue'),
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-green',
        label: '绿色',
        onClick: () => actions.onHighlightNode(nodeId, 'lightgreen'),
        disabled: nodeData.isDeleted,
      },
      {
        id: 'highlight-color-pink',
        label: '粉色',
        onClick: () => actions.onHighlightNode(nodeId, 'lightpink'),
        disabled: nodeData.isDeleted,
      },
      { id: 'highlight-submenu-separator', type: 'separator' },
      {
        id: 'highlight-action-clear',
        label: '清除高亮',
        icon: <Eraser size={16} />,
        onClick: () => actions.onHighlightNode(nodeId, null),
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
  onAnalyzeStep,
  onViewEditStepDetails,
  onInterpretIdea,
  onHighlightNode,
  onAddOrUpdateNote,
  onNewPathFromNode,
  onStartNewPathFromNode,
  isCreatingNewPath,
  onSelectNewPathTargetNode,
  onCopyNodeInfo,
  onCopyPathInfo,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<DagNodeRfData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const contextMenuRef = useRef<ContextMenuHandle>(null);
  const dagAreaRef = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo(() => ({
    customStepNode: CustomStepNode,
  }), []);

  // Memoize the actions object to stabilize it for generateContextMenuItems
  const contextMenuActions = useMemo(() => ({
    onHighlightNode,
    onAddOrUpdateNote,
    onNewPathFromNode,
    onCopyNodeInfo,
    onCopyPathInfo,
    onViewEditStepDetails,
    onInitiateSplitStep,
    onAnalyzeStep,
    onInterpretIdea,
    onSoftDeleteStep,
    onUndoSoftDeleteStep,
    onUpdateStepVerificationStatus,
  }), [
    onHighlightNode, onAddOrUpdateNote, onNewPathFromNode, onCopyNodeInfo, onCopyPathInfo,
    onViewEditStepDetails, onInitiateSplitStep, onAnalyzeStep, onInterpretIdea,
    onSoftDeleteStep, onUndoSoftDeleteStep, onUpdateStepVerificationStatus
  ]);

  useEffect(() => {
    const reactFlowNodes: RFNode<DagNodeRfData>[] = initialNodesFromProps.map(appNode => ({
      id: appNode.id,
      type: appNode.type,
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
      },
      style: appNode.style,
      sourcePosition: appNode.sourcePosition as Position | undefined,
      targetPosition: appNode.targetPosition as Position | undefined,
    }));
    setNodes(reactFlowNodes);
  }, [initialNodesFromProps, setNodes]);

  useEffect(() => {
    const reactFlowEdges: RFEdge[] = initialEdgesFromProps.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type,
      animated: e.animated,
      style: e.style,
      markerEnd: e.markerEnd,
    }));
    setEdges(reactFlowEdges);
  }, [initialEdgesFromProps, setEdges]);

  const onConnect = useCallback(
    (params: Connection | RFEdge) =>
      setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: RFNode<DagNodeRfData>) => {
    if (isCreatingNewPath && onSelectNewPathTargetNode) {
      onSelectNewPathTargetNode(node.id);
      return;
    }
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
    console.log('Node clicked:', node);
  }, [isCreatingNewPath, onSelectNewPathTargetNode, onNodeSelect]);

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
    contextMenuRef.current?.close();
  }, [onNodeSelect]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode<DagNodeRfData>) => {
      event.preventDefault();
      if (contextMenuRef.current) {
        const items = generateContextMenuItems(node, contextMenuActions, initialNodesFromProps, edges);
        contextMenuRef.current.open(event.clientX, event.clientY, items, node.id);
      }
    },
    [contextMenuActions, initialNodesFromProps, edges]
  );

  const miniMapNodeColor = (node: RFNode<DagNodeRfData>): string => {
    if (node.data?.isDeleted) return '#aaaaaa';
    if (node.data?.highlightColor) return node.data.highlightColor;
    if (node.data?.verificationStatus) {
      switch (node.data.verificationStatus) {
        case VerificationStatus.VerifiedCorrect:
          return '#4CAF50';
        case VerificationStatus.VerifiedIncorrect:
          return '#F44336';
        case VerificationStatus.Verifying:
            return '#2196F3';
        case VerificationStatus.NotVerified:
          return '#FFC107';
        case VerificationStatus.Error:
            return '#757575';
        default:
          return '#9e9e9e';
      }
    }
    return '#9e9e9e';
  };

  return (
    <div
      ref={dagAreaRef}
      className={styles.dagVisualizationAreaContainer}
      style={{ height: '100%', width: '100%' }}
    >
      {nodes.length === 0 && initialNodesFromProps.length === 0 && (
        <div className={styles.emptyDagMessage}>
          <p>添加解题步骤后，相关的流程图将在此处展示。</p>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
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