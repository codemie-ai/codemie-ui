# Code review (check) — 2026-09-14-epmcdme-14856-datasource-type-dropdown-black-bg (2026-09-15)

**approve** · confidence: high · 0 blocking · 1 resolved · 0 unresolved · 0 superseded
Coverage: targeted verifier ✓ (1/1 blocking findings graded)

## Verification results

- **CR-001** resolved — `src/components/form/Autocomplete/ptPreset.ts:67` — selected-item token swapped
  from `bg-surface-interactive-active` (~1.09:1 against the panel) to
  `bg-surface-specific-dropdown-focused` (neutral 525, `#888888` dark, ~4.8:1 against panel `#212224`),
  the same token EPMCDME-8547 already proved for this exact dropdown-item contrast case in the sibling
  Dropdown/MultiSelect presets. `DataSourceTypeSelector.test.tsx` updated to assert the new class on
  both first open and reopen-after-blur.

No blocking findings remain — the diff speaks for itself.
