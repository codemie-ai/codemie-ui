# Reusable Components Catalog — Factory Guide

All shared components live in `src/components/`. Import via `@/components/<Name>` alias.

---

## CRITICAL RULE — Modals

**Never** import `Dialog` from PrimeReact directly in feature code.
**Always** use `Popup` (or `ConfirmationModal` for confirmations).

The `Popup` component wraps PrimeReact `Dialog` internally and enforces project conventions
(keyboard handling, footer layout, accessibility).
See `src/components/Popup/Popup.tsx:16` — it imports Dialog; you never should.

---

## Component Catalog

### Layout & Structure

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| `Layout` | App shell: sidebar + page area | `@/components/Layouts/Layout` | `children` |
| `PageHeader` | Page title bar with action slot | `@/components/PageHeader` | `title`, `actions?: ReactNode` |
| `Sidebar` | Collapsible left nav | `@/components/Sidebar` | internal, used by Layout |
| `SidebarNavigation` | Nav links inside sidebar | `@/components/SidebarNavigation` | internal |

---

### Buttons & Actions

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| `Button` | Primary action button | `@/components/Button` | `type`, `variant`, `size`, `disabled`, `isLoading`, `buttonType` |
| `DropdownButton` | Button with dropdown menu | `@/components/DropdownButton` | varies |
| `TooltipButton` | Button that shows a tooltip | `@/components/TooltipButton` | varies |
| `SelectButton` | Segmented button group | `@/components/SelectButton` | varies |

`Button` variants (from `ButtonType` constant): `base`, `primary`, `action`, `secondary`, `tertiary`, `delete`.
`Button` sizes (from `ButtonSize` constant): `small`, `medium`, `large`.
Real reference: `src/components/Button/Button.tsx:30–38` (ButtonProps interface).

Usage pattern:
```tsx
import Button from '@/components/Button'
import { ButtonType, ButtonSize } from '@/constants'
<Button variant={ButtonType.PRIMARY} size={ButtonSize.MEDIUM} onClick={handleClick}>Label</Button>
```

---

### Modals & Feedback

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| **`Popup`** | **Generic modal — ALWAYS USE THIS** | `@/components/Popup` | `visible`, `onHide`, `header?`, `onSubmit?`, `submitText?`, `hideFooter?`, `footerContent?`, `headerContent?`, `children` |
| `ConfirmationModal` | Destructive-action confirm dialog | `@/components/ConfirmationModal` | `visible`, `header`, `message`, `onConfirm`, `onCancel`, `confirmText?`, `confirmButtonType?` |
| `Spinner` | Loading indicator | `@/components/Spinner` | `className?`, `inline?` |
| `InfoWarning` | Inline info/warning banner | `@/components/InfoWarning` | `message`, `type?` (`InfoWarningType` enum), `header?` |
| `ProgressBar` | Progress indicator | `@/components/ProgressBar` | varies |

`Popup` full props defined at: `src/components/Popup/Popup.tsx:25–51`
`ConfirmationModal` props at: `src/components/ConfirmationModal/ConfirmationModal.tsx:24–39`

Popup usage pattern:
```tsx
import Popup from '@/components/Popup'
<Popup visible={isOpen} onHide={() => setOpen(false)} header='Title' onSubmit={handleSubmit}>
  {/* modal body */}
</Popup>
```

ConfirmationModal usage pattern:
```tsx
import ConfirmationModal from '@/components/ConfirmationModal'
<ConfirmationModal
  visible={showConfirm} header='Delete item?' message='This cannot be undone.'
  onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} />
```

---

### Form Inputs (`src/components/form/`)

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| `Input` | Text input | `@/components/form/Input` | `name`, `label?`, `hint?`, `error?`, `required?`, `leftIcon?`, `rightIcon?`, `orientation?` |
| `Textarea` | Multi-line text | `@/components/form/Textarea` | `name`, `label?`, `error?` |
| `Select` | Dropdown select | `@/components/form/Select` | varies |
| `MultiSelect` | Multi-value select | `@/components/form/MultiSelect` | varies |
| `Autocomplete` | Autocomplete input | `@/components/form/Autocomplete` | varies |
| `Checkbox` | Checkbox | `@/components/form/Checkbox` | varies |
| `RadioButton` | Single radio | `@/components/form/RadioButton` | varies |
| `RadioGroup` | Radio group | `@/components/form/RadioGroup` | varies |
| `Switch` | Toggle switch | `@/components/form/Switch` | varies |
| `File` | File upload | `@/components/form/File` | varies |
| `FilesListInput` | Multi-file upload | `@/components/form/FilesListInput` | varies |
| `InputArray` | Dynamic list input | `@/components/form/InputArray` | varies |
| `InfoBox` | Info display inside form | `@/components/form/InfoBox` | varies |

`Input` full props at: `src/components/form/Input/Input.tsx:22–48`

---

### Data Display

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| `Card` | Entity card (title, avatar, actions) | `@/components/Card` | `title`, `description`, `avatar`, `onClick`, `id`, `actions?`, `status?`, `label?` |
| `Table` | Sortable data table | `@/components/Table` | `data`, `columns` |
| `EmptyList` | Empty-state placeholder | `@/components/Table` (same dir, `EmptyList.tsx`) | `message` |
| `Tabs` | Tab navigation + content | `@/components/Tabs` | `tabs`, `activeTab?`, `onChange?`, `isSmall?`, `headerContent?` |
| `Pagination` | Page controls | `@/components/Pagination` | `currentPage`, `totalPages`, `setPage`, `perPage?` |

`Card` props at: `src/components/Card/Card.tsx:26–36`
`Tabs`/`Tab` interfaces at: `src/components/Tabs/Tabs.tsx:22–40`
`Pagination` props at: `src/components/Pagination/Pagination.tsx:27–35`

---

### Details Views (`src/components/details/`)

| Component | Purpose | Import path |
|---|---|---|
| `DetailsSidebar` | Slide-in details panel | `@/components/details/DetailsSidebar` |
| `DetailsProperty` | Label + value row | `@/components/details/DetailsProperty` |
| `DetailsCopyField` | Copyable value row | `@/components/details/DetailsCopyField` |

---

### Navigation & Filters

| Component | Purpose | Import path | Key props |
|---|---|---|---|
| `Filters` | Filter panel | `@/components/Filters` | varies |
| `TabsMenu` | Tab-style menu | `@/components/TabsMenu` | varies |
| `NavigationMore` | Overflow actions menu | `@/components/NavigationMore` | varies |
| `UserFilter` | User picker filter | `@/components/UserFilter` | varies |

---

### Tooltips

Use the **global react-tooltip instance** — no import or extra component required.

```tsx
<span data-tooltip-id='react-tooltip' data-tooltip-content='Text to show'>...</span>
```

The global instance is mounted in `src/utils/tooltip.ts` and registered in `main.tsx`.

**Never** use `@/components/Tooltip` (PrimeReact) or `data-pr-tooltip` in new code.

---

## Utility Components

| Component | Purpose | Import path | Notes |
|---|---|---|---|
| `Checker` | Status/health check display | `@/components/Checker` | varies |
| `Link` | Styled anchor | `@/components/Link` | wraps React Router `Link` |
| `ProjectSelector` | Project-scope dropdown | `@/components/ProjectSelector` | varies |
| `Hint` | Inline tooltip hint icon | `@/components/Pagination` (same dir) | `Hint.tsx` |

---

## Accessing Real Component Sources

When in doubt about exact prop names or types, read the interface directly:

| Component | Props interface location |
|---|---|
| `Popup` | `src/components/Popup/Popup.tsx:25` |
| `Button` | `src/components/Button/Button.tsx:30` |
| `Input` | `src/components/form/Input/Input.tsx:22` |
| `Card` | `src/components/Card/Card.tsx:26` |
| `Tabs` | `src/components/Tabs/Tabs.tsx:22` |
| `Pagination` | `src/components/Pagination/Pagination.tsx:27` |
| `ConfirmationModal` | `src/components/ConfirmationModal/ConfirmationModal.tsx:24` |
| `Spinner` | `src/components/Spinner/Spinner.tsx:21` |
| `InfoWarning` | `src/components/InfoWarning/InfoWarning.tsx:20` |

---

## Choosing Between Popup and ConfirmationModal

| Situation | Use |
|---|---|
| Generic form, settings, detail view in overlay | `Popup` |
| User about to perform a destructive or irreversible action | `ConfirmationModal` |
| Need custom footer buttons or non-standard layout | `Popup` with `footerContent` prop |
| Simple yes/no with a single message string | `ConfirmationModal` |

`ConfirmationModal` internally uses `Popup` — it is a thin wrapper with an icon, standard
header/message layout, and preset confirm/cancel buttons.

---

## DO / DON'T

| Scenario | DON'T | DO |
|---|---|---|
| Modal / dialog | `import { Dialog } from 'primereact/dialog'` | `import Popup from '@/components/Popup'` |
| Destructive confirm | Custom modal with yes/no buttons | `ConfirmationModal` |
| Loading state | Custom spinner HTML | `<Spinner />` |
| Empty list | Custom empty-state JSX inline | `<EmptyList message='...' />` |
| Tooltip | `data-pr-tooltip` / PrimeReact Tooltip | `data-tooltip-id='react-tooltip'` attribute |
| Form input | Raw `<input>` element | `Input` from `@/components/form/Input` |
| Button variant | Hardcoded string `type='primary'` | `ButtonType.PRIMARY` from `@/constants` |
| Error/warning message | Custom div with border | `InfoWarning` with `InfoWarningType` enum |
| Tab navigation | Raw `<button>` tab row | `Tabs` component from `@/components/Tabs` |
