import { create } from 'zustand';
import { useUIStore } from './useUIStore';
import { useEditorStore } from './useEditorStore';
import { usePipelineStore } from './usePipelineStore';

export const useAgentStore = create<any>()((set, get) => ({
  // UI Store Proxy
  get selectedNodeId() {
    return useUIStore.getState().selectedNodeId;
  },
  setSelectedNodeId: (id: string | null) => {
    useUIStore.getState().setSelectedNodeId(id);
  },

  // Editor Store Proxy
  get nodes() {
    return useEditorStore.getState().nodes;
  },
  get connections() {
    return useEditorStore.getState().connections;
  },
  setNodes: (nodes: any[]) => {
    useEditorStore.getState().setNodes(nodes);
  },
  setConnections: (connections: any[]) => {
    useEditorStore.getState().setConnections(connections);
  },
  addNode: (type: any) => {
    useEditorStore.getState().addNode(type);
  },
  connectNodes: (sourceId: string, targetId: string) => {
    useEditorStore.getState().connectNodes(sourceId, targetId);
  },
  deleteNode: (id: string) => {
    useEditorStore.getState().deleteNode(id);
  },
  updateNodeFields: (nodeId: string, fields: any) => {
    useEditorStore.getState().updateNodeFields(nodeId, fields);
  },

  // Pipeline Store Proxy
  get savedSnapshots() {
    return usePipelineStore.getState().savedSnapshots;
  },
  get projectNameInput() {
    return usePipelineStore.getState().projectNameInput;
  },
  get currentSavedProjectName() {
    return usePipelineStore.getState().currentSavedProjectName;
  },
  setProjectNameInput: (name: string) => {
    usePipelineStore.getState().setProjectNameInput(name);
  },
  setCurrentSavedProjectName: (name: string | null) => {
    usePipelineStore.getState().setCurrentSavedProjectName(name);
  },
  restoreSnapshot: (snapshotId: string) => {
    usePipelineStore.getState().restoreSnapshot(snapshotId);
  },
  loadTemplate: (template: any) => {
    usePipelineStore.getState().loadTemplate(template);
  },
  saveSnapshot: () => {
    usePipelineStore.getState().saveSnapshot();
  }
}));
