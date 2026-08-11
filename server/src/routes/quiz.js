import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

const TRACKS = {
  dsa: {
    label: 'DSA',
    topics: ['Arrays', 'Strings', 'Hashing', 'Linked Lists', 'Stack', 'Queue', 'Trees', 'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Binary Search', 'Sliding Window', 'Two Pointers', 'Heap', 'Recursion', 'Mixed'],
  },
  sql: {
    label: 'SQL',
    topics: ['Basic SQL', 'Joins', 'Aggregations', 'Subqueries', 'CTEs', 'Window Functions', 'Ranking', 'Date Functions', 'Advanced SQL', 'Mixed'],
  },
  design: {
    label: 'System Design',
    topics: ['Low-Level Design', 'High-Level Design', 'Design Patterns', 'SOLID', 'System Design Concepts', 'Mixed'],
  },
  fundamentals: {
    label: 'CS Fundamentals',
    topics: ['Operating Systems', 'DBMS', 'Computer Networks', 'OOP', 'System Design', 'Distributed Systems', 'Mixed'],
  },
};

// GET /api/quiz — track/topic metadata
router.get('/', requireAuth, (_req, res) => {
  return res.json({ tracks: TRACKS });
});

// POST /api/quiz — generate N AI questions
router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({
    track: z.enum(Object.keys(TRACKS)),
    topic: z.string().max(80).optional(),
    count: z.union([z.literal(5), z.literal(10)]).default(5),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!settingsRow?.ai_api_key) {
    return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
  }

  const settings = resolveSettings(settingsRow);
  const topicLabel = parsed.data.topic || 'a mix of key topics';
  const trackLabel = TRACKS[parsed.data.track].label;

  const system = `You are a quiz generator for technical interview preparation.
Generate exactly ${parsed.data.count} multiple-choice questions for a ${trackLabel} pop quiz on "${topicLabel}".

Rules:
- Questions must be unambiguous, answerable without a compiler, and realistic interview questions.
- Each question has exactly 4 options and ONE correct answer.
- The correct answer index is 0-based (A=0, B=1, C=2, D=3).
- Include a 1-2 sentence explanation for each answer.
- Difficulty should vary: ~30% easy, ~50% medium, ~20% hard.

Return ONLY valid JSON (no markdown, no commentary):
{ "questions": [ { "question": "...", "options": ["A...", "B...", "C...", "D..."], "answer": 0, "explanation": "...", "difficulty": "Easy|Medium|Hard" } ] }`;

  try {
    const reply = await chatCompletion({
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Generate a ${parsed.data.count}-question ${trackLabel} quiz on "${topicLabel}".` },
      ],
      temperature: 0.7,
    });

    const cleaned = String(reply || '').trim();
    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : cleaned;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
    const raw = JSON.parse(candidate.slice(start, end + 1));

    const questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .slice(0, parsed.data.count)
      .map((q) => ({
        question: String(q.question || '').slice(0, 500),
        options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o) => String(o).slice(0, 300)),
        answer: Number(q.answer) || 0,
        explanation: String(q.explanation || '').slice(0, 600),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
      }))
      .filter((q) => q.question && q.options.length === 4);

    if (questions.length === 0) throw new Error('AI returned no valid questions');

    return res.json({ questions });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
