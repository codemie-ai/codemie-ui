# EPMCDME-13259 — Interactive User Input in Agent Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development inline (sdlc-task Stage 5). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent chat can render interactive elements (buttons, choices, validated short forms), deliver structured user responses back to the agent turn-based, with an "Interactive features" assistant config block whose catalog is enforced server-side.

**Architecture:** Extend the proprietary NDJSON protocol (`StreamedGenerationResult`) with an optional `interactive_request` payload emitted by a new built-in tool `request_user_input` whose args schema is built dynamically from `InteractiveFeaturesConfig` (disabled feature ⇒ element absent from schema). The user's structured response travels as a normal chat request field `interactive_response`; state is derived by `request_id` (immutable messages). No CopilotKit/AG-UI.

**Tech Stack:** Backend: Python 3.12, FastAPI, pydantic v2, SQLModel/JSONB, alembic, pytest. Frontend: React 18, TypeScript, valtio, vitest. (The interactive surface uses manual, registry-driven client validation — not react-hook-form/Yup.)

> **Implementation note (synced 2026-07-21):** the catalog is registry-driven — one `ELEMENT_REGISTRY` per repo (`core/interactive.py`; `registry.ts` + `elementHandlers.tsx`) is the single source of truth from which the union, feature gating, kind coverage, validation and rendering derive; adding an element is one registry entry. The wire adds `dropdown` and `date_picker`. One surface is answered by one combined `submit` (`answers`-by-id); an answered form is re-answerable via Edit-unlock. The assistant-config exposes a single "Interactive features" toggle (all elements) placed first after Assistant Setup. Customer config can gate the catalog per feature.

## Global Constraints

- Repos: backend `codemie`, frontend `codemie-ui`; branch `feature/EPMCDME-13259-interactive-chat-input` in each.
- Commit titles: `EPMCDME-13259: <description>` (no conventional-commits). No Jira/EPAM refs inside source code.
- Frontend: ALL API calls live in valtio store methods; the interactive surface validates client-side manually via its registry handlers.
- Text-only chat must not regress: all new protocol fields are `Optional` with `None`/absent defaults; all feature toggles default **off**.
- Element type ids on the wire: `text | column | row | button | multiple_choice | dropdown | date_picker | text_field | checkbox` (snake_case discriminator `type`).
- Dependency rule: `button` available iff `action_buttons OR short_forms`; layout (`text|column|row`) available iff any feature enabled.
- Spec deviation (approved at plan gate): history materialization uses deterministic structured text in the user message (`to_chat_history()` replays text only), not synthetic tool-call/result pairs. Protocol module lives at `src/codemie/core/interactive.py` (not `chains/`) to avoid a circular import.

---

## Part A — Backend (`codemie`)

### Task B1: Protocol models + surface validation + dynamic schema factory

**Files:**
- Create: `src/codemie/core/interactive.py` (registry-driven; `chains/` in the original draft moved to `core/` to avoid a circular import)
- Test: `tests/codemie/chains/test_interactive.py`

**Interfaces:**
- Produces: `InteractiveFeaturesConfig`, `InteractiveRequest`, `InteractiveResponse`, `AnyElement` union, `validate_surface(surface: list[dict], config) -> list[AnyElement]` (raises `ValueError` listing disallowed types), `enabled_element_types(config) -> set[str]`, `build_surface_args_schema(config) -> type[BaseModel]` (pydantic model `{"surface": list[<enabled union>]}`), `validate_response_values(response: InteractiveResponse, request: InteractiveRequest) -> None` (required/regex/email re-check, raises `ValueError`).

Test-first: yes — `validate_surface` rejects a `button` when only `choice` is enabled; `build_surface_args_schema` excludes `multiple_choice` when `choice` disabled; `validate_response_values` raises on missing required field / regex mismatch / bad email.

- [ ] **Step 1: Write failing tests** `tests/codemie/chains/test_interactive.py`:

```python
import pytest
from pydantic import ValidationError

from codemie.chains.interactive import (
    InteractiveFeaturesConfig, InteractiveRequest, InteractiveResponse,
    validate_surface, enabled_element_types, build_surface_args_schema,
    validate_response_values,
)

CFG_CHOICE_ONLY = InteractiveFeaturesConfig(action_buttons=False, choice=True, short_forms=False)
CFG_ALL = InteractiveFeaturesConfig(action_buttons=True, choice=True, short_forms=True)
CFG_FORMS_ONLY = InteractiveFeaturesConfig(action_buttons=False, choice=False, short_forms=True)


class TestEnabledElementTypes:
    def test_choice_only_has_layout_and_choice_no_button(self):
        types = enabled_element_types(CFG_CHOICE_ONLY)
        assert types == {"text", "column", "row", "multiple_choice"}

    def test_button_enabled_by_short_forms(self):
        assert "button" in enabled_element_types(CFG_FORMS_ONLY)

    def test_all_disabled_is_empty(self):
        cfg = InteractiveFeaturesConfig()
        assert enabled_element_types(cfg) == set()


class TestValidateSurface:
    def test_rejects_disabled_element(self):
        with pytest.raises(ValueError, match="button"):
            validate_surface([{"type": "button", "id": "b1", "label": "OK"}], CFG_CHOICE_ONLY)

    def test_rejects_disabled_nested_in_column(self):
        surface = [{"type": "column", "children": [
            {"type": "text_field", "id": "f1", "label": "Name"}]}]
        with pytest.raises(ValueError, match="text_field"):
            validate_surface(surface, CFG_CHOICE_ONLY)

    def test_accepts_enabled_tree(self):
        surface = [{"type": "column", "children": [
            {"type": "text", "content": "Pick one"},
            {"type": "multiple_choice", "id": "c1",
             "options": [{"value": "a", "label": "A"}], "max_allowed_selections": 1},
        ]}]
        elements = validate_surface(surface, CFG_CHOICE_ONLY)
        assert elements[0].type == "column"


class TestArgsSchemaFactory:
    def test_schema_excludes_disabled_types(self):
        schema_cls = build_surface_args_schema(CFG_CHOICE_ONLY)
        json_schema = str(schema_cls.model_json_schema())
        assert "multiple_choice" in json_schema
        assert "text_field" not in json_schema
        assert "'button'" not in json_schema

    def test_schema_validates_payload(self):
        schema_cls = build_surface_args_schema(CFG_CHOICE_ONLY)
        with pytest.raises(ValidationError):
            schema_cls(surface=[{"type": "button", "id": "b", "label": "X"}])


def _request_with_form():
    return InteractiveRequest(request_id="r1", surface=[
        {"type": "text_field", "id": "email", "label": "Email",
         "validation": {"required": True, "email": True}},
        {"type": "text_field", "id": "code", "label": "Code",
         "validation": {"regex": "^[0-9]{4}$"}},
        {"type": "button", "id": "submit", "label": "Submit"},
    ])


class TestValidateResponseValues:
    def test_missing_required_raises(self):
        resp = InteractiveResponse(request_id="r1", kind="form", payload={"values": {"code": "1234"}})
        with pytest.raises(ValueError, match="email"):
            validate_response_values(resp, _request_with_form())

    def test_bad_email_raises(self):
        resp = InteractiveResponse(request_id="r1", kind="form",
                                   payload={"values": {"email": "not-an-email", "code": "1234"}})
        with pytest.raises(ValueError, match="email"):
            validate_response_values(resp, _request_with_form())

    def test_regex_mismatch_raises(self):
        resp = InteractiveResponse(request_id="r1", kind="form",
                                   payload={"values": {"email": "a@b.co", "code": "12"}})
        with pytest.raises(ValueError, match="code"):
            validate_response_values(resp, _request_with_form())

    def test_valid_form_passes(self):
        resp = InteractiveResponse(request_id="r1", kind="form",
                                   payload={"values": {"email": "a@b.co", "code": "1234"}})
        validate_response_values(resp, _request_with_form())

    def test_choice_over_max_selections_raises(self):
        req = InteractiveRequest(request_id="r2", surface=[
            {"type": "multiple_choice", "id": "c1", "max_allowed_selections": 1,
             "options": [{"value": "a", "label": "A"}, {"value": "b", "label": "B"}]}])
        resp = InteractiveResponse(request_id="r2", kind="choice", payload={"selected": ["a", "b"]})
        with pytest.raises(ValueError, match="max"):
            validate_response_values(resp, req)

    def test_text_fallback_always_passes(self):
        resp = InteractiveResponse(request_id="r1", kind="text_fallback", payload={"text": "free text"})
        validate_response_values(resp, _request_with_form())
```

- [ ] **Step 2: Run to verify failure**
Run: `cd codemie && poetry run pytest tests/codemie/chains/test_interactive.py -v`
Expected: FAIL `ModuleNotFoundError: codemie.chains.interactive`

- [ ] **Step 3: Implement `src/codemie/chains/interactive.py`**

```python
import re
import uuid
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, create_model

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class InteractiveFeaturesConfig(BaseModel):
    action_buttons: bool = False
    choice: bool = False
    short_forms: bool = False

    def any_enabled(self) -> bool:
        return self.action_buttons or self.choice or self.short_forms


class TextElement(BaseModel):
    type: Literal["text"] = "text"
    content: str


class ButtonElement(BaseModel):
    type: Literal["button"] = "button"
    id: str
    label: str
    style: Optional[Literal["primary", "secondary", "danger"]] = "primary"


class ChoiceOption(BaseModel):
    value: str
    label: str


class MultipleChoiceElement(BaseModel):
    type: Literal["multiple_choice"] = "multiple_choice"
    id: str
    options: list[ChoiceOption]
    max_allowed_selections: int = Field(default=1, ge=1)


class FieldValidation(BaseModel):
    required: bool = False
    regex: Optional[str] = None
    email: bool = False


class TextFieldElement(BaseModel):
    type: Literal["text_field"] = "text_field"
    id: str
    label: str
    validation: Optional[FieldValidation] = None


class CheckBoxElement(BaseModel):
    type: Literal["checkbox"] = "checkbox"
    id: str
    label: str
    validation: Optional[FieldValidation] = None


class ColumnElement(BaseModel):
    type: Literal["column"] = "column"
    children: list["AnyElement"]


class RowElement(BaseModel):
    type: Literal["row"] = "row"
    children: list["AnyElement"]


AnyElement = Annotated[
    Union[TextElement, ColumnElement, RowElement, ButtonElement,
          MultipleChoiceElement, TextFieldElement, CheckBoxElement],
    Field(discriminator="type"),
]
ColumnElement.model_rebuild()
RowElement.model_rebuild()

_ELEMENT_BY_TYPE = {
    "text": TextElement, "column": ColumnElement, "row": RowElement,
    "button": ButtonElement, "multiple_choice": MultipleChoiceElement,
    "text_field": TextFieldElement, "checkbox": CheckBoxElement,
}
_LAYOUT_TYPES = {"text", "column", "row"}


class InteractiveRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    surface: list[AnyElement]


class InteractiveResponse(BaseModel):
    request_id: str
    kind: Literal["action", "choice", "form", "text_fallback"]
    payload: dict


def enabled_element_types(config: InteractiveFeaturesConfig) -> set[str]:
    if not config.any_enabled():
        return set()
    types = set(_LAYOUT_TYPES)
    if config.action_buttons or config.short_forms:
        types.add("button")
    if config.choice:
        types.add("multiple_choice")
    if config.short_forms:
        types.update({"text_field", "checkbox"})
    return types


def _walk(elements) -> list:
    flat = []
    for el in elements:
        flat.append(el)
        children = getattr(el, "children", None) or (el.get("children") if isinstance(el, dict) else None)
        if children:
            flat.extend(_walk(children))
    return flat


def validate_surface(surface: list[dict], config: InteractiveFeaturesConfig) -> list:
    request = InteractiveRequest(surface=surface)  # structural validation
    allowed = enabled_element_types(config)
    disallowed = sorted({el.type for el in _walk(request.surface) if el.type not in allowed})
    if disallowed:
        raise ValueError(
            f"Elements not allowed by the assistant's interactive features config: {', '.join(disallowed)}. "
            f"Allowed: {', '.join(sorted(allowed)) or 'none'}."
        )
    return request.surface


def build_surface_args_schema(config: InteractiveFeaturesConfig) -> type[BaseModel]:
    allowed = enabled_element_types(config)
    members = tuple(_ELEMENT_BY_TYPE[t] for t in sorted(allowed))
    if not members:
        raise ValueError("No interactive features enabled")
    union = Annotated[Union[members], Field(discriminator="type")] if len(members) > 1 else members[0]
    return create_model(
        "RequestUserInputArgs",
        surface=(list[union], Field(description="Tree of interactive UI elements to show the user")),
    )


def validate_response_values(response: InteractiveResponse, request: InteractiveRequest) -> None:
    if response.kind == "text_fallback":
        return
    elements = {el.id: el for el in _walk(request.surface) if hasattr(el, "id")}
    if response.kind == "choice":
        for el in elements.values():
            if isinstance(el, MultipleChoiceElement):
                selected = response.payload.get("selected", [])
                valid_values = {o.value for o in el.options}
                unknown = [s for s in selected if s not in valid_values]
                if unknown:
                    raise ValueError(f"Unknown choice values: {unknown}")
                if len(selected) > el.max_allowed_selections:
                    raise ValueError(
                        f"Selected {len(selected)} options, max allowed: {el.max_allowed_selections}"
                    )
        return
    if response.kind == "form":
        values = response.payload.get("values", {})
        for el in elements.values():
            validation = getattr(el, "validation", None)
            if validation is None:
                continue
            raw = values.get(el.id)
            if validation.required and (raw is None or raw == "" or raw is False):
                raise ValueError(f"Field '{el.id}' is required")
            if raw in (None, ""):
                continue
            if validation.regex and not re.fullmatch(validation.regex, str(raw)):
                raise ValueError(f"Field '{el.id}' does not match the required format")
            if validation.email and not EMAIL_RE.match(str(raw)):
                raise ValueError(f"Field '{el.id}' must be a valid email")
```

- [ ] **Step 4: Run tests** — Expected: PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Add interactive elements protocol models and validation`

### Task B2: Assistant config — JSONB column, request field, migration

**Files:**
- Modify: `src/codemie/rest_api/models/assistant.py` (import + `AssistantRequest` ~line 317 + `AssistantBase` ~line 637)
- Create: `src/external/alembic/versions/i1n2t3e4r5a6_add_interactive_features_to_assistants.py`
- Test: `tests/codemie/rest_api/models/test_assistant_interactive_features.py`

**Interfaces:**
- Consumes: `InteractiveFeaturesConfig` (B1)
- Produces: `Assistant.interactive_features: Optional[InteractiveFeaturesConfig]`, `AssistantRequest.interactive_features`

Test-first: yes — `AssistantRequest(name="x", interactive_features={"choice": True})` round-trips typed config; absent field stays `None`.

- [ ] **Step 1: Failing test**

```python
from codemie.chains.interactive import InteractiveFeaturesConfig
from codemie.rest_api.models.assistant import AssistantRequest


def test_assistant_request_accepts_interactive_features():
    req = AssistantRequest(name="a", interactive_features={"choice": True})
    assert isinstance(req.interactive_features, InteractiveFeaturesConfig)
    assert req.interactive_features.choice is True
    assert req.interactive_features.action_buttons is False


def test_assistant_request_defaults_to_none():
    assert AssistantRequest(name="a").interactive_features is None
```

- [ ] **Step 2: Run** — Expected: FAIL (`unexpected keyword`… pydantic ignores unknown? then assert fails on None)
- [ ] **Step 3: Implement.** In `assistant.py`, next to the hedging import: `from codemie.chains.interactive import InteractiveFeaturesConfig`. In `AssistantRequest` after `hedging_config`: `interactive_features: Optional[InteractiveFeaturesConfig] = None`. In `AssistantBase` after `hedging_config`:

```python
    interactive_features: Optional[InteractiveFeaturesConfig] = SQLField(
        default=None, sa_column=Column(PydanticType(InteractiveFeaturesConfig))
    )
```

Also update the assistant create/update service path exactly like `hedging_config` is copied from `AssistantRequest` to `Assistant` (grep `hedging_config` in `src/codemie/service/assistant_service.py` and mirror each assignment).

Migration (template `r7s8t9u0v1w2_add_hedging_config_to_assistants.py`, head is `p1q2r3s4t5u6`):

```python
"""add_interactive_features_to_assistants

Revision ID: i1n2t3e4r5a6
Revises: p1q2r3s4t5u6
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'i1n2t3e4r5a6'
down_revision: Union[str, None] = 'p1q2r3s4t5u6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assistants', sa.Column('interactive_features', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('assistants', 'interactive_features')
```

Before writing the migration re-verify the head: `poetry run alembic -c src/external/alembic.ini heads` (expected `p1q2r3s4t5u6`; if different, use the actual head).
- [ ] **Step 4: Run tests + existing assistant model/router tests** (`pytest tests/codemie/rest_api/routers/test_assistant.py tests/codemie/rest_api/models -v`) — Expected: PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Add interactive_features assistant config with migration`

### Task B3: Wire protocol fields into stream/request/persistence models

**Files:**
- Modify: `src/codemie/chains/base.py` (`StreamedGenerationResult`, ~line 141)
- Modify: `src/codemie/core/models.py` (`AssistantChatRequest`, after `file_names`)
- Modify: `src/codemie/rest_api/models/conversation.py` (`GeneratedMessage`)
- Test: extend `tests/codemie/chains/test_interactive.py`

**Interfaces:**
- Produces: `StreamedGenerationResult.interactive_request: Optional[InteractiveRequest]`; `AssistantChatRequest.interactive_response: Optional[InteractiveResponse]`; `GeneratedMessage.interactive_request` / `GeneratedMessage.interactive_response` (both Optional).

Test-first: yes — serialization round-trip: `StreamedGenerationResult(interactive_request=...).model_dump_json()` contains the surface; default dump omits/nulls the field (text-only regression guard).

- [ ] **Step 1: Failing test**

```python
import json
from codemie.chains.base import StreamedGenerationResult
from codemie.chains.interactive import InteractiveRequest


def test_streamed_result_carries_interactive_request():
    req = InteractiveRequest(surface=[{"type": "text", "content": "hi"}])
    chunk = json.loads(StreamedGenerationResult(interactive_request=req).model_dump_json())
    assert chunk["interactive_request"]["surface"][0]["type"] == "text"


def test_streamed_result_default_has_null_interactive_request():
    chunk = json.loads(StreamedGenerationResult(generated="x").model_dump_json())
    assert chunk.get("interactive_request") is None
```

- [ ] **Step 2: Run** — FAIL (unknown field)
- [ ] **Step 3: Implement** — add to the three models (imports from `codemie.chains.interactive`):

```python
# StreamedGenerationResult
interactive_request: Optional[InteractiveRequest] = None
# AssistantChatRequest
interactive_response: Optional[InteractiveResponse] = None
# GeneratedMessage — assistant-side and user-side persisted fields
interactive_request: Optional[InteractiveRequest] = None
interactive_response: Optional[InteractiveResponse] = None
```

- [ ] **Step 4: Run new tests + `tests/codemie/rest_api/handlers/test_assistant_handlers_streaming.py`** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Carry interactive payloads through stream, request and history models`

### Task B4: `request_user_input` tool + registration + system prompt catalog

**Files:**
- Create: `src/codemie/agents/tools/interactive/request_user_input.py` (+ `__init__.py`)
- Modify: `src/codemie/service/tools/toolkit_service.py` (append hook next to `_append_workspace_image_tool_if_enabled`, ~line 578)
- Modify: `src/codemie/templates/agents/assistant_base.py` (new `interactive_elements_prompt`), `src/codemie/agents/assistant_agent.py` `_get_system_prompt` (~line 294) / `AssistantService._prepare_system_prompt`
- Test: `tests/codemie/agents/tools/test_request_user_input.py`

**Interfaces:**
- Consumes: B1 factory/validation, `ThreadedGenerator.send()` (`src/codemie/core/thread.py`)
- Produces: `RequestUserInputTool(config, thread_generator)` with `name="request_user_input"`, dynamic `args_schema`, `return_direct=True`; `ToolkitService._append_request_user_input_tool_if_enabled(tools, assistant, thread_generator)`.

Test-first: yes — tool execute with valid surface sends exactly one NDJSON line containing `interactive_request` with a uuid `request_id`; execute with a disabled element raises/returns tool error and sends nothing; toolkit append is a no-op when `assistant.interactive_features` is `None`.

- [ ] **Step 1: Failing tests**

```python
import json
from unittest.mock import MagicMock

import pytest

from codemie.agents.tools.interactive.request_user_input import RequestUserInputTool
from codemie.chains.interactive import InteractiveFeaturesConfig

CFG = InteractiveFeaturesConfig(action_buttons=True)


def _tool():
    generator = MagicMock()
    return RequestUserInputTool(config=CFG, thread_generator=generator), generator


def test_execute_emits_interactive_request_chunk():
    tool, generator = _tool()
    tool.execute(surface=[{"type": "button", "id": "ok", "label": "OK"}])
    assert generator.send.call_count == 1
    chunk = json.loads(generator.send.call_args[0][0])
    assert chunk["interactive_request"]["request_id"]
    assert chunk["interactive_request"]["surface"][0]["id"] == "ok"


def test_execute_rejects_disabled_element():
    tool, generator = _tool()
    with pytest.raises(ValueError, match="multiple_choice"):
        tool.execute(surface=[{"type": "multiple_choice", "id": "c",
                               "options": [{"value": "a", "label": "A"}]}])
    generator.send.assert_not_called()


def test_tool_is_return_direct_and_named():
    tool, _ = _tool()
    assert tool.name == "request_user_input"
    assert tool.return_direct is True


def test_args_schema_reflects_config():
    tool, _ = _tool()
    schema = str(tool.args_schema.model_json_schema())
    assert "button" in schema and "text_field" not in schema
```

- [ ] **Step 2: Run** — FAIL (module missing)
- [ ] **Step 3: Implement the tool** (base-class pattern: `SearchKBTool`, `src/codemie/agents/tools/kb/search_kb.py`):

```python
import logging
import uuid

from codemie_tools.base.codemie_tool import CodeMieTool

from codemie.chains.base import StreamedGenerationResult
from codemie.chains.interactive import (
    InteractiveFeaturesConfig, InteractiveRequest,
    build_surface_args_schema, validate_surface,
)

logger = logging.getLogger(__name__)

REQUEST_USER_INPUT_TOOL_NAME = "request_user_input"


class RequestUserInputTool(CodeMieTool):
    name: str = REQUEST_USER_INPUT_TOOL_NAME
    description: str = (
        "Show interactive UI elements to the user and wait for their structured response. "
        "Call this when you need an explicit decision, option selection, or short-form input. "
        "This ends your current turn; the user's structured response arrives as the next message."
    )
    return_direct: bool = True
    config: InteractiveFeaturesConfig
    thread_generator: object = None

    def __init__(self, config: InteractiveFeaturesConfig, thread_generator, **kwargs):
        super().__init__(config=config, thread_generator=thread_generator, **kwargs)
        self.args_schema = build_surface_args_schema(config)

    def execute(self, surface: list, **kwargs) -> str:
        elements = validate_surface(surface, self.config)  # raises ValueError -> tool error -> model retries
        request = InteractiveRequest(request_id=str(uuid.uuid4()), surface=elements)
        self.thread_generator.send(
            StreamedGenerationResult(interactive_request=request).model_dump_json()
        )
        return ""  # return_direct=True ends the agent turn with no extra text
```

Registration in `ToolkitService.get_tools` — final line becomes a chain (mirror `_append_workspace_image_tool_if_enabled`):

```python
        tools = cls._append_workspace_image_tool_if_enabled(tools, assistant, request, user)
        return cls._append_request_user_input_tool_if_enabled(tools, assistant, thread_generator)

    @classmethod
    def _append_request_user_input_tool_if_enabled(cls, tools, assistant, thread_generator):
        config = getattr(assistant, "interactive_features", None)
        if config and config.any_enabled() and thread_generator is not None:
            from codemie.agents.tools.interactive.request_user_input import RequestUserInputTool
            tools.append(RequestUserInputTool(config=config, thread_generator=thread_generator))
        return tools
```

System-prompt catalog: in `src/codemie/templates/agents/assistant_base.py` add `interactive_elements_prompt_template` — a short instruction block built by a helper `render_interactive_elements_prompt(config)` (in `chains/interactive.py` or the templates module) that lists ONLY `sorted(enabled_element_types(config))` and states: use `request_user_input` for decisions/choices/forms; never invent element types outside the list. Append it in the same place `markdown_response_prompt` is appended (`assistant_agent.py:_get_system_prompt`) when the assistant config has `any_enabled()`.

**LangGraph verification step (risk from technical analysis):** add test asserting the agent loop stops after `request_user_input` returns. If `LangGraphAgent` ignores `return_direct`, implement an explicit stop: in the tool-execution wrapper of `langgraph_agent.py`, after a tool with `return_direct=True` completes, route to END (grep for existing `return_direct` handling first). Test: `tests/codemie/agents/test_assistant_agent/test_interactive_turn_end.py` with a mocked LLM that calls the tool — assert no second LLM invocation occurs.
- [ ] **Step 4: Run tests** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Add request_user_input tool with config-driven catalog`

### Task B5: Stream capture + persistence of interactive_request

**Files:**
- Modify: `src/codemie/rest_api/handlers/assistant_handlers.py` (`_serve_data` drain loop ~lines 628–665; `ChatHistoryData` + `save_chat_history`)
- Test: `tests/codemie/rest_api/handlers/test_assistant_handlers_interactive.py`

**Interfaces:**
- Consumes: `interactive_request` chunks emitted by B4.
- Produces: assistant `GeneratedMessage.interactive_request` persisted when the turn emitted one.

Test-first: yes — feeding an `interactive_request` chunk through `_serve_data` results in `save_chat_history` being called with the parsed `InteractiveRequest`.

- [ ] **Step 1: Failing test** — reuse the fixtures of `test_assistant_handlers_streaming.py` (mock user, `ThreadedGenerator`, patched `save_chat_history`); enqueue `StreamedGenerationResult(interactive_request=req).model_dump_json()` then a final chunk; drain the generator; assert the captured `ChatHistoryData` carries the request.
- [ ] **Step 2: Run** — FAIL
- [ ] **Step 3: Implement.** In the drain loop, alongside `response = generation_result` capture:

```python
        interactive_request = None
        ...
            if generation_result.generated is not None:
                response = generation_result
            if getattr(generation_result, "interactive_request", None) is not None:
                interactive_request = generation_result.interactive_request  # SimpleNamespace
        ...
            self.save_chat_history(
                ChatHistoryData(
                    ...,
                    interactive_request=interactive_request,
                )
            )
```

Add `interactive_request` to `ChatHistoryData` and thread it into the `GeneratedMessage` the conversation service builds for the assistant turn (convert SimpleNamespace → dict via `json.loads(value)` at capture time to stay serializable: capture the raw dict from `json.loads(value)["interactive_request"]`).
- [ ] **Step 4: Run handler test suite** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Persist interactive requests with assistant chat history`

### Task B6: Response intake — validation, persistence, history materialization

**Files:**
- Modify: `src/codemie/rest_api/handlers/assistant_handlers.py` (entry path before agent build) or the shared pre-generation hook used by both stream/sync — locate via `_handle_stream` caller
- Modify: `src/codemie/rest_api/models/conversation.py` (`to_chat_history`, ~lines 562–600) + the user-message save path (store `interactive_response`)
- Create: `src/codemie/service/conversation/interactive_intake.py`
- Test: `tests/codemie/service/conversation/test_interactive_intake.py`, extend `tests/codemie/rest_api/models/` conversation tests

**Interfaces:**
- Consumes: `AssistantChatRequest.interactive_response`, conversation history with `interactive_request` (B5)
- Produces: `validate_interactive_intake(conversation, response) -> InteractiveRequest` raising `ExtendedHTTPException(422)` on unknown `request_id`, duplicate answer, or failed server-side re-validation; `materialize_interactive_message_text(message) -> str` used by `to_chat_history`.

Test-first: yes — duplicate answer to the same `request_id` raises 422; unknown request_id raises 422; invalid form value raises 422; `to_chat_history` renders user message with response as display text + JSON payload block.

- [ ] **Step 1: Failing tests**

```python
import pytest

from codemie.chains.interactive import InteractiveRequest, InteractiveResponse
from codemie.core.exceptions import ExtendedHTTPException
from codemie.rest_api.models.conversation import GeneratedMessage
from codemie.service.conversation.interactive_intake import validate_interactive_intake


def _history_with_request(request_id="r1", answered=False):
    req = InteractiveRequest(request_id=request_id, surface=[
        {"type": "button", "id": "ok", "label": "OK"}])
    history = [GeneratedMessage(role="Assistant", message="", interactive_request=req)]
    if answered:
        history.append(GeneratedMessage(
            role="User", message="✓ OK",
            interactive_response=InteractiveResponse(
                request_id=request_id, kind="action", payload={"action": "ok"})))
    return history


def test_unknown_request_id_rejected():
    resp = InteractiveResponse(request_id="nope", kind="action", payload={"action": "ok"})
    with pytest.raises(ExtendedHTTPException):
        validate_interactive_intake(_history_with_request(), resp)


def test_duplicate_answer_rejected():
    resp = InteractiveResponse(request_id="r1", kind="action", payload={"action": "ok"})
    with pytest.raises(ExtendedHTTPException):
        validate_interactive_intake(_history_with_request(answered=True), resp)


def test_valid_answer_accepted():
    resp = InteractiveResponse(request_id="r1", kind="action", payload={"action": "ok"})
    request = validate_interactive_intake(_history_with_request(), resp)
    assert request.request_id == "r1"
```

Materialization test (`to_chat_history`): user message with `interactive_response` produces `message` containing both the display text and `"action": "ok"` JSON.
- [ ] **Step 2: Run** — FAIL
- [ ] **Step 3: Implement**

```python
# src/codemie/service/conversation/interactive_intake.py
import json

from codemie.chains.interactive import InteractiveRequest, InteractiveResponse, validate_response_values
from codemie.core.exceptions import ExtendedHTTPException


def validate_interactive_intake(history, response: InteractiveResponse) -> InteractiveRequest:
    request = None
    for message in history:
        req = getattr(message, "interactive_request", None)
        if req is not None and req.request_id == response.request_id:
            request = req
        resp = getattr(message, "interactive_response", None)
        if resp is not None and resp.request_id == response.request_id:
            raise ExtendedHTTPException(code=422, message="Interactive request already answered")
    if request is None:
        raise ExtendedHTTPException(code=422, message="Unknown interactive request_id")
    try:
        validate_response_values(response, request)
    except ValueError as error:
        raise ExtendedHTTPException(code=422, message=str(error))
    return request


def materialize_interactive_message_text(display_text: str, response: InteractiveResponse) -> str:
    return (
        f"{display_text}\n\n"
        f"[Structured response to interactive request {response.request_id}]\n"
        f"{json.dumps(response.payload, ensure_ascii=False)}"
    )
```

Wire-up:
1. In the chat entry path (same place guardrails/pre-checks run before agent build): if `request.interactive_response` — load conversation history, `validate_interactive_intake(...)`.
2. In the user-message save path (`save_chat_history` / conversation service where `request.text` becomes the user `GeneratedMessage`): store `interactive_response=request.interactive_response`.
3. In `Conversation.to_chat_history()` USER branch: if the message has `interactive_response`, use `materialize_interactive_message_text(message.message or "", message.interactive_response)` as the ChatMessage text — this is how the agent "receives the action in structured form and continues".
- [ ] **Step 4: Run** intake + conversation + handler test suites — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Validate and materialize interactive responses in chat history`

### Task B7: Feature flag + backend regression sweep

**Files:**
- Modify: `config/customer/customer-config.yaml` (after the `features:requestHedging` block, lines ~188–192)

Test-first: no — config entry + full-suite regression run.

- [ ] **Step 1: Add flag**

```yaml
  - id: "features:interactiveElements"
    settings:
      enabled: false
      name: "Interactive Chat Elements"
      description: "Allow assistants to request structured user input via interactive chat elements"
```

- [ ] **Step 2: Full backend suite**: `poetry run pytest` — Expected: PASS (no regressions; pay attention to `test_assistant.py`, `test_conversation.py`, streaming handler tests)
- [ ] **Step 3: Commit** `EPMCDME-13259: Add interactiveElements customer feature flag`

---

## Part B — Frontend (`codemie-ui`)

### Task F1: Types

**Files:**
- Create: `src/types/entity/interactive.ts`
- Modify: `src/types/entity/conversation.ts` (`StreamChunk` ~line 287, `ChatMessage` ~line 136), `src/types/chatGeneration.ts` (`ChatRequest`), `src/types/entity/assistant.ts` (`Assistant`)

**Interfaces:**
- Produces: `InteractiveElement` union (snake_case `type` discriminators matching backend), `InteractiveRequest`, `InteractiveResponse`, `InteractiveFeaturesConfig {action_buttons, choice, short_forms}`; `StreamChunk.interactive_request?`; `ChatMessage.interactiveRequest?/interactiveResponse?`; `ChatRequest.interactiveResponse?`; `Assistant.interactive_features?: InteractiveFeaturesConfig | null`.

Test-first: no — pure type declarations (compile-checked by the tasks that consume them).

- [ ] **Step 1: Create `src/types/entity/interactive.ts`**

```ts
export interface TextElement { type: 'text'; content: string }
export interface ColumnElement { type: 'column'; children: InteractiveElement[] }
export interface RowElement { type: 'row'; children: InteractiveElement[] }
export interface ButtonElement {
  type: 'button'; id: string; label: string
  style?: 'primary' | 'secondary' | 'danger'
}
export interface ChoiceOption { value: string; label: string }
export interface MultipleChoiceElement {
  type: 'multiple_choice'; id: string
  options: ChoiceOption[]; max_allowed_selections: number
}
export interface FieldValidation { required?: boolean; regex?: string | null; email?: boolean }
export interface TextFieldElement {
  type: 'text_field'; id: string; label: string; validation?: FieldValidation | null
}
export interface CheckBoxElement {
  type: 'checkbox'; id: string; label: string; validation?: FieldValidation | null
}

export type InteractiveElement =
  | TextElement | ColumnElement | RowElement
  | ButtonElement | MultipleChoiceElement | TextFieldElement | CheckBoxElement

export interface InteractiveRequest { request_id: string; surface: InteractiveElement[] }

export type InteractiveResponseKind = 'action' | 'choice' | 'form' | 'text_fallback'

export interface InteractiveResponse {
  request_id: string
  kind: InteractiveResponseKind
  payload: Record<string, unknown>
}

export interface InteractiveFeaturesConfig {
  action_buttons: boolean
  choice: boolean
  short_forms: boolean
}
```

- [ ] **Step 2: Extend existing types** — `StreamChunk` gets `interactive_request?: InteractiveRequest`; `ChatMessage` gets `interactiveRequest?: InteractiveRequest | null` and `interactiveResponse?: InteractiveResponse | null`; `ChatRequest` gets `interactiveResponse?: InteractiveResponse`; `Assistant` gets `interactive_features?: InteractiveFeaturesConfig | null` (after `hedging_config`). Check the history-load mapping in `src/store/chats.ts` (where backend `GeneratedMessage` fields map onto `ChatMessage`) and map `interactive_request → interactiveRequest`, `interactive_response → interactiveResponse`.
- [ ] **Step 3: `npx tsc --noEmit` (or the project's typecheck script)** — PASS
- [ ] **Step 4: Commit** `EPMCDME-13259: Add interactive element types`

### Task F2: InteractiveElements component family

**Files:**
- Create: `src/components/InteractiveElements/InteractiveSurface.tsx`, `InteractiveButton.tsx`, `InteractiveMultipleChoice.tsx`, `InteractiveForm.tsx`, `index.ts`
- Test: `src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx`

**Interfaces:**
- Consumes: F1 types; existing `Button` from `@/components` (same import as `ChatAiMessage.tsx`), react-hook-form + Yup.
- Produces: `<InteractiveSurface request={InteractiveRequest} disabled={boolean} submittedResponse={InteractiveResponse | null} onSubmit={(kind, payload, displayText) => void} />`

Behavior contract:
- Surface with any `text_field`/`checkbox` ⇒ **form mode**: fields render via react-hook-form; Yup schema derived from `validation` (required/regex/email); any `button` acts as submit; invalid submit blocked client-side with inline errors; `onSubmit('form', {values}, 'Form submitted: k=v, …')`.
- Otherwise `button` ⇒ `onSubmit('action', {action: id}, label)` on click.
- `multiple_choice` with `max_allowed_selections === 1` ⇒ radio-style, submits on click (`onSubmit('choice', {selected: [value]}, label)`); `> 1` ⇒ checkbox list capped at max + own Submit button (`displayText: 'Selected: A, B'`).
- `disabled` ⇒ all controls disabled; `submittedResponse` ⇒ render selection marks (chosen button highlighted, chosen options checked, form values shown read-only).
- Layout: `column` → `flex flex-col gap-2`, `row` → `flex flex-row flex-wrap gap-2`, `text` → `<p className="text-sm">`.

Test-first: yes — renders button tree; click fires `onSubmit('action', {action:'ok'}, 'OK')`; invalid email blocks submit and shows error; `maxAllowedSelections` cap enforced; `disabled` blocks clicks.

- [ ] **Step 1: Failing tests** (`@testing-library/react` + `userEvent`, unit project conventions):

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import InteractiveSurface from '@/components/InteractiveElements/InteractiveSurface'
import type { InteractiveRequest } from '@/types/entity/interactive'

const actionRequest: InteractiveRequest = {
  request_id: 'r1',
  surface: [{ type: 'row', children: [
    { type: 'button', id: 'approve', label: 'Approve' },
    { type: 'button', id: 'reject', label: 'Reject', style: 'danger' },
  ]}],
}

describe('InteractiveSurface', () => {
  it('fires action submit on button click', async () => {
    const onSubmit = vi.fn()
    render(<InteractiveSurface request={actionRequest} disabled={false}
                               submittedResponse={null} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onSubmit).toHaveBeenCalledWith('action', { action: 'approve' }, 'Approve')
  })

  it('does not fire when disabled', async () => {
    const onSubmit = vi.fn()
    render(<InteractiveSurface request={actionRequest} disabled
                               submittedResponse={null} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks invalid email in form mode', async () => {
    const onSubmit = vi.fn()
    const formRequest: InteractiveRequest = {
      request_id: 'r2',
      surface: [
        { type: 'text_field', id: 'email', label: 'Email',
          validation: { required: true, email: true } },
        { type: 'button', id: 'send', label: 'Send' },
      ],
    }
    render(<InteractiveSurface request={formRequest} disabled={false}
                               submittedResponse={null} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('caps multi-choice at max_allowed_selections', async () => {
    const onSubmit = vi.fn()
    const choiceRequest: InteractiveRequest = {
      request_id: 'r3',
      surface: [{ type: 'multiple_choice', id: 'c1', max_allowed_selections: 2,
        options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }] }],
    }
    render(<InteractiveSurface request={choiceRequest} disabled={false}
                               submittedResponse={null} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'B' }))
    expect(screen.getByRole('checkbox', { name: 'C' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run** `npm run test:unit -- src/components/InteractiveElements` — FAIL
- [ ] **Step 3: Implement** the four components per the behavior contract (recursive `renderElement(el)` switch in `InteractiveSurface`; Yup schema builder `buildFormSchema(fields)` mapping `required → Yup.required`, `regex → Yup.matches`, `email → Yup.email`; reuse the repo's `Button`, `Input`, `Checkbox` primitives from `@/components` — match imports used in `AssistantForm.tsx`/`HedgingConfig.tsx`).
- [ ] **Step 4: Run** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Add interactive chat element components`

### Task F3: chatGeneration store — chunk handling + submit action + derivation

**Files:**
- Modify: `src/store/chatGeneration.ts` (`_handleChunk` ~line 1004, `createChatGeneration` data assembly ~line 322, new method)
- Create/modify: `src/utils/interactive.ts` (derivation helper)
- Test: `src/store/__tests__/chatGeneration.interactive.test.ts`

**Interfaces:**
- Consumes: F1 types, existing `_sendRequest` flow, `chatsStore.currentChat`.
- Produces: `_handleChunk` sets `historyItem.interactiveRequest` on `chunk.interactive_request`; `chatGenerationStore.submitInteractiveResponse(response: InteractiveResponse, displayText: string)` pushes a compact user message with `interactiveResponse` and sends the request with `interactiveResponse` in `ChatRequest`; `isInteractiveRequestAnswered(chat, requestId): boolean` in `src/utils/interactive.ts` (scans all history user messages).

Test-first: yes — chunk with `interactive_request` lands on `historyItem.interactiveRequest`; `submitInteractiveResponse` pushes user message with `interactiveResponse` and calls `api.stream` with `interactiveResponse` in the body; `isInteractiveRequestAnswered` true only when a matching user message exists.

- [ ] **Step 1: Failing tests** — follow `chatGeneration.test.ts` mock conventions (mock `@/utils/api`, `@/store/chats`, fixtures `createChat`/`createHistoryItem`):

```ts
it('stores interactive_request chunk on the history item', async () => {
  const historyItem = createHistoryItem()
  const { chatGenerationStore } = await import('@/store/chatGeneration')
  await chatGenerationStore._handleChunk(
    historyItem,
    JSON.stringify({ interactive_request: { request_id: 'r1', surface: [
      { type: 'button', id: 'ok', label: 'OK' }] } })
  )
  expect(historyItem.interactiveRequest?.request_id).toBe('r1')
})

it('submitInteractiveResponse pushes chip message and sends structured payload', async () => {
  const historyItem = createHistoryItem()
  const chat = createChat(historyItem)
  mockChatsStore.currentChat = chat
  mockStream.mockResolvedValueOnce(createEmptyStreamReader())
  const { chatGenerationStore } = await import('@/store/chatGeneration')
  await chatGenerationStore.submitInteractiveResponse(
    { request_id: 'r1', kind: 'action', payload: { action: 'ok' } }, '✓ OK'
  )
  const lastUserMessage = chat.history.at(-1)?.at(-1)
  expect(lastUserMessage?.interactiveResponse?.request_id).toBe('r1')
  expect(lastUserMessage?.request).toBe('✓ OK')
  const body = mockStream.mock.calls[0][1]
  expect(body.interactiveResponse).toEqual({ request_id: 'r1', kind: 'action', payload: { action: 'ok' } })
})
```

- [ ] **Step 2: Run** — FAIL
- [ ] **Step 3: Implement.**
  - `_handleChunk`: inside the chunk loop, before the thought/generated branch: `if (chunk.interactive_request) { historyItem.interactiveRequest = chunk.interactive_request; continue }`.
  - `submitInteractiveResponse(response, displayText)`: modeled on `resumeWorkflowExecution` (`:546`) — push `{ role: ROLE_USER, request: displayText, requestRaw: displayText, interactiveResponse: response, createdAt, inProgress: true, assistantId: lastAssistantMessage.assistantId, assistant, executionId: null }`, then build a `ChatRequest` like `createChatGeneration` does (same field set incl. `history`) plus `interactiveResponse: response`, `text: displayText`, and call `_sendRequest(chat, newHistoryIndex, 0, data)`.
  - Verify the request serialization path: check how `ChatRequest` camelCase fields become backend snake_case (grep the api layer for the transform, e.g. in `utils/api.ts` or a serializer near `_sendRequest`); register `interactiveResponse → interactive_response` the same way `llmModel → llm_model` is handled.
  - `src/utils/interactive.ts`: `export const isInteractiveRequestAnswered = (chat, requestId) => chat.history.flat().some((m) => m.interactiveResponse?.request_id === requestId)`.
- [ ] **Step 4: Run store test suites** (new + existing `chatGeneration*.test.ts`) — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Handle interactive chunks and structured responses in chat store`

### Task F4: Chat rendering — ChatAiMessage block + user chip

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` (JSX ~lines 198–247)
- Modify: `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx` (JSX ~lines 167–205)
- Test: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiInteractiveBlock.test.tsx`

**Interfaces:**
- Consumes: `InteractiveSurface` (F2), `submitInteractiveResponse` + `isInteractiveRequestAnswered` (F3).
- Produces: interactive block rendered under the markdown body; block states: **submitted** (answered in history ⇒ `disabled` + `submittedResponse`), **active** (unanswered + message not in progress), **stale** (unanswered but a newer user/assistant turn exists ⇒ `disabled`); compact chip for user messages with `interactiveResponse`.

Test-first: yes — message with `interactiveRequest` renders the surface; click calls `chatGenerationStore.submitInteractiveResponse`; answered request renders disabled; user message with `interactiveResponse` renders chip text instead of editor markup.

- [ ] **Step 1: Failing tests** — pattern: `ChatAiAuthPrompt.test.tsx` (mock `chatGenerationStore`, build `ChatMessage` fixtures).
- [ ] **Step 2: Run** — FAIL
- [ ] **Step 3: Implement.**
  - `ChatAiMessage.tsx`: after the `Markdown` block (inside the non-MCP branch):

```tsx
{message.interactiveRequest && (
  <InteractiveSurface
    request={message.interactiveRequest}
    disabled={!isInteractiveBlockActive}
    submittedResponse={submittedResponse}
    onSubmit={(kind, payload, displayText) =>
      chatGenerationStore.submitInteractiveResponse(
        { request_id: message.interactiveRequest!.request_id, kind, payload },
        displayText
      )}
  />
)}
```

  with `submittedResponse = chat.history.flat().find((m) => m.interactiveResponse?.request_id === message.interactiveRequest?.request_id)?.interactiveResponse ?? null` and `isInteractiveBlockActive = !submittedResponse && isLastMessageOfChat && !message.inProgress && !chatHasGenerationInProgress` (compute last-message from `indexes` vs history lengths, same data ChatAiMessageActions uses).
  - `ChatUserMessage.tsx`: when `message.interactiveResponse` is set, render the chip instead of the sanitized HTML paragraph and hide editing affordances:

```tsx
{!isEditing && message.interactiveResponse && (
  <span className="inline-flex items-center gap-1 text-sm" data-testid="interactive-response-chip">
    ✓ {request}
  </span>
)}
```

- [ ] **Step 4: Run chat component test suites** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Render interactive blocks and response chips in chat`

### Task F5: AssistantForm "Interactive features" section + flag + mock-server

**Files:**
- Create: `src/pages/assistants/components/AssistantForm/components/InteractiveFeaturesSection.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (Yup schema ~line 153-area, defaultValues ~line 289, accordion JSX ~line 776-area), `src/hooks/useFeatureFlags.ts` (helper), `mock-server/db.json` (`config` array ~line 716)
- Test: extend `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` + `AssistantDetailsPage.integration.test.tsx`

**Interfaces:**
- Consumes: `InteractiveFeaturesConfig` type (F1), `FormAccordion`/`Accordion` + `Switch` primitives (imports as in `HedgingConfig.tsx`), `useFeatureFlag`.
- Produces: form field `interactive_features` (null = disabled), three toggles; `useInteractiveElementsEnabled()` hook; payload includes `interactive_features` on create/update.

Test-first: yes — integration: with flag enabled in mocked config, the "Interactive features" accordion is visible; toggling "Choices" and saving POSTs `interactive_features: {action_buttons: false, choice: true, short_forms: false}`; with flag disabled the section is absent.

- [ ] **Step 1: Failing integration test** — `mockAPI('GET', 'v1/config', [...existing, { id: 'features:interactiveElements', settings: { enabled: true } }])`, render `/assistants/new`, open accordion, toggle, submit, assert POST body.
- [ ] **Step 2: Run** `npm run test:integration -- NewAssistantPage` — FAIL
- [ ] **Step 3: Implement.**
  - Component (pattern `HedgingConfig.tsx` — value/onChange via Controller, master `Switch` + three feature switches when enabled):

```tsx
const DEFAULT_CONFIG: InteractiveFeaturesConfig = {
  action_buttons: false, choice: false, short_forms: false,
}

interface Props {
  value: InteractiveFeaturesConfig | null | undefined
  onChange: (value: InteractiveFeaturesConfig | null) => void
  onBlur: () => void
}

const InteractiveFeaturesSection: FC<Props> = ({ value, onChange, onBlur }) => {
  const isEnabled = value !== null && value !== undefined
  const config = value ?? DEFAULT_CONFIG
  const setFeature = (key: keyof InteractiveFeaturesConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, [key]: e.target.checked })
  return (
    <>
      <Switch label="Enable interactive features" value={isEnabled}
              onChange={(e) => onChange(e.target.checked ? { ...DEFAULT_CONFIG } : null)} onBlur={onBlur} />
      {isEnabled && (
        <>
          <Switch label="Action buttons" value={config.action_buttons} onChange={setFeature('action_buttons')} onBlur={onBlur} />
          <Switch label="Choices" value={config.choice} onChange={setFeature('choice')} onBlur={onBlur} />
          <Switch label="Short forms" value={config.short_forms} onChange={setFeature('short_forms')} onBlur={onBlur} />
        </>
      )}
    </>
  )
}
```

  - Yup: `interactive_features: Yup.object({ action_buttons: Yup.boolean(), choice: Yup.boolean(), short_forms: Yup.boolean() }).nullable().default(null)`; defaultValues: `interactive_features: assistant?.interactive_features ?? null`; accordion gated by `const [isInteractiveElementsEnabled] = useInteractiveElementsEnabled()`, title "Interactive features", description "Let the assistant request structured input via buttons, choices, and short forms."
  - Hooks/flags: `useInteractiveElementsEnabled = () => useFeatureFlag('features:interactiveElements')` in `useFeatureFlags.ts`; mirror helper in `utils/featureFlags.ts` if the existing pairs do.
  - mock-server: add `{ "id": "features:interactiveElements", "settings": { "enabled": true, "name": "Interactive Chat Elements" } }` to the `config` array.
  - `compareFormData.ts`: no entry needed (spreads compare it); verify the create/edit dirty-check works with `null` default in the integration test.
- [ ] **Step 4: Run integration suites** — PASS
- [ ] **Step 5: Commit** `EPMCDME-13259: Add Interactive features assistant config section`

### Task F6: Frontend regression sweep

Test-first: no — full gates.

- [ ] **Step 1:** `npm run lint && npx tsc --noEmit && npm run test` (unit + integration workspaces) — Expected: PASS
- [ ] **Step 2:** Fix any fallout inline; commit `EPMCDME-13259: Fix lint/type/test fallout` only if changes were needed.

---

## Execution order & notes

B1 → B2 → B3 → B4 → B5 → B6 → B7, then F1 → F2 → F3 → F4 → F5 → F6. Backend first: the wire contract must exist before the frontend consumes it. All exact line numbers are anchors valid at plan time — re-locate by symbol if drifted.

Known risk checkpoints (from technical analysis):
1. `return_direct` honoring in `LangGraphAgent` (B4 verification step) — the single most uncertain integration point.
2. Request serialization camelCase→snake_case mapping for `interactiveResponse` (F3 step 3).
3. History-load mapping location in `chats.ts` (F1 step 2).
4. Alembic head drift — re-verify `alembic heads` before B2 migration.
