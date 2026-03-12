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

import React, { useCallback, useEffect, useState } from 'react'

import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { DATASOURCES } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { navigateBack } from '@/utils/helpers'

import DataSourceDetails from './components/DataSourceDetails'

const DataSourceDetailsPage: React.FC = () => {
  const router = useVueRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<DataSourceDetailsResponse | null>(null)

  const handleBack = () => {
    navigateBack(DATASOURCES)
  }

  const loadDataSource = useCallback(async () => {
    setIsLoading(true)
    try {
      const dataSourceId = router.currentRoute.value.params.id as string
      if (dataSourceId) {
        const details = await dataSourceStore.getIndexDetails(dataSourceId)
        setDataSource(details)
      }
    } catch {
      setDataSource(null)
    } finally {
      setIsLoading(false)
    }
  }, [router.currentRoute.value.params.id])

  useEffect(() => {
    loadDataSource()
  }, [loadDataSource])

  return (
    <div className="flex h-full">
      <Sidebar title="View DataSource" description="View your data source datails">
        <></>
      </Sidebar>
      <PageLayout title="Data Source Details" onBack={handleBack}>
        {isLoading && (
          <div className="flex justify-center m-40">
            <Spinner />
          </div>
        )}
        {!isLoading && dataSource && (
          <div className="w-full">
            <DataSourceDetails dataSource={dataSource} />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default DataSourceDetailsPage
