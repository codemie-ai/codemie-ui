# Modal Patterns — Factory Guide

## CRITICAL RULE

**NEVER import or use PrimeReact `Dialog` directly.**
All modals MUST use the `Popup` component from `src/components/Popup/`.

---

## Quick Reference

| Situation | Component | Import |
|-----------|-----------|--------|
| Standard form modal | `Popup` | `@/components/Popup` |
| Delete / destructive confirm | `ConfirmationModal` | `@/components/ConfirmationModal` |
| Custom footer layout | `Popup` + `footerContent` prop | `@/components/Popup` |
| Modal with complex logic | `Popup` + custom hook | `@/hooks/` or co-located `useXxxModal.ts` |

---

## Bad / Best

| Bad | Best |
|-----|------|
| `import { Dialog } from 'primereact/dialog'` | `import Popup from '@/components/Popup'` |
| Separate `<CustomModalHeader />` component | Use `header` / `headerContent` prop on `Popup` |
| Separate `<CustomModalFooter />` component | Use `footerContent` prop on `Popup` |
| 100+ lines of state/effects in modal component | Extract to `useXxxModal.ts` hook |
| Forget `form.reset()` on close | Call `form.reset()` inside `handleClose` |
| Forget debounce cleanup | `return () => debouncedFn.cancel()` in `useEffect` |
| `||` for default values | `??` (nullish coalescing) |

---

## Popup Props Reference

`src/components/Popup/index.tsx` (see file for full interface)

**Visibility & control**
- `visible?: boolean` — show/hide
- `onHide: () => void` — required close handler
- `onSubmit?: () => void` — optional submit handler

**Header**
- `header?: string` — plain text header (HTML accepted)
- `headerContent?: ReactNode` — custom header node
- `hideClose?: boolean`

**Footer**
- `hideFooter?: boolean`
- `footerContent?: ReactNode` — replaces default buttons
- `submitText?: string` — default: `'Create'`
- `submitDisabled?: boolean`
- `cancelText?: string` — default: `'Cancel'`
- `cancelButtonType?: ButtonType`
- `submitButtonType?: ButtonType`

**Sizing / styling**
- `className?: string`
- `bodyClassName?: string`
- `isFullWidth?: boolean`
- `limitWidth?: boolean` — constrains to `max-w-lg`
- `withBorder?: boolean` — header border (default `true`)

**Behaviour**
- `dismissableMask?: boolean` — click outside closes (default `true`)

---

## Pattern 1 — Simple Modal (Default Footer)

Use for standard create/edit dialogs with submit + cancel.

```tsx
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

<Popup
  visible={visible}
  onHide={onHide}
  header='Edit Item'
  submitText='Save Changes'
  onSubmit={handleSave}
  submitButtonType={ButtonType.PRIMARY}
  limitWidth
>
  {/* form fields */}
</Popup>
```

---

## Pattern 2 — Custom Footer

Use when you need multiple buttons, loading state in footer, or non-standard layout.

```tsx
const footer = (
  <div className='flex justify-end gap-3'>
    <Button variant={ButtonType.SECONDARY} onClick={onHide} disabled={loading}>
      Cancel
    </Button>
    <Button variant={ButtonType.PRIMARY} onClick={onSubmit} disabled={loading}>
      {loading ? 'Saving…' : 'Save'}
    </Button>
  </div>
)

<Popup
  visible={visible}
  onHide={onHide}
  header='Custom Footer'
  footerContent={footer}
  className='w-[800px]'
>
  {/* content */}
</Popup>
```

---

## Pattern 3 — Confirmation Modal

Use for delete / destructive actions. Import `ConfirmationModal`, not `Popup` directly.

```tsx
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'

<ConfirmationModal
  visible={visible}
  onCancel={onCancel}
  onConfirm={onConfirm}
  header='Delete Item'
  message={`Delete "${name}"?`}
  confirmText='Delete'
  confirmButtonType={ButtonType.DELETE}
  limitWidth
/>
```

---

## Pattern 4 — Modal With Custom Hook

Extract complex state/effects into a co-located hook. Keep the component thin.

```tsx
// useMyModal.ts
import { useState, useCallback, useRef } from 'react'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'

export const useMyModal = (visible: boolean, onHide: () => void) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState({})
  const handleClose = useCallback(() => { setData({}); onHide() }, [onHide])
  useFocusOnVisible(inputRef, visible)
  return { data, setData, inputRef, handleClose }
}
```

```tsx
// MyModal.tsx
import Popup from '@/components/Popup'
import { useMyModal } from './useMyModal'

const MyModal = ({ visible, onHide }) => {
  const { data, inputRef, handleClose } = useMyModal(visible, onHide)
  return (
    <Popup visible={visible} onHide={handleClose} header='My Modal' hideFooter>
      <Input ref={inputRef} value={data.name} />
    </Popup>
  )
}
```

---

## Focus & Keyboard

| Requirement | Implementation |
|-------------|---------------|
| Auto-focus first input on open | `useFocusOnVisible(inputRef, visible)` — `src/hooks/useFocusOnVisible.ts` |
| ESC to close | Built into `Popup`. Only add `useEscapeKey` for custom cleanup logic. |
| Restore focus on close | `Popup` handles internally |
| Custom ESC handling | `import { useEscapeKey } from '@/hooks/useEscapeKey'` |

---

## State Reset on Close

Always reset form/state when the modal closes:

```tsx
const handleClose = useCallback(() => {
  form.reset()   // React Hook Form
  onHide()
}, [form, onHide])
```

---

## Debounce Cleanup (Mandatory)

If the modal runs a debounced function:

```tsx
useEffect(() => {
  return () => { debouncedFn.cancel() }
}, [debouncedFn])
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/components/Popup/index.tsx` | Popup wrapper (wraps PrimeReact Dialog) |
| `src/components/ConfirmationModal/` | Reusable confirmation dialog |
| `src/hooks/useEscapeKey.ts` | ESC key handler hook |
| `src/hooks/useFocusOnVisible.ts` | Auto-focus hook |

---

## Pre-Delivery Checklist

- [ ] Import is `Popup` from `@/components/Popup`, not `Dialog`
- [ ] `onHide` prop always provided
- [ ] State/form reset on close
- [ ] Debounced functions cleaned up
- [ ] Icon-only buttons have `aria-label`
- [ ] Destructive actions use `ConfirmationModal` with `ButtonType.DELETE`
- [ ] Component under 300 lines (extract hook if approaching)
