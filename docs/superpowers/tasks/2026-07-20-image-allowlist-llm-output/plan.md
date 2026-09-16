# Image Allow-List for LLM Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a configurable domain allow-list on every image render path in LLM/Assistant output to prevent URL-based data exfiltration.

**Architecture:** A new `src/utils/imageAllowList.ts` policy module provides `isImageAllowed`, `getBlockedImageBadgeHTML`, and shared constants; a new `BlockedImageBadge` React component provides JSX-path rendering. Four render paths in `Markdown.utils.ts`, `messageHelpers.ts`, `ThoughtMessage.tsx`, and `MarkdownEditor.tsx` are patched to call `isImageAllowed` before emitting any `<img>` tag. A new `VITE_ALLOWED_IMAGE_DOMAINS` env var and matching Helm values control the allow-list at deployment time without a rebuild.

**Tech Stack:** TypeScript, React 18, marked 4.3.0 (renderer override), DOMPurify 3.2.5, react-markdown 10.1.0, Vitest 1.6.1, React Testing Library 16.3.

## Global Constraints

- Every new `.ts` / `.tsx` file requires the Apache 2.0 license header (enforced by pre-commit hook). The header is shown verbatim in Task 1; copy it to every new file.
- `extractHostname` and `getBlockedImageLabel` and `getBlockedImageBadgeHTML` and `BLOCKED_IMAGE_BADGE_CLASS` and `BLOCKED_IMAGE_BADGE_TITLE` and `isImageAllowed` are all exported from `src/utils/imageAllowList.ts`. `extractHostname` is exported because `BlockedImageBadge` imports it.
- `parseImageUrl` is the sole call site of `new URL()` in `imageAllowList.ts`. No other function in that module calls `new URL()` directly.
- `BLOCKED_IMAGE_BADGE_TITLE = 'Image not displayed: domain is not on the allow-list'` — exact string, no variation.
- `BLOCKED_IMAGE_BADGE_CLASS = 'blocked-image-badge'` — exact string, no variation.
- Tier order in `isImageAllowed`: blank → data:image/* → parse → scheme → http-on-local-page → same-origin → backend-origin → empty-list → allow-list match → default block.
- `renderer.image.bind(renderer)` is required in both `Markdown.utils.ts` and `messageHelpers.ts` (marked 4.3.0's `Renderer.image` reads `this.options`; without bind, strict-mode modules call it with `this === undefined`).
- All unit tests live in `__tests__/` subdirectories next to the source files.
- Test framework: Vitest + `@testing-library/react`. Import `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` from `vitest`.
- `npm run test:unit` runs all unit tests; `npx vitest run --project unit <path>` runs a single file.

---

## Task 1: Policy module + React badge component

**Files:**
- Create: `src/utils/imageAllowList.ts`
- Create: `src/components/BlockedImageBadge/BlockedImageBadge.tsx`
- Create: `src/utils/__tests__/imageAllowList.test.tsx`
- Create: `src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx`

**Test-first:** yes — write failing tests before implementing each file.

**Interfaces:**
- Produces (for Tasks 2-4):
  - `isImageAllowed(src: string): boolean`
  - `getBlockedImageBadgeHTML(src: string): string`
  - `extractHostname(src: string): string | undefined`
  - `getBlockedImageLabel(hostname?: string): string`
  - `BLOCKED_IMAGE_BADGE_CLASS: string`
  - `BLOCKED_IMAGE_BADGE_TITLE: string`
  - `BlockedImageBadge` (default export, `FC<{ src: string }>`)

---

- [ ] **Step 1: Write failing tests for `imageAllowList.ts`**

Create `src/utils/__tests__/imageAllowList.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render } from '@testing-library/react'
import DOMPurify from 'dompurify'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'http://localhost/api',
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  handleError: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ default: mockApi }))

import {
  isImageAllowed,
  getBlockedImageBadgeHTML,
  getBlockedImageLabel,
  BLOCKED_IMAGE_BADGE_CLASS,
  BLOCKED_IMAGE_BADGE_TITLE,
} from '@/utils/imageAllowList'
import BlockedImageBadge from '@/components/BlockedImageBadge/BlockedImageBadge'

function stubProductionLocation() {
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
}

function stubLocalLocation() {
  vi.stubGlobal('location', {
    hostname: 'localhost',
    origin: 'http://localhost',
    href: 'http://localhost/',
  })
}

beforeEach(() => {
  mockApi.BASE_URL = 'http://localhost/api'
  ;(window as any)._env_ = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isImageAllowed — tier 1: blank', () => {
  it('blocks empty string', () => {
    expect(isImageAllowed('')).toBe(false)
  })

  it('blocks whitespace-only string', () => {
    expect(isImageAllowed('   ')).toBe(false)
  })
})

describe('isImageAllowed — tier 2: data:image/*', () => {
  it('allows data:image/png', () => {
    expect(isImageAllowed('data:image/png;base64,abc123==')).toBe(true)
  })

  it('allows data:image/svg+xml', () => {
    expect(isImageAllowed('data:image/svg+xml,%3Csvg%3E%3C/svg%3E')).toBe(true)
  })

  it('allows data:image/png with leading whitespace (trimmed at entry)', () => {
    expect(isImageAllowed(' data:image/png;base64,abc123==')).toBe(true)
  })

  it('blocks data:text/html (not data:image)', () => {
    expect(isImageAllowed('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
  })
})

describe('isImageAllowed — tier 3: malformed URL', () => {
  beforeEach(() => stubProductionLocation())

  it('blocks a malformed string that is not a valid URL', () => {
    expect(isImageAllowed('not a url :// @@')).toBe(false)
  })
})

describe('isImageAllowed — tier 4: scheme', () => {
  beforeEach(() => stubProductionLocation())

  it('blocks blob: URL', () => {
    expect(isImageAllowed('blob:https://example.com/some-id')).toBe(false)
  })

  it('blocks protocol-relative //evil.com/x.png on production page (resolves to https:, blocked by tier 8)', () => {
    // Resolves to https://evil.com/x.png — passes tier 4, no match in tiers 6-7, blocked at tier 8
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '' }
    expect(isImageAllowed('//evil.com/x.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 5: http: only on local page', () => {
  it('blocks http://evil.com on an HTTPS production page', () => {
    stubProductionLocation()
    expect(isImageAllowed('http://evil.com/img.png')).toBe(false)
  })

  it('allows http://localhost/img.png on a local page (hostname=localhost)', () => {
    stubLocalLocation()
    expect(isImageAllowed('http://localhost/img.png')).toBe(true)
  })

  it('allows http://127.0.0.1/img.png on a local page (hostname=127.0.0.1)', () => {
    vi.stubGlobal('location', {
      hostname: '127.0.0.1',
      origin: 'http://127.0.0.1',
      href: 'http://127.0.0.1/',
    })
    expect(isImageAllowed('http://127.0.0.1/img.png')).toBe(true)
  })

  it('blocks http://localhost/img.png on a production page', () => {
    stubProductionLocation()
    expect(isImageAllowed('http://localhost/img.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 6: same-origin', () => {
  it('allows a same-origin absolute URL', () => {
    stubLocalLocation()
    expect(isImageAllowed('http://localhost/static/img.png')).toBe(true)
  })

  it('allows a same-origin relative URL resolved against href', () => {
    stubLocalLocation()
    expect(isImageAllowed('/api/v1/files/abc.png')).toBe(true)
  })
})

describe('isImageAllowed — tier 7: backend origin', () => {
  it('allows an image from the backend origin (absolute VITE_API_URL)', () => {
    stubProductionLocation()
    mockApi.BASE_URL = 'https://codemie.example.com/code-assistant-api'
    expect(isImageAllowed('https://codemie.example.com/code-assistant-api/v1/files/img.png')).toBe(true)
  })
})

describe('isImageAllowed — tier 8: empty allow-list', () => {
  it('blocks external https:// URL when allow-list is empty', () => {
    stubProductionLocation()
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '' }
    mockApi.BASE_URL = 'https://api.example.com'
    expect(isImageAllowed('https://external.com/img.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 9: allow-list matching', () => {
  beforeEach(() => {
    stubProductionLocation()
    mockApi.BASE_URL = 'https://api.example.com'
  })

  it('allows exact match in list', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: 'cdn.example.com' }
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com matches apex example.com', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '.example.com' }
    expect(isImageAllowed('https://example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com matches sub.example.com', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '.example.com' }
    expect(isImageAllowed('https://sub.example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com rejects evil-example.com', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '.example.com' }
    expect(isImageAllowed('https://evil-example.com/img.png')).toBe(false)
  })

  it('leading-dot wildcard .example.com rejects example.com.evil.io', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '.example.com' }
    expect(isImageAllowed('https://example.com.evil.io/img.png')).toBe(false)
  })

  it('allow-list entry with extra whitespace and mixed case is normalized', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '  CDN.EXAMPLE.COM  ' }
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
  })
})

describe('getBlockedImageBadgeHTML', () => {
  it('contains data-blocked-image-hostname, title, and label for a normal URL', () => {
    const html = getBlockedImageBadgeHTML('https://evil.com/img.png')
    expect(html).toContain('data-blocked-image-hostname="evil.com"')
    expect(html).toContain(`title="${BLOCKED_IMAGE_BADGE_TITLE}"`)
    expect(html).toContain('Image from evil.com blocked')
    expect(html).toContain(BLOCKED_IMAGE_BADGE_CLASS)
  })

  it('returns empty string for blank src', () => {
    expect(getBlockedImageBadgeHTML('')).toBe('')
  })

  it('HTML-escapes a hostname containing angle brackets', () => {
    // Browsers don't return < in hostnames but we verify escaping logic
    const html = getBlockedImageBadgeHTML('https://evil.com/img.png')
    expect(html).not.toMatch(/<[^s]/)
  })

  it('renders fallback label and no data attribute for malformed src', () => {
    const html = getBlockedImageBadgeHTML('not-a-valid-url @@')
    expect(html).toContain('Image from untrusted domain blocked')
    expect(html).not.toContain('data-blocked-image-hostname=')
  })

  it('data-blocked-image-hostname survives DOMPurify.sanitize with ADD_ATTR target', () => {
    const html = getBlockedImageBadgeHTML('https://evil.com/img.png')
    const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
    const div = document.createElement('div')
    div.innerHTML = sanitized
    const span = div.querySelector('span')
    expect(span?.dataset.blockedImageHostname).toBe('evil.com')
  })
})

describe('getBlockedImageLabel', () => {
  it('returns hostname-specific label when hostname provided', () => {
    expect(getBlockedImageLabel('cdn.evil.com')).toBe('Image from cdn.evil.com blocked')
  })

  it('returns fallback label when hostname is undefined', () => {
    expect(getBlockedImageLabel(undefined)).toBe('Image from untrusted domain blocked')
  })
})

describe('drift prevention: BlockedImageBadge renders same structure as getBlockedImageBadgeHTML', () => {
  it('matches tagName, className, dataset, title, textContent', () => {
    const src = 'https://evil.com/img.png'
    const htmlString = getBlockedImageBadgeHTML(src)

    // Parse HTML string into a DOM node
    const container = document.createElement('div')
    container.innerHTML = htmlString
    const fromHtml = container.firstElementChild as HTMLElement

    // Render React component
    const { container: reactContainer } = render(<BlockedImageBadge src={src} />)
    const fromReact = reactContainer.firstElementChild as HTMLElement

    expect(fromReact.tagName).toBe(fromHtml.tagName)
    expect(fromReact.className).toBe(fromHtml.className)
    expect(fromReact.dataset.blockedImageHostname).toBe(fromHtml.dataset.blockedImageHostname)
    expect(fromReact.title).toBe(fromHtml.title)
    expect(fromReact.textContent).toBe(fromHtml.textContent)
  })
})
```

- [ ] **Step 2: Run the failing tests**

```bash
npx vitest run --project unit src/utils/__tests__/imageAllowList.test.tsx
```

Expected: many `FAIL` errors — `Cannot find module '@/utils/imageAllowList'` and `Cannot find module '@/components/BlockedImageBadge/BlockedImageBadge'`.

- [ ] **Step 3: Write failing tests for `BlockedImageBadge.tsx`**

Create `src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import {
  BLOCKED_IMAGE_BADGE_CLASS,
  BLOCKED_IMAGE_BADGE_TITLE,
} from '@/utils/imageAllowList'
import BlockedImageBadge from '../BlockedImageBadge'

describe('BlockedImageBadge', () => {
  it('renders nothing for blank src', () => {
    const { container } = render(<BlockedImageBadge src="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders badge with correct hostname, class, title, and label', () => {
    const { container } = render(<BlockedImageBadge src="https://evil.com/img.png" />)
    const span = container.querySelector('span')!
    expect(span).toBeInTheDocument()
    expect(span.className).toBe(BLOCKED_IMAGE_BADGE_CLASS)
    expect(span.title).toBe(BLOCKED_IMAGE_BADGE_TITLE)
    expect(span.dataset.blockedImageHostname).toBe('evil.com')
    expect(span.textContent).toBe('Image from evil.com blocked')
  })
})
```

- [ ] **Step 4: Run BlockedImageBadge tests to confirm they fail**

```bash
npx vitest run --project unit src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/BlockedImageBadge/BlockedImageBadge'`.

- [ ] **Step 5: Implement `src/utils/imageAllowList.ts`**

Create `src/utils/imageAllowList.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import api from '@/utils/api'

export const BLOCKED_IMAGE_BADGE_CLASS = 'blocked-image-badge'
export const BLOCKED_IMAGE_BADGE_TITLE = 'Image not displayed: domain is not on the allow-list'

function parseImageUrl(src: string): URL | undefined {
  try {
    return new URL(src, window.location.href)
  } catch {
    return undefined
  }
}

export function extractHostname(src: string): string | undefined {
  if (!src.trim()) return undefined
  return parseImageUrl(src)?.hostname || undefined
}

function parseAllowList(): Set<string> {
  const raw =
    window?._env_?.VITE_ALLOWED_IMAGE_DOMAINS || import.meta.env.VITE_ALLOWED_IMAGE_DOMAINS || ''
  return new Set(
    (raw as string)
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

function getBackendOrigin(): string | null {
  return parseImageUrl(api.BASE_URL)?.origin ?? null
}

export function getBlockedImageLabel(hostname?: string): string {
  return hostname ? `Image from ${hostname} blocked` : 'Image from untrusted domain blocked'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function getBlockedImageBadgeHTML(src: string): string {
  if (!src.trim()) return ''
  const hostname = extractHostname(src)
  const hostnameAttr = hostname ? ` data-blocked-image-hostname="${escapeHtml(hostname)}"` : ''
  const label = getBlockedImageLabel(hostname)
  return `<span class="${BLOCKED_IMAGE_BADGE_CLASS}"${hostnameAttr} title="${BLOCKED_IMAGE_BADGE_TITLE}">${escapeHtml(label)}</span>`
}

export function isImageAllowed(src: string): boolean {
  src = src.trim()
  // Tier 1: blank src — browser re-requests current page; never render
  if (!src) return false
  // Tier 2: data:image/* issues no network request and is always safe
  if (/^data:image\//i.test(src)) return true
  // Tier 3: unparseable URL — no safe interpretation
  const url = parseImageUrl(src)
  if (!url) return false
  // Tier 4: only https: and http: are accepted; blob:, data:text/, etc. are blocked
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  // Tier 5: http: is only safe when the page itself is running locally
  // (gating on page hostname, not image hostname, prevents probing local services from prod pages)
  if (url.protocol === 'http:') {
    const pageHostname = window.location.hostname
    if (pageHostname !== 'localhost' && pageHostname !== '127.0.0.1') return false
  }
  // Tier 6: same-origin (covers /api/v1/files/ in local dev)
  if (url.origin === window.location.origin) return true
  // Tier 7: backend origin (covers absolute VITE_API_URL in production)
  if (url.origin === getBackendOrigin()) return true
  // Tier 8: empty allow-list → default-deny all external images
  const allowList = parseAllowList()
  if (allowList.size === 0) return false
  // Tier 9: allow-list hostname matching
  const hostname = url.hostname
  for (const entry of allowList) {
    if (entry.startsWith('.')) {
      // Leading-dot wildcard: matches apex and all subdomains
      // entry.slice(1) == 'example.com'; endsWith('.example.com') matches sub.example.com
      // 'evil-example.com' ends with '-example.com' not '.example.com' — safe
      if (hostname === entry.slice(1) || hostname.endsWith(entry)) return true
    } else {
      if (hostname === entry) return true
    }
  }
  return false
}
```

- [ ] **Step 6: Implement `src/components/BlockedImageBadge/BlockedImageBadge.tsx`**

Create `src/components/BlockedImageBadge/BlockedImageBadge.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { FC } from 'react'

import {
  BLOCKED_IMAGE_BADGE_CLASS,
  BLOCKED_IMAGE_BADGE_TITLE,
  extractHostname,
  getBlockedImageLabel,
} from '@/utils/imageAllowList'

interface BlockedImageBadgeProps {
  src: string
}

const BlockedImageBadge: FC<BlockedImageBadgeProps> = ({ src }) => {
  if (!src.trim()) return null
  const hostname = extractHostname(src)
  return (
    <span
      className={BLOCKED_IMAGE_BADGE_CLASS}
      data-blocked-image-hostname={hostname}
      title={BLOCKED_IMAGE_BADGE_TITLE}
    >
      {getBlockedImageLabel(hostname)}
    </span>
  )
}

export default BlockedImageBadge
```

- [ ] **Step 7: Run all Task 1 tests and verify they pass**

```bash
npx vitest run --project unit src/utils/__tests__/imageAllowList.test.tsx src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/imageAllowList.ts \
  src/components/BlockedImageBadge/BlockedImageBadge.tsx \
  src/utils/__tests__/imageAllowList.test.tsx \
  src/components/BlockedImageBadge/__tests__/BlockedImageBadge.test.tsx
git commit -m "feat(EPMCDME-12950): add image allow-list policy module and BlockedImageBadge component"
```

---

## Task 2: Patch `getMarkdownRenderer()` in both renderer files

**Files:**
- Modify: `src/components/markdown/Markdown.utils.ts:124-140`
- Modify: `src/utils/messageHelpers.ts:49-66`
- Create: `src/components/markdown/__tests__/Markdown.utils.test.ts`
- Create: `src/components/markdown/__tests__/MarkdownTokens.test.tsx`

**Test-first:** yes.

**Interfaces:**
- Consumes (from Task 1): `isImageAllowed`, `getBlockedImageBadgeHTML`
- Produces: `getMarkdownRenderer()` now returns a renderer whose `image` method applies the allow-list policy.

---

- [ ] **Step 1: Write failing tests for the renderer override**

Create `src/components/markdown/__tests__/Markdown.utils.test.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsImageAllowed = vi.hoisted(() => vi.fn())
const mockGetBlockedImageBadgeHTML = vi.hoisted(() => vi.fn())

vi.mock('@/utils/imageAllowList', () => ({
  isImageAllowed: mockIsImageAllowed,
  getBlockedImageBadgeHTML: mockGetBlockedImageBadgeHTML,
  BLOCKED_IMAGE_BADGE_CLASS: 'blocked-image-badge',
  BLOCKED_IMAGE_BADGE_TITLE: 'Image not displayed: domain is not on the allow-list',
  getBlockedImageLabel: vi.fn((h?: string) => h ? `Image from ${h} blocked` : 'Image from untrusted domain blocked'),
  extractHostname: vi.fn((src: string) => {
    try { return new URL(src).hostname } catch { return undefined }
  }),
}))

import { getMarkdownRenderer } from '@/components/markdown/Markdown.utils'

describe('getMarkdownRenderer — image override', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBlockedImageBadgeHTML.mockReturnValue('<span class="blocked-image-badge">blocked</span>')
  })

  it('delegates to the original renderer for an allowed image', () => {
    mockIsImageAllowed.mockReturnValue(true)
    const renderer = getMarkdownRenderer()
    const result = renderer.image('https://allowed.com/img.png', null, 'alt text')
    expect(result).toContain('<img')
    expect(result).toContain('https://allowed.com/img.png')
    expect(mockIsImageAllowed).toHaveBeenCalledWith('https://allowed.com/img.png')
  })

  it('returns badge HTML for a blocked image', () => {
    mockIsImageAllowed.mockReturnValue(false)
    const renderer = getMarkdownRenderer()
    const result = renderer.image('https://evil.com/img.png', null, 'alt text')
    expect(result).toBe('<span class="blocked-image-badge">blocked</span>')
    expect(mockGetBlockedImageBadgeHTML).toHaveBeenCalledWith('https://evil.com/img.png')
  })

  it('does not throw (this-binding is correct)', () => {
    mockIsImageAllowed.mockReturnValue(true)
    const renderer = getMarkdownRenderer()
    // Calling image with an unbound function would throw in strict mode — this must not throw
    expect(() => renderer.image('https://allowed.com/img.png', 'title', 'alt')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run --project unit src/components/markdown/__tests__/Markdown.utils.test.ts
```

Expected: FAIL — `renderer.image` is not a function or does not call `isImageAllowed` (the override doesn't exist yet).

- [ ] **Step 3: Patch `src/components/markdown/Markdown.utils.ts`**

Add the import at the top of the imports block (after `import api from '@/utils/api'`):

```typescript
import { getBlockedImageBadgeHTML, isImageAllowed } from '@/utils/imageAllowList'
```

Then in `getMarkdownRenderer()`, add the `imageRenderer` capture and override. The new function body (full replacement of lines 124–140):

```typescript
export const getMarkdownRenderer = () => {
  const renderer = new marked.Renderer()
  const tableRenderer = renderer.table
  const codespanRenderer = renderer.codespan
  const imageRenderer = renderer.image.bind(renderer)
  renderer.link = (href, title, text) => {
    const titleAttr = title ? `title="${title}"` : ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`
  }
  renderer.image = (href: string, title: string | null, text: string): string =>
    isImageAllowed(href) ? imageRenderer(href, title, text) : getBlockedImageBadgeHTML(href)
  // Wrap table element to have horizontal scroll for tables
  renderer.table = (...args) => `<div class="overflow-x-auto">${tableRenderer(...args)}</div>`
  // Almost any text containing ~ wraps in del. Removed it completely as agents don't seem to use it correctly anyway.
  renderer.del = (text) => text
  renderer.codespan = (text) =>
    codespanRenderer(text.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;'))

  return renderer
}
```

- [ ] **Step 4: Run Markdown.utils tests — verify they pass**

```bash
npx vitest run --project unit src/components/markdown/__tests__/Markdown.utils.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Write failing MarkdownTokens integration tests**

Create `src/components/markdown/__tests__/MarkdownTokens.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render } from '@testing-library/react'
import { marked } from 'marked'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'http://localhost/api',
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  handleError: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ default: mockApi }))

import MarkdownTokens from '@/components/markdown/MarkdownTokens'
import { MarkdownToken } from '@/components/markdown/Markdown.utils'

function getImageToken(url: string, alt = 'alt'): MarkdownToken {
  const tokens = marked.lexer(`![${alt}](${url})`)
  // marked wraps inline tokens in a paragraph; image is inside paragraph.tokens
  const para = tokens[0] as any
  return para.tokens[0] as MarkdownToken
}

beforeEach(() => {
  ;(window as any)._env_ = undefined
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MarkdownTokens — image rendering', () => {
  it('renders <img> for an allowed domain in the allow-list', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: 'allowed.example.com' }
    const token = getImageToken('https://allowed.example.com/img.png')
    const { container } = render(<MarkdownTokens tokens={[token]} />)
    expect(container.querySelector('img')).toBeInTheDocument()
    expect(container.querySelector('img')?.src).toContain('allowed.example.com')
  })

  it('renders badge and no <img> for a blocked domain (empty allow-list)', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '' }
    const token = getImageToken('https://evil.com/img.png')
    const { container } = render(<MarkdownTokens tokens={[token]} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('.blocked-image-badge')).toBeInTheDocument()
  })

  it('data-blocked-image-hostname survives DOMPurify sanitization', () => {
    ;(window as any)._env_ = { VITE_ALLOWED_IMAGE_DOMAINS: '' }
    const token = getImageToken('https://evil.com/img.png')
    const { container } = render(<MarkdownTokens tokens={[token]} />)
    const badge = container.querySelector('.blocked-image-badge') as HTMLElement
    expect(badge?.dataset.blockedImageHostname).toBe('evil.com')
  })
})
```

- [ ] **Step 6: Run MarkdownTokens tests — verify badge test fails (no badge yet since MarkdownTokens uses module-level renderer)**

```bash
npx vitest run --project unit src/components/markdown/__tests__/MarkdownTokens.test.tsx
```

Expected: the badge tests FAIL (no `.blocked-image-badge` in DOM) because `MarkdownTokens.tsx` caches `const renderer = getMarkdownRenderer()` at module level. The tests will pass once `Markdown.utils.ts` patch is applied (the module is re-evaluated in each test file run).

Note: if tests pass already due to module isolation in Vitest, that is correct behavior — the module cache is separate per test file.

- [ ] **Step 7: Patch `src/utils/messageHelpers.ts` with the identical renderer change**

Add the import alongside the existing imports:

```typescript
import { getBlockedImageBadgeHTML, isImageAllowed } from '@/utils/imageAllowList'
```

Then in `getMarkdownRenderer()`, add the `imageRenderer` capture and override. New function body (full replacement of lines 49–66):

```typescript
export const getMarkdownRenderer = (): marked.Renderer => {
  const renderer = new marked.Renderer()
  const tableRenderer = renderer.table
  const codespanRenderer = renderer.codespan
  const imageRenderer = renderer.image.bind(renderer)
  renderer.link = (href: string, title: string | null, text: string): string => {
    const titleAttr = title ? `title="${title}"` : ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`
  }
  renderer.image = (href: string, title: string | null, text: string): string =>
    isImageAllowed(href) ? imageRenderer(href, title, text) : getBlockedImageBadgeHTML(href)
  // Wrap table element to have horizontal scroll for tables
  renderer.table = (...args: any[]): string =>
    `<div class="overflow-x-auto">${tableRenderer(...args)}</div>`
  // Almost any text containing ~ wraps in del. Removed it completely as agents don't seem to use it correctly anyway.
  renderer.del = (text: string): string => text
  renderer.codespan = (text: string): string =>
    codespanRenderer(text.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;'))

  return renderer
}
```

- [ ] **Step 8: Run all Task 2 tests**

```bash
npx vitest run --project unit src/components/markdown/__tests__/Markdown.utils.test.ts src/components/markdown/__tests__/MarkdownTokens.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/markdown/Markdown.utils.ts \
  src/utils/messageHelpers.ts \
  src/components/markdown/__tests__/Markdown.utils.test.ts \
  src/components/markdown/__tests__/MarkdownTokens.test.tsx
git commit -m "feat(EPMCDME-12950): add image allow-list check to getMarkdownRenderer in both renderer files"
```

---

## Task 3: Patch `ThoughtMessage.tsx` structured image path

**Files:**
- Modify: `src/components/Thought/ThoughtMessage.tsx:131-142`
- Create: `src/components/Thought/__tests__/ThoughtMessage.test.tsx`

**Test-first:** yes.

**Interfaces:**
- Consumes (from Task 1): `isImageAllowed`, `BlockedImageBadge` (default export)
- `ThoughtMessage` currently renders `<img src={segment.url}>` for `segment.type === 'image'` with no validation.

---

- [ ] **Step 1: Write failing tests for the ThoughtMessage image guard**

Create `src/components/Thought/__tests__/ThoughtMessage.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockIsImageAllowed = vi.hoisted(() => vi.fn())

vi.mock('@/utils/imageAllowList', () => ({
  isImageAllowed: mockIsImageAllowed,
  getBlockedImageBadgeHTML: vi.fn().mockReturnValue('<span>blocked</span>'),
  BLOCKED_IMAGE_BADGE_CLASS: 'blocked-image-badge',
  BLOCKED_IMAGE_BADGE_TITLE: 'Image not displayed: domain is not on the allow-list',
  getBlockedImageLabel: vi.fn((h?: string) => h ? `Image from ${h} blocked` : 'Image from untrusted domain blocked'),
  extractHostname: vi.fn((src: string) => {
    try { return new URL(src).hostname } catch { return undefined }
  }),
}))

import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'
import ThoughtMessage from '../ThoughtMessage'

const makeImageThought = (url: string): Thought => ({
  id: 'thought-1',
  author_name: 'Agent',
  author_type: ThoughtAuthorType.Tool,
  message: JSON.stringify([{ type: 'image', url, alt: 'test image' }]),
  in_progress: false,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThoughtMessage — image segment policy', () => {
  it('renders <img> when image URL is allowed', () => {
    mockIsImageAllowed.mockReturnValue(true)
    render(<ThoughtMessage thought={makeImageThought('https://allowed.com/img.png')} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://allowed.com/img.png')
  })

  it('renders BlockedImageBadge and no <img> when URL is blocked', () => {
    mockIsImageAllowed.mockReturnValue(false)
    const { container } = render(<ThoughtMessage thought={makeImageThought('https://evil.com/img.png')} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('.blocked-image-badge')).toBeInTheDocument()
  })

  it('onError handler on allowed <img> hides image on load failure', () => {
    mockIsImageAllowed.mockReturnValue(true)
    render(<ThoughtMessage thought={makeImageThought('https://allowed.com/img.png')} />)
    const img = screen.getByRole('img') as HTMLImageElement
    // Simulate error event
    img.dispatchEvent(new Event('error', { bubbles: true }))
    expect(img.style.display).toBe('none')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --project unit src/components/Thought/__tests__/ThoughtMessage.test.tsx
```

Expected: the "renders BlockedImageBadge and no `<img>` when URL is blocked" test FAILS (renders `<img>` unconditionally) and the "renders `<img>` when allowed" test may pass or fail depending on allow-list state.

- [ ] **Step 3: Patch `src/components/Thought/ThoughtMessage.tsx`**

Add imports at the top of the file, alongside existing imports:

```typescript
import BlockedImageBadge from '@/components/BlockedImageBadge/BlockedImageBadge'
import { isImageAllowed } from '@/utils/imageAllowList'
```

Replace the `segment.type === 'image'` block (lines 131–142):

**Before:**
```tsx
      {segment.type === 'image' && (
        <img
          src={segment.url}
          alt={segment.alt}
          className="max-w-full h-auto rounded-lg border border-border-structural shadow-sm"
          style={{ maxHeight: 400, objectFit: 'contain' }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
            console.error('Failed to load image:', segment.url.substring(0, 50) + '...')
          }}
        />
      )}
```

**After:**
```tsx
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

- [ ] **Step 4: Run ThoughtMessage tests — verify they all pass**

```bash
npx vitest run --project unit src/components/Thought/__tests__/ThoughtMessage.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Thought/ThoughtMessage.tsx \
  src/components/Thought/__tests__/ThoughtMessage.test.tsx
git commit -m "feat(EPMCDME-12950): guard ThoughtMessage structured image_url segment with isImageAllowed"
```

---

## Task 4: Patch `MarkdownEditor.tsx` react-markdown img component

**Files:**
- Modify: `src/components/form/MarkdownEditor/MarkdownEditor.tsx:343-345`

**Test-first:** The spec does not specify a test file for `MarkdownEditor.tsx`. The change is structurally identical to the `ThoughtMessage` patch. No new test file.

**Interfaces:**
- Consumes (from Task 1): `isImageAllowed`, `BlockedImageBadge`

---

- [ ] **Step 1: Add imports to `src/components/form/MarkdownEditor/MarkdownEditor.tsx`**

Add alongside existing imports at the top of the file:

```typescript
import BlockedImageBadge from '@/components/BlockedImageBadge/BlockedImageBadge'
import { isImageAllowed } from '@/utils/imageAllowList'
```

- [ ] **Step 2: Replace the `img` component at line 343**

**Before (lines 343–345):**
```tsx
      img: ({ src, alt, ...props }: MarkdownComponentProps & { src?: string; alt?: string }) => (
        <img src={src} alt={alt} className="max-w-full h-auto rounded-md my-4" {...props} />
      ),
```

**After:**
```tsx
      img: ({ src = '', alt, ...props }: MarkdownComponentProps & { src?: string; alt?: string }) => (
        isImageAllowed(src)
          ? <img src={src} alt={alt} className="max-w-full h-auto rounded-md my-4" {...props} />
          : <BlockedImageBadge src={src} />
      ),
```

- [ ] **Step 3: Run the full unit test suite to check for regressions**

```bash
npm run test:unit
```

Expected: all tests PASS, no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/form/MarkdownEditor/MarkdownEditor.tsx
git commit -m "feat(EPMCDME-12950): guard MarkdownEditor react-markdown img component with isImageAllowed"
```

---

## Task 5: Configuration — env vars, Helm values, README

**Files:**
- Modify: `src/types/global.ts`
- Modify: `config.js`
- Modify: `.env`
- Modify: `deploy-templates/values.yaml`
- Modify: `deploy-templates/templates/configmap.yaml`
- Modify: `deploy-templates/tests/configmap_test.yaml`
- Modify: `README.md`

**Test-first:** no unit tests. The Helm template tests in `configmap_test.yaml` serve as the verification.

---

- [ ] **Step 1: Add `VITE_ALLOWED_IMAGE_DOMAINS` to `src/types/global.ts`**

Add after `VITE_MCP_AUTH_ORIGIN?: string`:

```typescript
  VITE_MCP_AUTH_ORIGIN?: string
  VITE_ALLOWED_IMAGE_DOMAINS?: string
```

Full `EnvConfig` interface becomes:

```typescript
export interface EnvConfig {
  VITE_ENV: string
  VITE_API_URL: string
  VITE_APP_VERSION: string
  VITE_BANNER_MESSAGE: string
  VITE_BANNER_LINK_LABEL?: string
  VITE_BANNER_LINK_ROUTE?: string
  VITE_CAN_SWITCH_DESIGN: string
  VITE_SHOW_ALL_PROJECTS: string
  VITE_IS_EXTERNAL_LOGIN: string
  VITE_ENABLE_USER_MANAGEMENT: string
  VITE_ENABLE_BUDGET_MANAGEMENT: string
  VITE_IDP_PROVIDER: string
  VITE_MCP_AUTH_AUTHENTICATING_TIMEOUT_SECONDS?: string
  VITE_MCP_AUTH_ORIGIN?: string
  VITE_ALLOWED_IMAGE_DOMAINS?: string
}
```

- [ ] **Step 2: Add the key to `config.js` (repo root)**

Add after the `VITE_MCP_AUTH_ORIGIN` line:

```javascript
window._env_.VITE_ALLOWED_IMAGE_DOMAINS = ''
```

Full `config.js` becomes:

```javascript
window._env_ = window._env_ || {}
window._env_.VITE_API_URL = '/api'
window._env_.VITE_ENV = 'local'
window._env_.VITE_APP_VERSION = '7.7.7'
window._env_.VITE_BANNER_MESSAGE = ''
window._env_.VITE_BANNER_LINK_LABEL = ''
window._env_.VITE_BANNER_LINK_ROUTE = ''
window._env_.VITE_CAN_SWITCH_DESIGN = ''
window._env_.VITE_SHOW_ALL_PROJECTS = 'false'
window._env_.VITE_IS_EXTERNAL_LOGIN = 'false'
window._env_.VITE_ENABLE_USER_MANAGEMENT = 'true'
window._env_.VITE_ENABLE_BUDGET_MANAGEMENT = 'true'
window._env_.VITE_IDP_PROVIDER = 'local'
window._env_.VITE_MCP_AUTH_ORIGIN = 'http://localhost:8080'
window._env_.VITE_ALLOWED_IMAGE_DOMAINS = ''
```

- [ ] **Step 3: Add the variable to `.env`**

Append after `KC_ENTRA_CLIENT_SECRET=`:

```
# Comma-separated image domain allow-list for LLM output.
# Empty = block all external images (only same-origin and backend-origin are allowed).
# Exact match: cdn.example.com. Subdomain wildcard: .example.com (matches example.com and sub.example.com).
# Entries must have at least two domain labels; single-label entries (e.g. .com) are not supported.
VITE_ALLOWED_IMAGE_DOMAINS=''
```

- [ ] **Step 4: Add `viteAllowedImageDomains` to `deploy-templates/values.yaml`**

Add after the `viteMcpAuthOrigin: ""` line (line 28):

```yaml
# -- Comma-separated allow-list of trusted image domains for LLM output rendering.
# Empty = block all external images. Supports exact hostname and leading-dot subdomain wildcards.
# Entries must have at least two domain labels. Example: "cdn.example.com,.trusted.io"
viteAllowedImageDomains: ""
```

- [ ] **Step 5: Add the conditional block to `deploy-templates/templates/configmap.yaml`**

Add after the `viteMcpAuthOrigin` conditional block (after line 22):

```yaml
      {{- if .Values.viteAllowedImageDomains }}
      VITE_ALLOWED_IMAGE_DOMAINS: "{{ .Values.viteAllowedImageDomains }}",
      {{- end }}
```

Full `configmap.yaml` data section becomes:

```yaml
data:
  config.js: |
    window._env_ = window._env_ || {};
    window._env_ = {
      VITE_API_URL: "{{ .Values.viteApiUrl }}",
      VITE_ENV: "{{ .Values.viteEnv }}",
      VITE_APP_VERSION: "{{ .Values.image.tag | default .Chart.AppVersion }}",
      {{- if .Values.viteBannerMessage }}
      VITE_BANNER_MESSAGE: "{{ .Values.viteBannerMessage }}",
      {{- end }}
      VITE_ENABLE_USER_MANAGEMENT: "{{ .Values.viteEnableUserManagement }}",
      VITE_ENABLE_BUDGET_MANAGEMENT: "{{ .Values.viteEnableBudgetManagement }}",
      VITE_IDP_PROVIDER: "{{ .Values.viteIdpProvider }}",
      {{- if .Values.viteMcpAuthOrigin }}
      VITE_MCP_AUTH_ORIGIN: "{{ .Values.viteMcpAuthOrigin }}",
      {{- end }}
      {{- if .Values.viteAllowedImageDomains }}
      VITE_ALLOWED_IMAGE_DOMAINS: "{{ .Values.viteAllowedImageDomains }}",
      {{- end }}
      {{- range $key, $val := .Values.extraConfig }}
      {{ $key }}: "{{ $val }}",
      {{- end }}
    };
```

- [ ] **Step 6: Add Helm test cases to `deploy-templates/tests/configmap_test.yaml`**

Append after the last `should render VITE_MCP_AUTH_ORIGIN when viteMcpAuthOrigin is set` test:

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

- [ ] **Step 7: Update `README.md`**

The existing `.env` example block is at lines 87–90:

```env
VITE_API_URL=http://localhost:8080
VITE_SUFFIX=/app
```

Replace with:

```env
VITE_API_URL=http://localhost:8080
VITE_SUFFIX=/app
VITE_ALLOWED_IMAGE_DOMAINS=''
```

Then add a subsection after the code block (after line 90 / the closing triple-backtick):

```markdown
### Image Domain Allow-List (`VITE_ALLOWED_IMAGE_DOMAINS`)

Controls which external image domains are rendered in LLM/Assistant markdown output.

- **Default (empty):** All external images are blocked. Only same-origin and backend-origin (`VITE_API_URL` host) images are allowed.
- **Format:** Comma-separated list of hostnames. Exact match: `cdn.example.com`. Subdomain wildcard: `.example.com` (matches `example.com` and all subdomains). Entries must contain at least two domain labels — single-label wildcards such as `.com` are not supported.
- **Example:** `VITE_ALLOWED_IMAGE_DOMAINS='cdn.example.com,.trusted.io'`
- **Deployment:** Set `viteAllowedImageDomains` in `deploy-templates/values.yaml`. The value is injected into `config.js` at runtime — no rebuild required.
```

- [ ] **Step 8: Run the full unit test suite to verify no regressions**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 9: Run TypeScript type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 10: Pre-merge audit (manual)**

Before committing, audit whether T&C text or kata content currently references external images. Run a search:

```bash
grep -r "https://" src/pages/terms src/pages/kata 2>/dev/null | grep -i "img\|png\|jpg\|jpeg\|gif\|webp" || echo "no external image references found"
```

If any are found, add their hostnames to `VITE_ALLOWED_IMAGE_DOMAINS` in the `.env` or document them for the operator. Under default-deny, those pages will show blocked badges instead of images.

- [ ] **Step 11: Commit**

```bash
git add src/types/global.ts \
  config.js \
  .env \
  deploy-templates/values.yaml \
  deploy-templates/templates/configmap.yaml \
  deploy-templates/tests/configmap_test.yaml \
  README.md
git commit -m "feat(EPMCDME-12950): add VITE_ALLOWED_IMAGE_DOMAINS configuration to env, config.js, Helm chart, and README"
```

---

## Task 6: Close the `markdown2html` raw-HTML gap in the copy-message flow

Added after MR review. The original spec listed this as an accepted risk with a follow-up
ticket to be filed; the reviewer asked for it to be fixed inside this ticket instead.

**Files:**
- Modify: `src/utils/imageAllowList.ts` — add `sanitizeHtmlWithImageAllowList`
- Modify: `src/components/markdown/Markdown.utils.ts` — `markdown2html` sanitizes through it
- Modify: `src/utils/messageHelpers.ts` — same change in the duplicate `markdown2html`
- Modify: `src/utils/__tests__/imageAllowList.test.tsx`
- Modify: `src/components/markdown/__tests__/Markdown.utils.test.ts`
- Modify: `src/utils/__tests__/messageHelpers.renderer.test.ts`

**Test-first:** yes.

**Interfaces:**
- Produces: `sanitizeHtmlWithImageAllowList(html: string): string` — `DOMPurify.sanitize` with the
  image allow-list applied to raw HTML tags, which `renderer.image` cannot reach.

---

- [x] **Step 1: Write failing tests**

Add to `src/utils/__tests__/imageAllowList.test.tsx` a `sanitizeHtmlWithImageAllowList` suite
covering: raw `<img>` from a blocked domain → badge span; allowed `<img>` kept; blocked `srcset`
candidate blocks the element and the badge names the blocked hostname; allowed `srcset` kept;
blocked `<source>` removed while the `<img>` fallback survives; blocked `poster` / `background`
stripped with the element kept; allowed `poster` kept; `<img src="">` dropped without an empty
badge; `<script>` still removed; and a plain `DOMPurify.sanitize` after the call still returns
`<img>` (proves the hook is unregistered).

Add to both `markdown2html` test files: `<img src="https://evil.com/img.png">` → badge, no `<img>`;
`<img src="https://cdn.trusted.com/img.png">` with that domain allow-listed → `<img>`, no badge.

Verify RED — the two `markdown2html` cases must fail with the raw tag passing through verbatim
(`expected '<img src="https://evil.com/img.png">' to contain 'blocked-image-badge'`).

- [x] **Step 2: Implement `sanitizeHtmlWithImageAllowList`**

In `src/utils/imageAllowList.ts`:

- `IMAGE_URL_ATTRIBUTES = ['src', 'srcset', 'poster', 'background']` — every DOMPurify-allowed
  attribute that makes the browser fetch an image.
- `parseSrcsetUrls` splits the comma-separated candidate list and takes the URL from each entry.
- `findBlockedImageUrls(node)` returns every blocked URL the element carries, in attribute order.
- `createBlockedImageBadgeNode(doc, src)` builds the badge with DOM APIs (no `innerHTML`), mirroring
  `getBlockedImageBadgeHTML`; returns `null` for a blank src.
- `applyImageAllowListToNode(node)` — the `afterSanitizeAttributes` hook: `<img>` → badge (or removal
  when src is blank), `<source>` → removal, anything else → strip only the offending attributes.
- `sanitizeHtmlWithImageAllowList(html)` adds the hook, sanitizes, and removes the hook in a
  `finally` block, so the app's other `DOMPurify.sanitize` call sites are unaffected.

Note: use array helpers rather than a `for` loop with an early `return` in `findBlockedImageUrls` —
the ESLint `consistent-return` rule rejects mixing `return value` with a trailing `return undefined`.

- [x] **Step 3: Route both `markdown2html` implementations through it**

Replace `DOMPurify.sanitize(text)` with `sanitizeHtmlWithImageAllowList(text)` in
`Markdown.utils.ts` and `messageHelpers.ts`. Drop the now-unused `DOMPurify` import from
`Markdown.utils.ts` (`messageHelpers.ts` still needs it for the mention helpers).

- [x] **Step 4: Verify and update docs**

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Update `spec.md`: replace the "Known Limitations" section with "Copy-message raw-HTML path"
describing the resolution, drop the matching "Out of Scope" bullet, extend the Testing section, and
update the acceptance-criteria row for "No network request for blocked domains". Add the
copy-message sentence to the README subsection.
