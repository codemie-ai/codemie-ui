# Implementation Plan: WCAG 2.1 AA Accordion Focus Indicator Contrast

- **Jira Ticket:** [EPMCDME-8510](https://jiraeu.epam.com/browse/EPMCDME-8510) — `[1.4.11] The contrast ratio is failed for the accordions focus indicators`
- **Target Sub-Repository:** `codemie-ui`
- **Target Files:**
  - `codemie-ui/src/components/Accordion/Accordion.tsx`
  - `codemie-ui/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormAccordion.tsx`
  - `codemie-ui/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormNestedAccordion.tsx`
  - `codemie-ui/src/components/form/RadioButton/RadioButton.tsx`
- **Lead Role:** CodeMie Senior Staff Software Engineer & SDLC Lead
- **Accessibility Standards:** WCAG 2.1 AA **SC 1.4.11 Non-text Contrast** ($\ge 3:1$) & **SC 2.4.7 Focus Visible**

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Defect
When users navigate through accordion headers using keyboard controls (`Tab` / `Shift+Tab`) on pages such as **New Assistant** (`/#/assistants/new`) under **"Available Tools"** and **"External Tools"**:
1. Accordion headers (`<button class="p-accordion-header-link">` inside PrimeReact's `AccordionTab`) lack explicit Tailwind `focus-visible:ring-*` styles.
2. The browser / PrimeReact fallback focus ring defaults to `#373737` (or browser-default faint outline).
3. Against dark theme surfaces (`#1A1A1A` page background or `#212224` card background), `#373737` produces a contrast ratio of **1.51:1**, which fails the minimum WCAG 2.1 AA threshold of **3:1**.
4. Inside tool configuration modals, radio buttons for tool selection similarly lack high-contrast visible focus rings when focused via keyboard.

---

## 2. Scope & Affected Files

```
codemie-ui/
├── src/
│   ├── components/
│   │   ├── Accordion/
│   │   │   ├── Accordion.tsx                                   # Shared core Accordion (PassThrough ptPreset)
│   │   │   └── __tests__/Accordion.test.tsx                   # Unit test suite verifying focus-visible rings
│   │   └── form/
│   │       └── RadioButton/
│   │           └── RadioButton.tsx                             # Radio button focus indicator (modal tool selection)
│   └── pages/
│       └── assistants/
│           └── components/
│               └── AssistantForm/
│                   └── components/
│                       └── FormAccordion/
│                           ├── FormAccordion.tsx               # Top-level Assistant tool accordion
│                           └── FormNestedAccordion.tsx         # Nested accordion inside tool panels
```

---

## 3. Surgical Implementation Plan

### Step 3.1: Base Accordion Component
**File:** `codemie-ui/src/components/Accordion/Accordion.tsx`  

```tsx
      <AccordionTab
        pt={{
          headerAction: () =>
            'group hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent focus-visible:ring-inset rounded-lg transition-all duration-200',
          content: () => '!p-0',
          toggleableContent: () => '',
        }}
        header={(props) => (
          <div
            className={cn(
              'flex items-center justify-between gap-3 p-4 bg-surface-base-secondary transition hover:opacity-85 shadow-[0_1px_0_rgb(var(--colors-border-primary))]',
              'group-focus-visible:ring-2 group-focus-visible:ring-border-accent group-focus-visible:ring-inset rounded-lg'
            )}
          >
```

### Step 3.2: Assistant Form Top-Level Accordion
**File:** `codemie-ui/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormAccordion.tsx`  

```tsx
      <AccordionTab
        pt={{
          headerAction: () =>
            'hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent focus-visible:ring-inset rounded-t-lg',
        }}
```

### Step 3.3: Nested Form Accordion
**File:** `codemie-ui/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormNestedAccordion.tsx`  

```tsx
            headerAction: () =>
              'hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent focus-visible:ring-inset rounded-t-lg',
```

### Step 3.4: Tool Selection RadioButton
**File:** `codemie-ui/src/components/form/RadioButton/RadioButton.tsx`  

```tsx
    input: {
      className: 'peer absolute opacity-0 cursor-pointer z-10 w-full h-full left-0 top-0',
    },
    box: {
      className: twMerge(
        'transition border min-w-[18px] w-[18px] h-[18px] inline-block rounded-full relative',
        'after:content-[""] after:block after:w-[9px] after:h-[9px] after:absolute',
        'after:top-[50%] after:left-[50%] after:rounded-full after:transform after:-translate-x-1/2 after:-translate-y-1/2',
        'after:scale-0 after:transition-transform after:duration-100 after:ease-in',
        'border-text-primary after:bg-text-primary',
        props.checked && 'after:scale-100 border-text-primary after:!bg-border-accent',
        'group-hover:border-border-accent group-hover:after:bg-border-accent',
        'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-border-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-base-primary'
      ),
    },
```

---

## 4. Verification & Testing Strategy

### 4.1 Automated Unit Tests (Vitest + RTL)
Add a test in `codemie-ui/src/components/Accordion/__tests__/Accordion.test.tsx` verifying keyboard focus rings.
