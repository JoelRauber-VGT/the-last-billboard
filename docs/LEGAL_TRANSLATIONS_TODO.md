# Legal Translations - TODO for Production

## Status

✅ **English (en.json)** - Complete with full legal translations
✅ **German (de.json)** - About page complete, legal translations in `TRANSLATIONS_LEGAL_DE.md`
✅ **French (fr.json)** - About page complete, legal translations needed
✅ **Spanish (es.json)** - About page complete, legal translations needed

## What's Complete

### All Languages:
- ✅ Legal page routes created (`/legal/imprint`, `/legal/privacy`, `/legal/terms`)
- ✅ About page enhanced with comprehensive content
- ✅ Footer updated with legal links
- ✅ Cookie banner implemented and added to layout
- ✅ Build succeeds without errors

### English Only:
- ✅ Full legal translations for Imprint, Privacy Policy, Terms of Service
- ✅ Cookie banner text
- ✅ All TODOs clearly marked for admin

## What's Needed Before Production

### High Priority:

1. **German Legal Translations**
   - File: `docs/TRANSLATIONS_LEGAL_DE.md` contains complete translations
   - Action: Copy the JSON section from that file into `/messages/de.json` before the closing brace
   - Estimated time: 5 minutes
   - Have German-speaking lawyer review all legal texts

2. **French Legal Translations**
   - Create similar comprehensive translations for:
     - `legal.cookieBanner.*`
     - `legal.imprint.*`
     - `legal.privacy.*`
     - `legal.terms.*`
   - Use formal "vous" (you, formal) throughout
   - Consider Quebec French vs. France French requirements
   - Estimated time: 2-3 hours or hire professional translator

3. **Spanish Legal Translations**
   - Create similar comprehensive translations for all legal sections
   - Use formal "usted" (you, formal) throughout
   - Consider if targeting Spain vs. Latin America
   - Estimated time: 2-3 hours or hire professional translator

### Medium Priority:

4. **Legal Review**
   - Have lawyer review English terms before translating
   - Translate only after legal review complete
   - Budget: €1,000-3,000 for legal review

5. **Replace Placeholders**
   - Search for `@example.com` in all files
   - Replace with actual business email addresses
   - Update Imprint with real operator information

6. **Governing Law**
   - Decide: Swiss, German, EU law?
   - Update Terms of Service accordingly
   - Affects jurisdiction for disputes

### Low Priority:

7. **Professional Translation Review**
   - Have native speakers review all legal translations
   - Especially important for German (Impressum is legally binding)
   - Budget: €500-1,000 per language pair

## Temporary Workaround

The legal pages currently work in all languages but will show "MISSING_MESSAGE" errors for untranslated legal content in German, French, and Spanish. This is acceptable for development but **NOT for production**.

## Translation Resources

### For German:
- Use `TRANSLATIONS_LEGAL_DE.md` - already complete
- Impressum Generator: https://www.e-recht24.de/impressum-generator.html

### For French:
- Canadian French: Office québécois de la langue française
- France French: CNIL (data protection authority) has templates

### For Spanish:
- Spain: AEPD (Agencia Española de Protección de Datos)
- Latin America: varies by country

### Professional Services:
- Gengo: Professional translation service (€0.06-0.12/word)
- DeepL Pro: AI translation with legal vocabulary
- Local lawyers: Often provide translation as part of legal review

## Estimated Costs

| Task | Cost |
|------|------|
| German translation (DONE) | €0 |
| French legal translation | €300-600 (professional) or  €0 (DIY) |
| Spanish legal translation | €300-600 (professional) or €0 (DIY) |
| Legal review (all languages) | €1,500-3,000 |
| **Total** | **€2,100-4,200** |

## Quick Start for Completing German

1. Open `/messages/de.json`
2. Open `docs/TRANSLATIONS_LEGAL_DE.md`
3. Copy the entire JSON block from the docs file
4. Paste it before the final `}` in `de.json`
5. Ensure proper JSON formatting (comma after previous section)
6. Run `npm run build` to verify
7. Test legal pages in German: http://localhost:3000/de/legal/imprint

## File Structure

```
messages/
├── en.json          ✅ Complete with all legal content
├── de.json          ⚠️  About complete, legal in docs/TRANSLATIONS_LEGAL_DE.md
├── fr.json          ❌ About complete, legal missing
└── es.json          ❌ About complete, legal missing

docs/
├── TRANSLATIONS_LEGAL_DE.md     ✅ Complete German legal translations
├── LEGAL_COMPLIANCE.md          ✅ Legal requirements checklist
└── LEGAL_TRANSLATIONS_TODO.md   ✅ This file
```

## Testing Checklist

Before going live, verify:

- [ ] All legal pages render without "MISSING_MESSAGE" errors
- [ ] Cookie banner appears on first visit in all languages
- [ ] Footer links work in all languages
- [ ] Email addresses are real (not @example.com)
- [ ] Imprint has real operator details (not placeholder)
- [ ] Governing law is specified in Terms
- [ ] "Last Updated" dates are correct
- [ ] Lawyer has reviewed all legal pages
- [ ] Professional translator reviewed non-English versions

## Support

If you need help:
1. See `LEGAL_COMPLIANCE.md` for legal requirements
2. See `TRANSLATIONS_LEGAL_DE.md` for German translation reference
3. Contact a lawyer for legal review
4. Hire professional translator for FR/ES if needed

---

**Last Updated:** April 16, 2026
**Status:** Development - NOT production-ready
**Next Action:** Add German legal translations from docs file
