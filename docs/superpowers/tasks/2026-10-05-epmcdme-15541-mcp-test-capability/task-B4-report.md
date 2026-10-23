DONE

Commit: e0f522850

Changed paths:
- src/codemie/rest_api/routers/mcp_config.py (POST /v1/mcp-configs/{config_id}/test, authenticate + admin_access_only, response_model=MCPConfigResponse; declared before the DELETE route; no other POST route with a conflicting dynamic path)
- tests/codemie/rest_api/routers/test_mcp_config_test_endpoint.py (200 with last_test fields, 403 non-admin, 404 unknown id)

Test command:
poetry run pytest tests/codemie/rest_api/routers/test_mcp_config_test_endpoint.py tests/codemie/rest_api/routers/test_mcp_managed.py  (EXIT=0, 7 passed)

RED: 2 failed (404 because route missing). GREEN after route added.

Concerns: non-admin test uses a SimpleNamespace user because User.resolve_is_admin forces is_admin=True when ENV=local. Service is patched in router tests (service logic covered in earlier task).
