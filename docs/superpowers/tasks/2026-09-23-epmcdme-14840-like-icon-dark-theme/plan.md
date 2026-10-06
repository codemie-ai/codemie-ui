# Plan — EPMCDME-14840: Like icon dark-theme highlight

## Tasks

### T1 — Add `text.accent.feedback` token to `tailwind.config.ts`

**File:** `tailwind.config.ts`

Under the existing `text.accent` object (currently has `DEFAULT`, `hover`, `status`, `status-hover`),
insert:

```ts
feedback: [c['blue']['300'], c['blue']['400']],
```

This generates the Tailwind utility `text-text-accent-feedback`.

Dark: `blue.300` = `#2297F6`. Light: `blue.400` = `#007AFF`.

**Test-first:** no — tailwind.config.ts is a build-time configuration. The token value is
verified by reading `getComputedStyle` in a running browser after T2 lands (see Evidence section).
A jsdom test for a CSS variable value provides no meaningful assurance; the acceptance check is
visual / getComputedStyle.

**Commit:** `EPMCDME-14840: Add text.accent.feedback token for like icon selected state`

---

### T2 — Apply the token and fix the tooltip typo in `MessageFeedbackActions.tsx`

**File:** `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx`

Change 1 (line 170): `text-text-accent` → `text-text-accent-feedback` on the like icon.
Change 2 (line 178): `'Click to remove yout negative feedback'` → `'Click to remove your negative feedback'`

**Test-first:** no — the existing test suite (if any) covers behavior, not resolved CSS colors.
The bug was specifically that the class was correct and the resolved *color* was wrong. A className
assertion in jsdom proves nothing. Acceptance is via getComputedStyle in a real browser.

**Commit:** `EPMCDME-14840: Use text-text-accent-feedback for like selected state; fix tooltip typo`

---

## Evidence (post-implementation, in browser)

Run `getComputedStyle(thumbUpSvg).color` in both themes for both states. Expected:

| theme | state | expected hex |
|-------|-------|-------------|
| codemieDark | base | `#FFFFFF` (unchanged) |
| codemieDark | like selected | `#2297F6` (was `#F2F0EF`) |
| codemieLight | base | `#333333` (unchanged) |
| codemieLight | like selected | `#007AFF` (unchanged) |

Screenshots of the icon in both themes, selected and unselected, to sit in the MR description.

---

## Out-of-scope callout for MR description

State explicitly in the MR:
- Feedback-state hydration after page reload is a known out-of-scope finding (separate ticket).
- The tooltip typo fix is a deliberate one-line extra, not scope creep.
