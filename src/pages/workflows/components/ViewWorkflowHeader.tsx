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

import React, { useRef, useState } from 'react'

import ChatSvg from '@/assets/icons/chat.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Tooltip from '@/components/Tooltip'
import { ButtonType } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { workflowsStore } from '@/store/workflows'
import { canEdit } from '@/utils/entity'

import WorkflowShared from './WorkflowShared'
import WorkflowStartExecutionPopup from '../details/popups/WorkflowStartExecutionPopup'

interface Workflow {
  id: number | string
  name: string
  icon_url?: string
  created_by?: {
    name?: string
    username?: string
    user_id?: string
    id?: string
  }
  shared?: boolean
  [key: string]: any
}

interface ViewWorkflowHeaderProps {
  workflow: Workflow
  isTemplate?: boolean
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

const ViewWorkflowHeader: React.FC<ViewWorkflowHeaderProps> = ({
  workflow,
  isTemplate = false,
}) => {
  const router = useVueRouter()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const isTitleTruncated = useIsTruncated(titleRef)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)

  const tooltipClass = 'tooltip-target-header-' + workflow.id

  const onEdit = () => {
    router.push({ name: 'edit-workflow', params: { id: String(workflow.id) } })
  }

  const onStartChat = async () => {
    const chat = await chatsStore.createChat(String(workflow.id), workflow.name, true)
    if (chat?.id) {
      router.push({ name: 'chats', params: { id: chat.id } })
      workflowsStore.updateRecentWorkflows(workflow as any)
    }
  }

  return (
    <>
      <Tooltip target={'.' + tooltipClass} position="bottom" showDelay={100} />
      <div className="flex flex-row max-view-details-bp:flex-col max-view-details-bp:items-center min-w-96 gap-3 overflow-x-hidden justify-between">
        <div className="flex flex-row gap-4 min-w-0 max-w-full items-center">
          <Avatar
            iconUrl={workflow.icon_url}
            name={workflow.name}
            type={AvatarType.MEDIUM}
            className="border-border-structural"
          />

          <div className="flex flex-col gap-1 h-full min-w-0 justify-center">
            <h4
              ref={titleRef}
              data-pr-tooltip={isTitleTruncated ? workflow.name : ''}
              data-pr-position="bottom"
              className={`text-2xl font-semibold leading-9 mt-0.5 truncate ${tooltipClass}`}
            >
              {workflow.name}
            </h4>

            <div className="flex items-center gap-2">
              <span className="text-text-quaternary text-xs">
                by {createdBy(workflow.created_by)} |
              </span>
              <WorkflowShared workflow={workflow} />
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4 mt-1 items-center">
          {canEdit(workflow) && (
            <Button variant={ButtonType.SECONDARY} onClick={onEdit}>
              <EditSvg />
              Edit
            </Button>
          )}
          {!isTemplate && (
            <>
              <Button variant={ButtonType.SECONDARY} onClick={onStartChat}>
                <ChatSvg className="w-4 h-4" />
                Start Chat
              </Button>
              <Button variant={ButtonType.PRIMARY} onClick={() => setShowExecutionPopup(true)}>
                <RunSvg />
                Run workflow
              </Button>
            </>
          )}
        </div>
      </div>

      <WorkflowStartExecutionPopup
        isVisible={showExecutionPopup}
        onHide={() => setShowExecutionPopup(false)}
        workflowId={String(workflow.id)}
      />
    </>
  )
}

export default ViewWorkflowHeader
