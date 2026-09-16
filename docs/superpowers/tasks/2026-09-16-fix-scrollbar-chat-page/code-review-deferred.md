# Deferred from code review — 2026-09-16-fix-scrollbar-chat-page (2026-09-16)

- **Safari scrollbar-gutter layout shift** — `src/pages/chat/components/ChatHistory/ChatHistory.tsx:53` — `.scrollbar-gutter-edge` uses `scrollbar-gutter: stable`, which Safari does not support; when chat content first overflows, the gutter reserve is absent and an 8 px layout shift squeezes content. Pre-existing: `scrollbar-gutter-edge` was on the scroll container before this change; the fix added only `show-scroll` and did not introduce the Safari gap.
