import fs from 'node:fs';

const token = fs.readFileSync('token.txt', 'utf8').trim();
const base = 'http://localhost:4000/api';

async function call(path, options = {}) {
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
  const type = typeof json;
  console.log(`${options.method || 'GET'} ${path} -> ${res.status} [${type}]`, type === 'string' ? text.slice(0, 200) : JSON.stringify(json).slice(0, 400));
  return { status: res.status, json };
}

// Deterministic roadmap (no AI) - should work
await call('/roadmap', {
  method: 'POST',
  body: JSON.stringify({ track: 'dsa', duration_days: 15, daily_availability: '2 hours', ai: false }),
});
