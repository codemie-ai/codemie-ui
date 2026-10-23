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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UaSettingsSchema } from '@/types/usageAttribution'

import AnalysisSettingsDialog from '../settings/AnalysisSettingsDialog'
import { OverridesMap } from '../settings/settingsModel'

const SCHEMA: UaSettingsSchema = {
  schema_version: 1,
  defaults_hash: 'defaults-1',
  can_tune: true,
  can_refresh: true,
  enrichment: true,
  tuning: {
    enabled: true,
    roles: ['admin', 'maintainer'],
    max_override_bytes: 4096,
    max_custom_computations_per_hour: 10,
    max_computations_per_hour: 60,
  },
  tiers: [{ id: 'analysis', label: 'New analysis', description: 'Runs the analysis again.' }],
  groups: [{ id: 'scope', label: 'Scope', tier: 'analysis' }],
  settings: [
    {
      key: 'excludedRepositories',
      group: 'scope',
      tier: 'analysis',
      type: 'list',
      label: 'Excluded repositories',
      description: 'Repositories left out of the analysis.',
      default: [],
      min: null,
      max: null,
      step: null,
      unit: null,
      max_items: 50,
      max_item_length: 100,
    },
  ],
  fixed: {
    signal_points: {},
    max_range_days: 365,
    analysis_cache_minutes: 15,
    analysis_timeout_seconds: 120,
    fallback_field_since: '2026-01-01',
  },
}

/** Valid values that encode to more than the 4 KB the API accepts: 50 repositories of 90 characters. */
const OVER_THE_CAP: OverridesMap = {
  excludedRepositories: Array.from({ length: 50 }, (_, i) => `${i}`.padStart(90, 'r')),
}

const renderDialog = (schema: UaSettingsSchema, draft: OverridesMap, onApply = vi.fn()) =>
  render(
    <AnalysisSettingsDialog
      visible
      schema={schema}
      applied={{}}
      initialDraft={draft}
      note="1 setting from a shared link."
      onApply={onApply}
      onClose={vi.fn()}
    />
  )

describe('AnalysisSettingsDialog — what can be applied', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('refuses to apply values over the byte cap, from a link or typed', async () => {
    const onApply = vi.fn()
    renderDialog(SCHEMA, OVER_THE_CAP, onApply)

    expect(screen.getByText('The changes are larger than 4 KB')).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()

    await userEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('applies the same kind of values under the byte cap', async () => {
    const onApply = vi.fn()
    renderDialog(SCHEMA, { excludedRepositories: ['payments/sandbox'] }, onApply)

    expect(screen.queryByText('The changes are larger than 4 KB')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ excludedRepositories: ['payments/sandbox'] })
  })

  it('is read-only for a user who cannot tune the settings (an auditor): no Apply', () => {
    renderDialog({ ...SCHEMA, can_tune: false }, { excludedRepositories: ['payments/sandbox'] })

    expect(
      screen.getByText('Read-only: only admins and maintainers can change the analysis settings.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset to defaults' })).not.toBeInTheDocument()
  })
})
