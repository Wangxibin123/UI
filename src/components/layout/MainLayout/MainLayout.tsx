import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MainLayout.module.css';
import panelStyles from '../../common/CollapsiblePanel/CollapsiblePanel.module.css';
import ControlBar from '../../features/dag/ControlBar/ControlBar';
import DagVisualizationArea from '../../features/dag/DagVisualizationArea/DagVisualizationArea';
import ProblemBlock from '../../features/solver/ProblemBlock/ProblemBlock';
import SolutionStep from '../../features/solver/SolutionStep/SolutionStep';
import SolverActions from '../../features/solver/SolverActions/SolverActions';
import CollapsiblePanel from '../../common/CollapsiblePanel/CollapsiblePanel';
import type { SolutionStepData, DagNode, DagEdge } from '../../../types'; // Import types

// initialSolutionStepsData should use SolutionStepData type
const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", isCorrect: true },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", isCorrect: true },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", isCorrect: undefined },
];

const MainLayout: React.FC = () => {
  const [isDagCollapsed, setIsDagCollapsed] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(300);
  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(initialSolutionStepsData);
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const initialWidthRef = useRef(0);

  useEffect(() => {
    const generateDagData = () => {
      const nodes: DagNode[] = [];
      const edges: DagEdge[] = [];
      let yPos = 50;
      const xPos = 150;
      solutionSteps.forEach((step, index) => {
        nodes.push({
          id: step.id,
          data: { label: `步骤 ${step.stepNumber}` },
          position: { x: xPos, y: yPos },
        });
        yPos += 100;
        if (index > 0) {
          const prevStep = solutionSteps[index - 1];
          edges.push({
            id: `e-${prevStep.id}-${step.id}`,
            source: prevStep.id,
            target: step.id,
            animated: true,
          });
        }
      });
      setDagNodes(nodes);
      setDagEdges(edges);
    };
    generateDagData();
  }, [solutionSteps]);

  const handleToggleDagCollapse = () => setIsDagCollapsed(!isDagCollapsed);

  const handleAddSolutionStep = (latexInput: string) => {
    if (!latexInput.trim()) return;
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: solutionSteps.length + 1,
      latexContent: latexInput,
      isCorrect: undefined,
    };
    setSolutionSteps(prevSteps => [...prevSteps, newStep]);
  };

  // Placeholder for actual drag logic for handleMouseDownOnSeparator, handleMouseMove, handleMouseUp, and useEffect cleanup
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;
    let newWidth = initialWidthRef.current - deltaX;
    const minPanelWidth = 250;
    const maxPanelWidth = window.innerWidth * 0.7; // Example, adjust as needed
    if (newWidth < minPanelWidth) newWidth = minPanelWidth;
    if (newWidth > maxPanelWidth) newWidth = maxPanelWidth;
    setAiPanelWidth(newWidth);
  }, []); 

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'auto';
  }, [handleMouseMove]);

  const handleMouseDownOnSeparator = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    initialWidthRef.current = aiPanelWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    return () => {
      if (isDraggingRef.current) { // Check if still dragging during unmount
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'auto';
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <main className={styles.mainLayoutContainer}>
      <div className={`${styles.dagRegion} ${isDagCollapsed ? styles.dagRegionCollapsed : ''}`}>
        <ControlBar isDagCollapsed={isDagCollapsed} onToggleCollapse={handleToggleDagCollapse} />
        {!isDagCollapsed && <DagVisualizationArea dagNodes={dagNodes} dagEdges={dagEdges} />}
      </div>
      <div 
        className={styles.draggableSeparatorVertical} 
        onMouseDown={handleMouseDownOnSeparator}
      >
      </div>
      <div className={styles.solverRegion}>
        <ProblemBlock />
        <div className={styles.solutionStepsContainer}>
          {solutionSteps.map((step) => (
            <SolutionStep
              key={step.id} 
              stepNumber={step.stepNumber}
              latexContent={step.latexContent}
              isCorrect={step.isCorrect}
            />
          ))}
        </div>
        <SolverActions onAddNewStep={handleAddSolutionStep} />
      </div>
      <div 
        className={styles.aiPanelRegion}
        style={{ flexBasis: `${aiPanelWidth}px` }}
      >
        <CollapsiblePanel title="LaTeX格式化" headerStyle={panelStyles.latexHeader} previewTextWhenCollapsed="点击展开LaTeX格式优化面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
        <div className={styles.draggableSeparatorHorizontal}></div>
        <CollapsiblePanel title="解释分析" headerStyle={panelStyles.explainHeader} previewTextWhenCollapsed="点击展开解题步骤分析面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
        <div className={styles.draggableSeparatorHorizontal}></div>
        <CollapsiblePanel title="总结归纳" headerStyle={panelStyles.summaryHeader} previewTextWhenCollapsed="点击展开解题过程总结面板" statusTextWhenCollapsed="未激活状态" initialCollapsed={true} />
      </div>
    </main>
  );
};

export default MainLayout; 