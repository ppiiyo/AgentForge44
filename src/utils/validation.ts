import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const FlowNodeSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  type: z.enum(['input', 'prompt', 'gemini', 'reviewer', 'output', 'router', 'tool', 'rag', 'multimodal']),
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

export const GraphSaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(FlowNodeSchema).optional().default([]),
  connections: z.array(FlowConnectionSchema).optional().default([]),
});

export const PipelineExecuteSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  connections: z.array(FlowConnectionSchema),
  graphId: z.string().optional(),
  graphName: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  inputs: z.record(z.string(), z.any()).optional(),
});

/**
 * Middleware wrapper to validate request payload with Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      if (err.name === 'ZodError' || err instanceof z.ZodError) {
        const issues = err.issues || err.errors || [];
        res.status(400).json({
          success: false,
          error: "Schema validation failed",
          details: issues.map((e: any) => ({
            path: e.path ? e.path.join('.') : '',
            message: e.message || String(e)
          }))
        });
        return;
      }
      res.status(400).json({ success: false, error: err.message || "Invalid payload" });
    }
  };
}
