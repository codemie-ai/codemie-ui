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

describe('SessionModal', () => {
  it('renders the session harness_name in the subtitle, not a hardcoded value', () => {
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByTestId('popup').textContent).toContain('Cursor')
    expect(screen.getByTestId('popup').textContent).not.toContain('Claude-Code')
  })

  it('sets a tooltip target with the full subtitle when the subtitle is truncated', () => {
    mockUseIsTruncated.mockReturnValue(true)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const subtitleEl = screen.getByText(/Cursor/)
    expect(subtitleEl).toHaveAttribute('data-pr-tooltip', expect.stringContaining('Cursor'))
  })

  it('does not set a tooltip when the subtitle is not truncated', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const subtitleEl = screen.getByText(/Cursor/)
    expect(subtitleEl).toHaveAttribute('data-pr-tooltip', '')
  })

  it('sets a tooltip target with the full title when the title is truncated', () => {
    mockUseIsTruncated.mockReturnValue(true)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText(MOCK_SESSION.prompt as string)
    expect(titleEl).toHaveAttribute('data-pr-tooltip', MOCK_SESSION.prompt)
  })

  it('does not set a tooltip when the title is not truncated', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText(MOCK_SESSION.prompt as string)
    expect(titleEl).toHaveAttribute('data-pr-tooltip', '')
  })

  it('caps an extremely long prompt so the title and its tooltip stay a bounded size', () => {
    mockUseIsTruncated.mockReturnValue(true)
    const veryLongPrompt = 'x'.repeat(5000)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: { ...MOCK_SESSION, prompt: veryLongPrompt },
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText(/^x+\.\.\.$/)
    expect(titleEl.textContent).toHaveLength(1003)
    expect(titleEl).toHaveAttribute('data-pr-tooltip', titleEl.textContent)
  })

  it('falls back to "Session" as the title when no prompt is present', () => {
    mockUseIsTruncated.mockReturnValue(false)
    mockUseCliAnalyticsSession.mockReturnValue({
      session: { ...MOCK_SESSION, prompt: undefined },
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByText('Session')).toBeInTheDocument()
  })
})
