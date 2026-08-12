# Accessibility Patterns — Factory Guide

## Target: WCAG 2.1 Level AA

All components must be keyboard-accessible, screen-reader-friendly, and pass contrast checks.

---

## Pre-Delivery Checklist

- [ ] All interactive elements reachable by Tab
- [ ] Buttons/links have visible focus ring (`focus:ring-2 focus:ring-primary-500`)
- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have `<label htmlFor>` or `aria-label`
- [ ] Errors announced: `role='alert'` or `aria-live='assertive'`
- [ ] Modals: `role='dialog'` + `aria-modal='true'` + ESC closes + focus restored on close
- [ ] Decorative SVGs: `aria-hidden='true'`
- [ ] Meaningful images: descriptive `alt` text
- [ ] Color not the only means of conveying status
- [ ] Heading hierarchy sequential (no skipped levels)
- [ ] Lists use `<ul>`, `<ol>`, or `<dl>`

---

## ARIA Attributes — Quick Reference

| Attribute | When to use | Example value |
|-----------|-------------|---------------|
| `aria-label` | Icon button, no visible text label | `'Delete item'` |
| `aria-labelledby` | Dialog/region labeled by another element | `'dialog-title'` |
| `aria-describedby` | Input linked to hint or error text | `'email-error'` |
| `aria-expanded` | Toggle / accordion / dropdown trigger | `{isOpen}` |
| `aria-hidden` | Decorative SVG, repeated icon | `'true'` |
| `aria-live='polite'` | Status message updated async | on status container |
| `aria-live='assertive'` | Error that must interrupt | `role='alert'` container |
| `aria-required` | Required form field | `'true'` |
| `aria-invalid` | Field with validation error | `{!!errors.field}` |
| `aria-modal` | Dialog/modal overlay | `'true'` |
| `aria-selected` | Tab / listbox option | `{activeTab === i}` |
| `aria-controls` | Button controlling a panel | panel element `id` |
| `aria-haspopup` | Trigger that opens a listbox/menu | `'listbox'` |

---

## Icon Button Pattern

```tsx
// Correct — label on button, icon hidden
<Button aria-label='Start chat' onClick={handleChatClick}>
  <ChatSvg aria-hidden='true' />
</Button>

// With visible text — label on button unnecessary; hide decorative icon
<Button onClick={handleDelete}>
  <TrashSvg aria-hidden='true' />
  <span>Delete</span>
</Button>
```

---

## Cross-component ARIA id sharing

`NavigationMore`'s `contextId` prop links its icon-only button to a named-entity heading rendered by a *different* element via `aria-labelledby`. When the heading and the menu are NOT in the same file, never write the same id template string independently in both files — a rename in one silently breaks the accessible name with no compile error and no runtime error, only a screen-reader regression. Pick one of these based on structure:

1. **Same file, single instance** — a local `const` computed once and used for both the heading's `id` and the menu's `contextId`, within one file. Sufficient whenever both elements are already rendered by the same component or the same render function. No cross-file risk exists because only one file could ever drift.

2. **One component owns both, or is the sole caller of the consumer, with no `.map()` in the way** — generate the id with `useId()` in the owning component and thread it down as a prop to both the heading and the menu-rendering child. This is the preferred pattern when it's structurally available (see `MCPServerCard.tsx` / `MCPServerDetail.tsx` for the target shape). `useId()` cannot be called inside a `.map()` — if the owning component is a list row, extract the row into its own component first so `useId()` sits at that component's top level, not inside the iteration.

3. **Split across independently-invoked renderers with no shared owning component** — e.g. a Table's `customRenderColumns`, where the "name" column and "actions" column are separate functions called per-row by the Table, with no component that renders both. Restructuring the Table to support row-level `useId()` is out of scope for a simple id-sharing fix. Instead, export a single narrowly-named builder function (e.g. `dataSourceNameId(id: string) => \`datasource-name-${id}\``) from a shared module, imported by both renderers. A rename becomes a compile error, and find-references answers "who depends on this id." Never write a generic `entityNameId(scope: string, id: string)` helper — a free-form string scope just relocates the magic string instead of removing it, and it defeats find-references' usefulness.

---

## Form Field Accessibility

```tsx
<Controller name='email' control={control}
  render={({ field }) => (
    <Input
      {...field}
      id='email'
      label='Email'
      aria-required='true'
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? 'email-error' : undefined}
      error={errors.email?.message}
    />
  )} />
{errors.email && (
  <span id='email-error' className='text-text-error text-sm' role='alert'>
    {errors.email.message}
  </span>
)}
```

---

## Focus Management

### Visible Focus Indicator (Mandatory)

```tsx
// Always include focus ring — never `outline-none` without replacement
<button className='focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'>
  Click me
</button>
```

### Auto-focus on Modal Open

Use `useFocusOnVisible` — `src/hooks/useFocusOnVisible.ts`:
```tsx
const inputRef = useRef<HTMLInputElement>(null)
useFocusOnVisible(inputRef, visible)
// <Input ref={inputRef} ... />
```

### Restore Focus on Modal Close

`Popup` handles this internally. For custom modals:
```tsx
const prevFocusRef = useRef<HTMLElement | null>(null)
useEffect(() => {
  if (visible) {
    prevFocusRef.current = document.activeElement as HTMLElement
  } else {
    prevFocusRef.current?.focus()
  }
}, [visible])
```

### Focus on Error Message

```tsx
const errorRef = useRef<HTMLDivElement>(null)
useEffect(() => { if (error) errorRef.current?.focus() }, [error])
// <div ref={errorRef} tabIndex={-1} role='alert' aria-live='assertive'>{error}</div>
```

---

## Keyboard Navigation Rules

| Key | Expected behaviour |
|-----|--------------------|
| Tab / Shift+Tab | Move focus forward / backward through interactive elements |
| Enter | Activate button, submit form, follow link |
| Space | Toggle checkbox, activate button |
| Escape | Close modal, dismiss dropdown |
| Arrow keys | Navigate within tab list, menu, listbox |
| Home / End | Jump to first / last item in list |

### ESC Key Handling

`Popup` has built-in ESC handling. For non-Popup modals or custom logic, use:
```tsx
import { useEscapeKey } from '@/hooks/useEscapeKey'
useEscapeKey(handleClose, visible)
```

### Tab Pattern for Tab Lists

```tsx
<div role='tablist' aria-label='Section tabs'>
  {tabs.map((tab, i) => (
    <button
      key={i}
      role='tab'
      aria-selected={active === i}
      aria-controls={`panel-${i}`}
      id={`tab-${i}`}
      tabIndex={active === i ? 0 : -1}
      onClick={() => setActive(i)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') setActive((i + 1) % tabs.length)
        if (e.key === 'ArrowLeft') setActive((i - 1 + tabs.length) % tabs.length)
      }}
    >{tab}</button>
  ))}
</div>
{tabs.map((_, i) => (
  <div key={i} role='tabpanel' id={`panel-${i}`} aria-labelledby={`tab-${i}`}
    hidden={active !== i} tabIndex={0}>
    {/* content */}
  </div>
))}
```

---

## Modal Accessibility

```tsx
<Popup
  visible={visible}
  onHide={onHide}
  role='dialog'
  aria-modal='true'
  aria-labelledby='dialog-title'
>
  <h2 id='dialog-title'>Dialog Title</h2>
  {/* content */}
</Popup>
```

`Popup` provides built-in: ESC close, focus trap, focus restore, `aria-modal`. Only add overrides when custom behaviour is needed.

---

## Screen Reader Patterns

### Live Regions

```tsx
// Status — non-urgent update
<div aria-live='polite' aria-atomic='true'>{statusMessage}</div>

// Error — interrupts immediately
<div role='alert' aria-live='assertive'>{errorMessage}</div>
```

### Visually Hidden Text

Use Tailwind `sr-only` for text visible only to screen readers:
```tsx
<span className='sr-only'>Additional context for screen readers</span>
```

Use `focus:not-sr-only` for skip links:
```tsx
<a href='#main-content'
  className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
             focus:bg-primary-500 focus:text-white focus:px-4 focus:py-2 focus:rounded'>
  Skip to main content
</a>
```

### Image Alt Text

| Image type | Alt value |
|------------|-----------|
| Informative | Descriptive text: `'AI assistant avatar'` |
| Decorative | Empty string: `alt=''` + `role='presentation'` |
| Decorative SVG | `aria-hidden='true'` on the `<svg>` element |

---

## Color & Contrast

| Text type | Min contrast ratio |
|-----------|--------------------|
| Normal body text | 4.5:1 |
| Large text (18pt+) | 3:1 |
| UI components / borders | 3:1 |

Always pair color with a secondary indicator (icon, text label, pattern):

```tsx
// Correct — color + icon + text
<div className={cn('flex items-center gap-2', isError ? 'text-text-error' : 'text-text-success')}>
  {isError ? <ErrorSvg aria-hidden='true' /> : <SuccessSvg aria-hidden='true' />}
  <span>{isError ? 'Failed' : 'Success'}</span>
</div>
```

---

## Semantic HTML Quick Reference

| Use | Instead of |
|-----|-----------|
| `<nav>` | `<div className='nav'>` |
| `<main id='main-content'>` | `<div className='main'>` |
| `<button>` | `<div onClick>` |
| `<ul>` / `<ol>` | `<div>` repeated `<div>` |
| `<h1>` → `<h2>` → `<h3>` in order | Skip from `<h1>` to `<h4>` |
| `<label htmlFor='id'>` | `<div>` label above input |

---

## Automated Testing

```tsx
import { axe } from 'jest-axe'
import { render } from '@testing-library/react'

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  expect(await axe(container)).toHaveNoViolations()
})
```
