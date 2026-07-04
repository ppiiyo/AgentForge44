import { Router, Request, Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service.js';

const router = Router();

router.post('/rag/index', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, source } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text payload empty, cannot build index." });
      return;
    }

    const ids = await ragService.addDocument(text, { source: source || "UI Document Upload" });
    res.json({ success: true, chunkCount: ids.length, ids });
  } catch (err: any) {
    next(err);
  }
});

router.post('/rag/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, metadata } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text payload empty, cannot build index." });
      return;
    }

    const ids = await ragService.addDocument(text, metadata || {});
    res.json({ success: true, chunksCount: ids.length, ids });
  } catch (err: any) {
    next(err);
  }
});

router.get('/rag/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    if (!query) {
      res.status(400).json({ error: "No search term query parameter provided." });
      return;
    }

    const results = await ragService.search(query, limit);
    // Maintain backward compatibility structure
    const formattedChunks = results.map(r => ({
      id: r.document.id,
      source: r.document.metadata.source || "Unknown Source",
      text: r.document.text
    }));
    res.json({ chunks: formattedChunks, results });
  } catch (err: any) {
    next(err);
  }
});

router.post('/rag/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    const results = await ragService.search(query, topK);
    res.json({ results, count: results.length });
  } catch (err: any) {
    next(err);
  }
});

router.get('/rag/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ragService.getStats();
    res.json(stats);
  } catch (err: any) {
    next(err);
  }
});

router.get('/rag/chunks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chunks = await ragService.getAllChunks();
    res.json({ chunks });
  } catch (err: any) {
    next(err);
  }
});

router.delete('/rag/document/:source', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const source = req.params.source;
    await ragService.deleteDocumentBySource(source);
    res.json({ success: true, message: `Document "${source}" deleted.` });
  } catch (err: any) {
    next(err);
  }
});

export default router;

