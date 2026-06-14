import { FlowNode, FlowConnection } from '../types.js';

export function importFromLangFlow(data: any): { nodes: FlowNode[]; connections: FlowConnection[] } {
  const nodes: FlowNode[] = [];
  const connections: FlowConnection[] = [];

  try {
    // Navigate LangFlow nested JSON structures gracefully
    const graph = data.graph || data;
    const rawNodes = graph.nodes || [];
    const rawEdges = graph.edges || [];

    rawNodes.forEach((node: any) => {
      // Extract node type and configuration gracefully
      const nodeId = node.id || `node_${Math.random().toString(36).substr(2, 9)}`;
      const nodeTypeRaw = (node.type || node.data?.type || '').toLowerCase();
      
      let type: 'input' | 'prompt' | 'gemini' | 'reviewer' | 'router' | 'tool' | 'output' = 'gemini';
      if (nodeTypeRaw.includes('input') || nodeTypeRaw.includes('text') && !nodeTypeRaw.includes('prompt')) {
        type = 'input';
      } else if (nodeTypeRaw.includes('prompt') || nodeTypeRaw.includes('template')) {
        type = 'prompt';
      } else if (nodeTypeRaw.includes('agent') || nodeTypeRaw.includes('chain') || nodeTypeRaw.includes('llm') || nodeTypeRaw.includes('gemini') || nodeTypeRaw.includes('openai')) {
        type = 'gemini';
      } else if (nodeTypeRaw.includes('tool') || nodeTypeRaw.includes('fetch') || nodeTypeRaw.includes('http')) {
        type = 'tool';
      } else if (nodeTypeRaw.includes('router') || nodeTypeRaw.includes('switch')) {
        type = 'router';
      } else if (nodeTypeRaw.includes('output') || nodeTypeRaw.includes('display')) {
        type = 'output';
      } else if (nodeTypeRaw.includes('review') || nodeTypeRaw.includes('eval')) {
        type = 'reviewer';
      }

      // Read visual properties or fields
      const title = node.data?.node?.display_name || node.label || node.id || 'Imported Node';
      const fields: any = {};

      const template = node.data?.node?.template || {};
      if (template.template) {
        fields.template = template.template.value || '';
      }
      if (template.model_name || template.model) {
        fields.model = template.model_name?.value || template.model?.value || 'gemini-3.5-flash';
      }
      if (template.system_message || template.system_instruction) {
        fields.systemInstruction = template.system_message?.value || template.system_instruction?.value || '';
      }
      if (template.temperature) {
        fields.temperature = Number(template.temperature.value) || 0.7;
      }

      nodes.push({
        id: nodeId,
        type,
        title,
        fields,
        x: node.position?.x || node.x || Math.random() * 400 + 100,
        y: node.position?.y || node.y || Math.random() * 400 + 100
      } as any);
    });

    rawEdges.forEach((edge: any, index: number) => {
      const id = edge.id || `conn_${index}_${Date.now()}`;
      const sourceId = edge.source || edge.data?.source || '';
      const targetId = edge.target || edge.data?.target || '';
      if (sourceId && targetId) {
        connections.push({ id, sourceId, targetId });
      }
    });

  } catch (err: any) {
    throw new Error(`Failed to parse LangFlow JSON workflow structures: ${err.message}`);
  }

  return { nodes, connections };
}

export function importFromFlowise(data: any): { nodes: FlowNode[]; connections: FlowConnection[] } {
  const nodes: FlowNode[] = [];
  const connections: FlowConnection[] = [];

  try {
    const rawNodes = Array.isArray(data) ? data : (data.nodes || []);
    const rawEdges = data.edges || [];

    rawNodes.forEach((node: any) => {
      const nodeId = node.id || `node_${Math.random().toString(36).substr(2, 9)}`;
      const nodeLabel = node.label || node.name || 'Flowise Node';
      const category = (node.category || node.type || '').toLowerCase();

      let type: 'input' | 'prompt' | 'gemini' | 'reviewer' | 'router' | 'tool' | 'output' = 'gemini';
      if (category.includes('input') || category.includes('text') && !category.includes('prompt')) {
        type = 'input';
      } else if (category.includes('prompt') || category.includes('template')) {
        type = 'prompt';
      } else if (category.includes('chain') || category.includes('agent') || category.includes('llm') || category.includes('model') || category.includes('chat')) {
        type = 'gemini';
      } else if (category.includes('tool') || category.includes('api') || category.includes('fetch')) {
        type = 'tool';
      } else if (category.includes('router') || category.includes('switch')) {
        type = 'router';
      } else if (category.includes('output')) {
        type = 'output';
      } else if (category.includes('review') || category.includes('eval')) {
        type = 'reviewer';
      }

      const inputs = node.inputs || {};
      const fields: any = {};
      if (inputs.template || inputs.prompt) {
        fields.template = inputs.template || inputs.prompt || '';
      }
      if (inputs.modelName || inputs.model) {
        fields.model = inputs.modelName || inputs.model || 'gemini-3.5-flash';
      }
      if (inputs.systemMessage || inputs.system_message) {
        fields.systemInstruction = inputs.systemMessage || inputs.system_message || '';
      }
      if (inputs.temperature) {
        fields.temperature = Number(inputs.temperature) || 0.7;
      }

      nodes.push({
        id: nodeId,
        type,
        title: nodeLabel,
        fields,
        x: node.position?.x || node.x || Math.random() * 400 + 100,
        y: node.position?.y || node.y || Math.random() * 400 + 100
      } as any);
    });

    // Extract connections. Flowise records connections under edge connections or edge inputs
    rawEdges.forEach((edge: any, index: number) => {
      const id = edge.id || `conn_${index}_${Date.now()}`;
      const sourceId = edge.source || edge.sourceNodeId || '';
      const targetId = edge.target || edge.targetNodeId || '';
      if (sourceId && targetId) {
        connections.push({ id, sourceId, targetId });
      }
    });

    // Fallback: search node inputs as references to other node ids
    if (connections.length === 0) {
      rawNodes.forEach((node: any) => {
        const inputs = node.inputs || {};
        Object.keys(inputs).forEach(key => {
          const val = inputs[key];
          if (typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}')) {
            const potentialSourceId = val.replace(/[{}]/g, '').trim();
            const sourceExists = rawNodes.some((n: any) => n.id === potentialSourceId);
            if (sourceExists) {
              connections.push({
                id: `conn_${node.id}_${potentialSourceId}_${Date.now()}`,
                sourceId: potentialSourceId,
                targetId: node.id
              });
            }
          }
        });
      });
    }

  } catch (err: any) {
    throw new Error(`Failed to parse Flowise JSON workflow structures: ${err.message}`);
  }

  return { nodes, connections };
}
