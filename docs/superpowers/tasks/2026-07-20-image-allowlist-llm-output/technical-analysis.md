# Technical Research

**Task**: llm-output markdown image rendering security allowlist frontend
**Generated**: 2026-07-27T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement an allow-list of trusted domains and load images in LLM output only from those domains. Currently, the CodeMie UI renders images included in the LLM-generated markdown output without restriction, which leads to a security vulnerability — an attacker might hide prompt-injected instructions that generate image links to attacker-controlled domains. When the UI loads such images, sensitive data could be exfiltrated via outbound image requests. To remediate this, an allow-list/whitelist of trusted domains must be enforced. The frontend should load images present in Assistant/LLM output only if the image URL belongs to an approved list of domains. Images from all other domains should not be rendered or loaded by the UI. Acceptance criteria: (1) Configurable allow-list of trusted domains for images rendered in LLM/Assistant output; (2) UI enforces the allow-list and does not load images from untrusted domains; (3) Attempts to inject external markdown images from non-allow-listed domains result in no network request; (4) Blocking is verifiable via browser dev tools; (5) No regression in legitimate image rendering behavior for allowed domains; (6) Documentation includes information about allow-list management/configuration.

---

## 2. Codebase Findings

### Existing Implementations

There is no existing image domain allow-list anywhere in the codebase. The current rendering pipeline passes image URLs through without any domain validation. Two distinct image rendering paths exist in LLM output contexts:

**Path 1 — Markdown image tokens (primary LLM output path):**

- `/Users/kyrylo_korotych/codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — Entry point for AI chat message rendering. Passes `message.stream?.getStream() ?? message.response` directly to `<Markdown content={...} />`.
- `/Users/kyrylo_korotych/codemie-ui/src/components/markdown/Markdown.tsx` — Top-level markdown component. Calls `getMarkdownTokens(content)` and passes the resulting token array to `<MarkdownTokens>`.
- `/Users/kyrylo_korotych/codemie-ui/src/components/markdown/Markdown.utils.ts` — Contains `getMarkdownTokens()` (tokenizes with `marked.lexer()`), `getMarkdownRenderer()` (custom renderer with overrides for `link`, `table`, `del`, `codespan` — **no `image` override**), and `sanitizeMessage()`. The `getMarkdownTokens()` function rewrites `sandbox:/v1/files/` prefixes to `${api.BASE_URL}/v1/files/` but applies no restriction to external image URLs.
- `/Users/kyrylo_korotych/codemie-ui/src/components/markdown/MarkdownTokens.tsx` — Renders each token. The `'image'` token type is explicitly listed in the `inlineTokens` array (line 38). Image tokens are rendered at line 71 via `dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(Parser.parseInline([token], options), { ADD_ATTR: ['target'] }) }`. The `marked` default renderer produces `<img src="...">` with the raw URL intact. DOMPurify's default config allows `<img src>` and does not validate the `src` domain.

**Path 2 — Structured `image_url` segments in Thought messages:**

- `/Users/kyrylo_korotych/codemie-ui/src/components/Thought/ThoughtMessage.tsx` lines 131–142 — When a Thought message is a parsed JSON array containing `{type: 'image', url: ..., alt: ...}` segments, a raw `<img src={segment.url}>` is rendered with no domain validation whatsoever.

**Duplicate renderer (utility path for copy-to-clipboard):**

- `/Users/kyrylo_korotych/codemie-ui/src/utils/messageHelpers.ts` — Nearly identical copy of `getMarkdownRenderer()`, `getMarkdownTokens()`, and `markdown2html()`. Used by `MermaidDiagram.tsx` and `ChatAiMessageActions.tsx`. Contains the same missing `renderer.image` override. Both copies must be updated together.

**Secondary unrestricted renderer (non-LLM output, lower priority):**

- `/Users/kyrylo_korotych/codemie-ui/src/components/form/MarkdownEditor/MarkdownEditor.tsx` lines 343–345 — Uses `react-markdown` with a custom `img` component that renders `<img src={src}>` with no domain filtering. This component is used only in admin/settings form previews (not in the AI chat message display), so it is lower priority but should be addressed for completeness.

### Architecture and Layers Affected

- **Presentation / Component layer**: `ChatAiMessage.tsx`, `Markdown.tsx`, `MarkdownTokens.tsx`, `ThoughtMessage.tsx`, `MarkdownEditor.tsx`
- **Utility / Processing layer**: `Markdown.utils.ts`, `messageHelpers.ts` (duplicate), `messageFormat.ts` (parses structured `image_url` segments)
- **Configuration layer**: `src/types/global.ts` (`EnvConfig` interface for `window._env_`), `.env` (default values), and optionally `src/constants/index.ts` for hard-coded defaults

### Integration Points

- **`marked` library** (v4.3.0): The `Renderer` class is extended in `getMarkdownRenderer()`. The `image` method on `marked.Renderer` is the primary override point for Path 1.
- **`DOMPurify`** (v3.2.5): Invoked in `MarkdownTokens.tsx` lines 58, 64, 77 with only `{ ADD_ATTR: ['target'] }`. DOMPurify supports a `BEFORE_SANITIZE_ATTRIBUTES` hook and `ALLOWED_URI_REGEXP` option that could serve as a defense-in-depth layer, but the renderer-level override is the correct primary intervention.
- **`react-markdown`** (v10.1.0): Used only in `MarkdownEditor.tsx` for the admin form preview path.
- **`window._env_` runtime config**: Used throughout the codebase for operator-configurable values (e.g., `window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`). This is the established pattern for deployer-configurable settings.
- **`src/store/appInfo.ts`** + **`src/types/entity/configuration.ts`**: Backend-driven feature flags / config items are accessible via Valtio store. `ThoughtMessage.tsx` already uses `appInfoStore` to check `FEATURE_RENDER_STATE_AS_MARKDOWN`. This provides a pattern for a backend-driven allow-list if runtime configurability through the admin UI is desired.

### Patterns and Conventions

- **`marked.Renderer` method override pattern**: `getMarkdownRenderer()` in `Markdown.utils.ts` (lines 124–140) demonstrates the established pattern — create a `new marked.Renderer()`, assign method overrides, return the renderer. A `renderer.image = (href, title, text) => { ... }` override follows the same pattern.
- **Runtime config access**: `window?._env_?.VITE_KEY || import.meta.env.VITE_KEY` (two-tier fallback: runtime injected config → build-time env). Established in `src/utils/api.ts` line 96 and `src/pages/settings/tabs.tsx` line 78.
- **Security URL validation**: Prior art in `src/utils/redirectHashRoutes.ts` (CWE-601 open-redirect fix, EPMCDME-12556) — validates URL origin/pattern before allowing navigation. The same `new URL(href).hostname` extraction approach is the right pattern for image src domain validation.
- **URL rewriting in `getMarkdownTokens()`**: The `sandbox:/v1/files/` → API base URL rewriting at `Markdown.utils.ts` line 113 is the established place to transform URLs before tokenization. Domain validation can be implemented at the renderer level instead (after tokenization) to intercept per-image without affecting the token stream.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory exists and contains frontend-relevant guides. No guide specifically addresses LLM output security or image rendering. Most relevant for this task:

- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — Authoritative reference for test structure: AAA style, `vi.mock()`, `@testing-library/react`, `mockAPI`, file co-location in `__tests__/` directories.
- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/testing/qa-strategy.md` — Framework versions (Vitest 1.6.1, RTL 16.3), run commands, test type boundaries.
- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/quality-gates.md` — Pre-MR gate sequence: lint → typecheck → unit tests → integration tests. Pre-commit hooks: lint-staged, license headers, secret detection, SonarQube.

### Architectural Decisions

- **Prior security fix (EPMCDME-12556)**: An open-redirect vulnerability (CWE-601) was fixed in `src/utils/redirectHashRoutes.ts`. Documented in `/Users/kyrylo_korotych/codemie-ui/docs/superpowers/specs/2026-06-02-fix-open-redirect-hash-routes-design.md` and `/Users/kyrylo_korotych/codemie-ui/docs/superpowers/plans/2026-06-02-fix-open-redirect-hash-routes.md`. This fix followed a TDD-first pattern and used URL origin checking — directly analogous to the approach needed here.
- **`sanitizeMessage()` design decision**: Escapes raw `<`/`>` characters to prevent HTML injection through markdown content, but explicitly preserves `<br>` tags. This is a deliberate partial-trust model — the markdown syntax is trusted but raw HTML is not. Image domain filtering is the missing dimension of this trust model.
- **No CSP headers configured**: `vite.config.ts` defines no `Content-Security-Policy` / `img-src` headers. CSP is not currently enforced at the application level.

### Derived Conventions

- All security-sensitive URL operations use `new URL(href)` for robust parsing rather than regex or string matching.
- Feature flags consumed via `appInfoStore` (Valtio) follow a `feature:<name>` string key convention (e.g., `FEATURE_RENDER_STATE_AS_MARKDOWN = 'feature:renderStateOutputAsMarkdown'`).
- New `VITE_*` environment variables require: (1) addition to `EnvConfig` interface in `src/types/global.ts`, (2) a default value in `.env`, (3) access via `window?._env_?.VITE_KEY || import.meta.env.VITE_KEY` pattern.
- Constants shared across modules belong in `src/constants/index.ts`.

---

## 4. Testing Landscape

### Existing Coverage

The custom markdown rendering pipeline (`Markdown.tsx`, `MarkdownTokens.tsx`, `Markdown.utils.ts`) has **zero test coverage**. The only tests in the markdown component tree cover unrelated sub-components:

- `/Users/kyrylo_korotych/codemie-ui/src/components/markdown/tokens/__tests__/TableBlock.test.tsx` — Tests `TableBlock` HTML rendering and copy button behavior only.
- `/Users/kyrylo_korotych/codemie-ui/src/components/markdown/tokens/__tests__/MermaidCodePopup.test.tsx` — Tests `MermaidCodePopup` component in isolation.

Adjacent tests that do not cover the rendering pipeline:
- `/Users/kyrylo_korotych/codemie-ui/src/utils/__tests__/chatHelpers.test.ts` — Chat data transformation only, no rendering assertions.
- `/Users/kyrylo_korotych/codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx` — MCP auth prompt path only.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + React Testing Library 16.3 + `@testing-library/jest-dom`
- **Workspace config**: `/Users/kyrylo_korotych/codemie-ui/vitest.workspace.ts` — two projects: `unit` (jsdom, `*.test.tsx`) and `integration` (custom jsdom env, `*.integration.test.tsx`)
- **Setup files**: `/Users/kyrylo_korotych/codemie-ui/src/setupTests.tsx` (shared), `setupTests.unit.ts`, `setupTests.integration.ts`
- **Test co-location**: Tests live in `__tests__/` subdirectories next to source files.
- **Mocking**: `vi.mock()` at module level; `afterEach(cleanup)` in unit tests; `mockAPI()` helper for API intercepts; `@/utils/api` mocked in unit tests.
- **Query priority**: `getByRole` > `findByRole` > ... > `getByTestId`

### Coverage Gaps

The following files directly affected by this feature have **no test files at all**:

1. `src/components/markdown/Markdown.utils.ts` — contains `getMarkdownRenderer()` (the primary override point), `getMarkdownTokens()`, `sanitizeMessage()`. No test file exists.
2. `src/components/markdown/MarkdownTokens.tsx` — contains the security-critical `inlineTokens` handling and `DOMPurify.sanitize()` calls. No test file exists.
3. `src/components/markdown/Markdown.tsx` — no test file.
4. `src/utils/messageHelpers.ts` — contains a duplicate of `getMarkdownRenderer()`. No test file.
5. `src/components/Thought/ThoughtMessage.tsx` — contains the second image rendering path (`segment.type === 'image'`). No test file.

New tests for this feature should be created at:
- `src/components/markdown/__tests__/Markdown.utils.test.ts` — unit tests for `getMarkdownRenderer()` image override (allowed domain → renders `<img>`, blocked domain → returns empty string / placeholder)
- `src/components/markdown/__tests__/MarkdownTokens.test.tsx` — integration tests for image token rendering in the component tree
- `src/components/Thought/__tests__/ThoughtMessage.test.tsx` — tests for `segment.type === 'image'` path

---

## 5. Configuration and Environment

### Environment Variables

No image-domain-related environment variables exist. The established pattern for adding one is:

1. Add `VITE_ALLOWED_IMAGE_DOMAINS?: string` to `EnvConfig` in `src/types/global.ts`
2. Add a default value (e.g., comma-separated list or empty string meaning "block all external") to `.env`
3. Access as `window?._env_?.VITE_ALLOWED_IMAGE_DOMAINS || import.meta.env.VITE_ALLOWED_IMAGE_DOMAINS`

Existing `VITE_*` variables relevant to context:
- `VITE_API_URL` — the backend API base URL, already used for `sandbox:/v1/files/` URL rewriting; the same origin would typically be in the image allow-list by default.

### Configuration Files

- `/Users/kyrylo_korotych/codemie-ui/.env` — Default environment values. Currently defines `VITE_API_URL='/api'`, `VITE_ENV='local'`, and feature-flag-like values such as `VITE_SHOW_ALL_PROJECTS`, `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED`.
- `/Users/kyrylo_korotych/codemie-ui/src/types/global.ts` — `EnvConfig` interface. All new `VITE_*` variables require declaration here.
- `/Users/kyrylo_korotych/codemie-ui/src/constants/index.ts` — Candidate location for a hard-coded `DEFAULT_ALLOWED_IMAGE_DOMAINS` fallback constant.
- `/Users/kyrylo_korotych/codemie-ui/vite.config.ts` — No CSP headers currently configured here.

### Feature Flags and Deployment Concerns

- No CSP `img-src` directive is configured at the application or server level. Adding one in `vite.config.ts` (for dev) or in deployment nginx/server config would provide a browser-enforced defense-in-depth layer, complementing the React-level allow-list (acceptance criterion 4: "blocking is verifiable via browser dev tools" can be satisfied by the React-level prevention alone — no network request is made when the `<img>` tag is never rendered).
- The `window._env_` runtime injection mechanism allows operators to configure the allow-list at deployment time without a rebuild, which is the required mechanism for acceptance criterion 1 ("configurable").
- If a backend-driven allow-list is preferred (managed via the admin UI), the `appInfoStore` + `ConfigItem` pattern already used in `ThoughtMessage.tsx` (`FEATURE_RENDER_STATE_AS_MARKDOWN`) provides an extension point.

---

## 6. Risk Indicators

- **No existing tests for the entire markdown rendering pipeline** — `Markdown.utils.ts`, `MarkdownTokens.tsx`, `Markdown.tsx` are all zero-coverage. Any regression from the renderer override would be undetected without new tests. TDD is required.
- **Duplicate renderer implementation** — `getMarkdownRenderer()` exists in both `src/components/markdown/Markdown.utils.ts` and `src/utils/messageHelpers.ts`. Both must be updated consistently; divergence between the two is an active risk.
- **Second image rendering path in `ThoughtMessage.tsx`** — The structured `image_url` segment path (lines 131–142) is entirely separate from the markdown token path and has no `src` validation. It is less exposed (requires the LLM to emit structured JSON, not just markdown syntax), but must be included in the fix scope.
- **`MarkdownEditor.tsx` unrestricted `img` component** — Lower severity (admin/settings preview only, not LLM chat output), but represents a consistent policy gap if the feature description requires comprehensive coverage.
- **`DOMPurify` configuration does not restrict image sources** — `DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })` is the only sanitization applied to rendered image HTML. DOMPurify's default `ALLOWED_URI_REGEXP` permits any `src` value. Adding a DOMPurify hook as defense-in-depth is possible but the renderer-level override is the correct primary control because it prevents rendering entirely (no `<img>` tag emitted), not just after-the-fact attribute stripping.
- **No CSP `img-src` header** — Without a server-side CSP header, browser-level image request blocking relies entirely on the React rendering layer. A misconfiguration or future bypass in the renderer would have no second line of defense.
- **`marked` URL rewriting in `getMarkdownTokens()`** — The `sandbox:/v1/files/` → API base URL rewrite at `Markdown.utils.ts` line 113 runs before tokenization. The allow-list logic must account for the rewritten URL (i.e., the API base URL origin must be in the allow-list or treated as implicitly trusted).
- **`sanitizeMessage()` divergence between files** — `Markdown.utils.ts` version preserves already-encoded `&lt;`/`&gt;` entities (lines 76–77); `messageHelpers.ts` version does not (lines 24–26). This is pre-existing tech debt but is irrelevant to the image URL validation path.

---

## 7. Summary for Complexity Assessment

The task touches the **Presentation and Utility layers** of the frontend. The primary change surface is small and well-localized: the `getMarkdownRenderer()` function in `src/components/markdown/Markdown.utils.ts` (line 124–140) needs a `renderer.image` method override — approximately 10–15 lines of new code. The same override must be mirrored in the duplicate `src/utils/messageHelpers.ts`. A second, independent fix is needed in `src/components/Thought/ThoughtMessage.tsx` (lines 131–142) for the structured `image_url` segment path. Configuration requires adding one entry to `EnvConfig` in `src/types/global.ts` and one default in `.env`. Total file change surface is 4–5 source files plus 3 new test files.

The task follows a well-established pattern in this codebase: the `renderer.link` override in `getMarkdownRenderer()` is the direct template for `renderer.image`. The prior EPMCDME-12556 security fix (open-redirect) demonstrates the TDD-first approach expected for security work and the URL origin checking technique (`new URL(href).hostname`) that applies here. There is no technical novelty — the implementation is a straightforward extension of existing renderer override and runtime config patterns. The only novel element is the allow-list lookup function itself, which is trivially implemented as a hostname set-membership check.

Test coverage posture is poor for the affected area: the markdown rendering pipeline has zero tests. This is the highest complexity driver — the implementation itself is simple, but new unit tests for `Markdown.utils.ts` (image renderer override with allowed and blocked domains), `MarkdownTokens.tsx` (image token rendering), and `ThoughtMessage.tsx` (structured image segment path) must be written from scratch. The complexity-assessor should weight test authorship and the duplicate-renderer consistency requirement as the primary effort sources, not the implementation logic itself.
