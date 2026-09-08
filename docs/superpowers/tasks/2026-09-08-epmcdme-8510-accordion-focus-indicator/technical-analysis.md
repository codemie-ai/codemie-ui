# Technical Analysis - WCAG 2.1 AA Accordion & Radio Button Focus Contrast

- **Jira Ticket:** EPMCDME-8510
- **Focus:** WCAG SC 1.4.11 Non-text Contrast & SC 2.4.7 Focus Visible

## Codebase Findings
1. The shared `Accordion` component (`src/components/Accordion/Accordion.tsx`) does not set any custom `pt.headerAction` classes to override default focus borders.
2. In the `AssistantForm` pages, custom accordions `FormAccordion` and `FormNestedAccordion` both define `pt.headerAction` simply returning `hover:no-underline`, omitting focus outline highlights.
3. The `RadioButton` component (`src/components/form/RadioButton/RadioButton.tsx`) renders a styled round container while hiding the actual input with `opacity-0`, meaning the visual box remains unhighlighted during keyboard focus.

## Risk Indicators
- None. Minor styling adjustments with backward compatibility.
