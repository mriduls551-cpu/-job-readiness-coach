# Roles — Metro-Calibrated Redefinition (v1 scope)

Decision: **v1 targets metropolitan-city opportunities only** — Bengaluru, Mumbai,
Delhi-NCR, Hyderabad, Chennai, Pune (Kolkata optional). Salary bands below are
recalibrated to **metro fresher / first-job graduate** pay. Non-metro expansion
is a later phase.

Why this is the right call: a single national salary range read as "wrong" because
it spanned small towns to metros. Narrowing the audience to metros makes one range
accurate again and removes the need for any city-multiplier logic in v1.

Bands are directional (public salary data is noisy) — confirm before shipping, but
they're materially closer to metro reality than the current values.

---

## Redefined salary bands

| Role | Current (engine) | New (metro fresher) | Why changed |
|---|---|---|---|
| Customer Support | ₹2.4–4.2L | **₹2.6–4.5L** | Metro BPO/support incl. shift allowance |
| Sales Support | ₹2.8–4.8L | **₹2.4–4.2L base** *(+ incentives)* | Real pay is base + variable; state both |
| Academic Counsellor | ₹2.6–4.8L | **₹3.0–5.0L** | Metro edtech counselling pays at top of band |
| HR Coordinator | ₹2.8–4.8L | **₹3.0–5.0L** | Metro HR fresher band |
| Data Entry / MIS | ₹2.2–4.0L | **₹2.4–4.2L** | Lean toward MIS (higher); pure data-entry is the floor |
| Back-Office Operations | ₹2.5–4.3L | **₹2.4–4.0L** | Metro back-office fresher |
| Operations Analyst | ₹3.2–5.6L | **₹3.5–6.0L** | Strong metro demand; highest of the desk roles |
| Accounting & Finance | ₹2.8–5.0L | **₹2.6–4.5L** | Ceiling lowered: unqualified grad, not CA/ACCA |
| Digital Marketing | ₹2.8–5.2L | **₹3.0–5.0L** | Metro fresher band, certified candidates top end |
| Content Writer | ₹2.4–4.8L | **₹2.6–4.5L** | Metro fresher; SEO skills push the ceiling |
| **Patient Care Coordinator** *(renamed)* | ₹2.8–4.8L | **₹2.4–4.2L** | Renamed from "Telemedicine Coordinator"; real metro title |
| Legal & Compliance Ops | ₹3.0–5.4L | **₹3.5–5.5L** | Metro compliance-ops fresher (non-lawyer track) |

---

## The one rename

`telemedicine-coordinator` → **`patient-care-coordinator`**

- `name`: "Patient Care Coordinator"
- `shortLabel`: "Patient Care Coordination"
- Reason: "telemedicine coordinator" barely exists as a metro job title; "patient
  care coordinator" is the real, searchable role (hospitals, clinics, telehealth).
  Keep the same vector/cluster — only the title and copy change so matched users
  can actually find listings.
- Update the Hindi `t(en, hi)` pair to match.

Everything else (the other 11 ids, vectors, clusters, questions) stays unchanged
at this step. Vector tuning is the *next* phase, driven by the eval harness — not
something to eyeball now.

---

## Where "metro-only" lives in the product (not in each role)

Don't bake "in metro cities" into all 12 role summaries — it'll read repetitively.
Handle scope at the product level:

1. **Results / job-search copy:** one line — "Based on current openings in metro
   cities (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Pune)."
2. **Salary label:** "Typical metro starter range" instead of "Typical starter
   range," so the number is honestly scoped.
3. **Signup / onboarding (optional):** if you want clean data, ask the user's city
   and gently flag when they're outside the metro set, rather than silently
   matching them to opportunities that aren't near them.

This keeps the role definitions clean and makes the metro focus a one-place product
decision you can flip when you expand.

---

## Open question for you

Do you want the salary band to represent **base only** or **base + typical
incentives**? It matters most for Sales Support and Academic Counsellor (both
heavily target-based in metros). Recommend: show base, and add "+ incentives" as a
suffix where relevant — honest and avoids inflating the headline number.
