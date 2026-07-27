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

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { awsVendorStore } from '@/store/vendor'
import { renderPage, mockAPI } from '@/test-utils/integration'

const SETTING_ID = 'test-setting'

type EntityConfig = {
  label: string
  apiPath: string
  route: string
  setup?: () => void
  teardown?: () => void
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    label: 'assistants',
    apiPath: 'v1/vendors/aws/assistants',
    route: `/settings/aws/assistants/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'workflows',
    apiPath: 'v1/vendors/aws/workflows',
    route: `/settings/aws/workflows/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'knowledge-bases',
    apiPath: 'v1/vendors/aws/knowledgebases',
    route: `/settings/aws/data-sources/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'guardrails',
    apiPath: 'v1/vendors/aws/guardrails',
    route: `/settings/aws/guardrails/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'agentcore-runtimes',
    apiPath: 'v1/vendors/aws/agentcore-runtimes',
    route: `/settings/aws/agentcore-runtimes/${SETTING_ID}`,
    // no setup/teardown: settingId is picked up from the memory-router URL via useParams
  },
]

function resetStore() {
  awsVendorStore.vendorEntities = []
  awsVendorStore.vendorEntitiesPagination = { nextToken: null, perPage: 8 }
  awsVendorStore.loading.entities = false
}

describe.each(ENTITY_CONFIGS)(
  'AWS $label — Load-more pagination',
  ({ label, apiPath, route, setup, teardown }) => {
    beforeEach(() => {
      setup?.()
      resetStore()
    })

    afterEach(() => {
      teardown?.()
      resetStore()
    })

    it('shows Load more button when next_token present', async () => {
      const page1Item = {
        id: `entity-p1-${label}`,
        name: `${label} Page-1 Entity`,
        description: 'desc',
        status: 'PREPARED' as const,
      }
      mockAPI(
        'GET',
        apiPath,
        { data: [page1Item], pagination: { next_token: 'token-page2' } },
        { setting_id: SETTING_ID, per_page: 8 }
      )

      renderPage(route)

      await screen.findByText(page1Item.name)
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })
    it('hides Load more button when next_token is null', async () => {
      const page1Item = {
        id: `entity-p1-${label}`,
        name: `${label} Page-1 Entity`,
        description: 'desc',
        status: 'PREPARED' as const,
      }
      mockAPI(
        'GET',
        apiPath,
        { data: [page1Item], pagination: { next_token: null } },
        { setting_id: SETTING_ID, per_page: 8 }
      )

      renderPage(route)

      await screen.findByText(page1Item.name)
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })
    it('appends page 2 items on Load more click', async () => {
      const page1Item = {
        id: `entity-p1-${label}`,
        name: `${label} Page-1 Entity`,
        description: 'desc',
        status: 'PREPARED' as const,
      }
      const page2Item = {
        id: `entity-p2-${label}`,
        name: `${label} Page-2 Entity`,
        description: 'desc',
        status: 'PREPARED' as const,
      }

      // Stage 1: register page-1 response and render
      mockAPI(
        'GET',
        apiPath,
        { data: [page1Item], pagination: { next_token: 'token-page2' } },
        { setting_id: SETTING_ID, per_page: 8 }
      )
      renderPage(route)

      // Positive settle-anchor: wait for page-1 items
      await screen.findByText(page1Item.name)

      // Stage 2: overwrite registry with page-2 response; params filter includes next_token
      // to verify the frontend forwards the cursor value
      mockAPI(
        'GET',
        apiPath,
        { data: [page2Item], pagination: { next_token: null } },
        { setting_id: SETTING_ID, per_page: 8, next_token: 'token-page2' }
      )

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /load more/i }))

      // Positive settle-anchor: wait for page-2 items
      await screen.findByText(page2Item.name)

      // Page-1 items must still be present (append, not replace)
      expect(screen.getByText(page1Item.name)).toBeInTheDocument()

      // "Load more..." button is gone (next_token is null after page 2)
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })
  }
)
