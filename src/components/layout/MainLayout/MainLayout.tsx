import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MainLayout.module.css';
import panelStyles from '../../common/CollapsiblePanel/CollapsiblePanel.module.css';
import ControlBar from '../../features/dag/ControlBar/ControlBar';
import DagVisualizationArea from '../../features/dag/DagVisualizationArea/DagVisualizationArea';
import ProblemBlock from '../../features/solver/ProblemBlock/ProblemBlock';
import SolutionStep from '../../features/solver/SolutionStep/SolutionStep';
import SolverActions from '../../features/solver/SolverActions/SolverActions';
import CollapsiblePanel from '../../common/CollapsiblePanel/CollapsiblePanel';
import { type SolutionStepData, type DagNode, type DagEdge, type ProblemData, VerificationStatus } from '../../../types';

// initialSolutionStepsData should use SolutionStepData type
const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", verificationStatus: VerificationStatus.NotVerified },
];

const MainLayout: React.FC = () => {
  const [isDagCollapsed, setIsDagCollapsed] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(300);
  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
    return [];
  });
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);

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

  useEffect(() => {
    setProblemData({
      id: 'problem-init-1',
      title: '示例题目',
      latexContent: '$$\\frac{d^2y}{dx^2} + 5\\frac{dy}{dx} + 6y = 0$$'
    });

    const initialStepsExample: SolutionStepData[] = [
      { id: 'step-init-1', stepNumber: 1, latexContent: '$$\\lambda^2 + 5\\lambda + 6 = 0$$', verificationStatus: VerificationStatus.NotVerified },
      { id: 'step-init-2', stepNumber: 2, latexContent: '$$(\\lambda+2)(\\lambda+3) = 0$$', verificationStatus: VerificationStatus.NotVerified },
      { id: 'step-init-3', stepNumber: 3, latexContent: '$$\\lambda_1 = -2, \\lambda_2 = -3$$', verificationStatus: VerificationStatus.NotVerified },
    ];
    setSolutionSteps(initialStepsExample);
  }, []);

  const handleToggleDagCollapse = () => setIsDagCollapsed(!isDagCollapsed);

  const handleAddSolutionStep = (latexInput: string) => {
    if (!latexInput.trim()) return;
    const newStep: SolutionStepData = {
      id: `step-${Date.now()}`,
      stepNumber: solutionSteps.length + 1,
      latexContent: latexInput,
      verificationStatus: VerificationStatus.NotVerified,
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

  const handleProblemChange = (newLatexContent: string) => {
    if (problemData) {
      setProblemData({ ...problemData, latexContent: newLatexContent });
    } else {
      // Create a new problem if one doesn't exist
      setProblemData({
        id: `problem-${Date.now()}`,
        title: '新问题',
        latexContent: newLatexContent,
      });
    }
  };

  const handleStepContentChange = (stepId: string, newLatexContent: string) => {
    setSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, latexContent: newLatexContent } : step
      )
    );
  };

  const handleDeleteStep = (stepId: string) => {
    setSolutionSteps(prevSteps => {
      const updatedSteps = prevSteps.filter(step => step.id !== stepId);
      // Re-calculate step numbers
      return updatedSteps.map((step, index) => ({
        ...step,
        stepNumber: index + 1,
      }));
    });
  };

  const handleAnalyzeStep = (stepId: string) => {
    console.log("Analyze step requested:", stepId);
    // Future: Trigger AI analysis, update step verificationStatus, etc.
    // For now, let's toggle verification status as a demo
    setSolutionSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          let newStatus = VerificationStatus.NotVerified;
          if (step.verificationStatus === VerificationStatus.NotVerified) newStatus = VerificationStatus.VerifiedCorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedCorrect) newStatus = VerificationStatus.VerifiedIncorrect;
          else if (step.verificationStatus === VerificationStatus.VerifiedIncorrect) newStatus = VerificationStatus.NotVerified;
          return { ...step, verificationStatus: newStatus };
        }
        return step;
      })
    );
  };

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
        <ProblemBlock data={problemData} onContentChange={handleProblemChange} />
        <div className={styles.solutionStepsContainer}>
          {solutionSteps.map((step) => (
            <SolutionStep
              key={step.id} 
              step={step}
              onContentChange={handleStepContentChange}
              onDelete={handleDeleteStep}
              onAnalyze={handleAnalyzeStep}
            />
          ))}
        </div>
        <SolverActions onAddStep={handleAddSolutionStep} />
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