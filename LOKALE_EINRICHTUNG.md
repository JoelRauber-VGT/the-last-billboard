# 🚀 Lokale Einrichtung & Test - The Last Billboard

**Geschätzte Zeit:** 20-30 Minuten

## 1️⃣ Stripe Test-Konto einrichten (5 Min)

### Schritt 1: Konto erstellen
1. Gehe zu [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Erstelle einen Account (kostenfrei)
3. **Wichtig:** Bleibe im **Test Mode** (Toggle oben rechts)

### Schritt 2: API-Keys holen
1. Gehe zu **Developers** → **API Keys**
2. Kopiere diese 2 Keys:
   ```
   Publishable key: pk_test_xxxxx
   Secret key:      sk_test_xxxxx
   ```
3. **Notiere sie** - brauchst du gleich!

---

## 2️⃣ Supabase Projekt einrichten (10 Min)

### Schritt 1: Projekt erstellen
1. Gehe zu [https://app.supabase.com/](https://app.supabase.com/)
2. Klicke **New Project**
3. Wähle:
   - **Organization:** Deine existierende oder erstelle neue
   - **Name:** `the-last-billboard-dev`
   - **Database Password:** Generiere starkes Passwort (speichern!)
   - **Region:** Wähle nächstgelegene (z.B. Frankfurt für DE)
4. Klicke **Create new project**
5. Warte ~2 Minuten bis Projekt bereit ist

### Schritt 2: Datenbank-Migrationen anwenden
Öffne Terminal in deinem Projekt-Ordner:

```bash
# Supabase CLI installieren (falls noch nicht vorhanden)
npm install -g supabase

# Mit Projekt verbinden
supabase login

# Projekt verlinken (Project Ref findest du in Settings → General)
supabase link --project-ref dein-projekt-ref

# Alle Migrationen anwenden
supabase db push
```

### Schritt 3: Storage Bucket konfigurieren
1. Gehe zu **Storage** im Supabase Dashboard
2. Erstelle Bucket `slot-images` (falls nicht vorhanden)
3. Setze auf **Public**
4. Maximale Dateigröße: **10 MB**

### Schritt 4: API-Keys kopieren
1. Gehe zu **Settings** → **API**
2. Kopiere diese 3 Werte:
   ```
   Project URL:      https://xxx.supabase.co
   anon public key:  eyJhbGc...
   service_role key: eyJhbGc...
   ```

---

## 3️⃣ Environment-Variablen einrichten (3 Min)

### Schritt 1: .env.local erstellen
```bash
# Im Projekt-Ordner
cp .env.example .env.local
```

### Schritt 2: .env.local ausfüllen
Öffne `.env.local` und ersetze alle Platzhalter:

```env
# Supabase (von Schritt 2)
NEXT_PUBLIC_SUPABASE_URL=https://deinprojekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (von Schritt 1)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # ← kommt gleich

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Achtung:** `STRIPE_WEBHOOK_SECRET` fügen wir im nächsten Schritt hinzu!

---

## 4️⃣ Stripe CLI für Webhooks (5 Min)

### Schritt 1: Stripe CLI installieren

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
# Download von https://github.com/stripe/stripe-cli/releases/latest
# Entpacken und zu PATH hinzufügen
```

**Linux:**
```bash
# Download von https://github.com/stripe/stripe-cli/releases/latest
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### Schritt 2: Login & Webhook-Secret holen
```bash
# Bei Stripe anmelden
stripe login
# Browser öffnet sich → Bestätige Zugriff

# Webhook forwarding starten
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Du siehst jetzt:**
```
> Ready! Your webhook signing secret is whsec_xxxxx
```

### Schritt 3: Webhook-Secret in .env.local eintragen
Kopiere den `whsec_xxxxx` Wert und füge ihn in `.env.local` ein:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Wichtig:** Lasse das Terminal mit `stripe listen` **offen laufen** während du testest!

---

## 5️⃣ App lokal starten (2 Min)

### Dependencies installieren (falls noch nicht)
```bash
npm install
```

### Development Server starten
```bash
npm run dev
```

**App läuft jetzt auf:** [http://localhost:3000](http://localhost:3000)

---

## 6️⃣ Lokale Tests durchführen ✅

### Test 1: Homepage laden
1. Öffne [http://localhost:3000](http://localhost:3000)
2. ✅ Billboard sollte sichtbar sein
3. ✅ Header mit Navigation sollte angezeigt werden

### Test 2: Anmeldung (Magic Link)
1. Klicke **Login** in der Navigation
2. Gib deine E-Mail ein (verwende echte E-Mail!)
3. Klicke **Send Magic Link**
4. Öffne dein Postfach
5. Klicke auf den Link im Mail
6. ✅ Du solltest eingeloggt sein

### Test 3: Bid platzieren (Vollständiger Flow)
1. Klicke **Place Bid** (oder direkt auf Billboard)
2. Fülle das Formular aus:
   - **Display Name:** `Test Company`
   - **Link URL:** `https://example.com`
   - **Brand Color:** Wähle eine Farbe
   - **Bid Amount:** `5` (Euro)
   - **Image:** Lade ein Bild hoch (<10MB)
3. Klicke **Submit Bid**

**Du wirst zu Stripe Checkout weitergeleitet:**
4. Verwende Test-Kreditkarte:
   ```
   Kartennummer: 4242 4242 4242 4242
   Ablaufdatum:  12/34 (beliebiges Datum in Zukunft)
   CVC:          123
   PLZ:          12345
   ```
5. Klicke **Pay**

**Nach erfolgreicher Zahlung:**
6. ✅ Du wirst zu `/bid/success` weitergeleitet
7. ✅ Schau im Terminal mit `stripe listen` - du solltest ein Webhook-Event sehen
8. ✅ Gehe zurück zur Homepage - dein Slot sollte im Billboard erscheinen

### Test 4: Webhook-Verarbeitung prüfen
Prüfe das Terminal mit `stripe listen`:
```
[200] POST /api/webhooks/stripe [evt_xxxxx]
✓ Webhook verified
✓ Event: checkout.session.completed
✓ Transaction updated: completed
```

### Test 5: Dashboard prüfen
1. Gehe zu [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. ✅ Dein Bid sollte unter "Active Slots" angezeigt werden
3. ✅ Transaction sollte als "Completed" angezeigt werden

### Test 6: Admin-Panel prüfen (falls du erster Nutzer bist)
1. Gehe zu [http://localhost:3000/admin](http://localhost:3000/admin)
2. ✅ Dashboard mit Statistiken sollte sichtbar sein
3. Gehe zu `/admin/slots`
4. ✅ Dein Slot sollte gelistet sein

### Test 7: Outbid-Flow (2. Nutzer)
1. Logge dich aus
2. Melde dich mit **anderer E-Mail** an
3. Klicke auf den bestehenden Slot im Billboard
4. Klicke **Outbid**
5. Biete höher (z.B. `10` Euro)
6. Zahle mit Test-Karte
7. ✅ Neuer Slot sollte den alten ersetzen
8. ✅ Erster Nutzer sollte Refund bekommen (90% = €4.50)

Prüfe in Stripe Dashboard → Payments:
- ✅ Erste Zahlung: €5.00
- ✅ Zweite Zahlung: €10.00
- ✅ Refund: €4.50 (90% von €5)

### Test 8: Report-Funktion
1. Klicke auf einen Slot
2. Klicke **Report**
3. Wähle einen Grund (z.B. "Inappropriate content")
4. Klicke **Submit**
5. ✅ Success-Nachricht sollte erscheinen

**Mit 2 weiteren Accounts dasselbe machen (insgesamt 3 Reports):**
6. ✅ Nach dem 3. Report sollte der Slot automatisch ausgeblendet werden

### Test 9: Mehrsprachigkeit
1. Wechsle oben rechts auf **Deutsch (DE)**
2. ✅ Alle Texte sollten auf Deutsch sein
3. Wechsle zu **Français (FR)**
4. ✅ Alle Texte auf Französisch
5. Wechsle zu **Español (ES)**
6. ✅ Alle Texte auf Spanisch

### Test 10: Mobile Ansicht
1. Öffne DevTools (F12)
2. Klicke auf "Toggle Device Toolbar" (📱 Icon)
3. Wähle "iPhone 12 Pro"
4. ✅ Header sollte Hamburger-Menü zeigen
5. ✅ Billboard sollte scrollbar/zoombar sein
6. ✅ Bid-Formular sollte benutzbar sein

---

## 🧰 Nützliche Stripe Test-Karten

| Kartennummer | Szenario |
|--------------|----------|
| `4242 4242 4242 4242` | ✅ Erfolgreiche Zahlung |
| `4000 0000 0000 0002` | ❌ Karte abgelehnt |
| `4000 0000 0000 9995` | ❌ Nicht genug Guthaben |
| `4000 0000 0000 0341` | ❌ Verarbeitungsfehler |

**Für alle:** Beliebiges Ablaufdatum in Zukunft, beliebiger CVC, beliebige PLZ

---

## 🔍 Troubleshooting

### Problem: "Webhook signature verification failed"
**Lösung:**
- Stelle sicher, dass `stripe listen` läuft
- Kopiere das `whsec_...` Secret erneut in `.env.local`
- Starte den Dev-Server neu: `npm run dev`

### Problem: "Supabase client error"
**Lösung:**
- Prüfe `.env.local` auf Tippfehler
- Stelle sicher, dass Migrationen angewendet wurden: `supabase db push`
- Prüfe Supabase Dashboard → Project Settings → API (Keys korrekt?)

### Problem: "Image upload fails"
**Lösung:**
- Gehe zu Supabase Dashboard → Storage
- Stelle sicher, dass `slot-images` Bucket existiert
- Setze Bucket auf **Public**
- Prüfe RLS Policies (sollten durch Migration gesetzt sein)

### Problem: "Transaction not updating to 'completed'"
**Lösung:**
- Prüfe Terminal mit `stripe listen` - wird Webhook empfangen?
- Prüfe Supabase Logs: Dashboard → Logs → API
- Stelle sicher, `SUPABASE_SERVICE_ROLE_KEY` ist gesetzt

### Problem: TypeScript-Fehler beim Build
**Info:** Das Projekt hat einige vorhandene TypeScript-Warnungen (siehe Dokumentation). Diese sind bekannt und beeinflussen die Funktionalität nicht. Du kannst sie ignorieren oder mit `npm run dev` im Dev-Mode starten.

---

## 📊 Was du sehen solltest

Nach vollständigem Test solltest du haben:
- ✅ Mind. 1 User in Supabase (profiles table)
- ✅ Mind. 1 Slot in Supabase (slots table)
- ✅ Mind. 2 Transactions in Supabase (transactions table)
- ✅ Mind. 2 Payments in Stripe Dashboard (Test Mode)
- ✅ Mind. 1 Refund in Stripe Dashboard
- ✅ Billboard zeigt Slot(s) an
- ✅ Webhook-Events im Terminal sichtbar

---

## 🎯 Nächste Schritte

Wenn lokale Tests erfolgreich:
1. **Für Production:** Siehe `PRODUCTION_CHECKLIST.md`
   - Live Stripe-Keys holen
   - Production Supabase Projekt erstellen
   - Domain konfigurieren
   - Auf Vercel deployen

2. **Legal:** Siehe `LEGAL_COMPLIANCE.md`
   - Impressum ausfüllen
   - Datenschutzerklärung anpassen
   - AGB prüfen lassen

3. **Optional:**
   - Sentry einrichten (Error Tracking)
   - Analytics einrichten
   - Custom Domain Email

---

## 🆘 Hilfe benötigt?

- **Stripe Docs:** https://stripe.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Projekt README:** `README.md`
- **Stripe Implementierung:** `STRIPE_IMPLEMENTATION_REPORT.md`

---

**Viel Erfolg! 🚀**

Bei Fragen oder Problemen, prüfe zuerst die Logs:
- **Browser Console** (F12)
- **Terminal** (npm run dev)
- **Stripe CLI Terminal** (stripe listen)
- **Supabase Dashboard → Logs**
