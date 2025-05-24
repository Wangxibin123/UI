import { DagNode, DagEdge, PathGroup } from '../types';

/**
 * 检测DAG中的连通路径组合
 * 使用深度优先搜索找出所有连通分量
 */
export const detectPathGroups = (nodes: DagNode[], edges: DagEdge[]): PathGroup[] => {
  const visited = new Set<string>();
  const pathGroups: PathGroup[] = [];
  
  // 构建邻接表，包括双向连接
  const adjacencyList = new Map<string, string[]>();
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });
  
  edges.forEach(edge => {
    if (!edge.data?.isDeleted) {
      // 添加双向连接以形成无向图
      adjacencyList.get(edge.source)?.push(edge.target);
      adjacencyList.get(edge.target)?.push(edge.source);
    }
  });
  
  // DFS 查找连通分量
  const dfs = (nodeId: string, groupNodes: string[], groupEdges: string[]) => {
    visited.add(nodeId);
    groupNodes.push(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        // 找到连接这两个节点的边
        const connectingEdge = edges.find(edge => 
          (edge.source === nodeId && edge.target === neighbor) ||
          (edge.source === neighbor && edge.target === nodeId)
        );
        if (connectingEdge && !connectingEdge.data?.isDeleted) {
          groupEdges.push(connectingEdge.id);
        }
        
        dfs(neighbor, groupNodes, groupEdges);
      }
    });
  };
  
  // 为每个未访问的节点创建新的路径组合
  nodes.forEach(node => {
    if (!visited.has(node.id) && !node.data.isDeleted) {
      const groupNodes: string[] = [];
      const groupEdges: string[] = [];
      
      dfs(node.id, groupNodes, groupEdges);
      
      if (groupNodes.length > 0) {
        const startNodeId = findStartNode(groupNodes, edges);
        const endNodeId = findEndNode(groupNodes, edges);
        
        const pathGroup: PathGroup = {
          id: `group-${pathGroups.length + 1}`,
          nodeIds: groupNodes,
          edgeIds: groupEdges,
          isMainPath: false, // 将由外部逻辑设置
          startNodeId,
          endNodeId,
        };
        
        pathGroups.push(pathGroup);
      }
    }
  });
  
  return pathGroups;
};

/**
 * 找到路径组合中的起始节点（入度为0的节点）
 */
const findStartNode = (nodeIds: string[], edges: DagEdge[]): string => {
  for (const nodeId of nodeIds) {
    const hasIncomingEdge = edges.some(edge => 
      edge.target === nodeId && 
      nodeIds.includes(edge.source) &&
      !edge.data?.isDeleted
    );
    if (!hasIncomingEdge) {
      return nodeId;
    }
  }
  return nodeIds[0]; // 如果找不到，返回第一个节点
};

/**
 * 找到路径组合中的终点节点（出度为0的节点）
 */
const findEndNode = (nodeIds: string[], edges: DagEdge[]): string => {
  for (const nodeId of nodeIds) {
    const hasOutgoingEdge = edges.some(edge => 
      edge.source === nodeId && 
      nodeIds.includes(edge.target) &&
      !edge.data?.isDeleted
    );
    if (!hasOutgoingEdge) {
      return nodeId;
    }
  }
  return nodeIds[nodeIds.length - 1]; // 如果找不到，返回最后一个节点
};

/**
 * 获取主路径上从起始到终点的连通步骤
 * 这用于确定中间栏显示哪些步骤
 */
export const getMainPathSteps = (
  mainPathGroupId: string | null,
  pathGroups: PathGroup[],
  nodes: DagNode[],
  edges: DagEdge[]
): string[] => {
  if (!mainPathGroupId) return [];
  
  const mainGroup = pathGroups.find(group => group.id === mainPathGroupId);
  if (!mainGroup) return [];
  
  console.log('Main group found:', mainGroup);
  console.log('Available edges for path calculation:', edges.length);
  
  // 从起始节点开始，找到连通的所有节点（基于实际边连接）
  const connectedNodes = findConnectedNodesFromStart(mainGroup.startNodeId, mainGroup.nodeIds, edges);
  
  console.log('Connected nodes from start:', connectedNodes);
  
  // 对连通的节点进行拓扑排序
  const sortedNodes = topologicalSort(connectedNodes, edges);
  
  console.log('Sorted main path steps:', sortedNodes);
  
  return sortedNodes;
};

/**
 * 从起始节点开始，找到所有可达的节点
 */
const findConnectedNodesFromStart = (startNodeId: string, groupNodeIds: string[], edges: DagEdge[]): string[] => {
  const visited = new Set<string>();
  const connectedNodes: string[] = [];
  
  const dfs = (nodeId: string) => {
    if (visited.has(nodeId) || !groupNodeIds.includes(nodeId)) {
      return;
    }
    
    visited.add(nodeId);
    connectedNodes.push(nodeId);
    
    // 查找从当前节点出发的所有有效边
    const outgoingEdges = edges.filter(edge => 
      edge.source === nodeId && 
      groupNodeIds.includes(edge.target) &&
      !edge.data?.isDeleted
    );
    
    outgoingEdges.forEach(edge => {
      dfs(edge.target);
    });
  };
  
  dfs(startNodeId);
  return connectedNodes;
};

/**
 * 对节点进行拓扑排序
 */
const topologicalSort = (nodeIds: string[], edges: DagEdge[]): string[] => {
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();
  
  // 初始化
  nodeIds.forEach(nodeId => {
    inDegree.set(nodeId, 0);
    adjacencyList.set(nodeId, []);
  });
  
  // 计算入度和邻接表
  edges.forEach(edge => {
    if (nodeIds.includes(edge.source) && 
        nodeIds.includes(edge.target) &&
        !edge.data?.isDeleted) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      adjacencyList.get(edge.source)?.push(edge.target);
    }
  });
  
  // Kahn算法进行拓扑排序
  const queue: string[] = [];
  const result: string[] = [];
  
  // 找到所有入度为0的节点
  nodeIds.forEach(nodeId => {
    if (inDegree.get(nodeId) === 0) {
      queue.push(nodeId);
    }
  });
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    const neighbors = adjacencyList.get(current) || [];
    neighbors.forEach(neighbor => {
      const newInDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newInDegree);
      
      if (newInDegree === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  return result;
};

/**
 * 为路径组合生成自动布局位置
 */
export const generatePathGroupLayout = (
  pathGroups: PathGroup[],
  nodes: DagNode[]
): PathGroup[] => {
  const updatedGroups = [...pathGroups];
  
  // 主路径放在最左侧
  const mainGroupIndex = updatedGroups.findIndex(group => group.isMainPath);
  let currentX = 50; // 起始X位置
  const groupSpacing = 300; // 组间距离
  
  // 先布局主路径
  if (mainGroupIndex !== -1) {
    const mainGroup = updatedGroups[mainGroupIndex];
    updatedGroups[mainGroupIndex] = {
      ...mainGroup,
      layoutPosition: { x: currentX, y: 50 }
    };
    currentX += groupSpacing;
  }
  
  // 然后布局其他路径组合
  updatedGroups.forEach((group, index) => {
    if (index !== mainGroupIndex) {
      updatedGroups[index] = {
        ...group,
        layoutPosition: { x: currentX, y: 50 }
      };
      currentX += groupSpacing;
    }
  });
  
  return updatedGroups;
};

/**
 * 应用路径组合布局到节点位置
 */
export const applyPathGroupLayoutToNodes = (
  nodes: DagNode[],
  pathGroups: PathGroup[]
): DagNode[] => {
  const updatedNodes = [...nodes];
  
  pathGroups.forEach(group => {
    if (group.layoutPosition) {
      const groupNodes = group.nodeIds;
      groupNodes.forEach((nodeId, index) => {
        const nodeIndex = updatedNodes.findIndex(node => node.id === nodeId);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            position: {
              x: group.layoutPosition!.x,
              y: group.layoutPosition!.y + index * 120 // 节点间垂直间距
            }
          };
        }
      });
    }
  });
  
  return updatedNodes;
};

/**
 * 检查两个路径组合是否可以连接
 */
export const canConnectPathGroups = (
  sourceGroupId: string,
  targetGroupId: string,
  sourceNodeId: string,
  targetNodeId: string,
  pathGroups: PathGroup[],
  nodes: DagNode[],
  edges: DagEdge[]
): boolean => {
  if (sourceGroupId === targetGroupId) {
    return false; // 不能连接同一个组合内的节点
  }
  
  const sourceGroup = pathGroups.find(g => g.id === sourceGroupId);
  const targetGroup = pathGroups.find(g => g.id === targetGroupId);
  
  if (!sourceGroup || !targetGroup) return false;
  
  // 检查连接点约束：每个点只能有一个连接
  const sourceNodeConnections = edges.filter(edge => 
    edge.source === sourceNodeId || edge.target === sourceNodeId
  );
  const targetNodeConnections = edges.filter(edge => 
    edge.source === targetNodeId || edge.target === targetNodeId
  );
  
  // 检查源节点是否是其组合的末尾节点
  const isSourceEndNode = sourceNodeId === sourceGroup.endNodeId;
  // 检查目标节点是否是其组合的起始节点
  const isTargetStartNode = targetNodeId === targetGroup.startNodeId;
  
  return isSourceEndNode && isTargetStartNode;
};

/**
 * 合并两个路径组合
 */
export const mergePathGroups = (
  sourceGroupId: string,
  targetGroupId: string,
  pathGroups: PathGroup[],
  newEdgeId: string
): PathGroup[] => {
  const sourceGroup = pathGroups.find(g => g.id === sourceGroupId);
  const targetGroup = pathGroups.find(g => g.id === targetGroupId);
  
  if (!sourceGroup || !targetGroup) return pathGroups;
  
  // 创建合并后的新组合
  const mergedGroup: PathGroup = {
    id: sourceGroup.isMainPath ? sourceGroup.id : targetGroup.isMainPath ? targetGroup.id : sourceGroup.id,
    nodeIds: [...sourceGroup.nodeIds, ...targetGroup.nodeIds],
    edgeIds: [...sourceGroup.edgeIds, ...targetGroup.edgeIds, newEdgeId],
    isMainPath: sourceGroup.isMainPath || targetGroup.isMainPath,
    startNodeId: sourceGroup.startNodeId,
    endNodeId: targetGroup.endNodeId,
    layoutPosition: sourceGroup.isMainPath ? sourceGroup.layoutPosition : targetGroup.layoutPosition
  };
  
  // 移除原有的两个组合，添加新的合并组合
  return pathGroups
    .filter(g => g.id !== sourceGroupId && g.id !== targetGroupId)
    .concat(mergedGroup);
}; 