import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, ArrowLeft, HardDrive, FileText, Clock, Users } from 'lucide-react';
import { clearAllPersistedData, getStorageUsage } from '../../../utils/persistence';
import { toast } from 'react-toastify';
import styles from './DataManagement.module.css';

interface DataManagementProps {
  onBack: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onBack }) => {
  const [storageUsage, setStorageUsage] = useState<{ [key: string]: number }>({});
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadStorageUsage = () => {
    const usage = getStorageUsage();
    setStorageUsage(usage);
  };

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalUsage = (): number => {
    return Object.values(storageUsage).reduce((total, size) => total + size, 0);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      clearAllPersistedData();
      toast.success('所有持久化数据已清除！页面将在3秒后刷新。');
      
      // 3秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('清除数据时出错:', error);
      toast.error('清除数据时出错，请重试');
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
    }
  };

  const storageItems = [
    {
      key: 'DAG_PAGE_STATE',
      name: 'DAG 页面数据',
      description: '包含所有 DAG 页面、解题步骤和验证状态',
      icon: <Database size={20} />,
      color: '#3b82f6'
    },
    {
      key: 'PROBLEM_DATA',
      name: '题目数据',
      description: '当前题目的内容和元数据',
      icon: <FileText size={20} />,
      color: '#10b981'
    },
    {
      key: 'VERSION_HISTORY',
      name: '版本历史',
      description: '解题步骤的编辑历史记录',
      icon: <Clock size={20} />,
      color: '#f59e0b'
    },
    {
      key: 'INTERPRETATION_STATE',
      name: '解释状态',
      description: '思路解读和分析数据',
      icon: <Users size={20} />,
      color: '#8b5cf6'
    },
    {
      key: 'SUMMARY_CONTENT',
      name: '解答总结',
      description: '解题过程的总结内容',
      icon: <FileText size={20} />,
      color: '#06b6d4'
    },
    {
      key: 'AI_ANALYSIS_DATA',
      name: 'AI解析数据',
      description: '解题框中的AI解析内容',
      icon: <Database size={20} />,
      color: '#ec4899'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          <ArrowLeft size={20} />
          返回
        </button>
        <h2 className={styles.title}>
          <Database size={24} />
          数据管理
        </h2>
      </div>

      <div className={styles.content}>
        {/* 总体使用情况 */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <HardDrive size={24} className={styles.summaryIcon} />
            <div>
              <h3>存储使用情况</h3>
              <p>本地存储中的应用数据</p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatBytes(getTotalUsage())}</span>
              <span className={styles.statLabel}>总使用量</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{Object.keys(storageUsage).length}</span>
              <span className={styles.statLabel}>数据类型</span>
            </div>
          </div>
        </div>

        {/* 详细存储项目 */}
        <div className={styles.storageItems}>
          <h3>存储详情</h3>
          {storageItems.map((item) => (
            <div key={item.key} className={styles.storageItem}>
              <div className={styles.itemIcon} style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className={styles.itemInfo}>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
              </div>
              <div className={styles.itemSize}>
                {formatBytes(storageUsage[item.key] || 0)}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <button 
            onClick={loadStorageUsage} 
            className={styles.refreshButton}
            title="刷新存储使用情况"
          >
            <RefreshCw size={18} />
            刷新
          </button>
          
          <button 
            onClick={() => setShowConfirmDialog(true)} 
            className={styles.clearButton}
            disabled={isClearing}
            title="清除所有持久化数据"
          >
            <Trash2 size={18} />
            {isClearing ? '清除中...' : '清除所有数据'}
          </button>
        </div>

        {/* 确认对话框 */}
        {showConfirmDialog && (
          <div className={styles.confirmDialog}>
            <div className={styles.dialogContent}>
              <h3>确认清除数据</h3>
              <p>
                此操作将清除所有本地存储的数据，包括：
              </p>
              <ul>
                <li>所有 DAG 页面和解题步骤</li>
                <li>题目数据和验证状态</li>
                <li>版本历史记录</li>
                <li>解释和分析数据</li>
                <li>解答总结内容</li>
                <li>AI解析数据</li>
              </ul>
              <p className={styles.warning}>
                <strong>此操作不可撤销！</strong>页面将在清除后自动刷新。
              </p>
              <div className={styles.dialogActions}>
                <button 
                  onClick={() => setShowConfirmDialog(false)}
                  className={styles.cancelButton}
                >
                  取消
                </button>
                <button 
                  onClick={handleClearAllData}
                  className={styles.confirmButton}
                  disabled={isClearing}
                >
                  {isClearing ? '清除中...' : '确认清除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 说明信息 */}
        <div className={styles.infoCard}>
          <h4>关于数据持久化</h4>
          <p>
            应用使用浏览器的本地存储（localStorage）来保存您的工作进度。
            这些数据仅存储在您的设备上，不会上传到服务器。
          </p>
          <p>
            如果您遇到数据相关的问题，可以尝试清除所有数据来重置应用状态。
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataManagement; 