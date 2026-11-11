# Technical Research

**Task**: chat tool-output TextBlock ThoughtMessage
**Generated**: 2026-11-02
**Research path**: filesystem; stage0 codegraph absent

---

## 1. Original Context

h2. Context

* A tool call in the chat is a collapsible card; its Result shows the tool's output. Plain-text output is shown in full, line by line; Markdown, images and documents in a result are rendered separately.
* The same plain-text block is also used for a tool's Input and for workflow state output; those must not change.
* While a tool streams, its output grows in place in the same card, so a view choice made by the user survives the stream; closing and reopening the card starts it afresh.
* Copying a chat message copies the assistant's reply, not the tool outputs, so this change cannot affect copying.
* The product already has a "Show more / Show less" text toggle elsewhere (workflow execution details).

----

h2. Story

*As a* user who watches an assistant run tools (commands, test runs, API calls), *I want* a long tool output to show its beginning and its end, with a way to see all of it and to collapse it again, *so that* the reply stays readable and I see what was run and how it ended without scrolling through the whole log.

----

h2. Background

A long log in a tool's result makes the message very tall and pushes the assistant's reply far down. What the user usually needs is the beginning (what was run, the first errors) and the end (the result or the final error). Agents that run builds, tests and scripts produce such outputs on almost every turn, so the problem grows with agentic use of the chat.

----

h2. Acceptance Criteria

[] Given a tool result of plain text with 100 lines, when the user opens the tool card, then lines 1–20 and 81–100 are shown, and between them a "Show 60 hidden lines" control replaces lines 21–80.
[] Given the collapsed view, when the user clicks "Show 60 hidden lines", then all 100 lines are shown, with a "Collapse" control.
[] Given the expanded view, when the user clicks "Collapse", then the view returns to the first 20 and last 20 lines with the hidden-lines control.
[] Given a tool result of 59 lines or fewer (fewer than 20 lines could be hidden), when the user opens the card, then the full output is shown with no control, exactly as today.
[] Given a tool result of exactly 60 lines, when the user opens the card, then lines 21–40 are hidden behind "Show 20 hidden lines".
[] Given a tool output that is still streaming in the collapsed view, when new lines arrive, then the first 20 and the latest 20 lines stay visible and the hidden-lines count updates; the control appears once at least 20 lines can be hidden.
[] Given a tool result rendered as Markdown, an image or a document, when the card is opened, then it looks exactly as today.
[] Given a tool's Input section or a workflow state output, when it has more than 20 lines, then it is shown in full as today (not collapsed).
[] Given the toggle, when it is used with a keyboard or a screen reader, then it is focusable and announces whether the full output is shown.

----

h2. Out of Scope

* Collapsing tool Input, workflow state output or the assistant's reply.
* Remembering the expanded state after the card is closed or the page is reloaded.
* Search, wrapping or syntax highlighting in tool output.
* A user setting for the number of lines.

----

h2. Decisions

* D1: What counts as a line? → A non-empty line as displayed today (empty lines are already not shown). — proposed by PO: the count the user sees must match what is on screen; technical-analysis §6.
* D2: What stays visible? → The first 20 and the last 20 lines; the middle is hidden only when at least 20 lines can be hidden (60 lines or more). — user.
* D5: Can the expanded output be collapsed again? → Yes, with a "Collapse" control. — user.
* D3: Is the expanded state kept when the card is closed and reopened? → No, a reopened card starts collapsed. — proposed by PO: matches how the card already resets its body; technical-analysis §6.
* D4: A result split into several text parts (around documents)? → Each text part is collapsed on its own. — proposed by PO: keeps documents in place between them; technical-analysis §6.

----

h2. Open Questions

* None

---

## 2. Codebase Findings

### Existing Implementations

- **Logs:** `src/components/markdown/TextBlock.tsx:23–34`: memoized `text.split(/\\n|\n/).filter(line => line.length)`; ALL lines as index-keyed divs inside paragraph. No preview/toggle; callers below.
- **Formats:** `src/components/Thought/ThoughtMessage.tsx:33–152`: all authors; Markdown allow-list/format/flagged non-JSON WorkflowState → Markdown; flagged WorkflowState JSON → CodeBlock. Valid arrays precede document parsing; invalid arrays → raw text. Plain parts → TextBlock; images/documents separate; consumer Thought Result.
- **Lifetime:** `src/components/Thought/Thought.tsx:37–89`: local expansion; expanded OR in_progress mounts body; completed close unmounts; separate Input/id-keyed children.
- **Stream identity:** `src/store/chatGeneration.ts:1791–1850`: _handleThought/_findThought recursively match id, append in place (replace after interruption), merge author/format, attach children. Dispatch :1767 separates reply chunks. Consumer ChatAiMessage.
- **Reply/cards:** `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:183,275–281`: snapshots/id keys, hideToolOutputs except interruptions; separate reply Markdown.
- **Workflow full output:** `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx:51–147`: store fetch; main CodeBlock; popup Raw TextBlock/Markdown preview, not line disclosure.
- **Sibling toggle:** `src/pages/workflows/details/configuration/WorkflowExecutionConfigDetails.tsx:38–48,84–105`: overflow/clamp-4, native Show more/less. `self-start text-xs text-text-link cursor-pointer hover:underline focus-visible:outline-none`; not exported.
- **Copy:** `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx:65–69`: both clipboard formats from response, never tool DOM.
- **Other touched code:** `src/utils/messageFormat.ts:30–84`: ordered text/image parts without ids; only ThoughtMessage consumes. `src/components/Thought/ThoughtDocument.tsx:29–58`: local document disclosure. `src/components/Button/Button.tsx:30–113`: native/ARIA forwarding, default buttonType=button.

### Decisions Already in the Code

- TextBlock excludes zero-length pieces, not whitespace; CR preserved; logical lines ≠ wrapped rows. Document parser trims boundaries (ThoughtMessage :49–54). Normalization absent; reason: none found.
- ThoughtMessage :124 index keys: stable append retains identity; parser switches/reordering can remap it; no persisted state.
- `src/types/entity/conversation.ts:46–49,114–123`: optional/string author_type, Tool='Tool', Assistant='Agent'; WorkflowState separate. ThoughtHeader :75 tool icon means ANY non-Agent, not tool classification.
- `src/utils/chatHelpers.ts:171–180`: missing hydrated author defaults Tool, unlike live new thoughts. `src/store/chats.ts:475–492`: SSE blocks GET tree replacement. Backend metadata completeness unverified; other reasons none found.

### Task Statements Checked Against the Code

- **Holds:** full/shared text, separate formats/copy, sibling toggle; D1 qualified by whitespace/CR/wrapped-row rules.
- **Holds / contradicted unconditionally:** append retains id; D3 resets completed, not streaming bodies.
- **Keeps mechanisms:** excluded Input/workflow/reply/formats/copy; D4 ordered separate text parts/document disclosure.
- **Contradicted as current, requested as new:** D2/D5, 59/60/100 previews/live counts/accessibility absent.
- **Holds:** no search/highlighting/settings/persistence. **Unverified:** log frequency/producer stability; no capture supplied.

### Consumers of Changed Contracts

- ALL production TextBlock callers read: ThoughtMessage :130 (all plain Results), Thought :79 (Input), WorkflowStateOutput :106 (Raw); optional text/className, full-output contract preserved for exclusions.
- ThoughtMessage only caller Thought :86; includes nested and WorkflowState Results, separate from drawer Raw.
- Real-renderer Thought/ThoughtMessage tests; workflow output test :101 mocks TextBlock. No other callers/preview contracts found. git status: clean EPMCDME-16459_tool-output before document.

### Architecture and Layers Affected

- Presentation: text/Result/card lifecycle; state/hydration evidence only.

### Integration Points

- Valtio stream → cards → parser/format renderers; separate workflow fetch; no adjacent DB.

### Patterns and Conventions

- Local hooks/memos, React keys, native buttons, semantic Tailwind.

## 3. Documentation Findings

### Guides and Architecture Docs

- Component-patterns read FIRST; architecture/styling/accessibility/testing guides read. Source React 19.2.8 overrides React 18 guides.

### Architectural Decisions

- Current ticket governs; obsolete last20 analysis not reused. SSE ownership comments; no preview ADR.

### Derived Conventions

- Splitter/keys supply undocumented rules.

## 4. Testing Landscape

### Existing Coverage

- Thought __tests__: Thought.test.tsx (real Input/Result/nesting/lifetime); ThoughtMessage.test.tsx (images); ThoughtDocument.font.test.tsx (styles).
- Workflow adjacent tests mock heights/renderers. chatGeneration.test.ts:615–713 covers append/metadata; ChatAiMessage tests include WorkflowState.

### Testing Framework and Patterns

- Vitest 5.0.2/RTL 16.3.0; vite.config.ts:115–135 unit/integration. Unit snapshots are synchronous mocks.

### Coverage Gaps

- No direct TextBlock/messageFormat tests. Needs only identified: 0/40/59/60/100; newline/whitespace/CRLF; live tail/threshold/state; reopen; segments/reparse; exclusions; keyboard/ARIA/markup. None run/written.

## 5. Configuration and Environment

### Environment Variables

- None in TextBlock/Thought/ThoughtMessage.

### Configuration Files

- package.json/vite.config.ts/tailwind.config.ts: dependencies/tests/themes. text-text-link absent; text.accent exists (:374).
- Bash commands: cat, ls, head, nl -ba, sed -n, rg, grep, tail, git status --short --branch, python3 (document-only edit/sizing). Initial path/search failures corrected; python absent.

### Feature Flags and Deployment Concerns

- appInfoStore feature:renderStateOutputAsMarkdown; Markdown authors Codemie Thoughts/Browser Take Screenshot (constants/index.ts:60–64). No preview setting/deployment/secret found.

## 6. Risk Indicators

- Shared TextBlock serves Input and workflow Raw output; preserved contracts are listed in §2.
- Tool-like header icons include WorkflowState; author metadata is optional and hydration differs from live chunks.
- Streaming forces the body mounted; completed close resets it, but completion while the header remains closed unmounts it.
- Index-keyed parts may remap on parser switches/reordering.
- Existing TextBlock nests divs inside a paragraph; its markup is invalid.
- Sibling toggle lacks focus outline/aria-expanded; text-link token absent.
- Line edge cases/real streaming lack direct coverage.
- Skipped tests, gates, installs and browser verification as requested; runtime behavior remains unverified.

## 7. Summary for Complexity Assessment

Presentation research covers TextBlock, ThoughtMessage/card lifetime and sibling disclosure. Streaming/hydration explain identity/routing; no backend/schema/configuration change is established.

Line rendering exists, first/last disclosure does not. Tests omit preview/stream-state coverage. Shared callers, optional authors, positional segments and invalid markup constrain this task.

## 8. External References

- Resolved/read: `/home/dmytromelnyk4/.codex/codemie/home/plugins/cache/sdlc-factory/sdlc-factory/0.9.15/agents/tech-analyst-filesystem.md` — filesystem research/output contract.
- Resolved/read: `/home/dmytromelnyk4/.codex/codemie/home/plugins/cache/sdlc-factory/sdlc-factory/0.9.15/references/architecture/facts.md` — purpose/decisions/statements/consumers facts; speculative design only in risks.
- Attachments parent-fetched, not inspected here; current ticket verbatim.
