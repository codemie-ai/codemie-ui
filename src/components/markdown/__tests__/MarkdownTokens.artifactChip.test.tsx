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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import Markdown from '@/components/markdown/Markdown'
import { clearSharedFileGrants, setSharedFileGrants } from '@/utils/sharedFileGrants'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

const { mockFilesStore } = vi.hoisted(() => ({
  mockFilesStore: {
    downloadFile: vi.fn(),
    getFileURL: vi.fn((url: string) => `mocked-url-${url}`),
  },
}))

vi.mock('@/utils/api', async () => {
  const actual = await vi.importActual<typeof import('@/utils/api')>('@/utils/api')
  return { ...actual, default: mockApi }
})

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getAllowedImageDomains: () => '' },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockFilesStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/files', () => ({ filesStore: mockFilesStore }))
vi.mock('@/hooks/useFeatureFlags', () => ({
  useMermaidEnabled: () => [true, true],
}))

const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

/**
 * A file id in the shape the back end actually emits: base64 of the `<len>~<value>` triple
 * `[mime_type, owner, name]` (`artifact_storage.py:67`, `file_object.py:147`). The chip has to
 * decode this to show `report.csv`; the raw segment is what the download call must carry.
 */
const part = (value: string) => `${value.length}~${value}`
const FILE_ID = btoa(`${part('text/csv')}${part(UUID)}${part('report.csv')}`)
const ARTIFACT = `sandbox:/v1/files/${FILE_ID}`

describe('MarkdownTokens — artifact download chip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an artifact link as a download chip', () => {
    render(<Markdown content={`[Download](${ARTIFACT})`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('exposes the decoded MIME type on the type badge', () => {
    render(<Markdown content={`[Download](${ARTIFACT})`} />)

    expect(screen.getByText('CSV')).toHaveAttribute('title', 'text/csv')
  })

  it('labels the chip without the storage uuid prefix', () => {
    const prefixedName = `${UUID}_report.csv`
    const prefixedId = btoa(`${part('text/csv')}${part(UUID)}${part(prefixedName)}`)

    render(<Markdown content={`[Download](sandbox:/v1/files/${prefixedId})`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('downloads through filesStore with the raw file id', async () => {
    render(<Markdown content={`[Download](${ARTIFACT})`} />)

    await userEvent.click(screen.getByLabelText('Download file'))

    expect(mockFilesStore.downloadFile).toHaveBeenCalledWith(FILE_ID)
  })

  it('renders the chip for an artifact link inside surrounding prose', () => {
    render(<Markdown content={`Here is your file: [Download](${ARTIFACT}) enjoy.`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  // A bulleted list is the natural shape for a multi-file reply, and marked lexes the link
  // under a `text` token inside the list item rather than a paragraph.
  it('renders the chip for an artifact link inside a list item', () => {
    render(<Markdown content={`- [Download](${ARTIFACT})`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  it('renders a disarmed link inside a list item as plain text', () => {
    const { container } = render(<Markdown content="- [Download](filesystem:/tmp/x.xlsx)" />)

    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(container.querySelector('li a')).toBeNull()
  })

  // Assistants routinely bold the download line, which makes the link a grandchild of the
  // paragraph rather than a direct child.
  it('renders the chip for an artifact link nested inside emphasis', () => {
    render(<Markdown content={`**[Download](${ARTIFACT})**`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  it('leaves an ordinary link untouched', () => {
    const { container } = render(<Markdown content="[site](https://example.com)" />)

    expect(container.querySelector('a[target="_blank"]')).not.toBeNull()
  })

  // An ordinary paragraph keeps its single-blob rendering, nested <p> and all — that is the
  // pre-existing shape of getBlockProps, and leaving it alone is what bounds the blast radius.
  it('leaves an ordinary paragraph rendering unchanged', () => {
    const { container } = render(<Markdown content="just some **prose** here" />)

    expect(container.querySelector('p > p')).not.toBeNull()
    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.textContent).toContain('just some prose here')
  })

  it('does not recurse into a list item with no seam-rendered link', () => {
    const { container } = render(<Markdown content="- plain **item** here" />)

    expect(container.querySelector('li strong')).not.toBeNull()
    expect(container.textContent).toContain('plain item here')
  })

  it('does not recurse into a paragraph with a non-artifact link', () => {
    const { container } = render(<Markdown content="see [site](https://example.com) now" />)

    expect(container.querySelector('p > p')).not.toBeNull()
  })

  it('does not throw on a partially-streamed link', () => {
    expect(() => render(<Markdown content="[Download](sandbo" />)).not.toThrow()
    expect(mockFilesStore.downloadFile).not.toHaveBeenCalled()
  })
  // AC #4: DOMPurify strips these hrefs, leaving an <a> that looks clickable and does nothing.
  // Assembled from parts so the literal does not trip eslint's `no-script-url`.
  const SCRIPT_URL = `java${'script'}:alert(1)`

  it.each(['filesystem:/tmp/x.xlsx', 'file:///tmp/x', SCRIPT_URL])(
    'renders %s as plain text with no affordance',
    (href) => {
      const { container } = render(<Markdown content={`[Download](${href})`} />)

      expect(screen.getByText('Download')).toBeInTheDocument()
      expect(container.querySelector('a')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
    }
  )

  it('keeps a mailto link clickable', () => {
    const { container } = render(<Markdown content="[mail](mailto:a@b.com)" />)

    expect(container.querySelector('a')).not.toBeNull()
  })

  it('keeps a relative link clickable', () => {
    const { container } = render(<Markdown content="[docs](/docs/page)" />)

    expect(container.querySelector('a')).not.toBeNull()
  })
  // AC #7: reusing File.tsx pulled a Valtio store into a previously store-free markdown tree.
  // A mixed document proves every other token type still renders alongside the chip.
  it('renders every token type alongside an artifact chip', () => {
    const content = [
      '# Heading',
      '',
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '```js',
      'const x = 1',
      '```',
      '',
      '```mermaid',
      'graph TD; A-->B;',
      '```',
      '',
      '1. first',
      '2. second',
      '',
      '![pic](https://cdn.example.com/a.png)',
      '',
      `[Download](${ARTIFACT})`,
    ].join('\n')

    const { container } = render(<Markdown content={content} />)

    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelectorAll('ol > li').length).toBeGreaterThan(0)
    expect(container.textContent).toContain('Heading')
    expect(container.textContent).toContain('const x = 1')
    // No blockquote case: sanitizeMessage escapes '>' to '&gt;' before lexing, so a blockquote
    // never reaches the renderer in this app. Pre-existing and unrelated to this change.

    // The image is either rendered or replaced by the blocked-image badge — both are fine here,
    // what matters is that the allow-list path still runs and does not throw.
    const imageHandled =
      container.querySelector('img') !== null ||
      container.querySelector('[data-blocked-image-hostname]') !== null
    expect(imageHandled).toBe(true)

    // And the chip still renders in the same document
    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })
})

// A share recipient's message text holds bare tokens; `resolveSandboxFileUrls` swaps each for the
// grant-carrying form from `shared_file_urls`, so the chip must accept that query and download with it.
describe('MarkdownTokens — shared-chat artifact chip', () => {
  const GRANTED_ID = `${FILE_ID}?share_token=AbC123`

  beforeEach(() => {
    vi.clearAllMocks()
    setSharedFileGrants({ [FILE_ID]: GRANTED_ID })
  })

  afterEach(() => {
    clearSharedFileGrants()
  })

  it('renders the chip and downloads with the share grant', async () => {
    render(<Markdown content={`[Download](${ARTIFACT})`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Download file'))

    expect(mockFilesStore.downloadFile).toHaveBeenCalledWith(GRANTED_ID)
  })
})

// D1: the back end names workspace artifacts `artifacts/<turn-id>/<name>`.
describe('MarkdownTokens — workspace artifact chip', () => {
  const idFor = (name: string) => btoa(`${part('text/csv')}${part(UUID)}${part(name)}`)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('labels renamed duplicates by their own names and downloads each by its own id', async () => {
    const first = idFor('artifacts/t1/report.csv')
    const second = idFor('artifacts/t1/report (2).csv')

    render(
      <Markdown content={`[A](sandbox:/v1/files/${first})\n\n[B](sandbox:/v1/files/${second})`} />
    )

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    expect(screen.getByText('report (2).csv')).toBeInTheDocument()

    const buttons = screen.getAllByLabelText('Download file')
    await userEvent.click(buttons[0])
    await userEvent.click(buttons[1])

    expect(mockFilesStore.downloadFile).toHaveBeenNthCalledWith(1, first)
    expect(mockFilesStore.downloadFile).toHaveBeenNthCalledWith(2, second)
  })

  it('downloads a path-shaped artifact with its share grant in the file id', async () => {
    const grantedId = `${idFor('artifacts/t1/report.csv')}?share_token=abc123`

    render(<Markdown content={`[Download](sandbox:/v1/files/${grantedId})`} />)

    expect(screen.getByText('report.csv')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Download file'))

    expect(mockFilesStore.downloadFile).toHaveBeenCalledWith(grantedId)
  })

  it.each([
    '`x.csv` stays on the MCP server and was not delivered',
    '`x.csv` was not saved: it is empty',
  ])('renders the failure text %j with no chip and no link', (content) => {
    const { container } = render(<Markdown content={content} />)

    expect(container.textContent).toContain('x.csv')
    expect(screen.queryByLabelText('Download file')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })
})

describe('artifact chip layout in prose', () => {
  it('hugs its content instead of stretching to the paragraph width', () => {
    const { container } = render(<Markdown content={`[Download](${ARTIFACT})`} />)

    // The chip is a flex container whose action buttons use `ml-auto`, so as a block it fills
    // its parent and strands the download icon at the far right; inline-flex sizes to content.
    expect(container.querySelector('.inline-flex')).not.toBeNull()

    // A <div> inside a <p> is invalid HTML: the browser auto-closes the paragraph and reparents
    // the chip, so no width class on the chip can survive. jsdom does not reproduce that, so
    // assert the structure React emits rather than the layout it implies.
    expect(container.querySelector('p div')).toBeNull()
  })

  // Assistants name a generated file mid-sentence; the text around the chip must stay one line,
  // not split into a <p> per fragment.
  it('keeps the text around a chip in one flowing sentence', () => {
    const { container } = render(
      <Markdown content={`Your report is ready: [x](${ARTIFACT}) — open it in Excel.`} />
    )

    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('.flex-col.gap-2')).toBeNull()
    expect(container.textContent).toContain('Your report is ready: ')
    expect(container.textContent).toContain(' — open it in Excel.')
    expect(screen.getByText('report.csv')).toBeInTheDocument()
  })

  // Stored messages with a stripped scheme mid-sentence predate artifacts; they must not tear.
  it('keeps a disarmed link mid-sentence in one flowing sentence', () => {
    const { container } = render(
      <Markdown content="I saved it to [report.xlsx](filesystem:/s/report.xlsx) on the server, see **there**." />
    )

    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('strong')?.textContent).toBe('there')
    expect(container.textContent).toBe('I saved it to report.xlsx on the server, see there.')
  })

  it('keeps a list item with a chip and emphasis on one line', () => {
    const { container } = render(<Markdown content={`- CSV: [file](${ARTIFACT}) with *data*`} />)

    expect(container.querySelector('li p')).toBeNull()
    expect(container.querySelector('li em')?.textContent).toBe('data')
    expect(container.querySelector('li')?.textContent).toContain('CSV: ')
    expect(screen.getByText('report.csv')).toBeInTheDocument()
  })
})

// A turn artifact keeps its chip only when the back end listed it in the conversation's file_names
describe('MarkdownTokens — listed artifact check', () => {
  const idFor = (name: string, owner: string) =>
    btoa(`${part('text/csv')}${part(owner)}${part(name)}`)
  const art = idFor('artifacts/t1/report.csv', 'workspace-w1')
  const link = (id: string) => `[report.csv](sandbox:/v1/files/${id})`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearSharedFileGrants()
  })

  it('keeps the chip for a listed artifact', () => {
    render(<Markdown content={link(art)} listedArtifactIds={new Set([art])} />)

    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  it.each([
    ['on its own', link(art)],
    ['nested in bold', `**${link(art)}**`],
    ['in a list item', `- ${link(art)}`],
  ])('renders an unlisted artifact %s as text', (_, content) => {
    const { container } = render(<Markdown content={content} listedArtifactIds={new Set()} />)

    expect(container.textContent).toContain('report.csv')
    expect(screen.queryByLabelText('Download file')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('keeps the chip for a listed artifact carrying a share grant', async () => {
    setSharedFileGrants({ [art]: `${art}?share_token=AbC123` })

    render(<Markdown content={link(art)} listedArtifactIds={new Set([art])} />)

    await userEvent.click(screen.getByLabelText('Download file'))
    expect(mockFilesStore.downloadFile).toHaveBeenCalledWith(`${art}?share_token=AbC123`)
  })

  it('keeps the chip for an unlisted legacy link', () => {
    render(<Markdown content={link(idFor(`${UUID}_a.csv`, UUID))} listedArtifactIds={new Set()} />)

    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  it('keeps the chip for an unlisted workspace file outside artifacts/', () => {
    render(
      <Markdown
        content={link(idFor('charts/a.csv', 'workspace-w1'))}
        listedArtifactIds={new Set()}
      />
    )

    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })

  it("keeps today's behaviour without a set", () => {
    render(<Markdown content={link(art)} />)

    expect(screen.getByLabelText('Download file')).toBeInTheDocument()
  })
})

// A file link whose token the back end could not read: no chip, and no anchor to a failing download
describe('MarkdownTokens — unusable file token', () => {
  const malformed = `[closed_positions_analysis.xlsx](sandbox:/v1/files/${btoa(
    '8~text/csv6~owner1'
  )})`

  it.each([
    ['on its own', malformed],
    ['in a loose list item', `- ${malformed}\n\n- second item`],
    ['nested in bold', `**${malformed}**`],
  ])('renders the link %s as text', (_, content) => {
    const { container } = render(<Markdown content={content} />)

    expect(container.textContent).toContain('closed_positions_analysis.xlsx')
    expect(screen.queryByLabelText('Download file')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })
})
