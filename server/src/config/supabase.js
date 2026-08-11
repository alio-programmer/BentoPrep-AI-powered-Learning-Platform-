import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export const isConfigured = Boolean(url && serviceKey);

if (!isConfigured) {
  console.warn(
    '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Set them in server/.env (see .env.example). API calls will fail until configured.'
  );
}

function getValidUrl(rawUrl) {
  if (!rawUrl) return 'https://placeholder.supabase.co';
  let formatted = rawUrl.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }
  try {
    new URL(formatted);
    return formatted;
  } catch {
    return 'https://placeholder.supabase.co';
  }
}

// Placeholder values let the server boot for a health check even when
// credentials aren't configured yet; requests will fail gracefully.
export const supabase = createClient(
  getValidUrl(url),
  serviceKey || 'placeholder-service-key',
  { auth: { persistSession: false } }
);
