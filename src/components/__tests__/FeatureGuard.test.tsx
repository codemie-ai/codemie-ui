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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'

import { FeatureGuard } from '../FeatureGuard'

const mockAppInfoStore = vi.hoisted(() => ({
  configs: [] as any[],
  isConfigFetched: false,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: any) => store,
  }
})

describe('FeatureGuard', () => {
  beforeEach(() => {
    mockAppInfoStore.configs = []
  })

  it('should render children when feature is enabled', () => {
    mockAppInfoStore.configs = [
      { id: FEATURE_FLAGS.ENTERPRISE_EDITION, settings: { enabled: true } },
    ]

    render(
      <FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}>
        <div>Test Content</div>
      </FeatureGuard>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should throw error with 404 properties when feature is disabled', () => {
    mockAppInfoStore.configs = [
      { id: FEATURE_FLAGS.ENTERPRISE_EDITION, settings: { enabled: false } },
    ]

    expect(() => {
      render(
        <FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}>
          <div>Test Content</div>
        </FeatureGuard>
      )
    }).toThrow(
      expect.objectContaining({
        message: 'Not Found',
        status: 404,
        statusText: 'Not Found',
        internal: false,
        data: null,
      })
    )
  })

  it('should throw error with 404 properties when feature does not exist', () => {
    mockAppInfoStore.configs = []

    expect(() => {
      render(
        <FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES}>
          <div>Test Content</div>
        </FeatureGuard>
      )
    }).toThrow(
      expect.objectContaining({
        message: 'Not Found',
        status: 404,
        statusText: 'Not Found',
        internal: false,
        data: null,
      })
    )
  })
})
