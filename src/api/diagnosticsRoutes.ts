import { Router, Request, Response } from 'express';
import { runInitializationDiagnostic } from '../utils/InitializationDiagnostic.js';
import { logger } from '../utils/logger.js';

export function createDiagnosticsRoutes(): Router {
  const router = Router();

  router.get('/diagnostics', async (req: Request, res: Response) => {
    try {
      const results = await runInitializationDiagnostic();
      res.json(results);
    } catch (err: any) {
      logger.error('Failed to run diagnostics:', { error: err.message || err });
      res.status(500).json({
        success: false,
        error: err.message || 'Internal diagnostics execution failure'
      });
    }
  });

  return router;
}

export default createDiagnosticsRoutes();
