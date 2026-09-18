# Post-review changes — EPMCDME-8430 dialog-initial-focus

The other artifacts in this directory (`plan.md`, `technical-analysis.md`,
`code-review-final.json`, `code-review-check.json`, `decisions.jsonl`, `qa-report.md`) were each
accurate when written and are left unedited. They freeze the state of the work at the code-review
round. The implementation kept moving afterwards, so the mechanism they describe is not the one
that shipped. This file reconciles the two, and every claim carries the commit that proves it.

**Citations key on the commit subject, not the SHA.** This branch is rebased server-side on an
ff-only repo, so every SHA rotates on each rebase while the subject lines stay stable. Each commit
below is named by its subject first; the short SHA that follows is a convenience, accurate at the
time of writing and expected to rotate.

## 1. The plan and the implementation diverged at the first implementation commit — before any review

This is the more interesting finding, and it is not a review artifact at all.

`plan.md` prescribes an identifier attribute on the dialog root: the Architecture line calls for
querying `[role="dialog"]` "by a `data-popup-id` attribute (set on `pt.root`)", and Task 2 Step 2
spells out adding `'data-popup-id': headerId` to `pt.root`, with the focus `useEffect` selecting the
dialog via `el.getAttribute('data-popup-id') === headerId`.

That attribute never existed in the code:

    git log -S "data-popup-id" origin/main..HEAD -- src/components/Popup/Popup.tsx   # empty

The very first implementation commit, **"Move focus into dialog on open (close button or first
focusable)"** (`8d33f68e6`), used a
different identification mechanism than the plan: it set `aria-labelledby` conditionally on
`pt.root` (`header ? headerId : undefined`), matched the dialog with
`dialogs.find(el => el.getAttribute('aria-labelledby') === headerId)`, fell back to
`dialogs.at(-1)`, and ran the whole thing from a `setTimeout(0)`. So the plan and the code parted
ways at the first commit, before any review round touched the branch. Nothing rewrote history to
hide this — the plan was simply not followed to the letter on the identifier choice.

## 2. What the code-review round actually reviewed

Because that first commit was the code under review, `code-review-final.json`'s three findings all describe
the `aria-labelledby` + `at(-1)` + `setTimeout` mechanism — its line numbers (`line: 208` for the
`pt.root` attribute, `line: 119` for the `FOCUSABLE` selector) point into that first commit, not
into the shipped file:

- **CR-001 (major):** with `headerContent` and no `header`, `aria-labelledby` is `undefined`, so
  `find()` misses and the effect falls back to `dialogs.at(-1)` — which can focus the *wrong*
  dialog when a `headerContent` popup is not the last `[role="dialog"]` in a stacked scenario.
- **CR-002 (major):** the Priority-2 `FOCUSABLE` selector omits `a[href]`, so a dialog whose first
  interactive element is a plain link falls through to the `[tabindex="-1"]` content fallback.
- **CR-003 (major):** none of the five focus tests exercised the `dialogs.at(-1)` fallback path.

## 3. CR-001's own fix was the defect, and was reverted

The check round (`code-review-check.json`) recorded CR-001 as resolved by commit
**"Fix CR-001/CR-002/CR-003 from code review"** (`73153ec51`), which made `aria-labelledby`
unconditional on
`pt.root` (`header ? headerId : undefined` → `headerId`). Its rationale even claimed "Unconditional
aria-labelledby referencing a non-existent element degrades gracefully in ARIA."

It does not degrade gracefully. Commit
**"Focus the dialog through PrimeReact onShow instead of a timed DOM lookup"** (`f7d9653fa`) reverted
that change, measuring the harm in its
own words:

> Making that identification work required setting aria-labelledby unconditionally, which pointed 13
> render sites (every headerContent popup plus the hideHeader onboarding modal) at an element id
> that is only rendered when the header prop is set - a dangling IDREF, so those dialogs lost their
> accessible name and violate aria-valid-attr-value.

So the review's approved fix (**"Fix CR-001/CR-002/CR-003 from code review"**) traded a
stacked-dialog edge case for a broken accessible
name on 13 real render sites. The review had found the wrong problem and prescribed a worse one.

## 4. What actually shipped

Commit **"Focus the dialog through PrimeReact onShow instead of a timed DOM lookup"** (`f7d9653fa`)
replaced the whole mechanism. The shipped implementation uses a `dialogRef` (`useRef<Dialog>`), the
`onShow` lifecycle callback, and PrimeReact's own `getCloseButton()` / `getElement()` /
`getContent()` — no timer, no global `[role="dialog"]` query, no `at(-1)` guess, and no
`aria-labelledby` lookup. Commit **"Do not take focus that is already inside the dialog"**
(`00fe0e850`) then added the guard that ships as the branch tip:

    if (dialog.getElement()?.contains(document.activeElement)) return   // never steal in-dialog focus

Under this mechanism **CR-001 is moot**: `aria-labelledby` is back to conditional on `pt.root`
(`header ? headerId : undefined`) and is no longer read by the focus code, so there is no
`aria-labelledby` lookup left to get wrong and no dangling IDREF. The stacked-dialog case CR-001
worried about is handled by construction — each `Popup` focuses through its own ref.

## 5. Which findings still stand, and which are void

- **CR-002 (a[href]) still stands and is in the shipped code** — the `FOCUSABLE` constant in
  `src/components/Popup/Popup.tsx` still begins with `a[href],…`.
- **CR-003 (headerContent test) still stands** — `Popup.test.tsx` still contains the test
  `focuses the close button when headerContent is used instead of header`.
- **CR-001 is void** — it described a mechanism (conditional `aria-labelledby` + `at(-1)`) that no
  longer exists, and its accepted fix was reverted as the actual defect.

## 6. EPMCDME-8429 (MR !1697) merged on 10 September 2026 — conflict and consolidations

### What merged

MR !1697 (EPMCDME-8429, Oleksandr Cherevach's focus-trap work) landed on `origin/main` on
2026-09-10. It added:

- `src/hooks/useFocusTrap.ts` — custom `useFocusTrap` hook plus the exported `FOCUSABLE_SELECTOR`
  constant
- `src/hooks/useMountOrderStack.ts` — mount-order stack for tracking the topmost open dialog
- `src/components/Popup/useTopmostDialog.ts` — `useTopmostDialog` hook that combines the stack with
  a `Proxy` that post-filters PrimeReact's sentinel elements from `querySelectorAll` results
- Changes to `Popup.tsx`: `useFocusTrap(dialogContainerRef, visible)` wired up; the Escape handler
  updated to guard on `isTopmost`; `closable={!hideClose}` added to `<Dialog>` props
- New test blocks: "stacked dialogs" and "focus trap" suites in `Popup.test.tsx`

### The conflict

When `origin/main` was merged into this branch on 2026-09-14 (commit
**"Merge remote-tracking branch 'origin/main' into EPMCDME-8430_post-review-fix"**), git reported
exactly two textual conflicts:

1. **`src/components/Popup/Popup.tsx`** — the `<Dialog>` props block: ours had
   `onShow={focusFirstElement}` while main added `closable={!hideClose}`. Resolution: keep both
   props, `onShow` before `closable`.
2. **`src/components/Popup/__tests__/Popup.test.tsx`** — the `@testing-library/react` import: ours
   needed `waitFor` and main's new tests needed `fireEvent`. Resolution: import both in one line.

Everything else from main — `useFocusTrap` wiring, `useTopmostDialog.ts`,
`useMountOrderStack.ts`, the Escape handler guard, and both new test suites — merged cleanly
without touching.

### Consolidations (commit "EPMCDME-8430: Reuse focus-trap selector and sentinel filter after EPMCDME-8429 merge")

After the merge, Cherevach's review asked for three clean-ups:

**a) FOCUSABLE_SELECTOR reuse.** `focusFirstElement` had its own inline `FOCUSABLE` constant
(functionally identical to `FOCUSABLE_SELECTOR` in `useFocusTrap.ts`). Replaced with an import of
`FOCUSABLE_SELECTOR` from `@/hooks/useFocusTrap`, removing the duplicate declaration.

**b) Sentinel filter in one place.** The check `el.getAttribute('data-p-hidden-focusable') !==
'true'` appeared in two places: in `focusFirstElement` (Popup.tsx) and inside
`createFocusableElementsProxy` (useTopmostDialog.ts). A small `isPrimeReactSentinel` helper was
exported from `useTopmostDialog.ts`, next to the proxy, and both callers were updated to use it.
`grep -rn 'data-p-hidden-focusable' src/ --include='*.ts' --include='*.tsx'` (excluding tests) now
hits exactly one line — the `getAttribute` call inside `isPrimeReactSentinel`.

`focusFirstElement` does **not** receive `dialogContainerRef` to do this check. `dialogContainerRef`
returns `null` until `isTopmost` is true; at `onShow` time that state may not have updated yet
(the callback ref and the Valtio-backed `useTopmostEntry` subscription fire on different cycles),
so routing the sentinel check through the proxy would silently prevent focus from moving in any
dialog that opens without already being topmost. The helper is called directly on the raw elements
returned by `dialog.getElement()?.querySelectorAll`, which always resolves.

**c) Comment update.** The `focusOnShow={false}` comment previously said "pending MR !1697
(EPMCDME-8429) adds". Since `useFocusTrap` is now in main, the comment was rewritten to drop the
"pending" phrasing. The load-bearing reason is preserved: `focusOnShow={false}` is intentional
because enabling it would also activate PrimeReact's own `FocusTrap` on top of `useFocusTrap`,
stacking two competing traps on the same element.
