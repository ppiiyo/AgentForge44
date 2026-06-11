export type NodeType = 'input' | 'prompt' | 'gemini' | 'reviewer' | 'output';

export interface NodeSpec {
  id: string;
  type: NodeType | 'subgraph';
  title: string;
  fields: Record<string, any>;
  subgraphConfig?: {
    nodes: NodeSpec[];
    connections: EdgeSpec[];
  };
}

export interface EdgeSpec {
  id: string;
  sourceId: string;
  targetId: string;
  condition?: string; // JS expression for conditional routing
}

export interface GraphSpec {
  nodes: NodeSpec[];
  connections: EdgeSpec[];
}

export interface GraphState {
  values: Record<string, any>;
  logs: any[];
}
