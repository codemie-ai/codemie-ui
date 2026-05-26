# Styling Guide

> CRITICAL: Tailwind CSS only. No custom CSS. No inline styles. No arbitrary values.

## Mandatory Rules

1. Only Tailwind CSS classes — no `<style>` blocks, no `style={{}}`, no `.css`/`.scss` files for component styles
2. Only semantic theme tokens from `themeTokens` — never raw palette tokens (`neutral-*`, `blue-*`, `brand-*`)
3. Only predefined spacing scale — never `p-[18px]` or `mt-[20px]`
4. Use `cn()` utility for all conditional class merging
5. Verify token names exist in `tailwind.config.ts` before using

---

## DO / DON'T Reference

| DO | DON'T | Why |
|----|-------|-----|
| `bg-surface-elevated` | `bg-neutral-800` | Raw palette leaks, breaks theme switching |
| `text-text-primary` | `text-blue-400` | Semantic tokens auto-adapt to dark/light |
| `border-border-primary` | `border-[#cccccc]` | Arbitrary values break design consistency |
| `p-4` (16px) | `p-[16px]` | Predefined scale enforces visual rhythm |
| `cn('base', { cond: isActive })` | `'base' + (isActive ? ' cond' : '')` | `cn()` handles merges and deduplication |
| `bg-surface-specific-card` | `style={{ background: '#f0f0f0' }}` | Inline styles bypass theme system |
| `text-error` | `text-red-500` | Semantic error token works in both themes |

---

## cn() Utility

Import: `import { cn } from '@/utils/utils'`

**Basic usage:**
```tsx
<div className={cn('px-4 py-2', className)}>content</div>
```

**Conditional classes:**
```tsx
<button className={cn(
  'px-4 py-2 rounded-lg font-medium transition-colors',
  {
    'bg-surface-specific-primary-button text-text-accent': variant === 'primary',
    'opacity-50 cursor-not-allowed': disabled,
  },
  className
)}>
```

**Multiple condition groups:**
```tsx
<div className={cn(
  'flex items-center',
  { 'justify-start': align === 'left', 'justify-end': align === 'right' },
  { 'gap-2': size === 'sm', 'gap-4': size === 'md', 'gap-6': size === 'lg' }
)}>
```

---

## Token System

Tokens live in `tailwind.config.ts`. Two objects:
- `c` — raw color palette. **Never reference directly in components.**
- `themeTokens` — semantic tokens mapped to `[dark, light]` pairs. **Always use these.**

Array tokens: first = dark theme, second = light theme. Applied automatically by the active theme class.

**Token categories:**

| Prefix | Used for | Example token |
|--------|----------|---------------|
| `bg-surface-*` | Backgrounds | `bg-surface-elevated`, `bg-surface-base-primary` |
| `text-text-*` | Text colors | `text-text-primary`, `text-text-secondary` |
| `border-border-*` | Borders | `border-border-primary`, `border-border-error` |
| `text-icon-*` | Icon colors (use `text-` prefix) | `text-icon-primary`, `text-icon-accent` |
| `bg-success-*` / `text-success-*` | Status colors | `bg-success-primary`, `text-failed-secondary` |

---

## Color Token Reference

### Surface Tokens

```
bg-surface-base-primary        Root page backgrounds, main containers
bg-surface-base-secondary      Panels, sidebars, base button backgrounds
bg-surface-base-content        Form inputs, text areas
bg-surface-base-chat           Message containers, modal bodies
bg-surface-base-float          Dropdowns, tooltips, popovers
bg-surface-elevated            Cards with shadow, prominent containers
bg-surface-interactive-hover   Hover state backgrounds
bg-surface-interactive-active  Active/pressed state, selected items
bg-surface-specific-card       Card component backgrounds
```

### Border Tokens

```
border-border-primary      Default borders on inputs, cards, dividers
border-border-secondary    Lighter dividers, nested elements
border-border-accent       Highlighted or emphasized elements
border-border-focus        Keyboard focus indicators
border-border-error        Error state borders
border-border-subtle       Barely visible dividers
```

### Text Tokens

```
text-text-primary      Body content, headings, button labels
text-text-secondary    Supporting text, disabled states
text-text-tertiary     Descriptions, helper text
text-text-quaternary   Metadata, timestamps, hints
text-text-inverse      Text on dark/inverted backgrounds
text-text-accent       Links, interactive text, primary actions
text-text-error        Error messages, validation feedback
text-heading           Section headings, structural titles
text-specific-input-placeholder   Input placeholder text
```

### Icon Tokens (use with `text-` prefix)

```
text-icon-primary      Standard icon color
text-icon-accent       Interactive icons, emphasized actions
text-icon-secondary    Supporting actions
text-icon-error        Error state icons
text-icon-inverse      Icons on dark/inverted backgrounds
```

### Status Tokens

All statuses follow a three-tier pattern: `-primary` (solid fill), `-secondary` (subtle bg/border), `-tertiary` (very light bg).

```
bg-success-primary / bg-success-secondary
bg-failed-primary / bg-failed-secondary / bg-failed-tertiary
bg-in-progress-primary / bg-in-progress-secondary / bg-in-progress-tertiary
bg-not-started-primary / bg-not-started-secondary / bg-not-started-tertiary
bg-interrupted-primary / bg-interrupted-secondary / bg-interrupted-tertiary
bg-aborted-primary / bg-aborted-secondary / bg-aborted-tertiary
bg-advanced-primary / bg-advanced-secondary / bg-advanced-tertiary
```

Same names work with `text-` and `border-` prefixes.

### Never Use These Directly

```
bg-neutral-*   text-neutral-*   border-neutral-*
bg-blue-*      text-blue-*
bg-red-*       text-red-*
bg-green-*     text-green-*
bg-brand-*     text-brand-*
```

---

## Spacing Scale

Only use values from the standard Tailwind scale. Never use arbitrary pixel brackets.

| Class | Value | Class | Value |
|-------|-------|-------|-------|
| `p-0` | 0px | `p-6` | 24px |
| `p-1` | 4px | `p-8` | 32px |
| `p-2` | 8px | `p-10` | 40px |
| `p-3` | 12px | `p-12` | 48px |
| `p-4` | 16px | `p-16` | 64px |
| `p-5` | 20px | `p-20` | 80px |

Applies to all utilities: `m-`, `p-`, `gap-`, `space-`, `top-`, `right-`, `bottom-`, `left-`, `w-`, `h-`.

### Custom Layout Spacing (from `tailwind.config.ts`)

```
h-navbar              72px   Navigation bar height
h-navbar-expanded     196px  Expanded nav height
w-sidebar             308px  Sidebar width
h-layout-header       56px   Layout header height
h-card                158px  Standard card height
max-w-chat-content    64rem  Max chat content width
```

---

## Responsive Design

Breakpoints (standard Tailwind + project customs from `tailwind.config.ts`):

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `card-grid-2:` | 1300px | 2-col card grids |
| `card-grid-3:` | 1600px | 3-col card grids |
| `view-details-bp:` | 1200px | Detail view breakpoint |

Mobile-first pattern:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
<div className="text-sm md:text-base lg:text-lg">
<div className="hidden md:block">        {/* desktop only */}
<div className="block md:hidden">        {/* mobile only */}
```

---

## Typography

### Heading sizes (from `tailwind.config.ts`)

```
text-h1   32px heading
text-h2   24px heading
text-h3   16px heading
text-h4   14px heading
text-h5   12px heading
```

### Font weights

```
font-normal    font-medium    font-semibold    font-bold
```

---

## Common Patterns

### Card

```tsx
<div className={cn(
  'bg-surface-specific-card border border-border-primary rounded-lg p-6',
  'hover:border-border-secondary transition-colors duration-200',
  className
)}>
```

### Input (with error state)

```tsx
<input className={cn(
  'w-full px-4 py-2 bg-surface-base-content rounded-lg',
  'text-text-primary placeholder:text-specific-input-placeholder',
  'focus:outline-none transition-colors duration-200',
  error ? 'border border-border-error'
        : 'border border-border-primary hover:border-border-secondary focus:border-border-focus'
)} />
```

### Status badge

```tsx
<span className={cn('px-3 py-1 rounded-full text-xs font-medium', {
  'bg-success-primary text-text-inverse': status === 'success',
  'bg-failed-primary text-text-inverse': status === 'failed',
  'bg-in-progress-primary text-text-inverse': status === 'in-progress',
  'bg-aborted-primary text-text-inverse': status === 'warning',
})}>
```

---

## Adding New Tokens

When you need a color that has no existing token:
1. Check if a nearby semantic token covers the use case
2. If truly new, add to `themeTokens` in `tailwind.config.ts`, referencing values from `c`
3. Use `[darkColor, lightColor]` array format for theme-aware tokens
4. Never use `c[...]` values directly in component classes

---

## Pre-Delivery Checklist

- [ ] No custom CSS, `<style>` tags, or inline `style={{}}` props
- [ ] All colors are semantic tokens (no `neutral-*`, `blue-*`, `brand-*`, etc.)
- [ ] No arbitrary values (`p-[18px]`, `bg-[#fff]`, `w-[340px]`)
- [ ] `cn()` used for all conditional class logic
- [ ] All spacing from predefined scale
- [ ] Responsive breakpoints verified to exist in `tailwind.config.ts`
- [ ] Tokens verified in both dark and light themes
