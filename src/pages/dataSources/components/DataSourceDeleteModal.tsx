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

import { FC, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { dataSourceStore } from '@/store/dataSources'
import { AssistantListResponse } from '@/types/entity/assistant'
import { DataSource } from '@/types/entity/dataSource'

interface DataSourceDeleteModalProps {
  item: Pick<DataSource, 'id' | 'repo_name'>
  visible: boolean
  onHide: () => void
  onDeleted?: () => void
}

const DataSourceDeleteModal: FC<DataSourceDeleteModalProps> = ({
  item,
  visible,
  onHide,
  onDeleted,
}) => {
  const { deleteIndex, showAssistantsWithGivenContext } = useSnapshot(
    dataSourceStore
  ) as typeof dataSourceStore
  const [datasourceAssistants, setDatasourceAssistants] = useState<AssistantListResponse[]>([])

  useEffect(() => {
    const controller = new AbortController()
    if (visible) {
      showAssistantsWithGivenContext(item.id).then((result) => {
        if (!controller.signal.aborted) {
          console.log('DataSourceDeleteModal useEffect: Setting datasource assistants')
          setDatasourceAssistants(result || [])
        }
      })
    }

    return () => controller.abort()
  }, [visible, item.id, showAssistantsWithGivenContext])

  const confirmDelete = useCallback(async () => {
    onHide()
    await deleteIndex(item.id, item.repo_name)
    onDeleted?.()
  }, [item.id, item.repo_name, onHide, onDeleted])

  return (
    <ConfirmationModal
      visible={visible}
      onCancel={onHide}
      header="Delete Data Source?"
      message="Are you sure you want to delete this data source?"
      confirmText="Delete"
      confirmButtonType={ButtonType.DELETE}
      confirmButtonIcon={<DeleteSvg className="w-4 mr-px" />}
      onConfirm={confirmDelete}
    >
      {datasourceAssistants.length > 0 && (
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
  )
}

export default DataSourceDeleteModal
