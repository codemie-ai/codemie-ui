# EPMCDME-14735 — Technical analyses (UI, runs 1–4, consolidated)

One section per sdlc run, kept as written. Line numbers and symbols reflect each run's baseline; later runs supersede earlier ones. Current design: `spec.md`. Run 1's discarded first analysis (`technical-analysis.superseded.md`) is not included; it is in git history.

---

# Run 1 — `2026-09-21-epmcdme-14735-downloadable-artifacts-ui`

## Technical Research

**Task**: chat artifact rendering, download chip UI, markdown link rendering, sandbox file store
**Generated**: 2026-09-21
**Research path**: filesystem

---

### 1. Original Context

```
=== JIRA EPMCDME-14735 (verbatim extracts) ===
Summary: "Enable downloadable chat artifacts for non-image MCP-generated files"
Status: In Progress. Back-end work is already delivered (two completed back-end SDLC runs).

Affected Areas named in the ticket include:
  - Chat artifact rendering.
  - Download chip / generated file UI.

ACCEPTANCE CRITERIA (full list; #2 and #4 are the UI-side ones in scope for this repo):
 1. Given an MCP tool exposes/returns a generated non-image artifact (xlsx, csv, json, zip, pdf),
    when the assistant needs to provide it, then the artifact is ingested into sandbox-backed
    user-facing storage. [BACK-END — already delivered]
 2. Given a generated artifact is successfully ingested, when the assistant response is rendered,
    then the chat displays a **Download chip or equivalent downloadable artifact with filename,
    size, MIME type, and a working clickable URL**. [UI — IN SCOPE]
 3. Given the RADAR CLI reproduction generates closed_positions_analysis.xlsx, when the user asks
    to open/download it, then the user receives a working download for that file. [END-TO-END]
 4. Given an MCP resource has no blob or cannot be ingested, when the chat renders the response,
    then it **must not show a fake or non-working `filesystem:` download link**. [UI — IN SCOPE]
 5. Solution supports at least: xlsx, csv, json, zip, pdf.
 6. Generated artifacts scoped to correct user/conversation/session; no cross-user exposure.
 7. Existing image artifact behavior remains unchanged. [UI REGRESSION CONSTRAINT]
 8. Optional/preferred: explicit "attach file to conversation" tool/API. [BACK-END]

=== FACTS ALREADY VERIFIED BY THE ORCHESTRATOR ===
- Back-end emits a bare markdown link `[Download](sandbox:/v1/files/{encoded})` — no code fence,
  content NOT inlined. Verified in back-end source: file_system/tools.py:236,
  attach_file_tool.py:60, mcp/toolkit.py:464.
- Back-end stores as `{uuid4()}_{basename}`; GET /v1/files/{name} strips the uuid via
  _strip_uuid_prefix and sets the real filename in Content-Disposition.
- UI rewrites `sandbox:/v1/files/` -> `${api.BASE_URL}/v1/files/` at Markdown.utils.ts:114 (inside
  getMarkdownTokens). This is the ONLY handling; it makes the link work but renders a plain anchor.
- `filesystem:` is NOT handled anywhere in the markdown pipeline (grep confirms only an unrelated
  hit in settingsUIConfig.ts:455) — so AC #4 appears UNMET.
- A separate, already-fixed defect: FILE_EXTENSIONS lacked csv/xlsx/pdf/zip/md so getFileExtension
  fell back to 'txt'. Already fixed on this branch; treat as done, but note the overlap with AC #5.
```

---

### 2. Codebase Findings

#### Acceptance-criteria verdicts

| AC | Verdict | Evidence |
|---|---|---|
| **#2 Download chip** | **UNMET** | `Markdown.utils.ts:114` rewrites the scheme only; `MarkdownTokens.tsx:73` renders a `link` token as a plain `<span dangerouslySetInnerHTML>` anchor. No chip, no filename/size/MIME anywhere in the markdown path. |
| **#4 no fake `filesystem:` link** | **PARTIALLY MET (accidentally)** | DOMPurify 3.2.5 default `ALLOWED_URI_REGEXP` already strips the `href`. Verified empirically (below). The link is not *clickable*, but it still **renders as "Download" text styled like a link** — so the user still sees a fake affordance. |

##### AC #4 — measured DOMPurify behaviour

Executed against the installed `dompurify@3.2.5` with the repo's exact `SANITIZE_CONFIG`
(`{ ADD_ATTR: ['target'] }`, `Markdown.sanitize.ts:39`):

```
<a href="filesystem:/tmp/x.xlsx">D</a>   =>  <a>D</a>      href stripped
<a href="sandbox:/v1/files/abc">D</a>    =>  <a>D</a>      href stripped
<a href="file:///tmp/x">D</a>            =>  <a>D</a>      href stripped
<a href="https://x/y">D</a>              =>  <a href="https://x/y">D</a>   kept
<a href="javascript:alert(1)">D</a>      =>  <a>D</a>      href stripped
```

Two consequences, both load-bearing:

1. **No custom `ALLOWED_URI_REGEXP` exists in this repo** — `grep -rn "ALLOWED_URI_REGEXP|ALLOW_UNKNOWN_PROTOCOLS|ADD_URI_SAFE_ATTR|uponSanitizeAttribute" src/` returns **zero hits**. The default deny of unknown schemes is what protects AC #4 today, and nothing in the repo pins that behaviour down.
2. **The `sandbox:` rewrite at `Markdown.utils.ts:114` is load-bearing, not cosmetic.** If it did not run, DOMPurify would strip the `sandbox:` href exactly as it strips `filesystem:` and the download would silently break. The rewrite converts the scheme *before* lexing, so by sanitize time the href is already an allowed `https:` URL.

#### Existing Implementations

Markdown / assistant render pipeline:

- `src/components/markdown/Markdown.tsx` — entry. `getMarkdownTokens(content)` → `<MarkdownTokens>`. Used by `ChatAiMessage.tsx:309`.
- `src/components/markdown/Markdown.utils.ts`
  - `:108-116` `getMarkdownTokens` — `marked.lexer` over `sanitizeMessage(...)` with the `sandbox:/v1/files/` → `${api.BASE_URL}/v1/files/` `replaceAll` at **:114**.
  - `:126-141` `getMarkdownRenderer` — overrides `renderer.link` (**:130-133**), `renderer.table`, `renderer.del`, `renderer.codespan`. `renderer.link` emits `<a href target="_blank" rel="noopener noreferrer">`.
  - `:118-124` `markdown2html` — the *other* render path (used by `ChatAiMessageActions.tsx:28`, i.e. copy-to-clipboard/export), which calls `marked.parse` + `sanitizeHtmlWithImageAllowList`. **Any link change must be considered for both paths.**
- `src/components/markdown/MarkdownTokens.tsx` — the React token dispatcher. `link` is in `inlineTokens` (**:39**) so it falls to **:73**, `<span key {...getInlineProps(token)} />`, i.e. `Parser.parseInline` → `sanitizeHtmlWithImageAllowList` → `dangerouslySetInnerHTML`.
- `src/components/markdown/Markdown.sanitize.ts` — the single LLM-output sanitizer. Dedicated DOMPurify instance (`:120`) with an `afterSanitizeAttributes` hook applying the image allow-list (`:121`). `SANITIZE_CONFIG = { ADD_ATTR: ['target'] }` at `:39`.

Existing chip component — **reuse candidate**:

- **`src/components/File.tsx`** (note: top-level `File.tsx`, *not* `src/components/form/File/File.tsx`, which is an unrelated file-*input* widget). This is the download chip the ticket describes, already built:
  - `:30-36` `FileMetadata { fileId?, fileName, mimeType?, user?, isUploading? }` — **already carries fileName and mimeType; has no size field.**
  - `:128-137` `withDownload` → a download button calling `filesStore.downloadFile(file.fileId)`.
  - `:57` `isImage = file.mimeType?.startsWith('image')`; `:139-148`, `:170-184` inline image preview with expand/collapse.
  - `:100-106` file icon + spinner while uploading; `:93-98` chip container styling (`h-8 border rounded-lg ... max-w-60`).
  - Consumed today by `ChatUserMessage.tsx:165-174` (`withPreview withDownload`) and `ChatPromptFileUpload.tsx`.
- `src/hooks/useFileUpload.tsx:58-86` `createFileMetadata(fileInput: File | string)` — builds `FileMetadata` from either a browser `File` or a backend file-id string, decoding `mimeType`/`user`/`originalFileName` via `decodeFileName`, with a try/catch fallback to the raw value (`:72-78`).

File transport:

- `src/store/files.ts` `filesStore`
  - `:87-111` `downloadFile(fileUrl)` — **already handles both id shapes.** A bare UUID (`:88-94`) goes straight to `api.downloadFileStream('v1/files/' + id)` and takes its name from `Content-Disposition`. A legacy base64 id (`:96-107`) decodes the name locally. Anything else falls through to `downloadFileStream` (`:109`).
  - `:134-136` `getFileURL(fileName)` → `` `${api.BASE_URL}/v1/files/${fileName}` `` — the same URL shape `Markdown.utils.ts:114` constructs by string replacement.
- `src/utils/api.ts`
  - `:258-311` `downloadFileStream(url, _type?, fileName?)` — fetches with auth options, streams to a blob, and when no `fileName` is passed derives it from `content-disposition` via `parseContentDispositionFilename` then **`sanitizeFileName`** (`:296-299`), finally `saveAs(blob, fileName ?? 'download')` (`:301`). **This is the existing, correct, security-reviewed download path.**
  - `:69-79` `sanitizeFileName` — strips control chars, `/` and `\` (`:72`), strips leading dots/whitespace (`:73`), returns `undefined` for an empty result.
  - `:438-440` `authHeaders()` — returns `{ 'user-id': DEV_USER_ID }` only in LOCAL non-local-auth mode, otherwise `{}`. **Auth is cookie/session based, not a Bearer header**, so a plain anchor is not categorically broken; but `downloadFileStream` also sets `credentials: 'include'` under `getIsLocalAuth()` (`:267`), which a plain `<a>` does not replicate.
  - `:143` `BASE_URL = window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`.

Image artifact path (the AC #7 regression surface):

- `src/utils/imageAllowList.ts:86-101` `isImageAllowed` — tiered decision: blank deny, `data:image/*` allow, unparseable deny, protocol gate (`https:` always, `http:` only on localhost, `:67-70`), **same-origin allow (`:97`)**, **backend-origin allow (`:98`)**, then the configured `allowedImageDomains` list (`:73-80`, default-deny on empty).
- `src/components/markdown/Markdown.sanitize.ts:107-118` `applyImageAllowListToNode` — `<img>` from a blocked URL is **replaced by a visible badge**, `<source>` is dropped, other elements have the offending URL attributes removed.
- `src/components/BlockedImageBadge/BlockedImageBadge.tsx` — the React badge; `Markdown.sanitize.ts:70-84` builds a DOM-node twin of it so both paths are pixel-identical.

**Key consequence for AC #7 + AC #2**: images generated into sandbox storage already render inline, because the rewritten `${api.BASE_URL}/v1/files/...` URL is on the backend origin and therefore passes `isImageAllowed` tier 7 (`imageAllowList.ts:98`). **Images work today via the `![](...)` image token, not via the `link` token.** A change scoped to `link` tokens therefore does not touch the image path at all — this is the cheapest way to satisfy AC #7.

#### Architecture and Layers Affected

| Layer | Components |
|---|---|
| Markdown render pipeline | `Markdown.utils.ts` (lexer + renderer), `MarkdownTokens.tsx` (token→React dispatch), `Markdown.sanitize.ts` (single sanitizer) |
| Shared presentational component | `src/components/File.tsx` — the existing chip |
| Valtio store | `src/store/files.ts` — `downloadFile`, `getFileURL` |
| HTTP layer | `src/utils/api.ts` — `downloadFileStream`, `sanitizeFileName`, `parseContentDispositionFilename` |
| Chat page | `ChatAiMessage.tsx:309` is the only assistant-message render site; `ChatAiMessageActions.tsx` uses the parallel `markdown2html` path |

#### Integration Points

- `Markdown.utils.ts` imports `api` (for `BASE_URL`) and `sanitizeHtmlWithImageAllowList` — an existing UI→HTTP-layer coupling that a chip could reuse rather than widen.
- `Markdown.sanitize.ts` → `imageAllowList.ts` → `appInfoStore.getAllowedImageDomains()` (backend `GET /v1/config`) and `api.BASE_URL`.
- `File.tsx` → `filesStore` (`useSnapshot`) → `api`. A chip rendered from markdown would inherit this whole chain inside the markdown tree, which today has **no store dependency at all**.
- Backend contract: `GET /v1/files/{name}` returns the blob and sets `Content-Disposition`.

#### Patterns and Conventions

- **Token type → React component** is the established extension seam: `MarkdownTokens.tsx` already special-cases `table` → `TableBlock` (`:76-83`), `code`+`mermaid` → `MermaidDiagram` (`:96`), `list` → `ListToken` (`:88`). A `link` special-case fits this existing shape exactly.
- **Sanitize at the producer, pass HTML down** — `MarkdownTokens` sanitizes and `TableBlock` renders its `html` prop untouched. `security-patterns.md` names `TableBlock` a "trusting sink" whose safety lives entirely in its caller.
- **Chips are `FileMetadata`-driven**, constructed by `createFileMetadata`, rendered by `File.tsx`, downloaded through `filesStore.downloadFile`.
- Barrel `index.ts` per component directory is the norm; `File.tsx` is an exception (flat file, imported as `@/components/File`).

---

### 3. Documentation Findings

#### Guides and Architecture Docs

- `.ai-run/guides/development/security-patterns.md` — **directly governs this task**; see § HTML sinks and § Navigation built from untrusted input, quoted in Section 8.
- `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md`, `.ai-run/guides/testing/testing-patterns.md` — routed by `AGENTS.md` for the Components / State / Development / Testing categories this task spans.
- `AGENTS.md` § Architecture at a glance — `src/utils/api.ts` is "the single HTTP layer".

#### Architectural Decisions

- `Markdown.sanitize.ts:16-24` (file docstring) records the decision that image blocking is a **DOMPurify hook, not a `marked` renderer override**, "so markdown images and raw HTML tags are gated by the same code", on a dedicated instance so the global `DOMPurify` used for user-authored content keeps default behaviour. **A link/chip change implemented as a renderer override would sit on the opposite side of this decision** — worth an explicit note in the spec.
- `Markdown.sanitize.ts:70-84` — the eye-off asset "must keep its `xmlns` declaration"; a drift test in `Markdown.sanitize.test.tsx` pins it.
- `Markdown.utils.ts:118-121` — the allow-list "runs on the HTML marked produced, not on the markdown source".
- `Markdown.utils.ts:137` — `renderer.del` was removed deliberately: "Almost any text containing ~ wraps in del… agents don't seem to use it correctly anyway."
- `useFileUpload.tsx:68-71` — `decodeFileName` throws on non-backend references (e.g. imported Claude Desktop chats); the catch exists so "the chip shows the name instead of crashing the whole chat".
- `store/files.ts:88-110` — the UUID-vs-legacy-base64 branch is a recorded dual-format contract.
- Branch WIP `fileExtensions.ts` carries an inline ticket reference: `// Data formats produced by toolkit artifacts (EPMCDME-14735). Without these the `?? 'txt'` fallback below renames a csv download to code.txt.`

#### Derived Conventions

- Copyright header on every source file (14 lines, Apache-2.0).
- `cn()` from `@/utils/utils` for class composition; semantic Tailwind tokens (`text-text-primary`, `border-border-structural`, `bg-surface-base-primary`) — never raw colours.
- Icon buttons carry `aria-label` (`File.tsx:120`, `:131`, `:143`) and decorative SVGs carry `aria-hidden="true"` (`:124`).
- Tests co-located in `__tests__/` beside the unit under test.

---

### 4. Testing Landscape

#### Existing Coverage

- `src/components/markdown/__tests__/Markdown.utils.test.ts` — `markdown2html` image allow-list integration; **`:75-78` asserts `target="_blank"` survives on rendered links.** This is the one existing test that pins link rendering.
- `src/components/markdown/__tests__/Markdown.sanitize.test.tsx` — sanitizer behaviour incl. the SVG-namespace drift test.
- `src/components/markdown/__tests__/Markdown.imageAllowList.integration.test.tsx` — the AC #7 image guard.
- `src/components/markdown/__tests__/Markdown.font.integration.test.tsx`
- `src/components/markdown/tokens/__tests__/` — `TableBlock.test.tsx`, `MermaidDiagram.accessibility.test.tsx`, `MermaidCodePopup.test.tsx`.
- `src/components/__tests__/File.test.tsx` — the chip: mocks `filesStore` (`:24-41`), asserts download/preview/remove behaviour. **The template for any chip test.**
- `src/pages/chat/components/ChatHistory/ChatUserMessage/__tests__/ChatUserMessageChip.test.tsx` and `ChatUserMessage.fileAttachment.test.tsx` — chip-in-message integration.
- `src/components/CodeBlock/__tests__/fileExtensions.test.ts` — new, untracked, on this branch.

#### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library + `@testing-library/user-event`. Two projects declared in `vitest.workspace.ts`: **`unit`** (mocks Valtio + stores, `setupTests.unit`, excludes `*.integration.test.*`) and **`integration`** (real Valtio + real stores, mocked API, `setupTests.integration`, 30 s timeout).
- Store mocking: `vi.hoisted` + `vi.mock('valtio', ...)` + `vi.mock('@/store/files', ...)` — `File.test.tsx:22-41`.
- API mocking in markdown tests: `vi.mock('@/utils/api', () => ({ default: mockApi }))` with a `BASE_URL` fixture — `Markdown.utils.test.ts:21-32`.
- SVGR assets stubbed per-icon, forwarding props so `aria-hidden` assertions are not vacuous — `File.test.tsx:55-70`.
- `vi.stubGlobal('location', ...)` for origin-sensitive allow-list logic.

#### Coverage Gaps

- **No test anywhere asserts the `sandbox:/v1/files/` rewrite at `Markdown.utils.ts:114`.** `grep -rn "sandbox|v1/files" src/components/markdown/__tests__/ src/pages/chat/.../ChatAiMessage/__tests__/` returns zero hits. The single most load-bearing line for this ticket is unpinned.
- **No test asserts DOMPurify's default rejection of unknown schemes.** AC #4's current accidental pass rests entirely on an upstream default that no test would catch regressing (e.g. if someone later adds `ADD_URI_SAFE_ATTR` or a custom `ALLOWED_URI_REGEXP`).
- No test covers `filesStore.downloadFile`'s UUID-vs-legacy branch (`store/files.ts:87-111`).
- No test covers `api.downloadFileStream`'s `Content-Disposition` → `sanitizeFileName` path (`api.ts:294-301`).
- No test renders a `link` token through `MarkdownTokens` (only through `markdown2html`), so the `MarkdownTokens.tsx:73` inline-span path is untested for links.

---

### 5. Configuration and Environment

#### Environment Variables

- `VITE_API_URL` — read at `api.ts:143` as `window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`. Determines `BASE_URL`, hence both the rewritten download URL and the `isImageAllowed` backend-origin tier (`imageAllowList.ts:49`).
- `KC_ENTRA_TENANT_ID` / `KC_ENTRA_CLIENT_ID` / `KC_ENTRA_CLIENT_SECRET` — Keycloak theme build only, in the tracked `.env`; not in this feature's path.

#### Configuration Files

- `config.js` — runtime `window._env_`, served with `Cache-Control: no-store`.
- `vitest.workspace.ts` — the `unit` / `integration` project split.
- `vite.config.ts`, `tsconfig.json` (the `@/` alias), `tailwind.config.ts` (semantic colour tokens).
- Backend-served config: `GET /v1/config` → `allowedImageDomains`, consumed via `appInfoStore.getAllowedImageDomains()` (`imageAllowList.ts:24, 39`). **Not a UI config file** — changing image policy is a deployment action, not a code change.

#### Feature Flags and Deployment Concerns

- No feature flag governs markdown rendering, chips, or the file endpoints. `useAssistantFeatures.ts` gates assistant capabilities (incl. `canAttachFiles`, consumed at `ChatUserMessage.tsx:54`) but does not reach the AI-message render path.
- `AGENTS.md`: the root `Dockerfile` copies a prebuilt `dist/`; a rebuild needs `npm ci && npm run build:prod`.
- Secrets: `npm run secrets:check` (gitleaks) runs pre-commit. Nothing in this feature introduces a secret — file access is authorised server-side by session.

---

### 6. Risk Indicators

- **CRITICAL — the back-end contract does not supply what AC #2 asks for.** AC #2 requires the chip to show **filename, size, and MIME type**. The link the back-end emits is `[Download](sandbox:/v1/files/{encoded})` and carries **none of the three** as structured data. What is actually available to the UI without a network call:
  - *filename* — sometimes. If `{encoded}` is a legacy base64 id, `decodeFileName` (`utils.ts:255`) yields `originalFileName` **and** `mimeType`. If it is the new `{uuid4()}_{basename}` shape, `decodeFileName` **throws** (`useFileUpload.tsx:68-71` documents exactly this), leaving only the raw path segment; the real name lives solely in `Content-Disposition`. The markdown link *text* ("Download") is assistant-authored and is not a filename.
  - *MIME type* — only in the legacy-id case, as above. Otherwise unavailable without a request.
  - *size* — **never available.** Nothing in the URL, the link text, or any existing UI code carries it.
  This is a genuine contract gap, not an implementation detail. Escalate before the spec commits to the literal AC #2 wording.
- **Speculative:** the options for closing that gap each carry a distinct cost — (a) a `HEAD`/metadata round-trip per artifact link; (b) a back-end change to emit a richer link (query params, or a fenced JSON artifact block); (c) descoping size/MIME to a best-effort display. There is **no existing HEAD or metadata-fetch helper in `api.ts`** — `get/post/patch/put/delete` and `downloadFileStream` are the whole surface (`api.ts:150-168`, `:258`), so option (a) is net-new code in the single HTTP layer.
- **Speculative:** option (a) also has a consent/cost dimension worth stating plainly — auto-fetching metadata for every link in every rendered assistant message turns passive chat rendering into N authenticated backend requests, re-fired on every re-render of the memoised token tree unless cached. Chat history replay would amplify this across the whole conversation.
- **AC #4 is protected only by an upstream default.** DOMPurify 3.2.5's built-in `ALLOWED_URI_REGEXP` strips the `filesystem:` href (measured above), and **no repo test asserts this**. Worse, the *visible* outcome is still a link-styled "Download" label with no href — arguably still "a fake download link" in the user's eyes even though it is inert. Read strictly, AC #4 wants the affordance gone, not just disarmed.
- **`Markdown.utils.ts:114` is an unpinned, load-bearing line.** The `replaceAll` is what keeps `sandbox:` links from being stripped by the very same DOMPurify default that disarms `filesystem:`. Zero test coverage. Any refactor of `getMarkdownTokens` can silently break every artifact download.
- **Two render paths must stay in sync.** `getMarkdownTokens`→`MarkdownTokens` (the chat) and `markdown2html` (`Markdown.utils.ts:118`, used by `ChatAiMessageActions`) both render links. The `sandbox:` rewrite currently exists **only in the first** (`:114` is inside `getMarkdownTokens`), so `markdown2html` already handles `sandbox:` links differently — a latent inconsistency that a chip implementation will expose.
- **Reusing `File.tsx` inside markdown introduces a store dependency into a currently store-free tree.** `File.tsx:53` calls `useSnapshot(filesStore)`; `MarkdownTokens` has no Valtio coupling today. Every existing markdown token test would need the Valtio mock that `File.test.tsx:33-37` sets up.
- **`FileMetadata` has no `size` field** (`File.tsx:30-36`, `useFileUpload.tsx:31-37`), and `File.tsx` has no slot to display size or MIME. Reuse is still the right call, but it is reuse-plus-extension, not drop-in.
- **Security — assistant-authored filename is a trust boundary.** Per `security-patterns.md` § Navigation, "a string that came from … an API response is not a path". `sanitizeFileName` (`api.ts:69`) exists and already strips `/`, `\` and leading dots, but it is applied **only inside `downloadFileStream`** (`:298`). A chip that sets an `<a download={name}>` attribute, or builds a URL by concatenating the link segment, bypasses it. Extension spoofing (`report.pdf.exe`) is not covered by `sanitizeFileName` at all.
- **Security — a fourth HTML-sink shape is forbidden.** `security-patterns.md` § HTML sinks allows exactly three shapes and says "Never introduce a fourth". A chip rendered as a React component sidesteps the sink entirely, which is the compliant direction.
- **AC #7 regression surface is broad and thinly pinned at the token level:** inline images via the allow-list badge path, existing `sandbox:` anchors, code blocks (`CodeBlock`, and the branch's `fileExtensions` change), tables (`TableBlock` + its `overflow-x-auto` wrapper), mermaid diagrams, `target="_blank"` preservation (`Markdown.utils.test.ts:75-78`), and the `md`-in-`code` recursive `Markdown` render (`MarkdownTokens.tsx:98-100`).
- **Seam choice has a real correctness consequence.** `renderer.link` returns an HTML *string*, so it cannot mount a React component and could only emit chip-shaped markup — which then has to survive DOMPurify (new classes/attrs, possibly needing `ADD_ATTR`, i.e. widening the sanitizer's threat model, which the guide explicitly warns about). A `link`-token special-case in `MarkdownTokens.tsx` mounts real React, needs no sanitizer widening, and matches the existing `table`/`code`/`list` precedent. **Speculative:** `MarkdownTokens.tsx` is the recommended seam; the string-renderer path is the one likely to force a sanitizer config change.
- **Streamed rendering.** Assistant messages render progressively (`withBlinker` in `Markdown.tsx:32`); a partially-streamed `[Download](sandbo` will lex as text/partial link mid-stream. Any per-link network fetch must tolerate being invoked on transient malformed hrefs.
- `decodeFileName` throwing on new-format ids (`useFileUpload.tsx:68-78`) is caught with a `console.log`, not a typed result — reusing it for markdown-sourced ids inherits a silently-degrading path.

---

### 7. Summary for Complexity Assessment

**Layers and change surface.** The work is confined to the frontend markdown-render pipeline plus one shared component, with three to five files realistically touched: `src/components/markdown/MarkdownTokens.tsx` (add a `link`-token special case alongside the existing `table`/`code`/`list` cases), `src/components/markdown/Markdown.utils.ts` (the `sandbox:` rewrite at `:114` and, if a `filesystem:` rule is added, one more transform), `src/components/File.tsx` (extend the existing chip to surface size/MIME — it already has filename, MIME, a download button and image preview), and possibly `src/store/files.ts` / `src/utils/api.ts` if metadata must be fetched. The download transport is **already built and correct**: `filesStore.downloadFile` (`store/files.ts:87-111`) handles both the UUID and legacy-base64 id shapes, and `api.downloadFileStream` (`api.ts:258-311`) already derives the filename from `Content-Disposition` through `sanitizeFileName`. No new endpoint, store, or route is needed on the UI side for the download itself.

**Novelty and the one hard blocker.** Technically this is low-novelty: every pattern needed already exists in the repo, and the strong recommendation is to reuse `src/components/File.tsx` rather than build a new chip. The genuine complexity is a **contract gap, not a coding problem**. AC #2 demands filename, size and MIME in the chip; the back-end emits a bare `[Download](sandbox:/v1/files/{encoded})` that carries none of them reliably — filename and MIME are recoverable only for legacy base64 ids (`decodeFileName` *throws* on the new `{uuid}_{basename}` shape, a case `useFileUpload.tsx:68-71` already documents), and **size is not obtainable at all** without a network round-trip for which no HEAD/metadata helper exists in `api.ts`. This needs a decision — richer back-end link format, a new metadata endpoint, or descoping size/MIME — **before** the spec is written, and it may spawn a back-end follow-up. AC #4 is a smaller surprise in the other direction: DOMPurify 3.2.5's default `ALLOWED_URI_REGEXP` already strips the `filesystem:` href (measured directly against the installed version), so the link is inert today — but it still *renders as link-styled "Download" text*, no test pins the behaviour, and no custom URI config exists in the repo to make the protection explicit.

**Test posture and risk.** Coverage around this exact code path is thin in a way that raises risk above what the diff size suggests. The `sandbox:` rewrite at `Markdown.utils.ts:114` — the single line keeping artifact downloads from being stripped by the same sanitizer default that disarms `filesystem:` — has **zero test coverage**; so do `filesStore.downloadFile`'s dual-format branch and `downloadFileStream`'s `Content-Disposition` handling. The surrounding fixtures are excellent and directly reusable (`File.test.tsx` for chip-with-mocked-store, `Markdown.utils.test.ts` for `BASE_URL`-mocked markdown, `Markdown.imageAllowList.integration.test.tsx` for the AC #7 image guard), so new tests are cheap to write into both the `unit` and `integration` vitest projects. Principal risks: the AC #2 metadata gap (may block or force descoping); regressing image rendering, which shares the sanitizer but — usefully — travels the `image` token rather than the `link` token, so a `link`-scoped change naturally satisfies AC #7; the trust boundary around assistant-authored filenames, where `sanitizeFileName` exists but is applied only inside `downloadFileStream`; and the divergence between the two render paths (`getMarkdownTokens` vs `markdown2html`), only one of which performs the `sandbox:` rewrite today.

---

### 8. External References

The task named no external repository path or URL. It did name in-repo guidance to route to, and quoted back-end source lines as already-verified facts.

**`.ai-run/guides/development/security-patterns.md`** — resolved, read. What it mandates for this task:

- **§ HTML sinks.** Exactly three permitted shapes: sanitize inline at the sink (`ChatUserMessage.tsx`), sanitize at the producer and pass HTML down (`MarkdownTokens.tsx` → `tokens/TableBlock.tsx`), or render a constant. Verbatim: *"Never introduce a fourth shape. A sink whose input is neither sanitized on the line, nor sanitized by a named producer, nor a constant defined in the same file, is a finding — regardless of how trusted the source looks today."*
- **§ HTML sinks, on trusting sinks.** *"`TableBlock` is a trusting sink. It takes `html: string` and renders it as-is; its safety lives entirely in its caller. Any new caller must sanitize first. The same holds for any component you add with an HTML-typed prop — if the component cannot sanitize, its type is a contract that the caller does, and that contract must be stated where the prop is declared."*
- **§ HTML sinks, on sanitizer options.** *"Where a call passes options — `{ ADD_ATTR: ['target'] }` in the markdown renderer, an SVG-scoped config in `MermaidDiagram.tsx` — the options widen what is allowed, so copying a call site means copying its threat model too. Read the existing options before reusing them."* Directly relevant: a chip emitted as an HTML string from `renderer.link` would likely require widening `SANITIZE_CONFIG` in `Markdown.sanitize.ts:39`.
- **§ Navigation built from untrusted input.** Precedent is `src/utils/redirectHashRoutes.ts` (CWE-601, `EPMCDME-12556`, `git show 7956f6765`). The encoded rules: *"A string that came from `window.location`, a query parameter, or an API response is not a path. Strip leading `/` and `\` runs before concatenating it into a URL."* — *"Never pass such a string to `location.href` / `assign` / `replace`, `window.open`, or an `<a href>` without that treatment. A leading `//` turns a 'relative' redirect into a fully qualified one to somebody else's host."* — *"The regression test is part of the fix. `src/utils/__tests__/redirectHashRoutes.test.ts` is the shape to copy — the reason this class of bug recurs is that the fix is one line and nothing pins it down."* An assistant-authored `sandbox:` path segment concatenated into `${api.BASE_URL}/v1/files/...` falls squarely under this rule.
- **§ Browser configuration is public.** Both `import.meta.env.VITE_*` and `window._env_` are public; nothing secret may reach either. Not a constraint this feature strains, since file authorisation is enforced server-side by session.

**Back-end source lines quoted in the task** (`file_system/tools.py:236`, `attach_file_tool.py:60`, `mcp/toolkit.py:464`) — **outside this repository and not resolvable from this checkout.** Accepted as given per the task's instruction not to re-derive them. Their UI-visible consequence was verified from this side: only `sandbox:/v1/files/` appears in `src/` (`Markdown.utils.ts:114`), and `filesystem:` appears nowhere in the markdown pipeline (the sole `src/` hit is `settingsUIConfig.ts:455`, an unrelated toolkit-name key).

---

# Run 2 — `2026-09-23-epmcdme-14735-ui-artifact-filename`

## Technical Analysis — EPMCDME-14735 (follow-up): strip the storage UUID prefix from artifact filenames

Source spec: `/home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-09-23-epmcdme-14735-ui-artifact-filename/spec-codemie-ui.md`
Branch: `EPMCDME-14735_downloadable-artifacts-ui` @ `d845cb3ab`

### 1. Scope

Display-only fix. Artifacts are stored by the backend as `{uuid4()}_{basename}`. The UI decodes
the name out of the base64 `fileId` and shows/saves it verbatim, so the uuid leaks into both the
chat artifact chip and the saved filename. The backend already strips it in `Content-Disposition`
(`codemie/src/codemie/rest_api/routers/files.py:91`); the UI simply never reads that header on the
base64 path.

### 2. Verified call sites

| File | Line | What it does now |
|---|---|---|
| `src/components/markdown/artifactLink.ts` | 82-84 | `decodeFileName(fileId)` → `sanitizeFileName(originalFileName)` → chip label. No strip. |
| `src/store/files.ts` | 96-107 | base64 branch sets `a.download = originalFileName`. No strip. |
| `src/utils/api.ts` | 69 | `sanitizeFileName` — control chars + separators only; knows nothing about uuids. |
| `src/components/File.tsx` | 116-117, 122 | Renders `file.fileName` and derives the extension badge from it. |

`File.tsx` needs **no change**: the badge is computed from `file.fileName`, so stripping upstream
in `artifactLink.ts` satisfies AC #3 for free.

### 3. Codebase findings

- **`decodeFileName` (`src/utils/helpers.ts:220-247`) has two formats.** The modern one is
  length-prefixed (`FILENAME_SEPARATOR_REGEXP = /^\d+~/`, line 210): each part is `N~<N chars>`, so
  a name containing `_` survives intact. The legacy fallback (line 237) is `data.split('_')`, which
  **shatters** a `{uuid}_name` into fragments. Consequence for tests: the real stored shape must be
  encoded in the **length-prefixed** form, not the legacy `_`-joined form used by the existing
  `files.test.ts:46` case (`btoa('application/xlsx_user_report.xlsx')`). Encoding `{uuid}_report.xlsx`
  the legacy way would not reproduce the bug.
- **`fileId` is a trust boundary.** `SAFE_FILE_ID_PATTERN` (`artifactLink.ts:38`) and
  `PATH_ESCAPE_PATTERN` (line 43) validate it before it reaches `v1/files/${fileId}`. Only the
  decoded display name may be stripped.
- **Three `downloadFile` branches** (`files.ts:87-110`): bare-UUID → `downloadFileStream`
  (EPMCDME-12266, reads `Content-Disposition`); base64-with-name → anchor (the broken one);
  fallback → `downloadFileStream`. Branch order and count must not change.
- **Existing tests encode clean names**, which is why the bug was not caught:
  `src/store/__tests__/files.test.ts:46`, `src/components/markdown/__tests__/artifactLink.test.ts:39`,
  `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx:60`.
- **Helper placement.** `src/utils/api.ts` already exports `sanitizeFileName` and is imported by
  `artifactLink.ts` (line 25). `files.ts` imports `api` from the same module. Putting
  `stripUuidPrefix` there gives both call sites the shared helper with no new import graph edges.
  Unit test home: `src/utils/__tests__/api.test.ts` (exists).

### 4. Consistency check against prior work on this branch

- **Previous spec** (`docs/superpowers/tasks/2026-09-21-epmcdme-14735-downloadable-artifacts-ui/spec.md`)
  covers *rendering* the chip at the token-dispatch seam. Its non-goals list "no change to
  `renderer.link` or to `SANITIZE_CONFIG`" and "no back-end change" — this fix touches neither.
  It also explicitly declines to change `sanitizeFileName`/`decodeFileName`, matching this spec's
  non-goals. **No contradiction.**
- **Code added on this branch** (`artifactLink.ts`, `File.tsx` chip, paragraph recursion) is the
  consumer of the name, not its producer. Adding a strip upstream of `sanitizeFileName` leaves
  every guard (`SAFE_FILE_ID_PATTERN`, `PATH_ESCAPE_PATTERN`, `if (!fileName) return null`) in
  place and in the same order. **No contradiction.**

### 5. Risk indicators

1. Regex must stay anchored and leading-only — a broadened match breaks AC #6.
2. `|| name` fallback needed so a file named exactly `{uuid}_` does not become empty and trip the
   `if (!fileName) return null` guard into dropping the chip.
3. `sanitizeFileName` accepts `string | undefined`; `artifactLink.ts` passes a possibly-undefined
   decoded value, so the strip helper must tolerate `undefined` (or the call site must guard).
4. Test fixtures must use the length-prefixed encoding (see §3) or they will not reproduce the bug.

### 6. Test surfaces

`src/utils/__tests__/api.test.ts` (helper unit, incl. the two negative cases),
`src/store/__tests__/files.test.ts`, `src/components/markdown/__tests__/artifactLink.test.ts`,
`src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx`.

---

# Run 3 — `2026-10-02-epmcdme-14735-ui-artifact-auth-gaps`

## Technical Research

**Task**: artifact download share_token markdown
**Generated**: 2026-10-02
**Research path**: codegraph

---

### 1. Original Context

EPMCDME-14735 (UI repo /home/aliaksei_chumakou/codemie-dev/codemie-ui, branch EPMCDME-14735_downloadable-artifacts-ui): analyze and resolve contradictions between the merged ticket EPMCDME-12708 and EPMCDME-14735 on the front-end, mirroring the back-end analysis in /home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-02-epmcdme-14735-artifact-auth-gaps/spec.md (read it, plus any sibling technical-analysis.md/plan.md in that dir; the back-end repo is /home/aliaksei_chumakou/codemie-dev/codemie — use `git log --grep` there for EPMCDME-12708 and EPMCDME-14735 commits if you can via Read of docs; in this UI repo the relevant history is commits mentioning EPMCDME-12708, EPMCDME-12556, EPMCDME-14735, MR 1757). Scope: (1) find UI behaviour that must change because of EPMCDME-12708 (front-end or back-end) or the new back-end EPMCDME-14735 changes — artifact link parsing, file download auth, shared-chat (share_token) flows, file id validation (EPMCDME-12556 SAFE_FILE_ID_PATTERN). (2) Known issue: in a shared chat, resolveSandboxFileUrls runs before lexing, so the artifact href becomes …/v1/files/<token>?share_token=…; getArtifactLink in src/components/markdown/artifactLink.ts rejects '?' via SAFE_FILE_ID_PATTERN and returns null, so share recipients lose the download chip and get a plain link that may not carry auth for GET /v1/files. Proposed fix following MR 1757's createFileMetadata/downloadFile pattern: split the query with stripFileTokenQuery, validate and decode only the bare token, keep the full token?share_token=… as fileId so the request carries the grant; tests alongside artifactLink. (3) Verify whether the plain-link (non-chip) download path works for share recipients (does a browser navigation to /v1/files carry the needed auth?), and list every other contradiction found between the two tickets' contracts and the UI code (e.g. file id format, URL shape, filename handling, image vs non-image artifacts, share_token propagation in downloadFile/createFileMetadata, ChatShared page rendering).

---

### 2. Codebase Findings

#### Existing Implementations
- `src/utils/sharedFileGrants.ts` — module-level `sharedFileUrls` map (bare token -> `token?share_token=...`). `setSharedFileGrants`, `clearSharedFileGrants`, `resolveSharedFileToken` (L41), `resolveSandboxFileUrls` (L45, regex `sandbox:\/v1\/files\/[^\s)\]>"']+`, rewrites to `${baseUrl}/v1/files/${resolveSharedFileToken(t)}`).
- `src/store/chats.ts:493-501` `getSharedChat` — `GET v1/share/conversations/{token}`, `setSharedFileGrants(data.shared_file_urls)`, then `transformChatBEtoFE(data.conversation)`. `clearCurrentChat` (L536) clears grants.
- `src/components/markdown/Markdown.utils.ts:112` `getMarkdownTokens` — `marked.lexer(resolveSandboxFileUrls(sanitizeMessage(msg), api.BASE_URL))`. So in a shared chat every link/image href already carries `?share_token=` before lexing. `markdown2html` (L116) does NOT call `resolveSandboxFileUrls`.
- `src/components/markdown/artifactLink.ts` — `getArtifactLink` (L62): href must start with `${api.BASE_URL}/v1/files/`; `fileId = href.slice(prefix.length)`; rejects unless `SAFE_FILE_ID_PATTERN = /^[A-Za-z0-9+/=._~-]+$/` (L40, excludes `?`, `#`, `%`, `\` — EPMCDME-12556), all-dots, or `PATH_ESCAPE_PATTERN = /^\/|\.\.\//`; decodes with `decodeFileName` from `@/utils/helpers` (array form, returns `[]` on atob failure); `fileName = sanitizeFileName(stripUuidPrefix(name))`; null when empty. `hasSeamRenderedLink` recurses on it.
- `src/components/markdown/MarkdownTokens.tsx:100-112` — artifact token -> `<File file={{fileId,fileName}} withDownload />` (no `mimeType`, so never treated as image). Non-artifact https links fall through to `getInlineProps`/`getBlockProps` -> HTML `<a href target="_blank" rel="noopener noreferrer">` (renderer at `Markdown.utils.ts:128-131`) sanitized by `sanitizeHtmlWithImageAllowList`.
- `src/store/files.ts:87-114` `downloadFile(fileUrl)` (MR 1757 pattern) — `stripFileTokenQuery` for the UUID test and decode, full `fileUrl` (with query) for the request: UUID -> `api.downloadFileStream`; decodable name -> `api.get` + blob + `a.download = sanitizeFileName(stripUuidPrefix(name))`; else `downloadFileStream` (name from Content-Disposition). `getFileURL` (L141) concatenates raw.
- `src/hooks/useFileUpload.tsx:58-86` `createFileMetadata` — `decodeFileName(stripFileTokenQuery(input))` (from `@/utils/utils`, object form, throws), `fileId: fileInput` (full, query kept).
- `src/utils/utils.ts:255` `stripFileTokenQuery = s => s.split('?')[0]`; `utils.ts:257` throwing `decodeFileName` (object). Second, non-throwing array `decodeFileName` at `src/utils/helpers.ts:220`.
- `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx:64` — `fileNames.map(f => createFileMetadata(resolveSharedFileToken(f)))`: user attachments already carry the grant.
- `src/pages/chat/SharedChatPage.tsx` — calls `getSharedChat`, renders `ChatHistory` with `isSharedPage: true`; no share-specific rendering of AI messages or thoughts.
- `src/components/Thought/ThoughtMessage.tsx:96-131` — thought text renders as `<Markdown>` only when `author_name` is in `MARKDOWN_ENABLED_AUTHORS` (`src/constants/index.ts:61`: `'Codemie Thoughts'`, `'Browser Take Screenshot'`) or `output_format === 'markdown'`; otherwise `TextBlock` (`src/components/markdown/TextBlock.tsx`, plain text per line, no link parsing). JSON `image_url` segments render `<img src={segment.url}>` gated by `isImageAllowed`, with no sandbox resolution.
- `src/utils/api.ts` — `authHeaders()` (L455) returns `{ 'user-id': ... }` only in LOCAL mode without local auth, else `{}`; `credentials: 'include'` only when `getIsLocalAuth()`. `downloadFileStream` (L271) same.
- `src/utils/imageAllowList.ts:86` `isImageAllowed` — https/same-origin/backend-origin allowed; `sandbox:` scheme denied.

#### Architecture and Layers Affected
- Markdown render seam: `artifactLink.ts`, `MarkdownTokens.tsx`, `Markdown.utils.ts`.
- Shared-file grant util: `utils/sharedFileGrants.ts`; store: `store/chats.ts` (`getSharedChat`), `store/files.ts` (`downloadFile`, `getFileURL`).
- Components: `components/File.tsx` (chip), `components/Thought/ThoughtMessage.tsx`, `pages/chat/SharedChatPage.tsx`.

#### Integration Points
- Back end `GET /v1/share/conversations/{token}` -> `{ conversation, shared_file_urls }`; map built by `collect_message_file_tokens` (back-end `share_conversation_service.py`). Back-end 14735 Task 5 adds `thoughts[].message` (recursive `children`, not `input_text`) to that collector, so the map gains thought-borne tokens.
- Back end `GET /v1/files/{file}` (12708 Rules A–E); Rule E accepts `?share_token=`.
- Back end artifact link format: `[Download](sandbox:/v1/files/<base64 token>)`; failure text `[File could not be saved]` (plain text, no link). MCP screenshot text: `Screenshot captured. URL: <url>\n\n![Screenshot](<url>)`.

#### Patterns and Conventions
- MR 1757 pattern: strip the query only for decoding/classification; keep the full `token?share_token=...` as the request id (`downloadFile`, `createFileMetadata`).
- Trust boundary validation on `fileId` before it reaches an authenticated URL (EPMCDME-12556): reject rather than repair.
- Display name pipeline `sanitizeFileName(stripUuidPrefix(name))` shared by chip label and `a.download`.

---

### 3. Documentation Findings

#### Guides and Architecture Docs
- `.ai-run/guides/development/security-patterns.md` — EPMCDME-12556 precedent: strings from an API response are not paths; regression test is part of the fix.
- `.ai-run/guides/testing/testing-patterns.md` exists (Vitest + RTL, `unit`/`integration` projects).

#### Architectural Decisions
- `artifactLink.ts:35-45` comments: id is a trust boundary; `?` excluded deliberately (EPMCDME-12556).
- `sharedFileGrants.ts:15-25`: backend leaves bare tokens in `file_names` and text; recipients must resolve through the map.
- Back-end spec non-goal: "The share-page artifact chip in the UI is out of scope. `getArtifactLink` in codemie-ui rejects the `?share_token=` href, and the user will fix that in a separate codemie-ui run."

#### Derived Conventions
- Two `decodeFileName` implementations with different contracts (throwing object vs non-throwing array); the render seam and `files.ts` use the helpers (array) one.

---

### 4. Testing Landscape

#### Existing Coverage
- `src/components/markdown/__tests__/artifactLink.test.ts` — decode, uuid strip, base64 `+/=`, traversal, control chars; L144-146 pins `abc?token=evil` -> null. `encodedId()` helper builds back-end-shaped ids.
- `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx`, `Markdown.artifactLinks.test.ts` — chip mounting, DOMPurify scheme agreement.
- `src/utils/__tests__/sharedFileGrants.test.ts` — map resolution and sandbox rewrite with `?share_token=abc`.
- `src/store/__tests__/chats.getSharedChat.test.ts`, `src/store/__tests__/files.test.ts`, `src/hooks/__tests__/useFileUpload.test.tsx`, `src/components/__tests__/File.test.tsx`, `src/components/Thought/__tests__/ThoughtMessage.test.tsx`, `ChatUserMessage.fileAttachment.test.tsx`.

#### Testing Framework and Patterns
Vitest; `vi.hoisted` + `vi.mock('@/utils/api')` overriding `BASE_URL`; token fixtures as plain objects.

#### Coverage Gaps
- No test renders an artifact link with an active share grant (chip or fallback) end to end.
- No test for `SharedChatPage` (codegraph: no tests within 3 hops).
- No test for a thought containing `[Download](sandbox:...)` under a non-markdown author.

---

### 5. Configuration and Environment

#### Environment Variables
- `VITE_API_URL` (`window._env_` / `import.meta.env`) -> `api.BASE_URL`, the prefix `getArtifactLink` matches.
- `VITE_ENV` (`getMode`) — LOCAL mode sends `user-id` header auth.

#### Configuration Files
- `GET /v1/config` `allowedImageDomains` -> image allow-list; IdP provider (`getIsLocalAuth`).

#### Feature Flags and Deployment Concerns
- `feature:renderStateOutputAsMarkdown` (`ThoughtMessage.tsx:34`) — affects WorkflowState thoughts only.

---

### 6. Risk Indicators

- **Confirmed contradiction (item 2):** in a shared chat the artifact href is `${BASE_URL}/v1/files/<t>?share_token=...`; `SAFE_FILE_ID_PATTERN` rejects `?` (`artifactLink.ts:71`), so recipients get no chip. `helpers.decodeFileName` would also return `[]` on the un-stripped id (atob fails on `?`). `downloadFile` and `createFileMetadata` already handle the query (MR 1757), so only the seam is out of step.
- **Plain-link fallback (item 3), inferred from code, not runtime-verified:** the fallback is an `<a target="_blank">` whose href includes `?share_token=`, so the grant travels. A browser navigation never sends custom headers. Outside LOCAL dev, `authHeaders()` is `{}`, which implies cookie/session auth; a top-level navigation sends same-site cookies, so it likely authenticates in prod. It fails in LOCAL dev mode (`user-id` header) and wherever API auth needs a bearer header. The saved name then comes from server Content-Disposition, not the UI's strip+sanitize pipeline. It opens a new tab, which differs from the chip UX.
- `artifactLink.test.ts:144-146` pins `abc?token=evil` -> null; the proposed fix changes that contract.
- Speculative: accepting any query after the bare token would let message text append arbitrary query parameters to an authenticated `GET v1/files/...`. A narrower acceptance (the query must equal what `resolveSharedFileToken(bareToken)` produced, or only `share_token=<safe>`) keeps the 12556 boundary.
- Speculative: `?share_token` value alphabet is unverified; `+`/`=`/`%` in the value would hit `SAFE_FILE_ID_PATTERN` or be mis-decoded by the server.
- **Thought-borne links (back-end Gap 3):** back end now grants tokens found in `thoughts[].message`, but `ThoughtMessage` renders tool thoughts through `TextBlock` (plain text) unless the author is `Codemie Thoughts` / `Browser Take Screenshot` or `output_format` is markdown. A generic MCP/file-system tool thought containing `[Download](sandbox:/v1/files/<t>)` shows raw text with an unresolved `sandbox:` URL, for owners and recipients alike. Screenshots (`Browser Take Screenshot`) go through `Markdown` and get the grant on `<img>`.
- `ThoughtMessage` JSON `image_url` segments use `segment.url` raw; a `sandbox:` URL there is never resolved or granted and is blocked by `isImageAllowed`. It is unverified whether the back end emits that shape.
- `markdown2html` (`Markdown.utils.ts:116`) does not resolve sandbox URLs or grants. Its callers were not traced.
- `<img>` for granted screenshots relies on cookie auth (no headers on image loads); same LOCAL-mode caveat.
- Two `decodeFileName` implementations (`utils/utils.ts:257` throws; `utils/helpers.ts:220` returns `[]`) are a drift hazard for any fix that reuses one.
- `[File could not be saved]` (back-end AC-1/AC-4) is plain text; it needs no UI handling.
- UI git history (EPMCDME-12708/12556/MR 1757 commits) was not inspected; this run had no shell.

---

### 7. Summary for Complexity Assessment

The core fix is in one layer: the markdown render seam. `getArtifactLink` in `src/components/markdown/artifactLink.ts` rejects the `?share_token=` href that `resolveSandboxFileUrls` produces before lexing, so share recipients lose the download chip. The store side (`filesStore.downloadFile`, `createFileMetadata`) already follows the MR 1757 strip-for-decode, keep-for-request pattern, and `ChatUserMessage` attachments already resolve grants. The change surface is `artifactLink.ts` plus `artifactLink.test.ts`, which pins the current `?`-rejection contract and has to change. A `MarkdownTokens`/shared-grant render test is optional. There is no new dependency, config or API change.

The novelty is security-shaped, not structural. The id is an EPMCDME-12556 trust boundary, so how much query the seam accepts decides whether the fix reopens arbitrary-query injection into an authenticated request. The plain-link fallback probably works for recipients in prod (cookie auth plus the query grant), but not in LOCAL header-auth mode, and the server names the file. This is inferred from `api.ts`, not verified at runtime. Tests are good around the seam and grants. `SharedChatPage` has none.

A second contradiction is wider than the reported bug. Back-end 14735 Gap 3 grants thought-borne tokens, but `ThoughtMessage` renders most tool thoughts as plain `TextBlock`, so artifact links in tool output never become links or chips for anyone. Only the `Codemie Thoughts`/`Browser Take Screenshot` authors use Markdown. Whether that is in scope affects the size: it touches `ThoughtMessage.tsx` and its tests.

---

### 8. External References

- `/home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-02-epmcdme-14735-artifact-auth-gaps/spec.md` — resolved. Key facts: Gap 1 — MCP artifact with no invoking user is not stored, renders `[File could not be saved]`; `MCP_ARTIFACTS_SUBDIR` deleted. Gap 2 — `store_artifact` raises `ValueError` on `None`/empty/whitespace owner; no caller emits a `sandbox:/v1/files/` link without a URL. Gap 3 — `collect_message_file_tokens` also scans `thoughts[].message` recursively through `children`, not `input_text`; both `_build_shared_file_urls` (the `shared_file_urls` map) and Rule E use it; "no UI change" claimed. Non-goal verbatim: "The share-page artifact chip in the UI is out of scope. `getArtifactLink` in codemie-ui rejects the `?share_token=` href, and the user will fix that in a separate codemie-ui run." Open finding: Rule E grants any token appearing in any history message without an ownership check (12708 bug, not fixed there).
- `.../technical-analysis.md` (same dir) — resolved. Artifact link format `[Download](sandbox:/v1/files/<encoded>)`; screenshot text `Screenshot captured. URL: <url>\n\n![Screenshot](<url>)`; Rule C (`MCP_IMAGES_SUBDIR` owner) is served to any authenticated user; tool output persists in `Thought.message`.
- `.../plan.md` (same dir) — resolved. Verified: `GET /v1/share/conversations/{token}` returns the whole Conversation including `history[].thoughts` (`message`, `input_text`, `children`) to recipients.
- Back-end git log for EPMCDME-12708/14735 — not run (no shell available).

---

# Run 4 — `2026-10-22-ui-workspace-artifact-links`

## Technical Research

**Task**: artifact download-chip workspace
**Generated**: 2026-10-22
**Research path**: codegraph

---

### 1. Original Context

Implement the story at /home/aliaksei_chumakou/codemie-dev/docs/stories/2026-10-22-mcp-artifact-publishing/children/ui-workspace-artifact-links/story.md (read it verbatim — it holds the acceptance criteria and decision D1). Parent story: /home/aliaksei_chumakou/codemie-dev/docs/stories/2026-10-22-mcp-artifact-publishing/story.md. A thin product-owner analysis sits next to the story (technical-analysis.md in the same folder) — use as a hint only. The back-end part is done: its run artifacts are in /home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-22-backend-artifact-publisher/ (spec.md, plan.md etc.) and the back-end code is /home/aliaksei_chumakou/codemie-dev/codemie/ — confirm the exact artifact link format the back end now produces (URL shape, path `artifacts/<turn-id>/<name>`, encoding, duplicate-name suffixing, failure/"not delivered" messages) and how workspace file download / share-grant works server-side. Related repos (only if needed): ../mcp-mock/, ../mcp-proxy/, ../codemie-mcp-connect-service/. Current repo: codemie-ui (React/TS). Key UI areas: the chat artifact download chip (name decoding/sanitising, uuid_ prefix stripping, EPMCDME-12556 token-shape guard), share-grant appending on file links in shared conversations, and the "Browse files" workspace browser.

---

### 2. Codebase Findings

#### Existing Implementations
- `src/components/markdown/artifactLink.ts` — `getArtifactLink(token)` (l.68-95): requires href under `${api.BASE_URL}/v1/files/`; splits off an optional query, which must match `SHARE_TOKEN_QUERY` (`^share_token=[A-Za-z0-9]+$`); bare id must match `SAFE_FILE_ID_PATTERN` (`^[A-Za-z0-9+/=._~-]+$`), not be all dots, not match `PATH_ESCAPE_PATTERN` (leading `/` or `../`). Then the display name is built at l.90-91:
  ```ts
  const [, , originalFileName] = decodeFileName(bareId)
  const fileName = sanitizeFileName(stripUuidPrefix(originalFileName ?? ''))
  ```
  The comment at l.88-89 says there is deliberately "No basename step" because "splitting would silently truncate a name containing `/`". Story D1 reverses this.
  Also `isDisarmedLink`, `hasSeamRenderedLink`.
- `src/utils/api.ts` — `sanitizeFileName` (l.69-79: control chars, `/`, `\` → `_`; strips leading dots/spaces), `stripUuidPrefix` (l.84-88, leading `<uuid>_` only), `downloadFileStream(url, type?, fileName?)` (l.270-325: uses the given `fileName`, falling back to sanitized Content-Disposition).
- `src/utils/helpers.ts:220` `decodeFileName` → `string[]` `[mime, owner, name]`. It returns `[]` on an atob failure and also has a legacy `_`-split branch. A second, throwing copy is at `src/utils/utils.ts:257` and returns an object. The chip and `files.ts` use the helpers.ts copy.
- `src/components/markdown/MarkdownTokens.tsx` l.100-112 — mounts `<File file={{fileId, fileName}} withDownload className="w-fit max-w-full"/>` for an artifact token.
- `src/components/File.tsx` — chip. The download button calls `filesStore.downloadFile(file.fileId)`. The extension badge comes from `fileName`.
- `src/store/files.ts` `downloadFile` (l.87-114). A bare UUID goes through `downloadFileStream`, and the name comes from Content-Disposition. Otherwise the id is decoded, and if a name is found the file is fetched with `api.get` and saved through an `<a download>` set to `sanitizeFileName(stripUuidPrefix(originalFileName))` (l.108). **That bypasses the server's Content-Disposition, so a workspace artifact would also download as `artifacts_<turn>_name`**: the same mangling as the chip, on a second surface.
- `src/utils/sharedFileGrants.ts` — `resolveSandboxFileUrls` rewrites `sandbox:/v1/files/<token>` (regex `/sandbox:\/v1\/files\/[^\s)\]>"']+/g`) to `${baseUrl}/v1/files/${resolveSharedFileToken(token)}`. `sharedFileUrls` maps a bare token to `token?share_token=...` and is set from `GET /v1/share/conversations/{token}` `shared_file_urls`. It is called from `Markdown.utils.ts` `getMarkdownTokens`.
- "Browse files": `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` and `src/store/agentWorkspace.ts`. `listFiles` calls `GET v1/workspaces/{id}/files?recursive=true`. The popup renders a **flat list of buttons showing the full `file.path`** (l.246-265, `break-all`), with no folder tree. `downloadSelectedFile` calls `v1/workspaces/{id}/files/download?file_path=<encodeURIComponent(path)>` with `fileName = path.split('/').pop()` (l.211-217), which is already the basename.

#### Architecture and Layers Affected
- Markdown render seam: `artifactLink.ts`, `MarkdownTokens.tsx`, `File.tsx`.
- Utils: `api.ts` (sanitise/strip), `helpers.ts` (decode), `sharedFileGrants.ts`.
- Store: `files.ts` (`downloadFile`), `agentWorkspace.ts`.
- Page component: `AgentWorkspaceBrowserPopup.tsx`.

#### Integration Points (back end, verified in `/home/aliaksei_chumakou/codemie-dev/codemie`)
- **Link shape**: `sandbox:/v1/files/<token>`, built only by `AgentWorkspaceService._sandbox_link` (`service/agent_workspace_service.py:137-146`). It wraps `FileObject(name=blob_name, mime_type, owner=blob_owner).to_encoded_url()`, which is `StringSerializer.serialize([mime, owner, name])` (`codemie_tools/base/file_object.py:147-154`), the same `<len>~<word>` base64 format the UI `decodeFileName` parses.
- **Workspace artifact token contents**: `owner = _get_blob_owner(workspace_id)` (the PO analysis calls it `workspace-<id>`), and `name = blob_name = normalized path = artifacts/<turn-id>/<name>` (`_upsert_workspace_file_content` l.720-756; the path comes from `artifact_publisher._publish_to_workspace` l.120-128).
- `turn_id` is the request uuid, or `uuid4().hex` when it is blank. The path segment is therefore a uuid with or without dashes, and is never followed by `_`.
- **Name**: `_last_segment` (l.87-89) is `PurePosixPath(name.replace("\\","/")).name.strip()`, with fallback `DEFAULT_ARTIFACT_NAME` for an empty name, `.` or `..`.
- **Duplicates** (`_unique_name` l.130-140): the same name within one turn becomes `f"{stem} ({counter}){suffix}"` starting at 2, for example `report (2).csv`. Spaces and parentheses therefore occur inside the decoded name (inside the base64, not the URL).
- **No conversation**: falls back to the per-user store as `<uuid4>_<name>` (legacy shape, `_publish_per_user` l.142-149).
- **Failure texts** (`PublishResult.reason`, plain strings, no link):
  - "`<name>` was not saved: no user is known to own it"
  - "... exceeds the maximum upload size of N bytes and was not saved"
  - "... was not saved: its content is not valid base64"
  - "... was not saved: it is empty"
  - "... was not saved: the file could not be read"
  - "... was not saved: <zip/validation error>"
  - "... could not be saved because of a storage error"
  - "... was not delivered: storage is not configured"
  - MCP resource link: "`<name>` stays on the MCP server and was not delivered" (spec §1)
- **Download** (`rest_api/routers/files.py` `read_file` l.232-288): `GET /v1/files/{file_name}?share_token=` → `FileObject.from_encoded_url` → `_authorize_file_access`. `display_name = PurePosixPath(_strip_uuid_prefix(name) or name).name` (l.262), so Content-Disposition carries the basename. The order is uuid-strip first, then last segment.
- **Share grant** (spec §7, Rule E): a file is granted if its blob is registered in the sharer's workspace for the shared conversation, or if the token appears in the message tokens and its owner is the sharer. The token map in `shared_file_urls` is unchanged. Spec states that the UI regex copy "is not touched; it only has to keep accepting a superset of valid tokens".
- Browse-files endpoints: `v1/workspaces/conversations/{cid}`, `v1/workspaces/{id}/files`, `/files/content`, `/files/download`. The back end refuses writes under `artifacts/` (`_refuse_artifact`).

#### Patterns and Conventions
- Pure predicates at the token seam, no network calls to classify a link. `fileId` stays raw (with grant query), and only `fileName` is derived.
- The chip label and the `files.ts` download name share one "strip-then-sanitize" pipeline (comment at `files.ts:106-107`), so the two surfaces must stay identical.
- Security comments cite EPMCDME-12556 and the base64 alphabet rationale inline.

---

### 3. Documentation Findings

#### Guides and Architecture Docs
- `.ai-run/guides/development/security-patterns.md` (HTML sinks, redirects) and `.ai-run/guides/testing/testing-patterns.md` both exist. They were not read in depth here.

#### Architectural Decisions
- Story D1 sets the chip name to the last path segment, followed by today's sanitising and uuid stripping.
- Back-end spec §8 makes the download name the last path segment, and `_safe_disposition` still removes separators.
- Back-end spec §7 leaves the UI grant regex unchanged.

#### Derived Conventions
- The back end applies the uuid-strip before the basename. For the shapes it emits, the result is the same in either order, because a `<uuid>/` folder is never followed by `_`.

---

### 4. Testing Landscape

#### Existing Coverage
- `src/components/markdown/__tests__/artifactLink.test.ts` — the seam predicate, with `encodedId` and `UUID` fixtures.
- `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx` — chip mounting (`ARTIFACT`, `FILE_ID`, `UUID` fixtures).
- `src/components/markdown/__tests__/Markdown.artifactLinks.test.ts` — DOMPurify scheme agreement.
- `src/components/__tests__/File.test.tsx`
- `src/store/__tests__/files.test.ts` — `downloadFile` branches.
- `src/utils/__tests__/sharedFileGrants.test.ts`
- `src/utils/__tests__/api.test.ts` and `api.downloadFileStream.test.ts`
- `src/store/__tests__/agentWorkspace.test.ts`
- `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`

#### Testing Framework and Patterns
- Vitest with React Testing Library, `unit` and `integration` projects (`vite.config.ts`). Fixtures build base64 tokens in-test.

#### Coverage Gaps
- `AgentWorkspaceBrowserPopup.tsx` has no direct test. Codegraph found none within 3 caller hops.
- No fixture yet exercises a path-shaped name (`artifacts/<turn>/x`) or a `name (2).ext` name in the artifact tests.

---

### 5. Configuration and Environment

#### Environment Variables
- `api.BASE_URL` is the prefix for the artifact seam. Back-end `FILES_STORAGE_MAX_UPLOAD_SIZE` drives the "exceeds" failure text. No UI-side variable is specific to this feature.

#### Configuration Files
- None specific.

#### Feature Flags and Deployment Concerns
- None. Delivery order is back end first, which is done.

---

### 6. Risk Indicators

- The basename change has two call sites that must agree: `artifactLink.ts:90-91` (chip) and `files.ts:108` (download `a.download`). Fixing only the chip leaves the downloaded file named `artifacts_<turn>_name`, because the base64 branch ignores the server's Content-Disposition.
- Guard integrity: the path lives inside the decoded name, not in the URL. Taking a basename of the decoded name must not touch `SAFE_FILE_ID_PATTERN`, `PATH_ESCAPE_PATTERN` or `SHARE_TOKEN_QUERY` (EPMCDME-12556).
- Existing tests or the comment at `artifactLink.ts:88-89` may pin the current behaviour, where a decoded name containing `/` is kept whole and sanitised to `_`. Such tests would flip under D1.
- Edge case: a decoded name that ends in `/`, or whose basename is `..`, gives an empty or dot name. `sanitizeFileName` strips leading dots, and an empty result returns `null`, so no chip is shown.
- "Not delivered" and failure messages are plain text with backticks, so they render as codespans. They are probably already chip-free; a test confirming this is all the AC needs.
- Browse files already shows the full `artifacts/<turn>/<name>` path and downloads with the basename. Whether the AC needs a folder tree or accepts the flat path list is a spec question.
- Two `decodeFileName` copies exist (`helpers.ts` and `utils.ts`). Only the helpers copy is on the chip and download path.
- Speculative: the change may be confined to `artifactLink.ts` and `files.ts` (or a shared name helper in `api.ts`), plus tests. Share grants probably need no code change, because tokens remain base64 with no `)`, whitespace or quotes.

---

### 7. Summary for Complexity Assessment

The task touches the markdown artifact seam (`src/components/markdown/artifactLink.ts`), the file download store (`src/store/files.ts`), and possibly the name utilities in `src/utils/api.ts`. "Browse files" (`AgentWorkspaceBrowserPopup.tsx`, `agentWorkspace.ts`) already lists recursively by full path and downloads under the last path segment. The share-grant resolver (`sharedFileGrants.ts`) already handles any base64 token. The back end is confirmed to emit `sandbox:/v1/files/<base64 [mime, workspace-owner, "artifacts/<turn-id>/<name>"]>`, with duplicate names suffixed `name (2).ext`. Its failure and "not delivered" messages are plain text with no link. Its own `/v1/files` download returns the basename in Content-Disposition.

Technical novelty is low. D1 adds a last-segment step before the existing strip and sanitise pipeline, and that pipeline is duplicated in the chip label and in the base64 download branch of `filesStore.downloadFile`. The main care point is security: the EPMCDME-12556 token guard runs on the encoded id and must stay untouched, while the basename applies only to the decoded display and download name.

Tests are dense around the seam: artifactLink, the chip, files store, sharedFileGrants, api and agentWorkspace store tests all exist. The popup has no direct test. Existing tests or comments that pin "no basename step" will need updating. The key risks are missing the second naming site in `files.ts`, and an AC interpretation question about whether Browse files needs a folder tree or accepts the current flat path list.

---

### 8. External References

- `/home/aliaksei_chumakou/codemie-dev/docs/stories/2026-10-22-mcp-artifact-publishing/children/ui-workspace-artifact-links/story.md` — resolved.
  - Acceptance criteria:
    1. A link to `artifacts/<turn-id>/closed_positions_analysis.xlsx` makes the chip show `closed_positions_analysis.xlsx`.
    2. `report.csv` and `report (2).csv` each show their own name and download their own file.
    3. A share recipient's click on a workspace artifact downloads the file, with the grant carried.
    4. The legacy `<uuid>_<name>` form still shows `<name>` and downloads.
    5. Traversal, control characters and backslashes are shown sanitised, and links outside the token shape are still refused (EPMCDME-12556).
    6. "stays on the MCP server and was not delivered" and publish-failure reasons render as plain text, with no chip and no link.
    7. Browse files shows the files under `artifacts/<turn-id>/` with real names and downloads them correctly.
  - D1: "Chip name for a path-named artifact → the last path segment, then today's sanitising and uuid stripping."
  - Out of scope: file size, upload/edit/delete UI, workflow output (EPMCDME-10708).
- `/home/aliaksei_chumakou/codemie-dev/docs/stories/2026-10-22-mcp-artifact-publishing/story.md` — resolved. Delivery is back end first. The UI consumes `artifacts/<turn>/<name>` tokens. Parent D5 places the share-grant ownership bound in the back end.
- `.../children/ui-workspace-artifact-links/technical-analysis.md` (PO hint) — resolved. Its owner is given as `workspace-<id>`, and it warns that the basename must not loosen the token guard.
- `/home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-22-backend-artifact-publisher/spec.md` — resolved. Facts are quoted in §2 Integration Points: §2 path and dedupe, §1 "not delivered" text, §7 share Rule E with the UI regex untouched, §8 download name is the last segment. `plan.md` was not read.
- Back-end code — resolved: `service/artifact_publisher.py`, `service/agent_workspace_service.py`, `codemie_tools/base/file_object.py`, `codemie_tools/base/artifact_publishing.py`, `rest_api/routers/files.py`.
