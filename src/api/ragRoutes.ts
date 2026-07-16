import { Router, Request, Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service.js';
import { createRequire } from 'module';

// Use standard CJS require if available, otherwise fall back to createRequire in ESM
const getRequire = () => {
  if (typeof require !== 'undefined') return require;
  return createRequire(import.meta.url);
};

const safeRequire = getRequire();
const pdfParse = safeRequire('pdf-parse');
// @ts-ignore
import mammoth from 'mammoth';
import { logger } from '../utils/logger.js';

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

router.post('/rag/upload-binary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, fileType, base64 } = req.body;
    if (!base64 || !fileName) {
      res.status(400).json({ error: "Missing file name or base64 data" });
      return;
    }

    logger.info(`Received binary upload request for ${fileName} (${fileType}), decoding base64...`);
    const buffer = Buffer.from(base64, 'base64');
    let extractedText = '';

    if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
      const parsedData = await pdfParse(buffer);
      extractedText = parsedData.text;
    } else if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      extractedText = buffer.toString('utf8');
    }

    if (!extractedText || !extractedText.trim()) {
      res.status(400).json({ error: "Extracted text is empty or document format is unsupported." });
      return;
    }

    logger.info(`Successfully parsed ${extractedText.length} characters of text from ${fileName}. Adding to vector store...`);
    const ids = await ragService.addDocument(extractedText, { source: fileName });
    res.json({ success: true, fileName, chunkCount: ids.length, ids });
  } catch (err: any) {
    logger.error(`Error parsing binary document: ${err.message || err}`);
    res.status(500).json({ error: `Parsing failed: ${err.message || err}` });
  }
});

export default router;

