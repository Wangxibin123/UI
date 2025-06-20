import { DagPageState, ProblemData, VersionHistoryState, InterpretationState } from '../types';

// 持久化键名
const STORAGE_KEYS = {
  DAG_PAGE_STATE: 'mathSolver_dagPageState',
  PROBLEM_DATA: 'mathSolver_problemData',
  VERSION_HISTORY: 'mathSolver_versionHistory',
  INTERPRETATION_STATE: 'mathSolver_interpretationState',
  PANEL_WIDTHS: 'mathSolver_panelWidths',
  LAYOUT_MODE: 'mathSolver_layoutMode',
  SUMMARY_CONTENT: 'mathSolver_summaryContent',
  AI_ANALYSIS_DATA: 'mathSolver_aiAnalysisData',
} as const;

// 通用的 localStorage 操作函数
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    const serializedData = JSON.stringify(data, (key, value) => {
      // 处理 Date 对象
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
};

const loadFromStorage = <T>(key: string): T | null => {
  try {
    const serializedData = localStorage.getItem(key);
    if (!serializedData) return null;
    
    const data = JSON.parse(serializedData, (key, value) => {
      // 恢复 Date 对象
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
    
    return data;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
};

// DAG 页面状态持久化
export const saveDagPageState = (state: DagPageState): void => {
  saveToStorage(STORAGE_KEYS.DAG_PAGE_STATE, state);
};

export const loadDagPageState = (): DagPageState | null => {
  return loadFromStorage<DagPageState>(STORAGE_KEYS.DAG_PAGE_STATE);
};

// 问题数据持久化
export const saveProblemData = (data: ProblemData | null): void => {
  saveToStorage(STORAGE_KEYS.PROBLEM_DATA, data);
};

export const loadProblemData = (): ProblemData | null => {
  return loadFromStorage<ProblemData>(STORAGE_KEYS.PROBLEM_DATA);
};

// 版本历史持久化
export const saveVersionHistory = (state: VersionHistoryState): void => {
  saveToStorage(STORAGE_KEYS.VERSION_HISTORY, state);
};

export const loadVersionHistory = (): VersionHistoryState | null => {
  return loadFromStorage<VersionHistoryState>(STORAGE_KEYS.VERSION_HISTORY);
};

// 解释状态持久化
export const saveInterpretationState = (state: InterpretationState): void => {
  saveToStorage(STORAGE_KEYS.INTERPRETATION_STATE, state);
};

export const loadInterpretationState = (): InterpretationState | null => {
  return loadFromStorage<InterpretationState>(STORAGE_KEYS.INTERPRETATION_STATE);
};

// 面板宽度持久化
export const savePanelWidths = (widths: any): void => {
  saveToStorage(STORAGE_KEYS.PANEL_WIDTHS, widths);
};

export const loadPanelWidths = (): any | null => {
  return loadFromStorage(STORAGE_KEYS.PANEL_WIDTHS);
};

// 布局模式持久化
export const saveLayoutMode = (mode: string): void => {
  saveToStorage(STORAGE_KEYS.LAYOUT_MODE, mode);
};

export const loadLayoutMode = (): string | null => {
  return loadFromStorage<string>(STORAGE_KEYS.LAYOUT_MODE);
};

// 清除所有持久化数据
export const clearAllPersistedData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// 总结内容持久化
export const saveSummaryContent = (content: string): void => {
  saveToStorage(STORAGE_KEYS.SUMMARY_CONTENT, content);
};

export const loadSummaryContent = (): string | null => {
  return loadFromStorage<string>(STORAGE_KEYS.SUMMARY_CONTENT);
};

// AI解析数据持久化
export interface AIAnalysisData {
  [stepId: string]: string; // stepId -> aiAnalysisContent
}

export const saveAIAnalysisData = (data: AIAnalysisData): void => {
  saveToStorage(STORAGE_KEYS.AI_ANALYSIS_DATA, data);
};

export const loadAIAnalysisData = (): AIAnalysisData | null => {
  return loadFromStorage<AIAnalysisData>(STORAGE_KEYS.AI_ANALYSIS_DATA);
};

// 获取存储使用情况
export const getStorageUsage = (): { [key: string]: number } => {
  const usage: { [key: string]: number } = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const data = localStorage.getItem(key);
    usage[name] = data ? new Blob([data]).size : 0;
  });
  return usage;
}; 