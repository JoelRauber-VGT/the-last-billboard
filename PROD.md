# Production Checklist

Stand: 2026-05-08. Diese Liste fasst zusammen, was vor / bei einem Production-Cutover noch erledigt werden muss. Reihenfolge ist absteigend nach Wichtigkeit.

---

## 1. Stripe in Produktion verkabeln

**Warum kritisch:** Lokal hängen Webhooks vom `stripe listen`-Tunnel ab. In Prod wird der Webhook von Stripe direkt an deine öffentliche Domain zugestellt — wenn der Endpoint nicht im Stripe Dashboard angelegt oder das Signing-Secret falsch ist, gehen Zahlungen durch, aber keine Slots werden angelegt (Symptom: `transactions.status='pending'`, `stripe_payment_intent_id=NULL`).

**Schritte:**

1. Stripe Dashboard → Developers → **Webhooks** → "Add endpoint"
   - URL: `https://<prod-domain>/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`
2. Endpoint öffnen → "Reveal signing secret" → `whsec_...` kopieren
3. In Prod-Env (Vercel / Render / etc.) setzen:
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (das aus dem Dashboard, **nicht** das aus `stripe listen`)
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `NEXT_PUBLIC_APP_URL=https://<prod-domain>` (sonst gehen Success-/Cancel-Redirects auf localhost — siehe `src/app/api/checkout/create-session/route.ts:230-231`)
4. Nach Deploy: Test-Zahlung auslösen, in Stripe Dashboard → Webhooks → Logs prüfen, ob 200 OK zurückkommt.

**Recovery falls trotzdem etwas hängt:**

```bash
node scripts/recover-pending-transactions.mjs            # dry run
node scripts/recover-pending-transactions.mjs --apply    # commit
node scripts/recover-pending-transactions.mjs --apply --tx <uuid>  # gezielt
```

Das Skript reconciled `pending` Transaktionen gegen Stripe und ruft `process_bid` für bezahlte Sessions nach. Idempotent. Nutzt automatisch die Env aus `.env.local` — für Prod entweder `.env.production` anlegen oder Variablen vor dem Aufruf exportieren.

---

## 2. Erledigt (Code-Fix vom 2026-05-08)

- **RLS-Bug `stripe_session_id`:** `create-session/route.ts` schrieb das Feld via User-Auth-Client; es gibt keine `UPDATE`-Policy auf `transactions`, also schlug der Update still fehl. Fix: jetzt via neuem `createServiceRoleClient()` aus `src/lib/supabase/server.ts`. Ab jetzt landen alle neuen Tx mit gesetzter `stripe_session_id`.
- **Hängende Tx von vor dem Fix:** Per Recovery-Skript reconciled. (`67a7c7e3...`, `7be46844...`, `42d53b5f...` → alle `completed`.)
- **Lokaler Webhook-Empfang:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe` läuft im Hintergrund während des Dev-Workflows. Signing-Secret in `.env.local` matcht.

---

## 3. Vor dem Cutover noch zu prüfen

- **Live-Mode-Smoke-Test:** Eine echte Zahlung mit kleinem Betrag durchspielen, anschließend in Stripe Dashboard refunden. Erwartet: Tx geht durch alle Stati `pending → completed → refunded`, Slot wird angelegt und nach Refund wieder freigegeben (siehe `src/lib/stripe/processRefunds.ts`).
- **`ADMIN_BOOTSTRAP_EMAIL`** entfernen oder leerlassen, sobald der erste Admin angelegt ist (Commit `7b709c6` hat dieses Gate bereits eingebaut).
- **Freeze-Date / Billboard-Schließung:** `app_settings.freeze_at` korrekt setzen für den finalen Versteigerungstag. Verifiziere `isBillboardFrozenAsync()` Verhalten via Admin-UI.
- **Service-Role-Key niemals im Client:** Stelle sicher, dass `SUPABASE_SERVICE_ROLE_KEY` nur server-seitig referenziert wird (kein `NEXT_PUBLIC_`-Prefix). Aktuell sauber, aber bei künftigen Refactors aufpassen.
- **Webhook-Resend-Fenster:** Stripe versucht Webhooks ~3 Tage lang zu retryn. Wenn dein Endpoint länger down ist, müssen Events manuell im Dashboard resend werden ODER per Recovery-Skript reconciliert werden.
- **Refund-Worker:** `processRefunds()` wird aktuell innerhalb des Webhook-Handlers aufgerufen (`webhooks/stripe/route.ts:242-244`). Für Prod solider: ein separater Cron / Edge-Function-Trigger, damit Refunds nicht von neuen Zahlungs-Events abhängen.

---

## 4. Nice-to-have (optional)

- Migration mit expliziter `transactions UPDATE` Policy (nur Admin oder service-role, niemals user-facing) als Defense-in-Depth — der Code-Fix oben reicht funktional.
- Strukturiertes Logging im Webhook (z.B. mit Request-IDs), damit Stripe-Dashboard-Logs und App-Logs leichter korrelierbar sind.
- Health-Check-Endpoint, der u.a. die Stripe-Webhook-Verbindung pingt.

---

## Inspektor-Skripte

- `scripts/list-recent-transactions.mjs` — letzte 15 Tx, zeigt session_id / payment_intent / status auf einen Blick. Nützlich für Sanity-Checks nach Deploys.
- `scripts/recover-pending-transactions.mjs` — siehe oben.

Beide laden `.env.local` automatisch.
