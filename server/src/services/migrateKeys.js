// One-time migration: encrypt any legacy plaintext API keys stored in
// user_settings.ai_api_key. Safe to re-run — already-encrypted values are
// left untouched. Run after deploying the crypto changes with:
//   node src/services/migrateKeys.js

import { supabase } from '../config/supabase.js';
import { encryptSecret, isEncrypted, getEncryptionKey } from './crypto.js';

getEncryptionKey();

const { data, error } = await supabase
  .from('user_settings')
  .select('id, ai_api_key')
  .not('ai_api_key', 'is', null)
  .neq('ai_api_key', '');

if (error) {
  console.error('[migrateKeys] Failed to fetch settings:', error.message);
  process.exit(1);
}

const toMigrate = (data || []).filter((row) => row.ai_api_key && !isEncrypted(row.ai_api_key));
console.log(
  `[migrateKeys] ${data?.length || 0} settings rows with keys; ${toMigrate.length} to encrypt.`
);

let ok = 0;
for (const row of toMigrate) {
  const encrypted = encryptSecret(row.ai_api_key);
  const { error: updateErr } = await supabase
    .from('user_settings')
    .update({ ai_api_key: encrypted })
    .eq('id', row.id);
  if (updateErr) {
    console.error(`[migrateKeys] Failed for row ${row.id}:`, updateErr.message);
  } else {
    ok += 1;
  }
}

console.log(`[migrateKeys] Done. Encrypted ${ok}/${toMigrate.length}.`);
process.exit(0);
