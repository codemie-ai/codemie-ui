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

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import ArchiveSvg from '@/assets/icons/archive.svg?react'
import CheckSvg from '@/assets/icons/check.svg?react'
import CloneSvg from '@/assets/icons/copy.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import ExternalLinkSvg from '@/assets/icons/external.svg?react'
import LockSvg from '@/assets/icons/node-control-lock.svg?react'
import MinimizeSvg from '@/assets/icons/node-control-minus.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import aiAvatarImage from '@/assets/images/ai-avatar.png'
import Button from '@/components/Button'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import PageLayout from '@/components/Layouts/Layout'
import Markdown from '@/components/markdown/Markdown'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { MetricEvent } from '@/constants/metrics'
import { floatingKataStore } from '@/store/floatingKata'
import { katasStore } from '@/store/katas'
import { metricsStore } from '@/store/metrics'
import { userStore } from '@/store/user'
import { KataLevel, KataProgressStatus, KataStatus } from '@/types/entity/kata'
import toaster from '@/utils/toaster'

import ArchiveKataConfirmation from './ArchiveKataConfirmation'
import CompleteKataConfirmation from './CompleteKataConfirmation'
import KataMenu, { KataActionItem } from './KataMenu'
import KatasNavigation from './KatasNavigation'
import StepByStepNavigator from './StepByStepNavigator'
import UnpublishKataConfirmation from './UnpublishKataConfirmation'

const KataDetailView = () => {
  const { kataId } = useParams<{ kataId: string }>()
  const navigate = useNavigate()
  const { currentKata, isLoading } = useSnapshot(katasStore)
  const { user } = useSnapshot(userStore)
  const floatingKata = useSnapshot(floatingKataStore)
  const isAdmin = user?.isAdmin ?? false
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false)
  const [showUnpublishConfirmation, setShowUnpublishConfirmation] = useState(false)
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false)
  const [isStepByStepMode, setIsStepByStepMode] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(floatingKata.currentStepIndex || 0)

  useEffect(() => {
    // Prevent fetching for reserved route names
    const reservedRoutes = ['new', 'in-progress', 'completed', 'leaderboard']

    if (kataId && !reservedRoutes.includes(kataId)) {
      katasStore.fetchKataById(kataId)
    }

    return () => {
      katasStore.clearCurrentKata()
    }
  }, [kataId])

  // Reset currentStepIndex when switching to a different kata
  useEffect(() => {
    if (currentKata) {
      if (floatingKata.kataId === currentKata.id) {
        setCurrentStepIndex(floatingKata.currentStepIndex)
      } else {
        setCurrentStepIndex(0)
      }
    }
  }, [currentKata?.id])

  // Track metric when kata is loaded and user hasn't started it yet
  useEffect(() => {
    if (!currentKata || isLoading) return

    const isNotStarted = currentKata.user_progress.status === KataProgressStatus.NOT_STARTED
    const isPublished = currentKata.status === KataStatus.PUBLISHED

    // Track when user views a kata detail page with "Start Kata" button visible
    if (isNotStarted && isPublished) {
      metricsStore.trackMetric(MetricEvent.KATA_DETAIL_VIEW_NOT_STARTED, {
        kata_id: currentKata.id,
        kata_title: currentKata.title,
        kata_level: currentKata.level,
        has_start_button: true,
      })
    }
  }, [currentKata, isLoading])

  const formatLevel = (level: KataLevel): string => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  const getLevelColor = (level: KataLevel): string => {
    switch (level) {
      case KataLevel.BEGINNER:
        return 'text-success-primary'
      case KataLevel.INTERMEDIATE:
        return 'text-in-progress-primary'
      case KataLevel.ADVANCED:
        return 'text-advanced-primary'
      default:
        return 'text-text-quaternary'
    }
  }

  const handleBack = () => {
    navigate('/katas')
  }

  const handleEdit = () => {
    if (!currentKata) return
    navigate(`/katas/${currentKata.id}/edit`)
  }

  const handlePublish = async () => {
    if (!currentKata) return

    try {
      setIsPublishing(true)
      await katasStore.publishKata(currentKata.id)
      toaster.info('Kata published successfully!')
      // Refetch kata details to get updated published status
      await katasStore.fetchKataById(currentKata.id)
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
    if (!currentKata) return

    try {
      setIsUnpublishing(true)
      await katasStore.unpublishKata(currentKata.id)
      toaster.info('Kata unpublished successfully!')
      setShowUnpublishConfirmation(false)
      // Refetch kata details to get updated status
      await katasStore.fetchKataById(currentKata.id)
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
    if (!currentKata) return

    try {
      setIsArchiving(true)
      await katasStore.archiveKata(currentKata.id)
      toaster.info('Kata archived successfully!')
      setShowArchiveConfirmation(false)
      // Refetch kata details to get updated status
      await katasStore.fetchKataById(currentKata.id)
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

  const handleClone = () => {
    if (!currentKata) return

    katasStore.setCloneData(currentKata)
    navigate('/katas/new')
  }

  const handleStartKata = async () => {
    if (!currentKata) return

    try {
      setIsStarting(true)
      await katasStore.startKata(currentKata.id)
      // Refetch kata details to get the revealed content
      await katasStore.fetchKataById(currentKata.id)
    } catch (error) {
      console.error('Error starting kata:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleCompleteKata = () => {
    setShowCompleteConfirmation(true)
  }

  const confirmCompleteKata = async () => {
    if (!currentKata) return

    try {
      setIsCompleting(true)
      await katasStore.completeKata(currentKata.id)
      setShowCompleteConfirmation(false)
    } catch (error) {
      console.error('Error completing kata:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const cancelCompleteKata = () => {
    setShowCompleteConfirmation(false)
  }

  const handleReactionToggle = async (newReaction: 'like' | 'dislike') => {
    if (!currentKata) return

    try {
      const currentReaction = currentKata.user_progress.user_reaction
      if (currentReaction === newReaction) {
        await katasStore.removeReaction(currentKata.id)
      } else {
        await katasStore.reactToKata(currentKata.id, newReaction)
      }
    } catch (error) {
      console.error(`Error toggling ${newReaction}:`, error)
    }
  }

  const handleMinimizeSteps = () => {
    if (!currentKata) return

    floatingKataStore.minimizeKataSteps(
      currentKata.id,
      currentKata.title,
      formattedSteps,
      currentStepIndex // Use current step index, not 0!
    )

    // Exit step-by-step mode in the page
    setIsStepByStepMode(false)
  }

  const handleRestoreSteps = () => {
    // Get the current step from floating window before restoring
    const restoredStepIndex = floatingKataStore.currentStepIndex
    setCurrentStepIndex(restoredStepIndex)

    floatingKataStore.restoreToPage()
    // Enter step-by-step mode when restoring
    setIsStepByStepMode(true)
  }

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index)
  }

  const formattedSteps = currentKata?.steps?.replace(/\\n/g, '\n') ?? ''

  const renderStepsContent = () => {
    if (floatingKata.isKataMinimized(currentKata?.id ?? '')) {
      return (
        <div className="bg-not-started-primary/10 border border-not-started-primary/30 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-text-quaternary">
            Step-by-step instructions are currently in a floating window.
          </p>
          <Button variant="secondary" onClick={handleRestoreSteps} className="ml-4">
            Restore Here
          </Button>
        </div>
      )
    }

    if (isStepByStepMode) {
      return (
        <StepByStepNavigator
          markdownContent={formattedSteps}
          onExitStepMode={() => setIsStepByStepMode(false)}
          isInFloatingWindow={false}
          initialStepIndex={currentStepIndex}
          onStepChange={handleStepChange}
        />
      )
    }

    return <Markdown content={formattedSteps} />
  }

  const isEnrolled = currentKata?.user_progress.status !== KataProgressStatus.NOT_STARTED
  const isCompleted = currentKata?.user_progress.status === KataProgressStatus.COMPLETED
  const isDraft = currentKata?.status === KataStatus.DRAFT
  const isArchived = currentKata?.status === KataStatus.ARCHIVED
  const isPublished = currentKata?.status === KataStatus.PUBLISHED

  // Admin menu actions
  const kataMenuActions: KataActionItem[] = [
    {
      id: 'publish',
      label: isPublishing ? 'Publishing...' : 'Publish',
      icon: <PublishSvg />,
      isVisible: isDraft && !isArchived,
      disabled: isPublishing,
      onClick: () => {
        handlePublish()
      },
    },
    {
      id: 'unpublish',
      label: isUnpublishing ? 'Moving to Draft...' : 'Move to Draft',
      icon: <UnpublishSvg />,
      isVisible: isPublished,
      disabled: isUnpublishing,
      onClick: handleUnpublishClick,
    },
    {
      id: 'clone',
      label: 'Clone',
      icon: <CloneSvg />,
      isVisible: !isArchived,
      onClick: handleClone,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <ArchiveSvg />,
      isVisible: !isArchived,
      onClick: handleArchiveClick,
    },
  ]

  const getStatusBadgeClasses = (status: KataProgressStatus): string => {
    switch (status) {
      case KataProgressStatus.NOT_STARTED:
        return 'bg-aborted-tertiary text-aborted-primary border-aborted-secondary'
      case KataProgressStatus.IN_PROGRESS:
        return 'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary'
      case KataProgressStatus.COMPLETED:
        return 'bg-success-secondary text-success-primary border-success-primary'
      default:
        return 'bg-aborted-tertiary text-aborted-primary border-aborted-secondary'
    }
  }

  const getStatusLabel = (status: KataProgressStatus): string => {
    switch (status) {
      case KataProgressStatus.NOT_STARTED:
        return 'Not Started'
      case KataProgressStatus.IN_PROGRESS:
        return 'In Progress'
      case KataProgressStatus.COMPLETED:
        return 'Completed'
      default:
        return 'Not Started'
    }
  }

  const getPublicationStatusBadgeClasses = (status: KataStatus): string => {
    switch (status) {
      case KataStatus.DRAFT:
        return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
      case KataStatus.PUBLISHED:
        return 'bg-success-secondary text-success-primary border-success-primary'
      case KataStatus.ARCHIVED:
        return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
      default:
        return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
    }
  }

  const getPublicationStatusLabel = (status: KataStatus): string => {
    switch (status) {
      case KataStatus.DRAFT:
        return 'Draft'
      case KataStatus.PUBLISHED:
        return 'Published'
      case KataStatus.ARCHIVED:
        return 'Archived'
      default:
        return 'Draft'
    }
  }

  const renderLockedOverlay = (sectionName: string) => (
    <div className="absolute inset-0 backdrop-blur-md bg-surface-base-secondary/30 flex items-center justify-center rounded-lg z-10">
      <div className="flex flex-col items-center gap-4 px-6 py-8 bg-surface-base-secondary/80 rounded-xl border border-not-started-primary/30 backdrop-blur-sm max-w-md">
        <div className="w-16 h-16 rounded-full bg-not-started-primary/20 flex items-center justify-center">
          <LockSvg className="w-8 h-8 text-text-quaternary" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-text-primary mb-2">{sectionName} Locked</h3>
          <p className="text-sm text-text-quaternary mb-4">
            Enroll in this kata to unlock the full content and begin your learning journey
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleStartKata}
          className="w-full"
          disabled={isStarting}
        >
          <PlaySvg />
          {isStarting ? 'Starting...' : 'Start Kata to Unlock'}
        </Button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex h-full">
        <Sidebar
          title="AI Katas"
          description="Practice and master AI skills through hands-on challenges and tutorials"
        >
          <KatasNavigation />
        </Sidebar>
        <PageLayout title="Kata Details" onBack={handleBack}>
          <div className="flex justify-center m-40">
            <Spinner />
          </div>
        </PageLayout>
      </div>
    )
  }

  if (!currentKata) {
    return (
      <div className="flex h-full">
        <Sidebar
          title="AI Katas"
          description="Practice and master AI skills through hands-on challenges and tutorials"
        >
          <KatasNavigation />
        </Sidebar>
        <PageLayout title="Kata Details" onBack={handleBack}>
          <div className="flex flex-col items-center justify-center m-40 gap-4">
            <p className="text-text-tertiary">Kata not found</p>
            <Button variant="secondary" onClick={handleBack}>
              Back to Katas
            </Button>
          </div>
        </PageLayout>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar
        title="AI Katas"
        description="Practice and master AI skills through hands-on challenges and tutorials"
      >
        <KatasNavigation />
      </Sidebar>

      <PageLayout title="Kata Details" onBack={handleBack}>
        <div className="flex flex-col max-w-5xl mx-auto py-8">
          {/* Header Section - Profile + Actions */}
          <div className="flex justify-between flex-row gap-3 max-view-details-bp:flex-col">
            {/* Profile Section */}
            <div className="flex gap-4 items-start min-w-0 flex-1">
              <img
                src={currentKata.image_url || aiAvatarImage}
                alt={currentKata.title}
                className="w-16 h-16 rounded-xl object-cover border-2 border-border-specific-assistant-avatar bg-white/90 shrink-0"
              />
              <div className="flex flex-col gap-1 min-w-0 flex-1 mt-1">
                <h4 className="text-2xl font-semibold leading-8 overflow-hidden text-ellipsis line-clamp-2">
                  {currentKata.title}
                </h4>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex gap-3 shrink-0 items-center">
              {/* Edit button - for admins only on non-archived katas */}
              {isAdmin && !isArchived && (
                <Button variant="secondary" onClick={handleEdit}>
                  <EditSvg />
                  Edit
                </Button>
              )}

              {/* Clone button - for admins only on archived katas */}
              {isAdmin && isArchived && (
                <Button variant="secondary" onClick={handleClone}>
                  <CloneSvg />
                  Clone
                </Button>
              )}

              {/* Start button - only for published katas */}
              {!isEnrolled && !isCompleted && isPublished && (
                <Button variant="primary" onClick={handleStartKata} disabled={isStarting}>
                  <PlaySvg />
                  {isStarting ? 'Starting...' : 'Start Kata'}
                </Button>
              )}

              {/* Complete button - only for published katas */}
              {isEnrolled && !isCompleted && isPublished && (
                <Button
                  variant="secondary"
                  onClick={handleCompleteKata}
                  disabled={isCompleting}
                  className="border-success-primary text-success-primary hover:bg-success-primary hover:text-white hover:border-success-primary"
                >
                  <CheckSvg />
                  {isCompleting ? 'Completing...' : 'Complete Kata'}
                </Button>
              )}

              {/* Reaction buttons - only for published katas */}
              {isPublished && (
                <div className="h-7 flex items-center bg-surface-base-secondary relative border border-border-quaternary rounded-lg text-text-accent">
                  <button
                    className="px-3 transition opacity-80 hover:opacity-100"
                    onClick={() => handleReactionToggle('like')}
                  >
                    {currentKata.user_progress.user_reaction === 'like' ? (
                      <ThumbUpFilledSvg className="w-[18px] h-[18px]" />
                    ) : (
                      <ThumbUpSvg className="w-[18px] h-[18px]" />
                    )}
                  </button>
                  <div className="h-3 w-px bg-text-quaternary" />
                  <button
                    className="px-3 transition opacity-80 hover:opacity-100"
                    onClick={() => handleReactionToggle('dislike')}
                  >
                    {currentKata.user_progress.user_reaction === 'dislike' ? (
                      <ThumbUpFilledSvg className="w-[18px] h-[18px] transform rotate-180" />
                    ) : (
                      <ThumbUpSvg className="w-[18px] h-[18px] transform rotate-180" />
                    )}
                  </button>
                </div>
              )}

              {/* 3-dots menu for admin actions */}
              {isAdmin && <KataMenu actions={kataMenuActions} />}
            </div>
          </div>

          {/* Main Content + Sidebar */}
          <div className="mt-8 flex flex-row gap-9 z-10 max-view-details-bp:flex-col">
            {/* Main Content */}
            <div className="flex flex-col gap-6 grow min-w-0 max-view-details-bp:order-2">
              {/* About */}
              <div>
                <h5 className="font-bold text-sm">About Kata:</h5>
                <p className="mt-2.5 text-sm text-text-quaternary break-words whitespace-pre-wrap">
                  {currentKata.description}
                </p>
              </div>

              {/* Steps */}
              <div className="relative flex flex-col bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2 bg-white/5">
                  <p className="text-xs">Steps</p>
                  {(isEnrolled || isAdmin || !isPublished) &&
                    !floatingKata.isKataMinimized(currentKata?.id ?? '') && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setIsStepByStepMode(!isStepByStepMode)}
                          className="!py-1 !px-2 text-xs h-7"
                        >
                          {isStepByStepMode ? 'View All Steps' : 'Step-by-Step'}
                        </Button>
                        {isStepByStepMode && (
                          <Button
                            variant="secondary"
                            onClick={handleMinimizeSteps}
                            className="!py-1 !px-2 text-xs h-7"
                          >
                            <MinimizeSvg className="w-4 h-4" />
                            Minimize Window
                          </Button>
                        )}
                      </div>
                    )}
                </div>
                <div className="p-4">{renderStepsContent()}</div>
                {!isEnrolled && !isAdmin && isPublished && renderLockedOverlay('Steps')}
              </div>

              {/* Additional Resources */}
              {currentKata.links && currentKata.links.length > 0 && (
                <div className="relative">
                  <h5 className="font-bold text-sm mb-3">Additional Resources:</h5>
                  <div className="flex flex-col gap-2">
                    {currentKata.links.map((link) => (
                      <a
                        key={`${link.url}-${link.title}`}
                        href={isEnrolled || isAdmin || !isPublished ? link.url : '#'}
                        target={isEnrolled || isAdmin || !isPublished ? '_blank' : undefined}
                        rel={
                          isEnrolled || isAdmin || !isPublished ? 'noopener noreferrer' : undefined
                        }
                        onClick={
                          !isEnrolled && !isAdmin && isPublished
                            ? (e) => e.preventDefault()
                            : undefined
                        }
                        className="flex items-center gap-3 p-3 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg hover:bg-surface-elevated transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {link.title}
                          </div>
                          <div className="text-xs text-text-quaternary capitalize">{link.type}</div>
                        </div>
                        <ExternalLinkSvg className="w-4 h-4 text-text-quaternary shrink-0" />
                      </a>
                    ))}
                  </div>
                  {!isEnrolled && !isAdmin && isPublished && renderLockedOverlay('Resources')}
                </div>
              )}

              {/* References */}
              {currentKata.references && currentKata.references.length > 0 && (
                <div className="relative flex flex-col bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5">
                    <p className="text-xs">References</p>
                  </div>
                  <div className="p-4">
                    <ul className="list-none space-y-2">
                      {currentKata.references.map((reference) => (
                        <li key={reference} className="text-sm text-text-quaternary break-all">
                          {reference}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {!isEnrolled && !isAdmin && isPublished && renderLockedOverlay('References')}
                </div>
              )}
            </div>

            {/* Sidebar Details */}
            <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
              {currentKata.user_progress && (
                <DetailsProperty label="My Progress">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border ${getStatusBadgeClasses(
                      currentKata.user_progress.status
                    )}`}
                  >
                    {getStatusLabel(currentKata.user_progress.status)}
                  </span>
                </DetailsProperty>
              )}
              <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
                <DetailsProperty label="Level">
                  <span className={getLevelColor(currentKata.level)}>
                    {formatLevel(currentKata.level)}
                  </span>
                </DetailsProperty>
                <DetailsProperty
                  label="Duration"
                  value={`${currentKata.duration_minutes} minutes`}
                />
                {currentKata.enrollment_count > 0 && (
                  <DetailsProperty
                    label="Enrolled"
                    value={`${currentKata.enrollment_count} users`}
                  />
                )}
                {isPublished && (
                  <>
                    <DetailsProperty label="Likes" value={`${currentKata.unique_likes_count}`} />
                    <DetailsProperty
                      label="Dislikes"
                      value={`${currentKata.unique_dislikes_count}`}
                    />
                  </>
                )}
                {currentKata.status !== KataStatus.PUBLISHED && (
                  <DetailsProperty label="Publication Status">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-lg border ${getPublicationStatusBadgeClasses(
                        currentKata.status
                      )}`}
                    >
                      {getPublicationStatusLabel(currentKata.status)}
                    </span>
                  </DetailsProperty>
                )}
              </DetailsSidebarSection>

              {currentKata.tags && currentKata.tags.length > 0 && (
                <DetailsSidebarSection headline="TAGS">
                  <div className="flex flex-wrap gap-2">
                    {currentKata.tags.map((tag) => (
                      <div
                        key={tag}
                        className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5"
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </DetailsSidebarSection>
              )}

              {currentKata.roles && currentKata.roles.length > 0 && (
                <DetailsSidebarSection headline="TARGET AUDIENCE">
                  <div className="flex flex-wrap gap-2">
                    {currentKata.roles.map((role) => (
                      <div
                        key={role}
                        className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5"
                      >
                        {role}
                      </div>
                    ))}
                  </div>
                </DetailsSidebarSection>
              )}
            </DetailsSidebar>
          </div>
        </div>
      </PageLayout>

      <CompleteKataConfirmation
        visible={showCompleteConfirmation}
        onCancel={cancelCompleteKata}
        onConfirm={confirmCompleteKata}
        isCompleting={isCompleting}
      />

      <UnpublishKataConfirmation
        visible={showUnpublishConfirmation}
        onCancel={cancelUnpublish}
        onConfirm={confirmUnpublish}
        isUnpublishing={isUnpublishing}
        kataTitle={currentKata?.title}
      />

      <ArchiveKataConfirmation
        visible={showArchiveConfirmation}
        onCancel={cancelArchive}
        onConfirm={confirmArchive}
        isArchiving={isArchiving}
        kataTitle={currentKata?.title}
      />
    </div>
  )
}

export default KataDetailView
