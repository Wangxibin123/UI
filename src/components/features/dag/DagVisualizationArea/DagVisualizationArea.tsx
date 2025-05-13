import React, { useEffect, useCallback } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  // Controls, // Temporarily commented out
  // Background, // Temporarily commented out
  // MiniMap, // Temporarily commented out
  Connection,
  Edge as RFEdge,
  Node // Directly import Node from reactflow
} from '@reactflow/core';
import type { DagNode, DagEdge } from '../../../../types';
import styles from './DagVisualizationArea.module.css';

interface DagVisualizationAreaProps {
  dagNodes: DagNode[];
  dagEdges: DagEdge[];
}

const DagVisualizationArea: React.FC<DagVisualizationAreaProps> = ({ dagNodes: initialNodesFromProps, dagEdges: initialEdgesFromProps }) => {
  // Use the imported Node type directly from reactflow, with explicit generics for data and node type string.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DagNode['data'], DagNode['type']>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DagEdge>([]);

  useEffect(() => {
    // Map DagNode props to the structure expected by React Flow's Node type.
    const reactFlowNodes: Node<DagNode['data'], DagNode['type']>[] = initialNodesFromProps.map(n => ({
      id: n.id,
      position: n.position,
      data: n.data, 
      type: n.type,
    }));
    setNodes(reactFlowNodes);
  }, [initialNodesFromProps, setNodes]);

  useEffect(() => {
    setEdges(initialEdgesFromProps.map(e => ({ ...e })));
  }, [initialEdgesFromProps, setEdges]);

  const onConnect = useCallback(
    (params: Connection | RFEdge) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  return (
    <div className={styles.dagVisualizationAreaContainer} style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        {/* <Controls /> */}
        {/* <MiniMap /> */}
        {/* <Background variant="dots" gap={12} size={1} /> */}
      </ReactFlow>
    </div>
  );
};

export default DagVisualizationArea; 