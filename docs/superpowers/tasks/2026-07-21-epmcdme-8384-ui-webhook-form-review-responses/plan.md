# EPMCDME-8384 — Webhook form review responses

## Context

MR !1522 (codemie-ui) — GitLab MR event filter checkbox UI — received two
review notes on 2026-07-21 from Yana Asadchaya:

1. **Design question**: how does the MR-action filter behave when the webhook
   also receives non-MR events (push, pipeline, tag)?
2. **Density concern**: the settings form now shows GitHub-signature, GitLab
   token + MR checkboxes, and legacy header auth simultaneously; needs UX
   input from Ihor Nasukho before shipping.

## Backend cross-repo (already fixed)

codemie MR !3758 commit `03d96d935` — non-MR events bypass the MR-action
filter, filtered MR actions ACK 200 instead of raising 400 so GitLab does
not auto-deactivate the webhook endpoint. Answers (1) at the source of
truth.

## UI attempt 1 — mutual exclusion (superseded)

Commit `b4e8b06f2` — hid GitHub-specific fields once user filled GitLab
(and vice versa) via `shouldShow` predicates keyed on non-sensitive
companion fields (so editing an existing webhook with a blanked sensitive
token still gated the other provider). Legacy header stayed visible for
both.

## UI attempt 2 — section grouping (shipped)

After Ihor Nasukho's mockup (MR note 2292672) proposed keeping both
providers reachable but visually sectioned, commit `63ee8d5b1` reverted
the mutual exclusion and introduced:

- `CredentialComponentType.sectionHeader` — pseudo-field type that
  renders an inline `<h5>` heading + divider within the credential
  fields list (no Controller, no form value).
- Five interleaved section headers on the webhook config:
  **General** → **Request verification (legacy header)** →
  **GitHub** → **GitLab** → **Target resource**.
- Outer 'Authentication' heading suppressed via `fieldsSectionTitle: ''`
  so section titles are not duplicated.

## Also

- `note` on `gitlab_event_filter` explains the non-MR bypass behavior
  matched by the backend contract (kept across both commits).
- Test suite: swapped mutual-exclusion assertions for section-shape and
  section-rendering coverage.
