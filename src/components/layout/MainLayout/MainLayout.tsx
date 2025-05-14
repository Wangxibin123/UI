import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MainLayout.module.css';
import panelStyles from '../../common/CollapsiblePanel/CollapsiblePanel.module.css';
import ControlBar from '../../features/dag/ControlBar/ControlBar';
import DagVisualizationArea from '../../features/dag/DagVisualizationArea/DagVisualizationArea';
import ProblemBlock from '../../features/solver/ProblemBlock/ProblemBlock';
import SolutionStep from '../../features/solver/SolutionStep/SolutionStep';
import SolverActions from '../../features/solver/SolverActions/SolverActions';
import CollapsiblePanel from '../../common/CollapsiblePanel/CollapsiblePanel';
import DraggableSeparator from '../../common/DraggableSeparator/DraggableSeparator';
import { type SolutionStepData, type DagNode, type DagEdge, type ProblemData, VerificationStatus } from '../../../types';
import { MarkerType, ReactFlowProvider } from '@reactflow/core';

interface PanelWidthsType {
  dag: number;
  solver: number;
  ai: number;
}

// initialSolutionStepsData should use SolutionStepData type
const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", verificationStatus: VerificationStatus.NotVerified },
];

const MIN_PANEL_PERCENTAGE = 10; // Minimum width for any panel in percentage

const MainLayout: React.FC = () => {
  const [isDagCollapsed, setIsDagCollapsed] = useState(false);
  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
    return [];
  });
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);

  const mainLayoutRef = useRef<HTMLDivElement>(null);
  
  const initialPanelWidths = useRef<PanelWidthsType>({ dag: 27.5, solver: 45, ai: 22.5 });
  
  const [panelWidths, setPanelWidths] = useState<PanelWidthsType>(initialPanelWidths.current);
  
  const [userSetPanelWidths, setUserSetPanelWidths] = useState<PanelWidthsType | null>(null);

  useEffect(() => {
    const generateDagData = () => {
      // console.log("Attempting to generate DAG data. solutionSteps:", JSON.parse(JSON.stringify(solutionSteps)));

      // Filter out hard-deleted steps for DAG generation if any (though current logic is soft delete)
      // const activeSteps = solutionSteps.filter(step => !step.isHardDeleted); // Example if using a different flag

      if (!solutionSteps || solutionSteps.length === 0) {
        // console.log("No solution steps, clearing DAG.");
        setDagNodes([]);
        setDagEdges([]);
        return;
      }

      const newNodes: DagNode[] = solutionSteps.map((step, index) => {
        return {
          id: step.id,
          type: 'customStepNode',
          data: {
            label: `步骤 ${step.stepNumber}`,
            fullLatexContent: step.latexContent,
            verificationStatus: step.verificationStatus,
            stepNumber: step.stepNumber,
            isDeleted: step.isDeleted || false, // Pass the isDeleted status
          },
          // Adjust position for deleted nodes? For now, keep them in sequence.
          position: { x: 150, y: index * 120 + 50 }, 
        };
      });

      const newEdges: DagEdge[] = [];
      if (solutionSteps.length > 1) {
        for (let i = 1; i < solutionSteps.length; i++) {
          // Only create edges between non-deleted steps
          if (!solutionSteps[i - 1].isDeleted && !solutionSteps[i].isDeleted) {
            newEdges.push({
              id: `e-${solutionSteps[i - 1].id}-${solutionSteps[i].id}`,
              source: solutionSteps[i - 1].id,
              target: solutionSteps[i].id,
              animated: true, // Consider making this conditional if source/target is deleted
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              // style: (solutionSteps[i-1].isDeleted || solutionSteps[i].isDeleted) ? { stroke: '#ccc', strokeDasharray: '5 5'} : undefined
            });
          }
        }
      }
      
      // console.log("Generated New DAG Nodes:", JSON.parse(JSON.stringify(newNodes)));
      // console.log("Generated New DAG Edges:", JSON.parse(JSON.stringify(newEdges)));

      setDagNodes(newNodes);
      setDagEdges(newEdges);
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

  // Effect to handle panel width restoration when DAG is un-collapsed
  useEffect(() => {
    if (!isDagCollapsed) {
      // When DAG is expanded
      if (userSetPanelWidths) {
        setPanelWidths(userSetPanelWidths); // Restore user's last dragged widths
      } else {
        setPanelWidths(initialPanelWidths.current); // Restore initial default widths
      }
    }
    // If isDagCollapsed is true, panelWidths.dag is effectively ignored by the inline style
    // due to the conditional className, and the CSS rule for .dagRegionCollapsed takes over.
    // The other panel widths (solver, ai) remain as they were, which is the desired behavior
    // unless we explicitly want them to resize when DAG collapses.
  }, [isDagCollapsed, userSetPanelWidths]); // Dependency: userSetPanelWidths to re-apply if it changes while uncollapsed (e.g. future load state)

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

  // Separator Drag Handlers
  const handleSeparator1Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;

      const dxPercent = (dx / containerWidth) * 100;
      
      const currentDagWidth = prevWidths.dag;
      const currentSolverWidth = prevWidths.solver;
      // The combined space of DAG and Solver is what we are redistributing
      const combinedSpace = currentDagWidth + currentSolverWidth;

      let newDagWidth = currentDagWidth + dxPercent;
      
      // Clamp newDagWidth:
      // It cannot be less than MIN_PANEL_PERCENTAGE.
      // It cannot be so large that solver becomes less than MIN_PANEL_PERCENTAGE.
      newDagWidth = Math.max(MIN_PANEL_PERCENTAGE, newDagWidth);
      newDagWidth = Math.min(newDagWidth, combinedSpace - MIN_PANEL_PERCENTAGE);
      
      const newSolverWidth = combinedSpace - newDagWidth;

      const newCalculatedWidths: PanelWidthsType = { ...prevWidths, dag: newDagWidth, solver: newSolverWidth };
      setUserSetPanelWidths(newCalculatedWidths); // Save this user-dragged state
      return newCalculatedWidths;
    });
  }, []); // No dependencies needed if MIN_PANEL_PERCENTAGE is a const outside component

  const handleSeparator2Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;

      const dxPercent = (dx / containerWidth) * 100;

      const currentSolverWidth = prevWidths.solver;
      const currentAiWidth = prevWidths.ai;
      // The combined space of Solver and AI is what we are redistributing
      const combinedSpace = currentSolverWidth + currentAiWidth;

      let newSolverWidth = currentSolverWidth + dxPercent;

      // Clamp newSolverWidth:
      newSolverWidth = Math.max(MIN_PANEL_PERCENTAGE, newSolverWidth);
      newSolverWidth = Math.min(newSolverWidth, combinedSpace - MIN_PANEL_PERCENTAGE);

      const newAiWidth = combinedSpace - newSolverWidth;
      
      const newCalculatedWidths: PanelWidthsType = { ...prevWidths, solver: newSolverWidth, ai: newAiWidth };
      setUserSetPanelWidths(newCalculatedWidths); // Save this user-dragged state
      return newCalculatedWidths;
    });
  }, []);

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
        step.id === stepId 
          ? { 
              ...step, 
              latexContent: newLatexContent, 
              verificationStatus: VerificationStatus.NotVerified
            } 
          : step
      )
    );
  };

  const handleDeleteStep = (stepId: string) => {
    setSolutionSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, isDeleted: true } : step
      )
    );
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

  // New function for A.3.3
  const handleSplitStep = (originalStepId: string, part1Content: string, part2Content: string) => {
    setSolutionSteps(prevSteps => {
      const originalStepIndex = prevSteps.findIndex(step => step.id === originalStepId);
      if (originalStepIndex === -1) {
        console.error("Original step not found for splitting:", originalStepId);
        return prevSteps; 
      }

      // Create a mutable copy for modifications
      const newStepsArray = prevSteps.map(s => ({...s}));

      // 1. Update the original step (which becomes part 1)
      newStepsArray[originalStepIndex] = {
        ...newStepsArray[originalStepIndex],
        latexContent: part1Content,
        verificationStatus: VerificationStatus.NotVerified,
      };

      // 2. Create the new step (part 2)
      const newStepPart2: SolutionStepData = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        latexContent: part2Content,
        verificationStatus: VerificationStatus.NotVerified,
        stepNumber: 0, // Temporary, will be correctly set in the re-numbering loop
      };

      // 3. Insert the new step into the copied array
      newStepsArray.splice(originalStepIndex + 1, 0, newStepPart2);

      // 4. Re-number all steps from the original step (now part 1) onwards
      for (let i = originalStepIndex; i < newStepsArray.length; i++) {
        if (i === 0) {
          newStepsArray[i].stepNumber = 1;
        } else {
          newStepsArray[i].stepNumber = newStepsArray[i-1].stepNumber + 1;
        }
      }
      return newStepsArray;
    });
  };

  return (
    <main className={styles.mainLayoutContainer} ref={mainLayoutRef}>
      <ReactFlowProvider>
        <div 
          className={`${styles.dagRegion} ${isDagCollapsed ? styles.dagRegionCollapsed : ''}`}
          style={{ flexBasis: isDagCollapsed ? undefined : `${panelWidths.dag}%` }} // Let CSS handle collapsed width
        >
          <ControlBar 
            isDagCollapsed={isDagCollapsed} 
            onToggleCollapse={handleToggleDagCollapse} 
          />
          {!isDagCollapsed && 
            <DagVisualizationArea 
              dagNodes={dagNodes} 
              dagEdges={dagEdges} 
            />
          }
        </div>
      </ReactFlowProvider>

      <DraggableSeparator orientation="vertical" onDrag={handleSeparator1Drag} />
      
      <div 
        className={styles.solverRegion}
        style={{ flexBasis: `${panelWidths.solver}%` }}
      >
        <ProblemBlock data={problemData} onContentChange={handleProblemChange} />
        <div className={styles.solutionStepsContainer}>
          {solutionSteps
            .filter(step => !step.isDeleted)
            .map((step) => (
            <SolutionStep
              key={step.id}
              step={step}
              onContentChange={handleStepContentChange}
              onDelete={handleDeleteStep}
              onAnalyze={handleAnalyzeStep}
              onSplit={handleSplitStep}
            />
          ))}
        </div>
        <SolverActions onAddStep={handleAddSolutionStep} />
      </div>

      <DraggableSeparator orientation="vertical" onDrag={handleSeparator2Drag} />

      <div 
        className={styles.aiPanelRegion}
        style={{ flexBasis: `${panelWidths.ai}%` }}
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