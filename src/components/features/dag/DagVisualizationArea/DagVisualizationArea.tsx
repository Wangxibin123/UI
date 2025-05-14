import React, { useEffect, useCallback, useMemo } from 'react';
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
import type { DagNode, DagEdge, DagNodeRfData } from '../../../../types';
import { VerificationStatus } from '../../../../types';
import styles from './DagVisualizationArea.module.css';
import CustomStepNode from '../CustomStepNode/CustomStepNode';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
}

const DagVisualizationArea: React.FC<DagVisualizationAreaProps> = ({
  dagNodes: initialNodesFromProps,
  dagEdges: initialEdgesFromProps,
  onNodeSelect,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<DagNodeRfData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({
    customStepNode: CustomStepNode,
  }), []);

  useEffect(() => {
    const reactFlowNodes: RFNode<DagNodeRfData>[] = initialNodesFromProps.map(appNode => ({
      id: appNode.id,
      type: appNode.type,
      position: appNode.position,
      data: appNode.data,
      style: appNode.style,
      sourcePosition: appNode.sourcePosition as Position | undefined,
      targetPosition: appNode.targetPosition as Position | undefined,
    }));
    setNodes(reactFlowNodes);
  }, [initialNodesFromProps, setNodes]);

  useEffect(() => {
    setEdges(initialEdgesFromProps.map(e => ({ ...e } as RFEdge)));
  }, [initialEdgesFromProps, setEdges]);

  const onConnect = useCallback(
    (params: Connection | RFEdge) =>
      setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: RFNode<DagNodeRfData>) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const miniMapNodeColor = (node: RFNode<DagNodeRfData>): string => {
    if (node.data?.verificationStatus) {
      switch (node.data.verificationStatus) {
        case VerificationStatus.VerifiedCorrect:
          return '#4CAF50'; // Green
        case VerificationStatus.VerifiedIncorrect:
          return '#F44336'; // Red
        case VerificationStatus.NotVerified:
          return '#FFC107'; // Amber/Yellow
        case VerificationStatus.Verifying:
          return '#2196F3'; // Blue
        default:
          return '#9e9e9e'; // Grey for other cases
      }
    }
    return '#9e9e9e'; // Default Grey
  };

  return (
    <div
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
    </div>
  );
};

export default DagVisualizationArea;