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

import { useEffect, useMemo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import Table from '@/components/Table'
import { ButtonSize } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { providersStore } from '@/store/providers'
import { Provider } from '@/types/entity/provider'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import ProviderActions from './components/ProviderActions'

const PROVIDER_DELETED_MESSAGE = 'Provider deleted successfully'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'id', label: 'ID', type: DefinitionTypes.String, headClassNames: 'w-[65%]' },
  { key: 'name', label: 'Name', type: DefinitionTypes.String, headClassNames: 'w-[30%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[5%]' },
]

const ProvidersManagementPage = () => {
  const { providers, loading } = useSnapshot(providersStore) as typeof providersStore
  const router = useVueRouter()

  useEffect(() => {
    providersStore.indexProviders().catch((error) => {
      console.error('Failed to load providers:', error)
    })
  }, [])

  const handleAddProvider = useCallback(() => {
    router.push({ name: 'providers-create' })
  }, [router])

  const handleViewDetails = useCallback(
    (provider: Provider) => {
      router.push({ name: 'providers-view', params: { id: provider.id } })
    },
    [router]
  )

  const handleEditProvider = useCallback(
    (provider: Provider) => {
      router.push({ name: 'providers-edit', params: { id: provider.id } })
    },
    [router]
  )

  const handleDeleteProvider = useCallback(async (provider: Provider) => {
    await providersStore.deleteProvider(provider.id)
    toaster.info(PROVIDER_DELETED_MESSAGE)
  }, [])

  const renderActions = useCallback(
    (provider: Provider) => (
      <ProviderActions
        provider={provider}
        onViewDetails={handleViewDetails}
        onEdit={handleEditProvider}
        onDelete={handleDeleteProvider}
      />
    ),
    [handleViewDetails, handleEditProvider, handleDeleteProvider]
  )

  const customRenderColumns = useMemo(
    () => ({
      actions: renderActions,
    }),
    [renderActions]
  )

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={handleAddProvider} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Add Provider
      </Button>
    ),
    [handleAddProvider]
  )

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full pt-6">
        <Table
          items={providers}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
        />
      </div>
    )
  }

  return (
    <SettingsLayout
      contentTitle="Providers management"
      content={renderContent()}
      rightContent={renderHeaderActions}
    />
  )
}

export default ProvidersManagementPage
