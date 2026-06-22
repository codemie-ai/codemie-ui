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

import { useState, useEffect, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import CopyLinkIcon from '@/assets/icons/copy-link.svg?react'
import CloneIcon from '@/assets/icons/copy.svg?react'
import DeleteIcon from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { WORKFLOW_LIST_SCOPE } from '@/pages/workflows/constants'
import { useFavoriteWorkflows } from '@/pages/workflows/hooks/useFavoriteWorkflows'
import { getWorkflowLink } from '@/pages/workflows/utils/getWorkflowLink'
import { chatsStore } from '@/store/chats'
import { userStore } from '@/store/user'
import { workflowsStore } from '@/store/workflows'
import { canEdit, canDelete } from '@/utils/entity'
import { pluralize } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import PublishWorkflowToMarketplaceModal from './PublishWorkflowToMarketplaceModal'
import WorkflowCard, { Workflow as WorkflowCardType } from './WorkflowCard'
import WorkflowStartExecutionPopup from '../details/popups/WorkflowStartExecutionPopup'

interface WorkflowsListProps {
  scope: string
  filters?: Record<string, unknown>
}

interface Workflow {
  id: number | string
  name: string
  description?: string
  icon_url?: string
  created_by?: {
    name?: string
    username?: string
    user_id?: string
    id?: string | number
  }
  shared?: boolean
  is_global?: boolean
  [key: string]: any
}

const REFRESH_TIMEOUT = 1000

const WorkflowsList: React.FC<WorkflowsListProps> = ({ scope, filters = {} }) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const sidebarOffsetClass = useSidebarOffsetClass()

  const { workflows, workflowsLoading, workflowsPagination } = useSnapshot(workflowsStore)
  useSnapshot(userStore)

  const isFavorites = scope === WORKFLOW_LIST_SCOPE.FAVORITES

  const {
    favoriteWorkflows,
    favoritesLoading,
    workflowsPagination: favoritesPagination,
    favoritesPage,
    handleRefresh,
    handleFavoritesPageChange,
  } = useFavoriteWorkflows(isFavorites, filters)

  const activeWorkflows = isFavorites
    ? (favoriteWorkflows as unknown as WorkflowCardType[])
    : (workflows as WorkflowCardType[])
  const activeLoading = isFavorites ? favoritesLoading : workflowsLoading
  const activePagination = isFavorites ? favoritesPagination : workflowsPagination

  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [showCreateWorkflowPopup, setShowCreateWorkflowPopup] = useState(false)
  const [workflowToPublish, setWorkflowToPublish] = useState<Workflow | null>(null)
  const [workflowToUnpublish, setWorkflowToUnpublish] = useState<Workflow | null>(null)

  const handlePublishModalClose = useCallback(() => setWorkflowToPublish(null), [])

  useEffect(() => {
    if (!isFavorites) {
      workflowsStore.setWorkflowsScope(scope)
      workflowsStore.indexWorkflows()
    }
  }, [scope, isFavorites])

  useEffect(() => {
    if (isFavorites) return
    const checkQueryWorkflow = async () => {
      const workflowId = route.query.workflow as string | undefined
      if (workflowId) {
        const workflow = await workflowsStore.getWorkflow(workflowId)
        if (workflow) {
          showWorkflow(workflow)
        }
      }
    }
    checkQueryWorkflow()
  }, [route.query, isFavorites])

  const setPage = async (page = 0, perPage = 12) => {
    workflowsStore.setWorkflowsPagination(page, perPage)

    router.push({
      path: route.path,
      query: {
        ...route.query,
        page: String(page + 1),
        perPage: String(perPage),
      },
    })

    await workflowsStore.indexWorkflows()
  }

  const refreshWorkflows = async (fromStart = false) => {
    if (fromStart) {
      await setPage(0)
    } else {
      await workflowsStore.indexWorkflows()
    }
  }

  const createWorkflowChat = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setShowCreateWorkflowPopup(true)
  }

  const startChat = async (workflow: Workflow) => {
    await chatsStore.startNewChat(String(workflow.id), workflow.name, true)
    router.push({ name: 'new-chat' })
    workflowsStore.updateRecentWorkflows(workflow as any)
  }

  const edit = (workflow: Workflow) => {
    router.push({ name: 'edit-workflow', params: { id: String(workflow.id) } })
  }

  const promptDelete = (workflow: Workflow) => {
    setWorkflowToDelete(workflow)
    setIsConfirmationModalVisible(true)
  }

  const destroy = async () => {
    if (workflowToDelete) {
      await workflowsStore.deleteWorkflow(workflowToDelete.id)
      setTimeout(() => {
        toaster.info('Workflow has been deleted successfully!')
        refreshWorkflows(true)
      }, REFRESH_TIMEOUT)
    }
    setIsConfirmationModalVisible(false)
  }

  const cancelDelete = () => {
    setIsConfirmationModalVisible(false)
  }

  const confirmUnpublish = async () => {
    if (workflowToUnpublish) {
      try {
        await workflowsStore.unpublishWorkflowFromMarketplace(String(workflowToUnpublish.id))
        toaster.info('Workflow has been removed from the marketplace.')
        refreshWorkflows()
      } catch {
        toaster.error('Failed to remove workflow from marketplace')
      }
    }
    setWorkflowToUnpublish(null)
  }

  const showWorkflow = (workflow: Workflow) => {
    router.push({ name: 'view-workflow', params: { workflowId: String(workflow.id) } })
  }

  const clone = (workflow: Workflow) => {
    router.push({ name: 'clone-workflow', params: { id: String(workflow.id) } })
  }

  const navigationActions = (workflow: Workflow) => {
    const actions = [
      {
        title: 'View Details',
        icon: <InfoIcon />,
        onClick: () => showWorkflow(workflow),
      },
      {
        title: 'Copy Link',
        icon: <CopyLinkIcon />,
        onClick: () =>
          copyToClipboard(
            getWorkflowLink(String(workflow.id)),
            'Link to workflow copied to clipboard'
          ),
      },
    ]

    if (canEdit(workflow)) {
      actions.push({
        title: 'Edit',
        icon: <IconEdit />,
        onClick: () => edit(workflow),
      })
    }

    actions.push({
      title: 'Clone',
      icon: <CloneIcon />,
      onClick: () => clone(workflow),
    })

    if (canDelete(workflow)) {
      actions.push({
        title: 'Delete',
        icon: <DeleteIcon />,
        onClick: () => promptDelete(workflow),
      })
    }

    if (canEdit(workflow)) {
      if (workflow.is_global) {
        actions.push({
          title: 'Remove from Marketplace',
          icon: <UnpublishSvg />,
          onClick: () => setWorkflowToUnpublish(workflow),
        })
      } else {
        actions.push({
          title: 'Publish to Marketplace',
          icon: <PublishSvg />,
          onClick: () => setWorkflowToPublish(workflow),
        })
      }
    }

    return actions
  }

  if (!activeLoading && !activeWorkflows?.length) {
    return (
      <div className="flex justify-center m-40">
        <h2>No workflows found.</h2>
      </div>
    )
  }

  if (activeLoading) {
    return <Spinner inline rootClassName="my-auto" />
  }

  return (
    <>
      <section>
        {activePagination.totalCount > 0 && (
          <div className="flex-row px-1 w-full text-xs text-quaternary font-semibold mb-4">
            {activePagination.totalCount}{' '}
            {pluralize(activePagination.totalCount, 'workflow').toUpperCase()}
          </div>
        )}
        <div className="min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-cente">
          {activeWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onCreateWorkflowChat={!isFavorites ? createWorkflowChat : undefined}
              onStartChat={startChat}
              onViewWorkflow={showWorkflow}
              navigationSlot={
                !isFavorites ? (
                  <NavigationMore
                    hideOnClickInside
                    renderInRoot
                    items={navigationActions(workflow)}
                  />
                ) : undefined
              }
              reloadWorkflows={isFavorites ? handleRefresh : undefined}
            />
          ))}
        </div>
      </section>

      {activeWorkflows.length > 0 && !activeLoading && (
        <section>
          <Pagination
            className={`z-[10] fixed bottom-0 right-0 transition-all duration-150 bg-surface-base-primary px-6 pt-[20px] pb-[14px] left-0 ${sidebarOffsetClass}`}
            currentPage={isFavorites ? favoritesPage : activePagination.page}
            totalPages={activePagination.totalPages}
            perPage={activePagination.perPage}
            setPage={isFavorites ? handleFavoritesPageChange : setPage}
          />
        </section>
      )}

      <ConfirmationModal
        visible={isConfirmationModalVisible}
        header="Delete this Workflow?"
        message="Action can not be cancelled."
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteIcon />}
        onConfirm={destroy}
        onCancel={cancelDelete}
      />

      <ConfirmationModal
        visible={workflowToUnpublish !== null}
        header="Remove from Marketplace?"
        message="This will remove your workflow from the marketplace. It will still be available in your personal workflows."
        confirmButtonType={ButtonType.DELETE}
        onConfirm={confirmUnpublish}
        onCancel={() => setWorkflowToUnpublish(null)}
      />

      <WorkflowStartExecutionPopup
        isVisible={showCreateWorkflowPopup}
        onHide={() => setShowCreateWorkflowPopup(false)}
        workflowId={String(selectedWorkflow?.id)}
        startHint={selectedWorkflow?.start_hint}
      />

      {workflowToPublish && (
        <PublishWorkflowToMarketplaceModal
          workflowId={String(workflowToPublish.id)}
          open={true}
          onClose={handlePublishModalClose}
          onSuccess={() => {
            setWorkflowToPublish(null)
            refreshWorkflows()
          }}
        />
      )}
    </>
  )
}

export default WorkflowsList
