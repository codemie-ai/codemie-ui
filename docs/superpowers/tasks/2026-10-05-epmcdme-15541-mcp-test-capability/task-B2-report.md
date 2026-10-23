DONE

Commit: a18fd20b5
Changed paths:
- src/codemie/service/mcp/mcp_tester.py
- tests/codemie/service/mcp/test_mcp_tester.py

Test command: `poetry run pytest tests/codemie/service/mcp/test_mcp_tester.py` (RED: import error for MCPTestResult; GREEN: 30 passed, EXIT=0)

Interfaces (import `from codemie.service.mcp.mcp_tester import MCPServerTester, MCPTestResult`):
- `@dataclass(frozen=True) MCPTestResult(status: MCPTestStatus, message: str, error_category: str | None = None, tools_count: int | None = None)`
- `MCPTestStatus` is from `codemie.rest_api.models.mcp_config` (success/failure/warning).
- `MCPServerTester.run_test() -> MCPTestResult`; `test()` is a wrapper: success -> (True, msg), else (False, msg).
- Constants: NO_TOOLS_CATEGORY = "no_tools", UNKNOWN_CATEGORY = "unknown".
- error_category: empty tools -> "no_tools" (tools_count=0); MCPToolLoadException -> MCPErrorCategory value (uppercase, e.g. "TIMEOUT"); other exceptions -> "unknown"; success -> None (tools_count=len).
- Auth exceptions (Broker/MCPAuthenticationRequired) re-raised from run_test.

Concerns: none. Note category values from MCPErrorCategory are uppercase while the two local ones are lowercase, as specified.
