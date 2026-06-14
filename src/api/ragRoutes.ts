import { Router, Request, Response } from 'express';
import { indexLibraryDocument, searchIndexedLibrary } from './advancedPhase4.js';

const router = Router();

router.post('/rag/index', (req: Request, res: Response) => {
  try {
    const { text, source } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text payload empty, cannot build index." });
      return;
    }

    const indexRes = indexLibraryDocument(text, source || "UI Document Upload");
    res.json(indexRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rag/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: "No search term query parameter provided." });
      return;
    }

    const results = searchIndexedLibrary(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
