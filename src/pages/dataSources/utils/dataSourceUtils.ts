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

import { SHAREPOINT_AUTH_TYPES } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DataSource } from '@/types/entity/dataSource'
import { canEdit } from '@/utils/entity'
import {
  isLLMRoutingIndex,
  isKBIndex,
  isConfluenceIndex,
  isJiraIndex,
  isXrayIndex,
  isAzureDevOpsWikiIndex,
  isAzureDevOpsWorkItemIndex,
  isSharePointIndex,
  isCodeIndex,
  isProviderIndex,
  isPlatformIndex,
} from '@/utils/indexing'

/**
 * Determines if a SharePoint data source uses Microsoft OAuth auth (not Integration)
 * @param item The data source to check
 * @returns boolean indicating if Microsoft auth is used
 */
export const isSharePointMicrosoftAuth = (item: DataSource): boolean => {
  if (!isSharePointIndex(item)) return false
  const authType = item.sharepoint?.auth_type
  return authType === SHAREPOINT_AUTH_TYPES.OAUTH_CODEMIE || authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
}

/**
 * Determines if a data source can be incrementally reindexed
 * @param item The data source to check
 * @returns boolean indicating if incremental reindex is possible
 */
export const canIncrementalReindex = (item: DataSource): boolean => {
  if (!canEdit(item)) return false
  if (!item.completed && !item.error) return false
  if (isPlatformIndex(item)) return false
  return isJiraIndex(item) || isXrayIndex(item)
}

/**
 * Determines if a data source can be fully reindexed
 * @param item The data source to check
 * @returns boolean indicating if full reindex is possible
 */
export const canFullReindex = (item: DataSource): boolean => {
  // Platform datasources can be reindexed even if they can't be edited
  if (isPlatformIndex(item)) {
    return item.completed || item.error
  }

  if (!canEdit(item)) return false
  if (!item.completed && !item.error) return false

  if (isLLMRoutingIndex(item)) return true
  if (isConfluenceIndex(item)) return true
  if (isJiraIndex(item)) return true
  if (isXrayIndex(item)) return true
  if (isAzureDevOpsWikiIndex(item)) return true
  if (isAzureDevOpsWorkItemIndex(item)) return true
  if (isSharePointIndex(item)) return true
  if (isProviderIndex(item)) return true

  return !isKBIndex(item)
}

/**
 * Determines if indexing can be resumed for a data source
 * @param item The data source to check
 * @param isAdmin Whether the current user is an admin
 * @returns boolean indicating if indexing can be resumed
 */
export const canResumeIndexing = (item: DataSource, isAdmin: boolean): boolean => {
  if (isPlatformIndex(item)) return false
  if (!isConfluenceIndex(item) && !isCodeIndex(item.index_type)) return false
  return (isAdmin && !item.completed) || item.error
}

/**
 * Determines if a data source can be force reindexed
 * @param item The data source to check
 * @param isAdmin Whether the current user is an admin
 * @returns boolean indicating if force reindex is possible
 */
export const canForceReindex = (item: DataSource): boolean => {
  if (!canEdit(item)) return false
  if (item.completed || item.error) return false
  if (isPlatformIndex(item)) return false

  if (isLLMRoutingIndex(item)) return true
  if (isConfluenceIndex(item)) return true
  if (isJiraIndex(item)) return true
  if (isXrayIndex(item)) return true
  if (isAzureDevOpsWikiIndex(item)) return true
  if (isAzureDevOpsWorkItemIndex(item)) return true
  if (isProviderIndex(item)) return true

  return !isKBIndex(item)
}

/**
 * Performs an incremental reindex operation
 * @param item The data source to reindex
 * @param updateKBIndex Function to update KB index
 * @param updateApplicationIndex Function to update application index
 */
export const performIncrementalReindex = (
  item: DataSource,
  updateKBIndex: typeof dataSourceStore.updateKBIndex,
  updateApplicationIndex: typeof dataSourceStore.updateApplicationIndex
): void => {
  if (isJiraIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        jql: item.jira.jql,
      },
      false,
      true
    )
    return
  }
  if (isXrayIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        jql: item.xray.jql,
      },
      false,
      true
    )
    return
  }
  updateApplicationIndex(item.project_name, item.repo_name)
}

/**
 * Performs a full reindex operation
 * @param item The data source to reindex
 * @param reIndexKBIndex Function to reindex KB index
 * @param updateKBIndex Function to update KB index
 * @param updateApplicationIndex Function to update application index
 * @param reindexProviderIndex Function to reindex provider index
 * @param reindexMarketplace Function to reindex marketplace datasources
 */
export const performFullReindex = (
  item: DataSource,
  reIndexKBIndex: typeof dataSourceStore.reIndexKBIndex,
  updateKBIndex: typeof dataSourceStore.updateKBIndex,
  updateApplicationIndex: typeof dataSourceStore.updateApplicationIndex,
  reindexProviderIndex: typeof dataSourceStore.reindexProviderIndex,
  reindexMarketplace?: typeof dataSourceStore.reindexMarketplace
): void => {
  if (isPlatformIndex(item)) {
    reindexMarketplace?.()
  } else if (isLLMRoutingIndex(item)) {
    reIndexKBIndex(item.index_type, item.project_name, item.repo_name)
  } else if (isConfluenceIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
      },
      true
    )
  } else if (isJiraIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        jql: item.jira.jql,
      },
      true
    )
  } else if (isXrayIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        jql: item.xray.jql,
      },
      true
    )
  } else if (isAzureDevOpsWikiIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        wiki_query: item.azure_devops_wiki?.wiki_query ?? '',
        wiki_name: item.azure_devops_wiki?.wiki_name ?? undefined,
      },
      true
    )
  } else if (isSharePointIndex(item) && !isSharePointMicrosoftAuth(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        site_url: item.sharepoint?.site_url ?? '',
      },
      true
    )
  } else if (isAzureDevOpsWorkItemIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
        wiql_query: item.azure_devops_work_item?.wiql_query ?? '',
      },
      true
    )
  } else if (isProviderIndex(item)) {
    reindexProviderIndex(item.id)
  } else {
    updateApplicationIndex(item.project_name, item.repo_name, true)
  }
}

/**
 * Resumes indexing for a data source
 * @param item The data source to resume indexing for
 * @param resumeApplicationIndex Function to resume application index
 * @param resumeKBIndex Function to resume KB index
 */
export const performResumeIndexing = (
  item: DataSource,
  resumeApplicationIndex: typeof dataSourceStore.resumeApplicationIndex,
  resumeKBIndex: typeof dataSourceStore.resumeKBIndex
): void => {
  if (isCodeIndex(item.index_type)) {
    resumeApplicationIndex(item.project_name, item.repo_name)
  } else if (isConfluenceIndex(item)) {
    resumeKBIndex(item.index_type, {
      name: item.repo_name,
      project_name: item.project_name,
    })
  }
}
