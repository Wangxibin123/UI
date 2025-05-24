import { DagNode, DagEdge, SolutionStepData, ProblemData, VerificationStatus, ForwardDerivationStatus } from './types';
import { MarkerType } from '@reactflow/core';

// 测试问题数据
export const testProblemData: ProblemData = {
  id: 'prob-1',
  title: '求解二次方程',
  latexContent: '解方程：$x^2 + 5x + 6 = 0$'
};

// 测试解题步骤数据
export const testSolutionSteps: SolutionStepData[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    latexContent: '原方程：$x^2 + 5x + 6 = 0$',
    verificationStatus: VerificationStatus.VerifiedCorrect,
    isDeleted: false,
    forwardDerivationStatus: ForwardDerivationStatus.Correct,
    backwardDerivationStatus: ForwardDerivationStatus.Undetermined,
    notes: '这是原始方程'
  },
  {
    id: 'step-2',
    stepNumber: 2,
    latexContent: '因式分解：$(x + 2)(x + 3) = 0$',
    verificationStatus: VerificationStatus.VerifiedCorrect,
    isDeleted: false,
    forwardDerivationStatus: ForwardDerivationStatus.Correct,
    backwardDerivationStatus: ForwardDerivationStatus.Correct,
    notes: '使用因式分解方法'
  },
  {
    id: 'step-3',
    stepNumber: 3,
    latexContent: '所以：$x + 2 = 0$ 或 $x + 3 = 0$',
    verificationStatus: VerificationStatus.VerifiedCorrect,
    isDeleted: false,
    forwardDerivationStatus: ForwardDerivationStatus.Correct,
    backwardDerivationStatus: ForwardDerivationStatus.Correct,
    notes: '根据零因子定理'
  },
  {
    id: 'step-4',
    stepNumber: 4,
    latexContent: '因此：$x = -2$ 或 $x = -3$',
    verificationStatus: VerificationStatus.VerifiedCorrect,
    isDeleted: false,
    forwardDerivationStatus: ForwardDerivationStatus.Undetermined,
    backwardDerivationStatus: ForwardDerivationStatus.Correct,
    notes: '最终答案'
  }
];

// 基于解题步骤生成DAG节点
export const testDagNodes: DagNode[] = testSolutionSteps.map((step, index) => ({
  id: step.id,
  type: 'customStepNode',
  data: {
    label: `步骤 ${step.stepNumber}`,
    verificationStatus: step.verificationStatus,
    fullLatexContent: step.latexContent,
    stepNumber: step.stepNumber,
    isDeleted: step.isDeleted || false,
    notes: step.notes,
    forwardDerivationDisplayStatus: step.forwardDerivationStatus,
    backwardDerivationDisplayStatus: step.backwardDerivationStatus,
    isDerived: index > 0, // 第一步不是推导出来的
    isMainPathNode: true, // 所有步骤都在主路径上
  },
  position: { x: 100, y: index * 120 },
  sourcePosition: 'bottom',
  targetPosition: 'top'
}));

// 基于解题步骤生成DAG边
export const testDagEdges: DagEdge[] = [];
for (let i = 0; i < testSolutionSteps.length - 1; i++) {
  testDagEdges.push({
    id: `edge-${i}`,
    source: testSolutionSteps[i].id,
    target: testSolutionSteps[i + 1].id,
    type: 'smoothstep',
    animated: false,
    data: {
      isDeleted: false,
      isMainPathEdge: true,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#4A90E2',
    }
  });
} 