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
import { describe, expect, it } from 'vitest'

import type { AuditConfigResponse } from '@/types/generated/marketplaceManagement'

import UsageTierBar from '../UsageTierBar'

const mockUsageTiers: AuditConfigResponse['usage_tiers'] = {
  hot_percentile: 75,
  warm_percentile: 50,
  cold_percentile: 25,
}

const mockVerification = {
  cold_min_users: 5,
  warm_min_users: 25,
  hot_min_users: 100,
} as AuditConfigResponse['verification']

describe('UsageTierBar', () => {
  it('uses success color for HOT tier', () => {
    render(
      <UsageTierBar
        usage_tier="HOT"
        unique_users_count={200}
        usageTiers={mockUsageTiers}
        verification={mockVerification}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-fill')).toHaveClass('bg-success-primary')
  })

  it('uses warning color for WARM tier', () => {
    render(
      <UsageTierBar
        usage_tier="WARM"
        unique_users_count={30}
        usageTiers={mockUsageTiers}
        verification={mockVerification}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-fill')).toHaveClass('bg-aborted-primary')
  })

  it('uses failed color for COLD tier', () => {
    render(
      <UsageTierBar
        usage_tier="COLD"
        unique_users_count={5}
        usageTiers={mockUsageTiers}
        verification={mockVerification}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-fill')).toHaveClass('bg-failed-secondary')
  })

  it('uses failed color for DEAD tier', () => {
    render(
      <UsageTierBar
        usage_tier="DEAD"
        unique_users_count={0}
        usageTiers={mockUsageTiers}
        verification={mockVerification}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-fill')).toHaveClass('bg-failed-secondary')
  })

  it('shows a placeholder when usageTiers is null', () => {
    render(
      <UsageTierBar
        usage_tier="COLD"
        unique_users_count={5}
        usageTiers={null}
        verification={null}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-placeholder')).toBeInTheDocument()
    expect(screen.queryByTestId('usage-tier-bar-fill')).not.toBeInTheDocument()
  })

  it('shows a placeholder when usage_tier is null', () => {
    render(
      <UsageTierBar
        usage_tier={null}
        unique_users_count={5}
        usageTiers={mockUsageTiers}
        verification={null}
      />
    )
    expect(screen.getByTestId('usage-tier-bar-placeholder')).toBeInTheDocument()
  })
})
