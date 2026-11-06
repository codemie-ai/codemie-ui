# Tool-call confirmation inside sub-assistants — Story

**Date**: 2026-10-28
**Status**: Approved (revised during EPMCDME-16463 spec, see notes marked *Revised*)
**Ticket**: EPMCDME-16461

> *Revised during EPMCDME-16463 spec:* the items marked *Revised* changed while the backend spec was reviewed. This copy is the reference for the task. Bringing `docs/stories/` and Jira EPMCDME-16461 in line with it is a follow-up.

---

## Context

- **How confirmation works today.** Tool-call confirmation (Allow / Deny) is set per assistant by its tool-call policy: auto approve, approve for me, or ask for approval. A conversation can override it, and a customer minimum policy can raise it. It works only for the top-level assistant of a chat (EPMCDME-13903).
- **Sub-assistants are dropped silently.** An orchestrator delegates to sub-assistants. A sub-assistant whose resolved policy requires confirmation is refused when the orchestrator is built. The refusal is only logged, so the sub-assistant silently disappears while the orchestrator still offers to delegate to it. The user sees no error, and the delegation does nothing or fails. A related issue is EPMCDME-14900, where sub-assistants are dropped for another reason.
- **Only the orchestrator's own calls can be confirmed.** This includes "delegate to sub-assistant X". After that, X's tools run without asking, whatever X's policy says.
- **The reason is technical.** Sub-assistants run inside a wrapper that cannot be paused. The saved state of a paused chat holds one level only. Both the step tree streamed to the chat and the resume look for a waiting step at the top level only.
- **The chat looks only at the top level.** It shows a sub-assistant's work as steps nested under the delegation step. Allow / Deny is drawn only for top-level steps, and the prompt and reload logic look only at the top level.
- **A prototype exists.** The CodeMinions branches already find waiting steps at any depth, draw Allow / Deny inside the nested step and open it automatically. The prototype is behind main, so it is a reference, not a merge source.

---

## Complexity

**Size**: XL (29/36) · **Recommended flow**: sdlc-standard (split declined, see D4)

This covers two repositories and a new backend mechanism (pausable sub-assistants with nested saved state), on top of a small UI change that is already prototyped. The assessor recommended splitting by repository.

---

## Story

**As a** user of an orchestrator assistant whose sub-assistants have write tools, **I want** a sub-assistant's tool call to wait for my Allow / Deny, shown under the delegation step that called that sub-assistant, **so that** the confirmation policy protects me in multi-agent chats as it does with a single assistant.

---

## Background

Confirmation exists so that the user decides on actions with side effects: creating tickets, pushing code, sending messages. In multi-agent setups those actions are usually taken by sub-assistants, and that is exactly where confirmation does not work today. Either the sub-assistant silently disappears, or, with auto-approve, it acts without asking. Customers who raise the minimum policy for safety get broken orchestrators instead. Multi-agent use is growing, so the gap grows with it.

---

## Acceptance Criteria

- [ ] **Waiting step.** Given an orchestrator O with sub-assistant S whose policy is "ask for approval", when the user asks O to have S create a Jira ticket, then S's create call waits. Allow / Deny is shown on that waiting step, which sits under the delegation step that called S, its immediate container. *Revised: placement wording.*
- [ ] **Allow.** Given that waiting call, when the user clicks Allow, then the ticket is created, S finishes its turn, and O continues and finishes its reply.
- [ ] **Deny.** Given that waiting call, when the user clicks Deny, then the ticket is not created, S is told the call was denied, and S and then O finish their turns.
- [ ] **Approve for me.** Given S with "approve for me", when S makes read-only calls and write calls, then the read-only calls run without asking and each write call waits for its own Allow / Deny. If they come in the same step, the read-only calls wait until the write calls are decided, and each call runs once. *Revised: mixed batches.*
- [ ] **Customer minimum.** Given a customer minimum policy of "ask for approval", when a sub-assistant makes a tool call in a chat, then the call waits for Allow / Deny, whatever S's own policy is. In channels that cannot resume a pause, S is left out with a warning instead (see the "Not available" criterion below). *Revised.*
- [ ] **Conversation override.** Given a conversation-level policy override, when a sub-assistant allows overrides, then the override applies to it as it does to the top-level assistant.
- [ ] **Reload.** Given a nested call waiting for a decision, when the user reloads the page, then the waiting step is shown open with working Allow / Deny, and the prompt stays blocked until the decision.
- [ ] **Hidden tool outputs.** Given a nested call waiting for a decision, when the user hides tool outputs, then the step that waits is still shown.
- [ ] **Single assistant.** Given a single assistant with confirmation, when it makes one call, then confirmation behaves as today. These are the intended changes for a single assistant:
  - When it makes several calls in one step, every call that needs confirmation is shown one at a time. Today only the first is shown and the rest are denied silently.
  - With smart tool selection, its calls are now confirmed; today they are not.
  - After a click, the step shows "Allowed" / "Denied" until the first chunk of the response arrives. *Revised (EPMCDME-16464 spec, user-approved).*
  - While a pause is live, steps that are suspended show "Waiting" instead of "Success". *Revised (EPMCDME-16464 spec, user-approved).*
  - Steps of a pause that the backend abandoned show "Not run". *Revised (EPMCDME-16464 spec, user-approved).*
  - Allow / Deny stay disabled until the stream that paused the turn has ended. *Revised (EPMCDME-16464 spec, user-approved).*
  - A resume error shows a toast with the backend's message, and the paused message is left intact. *Revised (EPMCDME-16464 spec, user-approved).*

  *Revised.*
- [ ] **Available for delegation.** Given a sub-assistant with any tool-call policy, when the orchestrator is built for a chat, then the sub-assistant is available for delegation. It is no longer refused because of its policy. *Revised: limited to chat.*
- [ ] **Not available.** In channels that cannot resume a pause (workflow nodes, the A2A server, the health check, sync and background chat requests), a sub-assistant that requires confirmation is left out cleanly. It is not offered for delegation, and a warning names it, its policy and the channel. The same applies in every channel to a sub-assistant that cannot pause because of its model type. *Revised: new.*
- [ ] **Several waiting calls.** Given several calls waiting in one pause, whether from one sub-assistant or from sub-assistants working in parallel, then they are shown one at a time. Nothing runs until all of them are decided, and each runs once. *Revised: new.*
- [ ] **Chats waiting at release.** Given a chat that was waiting for a decision when this change was released, when the user clicks Allow or Deny, then nothing runs and the user is asked to send the request again. *Revised: new.*

---

## Out of Scope

- Confirmation inside workflow nodes, the A2A server, the health check, and sync or background chat requests.
- A contract that shows several pending decisions at once (EPMCDME-16342). Several waiting calls are shown one at a time. *Revised.*
- Changing the policy model or adding per-tool policies.
- Sub-assistants dropped for reasons other than the confirmation policy (EPMCDME-14900).

---

## Decisions

- **D1: Should a separate step report the silently dropped sub-assistant?** No. In chat, no policy makes a sub-assistant unsupported any more. In channels that cannot resume a pause, and for sub-assistants that cannot pause, the sub-assistant is left out cleanly with a warning. — user. *Revised.*
- **D2: Where is Allow / Deny shown?** On the waiting step, under its immediate container: the delegation step that called the sub-assistant. The containing steps open automatically. — user (revised round 3). *Revised.*
- **D3: Is the prototype merged?** No. It is used as a reference, because it is behind main. — proposed by PO: technical-analysis §8.
- **D4: Should backend and UI be split into separate stories?** No. One story covers codemie and codemie-ui, and the UI consumes the nested step contract. The backend and the UI deploy together, with no feature flag. — user. *Revised.*

---

## Open Questions

- Who owns confirmation in workflow nodes and over A2A, and under which ticket? *Revised.*
- Which ticket covers the save-time depth rule? It is "one level deep", while the runtime supports any depth. *Revised.*
