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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UaStatus } from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import HowItWorksView from '../views/HowItWorksView'

vi.mock('../hooks/useUaQuery', () => ({ useUaQuery: vi.fn() }))

const statusWith = (run: Record<string, unknown>): UaStatus => ({
  tiles: {
    uncl: 100_000,
    uncl_parts: {
      likely_production: 30_000,
      no_repository: 40_000,
      too_little_evidence: 20_000,
      outside_limits: 10_000,
    },
    allocated: 12_000,
    excluded: { no_customer: 0, other_proxy: 0 },
    cli: 320_000,
  },
  coverage: { share: 90, analysed: 288_000, outside_limits: 32_000, repositories_per_person: 10 },
  reasons: [],
  signals: [],
  identity: [],
  folder_like: [],
  confidence: [],
  db: {},
  counts: { repositories: 120, groups: 14, folder_like_owners: 3 },
  run: {
    es_ms: 2_300,
    requests: 7,
    db_ms: 30,
    analysis_ms: 4_100,
    cache_backend: 'redis',
    peak_rss_mb: 900,
    ...run,
  },
  settings: {
    values: {},
    defaults: {},
    overridden: [],
    signal_points: {},
    fixed: { analysisCacheMinutes: 15, maxRangeDays: 365 },
  },
  display: {
    shared_project_threshold: 100,
    repository_group_threshold: 1_000,
    experiments_highlight: 200,
    platform_people_filter: 100,
    candidate_production_days: 5,
    scale: 1,
  },
})

const renderWithRun = (run: Record<string, unknown>) => {
  vi.mocked(useUaQuery).mockReturnValue({
    data: { data: statusWith(run), range: null, analysis: null },
    error: null,
    loading: false,
  })
  render(<HowItWorksView params={{ time_period: 'last_30_days' }} schema={null} />)
  return screen.getByTestId('ua-run-details')
}

describe('HowItWorksView — what the run read again and what it reused', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('says the read of an earlier analysis was reused when the inputs were cached', () => {
    const details = renderWithRun({ inputs_cached: true, evidence_reused: true })

    expect(details).toHaveTextContent(
      'Elasticsearch 2.3 s (7 requests, the read of an earlier analysis, reused) · app DB'
    )
    expect(details).not.toHaveTextContent('earlier this hour')
  })

  it('names the evidence when it was reused', () => {
    const details = renderWithRun({ evidence_reused: true })

    expect(details).toHaveTextContent(
      '(7 requests, evidence reused from earlier this hour) · app DB'
    )
    expect(details).not.toHaveTextContent('previous period')
  })

  it('says nothing was reused when everything was read again', () => {
    const details = renderWithRun({ inputs_cached: false, evidence_reused: false })

    expect(details).toHaveTextContent('Elasticsearch 2.3 s (7 requests) · app DB')
    expect(details).not.toHaveTextContent('reused')
  })

  it('counts the members whose Web Platform usage a project budget paid', () => {
    const details = renderWithRun({
      web_funding: { projects: 3, members_whole_range: 40, members_part_of_range: 5 },
    })

    expect(details).toHaveTextContent(
      'Web Platform funding: 3 projects, 40 members for the whole period, 5 for part of it'
    )
  })
})
