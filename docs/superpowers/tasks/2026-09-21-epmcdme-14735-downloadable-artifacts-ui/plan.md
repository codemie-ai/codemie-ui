# EPMCDME-14735 — Implementation plans (UI, runs 1–4, consolidated)

One section per sdlc run, kept as written. Line numbers and symbols reflect each run's baseline; later runs supersede earlier ones. Current design: `spec.md`.

---

# Run 1 — `2026-09-21-epmcdme-14735-downloadable-artifacts-ui`

## EPMCDME-14735 — Downloadable chat artifacts (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `sandbox:` artifact links in assistant messages as the existing `File` download chip, and strip the fake affordance from links DOMPurify disarms.

**Architecture:** Add an artifact-link case at the `MarkdownTokens.tsx` token-dispatch seam (mounting real React, not an HTML string), with `paragraph` recursing into `token.tokens` only when the paragraph contains an artifact link. Reuse `src/components/File.tsx` as the chip and the existing `filesStore.downloadFile` → `api.downloadFileStream` transport. MIME is read from the `Content-Type` of the response that already supplies `Content-Disposition`.

**Tech Stack:** React 18, TypeScript 5, marked, DOMPurify, Valtio, Vitest (`unit` and `integration` projects), React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-21-epmcdme-14735-downloadable-artifacts-ui/spec.md`

### Global Constraints

- **Seam is `MarkdownTokens.tsx`.** Do **not** implement via `renderer.link` — it returns an HTML string and would force widening `SANITIZE_CONFIG`; `security-patterns.md` § HTML sinks forbids it ("Never introduce a fourth shape").
- **Do not change `renderer.link` (`Markdown.utils.ts:131-134`) or `SANITIZE_CONFIG` (`Markdown.sanitize.ts:41`).**
- **No new chip component.** Extend `src/components/File.tsx` minimally.
- **No new network request at render time; no `HEAD`/metadata helper in `api.ts`.**
- **No back-end change. No `FILE_EXTENSIONS` work** — already done (uncommitted) on this branch.
- **`downloadFileStream` is shared by user-message attachments and datasources.** The `Content-Type` change must be strictly additive; the filename path is untouched.
- Trust boundary: any name rendered in the chip or placed in a `download` attribute goes through the existing `sanitizeFileName` (`api.ts:69`); strip leading `/` and `\` runs before concatenating a segment into a URL.
- Copyright header (14 lines, Apache-2.0) on every new source file. `cn()` from `@/utils/utils`; semantic Tailwind tokens only. Icon buttons carry `aria-label`.
- Commit per task using the repository's existing convention (ticket key `EPMCDME-14735` required).
- Test commands: `npm run test:unit`, `npm run test:integration`. Run `npm ci` before trusting any gate result.

---

#### Task 1: Pin the `sandbox:` rewrite and DOMPurify's default scheme deny

Covers spec criteria 8 and 10. Pure test task — pins the two upstream behaviours the whole feature rests on, before anything can move them.

**Files:**
- Create: `src/components/markdown/__tests__/Markdown.artifactLinks.test.ts`

**Interfaces:**
- Consumes: `getMarkdownTokens`, `sanitizeHtmlWithImageAllowList` (existing exports).
- Produces: nothing consumed by later tasks.

**Test-first: yes — a test asserting `getMarkdownTokens('[Download](sandbox:/v1/files/abc)')` yields a link token whose href is `https://api.example.com/v1/files/abc`, plus a test asserting `sanitizeHtmlWithImageAllowList` strips `filesystem:`, `file:` and `javascript:` hrefs while keeping `https:`.**

- [ ] **Step 1: Write the failing test**

Mock `@/utils/api` with a `BASE_URL` fixture exactly as `Markdown.utils.test.ts:21-32` does (`vi.hoisted` + `vi.mock('@/utils/api', () => ({ default: mockApi }))`), and mock `@/store/appInfo` the same way.

```ts
describe('getMarkdownTokens — sandbox artifact rewrite', () => {
  it('rewrites sandbox:/v1/files/ to the API base URL before lexing', () => {
    const [token] = getMarkdownTokens('[Download](sandbox:/v1/files/abc_report.csv)')
    expect(JSON.stringify(token)).toContain('https://api.example.com/v1/files/abc_report.csv')
    expect(JSON.stringify(token)).not.toContain('sandbox:')
  })
})

describe('sanitizeHtmlWithImageAllowList — default scheme deny', () => {
  it.each(['filesystem:/tmp/x.xlsx', 'file:///tmp/x', 'javascript:alert(1)'])(
    'strips the href for %s',
    (href) => {
      expect(sanitizeHtmlWithImageAllowList(`<a href="${href}">D</a>`)).not.toContain('href')
    }
  )

  it('keeps an https href', () => {
    expect(sanitizeHtmlWithImageAllowList('<a href="https://x/y">D</a>')).toContain('href="https://x/y"')
  })
})
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:unit -- Markdown.artifactLinks`
Expected: PASS — these pin current behaviour. If the rewrite test fails, the `BASE_URL` mock is not wired; fix the mock, not the source.

- [ ] **Step 3: Commit**

Commit the new test file only. No source change in this task.

---

#### Task 2: Artifact-link predicate and filename derivation

The pure logic the render seam needs, isolated so it is testable without React. Covers the security half of criterion 9 and the malformed-link half of criterion 14.

**Files:**
- Create: `src/components/markdown/artifactLink.ts`
- Test: `src/components/markdown/__tests__/artifactLink.test.ts`

**Interfaces:**
- Consumes: `api.BASE_URL` (`src/utils/api.ts:143`), `sanitizeFileName` (`src/utils/api.ts:69`).
- Produces:
  - `getArtifactLink(token: MarkdownToken): { fileId: string; fileName: string } | null` — returns `null` for anything that is not a `link` token whose `href` starts with `` `${api.BASE_URL}/v1/files/` ``.
  - `isArtifactParagraph(token: MarkdownToken): boolean` — true when any child token satisfies `getArtifactLink`.

**Test-first: yes — `getArtifactLink` returns `{ fileId: 'uuid_report.csv', fileName: 'report.csv' }` for a rewritten artifact href, returns `null` for `https://elsewhere.com/x`, for a partially-streamed `[Download](sandbo` text token and for a `link` token with an undefined href, and sanitizes a filename containing `/`, `\`, a leading `/` and control characters.**

- [ ] **Step 1: Write the failing test**

```ts
import { getArtifactLink, isArtifactParagraph } from '../artifactLink'

const linkToken = (href: string) => ({ type: 'link', raw: '', href, text: 'Download' }) as any

describe('getArtifactLink', () => {
  it('extracts the file id and the uuid-stripped basename', () => {
    const uuid = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'
    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${uuid}_report.csv`)))
      .toEqual({ fileId: `${uuid}_report.csv`, fileName: 'report.csv' })
  })

  it('returns null for a non-artifact href', () => {
    expect(getArtifactLink(linkToken('https://elsewhere.com/x'))).toBeNull()
  })

  it('returns null for a non-link token', () => {
    expect(getArtifactLink({ type: 'text', raw: '[Download](sandbo' } as any)).toBeNull()
  })

  it('returns null for a link token with no href', () => {
    expect(getArtifactLink({ type: 'link', raw: '' } as any)).toBeNull()
  })

  it('sanitizes a traversal-shaped filename', () => {
    const result = getArtifactLink(
      linkToken('https://api.example.com/v1/files/x_%2F..%2Fetc%2Fpasswd')
    )
    expect(result?.fileName).not.toMatch(/[/\\]/)
    expect(result?.fileName.startsWith('/')).toBe(false)
  })

  it('never lets a decoded segment escape the files path', () => {
    expect(getArtifactLink(linkToken('https://api.example.com/v1/files/'))).toBeNull()
  })
})

describe('isArtifactParagraph', () => {
  it('is true only when a child token is an artifact link', () => {
    expect(isArtifactParagraph({ type: 'paragraph', raw: '', tokens: [linkToken('https://api.example.com/v1/files/a_b.csv')] } as any)).toBe(true)
    expect(isArtifactParagraph({ type: 'paragraph', raw: '', tokens: [linkToken('https://x.com/y')] } as any)).toBe(false)
    expect(isArtifactParagraph({ type: 'paragraph', raw: '' } as any)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- artifactLink`
Expected: FAIL — module `../artifactLink` does not exist.

- [ ] **Step 3: Write the implementation**

New file. Derive the segment after the `/v1/files/` prefix, `decodeURIComponent` it inside a try/catch (a malformed escape must not throw), strip leading `/` and `\` runs, take the basename, strip a leading `{uuid}_` prefix with the same UUID pattern `store/files.ts:88` uses, then pass the display name through `sanitizeFileName`. Return `null` whenever the segment or the resulting name is empty. `isArtifactParagraph` normalizes `token.tokens` to an array (it is typed `MarkdownToken | MarkdownToken[]` at `Markdown.utils.ts:61`) and `.some`s over `getArtifactLink`.

Keep `fileId` as the raw (non-decoded, prefix-stripped) segment — it is what `filesStore.downloadFile` must receive, and the authoritative display name still comes from `Content-Disposition` at download time.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- artifactLink`
Expected: PASS.

- [ ] **Step 5: Commit**

---

#### Task 3: Carry `Content-Type` onto the downloaded blob

Covers spec criteria 3, 4 and 13. Strictly additive change inside the shared download path.

**Files:**
- Modify: `src/utils/api.ts:258-309` (`downloadFileStream`)
- Test: `src/utils/__tests__/api.downloadFileStream.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `downloadFileStream(url, type?, fileName?)` — the saved blob's `type` is the response `Content-Type`, or the `type` argument when the header is absent, or `''`. Signature and return type (`Promise<boolean>`) unchanged.

**Test-first: yes — a test mocking `fetch` to return a body stream plus `content-type: text/csv` and `content-disposition: attachment; filename="report.csv"`, asserting the blob handed to `saveAs` has `type === 'text/csv'` and the filename is still `report.csv`; plus a test with no `content-type` header asserting the download still succeeds.**

- [ ] **Step 1: Write the failing test**

Mock `file-saver` with `vi.mock('file-saver', () => ({ saveAs: vi.fn() }))` and capture the blob argument.

```ts
it('gives the saved blob the response Content-Type', async () => {
  mockFetch({ 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="report.csv"' })
  await api.downloadFileStream('v1/files/abc')
  const [blob, name] = vi.mocked(saveAs).mock.calls[0]
  expect(blob.type).toBe('text/csv')
  expect(name).toBe('report.csv')
})

it('degrades gracefully when Content-Type is absent', async () => {
  mockFetch({ 'content-disposition': 'attachment; filename="report.csv"' })
  await expect(api.downloadFileStream('v1/files/abc')).resolves.toBe(true)
  expect(vi.mocked(saveAs).mock.calls[0][1]).toBe('report.csv')
})

it('leaves an explicitly passed fileName untouched (existing callers)', async () => {
  mockFetch({ 'content-type': 'application/pdf' })
  await api.downloadFileStream('v1/files/abc', undefined, 'caller-chosen.pdf')
  expect(vi.mocked(saveAs).mock.calls[0][1]).toBe('caller-chosen.pdf')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- api.downloadFileStream`
Expected: FAIL on the first case — `blob.type` is `''`, because `new Response(stream).blob()` (`api.ts:294`) produces an untyped blob.

- [ ] **Step 3: Write the implementation**

At `api.ts:294`, read `response.headers.get('content-type')` and construct the blob with it rather than relying on the `Response` wrapper:

```ts
const contentType = response.headers.get('content-type') ?? _type ?? ''
const blob = new Blob([await new Response(stream).arrayBuffer()], { type: contentType })
```

Adopt the previously unused `_type` parameter as the fallback and rename it to `type` (with its JSDoc/comment updated), or leave it unused — either resolves the overlap; pick one and do not leave a half-adopted parameter. Do not touch lines 296-301 (the filename path).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- api.downloadFileStream`
Expected: PASS.

Then run the existing callers' suites to confirm criterion 13:
Run: `npm run test:unit -- File ChatUserMessage`
Expected: PASS, unchanged.

- [ ] **Step 5: Commit**

---

#### Task 4: File-type indicator on the chip

Covers spec criterion 1's "uppercased extension" half. Minimal extension of the existing chip; no new component.

**Files:**
- Modify: `src/components/File.tsx:108-113` (`fileContent`)
- Test: `src/components/__tests__/File.test.tsx` (extend)

**Interfaces:**
- Consumes: `FileMetadata` (`File.tsx:30-36`) — unchanged shape.
- Produces: `File` renders an uppercased extension badge beside the name, derived from `file.fileName`, and renders nothing extra when the name has no extension.

**Test-first: yes — a test asserting `<File file={{ fileName: 'report.csv' }} />` renders the text `CSV`, and that `<File file={{ fileName: 'report' }} />` renders no badge and does not crash.**

- [ ] **Step 1: Write the failing test**

Append to the existing `File.test.tsx` (its store and SVGR mocks at `:22-71` already cover this).

```tsx
it('shows the uppercased extension beside the name', () => {
  render(<File file={{ fileId: 'id', fileName: 'report.csv' }} withDownload />)
  expect(screen.getByText('CSV')).toBeInTheDocument()
  expect(screen.getByText('report.csv')).toBeInTheDocument()
})

it('renders no extension badge for an extension-less name', () => {
  render(<File file={{ fileId: 'id', fileName: 'report' }} withDownload />)
  expect(screen.queryByText('REPORT')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- File.test`
Expected: FAIL — "Unable to find an element with the text: CSV".

- [ ] **Step 3: Write the implementation**

In `fileContent` (`File.tsx:108-113`), add a `<span>` after the name div rendering the uppercased substring after the final `.` when one exists and is not the first character. Use existing semantic tokens (`text-text-quaternary`, `shrink-0`) and `cn()`; keep it out of the truncation container so the name still truncates.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- File.test`
Expected: PASS, including the pre-existing cases.

- [ ] **Step 5: Commit**

---

#### Task 5: Render artifact links as chips at the token seam

The core change. Covers spec criteria 1, 2, 5, 12 and the render half of 14.

**Files:**
- Modify: `src/components/markdown/MarkdownTokens.tsx:70-110`
- Test: `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx` (create)

**Interfaces:**
- Consumes: `getArtifactLink`, `isArtifactParagraph` (Task 2); `File` + `FileMetadata` (Task 4); `filesStore.downloadFile` (`store/files.ts:87`).
- Produces: `MarkdownTokens` renders `<File file={{ fileId, fileName }} withDownload />` for an artifact `link` token, and recurses into `token.tokens` for a `paragraph` that `isArtifactParagraph` accepts.

**Test-first: yes — a test rendering `<Markdown content="[Download](sandbox:/v1/files/{uuid}_report.csv)" />` and asserting the chip shows `report.csv` and `CSV` with a "Download file" button, that clicking it calls `filesStore.downloadFile` with `{uuid}_report.csv`, that a plain `https://` link still renders an `<a target="_blank">`, and that a paragraph of ordinary prose still renders as a single `<p>`.**

- [ ] **Step 1: Write the failing test**

Mock `valtio` + `@/store/files` with the `vi.hoisted` template from `File.test.tsx:22-41`, and `@/utils/api` with the `BASE_URL` fixture from `Markdown.utils.test.ts:21-32`.

```tsx
const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

it('renders an artifact link as a download chip', () => {
  render(<Markdown content={`[Download](sandbox:/v1/files/${UUID}_report.csv)`} />)
  expect(screen.getByText('report.csv')).toBeInTheDocument()
  expect(screen.getByText('CSV')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('downloads through filesStore with the raw file id', async () => {
  render(<Markdown content={`[Download](sandbox:/v1/files/${UUID}_report.csv)`} />)
  await userEvent.click(screen.getByLabelText('Download file'))
  expect(mockFilesStore.downloadFile).toHaveBeenCalledWith(`${UUID}_report.csv`)
})

it('leaves an ordinary link untouched', () => {
  const { container } = render(<Markdown content="[site](https://example.com)" />)
  expect(container.querySelector('a[target="_blank"]')).not.toBeNull()
})

it('leaves an ordinary paragraph as one <p>', () => {
  const { container } = render(<Markdown content="just some **prose** here" />)
  expect(container.querySelectorAll('p')).toHaveLength(1)
  expect(container.querySelector('strong')).not.toBeNull()
})

it('does not throw on a partially-streamed link', () => {
  expect(() => render(<Markdown content="[Download](sandbo" />)).not.toThrow()
  expect(mockFilesStore.downloadFile).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- MarkdownTokens.artifactChip`
Expected: FAIL — "Unable to find an element with the text: report.csv"; the paragraph currently renders as one HTML blob.

- [ ] **Step 3: Write the implementation**

Two edits inside the `normalizedTokens.map` callback:

1. Before the `inlineTokens.includes(token.type)` branch (`:73`), add the artifact case:

```tsx
const artifact = getArtifactLink(token)
if (artifact) {
  return (
    <File
      key={key}
      file={{ fileId: artifact.fileId, fileName: artifact.fileName }}
      withDownload
    />
  )
}
```

2. Replace the `paragraph` branch (`:87`) so a paragraph containing an artifact link recurses instead of collapsing to one blob, copying the shape the `blockquote` branch (`:91-97`) and `ListToken.tsx:26-39` already use:

```tsx
if (token.type === TOKEN_TYPES.paragraph) {
  if (isArtifactParagraph(token)) {
    return (
      <p key={key}>
        <MarkdownTokens tokens={token.tokens} />
      </p>
    )
  }
  return <p key={key} {...getBlockProps(token)} />
}
```

Every other paragraph keeps its current single-blob rendering — that scoping is what bounds the AC #7 blast radius.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- MarkdownTokens.artifactChip`
Expected: PASS.

- [ ] **Step 5: Commit**

---

#### Task 6: Strip the fake affordance from disarmed links

Covers spec criteria 6 and 7 (AC #4). Depends on Task 5's paragraph recursion being in place.

**Files:**
- Modify: `src/components/markdown/MarkdownTokens.tsx` (the `link` handling added in Task 5), and `src/components/markdown/artifactLink.ts` if a shared predicate is the smaller change
- Test: `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx` (extend)

**Interfaces:**
- Consumes: `getArtifactLink` (Task 2), the `paragraph` recursion (Task 5).
- Produces: `MarkdownTokens` renders a disarmed link's text as plain text — no `<a>`, no `href`, no clickable element.

**Test-first: yes — a test rendering `[Download](filesystem:/tmp/x.xlsx)` asserting the text `Download` is present while `container.querySelector('a')` is null and `screen.queryByRole('button')` is null; same for `file:` and `javascript:` hrefs.**

- [ ] **Step 1: Write the failing test**

```tsx
it.each(['filesystem:/tmp/x.xlsx', 'file:///tmp/x', 'javascript:alert(1)'])(
  'renders %s as plain text with no affordance',
  (href) => {
    const { container } = render(<Markdown content={`[Download](${href})`} />)
    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  }
)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- MarkdownTokens.artifactChip`
Expected: FAIL — an `<a>` element is present (href-less, but still link-styled).

- [ ] **Step 3: Write the implementation**

Add a `link`-token branch alongside the artifact case: when the token is a `link` whose href DOMPurify would strip, return `<span key={key}>{token.text}</span>` instead of falling through to `getInlineProps`. Decide denial with a predicate mirroring DOMPurify's default `ALLOWED_URI_REGEXP` — allow relative hrefs and the `http:`/`https:`/`mailto:`/`tel:`/`ftp:` family, deny everything else. Do **not** add a custom `ALLOWED_URI_REGEXP` to `Markdown.sanitize.ts`; Task 1's test is what keeps the predicate and DOMPurify's default in agreement.

This branch must run **after** the artifact case, so rewritten `https:` artifact URLs never reach it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- MarkdownTokens.artifactChip`
Expected: PASS, including Task 5's "leaves an ordinary link untouched" case.

- [ ] **Step 5: Commit**

---

#### Task 7: AC #7 regression sweep

Covers spec criteria 11 and 12. Confirms the markdown tree still renders every other token type after a Valtio store dependency entered it, and that the image guard passes **unmodified**.

**Files:**
- Test: `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx` (extend)
- Modify (only if a suite now needs the store mock): existing `src/components/markdown/__tests__/*.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4-6.
- Produces: nothing.

**Test-first: yes — a test asserting a document containing a table, a fenced code block, a mermaid block, an ordered list, a blockquote and an inline image renders each of them, alongside an artifact link in the same message.**

- [ ] **Step 1: Write the failing test**

One test rendering a mixed document and asserting each token type's marker survives (a `<table>`, the `CodeBlock` output, the `MermaidDiagram` stub, `<ol><li>`, `<blockquote>`, and an `<img>` or the blocked-image badge), plus the chip.

- [ ] **Step 2: Run the whole markdown suite**

Run: `npm run test:unit -- src/components/markdown`
Expected: PASS. If a pre-existing suite now fails on `useSnapshot`, add the `vi.mock('valtio', ...)` + `vi.mock('@/store/files', ...)` pair from `File.test.tsx:33-41` to that suite — mock setup only.

- [ ] **Step 3: Confirm the image guard is untouched**

Run: `git diff --stat src/components/markdown/__tests__/Markdown.imageAllowList.integration.test.tsx`
Expected: empty output. Criterion 11 requires this file pass **unmodified**; if it needed edits, the change reached the image path and must be re-scoped.

Run: `npm run test:integration -- Markdown.imageAllowList`
Expected: PASS.

- [ ] **Step 4: Commit**

Commit the new regression test plus any mock-only additions to existing suites.

---

#### Task 8: Commit the branch's pre-existing file-extension work

The `FILE_EXTENSIONS` / `CodeBlock` tooltip fix and its test are already implemented and uncommitted on this branch. No implementation work — this task only lands them.

**Files:**
- Commit: `src/components/CodeBlock/fileExtensions.ts`, `src/components/CodeBlock/CodeBlock.tsx`, `src/components/CodeBlock/__tests__/fileExtensions.test.ts`

**Test-first: no — the test (`fileExtensions.test.ts`, 8 passing assertions) already exists on the branch.**

- [ ] **Step 1: Confirm the existing test passes**

Run: `npm run test:unit -- fileExtensions`
Expected: PASS, 8 assertions.

- [ ] **Step 2: Commit the three files**

Do not modify them.

---

### Self-review notes

**Spec coverage:** criterion 1 → Tasks 4+5; 2 → Task 5; 3-4 → Task 3; 5 → Task 5; 6-7 → Task 6; 8 → Task 1; 9 → Task 2; 10 → Task 1; 11-12 → Task 7; 13 → Task 3 step 4; 14 → Tasks 2+5.

**Negative constraints** (re-scanned from spec § Approach, § Non-goals and the ticket's AC #7):
- *No `renderer.link` / `SANITIZE_CONFIG` change* — honored by Task 5 (React seam) and Task 6 (predicate in the React path, explicitly not a custom `ALLOWED_URI_REGEXP`). No task edits `Markdown.utils.ts:131-134` or `Markdown.sanitize.ts:41`.
- *No fourth HTML sink shape* — every new render path mounts React; no task adds a `dangerouslySetInnerHTML`.
- *No new chip component* — Task 4 extends `File.tsx`; no task creates one.
- *No `HEAD`/metadata helper, no per-link render-time request* — Task 3 reads a header off the existing response; Task 2's predicate is pure; Task 5's chip only fetches on click.
- *No byte size in the chip* — no task adds a size field to `FileMetadata` or `File.tsx`.
- *No MIME shown pre-click* — Task 4's badge is the extension, not a MIME lookup; no MIME map anywhere.
- *No back-end change* — plan touches only `src/`.
- *No `FILE_EXTENSIONS` work* — Task 8 commits the existing change and modifies nothing.
- *No `markdown2html` parity work* — no task touches `Markdown.utils.ts:119-125`.
- *Existing image guard unmodified* — pinned by Task 7 step 3's `git diff --stat` check.
- *`downloadFileStream` change stays additive* — Task 3 touches only line 294 and the unused `_type` param; the filename path (296-301) is explicitly out of bounds, and step 4 re-runs the existing callers' suites.

---

# Run 2 — `2026-09-23-epmcdme-14735-ui-artifact-filename`

## Strip the storage UUID prefix from artifact filenames — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artifact chips and saved files show `sample_spreadsheet.xlsx`, not `{uuid}_sample_spreadsheet.xlsx`.

**Architecture:** One shared `stripUuidPrefix` helper in `src/utils/api.ts` next to `sanitizeFileName`, called from exactly two call sites that turn a decoded `fileId` into a user-facing name. Display-only; no backend change, no change to `fileId`.

**Tech Stack:** TypeScript, Vitest + React Testing Library (`unit` project).

**Spec:** `/home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-09-23-epmcdme-14735-ui-artifact-filename/spec-codemie-ui.md`

Commit per task using the repository's existing convention (ticket key `EPMCDME-14735`).

### Global Constraints

- **Never touch `fileId`.** It is a trust boundary concatenated into `v1/files/${fileId}` and validated by `SAFE_FILE_ID_PATTERN` (`artifactLink.ts:38`). Only the decoded display name is stripped.
- **Leading-only, anchored regex, verbatim from the spec.** A uuid in the middle of a name must survive.
- **No backend change.** `codemie/.../files.py` is already correct.
- **Do not reorder, merge or collapse the three branches of `downloadFile`** (`src/store/files.ts:87-110`). The bare-UUID branch is EPMCDME-12266's working path.
- **Do not change** `sanitizeFileName`, `decodeFileName`, or `parseContentDispositionFilename`.
- **Test fixtures must use the length-prefixed encoding** `${v.length}~${v}` per part (`helpers.ts:210-248`). The legacy `_`-joined form shatters a `{uuid}_name` and produces a false GREEN.

### Review Focus

- `originalFileName` is `string | undefined` at `artifactLink.ts:82` — the strip must tolerate `undefined` (Task 2 covers via `?? ''`).
- A file named exactly `{uuid}_` must not become empty and trip `if (!fileName) return null` — the `|| name` fallback (Task 1).
- Uppercase-hex uuid prefix must strip too — the regex carries `/i` (Task 1).
- The `api.get` URL must still carry the full encoded id after the strip (Task 3 asserts it).
- The bare-UUID branch must still delegate to `downloadFileStream` — existing `files.test.ts` coverage must stay green (Task 3).

---

### Acceptance criteria

- [ ] An artifact chip for a file stored as `{uuid}_sample_spreadsheet.xlsx` displays `sample_spreadsheet.xlsx`.
- [ ] Downloading that artifact saves a file named `sample_spreadsheet.xlsx`.
- [ ] The chip's extension badge still reads `XLSX` (derives from the stripped name; `File.tsx` unchanged).
- [ ] `fileId` is unchanged and the download still resolves — no 404, no altered request URL.
- [ ] A name with no uuid prefix (`report.csv`) is displayed and saved unchanged.
- [ ] A name with a uuid in the middle (`my_{uuid}_x.txt`) is displayed and saved unchanged.
- [ ] The bare-UUID `downloadFile` branch still delegates to `downloadFileStream` and takes its name from `Content-Disposition` — EPMCDME-12266 does not regress.
- [ ] Both the chip label and the saved file agree on the same name.

---

#### Task 1: `stripUuidPrefix` helper

**Files:**
- Modify: `src/utils/api.ts` (add next to `sanitizeFileName`, line 69)
- Test: `src/utils/__tests__/api.test.ts`

**Interfaces:**
- Produces: `export function stripUuidPrefix(name: string): string`

**Test-first: yes** — `api.test.ts` cases for `stripUuidPrefix`: strips a leading `{uuid}_`; strips an uppercase-hex prefix; returns `report.csv` unchanged (no uuid); returns `my_{uuid}_x.txt` unchanged (uuid in the middle); returns `{uuid}_` unchanged (empty remainder). All fail with "stripUuidPrefix is not a function".

- [ ] **Step 1: Write the failing tests** in `src/utils/__tests__/api.test.ts`, following the file's existing `describe`/`it` style.

```ts
const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

describe('stripUuidPrefix', () => {
  it('removes a leading storage uuid prefix', () => {
    expect(stripUuidPrefix(`${UUID}_sample_spreadsheet.xlsx`)).toBe('sample_spreadsheet.xlsx')
  })

  it('is case-insensitive', () => {
    expect(stripUuidPrefix(`${UUID.toUpperCase()}_report.csv`)).toBe('report.csv')
  })

  it('leaves a name without a uuid prefix unchanged', () => {
    expect(stripUuidPrefix('report.csv')).toBe('report.csv')
  })

  it('leaves a uuid in the middle of a name unchanged', () => {
    expect(stripUuidPrefix(`my_${UUID}_x.txt`)).toBe(`my_${UUID}_x.txt`)
  })

  it('keeps the original when stripping would empty the name', () => {
    expect(stripUuidPrefix(`${UUID}_`)).toBe(`${UUID}_`)
  })
})
```

- [ ] **Step 2: Run and verify they fail**

Run: `npx vitest run --project unit src/utils/__tests__/api.test.ts`
Expected: FAIL — `stripUuidPrefix is not a function`.

- [ ] **Step 3: Add the helper** to `src/utils/api.ts`, immediately after `sanitizeFileName`.

```ts
// Mirrors codemie/src/codemie/rest_api/routers/files.py:91. Artifacts are stored as
// `{uuid4()}_{basename}` so a flat storage namespace cannot collide; only the leading
// prefix is removed, so a uuid in the middle of a real name survives untouched.
const UUID_FILENAME_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i

export function stripUuidPrefix(name: string): string {
  return name.replace(UUID_FILENAME_PREFIX, '') || name
}
```

- [ ] **Step 4: Run and verify they pass**

Run: `npx vitest run --project unit src/utils/__tests__/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** `src/utils/api.ts` and `src/utils/__tests__/api.test.ts`.

---

#### Task 2: Strip in the chip label

**Files:**
- Modify: `src/components/markdown/artifactLink.ts:82-84`
- Test: `src/components/markdown/__tests__/artifactLink.test.ts`, `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx`

**Interfaces:**
- Consumes: `stripUuidPrefix(name: string): string` from `@/utils/api` (Task 1).

**Test-first: yes** — a new `artifactLink.test.ts` case using the existing `encodedId(`${UUID}_report.csv`)` helper (line 39) expects `{ fileId, fileName: 'report.csv' }` and fails with the full `{uuid}_report.csv`; a new `MarkdownTokens.artifactChip.test.tsx` case expects the rendered chip label to read `report.csv`.

- [ ] **Step 1: Write the failing tests.** In `artifactLink.test.ts`, reuse the file's `encodedId` and `UUID`:

```ts
it('strips the storage uuid prefix from the display name but not from the id', () => {
  const fileId = encodedId(`${UUID}_report.csv`)

  expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toEqual({
    fileId,
    fileName: 'report.csv',
  })
})
```

In `MarkdownTokens.artifactChip.test.tsx`, add a case mirroring the existing chip case at line 60 but encoding `${UUID}_report.csv` in the name slot, asserting the rendered label is `report.csv`.

- [ ] **Step 2: Run and verify they fail**

Run: `npx vitest run --project unit src/components/markdown/__tests__/artifactLink.test.ts src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx`
Expected: FAIL — received `3f1a2b3c-…_report.csv`.

- [ ] **Step 3: Apply the strip.** At `artifactLink.ts:83`, replace the `sanitizeFileName` call so the decoded name is stripped first. Add `stripUuidPrefix` to the existing `@/utils/api` import at line 25. Leave the `if (!fileName) return null` guard and both id-validation patterns exactly as they are.

```ts
const fileName = sanitizeFileName(stripUuidPrefix(originalFileName ?? ''))
```

- [ ] **Step 4: Run and verify they pass**

Run: `npx vitest run --project unit src/components/markdown/__tests__/`
Expected: PASS, including the pre-existing cases.

- [ ] **Step 5: Commit** the two test files and `artifactLink.ts`.

---

#### Task 3: Strip in the saved filename

**Files:**
- Modify: `src/store/files.ts:96-107` (the base64 branch only)
- Test: `src/store/__tests__/files.test.ts`

**Interfaces:**
- Consumes: `stripUuidPrefix(name: string): string` from `@/utils/api` (Task 1).

**Test-first: yes** — a new `files.test.ts` case for a **length-prefixed** id (`btoa` of `part(mime) + part(owner) + part('{uuid}_report.xlsx')`, not the legacy `_`-joined form at line 46) asserts the created anchor's `download` is `report.xlsx` and that `api.get` was called with the full untouched encoded id. Fails today with `{uuid}_report.xlsx`.

- [ ] **Step 1: Write the failing test** in `src/store/__tests__/files.test.ts`, following the file's existing anchor/`api.get` mocking. Build the id with the length-prefixed encoder — the legacy form would not reproduce the bug:

```ts
const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'
const part = (value: string) => `${value.length}~${value}`
const encodedId = (name: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(
    part('application/xlsx') + part(UUID) + part(name),
  )))

it('strips the storage uuid prefix from the saved file name, not from the request id', async () => {
  const fileId = encodedId(`${UUID}_report.xlsx`)

  await downloadFile(fileId)

  expect(anchor.download).toBe('report.xlsx')
  expect(mockApi.get).toHaveBeenCalledWith(`v1/files/${fileId}`)
})
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run --project unit src/store/__tests__/files.test.ts`
Expected: FAIL — `anchor.download` is `3f1a2b3c-…_report.xlsx`.

- [ ] **Step 3: Apply the strip.** In the base64 branch of `downloadFile`, change the `a.download` assignment only; add `stripUuidPrefix` to the existing `@/utils/api` import. Leave all three branches and their order untouched.

```ts
a.download = stripUuidPrefix(originalFileName)
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run --project unit src/store/__tests__/files.test.ts`
Expected: PASS, including the pre-existing bare-UUID → `downloadFileStream` case.

- [ ] **Step 5: Commit** `src/store/files.ts` and `src/store/__tests__/files.test.ts`.

---

# Run 3 — `2026-10-02-epmcdme-14735-ui-artifact-auth-gaps`

## Shared-chat artifact chip (EPMCDME-14735, UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `getArtifactLink` accepts `<token>?share_token=<alnum>` hrefs, validating only the bare token and keeping the grant in `fileId`.

**Architecture:** One change at the markdown render seam (`src/components/markdown/artifactLink.ts`). Split the id on the first `?`; run today's rules on the bare token; accept the query only if it matches one anchored regex.

**Tech Stack:** TypeScript, Vitest.

**Spec:** `docs/superpowers/tasks/2026-10-02-epmcdme-14735-ui-artifact-auth-gaps/spec.md`

Commit per task using the repository's existing convention (ticket EPMCDME-14735).

### Global Constraints

- Permitted query: exactly `share_token=<value>`, `<value>` matching `^[A-Za-z0-9]+$`. Anything else returns `null`.
- Match the query with one anchored regex. Do not use `URLSearchParams` and do not decode `%`.
- Do not change `ThoughtMessage`, `SharedChatPage`, `sharedFileGrants.ts`, `store/files.ts`, `useFileUpload` or `api.ts`. Do not consolidate the two `decodeFileName` helpers. Add no dependency.
- Keep the assertion at `artifactLink.test.ts:144-146` (`abc?token=evil` -> null) unchanged.

### Review Focus

- A `?` inside the query value (`?share_token=a?b`): split on the first `?` only, so the value holds `?`, fails the regex, and the result is `null`. The test is in Task 1.
- An uppercase or mixed-case param name (`SHARE_TOKEN`, `Share_Token`): rejected. The regex is case-sensitive, so it carries no `i` flag.

---

#### Task 1: Accept a single `share_token` query in `getArtifactLink`

**Files:**
- Modify: `src/components/markdown/artifactLink.ts:35-45` (comment), `:69-85` (split and validate)
- Test: `src/components/markdown/__tests__/artifactLink.test.ts` (new cases inside `describe('getArtifactLink')`, using `encodedId()` and `linkToken()`)

**Interfaces:** `getArtifactLink(token): ArtifactLink | null` keeps its signature. `fileId` is now either `<bare>` or `<bare>?share_token=<alnum>`.

Test-first: yes — `getArtifactLink(linkToken(\`https://api.example.com/v1/files/${encodedId('report.csv')}?share_token=AbC123\`))` returns `{ fileId: '<id>?share_token=AbC123', fileName: 'report.csv' }`, and today it returns `null`.

- [ ] **Step 1: Write the failing tests** in `artifactLink.test.ts`:
  - AC-1: valid id plus `?share_token=AbC123` gives the full `fileId` and the decoded name. Add one case with `encodedId(\`${UUID}_report.csv\`)` to show the uuid is stripped from the name only.
  - AC-3: `it.each` over the suffixes `?share_token=`, `?share_token=a&x=1`, `?x=1&share_token=a`, `?share_token=a%2F`, `?share_token=a+b`, `?share_token=a#f`, `?`, `?SHARE_TOKEN=a` and `?share_token=a?b`, each appended to a valid `encodedId('report.csv')`. Each returns `null`.
  - AC-4: `it.each` with `?share_token=abc` appended to a bare token that fails today's rules: `../etc`, `...`, `a\\b`, and the undecodable segment already used at L74/L158. Each returns `null`.
- [ ] **Step 2: Run the test.** Run `npx vitest run --project unit src/components/markdown/__tests__/artifactLink.test.ts`. Expect the AC-1 cases to FAIL and the AC-3/AC-4 cases to pass already.
- [ ] **Step 3: Implement it.** Add the constant below next to `PATH_ESCAPE_PATTERN`. In `getArtifactLink`, after `href.slice(prefix.length)`, split the id on its first `?`. Apply the existing `SAFE_FILE_ID_PATTERN`, all-dots, `PATH_ESCAPE_PATTERN` and `decodeFileName` steps to `bareId` only. Return `{ fileId: rawId, fileName }`.

  ```ts
  // The only query the seam lets through to the authenticated download URL: the share grant
  // `resolveSandboxFileUrls` appends. Alphabet of the back end's generate_share_token.
  const SHARE_TOKEN_QUERY = /^share_token=[A-Za-z0-9]+$/
  ```
  ```ts
  const rawId = href.slice(prefix.length)
  const queryAt = rawId.indexOf('?')
  const bareId = queryAt === -1 ? rawId : rawId.slice(0, queryAt)
  if (queryAt !== -1 && !SHARE_TOKEN_QUERY.test(rawId.slice(queryAt + 1))) return null
  ```
  Rewrite the comment at L35-39 to say that `?` stays excluded from the bare token, and that the only permitted query is a single `share_token=<alnum>` grant, which is kept verbatim on `fileId` so `downloadFile` sends it.
- [ ] **Step 4: Run the tests.** Run `artifactLink.test.ts`, `MarkdownTokens.artifactChip.test.tsx` and `Markdown.artifactLinks.test.ts` with `npx vitest run --project unit <path>`. Expect all to PASS (AC-2, AC-5).

### Negative-constraint pass

- No `URLSearchParams` and no `%` decoding: Task 1 uses one anchored regex.
- No query repair or normalisation: Task 1 returns `null`, and `fileId` is the raw id.
- No other query shape: AC-3 cases in Task 1.
- No change to ThoughtMessage, SharedChatPage, sharedFileGrants, files store, useFileUpload or api.ts: Task 1 touches only `artifactLink.ts` and its test.
- `decodeFileName` helpers are not consolidated: Task 1 keeps the `@/utils/helpers` import.
- No new dependency, no back-end change and no Jira update: none planned.
- Existing assertion at L144-146 is unchanged: Task 1 adds tests and edits none.

---

# Run 4 — `2026-10-22-ui-workspace-artifact-links`

## Workspace artifact links in the UI — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Commit per task using the repository's existing convention (ticket EPMCDME-14735). Commit source and test files only — run artifacts in this task dir are gitignored and must not be committed.

**Goal:** Chip label and encoded-link download name show the last path segment of `artifacts/<turn-id>/<name>` tokens (D1), with the existing uuid-strip, sanitising and EPMCDME-12556 guard intact.

**Architecture:** One helper in `src/utils/api.ts` (`last segment -> stripUuidPrefix -> sanitizeFileName`) called by both naming sites. Everything else (share grants, failure texts, Browse files) is confirmed by tests only.

**Tech Stack:** React 18, TypeScript, Vitest + RTL (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-10-22-ui-workspace-artifact-links/spec.md`

### Global Constraints

- Split only on `/`. Backslashes are not separators and stay sanitised to `_`.
- `SAFE_FILE_ID_PATTERN`, `PATH_ESCAPE_PATTERN`, `SHARE_TOKEN_QUERY` and the `BASE_URL/v1/files/` prefix check are not edited. `fileId` stays raw, including `?share_token=`.
- Do not touch `sharedFileGrants.ts`, `AgentWorkspaceBrowserPopup.tsx`, `agentWorkspace.ts` or `src/utils/utils.ts` `decodeFileName`.
- The encoded-link download keeps `a.download`. Do not switch it to Content-Disposition.

### Review Focus

- Name ending in `/` or with last segment `..`: no chip, and the download falls back to `'download'` (Task 1 and Task 2 tests).
- `<uuid>_<name>` nested under a folder (`artifacts/<turn>/<uuid>_x.csv`): the strip runs after the split, so the result is `x.csv` (Task 1 test).
- `report (2).csv`: spaces and parentheses survive sanitising (Task 1 and Task 3 tests).
- Path-shaped name plus a share grant: `fileId` keeps the query while `fileName` is the basename (Task 3 test).
- An existing test pins the whole-name result. `files.test.ts:103-121` expects `_etc_pas_swd.txt`; flip it to the basename on purpose (Task 2).

---

#### Task 1: Shared artifact name helper + chip label

**Files:**
- Modify: `src/utils/api.ts:69-88` (add the helper after `stripUuidPrefix`)
- Modify: `src/components/markdown/artifactLink.ts:83-91`
- Test: `src/utils/__tests__/api.test.ts`, `src/components/markdown/__tests__/artifactLink.test.ts`

**Interfaces:**
- Produces: `export function artifactFileName(name: string | undefined): string | undefined` in `src/utils/api.ts`. It returns `sanitizeFileName(stripUuidPrefix(<text after the last '/'>))`.

**Test-first: yes — `artifactFileName('artifacts/abc123/closed_positions_analysis.xlsx')` returns `closed_positions_analysis.xlsx`, and `getArtifactLink` for that encoded name returns that `fileName`. Both fail because the helper does not exist yet and the current label is `artifacts_abc123_closed_positions_analysis.xlsx`.**

- [ ] **Step 1: Write failing tests.** In `api.test.ts`, add a `describe('artifactFileName')` with these cases:
  - `'artifacts/t1/closed_positions_analysis.xlsx'` → `'closed_positions_analysis.xlsx'`
  - `'artifacts/t1/report (2).csv'` → `'report (2).csv'`
  - `` `${UUID}_report.csv` `` → `'report.csv'`
  - `` `artifacts/t1/${UUID}_x.csv` `` → `'x.csv'`
  - `'artifacts/t1/a\\b.txt'` → `'a_b.txt'`
  - `'artifacts/t1/f\x00.txt'` → `'f_.txt'`
  - `'artifacts/t1/'`, `'a/..'`, `'a/.'`, `''` and `undefined` → `undefined`

  In `artifactLink.test.ts`, use the existing `encodedId` fixture to add AC1 (the `xlsx` case above) and the AC2 pair `report.csv` / `report (2).csv` (each keeps its own `fileId`). Add one case where `encodedId('artifacts/t1/')` → `null`. Leave the `../../etc/passwd` sanitise test (l.102-109) and the guard tests (l.113-135, l.200) unchanged; they must still pass.
- [ ] **Step 2: Run the tests and confirm they fail.** `npx vitest run --project unit src/utils/__tests__/api.test.ts src/components/markdown/__tests__/artifactLink.test.ts`
- [ ] **Step 3: Implement.** Add `artifactFileName`. Use `name.slice(name.lastIndexOf('/') + 1)` and guard `undefined`. Add a one-line comment citing story D1 and the back end's `artifacts/<turn-id>/<name>`. In `artifactLink.ts`, replace the "No basename step" comment (l.88-89) with one line saying the decoded name may be a workspace path and only its last segment is shown (D1), and that the guard above still runs on the encoded id. Set `fileName = artifactFileName(originalFileName)`. Drop the `sanitizeFileName` and `stripUuidPrefix` imports if they are now unused.
- [ ] **Step 4: Run the same command and confirm it passes.**

#### Task 2: Encoded-link download name uses the helper

**Files:**
- Modify: `src/store/files.ts:106-108`
- Test: `src/store/__tests__/files.test.ts:103-121`

**Interfaces:**
- Consumes: `artifactFileName` from Task 1.

**Test-first: yes — `downloadFile` for a token whose name is `artifacts/t1/closed_positions_analysis.xlsx` sets `anchor.download` to `closed_positions_analysis.xlsx`. This fails because today the value is `artifacts_t1_closed_positions_analysis.xlsx`.**

- [ ] **Step 1: Write failing tests.** Add the AC1 case using the anchor and `api.get` mocking pattern from l.103-121. Add an `artifacts/t1/` case that expects `'download'`. Flip l.119-120 to expect `artifactFileName(decodedName)` and `'passwd.txt'`. Keep the `api.get` URL assertion.
- [ ] **Step 2: Run** `npx vitest run --project unit src/store/__tests__/files.test.ts` **and confirm it fails.**
- [ ] **Step 3: Implement.** Set `a.download = artifactFileName(originalFileName) ?? 'download'`. Update the comment at l.106-107 so it names the shared helper.
- [ ] **Step 4: Run it again and confirm it passes.**

#### Task 3: Chip, share-grant and plain-text coverage (AC2, AC3, AC6)

**Files:**
- Test: `src/components/markdown/__tests__/MarkdownTokens.artifactChip.test.tsx`, `src/utils/__tests__/sharedFileGrants.test.ts`

**Test-first: no — this only confirms behaviour that already holds after Task 1. No source changes.**

- [ ] **Step 1: Add the tests and run them green.** In the chip test, using its existing fixtures and render helper, add three cases:
  - Two links, `artifacts/t1/report.csv` and `artifacts/t1/report (2).csv`, render two chips labelled with those names. Clicking each calls `filesStore.downloadFile` with its own `fileId`.
  - A path-shaped link whose href carries `?share_token=abc123` mounts a chip. Its download is called with the `fileId` including `?share_token=abc123`.
  - Markdown ``"`x.csv` stays on the MCP server and was not delivered"`` and ``"`x.csv` was not saved: it is empty"`` render no chip and no `<a>`.

  In `sharedFileGrants.test.ts`, add a case: a token encoding `artifacts/t1/report (2).csv` that is present in `sharedFileUrls` resolves to `${baseUrl}/v1/files/<token>?share_token=…`. Run `npx vitest run --project unit` on both files.

#### Task 4: Browse files coverage (AC7)

**Files:**
- Create: `src/pages/chat/components/ChatHeader/__tests__/AgentWorkspaceBrowserPopup.test.tsx`
- Test: `src/store/__tests__/agentWorkspace.test.ts` (near l.205-220)

**Test-first: no — this only confirms existing behaviour. No source changes. The download lives in `agentWorkspace.ts:205-217` (the spec's popup line reference points at JSX).**

- [ ] **Step 1: Add the tests and run them green.**
  - Popup test: mock `valtio`, `@/store/agentWorkspace`, `@/components/Popup` and `Spinner` the way `ChatHeaderBrowseFilesButton.test.tsx:56-90` does. Render with `files: [{ path: 'artifacts/t1/report.csv' }]` and assert that `workspace-file-list` contains the text `artifacts/t1/report.csv`.
  - Store test: copy the existing `downloadSelectedFile` case. With `selectedFilePath = 'artifacts/t1/report (2).csv'`, assert the URL `...files/download?file_path=artifacts%2Ft1%2Freport%20(2).csv` and the file name `'report (2).csv'`.

  Run `npx vitest run --project unit` on both files. Use `--project integration` instead if the popup test lands in that project by path.

### Negative-constraint pass

- "Backslashes are not separators" → Task 1 splits on `/` only. Its `a\\b.txt` case pins this.
- "Guard untouched", Non-goal "no change to token guard or share-grant regexes" → no task edits `artifactLink.ts:42-81` or `sharedFileGrants.ts`. Task 1 keeps the guard tests.
- Non-goal "no switch to Content-Disposition" → Task 2 keeps `a.download`.
- Non-goal "no folder tree or visual change to Browse files" → Task 4 is tests only.
- Non-goal "no change to `utils.ts` `decodeFileName`" → no task touches it.
- Non-goals "file size", "upload/edit/delete UI", "workflow output" → no task touches them.
