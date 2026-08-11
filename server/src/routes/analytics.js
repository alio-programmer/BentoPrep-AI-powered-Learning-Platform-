import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProblems, overview, topicPerformance, streak, solveCalendar } from '../services/analytics.js';

const router = Router();

// GET /api/analytics — aggregated stats + charts
router.get('/', requireAuth, async (req, res) => {
  try {
    const problems = await getProblems(req.user.id);
    const tp = topicPerformance(problems);
    const dsaReady = tp.length
      ? Math.round(tp.reduce((s, t) => s + t.performance, 0) / tp.length)
      : 0;
    return res.json({
      overview: overview(problems),
      topics: tp,
      streak: streak(problems),
      calendar: solveCalendar(problems),
      readiness: {
        dsa: dsaReady,
        overall: dsaReady,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
