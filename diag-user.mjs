import fs from 'node:fs';

const token = fs.readFileSync('diagtoken.txt', 'utf8').trim();
const base = 'https://bentoprep-ai-powered-learning-platform-production.up.railway.app/api';

async function call(path, options = {}) {
  const started = Date.now();
  const res = await fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const text = await res.text();
  console.log(`${options.method || 'GET'} ${path} -> ${res.status} (${Date.now() - started}ms)`);
  return { status: res.status, text };
}

// Set the diag user to EXACTLY the user's account config
await call('/settings/ai', {
  method: 'PUT',
  body: JSON.stringify({ provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-dd755e4f78f744bf97dec0b568764c85' }),
});

// Try AI roadmap generation with the reasoning model (like the user does)
const r = await call('/roadmap', {
  method: 'POST',
  body: JSON.stringify({ track: 'dsa', duration_days: 30, level: 'Intermediate', target: 'FAANG', daily_availability: '2 hours', ai: true }),
});
console.log('BODY:', r.text.slice(0, 500));
