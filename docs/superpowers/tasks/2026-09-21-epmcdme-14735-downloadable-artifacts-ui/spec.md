# Spec: EPMCDME-14735 — downloadable chat artifacts (UI, consolidated)

**Ticket**: [EPMCDME-14735](https://jiraeu.epam.com/browse/EPMCDME-14735) (Ready for Review) · **Branch**: `EPMCDME-14735_downloadable-artifacts-ui` · **MR**: !1945
**Consolidated**: 2026-11-03 from four sdlc-standard runs (see [Run history](#run-history-and-superseded-decisions)), plus the review of 2026-11-13 and the unlisted-links follow-up of 2026-11-18. On a conflict the later run wins. Verified against the code at `d068529bd`; the 2026-11-18 sections against `e82242108`.
**Story** (run 4, outside the repo): `~/codemie-dev/docs/stories/2026-10-22-mcp-artifact-publishing/children/ui-workspace-artifact-links/story.md` (parent: `../../story.md`). Its ACs are copied below.
**Companion files in this directory**: `plan.md` and `technical-analysis.md` (one section per run). All other files (complexity, decisions, gate run, review records, `dynamic-tests.local/`, `evidence.local/`) are from run 4, except `evidence/` and `dynamic-tests/`, which are run 3's shared-chat verification. Earlier runs' other records are in git history (before the consolidation commit).
**Back-end counterpart**: `codemie/docs/superpowers/tasks/2026-09-14-epmcdme-14735-downloadable-mcp-artifacts/spec.md` (MR !4252, still open as a draft).

---

## Problem

The back end turns a generated file into a markdown link `[Download](sandbox:/v1/files/<token>)`. Before this work the UI rewrote the scheme to `${api.BASE_URL}/v1/files/` and rendered a plain anchor: no file name, no type, nothing that read as a downloadable artifact (ticket AC #2). A link the back end could not deliver (`filesystem:`, `file:`) rendered as link-styled text whose `href` DOMPurify had stripped, so it looked clickable and did nothing (AC #4).

The runs found these concrete causes and follow-ups:
- The URL segment is not a file name. It is base64 of `[mime_type, owner, name]`, so the name and MIME type exist only after decoding (run 1; the first spec assumed `{uuid}_{basename}` and the chip showed raw base64).
- The encoded-link branch of `filesStore.downloadFile` saves under the decoded name, so the storage prefix `{uuid}_` leaked into both the chip label and the saved file (run 2).
- In a shared chat the href gains `?share_token=<grant>`, and the id guard refused any `?`, so recipients got no chip (run 3).
- The back end now publishes into the conversation workspace, so the decoded name is the path `artifacts/<turn-id>/<file>`. `sanitizeFileName` turned `/` into `_`, so the chip and the saved file read `artifacts_<turn>_report.xlsx` (run 4, review U1/U2).
- The model (gpt-4.1) sometimes writes `sandbox:/v1/files/<token>` links of its own: it copies a real token and changes the name or MIME header, or makes one up. The UI turned any decodable token into a chip, and the download answered 400 or 404 (AC #4; 2026-11-18, e.g. three `positions` chips in conversation `53fea99f`, owner and share view). Two gaps let them through: `helpers.decodeFileName` falls back to the legacy `_` split midway and accepts any part count, and nothing compared an inline link with the files the back end listed.

## Current design

### 1. Recognising an artifact link (`src/components/markdown/artifactLink.ts`)
- `getArtifactLink(token)` accepts only a `link` token whose href starts with `${api.BASE_URL}/v1/files/` (the `sandbox:` rewrite happens in `getMarkdownTokens` via `resolveSandboxFileUrls`, before lexing). It returns `{ fileId, fileName, mimeType? }` or `null`.
- The raw id is split at the first `?`. The query must be absent or match `SHARE_TOKEN_QUERY = /^share_token=[A-Za-z0-9]+$/` exactly, so there is no `URLSearchParams` parsing and no `%`-decoding (run 3).
- The bare id must match `SAFE_FILE_ID_PATTERN = /^[A-Za-z0-9+/=._~-]+$/` (the base64 alphabet), must not be all dots, and must not match `PATH_ESCAPE_PATTERN` (a leading `/` or `../`). Anything else is refused, never repaired (EPMCDME-12556).
- Only the bare id is decoded, with the strict `decodeArtifactId(bareId): [mimeType, owner, name] | null` (2026-11-18; it replaced `helpers.decodeFileName` here). It refuses whatever the back end's `StringSerializer.deserialize` / `FileObject.from_encoded_url` would not read as exactly three parts, so a malformed token gives no chip:
  - the length must be a multiple of 4 (`atob` tolerates missing `=` padding; Python's `b64decode` raises, and the download answers 400);
  - `atob`, then `TextDecoder('utf-8', { fatal: true })`; any error gives `null`;
  - new format (data starts with `SEGMENT_HEAD = /^(0|[1-9]\d*)~/`): read `len~value` until the data is used up, slicing code points (`Array.from`), because `len` is Python's `len()`. A segment without a head, a short final segment or a part count other than 3 gives `null`. A leading zero is refused because the back end reads `08~` as a one-digit head and slices one character short;
  - legacy format (no head): `split('_')`, exactly 3 parts.
- `fileId` stays the raw id, including any grant query. The decoded MIME type is returned for display only.
- `ArtifactLink.isTurnArtifact` is true when the decoded owner starts with `workspace-` and the decoded name starts with `artifacts/`: a file a turn published, which the back end always lists in `file_names` (section 9).

### 2. One naming pipeline (`artifactFileName` in `src/utils/api.ts`)
`artifactFileName(name)` = last `/`-separated segment → `stripUuidPrefix` (leading `{uuid}_` only, mirroring the back end's `_strip_uuid_prefix`; a uuid elsewhere survives; an empty result keeps the original) → `sanitizeFileName` (control characters, `/` and `\` → `_`, leading dots and spaces removed, empty → `undefined`).
- Both naming sites call it: the chip label (`getArtifactLink`) and the encoded-link download name (`filesStore.downloadFile`, `a.download = artifactFileName(name) ?? 'download'`). `files.test.ts` asserts the two agree for path-shaped names.
- Backslashes are not separators; they are sanitised to `_`. A last segment that is empty, `.` or `..` gives no name, so no chip is shown (and the download falls back to `download`).
- The `src/setupTests.unit.ts` mock of `@/utils/api` lists `artifactFileName` explicitly.

### 3. Render seam (`src/components/markdown/MarkdownTokens.tsx`)
- An artifact link mounts the existing `File` chip (`withDownload`, no preview, `className="inline-flex max-w-full align-middle"`). `renderer.link` and `SANITIZE_CONFIG` are unchanged, so no new HTML sink exists.
- Artifact rendering lives in `renderArtifactToken(token, key, listedArtifactIds)` (moved out of the map callback for the lint complexity limit). When `listedArtifactIds` is given, a turn artifact whose bare id (`fileId` before any `?`, so a share grant does not matter) is not in the set renders as `<span>{token.text}</span>`; everything else mounts the chip (2026-11-18).
- `isDisarmedLink` renders the link text as a plain `<span>` for a scheme outside DOMPurify's default allow list (mirrored as `ALLOWED_LINK_SCHEME`, pinned against DOMPurify in `Markdown.artifactLinks.test.ts`), and, since 2026-11-18, for an `${api.BASE_URL}/v1/files/` href whose id `getArtifactFile` refuses. Without the second case a malformed token, once strict decoding refused it, fell through to the default rendering as a raw `<a target="_blank">` that fails unauthenticated. It runs after the artifact case.
- A paragraph, a `text` token (list item) or an inline wrapper (`**[Download](...)**`) recurses into its children only when `hasSeamRenderedLink` finds such a link at any depth. Every other container keeps its single-HTML-blob rendering (the AC #7 bound).
- `Markdown` takes an optional `listedArtifactIds?: ReadonlySet<string>` and `MarkdownTokens` passes it to every nested render: recursed containers, `ListToken` (list items), blockquotes and a fenced `md` block's nested `Markdown`. Only `ChatAiMessage`'s answer passes it; every other caller (thoughts, tool output, other pages) passes nothing and behaves as before. An unlisted artifact keeps `getArtifactLink` non-null, so its container still recurses and the link never reaches the HTML blob as an anchor.
- A recursed paragraph renders as `<div className="my-2">` (a `<div>` chip inside `<p>` is invalid). Its children render inline (`inline` prop, `text` children through `getInlineProps`), so the sentence around a chip or a disarmed link stays on one line. *Post-run fix 5916d49b1.* Inline emphasis on the link itself is dropped on recursion.

### 4. The chip (`src/components/File.tsx`)
Shows the decoded, cleaned name, an uppercased extension badge from the last dot of the name (none for a dotfile), with the decoded MIME type as the badge's `title`, and a download button that calls `filesStore.downloadFile(fileId)`. **No size** (see AC #2 below). `File` gained only an optional `className`.

### 5. Downloads
- `filesStore.downloadFile` keeps its three branches (run 2 constraint): a bare UUID → `downloadFileStream` (name from `Content-Disposition`, EPMCDME-12266); a decodable id → `api.get('v1/files/<fileId>')`, saved under `artifactFileName(decoded name)`; anything else → `downloadFileStream`. The query is stripped only to decode, and is kept on the request.
- `downloadFileStream` builds the blob with the response `Content-Type` (falling back to its `type` argument, formerly the unused `_type`). This affects the UUID and fall-through branches and Browse files, not the artifact chip, which takes the `api.get` branch.
- `FILE_EXTENSIONS` gained `csv`, `tsv`, `md`, `xlsx`, `pdf` and `zip`, so a code block saved as csv is no longer `code.txt`, and the CodeBlock tooltip shows the real extension.

### 6. Shared chats
`resolveSandboxFileUrls` (`src/utils/sharedFileGrants.ts`) maps each bare token to the grant-bearing `token?share_token=…` from the server's grant map. The chip keeps the grant on `fileId`, so the download carries it. Workspace (`artifacts/…`) tokens need no change, because the path lives inside the base64. *Post-run change 1839536cd:* `SANDBOX_FILE_REGEXP` now also ends a token at a backtick, matching the back end's `SANDBOX_FILE_RE`. Base64 never contains a backtick, so no valid token changes.

### 7. Not-delivered and failure texts
The back end's "`<name>` stays on the MCP server and was not delivered" and publish-failure reasons are plain sentences with no link. They render as text with no chip and no anchor (pinned by a test, no code change).

### 8. Browse files (`AgentWorkspaceBrowserPopup.tsx`, `store/agentWorkspace.ts`)
No code change. It lists workspace files as a flat list of full paths (`artifacts/<turn-id>/<name>`) and downloads with `file_path` set to the full path and the file name set to the last segment (`agentWorkspaceStore.downloadSelectedFile`). Its first direct tests were added in run 4.

### 9. Files the turn published (`file_names`, review of 2026-11-13)
A chip used to appear only when the model wrote a well-formed `[name](sandbox:/v1/files/<token>)` link. A code-executor export arrives as a backticked URL (a codespan, not a link), so it got no chip. The back end now stores the encoded tokens of the files a turn published on the assistant message's `file_names` (codemie !4252), and the UI renders them.
- `chatHelpers.ts` maps the assistant item's `fileNames` onto the new `ChatMessage.generatedFileNames`. `ChatMessage.fileNames` stays the user's uploads, so `ChatUserMessage` and `quillModules` never see generated files. No other UI code reads an assistant message's `fileNames`.
- `ChatAiGeneratedFiles` renders one `File` chip (download, no preview) per token under the answer. Each token goes through `resolveSharedFileToken` (shared chats) and `getArtifactFile`, the same id validation and strict decoding the inline chip uses, so a token outside the accepted shape is skipped. A token whose `[..](sandbox:/v1/files/<token>)` link is already in the text is skipped, so a file is not shown twice.
- The markdown chip path is unchanged for older messages. A message with `generatedFileNames` and no text renders the chips (an empty answer lexes to no tokens).
- Live turn: `file_names` exist only after the turn is saved. The back end saves before it closes the stream and the UI drains the reader to `done`, so `chatGenerationStore._refreshTurnFiles` re-reads the conversation once the stream is finished (non-workflow chats) and `chatsStore.refreshTurnFiles` copies only `generatedFileNames` onto the live message. Decided 2026-11-13; no back-end change. A failed re-read is logged; the turn's inline artifact links then stay text until a reload (2026-11-18).
- **The list check (2026-11-18).** `ChatAiMessage` builds `listedArtifactIds` with `useMemo` over the snapshot's `currentChat.history` and `isWorkflow`: a `Set` of every message's `generatedFileNames` (so a link to an earlier turn's file keeps its chip), or `undefined` in a workflow chat, whose turns have no `file_names` (EPMCDME-16432). It is keyed on the valtio snapshot, whose identity changes when `refreshTurnFiles` writes; `currentChat` is the same proxy that `refreshTurnFiles` updates and that the share page sets, so the check covers live turns and shared chats. While a turn streams its artifact links are text; they become chips once its files are listed, without a reload.
- Why the UI and not the back end: every producer (MCP results, MCP-Connect `codemie_export_files`, code-executor export, image generation) publishes into `artifacts/<turn-id>/` and the save lists exactly those files, so `file_names` already says which links are real. Rejected: a back-end rewrite of undeliverable links (needs a storage `exists()` on S3, Azure and GCS, where `read_file` creates containers and buckets, plus storage I/O on every answer), and adding `file_names` to the `/model` response while stopping links to the model (changes the `/model` contract and every producer's tool text, and the UI would still need this check).

### Mismatches found while verifying against `d068529bd`
- **Story vs spec, Browse files**: story AC 7 says files appear "under their `artifacts/<turn-id>/` folders". The design (run 4 Behaviour 7, and the MR) is a flat list of full paths, not a folder tree. That was a product decision; the story text was not updated.
- **Run 4 Behaviour 5 and non-goal "no change to the share-grant regex"**: overturned after the run by 1839536cd (backtick terminator, review U4).
- **Run 4 citation**: the Browse-files download name is built in `src/store/agentWorkspace.ts:211-217` (`downloadSelectedFile`), not in `AgentWorkspaceBrowserPopup.tsx:211-217`. The listing is at `AgentWorkspaceBrowserPopup.tsx` ~246-265 as cited.
- **Run 1 AC 2/3** (save under `Content-Disposition`; `Content-Type` read in `downloadFileStream`) do not describe the artifact chip: it saves under the decoded name (run 2) through `api.get`, whose `Response.blob()` already carries the server type. The `downloadFileStream` change holds for the other branches.
- **Ticket AC #2** was amended on 2026-11-12 to "filename, MIME type, and a working clickable URL", and size is listed out of scope. The chip already matches.
- **Workflow non-goal**: runs and the story point to EPMCDME-10708, which is now Closed. The open follow-up for workflow tool nodes is EPMCDME-16432.

## Acceptance criteria

### Ticket (Jira, as of 2026-11-13; the back-end spec is the source of truth for the AC list)
1. A generated non-image artifact (xlsx, csv, json, zip, pdf) is ingested into user-facing downloadable storage. *(back end)*
2. The chat shows a Download chip with filename, MIME type and a working clickable URL. *(UI: met. Size was dropped from the AC on 2026-11-12 and is listed out of scope; it was removed from the chip after review U3.)*
3. The RADAR repro's `closed_positions_analysis.xlsx` downloads. *(both; UI: the chip shows and saves that exact name)*
4. With no blob, or when ingestion fails, no fake `filesystem:` link is shown. *(UI: disarmed links render as plain text; not-delivered texts have no link; since 2026-11-18 a model-invented or mangled files link renders as text too: a malformed token always, and a well-formed turn artifact unless `file_names` list it. Gap: tables and headings, see Risks.)*
5. xlsx, csv, json, zip and pdf are supported. *(UI: `FILE_EXTENSIONS`)*
6. Artifacts are scoped to opted-in servers that already reach `/home/codemie`. MCP-Connect exports and delivers links only from the folder of the person who made the call, `/home/codemie/u-<sha256(initiator id)[:16]>/c-<sha256(conversation_id)[:16]>`, so neither another user nor another conversation of the same user can supply a same-named file; the backend sends `user_context.id` as the outbound `user_id` and the `conversation_id`, so a global assistant or workflow is keyed on its runner, not its creator. A server that itself reaches `/home/codemie` can still read other users' folders (same uid). EPMCDME-16903 owns per-user OS identity and server processes, with MCP-Connect's process cache keyed by the initiator and each server's working folder created inside the user's folder at spawn; the intermediate-symlink check; and whether the `CODEMIE_EXPORT_FILES` opt-in stays. *(back end and MCP-Connect; UI: carries the share grant only in the one permitted shape, no UI change for isolation)*

Out of scope in the ticket: an explicit attach-file tool or API (the earlier AC #7/#8 are gone); file size on the response (separate ticket); a resource with only a uri, links that are not `file:///`, and plugin MCP tools until EPMCDME-16353.

### Story (run 4, `ui-workspace-artifact-links`, copied)
- Given an assistant message links an artifact stored at `artifacts/<turn-id>/closed_positions_analysis.xlsx`, when the message renders, then the download chip shows `closed_positions_analysis.xlsx`.
- Given two artifacts of one turn named `report.csv` and `report (2).csv`, when rendered, then each chip shows its own name and downloads its own file.
- Given a shared conversation is opened by a recipient, when they click a workspace artifact chip, then the file downloads (the share grant is carried as for other file links).
- Given an older message whose link uses the legacy `<uuid>_<name>` form, when rendered, then it still shows `<name>` and downloads (no regression).
- Given a file name containing path-traversal segments, control characters or backslashes, when rendered, then it is shown sanitised, and links outside the accepted token shape are still refused (no weakening of the EPMCDME-12556 guard).
- Given the assistant returns a "file stays on the MCP server and was not delivered" message or a publish-failure reason, when rendered, then it appears as plain text with no chip and no clickable link.
- Given "Browse files" is opened for a conversation with published artifacts, when the user navigates it, then the files appear under their `artifacts/<turn-id>/` folders with their real names and download correctly. *(Met as a flat list of full paths; see Mismatches.)*

### Spec additions (run 4)
- AC1: `artifacts/<turn>/closed_positions_analysis.xlsx` → chip `closed_positions_analysis.xlsx`, saved under that name.
- AC2: `artifacts/<turn>/report.csv` and `artifacts/<turn>/report (2).csv` each show their own name and download their own `fileId`.
- AC3: in a shared conversation, a workspace artifact chip downloads with `?share_token=` on its `fileId`.
- AC4: a legacy `<uuid>_<name>` token still shows and downloads as `<name>`.
- AC5: traversal segments, control characters or backslashes show sanitised; ids failing the token shape are refused; the existing guard tests pass.
- AC6: not-delivered and publish-failure texts render with no chip and no link.
- AC7: Browse files lists `artifacts/<turn>/<name>` and downloads one with `file_path` = full path and file name = `<name>`.
- Tests: `artifactLink.test.ts`, `MarkdownTokens.artifactChip.test.tsx`, `files.test.ts` and `sharedFileGrants.test.ts` gain path-shaped and `name (2).ext` fixtures; a new `AgentWorkspaceBrowserPopup` test; tests pinning a whole `/`-containing name are flipped on purpose.

### Spec additions (review 2026-11-13)
- A message whose assistant item carries `fileNames` shows one download chip per file under the answer, and `ChatMessage.fileNames` still holds only the uploads.
- A file whose `sandbox:` link is already a chip in the text is not shown again; a file referenced only by a backticked URL is shown.
- In a shared chat each chip's `fileId` carries the grant from `resolveSharedFileToken`.
- A message with files and no text renders the chips.
- When a live turn finishes, its files appear without a reload.

### Spec additions (follow-up 2026-11-18, unlisted artifact links)
- An inline link whose token is not well-formed never shows a chip or an anchor; it renders as text (including nested in `**bold**`, a list item or a loose list item).
- An inline link to a turn artifact shows a chip only when the conversation's `file_names` list its token, in a live chat and in the share view (compared without `?share_token=`).
- Every genuine chip stays: listed artifacts from any turn, legacy `<uuid>_` and `mcp_images` links, workspace files outside `artifacts/`, workflow chats (no list check, well-formedness still applies).
- A live turn's artifact links switch from text to chips once its files are listed, without a reload.
- `ChatAiGeneratedFiles` skips a malformed listed token.
- Tests:
  - `artifactLink.test.ts`: `decodeArtifactId` accepts a new-format, an emoji-name (code-point lengths) and a legacy token, and refuses the evidence tokens from `53fea99f`, `d605145e` and `8956ef43`, a midway legacy fallback, 2 and 4 parts, a short final segment, a 4-part legacy token, stripped padding and a leading-zero length; `isTurnArtifact` only for `workspace-*` + `artifacts/`;
  - `MarkdownTokens.artifactChip.test.tsx`: listed → chip; unlisted → text with no anchor (alone, in bold, in a list item); listed with a share grant → chip that downloads with the grant; unlisted legacy and non-`artifacts/` workspace links → chip; no set → as before; a malformed token → text alone, in a loose list item and in bold;
  - `ChatAiMessage.artifactLinks.integration.test.tsx` (real valtio, `Markdown` and `ChatAiGeneratedFiles`): listed on this message, listed on an earlier message, unlisted, workflow chat, files arriving through a store write, malformed listed token.
- Evidence: the saved history of the 123 round-3 conversations holds 242 inline links. 228 are listed in `file_names` and all their blobs exist; 14 are unlisted and only one blob exists (`7de2b847`, where the model put another file's MIME/length header on the real xlsx token; the correct token is listed, so its chip shows under the answer). The rule keeps all 228 chips and renders the 14 as text.

### Still-valid criteria from earlier runs
- Only rewritten sandbox artifact URLs become chips; https, relative and titled links render as before, including `target="_blank"` (run 1, AC 5).
- `filesystem:`, `file:` and `javascript:` links render as plain text with no anchor; a test pins DOMPurify stripping them under this repo's `SANITIZE_CONFIG` (run 1, AC 6–8).
- A test pins the `sandbox:/v1/files/` → `${api.BASE_URL}/v1/files/` rewrite (run 1, AC 10).
- Tables, code blocks, mermaid, lists, blockquotes, ordinary paragraphs and inline images render unchanged (run 1, AC 11–12).
- A partially streamed or malformed artifact link renders without throwing and issues no network request (run 1, AC 14).
- Leading-only uuid strip: `report.csv` and `my_<uuid>_x.txt` are shown and saved unchanged; `fileId` is never altered; the bare-UUID branch still uses `Content-Disposition` (run 2, AC 4–7).
- The `share_token` query rules (run 3, AC 1–5): a valid `?share_token=AbC123` is kept on `fileId`; `?token=evil`, an empty value, extra or reordered parameters, `%`/`+`/`#`, a bare `?` and `?SHARE_TOKEN=` return `null`; a bad bare token is refused even with a valid grant.

## Non-goals
- File size in the chip (review U3, 2026-10-26: small value, two workspace requests per chat page, and still no coverage for shared chats, legacy, per-user or chat-mode workflow artifacts).
- Any back-end change (`codemie` MR !4252 owns it).
- Upload, edit or delete UI for artifacts; a folder tree or any other visual change to Browse files.
- Workflow output rendering (EPMCDME-16432; EPMCDME-10708 is Closed).
- Switching the encoded-link download to the server's `Content-Disposition`.
- One `artifactToken` module for the link format, and merging the two `decodeFileName` helpers (`utils/utils.ts` throws, `utils/helpers.ts` returns `[]`): EPMCDME-16355, accepted by the reviewer as a follow-up. Since 2026-11-18 the chip uses a third, strict decoder (`decodeArtifactId`); `filesStore.downloadFile` still uses `helpers.decodeFileName` for the saved name.
- Back-end, MCP-Connect, `/bridge` or `/model` changes for invented links; API clients that read the answer text directly; lowering how often the model invents links (2026-11-18).
- Any query shape other than a single `share_token`; repairing or normalising ids.
- `renderer.link`, `SANITIZE_CONFIG`, a custom `ALLOWED_URI_REGEXP`, a `HEAD`/metadata request at render time.
- `markdown2html` (copy/export) parity: it does not resolve sandbox URLs or grants.
- Thought-borne artifact links (`ThoughtMessage` renders most tool thoughts as plain text). The back end no longer grants thought-only tokens (its run 4, D5).

## Risks
- **Trust boundary.** `fileId` is concatenated into an authenticated URL. The only widening is the anchored `share_token` query; the workspace path lives inside the decoded name, so the id regexes are unchanged. A reviewer `/sanity` is requested on the MR.
- **Streaming warning.** The MR reports React's `<div> cannot be a descendant of <p>` during streaming (a reload is clean). Not re-checked after 5916d49b1.
- **Name sources can disagree.** The chip and the encoded-link download use the decoded name; the plain-link fallback and the UUID branch use the server's `Content-Disposition`. The plain-link fallback (no chip) relies on cookie auth plus the URL grant and fails in LOCAL header-auth mode.
- **Same basename across turns.** Two turns' `report.csv` both show `report.csv`; only the turn folder (visible in Browse files) tells them apart.
- **Duplicate link-format code** (EPMCDME-16355) can drift from the back end again; 1839536cd realigned the terminators.
- **Tables and headings** still render a files link inside them through `renderer.link` as `<a href=…/v1/files/… target="_blank">`, listed, unlisted or malformed alike. This predates the 2026-11-18 change, which does not reach them, so AC #4 is unmet for a link in a table cell or heading. `ChatAiGeneratedFiles`' inline-link regex also hides a listed file linked only inside a table. Follow-up candidate.
- **A turn that never calls `_refreshTurnFiles`** (stopped, aborted, failed): its genuine inline artifact links stay text until a reload; its chips under the answer were already missing. Deferred.
- **Local history saved before `file_names` existed** (before 2026-11-13) shows its artifact links as text. Production has no such history while !4252 is unmerged.
- **A model that swaps the owner away from `workspace-*`** keeps a chip that 404s: the list check covers turn artifacts only, so that no genuine non-turn file loses its chip.
- **Pre-existing, deferred in run 1:** `downloadFile` routes ids by shape and relies on `atob` throwing; `downloadCodeAsFile` hardcodes `text/plain`; the React key scheme can collide across recursed siblings.

---

## Run history and superseded decisions

| Run | Original dir | Scope | Status |
|---|---|---|---|
| 1 | `2026-09-21-epmcdme-14735-downloadable-artifacts-ui` (this dir) | Chip at the token seam, disarmed links, `Content-Type`, `FILE_EXTENSIONS` | Mostly holds; naming and id rules refined by runs 2–4 |
| 2 | `2026-09-23-epmcdme-14735-ui-artifact-filename` (removed) | Strip the storage `{uuid}_` prefix from chip label and saved name | Holds, wrapped by run 4's basename step |
| 3 | `2026-10-02-epmcdme-14735-ui-artifact-auth-gaps` (removed) | Accept the `share_token` grant on chip links | Holds |
| 4 | `2026-10-22-ui-workspace-artifact-links` (removed) | Workspace `artifacts/<turn>/<name>` names: last segment, one helper | **Current**, plus the commits after it |
| Follow-up | 2026-11-18, executing-plans (design doc and plan kept out of git) | AC #4: no chip or anchor for invented or mangled files links | **Current** |

**Run 1 (2026-09-21)** put the `File` chip at the `MarkdownTokens` dispatch seam instead of `renderer.link`, rendered disarmed links as text, built the downloaded blob with `Content-Type`, added `FILE_EXTENSIONS` entries, and pinned DOMPurify and the `sandbox:` rewrite by tests.
→ Still valid: the seam, the disarmed-link rule, no `SANITIZE_CONFIG` change, the `Content-Type` blob, `FILE_EXTENSIONS`, the AC #7 bound.
→ Superseded within the run: the `{uuid}_{basename}` URL assumption (the segment is base64 of `[mime, owner, name]`, fixed in a8f09c6f5); stripping leading `/`/`\` from the id (now validated and refused, d5e5da941); recursion only for paragraphs (now also `text` and inline wrappers, 7a9fe49cf, ea2b70dc3); a paragraph chip inside `<p>` (now a `<div>`, c06662fbd); "MIME only at download" (decoded pre-click).
→ Superseded later: AC 2 "saved under the `Content-Disposition` name" (run 2: the decoded, stripped name); the flex-column paragraph layout (5916d49b1: inline).

**Run 2 (2026-09-23)** added `stripUuidPrefix` next to `sanitizeFileName` and applied it to the chip label and the base64 branch's `a.download`, without touching `fileId` or the branch order.
→ Still valid: leading-only strip, the `|| name` fallback, never altering `fileId`, three branches kept.
→ Superseded: the two call sites now go through `artifactFileName` (run 4). Its premise that every artifact is stored `{uuid}_{basename}` was narrowed to uploads and legacy artifacts (ea0188c29, review U5).

**Run 3 (2026-10-02)** let `getArtifactLink` accept exactly one `share_token=<alnum>` query and keep it on `fileId`, after EPMCDME-12708 changed shared-chat downloads.
→ Still valid: the whole query rule set.
→ Overtaken by back-end changes: its recorded findings "Rule E grants any token without an ownership check" and "thought-borne grants never become chips" — the back end's run 4 bounded Rule E by ownership and dropped thought scanning.

**Run 4 (2026-10-22)** answered review U1/U2: the decoded name may be a workspace path, so `artifactFileName` takes its last segment before the uuid strip and sanitising, at both naming sites. It added tests for share grants, failure texts and Browse files.
→ Still valid: everything except the items below.
→ Overturned after the run: "no change to `sharedFileGrants.ts` / the share-grant regex" (1839536cd).

**After run 4 (2026-10-23 to 2026-10-27, review rounds):**
- 5916d49b1 — text around a chip stays one sentence (inline children, `inline-flex` chip).
- 1839536cd — a backtick ends a sandbox token, like the back end (U4; the module unification is EPMCDME-16355).
- ea0188c29 — the uuid-prefix note now covers uploads and legacy artifacts only (U5).
- c3b211e3e — the chip label and the saved name are asserted equal for workspace paths (U2).
- 2bbe54da8, aa27813cd — `formatFileSize` moved to shared helpers; the owner's chip showed the workspace size and the MIME tooltip (U3).
- 56a7f1cd3 — `AnalyticsPage.test.tsx` enables the usage-attribution flag so the built-in tab redirect test stops racing (unrelated flake fix).
- d068529bd — size removed again per review (U3, 2026-10-26): `ArtifactChip.tsx`, `store/artifactSizes.ts`, the `ChatAiMessage` context and the `formatFileSize` move are gone. The MIME tooltip stays.

**Follow-up 2026-11-18 (unlisted artifact links, AC #4).** Evidence and the rejected back-end approaches are in sections 1, 3, 9 and the spec additions above.
- 39a2b190f — strict `decodeArtifactId`, `isTurnArtifact`.
- 1fe4bd772 — `listedArtifactIds` through `Markdown`, `MarkdownTokens` and `ListToken`; an unlisted turn artifact renders as text (`renderArtifactToken`).
- ee18886f6 — `ChatAiMessage` builds the set from the conversation's `generatedFileNames`.
- 6de4a2c9f — found in the browser check: a files link with an unusable token is a disarmed link (text), not a raw anchor.
- e82242108 — from the final review: refuse unpadded tokens and leading-zero lengths.
- b0df683a1 — unrelated: the `onSuccessHeaders` test in `api.test.ts` still used the two-argument `mockFetchResponse` after the main merge (02230d8a8) and failed the pre-commit `tsc`.
- Verified: lint, typecheck, unit (928 files, 9880 tests) and integration (84 files, 913 tests) green. Browser, owner view: `53fea99f` and `2d21b0be` show no inline chip and their listed `.py` under the answer; `d605145e` keeps the real xlsx chip; `7de2b847` shows csv and json inline, the mangled xlsx link as text and the xlsx chip under the answer; no `/v1/files/` anchor in any. Share view of `53fea99f` (`SnpBHrmfO8ru`) matches. A live turn (`83b5d775`) showed text and no anchor while streaming, then three inline chips without a reload. Not checked: a download click in the share view; a second share link.
- Deferred from review: the stopped-turn gap and the table/heading gap (Risks); no tests for the set reaching blockquotes, fenced `md` blocks, ordered and task lists; the bare-id split is repeated in `renderArtifactToken`; disarmed text shows a label's raw markdown (`**x**`).
