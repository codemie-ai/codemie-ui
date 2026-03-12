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
import DeleteSvg from '@/assets/icons/delete.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { EDIT_SKILL, SKILLS_ALL } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { skillsStore } from '@/store/skills'
import { Skill, SkillVisibility } from '@/types/entity/skill'
import { canDelete as canDeleteEntity, canEdit as canEditEntity } from '@/utils/entity'
import toaster from '@/utils/toaster'
import { getRootPath, copyToClipboard } from '@/utils/utils'

import PublishToMarketplaceModal from './PublishToMarketplaceModal'

interface ActionItem {
  title: string
  icon: React.ReactNode
  isVisible?: boolean
  onClick: () => void
}

interface SkillActionsProps {
  skill: Skill
  page?: 'list' | 'details'
  onView?: () => void
  onExport?: () => void
  reloadSkills?: () => void
  loadSkill?: () => Promise<void>
}

const SkillActions: React.FC<SkillActionsProps> = ({
  skill,
  page = 'list',
  onView,
  onExport,
  reloadSkills,
  loadSkill,
}) => {
  const router = useVueRouter()
  const [activeModal, setActiveModal] = useState<'delete' | 'unpublish' | null>(null)
  const [isPublishModalVisible, setIsPublishModalVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit = canEditEntity(skill)
  const canDelete = canDeleteEntity(skill)

  const getSkillLink = () => {
    return `${getRootPath()}/#/skills/${skill.id}`
  }

  const handleEdit = () => {
    router.push({ name: EDIT_SKILL, params: { id: skill.id } })
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await skillsStore.deleteSkill(skill.id)
      reloadSkills?.()
      if (page === 'details') {
        router.push({ name: SKILLS_ALL })
      }
    } catch (err) {
      console.error('Error deleting skill:', err)
      toaster.error('Failed to delete skill')
    } finally {
      setDeleting(false)
      setActiveModal(null)
    }
  }

  const handlePublish = () => {
    setIsPublishModalVisible(true)
  }

  const handleUnpublish = async () => {
    try {
      await skillsStore.unpublishFromMarketplace(skill.id)
      reloadSkills?.()
      loadSkill?.()
    } catch (error) {
      console.error('Error unpublishing skill:', error)
    } finally {
      setActiveModal(null)
    }
  }

  const actions: ActionItem[] = [
    {
      title: 'View Details',
      icon: <InfoSvg />,
      isVisible: page !== 'details' && !!onView,
      onClick: () => onView?.(),
    },
    {
      title: 'Copy Link',
      icon: <CopyLinkSvg />,
      isVisible: true,
      onClick: () => copyToClipboard(getSkillLink(), 'Link to skill copied to clipboard'),
    },
    {
      title: 'Edit',
      icon: <EditSvg />,
      isVisible: canEdit,
      onClick: handleEdit,
    },
    {
      title: 'Export',
      icon: <DownloadSvg />,
      isVisible: !!onExport,
      onClick: () => onExport?.(),
    },
    {
      title: 'Delete',
      icon: <DeleteSvg />,
      isVisible: canDelete,
      onClick: () => setActiveModal('delete'),
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
  ]

  const visibleActions = actions.filter((action) => action.isVisible)

  if (visibleActions.length === 0) {
    return null
  }

  const assistantsCount = skill.assistants_count ?? 0

  return (
    <>
      <NavigationMore hideOnClickInside items={visibleActions} />

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

      <PublishToMarketplaceModal
        isOpen={isPublishModalVisible}
        skill={skill}
        onClose={() => setIsPublishModalVisible(false)}
        onSuccess={() => {
          reloadSkills?.()
          loadSkill?.()
        }}
      />

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
    </>
  )
}

export default SkillActions
