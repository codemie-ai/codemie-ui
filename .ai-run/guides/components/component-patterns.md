# Component Patterns — Factory Guide

React 18.3.1 / TypeScript 5.8.3 / Tailwind CSS / PrimeReact 10.9.x

---

## 1. Component Structure

Every component follows this internal ordering:

1. Imports (see Import Order below)
2. TypeScript interface for props
3. `React.FC<Props>` declaration with destructured params
4. Hooks (state → refs → store snapshots → custom)
5. Event handlers
6. Render helpers (only if JSX is non-trivial)
7. Return JSX
8. `export default`

Real reference: `src/components/Button/Button.tsx:41` (FC declaration pattern)
Real reference: `src/pages/assistants/AssistantsListPage.tsx:17` (hooks ordering in a page component)

---

## 2. Props Typing

Always define an explicit TypeScript interface. Never use `any` or inline object types.

```tsx
interface MyProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}
const MyComponent: React.FC<MyProps> = ({ title, description, className, children }) => { ... }
```

Rules:
- Include `className?: string` on every presentational component so callers can extend layout.
- Use `React.ReactNode` for slot props (`children`, `actions`, `headerContent`).
- Extend HTML attributes with `extends Omit<InputHTMLAttributes<...>, 'value'>` when wrapping native elements.
  - Real reference: `src/components/form/Input/Input.tsx:22`
- Use `ButtonHTMLAttributes` extension for button wrappers.
  - Real reference: `src/components/Button/Button.tsx:30`

**Props design — DO/DON'T**

| Practice | DO | DON'T |
|---|---|---|
| Semantic intent | `isCompactView: boolean` | `accordionClassName?`, `logoClassName?`, `panelClassName?` per-slot styling props |
| Slot content | `headerContent?: ReactNode` | separate render-prop functions passed as props |
| Default values | `submitText = 'Create'` (destructure default) | conditional `\|\|` fallbacks in body |
| Nullish default | `value ?? defaultValue` | `value \|\| defaultValue` (drops `0`, `''`) |

Real reference: `src/components/Popup/Popup.tsx:25–51` (well-typed PopupProps with slot props)

---

## 3. Conditional Rendering

Prefer short-circuit `&&` for optional nodes; use ternary only when both branches produce visible output.

```tsx
{description && <p className='text-sm text-text-secondary'>{description}</p>}
{loading ? <Spinner /> : <DataList items={items} />}
```

Never use `&&` with a numeric left operand — use explicit boolean cast:

```tsx
{count > 0 && <Badge count={count} />}   // safe
{items.length && <List />}               // unsafe — renders "0"
{!!items.length && <List />}             // safe
```

---

## 4. Event Handling

- Name handlers `handle<Event>` (e.g., `handleClick`, `handleSubmit`).
- Use optional chaining for prop callbacks: `onAction?.()`.
- For state toggles, use functional updates: `setOpen(prev => !prev)`.
- Cleanup side effects with useEffect return function.

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onHide() }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [visible, onHide])
```

Real reference: `src/components/Popup/Popup.tsx:83–94`

---

## 5. Store-Connected Components

- Never call API methods directly inside a component.
- Access store state via `useSnapshot(store)` — this is the reactive read layer.
- Mutate state only by calling store methods, not by assigning to the snapshot.

```tsx
const { items, loading, error } = useSnapshot(exampleStore)
useEffect(() => { exampleStore.fetchItems() }, [])
```

Real reference: `src/pages/assistants/AssistantsListPage.tsx:18,52`

---

## 6. Import Order

Enforced by ESLint. Violations block the linter.

1. `react` (and react sub-imports)
2. Third-party libraries (alphabetical)
3. Valtio + store imports
4. Component imports (`@/components/...`)
5. Hook imports (`@/hooks/...`)
6. Utility / constants imports
7. Type imports
8. Asset imports (`.svg?react`, images)

Real reference: `src/pages/assistants/AssistantsListPage.tsx:17–50` (correct ordering in a page component)

---

## 7. Code Style Rules

| Rule | Value |
|---|---|
| Semicolons | None (ESLint-enforced) |
| Quotes | Single quotes only |
| Indentation | 2 spaces |
| Iteration | `for...of` preferred over `.forEach` |
| Index loops | `.entries()` when index needed |
| Tailwind classes | `cn()` utility from `@/utils/utils` for conditionals |

---

## 8. Presentation vs Container Split

| Type | Line budget | Characteristics |
|---|---|---|
| Presentation | < 100 lines | Accepts explicit props (`value`, `onChange`, `error`). No store imports. Reusable. |
| Container / Section | 200–300 lines | Manages React Hook Form `Controller`, coordinates children, may hold `control` prop. |
| Page component | ≤ 300 lines | Route-level, orchestrates containers, reads from store. |

Hard limit: **300 lines per file**. Exceeding requires extraction (see Component Organization guide).

---

## 9. DO / DON'T Summary

| Category | DON'T | DO |
|---|---|---|
| Styling | Inline styles, custom CSS | Tailwind classes only via `cn()` |
| Modals | Import `Dialog` from PrimeReact | Use `Popup` component (`@/components/Popup`) |
| API calls | `fetch()`/`axios` in component body | Call store method |
| State reads | Access `store.value` directly | `useSnapshot(store)` |
| Default values | `value \|\| 'default'` | `value ?? 'default'` |
| Multiple styling props | `cardClassName`, `headerClassName` | Single semantic prop e.g. `isCompact` |
| Component size | > 300 lines in one file | Extract sub-components and hooks |
| Magic strings | `type === 'primary'` literals | Import from `@/constants` |
| String quotes | `"double"` | `'single'` |

---

## 10. Accessibility Basics

Every interactive component must meet these minimums:

- Buttons and links have visible text or an `aria-label`.
- Modals (Popup) get `aria-labelledby` pointing to the heading id.
  Real reference: `src/components/Popup/Popup.tsx:80` (`useId()` for headerId)
- Form inputs get matching `<label>` via the `label` prop or explicit `htmlFor`.
- Use `role` and `aria-*` attributes only when a native element cannot convey semantics.
- Keyboard-navigable controls must be reachable with `Tab` and operable with `Enter`/`Space`.
- Avoid `tabIndex` values other than `0` or `-1`.

---

## 11. Component Composition Patterns

### Compound props over render props

Prefer passing `ReactNode` slot props (`headerContent`, `footerContent`, `actions`) over
render-prop functions. This avoids closure complexity and aligns with how PrimeReact Dialog
slots work.

Real reference: `src/components/Popup/Popup.tsx:43–45` (`headerContent`, `footerContent`)

### Children for flexible body content

Use `children: React.ReactNode` when the parent imposes layout/chrome but does not know
what the inner content will be (Popup body, Card body, Layout content area).

### Named sub-components for structured composition

When a component has fixed, named sections (header, body, footer), prefer explicit sub-component
props over unnamed children slots to make structure explicit at the call site.

---

## 12. TypeScript Patterns

| Pattern | When | Example |
|---|---|---|
| `extends HTMLAttributes` | Wrapping a native element | `Input` extends `InputHTMLAttributes` |
| `as const` enum objects | Exhaustive string unions | `ButtonType`, `ButtonSize` in `@/constants` |
| Generic component | Reusable over data shapes | `Tabs<TabId extends string>` |
| `forwardRef` | Wrapping inputs that need DOM ref | `src/components/form/Input/Input.tsx:50` |
| `React.FC<Props>` | Standard component declaration | All components in this project |

Avoid:
- `any` — use `unknown` then narrow with type guards.
- Non-null assertion `!` in JSX — guard with conditional rendering instead.
- Inline object types in props — always extract a named interface.

---

## 13. Pre-Delivery Checklist

- [ ] Component file under 300 lines
- [ ] TypeScript interface covers all props, no `any`
- [ ] `cn()` used for conditional class merges
- [ ] No custom CSS, no inline `style={{}}`
- [ ] Store access via `useSnapshot`, mutations via store methods
- [ ] `useEffect` returns cleanup when listeners or timers registered
- [ ] No magic strings — constants imported from `@/constants`
- [ ] `??` used for defaults, not `||`
- [ ] Import order follows the 8-step sequence above
- [ ] Default export present
- [ ] Interactive elements have accessible labels or visible text
- [ ] Single quotes throughout — no double quotes
