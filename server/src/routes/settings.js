import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { PROVIDERS, resolveSettings, testConnection } from '../services/aiProvider.js';

const router = Router();

// GET /api/settings/ai — never returns the raw key, only masked + presence.
router.get('/ai', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key, updated_at')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const key = data?.ai_api_key || '';
  return res.json({
    provider: data?.ai_provider || 'deepseek',
    model: data?.ai_model || '',
    baseUrl: data?.ai_base_url || '',
    hasKey: Boolean(key),
    keyMasked: key ? `••••••••${key.slice(-4)}` : '',
    providers: PROVIDERS,
    updatedAt: data?.updated_at || null,
  });
});

// PUT /api/settings/ai — save AI settings. Blank apiKey preserves the existing key.
router.put('/ai', requireAuth, async (req, res) => {
  const schema = z.object({
    provider: z.enum(Object.keys(PROVIDERS)),
    model: z.string().max(120).optional().nullable(),
    baseUrl: z.string().max(300).optional().nullable(),
    apiKey: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data: existing } = await supabase
    .from('user_settings')
    .select('ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const nextKey = parsed.data.apiKey && parsed.data.apiKey.trim() ? parsed.data.apiKey.trim() : existing?.ai_api_key;

  const preset = PROVIDERS[parsed.data.provider];
  const payload = {
    ai_provider: parsed.data.provider,
    ai_model: parsed.data.model || preset.model,
    ai_base_url: parsed.data.baseUrl || preset.baseUrl,
    ai_api_key: nextKey || '',
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.user.id, ...payload }, { onConflict: 'user_id' })
    .select('ai_provider, ai_model, ai_base_url, updated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    provider: data.ai_provider,
    model: data.ai_model,
    baseUrl: data.ai_base_url,
    hasKey: Boolean(nextKey),
    keyMasked: nextKey ? `••••••••${nextKey.slice(-4)}` : '',
    updatedAt: data.updated_at,
  });
});

// POST /api/settings/ai/test — verify the saved key works.
router.post('/ai/test', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!data?.ai_api_key) {
    return res.status(400).json({ error: 'Save your API key first' });
  }

  const settings = resolveSettings(data);
  try {
    const reply = await testConnection(settings);
    return res.json({ ok: true, reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
