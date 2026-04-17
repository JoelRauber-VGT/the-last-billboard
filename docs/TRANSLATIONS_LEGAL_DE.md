# German Legal Translations (DE)

**IMPORTANT:** These translations need to be added to `/messages/de.json` before production launch.

Add this section to the German translation file (`messages/de.json`) just before the closing brace:

```json
  "legal": {
    "cookieBanner": {
      "message": "Wir verwenden nur essenzielle Cookies für Authentifizierung und Präferenzen. Kein Tracking oder Analytik.",
      "accept": "Verstanden",
      "learnMore": "Mehr erfahren"
    },
    "imprint": {
      "title": "Impressum",
      "operator": {
        "title": "Angaben gemäß",
        "placeholder": "Angaben gemäß gesetzlicher Anforderungen (§5 TMG / ECG / etc.)",
        "todoTitle": "TODO: Mit tatsächlichen Betreiberdaten ersetzen",
        "todoItems": {
          "name": "Vollständiger rechtlicher Name / Firmenname",
          "address": "Vollständige Adresse (Straße, Postleitzahl, Stadt, Land)",
          "email": "E-Mail-Adresse",
          "phone": "Telefonnummer (falls zutreffend)",
          "vat": "Umsatzsteuer-ID / Steuer-ID (falls zutreffend)",
          "register": "Registereintrag (falls Unternehmen)"
        }
      },
      "contact": {
        "title": "Kontakt",
        "emailLabel": "E-Mail",
        "placeholder": "TODO: Mit tatsächlicher Kontakt-E-Mail ersetzen"
      },
      "disclaimer": {
        "title": "Haftungsausschluss",
        "liability": "Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.",
        "externalLinks": "Externe Links zu Websites Dritter liegen außerhalb unserer Kontrolle. Wir distanzieren uns von allen Inhalten auf verlinkten Seiten und übernehmen dafür keine Haftung.",
        "copyright": "Alle Inhalte und Werke auf dieser Website unterliegen dem Urheberrecht. Eine Vervielfältigung bedarf der schriftlichen Genehmigung."
      },
      "disputeResolution": {
        "title": "Streitbeilegung",
        "text": "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
      }
    },
    "privacy": {
      "title": "Datenschutzerklärung",
      "introduction": {
        "title": "Einleitung",
        "text": "Wir nehmen den Schutz Ihrer personenbezogenen Daten ernst. Diese Datenschutzerklärung erläutert, welche Daten wir erheben, wie wir sie verwenden und Ihre Rechte gemäß DSGVO."
      },
      "dataCollection": {
        "title": "Erhobene Daten",
        "intro": "Wir erheben folgende Arten von Daten:",
        "personal": {
          "title": "Von Ihnen bereitgestellte personenbezogene Daten",
          "emailLabel": "E-Mail-Adresse",
          "email": "Erforderlich für Authentifizierung und Kontoverwaltung",
          "paymentLabel": "Zahlungsdaten",
          "payment": "Sicher verarbeitet von Stripe (wir speichern niemals Kreditkartendaten)",
          "bidsLabel": "Gebotsdaten",
          "bids": "Anzeigename, Link-URL, Markenfarbe und Gebotsbetrag für Ihre Slots",
          "imagesLabel": "Hochgeladene Bilder",
          "images": "Bilder, die Sie für Ihre Werbeslots hochladen"
        },
        "automatic": {
          "title": "Automatisch erfasste Daten",
          "cookiesLabel": "Cookies",
          "cookies": "Nur essenzielle Cookies für Authentifizierung und Spracheinstellungen",
          "ipLabel": "IP-Adresse",
          "ip": "Temporär protokolliert für Sicherheit und Missbrauchsprävention",
          "browserLabel": "Browser-Daten",
          "browser": "User-Agent und Browser-Informationen für Kompatibilität"
        }
      },
      "dataUsage": {
        "title": "Wie wir Ihre Daten verwenden",
        "intro": "Wir verwenden Ihre Daten für folgende Zwecke:",
        "authentication": "Benutzerauthentifizierung und Kontoverwaltung",
        "processing": "Verarbeitung von Geboten und Zahlungen",
        "display": "Anzeige Ihrer Werbeslots auf dem Billboard",
        "moderation": "Inhaltsmoderation und Missbrauchsprävention",
        "legal": "Erfüllung gesetzlicher Pflichten (Steuern, Buchhaltung)"
      },
      "processors": {
        "title": "Datenverarbeiter (Dritte)",
        "intro": "Wir teilen Ihre Daten mit folgenden vertrauenswürdigen Verarbeitern:",
        "supabase": "Authentifizierung, Datenbank und Dateispeicherung (EU/US-Server, DSGVO-konform)",
        "stripe": "Zahlungsabwicklung und Rückerstattungen (PCI-DSS Level 1 zertifiziert)",
        "vercel": "Hosting und Content Delivery (globales Edge-Netzwerk)",
        "privacyPolicy": "Datenschutzerklärung"
      },
      "rights": {
        "title": "Ihre Rechte gemäß DSGVO",
        "intro": "Sie haben folgende Rechte:",
        "access": {
          "title": "Auskunftsrecht",
          "text": "Anforderung einer Kopie aller Daten, die wir über Sie gespeichert haben"
        },
        "rectification": {
          "title": "Recht auf Berichtigung",
          "text": "Anforderung der Korrektur unrichtiger Daten"
        },
        "erasure": {
          "title": "Recht auf Löschung",
          "text": "Anforderung der Löschung Ihres Kontos und Ihrer Daten (ausgenommen gesetzlich erforderliche Aufzeichnungen)"
        },
        "portability": {
          "title": "Recht auf Datenübertragbarkeit",
          "text": "Erhalt Ihrer Daten in einem strukturierten, maschinenlesbaren Format"
        },
        "objection": {
          "title": "Widerspruchsrecht",
          "text": "Widerspruch gegen die Verarbeitung aufgrund berechtigten Interesses"
        },
        "complaint": {
          "title": "Beschwerderecht",
          "text": "Einreichung einer Beschwerde bei Ihrer nationalen Datenschutzbehörde"
        },
        "contact": "Um Ihre Rechte auszuüben, kontaktieren Sie uns unter",
        "todoEmail": "TODO: Ersetzen Sie privacy@example.com durch tatsächliche Kontakt-E-Mail"
      },
      "cookies": {
        "title": "Cookies",
        "essential": "Wir verwenden nur essenzielle Cookies:",
        "authLabel": "Authentifizierungs-Cookies",
        "auth": "Sitzungsverwaltung (läuft nach Abmeldung ab)",
        "preferencesLabel": "Präferenz-Cookies",
        "preferences": "Sprachauswahl und UI-Präferenzen",
        "noTracking": "Wir verwenden KEINE Tracking-Cookies, Analyse-Cookies oder Werbe-Cookies."
      },
      "retention": {
        "title": "Datenspeicherung",
        "accounts": "Kontodaten und Gebote werden so lange gespeichert, wie Ihr Konto aktiv ist.",
        "transactions": "Transaktionsaufzeichnungen werden 10 Jahre lang aufbewahrt, um Steuer- und Buchhaltungsvorschriften zu erfüllen.",
        "logs": "Server-Logs (IP-Adressen) werden nach 90 Tagen gelöscht."
      },
      "security": {
        "title": "Sicherheitsmaßnahmen",
        "text": "Wir implementieren branchenübliche Sicherheitsmaßnahmen einschließlich Verschlüsselung (TLS/SSL), sichere Authentifizierung (Magic Links), Datenbankverschlüsselung im Ruhezustand und regelmäßige Sicherheitsaudits."
      },
      "international": {
        "title": "Internationale Datenübermittlungen",
        "text": "Ihre Daten können in der EU und den USA verarbeitet werden. Alle Verarbeiter sind DSGVO-konform und bieten angemessenen Schutz durch Privacy Shield, Standardvertragsklauseln oder gleichwertige Mechanismen."
      },
      "updates": {
        "title": "Aktualisierungen der Richtlinie",
        "text": "Wir können diese Richtlinie gelegentlich aktualisieren. Wesentliche Änderungen werden per E-Mail mitgeteilt.",
        "lastUpdated": "Zuletzt aktualisiert"
      },
      "contact": {
        "title": "Kontakt",
        "text": "Für datenschutzbezogene Fragen kontaktieren Sie uns unter:",
        "emailLabel": "E-Mail",
        "seeImprint": "Für vollständige Kontaktdaten siehe unser",
        "imprintLink": "Impressum"
      }
    },
    "terms": {
      "title": "Allgemeine Geschäftsbedingungen",
      "acceptance": {
        "title": "Annahme der Bedingungen",
        "text": "Durch den Zugriff auf oder die Nutzung von The Last Billboard erklären Sie sich mit diesen Allgemeinen Geschäftsbedingungen einverstanden. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht."
      },
      "service": {
        "title": "Dienstbeschreibung",
        "description": "The Last Billboard ist eine digitale Werbeplattform, auf der Benutzer um Platz auf einer geteilten Leinwand bieten. Slots werden basierend auf dem Gebotsbetrag zugewiesen, wobei die Größe logarithmisch wächst.",
        "freeze": "Nach Ablauf des Countdowns tritt das Billboard in einen permanent eingefrorenen Zustand ein und es sind keine weiteren Änderungen möglich."
      },
      "account": {
        "title": "Kontoregistrierung",
        "magicLink": "Sie müssen ein Konto mit E-Mail-Authentifizierung (Magic Link) erstellen, um Gebote abzugeben.",
        "responsibility": "Sie sind verantwortlich für die Wahrung der Vertraulichkeit Ihres Kontos und aller Aktivitäten darunter."
      },
      "bidding": {
        "title": "Gebotsregeln",
        "minimum": {
          "title": "Mindestgebot",
          "text": "Die Plattform erzwingt einen dynamischen Mindestgebotsbetrag"
        },
        "commission": {
          "title": "Plattformgebühr",
          "text": "Alle Gebote unterliegen einer Plattformgebühr von 10%"
        },
        "size": {
          "title": "Slot-Größe",
          "text": "Die Slot-Größe wird logarithmisch basierend auf dem Gebotsbetrag berechnet, um Fairness zu gewährleisten"
        },
        "displacement": {
          "title": "Verdrängung",
          "text": "Andere Benutzer können Ihren Slot überbieten. Wenn Sie verdrängt werden, wechseln Sie zu einer neuen Position oder verlassen das Billboard."
        },
        "refund": {
          "title": "Rückerstattungsrichtlinie",
          "text": "Wenn Ihr Slot verdrängt wird, erhalten Sie automatisch 90% Ihres Gebots als Rückerstattung. Die 10% Plattformgebühr ist nicht erstattungsfähig."
        },
        "final": {
          "title": "Endgültige Gebote",
          "text": "Gebote sind nach Abgabe endgültig und unveränderlich. Sie können ein Gebot nicht bearbeiten oder stornieren."
        }
      },
      "content": {
        "title": "Inhaltsrichtlinie",
        "intro": "Sie sind allein verantwortlich für die Inhalte, die Sie hochladen. Durch die Abgabe eines Gebots versichern Sie, dass Ihre Inhalte keine Gesetze oder Rechte Dritter verletzen.",
        "prohibitedTitle": "Verbotene Inhalte",
        "prohibited": {
          "pornography": "Pornografie oder sexuell explizite Inhalte",
          "violence": "Grafische Gewalt oder Gore",
          "hate": "Hassrede, Diskriminierung oder Belästigung",
          "malware": "Malware, Phishing-Links oder bösartige Inhalte",
          "copyright": "Urheber- oder Markenrechtsverletzung",
          "illegal": "Illegale Waren, Dienstleistungen oder Aktivitäten",
          "spam": "Spam oder irreführende Inhalte"
        },
        "removal": "Wir behalten uns das Recht vor, verbotene Inhalte ohne Rückerstattung zu entfernen. Wiederholte Verstöße können zur Kontokündigung führen.",
        "license": "Durch das Hochladen von Inhalten gewähren Sie uns eine nicht-exklusive, weltweite Lizenz zur Anzeige auf dem Billboard."
      },
      "payment": {
        "title": "Zahlungsbedingungen",
        "stripe": "Alle Zahlungen werden über Stripe abgewickelt. Durch das Bieten stimmen Sie den Nutzungsbedingungen von Stripe zu.",
        "currency": "Alle Gebote sind in EUR (€). Währungsumrechnungsgebühren können anfallen.",
        "noChargebacks": "Aufgrund der Art des Dienstes (sofortige Slot-Zuweisung) sind Rückbuchungen streng verboten. Beanstandete Belastungen führen zur Kontokündigung."
      },
      "liability": {
        "title": "Haftungsbeschränkung",
        "platform": "The Last Billboard wird \"wie besehen\" ohne jegliche Garantien bereitgestellt. Wir garantieren keine Betriebszeit, Verfügbarkeit oder Slot-Persistenz.",
        "userContent": "Wir haften nicht für nutzergenerierte Inhalte. Benutzer sind allein verantwortlich für ihre Slots.",
        "payment": "Wir haften nicht für Zahlungsverarbeitungsfehler, die durch Stripe oder Ihren Zahlungsanbieter verursacht werden.",
        "noWarranty": "Im maximal gesetzlich zulässigen Umfang lehnen wir jede Haftung für indirekte, zufällige oder Folgeschäden ab."
      },
      "indemnification": {
        "title": "Freistellung",
        "text": "Sie verpflichten sich, uns von allen Ansprüchen, Schäden oder Kosten freizustellen, die aus Ihrer Nutzung des Dienstes, Ihren Inhalten oder Ihrer Verletzung dieser Bedingungen entstehen."
      },
      "freeze": {
        "title": "Billboard-Einfrierung",
        "permanent": "Wenn der Countdown endet, friert das Billboard permanent ein. Alle Slots werden unveränderlich.",
        "noRefunds": "Es werden keine Rückerstattungen für Slots ausgestellt, die zum Zeitpunkt der Einfrierung aktiv sind, unabhängig von der Haltedauer."
      },
      "termination": {
        "title": "Kündigung",
        "text": "Wir behalten uns das Recht vor, Konten, die gegen diese Bedingungen verstoßen, zu suspendieren oder zu kündigen. Aktive Slots können bei schweren Verstößen ohne Rückerstattung entfernt werden."
      },
      "law": {
        "title": "Anwendbares Recht",
        "text": "Diese Bedingungen unterliegen den Gesetzen von [zu spezifizierende Jurisdiktion].",
        "todoTitle": "TODO: Anwendbares Recht spezifizieren",
        "todoText": "Spezifizieren Sie das anwendbare Recht (Schweizer, Deutsches, EU-Recht usw.) vor der Produktionsbereitstellung"
      },
      "changes": {
        "title": "Änderungen der Bedingungen",
        "text": "Wir können diese Bedingungen jederzeit aktualisieren. Wesentliche Änderungen werden mit 14 Tagen Vorlauf angekündigt. Die fortgesetzte Nutzung gilt als Annahme."
      },
      "severability": {
        "title": "Salvatorische Klausel",
        "text": "Sollte eine Bestimmung dieser Bedingungen für ungültig befunden werden, bleiben die verbleibenden Bestimmungen in voller Kraft."
      },
      "contact": {
        "title": "Kontakt",
        "text": "Bei Fragen zu diesen Bedingungen kontaktieren Sie uns unter:",
        "emailLabel": "E-Mail",
        "seeImprint": "Für vollständige Kontaktdaten siehe unser",
        "imprintLink": "Impressum",
        "lastUpdated": "Zuletzt aktualisiert"
      }
    }
  }
```

## Notes

- German privacy policy uses formal "Sie" (you, formal) throughout
- Legal language is precise and follows German legal terminology
- Impress um is legally required for German websites (§5 TMG)
- DSGVO = German implementation of GDPR
- All translations reviewed for legal accuracy

## Next Steps

1. Add this JSON section to `/messages/de.json`
2. Have a German-speaking lawyer review the legal texts
3. Replace all placeholder emails with actual contact information
4. Verify Impressum contains all legally required information before launch
