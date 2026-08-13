// AI provider abstraction — OpenAI-compatible chat completions plus a
// native Anthropic (Claude) connector. DeepSeek and custom OpenAI-compatible
// endpoints share the OpenAI protocol; Anthropic uses its own Messages API.

import { decryptSecret } from './crypto.js';

export const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    model: '',
  },
};

function normalizeBaseUrl(url) {
  let base = (url || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('AI base URL is not configured');
  return base;
}

// Dispatch to the right protocol based on the configured provider.
export function chatCompletion(opts) {
  if (opts.provider === 'anthropic') return anthropicChatCompletion(opts);
  return openAiChatCompletion(opts);
}

// Low-level chat completion call (OpenAI-compatible protocol).
async function openAiChatCompletion({ baseUrl, apiKey, model, messages, maxTokens, temperature = 0.7 }) {
  if (!apiKey) throw new Error('No AI API key configured');
  if (!model) throw new Error('No AI model configured');

  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const body = {
    model,
    messages,
    temperature,
  };
  // Omit max_tokens entirely when not provided so the provider's own
  // default (max) limit applies.
  if (maxTokens) body.max_tokens = maxTokens;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

// Low-level chat completion call (Anthropic Messages API).
// System messages are moved to the top-level "system" field, which is how
// Anthropic models expect them.
async function anthropicChatCompletion({ baseUrl, apiKey, model, messages, maxTokens, temperature = 0.7 }) {
  if (!apiKey) throw new Error('No AI API key configured');
  if (!model) throw new Error('No AI model configured');

  const endpoint = `${normalizeBaseUrl(baseUrl)}/v1/messages`;
  const system = (messages || [])
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .filter(Boolean)
    .join('\n\n');
  const body = {
    model,
    max_tokens: maxTokens || 1024, // Anthropic requires max_tokens
    temperature,
    messages: (messages || []).filter((m) => m.role !== 'system'),
  };
  if (system) body.system = system;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text || '';
}

// Test connection with a tiny completion.
export async function testConnection(settings) {
  const out = await chatCompletion({
    provider: settings.provider,
    baseUrl: settings.baseUrl || settings.ai_base_url,
    apiKey: settings.apiKey || settings.ai_api_key,
    model: settings.model || settings.ai_model,
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    maxTokens: 5,
    temperature: 0,
  });
  return out.trim();
}

// Combine stored settings with provider presets. The stored API key is
// encrypted at rest, so it is decrypted here — the single choke point for
// every AI route that consumes a key.
export function resolveSettings(stored) {
  const preset = PROVIDERS[stored?.ai_provider] || PROVIDERS.deepseek;
  return {
    provider: stored?.ai_provider || 'deepseek',
    baseUrl: stored?.ai_base_url || preset.baseUrl,
    model: stored?.ai_model || preset.model,
    apiKey: decryptSecret(stored?.ai_api_key),
  };
}
