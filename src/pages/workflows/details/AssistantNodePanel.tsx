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

import CrossIconSvg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import AssistantDetailsEmbedded from '@/pages/assistants/components/AssistantDetails/AssistantDetailsEmbedded'
import { cn } from '@/utils/utils'

import { useAssistantForNode } from '../hooks/useAssistantForNode'

interface AssistantNodePanelProps {
  assistantId: string
  onClose: () => void
}

/**
 * Right-hand panel opened by clicking an assistant node on the executions graph. It hosts the
 * single-column embedded assistant view (including the working "Your Integration Settings"
 * section) so the person running the workflow can pick their own integrations. Private
 * assistants the current user cannot read (403) fall back to a soft message instead of a
 * broken/empty panel.
 */
const AssistantNodePanel = ({ assistantId, onClose }: AssistantNodePanelProps) => {
  const {
    assistant,
    isLoading,
    isForbidden,
    notFound,
    loadFailed,
    loadAssistant,
    onNewIntegration,
    newIntegrationPopup,
  } = useAssistantForNode(assistantId)

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 w-[420px] max-w-[420px] h-full bg-surface-base-sidebar',
        'border-l border-border-specific-panel-outline'
      )}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-specific-panel-outline">
        <h2 className="text-sm font-semibold text-text-primary">Assistant</h2>
        <Button type={ButtonType.SECONDARY} aria-label="Close assistant panel" onClick={onClose}>
          <CrossIconSvg className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto show-scroll px-5 py-5">
        {isLoading && (
          <div className="flex justify-center mt-16">
            <Spinner />
          </div>
        )}

        {!isLoading && isForbidden && (
          <p className="mt-10 text-sm text-text-quaternary text-center">
            You don&apos;t have access to this assistant&apos;s settings.
          </p>
        )}

        {!isLoading && notFound && (
          <p className="mt-10 text-sm text-text-quaternary text-center">
            This assistant no longer exists. It may have been deleted.
          </p>
        )}

        {!isLoading && loadFailed && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-sm text-text-quaternary text-center">
              Couldn&apos;t load this assistant. Please try again.
            </p>
            <Button type={ButtonType.SECONDARY} onClick={loadAssistant}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isForbidden && !notFound && !loadFailed && assistant && (
          <AssistantDetailsEmbedded assistant={assistant} onNewIntegration={onNewIntegration} />
        )}
      </div>

      {newIntegrationPopup}
    </aside>
  )
}

export default AssistantNodePanel
