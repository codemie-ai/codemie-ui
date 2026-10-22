# Redesign MCP Server Clone Flow — Story

**Date**: 2026-10-06
**Status**: Superseded — see 2026-10-14 revision below
**Ticket**: EPMCDME-15538 (UX follow-up to the already-shipped clone flow)

---

## Revision History

- **2026-10-14, seventh revision (secrets-in-clone-form confirmed as intended parity with Edit).**
  Code review flagged that the Clone modal's `serverConfig` textarea pre-fills with
  `cloneSource.config` verbatim — including any `auth_token`/credential header/secret env
  values — via `getFormValuesFromServer()`, with no client-side redaction or user-facing notice.
  This is confirmed as the intended design, not a gap: `getFormValuesFromServer()` is the same,
  unmodified function Edit MCP Server already uses, so Clone shows and submits exactly what Edit
  shows and submits — no more, no less. Masking/stripping was already out of scope as of the
  2026-10-07 first revision below; this entry exists only so neither a future contributor nor a
  reviewer re-flags Clone as newly leaking secrets Edit does not already expose.
- **2026-10-14, sixth revision (icon decision reversal).** The icon-assignment intent carried
  forward from the 2026-10-07 second revision (below) is reversed: no `clone.svg` was added, and
  none should be. The shipped design keeps `copy.svg` on the "Clone" row action and introduces a
  new `clipboard.svg` for "Copy ID" instead, which already satisfies the underlying goal — a
  distinct icon per action — without adding a new clone-specific asset. The "carried forward, not
  superseded" note on the 2026-10-12 entry below no longer applies to the icon point; it is
  superseded by this entry.
- **2026-10-14, fifth revision (scope change on top of the form-based flow).** The form-based flow
  from the 2026-10-12 revision below shipped, then changed again: the canonical spec for
  EPMCDME-15538's clone UX is now `docs/stories/2026-10-14-clone-mcp-empty-name/story.md` in the
  `codemie` (backend) repo. The editable "Clone MCP Server" modal stays, but Name no longer prefills
  a server-suggested `"Copy {N} of {Name}"` — it opens empty and the admin must type a name, same as
  the required-field rule Add/Edit already enforce. The `GET .../suggested-clone-name` endpoint
  introduced for the 2026-10-12 revision is removed entirely as a result. This is the implemented
  design as of this revision.
- **2026-10-12, fourth revision (superseded by the form-based flow).** This story's own last
  revision (below) is itself superseded: the canonical spec for EPMCDME-15538's clone UX is now
  `docs/stories/2026-10-09-clone-mcp-form-flow/story.md` in the `codemie` (backend) repo, which
  reinstates an editable "Clone MCP Server" modal (styled like Edit MCP Server), prefilled from the
  source server including a server-suggested, editable `"Copy {N} of {Name}"` name sourced from a
  new backend `GET .../suggested-clone-name` endpoint, submitted via a body-carrying
  `POST .../clone` call. This was the implemented design as of that revision, and is itself now
  superseded by the 2026-10-14 revision above. The entire **Acceptance Criteria** section below (the
  confirmation-popup design) and this revision's own **Context**/**Story**/**Background** sections
  are therefore moved to **Superseded Criteria** and must not be implemented; they are kept here
  only as historical record of why the flow changed shape multiple times. The
  `src/assets/icons/clone.svg` vs. `copy.svg` icon-assignment intent from the **2026-10-07 second
  revision** was carried forward until the 2026-10-14 sixth revision above reversed it — see that
  entry for the shipped design.
- **2026-10-06, initial draft.** Secure-by-default clone: a "Copy values to clone" field-selection
  dialog, client-side sensitive-field stripping via `isSensitiveKey`, a placeholder sentinel for
  stripped values, and a dismissible `stripped_fields` banner on the resulting Edit-style modal.
- **2026-10-07, first revision.** Scope change: no masking/stripping anywhere — everything is
  copied verbatim, confirmed against the backend's identical reversal
  (`docs/superpowers/tasks/2026-10-05-clone-mcp-capability/spec.md`, revised 2026-10-07). Proposed
  a single "Clone MCP Server" editable-draft window (styled like Edit MCP Server), submitted via a
  two-call clone-then-conditional-update sequence with `clonedId`-gated retry, plus client-guessed
  `Copy N of {Name}` naming in the draft.
- **2026-10-07, third revision (code-review correction).** Narrowed the in-flight-disabling
  acceptance criterion: only the "Clone Server" action is disabled while the request is in flight;
  Cancel stays enabled, matching the only existing async-confirm precedent in the app
  (`UnassignFromProjectConfirmationPopup`), where disabling the confirming action alone already
  prevents a duplicate call. The original "both actions are disabled" wording was stricter than any
  existing popup in the repo and than the criterion's own stated goal required, and is now dropped.
- **2026-10-07, second revision.** Simplified further: there is no editable draft
  window at all. "Clone" now opens a small **confirmation popup** naming the source configuration;
  confirming fires the clone call as the only network request. The resulting clone is edited
  afterward, if at all, through the existing, unmodified Edit MCP Server flow — not through any
  clone-specific editing surface. This removes the two-call sequence, the `clonedId` retry state,
  and the client-guessed naming logic introduced in the first revision; see **Superseded
  Criteria** for what that revision proposed and why it no longer applies.

---

## Context

- The clone flow (shipped under EPMCDME-15538) currently shows a "Copy values to clone" dialog
  listing raw dotted paths (`headers.Authorization`, `args[2]`, `env.API_KEY`) as
  unchecked-by-default checkboxes before the clone API call ever fires. This dialog is removed
  entirely under this revision, with no field-selection or field-editing replacement.
- The backend's `POST /v1/mcp-configs/{id}/clone` endpoint takes **no request body** and performs
  a full, verbatim deep copy of the source configuration — headers, env, args, auth_token, URL
  (including userinfo/query), and `auth_config` (only `auth_config.id` is regenerated, since it is
  uniquely indexed). The response is a plain config object with no `stripped_fields` and no
  placeholder warning. The backend auto-allocates the new name as `Copy N of {Original Name}`.
  This is confirmed, not assumed — verified directly against the backend service and its router
  tests on branch `EPMCDME-15538-Add-clone-mcp-capability`.
- Because this revision clones with no editable draft step, the clone call is the **only** network
  request in this flow — there is no follow-up update call, no partial-success state, and no
  naming guess to compute. The backend's auto-assigned name is simply whatever appears in the list
  once the clone succeeds.
- The confirmation popup reuses the project's existing shared `ConfirmationModal` component
  (`src/components/ConfirmationModal/ConfirmationModal.tsx`) rather than a new modal primitive, and
  follows the one existing precedent for an async confirm-dialog
  (`UnassignFromProjectConfirmationPopup`) for blocking double-submission via a `confirmDisabled`
  flag while the request is in flight — but adds a visible failure toast, since that existing
  precedent is otherwise silent on error (`console.error` only), a gap already noted for Edit MCP
  Server and not one this story repeats.
- `MCPServerModal` (Edit MCP Server) is **untouched** by this revision — no new "Clone" mode,
  title, or CTA is added to it. Editing a clone, if the user wants to, happens entirely through the
  existing Edit flow, triggered separately and later, like editing any other configuration.
- **Superseded by the 2026-10-14 sixth revision above.** This revision proposed a new
  `src/assets/icons/clone.svg` for the row action — `copy.svg`'s two-square outline with three
  content-line bars added inside the front square (matching `file.svg`'s text-line convention) —
  to visually distinguish "Clone" from "Copy ID", which previously shared the same `copy.svg`
  icon. The shipped design instead keeps `copy.svg` on "Clone" and introduces `clipboard.svg` for
  "Copy ID"; no `clone.svg` asset exists or should be added.

---

## Complexity

**Size**: S (12/36) · **Recommended flow**: sdlc-light

Down from M (17/36) for both earlier revisions. Technical risk dropped to S since the confirmation
popup reuses an existing shared component (`ConfirmationModal`) and an existing async-confirm
precedent (`UnassignFromProjectConfirmationPopup`), with no new state machine or modal mode
anywhere. Component scope and file-change estimate still land at M only because deleting
`MCPCopyValuesDialog`/its hook, wiring the new popup into `useMCPManagement.ts`, and trimming
`MCPManagementPage.tsx`/`src/store/mcp.ts` touches a handful of files across the usual layers —
nothing in it is novel.

---

## Story

**As an** admin or maintainer managing MCP server configurations, **I want** to confirm cloning a
server with a single click and see the result in the list immediately, **so that** I can duplicate
a configuration quickly without being interrupted by a field-selection dialog, and without an
extra editing step unless I actually need to change something afterward.

---

## Background

Today, cloning an MCP server interrupts the user with a dialog of raw technical paths they can't
reasonably interpret (what is `args[2]`? what is `headers.X-Custom`?). This revision replaces that
dialog with a minimal confirmation step: clicking "Clone" on a server row opens a small popup
asking the user to confirm, by name, which configuration they're about to clone. Confirming is the
single action that triggers the clone call — nothing happens before that click, and the popup
itself never offers field editing. If the clone succeeds, the new entry appears in the list exactly
as the backend created it (verbatim values, auto-assigned name); if the user wants to change
anything afterward, they do so the same way they'd edit any other configuration — through the
existing, unmodified Edit MCP Server flow, as a separate, later action.

---

## Acceptance Criteria

**Superseded as of the 2026-10-14 revision above** — see
`docs/stories/2026-10-14-clone-mcp-empty-name/story.md` (backend repo) for the current acceptance
criteria (editable `MCPServerModal` Clone mode, empty-by-default name, body-carrying clone submit).
The criteria that used to live in this section are preserved verbatim under **Superseded Criteria**
below, in the new **From the 2026-10-07 second/third revisions** entry.

---

## Out of Scope

- Any further backend/API contract change — this story consumes the clone endpoint as already
  implemented on the backend branch referenced above; no additional backend work is requested.
- Any masking, stripping, placeholder-value substitution, or "sensitive field" notice anywhere in
  this flow. The Clone form reuses Edit MCP Server's unmodified `getFormValuesFromServer()`, so it
  shows and submits the source config verbatim, secrets included, with the same exposure as Edit —
  not more, not less. See the 2026-10-14 seventh revision above.
- Any editable draft, field-selection, or clone-specific editing surface — editing a clone is
  always the existing Edit MCP Server flow, triggered separately after the clone succeeds.
- Auto-opening Edit MCP Server (or any other window) immediately after a successful clone.
- Bulk clone, re-linking assistants/workflows to the clone, or carrying over usage history.

---

## Superseded Criteria (earlier drafts — do not implement)

From the **2026-10-07 second/third revisions** (this story's own prior acceptance criteria,
itself now superseded by `docs/stories/2026-10-09-clone-mcp-form-flow/story.md`):

- A confirmation-popup-only clone flow with no editable draft: "Clone" opens a small confirmation
  naming the source configuration, with Cancel/"Clone Server" actions and no API call until
  confirmed.
- The no-body `POST /v1/mcp-configs/{id}/clone` call as the only network request, with the backend
  auto-allocating the name with no frontend preview.
- `MCPServerModal` (Edit MCP Server) staying untouched by the clone flow — no "Clone" mode, title,
  or CTA added to it; editing a clone only ever happening afterward through the separate, existing
  Edit flow.
- Only confirming-action in-flight disabling (Cancel remains enabled), matching
  `UnassignFromProjectConfirmationPopup` — this narrower disabling rule doesn't apply to the
  editable-modal design (there is no separate Cancel from Clone Server to narrow between).

From the **2026-10-06 initial draft**:

- A "Copy values to clone" field-selection dialog of any kind.
- Client-side stripping of sensitive fields (tokens, passwords, credentials, secrets) via
  `isSensitiveKey`/`isSensitivePath` or any equivalent exclusion logic.
- A placeholder sentinel value substituted for stripped fields, and the existing placeholder-value
  warning toast in the clone context.
- The dismissible `stripped_fields` notice banner in the clone context.

From the **2026-10-07 first revision**:

- A single editable "Clone MCP Server" draft window styled like Edit MCP Server, pre-filled from
  the source server, with its own title/CTA mode on `MCPServerModal`.
- The two-call sequential clone-then-conditional-update submit, including the rule that an update
  call fires only if the user edited a field.
- The `clonedId`-gated retry rule (retry re-clones only if no clone id exists yet, otherwise retries
  only the update).
- Client-computed name suggestions (`Copy of {Name}` / `Copy N of {Name}`) displayed in a draft
  field before the clone call, and the rule to omit Name from a follow-up update unless the user
  edited it.
- Treating "Copy N of {Name}" uniqueness, or any naming preview, as a frontend concern — naming is
  fully owned and computed by the backend during the clone call, and under this revision the
  frontend never previews it before the call completes.

---

## Open Questions

- None blocking.
