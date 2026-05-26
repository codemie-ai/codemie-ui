# Theme Management

> Two themes: `codemieDark` (default) and `codemieLight`. All tokens auto-adapt — use semantic tokens, not raw palette values.

## Architecture

Themes are managed via `tailwind.config.ts` using `generateThemes` from `src/utils/themeHelpers.ts`.

**Token flow:**
```
tailwind.config.ts  →  themeTokens  →  CSS custom properties  →  Tailwind classes
```

The `themeTokens` object maps semantic names to `[darkValue, lightValue]` arrays. The theme engine writes the correct CSS variable for whichever theme is active on `<html>`.

**Never bypass this system** by writing raw palette values in components.

---

## Using the Theme Hook

```tsx
import { useTheme } from '@/hooks/useTheme'

const { theme, isDark, setTheme } = useTheme()

// Toggle
setTheme(isDark ? 'codemieLight' : 'codemieDark')

// Read
const label = isDark ? 'Dark mode' : 'Light mode'
```

`theme` is `'codemieDark' | 'codemieLight'`. `isDark` is a boolean convenience alias.

---

## tailwind.config.ts Structure

```
tailwind.config.ts
  ├── c { }              Raw color palette — NEVER use in components
  ├── themeTokens { }    Semantic tokens — ALWAYS use these
  │   ├── surface { }
  │   ├── border { }
  │   ├── text { }
  │   ├── icon { }
  │   └── status tokens (success, failed, in-progress, …)
  └── generateThemes(themeTokens)   Produces Tailwind extend.colors
```

### Token Format

**Theme-aware (most tokens):** `[darkColor, lightColor]`
```typescript
surface: {
  elevated: [c['neutral']['800'], c['neutral']['0']]
  //         dark theme            light theme
}
// → CSS: .codemieDark .bg-surface-elevated { … }
//         .codemieLight .bg-surface-elevated { … }
```

**Single-value (theme-invariant):** one color string
```typescript
'in-progress': { primary: c['blue']['300'] }
// Same color in both themes
```

---

## Token Categories at a Glance

| Category | Tailwind prefix | Typical use |
|----------|----------------|-------------|
| `surface` | `bg-surface-*` | All backgrounds |
| `border` | `border-border-*` | All borders |
| `text` | `text-text-*` | Body text, labels |
| `icon` | `text-icon-*` | SVG/icon fills |
| `success` | `bg-success-*` / `text-success-*` | Success states |
| `failed` | `bg-failed-*` / `text-failed-*` | Error states |
| `in-progress` | `bg-in-progress-*` | Loading/running states |
| `not-started` | `bg-not-started-*` | Idle states |
| `interrupted` | `bg-interrupted-*` | Pending/paused |
| `aborted` | `bg-aborted-*` | Warning/aborted |
| `advanced` | `bg-advanced-*` | Advanced status |

Full token list: see `styling-guide.md` → Color Token Reference.

---

## DO / DON'T for Theme Tokens

| DO | DON'T | Why |
|----|-------|-----|
| `bg-surface-elevated` | `bg-neutral-800` | Raw palette won't switch themes |
| `text-text-primary` | `text-[#333]` | Arbitrary hex ignores theme |
| `border-border-focus` | `border-blue-400` | Raw blue won't adapt |
| `bg-failed-tertiary` | `bg-red-100` | Semantic error token is consistent |
| `text-icon-accent` | `fill-current text-blue-300` | Use icon token, not raw color |
| Add token to `themeTokens` for new colors | Inline `style={{ color: '#abc' }}` | Bypasses theme switching entirely |

---

## Adding a New Token

1. Identify the semantic role (is it a surface? text? border? status?)
2. Locate the correct section in `themeTokens` inside `tailwind.config.ts`
3. Define with `[darkColor, lightColor]` referencing values from `c`:
   ```typescript
   surface: {
     specific: {
       'my-panel': [c['neutral']['850'], c['neutral']['10']]
     }
   }
   ```
4. Use in components as `bg-surface-specific-my-panel`
5. Never pass raw `c[…]` values directly to a component class

---

## Theme in Tests

When writing component tests that depend on themed classes, wrap the component with the theme provider or ensure the correct theme class is on a parent element. Check existing integration tests under `src/` for patterns.

---

## Surface Token Reference

Complete list of semantic surface tokens, grouped by role:

| Token | Bg class | Typical use |
|-------|----------|-------------|
| `surface-elevated` | `bg-surface-elevated` | Cards with shadow, prominent containers |
| `surface-base-primary` | `bg-surface-base-primary` | Root page backgrounds |
| `surface-base-secondary` | `bg-surface-base-secondary` | Panels, sidebar, button bases |
| `surface-base-tertiary` | `bg-surface-base-tertiary` | Subtle elevated backgrounds |
| `surface-base-content` | `bg-surface-base-content` | Form inputs, text areas |
| `surface-base-sidebar` | `bg-surface-base-sidebar` | Sidebar containers |
| `surface-base-navigation` | `bg-surface-base-navigation` | Nav bar, selected nav items |
| `surface-base-chat` | `bg-surface-base-chat` | Chat message areas, modal bodies |
| `surface-base-float` | `bg-surface-base-float` | Dropdowns, tooltips, popovers |
| `surface-interactive-hover` | `bg-surface-interactive-hover` | Hover state backgrounds |
| `surface-interactive-active` | `bg-surface-interactive-active` | Active/pressed states |
| `surface-specific-card` | `bg-surface-specific-card` | Card component backgrounds |

---

## Border Token Reference

| Token | Class | Typical use |
|-------|-------|-------------|
| `border-primary` | `border-border-primary` | Default borders, inputs, cards |
| `border-secondary` | `border-border-secondary` | Lighter dividers, nested elements |
| `border-tertiary` | `border-border-tertiary` | Subtle borders |
| `border-accent` | `border-border-accent` | Highlighted elements |
| `border-subtle` | `border-border-subtle` | Barely visible dividers |
| `border-focus` | `border-border-focus` | Keyboard focus indicators |
| `border-error` | `border-border-error` | Validation failure borders |
| `border-specific-panel-outline` | `border-border-specific-panel-outline` | Panel containers, widget borders |
| `border-specific-icon-outline` | `border-border-specific-icon-outline` | Icon button outlines |

---

## Status Token Reference

All status families share the same three-tier suffix pattern: `-primary`, `-secondary`, `-tertiary`.

| Family | Primary use | Secondary use | Tertiary use |
|--------|-------------|---------------|--------------|
| `success` | Solid fill, status dot | Light bg, badge border | Very light container |
| `failed` | Error fill, primary text | Error border, indicator | Error container bg |
| `in-progress` | Active progress, animated dot | Progress border | Light progress bg |
| `not-started` | Inactive indicator, dot | Not-started border | Light idle bg |
| `interrupted` | Pending/paused dot | Pending border | Light pending bg |
| `aborted` | Warning indicator | Warning border | Warning container |
| `advanced` | Advanced indicator | Advanced border | Light advanced bg |

All names work with `bg-`, `text-`, and `border-` prefixes.

---

## Custom Breakpoints (defined alongside theme in `tailwind.config.ts`)

```
card-grid-2:    1300px
card-grid-3:    1600px
view-details-bp: 1200px
```

Usage: `card-grid-2:grid-cols-2`, `view-details-bp:flex-row`

---

## Related

- `tailwind.config.ts` — token definitions and `generateThemes` call
- `src/utils/themeHelpers.ts` — theme generation utility
- `src/hooks/useTheme.ts` — React hook for reading/setting theme
- `styling-guide.md` — complete token reference and Tailwind rules
