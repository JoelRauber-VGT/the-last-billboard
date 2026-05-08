#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      let v = rawValue.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[key] = v;
    }
  } catch {}
}
loadEnvFile(resolve(projectRoot, '.env.local'));

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from('transactions')
  .select('id, type, status, amount_eur, stripe_session_id, stripe_payment_intent_id, slot_id, created_at')
  .order('created_at', { ascending: false })
  .limit(15);

if (error) { console.error(error); process.exit(1); }

for (const t of data) {
  console.log(
    `${t.created_at}  ${t.type.padEnd(6)}  ${t.status.padEnd(9)}  ${String(t.amount_eur).padStart(8)}€  ` +
    `sess=${t.stripe_session_id ? 'yes' : 'NO '}  pi=${t.stripe_payment_intent_id ? 'yes' : 'NO '}  ` +
    `slot=${t.slot_id ?? '-'}  id=${t.id}`
  );
}
