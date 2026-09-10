# Technical Analysis — AssistantSelector dropdown collapses below 44px

- **Jira Ticket:** EPMCDME-14073
- **Flow:** sdlc-light
- **Branch:** `EPMCDME-14073/fix-placeholder`
- **Feature area:** shared assistant picker (`src/pages/assistants/components/AssistantSelector.tsx`)

## 1. Symptom

The assistant picker renders shorter than the `44px` the design system specifies for
`size="medium"`. The placeholder text (`Select Sub-Assistants`, `Select assistants`) is squeezed
against the field border instead of being vertically centred, and the field is visibly shorter than
the sibling `Select Datasource Context` control rendered directly above it.

Reproduced in two places:

| Surface | Component | Placeholder |
|---|---|---|
| Create Assistant → Context & Data Sources → Sub-Assistants | `AssistantForm.tsx:673` | `Select Sub-Assistants` |
| Skill Details → Attach to Assistants modal | `AttachToAssistantsModal.tsx:109` | `Select assistants` |

## 2. Root cause

`MultiSelect` forwards the caller's `className` to **two different elements**:

| Location | Element | Resulting classes |
|---|---|---|
| `src/components/form/MultiSelect/MultiSelect.tsx:352` | outer wrapper `div` | `relative flex flex-col` + `flex-grow` (when `fullWidth`) + `className` |
| `src/components/form/MultiSelect/MultiSelect.tsx:391` | inner `PrimeMultiselect` root | `className` + `mappedSizeClassname` + `inputClassName` |

`mappedSizeClassname` for `size="medium"` is `h-[44px] py-[5px]` (`MultiSelect.tsx:229`).

`AssistantSelector` passed `className="flex-1 max-w-full"`. Because of the duplication above,
`flex-1` landed on the **inner PrimeReact root**, side by side with `h-[44px]`.

`flex-1` expands to `flex: 1 1 0%`. The inner root's parent is the `MultiSelect` wrapper, which is
`flex flex-col` — a **column** flex container, so its main axis is vertical. On a column child
`flex-basis: 0%` and `flex-shrink: 1` therefore apply to **height**, and flex-basis outranks the
`height` declaration in `h-[44px]`. The control collapsed to its content height, clipping the
placeholder.

The outer `AssistantSelector` container (`AssistantSelector.tsx:234`, `flex flex-col gap-2`) is a
column too, so nothing in the chain gave `flex-1` a horizontal axis to act on — the class only ever
did damage.

## 3. Why `fullWidth` did not compensate

`fullWidth` adds `flex-grow` to the outer wrapper (`MultiSelect.tsx:352`). With every ancestor being
`flex-col`, `flex-grow` also resolved against the vertical axis, so it produced no width effect
either. The control needs a **row** flex context for `flex-grow` to mean "fill the available width".

## 4. Blast radius

`src/pages/assistants/components/AssistantSelector.tsx` has four consumers:

| File | Line |
|---|---|
| `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` | 673 |
| `src/pages/skills/components/AttachToAssistantsModal.tsx` | 109 |
| `src/pages/integrations/components/SettingsForm/AssistantMultiSelectField.tsx` | 69 |
| `src/components/guardrails/GuardrailAssignmentPopup/GuardrailAssignmentEntitySelector.tsx` | 127 |

`src/pages/workflows/editor/configPanels/AssistantTab.tsx` imports a **different**, workflow-local
`./components/AssistantSelector` and is therefore out of scope, along with its existing test
`src/pages/workflows/editor/configPanels/components/__tests__/AssistantSelector.test.tsx`.

## 5. Options considered

| Option | Verdict |
|---|---|
| Drop `flex-1`, change nothing else | Fixes the height, but leaves `fullWidth`'s `flex-grow` still resolving on the vertical axis — width behaviour stays accidental. |
| Stop forwarding `className` to the inner root in `MultiSelect.tsx` | Correct fix for the underlying leak, but `MultiSelect` is used across the whole app; every consumer relying on the current double application would shift. Too large for this ticket. |
| Drop `flex-1` **and** wrap the control in a row flex container | Chosen. Restores `h-[44px]` and gives `flex-grow` a horizontal axis, so `fullWidth` finally means what it says. Scope stays inside `AssistantSelector`. |

## 6. Risk indicators

- Presentation-only change; no props, state, data flow or API surface touched.
- The `className` double-forwarding in `MultiSelect` remains as latent debt — recorded as a
  follow-up, not fixed here.
