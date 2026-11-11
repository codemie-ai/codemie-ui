---
schema: sdlc-factory/code-review@1
decision: approved
reviewed_head: cebdd2c86c67646a45661ccfc0d37b01f3434d87
---

# Code review — 2026-10-23-epmcdme-15960

**Decision:** approved (check round)
**Reviewed head:** `cebdd2c86` · **Rounds:** final, check

Re-verified against the branch as rebased onto `main` (`cebdd2c86`). Both prior blocking findings are
resolved and the deferred gap has since been fixed on this same branch; no new blocking findings on
re-check. Confidence stays low (no spec/story exists for this change — unchanged from the final round).

## Resolved — 2

### CR-001 · code · major — Branch name violates naming convention

**Was:** branch 'epmcdme-15960' (lowercase, rejected by the documented EPMCDME-XXXX_short-description pattern).

**Now:** current branch is `EPMCDME-15960_workflow-required-list-a11y` — correctly cased. Re-checked
directly against `git branch --show-current` on 2026-11-05.

### CR-002 · code · major — Empty required list exposes no aria-required

**Was:** `src/components/form/InputArray/InputArray.tsx:130` — a required free-entry list with
value `[]` rendered zero child inputs, so nothing in the DOM carried `aria-required` in that state.

**Now:** fixed in `1373dea19` ("Expose aria-required on empty required InputArray lists") — a
visually-hidden placeholder input at `InputArray.tsx:133-137` carries `aria-required="true"` when
the list is empty and required. Re-checked directly against the file on 2026-11-05.

## Resolved — pre-existing — 1

- **Required-list validation accepted whitespace-only entries** — fixed in `5ffdd4352`/`cebdd2c86`
  ("Treat required lists with only blank rows as missing"): `isRequiredValueMissing`
  (`formUtils.ts:41-46`) now treats a list as missing when every row is `null`/`undefined` or
  whitespace, shared by both `ToolForm` and `CustomNodeForm`.

## Deferred (not blocking) — new, from a 2026-11-05 ad-hoc review

- **`isRequiredValueMissing`'s scalar branch (`!value`) treats `0`/`false` as missing**
  (`formUtils.ts:45`) — pre-existing, not introduced by this diff, but this diff is what centralizes
  and exports the function. A required numeric/boolean tool or custom-node argument set to `0` or
  `false` would be wrongly flagged missing. Worth a follow-up ticket; out of scope for this a11y fix.
- Minor/cosmetic, not blocking: `label.replace(/s$/, '')` singularization mis-handles `-es`/`-ies`
  plurals and is now duplicated three times in `InputArray.tsx`; the empty-list sentinel input is a
  hand-rolled special case rather than a general `role="group"` mechanism; `getValidationSchema` is
  now exported with the same name from both `ToolForm.tsx` and `CustomNodeForm.tsx`.

## Coverage

Standards: commit-format partial · code-quality na · security pass
