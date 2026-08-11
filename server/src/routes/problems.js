import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createCardFromProblem } from '../services/spacedRepetition.js';

const router = Router();

const problemSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.string().max(50).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('').nullable()),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().nullable(),
  topic: z.string().max(80).optional().nullable(),
  date_solved: z.string().optional().nullable(),
  language: z.string().max(50).optional().nullable(),
  time_taken_min: z.number().int().optional().nullable(),
  attempts: z.number().int().min(1).optional().nullable(),
  solved_independently: z.boolean().optional().nullable(),
  confidence: z.number().int().min(1).max(5).optional().nullable(),
  difficulty_experienced: z.string().max(20).optional().nullable(),
  how_i_solved: z.string().optional().nullable(),
  key_insight: z.string().optional().nullable(),
  mistake: z.string().optional().nullable(),
  why_first_failed: z.string().optional().nullable(),
  pattern: z.string().max(100).optional().nullable(),
  time_complexity: z.string().max(50).optional().nullable(),
  space_complexity: z.string().max(50).optional().nullable(),
  code: z.string().optional().nullable(),
  alternative_approach: z.string().optional().nullable(),
  when_to_use: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

// GET /api/problems — list with filters
router.get('/', requireAuth, async (req, res) => {
  const { topic, platform, difficulty, q } = req.query;
  let query = supabase
    .from('problems')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (topic) query = query.eq('topic', topic);
  if (platform) query = query.eq('platform', platform);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ problems: data });
});

// GET /api/problems/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Problem not found' });
  return res.json({ problem: data });
});

// POST /api/problems — creates a memory card automatically
router.post('/', requireAuth, async (req, res) => {
  const parsed = problemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const payload = {
    ...parsed.data,
    user_id: req.user.id,
    date_solved: parsed.data.date_solved || new Date().toISOString(),
  };

  const { data: problem, error } = await supabase
    .from('problems')
    .insert(payload)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const card = createCardFromProblem(problem);
  const { data: cardRow, error: cardError } = await supabase
    .from('memory_cards')
    .insert(card)
    .select('*')
    .single();
  if (cardError) console.error('[problems] card create:', cardError.message);

  return res.status(201).json({ problem, card: cardRow || null });
});

// PUT /api/problems/:id
router.put('/:id', requireAuth, async (req, res) => {
  const parsed = problemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { data: problem, error } = await supabase
    .from('problems')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Problem not found' });
    return res.status(500).json({ error: error.message });
  }

  // Re-sync the linked memory card's derived fields.
  await supabase
    .from('memory_cards')
    .update({
      pattern: problem.pattern || problem.topic || '',
      core_insight: problem.key_insight || problem.pattern || '',
      time_complexity: problem.time_complexity || '',
      space_complexity: problem.space_complexity || '',
      mistake: problem.mistake || '',
      remember: problem.when_to_use || '',
      tags: problem.tags || [],
    })
    .eq('problem_id', problem.id)
    .eq('user_id', req.user.id);

  return res.json({ problem });
});

// DELETE /api/problems/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('problems')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
