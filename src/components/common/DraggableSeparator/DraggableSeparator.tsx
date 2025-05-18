import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './DraggableSeparator.module.css';

interface DraggableSeparatorProps {
  orientation: 'vertical'; // 目前仅支持垂直方向
  onDragStart?: () => void;
  onDrag: (delta: { dx: number; dy: number }) => void;
  onDragEnd?: () => void;
  className?: string;
}

const DraggableSeparator: React.FC<DraggableSeparatorProps> = ({
  orientation,
  onDragStart,
  onDrag,
  onDragEnd,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const separatorRef = useRef<HTMLDivElement>(null);
  // 存储上一次鼠标事件的客户端X, Y坐标，用于计算拖动增量
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault(); // 阻止默认行为，如文本选择
    event.stopPropagation(); // 停止事件冒泡

    setIsDragging(true);
    // 记录当前鼠标位置作为下一次计算delta的起点
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };

    if (onDragStart) {
      onDragStart();
    }

    // 改变整个文档的鼠标指针样式，提供拖动反馈
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
  }, [onDragStart, orientation]);

  // 这个函数将在 document 上监听 mousemove 事件
  const handleDocumentMouseMove = useCallback((event: MouseEvent) => {
    // 确保确实在拖动状态且有上一次的鼠标位置记录
    if (!isDragging || !lastMousePosRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const dx = event.clientX - lastMousePosRef.current.x;
    const dy = event.clientY - lastMousePosRef.current.y;

    onDrag({ dx, dy });

    // 更新上一次鼠标位置，为下一次 delta 计算做准备
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };

  }, [isDragging, onDrag]);

  // 这个函数将在 document 上监听 mouseup 事件
  const handleDocumentMouseUp = useCallback((event: MouseEvent) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
    lastMousePosRef.current = null; // 清除位置记录
    document.body.style.cursor = 'auto'; // 恢复默认鼠标指针

    if (onDragEnd) {
      onDragEnd();
    }
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    // 当 isDragging 状态为 true 时，在 document 上添加全局事件监听器
    if (isDragging) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
      // 考虑添加 'mouseleave' 在 document 上，以便在鼠标离开窗口时也停止拖动
      // document.addEventListener('mouseleave', handleDocumentMouseUp);
    } else {
      // 当 isDragging 状态为 false 时，移除全局事件监听器
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      // document.removeEventListener('mouseleave', handleDocumentMouseUp);
    }

    // 清理函数：在组件卸载或 isDragging 变化导致 effect 重新运行时执行
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      // document.removeEventListener('mouseleave', handleDocumentMouseUp);
      // 如果组件在拖动过程中被卸载，确保恢复鼠标指针
      if (isDragging) {
          document.body.style.cursor = 'auto';
      }
    };
  }, [isDragging, handleDocumentMouseMove, handleDocumentMouseUp]);

  // 组合基础样式和外部传入的 className
  const separatorClasses = `${styles.separatorVertical} ${className || ''}`.trim();

  return (
    <div
      ref={separatorRef}
      className={separatorClasses}
      onMouseDown={handleMouseDown}
      role="separator" // ARIA role
      aria-orientation={orientation} // ARIA orientation
      // 以下 ARIA 属性通常由父组件根据其控制的面板状态来提供
      // aria-valuenow={undefined} 
      // aria-valuemin={undefined}
      // aria-valuemax={undefined}
      // aria-controls="panelBefore panelAfter" // 指示此分隔符控制哪些面板
    >
      {/* 可选: 在此添加视觉拖动标记, 例如三个点 */}
      {/* <div className={styles.handle}></div> */}
    </div>
  );
};

export default DraggableSeparator; 