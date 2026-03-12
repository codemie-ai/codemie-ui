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
import { useNavigate } from 'react-router'

import ArchiveSvg from '@/assets/icons/archive.svg?react'
import CloneSvg from '@/assets/icons/copy.svg?react'
import ContentEditSvg from '@/assets/icons/edit.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import NavigationMore from '@/components/NavigationMore'
import { katasStore } from '@/store/katas'
import { AIKataListItem, KataStatus } from '@/types/entity/kata'
import toaster from '@/utils/toaster'

import ArchiveKataConfirmation from './ArchiveKataConfirmation'
import UnpublishKataConfirmation from './UnpublishKataConfirmation'

interface KataActionsProps {
  kata: AIKataListItem
  onView?: (kata: AIKataListItem) => void
  isAdmin?: boolean
}

const KataActions: React.FC<KataActionsProps> = ({ kata, onView, isAdmin = false }) => {
  const navigate = useNavigate()
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showUnpublishConfirmation, setShowUnpublishConfirmation] = useState(false)
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false)

  const handleEdit = () => {
    navigate(`/katas/${kata.id}/edit`)
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      await katasStore.publishKata(kata.id)
      toaster.info('Kata published successfully!')
    } catch (error) {
      console.error('Error publishing kata:', error)
      toaster.error('Failed to publish kata. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublishClick = () => {
    setShowUnpublishConfirmation(true)
  }

  const confirmUnpublish = async () => {
    setIsUnpublishing(true)
    try {
      await katasStore.unpublishKata(kata.id)
      toaster.info('Kata unpublished successfully!')
      setShowUnpublishConfirmation(false)
    } catch (error) {
      console.error('Error unpublishing kata:', error)
      toaster.error('Failed to unpublish kata. Please try again.')
    } finally {
      setIsUnpublishing(false)
    }
  }

  const cancelUnpublish = () => {
    setShowUnpublishConfirmation(false)
  }

  const handleArchiveClick = () => {
    setShowArchiveConfirmation(true)
  }

  const confirmArchive = async () => {
    setIsArchiving(true)
    try {
      await katasStore.archiveKata(kata.id)
      toaster.info('Kata archived successfully!')
      setShowArchiveConfirmation(false)
    } catch (error) {
      console.error('Error archiving kata:', error)
      toaster.error('Failed to archive kata. Please try again.')
    } finally {
      setIsArchiving(false)
    }
  }

  const cancelArchive = () => {
    setShowArchiveConfirmation(false)
  }

  const handleClone = async () => {
    try {
      const kataDetails = await katasStore.fetchKataById(kata.id)
      katasStore.setCloneData(kataDetails)
      navigate('/katas/new')
    } catch (error) {
      console.error('Error cloning kata:', error)
      toaster.error('Failed to clone kata. Please try again.')
    }
  }

  const isDraft = kata.status === KataStatus.DRAFT
  const isPublished = kata.status === KataStatus.PUBLISHED
  const isArchived = kata.status === KataStatus.ARCHIVED

  const kataActions = [
    {
      title: 'View Details',
      icon: <InfoSvg />,
      onClick: () => onView?.(kata),
    },
    {
      title: 'Edit',
      icon: <ContentEditSvg />,
      onClick: handleEdit,
      isVisible: isAdmin && !isArchived,
    },
    {
      title: isPublishing ? 'Publishing...' : 'Publish',
      icon: <PublishSvg />,
      onClick: handlePublish,
      isVisible: isAdmin && isDraft,
      disabled: isPublishing,
    },
    {
      title: isUnpublishing ? 'Moving to Draft...' : 'Move to Draft',
      icon: <UnpublishSvg />,
      onClick: handleUnpublishClick,
      isVisible: isAdmin && isPublished,
      disabled: isUnpublishing,
    },
    {
      title: 'Clone',
      icon: <CloneSvg />,
      onClick: handleClone,
      isVisible: isAdmin,
    },
    {
      title: 'Archive',
      icon: <ArchiveSvg />,
      onClick: handleArchiveClick,
      isVisible: isAdmin && !isArchived,
    },
  ].filter((action) => action.isVisible !== false)

  return (
    <>
      <NavigationMore hideOnClickInside items={kataActions} />
      <UnpublishKataConfirmation
        visible={showUnpublishConfirmation}
        onCancel={cancelUnpublish}
        onConfirm={confirmUnpublish}
        isUnpublishing={isUnpublishing}
        kataTitle={kata.title}
      />
      <ArchiveKataConfirmation
        visible={showArchiveConfirmation}
        onCancel={cancelArchive}
        onConfirm={confirmArchive}
        isArchiving={isArchiving}
        kataTitle={kata.title}
      />
    </>
  )
}

export default KataActions
