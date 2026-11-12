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
import { describe, expect, it, vi } from 'vitest'

import type { SessionDetail } from '@/types/cliAnalytics'

import SessionModal from '../views/SessionModal'

vi.mock('@/components/Popup', () => ({
  default: ({ headerContent }: { headerContent?: React.ReactNode }) => (
    <div data-testid="popup">{headerContent}</div>
  ),
}))

vi.mock('../views/SessionBody', () => ({
  default: () => <div data-testid="session-body" />,
}))

const mockUseCliAnalyticsSession = vi.fn()
vi.mock('../hooks/useCliAnalyticsSession', () => ({
  useCliAnalyticsSession: () => mockUseCliAnalyticsSession(),
}))

const mockUseIsTruncated = vi.fn()
vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: () => mockUseIsTruncated(),
}))

const MOCK_SESSION: SessionDetail = {
  trace_id: 'abc123',
  developer_name: 'alice@co.com',
  repository: 'svc',
  branch: null,
  start_time: '2026-07-01T09:00:00Z',
  duration_ms: 45000,
  model_name: 'claude-sonnet-4-5',
  input_tokens: 8500,
  output_tokens: 1800,
  cost_usd: 0.085,
  tool_call_count: 12,
  harness_name: 'Cursor',
  prompt: 'Explain why the payment retry logic drops events under load and propose a fix',
  events: [],
}

const PROMPT_LINE = `Prompt: ${MOCK_SESSION.prompt}`

describe('SessionModal', () => {
  it('titles the session by its metadata, not a hardcoded value', () => {
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText('alice@co.com · Cursor · claude-sonnet-4-5')
    expect(titleEl).toHaveClass('font-semibold')
    expect(screen.getByTestId('popup').textContent).not.toContain('Claude-Code')
  })

  it('shows user, harness and models, then repository, branch and framework, then the prompt', () => {
    mockUseCliAnalyticsSession.mockReturnValue({
      session: { ...MOCK_SESSION, branch: 'main', delivery_framework: 'Superpowers' },
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const lines = [
      screen.getByText('alice@co.com · Cursor · claude-sonnet-4-5'),
      screen.getByText('svc · main · Superpowers'),
      screen.getByText(PROMPT_LINE),
    ]
    // In that order, top to bottom.
    const text = screen.getByTestId('popup').textContent ?? ''
    const positions = lines.map((line) => text.indexOf(line.textContent ?? ''))
    expect(positions).toEqual([...positions].sort((x, y) => x - y))
    // The location line looks the same as the first line.
    expect(lines[1]).toHaveClass('text-base', 'font-semibold', 'text-text-primary')
    // No date in the header: the summary below shows the start time.
    lines.forEach((line) => expect(line.textContent).not.toMatch(/2026/))
  })

  it('does not use the raw prompt as the title (EPMCDME-16991)', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.queryByText(MOCK_SESSION.prompt as string)).toBeNull()
    const promptEl = screen.getByText(PROMPT_LINE)
    expect(promptEl).toHaveClass('text-xs')
    expect(promptEl).not.toHaveClass('font-semibold')
  })

  it('sets a tooltip target with the full title when the title is truncated', () => {
    mockUseIsTruncated.mockReturnValue(true)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText(/^alice@co\.com · Cursor · /)
    expect(titleEl).toHaveAttribute('data-pr-tooltip', titleEl.textContent)
  })

  it('does not set a tooltip when the title is not truncated', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByText(/^alice@co\.com · Cursor · /)).toHaveAttribute('data-pr-tooltip', '')
  })

  it('sets a tooltip target with the full prompt when the prompt line is truncated', () => {
    mockUseIsTruncated.mockReturnValue(true)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByText(PROMPT_LINE)).toHaveAttribute('data-pr-tooltip', PROMPT_LINE)
  })

  it('does not set a tooltip when the prompt line is not truncated', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByText(PROMPT_LINE)).toHaveAttribute('data-pr-tooltip', '')
  })

  it('caps an extremely long prompt so the prompt line and its tooltip stay a bounded size', () => {
    mockUseIsTruncated.mockReturnValue(true)
    const veryLongPrompt = 'x'.repeat(5000)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: { ...MOCK_SESSION, prompt: veryLongPrompt },
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const promptEl = screen.getByText(/^Prompt: x+\.\.\.$/)
    expect(promptEl.textContent).toHaveLength('Prompt: '.length + 1003)
    expect(promptEl).toHaveAttribute('data-pr-tooltip', promptEl.textContent)
  })

  it('shows no prompt line when no prompt is present', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: { ...MOCK_SESSION, prompt: undefined },
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.queryByText(/Prompt:/)).toBeNull()
  })

  it('falls back to "Session" as the title while the session is loading', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({ session: null, loading: true, error: null })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByText('Session')).toBeInTheDocument()
  })
})
