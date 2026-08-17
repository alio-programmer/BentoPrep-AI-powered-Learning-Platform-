import { supabase } from './server/src/config/supabase.js';
import { decryptSecret } from './server/src/services/crypto.js';

const { data } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', 'abddb137-4a81-4c9b-8ad2-dcfbcff6cccf')
  .maybeSingle();
if (!data) {
  console.log('no row');
  process.exit(1);
}
const key = decryptSecret(data.ai_api_key);
console.log('provider:', data.ai_provider, '| model:', data.ai_model, '| base:', data.ai_base_url || '(default)', '| key prefix:', key.slice(0, 12));
try {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: data.ai_model || 'deepseek-chat', messages: [{ role: 'user', content: 'Reply with OK' }], max_tokens: 5 }),
  });
  const t = await r.text();
  console.log('DeepSeek with', data.ai_model, '->', r.status, t.slice(0, 300));
} catch (e) {
  console.log('network err', e.message);
}
