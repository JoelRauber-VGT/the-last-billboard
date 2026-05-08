#!/usr/bin/env node
// Reconciles "pending" transactions whose webhook never landed.
// For each pending tx with a stripe_session_id, asks Stripe whether the
// session was actually paid; if yes, runs the same logic as the webhook
// (set payment_intent, call process_bid). Idempotent — safe to re-run.
//
// Usage:
//   node scripts/recover-pending-transactions.mjs            # dry run
//   node scripts/recover-pending-transactions.mjs --apply    # write changes
//   node scripts/recover-pending-transactions.mjs --apply --tx <uuid>  # single tx
//
// Env (read from .env.local automatically):
//   STRIPE_SECRET_KEY
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Minimal .env.local loader so we don't depend on dotenv.
function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      let v = rawValue.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[key] = v;
    }
  } catch {
    // file is optional
  }
}
loadEnvFile(resolve(projectRoot, '.env.local'));

const apply = process.argv.includes('--apply');
const txArgIdx = process.argv.indexOf('--tx');
const onlyTxId = txArgIdx >= 0 ? process.argv[txArgIdx + 1] : null;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: need STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const Stripe = (await import('stripe')).default;
const { createClient } = await import('@supabase/supabase-js');

const stripe = new Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function log(...a) { console.log(`[recover]`, ...a); }
function warn(...a) { console.warn(`[recover]`, ...a); }

// Mirrors the webhook's metadata coercion (route.ts:11–40) but without
// the heavy zod dep — same shape, same defaults.
function coerceMetadata(raw) {
  const m = raw ?? {};
  const errs = [];
  const must = (k) => {
    if (!m[k]) errs.push(`missing ${k}`);
    return m[k];
  };
  const out = {
    transaction_id: must('transaction_id'),
    user_id: must('user_id'),
    mode: must('mode'),
    slot_id: m.slot_id ? m.slot_id : null,
    bid_eur: Number(m.bid_eur),
    image_url: m.image_url ? m.image_url : null,
    link_url: must('link_url'),
    display_name: must('display_name'),
    brand_color: must('brand_color'),
    pan_x: m.pan_x !== undefined ? Number(m.pan_x) : 0.5,
    pan_y: m.pan_y !== undefined ? Number(m.pan_y) : 0.5,
    zoom: m.zoom !== undefined ? Number(m.zoom) : 1.0,
    is_anonymous: m.is_anonymous === '1' || m.is_anonymous === 'true',
  };
  if (!Number.isFinite(out.bid_eur) || out.bid_eur <= 0) errs.push('bad bid_eur');
  if (out.mode === 'outbid' && !out.slot_id) errs.push('outbid without slot_id');
  return { out, errs };
}

// Build a transaction_id → Stripe session lookup by walking recent
// Checkout Sessions. Used when our DB row never received its
// stripe_session_id (RLS bug — see scripts/README or create-session/route.ts).
async function buildSessionIndex(maxSessions = 200) {
  const idx = new Map();
  let starting_after;
  let scanned = 0;
  while (scanned < maxSessions) {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    });
    for (const s of page.data) {
      const txId = s.metadata?.transaction_id;
      if (txId) idx.set(txId, s);
    }
    scanned += page.data.length;
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return idx;
}

async function recoverOne(tx, fallbackIndex) {
  let session;
  if (tx.stripe_session_id) {
    log(`tx ${tx.id} session=${tx.stripe_session_id}`);
    try {
      session = await stripe.checkout.sessions.retrieve(tx.stripe_session_id);
    } catch (e) {
      warn(`  stripe error: ${e.message}`);
      return { id: tx.id, action: 'stripe-error' };
    }
  } else {
    session = fallbackIndex.get(tx.id);
    if (!session) {
      warn(`tx ${tx.id} has no session_id and no Stripe session matched — older than scan window or never reached Stripe`);
      return { id: tx.id, action: 'no-session-found' };
    }
    log(`tx ${tx.id} session=${session.id} (matched via metadata)`);
  }

  log(`  payment_status=${session.payment_status} status=${session.status} payment_intent=${session.payment_intent ?? '∅'}`);

  if (session.payment_status === 'unpaid') {
    if (session.status === 'expired') {
      if (!apply) return { id: tx.id, action: 'would-mark-failed' };
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
      return { id: tx.id, action: 'marked-failed' };
    }
    return { id: tx.id, action: 'still-open' };
  }

  if (session.payment_status !== 'paid') {
    return { id: tx.id, action: `skip-${session.payment_status}` };
  }

  const { out: meta, errs } = coerceMetadata(session.metadata);
  if (errs.length) {
    warn(`  bad metadata: ${errs.join(', ')}`);
    return { id: tx.id, action: 'bad-metadata', errs };
  }

  if (!apply) return { id: tx.id, action: 'would-process', session_id: session.id, payment_intent: session.payment_intent };

  // Same sequence as src/app/api/webhooks/stripe/route.ts:187–222.
  // Also backfill stripe_session_id for tx that lost it to the RLS bug.
  const { error: upErr } = await supabase
    .from('transactions')
    .update({
      stripe_payment_intent_id: session.payment_intent,
      stripe_session_id: session.id,
    })
    .eq('id', tx.id);
  if (upErr) {
    warn(`  failed to set payment_intent: ${upErr.message}`);
    return { id: tx.id, action: 'update-error' };
  }

  const { data: bidResult, error: bidErr } = await supabase.rpc('process_bid', {
    p_transaction_id: meta.transaction_id,
    p_user_id: meta.user_id,
    p_mode: meta.mode,
    p_slot_id: meta.slot_id,
    p_bid_eur: meta.bid_eur,
    p_image_url: meta.image_url,
    p_link_url: meta.link_url,
    p_display_name: meta.display_name,
    p_brand_color: meta.brand_color,
    p_layout_width: 1,
    p_layout_height: 1,
    p_pan_x: meta.pan_x,
    p_pan_y: meta.pan_y,
    p_zoom: meta.zoom,
    p_is_anonymous: meta.is_anonymous,
  });

  if (bidErr) {
    warn(`  process_bid failed: ${bidErr.message}`);
    return { id: tx.id, action: 'rpc-error' };
  }

  if (bidResult && !bidResult.success) {
    warn(`  race detected: ${bidResult.message} — refund will be queued by next webhook`);
    return { id: tx.id, action: 'race', detail: bidResult.message };
  }

  return { id: tx.id, action: 'processed' };
}

async function main() {
  log(apply ? 'APPLY mode (will write)' : 'DRY RUN (use --apply to write)');

  let q = supabase
    .from('transactions')
    .select('id, stripe_session_id, status, type, created_at, amount_eur')
    .eq('type', 'bid')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (onlyTxId) q = q.eq('id', onlyTxId);

  const { data: txs, error } = await q;
  if (error) { console.error(error); process.exit(1); }

  log(`found ${txs.length} pending transaction(s)`);

  const needsFallback = txs.some((t) => !t.stripe_session_id);
  let fallbackIndex = new Map();
  if (needsFallback) {
    log(`some tx have no stripe_session_id — scanning recent Stripe sessions for metadata match...`);
    fallbackIndex = await buildSessionIndex(200);
    log(`indexed ${fallbackIndex.size} recent sessions with transaction_id metadata`);
  }

  const results = [];
  for (const tx of txs) {
    results.push(await recoverOne(tx, fallbackIndex));
  }

  log('---');
  const counts = results.reduce((acc, r) => ((acc[r.action] = (acc[r.action] || 0) + 1), acc), {});
  log('summary:', counts);
  if (!apply && (counts['would-process'] || counts['would-mark-failed'])) {
    log('rerun with --apply to commit');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
