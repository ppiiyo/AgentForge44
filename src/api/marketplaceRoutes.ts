import { Router, Request, Response } from 'express';
import { MarketplaceManager } from './marketplace.js';
import { requireRole } from './authRoutes.js';

const router = Router();

router.get('/marketplace', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    
    const result = await MarketplaceManager.getItems(category, tag, search, sortBy, page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/marketplace/featured', async (req: Request, res: Response) => {
  try {
    const items = await MarketplaceManager.getFeatured();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/marketplace/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await MarketplaceManager.getItemById(id);
    if (!item) {
      res.status(404).json({ error: "Marketplace item not found" });
      return;
    }
    const reviews = await MarketplaceManager.getReviews(id);
    res.json({ item, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  try {
    const { title, description, category, graphSnapshot, tags, authorId } = req.body;
    if (!title || !category || !graphSnapshot) {
      res.status(400).json({ error: "Title, category, and graphSnapshot are required properties." });
      return;
    }
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const item = await MarketplaceManager.publishItem(title, description, category, graphSnapshot, tags || [], authorId, tenantId);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedItem = await MarketplaceManager.incrementDownload(id);
    res.json({ success: true, graphSnapshot: updatedItem.graphSnapshot, downloadsCount: updatedItem.downloadsCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/:id/reviews', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    if (rating === undefined || rating < 1 || rating > 5 || !comment) {
      res.status(400).json({ error: "Rating (1-5) and a written comment are required." });
      return;
    }
    const review = await MarketplaceManager.addReview(id, userId, rating, comment);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
