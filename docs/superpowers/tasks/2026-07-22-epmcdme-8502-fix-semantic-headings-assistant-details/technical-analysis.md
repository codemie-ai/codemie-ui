# Technical Research

**Task**: assistant details accessibility headings semantic
**Generated**: 2026-07-22T00:00:00Z
**Research path**: codegraph + filesystem

---

## 1. Original Context

Fix accessibility bug EPMCDME-8502: The 'OVERVIEW' heading and other section headings on the Assistant Details page are not semantically marked as headings. They are rendered as <p> elements with visual styling instead of semantic heading elements (<h2>, <h3>, etc.). The affected headings are: OVERVIEW, ACCESS LINKS, System Instructions, CONFIGURATION, TOOLS & CAPABILITIES, ASSISTANT ID:. These need to be changed to use proper semantic heading markup so screen readers and accessibility tools can detect them as headings. The visual appearance should remain unchanged.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/details/DetailsSidebar/components/DetailsSidebarSection.tsx` — shared sidebar section primitive used across all detail page types; renders its `headline` prop as `<p className="text-xs text-text-primary font-semibold">` at line 33; this single component is the root cause of all non-semantic sidebar section headings
- `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx` — composes all sidebar sections for standard assistant details; passes string literals "OVERVIEW", "ACCESS LINKS", "CATEGORIES", "CONFIGURATION", "SKILLS", "TOOLS & CAPABILITIES", "REQUEST HEDGING" as `headline` props to `DetailsSidebarSection`
- `src/pages/assistants/components/AssistantDetails/components/SystemInstructions.tsx` — standalone component that renders the "System Instructions" label independently as `<p className="text-xs">` at line 28; not routed through `DetailsSidebarSection`
- `src/pages/assistants/components/RemoteAssistantDetails/components/DetailsSection.tsx` — local heading+content block used only in `RemoteAssistantDetails`; already semantic with `<h5 className="font-bold text-xs">`; out of scope for this ticket

### Architecture and Layers Affected

- **UI Component Layer (shared primitives)**: `DetailsSidebarSection.tsx` — the single shared primitive that must change; affects all detail page types in the application
- **UI Component Layer (feature components)**: `SystemInstructions.tsx` — standalone assistant-scoped component requiring a separate fix
- **UI Page Layer**: `AssistantDetailsSidebarSections.tsx` — consumer of `DetailsSidebarSection`; no changes needed here

### Integration Points

- `DetailsSidebarSection` is consumed by detail pages for: assistants, skills, datasources, MCP servers, katas, remote assistants, and guardrails — the fix in this shared component propagates to all of them
- `SystemInstructions` is used only within the assistant details page flow
- No backend or API integration points are affected; this is a pure UI/markup change

### Patterns and Conventions

- Tailwind Preflight zeroes browser default heading margins and font-weight, making a `<p>` to `<h3>` tag swap visually transparent when Tailwind classes are preserved
- `h3` is the established convention at this visual scale (`text-xs font-semibold`): `MCPServerDetails`, `SidebarNavigation` (nav group labels), and `Card` (card titles) all use `<h3>` for the same role
- No shared `Typography` or `Heading` abstraction component exists; each container hardcodes heading levels directly
- The only SCSS targeting heading elements is in `Markdown.scss` scoped to `.markdown` — unrelated to this fix

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found in `.ai-run/guides/` specifically covering accessibility heading conventions or the `DetailsSidebarSection` pattern. Conventions derived from code exploration.

### Architectural Decisions

No recorded ADRs or inline decision comments found in the affected files regarding heading element choices. The use of `<p>` in `DetailsSidebarSection` appears to be an unintentional accessibility omission rather than a deliberate architectural decision.

### Derived Conventions

- `h3` is the de facto heading level for section labels at `text-xs font-semibold` scale in sidebar and detail components, as evidenced by `MCPServerDetails` and `SidebarNavigation`
- Visual-only heading patterns (styled `<p>` elements acting as headings) appear in multiple places but `DetailsSidebarSection` is the most impactful since it is a shared primitive
- The assistant name in `AssistantDetailsProfile.tsx` uses `<h4>`, establishing that section labels at `h3` sit one level above the entity name in the sidebar — this is a pre-existing structural quirk not introduced by this fix

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx` — unit test for `DetailsSidebarSection`; contains a direct assertion `expect(headlineElement.tagName).toBe('P')` at line 35 that will break and must be updated
- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` — integration test for the assistant details page; one heading-role assertion at line 1194 (`getByRole('heading', { name: 'Jira', level: 4 })`) targets `DetailsSection` (out of scope); no assertions on `DetailsSidebarSection` or `SystemInstructions` headings
- `src/pages/assistants/components/RemoteAssistantDetails/__tests__/RemoteAssistantDetails.test.tsx` — uses hardcoded mocks (`<h3>`, `<h4>`) independent of the real `DetailsSidebarSection` implementation; no assertions will break

### Testing Framework and Patterns

- Framework: Vitest with React Testing Library (inferred from test file patterns and `screen.getByRole` / `screen.getByText` usage)
- Patterns: role-based queries (`getByRole('heading', ...)`) and text queries (`getByText(...)`) are both in use; the existing tagName assertion in `DetailsSidebarSection.test.tsx` is a lower-level anti-pattern that the fix commit should upgrade to a role-based query

### Coverage Gaps

- No test file exists for `SystemInstructions.tsx` — no existing assertion to update, but also no test coverage to verify the fix
- The integration test has a pre-existing mismatch: `AssistantDetailsPage.integration.test.tsx` line 1194 asserts `level: 4` for a heading that `DetailsSection.tsx` renders as `<h5>`; this is pre-existing and unrelated but may surface during test runs

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are relevant to this change. It is a pure markup/HTML tag change with no feature flags or runtime configuration.

### Configuration Files

No configuration files are affected. Tailwind configuration (`tailwind.config.ts`) is not impacted because the fix preserves all existing class names and only changes the HTML element tag.

### Feature Flags and Deployment Concerns

No feature flags. No deployment concerns. The change is limited to two React component files and one test file.

---

## 6. Risk Indicators

- **Wide blast radius from shared component**: `DetailsSidebarSection` is used by detail pages for assistants, skills, datasources, MCP servers, katas, remote assistants, and guardrails. Changing `<p>` to `<h3>` in this single component fixes all of them simultaneously — desirable for accessibility, but the reviewer should know the change is not assistant-scoped.
- **Heading hierarchy inconsistency (pre-existing)**: The assistant name in `AssistantDetailsProfile.tsx` renders as `<h4>`, while sidebar section labels would become `<h3>`. This means `h3` section labels appear at a higher DOM level than the `h4` entity name. This is a pre-existing structural quirk; the fix improves accessibility without worsening the hierarchy.
- **One test assertion must be updated**: `DetailsSidebarSection.test.tsx` line 35 asserts `tagName === 'P'`. This is the only required test change and is predictable.
- **Pre-existing integration test mismatch**: `AssistantDetailsPage.integration.test.tsx` line 1194 asserts heading `level: 4` for an element that `DetailsSection.tsx` renders as `<h5>`. This test may already fail or pass only through a mock. Unrelated to this ticket but could surface noise during the test run.
- **No `SystemInstructions` test coverage**: There is no test file for `SystemInstructions.tsx`. The fix to that component cannot be verified by existing tests; a new test or a note in the PR is appropriate.
- **No visual regression risk**: Tailwind Preflight neutralizes browser heading default styles (margin, font-weight, font-size). Preserving existing class names ensures visual output is identical after the tag swap.

---

## 7. Summary for Complexity Assessment

This ticket has two independent fix points, both of which are single-line tag swaps with no logic changes. The primary fix is in `src/components/details/DetailsSidebar/components/DetailsSidebarSection.tsx` line 33: change `<p>` to `<h3>` while preserving all Tailwind classes. This one change resolves the accessibility violation for OVERVIEW, ACCESS LINKS, CATEGORIES, CONFIGURATION, SKILLS, TOOLS & CAPABILITIES, REQUEST HEDGING, and any future section added via `DetailsSidebarSection` across all detail page types in the application. The secondary fix is in `src/pages/assistants/components/AssistantDetails/components/SystemInstructions.tsx` line 28: the same `<p>` to `<h3>` tag swap for the "System Instructions" label. Total file change surface: 2 source files, 1 test file.

The task follows a well-established pattern in the codebase — `<h3>` at `text-xs font-semibold` is the documented visual convention for section labels, already used in `MCPServerDetails` and `SidebarNavigation`. There is no technical novelty; no new patterns, abstractions, or dependencies are introduced. Tailwind Preflight guarantees visual parity after tag-only swaps, eliminating CSS regression risk.

Test coverage posture: the shared component has one unit test with a hard `tagName === 'P'` assertion that must be updated to `'H3'` (and ideally upgraded to `getByRole('heading', { level: 3 })`). `SystemInstructions` has no test file. The integration test is unaffected. Key risk factors for complexity scoring are minimal: the change is deterministic, blast radius is intentionally wide but safe, visual regression risk is zero, and the only mandatory test update is a one-word string change.
