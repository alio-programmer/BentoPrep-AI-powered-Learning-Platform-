import crypto from 'node:crypto';
import fs from 'node:fs';
import { supabase } from './src/config/supabase.js';

// Simulate a key encrypted with a DIFFERENT master key than the server's current one.
const otherKey = crypto.randomBytes(32);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', otherKey, iv);
const enc = Buffer.concat([cipher.update('sk-test', 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
const value = `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;

const uid = 'db4f540f-92b6-4e88-a6bc-9a9f82e8326e';
const { error } = await supabase
  .from('user_settings')
  .upsert({ user_id: uid, ai_provider: 'deepseek', ai_api_key: value }, { onConflict: 'user_id' });
if (error) {
  console.error('upsert failed:', error.message);
  process.exit(1);
}
console.log('stored key encrypted with a DIFFERENT key');
console.log(value);
