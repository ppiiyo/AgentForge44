import { create } from 'zustand';
import { FlowNode, FlowConnection, Workflow } from '../types';
import { useEditorStore } from './useEditorStore';
import { useUIStore } from './useUIStore';

export interface PipelineState {
  savedSnapshots: Array<{ id: string; name: string; timestamp: string; nodes: FlowNode[]; connections: FlowConnection[] }>;
  projectNameInput: string;
  currentSavedProjectName: string | null;
  setProjectNameInput: (name: string | ((prev: string) => string)) => void;
  setCurrentSavedProjectName: (name: string | null | ((prev: string | null) => string | null)) => void;
  setSavedSnapshots: (snapshots: any[] | ((prev: any[]) => any[])) => void;
  restoreSnapshot: (snapshotId: string) => void;
  loadTemplate: (template: Workflow) => void;
  saveSnapshot: () => void;
}

export const usePipelineStore = create<PipelineState>()((set, get) => ({
  savedSnapshots: [],
  projectNameInput: 'default-workspace',
  currentSavedProjectName: null,

  setProjectNameInput: (projectNameInput) => set((state) => ({
    projectNameInput: typeof projectNameInput === 'function' ? projectNameInput(state.projectNameInput) : projectNameInput
  })),
  setCurrentSavedProjectName: (currentSavedProjectName) => set((state) => ({
    currentSavedProjectName: typeof currentSavedProjectName === 'function' ? currentSavedProjectName(state.currentSavedProjectName) : currentSavedProjectName
  })),
  setSavedSnapshots: (snapshots) => set((state) => ({
    savedSnapshots: typeof snapshots === 'function' ? snapshots(state.savedSnapshots) : snapshots
  })),

  restoreSnapshot: (snapshotId) => {
    const found = get().savedSnapshots.find((s: any) => s.id === snapshotId);
    if (found) {
      useEditorStore.getState().setNodes(found.nodes);
      useEditorStore.getState().setConnections(found.connections);
      set({ projectNameInput: found.name || get().projectNameInput });
    }
  },

  loadTemplate: (template) => {
    useEditorStore.getState().setNodes(template.nodes);
    useEditorStore.getState().setConnections(template.connections);
    useUIStore.getState().setSelectedNodeId(null);
  },

  saveSnapshot: () => {
    const activeNodes = useEditorStore.getState().nodes;
    const activeConns = useEditorStore.getState().connections;
    const prjName = get().projectNameInput || "Snapshot";
    const newSnap = {
      id: `snap-${Date.now()}`,
      name: prjName,
      timestamp: new Date().toLocaleTimeString(),
      nodes: activeNodes,
      connections: activeConns
    };
    set({ savedSnapshots: [...get().savedSnapshots, newSnap] });
  }
}));
