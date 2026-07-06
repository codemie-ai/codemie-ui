# Complexity Assessment: theme custom appearance color contrast AI-Katas MCPs

**Task**: Remove in-progress CSS variables from the accentColor mapRule in rules.ts and add OKLCH lightness-derived primary/secondary/tertiary variants so that the Intermediate label (AI Katas) and MCPs Categories text remain readable under any custom theme preset.
**Generated**: 2026-07-06T00:00:00Z

---

## Dimension Scores

| Dimension            | Score | Label |
|----------------------|-------|-------|
| Component Scope      | 3     | M     |
| Requirements Clarity | 2     | S     |
| Technical Risk       | 2     | S     |
| File Change Estimate | 1     | XS    |
| Dependencies         | 1     | XS    |
| Affected Layers      | 1     | XS    |

**Total: 10/36 — S**

---

## Key Reasoning

- **Component Scope (M)**: The change is a single edit in `src/utils/customAppearance/rules.ts`, but that file is the sole dispatch point for all custom theme overrides — it governs all 12 built-in presets and every component that consumes `in-progress` tokens (15+ badge/status consumers). The "touches core shared utilities" red flag applies, bumping scope from S to M.
- **Requirements Clarity (S)**: The root cause, affected file, and implementation approach (remove three vars from `mapRule('accentColor')`, add a new §2 derive rule using `deriveAlternateOklchLightness`) are all precisely identified. The only minor open item is calibrating the OKLCH shift constants against all 12 built-in presets — an implementation detail, not a requirements gap.
- **Red flags applied**: Component Scope bumped S→M because `rules.ts` is a core shared utility whose changes propagate to all custom theme presets and all `in-progress` token consumers simultaneously.

---

## Routing

superpowers:subagent-driven-development — direct implementation, no planning needed
