# Code review — 2026-09-03-epmcdme-14093-jira-custom-fields (2026-09-03)

**approve** · confidence: high · 2 of 2 prior blockers cleared · 1 resolved · 1 superseded · 0 unresolved
Coverage: targeted verifier ✓ (re-check of the prior verdict's blocking findings only)

## Re-check outcome

- **CR-001 — resolved** — `src/store/dataSources.ts:219` — [other: robustness] the bare cast is now
  `Array.isArray(result) ? (result as JiraFieldOption[]) : []`, read at HEAD `d645b1b6`. A regression test
  ("degrades to an empty list when a 200 body is not an array") pins the envelope case that would otherwise
  reach `fields.map` during render. Typecheck, lint and the unit suite are recorded green against that same
  HEAD.
- **CR-002 — superseded** — [other: process] the finding's stated impact is refuted by pipeline evidence,
  not merely outweighed by an owner decision. Both merge commits remain in history, so this is moot rather
  than fixed-and-verified — it does not block.

## Why CR-002 no longer applies

`cr-002-pipeline-evidence.md` (the KubeRocketCI task table for `review-codemie-ui-main-zxtdm`) settles the
claim that was uncorroborated in the previous round. The decisive fact is visible in the verbatim table
itself: across all 14 tasks there is **no commit-message or commit-subject validation task** — the only
lints are `dockerfile-lint`, `dockerfile-lint-kc-theme` and `helm-lint`, and the sole title gate,
`mr-title-validate`, **passed**. This pipeline therefore has no mechanism that could stop the MR on a
non-conforming merge-commit subject, which is exactly what CR-002 asserted it would do. The reading is
reinforced by `.ai-run/guides/standards/git-workflow.md`, which documents squash merge into `main` and pins
the format of the *squash* subject, so branch-local merge subjects never reach `main`.

Two limits worth stating: the binding of that run to revision `4120547b` (the commit carrying the
non-conforming subject) is asserted in the artifact's prose rather than shown in the table, and the
retrieval `glab api` call was not re-executed here — but the "no such task exists" argument above holds
independently of both. Separately, that pipeline run failed overall on `sonar` (new code smells) at an
older revision; that is outside this round's two prior findings and is **not** raised as a finding here —
Stage 7 owns final QA.

## Checked and clean

commit-format (carried forward: partial) · code-quality — n/a · security ✓ · no new findings discovered —
this round verifies prior ids only.
