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

import {
  DEFAULT_DOCUMENTATION_PROMPT,
  CSV_SEPARATORS,
  INDEX_TYPE_CODE,
  INDEX_TYPES,
  SHAREPOINT_AUTH_TYPES,
} from '@/constants/dataSources'
import { DataProvider, DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { getIndexTypeCode } from '@/utils/indexing'
import { getBrowserTimezone } from '@/utils/timezone'

export interface MapDetailsOptions {
  isEditing: boolean
  providerSchema?: DataProvider
  defaultQueryProject?: string | null
}

/** Maps a data source details response to the form values shape. Pure. */
export const mapDetailsToFormValues = (
  defaults: Partial<DataSourceDetailsResponse>,
  { isEditing, providerSchema, defaultQueryProject }: MapDetailsOptions
): Record<string, any> => {
  const providerFields = defaults?.provider_fields ?? {}
  const baseParams = providerFields.base_params ?? {}
  const createParams = providerFields.create_params ?? {}

  return {
    projectName: defaults?.project_name ?? defaultQueryProject ?? '',
    name: defaults?.repo_name ?? '',
    description: defaults?.description ?? '',
    projectSpaceVisible: defaults?.project_space_visible ?? true,
    indexType: getIndexTypeCode(defaults?.index_type, defaults?.vcs_type) ?? INDEX_TYPES.GIT,
    reindexOnEdit: '',
    isEditing,

    repoIndexType: INDEX_TYPE_CODE,
    repoLink: defaults?.link ?? '',
    branch: defaults?.branch ?? '',
    filesFilter: defaults?.files_filter ?? '',
    embeddingsModel: defaults?.embeddings_model ?? '',
    summarizationModel: defaults?.summarization_model ?? '',

    files: [],
    uploadedFiles: defaults?.uploaded_files ?? [],
    csvSeparator: CSV_SEPARATORS[0].value,
    csvStartRow: 1,
    csvRowsPerDocument: 1,
    googleDoc: defaults?.google_doc_link ?? '',
    cql: defaults?.confluence?.cql ?? '',
    xwikiSpace: defaults?.xwiki?.space ?? '',
    xwikiWiki: defaults?.xwiki?.wiki ?? '',
    jql: defaults?.jira?.jql ?? defaults?.xray?.jql ?? '',
    jiraCustomFields: defaults?.jira?.custom_fields ?? [],
    wikiQuery: defaults?.azure_devops_wiki?.wiki_query ?? '',
    wikiName: defaults?.azure_devops_wiki?.wiki_name ?? '',
    wiqlQuery: defaults?.azure_devops_work_item?.wiql_query ?? '',
    siteUrl: defaults?.sharepoint?.site_url ?? '',
    includePages:
      defaults?.sharepoint?.include_pages !== undefined ? defaults.sharepoint.include_pages : true,
    includeDocuments:
      defaults?.sharepoint?.include_documents !== undefined
        ? defaults.sharepoint.include_documents
        : true,
    includeLists:
      defaults?.sharepoint?.include_lists !== undefined ? defaults.sharepoint.include_lists : true,
    sharepointAuthType: defaults?.sharepoint?.auth_type ?? SHAREPOINT_AUTH_TYPES.INTEGRATION,
    sharepointCustomClientId: defaults?.sharepoint?.oauth_client_id ?? '',
    sharepointTenantId: defaults?.sharepoint?.oauth_tenant_id ?? '',
    sharepointAccessToken: '',
    sharepointFilesFilter: defaults?.sharepoint?.files_filter ?? '',
    setting_id: defaults?.setting_id ?? '',
    enableCustomPrompts: !!defaults?.prompt,
    promptTemplate: defaults?.prompt ?? DEFAULT_DOCUMENTATION_PROMPT,
    guardrail_assignments: defaults?.guardrail_assignments ?? [],
    cronExpression: defaults?.cron_expression ?? '',
    timezone: defaults?.timezone ?? getBrowserTimezone(),
    // Set the provider schema together with the form values so it is never
    // clobbered by a later reset(). Keeping it in a separate effect caused the
    // submit handler to read an undefined indexMetadata when the schemas were
    // already cached (SPA navigation), silently aborting the save.
    indexMetadata: providerSchema as any,

    ...baseParams,
    ...createParams,
  }
}
