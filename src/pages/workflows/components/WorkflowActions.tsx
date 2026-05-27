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
import { useSnapshot } from 'valtio'

import CopyLinkIcon from '@/assets/icons/copy-link.svg?react'
import CloneIcon from '@/assets/icons/copy.svg?react'
import DeleteIcon from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { CLONE_WORKFLOW, EDIT_WORKFLOW, VIEW_WORKFLOW } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userStore } from '@/store/user'
import { workflowsStore } from '@/store/workflows'
import { canDelete, canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import { Workflow } from './WorkflowCard'
import { getWorkflowLink } from '../utils/getWorkflowLink'

interface WorkflowActionsProps {
  workflow: Workflow
  onView?: () => void
  reloadWorkflows?: () => void
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({ workflow, onView, reloadWorkflows }) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canClone = !workflow.is_global || user?.isAdmin

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
        ]
      : []),
    ...(canClone
      ? [
          {
            title: 'Clone',
            icon: <CloneIcon />,
            onClick: handleClone,
          },
        ]
      : []),
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
    </>
  )
}

export default WorkflowActions
