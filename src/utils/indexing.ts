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
  INDEX_TYPE_SUMMARY,
  INDEX_TYPE_CHUNK_SUMMARY,
  INDEX_TYPE_CODE,
  INDEX_TYPES,
  MAX_FILE_SIZE,
} from '@/constants/dataSources'
import { ContextType } from '@/types/entity/assistant'

interface IndexInfo {
  index_type: string
  [key: string]: any
}

interface FileWithSize {
  size: number
  [key: string]: any
}

export const isKBIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes('knowledge_base_')
}

export const isLLMRoutingIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes('llm_routing_')
}

export const isConfluenceIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes('confluence')
}

export const isJiraIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.JIRA)
}

export const isXrayIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.XRAY)
}

export const isAzureDevOpsWikiIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.AZURE_DEVOPS_WIKI)
}

export const isAzureDevOpsWorkItemIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM)
}

export const isSharePointIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.SHAREPOINT)
}

export const isProviderIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.PROVIDER)
}

export const isPlatformIndex = (info: IndexInfo): boolean => {
  return info.index_type?.startsWith('platform_') ?? false
}

export const isCodeIndex = (type: string): boolean => {
  return [INDEX_TYPES.GIT, INDEX_TYPE_SUMMARY, INDEX_TYPE_CHUNK_SUMMARY, INDEX_TYPE_CODE].includes(
    type
  )
}

export const getContextTypeLabel = (indexType: string): ContextType => {
  const codeIndexTypes = [INDEX_TYPE_CODE, INDEX_TYPE_SUMMARY, INDEX_TYPE_CHUNK_SUMMARY]

  if (codeIndexTypes.includes(indexType)) {
    return ContextType.CODE
  }

  if (indexType === INDEX_TYPES.PROVIDER) {
    return ContextType.PROVIDER
  }

  return ContextType.KNOWLEDGE_BASE
}

export const getIndexTypeCode = (type = ''): string => {
  if (isCodeIndex(type)) {
    return INDEX_TYPES.GIT
  }
  return type.replace('knowledge_base_', '').replace('llm_routing_', '')
}

export const getIndexTypeDisplay = (type: string): string => {
  return type.replace('knowledge_base_', '').replace('llm_routing_', '')
}

export const getFullIndexType = (type: string): string => {
  if (isCodeIndex(type)) return INDEX_TYPES.GIT
  if (type === INDEX_TYPES.PROVIDER) return type
  if (type === INDEX_TYPES.GOOGLE) return 'llm_routing_google'

  return `knowledge_base_${type}`
}

export const visibility = (projectSpaceVisible: boolean): string => {
  return projectSpaceVisible ? 'Yes' : 'No'
}

// Validators

export const googleDocLinkValidator = (value: string): boolean => {
  return value.includes('docs.google.com/document')
}

export const fileSizeValidator = (value?: FileWithSize): boolean => {
  if (!value?.size) return true
  return value.size <= MAX_FILE_SIZE
}
