# Technical Research

**Task**: ui fonts code-block customization appearance settings
**Generated**: 2026-07-10
**Research path**: filesystem fallback (codegraph unavailable)

---

## 1. Original Context

Add code-block font selection with JetBrains Mono and IBM Plex Mono options alongside GeistMono; persist to localStorage; maintain WCAG 2.1 Level AA accessibility. General UI font selection already implemented at FontSection.tsx. Schema at customAppearance/schema.ts:40, rules at rules.ts:54-59,236-239. Code block currently hardcoded in CodeBlock.scss.

---

## 2. Codebase Findings

### Existing Implementations

**Appearance Configuration Engine:**
- `/src/utils/customAppearance/schema.ts` — AppearanceInputs interface defining all appearance fields including `fontStack: 'geist' | 'system' | 'sans' | 'serif'` (line 40); CssVar union type enumerating all CSS variable names
- `/src/utils/customAppearance/rules.ts` — Rule factory functions and FONT_STACKS mapping (lines 54–59) mapping fontStack enum values to CSS font-family strings; fontStack rule application (lines 236–240) setting `--font-family-body` CSS variable
- `/src/utils/customAppearance/storage.ts` — Yup schema validation (line 31) for fontStack field as string.oneOf(['geist', 'system', 'sans', 'serif']); localStorage persistence via APPEARANCE_KEY ('app-appearance')
- `/src/utils/customAppearance/apply.ts` — CSS variable application to DOM: setProperty/getPropertyValue for CSS custom properties on document.documentElement; clearOverrides() and applyOverrides() patterns
- `/src/utils/customAppearance/presets.ts` — Built-in presets (all include fontStack property); preset inheritance pattern
- `/src/utils/customAppearance/engine.ts` — Rule engine combining rule outputs into single CSS variable map

**State Management & Persistence:**
- `/src/utils/themeService.ts` — Singleton managing theme presets, localStorage sync, CSS variable application to html element
- `/src/hooks/useCustomAppearance.ts` — React hook wrapping themeService; provides getPreset(), setPreset(), resetPreset() API
- `useCustomAppearance` uses vi.hoisted() mocking pattern in tests (allows preset service mocking)

**UI Components:**
- `/src/pages/settings/components/CustomAppearance/sections/FontSection.tsx` — Existing font selector UI component with 4 options (Geist, System, Sans, Serif); uses react-hook-form Select component from primereact; onChange callback updates appearance via useCustomAppearance hook
- `/src/pages/settings/components/CustomAppearance/` — Settings page structure with sections (BasicSettings, AdvancedSettings, FontSection)

**Code Block Styling:**
- `/src/components/CodeBlock/CodeBlock.scss` — Hardcoded font-family (line 23): `Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace`; font-geist Tailwind class on pre elements (lines 41, 45); no CSS variable binding currently
- `/src/components/CodeBlock/CodeBlock.tsx` — Component wrapping code rendering; currently uses CodeBlock.scss styles

**CSS Variables & Fonts:**
- `/src/assets/stylesheets/_codemie-custom.scss` — Applies `--font-family-body` CSS variable to body element (line 6); falls back to "GeistMono" when custom appearance is inactive (.codemieCustom class scope)
- `/src/assets/stylesheets/main.scss` — @font-face definitions for "Geist" and "GeistMono" only (lines 12–26); variable fonts (weights 100–900); files: GeistMono-VariableFont_wght.ttf, Geist-VariableFont_wght.ttf
- `tailwind.config.ts` — Font family definitions (lines 516–519): `fontFamily: { geist: ['Geist', ...], 'geist-mono': ['GeistMono', 'monospace'] }`

### Architecture and Layers Affected

1. **UI Layer** — FontSection.tsx and new CodeBlockFontSection.tsx (form inputs, Select components, onChange callbacks)
2. **State Management Layer** — useCustomAppearance hook (reads/writes codeBlockFontStack field)
3. **Business Logic Layer** — rules.ts (codeBlockFontStack rule generating CSS var), engine.ts (combines rules), storage.ts (Yup validation)
4. **Data Persistence Layer** — localStorage via APPEARANCE_KEY; Yup schema validation for serialization/deserialization
5. **Style Application Layer** — apply.ts (CSS variable setProperty/getPropertyValue), _codemie-custom.scss (applies CSS vars to DOM elements)
6. **Font Resource Layer** — main.scss (@font-face declarations), tailwind.config.ts (font family definitions)

### Integration Points

**Internal Module Dependencies:**
- `FontSection.tsx` → `useCustomAppearance` hook → `themeService` singleton → `customAppearance` utilities (rules.ts, apply.ts, storage.ts)
- `themeService` → `rules.ts` (applies all rules to appearance inputs) → `colorUtils.ts` (WCAG contrast calculations)
- `storage.ts` → Yup schema validation, `localStorage` browser API
- `apply.ts` → document.documentElement.style (CSS variable setter)
- `CustomAppearance settings page` → multiple section components (BasicSettings, AdvancedSettings, FontSection)

**External Package Dependencies:**
- `react`, `react-dom` — UI framework; hooks (useState, useContext)
- `react-hook-form` — Form state management
- `primereact` — Dropdown/Select component (used in FontSection)
- `yup` — Schema validation for localStorage data
- `culori` — Color space conversion (OKLCH) for WCAG contrast calculations
- `tailwindcss` — Utility CSS framework; fontFamily plugin
- `tailwindcss-themer` — Theme plugin for semantic tokens

**Code Block Font Rendering:**
- CodeBlock.tsx currently hardcoded; will need to read `--font-family-code-block` CSS variable
- No current dynamic binding between appearance rules and CodeBlock styles

### Patterns and Conventions

**Rule-Based Appearance System:**
- All appearance changes flow through `Rule` function type: `(inputs: AppearanceInputs) => Partial<CssVarOverrides>`
- `mapRule` factory for 1-to-many simple field mappings (FONT_STACKS pattern at lines 54–59)
- `derive` rules (documented in rules.ts §2) for OKLCH lightness-shifted color variants with threshold constants (e.g., `ACCENT_HOVER_L_THRESHOLD = 0.5`)
- All rules implement idempotent CSS variable generation

**Storage & Persistence:**
- localStorage key: `APPEARANCE_KEY` ('app-appearance')
- Persisted format: JSON serialization of PresetValues
- Yup schema validation: string.oneOf(['allowed', 'values']) for enums
- Preset inheritance pattern: UserPreset extends BuiltinPreset

**CSS Variable Conventions:**
- Semantic tokens only; no raw palette values in components
- Variables scoped to .codemieCustom class on html element
- Format: `--<aspect>-<property>` (e.g., `--font-family-body`, `--accent-primary-light`)
- Fallback values specified in SCSS (e.g., "GeistMono" fallback in _codemie-custom.scss)

**Component Patterns:**
- 300-line hard limit on component files; logic extracted to custom hooks (use<Name>.ts) or sub-components
- Form inputs via react-hook-form + primereact Select component
- Accessibility: ARIA attributes on interactive elements (role, aria-label, aria-selected documented in accessibility-patterns.md)

**Font Family Specification:**
- Tailwind: `fontFamily: { name: [fontList] }` array format with fallback chain
- CSS: `font-family: "FontName", fallback, generic` string format (multiple fonts, quoted names)
- @font-face: Variable fonts (weights 100–900) preferred; font-display: swap for performance

### Testing Landscape

**Existing Coverage:**
- `/src/utils/customAppearance/__tests__/rules.test.ts` — Rules engine; tests fontStack mapping (lines 101–109) with it.each() parameterized tests; covers all current font stack values
- `/src/utils/customAppearance/__tests__/storage.test.ts` — localStorage persistence; tests persistPreset(), getStoredPreset(), validation; uses localStorage.clear/setItem/getItem patterns
- `/src/utils/customAppearance/__tests__/apply.test.ts` — CSS variable application; tests el.style.setProperty/getPropertyValue; invariant checks across presets
- `/src/hooks/__tests__/useCustomAppearance.test.tsx` — Hook tests; mocks themeService with vi.hoisted(); tests preset selection, sync, delegation
- `/src/utils/__tests__/themeService.test.ts` — Theme service lifecycle; tests localStorage sync, preset resolution, html().classList and style.getPropertyValue()

**Testing Framework & Patterns:**
- Framework: Vitest with jsdom environment, globals enabled
- Test libraries: @testing-library/react (render, renderHook, act, screen, userEvent)
- Mocking: Service mocking with vi.hoisted() + vi.mock(); localStorage mock in setupTests.tsx (lines 57–72)
- CSS testing: Direct DOM style manipulation (setProperty/getPropertyValue); assertions on document.documentElement
- Parameterized tests: it.each() with [input, expected] arrays

**Coverage Gaps for Code-Block Font Feature:**
- No UI component tests for FontSection.tsx (rendering, form inputs, callbacks, accessibility)
- No CodeBlock.tsx component tests (CSS variable application, font family rendering)
- No code-block-specific font selector UI tests
- No localStorage round-trip tests (set → persist → reload → verify)
- No WCAG 2.1 Level AA accessibility tests for font selection dropdown (role, aria-label, aria-selected, keyboard navigation)
- No schema validation tests for new codeBlockFontStack field
- No end-to-end tests (settings UI → appearance service → DOM CSS vars → styled code blocks)

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/theme-management.md` — Comprehensive theme architecture guide covering token system (`[darkValue, lightValue]` pairs), semantic tokens vs. raw palette values. **Directly applicable to code-block font choices.**
- `.ai-run/guides/styling/styling-guide.md` — Mandatory Tailwind CSS only, semantic theme tokens only, predefined spacing scale. **Critical for maintaining consistency.**
- `.ai-run/guides/patterns/accessibility-patterns.md` — WCAG 2.1 Level AA compliance requirements: keyboard accessibility, focus rings, ARIA attributes, 4.5:1 contrast for normal text. **Applies to font selector UI.**
- `.ai-run/guides/patterns/state-management.md` — Valtio proxy store pattern, localStorage usage patterns with validation. **Covers storage approach.**
- `.ai-run/guides/patterns/form-patterns.md` — React Hook Form + Yup validation; Select component patterns for dropdown options. **Templates for FontSection implementation.**
- `.ai-run/guides/components/component-organization.md` — Component placement: shared components in `/src/components/`, feature-specific in `/src/pages/<feature>/components/`.
- `.ai-run/guides/components/component-patterns.md` — Component structure, props typing, conditional rendering patterns.
- `.ai-run/guides/development/code-organization.md` — File naming conventions (camelCase helpers, PascalCase components), 300-line hard limit on components.

### Architectural Decisions

**Custom Appearance Engine Architecture:**
- Rules-based CSS variable override system at `/src/utils/customAppearance/` with established patterns:
  - `mapRule` factory for 1-to-many simple field mappings
  - `derive` rules (documented in rules.ts §2) for OKLCH lightness-shifted color variants
  - Font stack rule at rules.ts lines 235–240 as reference pattern
  - All rules implement `apply(inputs: AppearanceInputs): CssVarOverrides`

**Current Font Handling Decision:**
- Schema at schema.ts:40 defines `fontStack: 'geist' | 'system' | 'sans' | 'serif'` (general UI fonts only)
- FONT_STACKS mapping at rules.ts:54–59 (currently 4 options, extensible)
- fontStack rule applies to `--font-family-body` CSS variable (single variable for all text)
- CodeBlock.scss lines 23, 41, 45: currently hardcoded `Consolas, Monaco, "Andale Mono"` — no dynamic binding

**Storage & Persistence Decision:**
- localStorage via `APPEARANCE_KEY` constant with Yup schema validation (storage.ts)
- Presets validated as either builtin references or full user preset values
- `useCustomAppearance` hook for component-level get/set operations

**WCAG Compliance Pattern:**
- Minimum 4.5:1 contrast ratio for normal text (documented in accessibility-patterns.md)
- Multiple font options support accessibility needs (semantic fonts may improve readability for dyslexia)
- Color contrast derivation pattern established in rules.ts§2 (OKLCH lightness shifts with threshold constants)

### Derived Conventions

- **Appearance rules pattern:** Input fields → CSS variable map via `deriveAlternateOklchLightness(hex, threshold, amount)` for contrast-safe variants
- **Constants naming:** `<ASPECT>_<PROPERTY>_<L|THRESHOLD>` (e.g., `ACCENT_HOVER_L_THRESHOLD = 0.5`)
- **Storage validation:** Yup schemas for all persisted settings; string.oneOf() for enum validation
- **Component limits:** 300-line hard cap; logic extracted to custom hooks (use<Name>.ts) or sub-components
- **CSS variables:** All semantic tokens only; no raw palette values in components; variables listed in `CssVar` type (schema.ts)
- **Font family format:** `"FontName", fallback, monospace` or `string.oneOf([...])` in schema

---

## 4. Testing Landscape

### Existing Coverage

- `/src/utils/customAppearance/__tests__/rules.test.ts` — Tests fontStack mapping with it.each(); tests all current font stack values; covers rule application patterns
- `/src/utils/customAppearance/__tests__/storage.test.ts` — Tests localStorage persistence, Yup validation, getStoredPreset/persistPreset
- `/src/hooks/__tests__/useCustomAppearance.test.tsx` — Tests hook state management and service delegation
- `/src/utils/__tests__/themeService.test.ts` — Tests theme service lifecycle, localStorage sync, DOM application

### Testing Framework and Patterns

- **Framework:** Vitest with jsdom environment, globals enabled
- **Libraries:** @testing-library/react (render, renderHook, act, screen, userEvent)
- **Setup Files:** `src/setupTests.tsx` (shared mocks), `src/setupTests.unit.ts` (API/storage/valtio unit test mocks)
- **localStorage Mock:** Custom implementation in setupTests.tsx (lines 57–72)
- **CSS Testing:** Direct DOM style manipulation via `el.style.setProperty(varName, value)` and `el.style.getPropertyValue(varName)`
- **Parameterized Tests:** it.each() with [input, expected] arrays for color/font variants
- **Mocking Pattern:** Service mocking via vi.hoisted() + vi.mock(); allows preset service isolation

### Coverage Gaps

**Critical gaps for code-block font feature:**
1. **No FontSection UI component tests** — No rendering, form input, onChange callback, or accessibility tests
2. **No CodeBlock component tests** — No tests verifying CSS variable application or font rendering
3. **No code-block font selector UI tests** — New CodeBlockFontSection component will need full coverage
4. **No WCAG 2.1 AA accessibility tests** — Font selector must support keyboard navigation, ARIA attributes (role, aria-label, aria-selected)
5. **No localStorage round-trip tests** — Set → persist → reload → verify pattern not tested for appearance settings
6. **No schema validation tests** — codeBlockFontStack field validation not covered
7. **No end-to-end tests** — Settings UI → service → DOM CSS vars → styled output not tested

---

## 5. Configuration and Environment

### Environment Variables

- **`VITE_API_URL`** — Backend API endpoint; injected at build time by Vite or runtime via ConfigMap
- **`VITE_ENV`** — Environment designation ('local' | 'prod'); affects behavior branching
- **`VITE_SUFFIX`** — URL path suffix for app deployment
- **`VITE_*` (general)** — All VITE_-prefixed vars injected by Vite at build time; also loadable at runtime via Kubernetes ConfigMap
- **`KC_ENTRA_TENANT_ID`, `KC_ENTRA_CLIENT_ID`, `KC_ENTRA_CLIENT_SECRET`** — Keycloak/Entra ID credentials (dev only); templated in vite.config.ts

### Configuration Files

- `/src/utils/customAppearance/schema.ts` — AppearanceInputs interface with fontStack enum (currently 4 values); CssVar type enumerates all CSS variable names
- `/src/utils/customAppearance/rules.ts` — FONT_STACKS mapping (lines 54–59) defines CSS font-family values for each fontStack option
- `/src/utils/customAppearance/storage.ts` — Yup validation schema (line 31) for fontStack as string.oneOf(['geist', 'system', 'sans', 'serif'])
- `/src/assets/stylesheets/main.scss` — @font-face definitions (lines 12–26) for Geist and GeistMono only; defines font-display: swap
- `tailwind.config.ts` — Tailwind fontFamily definitions (lines 516–519) for geist and geist-mono
- `/src/assets/stylesheets/_codemie-custom.scss` — Applies --font-family-body CSS variable to body element; fallback to "GeistMono" (line 6)
- `deploy-templates/values.yaml` — Helm chart with extraConfig: {} support for runtime VITE_* injection (line 147)

### Feature Flags and Deployment Concerns

**No explicit feature flags** — Font selection is configurable as general UI setting, not gated.

**Deployment-Related Concerns:**
- **Font delivery:** Only Geist and GeistMono @font-face currently defined; JetBrains Mono and IBM Plex Mono require new @font-face entries and font files in `/src/assets/fonts/`
- **Build-time vs. runtime:** Vite loads VITE_* at build time; Kubernetes ConfigMap injects window._env_ at runtime (post-deployment config changes without rebuild possible)
- **localStorage scope:** Browser-only; no backend persistence needed for appearance presets
- **CSS variable scope:** `--font-family-body` scoped to body element via `.codemieCustom` class; code block will need new variable (e.g., `--font-family-code-block`) or reuse if should follow body selection
- **Helm flexibility:** extraConfig in values.yaml allows injecting feature flags or font preferences at deploy time if needed

---

## 6. Risk Indicators

- **New font files required:** JetBrains Mono and IBM Plex Mono not currently in repo; font files must be added to `/src/assets/fonts/` and @font-face definitions added to main.scss. Verify licensing (open source).
- **Code block decoupling:** CodeBlock.scss currently hardcoded font (line 23); rule engine does not generate code-block-specific CSS variable. Architectural decision needed: should code block follow body font selection or have independent selection?
- **CSS variable naming:** `--font-family-body` applies to body text only. New rule must generate `--font-family-code-block` or similar; update CssVar type in schema.ts to include it.
- **No CodeBlock tests:** CodeBlock.tsx component has no existing tests. Feature will require new test coverage for font variable binding and rendering.
- **No FontSection tests:** FontSection.tsx UI component has no existing tests. New CodeBlockFontSection will need full test coverage including WCAG 2.1 accessibility (keyboard nav, ARIA attributes).
- **WCAG 2.1 Level AA compliance:** Accessibility patterns guide covers keyboard and ARIA requirements; ensure font selector dropdown has proper role, aria-label, aria-selected, and focus management. Different fonts may have different rendering characteristics — test visual accessibility.
- **Schema extension:** Extending AppearanceInputs with codeBlockFontStack field requires updates to schema.ts, rules.ts, storage.ts, presets.ts, and apply.ts. Five files in change surface.
- **Storage backward compatibility:** Existing localStorage entries lack codeBlockFontStack; migration strategy needed for old preset format.
- **Font stack rule pattern:** Current FONT_STACKS mapping (lines 54–59) is simple; rule at lines 235–240 is single-variable. Verify pattern matches new code-block rule (same function signature, same CSS var output).
- **No integration tests:** No end-to-end tests verify appearance service → CSS variables → styled output. Feature may introduce subtle DOM application bugs.

---

## 7. Summary for Complexity Assessment

This feature extends an existing appearance customization engine that is well-structured, rule-based, and follows established patterns. The code-block font selection mirrors the general UI font selection already implemented; however, it requires new CSS variable infrastructure and introduces architectural decisions about font decoupling.

The implementation will touch five core modules (schema.ts, rules.ts, storage.ts, apply.ts, CodeBlock.scss) plus two UI layers (FontSection extension or new CodeBlockFontSection component). The rule-based pattern is mature, so the changes are primarily additive: new enum values, new rule function, new CSS variable. Storage validation is template-driven via Yup, so that change is low-risk. The highest complexity comes from (1) adding new @font-face definitions and font files, (2) deciding whether code block font selection is independent or coupled to body font selection, (3) ensuring WCAG 2.1 accessibility on the new UI component, and (4) writing comprehensive tests for previously untested components (CodeBlock.tsx, FontSection.tsx).

File change surface is moderate (8–10 files across configuration, rules, UI, and styles), but test coverage is sparse (CodeBlock and FontSection lack tests). Risk factors: font file licensing verification, CSS variable scoping decision, backward compatibility for stored presets, and WCAG compliance testing. No novel patterns required; implementation follows established conventions from the existing font selection system.

