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

import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsTools } from '../hooks/useCliAnalyticsTools'
import ToolsView from '../views/ToolsView'

vi.mock('../hooks/useCliAnalyticsTools', () => ({
  useCliAnalyticsTools: vi.fn(() => ({
    toolUsage: [
      { tool_name: 'Read', call_count: 450, success_count: 430, success_rate: 95.6 },
      { tool_name: 'Edit', call_count: 230, success_count: 200, success_rate: 87.0 },
    ],
    tokensByModel: [{ model_name: 'claude-sonnet-4-6', total_tokens: 1_500_000 }],
    skillsInvoked: [{ name: 'code-reviewer', count: 5 }],
    agentSubtypes: [{ name: 'Explore', count: 3 }],
    slashCommands: [{ name: '/help', count: 7 }],
    loading: false,
    error: null,
  })),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({
    title,
    children,
    error,
  }: {
    title: string
    children: React.ReactNode
    error?: { message: string } | null
  }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {error && <span data-testid="widget-error">{error.message}</span>}
      {children}
    </div>
  ),
}))

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({
    title,
    labelField,
    valueField,
  }: {
    title: string
    labelField: string
    valueField: string
  }) => (
    <div
      data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-label-field={labelField}
      data-value-field={valueField}
    />
  ),
}))

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
}))

const MOCK_FILTERS: AnalyticsQueryParams = {
  start_date: '2026-07-01',
  end_date: '2026-07-17',
}

describe('ToolsView', () => {
  it('renders most used tools widget', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-most-used-tools')).toBeInTheDocument()
  })

  it('renders tokens by model widget', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-tokens-by-model')).toBeInTheDocument()
  })

  it('renders skills invoked widget', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-skills-invoked')).toBeInTheDocument()
  })

  it('renders agent subtypes widget', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-agent-subtypes')).toBeInTheDocument()
  })

  it('renders slash commands widget', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-slash-commands')).toBeInTheDocument()
  })

  it('renders bar charts for tool usage and invocation categories', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    const charts = screen.getAllByTestId('bar-chart')

    // Most Used Tools, Skills invoked, Agent subtypes, Slash commands.
    expect(charts).toHaveLength(4)
  })

  it('shows empty states when tool datasets are empty', () => {
    vi.mocked(useCliAnalyticsTools).mockReturnValueOnce({
      toolUsage: [],
      tokensByModel: [],
      skillsInvoked: [],
      agentSubtypes: [],
      slashCommands: [],
      loading: false,
      error: null,
    })

    render(<ToolsView filters={MOCK_FILTERS} />)

    // BarChartWidget displays its standard empty state for all four bar-chart widgets.
    expect(screen.getAllByText('No data available')).toHaveLength(4)
  })

  it('passes repositories prop to hook', () => {
    const repositories = ['C:/Repos/A']

    render(<ToolsView filters={MOCK_FILTERS} repositories={repositories} />)

    expect(useCliAnalyticsTools).toHaveBeenCalledWith(MOCK_FILTERS, repositories)
  })

  it('renders tokens by model as a donut chart with correct field mapping', () => {
    render(<ToolsView filters={MOCK_FILTERS} />)

    const widget = screen.getByTestId('widget-tokens-by-model')

    expect(widget).toHaveAttribute('data-label-field', 'model_name')
    expect(widget).toHaveAttribute('data-value-field', 'total_tokens')
  })
})
