import { create } from 'zustand';
import { FlowNode, FlowConnection, NodeType, PREBUILT_TEMPLATES } from '../types';
import { useUIStore } from './useUIStore';

export interface EditorState {
  nodes: FlowNode[];
  connections: FlowConnection[];
  setNodes: (nodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void;
  setConnections: (connections: FlowConnection[] | ((prev: FlowConnection[]) => FlowConnection[])) => void;
  addNode: (type: NodeType) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  deleteNode: (id: string) => void;
  updateNodeFields: (nodeId: string, fields: Record<string, any>) => void;
}

const loadLocalNodes = (): FlowNode[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem("agentforge_autosave_nodes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
  }
  return PREBUILT_TEMPLATES[0]?.nodes || [];
};

const loadLocalConnections = (): FlowConnection[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem("agentforge_autosave_connections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
  }
  return PREBUILT_TEMPLATES[0]?.connections || [];
};

const saveLocalNodes = (nodes: FlowNode[]) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem("agentforge_autosave_nodes", JSON.stringify(nodes));
  }
};

const saveLocalConnections = (connections: FlowConnection[]) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem("agentforge_autosave_connections", JSON.stringify(connections));
  }
};

export const useEditorStore = create<EditorState>()((set, get) => ({
  nodes: loadLocalNodes(),
  connections: loadLocalConnections(),

  setNodes: (nodes) => set((state) => {
    const nextNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
    saveLocalNodes(nextNodes);
    return { nodes: nextNodes };
  }),
  setConnections: (connections) => set((state) => {
    const nextConnections = typeof connections === 'function' ? connections(state.connections) : connections;
    saveLocalConnections(nextConnections);
    return { connections: nextConnections };
  }),

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
      case 'vector-search':
        title = "RAG Search Retriever";
        description = "Query your vector-indexed library database.";
        initialFields = { searchQuery: '{{topic}}', limit: 3, ragResults: [] };
        break;
      case 'multimodal':
        title = "Multimodal Document Hub";
        description = "Ingest, parse and analyze PDF, spreadsheets, audio or image sheets.";
        initialFields = { mediaType: 'image', mediaData: '', analysisPrompt: 'Transcribe, extract or analyze the table variables of this attachment.', useGeminiLive: false, outputVariables: 'extractedText=text' };
        break;
      case 'human_confirmation':
        title = "Wait Human Gate";
        description = "Halt agent trace execution to retrieve manual OK or payload approval.";
        initialFields = { message: 'Operator, please review current pipeline transaction. Approve to proceed.', approvedValue: 'Action Approved', rejectedMessage: 'Cancelled' };
        break;
      case 'prompt_optimizer':
        title = "Instruct COT Optimizer";
        description = "Inject a dynamically compiled Few-shot CoT optimized instruction template.";
        initialFields = { originalPrompt: 'Explain quantum computing in simple language', targetPersona: 'E-learning Curriculum Lead Designer', optimizedPrompt: '' };
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
      nodes: [...get().nodes, newNode]
    });
    
    // Cross-store selection update
    useUIStore.getState().setSelectedNodeId(id);
  },

  connectNodes: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const connections = get().connections;
    const alreadyConnected = connections.some((c: FlowConnection) => c.sourceId === sourceId && c.targetId === targetId);
    if (alreadyConnected) return;

    const newConnection: FlowConnection = {
      id: `c-${Date.now().toString().slice(-4)}`,
      sourceId,
      targetId
    };

    set({ connections: [...connections, newConnection] });
  },

  deleteNode: (id) => {
    const nodes = get().nodes.filter((n: FlowNode) => n.id !== id);
    const connections = get().connections.filter((c: FlowConnection) => c.sourceId !== id && c.targetId !== id);
    
    // Cross-store selection update
    const currentSelectedId = useUIStore.getState().selectedNodeId;
    if (currentSelectedId === id) {
      useUIStore.getState().setSelectedNodeId(null);
    }

    set({ nodes, connections });
  },

  updateNodeFields: (nodeId, fields) => {
    const nodes = get().nodes.map((node: FlowNode) => {
      if (node.id === nodeId) {
        return {
          ...node,
          fields: {
            ...node.fields,
            ...fields
          }
        } as FlowNode;
      }
      return node;
    }) as FlowNode[];

    set({ nodes });
  }
}));

// Auto-save nodes and connections to localStorage whenever the store state changes
useEditorStore.subscribe((state) => {
  saveLocalNodes(state.nodes);
  saveLocalConnections(state.connections);
});
