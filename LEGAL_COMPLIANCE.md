# Legal Compliance Checklist

## Before Going Live

This document outlines the legal requirements that must be completed before launching The Last Billboard in production.

### 1. Imprint (Impressum) - CRITICAL

**Required by Law in:** Germany, Austria, Switzerland (for commercial websites)

- [ ] **Replace placeholder with actual operator details:**
  - Full legal name or company name
  - Complete address (street, postal code, city, country)
  - Contact email address
  - Phone number (if applicable)
  - VAT ID / Tax ID (if business registered)
  - Commercial register entry (if company)
  - Name of authorized representative (if company)

**Location:** `/legal/imprint` page and all translation files

**Legal Reference:**
- Germany: §5 TMG (Telemediengesetz)
- Austria: §5 ECG (E-Commerce-Gesetz)
- Switzerland: Art. 3 UWG (Unlauterer Wettbewerb)

**Penalties for Non-Compliance:** Fines up to €50,000 in Germany

---

### 2. Privacy Policy - CRITICAL

**Required by:** GDPR (EU), DSGVO (Germany), FADP (Switzerland)

- [ ] **Review GDPR compliance**
  - Verify all data processors are listed (Supabase, Stripe, Vercel)
  - Confirm legal basis for processing (contract, consent, legitimate interest)
  - Ensure data retention periods are specified

- [ ] **Update contact information**
  - Replace `privacy@example.com` with actual privacy contact email
  - Add Data Protection Officer (DPO) contact if required (>250 employees or sensitive data processing)

- [ ] **Verify data processor agreements**
  - [ ] Supabase: Data Processing Agreement (DPA) signed
  - [ ] Stripe: DPA reviewed and accepted
  - [ ] Vercel: DPA reviewed and accepted

- [ ] **Add cookie consent mechanism**
  - Cookie banner is implemented (essential cookies only)
  - If adding analytics later, update privacy policy and cookie banner

- [ ] **Set "Last Updated" date**
  - Currently: April 16, 2026 (placeholder)
  - Update to actual publication date

**Location:** `/legal/privacy` page

**Legal Reference:**
- GDPR Articles 13, 14, 15-22
- Maximum fine: 4% of annual global turnover or €20 million

---

### 3. Terms of Service - IMPORTANT

**Recommended:** Legal review before production

- [ ] **Have lawyer review terms**
  - Verify liability limitations are enforceable
  - Check refund policy compliance with consumer law
  - Confirm acceptable use policy is sufficient

- [ ] **Specify governing law and jurisdiction**
  - Current: "[jurisdiction to be specified]"
  - Recommend: Swiss law (neutral), German law (if DE-based), EU law
  - Add jurisdiction clause (which courts handle disputes)

- [ ] **Verify economic terms**
  - Platform commission: Currently 10%
  - Refund rate: Currently 90% on displacement
  - Minimum bid: Dynamically calculated
  - Confirm these align with business model

- [ ] **Update contact information**
  - Replace `legal@example.com` with actual legal contact
  - Reference imprint for full contact details

- [ ] **Set "Last Updated" date**
  - Currently: April 16, 2026 (placeholder)

**Location:** `/legal/terms` page

**Legal Issues to Consider:**
- Consumer rights (EU: 14-day withdrawal right may apply)
- Payment card chargeback policy
- Intellectual property rights for uploaded content
- Platform liability for user content (Safe Harbor provisions)

---

### 4. Cookie Banner

**Status:** ✅ Implemented (essential cookies only)

- [ ] **Verify cookie usage**
  - Currently: Only essential cookies (auth, preferences)
  - No tracking, analytics, or advertising cookies

- [ ] **If adding analytics/tracking:**
  - [ ] Update privacy policy with new cookies
  - [ ] Update cookie banner to require consent
  - [ ] Implement consent management platform (CMP)
  - [ ] Ensure cookies are blocked until consent

**Current Implementation:** Simple accept banner with link to privacy policy

---

### 5. Email Addresses to Set Up

Before launch, create these email addresses:

- [ ] `privacy@[yourdomain].com` - Privacy/GDPR requests
- [ ] `legal@[yourdomain].com` - Legal inquiries, ToS questions
- [ ] `support@[yourdomain].com` - User support (referenced in reports)
- [ ] `hello@[yourdomain].com` or `contact@[yourdomain].com` - General contact

**Update in:**
- Privacy Policy
- Terms of Service
- Imprint
- Contact forms (if added)

---

### 6. Business Registration

- [ ] **Register business properly**
  - Sole proprietorship, LLC, or other legal entity
  - Obtain VAT ID if required (threshold varies by country)
  - Register with tax authorities
  - Open business bank account for Stripe payouts

- [ ] **Set up proper accounting**
  - Track all transactions (10-year retention for tax compliance)
  - Implement invoice generation (if required)
  - Consult tax advisor for international transactions

---

### 7. Insurance (Recommended)

- [ ] **Consider professional liability insurance**
  - Covers platform liability claims
  - Protects against user content issues
  - Recommended coverage: €1-5 million

- [ ] **Cyber insurance**
  - Data breach coverage
  - GDPR fine coverage (some policies exclude this)

---

### 8. Compliance with Payment Regulations

- [ ] **Stripe account verification**
  - Complete business verification
  - Provide tax ID / VAT ID
  - Submit required business documents

- [ ] **Anti-Money Laundering (AML)**
  - For high-value transactions (>€1,000), may need KYC
  - Stripe handles most AML requirements
  - Keep transaction records for 5-10 years

- [ ] **Consumer protection**
  - Clearly display total price (bid + commission)
  - Transparent refund policy
  - Easy access to terms and contact info

---

### 9. Accessibility (Recommended)

While not always legally required, accessibility compliance is recommended:

- [ ] WCAG 2.1 Level AA compliance
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast ratios
- [ ] Alt text for images

**Legal Requirement in:**
- EU: EN 301 549 (public sector websites)
- Germany: BITV 2.0 (government sites)
- USA: ADA Title III (commercial websites - case law developing)

---

### 10. Content Moderation

- [ ] **Set up moderation process**
  - Review reported content within 24-48 hours
  - Document moderation decisions
  - Implement appeal process

- [ ] **Digital Services Act (DSA) compliance** (if EU-based)
  - Required for platforms with users in EU
  - Transparency reporting
  - Content moderation obligations
  - Complaint mechanisms

---

### 11. International Considerations

#### If Targeting Germany Specifically:
- [ ] GDPR/DSGVO full compliance
- [ ] Impressum (§5 TMG)
- [ ] German language privacy policy and ToS
- [ ] German customer support

#### If Targeting Switzerland:
- [ ] FADP (Federal Act on Data Protection)
- [ ] Impressum recommended
- [ ] Consider Swiss-based data hosting

#### If Targeting EU:
- [ ] GDPR compliance
- [ ] VAT MOSS registration (if sales > €10,000/year to EU)
- [ ] Consumer protection laws vary by country

#### If Targeting US:
- [ ] State-specific laws (CCPA in California, etc.)
- [ ] CAN-SPAM compliance for emails
- [ ] FTC disclosure rules

---

### 12. Pre-Launch Legal Checklist

**2 Weeks Before Launch:**
- [ ] Lawyer reviews all legal pages
- [ ] Privacy policy finalized
- [ ] Terms of Service finalized
- [ ] Imprint completed with real details
- [ ] All placeholder emails replaced
- [ ] Governing law specified

**1 Week Before Launch:**
- [ ] Business fully registered
- [ ] Stripe account verified and approved
- [ ] Insurance policies in place (if purchased)
- [ ] Tax setup completed
- [ ] Email addresses configured and tested

**48 Hours Before Launch:**
- [ ] Final legal review
- [ ] Test all legal page links
- [ ] Verify cookie banner appears on first visit
- [ ] Confirm privacy policy date is correct
- [ ] Test user data export/deletion (GDPR compliance)

---

## Post-Launch Compliance

### Ongoing Obligations:

1. **Data Protection:**
   - Respond to GDPR requests within 30 days
   - Maintain data processing records
   - Update privacy policy when adding features
   - Conduct Data Protection Impact Assessment (DPIA) if processing increases

2. **Financial:**
   - File taxes quarterly/annually
   - Maintain transaction records for 10 years
   - Issue invoices (if legally required)

3. **Legal:**
   - Monitor for legal changes (GDPR updates, DSA, etc.)
   - Update ToS/Privacy Policy as needed (with 14-day notice)
   - Maintain compliance documentation

4. **Reporting:**
   - GDPR breach notification (within 72 hours if occurs)
   - Annual financial statements (if company)
   - VAT returns (if applicable)

---

## Resources

### GDPR Compliance Tools:
- [GDPR.eu](https://gdpr.eu/) - Official GDPR information
- [ICO (UK)](https://ico.org.uk/) - Data protection guidance
- [CNIL (France)](https://www.cnil.fr/) - French data protection authority

### Legal Templates:
- [iubenda](https://www.iubenda.com/) - Privacy policy generator (paid)
- [TermsFeed](https://www.termsfeed.com/) - ToS generator (free/paid)
- [Impressum Generator](https://www.e-recht24.de/impressum-generator.html) - German imprint (DE only)

### Lawyers Specializing in Tech/Startups:
- Consult local bar association for referrals
- Look for lawyers with GDPR and e-commerce experience
- Budget: €1,000-€3,000 for initial legal review

---

## Estimated Costs

| Item | Estimated Cost |
|------|---------------|
| Lawyer (initial review) | €1,000 - €3,000 |
| Business registration | €100 - €500 |
| Liability insurance (annual) | €500 - €2,000 |
| Accounting/tax advisor | €500 - €1,500/year |
| Privacy policy generator (optional) | €0 - €200 |
| **Total Initial Investment** | **€2,100 - €7,200** |

---

## Contact for Legal Questions

**Before launch, all legal questions should be directed to:**
- Your lawyer
- Local chamber of commerce
- Industry associations (e.g., BVDW in Germany for digital economy)

**Do NOT rely solely on this checklist.** Laws vary by jurisdiction and change frequently. Always consult a qualified lawyer before launching.

---

## Document Version

- **Created:** April 16, 2026
- **Last Updated:** April 16, 2026
- **Next Review:** Before production launch

---

## Sign-Off

**Legal Review Completed:**
- [ ] Reviewed by lawyer: _____________________ Date: _________
- [ ] Approved by founder: _____________________ Date: _________
- [ ] Ready for production: Yes / No

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
