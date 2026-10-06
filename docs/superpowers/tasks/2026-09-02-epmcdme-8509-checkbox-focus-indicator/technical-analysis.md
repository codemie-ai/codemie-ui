# Technical Analysis — EPMCDME-8509 Checkbox Focus Indicator

## Codebase Findings

### Root cause — Checkbox

`src/styles/presets/lara/checkbox/index.ts` line 66, inside the `box` States block:

```
'peer-focus-visible:ring-2 peer-focus-visible:ring-border-subtle/20': !props.disabled,
```

`border-subtle` resolves to `c['neutral']['700']` / `c['neutral']['475']` (tailwind.config.ts:318) — a mid-grey. At `/20` opacity the ring is ~4% opaque, far below the 3:1 contrast threshold.

The fix is local: change the colour token only. Keep `peer-focus-visible:ring-2` and the `!props.disabled` guard.

Target token: `ring-border-accent` (tailwind.config.ts:313: white in dark, #007AFF in light). Confirmed real and theme-aware. Precedent: EPMCDME-14283, commit f4a459f15.

### Root cause — RadioButton

`src/components/form/RadioButton/RadioButton.tsx` — the `customPT` object has:

- `input.className`: no `peer` class → peer-* variants on `box` are inert
- `box.className`: no focus-visible ring rule at all
- hover is via `group-hover:` (parent label has `group`), not via peer — this is correct and unchanged

DOM order (PrimeReact standard + confirmed by the Checkbox preset which uses the same pattern): `input` renders before `box` inside `root`. Adding `peer` to `input` and `peer-focus-visible:ring-2 peer-focus-visible:ring-border-accent` to `box` will work. The `has-[:focus-visible]` fallback is available (Tailwind 3.4.17) if DOM order ever changes, but is not needed now.

### Affected call sites (no changes needed)

All Checkbox call sites inherit from the preset:
- `src/components/UserFilter/UserFilter.tsx:86`
- `src/pages/analytics/components/AnalyticsUserFilter.tsx:184`
- `src/pages/assistants/components/AssistantForm/components/FormGenAIPopup.tsx:152`
- `src/pages/skills/components/FormGenAIPopup.tsx:145`

RadioButton call sites inherit from the component:
- `src/pages/assistants/components/AssistantFilters.tsx:163` via Filters.tsx → RadioGroup → RadioButton

No call-site edits needed.

### Token not to use

`ring-primary-500` — not present in tailwind.config.ts border section. Falls back to Tailwind default (semi-transparent blue, unverified contrast). Used in NavigationMore.tsx:131/168 — those are known defects. Do not propagate.

## Risk Indicators

1. Two files, two isolated changes — narrow blast radius.
2. Checkbox preset is shared across all Checkbox instances; colour change is visually additive (a visible ring where none was before).
3. RadioButton.tsx customPT: adding `peer` to input + ring to box is additive. No existing hover/selected logic is touched.
4. `jsdom` cannot compute Tailwind classes; tests can verify focus-receive behaviour but not computed contrast.
