import { Router, Request, Response } from 'express';
import { getPatternTemplate } from './advancedPhase4.js';

const router = Router();

router.get('/patterns/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (type !== 'supervisor' && type !== 'debate') {
      res.status(405).json({ error: "Unsupported architecture pattern type requested." });
      return;
    }
    const nodesAndConns = getPatternTemplate(type);
    res.json(nodesAndConns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
