import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CHANNELS = ['tutor', 'cs', 'design'];

const MAX_MESSAGES = 100;

// GET /api/chats?channel=tutor — list saved conversations for the chat list UI
router.get('/', requireAuth, async (req, res) => {
  const channel = CHANNELS.includes(req.query.channel) ? req.query.channel : 'tutor';
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, topic_key, topic_label, created_at, updated_at, messages')
    .eq('user_id', req.user.id)
    .eq('channel', channel)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    sessions: (data || []).map((s) => ({
      id: s.id,
      topic_key: s.topic_key,
      topic_label: s.topic_label,
      updated_at: s.updated_at,
      message_count: Array.isArray(s.messages) ? s.messages.length : 0,
    })),
  });
});

// GET /api/chats/session?channel=tutor&topicKey=... — one thread (auto-restore)
router.get('/session', requireAuth, async (req, res) => {
  const channel = CHANNELS.includes(req.query.channel) ? req.query.channel : 'tutor';
  const topicKey = String(req.query.topicKey || '');
  if (!topicKey) return res.status(400).json({ error: 'topicKey is required' });

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('channel', channel)
    .eq('topic_key', topicKey)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ session: data || null });
});

// POST /api/chats/session — upsert a thread's messages by (user_id, channel, topic_key)
router.post('/session', requireAuth, async (req, res) => {
  const schema = z.object({
    channel: z.enum(CHANNELS),
    topic_key: z.string().min(1).max(200),
    topic_label: z.string().max(200).optional().nullable(),
    messages: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
      .max(MAX_MESSAGES),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { data, error } = await supabase
    .from('chat_sessions')
    .upsert(
      {
        user_id: req.user.id,
        channel: parsed.data.channel,
        topic_key: parsed.data.topic_key,
        topic_label: parsed.data.topic_label || parsed.data.topic_key,
        messages: parsed.data.messages,
      },
      { onConflict: 'user_id,channel,topic_key' }
    )
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ session: data });
});

// DELETE /api/chats/session?channel=tutor&topicKey=... — delete a thread
router.delete('/session', requireAuth, async (req, res) => {
  const channel = CHANNELS.includes(req.query.channel) ? req.query.channel : 'tutor';
  const topicKey = String(req.query.topicKey || '');
  if (!topicKey) return res.status(400).json({ error: 'topicKey is required' });

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', req.user.id)
    .eq('channel', channel)
    .eq('topic_key', topicKey);
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ ok: true });
});

export default router;
