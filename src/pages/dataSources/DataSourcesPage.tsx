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

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Table from '@/components/Table'
import { TableProps } from '@/components/Table/Table'
import Tooltip from '@/components/Tooltip'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useVueRouter } from '@/hooks/useVueRouter'
import {
  DataSourceActions,
  DataSourceFilters,
  DataSourceStatus,
} from '@/pages/dataSources/components'
import DataSourceName from '@/pages/dataSources/components/DataSourceName'
import { appInfoStore } from '@/store/appInfo'
import { dataSourceStore } from '@/store/dataSources'
import { DataSource } from '@/types/entity/dataSource'
import { ColumnDefinition } from '@/types/table'
import { FILTER_ENTITY, getFilters } from '@/utils/filters'
import { humanize } from '@/utils/helpers'
import { getIndexTypeDisplay, visibility } from '@/utils/indexing'

const REFRESH_TIMEOUT = 5000

const DataSourcesPage = () => {
  const { push } = useVueRouter()
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { indexStatuses, indexStatusesPagination, getIndexesStatuses, loading } = useSnapshot(
    dataSourceStore
  ) as typeof dataSourceStore
  const { sort, onSort, onPaginationUpdate, pagination, applyFilters } = useTableFilters({
    filterKey: FILTER_ENTITY.DATASOURCES,
    initialPagination: { page: 0, perPage: indexStatusesPagination.perPage },
  })

  const getStatuses = useCallback(
    async (isRefresh?: boolean) => {
      const activeFilters = getFilters(`${FILTER_ENTITY.DATASOURCES}`)

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }

      await getIndexesStatuses(
        pagination.page,
        activeFilters,
        pagination.perPage,
        sort.sortKey,
        sort.sortOrder,
        isRefresh
      )

      fetchTimeoutRef.current = setTimeout(() => {
        getStatuses(true)
      }, REFRESH_TIMEOUT)
    },
    [pagination, sort, getIndexesStatuses]
  )

  const handleOpenCreatePage = useCallback(() => {
    push('/data-sources/create')
  }, [push])

  useEffect(() => {
    getStatuses()

    // Check if addDataSource query parameter is present
    const queryParams = new URLSearchParams(window.location.search)
    if (queryParams.get('addDataSource')) {
      push('/data-sources/create')
    }
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [getStatuses])

  useEffect(() => {
    appInfoStore.getLLMModels()
    appInfoStore.getEmbeddingsModels()
  }, [])

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={handleOpenCreatePage} size="medium">
        <PlusIcon />
        Create Datasource
      </Button>
    ),
    [handleOpenCreatePage]
  )

  const tableColumns: ColumnDefinition[] = useMemo(
    () => [
      { label: 'Name', key: 'repo_name', type: 'custom', shrink: true, semiBold: true },
      { label: 'Project', key: 'project_name', type: 'string', shrink: true },
      { label: 'Type', key: 'index_type', type: 'custom' },
      { label: 'Created By', key: 'created_by', type: 'user' },
      { label: 'Created', key: 'date', type: 'date', sortable: true },
      { label: 'Updated', key: 'update_date', type: 'date', sortable: true },
      { label: 'Shared', key: 'project_space_visible', type: 'custom', headClassNames: 'w-[76px]' },
      { label: 'Status', key: 'status', type: 'custom' },
      { label: 'Actions', key: 'actions', type: 'custom' },
    ],
    []
  )

  const customTableColumns: TableProps<DataSource>['customRenderColumns'] = useMemo(
    () => ({
      index_type: (item) => humanize(getIndexTypeDisplay(item.index_type)),
      project_space_visible: (item) => (
        <div className="text-right">{visibility(item.project_space_visible)}</div>
      ),
      status: (item) => <DataSourceStatus item={item} />,
      actions: (item) => <DataSourceActions item={item} />,
      repo_name: (item) => <DataSourceName dataSource={item} />,
    }),
    []
  )

  const tableProps = useMemo(() => {
    return {
      sort,
      onSort,
      items: indexStatuses,
      columnDefinitions: tableColumns,
      pagination: indexStatusesPagination,
      onPaginationChange: onPaginationUpdate,
      customRenderColumns: customTableColumns,
      loading,
    }
  }, [pagination, sort, loading, indexStatuses, indexStatusesPagination])

  return (
    <div className="flex h-full">
      <Sidebar title="Data Sources" description="Connect and manage your data sources in one place">
        <DataSourceFilters onApplyFilters={applyFilters} />
      </Sidebar>
      <PageLayout rightContent={renderHeaderActions}>
        <div data-onboarding="datasource-list-table">
          <Table<DataSource>
            sort={tableProps.sort}
            items={tableProps.items}
            onSort={tableProps.onSort}
            loading={tableProps.loading}
            pagination={tableProps.pagination}
            columnDefinitions={tableProps.columnDefinitions}
            customRenderColumns={tableProps.customRenderColumns}
            onPaginationChange={tableProps.onPaginationChange}
            perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          />
        </div>
        <Tooltip target=".target-tooltip" textStyles="text-h5" />
      </PageLayout>
    </div>
  )
}

export default DataSourcesPage
