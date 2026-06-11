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

import React, { useState } from 'react'

import CopyLinkIcon from '@/assets/icons/copy-link.svg?react'
import CloneIcon from '@/assets/icons/copy.svg?react'
import DeleteIcon from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { CLONE_WORKFLOW, EDIT_WORKFLOW, VIEW_WORKFLOW } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import { canDelete, canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import PublishWorkflowToMarketplaceModal from './PublishWorkflowToMarketplaceModal'
import { Workflow } from './WorkflowCard'
import { getWorkflowLink } from '../utils/getWorkflowLink'

interface WorkflowActionsProps {
  workflow: Workflow
  onView?: () => void
  reloadWorkflows?: () => void
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({ workflow, onView, reloadWorkflows }) => {
  const router = useVueRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  const handleView = () => {
    if (onView) {
      onView()
    } else {
      router.push({ name: VIEW_WORKFLOW, params: { workflowId: String(workflow.id) } })
    }
  }

  const handleEdit = () => {
    router.push({ name: EDIT_WORKFLOW, params: { id: String(workflow.id) } })
  }

  const handleClone = () => {
    router.push({ name: CLONE_WORKFLOW, params: { id: String(workflow.id) } })
  }

  const handleUnpublish = async () => {
    try {
      setUnpublishing(true)
      await workflowsStore.unpublishWorkflowFromMarketplace(String(workflow.id))
      reloadWorkflows?.()
      toaster.info('Workflow has been removed from the marketplace.')
    } catch {
      toaster.error('Failed to remove workflow from marketplace')
    } finally {
      setUnpublishing(false)
      setShowUnpublishConfirm(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await workflowsStore.deleteWorkflow(workflow.id)
      reloadWorkflows?.()
      toaster.info('Workflow has been deleted successfully!')
    } catch {
      toaster.error('Failed to delete workflow')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const actions = [
    {
      title: 'View Details',
      icon: <InfoIcon />,
      onClick: handleView,
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
    ...(canEdit(workflow)
      ? [
          {
            title: 'Edit',
            icon: <IconEdit />,
            onClick: handleEdit,
          },
          ...(workflow.is_global
            ? [
                {
                  title: 'Remove from Marketplace',
                  icon: <UnpublishSvg />,
                  onClick: () => setShowUnpublishConfirm(true),
                },
              ]
            : [
                {
                  title: 'Publish to Marketplace',
                  icon: <PublishSvg />,
                  onClick: () => setShowPublishModal(true),
                },
              ]),
        ]
      : []),
    {
      title: 'Clone',
      icon: <CloneIcon />,
      onClick: handleClone,
    },
    ...(canDelete(workflow)
      ? [
          {
            title: 'Delete',
            icon: <DeleteIcon />,
            onClick: () => setShowDeleteConfirm(true),
          },
        ]
      : []),
  ]

  if (actions.length === 0) return null

  return (
    <>
      <NavigationMore hideOnClickInside renderInRoot items={actions} />
      <ConfirmationModal
        visible={showDeleteConfirm}
        header="Delete this Workflow?"
        message="Action can not be cancelled."
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteIcon />}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <PublishWorkflowToMarketplaceModal
        workflowId={String(workflow.id)}
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSuccess={() => {
          setShowPublishModal(false)
          reloadWorkflows?.()
        }}
      />
      <ConfirmationModal
        visible={showUnpublishConfirm}
        header="Remove from Marketplace?"
        message="This will remove your workflow from the marketplace. It will still be available in your personal workflows."
        confirmButtonIcon={<UnpublishSvg />}
        confirmText={unpublishing ? 'Removing...' : 'Remove'}
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishConfirm(false)}
      />
    </>
  )
}

export default WorkflowActions
