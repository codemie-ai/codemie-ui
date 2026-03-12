# Modal Patterns

> **CRITICAL GUIDE: Always use Popup component for modals**

## 🚨 CRITICAL RULE

**NEVER import or use PrimeReact's `Dialog` component directly.**

All modals MUST use the `Popup` component wrapper.

---

## Table of Contents
1. [Why Use Popup?](#why-use-popup)
2. [Popup Component Interface](#popup-component-interface)
3. [Pattern 1: Simple Modal](#pattern-1-simple-modal-with-default-footer)
4. [Pattern 2: Custom Footer](#pattern-2-modal-with-custom-footer)
5. [Pattern 3: Confirmation Modal](#pattern-3-confirmation-modal)
6. [Pattern 4: Modal with Custom Hook](#pattern-4-modal-with-custom-hook)
7. [Common Mistakes](#common-mistakes-to-avoid)
8. [Best Practices](#modal-best-practices)

---

## Why Use Popup?

### Benefits

1. ✅ **Consistency** - Ensures all modals look and behave the same
2. ✅ **Built-in Features** - ESC key handling, focus management, consistent styling
3. ✅ **Maintainability** - Single source of truth for modal behavior
4. ✅ **Accessibility** - Proper ARIA attributes and keyboard navigation
5. ✅ **Project Standards** - Required by project conventions

### What You Get

- Automatic ESC key handling
- Click outside to close (configurable)
- Consistent header/footer styling
- Built-in close button
- Proper focus management
- Responsive sizing
- Theme-aware styling

---

## Popup Component Interface

```tsx
interface PopupProps {
  // Visibility & Control
  visible?: boolean              // Show/hide modal
  onHide: () => void            // Required: Close handler
  onSubmit?: () => void         // Optional: Submit handler

  // Header
  header?: string               // Simple header text (HTML supported)
  headerContent?: ReactNode     // Custom header component
  hideClose?: boolean           // Hide close button

  // Footer
  hideFooter?: boolean          // Hide entire footer
  footerContent?: ReactNode     // Custom footer component
  submitText?: string           // Default: 'Create'
  submitDisabled?: boolean      // Disable submit button
  cancelText?: string           // Default: 'Cancel'
  cancelButtonType?: ButtonType // Cancel button variant
  submitButtonType?: ButtonType // Submit button variant

  // Styling
  className?: string            // Modal container styles
  bodyClassName?: string        // Body content styles
  overlayClassName?: string     // Backdrop overlay styles
  isFullWidth?: boolean         // Full width modal
  limitWidth?: boolean          // Limit to max-w-lg
  withBorder?: boolean          // Border on header (default: true)
  withBorderBottom?: boolean    // Border on footer (default: true)

  // Behavior
  dismissableMask?: boolean     // Click outside to close (default: true)
  children?: ReactNode          // Modal body content
}
```

---

## Pattern 1: Simple Modal with Default Footer

Use when you need a standard modal with submit/cancel buttons.

```tsx
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

const SimpleModal = ({ visible, onHide, onSave }) => {
  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Edit Item"
      submitText="Save Changes"
      onSubmit={onSave}
      submitButtonType={ButtonType.PRIMARY}
    >
      <div className="flex flex-col gap-4">
        <p>Your form fields here</p>
      </div>
    </Popup>
  )
}
```

### When to Use
- Standard forms with submit/cancel
- Simple data entry
- Edit dialogs

---

## Pattern 2: Modal with Custom Footer

Use when you need custom footer layout or additional buttons.

```tsx
const CustomFooterModal = ({ visible, onHide, onSubmit, isSubmitting }) => {
  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        variant={ButtonType.SECONDARY}
        onClick={onHide}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        variant={ButtonType.PRIMARY}
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Custom Footer Modal"
      footerContent={footerContent}
      className="w-[800px]"
    >
      <form>
        {/* Form content */}
      </form>
    </Popup>
  )
}
```

### When to Use
- Complex footer layouts
- Multiple action buttons
- Custom button arrangements
- Loading states in buttons

---

## Pattern 3: Confirmation Modal

Use for delete confirmations or destructive actions.

```tsx
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'

const DeleteConfirmation = ({ visible, onCancel, onConfirm, itemName }) => {
  return (
    <ConfirmationModal
      visible={visible}
      onCancel={onCancel}
      onConfirm={onConfirm}
      header="Delete Item"
      message={`Are you sure you want to delete "${itemName}"?`}
      confirmText="Delete"
      confirmButtonType={ButtonType.DELETE}
      limitWidth
    />
  )
}
```

### When to Use
- Delete confirmations
- Destructive actions
- Warning dialogs
- Simple yes/no decisions

---

## Pattern 4: Modal with Custom Hook

Use when modal has complex logic that should be extracted.

### Custom Hook

```tsx
// useMyModal.ts
import { useState, useCallback, useRef } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'

export const useMyModal = (visible: boolean, onHide: () => void) => {
  const [formData, setFormData] = useState({})
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClose = useCallback(() => {
    setFormData({})
    onHide()
  }, [onHide])

  // Auto-focus first input when modal opens
  useFocusOnVisible(inputRef, visible)

  // Additional ESC handling if needed (Popup has built-in ESC)
  useEscapeKey(handleClose, visible)

  return { formData, setFormData, inputRef, handleClose }
}
```

### Component Using Hook

```tsx
// MyModal.tsx
import Popup from '@/components/Popup'
import { useMyModal } from './useMyModal'

const MyModal = ({ visible, onHide }) => {
  const { formData, setFormData, inputRef, handleClose } = useMyModal(visible, onHide)

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header="My Modal"
      hideFooter
    >
      <Input ref={inputRef} {...formData} />
    </Popup>
  )
}
```

### When to Use
- Complex modal logic
- State management needs
- Multiple effects (focus, keyboard, cleanup)
- Reusable modal behaviors

---

## Common Mistakes to Avoid

### ❌ WRONG: Using Dialog Directly

```tsx
// ❌ NEVER DO THIS
import { Dialog } from 'primereact/dialog'

<Dialog visible={visible} onHide={onHide}>
  Content
</Dialog>
```

### ✅ CORRECT: Using Popup

```tsx
// ✅ ALWAYS DO THIS
import Popup from '@/components/Popup'

<Popup visible={visible} onHide={onHide} header="Title">
  Content
</Popup>
```

---

### ❌ WRONG: Custom Modal Header/Footer Components

```tsx
// ❌ DON'T CREATE SEPARATE HEADER/FOOTER COMPONENTS
import CustomModalHeader from './CustomModalHeader'
import CustomModalFooter from './CustomModalFooter'

<Dialog>
  <CustomModalHeader />
  Content
  <CustomModalFooter />
</Dialog>
```

### ✅ CORRECT: Use Popup Props

```tsx
// ✅ USE POPUP'S BUILT-IN PROPS
const footerContent = <div>Custom footer JSX</div>

<Popup
  header="Title"
  footerContent={footerContent}
>
  Content
</Popup>
```

---

## Modal Best Practices

### 1. Always Use Popup Component
Never import or use `Dialog` directly from PrimeReact.

### 2. Extract Complex Logic to Custom Hooks
Keep modal components simple by moving logic to hooks.

```tsx
// ✅ GOOD
const MyModal = ({ visible, onHide }) => {
  const { state, handlers } = useMyModal(visible, onHide)
  return <Popup {...props}>{content}</Popup>
}

// ❌ BAD: All logic in component
const MyModal = ({ visible, onHide }) => {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  // ... 100+ lines of logic
  return <Popup {...props}>{content}</Popup>
}
```

### 3. Use Built-in Header/Footer Props
Don't create separate header/footer components.

```tsx
// ✅ GOOD
<Popup
  header="Title"
  footerContent={<CustomFooter />}
>
```

### 4. Clean Up Side Effects
Cancel debounced functions, timers, etc.

```tsx
useEffect(() => {
  return () => {
    debouncedFunction.cancel() // MANDATORY
  }
}, [debouncedFunction])
```

### 5. Manage Focus
Use `useFocusOnVisible` for first input.

```tsx
const inputRef = useRef<HTMLInputElement>(null)
useFocusOnVisible(inputRef, visible)
```

### 6. Handle Keyboard Events
Popup has built-in ESC handling. Only use `useEscapeKey` if you need custom behavior.

### 7. Reset State on Close
Clear form data when modal closes.

```tsx
const handleClose = useCallback(() => {
  setFormData({})
  onHide()
}, [onHide])
```

### 8. Use ConfirmationModal for Confirmations
For delete/confirm actions, use the specialized component.

```tsx
<ConfirmationModal
  visible={visible}
  onConfirm={handleDelete}
  confirmButtonType={ButtonType.DELETE}
/>
```

---

## Complete Example

```tsx
// UserEditModal.tsx
import React from 'react'
import Popup from '@/components/Popup'
import Input from '@/components/form/Input'
import { ButtonType } from '@/constants'
import { useUserEditModal } from './useUserEditModal'

interface UserEditModalProps {
  visible: boolean
  onHide: () => void
  userId: string
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  visible,
  onHide,
  userId
}) => {
  const {
    formData,
    loading,
    inputRef,
    handleChange,
    handleSubmit,
    handleClose
  } = useUserEditModal(visible, onHide, userId)

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header="Edit User"
      submitText="Save Changes"
      submitDisabled={loading}
      onSubmit={handleSubmit}
      submitButtonType={ButtonType.PRIMARY}
      limitWidth
    >
      <div className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          name="name"
          label="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
    </Popup>
  )
}

export default UserEditModal
```

---

## Related Guides
- [Component Patterns](../components/component-patterns.md) - Basic component structure
- [Custom Hooks](./custom-hooks.md) - Creating custom hooks
- [Form Patterns](./form-patterns.md) - Form handling
- [Styling Guide](../styling/styling-guide.md) - Tailwind classes
