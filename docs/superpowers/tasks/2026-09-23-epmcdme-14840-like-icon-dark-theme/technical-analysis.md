# Technical Analysis — EPMCDME-14840

## Task Summary

Fix the like (thumb-up) feedback icon selected-state highlight in the codemieDark theme so it is
visually distinguishable from the base icon color.

## Codebase Findings

### Affected Files

| File | Role |
|------|------|
| `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx` | Applies `text-text-accent` to the like icon when `isLiked === true` |
| `src/pages/chat/components/ChatHistory/ChatMessageAction.tsx` | Button wrapper — `opacity-80` base, `hover:opacity-100`, passes `iconClassName` to icon |
| `tailwind.config.ts` | Token definitions (`text.accent`, `in-progress`, `failed`) |

### Root Cause (Established by Live Reproduction)

`text-text-accent` → `text.accent.DEFAULT` → `[neutral.50, blue.400]`

| theme | value | hex |
|-------|-------|-----|
| codemieDark | `neutral.50` | `#F2F0EF` |
| codemieLight | `blue.400` | `#007AFF` |

In codemieDark, the base icon color is `#FFFFFF` (opacity-80 → rendered ~80% white). The selected
class applies `#F2F0EF` — a near-white neutral. The two are indistinguishable.

Dislike uses `text-failed-secondary` → `[red.450, red.450]` = `#FE3B4C` in both themes; this is a
real red and is correctly visible in both.

### Candidate Token

`text-in-progress-primary` → `in-progress.primary` → `[blue.300, blue.300]`

| theme | value | hex |
|-------|-------|-----|
| codemieDark | `blue.300` | `#2297F6` |
| codemieLight | `blue.300` | `#2297F6` |

This token is already used in StatusBadge, StatusIndicator, and multiple other components. It
provides vivid cyan-blue in both themes, clearly distinct from both base colors.

Delta in light mode: selected-like color changes from `#007AFF` (blue.400) to `#2297F6` (blue.300)
— both are clearly blue and recognisable as a positive selected state.

### Adjacent Typo

`src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx`
line 178: `"Click to remove yout negative feedback"` → `"your"`.

## Risk Indicators

- **Blast radius**: Single component, two lines.
- **Token change**: `text-in-progress-primary` already widely used; no new Tailwind config required.
- **Token constraint honoured**: `text.accent.DEFAULT` is not modified.
- **Behaviour unchanged**: Only the CSS class on the icon changes; state logic is not touched.
