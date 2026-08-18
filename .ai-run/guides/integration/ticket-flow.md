# Ticket Flow

**Status**: configured
**Adapter**: Invoke the `codemie-jira-assistant` skill via the Skill tool.
**Workflow source**: Jira EPM-CDME workflow (BACKLOG, DEV, TO REVIEW, TO MERGE, QA, READY FOR PROD, RELEASED)

**Adapter invocation**: codemie assistants chat "289d2751-afd9-4c77-a272-90df7cd71702" "{message}"

**Known states**: BACKLOG, DEV, TO REVIEW, TO MERGE, QA, READY FOR PROD, RELEASED

**Action message template**: "Transition Jira ticket {ticket_id} to status {state}, then tell me the current status of the ticket."

**Timeout**: 120

**Transitions** (forward-only, in workflow order):

| When                                  | Set state    |
|---------------------------------------|--------------|
| `phase.completed` phase=2             | DEV          |
| `work_item.linked_artifact` kind=mr   | TO REVIEW    |

**Out of scope**: TO MERGE, QA, READY FOR PROD, RELEASED — driven by reviewer
approval, the post-merge QA pipeline, and release tooling outside the SDLC
factory. Add rows here if those stages start emitting matching events.

**Why the invocation is a shell line here and a Skill invocation in `project.md`.**
The `ticket-sync` hook runs in a sub-shell and cannot call the Skill tool, so this
field carries the assistant's CLI form. `project.md` § Ticket Adapter is the
declaration agents read, and it stays Skill-only. The two must name the same
adapter; change both together.
