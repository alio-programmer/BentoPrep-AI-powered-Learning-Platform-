import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { generateRoadmap, generateResumeRoadmap, generateAiRoadmap, generateCustomRoadmap } from '../services/roadmap.js';
import { addDays } from '../services/spacedRepetition.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

function dayDate(roadmapCreatedAt, dayNumber) {
  const base = new Date(roadmapCreatedAt);
  base.setHours(0, 0, 0, 0);
  return addDays(base, dayNumber - 1).toISOString();
}

const VALID_TRACKS = ['dsa', 'sql', 'resume', 'custom'];

// GET /api/roadmap?track=dsa|sql|resume|custom — active roadmap with its days
router.get('/', requireAuth, async (req, res) => {
  const track = VALID_TRACKS.includes(req.query.track) ? req.query.track : 'dsa';
  const { data: roadmap, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('track', track)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!roadmap) return res.json({ roadmap: null, days: [] });

  const { data: days, error: dayError } = await supabase
    .from('roadmap_days')
    .select('*')
    .eq('roadmap_id', roadmap.id)
    .order('day_number', { ascending: true });
  if (dayError) return res.status(500).json({ error: dayError.message });

  return res.json({ roadmap, days });
});

// POST /api/roadmap — generate a new roadmap
router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({
    duration_days: z.number().int().min(7).max(90),
    level: z.string().max(40).optional(),
    target: z.string().max(120).optional(),
    custom_topic: z.string().max(200).optional(),
    daily_availability: z.string().max(40),
    track: z.enum(VALID_TRACKS).default('dsa'),
    resumeId: z.string().uuid().optional(),
    ai: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  let generated;
  if (parsed.data.track === 'resume') {
    if (!parsed.data.resumeId) {
      return res.status(400).json({ error: 'Select a resume to build your roadmap from.' });
    }
    const { data: resume, error: rErr } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', parsed.data.resumeId)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (rErr) return res.status(500).json({ error: rErr.message });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('ai_provider, ai_model, ai_base_url, ai_api_key')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!settingsRow?.ai_api_key) {
      return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
    }

    try {
      const settings = resolveSettings(settingsRow);
      generated = await generateResumeRoadmap({
        resume,
        settings,
        duration_days: parsed.data.duration_days,
        daily_availability: parsed.data.daily_availability,
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  } else if (parsed.data.track === 'custom') {
    if (!parsed.data.custom_topic?.trim()) {
      return res.status(400).json({ error: 'Enter the topic you want to learn.' });
    }
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('ai_provider, ai_model, ai_base_url, ai_api_key')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!settingsRow?.ai_api_key) {
      return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
    }
    try {
      const settings = resolveSettings(settingsRow);
      generated = await generateCustomRoadmap({
        topic: parsed.data.custom_topic,
        level: parsed.data.level || 'Beginner',
        duration_days: parsed.data.duration_days,
        daily_availability: parsed.data.daily_availability,
        settings,
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  } else if (parsed.data.ai) {
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('ai_provider, ai_model, ai_base_url, ai_api_key')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!settingsRow?.ai_api_key) {
      return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
    }
    try {
      const settings = resolveSettings(settingsRow);
      generated = await generateAiRoadmap({
        track: parsed.data.track,
        level: parsed.data.level || 'Intermediate',
        target: parsed.data.target || 'General DSA',
        duration_days: parsed.data.duration_days,
        daily_availability: parsed.data.daily_availability,
        settings,
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  } else {
    generated = generateRoadmap({
      ...parsed.data,
      level: parsed.data.level || 'Intermediate',
      target: parsed.data.target || 'General DSA',
    });
  }

  // One roadmap per track per user (max 4 total). Regenerating a track
  // overwrites its existing row instead of archiving and appending.
  const payload = {
    user_id: req.user.id,
    duration_days: parsed.data.duration_days,
    level: generated.meta.level || parsed.data.level || null,
    target: generated.meta.target || parsed.data.target || null,
    daily_availability: parsed.data.daily_availability,
    track: parsed.data.track,
    resume_id: parsed.data.track === 'resume' ? parsed.data.resumeId : null,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('track', parsed.data.track)
    .maybeSingle();

  let roadmap;
  let error;
  if (existing) {
    const res = await supabase
      .from('roadmaps')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();
    roadmap = res.data;
    error = res.error;
    if (!error) {
      await supabase
        .from('roadmap_days')
        .delete()
        .eq('roadmap_id', existing.id)
        .eq('user_id', req.user.id);
    }
  } else {
    const res = await supabase.from('roadmaps').insert(payload).select('*').single();
    roadmap = res.data;
    error = res.error;
  }
  if (error) return res.status(500).json({ error: error.message });

  const rows = generated.days.map((day) => ({
    roadmap_id: roadmap.id,
    user_id: req.user.id,
    day_number: day.day_number,
    type: day.type,
    title: day.title,
    tasks: day.tasks,
    status: day.status,
    date: dayDate(roadmap.created_at, day.day_number),
  }));

  const { data: dayRows, error: dayError } = await supabase
    .from('roadmap_days')
    .insert(rows)
    .select('*')
    .order('day_number');
  if (dayError) return res.status(500).json({ error: dayError.message });

  return res.status(201).json({ roadmap, days: dayRows });
});

// POST /api/roadmap/restart?track=dsa|sql|resume|custom — reset progress and restart from today
router.post('/restart', requireAuth, async (req, res) => {
  const track = VALID_TRACKS.includes(req.query.track) ? req.query.track : 'dsa';

  const { data: roadmap, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('track', track)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!roadmap) return res.status(404).json({ error: 'No active roadmap to restart.' });

  const { data: days, error: dayError } = await supabase
    .from('roadmap_days')
    .select('id, day_number')
    .eq('roadmap_id', roadmap.id)
    .eq('user_id', req.user.id);
  if (dayError) return res.status(500).json({ error: dayError.message });

  const now = new Date();
  for (const d of days || []) {
    const { error: updateErr } = await supabase
      .from('roadmap_days')
      .update({ status: 'pending', date: dayDate(now.toISOString(), d.day_number) })
      .eq('id', d.id)
      .eq('user_id', req.user.id);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
  }

  await supabase.from('roadmaps').update({ created_at: now.toISOString() }).eq('id', roadmap.id);

  const { data: updatedDays, error: fetchErr } = await supabase
    .from('roadmap_days')
    .select('*')
    .eq('roadmap_id', roadmap.id)
    .eq('user_id', req.user.id)
    .order('day_number', { ascending: true });
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  return res.json({ roadmap: { ...roadmap, created_at: now.toISOString() }, days: updatedDays || [] });
});

// POST /api/roadmap/explain — AI interview-ready explanation for a task/topic.
// The result is saved to roadmap_days.task_explanations[taskIndex] so it
// survives reloads until the roadmap is regenerated.
router.post('/explain', requireAuth, async (req, res) => {
  const schema = z.object({
    dayId: z.string().uuid(),
    taskIndex: z.number().int().min(0).max(50),
    task: z.string().min(1).max(300),
    topic: z.string().max(120).optional().nullable(),
    difficulty: z.string().max(40).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data: day, error: dayErr } = await supabase
    .from('roadmap_days')
    .select('id, task_explanations')
    .eq('id', parsed.data.dayId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (dayErr) return res.status(500).json({ error: dayErr.message });
  if (!day) return res.status(404).json({ error: 'Day not found' });

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!settingsRow?.ai_api_key) {
    return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
  }

  const { taskIndex, task, topic, difficulty } = parsed.data;
  try {
    const settings = resolveSettings(settingsRow);
    const system = `You are a senior interview preparation coach. Explain the given topic or problem the way a strong candidate would present it in a technical interview.

Structure your answer as markdown:
- **What it is** — a one-line definition.
- **Approach** — the core idea/algorithm, step by step, in plain language.
- **Complexity** — time and space complexity and why.
- **Example** — a short, concrete walkthrough.
- **Edge cases & pitfalls** — the common traps an interviewer looks for.
- **How to say it** — 2-3 bullet points on talking through it out loud.

Keep it focused and interview-ready: no fluff, no long essays. Use short code snippets only when they clarify.`;
    const reply = await chatCompletion({
      provider: settings.provider,
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Explain "${task}"${topic ? ` (Topic: ${topic})` : ''}${difficulty ? ` (Difficulty: ${difficulty})` : ''} for an interview.`,
        },
      ],
      temperature: 0.5,
    });

    const next = { ...(day.task_explanations || {}) };
    next[String(taskIndex)] = reply;
    await supabase
      .from('roadmap_days')
      .update({ task_explanations: next })
      .eq('id', day.id)
      .eq('user_id', req.user.id);

    return res.json({ explanation: reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

// PUT /api/roadmap/days/:id — toggle completion
router.put('/days/:id', requireAuth, async (req, res) => {
  const schema = z.object({ status: z.enum(['pending', 'done', 'skipped']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase
    .from('roadmap_days')
    .update({ status: parsed.data.status })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ day: data });
});

export default router;
