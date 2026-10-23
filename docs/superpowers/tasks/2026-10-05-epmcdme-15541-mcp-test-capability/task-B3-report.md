DONE

Commit: 3d86f1671
Changed paths:
- src/codemie/service/mcp_config_service.py
- tests/codemie/service/test_mcp_config_service_test_capability.py

Test command:
poetry run pytest tests/codemie/service/test_mcp_config_service_test_capability.py
(9 passed; also ran auth_crud + auth_conflict service tests: 44 passed)

Signature (for router task):
    @classmethod
    def test(cls, config_id: str, user: User) -> MCPConfigResponse   # SYNC
- 404 ExtendedHTTPException if not found.
- MCPAuthenticationRequiredException / BrokerAuthRequiredException propagate before any write.
- Persists via mcp_config.update(touch_timestamp=False), so update_date is not touched.

Concerns:
- Stored config (MCPServerConfigData) is passed to MCPServerDetails via model_dump(); enabled = is_active.
- Tests mock find_by_id / MCPServerTester / MCPConfig.update (no DB).
- Passing several test files in one pytest invocation once collected 0 items (xdist oddity with a bad path); not an issue in the final runs.
