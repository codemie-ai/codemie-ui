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

import { useState, useCallback, useMemo, FC } from 'react'
import { useSnapshot } from 'valtio'

import CopySvg from '@/assets/icons/copy.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import ExportSvg from '@/assets/icons/export.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import ReindexSvg from '@/assets/icons/reindex.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userStore } from '@/store'
import { dataSourceStore } from '@/store/dataSources'
import { DataSource } from '@/types/entity/dataSource'
import { canDelete, canEdit } from '@/utils/entity'
import { copyToClipboard } from '@/utils/helpers'

import {
  canFullReindex,
  canIncrementalReindex,
  canResumeIndexing,
  canForceReindex,
  performFullReindex,
  performIncrementalReindex,
  performResumeIndexing,
} from '../utils/dataSourceUtils'

interface Props {
  item: DataSource
}

const DataSourceActions: FC<Props> = ({ item }) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore) as typeof userStore
  const {
    exportDatasource,
    resumeKBIndex,
    reindexProviderIndex,
    resumeApplicationIndex,
    deleteIndex,
    updateKBIndex,
    reIndexKBIndex,
    updateApplicationIndex,
    reindexMarketplace,
    showAssistantsWithGivenContext,
  } = useSnapshot(dataSourceStore) as typeof dataSourceStore

  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false)
  const [isReindexConfirmationVisible, setIsReindexConfirmationVisible] = useState(false)
  const [isResumeConfirmationVisible, setIsResumeConfirmationVisible] = useState(false)
  // TODO: update type placement after type response for showAssistantsWithGivenContext()
  const [datasourceAssistants, setDatasourceAssistants] = useState<
    { id: string; name: string; created_by: { name?: string } }[]
  >([])

  const getDatasourceAssistants = useCallback(async () => {
    const result = await showAssistantsWithGivenContext(item.id)
    setDatasourceAssistants(result || [])
  }, [item.id])

  const showDeleteConfirmation = useCallback(async () => {
    await getDatasourceAssistants()
    setIsDeleteConfirmationVisible(true)
  }, [getDatasourceAssistants])

  const confirmDelete = useCallback(async () => {
    setIsDeleteConfirmationVisible(false)
    await deleteIndex(item.id, item.repo_name)
  }, [item.id, item.repo_name])

  const canIncrementalReindexItem = useMemo(() => canIncrementalReindex(item), [item])
  const canFullReindexItem = useMemo(() => canFullReindex(item), [item])
  const canResumeIndexingItem = useMemo(
    () => canResumeIndexing(item, user!.isAdmin),
    [item, user!.isAdmin]
  )
  const canForceReindexItem = useMemo(() => canForceReindex(item), [item])

  const incrementalReindex = useCallback(() => {
    performIncrementalReindex(item, updateKBIndex, updateApplicationIndex)
  }, [item])

  const forceReindex = useCallback(() => {
    setIsReindexConfirmationVisible(true)
  }, [])

  const fullReindex = useCallback(() => {
    setIsReindexConfirmationVisible(true)
  }, [])

  const showResumeConfirmation = useCallback(() => {
    setIsResumeConfirmationVisible(true)
  }, [])

  const confirmFullReindex = useCallback(() => {
    setIsReindexConfirmationVisible(false)
    performFullReindex(
      item,
      reIndexKBIndex,
      updateKBIndex,
      updateApplicationIndex,
      reindexProviderIndex,
      reindexMarketplace
    )
  }, [item])

  const confirmResume = useCallback(() => {
    setIsResumeConfirmationVisible(false)
    performResumeIndexing(item, resumeApplicationIndex, resumeKBIndex)
  }, [item])

  const copyDatasourceId = useCallback((datasource) => {
    copyToClipboard(datasource.id, 'Datasource Id copied to clipboard')
  }, [])

  const exportDatasourceItem = useCallback((datasource) => {
    exportDatasource(datasource.id, datasource.repo_name || datasource.full_name)
  }, [])

  const menuActions = [
    {
      title: 'View Details',
      icon: <InfoSvg />,
      onClick: () => router.push({ name: 'data-source-details', params: { id: item.id } }),
    },
    {
      title: 'Edit',
      icon: <EditSvg />,
      hidden: !canEdit(item),
      onClick: () => router.push(`/data-sources/${item.id}/edit`),
    },
    {
      title: 'Incremental Index',
      icon: <ReindexSvg />,
      hidden: !canIncrementalReindexItem,
      onClick: incrementalReindex,
    },
    {
      title: 'Full Reindex',
      icon: <ReindexSvg />,
      hidden: !canFullReindexItem,
      onClick: fullReindex,
    },
    {
      title: 'Resume Indexing',
      icon: <ReindexSvg />,
      hidden: !canResumeIndexingItem,
      onClick: showResumeConfirmation,
    },
    {
      title: 'Force Reindex',
      icon: <ReindexSvg />,
      hidden: !canForceReindexItem,
      onClick: forceReindex,
    },
    {
      title: 'Copy ID',
      icon: <CopySvg />,
      onClick: () => copyDatasourceId(item),
    },
    {
      title: 'Export',
      icon: <ExportSvg />,
      onClick: () => exportDatasourceItem(item),
    },
    {
      title: 'Delete',
      icon: <DeleteSvg />,
      hidden: !canDelete(item),
      onClick: showDeleteConfirmation,
    },
  ]

  if (item.aice_datasource_id && item.completed) {
    menuActions.push({
      title: 'Open in AICE',
      icon: <OpenSvg />,
      onClick: () => {
        router.push({
          name: 'application-iframe',
          params: { slug: 'aice' },
          query: { path: `/workspace/${item.aice_datasource_id}/code` },
        })
      },
    })
  }

  return (
    <div className="flex justify-end">
      <NavigationMore hideOnClickInside items={menuActions}></NavigationMore>

      <ConfirmationModal
        visible={isDeleteConfirmationVisible}
        onCancel={() => setIsDeleteConfirmationVisible(false)}
        header="Delete Data Source?"
        message="Are you sure you want to delete this data source?"
        confirmText="Delete"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteSvg className="w-4 mr-px" />}
        onConfirm={confirmDelete}
      >
        {datasourceAssistants && datasourceAssistants.length > 0 && (
          <div>
            <div className="mb-1">
              <p>Given data source used in assistants:</p>
            </div>
            <ul className="list-disc ml-5">
              {datasourceAssistants.map((assistant) => (
                <li key={assistant.id}>
                  <div>
                    <strong>Name: </strong> {assistant.name}
                    <br />
                    <strong>Created by:</strong> {assistant.created_by?.name || 'N/A'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmationModal>

      <ConfirmationModal
        visible={isReindexConfirmationVisible}
        onCancel={() => setIsReindexConfirmationVisible(false)}
        header="Reindex Data Source?"
        message="Are you sure you want to reindex this data source?"
        confirmText="Confirm"
        onConfirm={confirmFullReindex}
        confirmButtonType={ButtonType.BASE}
      />

      <ConfirmationModal
        visible={isResumeConfirmationVisible}
        onCancel={() => setIsResumeConfirmationVisible(false)}
        header="Resume Data Source indexing?"
        message="Are you sure you want to resume indexing for this data source?"
        confirmText="Confirm"
        confirmButtonType={ButtonType.BASE}
        onConfirm={confirmResume}
      />
    </div>
  )
}

export default DataSourceActions
