# EPMCDME-13738 — Per-workflow scope for personal integration settings

**Status**: approved design, ready for planning
**Repos**: `codemie` (backend), `codemie-ui` (frontend) — branch `feature/EPMCDME-13738-per-workflow-integration-scope`
**Inputs**: `technical-analysis.md`, `complexity-assessment.json` (XL, 30/36; `split-required` overridden by the product owner — the feature cannot be released in parts, so it ships as one story with internal phases)

---

## 1. Problem

A personal integration selection is stored per user and assistant
(`assistant_user_mapping`, unique on `(assistant_id, user_id)`), so a choice made anywhere applies
everywhere the assistant runs: chat, the assistant page and every workflow. Since EPMCDME-13529 the
selection is editable from the assistant side-panel on the workflow executions page, which makes the
global effect surprising: a user adjusting credentials for one workflow silently changes their chat
and every other workflow.

## 2. Goal

Add a second, narrower personal scope — user + assistant + workflow — used by default when the
selection is saved from a workflow screen, and keep the existing assistant-wide scope reachable from
the same panel through one explicit checkbox.

Reaching that goal turned out to require a precondition: every integration slot must first follow the
same rules, and the author's decision about a slot must be storable at all. Section 4.8 describes
that model; without it a per-workflow selection sits on top of behaviour that differs per tool type
and cannot express "the author left this to the user".

## 3. Non-goals

- Any visual marker that a workflow-scoped selection is overriding the assistant one, and any
  explicit "reset to assistant settings" control.
- Per-toolkit or mixed scopes inside one save, and per-node scopes.
- Pinning by the workflow owner that would apply to other users.
- Cleaning up selections belonging to deleted workflows.
- Reinstating the editor-side "View Assistant" tab removed in EPMCDME-13529 (`0cdeefc01`).

---

## 4. Behaviour

### 4.1 Scopes

Two personal scopes, both private to the user who saved them:

| Scope | Key | Applies to |
|---|---|---|
| Assistant (existing) | assistant + user | chat, assistant page, every workflow |
| Workflow (new) | assistant + user + workflow | that assistant inside that workflow only |

The workflow scope is keyed by the workflow, not by the node, so an assistant appearing in several
nodes of one workflow shares a single selection (AC 23).

### 4.2 Resolution

For a user-selectable integration slot the effective integration is the first of:

1. the user's workflow-scoped selection for the workflow being executed;
2. the user's assistant-scoped selection;
3. automatic lookup — the user's own integration of that type — when the author left it enabled;
4. no integration, in which case the tool reports that when called (see 4.8).

Slots pinned by the assistant author are outside this chain: they are already excluded from the
selectable set on the frontend (`codemie-ui/src/utils/assistants.tsx:33,175`) and hard-blocked from
per-user override on the backend (`codemie/src/codemie/service/mcp/toolkit_service.py:1046-1050`,
`:1012`, `settings_handler.py:58`). EPMCDME-13337's "author-pinned is authoritative" invariant and
the tests that pin it (`tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py`)
stay untouched.

An empty `integration_id` means different things depending on the slot. For an MCP slot it keeps its
shipped meaning — no selection, fall back to the author's base configuration — and is stored as the
absence of the slot. For a regular tool slot it is an explicit user decision, stored and honoured as
"no integration" so that automatic lookup does not override it (see 4.8). This holds at both scopes.

### 4.3 Saving from the workflow executions panel

The section shows one checkbox, "apply to the whole assistant", governing the whole section
including sub-assistant settings.

- **Unticked** (default when the user already has an assistant-scoped selection): the save writes
  the workflow-scoped row for this workflow, assistant and user. Chat, the assistant page and other
  workflows are untouched.
- **Ticked** (default when the user has no assistant-scoped selection yet): the save writes the
  assistant-scoped row, and the workflow-scoped selection for this workflow and assistant stops
  applying, so the just-saved values are what runs in this workflow too. Workflow-scoped selections
  for *other* workflows are left alone.

The pre-ticked default exists so a user's first ever selection is not silently confined to one
workflow; unticking it before saving keeps the selection workflow-only.

### 4.4 Saving from the assistant page

Unchanged: no checkbox, the save always writes the assistant-scoped row.

### 4.5 Reading

Opening the panel from a workflow shows the effective selection: the workflow-scoped values where
they exist, otherwise the inherited assistant-scoped ones. The user cannot tell from the dropdown
which scope a value came from — that is deliberate (non-goal above).

### 4.6 Access to integrations

Unchanged, including for workflow-scoped saves: the integration must be usable by the requesting
user, validated against the **assistant's** project and its marketplace flag
(`_validate_mapping_access(..., assistant.project, marketplace=bool(assistant.is_global))`). The
workflow's own project and `is_global` do not participate — a workflow must not widen what the
assistant's project permits. Runtime keeps its fail-closed re-check
(`mcp/toolkit_service.py:1903`), so a selection that later becomes inaccessible is skipped and the
slot falls back to base configuration without failing the panel or the run.

### 4.7 Cloning and deletion

Cloning a workflow is a frontend-composed `GET` + `POST /v1/workflows` producing a new uuid, and the
selection lives outside the workflow payload — so no selection is copied. Deleting a workflow leaves
its rows behind; they are unreachable (uuid4 is never reused) and cleanup is out of scope.

---

### 4.8 One integration model for every slot (precondition)

A slot is any place that takes an integration: a toolkit, a tool inside it, or an MCP server. The
author's decision for a slot has three states, and they must be distinguishable in stored data:

| Author's decision | Stored as | Resolved at run time | Shown to the user |
|---|---|---|---|
| Pinned integration | the integration on the slot | the author's integration, for everyone | nothing — the slot is not offered |
| Automatic lookup enabled | no integration, flag enabled | the user's own integration of that type | the resolved integration, pre-selected |
| Automatic lookup disabled | no integration, flag disabled | nothing | "No integration" |

Before this change the toggle was not stored at all: it was derived from "no integration pinned", so
"lookup disabled with nothing pinned" and "lookup enabled" were the same data and the author could
not express the difference. The decision is therefore persisted per slot, defaulting to enabled so
assistants created earlier keep resolving exactly as they do today.

Two rules complete the model:

- **The user's own decision wins**, including an explicit "No integration". That choice is remembered
  rather than treated as "nothing chosen yet"; otherwise automatic lookup would silently overwrite it
  on the next load. MCP slots keep their shipped meaning, where no selection means the author's base
  configuration.
- **A slot deliberately left without an integration keeps its tool.** The tool is still offered to the
  model and reports the missing integration when called, instead of disappearing from the assistant
  and leaving the user to guess why it cannot do what it advertises. This applies to the two
  deliberate states only — author disabled lookup, or user chose "No integration" — not to the case
  where no integration exists anywhere.

Personal selection is available on **every shared assistant**, not only marketplace ones. The runtime
already resolved personal selections regardless of `is_global`; only the interface restricted them,
so the same slot could resolve to the user's integration through one path and to the author's base
configuration through another.

### 4.9 Saving a workflow

A slot the author did not pin belongs to whoever runs the workflow, so the workflow author does not
need to own an integration for it. Such slots never block saving. They are reported back as
non-blocking warnings listing the affected tools, so the author knows which parts of the workflow
depend on each user's own setup.

## 5. Data model

Add `workflow_id` to `assistant_user_mapping` as a **`VARCHAR NOT NULL DEFAULT ''`** column, where
the empty string is the assistant scope and any other value is a workflow scope. Replace
`UniqueConstraint('assistant_id','user_id')` with `UniqueConstraint('assistant_id','user_id','workflow_id')`
and index `workflow_id` alongside the existing single-column indexes.

The empty-string sentinel is chosen over a nullable column because Postgres treats NULLs as
distinct, so `UNIQUE(assistant_id, user_id, workflow_id)` over a nullable column would not prevent
duplicate assistant-scoped rows — exactly the rows that must stay unique. It is also chosen over a
separate `workflow_user_mapping` table, because a second table would duplicate the repository,
service, router and DTO plumbing while both scopes need identical merge and validation behaviour.

The column follows the loose-string style already used for `assistant_id`/`user_id` and for
`workflow_id` elsewhere (`workflow_marketplace.py:42`, `WorkflowExecution.workflow_id`): plain
VARCHAR, no foreign key.

The author's per-slot decision (`auto_credentials_lookup`) lives on the toolkit and tool inside the
assistant's `toolkits` JSONB column, so it needs no schema migration; its default of `true` preserves
current behaviour for assistants saved before the field existed. An explicit user "No integration"
for a regular slot is stored as a mapping entry with an empty integration id — the entry has to exist,
because its absence is what "nothing chosen yet" means.

**Migration** — one additive revision on head `i1n2t3e4r5a6`, no `schema=` kwarg (the search path is
set by `env.py`), doing: add the column with server default `''`, backfill existing rows to `''`,
drop `uix_assistant_user_mapping`, create the three-column constraint, add the index. Existing
selections therefore stay assistant-scoped and no user re-selects anything.

## 6. Backend surface

**Repository** (`assistant_user_mapping_repository.py`, ABC *and* SQL impl): every method gains an
explicit `workflow_id: str = ""` scope argument, and `get_mapping` filters on all three columns.
This is the correctness centrepiece: today `get_mapping(...).first()` filters only on assistant and
user, so once workflow rows exist both current readers would pick an arbitrary row and leak a
workflow-scoped selection into chat and the assistant page. Add a way to clear a scope's row
(either a delete method or a documented "write empty `tools_config`" path) for the ticked-checkbox
case.

**Service** (`assistant_user_mapping_service.py`): the per-slot merge must read and write within one
scope. A workflow-scoped save must never merge against the assistant-scoped row, and vice versa.

**Router** (`assistant_mapping.py`):
- `POST /v1/assistants/{assistant_id}/users/mapping` gains an optional top-level `workflow_id` in
  the request body, plus a flag for the checkbox. When `workflow_id` is absent the endpoint behaves
  exactly as today, so existing clients and the assistant page are unaffected.
- With the checkbox ticked, the endpoint writes the assistant-scoped row and clears the
  workflow-scoped row for that workflow and assistant, in one request.
- `GET /v1/assistants/{assistant_id}/users/mapping` accepts an optional `workflow_id` query
  parameter and returns the **effective** selection (workflow over assistant) plus a top-level
  boolean telling the frontend whether an assistant-scoped selection exists, which is what drives
  the checkbox default. Without the parameter the response is exactly today's.
- New fields go at the top level of the DTOs, never inside `tools_config` entries — `from_db_model`
  flattens those to `{name, integration_id}` and would silently drop anything else.
- Access validation is called for workflow-scoped saves too, with the assistant's project as today.

**Reporting what automatic lookup would pick**: the mapping read accepts the credential types the
client displays and answers, for each of them, what applies right now. It reuses the resolution chain
that runs at execution time rather than reimplementing the rules, and every candidate passes the same
access check as an explicit save, so a setting the user may not use is never reported — reporting it
would repeat the metadata leak removed from the earlier "resolved default" implementation.

**Per-user selection for every shared assistant**: the gate that limited regular-tool mappings to
marketplace assistants is removed, because the settings-handler chain never applied it and the two
paths disagreed about the same slot. The handler in that chain additionally re-checks access before
honouring a stored mapping and fails closed without a user in context, so a selection that later
becomes inaccessible stops applying instead of resolving anyway.

**Workflow validation**: slots the author did not pin are excluded from the blocking
"missing integration" errors and collected as warnings instead; the save response carries them in a
dedicated field.

**Resolution path**: thread `workflow_id: str | None = None` through the three signatures that
separate the point where the workflow is known from the point where the mapping is read —
`workflows/utils/utils.py:512 initialize_assistant`, `assistant_service.py:759 build_agent_for_workflow`,
`assistant_service.py:362 _apply_marketplace_tool_mappings` — and pass `self.workflow_config.id` at
the two call sites (`agent_node.py:239`, `workflow.py:561`, the latter covering the autonomous
supervisor path). This mirrors how `owner_user_id` was threaded for EPMCDME-13337. The chat path
(`build_agent`) passes nothing, so chat keeps assistant-scoped behaviour by construction.

Resolution reads the workflow scope with an assistant-scope fallback; prefer one query over two
round-trips, since this path has no caching and runs per assistant node per execution.

The settings-handler chain (`settings_handler.py`) needs the same scope awareness at its
`AssistantUserMappingSettingsHandler`, which constructs the repository directly. If the workflow id
cannot be threaded to every `retrieve_setting` caller, a context variable set and cleared where
`set_current_user` already is (`workflow.py:830`, `:893`) is the fallback mechanism — the workflow
runs on a background thread that does not inherit context, so those two lines are the only correct
places.

## 7. Frontend surface

An optional `workflowId` threads through four boundaries that today carry no workflow context:
`details/AssistantNodePanel.tsx` → `hooks/useAssistantForNode.tsx` → `AssistantDetailsEmbedded.tsx`
→ `AssistantDetailsMainSections.tsx` → `UserMapping.tsx`. The executions page already has the id
(`WorkflowDetailsPage.tsx:48`, route param `workflowId` — note the editor and clone routes use `id`
instead, so read the right param). The assistant page passes nothing, which is what keeps its
behaviour unchanged.

`UserMapping.tsx` renders the checkbox only when `workflowId` is present, defaults it from the
"assistant-scoped selection exists" flag returned by the load, and passes both the workflow id and
the checkbox state to the store's save. `SubAssistantUserMapping.tsx` saves through its own handler
and must send the same scope, so the section saves as one unit.

`store/assistants.ts` load and save gain the optional workflow id and the scope flag, and the load
additionally passes the credential types of the displayed slots so the panel can pre-select what
automatic lookup resolves. A slot is asked about only when the author left lookup enabled; MCP slots
are never asked about, since nothing is resolved for them without an explicit selection.

The assistant form owns the author's decision: the automatic-lookup toggle is read from stored data
rather than derived from "nothing pinned", and switching it writes the flag. Enabling it also clears
any pinned integration **in the same update** — two separate updates would each rebuild the toolkit
list from the same snapshot, and the second would silently revert the first.

The save confirmation names the scope it landed in ("for this workflow" or "for this assistant"), and
after saving a workflow the editor surfaces the returned warnings without treating them as failure. The candidate
integration options keep coming from the existing marketplace-scoped source, so the
`isSettingsIndexed` cache — keyed only on `(isSettingsIndexed, indexedMarketplace)` — stays correct;
it must not be given a workflow dimension unless the candidate set itself becomes workflow-dependent,
which this story does not do.

## 8. Testing

Backend: repository scope filtering including "same assistant and user, different workflow" and the
assistant-scope fallback; service merge isolation between scopes; router cases for save with and
without a workflow, the ticked-checkbox path clearing the workflow row, effective GET, and access
validation for a workflow-scoped save; settings-handler behaviour when both scopes exist; a
workflow-isolation case in the MCP credential-isolation suite (workflow X's selection must not reach
workflow Y); and updates to the existing tests that assert exact call kwargs.

Also on the backend: the three slot states and their resolution, an explicit "No integration" being
remembered for a regular slot while an MCP slot keeps clearing, a tool left without an integration
reporting it on use instead of vanishing, the reported automatic-lookup result being filtered by
access, and workflow saving succeeding for unpinned slots while reporting them as warnings.

Frontend: a first unit-test harness for `UserMapping.tsx` (it has none today) covering checkbox
visibility, its default state in both directions, and the payload for each scope; store tests for
load and save with a workflow id; and an executions-panel test asserting the workflow id reaches the
save.

Migration: not coverable by the suite — the DB engine is globally mocked and there are no alembic
DDL tests. Verify manually against a local Postgres: existing rows survive as assistant-scoped, the
old constraint is gone, the new one rejects duplicates within a scope, and downgrade works.

## 9. Rollout

Backend first is safe; frontend first is safe only because the field is genuinely optional. The
migration is additive and backward compatible: an old backend ignores a `workflow_id` it does not
know, and a new backend serves old clients unchanged.

## 10. Decisions taken

| Question | Decision |
|---|---|
| Does a personal selection outrank an author-pinned integration? | No. Pinned slots are not user-selectable at all; the story's original AC was wrong and has been corrected in Jira. |
| Where does the workflow scope apply? | The assistant side-panel on the workflow executions page. The editor tab was removed in EPMCDME-13529 and is not coming back here, so "unsaved workflow" cannot occur. |
| Checkbox granularity | One per section, covering sub-assistant settings too. |
| Scope key | The workflow, not the node. |
| Access gate project | The assistant's, as today. |
| Storage | One table, `workflow_id NOT NULL DEFAULT ''` sentinel, three-column unique constraint. |
| Split into several stories? | No — the feature cannot be released in parts. Phasing lives in the plan, and it ships as a single MR. |
| Is the author's auto-lookup decision stored? | Yes — per slot, defaulting to enabled. Deriving it from "nothing pinned" made two different intents indistinguishable. |
| What does "No integration" mean for a regular slot? | An explicit decision that is remembered and outranks automatic lookup. MCP keeps its shipped meaning of falling back to the author's base configuration. |
| What happens to a tool with no integration? | It stays in the tool set and reports the missing integration when called, rather than disappearing from the assistant. |
| Does the panel pre-select what automatic lookup resolves? | Yes, and saving pins that choice explicitly — the user sees which integration will be used and can override it. |
| Do unpinned slots block workflow saving? | No. They belong to whoever runs the workflow and are reported as warnings on save. |
