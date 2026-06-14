import { Router, Request, Response } from 'express';
import { MarketplaceManager } from './marketplace.js';

const router = Router();

router.get('/marketplace', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const items = MarketplaceManager.getItems(category, tag, search, sortBy);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/marketplace/featured', (req: Request, res: Response) => {
  try {
    const items = MarketplaceManager.getFeatured();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/marketplace/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = MarketplaceManager.getItemById(id);
    if (!item) {
      res.status(404).json({ error: "Marketplace item not found" });
      return;
    }
    const reviews = MarketplaceManager.getReviews(id);
    res.json({ item, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace', (req: Request, res: Response) => {
  try {
    const { title, description, category, graphSnapshot, tags, authorId } = req.body;
    if (!title || !category || !graphSnapshot) {
      res.status(400).json({ error: "Title, category, and graphSnapshot are required properties." });
      return;
    }
    const item = MarketplaceManager.publishItem(title, description, category, graphSnapshot, tags || [], authorId);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/:id/download', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedItem = MarketplaceManager.incrementDownload(id);
    res.json({ success: true, graphSnapshot: updatedItem.graphSnapshot, downloadsCount: updatedItem.downloadsCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/:id/reviews', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    if (rating === undefined || rating < 1 || rating > 5 || !comment) {
      res.status(400).json({ error: "Rating (1-5) and a written comment are required." });
      return;
    }
    const review = MarketplaceManager.addReview(id, userId, rating, comment);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
