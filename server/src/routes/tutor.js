import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

export const MODES = {
  hint: {
    label: 'Hint Mode',
    blurb: 'Progressive hints — never the full solution until you ask.',
    prompts: ['Give me a hint', 'Another hint please', 'A bigger hint', 'Ok, show me the solution'],
  },
  socratic: {
    label: 'Socratic Mode',
    blurb: 'I ask guiding questions so you discover the answer yourself.',
    prompts: ['Walk me through it with questions', 'I am stuck on the approach', 'Quiz me to check my understanding'],
  },
  explain: {
    label: 'Explain Mode',
    blurb: 'Concepts explained from beginner to advanced.',
    prompts: ['Explain this concept from the basics', 'Give me a real-world example', 'Why does this work?'],
  },
  review: {
    label: 'Code Review Mode',
    blurb: 'Analyze your code — bugs, complexity, style, improvements.',
    prompts: ['Review this code', 'Is this efficient?', 'How can I improve this?'],
  },
  interviewer: {
    label: 'Interviewer Mode',
    blurb: 'A real interview: questions, follow-ups, and evaluation.',
    prompts: ['Ask me a problem', 'Harder please', 'Evaluate my last answer'],
  },
};

const MODE_PROMPTS = {
  hint: `You are a coding interview mentor in HINT mode.
Give ONLY progressive hints, one small step at a time.
Do NOT reveal the full solution unless the student explicitly asks ("show me the solution").
After each hint, ask if they want another hint or want to try.
Reference the approach pattern (e.g. hashmap, two pointers) only as a nudge.`,

  socratic: `You are a Socratic coding tutor.
Do NOT give answers directly. Ask one focused guiding question at a time.
Use the student's responses to drive the next question toward the correct approach.
Occasionally summarize what they have figured out. Stay encouraging.`,

  explain: `You are a patient computer science teacher in EXPLAIN mode.
Explain the concept from beginner to advanced.
Use analogies, small code examples, and step-by-step reasoning.
Ask at the end what they'd like to go deeper on.`,

  review: `You are a senior engineer doing a CODE REVIEW.
Analyze the student's code for: correctness, bugs, edge cases, time/space complexity,
readability, and idiomatic improvements.
Give a short verdict first, then a structured list of findings with suggestions.
Be specific and reference the code.`,

  interviewer: `You are a technical interviewer conducting a live coding interview.
Pick a problem matched to the student's level, ask ONE question at a time, and WAIT for their answer.
After each answer, ask natural follow-ups (clarify approach, complexity, edge cases).
Do NOT jump to evaluation until they solve it or ask for it.
When the problem is done or they ask, give a structured evaluation:
strengths, weaknesses, and a score out of 100.`,
};

function buildSystemPrompt(mode, context) {
  const base = MODE_PROMPTS[mode] || MODE_PROMPTS.explain;
  const parts = [base];
  if (context) parts.push(`\nRelevant context from the student's BentoPrep data:\n${context}`);
  parts.push(`\nFormat guidance: use markdown headings, short bullets, and fenced code blocks for code/diagrams.`);
  return parts.join('\n');
}

function summarizeProblem(p) {
  return [
    `Problem: ${p.name}`,
    `Platform: ${p.platform || '—'} · Topic: ${p.topic || '—'} · Difficulty: ${p.difficulty || '—'}`,
    p.pattern ? `Pattern: ${p.pattern}` : '',
    p.how_i_solved ? `How I solved it: ${p.how_i_solved}` : '',
    p.key_insight ? `Key insight: ${p.key_insight}` : '',
    p.mistake ? `Mistake I made: ${p.mistake}` : '',
    p.code ? `My code:\n${p.code}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function summarizeCard(c) {
  return [
    `Card: ${c.front_title}`,
    c.pattern ? `Pattern: ${c.pattern}` : '',
    c.core_insight ? `Core insight: ${c.core_insight}` : '',
    c.mistake ? `Mistake: ${c.mistake}` : '',
    c.remember ? `Remember: ${c.remember}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// GET /api/tutor — mode metadata + whether AI key is configured
router.get('/', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('user_settings')
    .select('ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  return res.json({ modes: MODES, hasKey: Boolean(data?.ai_api_key) });
});

// POST /api/tutor/chat
router.post('/chat', requireAuth, async (req, res) => {
  const schema = z.object({
    mode: z.enum(['hint', 'socratic', 'explain', 'review', 'interviewer']),
    message: z.string().min(1).max(2000),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(6000) }))
      .max(20)
      .default([]),
    problemId: z.string().uuid().optional().nullable(),
    cardId: z.string().uuid().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  // Fetch optional context
  let context = '';
  if (parsed.data.problemId) {
    const { data } = await supabase
      .from('problems')
      .select('*')
      .eq('id', parsed.data.problemId)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (data) context = summarizeProblem(data);
  } else if (parsed.data.cardId) {
    const { data } = await supabase
      .from('memory_cards')
      .select('*')
      .eq('id', parsed.data.cardId)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (data) context = summarizeCard(data);
  }

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!settingsRow?.ai_api_key) {
    return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
  }

  const settings = resolveSettings(settingsRow);

  try {
    const reply = await chatCompletion({
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: buildSystemPrompt(parsed.data.mode, context) },
        ...parsed.data.history,
        { role: 'user', content: parsed.data.message },
      ],
      temperature: 0.6,
    });
    return res.json({ reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
