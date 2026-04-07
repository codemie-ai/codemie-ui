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

import { useState } from 'react'
import { UseFormSetError } from 'react-hook-form'

import { INDEX_TYPES, IndexType, SHAREPOINT_AUTH_TYPES } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'

import { FormValues } from './useEditPopupForm'
import { FULL_REINDEX } from '../DataSourceForm'

interface UseIndexCreationProps {
  setError?: UseFormSetError<FormValues>
  onClose?: () => void
  setIsSubmitting: (isSubmitting: boolean) => void
  index?: DataSourceDetailsResponse | null
}

interface IndexEditContext {
  isEditMode: boolean
  isReindex: boolean
  hasProjectChanged: boolean
}

const getIndexEditContext = (
  index: DataSourceDetailsResponse | null | undefined,
  values: FormValues
): IndexEditContext => {
  const isEditMode = !!index
  const isReindex = values.reindexOnEdit === FULL_REINDEX
  const hasProjectChanged = isEditMode && values.projectName !== index?.project_name

  return { isEditMode, isReindex, hasProjectChanged }
}

const getBaseRequestFields = (
  values: FormValues,
  index: DataSourceDetailsResponse | null | undefined,
  hasProjectChanged: boolean
) => ({
  name: values.name,
  description: values.description,
  project_name: hasProjectChanged && index ? index.project_name : values.projectName,
  project_space_visible: values.projectSpaceVisible,
  embedding_model: values.embeddingsModel,
  guardrail_assignments: values.guardrail_assignments,
  cron_expression: values.cronExpression,
  ...(hasProjectChanged && { new_project_name: values.projectName }),
})

export const useIndexCreation = ({
  setError,
  onClose,
  setIsSubmitting,
  index,
}: UseIndexCreationProps) => {
  const [healthCheckResult, setHealthCheckResult] = useState<Record<string, any>>({})

  const createIndex = async (data: FormValues) => {
    try {
      setIsSubmitting(true)

      const healthCheckOptions =
        {
          [INDEX_TYPES.JIRA]: { jql: data.jql },
          [INDEX_TYPES.XRAY]: { jql: data.jql },
          [INDEX_TYPES.CONFLUENCE]: { cql: data.cql },
          [INDEX_TYPES.AZURE_DEVOPS_WIKI]: { wikiQuery: data.wikiQuery, wikiName: data.wikiName },
          [INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM]: { wiqlQuery: data.wiqlQuery },
        }[data.indexType] ?? {}

      const response = await dataSourceStore.healthCheckDatasource(
        data.projectName,
        Object.values(INDEX_TYPES).includes(data.indexType as IndexType)
          ? data.indexType
          : 'provider',
        data.setting_id!,
        healthCheckOptions
      )

      setHealthCheckResult(response)

      if (response.implemented) {
        if (response.error?.field_error && setError) {
          setError(response.error.field_error, { message: ' ' })
        }
        if (!response.error) {
          await confirmIndex(data)
        }
      } else {
        await confirmIndex(data)
      }
      setIsSubmitting(false)
    } catch (error) {
      setIsSubmitting(false)
    }
  }
  const confirmIndex = async (values: FormValues) => {
    try {
      const response = await (async () => {
        switch (values.indexType) {
          case INDEX_TYPES.GIT:
            return createOrUpdateGitIndex(values)
          case INDEX_TYPES.FILE:
            return createOrUpdateFilesIndex(values)
          case INDEX_TYPES.GOOGLE:
            return createOrUpdateGoogleIndex(values)
          case INDEX_TYPES.CONFLUENCE:
            return createOrUpdateConfluenceIndex(values)
          case INDEX_TYPES.JIRA:
            return createOrUpdateJiraIndex(values)
          case INDEX_TYPES.XRAY:
            return createOrUpdateXrayIndex(values)
          case INDEX_TYPES.AZURE_DEVOPS_WIKI:
            return createOrUpdateAzureDevOpsWikiIndex(values)
          case INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM:
            return createOrUpdateAzureDevOpsWorkItemIndex(values)
          case INDEX_TYPES.SHAREPOINT:
            return createOrUpdateSharePointIndex(values)
          default:
            return createOrUpdateProviderIndex(values.indexMetadata, values)
        }
      })()
      if (!response?.error) {
        onClose?.()
      }
    } catch (error) {
      setIsSubmitting(false)
    }
  }

  const createOrUpdateGitIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      branch: values.branch,
      description: values.description,
      filesFilter: values.filesFilter,
      embeddingsModel: values.embeddingsModel,
      indexType: values.repoIndexType,
      link: values.repoLink,
      name: values.name.toLowerCase(),
      projectSpaceVisible: values.projectSpaceVisible,
      reindexOnEdit: values.reindexOnEdit,
      prompt: values.enableCustomPrompts ? values.promptTemplate : undefined,
      summarizationModel: values.summarizationModel,
      docsGeneration: values.docsGeneration,
      setting_id: values.setting_id,
      guardrail_assignments: values.guardrail_assignments,
      cron_expression: values.cronExpression,
      ...(hasProjectChanged && { new_project_name: values.projectName }),
    }

    if (isEditMode && index) {
      const projectName = hasProjectChanged ? index.project_name : values.projectName
      return dataSourceStore.updateApplicationIndex(
        projectName,
        request.name,
        isReindex,
        request,
        !values.reindexOnEdit
      )
    }

    return dataSourceStore.createApplicationGitIndex(values.projectName, request)
  }

  const createOrUpdateFilesIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      files: values.files,
      csv_separator: values.csvSeparator,
      csv_start_row: values.csvStartRow,
      csv_rows_per_document: values.csvRowsPerDocument,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.FILE, request, isReindex)
    }

    return dataSourceStore.createKBIndexFiles(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.files ?? [],
      request.csv_separator,
      request.csv_start_row,
      request.csv_rows_per_document,
      request.embedding_model as string | undefined,
      request.guardrail_assignments
    )
  }

  const createOrUpdateGoogleIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      googleDoc: values.googleDoc,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.GOOGLE, request, isReindex)
    }

    return dataSourceStore.createKBIndexGoogleDoc(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.googleDoc as string,
      request.embedding_model as string | undefined,
      request.guardrail_assignments,
      request.cron_expression ?? undefined
    )
  }

  const createOrUpdateConfluenceIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      cql: values.cql,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.CONFLUENCE, request, isReindex)
    }

    return dataSourceStore.createKBIndexConfluence(request)
  }

  const createOrUpdateJiraIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      jql: values.jql,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.JIRA, request, isReindex)
    }

    return dataSourceStore.createKBIndexJIRA(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.jql!,
      request.setting_id as string,
      request.embedding_model as string | undefined,
      request.guardrail_assignments,
      request.cron_expression ?? undefined
    )
  }

  const createOrUpdateXrayIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      jql: values.jql,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.XRAY, request, isReindex)
    }

    return dataSourceStore.createKBIndexXray(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.jql!,
      request.setting_id as string,
      request.embedding_model as string | undefined,
      request.guardrail_assignments,
      request.cron_expression ?? undefined
    )
  }

  const createOrUpdateAzureDevOpsWikiIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      wiki_query: values.wikiQuery,
      wiki_name: values.wikiName,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.AZURE_DEVOPS_WIKI, request, isReindex)
    }

    return dataSourceStore.createKBIndexAzureDevOpsWiki(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.wiki_query!,
      request.wiki_name,
      request.setting_id as string,
      request.embedding_model as string | undefined,
      request.guardrail_assignments,
      request.cron_expression ?? undefined
    )
  }

  const createOrUpdateAzureDevOpsWorkItemIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      wiql_query: values.wiqlQuery,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM, request, isReindex)
    }

    return dataSourceStore.createKBIndexAzureDevOpsWorkItem(
      request.name,
      request.project_name,
      request.project_space_visible,
      request.description,
      request.wiql_query!,
      request.setting_id as string,
      request.embedding_model as string | undefined,
      request.guardrail_assignments,
      request.cron_expression ?? undefined
    )
  }

  const createOrUpdateSharePointIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)
    const authType = values.sharepointAuthType ?? SHAREPOINT_AUTH_TYPES.INTEGRATION
    const isMicrosoftAuth =
      authType === SHAREPOINT_AUTH_TYPES.OAUTH_CODEMIE ||
      authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      site_url: values.siteUrl,
      include_pages: values.includePages ?? true,
      include_documents: values.includeDocuments ?? true,
      include_lists: values.includeLists ?? true,
      files_filter: values.sharepointFilesFilter ?? '',
      auth_type: authType,
      ...(isMicrosoftAuth
        ? {
            access_token: values.sharepointAccessToken ?? '',
            oauth_client_id:
              authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
                ? values.sharepointCustomClientId ?? undefined
                : undefined,
            oauth_tenant_id:
              authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
                ? values.sharepointTenantId ?? undefined
                : undefined,
          }
        : { setting_id: values.setting_id }),
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.SHAREPOINT, request, isReindex)
    }

    return dataSourceStore.createKBIndexSharePoint({
      name: request.name,
      project_name: request.project_name,
      project_space_visible: request.project_space_visible,
      description: request.description,
      site_url: request.site_url!,
      setting_id: isMicrosoftAuth ? '' : values.setting_id ?? '',
      embedding_model: request.embedding_model as string | undefined,
      guardrail_assignments: request.guardrail_assignments,
      cron_expression: request.cron_expression ?? undefined,
      include_pages: request.include_pages,
      include_documents: request.include_documents,
      include_lists: request.include_lists,
      files_filter: request.files_filter,
      auth_type: authType,
      access_token: isMicrosoftAuth ? values.sharepointAccessToken ?? '' : undefined,
      oauth_client_id:
        authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
          ? values.sharepointCustomClientId ?? undefined
          : undefined,
      oauth_tenant_id:
        authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
          ? values.sharepointTenantId ?? undefined
          : undefined,
    })
  }

  const createOrUpdateProviderIndex = async (indexMetadata: any, values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const payload = getBaseRequestFields(values, index, hasProjectChanged)

    const providerParams = [
      ...indexMetadata.base_schema.parameters,
      ...indexMetadata.create_schema.parameters,
    ]

    for (const param of providerParams) {
      payload[param.name] = values[param.name]
    }

    if (isEditMode && index) {
      if (isReindex) return dataSourceStore.reindexProviderIndex(index.id, payload)
      return dataSourceStore.updateProviderIndex(index.id, payload)
    }

    return dataSourceStore.createProviderIndex(
      indexMetadata.toolkit_id,
      indexMetadata.provider_name,
      payload
    )
  }

  return { createIndex, healthCheckResult }
}
