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

import { ReactNode, useCallback, useEffect, useState } from 'react'

import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { assistantsStore } from '@/store'
import { Assistant } from '@/types/entity/assistant'

const FORBIDDEN_STATUS = 403
const NOT_FOUND_STATUS = 404

export interface UseAssistantForNodeResult {
  assistant?: Assistant
  isLoading: boolean
  isForbidden: boolean
  notFound: boolean
  loadFailed: boolean
  loadAssistant: () => Promise<void>
  onNewIntegration: (project: string, settingType: string, callback: () => void) => void
  // Popup element that must be rendered by the consumer so "Add integration" works.
  newIntegrationPopup: ReactNode
}

/**
 * Loads the full assistant referenced by a workflow assistant node and wires up the
 * "Your Integration Settings" affordances (new-integration popup + refresh callback)
 * for the executions side panel's `<AssistantDetailsEmbedded>` view. Backend contract
 * is unchanged: the per-assistant mapping is still saved through
 * `v1/assistants/{assistant_id}/users/mapping`.
 */
export const useAssistantForNode = (assistantId?: string): UseAssistantForNodeResult => {
  const [assistant, setAssistant] = useState<Assistant>()
  // Start in the loading state whenever there is an id to load, so the very first paint shows a
  // spinner instead of a blank frame before the load effect runs.
  const [isLoading, setIsLoading] = useState(Boolean(assistantId))
  const [isForbidden, setIsForbidden] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess: baseOnIntegrationSuccess,
  } = useNewIntegrationPopup()
  const [pendingSuccessCallback, setPendingSuccessCallback] = useState<(() => void) | null>(null)

  const loadAssistantWithSignal = useCallback(
    async (signal?: AbortSignal) => {
      if (!assistantId) {
        setAssistant(undefined)
        setIsForbidden(false)
        setNotFound(false)
        setLoadFailed(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // skipErrorHandling so an inaccessible/missing assistant is handled softly in the UI
        // instead of surfacing a global error toast.
        const fresh = await assistantsStore.getAssistant(assistantId, true, signal)
        if (signal?.aborted) return
        setAssistant(fresh)
        setIsForbidden(false)
        setNotFound(false)
        setLoadFailed(false)
      } catch (err) {
        // An aborted request (node switched / panel unmounted) must not touch state:
        // whichever load runs next owns the UI from here.
        if (signal?.aborted) return
        const status = err instanceof Response ? err.status : undefined
        setAssistant(undefined)
        setIsForbidden(status === FORBIDDEN_STATUS)
        setNotFound(status === NOT_FOUND_STATUS)
        setLoadFailed(status !== FORBIDDEN_STATUS && status !== NOT_FOUND_STATUS)
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [assistantId]
  )

  useEffect(() => {
    // Abort the in-flight request when the node changes or the panel unmounts, so a slow
    // response for a previous assistant can never overwrite the currently selected one.
    const controller = new AbortController()
    loadAssistantWithSignal(controller.signal)
    return () => controller.abort()
  }, [loadAssistantWithSignal])

  // Zero-arg variant safe to hand to click handlers/consumers (a caller's first argument,
  // e.g. a click event, must never end up in the AbortSignal slot).
  const loadAssistant = useCallback(() => loadAssistantWithSignal(), [loadAssistantWithSignal])

  // useNewIntegrationPopup has no per-request callback, so bridge UserMapping's onComplete
  // through a pending callback fired on integration success (mirrors AssistantDetailsPage).
  const onNewIntegration = useCallback(
    (project: string, settingType: string, callback: () => void) => {
      setPendingSuccessCallback(() => callback)
      showNewIntegrationPopup(project, settingType)
    },
    [showNewIntegrationPopup]
  )

  const handleIntegrationSuccess = useCallback(() => {
    baseOnIntegrationSuccess()
    if (pendingSuccessCallback) {
      pendingSuccessCallback()
      setPendingSuccessCallback(null)
    }
  }, [baseOnIntegrationSuccess, pendingSuccessCallback])

  const newIntegrationPopup = (
    <NewIntegrationPopup
      visible={showNewIntegration}
      onHide={hideNewIntegrationPopup}
      onSuccess={handleIntegrationSuccess}
      project={selectedProject}
      credentialType={selectedCredentialType}
    />
  )

  return {
    assistant,
    isLoading,
    isForbidden,
    notFound,
    loadFailed,
    loadAssistant,
    onNewIntegration,
    newIntegrationPopup,
  }
}
