import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge as RFEdge,
} from '@reactflow/core';
import type { DagNode, DagEdge } from '../../../../types';
import styles from './DagVisualizationArea.module.css';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
}

const DagVisualizationArea: React.FC<DagVisualizationAreaProps> = ({
  dagNodes: initialNodesFromProps,
  dagEdges: initialEdgesFromProps,
}) => {
  /** 这里直接用 DagNode / DagEdge，而不是 Node<Node<…>> */
  const [nodes, setNodes, onNodesChange] = useNodesState<DagNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DagEdge>([]);

  /** 同步 props → 本地状态 */
  useEffect(() => {
    setNodes(initialNodesFromProps.map(n => ({ ...n })));
  }, [initialNodesFromProps, setNodes]); // setNodes 加入依赖数组可能引起循环，通常不需要

  useEffect(() => {
    setEdges(initialEdgesFromProps.map(e => ({ ...e })));
  }, [initialEdgesFromProps, setEdges]); // setEdges 加入依赖数组可能引起循环

  /** 处理连线 */
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
        fitView
        attributionPosition="bottom-left"
      />
    </div>
  );
};

export default DagVisualizationArea;