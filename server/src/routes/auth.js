import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const sessionResponse = (session, user) => ({
  token: session?.access_token,
  user: {
    id: user?.id,
    email: user?.email,
  },
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().max(80).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password, displayName } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || '' } },
  });

  if (error) return res.status(400).json({ error: error.message });
  if (!data.session) {
    return res
      .status(202)
      .json({ message: 'Check your email to confirm your account before logging in.' });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: data.user.id, display_name: displayName || email.split('@')[0] });

  if (profileError) console.error('[auth] profile upsert:', profileError.message);

  return res.json({ session: sessionResponse(data.session, data.user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return res.status(401).json({ error: 'Invalid email or password' });

  return res.json({ session: sessionResponse(data.session, data.user) });
});

// POST /api/auth/forgot-password — sends a reset email via Supabase
router.post('/forgot-password', async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password`,
  });
  // Always return success to avoid leaking which emails exist.
  if (error) {
    console.error('[auth] forgot-password:', error.message);
  }
  return res.json({ ok: true });
});

// POST /api/auth/reset-password — set a new password with a valid reset token
router.post('/reset-password', async (req, res) => {
  const schema = z.object({
    access_token: z.string().min(1),
    new_password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase.auth.updateUser(
    { password: parsed.data.new_password },
    { access_token: parsed.data.access_token }
  );
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ ok: true, user: data.user });
});

// POST /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ user: req.user, profile });
});

// PUT /api/auth/profile — used for onboarding
router.put('/profile', requireAuth, async (req, res) => {
  const schema = z.object({
    display_name: z.string().max(80).optional(),
    target_role: z.string().max(120).optional().nullable(),
    target_companies: z.array(z.string()).optional(),
    experience: z.string().optional().nullable(),
    dsa_level: z.string().optional().nullable(),
    pref_language: z.string().optional().nullable(),
    daily_hours: z.number().optional().nullable(),
    days_target: z.number().optional().nullable(),
    weak_topics: z.array(z.string()).optional(),
    onboarded: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ profile: data });
});

export default router;
