import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { FlowNodeSchema, FlowConnectionSchema, PipelineExecuteSchema } from '../schemas/pipeline.schema.ts';

export { FlowNodeSchema, FlowConnectionSchema, PipelineExecuteSchema };

export const GraphSaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(FlowNodeSchema).optional().default([]),
  connections: z.array(FlowConnectionSchema).optional().default([]),
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
