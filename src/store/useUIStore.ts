import { create } from 'zustand';

export interface UIState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null | ((prev: string | null) => string | null)) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set((state) => ({
    selectedNodeId: typeof selectedNodeId === 'function' ? selectedNodeId(state.selectedNodeId) : selectedNodeId
  })),
  selectedNodeIds: [],
  setSelectedNodeIds: (selectedNodeIds) => set((state) => ({
    selectedNodeIds: typeof selectedNodeIds === 'function' ? selectedNodeIds(state.selectedNodeIds) : selectedNodeIds
  })),
}));
