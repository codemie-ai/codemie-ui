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

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { ButtonSize } from '@/constants'
import { workItemsStore } from '@/store/workItems'
import { WorkItem, WorkItemFilters } from '@/types/entity/workItem'
import { ColumnDefinition, DefinitionTypes, SortState } from '@/types/table'

import WorkItemFiltersComponent from './components/WorkItemFilters'
import WorkItemForm from './components/WorkItemForm'

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { key: 'title', label: 'Title', type: DefinitionTypes.String, sortable: false },
  { key: 'type', label: 'Type', type: DefinitionTypes.String, shrink: true },
  { key: 'priority', label: 'Priority', type: DefinitionTypes.String, shrink: true },
  { key: 'status', label: 'Status', type: DefinitionTypes.String, shrink: true },
  { key: 'assignee', label: 'Assignee', type: DefinitionTypes.String, shrink: true },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, shrink: true },
]

const WorkItemsListPage: React.FC = () => {
  const { items, loading, error, pagination } = useSnapshot(workItemsStore)
  const [filters, setFilters] = useState<WorkItemFilters>({})
  const [sort, setSort] = useState<SortState>({})
  const [page, setPage] = useState(0)
  const [formVisible, setFormVisible] = useState(false)
  const [editItem, setEditItem] = useState<WorkItem | null>(null)

  const fetchItems = useCallback(() => {
    workItemsStore.fetchItems(
      { ...filters, sort: sort.sortKey as WorkItemFilters['sort'], order: sort.sortOrder },
      page
    )
  }, [filters, sort, page])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleFilterChange = useCallback((updated: Partial<WorkItemFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }))
    setPage(0)
  }, [])

  const handleSort = useCallback((key: string) => {
    setSort((prev) => ({
      sortKey: key,
      sortOrder: prev.sortKey === key && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleCreate = useCallback(() => {
    setEditItem(null)
    setFormVisible(true)
  }, [])

  const handleEdit = useCallback((item: WorkItem) => {
    setEditItem(item)
    setFormVisible(true)
  }, [])

  const handleDelete = useCallback(
    async (item: WorkItem) => {
      if (window.confirm(`Delete "${item.title}"?`)) {
        await workItemsStore.deleteItem(item.id)
        fetchItems()
      }
    },
    [fetchItems]
  )

  const handleFormHide = useCallback(() => {
    setFormVisible(false)
    setEditItem(null)
    fetchItems()
  }, [fetchItems])

  const customRenderColumns = useMemo(
    () => ({
      actions: (item: WorkItem) => (
        <div className="flex gap-2 justify-end">
          <Button
            type="secondary"
            size={ButtonSize.SMALL}
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(item)
            }}
          >
            Edit
          </Button>
          <Button
            type="secondary"
            size={ButtonSize.SMALL}
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item)
            }}
          >
            Delete
          </Button>
        </div>
      ),
    }),
    [handleEdit, handleDelete]
  )

  const headerActions = (
    <Button type="primary" size={ButtonSize.MEDIUM} onClick={handleCreate}>
      <PlusIcon />
      Create Work Item
    </Button>
  )

  let content: React.ReactNode

  if (loading && items.length === 0) {
    content = (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    )
  } else if (error) {
    content = <p className="text-text-error p-4">{error}</p>
  } else {
    content = (
      <Table
        items={items}
        columnDefinitions={COLUMN_DEFINITIONS}
        customRenderColumns={customRenderColumns}
        idPath="id"
        sort={sort}
        onSort={handleSort}
        loading={loading}
        innerPagination
        pagination={{
          page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={(newPage) => setPage(newPage)}
      />
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar
        title="Work Items"
        description="Create and manage work items for your platform activities"
      >
        <WorkItemFiltersComponent filters={filters} onChange={handleFilterChange} />
      </Sidebar>

      <PageLayout title="Work Items" rightContent={headerActions}>
        {content}

        <WorkItemForm visible={formVisible} onHide={handleFormHide} editItem={editItem} />
      </PageLayout>
    </div>
  )
}

export default WorkItemsListPage
