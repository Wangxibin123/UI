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
import {
  type SolutionStepData,
  type DagNode,
  type DagEdge,
  type ProblemData,
  VerificationStatus,
  LayoutMode,
} from '../../../types';
import { MarkerType, ReactFlowProvider } from '@reactflow/core';

interface PanelWidthsType {
  dag: number;
  solver: number;
  ai: number;
}

const LOCAL_STORAGE_PREFIX = 'aiMath_layoutPrefs_';

function saveUserPreferenceForMode(mode: LayoutMode, widths: PanelWidthsType): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${mode}`, JSON.stringify(widths));
  } catch (error) {
    console.warn("Could not save user layout preference:", error);
  }
}

function loadUserPreferenceForMode(mode: LayoutMode): PanelWidthsType | null {
  try {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${mode}`);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not load user layout preference:", error);
    return null;
  }
}

// initialSolutionStepsData should use SolutionStepData type
const initialSolutionStepsData: SolutionStepData[] = [
  { id: 'step-1', stepNumber: 1, latexContent: "$$\\lambda^2 + 4\\lambda + 4 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-2', stepNumber: 2, latexContent: "$$(\\lambda + 2)^2 = 0$$", verificationStatus: VerificationStatus.VerifiedCorrect },
  { id: 'step-3', stepNumber: 3, latexContent: "$$\\lambda = -2 \\text{ (重根)}$$", verificationStatus: VerificationStatus.NotVerified },
];

const MIN_PANEL_PERCENTAGE = 10; // Minimum width for any panel in percentage

const MainLayout: React.FC = () => {
  const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(() => {
    return LayoutMode.DEFAULT_THREE_COLUMN;
  });

  const [solutionSteps, setSolutionSteps] = useState<SolutionStepData[]>(() => {
    return [];
  });
  const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
  const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);

  const mainLayoutRef = useRef<HTMLDivElement>(null);
  
  const initialPanelWidths = useRef<PanelWidthsType>({ dag: 25, solver: 50, ai: 25 });
  
  const [panelWidths, setPanelWidths] = useState<PanelWidthsType>(() => {
    const persistedDefault = loadUserPreferenceForMode(LayoutMode.DEFAULT_THREE_COLUMN);
    return persistedDefault || initialPanelWidths.current;
  });

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

  // <<< 辅助函数：确保宽度总和为100%并处理精度 >>>
  const ensurePanelWidthsSumTo100AndPrecision = useCallback((widths: PanelWidthsType): PanelWidthsType => {
    let { dag, solver, ai } = widths;
    dag = parseFloat(dag.toFixed(1));
    solver = parseFloat(solver.toFixed(1));
    ai = parseFloat((100 - dag - solver).toFixed(1));

    if (ai < 0) { 
        const deficit = -ai;
        ai = 0;
        const totalDagSolver = dag + solver + deficit; 
        if (totalDagSolver > 0) {
            const dagProportion = (dag + deficit/2) / totalDagSolver; 
            dag = parseFloat((dagProportion * (100 - ai)).toFixed(1));
            solver = parseFloat((100 - ai - dag).toFixed(1));
        } else { 
            dag = 50; 
            solver = 50;
            ai = 0;
        }
    }
    // Ensure no panel is negative after adjustment, especially if MIN_PANEL_PERCENTAGE is involved elsewhere
    // This is a simplified ensure sum, primary clamping should happen before this.
    if (dag < 0) dag = 0;
    if (solver < 0) solver = 0;
    if (ai < 0) ai = 0;
    // Re-check sum after clamping negatives (though ideally clamping prevents this)
    const currentSum = dag + solver + ai;
    if (currentSum !== 100 && currentSum > 0) {
        const scale = 100 / currentSum;
        dag = parseFloat((dag*scale).toFixed(1));
        solver = parseFloat((solver*scale).toFixed(1));
        ai = parseFloat((100 - dag - solver).toFixed(1)); // last one gets remainder
    }

    return { dag, solver, ai };
  }, []);

  // <<< 核心 useEffect，用于根据 currentLayoutMode 设置 panelWidths >>>
  useEffect(() => {
    let targetWidths: PanelWidthsType;
    const userPrefsForMode = loadUserPreferenceForMode(currentLayoutMode);

    switch (currentLayoutMode) {
      case LayoutMode.DAG_EXPANDED_FULL:
        targetWidths = userPrefsForMode || { dag: 70, solver: 30, ai: 0 };
        break;
      case LayoutMode.AI_PANEL_ACTIVE:
        targetWidths = userPrefsForMode || { dag: 2, solver: 49, ai: 49 }; 
        break;
      case LayoutMode.DAG_COLLAPSED_SIMPLE:
        if (userPrefsForMode) {
          targetWidths = userPrefsForMode;
        } else {
          const defaultModeUserPrefs = loadUserPreferenceForMode(LayoutMode.DEFAULT_THREE_COLUMN);
          const lastKnownDefaultWidths = defaultModeUserPrefs || initialPanelWidths.current;
          const solverAiTotalInDefault = lastKnownDefaultWidths.solver + lastKnownDefaultWidths.ai;
          if (solverAiTotalInDefault > 0) {
            const solverProportion = lastKnownDefaultWidths.solver / solverAiTotalInDefault;
            const availableForSolverAndAi = 98; 
            let calculatedSolver = Math.round(availableForSolverAndAi * solverProportion);
            let calculatedAi = availableForSolverAndAi - calculatedSolver;
            
            const minSolverAiWidth = MIN_PANEL_PERCENTAGE > 0 ? MIN_PANEL_PERCENTAGE : 1;
            if (calculatedSolver < minSolverAiWidth && (calculatedSolver + calculatedAi) >= minSolverAiWidth + minSolverAiWidth ) {
                calculatedSolver = minSolverAiWidth;
                calculatedAi = availableForSolverAndAi - calculatedSolver;
            } else if (calculatedAi < minSolverAiWidth && (calculatedSolver + calculatedAi) >= minSolverAiWidth + minSolverAiWidth ) {
                calculatedAi = minSolverAiWidth;
                calculatedSolver = availableForSolverAndAi - calculatedAi;
            }
            // Ensure they are not negative after adjustment
            if(calculatedSolver < 0) calculatedSolver = 0;
            if(calculatedAi < 0) calculatedAi = 0;
            if(calculatedSolver + calculatedAi > availableForSolverAndAi) { // if sum too high, adjust
                const excess = (calculatedSolver + calculatedAi) - availableForSolverAndAi;
                // reduce proportionally, or just from the larger one
                if (calculatedSolver > calculatedAi) calculatedSolver -= excess;
                else calculatedAi -= excess;
            }

            targetWidths = { dag: 2, solver: calculatedSolver, ai: calculatedAi };
          } else {
            targetWidths = { dag: 2, solver: 58, ai: 40 };
          }
        }
        break;
      case LayoutMode.DEFAULT_THREE_COLUMN:
      default:
        targetWidths = userPrefsForMode || initialPanelWidths.current;
        break;
    }
    setPanelWidths(ensurePanelWidthsSumTo100AndPrecision(targetWidths));
  }, [currentLayoutMode, ensurePanelWidthsSumTo100AndPrecision]); // ensurePanelWidthsSumTo100AndPrecision is memoized

  // <<< 模式切换处理函数 >>>
  const handleToggleDagCollapse = () => {
    setCurrentLayoutMode(prevMode => {
      if (prevMode === LayoutMode.DAG_COLLAPSED_SIMPLE ||
          prevMode === LayoutMode.AI_PANEL_ACTIVE ||
          prevMode === LayoutMode.DAG_EXPANDED_FULL) {
        return LayoutMode.DEFAULT_THREE_COLUMN;
      } else { 
        return LayoutMode.DAG_COLLAPSED_SIMPLE;
      }
    });
  };

  const handleExpandDagFully = () => {
    setCurrentLayoutMode(LayoutMode.DAG_EXPANDED_FULL);
  };

  const handleActivateAiPanel = () => {
    setCurrentLayoutMode(LayoutMode.AI_PANEL_ACTIVE);
  };
  
  // Separator Drag Handlers
  const handleSeparator1Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;
      const dxPercent = (dx / containerWidth) * 100;

      let newDag = prevWidths.dag;
      let newSolver = prevWidths.solver;
      let newAi = prevWidths.ai;

      switch (currentLayoutMode) {
        case LayoutMode.DAG_EXPANDED_FULL: // AI is 0, separator 1 adjusts DAG vs Solver
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          newAi = 0;
          // Clamp DAG and Solver
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          // Ensure sum is 100 (since AI is 0)
          if (newDag + newSolver > 100) {
            if (prevWidths.dag + dxPercent > newDag) { // Dragged to increase DAG
              newSolver = 100 - newDag;
            } else { // Dragged to increase Solver (or DAG hit min and dx was negative)
              newDag = 100 - newSolver;
            }
          }
          // Final check for min widths after sum adjustment
          newDag = Math.max(MIN_PANEL_PERCENTAGE, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag);
          break;

        case LayoutMode.AI_PANEL_ACTIVE: // DAG is ~2%, separator 1 adjusts this nominal DAG vs Solver, AI is passive recipient
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          // newAi = 100 - newDag - newSolver; (calculated later by ensure)
          
          newDag = Math.max(2, newDag); // DAG nominal min
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag - newSolver);

          // If AI becomes too small, adjust solver and dag
          if (100 - newDag - newSolver < MIN_PANEL_PERCENTAGE) {
            newAi = MIN_PANEL_PERCENTAGE;
            const remainingForDagSolver = 100 - newAi;
            if (prevWidths.dag + dxPercent > newDag) { // Dragged to increase DAG
              newDag = Math.min(newDag, remainingForDagSolver - MIN_PANEL_PERCENTAGE); // Solver needs min
              newSolver = remainingForDagSolver - newDag;
            } else { // Dragged to increase Solver
              newSolver = Math.min(newSolver, remainingForDagSolver - 2); // DAG needs min (2)
              newDag = remainingForDagSolver - newSolver;
            }
          }
          newDag = Math.max(2, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          break;

        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.DAG_COLLAPSED_SIMPLE: // Separator 1 adjusts DAG vs Solver, AI is passive
        default:
          newDag = prevWidths.dag + dxPercent;
          newSolver = prevWidths.solver - dxPercent;
          // newAi = 100 - newDag - newSolver; (calculated later by ensure)
          
          const minDagCurrentMode = currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE ? 2 : MIN_PANEL_PERCENTAGE;
          newDag = Math.max(minDagCurrentMode, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, 100 - newDag - newSolver);

          // If AI becomes too small due to dag/solver expansion, take from the one that expanded
          if (100 - newDag - newSolver < MIN_PANEL_PERCENTAGE) {
            newAi = MIN_PANEL_PERCENTAGE;
            const remainingForDagSolver = 100 - newAi;
            if (prevWidths.dag + dxPercent > newDag) { // DAG was expanding
              newDag = Math.min(newDag, remainingForDagSolver - MIN_PANEL_PERCENTAGE); // Solver needs min
              newSolver = remainingForDagSolver - newDag;
            } else { // Solver was expanding (or DAG shrinking)
              newSolver = Math.min(newSolver, remainingForDagSolver - minDagCurrentMode); // DAG needs its min
              newDag = remainingForDagSolver - newSolver;
            }
          }
          newDag = Math.max(minDagCurrentMode, newDag);
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          break;
      }

      const finalWidths = ensurePanelWidthsSumTo100AndPrecision({ dag: newDag, solver: newSolver, ai: newAi });
      saveUserPreferenceForMode(currentLayoutMode, finalWidths);
      return finalWidths;
    });
  }, [currentLayoutMode, MIN_PANEL_PERCENTAGE, ensurePanelWidthsSumTo100AndPrecision]);

  const handleSeparator2Drag = useCallback(({ dx }: { dx: number }) => {
    setPanelWidths(prevWidths => {
      if (!mainLayoutRef.current) return prevWidths;
      const containerWidth = mainLayoutRef.current.offsetWidth;
      if (containerWidth === 0) return prevWidths;
      const dxPercent = (dx / containerWidth) * 100;

      let newDag = prevWidths.dag;
      let newSolver = prevWidths.solver;
      let newAi = prevWidths.ai;

      switch (currentLayoutMode) {
        case LayoutMode.DAG_EXPANDED_FULL: // AI is 0, separator 2 should be inactive/hidden
          // No change expected if separator is somehow active
          return prevWidths; 

        case LayoutMode.AI_PANEL_ACTIVE: // DAG is ~2% (fixed), separator 2 adjusts Solver vs AI
          newDag = prevWidths.dag; // DAG width remains fixed (e.g. 2%)
          newSolver = prevWidths.solver + dxPercent;
          newAi = prevWidths.ai - dxPercent;

          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);

          // Ensure sum of Solver + AI is (100 - newDag)
          const availableForSolverAi = 100 - newDag;
          if (newSolver + newAi > availableForSolverAi) {
            if (prevWidths.solver + dxPercent > newSolver) { // Dragged to increase Solver
              newAi = availableForSolverAi - newSolver;
            } else { // Dragged to increase AI (or Solver hit min)
              newSolver = availableForSolverAi - newAi;
            }
          }
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, availableForSolverAi - newSolver);
          break;

        case LayoutMode.DEFAULT_THREE_COLUMN:
        case LayoutMode.DAG_COLLAPSED_SIMPLE: // Separator 2 adjusts Solver vs AI, DAG is passive
        default:
          newDag = prevWidths.dag; // DAG width is not directly changed by separator 2
          newSolver = prevWidths.solver + dxPercent;
          newAi = prevWidths.ai - dxPercent;

          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);
          
          // DAG must also be respected, it might get squashed if Solver+AI take too much
          const minDagCurrentMode = currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE ? 2 : MIN_PANEL_PERCENTAGE;
          if (100 - newSolver - newAi < minDagCurrentMode) {
             newDag = minDagCurrentMode;
             const availableForSolverAiActive = 100 - newDag;
             if (prevWidths.solver + dxPercent > newSolver) { // Solver expanding
                newSolver = Math.min(newSolver, availableForSolverAiActive - MIN_PANEL_PERCENTAGE); // AI needs min
                newAi = availableForSolverAiActive - newSolver;
             } else { // AI expanding
                newAi = Math.min(newAi, availableForSolverAiActive - MIN_PANEL_PERCENTAGE); // Solver needs min
                newSolver = availableForSolverAiActive - newAi;
             }
          }
          newSolver = Math.max(MIN_PANEL_PERCENTAGE, newSolver);
          newAi = Math.max(MIN_PANEL_PERCENTAGE, newAi);
          break;
      }
      
      const finalWidths = ensurePanelWidthsSumTo100AndPrecision({ dag: newDag, solver: newSolver, ai: newAi });
      saveUserPreferenceForMode(currentLayoutMode, finalWidths);
      return finalWidths;
    });
  }, [currentLayoutMode, MIN_PANEL_PERCENTAGE, ensurePanelWidthsSumTo100AndPrecision]);

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
          className={`${styles.dagRegion} ${ // Conditional class for collapsed state
            (currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) ? styles.dagRegionCollapsed : ''
          }`}
          style={{
            flexBasis: (currentLayoutMode === LayoutMode.DAG_COLLAPSED_SIMPLE || currentLayoutMode === LayoutMode.AI_PANEL_ACTIVE) 
                       ? undefined // Rely on CSS for fixed width when collapsed to icon
                       : `${panelWidths.dag}%` // Use percentage from state otherwise
          }}
        >
          <ControlBar 
            isDagCollapsed={currentLayoutMode !== LayoutMode.DEFAULT_THREE_COLUMN && currentLayoutMode !== LayoutMode.DAG_EXPANDED_FULL}
            onToggleCollapse={handleToggleDagCollapse} // Correctly passed the new handler
          />
          {/* Conditional rendering of DagVisualizationArea based on mode and width */}
          { (currentLayoutMode !== LayoutMode.DAG_COLLAPSED_SIMPLE && 
             currentLayoutMode !== LayoutMode.AI_PANEL_ACTIVE && 
             panelWidths.dag > 5) && // Only show if not icon-collapsed and has some width
            <DagVisualizationArea
              dagNodes={dagNodes}
              dagEdges={dagEdges}
            />
          }
        </div>
      </ReactFlowProvider>

      {/* Separator 1: Between DAG and Solver */}
      {/* Show unless AI Panel is active (where DAG is an icon and only one separator matters) */}
      {/* OR unless DAG is fully expanded (where AI panel is hidden, so separator 1 acts between DAG/Solver) - this logic needs refinement for DAG_EXPANDED_FULL */}
      { currentLayoutMode !== LayoutMode.AI_PANEL_ACTIVE && (
          <DraggableSeparator orientation="vertical" onDrag={handleSeparator1Drag} />
      )}
      
      <div 
        className={styles.solverRegion}
        style={{
          flexBasis: `${panelWidths.solver}%`,
          display: panelWidths.solver === 0 ? 'none' : 'flex',
        }}
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

      {/* Separator 2: Between Solver and AI */}
      {/* Show unless DAG is fully expanded (AI panel is hidden, so separator 2 is not needed) */}
      {currentLayoutMode !== LayoutMode.DAG_EXPANDED_FULL && panelWidths.ai > 0 && (
        <DraggableSeparator orientation="vertical" onDrag={handleSeparator2Drag} />
      )}

      <div 
        className={styles.aiPanelRegion}
        style={{
          flexBasis: `${panelWidths.ai}%`,
          display: panelWidths.ai === 0 ? 'none' : 'flex',
        }}
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