import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { applyReview } from '../services/spacedRepetition.js';

const router = Router();

// GET /api/cards?due=true | ?all=true
router.get('/', requireAuth, async (req, res) => {
  const { due, status } = req.query;

  if (due === 'true') {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('memory_cards')
      .select('*')
      .eq('user_id', req.user.id)
      .lte('due_date', now)
      .order('due_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ cards: data });
  }

  let query = supabase
    .from('memory_cards')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ cards: data });
});

// GET /api/cards/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('memory_cards')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Card not found' });
  return res.json({ card: data });
});

// PUT /api/cards/:id — edit card
router.put('/:id', requireAuth, async (req, res) => {
  const schema = z.object({
    front_title: z.string().max(200).optional(),
    pattern: z.string().max(100).optional().nullable(),
    core_insight: z.string().optional().nullable(),
    mental_trigger: z.string().optional().nullable(),
    time_complexity: z.string().max(50).optional().nullable(),
    space_complexity: z.string().max(50).optional().nullable(),
    mistake: z.string().optional().nullable(),
    remember: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['new', 'learning', 'difficult', 'remembered']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { data, error } = await supabase
    .from('memory_cards')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Card not found' });
  return res.json({ card: data });
});

// POST /api/cards/:id/review — body: { outcome: 'forgotten'|'difficult'|'remembered' }
router.post('/:id/review', requireAuth, async (req, res) => {
  const schema = z.object({ outcome: z.enum(['forgotten', 'difficult', 'remembered']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data: card, error: cardError } = await supabase
    .from('memory_cards')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (cardError) return res.status(500).json({ error: cardError.message });
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const next = applyReview(card, parsed.data.outcome);
  const status =
    parsed.data.outcome === 'forgotten'
      ? 'difficult'
      : parsed.data.outcome === 'difficult'
        ? 'difficult'
        : 'remembered';

  const { data: updated, error } = await supabase
    .from('memory_cards')
    .update({
      ...next,
      status,
      last_reviewed: new Date().toISOString(),
    })
    .eq('id', card.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('reviews').insert({
    user_id: req.user.id,
    card_id: card.id,
    outcome: parsed.data.outcome,
    rating:
      parsed.data.outcome === 'forgotten' ? 1 : parsed.data.outcome === 'difficult' ? 3 : 5,
    interval_days: next.interval_days,
    ease_factor: next.ease_factor,
    next_due: next.due_date,
  });

  return res.json({ card: updated, nextDue: next.due_date });
});

// DELETE /api/cards/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('memory_cards')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
