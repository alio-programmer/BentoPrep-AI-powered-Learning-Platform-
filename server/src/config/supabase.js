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

// Placeholder values let the server boot for a health check even when
// credentials aren't configured yet; requests will fail gracefully.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  serviceKey || 'placeholder-service-key',
  { auth: { persistSession: false } }
);
