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

import { proxy } from 'valtio'

import {
  DataProvider,
  DatasetResponse,
  DataSourceDetailsResponse,
  SharePointOAuthInitiateResponse,
  SharePointOAuthPollResponse,
} from '@/types/entity/dataSource'
import { EntityGuardrailAssignment } from '@/types/entity/guardrail'
import api from '@/utils/api'
import { getIndexTypeCode } from '@/utils/indexing'
import toaster from '@/utils/toaster'

import { makeCleanObject } from '../utils/utils'

interface CreateSharePointIndexOptions {
  name: string
  project_name: string
  project_space_visible: boolean
  description: string
  site_url: string
  setting_id: string
  embedding_model?: string
  guardrail_assignments?: EntityGuardrailAssignment[]
  cron_expression?: string
  include_pages?: boolean
  include_documents?: boolean
  include_lists?: boolean
  files_filter?: string
  auth_type?: string
  access_token?: string
  oauth_client_id?: string
  oauth_tenant_id?: string
}

const DEFAULT_SORT_KEY = 'date'
const DEFAULT_SORT_ORDER = 'desc'
const DEFAULT_PER_PAGE = 10

interface CreateUpdateRequest {
  name: string
  description: string
  indexType?: string | null
  link?: string | null
  branch?: string
  embeddingsModel?: string | null
  summarizationModel?: string | null
  projectSpaceVisible: boolean
  docsGeneration?: string | null
  reindexOnEdit?: string | null
  setting_id?: string | null
  filesFilter?: string | null
  prompt?: string | null
}

const handleIndexResponse = async (
  promise: Promise<Response>,
  errorMessage: string | null = null
) => {
  try {
    const response = await promise
    const data = await response.json()

    if (data.error || data.detail) {
      toaster.error(data.detail || data.error)
      return { error: data.detail || data.error }
    }

    toaster.info(data.message)
    return data
  } catch (err: unknown) {
    if (err instanceof Response) {
      const data = await err.json()
      const error = errorMessage || data.details || data.error?.details
      return { error }
    }
    return { error: errorMessage ?? 'Unknown error' }
  }
}

export const dataSourceStore = proxy({
  loading: false,
  initStatuses: false,
  indexesInProgress: [],

  indexStatuses: [] as DatasetResponse['data'],
  indexStatusesPagination: {
    page: 0,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  indexStatusesSort: {
    key: DEFAULT_SORT_KEY,
    order: DEFAULT_SORT_ORDER,
  },
  indexProviderSchemas: [] as DataProvider[],

  async getIndexesStatuses(
    page: number | null | undefined = 0,
    filters = {},
    perPage: number | null | undefined = 10,
    sortKey: string | null | undefined = DEFAULT_SORT_KEY,
    sortOrder: string | null | undefined = DEFAULT_SORT_ORDER,
    isRefresh: boolean = false
  ) {
    if (!isRefresh) {
      dataSourceStore.loading = true
    }
    const filterParams = makeCleanObject(filters) as {
      start_date: string
      end_date: string
      date_range: { start_date?: string; end_date?: string }
    }

    if (filterParams.start_date) {
      filterParams.date_range ||= {}
      filterParams.date_range.start_date = filterParams.start_date
    }

    if (filterParams.end_date) {
      filterParams.date_range ||= {}
      filterParams.date_range.end_date = filterParams.end_date
    }

    const statusLink =
      `v1/index?page=${page}` +
      `&filters=${encodeURIComponent(JSON.stringify(filterParams))}` +
      `&per_page=${perPage}` +
      `&sort_key=${sortKey}` +
      `&sort_order=${sortOrder}`

    const response = await api.get(statusLink)
    if (response.status !== 200) throw Error()
    const result = await response.json()
    const { data, pagination } = result as DatasetResponse

    dataSourceStore.indexStatuses = data
    dataSourceStore.indexStatusesPagination = {
      page: pagination.page,
      perPage: pagination.per_page,
      totalPages: pagination.pages,
      totalCount: pagination.total,
    }
    dataSourceStore.indexStatusesSort = { key: sortKey!, order: sortOrder! }
    dataSourceStore.loading = false
    return data
  },

  async getIndexDetails(id: string) {
    const indexLink = `v1/index/${id}`
    const response = await api.get(indexLink)
    return (await response.json()) as DataSourceDetailsResponse
  },

  createApplicationGitIndex(projectName: string, index: any) {
    const updatedRequest = {
      ...index,
      name: index.name.toLowerCase(),
    }
    const indexLink = `v1/application/${projectName}/index`

    return handleIndexResponse(
      api.post(indexLink, updatedRequest).then((response) => {
        if (response.status !== 201) throw Error()
        return response
      })
    )
  },

  updateApplicationIndex(
    projectName: string,
    repoName: string,
    fullReindex = false,
    index: CreateUpdateRequest = { name: '' } as CreateUpdateRequest,
    skipIndex = false
  ) {
    return handleIndexResponse(
      api.put(
        `v1/application/${projectName}/index/${repoName}?full_reindex=${fullReindex}&skip_reindex=${skipIndex}`,
        index
      )
    )
  },

  async resumeApplicationIndex(
    projectName: string,
    repoName: string,
    index: Record<string, string> = {}
  ) {
    try {
      const response = await api.put(
        `v1/application/${projectName}/index/${repoName}?full_reindex=false&skip_reindex=false&resume_indexing=true`,
        index
      )
      const data = await response.json()
      toaster.info(data.message)
    } catch {
      toaster.error('Failed to resume indexing process')
    }
  },

  reIndexKBIndex(indexType: string, projectName: string, repoName: string) {
    return handleIndexResponse(
      api.put(`v1/index/knowledge_base/${getIndexTypeCode(indexType)}/reindex`, {
        name: repoName,
        project_name: projectName,
      }),
      'Failed to create reindex process'
    )
  },

  updateKBIndex(
    indexType: string,
    indexBody = {},
    fullReindex = false,
    incrementalReindex = false
  ) {
    const queryParams = `full_reindex=${fullReindex}&incremental_reindex=${incrementalReindex}`
    return handleIndexResponse(
      api.put(`v1/index/knowledge_base/${getIndexTypeCode(indexType)}?${queryParams}`, indexBody),
      'Failed to create reindex or editing process'
    )
  },

  async resumeKBIndex(indexType: string, indexBody = {}) {
    try {
      const queryParams = `full_reindex=false&skip_reindex=false&resume_indexing=true`
      const response = await api.put(
        `v1/index/knowledge_base/${getIndexTypeCode(indexType)}?${queryParams}`,
        indexBody
      )
      const data = await response.json()
      toaster.info(data.message)
      return data
    } catch {
      toaster.error('Failed to resume indexing process')
      return []
    }
  },

  async healthCheckDatasource(
    projectName: string,
    indexType: string,
    settingId: string,
    options: {
      jql?: string | null
      cql?: string | null
      wikiQuery?: string | null
      wikiName?: string | null
      wiqlQuery?: string | null
    } = {}
  ) {
    try {
      const requestData = {
        project_name: projectName,
        index_type: indexType,
        setting_id: settingId,
        ...(options.jql != null && { jql: options.jql }),
        ...(options.cql != null && { cql: options.cql }),
        ...(options.wikiQuery != null && { wiki_query: options.wikiQuery }),
        ...(options.wikiName != null && { wiki_name: options.wikiName }),
        ...(options.wiqlQuery != null && { wiql_query: options.wiqlQuery }),
      }
      const response = await api.post('v1/index/health', requestData)
      return response.json()
    } catch (err: any) {
      const data = await err.json()
      toaster.error(data.detail)
      return []
    }
  },

  createKBIndexConfluence(indexConfig: any) {
    return handleIndexResponse(api.post('v1/index/knowledge_base/confluence', indexConfig))
  },

  createKBIndexJIRA(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    jql: string,
    setting_id: string,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[],
    cron_expression?: string
  ) {
    return handleIndexResponse(
      api.post('v1/index/knowledge_base/jira', {
        name,
        project_name,
        project_space_visible,
        description,
        jql,
        setting_id,
        embedding_model,
        guardrail_assignments,
        cron_expression,
      })
    )
  },

  createKBIndexXray(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    jql: string,
    setting_id: string,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[],
    cron_expression?: string
  ) {
    return handleIndexResponse(
      api.post('v1/index/knowledge_base/xray', {
        name,
        project_name,
        project_space_visible,
        description,
        jql,
        setting_id,
        embedding_model,
        guardrail_assignments,
        cron_expression,
      })
    )
  },

  createKBIndexAzureDevOpsWiki(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    wiki_query: string,
    wiki_name: string | undefined,
    setting_id: string,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[],
    cron_expression?: string
  ) {
    return handleIndexResponse(
      api.post('v1/index/knowledge_base/azure_devops_wiki', {
        name,
        project_name,
        project_space_visible,
        description,
        wiki_query,
        wiki_name,
        setting_id,
        embedding_model,
        guardrail_assignments,
        cron_expression,
      })
    )
  },

  createKBIndexAzureDevOpsWorkItem(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    wiql_query: string,
    setting_id: string,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[],
    cron_expression?: string
  ) {
    return handleIndexResponse(
      api.post('v1/index/knowledge_base/azure_devops_work_item', {
        name,
        project_name,
        project_space_visible,
        description,
        wiql_query,
        setting_id,
        embedding_model,
        guardrail_assignments,
        cron_expression,
      })
    )
  },

  createKBIndexSharePoint(options: CreateSharePointIndexOptions) {
    return handleIndexResponse(api.post('v1/index/knowledge_base/sharepoint', options))
  },

  async initiateSharePointOAuth(client_id?: string, tenant_id?: string): Promise<SharePointOAuthInitiateResponse> {
    const body: Record<string, string> = {}
    if (client_id) body.client_id = client_id
    if (tenant_id) body.tenant_id = tenant_id
    const response = await api.post('v1/sharepoint/oauth/initiate', body)
    return response.json()
  },

  async pollSharePointOAuth(device_code: string, client_id?: string, tenant_id?: string): Promise<SharePointOAuthPollResponse> {
    const body: Record<string, string> = { device_code }
    if (client_id) body.client_id = client_id
    if (tenant_id) body.tenant_id = tenant_id
    const response = await api.post('v1/sharepoint/oauth/poll', body, { skipErrorHandling: true })
    return response.json()
  },

  createKBIndexGoogleDoc(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    googleDoc: any,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[],
    cron_expression?: string
  ) {
    return handleIndexResponse(
      api.post('v1/index/knowledge_base/google', {
        name,
        project_name,
        project_space_visible,
        description,
        googleDoc,
        embedding_model,
        guardrail_assignments,
        cron_expression,
      })
    )
  },

  async createKBIndexFiles(
    name: string,
    project_name: string,
    project_space_visible: boolean,
    description: string,
    files: File[],
    csv_separator?: string,
    csv_start_row?: number,
    csv_rows_per_document?: number,
    embedding_model?: string,
    guardrail_assignments?: EntityGuardrailAssignment[]
  ) {
    const params: Record<string, any> = { name, project_name, project_space_visible, description }
    if (csv_separator) params.csv_separator = csv_separator
    if (csv_start_row) params.csv_start_row = csv_start_row
    if (csv_rows_per_document) params.csv_rows_per_document = csv_rows_per_document
    if (embedding_model) params.embedding_model = embedding_model
    if (guardrail_assignments) params.guardrail_assignments = JSON.stringify(guardrail_assignments)

    const queryParams = new URLSearchParams(params)
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    try {
      const response = await api.postMultipart(
        `v1/index/knowledge_base/file?${queryParams}`,
        formData
      )
      const data = await response.json()
      if (data.error || data.detail) {
        toaster.error(data.detail || data.error)
        return { error: data.detail || data.error }
      }
      toaster.info(data.message)
      return data
    } catch (err: any) {
      const data = await err.json()
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          data.detail.forEach((d: any) => toaster.error(d.msg))
        } else {
          toaster.error(data.detail)
        }
      }
      return { error: data.detail }
    }
  },

  createProviderIndex(toolkitID: string, providerName: string, values: any) {
    const queryParams = new URLSearchParams({
      toolkit_id: toolkitID,
      provider_name: providerName,
    }).toString()
    return handleIndexResponse(api.post(`v1/index/provider?${queryParams}`, values))
  },

  updateProviderIndex(indexInfoID: string, values: any) {
    return handleIndexResponse(api.put(`v1/index/provider/${indexInfoID}`, values))
  },

  reindexProviderIndex(indexInfoID: string, payload = {}) {
    return handleIndexResponse(api.put(`v1/index/provider/${indexInfoID}/reindex`, payload))
  },

  reindexMarketplace() {
    return handleIndexResponse(
      api.post('v1/admin/marketplace/reindex'),
      'Failed to create marketplace reindex process'
    )
  },

  async deleteIndex(id: string, name: string) {
    try {
      const response = await api.delete(`v1/index/${id}`)
      if (response.status > 299) throw Error()
      toaster.info(`Data Source ${name} was deleted successfully`)
      dataSourceStore.indexStatuses = dataSourceStore.indexStatuses.filter(
        (index) => index.id !== id
      )
    } catch {
      toaster.error(`Index ${name} has not been deleted`)
    }
  },

  async showAssistantsWithGivenContext(id: string) {
    try {
      const response = await api.get(`v1/index/${id}/assistants`)
      if (response.status !== 200) throw Error('Failed to fetch data')
      const data = await response.json()
      return data || []
    } catch (error) {
      console.error('An error occurred:', error)
      return []
    }
  },

  async loadIndexUsers() {
    try {
      const response = await api.get('v1/index/users')
      const data = await response.json()
      return [
        ...new Map(
          data
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
            .map((item) => [item.name, item])
        ).values(),
      ]
    } catch {
      toaster.error('Failed to fetch Data Source users')
      return []
    }
  },

  exportDatasource(id: string, name = 'datasource') {
    return api.downloadFileStream(`v1/index/${id}/export`, 'text/markdown', `${name}.md`)
  },

  async getProviderIndexSchemas() {
    const response = await api.get('v1/providers/datasource_schemas')
    dataSourceStore.indexProviderSchemas = await response.json()
  },

  async findDatasourceID(name, datasourceType, projectName) {
    const params = new URLSearchParams({
      name,
      index_type: datasourceType,
      project_name: projectName,
    }).toString()
    const response = await api.get(`v1/index/find_id?${params}`)
    return response.json()
  },

  async getDataSourceOptions(
    filters: {
      project?: string
      error?: boolean
      is_fetching?: boolean
      completed?: boolean
      query?: string
    } = {},
    page: number = 0,
    perPage: number = 10000
  ) {
    const url =
      `v1/index?page=${page}` +
      `&filters=${encodeURIComponent(JSON.stringify({ ...filters, name: filters.query }))}` +
      `&per_page=${perPage}` +
      `&sort_key=${DEFAULT_SORT_KEY}` +
      `&sort_order=${DEFAULT_SORT_ORDER}`

    const response = await api.get(url)
    if (response.status !== 200) throw Error()
    const result = await response.json()
    return result.data || []
  },
})
