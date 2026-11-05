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

import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SessionDetail } from '@/types/cliAnalytics'

import SessionModal from '../views/SessionModal'

// Deliberately does NOT mock '@/hooks/useIsTruncated' — this file exercises the real hook
// against SessionModal's actual async loading transition (session arrives after mount).

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

afterEach(() => {
  vi.useRealTimers()
})

describe('SessionModal subtitle truncation (real useIsTruncated)', () => {
  it('detects truncation once the subtitle mounts after the session loads asynchronously', async () => {
    // First render: session has not arrived yet (mirrors useCliAnalyticsSession's real initial
    // return value), so the subtitle span does not exist on mount.
    mockUseCliAnalyticsSession.mockReturnValue({ session: null, loading: true, error: null })
    const { rerender } = render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    // Session arrives; the subtitle span mounts for the first time only now.
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })
    rerender(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const subtitleEl = screen.getByText(/Cursor/)
    Object.defineProperty(subtitleEl, 'scrollWidth', { configurable: true, value: 500 })
    Object.defineProperty(subtitleEl, 'clientWidth', { configurable: true, value: 100 })

    // useIsTruncated schedules its check in a setTimeout(0); poll until it has run.
    await waitFor(() => {
      expect(subtitleEl).toHaveAttribute('data-pr-tooltip', expect.stringContaining('Cursor'))
    })
  })

  it('re-measures truncation when the subtitle text changes while already mounted', async () => {
    vi.useFakeTimers()

    // Session already loaded with a short subtitle (one field only) that is not truncated.
    const SHORT_SESSION: SessionDetail = { ...MOCK_SESSION, model_name: '', repository: null }
    mockUseCliAnalyticsSession.mockReturnValue({
      session: SHORT_SESSION,
      loading: false,
      error: null,
    })
    const { rerender } = render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const shortSubtitleEl = screen.getByText('Cursor')
    Object.defineProperty(shortSubtitleEl, 'scrollWidth', { configurable: true, value: 50 })
    Object.defineProperty(shortSubtitleEl, 'clientWidth', { configurable: true, value: 50 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(shortSubtitleEl).toHaveAttribute('data-pr-tooltip', '')

    // The session data refetches for the same trace and now carries a long subtitle, while the
    // modal (and, without the fix, the SessionSubtitle instance) stays mounted throughout.
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })
    rerender(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const longSubtitleEl = screen.getByText(/Cursor/)
    Object.defineProperty(longSubtitleEl, 'scrollWidth', { configurable: true, value: 500 })
    Object.defineProperty(longSubtitleEl, 'clientWidth', { configurable: true, value: 100 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(longSubtitleEl).toHaveAttribute('data-pr-tooltip', expect.stringContaining('Cursor'))
  })
})

describe('SessionModal title truncation (real useIsTruncated)', () => {
  it('re-measures truncation once the title text swaps from the loading placeholder to the real prompt', async () => {
    vi.useFakeTimers()

    // First render: session has not arrived yet, so the title span shows the 'Session'
    // placeholder, which is short enough not to be truncated.
    mockUseCliAnalyticsSession.mockReturnValue({ session: null, loading: true, error: null })
    const { rerender } = render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const placeholderEl = screen.getByText('Session')
    Object.defineProperty(placeholderEl, 'scrollWidth', { configurable: true, value: 50 })
    Object.defineProperty(placeholderEl, 'clientWidth', { configurable: true, value: 50 })

    // Flush the mount-time check while the text is still the short placeholder, proving the
    // placeholder itself is correctly measured as not truncated before the swap happens.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(placeholderEl).toHaveAttribute('data-pr-tooltip', '')

    // Session arrives; the title text changes from 'Session' to the real (long) prompt.
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })
    rerender(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    const titleEl = screen.getByText(MOCK_SESSION.prompt as string)
    Object.defineProperty(titleEl, 'scrollWidth', { configurable: true, value: 500 })
    Object.defineProperty(titleEl, 'clientWidth', { configurable: true, value: 100 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(titleEl).toHaveAttribute('data-pr-tooltip', MOCK_SESSION.prompt)
  })
})
