# Reusable Components

> **Catalog of available reusable components in CodeMie UI**

## Overview

This document catalogs all global reusable React components available in `src/components/`.

For detailed implementation guidance, see [Component Patterns](./component-patterns.md).

---

## Layout & Structure

### Layout Components

- **`Layout/Layout.tsx`** - Main application layout wrapper (PageLayout + Sidebar)
- **`PageLayout.tsx`** - Standard page layout with header
- **`PageHeader/PageHeader.tsx`** - Page header with title and actions
- **`Sidebar/Sidebar.tsx`** - Collapsible sidebar component
- **`SidebarNavigation/SidebarNavigation.tsx`** - Navigation within sidebar

**Usage Example**:
```tsx
import Layout from '@/components/Layouts/Layout'

const MyPage = () => (
  <Layout>
    <PageHeader title="My Page" />
    {/* Page content */}
  </Layout>
)
```

---

## Buttons & Actions

### Button Components

- **`Button/Button.tsx`** - Primary button component
  - Variants: `base`, `primary`, `action`, `secondary`, `tertiary`, `delete`
  - Sizes: `small`, `medium`, `large`
- **`DropdownButton/DropdownButton.tsx`** - Button with dropdown menu
- **`TooltipButton/TooltipButton.tsx`** - Button with tooltip
- **`SelectButton/SelectButton.tsx`** - Button group selector

**Usage Example**:
```tsx
import Button from '@/components/Button'
import { ButtonType, ButtonSize } from '@/constants'

<Button
  variant={ButtonType.PRIMARY}
  size={ButtonSize.LARGE}
  onClick={handleClick}
>
  Click me
</Button>
```

---

## Form Components

Located in `src/components/form/`:

### Input Components

- **`Input/Input.tsx`** - Text input with label, error, hint support
- **`Textarea/Textarea.tsx`** - Multi-line text input
- **`Select/Select.tsx`** - Dropdown select
- **`MultiSelect/MultiSelect.tsx`** - Multiple selection dropdown
- **`Autocomplete/Autocomplete.tsx`** - Autocomplete input
- **`FormAutocomplete/FormAutocomplete.tsx`** - Form-integrated autocomplete

### Selection Components

- **`Checkbox.tsx`** - Checkbox input
- **`RadioButton/RadioButton.tsx`** - Radio button
- **`RadioGroup/RadioGroup.tsx`** - Radio button group
- **`Switch/Switch.tsx`** - Toggle switch

### File Upload Components

- **`File/File.tsx`** - File upload input
- **`FilesListInput/FilesListInput.tsx`** - Multiple file upload

### Special Components

- **`InputArray/InputArray.tsx`** - Dynamic array input
- **`InfoBox/InfoBox.tsx`** - Information display box
- **`VersionedField.tsx`** - Versioned field wrapper

**Usage Example**:
```tsx
import Input from '@/components/form/Input'

<Input
  name="username"
  label="Username"
  hint="Enter your username"
  error={errors.username}
  required
/>
```

---

## Feedback & Information

### Feedback Components

- **`Hint/Hint.tsx`** - Tooltip/hint component
- **`Spinner/Spinner.tsx`** - Loading spinner
- **`ProgressBar/ProgressBar.tsx`** - Progress indicator
- **`InfoWarning/InfoWarning.tsx`** - Warning/info message
- **`ConfirmationModal/ConfirmationModal.tsx`** - Confirmation dialog
- **`Popup/Popup.tsx`** - Generic popup/modal (ALWAYS USE THIS, NEVER Dialog)

**Usage Example**:
```tsx
import Spinner from '@/components/Spinner'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'

{loading && <Spinner />}

<InfoWarning type={InfoWarningType.WARNING}>
  This action cannot be undone
</InfoWarning>
```

---

## Data Display

### Display Components

- **`Table/Table.tsx`** - Data table with sorting
- **`TableCell.tsx`** - Table cell component
- **`SortIcon.tsx`** - Sort indicator icon
- **`EmptyList.tsx`** - Empty state display
- **`Card/Card.tsx`** - Card container
- **`Tabs/Tabs.tsx`** - Tab navigation
- **`TabPanel.tsx`** - Tab content panel

**Usage Example**:
```tsx
import Table from '@/components/Table'
import EmptyList from '@/components/EmptyList'

{items.length === 0 ? (
  <EmptyList message="No items found" />
) : (
  <Table data={items} columns={columns} />
)}
```

---

## Details Views

Located in `src/components/details/`:

- **`DetailsSidebar/DetailsSidebar.tsx`** - Details sidebar panel
- **`DetailsSidebarSection.tsx`** - Section within details sidebar
- **`DetailsProperty/DetailsProperty.tsx`** - Property display
- **`DetailsCopyField/DetailsCopyField.tsx`** - Copyable field

**Usage Example**:
```tsx
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsProperty from '@/components/details/DetailsProperty'

<DetailsSidebar>
  <DetailsProperty label="Name" value={item.name} />
  <DetailsProperty label="Status" value={item.status} />
</DetailsSidebar>
```

---

## Navigation & Filters

### Navigation Components

- **`Pagination/Pagination.tsx`** - Pagination controls
- **`Filters/Filters.tsx`** - Filter panel
- **`TabsMenu/TabsMenu.tsx`** - Tab menu
- **`NavigationMore/NavigationMore.tsx`** - More actions menu
- **`UserFilter/UserFilter.tsx`** - User filtering component

**Usage Example**:
```tsx
import Pagination from '@/components/Pagination'

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

---

## Utilities

### Utility Components

- **`Checker/Checker.tsx`** - Status checker
- **`Link/Link.tsx`** - Styled link component
- **`ProjectSelector/ProjectSelector.tsx`** - Project selection dropdown

---

## Tooltips

**Always use the global `react-tooltip` instance** — no imports, no extra components needed.

Add two attributes to any element:

```tsx
<span
  data-tooltip-id="react-tooltip"
  data-tooltip-content="Text to show in tooltip"
>
  ...
</span>
```

The global tooltip is mounted app-wide in `main.tsx` via `src/utils/tooltip.ts`.

> ❌ Never use `@/components/Tooltip` (PrimeReact) or `data-pr-tooltip` for new code.

---

## Complete Usage Example

```tsx
import React from 'react'
import Layout from '@/components/Layouts/Layout'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Card from '@/components/Card'
import Spinner from '@/components/Spinner'
import { ButtonType, ButtonSize } from '@/constants'

const MyFeaturePage: React.FC = () => {
  const [loading, setLoading] = useState(false)

  return (
    <Layout>
      <PageHeader
        title="My Feature"
        actions={
          <Button
            variant={ButtonType.PRIMARY}
            size={ButtonSize.MEDIUM}
            onClick={handleCreate}
          >
            Create New
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <Spinner />
        ) : (
          <Card className="p-6">
            <Input
              name="search"
              label="Search"
              hint="Enter search term"
            />
            {/* More content */}
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default MyFeaturePage
```

---

## Related Guides
- [Component Patterns](./component-patterns.md) - How to create components
- [Form Patterns](../patterns/form-patterns.md) - Using form components
- [Modal Patterns](../patterns/modal-patterns.md) - Using Popup component
- [Styling Guide](../styling/styling-guide.md) - Styling components
