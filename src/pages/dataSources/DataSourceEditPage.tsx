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

import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { DATASOURCES } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { navigateBack } from '@/utils/helpers'
import {
  isLLMRoutingIndex,
  isKBIndex,
  isConfluenceIndex,
  isJiraIndex,
  isXrayIndex,
  isAzureDevOpsWikiIndex,
  isSharePointIndex,
  isProviderIndex,
} from '@/utils/indexing'

import DataSourceForm, { DataSourceFormRef } from './components/DataSourceForm/DataSourceForm'

const DataSourceEditPage: FC = () => {
  const router = useVueRouter()
  const id = router.currentRoute.value.params.id as string
  const [dataSource, setDataSource] = useState<DataSourceDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [canFullIndex, setCanFullIndex] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<DataSourceFormRef>(null)

  const { getIndexDetails } = useSnapshot(dataSourceStore) as typeof dataSourceStore

  const canFullReindex = (item: DataSourceDetailsResponse) => {
    if (!item.completed && !item.error) return false

    if (isLLMRoutingIndex(item)) return true
    if (isConfluenceIndex(item)) return true
    if (isJiraIndex(item)) return true
    if (isXrayIndex(item)) return true
    if (isAzureDevOpsWikiIndex(item)) return true
    if (isSharePointIndex(item)) return true
    if (isProviderIndex(item)) return true

    return !isKBIndex(item)
  }

  useEffect(() => {
    const fetchDataSource = async () => {
      if (!id) return

      try {
        setLoading(true)
        const details = await getIndexDetails(id)
        setDataSource(details)
        setCanFullIndex(canFullReindex(details))
      } catch (error) {
        console.error('Error fetching data source:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDataSource()
  }, [id, getIndexDetails])

  const handleClose = () => {
    navigateBack(DATASOURCES)
  }

  const onSubmit = () => {
    if (formRef.current) {
      formRef.current.submit()
    }
  }

  const onSubmitReindex = () => {
    if (formRef.current) {
      formRef.current.submitReindex?.()
    }
  }

  const renderHeaderActions = useMemo(
    () => (
      <div className="flex gap-x-4">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isSubmitting} onClick={onSubmit}>
          Save
        </Button>
        {canFullIndex && (
          <Button variant="primary" disabled={isSubmitting} onClick={onSubmitReindex}>
            Save & Reindex
          </Button>
        )}
      </div>
    ),
    [handleClose, isSubmitting, onSubmit, onSubmitReindex]
  )

  return (
    <div className="flex h-full">
      <Sidebar
        title="Update DataSource"
        description="Update your data source and start re-indexing"
      >
        <></>
      </Sidebar>
      <PageLayout
        title="Update DataSource"
        onBack={handleClose}
        rightContent={renderHeaderActions}
        limitWidth={true}
      >
        {loading && (
          <div className="mx-auto">
            <Spinner className="mb-24" />
          </div>
        )}
        {!loading && !dataSource && id && <div className="m-auto">Data source not found</div>}
        {!loading && dataSource && id && (
          <DataSourceForm
            isEditing
            index={dataSource}
            onClose={handleClose}
            ref={formRef}
            onSubmittingChange={setIsSubmitting}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default DataSourceEditPage
