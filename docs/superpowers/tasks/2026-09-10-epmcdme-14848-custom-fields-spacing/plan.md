# EPMCDME-14848 — Jira Custom Fields Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Jira "Custom fields (optional)" multiselect breathing room — inside the control and above it — without touching any shared styling.

**Architecture:** Both fixes are expressed as Tailwind classes passed from the two page-layer files. The inner spacing goes through `inputClassName`, which `MultiSelect.tsx:391` merges last via `cn` (`twMerge`), so it wins over the size class `h-8 max-h-8`. Beating the global SCSS needs the `!` modifier: `src/main.tsx` imports `main.scss` (line 29, `@tailwind utilities`) *before* `vue_components.scss` (line 30), so `.p-multiselect { h-[34px] }` and `.p-multiselect-label { truncate py-0 }` win at equal specificity on source order. Arbitrary-variant + `!` is the established repo escape hatch (`src/components/Table/Table.tsx:39` `[&_th]:!py-3`, `src/components/guardrails/selectors/GuardrailAssignmentModeSelector.tsx:54`).

**Tech Stack:** React 18, TypeScript, Tailwind 3, PrimeReact MultiSelect, Vitest + React Testing Library (`unit` project).

**Spec:** none — requirements were supplied inline; see Acceptance criteria below.

## Global Constraints

- Scope is **only** `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx` and `IndexTypeJira.tsx`. Do **not** edit `ptPreset.ts`, `ChipWrapper.tsx`, `MultiSelect.tsx`, or `vue_components.scss` — they are shared with 30+ consumers and the Keycloak theme.
- Tailwind utilities only; no new `.scss`. Predefined spacing scale only — no `mt-[20px]`-style arbitrary *values* (arbitrary *variants* like `[&_.p-multiselect-label]:` are fine and precedented).
- No colour classes may be added or changed; chips already use theme tokens and must keep adapting to dark theme.
- Formatting is automatic (PostToolUse prettier + eslint --fix) — never add a step to run them.
- Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] Selected chips are not cramped or visually merged; the control grows to fit wrapped chip rows instead of clipping them.
- [ ] The custom fields control has spacing consistent with the rest of the datasource form.
- [ ] Visible extra vertical space between "Model used for embeddings" and "Custom fields (optional)".
- [ ] Works in both create and edit flows (both render the same `DataSourceForm`, so one change covers both).
- [ ] Correct in dark theme.
- [ ] No rendered-output change for any other multiselect or datasource input.

---

### Task 1: Scoped inner spacing for the custom fields control

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx:137-158`
- Create: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/__tests__/JiraCustomFieldsField.test.tsx`

**Interfaces:**
- Consumes: `MultiSelect`'s existing `inputClassName?: string` prop (`MultiSelect.tsx:89`), applied to the PrimeReact root at line 391.
- Produces: nothing consumed by Task 2 beyond the same test file, which Task 2 extends.

**Test-first: yes** — a test rendering `JiraCustomFieldsField` inside a `useForm` wrapper with two selected values asserts the `.p-multiselect` element's `className` contains `!h-auto`, `!max-h-none`, `min-h-11` and the `[&_.p-multiselect-label]:!overflow-visible` variant; it fails today because no `inputClassName` is passed.

- [ ] **Step 1: Write the failing test.** New file above. Render the component through a small harness that calls `useForm<FormValues>({ defaultValues: { jiraCustomFields: ['customfield_1', 'customfield_2'], setting_id: 's1' } })` and passes `control`, `errors={{}}`, `projectName="p"`, `availableSettings={[{ id: 's1' }]}`. Query `container.querySelector('.p-multiselect')` and assert its `className` contains each of: `!h-auto`, `!max-h-none`, `min-h-11`, `[&_.p-multiselect-label]:!py-1.5`, `[&_.p-multiselect-label]:!overflow-visible`, `[&_.p-multiselect-label]:!whitespace-normal`, `[&_.p-multiselect-label]:!gap-2`. Mock `@/store/dataSources`'s `getJiraFields` to resolve `[]` so the fetch effect is inert.
- [ ] **Step 2: Run it and confirm it fails.** `npx vitest run --project unit src/pages/dataSources/components/DataSourceForm/IndexTypeField/__tests__/JiraCustomFieldsField.test.tsx` — expect the className assertion to fail.
- [ ] **Step 3: Add the prop.** On the `MultiSelect` element, add a single `inputClassName` with exactly the classes asserted above. `!h-auto !max-h-none min-h-11` releases the three competing height rules so wrapped chip rows are not clipped; the label variants restore the vertical padding and wrapping that SCSS `py-0` + `truncate` removed, and keep the 8px chip gap. Change nothing else — no colours, no `size`, no `selectedItemTemplate` classes.
- [ ] **Step 4: Re-run the test and confirm it passes.**
- [ ] **Step 5: Commit.**

---

### Task 2: Vertical rhythm around the field

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx:140` (remove `className="mb-3"`)
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeJira.tsx:77-82` (wrap the field)
- Test: extend `__tests__/JiraCustomFieldsField.test.tsx` from Task 1

**Interfaces:**
- Consumes: the test harness written in Task 1.
- Produces: nothing.

**Test-first: yes** — an added case asserts the rendered `.p-multiselect` className does *not* contain `mb-3`; it fails today because `MultiSelect` applies `className` twice (wrapper at line 352 *and* the control at line 391), so the field's own bottom margin is silently doubled onto the control.

- [ ] **Step 1: Write the failing assertion.** In the Task 1 test file, add a case asserting `container.querySelector('.p-multiselect')?.className` does not match `/\bmb-3\b/`.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Move the margin out.** Delete the `className="mb-3"` prop from the `MultiSelect` in `JiraCustomFieldsField.tsx`, and in `IndexTypeJira.tsx` wrap the `<JiraCustomFieldsField … />` element in `<div className="mt-6 mb-4">`. `mt-6` is the requested extra gap below "Model used for embeddings" (whose own `mt-4` comes from `FormAutocomplete`'s default and stays untouched); `mb-4` matches the sibling `Input` rhythm above. Both are on the standard scale.
- [ ] **Step 4: Re-run the test file and confirm both cases pass.**
- [ ] **Step 5: Commit.**

---

## Verification notes

The visual outcome — chips not cramped, nothing clipped, dark theme correct, no regression in other selectors — has no automated check in this repo (no visual-regression tooling). It is confirmed by the flow's own browser-verification stage on the Jira datasource create *and* edit forms, in both themes.

## Negative-constraint pass

- *Must not change global spacing in `ptPreset.ts`, `ChipWrapper.tsx`, or `vue_components.scss`* — honored: no task lists them; both tasks touch only the two page-layer files plus one new test.
- *Must not widen to a shared-component change or a non-opt-in prop* — honored: Task 1 uses `inputClassName`, an existing optional prop; no `MultiSelect.tsx` edit, so every other consumer's rendered output is byte-identical.
- *No new `.scss` component styles / no arbitrary spacing values* — honored: only scale utilities (`min-h-11`, `!py-1.5`, `!gap-2`, `mt-6`, `mb-4`) and keyword values (`h-auto`, `max-h-none`).
- *Increased chip spacing must not clip values* — honored: Task 1 pairs the padding increase with `!h-auto !max-h-none` and `!overflow-visible`, which is the whole reason those classes are in the same prop.
- *No light-only hardcoded colour in what is touched* — honored: neither task adds or edits a colour class.
- *No steps to run prettier/eslint* — honored.
