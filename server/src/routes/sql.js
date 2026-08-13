import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

const sqlProblemSchema = z.object({
  name: z.string().min(1).max(200),
  topic: z.string().max(80).optional().nullable(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('').nullable()),
  date_solved: z.string().optional().nullable(),
  time_taken_min: z.number().int().optional().nullable(),
  confidence: z.number().int().min(1).max(5).optional().nullable(),
  query: z.string().optional().nullable(),
  approach: z.string().optional().nullable(),
  mistake: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  complexity: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_REVIEW_PROMPT = `You are a senior SQL tutor and database interviewer.
Review the user's SQL query for a given problem.
Give a structured, concise review with these sections:
1. Correctness — does it answer the question? Any bugs?
2. Query plan / efficiency — indexing, scan vs seek, N+1 risks.
3. Best practices — naming, readability, SQL style.
4. Edge cases — NULLs, duplicates, empty tables, ties.
5. Score (0-10) and how to improve.
Be specific. Quote the exact SQL when pointing things out.
Use a Mermaid diagram (fenced block with the "mermaid" language tag) when it helps illustrate the query flow, joins, or a better query plan.`;

// GET /api/sql — list with filters
router.get('/', requireAuth, async (req, res) => {
  const { topic, difficulty, q } = req.query;
  let query = supabase
    .from('sql_problems')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (topic) query = query.eq('topic', topic);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ problems: data });
});

// GET /api/sql/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sql_problems')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Problem not found' });
  return res.json({ problem: data });
});

// POST /api/sql
router.post('/', requireAuth, async (req, res) => {
  const parsed = sqlProblemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase
    .from('sql_problems')
    .insert({
      ...parsed.data,
      user_id: req.user.id,
      date_solved: parsed.data.date_solved || new Date().toISOString(),
      url: parsed.data.url || null,
    })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ problem: data });
});

// PUT /api/sql/:id
router.put('/:id', requireAuth, async (req, res) => {
  const parsed = sqlProblemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase
    .from('sql_problems')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Problem not found' });
    return res.status(500).json({ error: error.message });
  }
  return res.json({ problem: data });
});

// DELETE /api/sql/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('sql_problems')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// POST /api/sql/:id/review — AI review of the saved query
router.post('/:id/review', requireAuth, async (req, res) => {
  const { data: problem, error } = await supabase
    .from('sql_problems')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!problem) return res.status(404).json({ error: 'Problem not found' });

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!settingsRow?.ai_api_key) {
    return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
  }

  const settings = resolveSettings(settingsRow);
  const userMessage = `Problem: ${problem.name}\nTopic: ${problem.topic || '—'}\nDifficulty: ${problem.difficulty || '—'}\n\nMy approach:\n${problem.approach || '(not provided)'}\n\nMy SQL query:\n${problem.query || '(not provided)'}`;

  try {
    const reply = await chatCompletion({
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: SYSTEM_REVIEW_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
    });

    await supabase
      .from('sql_problems')
      .update({ ai_review: { content: reply, reviewed_at: new Date().toISOString() } })
      .eq('id', problem.id)
      .eq('user_id', req.user.id);

    return res.json({ review: reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
