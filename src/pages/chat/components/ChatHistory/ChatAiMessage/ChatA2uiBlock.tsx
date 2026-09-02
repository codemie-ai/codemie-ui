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

import { FC, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { A2uiSurface } from '@/a2ui/config'
import { findCreatedSurfaceIds, findModalTriggerIds } from '@/a2ui/envelopes'
import { A2uiErrorBoundary , A2uiFallback } from '@/a2ui/fallback'
import {
  A2uiModalTriggerProvider,
  A2uiSubmittedActionProvider,
  type A2uiSubmittedAction,
} from '@/a2ui/surfaceContext'
import type { A2uiDataModel } from '@/a2ui/types'
import {
  isSurfaceValid,
  useA2uiSurface,
  type A2uiActionHandler,
  type A2uiSurfaceActionEvent,
} from '@/a2ui/useA2uiSurface'
import { buildA2uiDisplayText } from '@/a2ui/utils'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import type { ChatMessage } from '@/types/entity/conversation'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import { ChatIndexes } from '../ChatHistory'

const INVALID_SURFACE_MESSAGE = 'Please complete the required fields before submitting'

/** The answer turn that responded to one surface of this message. */
interface SurfaceAnswer {
  /** Index of the history turn holding the answer — the turn a re-answer replaces. */
  turnIndex: number
  item: ChatMessage
}

interface ChatA2uiBlockProps {
  message: ChatMessage
  indexes: ChatIndexes
  // "Editing" a surface message means unlocking the (otherwise read-only,
  // already answered) surface so it can be re-answered.
  isFormEditing: boolean
  onSubmitted: () => void
}

/**
 * Renders the A2UI surfaces attached to an assistant message.
 *
 * Degradation is centralized: envelopes referencing a component outside the
 * renderer registry are pre-filtered into A2uiFallback (so the SDK's own inline
 * error text never reaches the chat), processor rejections fall back the same
 * way, and render-time crashes are caught by the error boundary.
 */
const ChatA2uiBlock: FC<ChatA2uiBlockProps> = ({
  message,
  indexes,
  isFormEditing,
  onSubmitted,
}) => {
  const { currentChat } = useSnapshot(chatsStore)
  const envelopes = message.a2uiEnvelopes

  const history = currentChat?.history ?? []
  // One message can issue several surfaces; every one of them is tracked
  // separately, otherwise answering the second surface finds no answer turn
  // (permanently locked, no prefill) and a re-answer appends a duplicate turn
  // instead of replacing the existing one.
  const surfaceIds = useMemo(
    () => (envelopes?.length ? findCreatedSurfaceIds(envelopes) : []),
    [envelopes]
  )

  // The answer to a surface lives on a LATER turn (the user chip). Iterating
  // forward keeps the most recent turn — and its last item — so a re-answer
  // (which replaces that turn) resolves to the latest response.
  const answers = new Map<string, SurfaceAnswer>()
  history.forEach((group, turnIndex) =>
    group.forEach((item) => {
      const answeredSurfaceId = item.a2uiAction?.action.surfaceId
      if (answeredSurfaceId && surfaceIds.includes(answeredSurfaceId)) {
        answers.set(answeredSurfaceId, { turnIndex, item: item as ChatMessage })
      }
    })
  )

  const inFlightRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isChatBusy = history.flat().some((item) => item.inProgress)
  const isAtEdge = indexes.historyIndex === history.length - 1
  // Interactive when nothing is generating or in flight AND either:
  //  - still unanswered and sitting at the live edge (last turn); or
  //  - answered and explicitly unlocked via "Edit" — re-answering then replaces
  //    its turn. An answered surface is otherwise read-only, and an unanswered
  //    one that scrolled behind newer turns (stale) is never interactive.
  const isSurfaceActive = (surfaceId: string) =>
    !isChatBusy && !isSubmitting && (isFormEditing || (!answers.has(surfaceId) && isAtEdge))

  // Valtio snapshot values are tracking proxies all the way down, which neither
  // `structuredClone` nor the A2UI DataModel accept — the JSON round-trip both
  // unwraps them deeply and yields a stable identity while the answers are
  // unchanged, so the surface replay (keyed on it) does not rerun every render.
  const prefillKey = JSON.stringify(
    surfaceIds.reduce<Record<string, A2uiDataModel>>((acc, surfaceId) => {
      const saved = answers.get(surfaceId)?.item.a2uiDataModel
      if (saved) acc[surfaceId] = saved
      return acc
    }, {})
  )
  const prefillDataModels = useMemo<Record<string, A2uiDataModel> | null>(
    () => (prefillKey === '{}' ? null : (JSON.parse(prefillKey) as Record<string, A2uiDataModel>)),
    [prefillKey]
  )

  const submittedActionKey = JSON.stringify(
    surfaceIds.reduce<Record<string, A2uiSubmittedAction>>((acc, surfaceId) => {
      const action = answers.get(surfaceId)?.item.a2uiAction?.action
      if (action) acc[surfaceId] = { name: action.name, componentId: action.sourceComponentId }
      return acc
    }, {})
  )
  const submittedActions = useMemo<Record<string, A2uiSubmittedAction>>(
    () => JSON.parse(submittedActionKey) as Record<string, A2uiSubmittedAction>,
    [submittedActionKey]
  )

  // Latest-render handler, forwarded through a ref so the replay memo inside
  // `useA2uiSurface` never sees a new handler identity.
  const actionHandlerRef = useRef<A2uiActionHandler | null>(null)
  // Which Buttons are Modal triggers — derived from the envelopes, since the catalog's
  // own Modal renders its trigger and leaves no React boundary to mark it by.
  const modalTriggerIds = useMemo(() => findModalTriggerIds(envelopes), [envelopes])
  const { surfaces, unsupportedComponent, error, missingRoot } = useA2uiSurface(
    envelopes,
    (event) => actionHandlerRef.current?.(event),
    prefillDataModels
  )

  const handleAction = async (event: A2uiSurfaceActionEvent) => {
    // `isSubmitting` only flips after an async hop, so the synchronous latch is
    // what actually stops a double click from creating two turns.
    if (inFlightRef.current) return
    if (!isSurfaceActive(event.surfaceId)) return

    // The SDK injects `isValid` only into the props of the component that owns
    // the `checks`, and agents attach them to the inputs — so an invalid form
    // would otherwise submit from a button that never sees the failure. Nothing
    // renders that failure inline either, so refusing silently would read as a
    // dead button: the toast is the only feedback the user gets.
    const surface = surfaces.find((candidate) => candidate.id === event.surfaceId)
    if (surface && !isSurfaceValid(surface)) {
      toaster.error(INVALID_SURFACE_MESSAGE)
      return
    }

    const answer = answers.get(event.surfaceId)
    const displayText = buildA2uiDisplayText(event.name, event.dataModel)
    inFlightRef.current = true
    setIsSubmitting(true)
    onSubmitted()
    try {
      // Awaited so a failure cannot escape as an unhandled rejection; the store
      // reports it (rolling the optimistic turn back), this only unlocks the form.
      await chatGenerationStore.submitA2uiAction(
        event.surfaceId,
        event.name,
        event.sourceComponentId,
        event.dataModel,
        displayText,
        answer?.turnIndex
      )
    } catch (submitError) {
      console.error('[a2ui] failed to submit surface action', submitError)
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }
  // Wrapped rather than assigned directly: the ref's slot is a void-returning handler, and
  // handing it a promise means nothing awaits or catches it. `handleAction` already reports
  // its own failures, so the promise is deliberately dropped here.
  actionHandlerRef.current = (event) => {
    handleAction(event).catch((error) => {
      console.error('[a2ui] unhandled surface action failure', error)
    })
  }

  if (!envelopes?.length) return null

  if (unsupportedComponent) {
    return (
      <div className="mt-4 mb-3" data-testid="a2ui-block">
        <A2uiFallback componentType={unsupportedComponent} />
      </div>
    )
  }

  if (error || surfaces.length === 0 || missingRoot) {
    // A surface whose root has not arrived yet is normal mid-stream: render
    // nothing until the turn settles rather than flashing the fallback notice.
    if (missingRoot && message.inProgress) return null
    return (
      <div className="mt-4 mb-3" data-testid="a2ui-block">
        <A2uiFallback />
      </div>
    )
  }

  return (
    <div className="a2ui-scope mt-4 mb-3 flex flex-col gap-3" data-testid="a2ui-block">
      <A2uiErrorBoundary resetKey={`${surfaceIds.join(',')}:${envelopes.length}`}>
        {surfaces.map((surface) => {
          const isActive = isSurfaceActive(surface.id)
          return (
            /* A read-only surface (answered or stale) is locked at the DOM level —
               `disabled` for native controls, `pointer-events-none` for the custom
               ones — on top of the guard inside `handleAction`. */
            <fieldset
              key={surface.id}
              disabled={!isActive}
              className={cn('contents', !isActive && 'pointer-events-none')}
              data-testid="a2ui-surface-fieldset"
            >
              <A2uiSubmittedActionProvider value={submittedActions[surface.id] ?? null}>
                <A2uiModalTriggerProvider value={modalTriggerIds}>
                  <A2uiSurface surface={surface} />
                </A2uiModalTriggerProvider>
              </A2uiSubmittedActionProvider>
            </fieldset>
          )
        })}
      </A2uiErrorBoundary>
    </div>
  )
}

export default ChatA2uiBlock
