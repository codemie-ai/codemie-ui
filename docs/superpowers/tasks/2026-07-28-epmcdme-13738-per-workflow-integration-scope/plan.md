# EPMCDME-13738 — Per-workflow scope for personal integration settings: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user's personal integration selection be scoped to a single workflow when saved from the assistant panel on the workflow executions page, while keeping the existing assistant-wide scope reachable through one checkbox.

**Architecture:** The existing `assistant_user_mapping` table gains a `workflow_id` column whose empty-string value means "assistant scope". Every repository/service call becomes scope-explicit so today's readers keep seeing only assistant-scoped rows. Resolution during a workflow run passes the workflow id down three existing signatures (mirroring how `owner_user_id` was threaded in EPMCDME-13337) and merges the workflow-scoped slots over the assistant-scoped ones. The frontend threads an optional `workflowId` through four component boundaries and adds a single checkbox that flips the save scope.

**Tech Stack:** Backend — Python 3, FastAPI, SQLModel/SQLAlchemy, alembic, pytest. Frontend — React 18 + TypeScript, valtio, PrimeReact, vitest + React Testing Library.

## Global Constraints

- Repos: `codemie` (backend) and `codemie-ui` (frontend), both on branch `feature/EPMCDME-13738-per-workflow-integration-scope`.
- Commit subject format: `EPMCDME-13738: <short description>` — short subject, no multi-paragraph body.
- Never mention Jira ids, EPAM, internal URLs or people inside source files; the ticket lives only in branch/commit/MR.
- Do not stage `codemie/.env` (tracked, holds local secrets) and never `git reset --hard` in `codemie`.
- Frontend commits may need `--no-verify` (repo-wide husky eslint `@/` resolver breakage unrelated to this change); CI lint is the real gate.
- Scope sentinel: the empty string `""` means assistant scope. It is exported as `ASSISTANT_SCOPE` and must never be `None` in the DB.
- Author-pinned integration slots are out of scope for user selection at every layer — do not touch `mcp/toolkit_service.py:1046-1050`, `:1012` or the `settings_handler.py:58` global-assistant branch.
- Access validation for a workflow-scoped save uses the **assistant's** project and `marketplace=bool(assistant.is_global)`, exactly as today.
- Backend test command: `make test` (or `poetry run pytest <path> -v`). Frontend: `npm run test:unit -- <path>`.

---

## File Structure

**Backend (`codemie`)**

| File | Responsibility |
|---|---|
| `src/codemie/rest_api/models/usage/assistant_user_mapping.py` | Modify: add `workflow_id` column + `ASSISTANT_SCOPE`, widen unique constraint, extend request/response DTOs |
| `src/external/alembic/versions/w1o2r3k4f5l6_add_workflow_scope_to_assistant_user_mapping.py` | Create: additive migration on head `i1n2t3e4r5a6` |
| `src/codemie/repository/assistants/assistant_user_mapping_repository.py` | Modify: scope-explicit CRUD + `delete_mapping` |
| `src/codemie/service/assistant/assistant_user_mapping_service.py` | Modify: scope-isolated merge, `get_effective_tools_config`, `apply_to_assistant` handling |
| `src/codemie/rest_api/routers/assistant_mapping.py` | Modify: optional workflow reference on POST/GET |
| `src/codemie/service/settings/settings_handler.py` | Modify: read the workflow scope through the new context var, assistant scope otherwise |
| `src/codemie/rest_api/security/workflow_context.py` | Create: `_current_workflow_id` context var + set/reset/get |
| `src/codemie/service/assistant_service.py` | Modify: `workflow_id` parameter on `_apply_marketplace_tool_mappings` and `build_agent_for_workflow` |
| `src/codemie/workflows/utils/utils.py` | Modify: `workflow_id` parameter on `initialize_assistant` |
| `src/codemie/workflows/nodes/agent_node.py`, `src/codemie/workflows/workflow.py` | Modify: pass `self.workflow_config.id`; set/reset the workflow context var around the run |

**Frontend (`codemie-ui`)**

| File | Responsibility |
|---|---|
| `src/store/assistants.ts` | Modify: optional workflow scope on load and save |
| `src/pages/workflows/WorkflowDetailsPage.tsx` | Modify: pass `workflowId` to the panel |
| `src/pages/workflows/details/AssistantNodePanel.tsx` | Modify: accept and forward `workflowId` |
| `src/pages/workflows/hooks/useAssistantForNode.tsx` | Modify: accept `workflowId`, return it for the embedded view |
| `src/pages/assistants/components/AssistantDetails/AssistantDetailsEmbedded.tsx` | Modify: accept and forward `workflowId` |
| `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsMainSections.tsx` | Modify: forward `workflowId` to `UserMapping` |
| `src/pages/assistants/components/AssistantDetails/components/UserMapping/UserMapping.tsx` | Modify: checkbox, its default state, scoped load/save, pass scope to sub-assistants |
| `src/pages/assistants/components/AssistantDetails/components/UserMapping/SubAssistantUserMapping.tsx` | Modify: save in the scope chosen by the parent |

---

## API contract (fixed here, referenced by later tasks)

**POST** `/v1/assistants/{assistant_id}/users/mapping`

```json
{
  "tools_config": [{"name": "Git", "integration_id": "uuid-or-empty"}],
  "workflow_id": "workflow-uuid",
  "apply_to_assistant": false
}
```

- `workflow_id` absent/null → assistant scope; today's behaviour, byte for byte.
- `workflow_id` present, `apply_to_assistant` false → workflow scope only.
- `workflow_id` present, `apply_to_assistant` true → write assistant scope **and** delete the row for that workflow; rows of other workflows are untouched.

**GET** `/v1/assistants/{assistant_id}/users/mapping?workflow_id=<uuid>`

```json
{
  "id": "", "assistant_id": "...", "user_id": "...",
  "tools_config": [{"name": "Git", "integration_id": "uuid"}],
  "workflow_id": "workflow-uuid",
  "has_assistant_scope_selection": true,
  "created_at": null, "updated_at": null
}
```

- Without `workflow_id`: unchanged response, `workflow_id` empty and `has_assistant_scope_selection` reflecting the assistant-scoped row.
- With `workflow_id`: `tools_config` is the **effective** set — assistant-scoped slots overridden per slot name by workflow-scoped ones.

---

### Task 1: Storage — `workflow_id` column, constraint and migration

**Files:**
- Modify: `src/codemie/rest_api/models/usage/assistant_user_mapping.py:30-72`
- Create: `src/external/alembic/versions/w1o2r3k4f5l6_add_workflow_scope_to_assistant_user_mapping.py`
- Test: `tests/codemie/rest_api/models/usage/test_assistant_user_mapping_model.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `ASSISTANT_SCOPE: str = ""`; `AssistantUserMappingBase.workflow_id: str`; unique constraint `uix_assistant_user_mapping_scope` over `(assistant_id, user_id, workflow_id)`.

**Test-first: yes** — a test asserting the model exposes `workflow_id` defaulting to `ASSISTANT_SCOPE` and that the unique constraint covers three columns fails because the column does not exist.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/rest_api/models/usage/test_assistant_user_mapping_model.py
from codemie.rest_api.models.usage.assistant_user_mapping import (
    ASSISTANT_SCOPE,
    AssistantUserMappingSQL,
)


def test_new_mapping_defaults_to_assistant_scope():
    mapping = AssistantUserMappingSQL(assistant_id="a1", user_id="u1", tools_config=[])

    assert mapping.workflow_id == ASSISTANT_SCOPE
    assert ASSISTANT_SCOPE == ""


def test_unique_constraint_covers_the_scope_column():
    constraint = next(
        arg
        for arg in AssistantUserMappingSQL.__table_args__
        if getattr(arg, "name", None) == "uix_assistant_user_mapping_scope"
    )

    assert [column.name for column in constraint.columns] == ["assistant_id", "user_id", "workflow_id"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/rest_api/models/usage/test_assistant_user_mapping_model.py -v`
Expected: FAIL — `ImportError: cannot import name 'ASSISTANT_SCOPE'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/codemie/rest_api/models/usage/assistant_user_mapping.py

# Scope sentinel: an empty workflow id means the mapping applies to the assistant everywhere.
# Postgres treats NULLs as distinct, so a nullable column would not keep assistant-scoped rows
# unique — the sentinel keeps a plain three-column unique constraint working.
ASSISTANT_SCOPE = ""


class AssistantUserMappingBase(CommonBaseModel):
    ...
    user_id: str = SQLField(index=True)
    workflow_id: str = SQLField(default=ASSISTANT_SCOPE, index=True, nullable=False)
    ...

    __table_args__ = (
        UniqueConstraint('assistant_id', 'user_id', 'workflow_id', name='uix_assistant_user_mapping_scope'),
        Index('ix_assistant_user_mapping_assistant_id', 'assistant_id'),
        Index('ix_assistant_user_mapping_user_id', 'user_id'),
        Index('ix_assistant_user_mapping_workflow_id', 'workflow_id'),
    )
```

Also extend `create_with_tools_config` with `workflow_id: str = ASSISTANT_SCOPE` and pass it into the constructed instance.

- [ ] **Step 4: Run test to verify it passes**

Run: `poetry run pytest tests/codemie/rest_api/models/usage/test_assistant_user_mapping_model.py -v`
Expected: PASS

- [ ] **Step 5: Write the migration**

```python
# src/external/alembic/versions/w1o2r3k4f5l6_add_workflow_scope_to_assistant_user_mapping.py
"""add_workflow_scope_to_assistant_user_mapping

Revision ID: w1o2r3k4f5l6
Revises: i1n2t3e4r5a6
Create Date: 2026-07-29 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'w1o2r3k4f5l6'
down_revision: Union[str, None] = 'i1n2t3e4r5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'assistant_user_mapping',
        sa.Column('workflow_id', sa.String(), nullable=False, server_default=''),
    )
    op.drop_constraint('uix_assistant_user_mapping', 'assistant_user_mapping', type_='unique')
    op.create_unique_constraint(
        'uix_assistant_user_mapping_scope',
        'assistant_user_mapping',
        ['assistant_id', 'user_id', 'workflow_id'],
    )
    op.create_index(
        'ix_assistant_user_mapping_workflow_id', 'assistant_user_mapping', ['workflow_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_assistant_user_mapping_workflow_id', table_name='assistant_user_mapping')
    op.drop_constraint('uix_assistant_user_mapping_scope', 'assistant_user_mapping', type_='unique')
    # Workflow-scoped rows would violate the two-column constraint; drop them on the way down.
    op.execute("DELETE FROM assistant_user_mapping WHERE workflow_id <> ''")
    op.create_unique_constraint(
        'uix_assistant_user_mapping', 'assistant_user_mapping', ['assistant_id', 'user_id']
    )
    op.drop_column('assistant_user_mapping', 'workflow_id')
```

Existing rows get `''` from the server default, so they stay assistant-scoped and nobody re-selects anything.

- [ ] **Step 6: Verify the migration chain is single-headed**

Run: `poetry run alembic -c src/external/alembic/alembic.ini heads`
Expected: exactly one head, `w1o2r3k4f5l6`

- [ ] **Step 7: Commit**

```bash
git add src/codemie/rest_api/models/usage/assistant_user_mapping.py \
        src/external/alembic/versions/w1o2r3k4f5l6_add_workflow_scope_to_assistant_user_mapping.py \
        tests/codemie/rest_api/models/usage/test_assistant_user_mapping_model.py
git commit -m "EPMCDME-13738: Add workflow scope column to assistant user mapping"
```

---

### Task 2: Repository — scope-explicit CRUD

**Files:**
- Modify: `src/codemie/repository/assistants/assistant_user_mapping_repository.py:37-186`
- Test: `tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py`

**Interfaces:**
- Consumes: `ASSISTANT_SCOPE` from Task 1.
- Produces:
  - `get_mapping(assistant_id: str, user_id: str, workflow_id: str = ASSISTANT_SCOPE) -> Optional[AssistantUserMappingSQL]`
  - `create_or_update_mapping(assistant_id: str, user_id: str, tools_config: List[ToolConfig], workflow_id: str = ASSISTANT_SCOPE) -> AssistantUserMappingSQL`
  - `delete_mapping(assistant_id: str, user_id: str, workflow_id: str) -> None`

**Test-first: yes** — a test asserting `get_mapping` filters on `workflow_id` fails because the query has only two predicates.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py
def test_get_mapping_filters_on_workflow_scope(mock_session):
    repo = SQLAssistantUserMappingRepository()

    repo.get_mapping("assistant-1", "user-1", workflow_id="workflow-1")

    executed_query = mock_session.exec.call_args[0][0]
    rendered = str(executed_query)
    assert "workflow_id" in rendered


def test_get_mapping_defaults_to_assistant_scope(mock_session):
    repo = SQLAssistantUserMappingRepository()

    repo.get_mapping("assistant-1", "user-1")

    rendered = str(mock_session.exec.call_args[0][0])
    assert "workflow_id" in rendered
```

Follow the file's existing fixture style (`patch("...assistant_user_mapping_repository.Session", MagicMock())` plus `patch.object(AssistantUserMappingSQL, "get_engine", ...)`); add the `mock_session` fixture there if it does not exist yet.

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py -v`
Expected: FAIL — `TypeError: get_mapping() got an unexpected keyword argument 'workflow_id'`

- [ ] **Step 3: Write minimal implementation**

In the ABC and the SQL implementation:

```python
    def get_mapping(
        self, assistant_id: str, user_id: str, workflow_id: str = ASSISTANT_SCOPE
    ) -> Optional[AssistantUserMappingSQL]:
        with Session(AssistantUserMappingSQL.get_engine()) as session:
            query = select(AssistantUserMappingSQL).where(
                AssistantUserMappingSQL.assistant_id == assistant_id,
                AssistantUserMappingSQL.user_id == user_id,
                AssistantUserMappingSQL.workflow_id == workflow_id,
            )
            return session.exec(query).first()

    def create_or_update_mapping(
        self,
        assistant_id: str,
        user_id: str,
        tools_config: List[ToolConfig],
        workflow_id: str = ASSISTANT_SCOPE,
    ) -> AssistantUserMappingSQL:
        mapping = self.get_mapping(assistant_id, user_id, workflow_id)
        ...
                mapping = AssistantUserMappingSQL(
                    id=str(uuid4()),
                    assistant_id=assistant_id,
                    user_id=user_id,
                    workflow_id=workflow_id,
                    tools_config=tools_config,
                )

    def delete_mapping(self, assistant_id: str, user_id: str, workflow_id: str) -> None:
        """Remove one scope's row so resolution falls back to the wider scope."""
        with Session(AssistantUserMappingSQL.get_engine()) as session:
            query = select(AssistantUserMappingSQL).where(
                AssistantUserMappingSQL.assistant_id == assistant_id,
                AssistantUserMappingSQL.user_id == user_id,
                AssistantUserMappingSQL.workflow_id == workflow_id,
            )
            mapping = session.exec(query).first()
            if mapping:
                session.delete(mapping)
                session.commit()
```

`delete_mapping` needs an `@abstractmethod` stub in the ABC too.

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py -v`
Expected: PASS (including the pre-existing tests, which keep calling the two-argument form)

- [ ] **Step 5: Commit**

```bash
git add src/codemie/repository/assistants/assistant_user_mapping_repository.py \
        tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py
git commit -m "EPMCDME-13738: Make assistant user mapping repository scope-explicit"
```

---

### Task 3: Service — scope-isolated merge and effective read

**Files:**
- Modify: `src/codemie/service/assistant/assistant_user_mapping_service.py:36-91`
- Test: `tests/codemie/service/assistant/test_assistant_user_mapping_service.py`

**Interfaces:**
- Consumes: repository methods from Task 2.
- Produces:
  - `create_or_update_mapping(assistant_id, user_id, tools_config, workflow_id=ASSISTANT_SCOPE, apply_to_assistant=False)`
  - `get_mapping(assistant_id, user_id, workflow_id=ASSISTANT_SCOPE)`
  - `get_effective_tools_config(assistant_id, user_id, workflow_id) -> tuple[list[ToolConfig], bool]` — returns the merged slots and whether an assistant-scoped row exists.

**Test-first: yes** — a test asserting a workflow-scoped save merges against the workflow row (not the assistant row) fails because the service always reads the assistant row.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/service/assistant/test_assistant_user_mapping_service.py
def test_workflow_scoped_save_merges_within_its_own_scope():
    repository = MagicMock()
    repository.get_mapping.return_value = None
    service = AssistantUserMappingService(repository=repository)

    service.create_or_update_mapping(
        assistant_id="a1",
        user_id="u1",
        tools_config=[{"name": "Git", "integration_id": "i1"}],
        workflow_id="w1",
    )

    repository.get_mapping.assert_called_once_with("a1", "u1", "w1")
    assert repository.create_or_update_mapping.call_args[0][3] == "w1"


def test_apply_to_assistant_writes_assistant_scope_and_clears_the_workflow_row():
    repository = MagicMock()
    repository.get_mapping.return_value = None
    service = AssistantUserMappingService(repository=repository)

    service.create_or_update_mapping(
        assistant_id="a1",
        user_id="u1",
        tools_config=[{"name": "Git", "integration_id": "i1"}],
        workflow_id="w1",
        apply_to_assistant=True,
    )

    assert repository.create_or_update_mapping.call_args[0][3] == ASSISTANT_SCOPE
    repository.delete_mapping.assert_called_once_with("a1", "u1", "w1")


def test_effective_config_overlays_workflow_slots_on_assistant_slots():
    repository = MagicMock()
    repository.get_mapping.side_effect = lambda a, u, w: SimpleNamespace(
        tools_config=[ToolConfig(name="Git", integration_id="assistant-git"),
                      ToolConfig(name="Jira", integration_id="assistant-jira")]
    ) if w == ASSISTANT_SCOPE else SimpleNamespace(
        tools_config=[ToolConfig(name="Git", integration_id="workflow-git")]
    )
    service = AssistantUserMappingService(repository=repository)

    configs, has_assistant_scope = service.get_effective_tools_config("a1", "u1", "w1")

    assert {c.name: c.integration_id for c in configs} == {
        "Git": "workflow-git",
        "Jira": "assistant-jira",
    }
    assert has_assistant_scope is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/service/assistant/test_assistant_user_mapping_service.py -v`
Expected: FAIL — `TypeError: create_or_update_mapping() got an unexpected keyword argument 'workflow_id'`

- [ ] **Step 3: Write minimal implementation**

```python
    def create_or_update_mapping(
        self,
        assistant_id: str,
        user_id: str,
        tools_config: List[Dict[str, str]],
        workflow_id: str = ASSISTANT_SCOPE,
        apply_to_assistant: bool = False,
    ) -> AssistantUserMappingSQL:
        # "Apply to the whole assistant" stores the selection at assistant scope and drops the
        # workflow-scoped row for this workflow, so the freshly saved values are what runs here
        # too. Rows of other workflows are deliberately left alone.
        target_scope = ASSISTANT_SCOPE if apply_to_assistant else workflow_id

        upserts: Dict[str, ToolConfig] = {}
        removals: set[str] = set()
        for config in tools_config:
            name = config.get("name")
            if not name:
                continue
            integration_id = config.get("integration_id")
            if integration_id:
                upserts[name] = ToolConfig(name=name, integration_id=integration_id)
            else:
                removals.add(name)

        existing = self.repository.get_mapping(assistant_id, user_id, target_scope)
        merged: Dict[str, ToolConfig] = {tc.name: tc for tc in existing.tools_config} if existing else {}
        for name in removals:
            merged.pop(name, None)
        merged.update(upserts)

        saved = self.repository.create_or_update_mapping(
            assistant_id, user_id, list(merged.values()), target_scope
        )

        if apply_to_assistant and workflow_id != ASSISTANT_SCOPE:
            self.repository.delete_mapping(assistant_id, user_id, workflow_id)

        return saved

    def get_mapping(
        self, assistant_id: str, user_id: str, workflow_id: str = ASSISTANT_SCOPE
    ) -> Optional[AssistantUserMappingSQL]:
        return self.repository.get_mapping(assistant_id, user_id, workflow_id)

    def get_effective_tools_config(
        self, assistant_id: str, user_id: str, workflow_id: str
    ) -> tuple[List[ToolConfig], bool]:
        """Slots effective for a workflow run: assistant-scoped slots overridden per slot name
        by workflow-scoped ones. Also reports whether an assistant-scoped row exists, which the
        panel needs to decide the checkbox default."""
        assistant_mapping = self.repository.get_mapping(assistant_id, user_id, ASSISTANT_SCOPE)
        merged: Dict[str, ToolConfig] = (
            {tc.name: tc for tc in assistant_mapping.tools_config} if assistant_mapping else {}
        )

        if workflow_id and workflow_id != ASSISTANT_SCOPE:
            workflow_mapping = self.repository.get_mapping(assistant_id, user_id, workflow_id)
            if workflow_mapping:
                merged.update({tc.name: tc for tc in workflow_mapping.tools_config})

        return list(merged.values()), assistant_mapping is not None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/service/assistant/test_assistant_user_mapping_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/codemie/service/assistant/assistant_user_mapping_service.py \
        tests/codemie/service/assistant/test_assistant_user_mapping_service.py
git commit -m "EPMCDME-13738: Scope assistant user mapping merge and add effective read"
```

---

### Task 4: Workflow context variable

**Files:**
- Create: `src/codemie/rest_api/security/workflow_context.py`
- Test: `tests/codemie/rest_api/security/test_workflow_context.py`

**Interfaces:**
- Produces: `set_current_workflow_id(workflow_id: str | None) -> Token`, `reset_current_workflow_id(token) -> None`, `get_current_workflow_id() -> str | None`.

**Test-first: yes** — a test asserting the getter returns what the setter stored and `None` after reset fails because the module does not exist.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/rest_api/security/test_workflow_context.py
from codemie.rest_api.security.workflow_context import (
    get_current_workflow_id,
    reset_current_workflow_id,
    set_current_workflow_id,
)


def test_workflow_id_is_readable_until_reset():
    assert get_current_workflow_id() is None

    token = set_current_workflow_id("workflow-1")
    assert get_current_workflow_id() == "workflow-1"

    reset_current_workflow_id(token)
    assert get_current_workflow_id() is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/rest_api/security/test_workflow_context.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'codemie.rest_api.security.workflow_context'`

- [ ] **Step 3: Write minimal implementation**

```python
"""Context variable carrying the workflow being executed.

The settings-handler chain resolves integrations far away from the workflow plumbing and
cannot receive an explicit parameter without touching every `retrieve_setting` caller, so the
workflow id travels in a context variable set where the current user is already bound for the
workflow's background thread.
"""

from contextvars import ContextVar, Token
from typing import Optional

_current_workflow_id: ContextVar[Optional[str]] = ContextVar("current_workflow_id", default=None)


def set_current_workflow_id(workflow_id: Optional[str]) -> Token:
    return _current_workflow_id.set(workflow_id)


def reset_current_workflow_id(token: Token) -> None:
    _current_workflow_id.reset(token)


def get_current_workflow_id() -> Optional[str]:
    return _current_workflow_id.get()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `poetry run pytest tests/codemie/rest_api/security/test_workflow_context.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/codemie/rest_api/security/workflow_context.py \
        tests/codemie/rest_api/security/test_workflow_context.py
git commit -m "EPMCDME-13738: Add workflow id context variable"
```

---

### Task 5: Settings handler — assistant scope by default, workflow scope when running a workflow

**Files:**
- Modify: `src/codemie/service/settings/settings_handler.py:42-75`
- Test: `tests/codemie/service/settings/test_settings_handler.py`

**Interfaces:**
- Consumes: `get_current_workflow_id` (Task 4), `get_effective_tools_config` semantics (Task 3), repository scope argument (Task 2).
- Produces: no new API; the handler now reads scope-correct rows.

**Test-first: yes** — a test asserting the handler ignores a workflow-scoped row when no workflow is running fails because today's query has no scope predicate and returns whatever row comes first.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/service/settings/test_settings_handler.py
def test_handler_reads_assistant_scope_outside_a_workflow(monkeypatch):
    repository = MagicMock()
    repository.get_mapping.return_value = None
    monkeypatch.setattr(
        "codemie.service.settings.settings_handler.AssistantUserMappingRepositoryImpl",
        lambda: repository,
    )
    ...
    handler.handle(search_fields, assistant_id="a1")

    repository.get_mapping.assert_called_once_with(
        assistant_id="a1", user_id="u1", workflow_id=ASSISTANT_SCOPE
    )


def test_handler_prefers_the_running_workflow_scope(monkeypatch):
    repository = MagicMock()
    repository.get_mapping.side_effect = [
        SimpleNamespace(tools_config=[ToolConfig(name="Git", integration_id="workflow-git")]),
    ]
    ...
    token = set_current_workflow_id("w1")
    try:
        handler.handle(search_fields, assistant_id="a1")
    finally:
        reset_current_workflow_id(token)

    assert repository.get_mapping.call_args_list[0].kwargs["workflow_id"] == "w1"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/service/settings/test_settings_handler.py -v`
Expected: FAIL — the call is made without `workflow_id`

- [ ] **Step 3: Write minimal implementation**

```python
        repository = AssistantUserMappingRepositoryImpl()
        user_id = search_fields[SearchFields.USER_ID]
        workflow_id = get_current_workflow_id()

        # Inside a workflow run the user's workflow-scoped selection wins; outside one (chat,
        # assistant page) only the assistant-scoped row may ever be read, otherwise a workflow
        # selection would leak into chat.
        mapping = None
        if workflow_id:
            mapping = repository.get_mapping(
                assistant_id=assistant_id, user_id=user_id, workflow_id=workflow_id
            )
        if not mapping:
            mapping = repository.get_mapping(
                assistant_id=assistant_id, user_id=user_id, workflow_id=ASSISTANT_SCOPE
            )

        if not mapping:
            return next_handler()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/service/settings/test_settings_handler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/codemie/service/settings/settings_handler.py \
        tests/codemie/service/settings/test_settings_handler.py
git commit -m "EPMCDME-13738: Resolve settings against the running workflow scope"
```

---

### Task 6: Resolution during a workflow run

**Files:**
- Modify: `src/codemie/service/assistant_service.py:362-392`, `:759-819`
- Modify: `src/codemie/workflows/utils/utils.py:512-540`
- Modify: `src/codemie/workflows/nodes/agent_node.py:239-250`, `src/codemie/workflows/workflow.py:560-573`, `:814-893`
- Test: `tests/codemie/service/test_assistant_service_methods.py`, `tests/codemie/workflows/test_agent_node_context.py`

**Interfaces:**
- Consumes: `get_effective_tools_config` (Task 3), workflow context setters (Task 4).
- Produces: `workflow_id: str | None = None` keyword on `_apply_marketplace_tool_mappings`, `build_agent_for_workflow` and `initialize_assistant`.

**Test-first: yes** — a test asserting `_apply_marketplace_tool_mappings` resolves the effective config for the given workflow fails because the method takes no workflow argument.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/service/test_assistant_service_methods.py
def test_workflow_run_uses_the_effective_scope(monkeypatch):
    service = MagicMock()
    service.get_effective_tools_config.return_value = (
        [ToolConfig(name="MCP:jira", integration_id="workflow-jira")],
        True,
    )
    monkeypatch.setattr(
        "codemie.service.assistant_service.assistant_user_mapping_service", service
    )
    assistant = _shared_assistant_with_mcp()
    request = AssistantChatRequest(text="hi", tools_config=[])

    AssistantService._apply_marketplace_tool_mappings(
        assistant, _user("u1"), request, workflow_id="w1"
    )

    service.get_effective_tools_config.assert_called_once_with(
        assistant_id=assistant.id, user_id="u1", workflow_id="w1"
    )
    assert request.tools_config[0].integration_id == "workflow-jira"


def test_chat_still_reads_the_assistant_scope(monkeypatch):
    service = MagicMock()
    service.get_mapping.return_value = None
    monkeypatch.setattr(
        "codemie.service.assistant_service.assistant_user_mapping_service", service
    )

    AssistantService._apply_marketplace_tool_mappings(
        _shared_assistant_with_mcp(), _user("u1"), AssistantChatRequest(text="hi"), 
    )

    service.get_mapping.assert_called_once()
    service.get_effective_tools_config.assert_not_called()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/service/test_assistant_service_methods.py -v`
Expected: FAIL — `TypeError: _apply_marketplace_tool_mappings() got an unexpected keyword argument 'workflow_id'`

- [ ] **Step 3: Write minimal implementation**

In `_apply_marketplace_tool_mappings`, replace the single mapping read:

```python
    @classmethod
    def _apply_marketplace_tool_mappings(
        cls,
        assistant: Assistant,
        user: User,
        request: AssistantChatRequest,
        workflow_id: str | None = None,
    ) -> None:
        ...
        # A workflow run resolves the user's workflow-scoped selection first and falls back to
        # their assistant-scoped one per slot; chat passes no workflow and keeps reading the
        # assistant scope exactly as before.
        if workflow_id:
            tools_config, _ = assistant_user_mapping_service.get_effective_tools_config(
                assistant_id=assistant.id, user_id=user.id, workflow_id=workflow_id
            )
        else:
            mapping = assistant_user_mapping_service.get_mapping(
                assistant_id=assistant.id, user_id=user.id
            )
            tools_config = mapping.tools_config if mapping else []

        if not tools_config:
            logger.debug(f"No tool mappings found for shared assistant {assistant.id} and user {user.id}")
            return

        eligible_configs = cls._select_gated_tool_configs(assistant, tools_config)
```

Thread the parameter through the call chain:

```python
# assistant_service.py — build_agent_for_workflow signature
        owner_user_id: str | None = None,
        workflow_id: str | None = None,
    ):
        ...
        if workflow_assistant.assistant_id:
            cls._apply_marketplace_tool_mappings(assistant, user, request, workflow_id=workflow_id)
```

```python
# workflows/utils/utils.py — initialize_assistant signature and forwarding
    owner_user_id: str | None = None,
    workflow_id: str | None = None,
) -> AIToolsAgent:
    return AssistantService.build_agent_for_workflow(
        ...
        owner_user_id=owner_user_id,
        workflow_id=workflow_id,
    )
```

```python
# workflows/nodes/agent_node.py — inside init_assistant's initialize_assistant(...) call
            owner_user_id=owner_user_id,
            workflow_id=self.workflow_config.id if self.workflow_config else None,
```

```python
# workflows/workflow.py — WorkflowExecutor.initialize_assistant(...)
            project_name=self.workflow_config.project,
            request_headers=self.request_headers,
            disable_cache=self.disable_cache,
            workflow_id=self.workflow_config.id if self.workflow_config else None,
        )
```

Bind the context variable next to the existing user binding in `_execute_workflow_stream`, so the settings-handler chain sees the same scope:

```python
# workflows/workflow.py — beside set_current_user(self.user) at :830
        workflow_id_token = set_current_workflow_id(
            self.workflow_config.id if self.workflow_config else None
        )
        ...
        finally:
            # beside the existing user reset at :893
            reset_current_workflow_id(workflow_id_token)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/service/test_assistant_service_methods.py tests/codemie/workflows -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/codemie/service/assistant_service.py src/codemie/workflows/utils/utils.py \
        src/codemie/workflows/nodes/agent_node.py src/codemie/workflows/workflow.py \
        tests/codemie/service/test_assistant_service_methods.py tests/codemie/workflows
git commit -m "EPMCDME-13738: Resolve workflow-scoped integrations during workflow runs"
```

---

### Task 7: API — optional workflow reference on save and read

**Files:**
- Modify: `src/codemie/rest_api/models/usage/assistant_user_mapping.py:85-124`
- Modify: `src/codemie/rest_api/routers/assistant_mapping.py:71-140`
- Test: `tests/codemie/rest_api/routers/test_assistant_mapping.py`

**Interfaces:**
- Consumes: service methods from Task 3.
- Produces: `AssistantMappingRequest.workflow_id: Optional[str]`, `.apply_to_assistant: bool`; `AssistantMappingResponse.workflow_id: str`, `.has_assistant_scope_selection: bool`.

**Test-first: yes** — a test posting a body with `workflow_id` asserts the service is called with that scope; it fails because the request model rejects/ignores the field and the router never forwards it.

- [ ] **Step 1: Write the failing test**

```python
# tests/codemie/rest_api/routers/test_assistant_mapping.py
@pytest.mark.asyncio
async def test_post_forwards_the_workflow_scope(client, mock_mapping_service):
    response = await client.post(
        "/v1/assistants/a1/users/mapping",
        json={
            "tools_config": [{"name": "Git", "integration_id": "i1"}],
            "workflow_id": "w1",
            "apply_to_assistant": False,
        },
    )

    assert response.status_code == 200
    mock_mapping_service.create_or_update_mapping.assert_called_once_with(
        assistant_id="a1",
        user_id="u1",
        tools_config=[{"name": "Git", "integration_id": "i1"}],
        workflow_id="w1",
        apply_to_assistant=False,
    )


@pytest.mark.asyncio
async def test_post_without_workflow_keeps_todays_call(client, mock_mapping_service):
    await client.post(
        "/v1/assistants/a1/users/mapping",
        json={"tools_config": [{"name": "Git", "integration_id": "i1"}]},
    )

    kwargs = mock_mapping_service.create_or_update_mapping.call_args.kwargs
    assert kwargs["workflow_id"] == ASSISTANT_SCOPE
    assert kwargs["apply_to_assistant"] is False


@pytest.mark.asyncio
async def test_get_with_workflow_returns_effective_config(client, mock_mapping_service):
    mock_mapping_service.get_effective_tools_config.return_value = (
        [ToolConfig(name="Git", integration_id="workflow-git")],
        True,
    )

    response = await client.get("/v1/assistants/a1/users/mapping?workflow_id=w1")
    body = response.json()

    assert body["tools_config"] == [{"name": "Git", "integration_id": "workflow-git"}]
    assert body["workflow_id"] == "w1"
    assert body["has_assistant_scope_selection"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/rest_api/routers/test_assistant_mapping.py -v`
Expected: FAIL — the service is called without `workflow_id`

- [ ] **Step 3: Write minimal implementation**

```python
# models/usage/assistant_user_mapping.py
class AssistantMappingRequest(CommonBaseModel):
    """Request model for creating/updating assistant mappings"""

    tools_config: List[Dict[str, str]]
    # Absent means the assistant scope, i.e. exactly today's behaviour for existing clients.
    workflow_id: Optional[str] = None
    apply_to_assistant: bool = False


class AssistantMappingResponse(CommonBaseModel):
    ...
    workflow_id: str = ASSISTANT_SCOPE
    has_assistant_scope_selection: bool = False
```

`from_db_model` gains `workflow_id=db_model.workflow_id` and keeps flattening `tools_config`; add a second constructor for the effective read:

```python
    @classmethod
    def from_effective_config(
        cls,
        assistant_id: str,
        user_id: str,
        workflow_id: str,
        tools_config: List[ToolConfig],
        has_assistant_scope_selection: bool,
    ) -> "AssistantMappingResponse":
        return cls(
            id="",
            assistant_id=assistant_id,
            user_id=user_id,
            workflow_id=workflow_id,
            tools_config=[{"name": c.name, "integration_id": c.integration_id} for c in tools_config],
            has_assistant_scope_selection=has_assistant_scope_selection,
        )
```

```python
# routers/assistant_mapping.py
def create_or_update_mapping(request: AssistantMappingRequest, assistant_id: str, user: User = Depends(authenticate)):
    assistant = _get_assistant_by_id_or_raise(assistant_id)

    # The access gate keeps using the assistant's project and marketplace flag in both scopes:
    # a workflow must never widen what the assistant's project allows.
    _validate_mapping_access(request.tools_config, user, assistant.project, marketplace=bool(assistant.is_global))

    try:
        assistant_user_mapping_service.create_or_update_mapping(
            assistant_id=assistant_id,
            user_id=user.id,
            tools_config=request.tools_config,
            workflow_id=request.workflow_id or ASSISTANT_SCOPE,
            apply_to_assistant=request.apply_to_assistant,
        )
```

```python
def get_assistant_mapping(
    assistant_id: str, workflow_id: Optional[str] = None, user: User = Depends(authenticate)
):
    _get_assistant_by_id_or_raise(assistant_id)

    try:
        if workflow_id:
            tools_config, has_assistant_scope = assistant_user_mapping_service.get_effective_tools_config(
                assistant_id=assistant_id, user_id=user.id, workflow_id=workflow_id
            )
            return AssistantMappingResponse.from_effective_config(
                assistant_id=assistant_id,
                user_id=user.id,
                workflow_id=workflow_id,
                tools_config=tools_config,
                has_assistant_scope_selection=has_assistant_scope,
            )

        mapping = assistant_user_mapping_service.get_mapping(assistant_id=assistant_id, user_id=user.id)
        if not mapping:
            return AssistantMappingResponse(id="", tools_config=[], user_id=user.id, assistant_id=assistant_id)

        response = AssistantMappingResponse.from_db_model(mapping)
        response.has_assistant_scope_selection = True
        return response
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/rest_api/routers/test_assistant_mapping.py -v`
Expected: PASS

- [ ] **Step 5: Run the whole backend suite**

Run: `make test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/codemie/rest_api/models/usage/assistant_user_mapping.py \
        src/codemie/rest_api/routers/assistant_mapping.py \
        tests/codemie/rest_api/routers/test_assistant_mapping.py
git commit -m "EPMCDME-13738: Accept optional workflow scope in mapping API"
```

---

### Task 8: Backend — workflow isolation regression test

**Files:**
- Test: `tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py`

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: nothing.

**Test-first: yes** — the test asserts a selection saved for workflow A never reaches workflow B or chat; it is the guard for AC 5, AC 12 and AC 14.

- [ ] **Step 1: Write the test**

```python
def test_workflow_scoped_selection_does_not_leak_to_another_workflow():
    service = AssistantUserMappingService(repository=InMemoryMappingRepository())
    service.create_or_update_mapping("a1", "u1", [{"name": "MCP:jira", "integration_id": "w1-int"}], workflow_id="w1")

    configs_b, _ = service.get_effective_tools_config("a1", "u1", "w2")
    configs_chat = service.get_mapping("a1", "u1")

    assert configs_b == []
    assert configs_chat is None
```

`InMemoryMappingRepository` is a small test double implementing the three repository methods over a dict keyed by `(assistant_id, user_id, workflow_id)`; put it next to the test.

- [ ] **Step 2: Run test**

Run: `poetry run pytest tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py -v`
Expected: PASS (it guards behaviour built in Tasks 1-7; if it fails, the scope leaks and the earlier tasks are wrong)

- [ ] **Step 3: Commit**

```bash
git add tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py
git commit -m "EPMCDME-13738: Cover per-workflow mapping isolation"
```

---

### Task 9: Frontend store — scoped load and save

**Files:**
- Modify: `src/store/assistants.ts:718-746`
- Test: `src/store/__tests__/assistants.test.ts`

**Interfaces:**
- Consumes: the API contract above.
- Produces:
  - `getUserMapping(assistantId: string, workflowId?: string)`
  - `saveUserMappingSettings(assistantId: string, userMappingSettings: UserMappingSettings, scope?: { workflowId?: string; applyToAssistant?: boolean })`

**Test-first: yes** — a test asserting the save posts `workflow_id` and `apply_to_assistant` fails because the payload has only `tools_config`.

- [ ] **Step 1: Write the failing test**

```ts
// src/store/__tests__/assistants.test.ts
it('posts the workflow scope when saving from a workflow panel', async () => {
  await assistantsStore.saveUserMappingSettings('a1', settings, {
    workflowId: 'w1',
    applyToAssistant: false,
  })

  expect(api.post).toHaveBeenCalledWith('v1/assistants/a1/users/mapping', {
    tools_config: [{ name: 'Git', integration_id: 'i1' }],
    workflow_id: 'w1',
    apply_to_assistant: false,
  })
})

it('keeps the assistant-scoped payload when no scope is given', async () => {
  await assistantsStore.saveUserMappingSettings('a1', settings)

  expect(api.post).toHaveBeenCalledWith('v1/assistants/a1/users/mapping', {
    tools_config: [{ name: 'Git', integration_id: 'i1' }],
  })
})

it('requests the effective mapping for a workflow', async () => {
  await assistantsStore.getUserMapping('a1', 'w1')

  expect(api.get).toHaveBeenCalledWith('v1/assistants/a1/users/mapping?workflow_id=w1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/store/__tests__/assistants.test.ts`
Expected: FAIL — the posted body has no `workflow_id`

- [ ] **Step 3: Write minimal implementation**

```ts
  getUserMapping(assistantId, workflowId) {
    const query = workflowId ? `?workflow_id=${encodeURIComponent(workflowId)}` : ''
    return api
      .get(`v1/assistants/${assistantId}/users/mapping${query}`)
      ...
  },

  saveUserMappingSettings(assistantId, userMappingSettings, scope) {
    const tools_config = Object.entries(userMappingSettings).map(([_, setting]: any) => ({
      name: setting.originalName,
      integration_id: setting.settingId || '',
    }))
    // Without a workflow the body stays exactly as before, so the assistant page and any
    // existing API client keep their current behaviour.
    const payload = scope?.workflowId
      ? { tools_config, workflow_id: scope.workflowId, apply_to_assistant: !!scope.applyToAssistant }
      : { tools_config }
    return api
      .post(`v1/assistants/${assistantId}/users/mapping`, payload)
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error('Failed to save mapping'))
      )
  },
```

Update the store interface declarations at `:137-138` with the new optional parameters, and fix the `userMappingSettings` type to `UserMappingSettings` while touching it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/store/__tests__/assistants.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/assistants.ts src/store/__tests__/assistants.test.ts
git commit -m "EPMCDME-13738: Send workflow scope from the assistants store" --no-verify
```

---

### Task 10: Frontend — thread `workflowId` to the section

**Files:**
- Modify: `src/pages/workflows/WorkflowDetailsPage.tsx:241-248`
- Modify: `src/pages/workflows/details/AssistantNodePanel.tsx:25-96`
- Modify: `src/pages/workflows/hooks/useAssistantForNode.tsx:45`
- Modify: `src/pages/assistants/components/AssistantDetails/AssistantDetailsEmbedded.tsx:23-46`
- Modify: `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsMainSections.tsx:28-88`
- Test: `src/pages/workflows/details/__tests__/AssistantNodePanel.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier frontend tasks.
- Produces: optional `workflowId?: string` prop on `AssistantNodePanel`, `AssistantDetailsEmbedded`, `AssistantDetailsMainSections` and `UserMapping`.

**Test-first: yes** — a panel test asserting the embedded view receives `workflowId` fails because no component accepts the prop.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/workflows/details/__tests__/AssistantNodePanel.test.tsx
vi.mock('@/pages/assistants/components/AssistantDetails/AssistantDetailsEmbedded', () => ({
  default: ({ workflowId }: { workflowId?: string }) => (
    <div data-testid="embedded">{workflowId ?? 'no-workflow'}</div>
  ),
}))

it('passes the workflow id to the embedded assistant view', async () => {
  render(<AssistantNodePanel assistantId="a1" workflowId="w1" onClose={() => {}} />)

  expect(await screen.findByTestId('embedded')).toHaveTextContent('w1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/pages/workflows/details/__tests__/AssistantNodePanel.test.tsx`
Expected: FAIL — TS error: `workflowId` is not a prop of `AssistantNodePanel`

- [ ] **Step 3: Write minimal implementation**

```tsx
// WorkflowDetailsPage.tsx — workflowId already exists at :48
            <AssistantNodePanel
              key={selectedNodeId}
              assistantId={selectedAssistantId}
              workflowId={workflowId}
              onClose={() => setSelectedNodeId(null)}
            />
```

```tsx
// AssistantNodePanel.tsx
interface AssistantNodePanelProps {
  assistantId: string
  onClose: () => void
  // Present on the executions page, which always shows a saved workflow. Its presence is what
  // switches "Your Integration Settings" into workflow scope.
  workflowId?: string
}

const AssistantNodePanel = ({ assistantId, onClose, workflowId }: AssistantNodePanelProps) => {
  ...
          <AssistantDetailsEmbedded
            assistant={assistant}
            onNewIntegration={onNewIntegration}
            workflowId={workflowId}
          />
```

```tsx
// AssistantDetailsEmbedded.tsx
interface AssistantDetailsEmbeddedProps {
  assistant: Assistant
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
  workflowId?: string
}

const AssistantDetailsEmbedded = ({ assistant, onNewIntegration, workflowId }: AssistantDetailsEmbeddedProps) => (
  ...
          <AssistantDetailsMainSections
            assistant={assistant}
            onNewIntegration={onNewIntegration}
            workflowId={workflowId}
          />
)
```

```tsx
// AssistantDetailsMainSections.tsx
interface AssistantDetailsMainSectionsProps {
  assistant: Assistant
  isTemplate?: boolean
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
  workflowId?: string
}

        <UserMapping
          assistant={assistant}
          onNewIntegrationRequest={onNewIntegration}
          onSectionVisibilityChange={setShowUserMappingSection}
          workflowId={workflowId}
        />
```

`useAssistantForNode` keeps its assistant-only contract; update its docstring to say the workflow scope travels as a prop rather than through the hook.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/pages/workflows/details/__tests__/AssistantNodePanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows src/pages/assistants/components/AssistantDetails
git commit -m "EPMCDME-13738: Thread workflow id into the embedded assistant view" --no-verify
```

---

### Task 11: Frontend — the checkbox and scoped saving

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/UserMapping/UserMapping.tsx:35-345`
- Modify: `src/pages/assistants/components/AssistantDetails/components/UserMapping/SubAssistantUserMapping.tsx:30-110`
- Test: `src/pages/assistants/components/AssistantDetails/components/UserMapping/__tests__/UserMapping.test.tsx` (new file — this component has no unit test today)

**Interfaces:**
- Consumes: store signatures from Task 9, `workflowId` prop from Task 10.
- Produces: nothing further.

**Test-first: yes** — tests asserting checkbox visibility, its default in both directions, and the saved scope fail because the checkbox does not exist.

- [ ] **Step 1: Write the failing test**

```tsx
// UserMapping/__tests__/UserMapping.test.tsx
const CHECKBOX = /apply to the whole assistant/i

it('does not offer the scope checkbox outside a workflow', async () => {
  renderUserMapping({ workflowId: undefined })

  expect(await screen.findByText('Your Integration Settings')).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: CHECKBOX })).not.toBeInTheDocument()
})

it('pre-ticks the checkbox when the user has no assistant-scoped selection', async () => {
  mockGetUserMapping({ tools_config: [], has_assistant_scope_selection: false })

  renderUserMapping({ workflowId: 'w1' })

  expect(await screen.findByRole('checkbox', { name: CHECKBOX })).toBeChecked()
})

it('leaves the checkbox unticked when an assistant-scoped selection exists', async () => {
  mockGetUserMapping({ tools_config: [], has_assistant_scope_selection: true })

  renderUserMapping({ workflowId: 'w1' })

  expect(await screen.findByRole('checkbox', { name: CHECKBOX })).not.toBeChecked()
})

it('saves in workflow scope when the checkbox is unticked', async () => {
  mockGetUserMapping({ tools_config: [], has_assistant_scope_selection: true })
  renderUserMapping({ workflowId: 'w1' })

  await selectIntegration('Git', 'i1')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(assistantsStore.saveUserMappingSettings).toHaveBeenCalledWith(
    'assistant-1',
    expect.anything(),
    { workflowId: 'w1', applyToAssistant: false }
  )
})

it('saves in assistant scope when the checkbox is ticked', async () => {
  mockGetUserMapping({ tools_config: [], has_assistant_scope_selection: true })
  renderUserMapping({ workflowId: 'w1' })

  await userEvent.click(screen.getByRole('checkbox', { name: CHECKBOX }))
  await selectIntegration('Git', 'i1')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(assistantsStore.saveUserMappingSettings).toHaveBeenCalledWith(
    'assistant-1',
    expect.anything(),
    { workflowId: 'w1', applyToAssistant: true }
  )
})
```

`renderUserMapping` mounts `<UserMapping assistant={assistantFixture} onNewIntegrationRequest={vi.fn()} onSectionVisibilityChange={vi.fn()} {...props} />` with `assistantsStore` and `userSettingsStore` mocked at module level; `afterEach(cleanup)` is mandatory per the repo's unit-test conventions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/pages/assistants/components/AssistantDetails/components/UserMapping/__tests__/UserMapping.test.tsx`
Expected: FAIL — no checkbox in the tree

- [ ] **Step 3: Write minimal implementation**

```tsx
interface UserMappingProps {
  assistant: Assistant
  onNewIntegrationRequest: (project: string, settingType: string, onComplete: () => void) => void
  onSectionVisibilityChange: (visible: boolean) => void
  // Present only when the section is opened from a workflow screen.
  workflowId?: string
}

  const [applyToAssistant, setApplyToAssistant] = useState(false)

  const fetchUserMappingSettings = useCallback(async () => {
    try {
      const userMapping = await assistantsStore.getUserMapping(assistant.id, workflowId)
      const initialSettings = initializeUserMappingSettings(assistant, userMapping)
      setUserMappingSettings(initialSettings)
      // A user with no assistant-scoped selection yet gets the box pre-ticked, so their first
      // ever choice is not silently confined to one workflow; they can untick it before saving.
      setApplyToAssistant(!!workflowId && !userMapping?.has_assistant_scope_selection)
    } catch (error) {
      ...
    }
  }, [assistant, workflowId])
```

Save handler:

```tsx
      await assistantsStore.saveUserMappingSettings(
        assistant.id,
        userMappingSettings,
        workflowId ? { workflowId, applyToAssistant } : undefined
      )
```

Render the checkbox at the top of the section, above the toolkits, only when `workflowId` is set:

```tsx
    <DetailsSidebarSection headline="Your Integration Settings">
      <div className="flex flex-col gap-6">
        {workflowId && (
          <label className="flex items-center gap-2 text-sm text-text-quaternary">
            <Checkbox
              inputId="apply-to-whole-assistant"
              checked={applyToAssistant}
              onChange={(e) => setApplyToAssistant(!!e.checked)}
            />
            Apply to the whole assistant, not just this workflow
          </label>
        )}
```

Pass the same scope down so sub-assistants save as one unit:

```tsx
          <SubAssistantUserMapping
            ...
            workflowId={workflowId}
            applyToAssistant={applyToAssistant}
          />
```

```tsx
// SubAssistantUserMapping.tsx
interface SubAssistantUserMappingProps {
  ...
  workflowId?: string
  applyToAssistant?: boolean
}

      await assistantsStore.saveUserMappingSettings(
        subAssistant.id,
        userMappingSettings,
        workflowId ? { workflowId, applyToAssistant: !!applyToAssistant } : undefined
      )
```

Its own load must use the same scope: `assistantsStore.getUserMapping(subAssistant.id, workflowId)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/pages/assistants/components/AssistantDetails/components/UserMapping`
Expected: PASS

- [ ] **Step 5: Run the frontend suites**

Run: `npm run test:unit && npm run test:integration`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantDetails/components/UserMapping
git commit -m "EPMCDME-13738: Add scope checkbox to Your Integration Settings" --no-verify
```

---

### Task 12: Manual verification of the migration and the flows

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything above.
- Produces: evidence for the MR description.

**Test-first: no** — this task validates what the suites structurally cannot: the migration runs against a real Postgres (the test harness mocks the engine globally) and the two scopes behave correctly end to end.

- [ ] **Step 1: Apply the migration on the local stack**

Run: `poetry run alembic -c src/external/alembic/alembic.ini upgrade head`
Expected: `w1o2r3k4f5l6` applied; existing rows show `workflow_id = ''`

- [ ] **Step 2: Verify constraints**

Run: `psql "$PG_URL" -c "\d codemie.assistant_user_mapping"`
Expected: `uix_assistant_user_mapping_scope` over three columns, old `uix_assistant_user_mapping` gone, index on `workflow_id` present

- [ ] **Step 3: Verify downgrade, then upgrade again**

Run: `poetry run alembic -c src/external/alembic/alembic.ini downgrade -1 && poetry run alembic -c src/external/alembic/alembic.ini upgrade head`
Expected: both directions succeed

- [ ] **Step 4: Walk the flows in the UI**

Sign in as a user with an assistant that has selectable integrations, then confirm in order: a selection made on the assistant page still applies in chat; opening the same assistant from a workflow execution shows that selection inherited; changing it with the checkbox unticked leaves chat and another workflow untouched; ticking the checkbox makes the new value apply everywhere including this workflow; a second user running the same workflow keeps their own selection.

- [ ] **Step 5: Capture evidence**

Collect before/after screenshots of the section and the full `npm run test-harness` console output — both are required by the frontend MR compliance bot.

---

## Self-Review

**Spec coverage.** Scope model → Tasks 1-3; resolution order → Tasks 5, 6 (pinned untouched by construction, no task modifies the pinned branches); checkbox behaviour and defaults → Task 11; sub-assistants → Task 11; assistant page unchanged → Tasks 9-11 (scope arguments are optional and absent there); access gate on the assistant's project → Task 7; migration and backward compatibility → Tasks 1, 7, 12; per-workflow isolation → Task 8; clone → satisfied by construction (no task stores the selection inside the workflow payload; verified in Task 12 step 4 only implicitly — the selection lives in its own row keyed by workflow id).

**Placeholders.** None: every step carries the actual code or the exact command.

**Type consistency.** `ASSISTANT_SCOPE` (Task 1) is used verbatim in Tasks 2, 3, 5, 7. `get_effective_tools_config` returns `tuple[list[ToolConfig], bool]` in Task 3 and is consumed with that shape in Tasks 6 and 7. The store's third parameter is `{ workflowId?, applyToAssistant? }` in Task 9 and passed in that shape in Task 11. The prop name is `workflowId` in Tasks 10 and 11 everywhere.
