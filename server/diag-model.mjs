import { supabase } from './src/config/supabase.js';
import { decryptSecret } from './src/services/crypto.js';

const { data } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', 'abddb137-4a81-4c9b-8ad2-dcfbcff6cccf')
  .maybeSingle();
const key = decryptSecret(data.ai_api_key);

const system = `You are a senior interview preparation coach.
Build a 30-day, 2 hours/day DSA interview-prep calendar for a Intermediate level candidate targeting "FAANG".

Rules:
- Return ONLY valid JSON, no markdown, no commentary. Shape:
{ "days": [ { "day_number": 1, "type": "new|revision|concept|assessment|mock", "title": "short summary",
"tasks": [ { "name": "specific task or problem", "difficulty": "Easy|Medium|Hard|Concept|Mixed", "topic": "topic" } ] } ] }
- Generate exactly 30 days (day_number 1..30).
- Prefer the concrete problems/topics from the provided topic bank. Do NOT repeat the same problem across different days.
- Structure: start with fundamentals, progress to harder topics, include revision days, weekly assessments, and a mock interview.
- Task names must be concrete and actionable.`;

// No max_tokens (exactly what generateAiRoadmap sends for OpenAI path)
for (const withMax of [false, true]) {
  const body = {
    model: data.ai_model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: 'Target: FAANG\nLevel: Intermediate\n\nTopic bank:\nArrays: Two Sum, Best Time to Buy and Sell Stock' },
    ],
    temperature: 0.6,
  };
  if (withMax) body.max_tokens = 1024;
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const msg = j.choices?.[0]?.message || {};
  console.log(`--- max_tokens=${withMax ? '1024' : 'omitted'} status=${r.status} finish=${j.choices?.[0]?.finish_reason}`);
  console.log('  content len:', (msg.content || '').length, '| first 80:', JSON.stringify((msg.content || '').slice(0, 80)));
  console.log('  reasoning_content len:', (msg.reasoning_content || '').length);
}
