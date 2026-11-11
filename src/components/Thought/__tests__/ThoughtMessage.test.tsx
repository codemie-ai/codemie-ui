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

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { BLOCKED_IMAGE_BADGE_CLASS } from '@/components/BlockedImageBadge/BlockedImageBadge'
import { DOCUMENT_SOURCE_KEY } from '@/constants'
import { CONFIG_KEYS } from '@/constants/configKeys'
import { appInfoStore } from '@/store/appInfo'
import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'
import { transformChatBEtoFE } from '@/utils/chatHelpers'

import ThoughtMessage from '../ThoughtMessage'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ default: mockApi }))

function setAllowedImageDomains(value: string) {
  appInfoStore.configs = [
    { id: CONFIG_KEYS.ALLOWED_IMAGE_DOMAINS, settings: { enabled: true, value } },
  ]
}

function makeImageThought(url: string): Thought {
  return {
    id: 'thought-1',
    author_name: 'Test Tool',
    author_type: ThoughtAuthorType.Tool,
    message: JSON.stringify([{ type: 'image_url', image_url: { url } }]),
    in_progress: false,
  }
}

beforeEach(() => {
  mockApi.BASE_URL = 'https://api.example.com'
  appInfoStore.configs = []
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const longText = (count = 100, prefix = 'Result') =>
  Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join('\n')

const makeTextThought = (overrides: Partial<Thought> = {}): Thought => ({
  id: 'text-thought',
  author_type: ThoughtAuthorType.Tool,
  message: longText(),
  in_progress: false,
  ...overrides,
})

describe('ThoughtMessage — tool Result disclosure boundaries', () => {
  it.each([
    { author_type: ThoughtAuthorType.Tool },
    { author_type: undefined, tool_name: 'search' },
    // Raw backend metadata can be null despite the frontend Thought type.
    { author_type: null as unknown as Thought['author_type'], tool_name: 'search' },
  ])('previews positively identified tools: %j', (metadata) => {
    render(<ThoughtMessage thought={makeTextThought(metadata)} />)
    expect(screen.getByRole('button', { name: 'Show 60 hidden lines' })).toBeInTheDocument()
    expect(screen.getByText('Result 20')).toBeInTheDocument()
    expect(screen.getByText('Result 81')).toBeInTheDocument()
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
  })

  it('previews Tool-default hydrated history without changing hydration', () => {
    const chat = transformChatBEtoFE({
      id: 'chat',
      conversation_name: 'Chat',
      history: [
        { historyIndex: 0, message: 'Question', date: '', executionId: null },
        {
          historyIndex: 0,
          message: 'Assistant reply',
          date: '',
          executionId: null,
          thoughts: [{ id: 'hydrated', message: longText() }],
        },
      ],
    })
    render(<ThoughtMessage thought={chat.history[0][0].thoughts![0]} />)
    expect(screen.getByRole('button', { name: 'Show 60 hidden lines' })).toBeInTheDocument()
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
  })

  it.each([
    { author_type: ThoughtAuthorType.Assistant, tool_name: 'search' },
    { author_type: 'WorkflowState', tool_name: 'search' },
    { author_type: 'Unknown', tool_name: 'search' },
    { author_type: '', tool_name: 'search' },
    { author_type: undefined },
    { author_type: undefined, tool_name: '' },
    { author_type: undefined, tool_name: '   ' },
  ])('leaves excluded and identity-free Thoughts full: %j', (metadata) => {
    const { container } = render(<ThoughtMessage thought={makeTextThought(metadata)} />)
    expect(container.querySelector('p')?.textContent).toBe(longText().replaceAll('\n', ''))
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines|Collapse/ })).toBeNull()
  })

  it('keeps two text segments independent and the document between them', async () => {
    const user = userEvent.setup()
    render(
      <ThoughtMessage
        thought={makeTextThought({
          message: `${longText()}\n${DOCUMENT_SOURCE_KEY}**Source:** report.txt\n**File Content:** Document body\n${DOCUMENT_SOURCE_KEY}${longText(
            60,
            'After'
          )}`,
        })}
      />
    )
    const documentToggle = screen.getByRole('button', { name: 'report.txt' })
    const first = screen.getByRole('button', { name: 'Show 60 hidden lines' })
    const firstSegment = first.parentElement!
    const second = screen.getByRole('button', { name: 'Show 20 hidden lines' })
    expect(first.compareDocumentPosition(documentToggle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(documentToggle.compareDocumentPosition(second)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    await user.click(first)
    expect(screen.getByText('Result 21')).toBeInTheDocument()
    expect(screen.queryByText('After 21')).not.toBeInTheDocument()
    expect(second).toHaveAttribute('aria-expanded', 'false')
    await user.click(documentToggle)
    expect(screen.getByText('Document body')).toBeInTheDocument()
    await user.click(second)
    expect(screen.getByText('After 21')).toBeInTheDocument()
    await user.click(within(firstSegment).getByRole('button', { name: 'Collapse' }))
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
    expect(screen.getByText('After 21')).toBeInTheDocument()
    expect(screen.getByText('Document body')).toBeInTheDocument()
  })

  it.each([
    { output_format: 'markdown' },
    { author_name: 'Codemie Thoughts' },
    { author_type: 'WorkflowState', tool_name: 'search' },
  ])('preserves the full long Markdown renderer: %j', (metadata) => {
    appInfoStore.configs = [
      { id: 'feature:renderStateOutputAsMarkdown', settings: { enabled: true } },
    ]
    const message = Array.from({ length: 100 }, (_, index) => `# Heading ${index + 1}`).join('\n\n')
    const { container } = render(
      <ThoughtMessage thought={makeTextThought({ ...metadata, message })} />
    )
    expect(container.querySelector('.markdown')).toBeInTheDocument()
    expect(screen.getAllByRole('heading')).toHaveLength(100)
    expect(screen.getByRole('heading', { name: 'Heading 21' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heading 100' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines|Collapse/ })).toBeNull()
  })

  it('preserves full WorkflowState JSON and its existing code controls', () => {
    appInfoStore.configs = [
      { id: 'feature:renderStateOutputAsMarkdown', settings: { enabled: true } },
    ]
    const payload = { values: Array.from({ length: 100 }, (_, index) => `State ${index + 1}`) }
    const { container } = render(
      <ThoughtMessage
        thought={makeTextThought({
          author_type: 'WorkflowState',
          tool_name: 'search',
          message: JSON.stringify(payload),
        })}
      />
    )
    expect(container.querySelector('code')?.textContent).toBe(JSON.stringify(payload, null, 2))
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines|Collapse/ })).toBeNull()
  })

  it('preserves image routing alongside full long Markdown array content', () => {
    const message = '# Title\n\n' + longText()
    const { container } = render(
      <ThoughtMessage
        thought={makeTextThought({
          output_format: 'markdown',
          message: JSON.stringify([
            { type: 'text', text: message },
            { type: 'image_url', image_url: { url: 'https://production.example.com/image.png' } },
          ]),
        })}
      />
    )
    expect(screen.getByRole('img', { name: 'Generated image' })).toHaveAttribute(
      'src',
      'https://production.example.com/image.png'
    )
    expect(container.querySelector('.markdown')?.textContent).toContain('Result 21')
    expect(container.querySelector('.markdown')?.textContent).toContain('Result 100')
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines|Collapse/ })).toBeNull()
  })

  it('keeps a document-only long body behind its existing document toggle', async () => {
    const user = userEvent.setup()
    render(
      <ThoughtMessage
        thought={makeTextThought({
          message: `${DOCUMENT_SOURCE_KEY}**Source:** report.txt\n**File Content:** ${longText()}`,
        })}
      />
    )
    const toggle = screen.getByRole('button', { name: 'report.txt' })
    await user.click(toggle)
    expect(toggle.nextElementSibling?.textContent).toBe(longText())
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines|Collapse/ })).toBeNull()
  })
})

describe('ThoughtMessage — image allow-list', () => {
  it('renders BlockedImageBadge when the image URL is not on the allow-list', () => {
    render(<ThoughtMessage thought={makeImageThought('https://evil.com/img.png')} />)
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders <img> when the image URL is on the allow-list', () => {
    setAllowedImageDomains('cdn.trusted.com')
    render(<ThoughtMessage thought={makeImageThought('https://cdn.trusted.com/img.png')} />)
    expect(document.querySelector('img')).toBeInTheDocument()
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).not.toBeInTheDocument()
  })

  it('renders <img> for a same-origin image', () => {
    render(
      <ThoughtMessage thought={makeImageThought('https://production.example.com/files/img.png')} />
    )
    expect(document.querySelector('img')).toBeInTheDocument()
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).not.toBeInTheDocument()
  })
})
