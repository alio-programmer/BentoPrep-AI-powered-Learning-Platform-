import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'));
    cb(null, true);
  },
});

const BUCKET = 'resumes';

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  // 409 = already exists, which is fine
  if (error && error.statusCode !== 409 && !String(error.message || '').toLowerCase().includes('already exists')) {
    console.error('[resumes] bucket create:', error.message);
  }
}

const ANALYZE_PROMPT = `You are a senior technical recruiter and resume reviewer.
Analyze the user's resume and produce a structured report using markdown:

## Overall Assessment
- 2-3 sentence summary, overall score /10.

## ATS Compatibility
- Check for machine-readable formatting, standard section headings, keyword density. Score /10.

## Strengths
- Bulleted list of what works well.

## Weaknesses
- Bulleted list of what holds the resume back (vague bullets, missing impact, weak action verbs).

## Impact Metrics
- Which bullets lack numbers/results and how to improve them (give 2 rewritten examples).

## Missing / Recommended Keywords
- Suggest keywords for the target role.

## Actionable Recommendations
- Top 5 concrete edits.

Be specific — quote lines from the resume when pointing something out.`;

function buildAnalyzeUserMessage(resume) {
  const parts = [`Resume file: ${resume.name}`];
  if (resume.target_role) parts.push(`Target role: ${resume.target_role}`);
  if (resume.job_description) {
    parts.push(
      `\nJOB DESCRIPTION TO MATCH AGAINST:\n${resume.job_description}\n\n` +
        `Compare the resume against this job description. In the report, add a "## Job Match" section with:\n` +
        `- A match percentage.\n- A skill-gap table (Required skill | In resume? | Your evidence).\n- Whether the candidate is a strong fit.`
    );
  }
  parts.push(`\nRESUME CONTENT:\n${resume.content || '(empty — could not extract text from PDF)'}`);
  return parts.join('\n');
}

// GET /api/resumes — list
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('resumes')
    .select('id, name, target_role, created_at, ai_analysis')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ resumes: data });
});

// GET /api/resumes/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Resume not found' });
  return res.json({ resume: data });
});

// POST /api/resumes — upload a PDF (multipart: file, targetRole?, jobDescription?)
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

  let text = '';
  try {
    const parsed = await pdfParse(req.file.buffer);
    text = parsed.text || '';
  } catch {
    return res.status(422).json({ error: 'Could not read this PDF. Make sure it is a text-based PDF (not a scanned image).' });
  }

  await ensureBucket();
  const filePath = `${req.user.id}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, req.file.buffer, {
    contentType: 'application/pdf',
  });
  if (upErr) return res.status(500).json({ error: 'Failed to store file: ' + upErr.message });

  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: req.user.id,
      name: req.file.originalname,
      file_path: filePath,
      content: text.slice(0, 60000),
      target_role: req.body.targetRole || null,
      job_description: req.body.jobDescription || null,
    })
    .select('*')
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([filePath]).catch(() => {});
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json({ resume: data });
});

// PUT /api/resumes/:id — update target role / JD / name
router.put('/:id', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().max(200).optional(),
    target_role: z.string().max(120).optional().nullable(),
    job_description: z.string().max(20000).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase
    .from('resumes')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Resume not found' });
    return res.status(500).json({ error: error.message });
  }
  return res.json({ resume: data });
});

// DELETE /api/resumes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: row, error: fetchErr } = await supabase
    .from('resumes')
    .select('file_path')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!row) return res.status(404).json({ error: 'Resume not found' });

  const { error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  if (row.file_path) {
    await supabase.storage.from(BUCKET).remove([row.file_path]).catch(() => {});
  }
  return res.json({ ok: true });
});

// POST /api/resumes/:id/analyze — AI analysis, saved on the record
router.post('/:id/analyze', requireAuth, async (req, res) => {
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });

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
        { role: 'system', content: ANALYZE_PROMPT },
        { role: 'user', content: buildAnalyzeUserMessage(resume) },
      ],
      temperature: 0.4,
    });

    await supabase
      .from('resumes')
      .update({
        ai_analysis: {
          content: reply,
          analyzed_at: new Date().toISOString(),
          had_jd: Boolean(resume.job_description),
        },
      })
      .eq('id', resume.id)
      .eq('user_id', req.user.id);

    return res.json({ analysis: reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
