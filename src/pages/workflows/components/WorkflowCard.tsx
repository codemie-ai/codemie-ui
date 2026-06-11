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

import { classNames } from 'primereact/utils'
import { useRef, useMemo, useState } from 'react'

import ChatSvg from '@/assets/icons/chat-new-filled.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'
import RunIcon from '@/assets/icons/run.svg?react'
import CardGradientSvg from '@/assets/images/card-gradient.svg?raw' // eslint-disable-line
import WhiteCardGradientSvg from '@/assets/images/white-card-gradient.svg?raw' // eslint-disable-line
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton'
import RemoveFavoriteConfirmPopup from '@/components/FavoriteButton/RemoveFavoriteConfirmPopup'
import Tooltip from '@/components/Tooltip'
import { AvatarType } from '@/constants/avatar'
import { CHATS, VIEW_WORKFLOW } from '@/constants/routes'
import { useFavoritesEnabled } from '@/hooks/useFeatureFlags'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { useTheme } from '@/hooks/useTheme'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { favoritesStore } from '@/store/favorites'
import { workflowsStore } from '@/store/workflows'
import { cn } from '@/utils/utils'

import WorkflowActions from './WorkflowActions'
import WorkflowMarketplace from './WorkflowMarketplace'
import WorkflowShared from './WorkflowShared'
import { WorkflowTemplate } from './WorkflowTemplates'
import WorkflowStartExecutionPopup from '../details/popups/WorkflowStartExecutionPopup'

export interface Workflow {
  id: string
  slug: string
  name: string
  description?: string
  icon_url?: string
  is_favorited?: boolean
  created_by?: {
    name?: string
    username?: string
    user_id?: string
    id?: string
  }
  shared?: boolean
  is_global?: boolean
  categories?: string[]
  unique_users_count?: number
  [key: string]: any
}

interface WorkflowCardProps {
  workflow: Workflow
  isTemplate?: boolean
  onCreateWorkflowChat?: (workflow: Workflow) => void
  onStartChat?: (workflow: Workflow) => void
  onViewWorkflowTemplate?: (workflow: WorkflowTemplate) => void
  onCreateFromWorkflowTemplate?: (workflow: WorkflowTemplate) => void
  onViewWorkflow?: (workflow: Workflow) => void
  navigationSlot?: React.ReactNode
  reloadWorkflows?: () => void
}

const SYSTEM_CREATED_BY = 'System'

const createdBy = (createdBy?: {
  name?: string
  username?: string
  user_id?: string
  id?: string
}) => {
  if (!createdBy) return SYSTEM_CREATED_BY
  return (
    createdBy.name || createdBy.username || createdBy.user_id || createdBy.id || SYSTEM_CREATED_BY
  )
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  isTemplate = false,
  onCreateWorkflowChat,
  onStartChat,
  onViewWorkflowTemplate,
  onCreateFromWorkflowTemplate,
  onViewWorkflow,
  navigationSlot,
  reloadWorkflows,
}) => {
  // Hooks must be called before any early returns
  const router = useVueRouter()
  const [isFavoritesEnabled] = useFavoritesEnabled()
  const { isDark } = useTheme()
  const [showRemoveFavorite, setShowRemoveFavorite] = useState(false)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const authorRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)

  const isNameTruncated = useIsTruncated(nameRef)
  const isAuthorTruncated = useIsTruncated(authorRef)
  const isDescriptionTruncated = useIsTruncated(descriptionRef)

  const tooltipClass = useMemo(() => {
    return workflow ? 'tooltip-target-' + workflow.id : ''
  }, [workflow])

  if (!workflow) {
    console.error('WorkflowCard: workflow is null or undefined')
    return null
  }

  const handleCardClick = () => {
    if (isTemplate) {
      onViewWorkflowTemplate?.(workflow)
    } else if (onViewWorkflow) {
      onViewWorkflow(workflow)
    } else {
      router.push({ name: VIEW_WORKFLOW, params: { workflowId: String(workflow.id) } })
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isTemplate) {
      onCreateFromWorkflowTemplate?.(workflow)
    } else if (onCreateWorkflowChat) {
      onCreateWorkflowChat(workflow)
    } else {
      setShowExecutionPopup(true)
    }
  }

  const handleChatClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onStartChat) {
      onStartChat(workflow)
    } else {
      const chat = await chatsStore.createChat(String(workflow.id), workflow.name, true)
      if (chat?.id) {
        router.push({ name: CHATS, params: { id: chat.id } })
        workflowsStore.updateRecentWorkflows(workflow as any)
      }
    }
  }

  const gradientSvg = isDark ? CardGradientSvg : WhiteCardGradientSvg

  return (
    <>
      <Tooltip target={'.' + tooltipClass} position="left" showDelay={100} />
      <div
        className={cn(
          'min-w-80 h-card rounded-xl flex flex-col w-full',
          'bg-surface-specific-card border-border-structural border-1',
          'cursor-pointer transition group relative'
        )}
        onClick={handleCardClick}
      >
        <div className="relative">
          <div
            className="rounded-xl absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition duration-300 overflow-hidden"
            dangerouslySetInnerHTML={{ __html: gradientSvg }}
          />
          {isFavoritesEnabled && (
            <div
              className="absolute top-2 right-2 z-10"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <FavoriteButton
                isFavorited={workflow.is_favorited ?? false}
                onToggle={() =>
                  workflow.is_favorited
                    ? setShowRemoveFavorite(true)
                    : favoritesStore.addFavorite('workflow', workflow.id)
                }
              />
            </div>
          )}
        </div>

        <div className="body h-card flex flex-col justify-between p-4">
          <div className="flex flex-row gap-4">
            <Avatar iconUrl={workflow.icon_url} name={workflow.name} type={AvatarType.MEDIUM} />

            <div className="flex flex-col z-[1] overflow-hidden">
              <div
                ref={nameRef}
                data-pr-tooltip={isNameTruncated ? workflow.name : ''}
                data-pr-position="bottom"
                className={classNames('whitespace-nowrap truncate font-semibold', tooltipClass)}
              >
                {workflow.name}
              </div>

              <div
                ref={authorRef}
                data-pr-tooltip={isAuthorTruncated ? createdBy(workflow.created_by) : ''}
                data-pr-position="bottom"
                className={classNames(
                  'text-xs text-text-quaternary whitespace-nowrap truncate',
                  tooltipClass
                )}
              >
                by {createdBy(workflow.created_by)}
              </div>

              <p
                ref={descriptionRef}
                data-pr-tooltip={isDescriptionTruncated ? workflow.description : ''}
                data-pr-position="left"
                className={classNames(
                  'text-xs mb-0 mt-4 line-clamp-2 text-text-tertiary h-8 overflow-hidden text-ellipsis',
                  tooltipClass
                )}
              >
                {workflow.description}
              </p>
            </div>
          </div>

          <div className="flex items-center mt-2 gap-2">
            {isTemplate ? (
              <Button
                type="action"
                size="medium"
                onClick={handleActionClick}
                className={tooltipClass}
                data-pr-tooltip="Create Workflow"
                aria-label="Create Workflow"
              >
                <PlusIcon className="text-text-accent" />
              </Button>
            ) : (
              <>
                <Button
                  type="action"
                  size="medium"
                  onClick={handleChatClick}
                  className={tooltipClass}
                  data-pr-tooltip="Start Chat"
                  aria-label="Start Chat"
                >
                  <ChatSvg className="text-text-accent" />
                </Button>
                <Button
                  type="action"
                  size="medium"
                  onClick={handleActionClick}
                  className={tooltipClass}
                  data-pr-tooltip="Start Execution"
                  aria-label="Start Execution"
                >
                  <RunIcon className="text-text-accent" />
                </Button>
              </>
            )}

            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {navigationSlot ?? (
                <WorkflowActions
                  workflow={workflow}
                  onView={() =>
                    router.push({
                      name: VIEW_WORKFLOW,
                      params: { workflowId: String(workflow.id) },
                    })
                  }
                  reloadWorkflows={reloadWorkflows}
                />
              )}
            </div>

            <div className="flex flex-row ml-auto items-center text-xs gap-3">
              {workflow.is_global ? (
                <WorkflowMarketplace uniqueUsersCount={workflow.unique_users_count} />
              ) : (
                <WorkflowShared workflow={workflow} />
              )}
            </div>
          </div>
        </div>
      </div>
      <RemoveFavoriteConfirmPopup
        visible={showRemoveFavorite}
        entityName={workflow.name}
        onCancel={() => setShowRemoveFavorite(false)}
        onConfirm={async () => {
          await favoritesStore.removeFavorite('workflow', workflow.id)
          setShowRemoveFavorite(false)
          reloadWorkflows?.()
        }}
      />
      {showExecutionPopup && (
        <WorkflowStartExecutionPopup
          isVisible={showExecutionPopup}
          workflowId={String(workflow.id)}
          onHide={() => setShowExecutionPopup(false)}
        />
      )}
    </>
  )
}

export default WorkflowCard
