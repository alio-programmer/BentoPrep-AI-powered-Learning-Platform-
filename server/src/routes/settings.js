import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { PROVIDERS, resolveSettings, testConnection } from '../services/aiProvider.js';
import { encryptSecret, isEncrypted, decryptSecret } from '../services/crypto.js';

const router = Router();

const mask = (key) => (key ? `••••••••${key.slice(-4)}` : '');

// Read the active settings row, encrypting legacy plaintext keys on read
// (lazy migration to encrypted-at-rest storage).
async function getActiveSettings(userId) {
  const { data } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.ai_api_key && !isEncrypted(data.ai_api_key)) {
    const encrypted = encryptSecret(data.ai_api_key);
    await supabase.from('user_settings').update({ ai_api_key: encrypted }).eq('user_id', userId);
    data.ai_api_key = encrypted;
  }
  return data;
}

// Persist a credential into the active user_settings slot.
async function setActiveCredential(userId, credential) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        ai_provider: credential.provider,
        ai_model: credential.model || '',
        ai_base_url: credential.base_url || '',
        ai_api_key: credential.encrypted_api_key || '',
      },
      { onConflict: 'user_id' }
    )
    .select('ai_provider, ai_model, ai_base_url, updated_at')
    .single();
  if (error) throw error;
  return data;
}

// GET /api/settings/ai — never returns the raw key, only masked + presence.
router.get('/ai', requireAuth, async (req, res) => {
  try {
    const data = await getActiveSettings(req.user.id);
    const key = decryptSecret(data?.ai_api_key);
    return res.json({
      provider: data?.ai_provider || 'deepseek',
      model: data?.ai_model || '',
      baseUrl: data?.ai_base_url || '',
      hasKey: Boolean(key),
      keyMasked: mask(key),
      providers: PROVIDERS,
      updatedAt: data?.updated_at || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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

  try {
    const data = await getActiveSettings(req.user.id);
    const currentKey = decryptSecret(data?.ai_api_key);
    const incoming = parsed.data.apiKey && parsed.data.apiKey.trim() ? parsed.data.apiKey.trim() : null;
    const nextKey = incoming !== null ? incoming : currentKey;
    const encrypted = encryptSecret(nextKey);

    const preset = PROVIDERS[parsed.data.provider];
    const payload = {
      ai_provider: parsed.data.provider,
      ai_model: parsed.data.model || preset.model,
      ai_base_url: parsed.data.baseUrl || preset.baseUrl,
      ai_api_key: encrypted,
    };

    const { data: saved, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, ...payload }, { onConflict: 'user_id' })
      .select('ai_provider, ai_model, ai_base_url, updated_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      provider: saved.ai_provider,
      model: saved.ai_model,
      baseUrl: saved.ai_base_url,
      hasKey: Boolean(nextKey),
      keyMasked: mask(nextKey),
      updatedAt: saved.updated_at,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/ai/test — verify the saved key works.
router.post('/ai/test', requireAuth, async (req, res) => {
  try {
    const data = await getActiveSettings(req.user.id);
    const key = decryptSecret(data?.ai_api_key);
    if (!key) {
      return res.status(400).json({ error: 'Save your API key first' });
    }

    const settings = resolveSettings({ ...data, ai_api_key: key });
    const reply = await testConnection(settings);
    return res.json({ ok: true, reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

// GET /api/settings/ai/credentials — list saved credentials (masked keys only).
router.get('/ai/credentials', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('ai_credentials')
    .select('id, name, provider, encrypted_api_key, base_url, model, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const items = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    model: c.model,
    baseUrl: c.base_url,
    hasKey: Boolean(c.encrypted_api_key),
    keyMasked: mask(decryptSecret(c.encrypted_api_key)),
    createdAt: c.created_at,
  }));

  const active = await getActiveSettings(req.user.id).catch(() => null);
  return res.json({ credentials: items, active: active?.ai_provider || 'deepseek' });
});

// POST /api/settings/ai/credentials — create a credential (optionally activate it).
router.post('/ai/credentials', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(80).default('Default'),
    provider: z.enum(Object.keys(PROVIDERS)),
    model: z.string().max(120).optional().nullable(),
    baseUrl: z.string().max(300).optional().nullable(),
    apiKey: z.string().min(1).max(500),
    activate: z.boolean().optional().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const encrypted = encryptSecret(parsed.data.apiKey);
  const { data: cred, error } = await supabase
    .from('ai_credentials')
    .insert({
      user_id: req.user.id,
      name: parsed.data.name,
      provider: parsed.data.provider,
      encrypted_api_key: encrypted,
      base_url: parsed.data.baseUrl || null,
      model: parsed.data.model || null,
    })
    .select('id, name, provider, encrypted_api_key, base_url, model, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (parsed.data.activate) {
    try {
      await setActiveCredential(req.user.id, {
        provider: cred.provider,
        model: cred.model,
        base_url: cred.base_url,
        encrypted_api_key: cred.encrypted_api_key,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(201).json({
    id: cred.id,
    name: cred.name,
    provider: cred.provider,
    model: cred.model,
    baseUrl: cred.base_url,
    hasKey: true,
    keyMasked: mask(parsed.data.apiKey),
    createdAt: cred.created_at,
  });
});

// PUT /api/settings/ai/credentials/:id — rename/update a credential (blank key keeps existing).
router.put('/ai/credentials/:id', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    provider: z.enum(Object.keys(PROVIDERS)).optional(),
    model: z.string().max(120).optional().nullable(),
    baseUrl: z.string().max(300).optional().nullable(),
    apiKey: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data: existing, error: fetchErr } = await supabase
    .from('ai_credentials')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!existing) return res.status(404).json({ error: 'Credential not found' });

  const incoming = parsed.data.apiKey && parsed.data.apiKey.trim() ? parsed.data.apiKey.trim() : null;
  const encrypted =
    incoming !== null ? encryptSecret(incoming) : existing.encrypted_api_key;

  const payload = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.provider !== undefined) payload.provider = parsed.data.provider;
  if (parsed.data.model !== undefined) payload.model = parsed.data.model;
  if (parsed.data.baseUrl !== undefined) payload.base_url = parsed.data.baseUrl;
  payload.encrypted_api_key = encrypted;

  const { data: updated, error } = await supabase
    .from('ai_credentials')
    .update(payload)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id, name, provider, encrypted_api_key, base_url, model, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const finalKey = incoming !== null ? incoming : decryptSecret(updated.encrypted_api_key);
  return res.json({
    id: updated.id,
    name: updated.name,
    provider: updated.provider,
    model: updated.model,
    baseUrl: updated.base_url,
    hasKey: Boolean(finalKey),
    keyMasked: mask(finalKey),
    createdAt: updated.created_at,
  });
});

// POST /api/settings/ai/credentials/:id/activate — make this the active credential.
router.post('/ai/credentials/:id/activate', requireAuth, async (req, res) => {
  const { data: cred, error } = await supabase
    .from('ai_credentials')
    .select('id, name, provider, encrypted_api_key, base_url, model')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!cred) return res.status(404).json({ error: 'Credential not found' });

  try {
    const saved = await setActiveCredential(req.user.id, cred);
    return res.json({
      ok: true,
      id: cred.id,
      provider: saved.ai_provider,
      model: saved.ai_model,
      baseUrl: saved.ai_base_url,
      hasKey: Boolean(cred.encrypted_api_key),
      updatedAt: saved.updated_at,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/ai/credentials/:id — remove a saved credential.
// The active settings slot is intentionally left untouched so the current
// configuration keeps working even if its list entry is removed.
router.delete('/ai/credentials/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('ai_credentials')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
