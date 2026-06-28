import { create } from 'zustand';

export interface UIState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null | ((prev: string | null) => string | null)) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set((state) => ({
    selectedNodeId: typeof selectedNodeId === 'function' ? selectedNodeId(state.selectedNodeId) : selectedNodeId
  })),
}));
