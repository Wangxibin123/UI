import React, { useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  Position,
} from '@reactflow/core';
import type { DagNode, DagEdge, DagNodeRfData } from '../../../../types';
import styles from './DagVisualizationArea.module.css';
import CustomStepNode from '../CustomStepNode/CustomStepNode';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
}

const DagVisualizationArea: React.FC<DagVisualizationAreaProps> = ({
  dagNodes: initialNodesFromProps,
  dagEdges: initialEdgesFromProps,
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

  return (
    <div
      className={styles.dagVisualizationAreaContainer}
      style={{ height: '100%', width: '100%' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      />
    </div>
  );
};

export default DagVisualizationArea;