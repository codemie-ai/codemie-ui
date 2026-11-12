# Technical Research

**Task**: hosted-applications application-card avatar-image preview
**Generated**: 2026-11-12
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-17137 — Hosted Applications: selected application avatar/cover image is not centered and is cropped to its top part, both on the application card in the catalog and in the PREVIEW block on the Application details page. AC1: image centered on card and PREVIEW; AC2: main content not cut off on either.

(Source: `requirements.local.md` in run_dir. Ticket summary: "Application card: the selected application image is not centered and only its top part is shown (the rest is cropped)". Actual: "Only its top part is displayed and the rest is cropped (the "BLUE 42" text is cut off at the bottom)." Expected: "The selected image is centered in the card and in the PREVIEW block, so its main content is fully visible." Affected areas: catalog card avatar image; Application details page PREVIEW block. Acceptance Criteria: 1. centered on card and PREVIEW; 2. main content not cut off on either.)

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: show the uploaded cover image inside a fixed 2:1 frame (catalog card, details PREVIEW)**
- `src/pages/applications/hosted/HostedApplicationCover.tsx:134-141` — `HostedApplicationCover` renders the fetched thumbnail as `<img className="absolute inset-0 size-full object-cover object-top">` over a generated fallback (blurred name-colour washes + initials + kind badge, lines 111-133). Container: `relative flex size-full items-center justify-center overflow-hidden` (line 107). Rules: `object-cover` fills the frame and crops overflow; `object-top` anchors the crop to the top edge, so any image taller than 2:1 loses its bottom part — the reported symptom. Image is fetched lazily (IntersectionObserver, lines 53-65) via `store.getThumbnail` (`src/store/hostedApplications.ts:392`, `GET <app>/thumbnail`, accepts only `HOSTED_COVER_TYPES`, 204 → no image).
  - Consumers: catalog card `src/pages/applications/hosted/HostedApplicationCard.tsx:154` (passed as `preview` to shared `Card`); details PREVIEW `src/pages/applications/hosted/HostedApplicationOverview.tsx:89-91` (inside `DetailsSidebarSection headline="PREVIEW"`, wrapper `aspect-card-cover overflow-hidden rounded-lg`); form preview fallback `src/pages/applications/hosted/HostedCoverField.tsx:125` (when no new file chosen; draws the saved cover).
- `src/pages/applications/hosted/HostedCoverField.tsx:119-123` — create/edit form preview of a newly **chosen** file: separate `<img alt="Selected cover" className="size-full object-cover object-top">`, drawn at 360 px card width scaled 0.5 (`CARD_COVER_WIDTH`, `PREVIEW_SCALE`, lines 32-33) inside `aspect-card-cover`. Same crop rule as the card. Not named by the ticket; it is the place a user first sees the crop. Consumer: `HostedApplicationForm.tsx:287`.
- Frame shape: `aspect-card-cover` = `'2 / 1'` in `tailwind.config.ts:564`. Used by `src/components/Card/Card.tsx:92` (preview slot: `aspect-card-cover overflow-hidden rounded-t-xl border-b`), `HostedApplicationOverview.tsx:90`, `HostedCoverField.tsx:110,115`. `Card`'s `preview` prop has one caller in the repo: `HostedApplicationCard.tsx:154`.
- Upload constraints shown to user: `HOSTED_COVER_HINT` (`HostedCoverField.tsx:37-38`) — "PNG, JPEG, or WebP up to 1 MiB and 2048 px." No aspect ratio is stated or enforced client-side (`hostedCoverError`, lines 41-45, checks type and size only).

**Other touched code**: none.

### Decisions Already in the Code
- Top-anchored cover crop (`object-cover object-top`) chosen in both `HostedApplicationCover.tsx:138` and `HostedCoverField.tsx:122`; alternatives `object-center` (Tailwind default for `object-cover`) or `object-contain` (no crop, letterbox over the generated wash). Reason: none found in code comments, docs, or the `bba9bc7f7` commit (EPMCDME-15659, the only commit touching these lines).
- The form preview is intentionally a scaled replica of the card cover ("drawn at a catalog card's size and scaled down, so text and proportions match the card", `HostedCoverField.tsx:113`) — convention that form preview and card render identically.
- Image fit convention elsewhere: `object-cover` for logos/avatars (`Avatar.tsx:96`, `MCPServerCard.tsx:109`), `object-contain` for previews of arbitrary uploads (`ImagePreview.tsx:53`, `LogoSection.tsx:144`). No other `object-top` usage in `src/`.

### Task Statements Checked Against the Code
- "Only its top part is displayed and the rest is cropped" — holds: `object-cover object-top` in a 2:1 `overflow-hidden` frame (`HostedApplicationCover.tsx:138`, `tailwind.config.ts:564`).
- "both in the PREVIEW block and on the application card" — holds: both render the same `HostedApplicationCover` (`HostedApplicationCard.tsx:154`, `HostedApplicationOverview.tsx:91`).
- AC2 "main content not cut off" — depends on image aspect vs 2:1 frame; with any `object-cover` variant, an image whose aspect differs from 2:1 still loses edges. Unverified whether the server `/thumbnail` endpoint already crops/resizes (outside this repo; a backend response sample would settle it).

### Consumers of Changed Contracts
- `HostedApplicationCover` (if its img class changes): card (`HostedApplicationCard.tsx:154`), details PREVIEW (`HostedApplicationOverview.tsx:91`), form fallback (`HostedCoverField.tsx:125`). Tests: `HostedApplicationCover.test.tsx`, `catalog-covers.integration.test.tsx` query `img[src=...]` only, no class assertions; `HostedApplicationDetails.integration.test.tsx:82` mocks the component out.
- `Card` preview slot / `aspect-card-cover`: unchanged by the ticket wording; only hosted callers use `preview`.

### Architecture and Layers Affected
- UI component layer only: `src/pages/applications/hosted/` (HostedApplicationCover, possibly HostedCoverField). No store, API, routing changes indicated.

### Integration Points
- `hostedApplicationsStore.getThumbnail` → backend `GET /…/thumbnail` (blob). Unchanged.

### Patterns and Conventions
- Tailwind utility classes merged with `cn` (`@/utils/utils`); Apache licence header on files.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/styling/styling-guide.md` (Tailwind conventions), `.ai-run/guides/testing/local-verification.md` (browser scenarios + screenshots to `## Verified locally` in MR; raw files in `local/`). No hosted-applications-specific guide.

### Architectural Decisions
- None recorded for cover cropping. Prior review `docs/superpowers/reviews/2026-11-07-epmcdme-15659-hosted-apps-ui/` does not mention crop/position.

### Derived Conventions
- Card and form preview must render a cover identically (see Decisions).

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/applications/hosted/__tests__/HostedApplicationCover.test.tsx` — fetch/visibility/epoch/initials behaviour.
- `__tests__/catalog-covers.integration.test.tsx` — catalog shows uploaded cover.
- `__tests__/cover-field.integration.test.tsx` — form cover field.
- `__tests__/HostedApplicationCard.test.tsx` — card.

### Testing Framework and Patterns
- Vitest + React Testing Library (`vite.config.ts` test projects); `vi.mock` of store/components; `URL.createObjectURL` stubbed to `blob:` URLs.

### Coverage Gaps
- No test asserts image fit/position classes; jsdom does no layout, so visual centering/cropping is only verifiable in a browser.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant.

### Configuration Files
- `tailwind.config.ts:564` — `aspectRatio['card-cover'] = '2 / 1'`.

### Feature Flags and Deployment Concerns
- Hosted Applications is behind a feature flag (`src/constants/featureFlags.ts`, `src/utils/featureFlags.ts`); no deployment concern for a class change.

---

## 6. Risk Indicators

- Same `object-cover object-top` rule lives in two places (`HostedApplicationCover.tsx:138`, `HostedCoverField.tsx:122`); changing only one makes the form preview disagree with the card it claims to replicate.
- Speculative: centering alone (`object-center`) still crops images whose aspect is not 2:1 (e.g. a square "BLUE 42" image loses top and bottom); AC2 "not cut off" may only be fully met by a non-cropping fit, which would show the generated wash/initials around the image — the initials layer (`HostedApplicationCover.tsx:120-133`) sits underneath the img and could become visible in letterbox areas.
- Visual-only change: unit tests cannot verify it; browser verification with screenshots is the evidence channel.
- Server `/thumbnail` processing is unknown (outside repo).

---

## 7. Summary for Complexity Assessment

The bug is a single CSS rule: the uploaded cover `<img>` uses `object-cover object-top` inside a 2:1 `overflow-hidden` frame (`HostedApplicationCover.tsx:138`), so tall or square images keep only their top. One component serves both affected surfaces (catalog card via `Card` preview slot, and the details PREVIEW block), so one edit fixes both. A second copy of the same rule renders the newly chosen image in the create/edit form preview (`HostedCoverField.tsx:122`), which is designed to match the card.

Layers touched: UI components in `src/pages/applications/hosted/` only; one to two files, a class-level change. No store, API, routing or config involvement. No novelty.

Tests cover cover-loading behaviour but not fit/position; jsdom cannot verify layout, so verification is a browser check. The main open point for the spec is fit choice: centered crop vs non-cropping fit, given AC2 wording and the 2:1 frame.

---

## 8. External References

None named by the task (the ticket references two Jira screenshots that are not available in the repository).
