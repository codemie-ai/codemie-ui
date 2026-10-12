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
})
