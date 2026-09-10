# Implementation Plan — Restore 44px height in AssistantSelector dropdown

- **Jira Ticket:** EPMCDME-14073 — assistant picker placeholder clipped, field below 44px
- **Flow:** sdlc-light
- **Branch:** `EPMCDME-14073/fix-placeholder`
- **Target file:** `src/pages/assistants/components/AssistantSelector.tsx`

---

## 1. Root cause recap

`MultiSelect` forwards `className` to both its outer wrapper (`MultiSelect.tsx:352`) and the inner
PrimeReact root (`MultiSelect.tsx:391`), where it sits next to `h-[44px] py-[5px]`
(`MultiSelect.tsx:229`). `AssistantSelector` passed `flex-1` — i.e. `flex: 1 1 0%` — and because
every enclosing flex container in the chain is `flex-col`, that `flex-basis: 0%` resolved against
**height** and overrode `h-[44px]`.

Full derivation in `technical-analysis.md`.

---

## 2. Scope

```
src/pages/assistants/components/
└── AssistantSelector.tsx        # single file changed
```

No other file is touched. `MultiSelect` itself is deliberately left alone (see spec § Non-goals).

---

## 3. Steps

### Step 3.1 — Remove `flex-1` from the forwarded className

`flex-1` is the class that collapses the height. It never had a horizontal axis to act on, so
removing it costs nothing.

```diff
-          className="flex-1 max-w-full"
+            className="max-w-full"
```

`max-w-full` is retained — it still guards against overflow on narrow containers.

### Step 3.2 — Wrap the control in a row flex container

`fullWidth` adds `flex-grow` to the `MultiSelect` wrapper. For that to mean "fill the width" the
control needs a row context, which the surrounding `flex flex-col` never provided.

```diff
+        <div className="flex gap-2">
           <MultiSelect
             ...
           />
+        </div>
```

This restores AC-4 (full width) while Step 3.1 restores AC-1..AC-3 (44px height).

### Step 3.3 — Verify the four consumers

Confirm no layout regression in:

| File | Line |
|---|---|
| `AssistantForm/AssistantForm.tsx` | 673 |
| `skills/components/AttachToAssistantsModal.tsx` | 109 |
| `integrations/components/SettingsForm/AssistantMultiSelectField.tsx` | 69 |
| `guardrails/GuardrailAssignmentPopup/GuardrailAssignmentEntitySelector.tsx` | 127 |

---

## 4. Verification

| Check | Command / method |
|---|---|
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit suite | `npm run test:unit` |
| Visual — Create Assistant | Manual, before/after screenshots attached to the MR |
| Visual — Attach to Assistants | Manual, before/after screenshots attached to the MR |
| E2E | `npm run test-harness` (`--sanity-ui`) |

No unit test is added: the change is a Tailwind class swap with no behavioural surface, and the
existing `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` already covers the
component's behaviour. Height is asserted visually via the MR screenshots. This is recorded as a
conscious trade-off in `code-review-final.json`.

---

## 5. Rollback

Single-file, presentation-only change — revert the commit. No migration, no persisted state, no API
contract involved.

---

## 6. Follow-up (not in this ticket)

`MultiSelect` should stop applying the caller's `className` to two elements in two different flex
contexts. Any layout class passed by any consumer today is silently applied twice. Worth its own
ticket with an app-wide regression pass.
