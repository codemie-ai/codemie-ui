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

import { useState } from 'react'
import { useNavigate } from 'react-router'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import CopyLinkSvg from '@/assets/icons/copy-link.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { SKILLS_ALL } from '@/constants/routes'
import AttachToAssistantsModal from '@/pages/skills/components/AttachToAssistantsModal'
import PublishToMarketplaceModal from '@/pages/skills/components/PublishToMarketplaceModal'
import { skillsStore } from '@/store/skills'
import { Skill, SkillVisibility } from '@/types/entity/skill'
import { canDelete as canDeleteEntity, canEdit as canEditEntity } from '@/utils/entity'
import { getRootPath, copyToClipboard } from '@/utils/utils'

interface SkillDetailsActionsProps {
  skill: Skill
  onExport: () => void
  exporting: boolean
  reloadSkill?: () => Promise<void>
}

const SkillDetailsActions = ({
  skill,
  onExport,
  exporting,
  reloadSkill,
}: SkillDetailsActionsProps) => {
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState<'delete' | 'unpublish' | null>(null)
  const [isPublishModalVisible, setIsPublishModalVisible] = useState(false)
  const [isAttachModalVisible, setIsAttachModalVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit = canEditEntity(skill)
  const canDelete = canDeleteEntity(skill)

  const handleEdit = () => {
    navigate(`/skills/${skill.id}/edit`)
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await skillsStore.deleteSkill(skill.id)
      navigate(`/${SKILLS_ALL}`)
    } catch (err) {
      console.error('Error deleting skill:', err)
      setDeleting(false)
    } finally {
      setActiveModal(null)
    }
  }

  const handlePublish = () => {
    setIsPublishModalVisible(true)
  }

  const handleUnpublish = async () => {
    try {
      await skillsStore.unpublishFromMarketplace(skill.id)
      reloadSkill?.()
    } catch (error) {
      console.error('Error unpublishing skill:', error)
    } finally {
      setActiveModal(null)
    }
  }

  const getSkillLink = () => {
    return `${getRootPath()}/#/skills/${skill.id}`
  }

  // Actions for the 3-dots menu
  const menuActions = [
    {
      title: 'Copy Link',
      icon: <CopyLinkSvg />,
      isVisible: true,
      onClick: () => copyToClipboard(getSkillLink(), 'Link to skill copied to clipboard'),
    },
    {
      title: 'Publish to Marketplace',
      icon: <PublishSvg />,
      isVisible: canEdit && skill.visibility !== SkillVisibility.PUBLIC,
      onClick: handlePublish,
    },
    {
      title: 'Remove from Marketplace',
      icon: <UnpublishSvg />,
      isVisible: canEdit && skill.visibility === SkillVisibility.PUBLIC,
      onClick: () => setActiveModal('unpublish'),
    },
    {
      title: 'Delete',
      icon: <DeleteSvg />,
      isVisible: canDelete,
      onClick: () => setActiveModal('delete'),
    },
  ]

  const visibleMenuActions = menuActions.filter((action) => action.isVisible)

  const assistantsCount = skill.assistants_count ?? 0

  return (
    <>
      <div className="flex gap-2 items-center">
        {canEdit && (
          <Button type="secondary" size="medium" onClick={handleEdit}>
            <EditSvg className="w-4 h-4" />
            Edit
          </Button>
        )}
        <Button type="secondary" size="medium" onClick={() => setIsAttachModalVisible(true)}>
          <AttachmentSvg className="w-4 h-4" />
          Attach to Assistants
        </Button>
        <Button type="tertiary" size="medium" onClick={onExport} disabled={exporting}>
          <DownloadSvg className="w-4 h-4" />
          Export
        </Button>
        {visibleMenuActions.length > 0 && (
          <NavigationMore hideOnClickInside items={visibleMenuActions} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={activeModal === 'delete'}
        onCancel={() => setActiveModal(null)}
        onConfirm={handleDelete}
        header="Delete Skill"
        message={`Are you sure you want to delete "${skill.name}"? ${
          assistantsCount > 0
            ? `This will remove the skill from ${assistantsCount} assistant(s).`
            : ''
        }`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmButtonType={ButtonType.DELETE}
      />

      {/* Publish to Marketplace Modal */}
      <PublishToMarketplaceModal
        isOpen={isPublishModalVisible}
        skill={skill}
        onClose={() => setIsPublishModalVisible(false)}
        onSuccess={() => {
          reloadSkill?.()
        }}
      />

      {/* Unpublish Confirmation Modal */}
      <ConfirmationModal
        visible={activeModal === 'unpublish'}
        onCancel={() => setActiveModal(null)}
        onConfirm={handleUnpublish}
        header="Remove from Marketplace?"
        message="This will remove your skill from the marketplace. It will still be available in your personal skills."
        confirmText="Unpublish"
        cancelText="Cancel"
        confirmButtonType={ButtonType.DELETE}
      />

      {/* Attach to Assistants Modal */}
      <AttachToAssistantsModal
        isOpen={isAttachModalVisible}
        skill={skill}
        onClose={() => setIsAttachModalVisible(false)}
        onSuccess={() => {
          reloadSkill?.()
        }}
      />
    </>
  )
}

export default SkillDetailsActions
