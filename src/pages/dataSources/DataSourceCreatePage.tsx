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

import { FC, useMemo, useRef, useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { DATASOURCE_DETAILS, DATASOURCES } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { dataSourceStore } from '@/store/dataSources'
import { userStore } from '@/store/user'
import { userSettingsStore } from '@/store/userSettings'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { navigateBack } from '@/utils/helpers'
import { isBedrockIndex, isPlatformIndex, isProviderIndex } from '@/utils/indexing'

import DataSourceForm, { DataSourceFormRef } from './components/DataSourceForm/DataSourceForm'
import { hasCreatableProject } from './utils/canCloneDataSource'

type BlockReason =
  | 'not-found'
  | 'load-failed'
  | 'bedrock'
  | 'platform'
  | 'no-project'
  | 'provider-deleted'

const BLOCK_MESSAGES: Record<BlockReason, string> = {
  'not-found': 'Data source not found',
  'load-failed': 'Failed to load the data needed to clone this data source. Please try again',
  bedrock: 'Cloning is not supported for Bedrock knowledge bases',
  platform: 'Cloning is not supported for platform data sources',
  'no-project': 'You need access to at least one project to clone a data source',
  'provider-deleted': 'The provider for this data source no longer exists, so it cannot be cloned',
}

const getBlockReason = (
  dataSource: DataSourceDetailsResponse | null,
  providerIds: string[],
  user: Parameters<typeof hasCreatableProject>[0],
  schemasFailed: boolean
): BlockReason | null => {
  if (!dataSource?.id) return 'not-found'
  if (isBedrockIndex(dataSource)) return 'bedrock'
  if (isPlatformIndex(dataSource)) return 'platform'
  if (!hasCreatableProject(user)) return 'no-project'
  if (isProviderIndex(dataSource)) {
    if (schemasFailed) return 'load-failed'
    if (!providerIds.includes(dataSource.provider_fields?.provider_id)) return 'provider-deleted'
  }
  return null
}

/** Creates a data source; with a route `:id` it clones that source (prefilled create form). */
const DataSourceCreatePage: FC = () => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const cloneId = router.currentRoute.value.params.id as string | undefined
  const isClone = !!cloneId
  const [cloneSource, setCloneSource] = useState<DataSourceDetailsResponse | null>(null)
  const [providerIds, setProviderIds] = useState<string[]>([])
  const [schemasFailed, setSchemasFailed] = useState(false)
  const [loading, setLoading] = useState(isClone)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormReady, setIsFormReady] = useState(!isClone)
  const formRef = useRef<DataSourceFormRef>(null)

  const handleClose = () => {
    if (isClone) navigateBack(DATASOURCE_DETAILS, DATASOURCES)
    else navigateBack(DATASOURCES)
  }

  const onSubmit = () => {
    if (formRef.current) {
      formRef.current.submit()
    }
  }

  useEffect(() => {
    userSettingsStore.resetIsSettingsIndexed()
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async (id: string) => {
      setLoading(true)
      setCloneSource(null)
      setSchemasFailed(false)

      let details: DataSourceDetailsResponse | null = null
      try {
        details = (await dataSourceStore.getIndexDetails(id)) ?? null
      } catch (error) {
        console.error('Error fetching data source to clone:', error)
      }

      // Provider schemas tell whether a provider source can still be created.
      let failed = false
      if (details && isProviderIndex(details)) {
        try {
          await dataSourceStore.getProviderIndexSchemas()
        } catch (error) {
          console.error('Error fetching provider schemas:', error)
          failed = true
        }
      }

      if (cancelled) return
      setProviderIds(dataSourceStore.indexProviderSchemas.map((schema) => schema.id))
      setSchemasFailed(failed)
      setCloneSource(details)
      setLoading(false)
    }

    if (cloneId) load(cloneId)

    return () => {
      cancelled = true
    }
  }, [cloneId])

  // An unloaded user is still loading, not "no project"; the snapshot re-renders when it arrives.
  const isLoading = isClone && (loading || !user)
  const blockReason =
    isClone && !isLoading ? getBlockReason(cloneSource, providerIds, user, schemasFailed) : null

  const renderHeaderActions = useMemo(
    () => (
      <div className="flex gap-x-4">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={isSubmitting || !isFormReady || !!blockReason || isLoading}
          onClick={onSubmit}
        >
          Save
        </Button>
      </div>
    ),
    [handleClose, isSubmitting, isFormReady, blockReason, isLoading, onSubmit]
  )

  return (
    <div className="flex h-full">
      <Sidebar
        title={isClone ? 'Clone DataSource' : 'New DataSource'}
        description={
          isClone
            ? 'Create a new data source based on an existing one'
            : 'Start indexing your data source'
        }
      >
        <></>
      </Sidebar>
      <PageLayout
        title={isClone ? 'Clone Data Source' : 'Create New DataSource'}
        onBack={handleClose}
        rightContent={renderHeaderActions}
        limitWidth={true}
      >
        {isLoading && (
          <div className="mx-auto">
            <Spinner className="mb-24" />
          </div>
        )}
        {blockReason && <div className="m-auto">{BLOCK_MESSAGES[blockReason]}</div>}
        {!isLoading && !blockReason && (
          <DataSourceForm
            cloneFrom={cloneSource}
            onClose={handleClose}
            ref={formRef}
            onSubmittingChange={setIsSubmitting}
            onReadyChange={isClone ? setIsFormReady : undefined}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default DataSourceCreatePage
