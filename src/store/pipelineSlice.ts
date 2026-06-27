import { StateCreator } from 'zustand';
import { FlowNode, FlowConnection, Workflow } from '../types';

export interface PipelineSlice {
  savedSnapshots: Array<{ id: string; name: string; timestamp: string; nodes: FlowNode[]; connections: FlowConnection[] }>;
  projectNameInput: string;
  currentSavedProjectName: string | null;
  setProjectNameInput: (name: string) => void;
  setCurrentSavedProjectName: (name: string | null) => void;
  restoreSnapshot: (snapshotId: string) => void;
  loadTemplate: (template: Workflow) => void;
  saveSnapshot: () => void;
}

export const createPipelineSlice: StateCreator<any, [], [], PipelineSlice> = (set, get) => ({
  savedSnapshots: [],
  projectNameInput: '',
  currentSavedProjectName: null,

  setProjectNameInput: (projectNameInput) => set({ projectNameInput }),
  setCurrentSavedProjectName: (currentSavedProjectName) => set({ currentSavedProjectName }),

  restoreSnapshot: (snapshotId) => {
    const found = get().savedSnapshots.find((s: any) => s.id === snapshotId);
    if (found) {
      set({
        nodes: found.nodes,
        connections: found.connections,
        projectNameInput: found.name || get().projectNameInput
      });
    }
  },

  loadTemplate: (template) => {
    set({
      nodes: template.nodes,
      connections: template.connections,
      selectedNodeId: null
    });
  },

  saveSnapshot: () => {
    const activeNodes = get().nodes;
    const activeConns = get().connections;
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
});
