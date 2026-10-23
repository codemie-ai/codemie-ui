DONE_WITH_CONCERNS

Commit: 94bba63c8

Changed paths:
- src/pages/settings/administration/components/useMCPConfigTest.tsx (new; .tsx not .ts because it renders the auth popups)
- src/pages/settings/administration/components/MCPServerActions.tsx
- src/pages/settings/administration/components/__tests__/MCPServerActions.test.tsx (new)

Test command:
npx vitest run --project unit src/pages/settings/administration/components/__tests__/MCPServerActions.test.tsx src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
RED: 6/6 failed (no "Test Connection" item). GREEN: 7/7 pass, EXIT=0. tsc --noEmit clean.

Hook for U3:
import { useMCPConfigTest } from './useMCPConfigTest'   // src/pages/settings/administration/components/useMCPConfigTest
useMCPConfigTest(id: string): { run: () => Promise<void>; isTesting: boolean; authPopups: ReactNode }
Caller MUST render {authPopups} in its tree (auth-required Popup + broker login Popup). isTesting comes from mcpStore.testingConfigIds.

Behavior: success -> toaster.success("MCP connection test successful (N tools)"); warning -> toaster.info("connected but no tools returned"); failure -> toaster.error(last_test_message || fallback); auth-required -> popup, auto re-run on onAllAuthenticated, no error toast; other errors -> toaster.error.

Concerns:
- File is .tsx rather than .ts (JSX popups); extensionless imports unaffected.
- Hook returns extra `authPopups` beyond { run, isTesting }; each hook instance (one per row's MCPServerActions) owns its popups.
- Menu item icon is play.svg; title stays "Test Connection" (disabled while testing, no title change).
