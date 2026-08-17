import fs from 'node:fs';

const token = fs.readFileSync('diagtoken.txt', 'utf8').trim();
const base = 'https://bentoprep-ai-powered-learning-platform-production.up.railway.app/api';

async function call(path, options = {}) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    console.log(`${options.method || 'GET'} ${path} -> ${res.status} (${Date.now() - started}ms)`, typeof json === 'string' ? json.slice(0, 200) : JSON.stringify(json).slice(0, 400));
    return { status: res.status, json };
  } catch (e) {
    console.log(`${options.method || 'GET'} ${path} -> NETWORK ERROR after ${Date.now() - started}ms: ${e.message}`);
    return { status: 0, error: e.message };
  }
}

// 1. What does the deployed /settings/ai return? (proves whether latest code + key presence)
await call('/settings/ai');

// 2. Save a known-good DeepSeek key via the DEPLOYED server (exercises its encrypt path)
await call('/settings/ai', {
  method: 'PUT',
  body: JSON.stringify({ provider: 'deepseek', apiKey: 'sk-a96c95355c2747bd8c85d3d6612eb12f' }),
});

// 3. Re-read settings (masked) — check hasKey
await call('/settings/ai');

// 4. Generate a deterministic roadmap (no AI)
await call('/roadmap', {
  method: 'POST',
  body: JSON.stringify({ track: 'dsa', duration_days: 15, daily_availability: '2 hours', ai: false }),
});

// 5. Generate an AI roadmap (hits DeepSeek from Railway)
await call('/roadmap', {
  method: 'POST',
  body: JSON.stringify({ track: 'dsa', duration_days: 30, level: 'Intermediate', target: 'FAANG', daily_availability: '2 hours', ai: true }),
});
