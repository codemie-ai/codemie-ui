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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { DataSourceDetailsResponse } from '@/types/entity/dataSource'

import DataSourceDetails from '../DataSourceDetails'

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => new Map([['my-project', 'My Display Name']]),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    reindexProviderIndex: vi.fn(),
    updateKBIndex: vi.fn(),
    reIndexKBIndex: vi.fn(),
    updateApplicationIndex: vi.fn(),
    reindexMarketplace: vi.fn(),
  },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { findLLMLabel: () => null, findEmbeddingLabel: () => null },
}))

vi.mock('@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails', () => ({
  default: () => null,
}))

vi.mock('@/components/TabsMenu/TabsMenu', () => ({ default: () => null }))

vi.mock('../DataSourceDetails/DetaSourceDetailsProvider', () => ({ default: () => null }))

vi.mock('../DataSourceDeleteModal', () => ({ default: () => null }))

vi.mock('../SharePointReindexAuthPopup', () => ({ default: () => null }))

vi.mock('@/pages/dataSources/components/DataSourceTypeIcon', () => ({ default: () => null }))

vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/reindex.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/shared-no.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/shared-yes.svg?react', () => ({ default: () => null }))

const dataSource: DataSourceDetailsResponse = {
  id: 'ds1',
  name: 'Test DS',
  date: '2024-01-01',
  update_date: '2024-01-01',
  project_name: 'my-project',
  description: '',
  repo_name: '',
  index_type: 'git',
  prompt: null,
  embeddings_model: '',
  summarization_model: '',
  current_state: 0,
  complete_state: 100,
  current__chunks_state: 0,
  processed_files: [],
  uploaded_files: [],
  error: false,
  completed: true,
  text: '',
  full_name: '',
  created_by: { id: '1', name: 'User', username: 'user', email: '' },
  project_space_visible: false,
  docs_generation: false,
  branch: '',
  link: '',
  files_filter: '',
  google_doc_link: '',
  user_abilities: [],
  confluence: null,
  jira: null,
  xray: null,
  azure_devops_wiki: null,
  azure_devops_work_item: null,
  is_fetching: false,
  is_queued: false,
  setting_id: '',
  tokens_usage: { input_tokens: 0, output_tokens: 0, money_spent: 0 },
  processing_info: { unique_extensions: [] },
  provider_fields: null,
  guardrail_assignments: [],
}

describe('DataSourceDetails — project name display', () => {
  it('renders project technical name', () => {
    const { getByText } = render(<DataSourceDetails dataSource={dataSource} />)
    expect(getByText('my-project')).toBeInTheDocument()
  })

  it('shows the display name as a react-tooltip hint on the project name', () => {
    const { getByText } = render(<DataSourceDetails dataSource={dataSource} />)
    const projectValue = getByText('my-project')
    expect(projectValue.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(projectValue.getAttribute('data-tooltip-content')).toBe('My Display Name')
  })
})
