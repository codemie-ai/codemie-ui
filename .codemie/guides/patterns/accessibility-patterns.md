# Accessibility Patterns

> **ARIA attributes, keyboard navigation, and accessibility best practices for CodeMie UI**

## Table of Contents
1. [Accessibility Principles](#accessibility-principles)
2. [ARIA Attributes](#aria-attributes)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Focus Management](#focus-management)
5. [Semantic HTML](#semantic-html)
6. [Screen Reader Support](#screen-reader-support)
7. [Color and Contrast](#color-and-contrast)
8. [Common Patterns](#common-patterns)

---

## Accessibility Principles

### WCAG 2.1 Level AA Compliance

CodeMie UI aims for WCAG 2.1 Level AA compliance:
- ✅ Perceivable: Users can perceive information
- ✅ Operable: Users can operate the interface
- ✅ Understandable: Users can understand the content
- ✅ Robust: Content works across technologies

### Core Requirements

1. **Keyboard Accessible**: All functionality available via keyboard
2. **Screen Reader Friendly**: Proper ARIA labels and roles
3. **Focus Visible**: Clear focus indicators
4. **Color Independent**: Information not conveyed by color alone
5. **Text Alternatives**: Alt text for images and icons

---

## ARIA Attributes

### Common ARIA Attributes

#### aria-label

Use when visible text doesn't convey meaning:

```tsx
// ✅ Good: Icon button with aria-label
<Button
  variant="action"
  aria-label="Start chat"
  onClick={handleChatClick}
>
  <ChatSvg />
</Button>

// ❌ Bad: Icon button without label
<Button onClick={handleChatClick}>
  <ChatSvg />
</Button>
```

#### aria-labelledby

Link element to its label:

```tsx
<div>
  <h3 id="dialog-title">Confirm Delete</h3>
  <Popup
    visible={visible}
    aria-labelledby="dialog-title"
  >
    <p>Are you sure you want to delete this item?</p>
  </Popup>
</div>
```

#### aria-describedby

Provide additional description:

```tsx
<div>
  <Input
    id="password"
    type="password"
    aria-describedby="password-requirements"
  />
  <span id="password-requirements">
    Password must be at least 8 characters
  </span>
</div>
```

#### aria-expanded

Indicate expandable content state:

```tsx
const [isExpanded, setIsExpanded] = useState(false)

<button
  aria-expanded={isExpanded}
  aria-controls="content-panel"
  onClick={() => setIsExpanded(!isExpanded)}
>
  Toggle Content
</button>
<div id="content-panel" hidden={!isExpanded}>
  {/* Content */}
</div>
```

#### aria-hidden

Hide decorative elements from screen readers:

```tsx
// ✅ Good: Hide decorative SVG
<div>
  <GradientSvg aria-hidden="true" />
  <span>Important content</span>
</div>

// Use when element is purely visual
<div className="decorative-line" aria-hidden="true" />
```

#### aria-live

Announce dynamic content updates:

```tsx
// For status messages
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For errors (immediate announcement)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

### ARIA Roles

```tsx
// Navigation
<nav role="navigation" aria-label="Main navigation">
  {/* Navigation items */}
</nav>

// Search
<div role="search">
  <Input placeholder="Search..." />
</div>

// Alert
<div role="alert" aria-live="assertive">
  Error: Failed to save changes
</div>

// Dialog
<Popup
  visible={visible}
  role="dialog"
  aria-modal="true"
>
  {/* Dialog content */}
</Popup>

// Tab panels
<div role="tablist">
  <button role="tab" aria-selected={true}>Tab 1</button>
  <button role="tab" aria-selected={false}>Tab 2</button>
</div>
<div role="tabpanel">{/* Content */}</div>
```

---

## Keyboard Navigation

### Standard Keyboard Patterns

| Key | Action |
|-----|--------|
| **Tab** | Move focus forward |
| **Shift + Tab** | Move focus backward |
| **Enter** | Activate button/link |
| **Space** | Activate button, toggle checkbox |
| **Escape** | Close modal/popup |
| **Arrow Keys** | Navigate within component (lists, menus) |
| **Home** | Move to first item |
| **End** | Move to last item |

### Focus Management in Modals

```tsx
import { useEffect, useRef } from 'react'

const MyModal: React.FC<{ visible: boolean; onHide: () => void }> = ({
  visible,
  onHide
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (visible) {
      // Save current focus
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus first focusable element in modal
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      firstFocusable?.focus()
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus()
    }
  }, [visible])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onHide()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onHide])

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      ref={modalRef}
      aria-modal="true"
      role="dialog"
    >
      {/* Modal content */}
    </Popup>
  )
}
```

### Focus Trap in Modal

```tsx
const useFocusTrap = (ref: React.RefObject<HTMLElement>, active: boolean) => {
  useEffect(() => {
    if (!active) return

    const element = ref.current
    if (!element) return

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)
    return () => element.removeEventListener('keydown', handleTabKey)
  }, [ref, active])
}
```

### Skip Links

```tsx
// Add skip link for keyboard users
const Layout: React.FC = ({ children }) => {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary-500 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  )
}
```

---

## Focus Management

### Focus Styles

**MANDATORY**: Always provide visible focus indicators

```tsx
// ✅ Good: Visible focus with Tailwind
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
  Click me
</button>

// ❌ Bad: No focus indicator
<button className="outline-none">
  Click me
</button>
```

### Programmatic Focus

```tsx
const MyComponent = () => {
  const inputRef = useRef<HTMLInputElement>(null)

  const focusInput = () => {
    inputRef.current?.focus()
  }

  return (
    <>
      <Button onClick={focusInput}>Focus Input</Button>
      <Input ref={inputRef} placeholder="Type here" />
    </>
  )
}
```

### Focus on Error

```tsx
const MyForm = () => {
  const errorRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      // Focus error message for screen readers
      errorRef.current?.focus()
    }
  }, [error])

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="text-error"
        >
          {error}
        </div>
      )}
      {/* Form fields */}
    </form>
  )
}
```

---

## Semantic HTML

### Use Semantic Elements

```tsx
// ✅ Good: Semantic HTML
<nav>
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Article Title</h1>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>&copy; 2025 CodeMie</p>
</footer>

// ❌ Bad: Divs everywhere
<div className="nav">
  <div className="list">
    <div><div onClick={handleClick}>Home</div></div>
  </div>
</div>
```

### Heading Hierarchy

```tsx
// ✅ Good: Proper heading hierarchy
<h1>Page Title</h1>
<section>
  <h2>Section Title</h2>
  <h3>Subsection Title</h3>
</section>

// ❌ Bad: Skipping levels
<h1>Page Title</h1>
<h4>Section Title</h4>  {/* Skipped h2, h3 */}
```

### Lists

```tsx
// ✅ Good: Semantic lists
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<ol>
  <li>Step 1</li>
  <li>Step 2</li>
</ol>

// ❌ Bad: Div soup
<div>
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## Screen Reader Support

### Image Alt Text

```tsx
// ✅ Good: Descriptive alt text
<img src="assistant.png" alt="AI Assistant avatar showing a robot icon" />

// ✅ Good: Decorative images
<img src="gradient.png" alt="" role="presentation" />
<GradientSvg aria-hidden="true" />

// ❌ Bad: Missing alt
<img src="assistant.png" />

// ❌ Bad: Redundant alt
<img src="assistant.png" alt="image of assistant" />
```

### Icon Labels

```tsx
// ✅ Good: SVG icons with labels
<Button aria-label="Delete item">
  <TrashSvg aria-hidden="true" />
</Button>

// Or with visible text
<Button>
  <TrashSvg aria-hidden="true" />
  <span>Delete</span>
</Button>

// ❌ Bad: Icon without label
<Button>
  <TrashSvg />
</Button>
```

### Visually Hidden Text

```tsx
// Utility class for screen reader only text
// Add to tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      // ...
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
      })
    }
  ]
}

// Usage
<span className="sr-only">Additional context for screen readers</span>
```

---

## Color and Contrast

### Contrast Ratios

**WCAG AA Requirements**:
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

```tsx
// ✅ Good: Sufficient contrast
<p className="text-text-primary">  {/* Dark text on light background */}
  Content
</p>

// ❌ Bad: Low contrast
<p className="text-gray-300">  {/* Light gray on white */}
  Hard to read
</p>
```

### Don't Rely on Color Alone

```tsx
// ✅ Good: Color + icon + text
<div className={cn(
  'flex items-center gap-2',
  status === 'error' ? 'text-error' : 'text-success'
)}>
  {status === 'error' ? <ErrorSvg /> : <SuccessSvg />}
  <span>{status === 'error' ? 'Failed' : 'Success'}</span>
</div>

// ❌ Bad: Color only
<div className={status === 'error' ? 'text-red-500' : 'text-green-500'}>
  {message}
</div>
```

---

## Common Patterns

### Accessible Button

```tsx
interface AccessibleButtonProps {
  children: React.ReactNode
  onClick: () => void
  ariaLabel?: string
  disabled?: boolean
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  ariaLabel,
  disabled = false
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        'px-4 py-2 rounded',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}
```

### Accessible Form

```tsx
const AccessibleForm: React.FC = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="username" className="block mb-2">
          Username
          <span className="text-error ml-1" aria-label="required">*</span>
        </label>
        <Input
          id="username"
          name="username"
          aria-required="true"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
        />
        {errors.username && (
          <span id="username-error" className="text-error text-sm" role="alert">
            {errors.username}
          </span>
        )}
      </div>

      <Button type="submit">
        Submit Form
      </Button>
    </form>
  )
}
```

### Accessible Tabs

```tsx
const AccessibleTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['Tab 1', 'Tab 2', 'Tab 3']

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      setActiveTab((index + 1) % tabs.length)
    } else if (e.key === 'ArrowLeft') {
      setActiveTab((index - 1 + tabs.length) % tabs.length)
    } else if (e.key === 'Home') {
      setActiveTab(0)
    } else if (e.key === 'End') {
      setActiveTab(tabs.length - 1)
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            id={`tab-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'px-4 py-2',
              activeTab === index && 'border-b-2 border-primary-500'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
        >
          Content for {tab}
        </div>
      ))}
    </div>
  )
}
```

### Accessible Dropdown

```tsx
const AccessibleDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const options = ['Option 1', 'Option 2', 'Option 3']

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + options.length) % options.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelect(options[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div>
      <button
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        Select option
      </button>
      {isOpen && (
        <ul role="listbox" tabIndex={-1}>
          {options.map((option, index) => (
            <li
              key={index}
              role="option"
              aria-selected={selectedIndex === index}
              onClick={() => handleSelect(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Testing Accessibility

### Manual Testing

1. **Keyboard Navigation**
   - Can you reach all interactive elements with Tab?
   - Can you activate buttons with Enter/Space?
   - Can you close modals with Escape?

2. **Screen Reader**
   - Test with VoiceOver (Mac) or NVDA (Windows)
   - Are all elements announced correctly?
   - Is navigation logical?

3. **Color Contrast**
   - Use browser DevTools color contrast checker
   - Verify all text meets WCAG AA standards

### Automated Testing

```tsx
// Using jest-axe
import { axe } from 'jest-axe'
import { render } from '@testing-library/react'

describe('MyComponent accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<MyComponent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

---

## Quick Reference Checklist

### Before Shipping a Component

- [ ] All interactive elements keyboard accessible
- [ ] All buttons/links have visible focus indicators
- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Error messages announced with `role="alert"`
- [ ] Modals trap focus and restore on close
- [ ] Modals close with Escape key
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Images have alt text (or `alt=""` if decorative)
- [ ] Decorative SVGs have `aria-hidden="true"`
- [ ] Color is not the only means of conveying information
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] Semantic HTML used where appropriate
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Lists use `<ul>`, `<ol>`, or `<dl>`
- [ ] Screen reader tested with VoiceOver/NVDA

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Last Updated**: 2025-12-04
**Related Guides**:
- [Component Patterns](../components/component-patterns.md)
- [Form Patterns](./form-patterns.md)
- [Modal Patterns](./modal-patterns.md)
