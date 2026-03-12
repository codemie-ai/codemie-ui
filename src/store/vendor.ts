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
  VendorKnowledgeBaseEntityDetails,
  VendorAgentVersionDetails,
  VendorGuardrailVersionDetails,
  VendorAlias,
  VendorEntity,
  VendorEntityType,
  VendorOriginType,
  VendorSetting,
  VendorVersion,
} from '@/types/entity/vendor'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

import { LoadMorePagination, Pagination } from '../types/common'

const DEFAULT_PER_PAGE = 10

interface VendorStoreType {
  vendorEntities: VendorEntity[]
  vendorEntitiesPagination: LoadMorePagination

  vendorSettings: VendorSetting[]
  vendorSettingsPagination: Pagination

  vendorVersions: VendorVersion[]
  vendorVersionsPagination: LoadMorePagination

  vendorAliases: VendorAlias[]
  vendorAliasesPagination: LoadMorePagination

  loading: {
    entities: boolean
    settings: boolean
    versions: boolean
    aliases: boolean
    details: boolean
    install: boolean
    uninstall: boolean
    versionDetails: boolean
  }

  getVendorEntities: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    loadMore?: boolean
  ) => Promise<void>

  getVendorSettings: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    page?: number,
    perPage?: number
  ) => Promise<void>

  getVendorVersions: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    loadMore?: boolean
  ) => Promise<void>

  getVendorAliases: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    loadMore?: boolean
  ) => Promise<void>

  getVendorEntityDetails: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string
  ) => Promise<VendorEntity>

  installVendorEntity: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    entity: {
      id: string
      settingId: string
      version?: string
      agentAliasId?: string
      flowAliasId?: string
    }
  ) => Promise<void>

  uninstallVendorEntity: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    aiRunId: string
  ) => Promise<void>

  getVendorAgentVersionDetails: (
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    versionId: string
  ) => Promise<VendorAgentVersionDetails>

  getVendorGuardrailVersionDetails: (
    originType: VendorOriginType,
    settingId: string,
    entityId: string,
    versionId: string
  ) => Promise<VendorGuardrailVersionDetails>

  getVendorKnowledgeBaseDetails: (
    originType: VendorOriginType,
    settingId: string,
    entityId: string
  ) => Promise<VendorKnowledgeBaseEntityDetails>
}

export const awsVendorStore = proxy<VendorStoreType>({
  vendorEntities: [],
  vendorSettings: [],
  vendorVersions: [],
  vendorAliases: [],
  loading: {
    entities: false,
    settings: false,
    versions: false,
    aliases: false,
    details: false,
    install: false,
    uninstall: false,
    versionDetails: false,
  },
  vendorEntitiesPagination: {
    nextToken: null,
    perPage: 8,
  },
  vendorVersionsPagination: {
    nextToken: null,
    perPage: 5,
  },
  vendorAliasesPagination: {
    nextToken: null,
    perPage: 5,
  },
  vendorSettingsPagination: {
    page: 0,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },

  async getVendorEntities(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    loadMore = false
  ) {
    awsVendorStore.loading.entities = true
    try {
      const nextTokenParam =
        loadMore && this.vendorEntitiesPagination.nextToken
          ? `&next_token=${this.vendorEntitiesPagination.nextToken}`
          : ''
      const url = `v1/vendors/${originType}/${entityType}?setting_id=${settingId}&per_page=${this.vendorEntitiesPagination.perPage}${nextTokenParam}`
      const response = await api.get(url)
      const result = await response.json()
      const { data, pagination } = result

      awsVendorStore.vendorEntities = loadMore ? [...awsVendorStore.vendorEntities, ...data] : data
      awsVendorStore.vendorEntitiesPagination = {
        perPage: awsVendorStore.vendorEntitiesPagination.perPage,
        nextToken: pagination.next_token,
      }
    } catch (error) {
      console.error('Error fetching vendor entities:', error)
    } finally {
      awsVendorStore.loading.entities = false
    }
  },

  async installVendorEntity(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    entity: {
      id: string
      settingId: string
      version?: string
      agentAliasId?: string
      flowAliasId?: string
    }
  ) {
    awsVendorStore.loading.install = true
    try {
      const url = `v1/vendors/${originType}/${entityType}`
      const response = await api.post(url, [
        {
          id: entity.id,
          agentAliasId: entity.agentAliasId,
          version: entity.version,
          flowAliasId: entity.flowAliasId,
          setting_id: entity.settingId,
        },
      ])
      toaster.info('Entity installed successfully')
      return response.json()
    } catch (error) {
      console.error('Error applying:', error)
      return Promise.reject(error)
    } finally {
      awsVendorStore.loading.install = false
    }
  },

  async uninstallVendorEntity(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    aiRunId: string
  ) {
    awsVendorStore.loading.uninstall = true
    try {
      const url = `v1/vendors/${originType}/${entityType}/${aiRunId}`
      const response = await api.delete(url)
      toaster.info('Entity uninstalled successfully')
      return response.json()
    } catch (error) {
      console.error('Error applying:', error)
      return Promise.reject(error)
    } finally {
      awsVendorStore.loading.uninstall = false
    }
  },

  async getVendorSettings(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    page = 0,
    perPage = DEFAULT_PER_PAGE
  ) {
    awsVendorStore.loading.settings = true
    try {
      const url = `v1/vendors/${originType}/${entityType}/settings?page=${page}&per_page=${perPage}`
      const response = await api.get(url)
      const result = await response.json()
      const { data, pagination } = result

      awsVendorStore.vendorSettings = data
      awsVendorStore.vendorSettingsPagination = {
        page: pagination.page,
        perPage: pagination.per_page,
        totalPages: pagination.pages,
        totalCount: pagination.total,
      }
    } catch (error) {
      console.error('Error fetching vendor settings:', error)
    } finally {
      awsVendorStore.loading.settings = false
    }
  },

  async getVendorVersions(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    loadMore = false
  ) {
    awsVendorStore.loading.versions = true
    try {
      const nextTokenParam =
        loadMore && this.vendorVersionsPagination.nextToken
          ? `&next_token=${this.vendorVersionsPagination.nextToken}`
          : ''
      const url = `v1/vendors/${originType}/${entityType}/${entityId}/versions?setting_id=${settingId}&per_page=${this.vendorVersionsPagination.perPage}${nextTokenParam}`
      const response = await api.get(url)
      const result = await response.json()
      const { data, pagination } = result

      awsVendorStore.vendorVersions = loadMore ? [...awsVendorStore.vendorVersions, ...data] : data
      awsVendorStore.vendorVersionsPagination = {
        perPage: awsVendorStore.vendorVersionsPagination.perPage,
        nextToken: pagination.next_token,
      }
    } catch (error) {
      console.error('Error fetching vendor versions:', error)
    } finally {
      awsVendorStore.loading.versions = false
    }
  },

  async getVendorAliases(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    loadMore = false
  ) {
    awsVendorStore.loading.aliases = true
    try {
      const nextTokenParam =
        loadMore && this.vendorAliasesPagination.nextToken
          ? `&next_token=${this.vendorAliasesPagination.nextToken}`
          : ''
      const url = `v1/vendors/${originType}/${entityType}/${entityId}/aliases?setting_id=${settingId}&per_page=${this.vendorAliasesPagination.perPage}${nextTokenParam}`
      const response = await api.get(url)
      const result = await response.json()
      const { data, pagination } = result

      awsVendorStore.vendorAliases = loadMore ? [...awsVendorStore.vendorAliases, ...data] : data
      awsVendorStore.vendorAliasesPagination = {
        perPage: awsVendorStore.vendorAliasesPagination.perPage,
        nextToken: pagination.next_token,
      }
    } catch (error) {
      console.error('Error fetching vendor aliases:', error)
    } finally {
      awsVendorStore.loading.aliases = false
    }
  },

  async getVendorEntityDetails(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string
  ) {
    awsVendorStore.loading.details = true
    try {
      const url = `v1/vendors/${originType}/${entityType}/${entityId}?setting_id=${settingId}`
      const response = await api.get(url)
      return await response.json()
    } catch (error) {
      console.error('Error fetching vendor entity details:', error)
      throw error
    } finally {
      awsVendorStore.loading.details = false
    }
  },

  async getVendorKnowledgeBaseDetails(
    originType: VendorOriginType,
    settingId: string,
    entityId: string
  ) {
    awsVendorStore.loading.details = true
    try {
      const url = `v1/vendors/${originType}/${VendorEntityType.knowledgebases}/${entityId}?setting_id=${settingId}`
      const response = await api.get(url)
      return await response.json()
    } catch (error) {
      console.error('Error fetching kb entity details:', error)
      throw error
    } finally {
      awsVendorStore.loading.details = false
    }
  },

  async getVendorAgentVersionDetails(
    originType: VendorOriginType,
    entityType: VendorEntityType,
    settingId: string,
    entityId: string,
    versionId: string
  ) {
    awsVendorStore.loading.versionDetails = true
    try {
      const url = `v1/vendors/${originType}/${entityType}/${entityId}/${versionId}?setting_id=${settingId}`
      const response = await api.get(url)
      return await response.json()
    } catch (error) {
      console.error('Error fetching vendor agent version details:', error)
      throw error
    } finally {
      awsVendorStore.loading.versionDetails = false
    }
  },

  async getVendorGuardrailVersionDetails(
    originType: VendorOriginType,
    settingId: string,
    entityId: string,
    versionId: string
  ) {
    awsVendorStore.loading.versionDetails = true
    try {
      const url = `v1/vendors/${originType}/${VendorEntityType.guardrails}/${entityId}/${versionId}?setting_id=${settingId}`
      const response = await api.get(url)
      return await response.json()
    } catch (error) {
      console.error('Error fetching vendor guardrail version details:', error)
      throw error
    } finally {
      awsVendorStore.loading.versionDetails = false
    }
  },
})
