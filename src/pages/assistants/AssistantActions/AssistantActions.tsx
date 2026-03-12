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

import CopyLinkSvg from '@/assets/icons/copy-link.svg?react'
import CloneSvg from '@/assets/icons/copy.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import ExportSvg from '@/assets/icons/export.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import { ButtonType } from '@/constants'
import { AssistantType } from '@/constants/assistants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store'
import { Assistant } from '@/types/entity/assistant'
import { canDelete, canEdit } from '@/utils/entity'
import { copyToClipboard } from '@/utils/utils'

import ActionConfirmationModal from './components/ActionConfirmationModal'
import AssistantMenu, { ActionItem } from './components/AssistantMenu'
import PublishToMarketplaceModal from './components/PublishToMarketplaceModal'
import { getAssistantLink } from '../utils/getAssistantLink'

interface AssistantActionsProps {
  assistant: Assistant
  page?: 'assistants' | 'assitant_details'
  onView?: (assistant: Assistant) => void
  onExport?: (assistant: Assistant) => void
  reloadAssistants?: () => void
  loadAssistant?: () => Promise<void>
}

const AssistantActions: React.FC<AssistantActionsProps> = ({
  assistant,
  page = 'assistants',
  onView,
  onExport,
  reloadAssistants,
  loadAssistant,
}) => {
  const router = useVueRouter()
  const [activeModal, setActiveModal] = useState<'delete' | 'unpublish' | null>(null)
  const [isPublishToMarketplaceModalVisible, setIsPublishToMarketplaceModalVisible] =
    useState(false)

  const isRemoteAssistant = assistant.type === AssistantType.A2A
  const canClone = assistant.type !== AssistantType.A2A && assistant.type !== AssistantType.BEDROCK

  const handleEdit = () => {
    if (isRemoteAssistant) {
      router.push({ name: 'edit-remote-assistant', params: { id: assistant.id } })
    } else {
      router.push({ name: 'edit-assistant', params: { id: assistant.id } })
    }
  }

  const handlePublish = () => {
    setIsPublishToMarketplaceModalVisible(true)
  }

  const canEditAssistant = canEdit(assistant)

  const assistantActions: ActionItem[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: <InfoSvg />,
      isVisible: page !== 'assitant_details',
      onClick: () => onView?.(assistant),
    },
    {
      id: 'copy-link',
      label: 'Copy Link',
      icon: <CopyLinkSvg />,
      isVisible: true,
      onClick: () =>
        copyToClipboard(getAssistantLink(assistant.id), 'Link to assistant copied to clipboard'),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <EditSvg />,
      isVisible: canEditAssistant,
      onClick: () => handleEdit(),
    },
    {
      id: 'clone',
      label: 'Clone',
      icon: <CloneSvg />,
      isVisible: canClone,
      onClick: () => router.push({ name: 'clone-assistant', params: { id: assistant.id } }),
    },
    // {
    //   id: 'start-chat',
    //   label: 'Start chat with avatar',
    //   icon: <ChatSvg className="h-4 w-4" />,
    //   isVisible: false, // Currently a disabled feature
    //   onClick: () => onStartAvatarChat?.(assistant)
    // },
    {
      id: 'delete',
      label: 'Delete',
      icon: <DeleteSvg />,
      isVisible: canDelete(assistant),
      onClick: () => setActiveModal('delete'),
    },
    {
      id: 'export',
      label: 'Export',
      icon: <ExportSvg />,
      isVisible: false,
      onClick: () => onExport?.(assistant),
    },
    {
      id: 'publish',
      label: 'Publish to Marketplace',
      icon: <PublishSvg />,
      isVisible: canEditAssistant && !assistant.is_global,
      onClick: () => handlePublish(),
    },
    {
      id: 'unpublish',
      label: 'Remove from Marketplace',
      icon: <UnpublishSvg />,
      isVisible: canEditAssistant && assistant.is_global,
      onClick: () => setActiveModal('unpublish'),
    },
  ]

  return (
    <>
      <AssistantMenu actions={assistantActions} />

      <ActionConfirmationModal
        isOpen={activeModal === 'delete'}
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteSvg />}
        header="Delete this Assistant?"
        message="Action can not be cancelled."
        successMessage="Assistant has been deleted successfully!"
        errorMessage="Failed to delete assistant."
        onConfirm={async () => {
          await assistantsStore.deleteAssistant(assistant.id)
        }}
        onSuccess={async () => {
          reloadAssistants?.()
          if (page === 'assitant_details') {
            router.push({ name: 'assistants' })
          }
        }}
        onCancel={() => setActiveModal(null)}
      />

      <PublishToMarketplaceModal
        isOpen={isPublishToMarketplaceModalVisible}
        assistant={assistant}
        onClose={() => setIsPublishToMarketplaceModalVisible(false)}
        onSuccess={() => {
          reloadAssistants?.()
          loadAssistant?.()
        }}
      />

      <ActionConfirmationModal
        isOpen={activeModal === 'unpublish'}
        confirmText="Unpublish"
        header="Remove from Marketplace?"
        message="This will remove your assistant from the marketplace. It will still be available in your personal assistants."
        confirmButtonType={ButtonType.DELETE}
        successMessage="Assistant has been unpublished from marketplace successfully!"
        onConfirm={async () => assistantsStore.unpublishAssistantFromMarketplace(assistant.id)}
        onSuccess={() => {
          reloadAssistants?.()
          loadAssistant?.()
        }}
        onCancel={() => setActiveModal(null)}
      />
    </>
  )
}

export default AssistantActions
