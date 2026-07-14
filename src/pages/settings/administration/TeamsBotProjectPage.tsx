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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useSnapshot } from 'valtio'

import AssistantSvg from '@/assets/icons/assistant.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DEFAULT_PAGINATION_OPTIONS } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { assistantsProjectMappingStore } from '@/store/assistantsProjectMapping'
import { Assistant } from '@/types/entity/assistant'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import AddAssistantModal from './components/AddAssistantModal'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Assistant Name', type: DefinitionTypes.Custom, headClassNames: 'w-[80%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

interface AssistantNameCellProps {
  name: string
}

const AssistantNameCell: FC<AssistantNameCellProps> = ({ name }) => <span>{name}</span>

interface AssistantActionsCellProps {
  assistant: Assistant
  onView: (id: string) => void
  onRequestDelete: (assistant: Assistant) => void
}

const AssistantActionsCell: FC<AssistantActionsCellProps> = ({
  assistant,
  onView,
  onRequestDelete,
}) => (
  <div className="flex justify-end gap-2">
    <Button size={ButtonSize.MEDIUM} onClick={() => onView(assistant.id)}>
      <AssistantSvg className="w-4 h-4" />
      View Assistant
    </Button>
    <Button
      size={ButtonSize.MEDIUM}
      type={ButtonType.DELETE}
      onClick={() => onRequestDelete(assistant)}
    >
      <DeleteSvg className="w-4 h-4" />
      Remove
    </Button>
  </div>
)

const renderAssistantName = (item: Assistant) => <AssistantNameCell name={item.name} />

const createAssistantActionsRenderer =
  (onView: (id: string) => void, onRequestDelete: (assistant: Assistant) => void) =>
  (item: Assistant) =>
    <AssistantActionsCell assistant={item} onView={onView} onRequestDelete={onRequestDelete} />

const TeamsBotProjectPage: FC = () => {
  const { projectName } = useParams<{ projectName: string }>()
  const navigate = useNavigate()
  const { assistants, pagination, loading, error } = useSnapshot(assistantsProjectMappingStore)
  const [showModal, setShowModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Assistant | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState('')

  useEffect(() => {
    if (!projectName) return
    assistantsProjectMappingStore.fetchMappings(projectName, 0, 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName])

  const handleDelete = useCallback(
    async (assistant: Assistant) => {
      if (!projectName) return
      try {
        await assistantsProjectMappingStore.removeMapping(assistant.id, projectName)
        toaster.info('Assistant removed')
      } catch (error: any) {
        toaster.error(error?.message || 'Failed to remove assistant')
      } finally {
        setPendingDelete(null)
      }
    },
    [projectName]
  )

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      if (!projectName) return
      assistantsProjectMappingStore.fetchMappings(
        projectName,
        page,
        newPerPage ?? pagination.perPage
      )
    },
    [projectName, pagination.perPage]
  )

  const handleViewAssistant = useCallback((id: string) => navigate(`/assistants/${id}`), [navigate])

  const handleRequestDelete = useCallback((assistant: Assistant) => {
    setPendingDelete(assistant)
    setPendingDeleteName(assistant.name)
  }, [])

  const customRenderColumns = useMemo(
    () => ({
      name: renderAssistantName,
      actions: createAssistantActionsRenderer(handleViewAssistant, handleRequestDelete),
    }),
    [handleViewAssistant, handleRequestDelete]
  )

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={() => setShowModal(true)} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Add assistants
      </Button>
    ),
    []
  )

  const renderContent = () => {
    if (!loading && error) {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-12">
          <p className="text-text-secondary">Failed to load assistants</p>
        </div>
      )
    }

    if (!loading && assistants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 pt-12">
          <p className="text-text-secondary">
            No assistants configured for Teams bot on this project.
          </p>
          <Button size={ButtonSize.MEDIUM} onClick={() => setShowModal(true)}>
            <PlusFilledSvg />
            Add assistants
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full pt-6">
        <Table
          items={assistants}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
          }}
          onPaginationChange={handlePageChange}
          perPageOptions={DEFAULT_PAGINATION_OPTIONS}
        />
      </div>
    )
  }

  return (
    <>
      <SettingsLayout
        contentTitle={`Teams bot — ${projectName ?? ''}`}
        content={renderContent()}
        rightContent={renderHeaderActions}
        onBack={() => navigate('/settings/administration/teams')}
      />
      {showModal && projectName && (
        <AddAssistantModal projectName={projectName} onClose={() => setShowModal(false)} />
      )}
      <ConfirmationModal
        visible={!!pendingDelete}
        header="Remove assistant?"
        message={`Remove "${pendingDeleteName}" from Teams bot on this project?`}
        confirmText="Remove"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

export default TeamsBotProjectPage
