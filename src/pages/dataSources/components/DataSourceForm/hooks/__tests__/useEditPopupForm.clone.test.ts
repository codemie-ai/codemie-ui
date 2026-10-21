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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import { MASKED_VALUE } from '@/constants/settings'

import { buildCloneValues } from '../../utils/buildCloneValues'
import { mapDetailsToFormValues } from '../../utils/mapDetailsToFormValues'
import { useEditPopupForm } from '../useEditPopupForm'

const providerSchemaStore = vi.hoisted(() => ({ indexProviderSchemas: [] as any[] }))

vi.mock('@/store/dataSources', () => ({ dataSourceStore: providerSchemaStore }))
vi.mock('@/utils/helpers', () => ({ humanize: (s: string) => s }))
vi.mock(
  '@/components/guardrails/GuardrailAssignmentPanel/schemas/guardrailAssignmentSchema',
  () => ({ guardrailAssignmentsSchema: {} })
)
vi.mock('@/hooks/useSearchParams', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))
vi.mock('@/utils/timezone', () => ({
  getBrowserTimezone: vi.fn(() => 'America/New_York'),
  getIANATimezoneOptions: vi.fn(() => []),
}))

const providerSchema: any = {
  id: 'prov-1',
  provider_name: 'p',
  name: 'p',
  base_schema: {
    description: '',
    parameters: [
      { name: 'api_key', parameter_type: 'Secret', required: true },
      { name: 'endpoint', parameter_type: 'URL', required: true },
      { name: 'external_id', parameter_type: 'UUID', required: false },
    ],
  },
  create_schema: {
    description: '',
    parameters: [{ name: 'otp', parameter_type: 'String', required: false }],
  },
}

const source: any = {
  id: 'src-1',
  name: 'src',
  repo_name: 'source-name',
  date: '2024-01-01',
  update_date: '2024-01-02',
  project_name: 'proj-a',
  description: 'desc',
  index_type: 'provider',
  embeddings_model: 'emb',
  summarization_model: 'sum',
  processed_files: ['a'],
  uploaded_files: ['file-1.txt'],
  created_by: { id: 'u' },
  user_abilities: ['read'],
  tokens_usage: { input_tokens: 1 },
  current_state: 5,
  setting_id: 'setting-1',
  cron_expression: '0 0 * * *',
  timezone: 'Europe/Warsaw',
  guardrail_assignments: [{ guardrail_id: 'g1', mode: 'all', source: 'direct', editable: true }],
  provider_fields: {
    provider_id: 'prov-1',
    base_params: { api_key: MASKED_VALUE, endpoint: 'https://x.io', external_id: 'uuid-1' },
    create_params: { otp: '123456' },
  },
}

const visible = (names: string[]) => (name?: string) => !!name && names.includes(name)

describe('mapDetailsToFormValues', () => {
  it('keeps edit mapping: isEditing true, name from repo_name, raw provider params', () => {
    const values = mapDetailsToFormValues(source, { isEditing: true, providerSchema })
    expect(values.isEditing).toBe(true)
    expect(values.name).toBe('source-name')
    expect(values.api_key).toBe(MASKED_VALUE)
  })
})

describe('buildCloneValues', () => {
  it('returns create-mode values with empty name and no identity or runtime keys', () => {
    const values = buildCloneValues(source, {
      providerSchema,
      isProjectVisible: visible(['proj-a']),
    })
    expect(values.isEditing).toBe(false)
    expect(values.name).toBe('')
    const forbidden = [
      'id',
      'date',
      'update_date',
      'processed_files',
      'created_by',
      'user_abilities',
      'tokens_usage',
      'current_state',
      'aice_datasource_id',
    ]
    forbidden.forEach((key) => expect(values).not.toHaveProperty(key))
  })

  it('blanks secrets and drops UUID and otp provider params, keeps the rest', () => {
    const values = buildCloneValues(source, {
      providerSchema,
      isProjectVisible: visible(['proj-a']),
    })
    expect(values.api_key).toBe('')
    expect(values.endpoint).toBe('https://x.io')
    expect(values).not.toHaveProperty('external_id')
    expect(values).not.toHaveProperty('otp')
    expect(JSON.stringify(values)).not.toContain(MASKED_VALUE)
  })

  it('selects the provider by its schema id so the type selector keeps the metadata', () => {
    const values = buildCloneValues(source, { providerSchema, isProjectVisible: visible([]) })
    expect(values.indexType).toBe('prov-1')
    expect(values.indexMetadata).toBe(providerSchema)
  })

  it('drops all provider params when the provider schema is unknown', () => {
    const values = buildCloneValues(source, { isProjectVisible: visible(['proj-a']) })
    expect(values).not.toHaveProperty('api_key')
    expect(values).not.toHaveProperty('endpoint')
  })

  it('keeps the project when visible and leaves it unselected otherwise', () => {
    expect(
      buildCloneValues(source, { providerSchema, isProjectVisible: visible(['proj-a']) })
        .projectName
    ).toBe('proj-a')
    expect(
      buildCloneValues(source, { providerSchema, isProjectVisible: visible([]) }).projectName
    ).toBe('')
  })

  it('keeps git repoIndexType, svn vcs_type and git_faq type code', () => {
    const git = buildCloneValues(
      { id: '1', index_type: 'summary', link: 'https://g.io/r', branch: 'main' } as any,
      { isProjectVisible: visible([]) }
    )
    expect(git.indexType).toBe(INDEX_TYPES.GIT)
    expect(git.repoIndexType).toBe('summary')
    expect(git.repoLink).toBe('https://g.io/r')

    const svn = buildCloneValues({ id: '1', index_type: 'code', vcs_type: 'svn' } as any, {
      isProjectVisible: visible([]),
    })
    expect(svn.indexType).toBe(INDEX_TYPES.SVN)

    const faq = buildCloneValues({ id: '1', index_type: 'knowledge_base_git_faq' } as any, {
      isProjectVisible: visible([]),
    })
    expect(faq.indexType).toBe(INDEX_TYPES.GIT_FAQ)
  })

  it('empties uploaded files for file type sources', () => {
    const values = buildCloneValues(
      { id: '1', index_type: 'knowledge_base_file', uploaded_files: ['a.txt'] } as any,
      { isProjectVisible: visible([]) }
    )
    expect(values.indexType).toBe(INDEX_TYPES.FILE)
    expect(values.uploadedFiles).toEqual([])
    expect(values.files).toEqual([])
  })

  it('clears the SharePoint access token', () => {
    const values = buildCloneValues(
      {
        id: '1',
        index_type: 'knowledge_base_sharepoint',
        sharepoint: { site_url: 'https://s.sharepoint.com', auth_type: 'oauth_custom' },
      } as any,
      { isProjectVisible: visible([]) }
    )
    expect(values.sharepointAccessToken).toBe('')
    expect(values.siteUrl).toBe('https://s.sharepoint.com')
  })

  it('carries setting_id, schedule and guardrails (assignments hold no source id)', () => {
    const values = buildCloneValues(source, { providerSchema, isProjectVisible: visible([]) })
    expect(values.setting_id).toBe('setting-1')
    expect(values.cronExpression).toBe('0 0 * * *')
    expect(values.timezone).toBe('Europe/Warsaw')
    expect(values.guardrail_assignments).toEqual(source.guardrail_assignments)
  })
})

describe('useEditPopupForm clone mode', () => {
  it('prefills the form in create mode with empty name when a visibility check is passed', () => {
    providerSchemaStore.indexProviderSchemas = [providerSchema]
    const isProjectVisible = visible(['proj-a'])
    const { result } = renderHook(() => useEditPopupForm(source, false, isProjectVisible))
    expect(result.current.getValues('isEditing')).toBe(false)
    expect(result.current.getValues('name')).toBe('')
    expect(result.current.getValues('projectName')).toBe('proj-a')
    expect(result.current.getValues('description')).toBe('desc')
    expect((result.current.getValues() as any).api_key).toBe('')
  })
})
