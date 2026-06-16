import { create } from 'zustand';
import { FlowNode, FlowConnection, NodeType, Workflow } from '../types';

interface AgentState {
  nodes: FlowNode[];
  connections: FlowConnection[];
  selectedNodeId: string | null;
  savedSnapshots: Array<{ id: string; name: string; timestamp: string; nodes: FlowNode[]; connections: FlowConnection[] }>;
  projectNameInput: string;
  currentSavedProjectName: string | null;

  // Actions
  setNodes: (nodes: FlowNode[]) => void;
  setConnections: (connections: FlowConnection[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setProjectNameInput: (name: string) => void;
  setCurrentSavedProjectName: (name: string | null) => void;

  addNode: (type: NodeType) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  deleteNode: (id: string) => void;
  updateNodeFields: (nodeId: string, fields: Record<string, any>) => void;
  restoreSnapshot: (snapshotId: string) => void;
  loadTemplate: (template: Workflow) => void;
  saveSnapshot: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  nodes: [],
  connections: [],
  selectedNodeId: null,
  savedSnapshots: [],
  projectNameInput: '',
  currentSavedProjectName: null,

  setNodes: (nodes) => set({ nodes }),
  setConnections: (connections) => set({ connections }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setProjectNameInput: (projectNameInput) => set({ projectNameInput }),
  setCurrentSavedProjectName: (currentSavedProjectName) => set({ currentSavedProjectName }),

  addNode: (type) => {
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    let title = "Custom Node";
    let description = "Node definition";
    let initialFields: any = {};

    switch (type) {
      case 'input':
        title = "Input variables";
        description = "Initial template variable map definition.";
        initialFields = { variables: [{ key: 'topic', value: 'Open Source', label: 'Topic Key' }] };
        break;
      case 'prompt':
        title = "Prompt Template";
        description = "Custom blueprint rendering with variables.";
        initialFields = { template: "Write a short brief about {topic}." };
        break;
      case 'gemini':
        title = "Gemini LLM Unit";
        description = "Generators powered by Google Gemini.";
        initialFields = { model: 'gemini-3.5-flash', temperature: 0.7, systemInstruction: 'You are custom logic generator.', useSearchGrounding: false };
        break;
      case 'reviewer':
        title = "Critique & Review";
        description = "Automated loop review self-corrections.";
        initialFields = { criteria: "Check if outline is concise.", maxIterations: 1 };
        break;
      case 'output':
        title = "Final Output Display";
        description = "Aggregated result viewer.";
        initialFields = { format: 'markdown', value: '' };
        break;
      case 'router':
        title = "Execution Router";
        description = "Evaluate and branch traffic flows.";
        initialFields = { conditions: [], defaultTargetNodeId: '' };
        break;
      case 'tool':
        title = "External Tool API";
        description = "HTTP request connection controller.";
        initialFields = { url: 'https://api.github.com/zen', method: 'GET', headers: '{}', body: '' };
        break;
      case 'rag':
        title = "RAG Search Retriever";
        description = "Query your vector-indexed library database.";
        initialFields = { searchQuery: '{{topic}}', limit: 3, ragResults: [] };
        break;
      case 'multimodal':
        title = "Multimodal Document Hub";
        description = "Ingest, parse and analyze PDF, spreadsheets, audio or image sheets.";
        initialFields = { mediaType: 'image', mediaData: '', analysisPrompt: 'Transcribe, extract or analyze the table variables of this attachment.', useGeminiLive: false, outputVariables: 'extractedText=text' };
        break;
    }

    const newNode: FlowNode = {
      id,
      type,
      title,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      description,
      fields: initialFields
    };

    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id
    });
  },

  connectNodes: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const connections = get().connections;
    const alreadyConnected = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
    if (alreadyConnected) return;

    const newConnection: FlowConnection = {
      id: `c-${Date.now().toString().slice(-4)}`,
      sourceId,
      targetId
    };

    set({ connections: [...connections, newConnection] });
  },

  deleteNode: (id) => {
    const nodes = get().nodes.filter(n => n.id !== id);
    const connections = get().connections.filter(c => c.sourceId !== id && c.targetId !== id);
    const selectedNodeId = get().selectedNodeId === id ? null : get().selectedNodeId;

    set({ nodes, connections, selectedNodeId });
  },

  updateNodeFields: (nodeId, fields) => {
    const nodes = get().nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          fields: {
            ...node.fields,
            ...fields
          }
        };
      }
      return node;
    });

    set({ nodes });
  },

  restoreSnapshot: (snapshotId) => {
    const found = get().savedSnapshots.find(s => s.id === snapshotId);
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
}));
