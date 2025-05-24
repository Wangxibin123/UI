import React from 'react';
import { PathGroup } from '../../../types';
import styles from './PathGroupIndicator.module.css';

interface PathGroupIndicatorProps {
  pathGroups: PathGroup[];
  mainPathGroupId: string | null;
  onSetMainPath: (groupId: string) => void;
}

const PathGroupIndicator: React.FC<PathGroupIndicatorProps> = ({
  pathGroups,
  mainPathGroupId,
  onSetMainPath,
}) => {
  if (pathGroups.length <= 1) {
    return null; // 只有一个或没有路径组合时不显示
  }

  return (
    <div className={styles.pathGroupIndicator}>
      <div className={styles.header}>
        <span className={styles.title}>路径组合</span>
        <span className={styles.count}>{pathGroups.length} 个路径</span>
      </div>
      
      <div className={styles.groupsList}>
        {pathGroups.map((group, index) => (
          <div
            key={group.id}
            className={`${styles.groupItem} ${group.isMainPath ? styles.mainPath : ''}`}
            onClick={() => !group.isMainPath && onSetMainPath(group.id)}
          >
            <div className={styles.groupInfo}>
              <span className={styles.groupName}>
                路径 {index + 1}
                {group.isMainPath && <span className={styles.mainBadge}>主路径</span>}
              </span>
              <span className={styles.nodeCount}>{group.nodeIds.length} 步骤</span>
            </div>
            
            <div className={styles.groupPreview}>
              <div className={styles.nodeChain}>
                {group.nodeIds.slice(0, 3).map((nodeId, nodeIndex) => (
                  <div key={nodeId} className={styles.nodePreview}>
                    {nodeIndex + 1}
                  </div>
                ))}
                {group.nodeIds.length > 3 && (
                  <div className={styles.moreNodes}>+{group.nodeIds.length - 3}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.hint}>
        点击非主路径可切换为主路径显示
      </div>
    </div>
  );
};

export default PathGroupIndicator; 