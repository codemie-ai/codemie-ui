# EPMCDME-13249 — Fix in-progress color contrast under custom theme

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix unreadable text in in-progress badges under custom themes by replacing the flat `mapRule` mapping with an OKLCH-derived three-tier color family.

**Architecture:** Remove `--colors-in-progress-primary/secondary/tertiary` from the `mapRule('accentColor', [...])` array in `rules.ts` and add a single §2-style derive rule that generates distinct RGB channel values for each tier. `primary` gets the raw accent; `secondary` and `tertiary` get OKLCH lightness-shifted variants. All badge consumers are fixed automatically — no component changes needed.

**Tech Stack:** TypeScript, Vitest (unit), `culori` (OKLCH color math via `deriveAlternateOklchLightness` / `hexToRgbValue` already imported in `rules.ts`)

---

## File Map

| File | Action |
|---|---|
| `src/utils/customAppearance/rules.ts` | Modify — remove 3 vars from `mapRule`, add 4 constants, add 1 derive rule |
| `src/utils/customAppearance/__tests__/rules.test.ts` | Modify — add `describe('derive.inProgressGroup', ...)` block |

---

### Task 1: Fix in-progress color derive

**Test-first: yes — `--colors-in-progress-tertiary` equals `--colors-in-progress-primary` before the fix (RED), and differs after it (GREEN)**

**Files:**
- Modify: `src/utils/customAppearance/__tests__/rules.test.ts`
- Modify: `src/utils/customAppearance/rules.ts`

---

- [ ] **Step 1: Write the failing tests**

Open `src/utils/customAppearance/__tests__/rules.test.ts`. After the last `describe` block (after line 128, before the closing `}`), add:

```ts
  describe('derive.inProgressGroup', () => {
    it('generates distinct values for primary, secondary, and tertiary', () => {
      const result = runRules(inputs({ accentColor: '#52519A' }))
      const primary = result['--colors-in-progress-primary']
      const secondary = result['--colors-in-progress-secondary']
      const tertiary = result['--colors-in-progress-tertiary']

      expect(primary).not.toBe(secondary)
      expect(primary).not.toBe(tertiary)
      expect(secondary).not.toBe(tertiary)
    })

    it.each([
      ['#525252'],  // Clean White — dark gray, L≈0.44
      ['#A3A3A3'],  // Clean Black — light gray, L≈0.68
      ['#B4637A'],  // Rosé Pine Dawn — rose, L≈0.55
      ['#2D6A4F'],  // Sage Forest — dark green, L≈0.42
      ['#BD93F9'],  // Dracula — light lavender, L≈0.75
      ['#006494'],  // Navy Gold — dark blue, L≈0.41
      ['#0F069F'],  // ASML — very dark blue, L≈0.23
      ['#52519A'],  // ING — dark purple, L≈0.39
      ['#02ADE6'],  // Albert Heijn — sky blue, L≈0.67
    ])('tertiary differs from primary for accent %s', (hex) => {
      const result = runRules(inputs({ accentColor: hex }))
      expect(result['--colors-in-progress-tertiary']).not.toBe(result['--colors-in-progress-primary'])
    })
  })
```

The full closing structure of `rules.test.ts` after the addition should be:
```ts
  // ... existing describe blocks ...
  describe('derive.inProgressGroup', () => {
    // new tests above
  })
}) // closes top-level describe('rules', ...)
```

---

- [ ] **Step 2: Run the tests — confirm RED**

```bash
npx vitest run src/utils/customAppearance/__tests__/rules.test.ts
```

Expected: the two new `derive.inProgressGroup` tests **fail**. The `it.each` cases will show failures because `tertiary === primary` (both are the raw accent RGB from `mapRule`). The existing tests should still pass.

---

- [ ] **Step 3: Add OKLCH constants to `rules.ts`**

Open `src/utils/customAppearance/rules.ts`. After line 44 (`const ACTION_BTN_HOVER_L_AMOUNT = 0.05`), add:

```ts
const IN_PROGRESS_BORDER_L_THRESHOLD = 0.5
const IN_PROGRESS_BORDER_L_AMOUNT = 0.15
const IN_PROGRESS_BG_L_THRESHOLD = 0.5
const IN_PROGRESS_BG_L_AMOUNT = 0.45
```

---

- [ ] **Step 4: Remove in-progress vars from the `accentColor` mapRule**

In `src/utils/customAppearance/rules.ts`, find the `mapRule('accentColor', [...])` call (lines 71–83). Remove these three entries from the array:

```ts
    '--colors-in-progress-primary',
    '--colors-in-progress-secondary',
    '--colors-in-progress-tertiary',
```

After removal, the array should be:

```ts
  mapRule('accentColor', [
    '--colors-border-accent',
    '--colors-border-tertiary',
    '--colors-border-quaternary',
    '--colors-border-specific-button-secondary-hover',
    '--colors-icon-accent',
    '--colors-text-accent',
    '--colors-text-accent-status',
    '--colors-text-heading',
  ]),
```

---

- [ ] **Step 5: Add the in-progress derive rule in §2**

In `src/utils/customAppearance/rules.ts`, find the end of §2 — the last `}` of the `navigationFadeText` rule block (around line 196). **After** that closing `},`, add the new rule:

```ts
  {
    apply: (inputs) => ({
      '--colors-in-progress-primary': hexToRgbValue(inputs.accentColor),
      '--colors-in-progress-secondary': hexToRgbValue(
        deriveAlternateOklchLightness(inputs.accentColor, IN_PROGRESS_BORDER_L_THRESHOLD, IN_PROGRESS_BORDER_L_AMOUNT)
      ),
      '--colors-in-progress-tertiary': hexToRgbValue(
        deriveAlternateOklchLightness(inputs.accentColor, IN_PROGRESS_BG_L_THRESHOLD, IN_PROGRESS_BG_L_AMOUNT)
      ),
    }),
  },
```

The comment structure around it should look like:

```ts
  // §2 — Derive rules (OKLCH lightness shift)
  {
    apply: (inputs) => { ... },  // accent hover
  },
  { ... },  // primary button hover
  { ... },  // secondary button hover
  {
    apply: (inputs) => { ... },  // navigationFadeText
  },
  {
    apply: (inputs) => ({        // ← new in-progress derive rule
      '--colors-in-progress-primary': hexToRgbValue(inputs.accentColor),
      '--colors-in-progress-secondary': hexToRgbValue(
        deriveAlternateOklchLightness(inputs.accentColor, IN_PROGRESS_BORDER_L_THRESHOLD, IN_PROGRESS_BORDER_L_AMOUNT)
      ),
      '--colors-in-progress-tertiary': hexToRgbValue(
        deriveAlternateOklchLightness(inputs.accentColor, IN_PROGRESS_BG_L_THRESHOLD, IN_PROGRESS_BG_L_AMOUNT)
      ),
    }),
  },

  // §3 — Opacity-blend rules
```

---

- [ ] **Step 6: Run the tests — confirm GREEN**

```bash
npx vitest run src/utils/customAppearance/__tests__/rules.test.ts
```

Expected: **all tests pass**, including the new `derive.inProgressGroup` block. Verify that the existing `map rules emit RGB channel strings` tests still pass (the `--colors-text-accent` assertion is unaffected because that var remains in the `mapRule`).

---

- [ ] **Step 7: Run full quality gate**

```bash
npm run lint && npm run typecheck && npm run test:unit
```

Expected: all three pass with no errors.

---

- [ ] **Step 8: Commit**

```bash
git add src/utils/customAppearance/rules.ts \
        src/utils/customAppearance/__tests__/rules.test.ts
git commit -m "EPMCDME-13249: Fix in-progress color contrast under custom theme presets"
```
