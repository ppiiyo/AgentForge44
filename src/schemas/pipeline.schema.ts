import { z } from 'zod';

export const FlowNodeSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  type: z.enum(['input', 'prompt', 'gemini', 'reviewer', 'output', 'router', 'tool', 'rag', 'multimodal', 'human_confirmation', 'prompt_optimizer', 'vector-search']),
  title: z.string().default('Untitled Node'),
  x: z.number().optional().default(0),
  y: z.number().optional().default(0),
  description: z.string().optional().default(''),
  fields: z.record(z.string(), z.any()).optional().default({}),
});

export const FlowConnectionSchema = z.object({
  id: z.string().optional(),
  sourceId: z.string().min(1, "Connection sourceId is required"),
  targetId: z.string().min(1, "Connection targetId is required"),
});

export const PipelineExecuteSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  connections: z.array(FlowConnectionSchema).optional().default([]),
  graphId: z.string().optional(),
  graphName: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  inputs: z.record(z.string(), z.any()).optional(),
});
