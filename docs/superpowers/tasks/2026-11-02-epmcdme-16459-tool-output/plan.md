# EPMCDME-16459 Tool Result Preview Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task only after human approval of implementation **and focused tests**. Checkboxes track proposed work, not completed work.

**Goal:** Show the beginning and end of long plain-text tool Results, with reversible disclosure.
**Architecture:** Default-off TextBlock disclosure, enabled only for tool Result text segments in ThoughtMessage. Local state and existing mount/keys handle streaming and completed-card reset.
**Tech Stack:** Existing React/TypeScript, Tailwind, Vitest/RTL; source overrides version docs.
**Requirements source:** Approved story supplied inline; `technical-analysis.md` provides code facts. Ignore the superseded last-20-only design.

## Acceptance criteria

- Count displayed non-empty lines exactly as today; fewer than 60 lines remain full with no control.
- At 60 lines show 1–20 / 41–60 with “Show 20 hidden lines” between; at 100 show 1–20 / 81–100 with “Show 60 hidden lines”.
- Expand shows every line with “Collapse”; collapse restores the preview.
- Each plain-text segment around documents has independent disclosure; documents keep their positions.
- Streaming crosses the threshold at 60, updates the collapsed latest 20/count, and preserves an expanded choice.
- Reopening a completed card resets its segments to collapsed.
- Toggle is a native keyboard-operable button with visible focus and `aria-expanded` reflecting full/preview.
- Tool Input and workflow state outputs remain unchanged, with no new line disclosure.
- Tool Results rendered as Markdown, images or documents retain their existing renderer/content/controls; assistant replies remain unchanged.
- Chat copying still copies the assistant reply, not tool output; expanding/collapsing tool output does not change the copied plain text or HTML.

## Global constraints

- Implementation and focused tests require explicit human approval; none run during planning.
- Preserve `text.split(/\\n|\n/).filter((line) => line.length)`: literal backslash-n and actual newline delimiters; whitespace-only lines count and carriage returns remain. Do not normalize or trim in TextBlock.
- No dependencies/config/settings/backend, search/wrapping/highlighting/persistence, extra refactors, mockserver work or separate QA/review/commit tasks.
- Before trusting future test results, run `npm ci` separately. Commits are outside this plan and require a separate request under repository conventions.

## Review focus

- Literal delimiters, empty pieces, whitespace and CRLF must retain existing display/count semantics — Task 1.
- Default-off callers and missing/unknown author metadata must not gain disclosure — Tasks 1–2.
- Same-id streaming must retain state and update the tail, not reset on text changes — Tasks 1–2.
- Adjacent text/document segments must have independent controls without changing renderer routing — Task 2.
- Keyboard toggling must retain focus, announce state and avoid invalid interactive paragraph markup — Task 1.

### Task 1 — Add default-off TextBlock disclosure

**Files:** Modify `src/components/markdown/TextBlock.tsx:18–39`; create `src/components/markdown/__tests__/TextBlock.test.tsx`.
**Interface:** Extend existing TextBlock props with `collapsible?: boolean` (default `false`); retain `text?: string` and `className?: string`.
**Test-first: yes — opt-in 60/100-line previews and expand/collapse fail against the current full-only component.**

- [ ] Add RTL cases: 0/40/59 lines have no toggle; 60/100 have exact ranges/counts; expand/collapse reveals/hides the middle; default-off 100 stays full. Pin mixed actual/literal newlines, empty filtering, whitespace and CR via line `textContent`. Rerender 59→60→100→101 to assert threshold/latest-tail/count and expanded-state retention; Tab/Enter/Space must toggle, retain focus and update ARIA.
- [ ] After approval and `npm ci`, run `npx vitest run --project unit src/components/markdown/__tests__/TextBlock.test.tsx`; expect missing-disclosure assertions to fail.
- [ ] Keep the memoized splitter. Local `isExpanded` starts false with no text-change reset. Preview requires opt-in and ≥60 lines; slice first/last 20, count length minus 40; expanded shows all.
- [ ] Reuse the existing workflow details toggle's native button and valid visual pattern (`self-start text-xs cursor-pointer hover:underline`) at `src/pages/workflows/details/configuration/WorkflowExecutionConfigDetails.tsx:97–105`, not its labels/clamp/overflow algorithm. Use ticket labels “Show N hidden lines” / “Collapse”, existing `text-text-accent` (`tailwind.config.ts:371–410`), and a visible `focus-visible` outline; never copy missing `text-text-link` or `focus-visible:outline-none`. Keep `type="button"`, add `aria-expanded`, functional toggle and a persistent button node. No shared abstraction or sibling edits. Disclosure needs a valid block container; leave the non-opt-in path unchanged. Pin exact button names, focus styling and block containment in the tests.
- [ ] Rerun the same focused command; require all files passing without import failures.

### Task 2 — Opt in tool Result segments and pin caller/lifecycle boundaries

**Files:** Modify `src/components/Thought/ThoughtMessage.tsx:73–132`; extend `src/components/Thought/__tests__/ThoughtMessage.test.tsx` and `src/components/Thought/__tests__/Thought.test.tsx`. Only minimal local fixtures in those tests.
**Interface:** Pass Task 1's `collapsible` prop only to the existing plain-text TextBlock branch; no new Thought/card props.
**Test-first: yes — eligible tool Results preview while excluded authors/Input stay full; streaming and completed reopen fail without the opt-in.**

- [ ] Add real-renderer cases for explicit Tool, hydrated Tool-default data and missing-author nested data with non-empty `tool_name`. Exclude Agent, WorkflowState even with `tool_name`, unknown types and identity-free Thoughts. Pin independent long segments around a document, same-id threshold/tail/expanded streaming, completed close/reopen reset and full long Input. Retain markdown, WorkflowState JSON/markdown, image/document and nested-card checks; for long excluded content assert unchanged renderer payload/content and no new “Show N hidden lines” / “Collapse” control (existing document controls remain).
- [ ] After approval, run `npx vitest run --project unit src/components/Thought/__tests__/ThoughtMessage.test.tsx src/components/Thought/__tests__/Thought.test.tsx`; expect missing tool-preview assertions to fail.
- [ ] Opt in **explicit Tool, or null/undefined author type with non-empty tool_name**, explicitly excluding `WORKFLOW_STATE_AUTHOR_TYPE`; use `ThoughtAuthorType.Tool`, not icons or “not Agent”. Evidence: `src/utils/chatHelpers.ts:171–180` defaults top-level hydrated authors to Tool but passes children through; `src/store/chatGeneration.ts:1791–1834` retains optional metadata. No hydration/store changes: raw identity-free Thoughts stay full.
- [ ] Pass the predicate per existing plain-text segment; preserve parsing, index keys, format precedence and all other renderer branches. No text/count keys or reset effects: `src/components/Thought/Thought.tsx:54–89` retains streaming bodies and unmounts closed completed bodies. Reply/copy and workflow drawer Raw remain untouched; Task 1 pins default-off behavior. Preserve `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx:65–69`: both clipboard formats derive solely from `message.response`, never tool output or its rendered view.
- [ ] Rerun the same two focused files plus Task 1's file; require passing files without import failures, no whole-suite/browser gate.

## Negative-constraint check

Tasks 1–2 honor all global non-goals and excluded callers/renderers. Task 1 preserves line semantics; Task 2 positively identifies tools, never every Thought. No task violates a stated negative constraint.

**Pending evidence/risk:** Nothing implemented/tested. Backend metadata completeness remains unverified; identity-free raw Thoughts stay full. Stable segment streaming is covered; parser-switch/reordering is not redesigned.
