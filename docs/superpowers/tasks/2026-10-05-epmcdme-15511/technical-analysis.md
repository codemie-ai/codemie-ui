# Technical Research

**Task**: MCP server cards documentation popup
**Generated**: 2026-10-05
**Research path**: filesystem

---

## 1. Original Context

Summary: MCP selection popup displays duplicated documentation link icons on server cards. Description: In Browse MCP Servers popup each MCP server card renders documentation/external-link icon twice next to usage/count indicator, including EPAM Radar, Deprecated EPAM Radar, Stage EPAM Radar. Preconditions logged-in user, MCP selection available, popup open with servers having documentation links. Repro open MCP selection, Browse MCP Servers, search radar, inspect footer icons. Expected single documentation/external-link icon per available documentation link. Actual two identical icons. AC: (1) no more than one documentation/external-link icon for a single documentation link; (2) remaining icon opens correct documentation or source link; (3) consistent across all cards including named examples; (4) preserve usage/count, Add, tags, all other actions; (5) layout aligned/consistent; (6) verified with multiple cards in MCP selection. Jira EPMCDME-15511.

---

## 2. Codebase Findings

### Existing Implementations

Paths below abbreviated as `MCP/` mean `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/`; `Toolkits/` means its parent directory.

- `MCP/MCPMarketplaceCard.tsx:96–124`: file-local `ExternalLinks` independently renders an anchor for truthy `homeUrl` and an anchor for truthy `sourceUrl`. Both contain the same `ExternalSvg`, with titles `Documentation` and `Source Code`. There is no equality or uniqueness check. Equal, nonempty URLs deterministically produce two identical icons pointing to one destination. Different URLs also produce visually identical icons, but point to separate destinations.
- `MCP/MCPMarketplaceCard.tsx:192`: the only caller of `ExternalLinks`; passes `config.server_home_url` and `config.source_url` directly. This is not the selected-server `MCPServerCard.tsx`.
- `MCP/MCPMarketplaceCard.tsx:173–203`: footer flex row contains separately rendered usage/count, external links, and Add/Added button. Usage appears only for `usage_count > 0`; Add calls `onSelect(config)` and disables for already-added servers. Categories, Public/System badges, descriptions, logos and selected styling are independent of links.
- `MCP/MCPMarketplaceModal.tsx:150–160`: sole production caller of `MCPMarketplaceCard`; maps `mcpStore.configs` once, keyed by `config.id`, in the Browse MCP Servers grid.
- `MCP/MCPToolkit.tsx:206,334`: the two production modal call sites belong to mutually exclusive empty-server and nonempty-server return branches. They do not mount two visible card footers for one card.
- `MCP/useMarketplaceModal.ts`: sole hook caller is the marketplace modal. Fetches public, active catalog entries on opening, category/search changes, and pagination; debounces search; closes/reset selection via handlers.
- `src/store/mcp.ts:95–123`: `indexConfigs` requests `v1/mcp-configs` with query filters through `api.get`, parses JSON, and assigns `data.configs ?? []` to state without modifying either link field.
- `src/types/entity/mcp.ts:41–46,62–66`: `MCPConfig` and `MCPConfigRequest` have distinct optional string fields `server_home_url` and `source_url`.
- `src/pages/settings/administration/components/MCPServerModal/index.tsx:165–199`: separately labels documentation and source-code inputs. Adjacent `modalHelpers.ts` independently copies both fields into and out of form data, without deduplication.
- `src/assets/icons/external.svg`: one external-link illustration made of three paths, not two complete icons.
- `src/components/Link/Link.tsx`: existing native-anchor wrapper renders children/label/URL and supplies `_blank` protection. It does not inject an external SVG and is not imported by the marketplace card; it is not the duplication source.

### Architecture and Layers Affected

- Presentation: marketplace card and its file-local external-link renderer.
- Containers/hooks: marketplace modal, toolkit and tools configuration compose the same card pipeline.
- State/API integration: Valtio `mcpStore` → shared `src/utils/api.ts` → backend catalog response supplies links unchanged.
- No database/ORM or migration implementation exists in this frontend flow.
- Complete shared-render caller chain: `ExternalLinks` ← `MCPMarketplaceCard` ← `MCPMarketplaceModal` ← `MCPToolkit` ← `Toolkits/McpServersSection.tsx:70` ← `Toolkits/ToolsConfiguration.tsx:256`.
- All production `ToolsConfiguration` call sites: `AssistantForm.tsx:866`; `src/pages/skills/components/SkillForm.tsx:366`; workflow `VirtualAssistantForm.tsx:389`; workflow `ToolSelector.tsx:211,239`. The first ToolSelector call explicitly disables MCP; the second renders the Select MCP Server popup. Skill and virtual-assistant forms enable/inherit MCP display. AssistantForm is used by NewAssistantPage, EditAssistantPage and chat's ChatConfigAssistantForm. Thus both workflow MCP selection and assistant/chat/skill surfaces reach the same renderer when MCP is enabled.

### Integration Points

- Native external anchors preserve `href`, `target="_blank"` and `rel="noopener noreferrer"`; no click handler routes through Add.
- Card imports React, existing Button/constants, MCPConfig, `getCategoryColor` and `cn`; no new package is implicated.
- Store uses Valtio and the existing HTTP client. No MCP connection/auth handshake participates in documentation-link rendering.

### Patterns and Conventions

- Existing file-local React helpers keep card composition together; Tailwind flex/gap classes govern footer alignment.
- Catalog URL fields are separate business inputs, not duplicate entries in a list.
- Source-level root cause is independent truthiness conditions around two identical SVG-bearing anchors. Runtime URL values for the three Radar examples were not retrieved, so equality of their destinations is not asserted as an observed production fact.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` loaded before code search: typed component props, conditional JSX, Tailwind conventions, accessible controls, store-connected container separation.
- `.ai-run/guides/architecture/architecture.md`: presentation → Valtio store → central API client boundaries.
- `.ai-run/guides/development/security-patterns.md`: untrusted navigation handling and preservation of security protections; security cleanup is not incidental scope.
- `.ai-run/guides/testing/testing-patterns.md`: colocated unit/integration tests, module-level mocks and user-visible assertions.
- Repository AGENTS.md: no source/test edits requested here, no git side effects, no test/typecheck claims without `npm ci`, no separate summary/validation document.

### Architectural Decisions

- Administration UI explicitly distinguishes documentation from source code; no inspected guide defines “one destination per card” when both fields differ.
- Latest inspected card change `f40e2cf37` (October 1, 2026, EPMCDME-15365) changes mobile header layout only, not external links. Prior inspected subjects concern onboarding and name hover; no introduction date for the link bug is established.

### Derived Conventions

- Every catalog card shares the same external-link renderer regardless of name, category, selected status, usage count or surface.
- Some guide metadata is stale: package.json declares React 19.2.8, not React 18; integration setup includes an additional file/custom environment omitted by the testing guide. Source configuration is authoritative; guides were not edited.

---

## 4. Testing Landscape

### Existing Coverage

- `MCP/__tests__/MCPToolkit.test.tsx`: unavailable-server warning, catalog cache fetching, governance restriction.
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx:1680–1741`: MCP feature gating, Browse Catalog opening and catalog fetch. Its single GitHub fixture does not populate either link field or assert icon count/navigation.
- `src/store/__tests__/mcp.test.ts`: search-result/cache isolation and updating an existing ID. Fixtures include usage counts but not documentation/source URLs.
- Nearby tests cover detail/actions/config/env-var/auth wiring; no directly named marketplace-card, marketplace-modal or marketplace-hook test was found.

### Testing Framework and Patterns

- package.json: Vitest 5.0.2, React Testing Library 16.3.0 and user-event 14.6.1.
- `vite.config.ts:115–139`: unit project uses jsdom and `src/setupTests` plus `src/setupTests.unit`; integration uses `vitest-env-integration.ts`, `src/setupTests` plus `src/setupTests.integration`.
- Existing unit tests use module-level `vi.mock`, reset mocks/state in beforeEach, and render/screen assertions. Integration uses `mockAPI`, `renderPage` and scoped dialog queries.

### Coverage Gaps

- No inspected test pins down equal-link deduplication, source-only/home-only/neither cases, or distinct-link preservation.
- No inspected test verifies all three Radar examples, multi-card icon count, actual external navigation or footer alignment.
- Tests were only read: no test files created/changed, dependencies reinstalled, gates run or authenticated browser reproduction performed.

---

## 5. Configuration and Environment

### Environment Variables

- `src/utils/api.ts:142`: backend URL from public runtime `window._env_?.VITE_API_URL`, falling back to build-time `import.meta.env.VITE_API_URL`.
- External documentation URLs themselves come from catalog data, not environment variables.

### Configuration Files

- package.json: React 19.2.8, Valtio 2.1.5, Vite 8.3.1; existing TypeScript/React frontend. First manifest survey read its first 60 lines; dependency/test entries were searched separately.
- `src/constants/mcp.ts`: 300 ms search debounce, default/public/active filters and pagination constants.
- `vite.config.ts`: two test projects, 30-second test timeout, maxWorkers 3.
- Top-level application areas observed using `ls -1`: src, public, scripts, mock-server, docs, templates and deploy-templates.
- Commands actually run included `ls -1`, `head -60 package.json`, focused `grep -RInE`/`grep -n` searches, `find src -iname "*mcp*" -o -iname "*link*test*"`, `cat`/`sed -n`/`nl -ba` file reads, `git status --short`, `git log -3 --oneline -- src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPMarketplaceCard.tsx`, and `git show f40e2cf37 -- src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPMarketplaceCard.tsx`. Windows Git Bash used the supplied `bash.exe -lc` transport; these were read-only commands. Baseline git status was clean.

### Feature Flags and Deployment Concerns

- `mcpConnect` / `useMcpEnabled` gates MCP sections; `showMcpServers` can additionally suppress them.
- `mcpCustomServersDisabled` changes custom-server setup and selection representation, not card link rendering.
- Compact/chat/mobile and expanded toolkit branches share the catalog card. The modal grid has responsive one/two/three-column classes.
- No domain-specific deployment or secret requirement was found for this display issue.

---

## 6. Risk Indicators

- Radar URL values and authenticated UI behavior remain unverified; Jira has only a screenshot, not usable technical analysis.
- Speculative: the minimal fix is a source-anchor guard `sourceUrl && sourceUrl !== homeUrl` in shared `ExternalLinks`; preserve distinct destinations. Always choosing one fallback URL would discard a valid action.
- Speculative: confirm whether the ticket instead mandates one total icon for differing URLs; existing data/UI distinguish documentation and source code. Do not add URL normalization without evidence.
- No direct marketplace-card regression coverage; equal/different/one/no URLs, multiple cards, Add/count/tags and responsive alignment lack verification.
- Shared renderer reaches workflow MCP selection, assistant/chat and skills. Preserve labels and `_blank` protection; package/test-guide metadata is stale.

---

## 7. Summary for Complexity Assessment

The proven rendering cause is two independently conditioned anchors in file-local `ExternalLinks`, both using the same external SVG and no destination-uniqueness check. Its sole caller is the marketplace card; all catalog cards and both toolkit branches share it. Equal nonempty URL fields necessarily render duplicate icons. Production equality for the named Radar examples remains unconfirmed.

The implicated layer is presentation, with store/API and container callers traced as unchanged data suppliers. No novel abstraction, dependency or backend mechanism is implicated. Direct card coverage is absent; existing integration coverage only opens the catalog. The main uncertainty is whether distinct documentation/source destinations must both remain accessible, plus authenticated multi-card and layout verification.

---

## 8. External References

None named by the task context.

Execution instructions additionally named the installed analyst role at `C:/Users/DmytroMelnyk4/.codex/codemie/home/plugins/cache/sdlc-factory/sdlc-factory/0.9.4/agents/tech-analyst-filesystem.md`; it resolved and was read. It requires filesystem research, the eight-section artifact and a digest under 400 words.

The configured `codemie-jira-assistant` skill resolved and was read. Before repository orientation/regeneration, its assistant was invoked read-only using supplied conversation `codemie-jira-assistant-20261005-epmcdme15511-01a10cb3`. It reported only `Screenshot 2026-10-01 at 13.29.34.png` attached to EPMCDME-15511 and no technical-analysis attachment; no ticket changes were made. Screenshot pixels were not fetched or inspected.
