# Technical Research

**Task**: EPMCDME-8584 reopened — copy-status toasts still not announced inside the profile panel
**Generated**: 2026-09-01
**Research path**: live-instrumentation (Chrome DevTools Protocol accessibility tree) + codegraph/grep

---

## 1. Original Context

EPMCDME-8584 was closed by the 2026-08-25 run (`2026-08-25-a11y-copy-status-live-region`), which
routed every `toaster.*` call into a React-owned `<output aria-live="polite" aria-atomic="true"
class="sr-only">` rendered by `ToasterAnnouncer` in `main.tsx`.

QA reopened it on 2026-08-28: *"It's still not working for copy buttons on user profile."*
Reported reproduction is unchanged — profile panel → copy button → screen reader silent while the
toast is visible.

Two facts framed the investigation:

- The copy button on the **profile page** (`/settings/profile`, `ProfileCard.tsx`) does announce.
- The copy buttons in the **sidebar profile panel** (`NavigationProfile.tsx`) do not.

Both call the identical code path, so the copy code was never the variable:

```
ProfileCard.tsx:29 / NavigationProfile.tsx:77,81
  → copyToClipboard()  (helpers.ts:144, utils.ts:119 — two copies, same body)
  → toaster.info()     (utils/toaster.ts)
  → announcer?.(text)  (registered by ToasterAnnouncer)
```

`DetailsCopyField.tsx` (ASSISTANT ID, confirmed working by the reporter) uses the same funnel.

## 2. Why the first fix measured as working

The 2026-08-25 verification asserted on `element.textContent`. That is a false green: the DOM node
updates regardless of whether assistive tech can see it. The authoritative signal is the browser's
accessibility tree, read through CDP:

```python
cdp.send("Accessibility.getPartialAXTree", {"nodeId": nid, "fetchRelatives": False})
```

Measured on the running app, profile panel open:

| State | AX node for `output.sr-only` |
|---|---|
| No modal open | `role: status, ignored: false, live: polite` |
| Profile panel open | `ignored: true, ignoredReasons: ["ariaHiddenSubtree"]` |
| Copy clicked in panel | DOM text present, still `ignored: true` |

## 3. Root cause — two independent barriers

**Barrier 1 — `aria-hidden` on the app root.**
`NavigationProfile.tsx:141` hides the rest of the app from assistive tech while its panel is open:

```ts
document.getElementById('app')?.setAttribute('aria-hidden', 'true')
```

`main.tsx:41` renders the whole React tree — announcer included — into that same `#app`. The
region is therefore inside the subtree the panel hides, and Chrome drops it
(`ignoredReasons: ["ariaHiddenSubtree"]`).

**Barrier 2 — the modal boundary itself.**
Moving the region to `<body>` cleared barrier 1 (`ignored: false`), and the reporter confirmed it
was still silent under VoiceOver. While a dialog with `aria-modal="true"` is open, assistive tech
restricts itself to that dialog: VoiceOver ignores live regions outside it, and Chromium drops them
as well — w3c/aria#1854. `#nav-profile-dialog` carries `role="dialog" aria-modal="true"`.

So `ignored: false` in the AX tree is necessary but not sufficient; only a region *inside* the
active dialog is spoken.

## 4. Blast radius

`aria-hidden` on `#app` is set in exactly one place (`NavigationProfile.tsx`), but `aria-modal`
dialogs are used app-wide (PrimeReact `Dialog`, e.g. the onboarding tour renders
`div[role=dialog][aria-modal=true]`). Barrier 2 therefore affects every toast raised while any
modal is open — not just the profile panel: confirmation dialogs in Data Sources, Integrations and
Workflows are all listed in the ticket's Notes.

## 5. Constraints

- The panel's modal semantics are deliberate and covered by tests
  (`NavigationProfile.test.tsx` CR-001/CR-002 assert the `aria-hidden` lifecycle). Removing
  `aria-modal` or `aria-hidden` would regress that work; the announcer must adapt instead.
- Re-parenting a live region resets it for assistive tech, so the container must move only on an
  actual change of host, and must move at modal-open time — before any message is written.
