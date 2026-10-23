DONE

Commit: 4f13184f7 (EPMCDME-15541: Persist last MCP config test result)

Changed paths (backend repo):
- src/codemie/rest_api/models/mcp_config.py
- src/codemie/service/mcp_config_service.py
- src/external/alembic/versions/e1a2b3c4d5f6_add_mcp_config_last_test_columns.py (revises d9e8f7a6b5c4, the head)
- tests/codemie/service/test_mcp_config_service_test_capability.py (new)

Test command (RED: ImportError MCPTestDetail; GREEN: EXIT=0, 491 passed incl. existing mcp_config tests):
poetry run pytest tests/codemie/service/test_mcp_config_service_test_capability.py tests/codemie/service/test_mcp_config_service_auth_crud.py tests/codemie/service/test_mcp_config_service_auth_validation.py tests/codemie/service/test_mcp_config_service_auth_conflict.py tests/codemie/service/test_mcp_config_service_auth_secret_storage.py tests/codemie/service/mcp -q

Interfaces for later tasks (all in codemie.rest_api.models.mcp_config):
- MCPTestStatus(str, Enum): SUCCESS/FAILURE/WARNING = "success"/"failure"/"warning"
- MCPTestDetail(BaseModel): message: str, error_category: str | None = None, tools_count: int | None = None
- MCPConfig.last_test_at (timestamptz), last_test_status (String column, MCPTestStatus), last_test_detail (JSONB via PydanticType(MCPTestDetail))
- MCPConfigResponse: last_test_at, last_test_status, last_test_message, last_test_error_category, last_test_tools_count (all default None). last_test_detail is not exposed.

Concerns:
- "alembic" is not on PATH; head found by parsing revision/down_revision in versions/ (single head d9e8f7a6b5c4). Migration not run against a DB.
- last_test_status column is plain String (no DB enum/check constraint); enum enforced at model level.
- Writers must set status/detail/at (no update path added here).
