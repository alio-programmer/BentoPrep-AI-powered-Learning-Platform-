import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard } from '../services/analytics.js';

const router = Router();

// GET /api/dashboard — everything the dashboard needs
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await getDashboard(req.user.id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
