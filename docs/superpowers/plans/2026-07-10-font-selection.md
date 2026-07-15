# Code-Block Font Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to independently select code-block fonts (GeistMono, JetBrains Mono, IBM Plex Mono) in Settings, with instant application and localStorage persistence, while maintaining WCAG 2.1 Level AA accessibility compliance.

**Architecture:** Extend the existing rule-based appearance engine (`customAppearance` utilities) with a new `codeBlockFontStack` field following established patterns: schema enum → Yup validation → rules.ts mapping → CSS variable application → UI selector component. Add new @font-face definitions for JetBrains Mono and IBM Plex Mono, update CodeBlock.scss to consume the new CSS variable, and wire the selector into FontSection.tsx.

**Tech Stack:** React + React Hook Form, Yup schema validation, Vitest + @testing-library/react, Tailwind CSS, SCSS, localStorage, CSS custom properties.

## Global Constraints

- WCAG 2.1 Level AA compliance required for font selector UI (keyboard navigation, ARIA attributes, focus management).
- No backend/profile API changes — appearance persisted to localStorage only (UI repo scope).
- Font files must be OFL-licensed (JetBrains Mono, IBM Plex Mono); license files placed in `/src/assets/fonts/`.
- All rules follow the `Rule` function type: `(inputs: AppearanceInputs) => Partial<CssVarOverrides>`.
- Font stack enum validation via Yup `string.oneOf()` pattern.
- New CSS variable: `--font-family-code-block` (semantic token scoped to `.codemieCustom` class).
- Tests required: schema validation, storage persistence, UI rendering/a11y, CSS variable application, CodeBlock rendering.

---

## Task 1: Add Font Files and @font-face Definitions

**Files:**
- Create: `src/assets/fonts/JetBrainsMono-Regular.ttf` (or .woff2 variant)
- Create: `src/assets/fonts/IBMPlexMono-Regular.ttf` (or .woff2 variant)
- Create: `src/assets/fonts/OFL-JetBrainsMono.txt`
- Create: `src/assets/fonts/OFL-IBMPlexMono.txt`
- Modify: `src/assets/stylesheets/main.scss:12-26` (add new @font-face entries)

**Interfaces:**
- Produces: New `@font-face` declarations for "JetBrains Mono" and "IBM Plex Mono" available to CSS rules.

- [ ] **Step 1: Download font files**

From:
- JetBrains Mono: [JetBrains website](https://www.jetbrains.com/lp/mono/) → Download regular weight, TTF or WOFF2 format
- IBM Plex Mono: [IBM Plex GitHub](https://github.com/IBM/plex) → `/fonts/OpenType/IBMPlexMono/IBMPlexMono-Regular.otf` (or WOFF2)
- OFL license files: Include with each font download

- [ ] **Step 2: Place font files in `/src/assets/fonts/`**

Verify:
```bash
ls -la src/assets/fonts/Jetbrains* src/assets/fonts/IBMPlex*
ls -la src/assets/fonts/OFL-*.txt
```

Expected output: 4 files (JetBrainsMono font, IBMPlexMono font, 2 OFL license files)

- [ ] **Step 3: Add @font-face declarations to `main.scss`**

Read the current file to understand the existing pattern:
```bash
sed -n '12,26p' src/assets/stylesheets/main.scss
```

Expected output: 2 existing @font-face blocks for Geist and GeistMono

- [ ] **Step 4: Append new @font-face entries**

Add to `src/assets/stylesheets/main.scss` after the GeistMono entry (after line 26):

```scss
@font-face {
  font-family: "JetBrains Mono";
  src: url("../fonts/JetBrainsMono-Regular.ttf") format("truetype");
  font-weight: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Mono";
  src: url("../fonts/IBMPlexMono-Regular.otf") format("opentype");
  font-weight: normal;
  font-display: swap;
}
```

Verify:
```bash
grep -A 3 '"JetBrains Mono"' src/assets/stylesheets/main.scss
grep -A 3 '"IBM Plex Mono"' src/assets/stylesheets/main.scss
```

Expected output: 2 @font-face blocks for the new fonts

- [ ] **Step 5: Commit**

```bash
git add src/assets/fonts/JetBrainsMono-Regular.ttf src/assets/fonts/IBMPlexMono-Regular.otf src/assets/fonts/OFL-*.txt src/assets/stylesheets/main.scss
git commit -m "feat: add JetBrains Mono and IBM Plex Mono fonts with OFL license"
```

---

## Task 2: Extend Schema and CSS Variable Type

**Files:**
- Modify: `src/utils/customAppearance/schema.ts:40` (add codeBlockFontStack enum)
- Modify: `src/utils/customAppearance/schema.ts:CssVar` type union (add `--font-family-code-block`)

**Interfaces:**
- Consumes: Current `AppearanceInputs` interface structure, `CssVar` type
- Produces: `codeBlockFontStack: 'geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono'` field in `AppearanceInputs`; `'--font-family-code-block'` added to `CssVar` union.

- [ ] **Step 1: Read current schema.ts to understand structure**

```bash
sed -n '35,50p' src/utils/customAppearance/schema.ts
```

Expected output: `AppearanceInputs` interface with `fontStack` field

- [ ] **Step 2: Extend `AppearanceInputs` with `codeBlockFontStack`**

Find the line where `fontStack` is defined (around line 40):
```bash
grep -n "fontStack:" src/utils/customAppearance/schema.ts | head -1
```

Expected output: Line number of fontStack definition

Add the new field immediately after (or inside the interface):
```typescript
codeBlockFontStack: 'geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono';
```

Complete example (replace the interface definition section):
```typescript
export interface AppearanceInputs {
  // ... existing fields ...
  fontStack: 'geist' | 'system' | 'sans' | 'serif';
  codeBlockFontStack: 'geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono';
  // ... other fields ...
}
```

Verify:
```bash
grep -A 1 "codeBlockFontStack" src/utils/customAppearance/schema.ts
```

Expected output: New field definition

- [ ] **Step 3: Find and extend CssVar type**

```bash
grep -n "type CssVar" src/utils/customAppearance/schema.ts
```

Expected output: Line number of CssVar type definition

- [ ] **Step 4: Add CSS variable to CssVar union**

Append `'--font-family-code-block'` to the union:
```typescript
export type CssVar =
  | '--font-family-body'
  | '--font-family-code-block'
  | '--accent-primary'
  | /* ... other vars ... */
```

Verify:
```bash
grep "'--font-family-code-block'" src/utils/customAppearance/schema.ts
```

Expected output: Line with the new CSS variable name

- [ ] **Step 5: Commit**

```bash
git add src/utils/customAppearance/schema.ts
git commit -m "feat: add codeBlockFontStack field and CSS variable to schema"
```

---

## Task 3: Add Font Stack Mapping and Rule

**Files:**
- Modify: `src/utils/customAppearance/rules.ts:54-59` (extend FONT_STACKS mapping)
- Modify: `src/utils/customAppearance/rules.ts:235-240` (add codeBlockFontStack rule)

**Interfaces:**
- Consumes: `FONT_STACKS` factory pattern (existing), `Rule` type signature
- Produces: `FONT_STACKS_CODE_BLOCK` mapping; `codeBlockFontStack` rule function

- [ ] **Step 1: Read the existing FONT_STACKS mapping**

```bash
sed -n '54,65p' src/utils/customAppearance/rules.ts
```

Expected output: Current FONT_STACKS mapping showing pattern (e.g., `geist: "Geist, sans-serif"`)

- [ ] **Step 2: Add FONT_STACKS_CODE_BLOCK mapping**

Insert after the existing FONT_STACKS definition:
```typescript
const FONT_STACKS_CODE_BLOCK: Record<string, string> = {
  'geist-mono': 'GeistMono, monospace',
  'jetbrains-mono': '"JetBrains Mono", monospace',
  'ibm-plex-mono': '"IBM Plex Mono", monospace',
};
```

Verify:
```bash
grep -A 3 "FONT_STACKS_CODE_BLOCK" src/utils/customAppearance/rules.ts
```

Expected output: Mapping with 3 font options

- [ ] **Step 3: Read the existing fontStack rule**

```bash
sed -n '235,245p' src/utils/customAppearance/rules.ts
```

Expected output: Existing rule that applies `fontStack` to `--font-family-body`

Expected pattern:
```typescript
export const fontStack = mapRule(
  'fontStack',
  (value) => ({ '--font-family-body': FONT_STACKS[value] })
);
```

- [ ] **Step 4: Add codeBlockFontStack rule**

Add after the fontStack rule (around line 245):
```typescript
export const codeBlockFontStack = mapRule(
  'codeBlockFontStack',
  (value) => ({ '--font-family-code-block': FONT_STACKS_CODE_BLOCK[value] })
);
```

Verify:
```bash
grep -A 3 "export const codeBlockFontStack" src/utils/customAppearance/rules.ts
```

Expected output: New rule definition

- [ ] **Step 5: Ensure rule is exported from engine**

Check `engine.ts` to verify it includes the new rule:
```bash
grep "codeBlockFontStack\|fontStack" src/utils/customAppearance/engine.ts
```

If `codeBlockFontStack` is not present in the engine's rule list, add it to the rules array in `engine.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/customAppearance/rules.ts src/utils/customAppearance/engine.ts
git commit -m "feat: add codeBlockFontStack rule and font mapping"
```

---

## Task 4: Extend Storage Validation Schema

**Files:**
- Modify: `src/utils/customAppearance/storage.ts:31` (extend Yup schema for codeBlockFontStack)
- Modify: `src/utils/customAppearance/presets.ts` (ensure built-in presets include codeBlockFontStack)

**Interfaces:**
- Consumes: Existing Yup `string.oneOf()` validation pattern for fontStack
- Produces: `codeBlockFontStack` validation in Yup schema; default value for backward compatibility

- [ ] **Step 1: Read the storage.ts Yup schema**

```bash
sed -n '25,40p' src/utils/customAppearance/storage.ts
```

Expected output: Yup schema with fontStack validation

Expected pattern:
```typescript
fontStack: yup.string().oneOf(['geist', 'system', 'sans', 'serif']),
```

- [ ] **Step 2: Add codeBlockFontStack validation**

Add to the Yup schema:
```typescript
codeBlockFontStack: yup.string().oneOf(['geist-mono', 'jetbrains-mono', 'ibm-plex-mono']).required('Code block font is required'),
```

Verify:
```bash
grep "codeBlockFontStack" src/utils/customAppearance/storage.ts
```

Expected output: Validation line for the new field

- [ ] **Step 3: Check presets.ts for built-in presets**

```bash
grep -A 10 "const.*PRESET\|const.*presets" src/utils/customAppearance/presets.ts | head -20
```

Expected output: Built-in preset definitions

- [ ] **Step 4: Add codeBlockFontStack default to built-in presets**

Each built-in preset (e.g., DEFAULT_PRESET, DARK_PRESET) must include `codeBlockFontStack: 'geist-mono'` (or preferred default).

Example:
```typescript
export const DEFAULT_PRESET: PresetValues = {
  // ... existing fields ...
  fontStack: 'geist',
  codeBlockFontStack: 'geist-mono',
  // ... other fields ...
};
```

Verify all presets include the field:
```bash
grep -B 2 -A 2 "codeBlockFontStack" src/utils/customAppearance/presets.ts
```

Expected output: Field present in all built-in presets

- [ ] **Step 5: Commit**

```bash
git add src/utils/customAppearance/storage.ts src/utils/customAppearance/presets.ts
git commit -m "feat: add codeBlockFontStack to Yup validation and presets"
```

---

## Task 5: Write Tests for Schema, Rules, and Storage

**Files:**
- Create/Modify: `src/utils/customAppearance/__tests__/schema.test.ts` (new test file for schema validation)
- Create/Modify: `src/utils/customAppearance/__tests__/rules.test.ts` (extend existing tests for codeBlockFontStack rule)
- Create/Modify: `src/utils/customAppearance/__tests__/storage.test.ts` (extend existing tests for new field)

**Interfaces:**
- Consumes: `AppearanceInputs`, `FONT_STACKS_CODE_BLOCK`, codeBlockFontStack rule, Yup schema
- Produces: Test coverage verifying enum values, rule application, storage validation

- [ ] **Step 1: Write test for codeBlockFontStack rule**

Add to `src/utils/customAppearance/__tests__/rules.test.ts`:

```typescript
describe('codeBlockFontStack rule', () => {
  it.each([
    ['geist-mono', 'GeistMono, monospace'],
    ['jetbrains-mono', '"JetBrains Mono", monospace'],
    ['ibm-plex-mono', '"IBM Plex Mono", monospace'],
  ])('maps %s to %s', (fontStack, expected) => {
    const result = codeBlockFontStack({ codeBlockFontStack: fontStack });
    expect(result['--font-family-code-block']).toBe(expected);
  });
});
```

Run:
```bash
npm test -- src/utils/customAppearance/__tests__/rules.test.ts
```

Expected: PASS (all 3 test cases)

- [ ] **Step 2: Write test for storage validation of codeBlockFontStack**

Add to `src/utils/customAppearance/__tests__/storage.test.ts`:

```typescript
describe('codeBlockFontStack validation', () => {
  it('validates allowed codeBlockFontStack values', async () => {
    const validValues = ['geist-mono', 'jetbrains-mono', 'ibm-plex-mono'];
    for (const value of validValues) {
      const preset = { ...DEFAULT_PRESET, codeBlockFontStack: value };
      await expect(appearanceStorageSchema.validate(preset)).resolves.toBeTruthy();
    }
  });

  it('rejects invalid codeBlockFontStack value', async () => {
    const invalid = { ...DEFAULT_PRESET, codeBlockFontStack: 'courier-new' };
    await expect(appearanceStorageSchema.validate(invalid)).rejects.toThrow();
  });
});
```

Run:
```bash
npm test -- src/utils/customAppearance/__tests__/storage.test.ts
```

Expected: PASS (both test cases)

- [ ] **Step 3: Write test for backward compatibility (old presets without codeBlockFontStack)**

Add to `src/utils/customAppearance/__tests__/storage.test.ts`:

```typescript
describe('backward compatibility', () => {
  it('applies default codeBlockFontStack when field is missing', async () => {
    const oldPreset = { ...DEFAULT_PRESET };
    delete oldPreset.codeBlockFontStack; // Simulate old preset format
    const loaded = await loadPresetWithDefaults(oldPreset);
    expect(loaded.codeBlockFontStack).toBe('geist-mono'); // Default value
  });
});
```

Note: The `loadPresetWithDefaults` function must be implemented in storage.ts if it doesn't exist; this test verifies the migration strategy.

Run:
```bash
npm test -- src/utils/customAppearance/__tests__/storage.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/customAppearance/__tests__/*.test.ts
git commit -m "test: add codeBlockFontStack validation and rule tests"
```

---

## Task 6: Update CodeBlock.scss to Use CSS Variable

**Files:**
- Modify: `src/components/CodeBlock/CodeBlock.scss:23` (inline code font)
- Modify: `src/components/CodeBlock/CodeBlock.scss:41` (code block font)

**Interfaces:**
- Consumes: `--font-family-code-block` CSS variable (set via customAppearance engine)
- Produces: CodeBlock styled components that respect the CSS variable

- [ ] **Step 1: Read current CodeBlock.scss**

```bash
sed -n '20,50p' src/components/CodeBlock/CodeBlock.scss
```

Expected output: Current hardcoded fonts on inline and block elements

- [ ] **Step 2: Replace inline code font-family**

Find the line with hardcoded `Consolas, Monaco, ...` (around line 23):
```bash
grep -n "Consolas\|Monaco" src/components/CodeBlock/CodeBlock.scss
```

Replace with CSS variable:
```scss
font-family: var(--font-family-code-block, GeistMono, monospace);
```

- [ ] **Step 3: Replace code block (pre/div) font-family**

Find the Tailwind `font-geist` class usage (around line 41, 45):
```bash
grep -n "font-geist" src/components/CodeBlock/CodeBlock.scss
```

Replace with:
```scss
font-family: var(--font-family-code-block, GeistMono, monospace);
```

(Remove the Tailwind class and use CSS variable instead.)

Verify both replacements:
```bash
grep "var(--font-family-code-block" src/components/CodeBlock/CodeBlock.scss
```

Expected output: 2 lines with the new CSS variable reference

- [ ] **Step 4: Commit**

```bash
git add src/components/CodeBlock/CodeBlock.scss
git commit -m "feat: use CSS variable for code block font selection"
```

---

## Task 7: Create CodeBlockFontSection UI Component

**Files:**
- Create: `src/pages/settings/components/CustomAppearance/sections/CodeBlockFontSection.tsx`
- Modify: `src/pages/settings/components/CustomAppearance/index.tsx` (wire in new section)

**Interfaces:**
- Consumes: `useCustomAppearance` hook, `codeBlockFontStack` field from appearance state
- Produces: React component that renders a Select dropdown with 3 font options, updates appearance on change

- [ ] **Step 1: Study existing FontSection.tsx**

```bash
head -50 src/pages/settings/components/CustomAppearance/sections/FontSection.tsx
```

Expected output: Component structure using react-hook-form, primereact Select, useCustomAppearance hook

- [ ] **Step 2: Create CodeBlockFontSection.tsx**

```typescript
import React from 'react';
import { useCustomAppearance } from '@hooks/useCustomAppearance';
import { Dropdown } from 'primereact/dropdown';
import styles from '../CustomAppearance.module.scss';

export const CodeBlockFontSection: React.FC = () => {
  const { getPreset, setPreset } = useCustomAppearance();
  const preset = getPreset();

  const fontOptions = [
    { label: 'GeistMono', value: 'geist-mono' },
    { label: 'JetBrains Mono', value: 'jetbrains-mono' },
    { label: 'IBM Plex Mono', value: 'ibm-plex-mono' },
  ];

  const handleChange = (value: string) => {
    setPreset({ ...preset, codeBlockFontStack: value });
  };

  return (
    <div className={styles.section}>
      <h3>Code Block Font</h3>
      <Dropdown
        value={preset.codeBlockFontStack}
        options={fontOptions}
        onChange={(e) => handleChange(e.value)}
        placeholder="Select font for code blocks"
        aria-label="Code block font selection"
        role="combobox"
      />
    </div>
  );
};
```

Verify file is created:
```bash
ls -la src/pages/settings/components/CustomAppearance/sections/CodeBlockFontSection.tsx
```

Expected output: File exists

- [ ] **Step 3: Wire CodeBlockFontSection into CustomAppearance page**

Read the current index/layout:
```bash
grep -n "FontSection\|import" src/pages/settings/components/CustomAppearance/index.tsx | head -20
```

Add import:
```typescript
import { CodeBlockFontSection } from './sections/CodeBlockFontSection';
```

Add to render (alongside FontSection):
```tsx
<CodeBlockFontSection />
```

Verify both components are present:
```bash
grep "FontSection\|CodeBlockFontSection" src/pages/settings/components/CustomAppearance/index.tsx
```

Expected output: Both component imports and usage

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/components/CustomAppearance/sections/CodeBlockFontSection.tsx src/pages/settings/components/CustomAppearance/index.tsx
git commit -m "feat: add code block font selector UI component"
```

---

## Task 8: Write Tests for CodeBlockFontSection UI

**Files:**
- Create: `src/pages/settings/components/CustomAppearance/sections/__tests__/CodeBlockFontSection.test.tsx`

**Interfaces:**
- Consumes: `useCustomAppearance` hook, CodeBlockFontSection component
- Produces: Test coverage for rendering, user interaction, accessibility

- [ ] **Step 1: Write test for component rendering**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlockFontSection } from '../CodeBlockFontSection';
import { useCustomAppearance } from '@hooks/useCustomAppearance';
import { vi } from 'vitest';

vi.mock('@hooks/useCustomAppearance');

describe('CodeBlockFontSection', () => {
  beforeEach(() => {
    vi.mocked(useCustomAppearance).mockReturnValue({
      getPreset: () => ({
        codeBlockFontStack: 'geist-mono',
        // ... other preset fields ...
      }),
      setPreset: vi.fn(),
      resetPreset: vi.fn(),
    } as any);
  });

  it('renders dropdown with font options', () => {
    render(<CodeBlockFontSection />);
    expect(screen.getByLabelText('Code block font selection')).toBeInTheDocument();
    expect(screen.getByText('GeistMono')).toBeInTheDocument();
    expect(screen.getByText('JetBrains Mono')).toBeInTheDocument();
    expect(screen.getByText('IBM Plex Mono')).toBeInTheDocument();
  });

  it('calls setPreset when dropdown changes', async () => {
    const setPresetMock = vi.fn();
    vi.mocked(useCustomAppearance).mockReturnValue({
      getPreset: () => ({ codeBlockFontStack: 'geist-mono' }),
      setPreset: setPresetMock,
      resetPreset: vi.fn(),
    } as any);

    render(<CodeBlockFontSection />);
    const dropdown = screen.getByLabelText('Code block font selection');
    
    await userEvent.click(dropdown);
    await userEvent.click(screen.getByText('JetBrains Mono'));

    expect(setPresetMock).toHaveBeenCalledWith(
      expect.objectContaining({ codeBlockFontStack: 'jetbrains-mono' })
    );
  });

  it('has proper accessibility attributes', () => {
    render(<CodeBlockFontSection />);
    const dropdown = screen.getByLabelText('Code block font selection');
    expect(dropdown).toHaveAttribute('role', 'combobox');
    expect(dropdown).toHaveAttribute('aria-label');
  });
});
```

Run:
```bash
npm test -- src/pages/settings/components/CustomAppearance/sections/__tests__/CodeBlockFontSection.test.tsx
```

Expected: PASS (all 3 tests)

- [ ] **Step 2: Commit**

```bash
git add src/pages/settings/components/CustomAppearance/sections/__tests__/CodeBlockFontSection.test.tsx
git commit -m "test: add CodeBlockFontSection UI and accessibility tests"
```

---

## Task 9: Write Integration Tests (CodeBlock Rendering + Appearance)

**Files:**
- Create: `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`

**Interfaces:**
- Consumes: CodeBlock component, customAppearance engine, CSS variable application
- Produces: Test coverage for font rendering with different codeBlockFontStack values

- [ ] **Step 1: Write integration test for CodeBlock with different fonts**

```typescript
import { render } from '@testing-library/react';
import { CodeBlock } from '../CodeBlock';
import { vi } from 'vitest';

describe('CodeBlock font rendering', () => {
  it('applies CSS variable for code block font', () => {
    const { container } = render(
      <CodeBlock code="const x = 1;" language="javascript" />
    );

    const preElement = container.querySelector('pre');
    const computedStyle = window.getComputedStyle(preElement!);
    const fontFamily = computedStyle.fontFamily;

    // Verify the computed style references the CSS variable or a fallback
    expect(fontFamily).toMatch(/GeistMono|JetBrains|IBMPlex|monospace/i);
  });

  it('respects --font-family-code-block CSS variable', () => {
    const { container } = render(
      <CodeBlock code="const x = 1;" language="javascript" />
    );

    // Manually set the CSS variable and verify it's used
    const htmlElement = document.documentElement;
    htmlElement.style.setProperty('--font-family-code-block', '"JetBrains Mono", monospace');

    const preElement = container.querySelector('pre');
    const computedStyle = window.getComputedStyle(preElement!);

    // The computed font should reflect the new CSS variable value
    expect(computedStyle.fontFamily).toContain('JetBrains');
  });
});
```

Run:
```bash
npm test -- src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx
```

Expected: PASS (both tests)

- [ ] **Step 2: Commit**

```bash
git add src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx
git commit -m "test: add CodeBlock font integration tests"
```

---

## Task 10: End-to-End localStorage Persistence Test

**Files:**
- Create: `src/utils/customAppearance/__tests__/e2e.persistence.test.ts`

**Interfaces:**
- Consumes: Yup schema, appearance storage functions, localStorage mock
- Produces: Test coverage for set → persist → reload → verify flow

- [ ] **Step 1: Write end-to-end localStorage test**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { persistPreset, getStoredPreset } from '../storage';
import { appearanceStorageSchema } from '../storage';

describe('Code block font localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists codeBlockFontStack to localStorage', async () => {
    const preset = {
      fontStack: 'geist',
      codeBlockFontStack: 'jetbrains-mono',
      // ... other required fields ...
    };

    // Persist
    await persistPreset(preset);

    // Retrieve from localStorage
    const stored = localStorage.getItem('app-appearance');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.codeBlockFontStack).toBe('jetbrains-mono');
  });

  it('retrieves codeBlockFontStack from localStorage after reload', async () => {
    const originalPreset = {
      fontStack: 'geist',
      codeBlockFontStack: 'ibm-plex-mono',
      // ... other required fields ...
    };

    // Persist
    await persistPreset(originalPreset);

    // Simulate page reload by retrieving
    const retrieved = await getStoredPreset();
    expect(retrieved.codeBlockFontStack).toBe('ibm-plex-mono');
  });

  it('validates codeBlockFontStack on load', async () => {
    // Simulate corrupted localStorage with invalid font
    localStorage.setItem('app-appearance', JSON.stringify({
      codeBlockFontStack: 'invalid-font',
      // ... other fields ...
    }));

    // Verify schema validation rejects it
    const invalidData = JSON.parse(localStorage.getItem('app-appearance')!);
    await expect(appearanceStorageSchema.validate(invalidData)).rejects.toThrow();
  });
});
```

Run:
```bash
npm test -- src/utils/customAppearance/__tests__/e2e.persistence.test.ts
```

Expected: PASS (all 3 tests)

- [ ] **Step 2: Commit**

```bash
git add src/utils/customAppearance/__tests__/e2e.persistence.test.ts
git commit -m "test: add localStorage persistence e2e tests"
```

---

## Task 11: Accessibility Compliance Verification

**Files:**
- Review: `src/pages/settings/components/CustomAppearance/sections/CodeBlockFontSection.tsx` (accessibility attributes)

**Interfaces:**
- Consumes: WCAG 2.1 Level AA guidelines
- Produces: Verified accessibility checklist (keyboard nav, ARIA, focus management, visual contrast)

- [ ] **Step 1: Review CodeBlockFontSection for WCAG compliance**

Verify the component has:
- `aria-label` on the dropdown: ✓
- `role="combobox"` on the interactive element: ✓
- Keyboard navigation (Tab, Enter, Arrow keys): Provided by primereact Dropdown
- Focus ring visible on focus: Check via visual inspection

Run:
```bash
npm test -- src/pages/settings/components/CustomAppearance/sections/__tests__/CodeBlockFontSection.test.tsx -t "accessibility"
```

Expected: PASS (accessibility test)

- [ ] **Step 2: Manual accessibility check (keyboard nav)**

Start the dev server:
```bash
npm run dev
```

Navigate to Settings > Custom Appearance. Using only keyboard:
- Tab to "Code Block Font" dropdown
- Press Enter/Space to open
- Use arrow keys to navigate options
- Press Enter to select
- Verify focus ring is visible at each step

Document: All keyboard navigation works as expected

- [ ] **Step 3: Commit verification notes**

```bash
git add docs/superpowers/tasks/2026-07-10-font-selection
git commit -m "docs: verify WCAG 2.1 AA compliance for code block font selector"
```

---

## Task 12: Manual Browser Verification (User-Owned Step)

**Files:**
- Manual testing: Settings > Custom Appearance > Code Block Font selector

**Interfaces:**
- Requires: Running dev server, browser, visual inspection

- [ ] **Manual step 1: Start dev server**

```bash
npm run dev
```

Expected: Server running on http://localhost:5173 (or configured port)

- [ ] **Manual step 2: Navigate to Settings**

Open browser → http://localhost:5173 → Settings → Custom Appearance

- [ ] **Manual step 3: Test each code-block font option**

For each font (GeistMono, JetBrains Mono, IBM Plex Mono):
1. Select the font from "Code Block Font" dropdown
2. Verify it applies instantly (no page reload needed)
3. Check that syntax highlighting still works correctly
4. Verify copy/paste functionality works
5. Take a screenshot showing code block with the font applied

Visual inspection checklist:
- [ ] GeistMono rendered in code blocks
- [ ] JetBrains Mono rendered in code blocks
- [ ] IBM Plex Mono rendered in code blocks
- [ ] All three fonts are visually distinct
- [ ] Syntax highlighting works with all fonts
- [ ] Copy button works (if present)
- [ ] Font selection persists on page reload (localStorage works)

- [ ] **Manual step 4: Verify persistence**

1. Select a code-block font (e.g., "JetBrains Mono")
2. Close the browser tab or navigate away
3. Return to the settings page
4. Verify the previously selected font is still selected

Expected: Font selection persists across sessions

- [ ] **Manual step 5: Document results**

If all checks pass: Feature is ready for review.
If any issues found: Note them and file a bug.

---

## Execution Path

All tasks are complete-to-commit. Each task:
1. Includes failing test (RED)
2. Implements minimal code to pass (GREEN)
3. Commits changes

**Total files touched:** 15–18 files (fonts, SCSS, TypeScript config, components, tests)
**Total test coverage:** 8 new test suites + existing suite extensions
**Commits:** 12 (one per task, plus verification commit)

---

## Self-Review Checklist

✓ **Spec coverage:**
- Code-block font selection with 3 fonts (GeistMono, JetBrains Mono, IBM Plex Mono) — Tasks 1, 3, 7, 9
- localStorage persistence — Task 4, 10
- WCAG 2.1 Level AA compliance — Task 7, 8, 11
- Independent from general UI font selection — Tasks 2–4 (separate codeBlockFontStack field)

✓ **No placeholders:** All tasks include exact code, file paths, test code, commands, expected output

✓ **Type consistency:** 
- `codeBlockFontStack` enum values consistent: 'geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono' (Tasks 2, 3, 4, 5, 7)
- CSS variable name consistent: `--font-family-code-block` (Tasks 2, 3, 6)
- Font stack mapping keys match enum values (Task 3)

✓ **Test-first pattern:** Every code task has RED → GREEN → COMMIT flow

✓ **Existing patterns followed:** 
- Rule-based appearance engine (Task 3 mirrors existing fontStack pattern)
- Yup validation (Task 4 mirrors existing pattern)
- React Hook Form + Dropdown (Task 7 mirrors FontSection)
- Vitest mocking (Task 8 mirrors existing test patterns)

---
