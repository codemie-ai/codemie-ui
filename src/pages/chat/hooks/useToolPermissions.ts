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

import { compact } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { ToolCallPolicy } from '@/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { assistantsStore } from '@/store'
import { chatsStore } from '@/store/chats'
import { isFeatureEnabled } from '@/utils/featureFlags'

export interface ToolPermissionsState {
  policy: ToolCallPolicy
  allowOverride: boolean
  loaded: boolean
  enabled: boolean
  setPolicy: (policy: ToolCallPolicy) => void
}

const DEFAULT_STATE = {
  policy: ToolCallPolicy.AUTO_APPROVE,
  allowOverride: false,
  loaded: true,
}

// Strictest policy across attached assistants wins:
// ASK_FOR_APPROVAL > APPROVE_FOR_ME > AUTO_APPROVE.
const reduceAssistantPolicies = (policies: (ToolCallPolicy | undefined)[]): ToolCallPolicy => {
  if (policies.some((p) => p === ToolCallPolicy.ASK_FOR_APPROVAL)) {
    return ToolCallPolicy.ASK_FOR_APPROVAL
  }
  if (policies.some((p) => p === ToolCallPolicy.APPROVE_FOR_ME)) {
    return ToolCallPolicy.APPROVE_FOR_ME
  }
  return ToolCallPolicy.AUTO_APPROVE
}

/**
 * Resolves the effective tool-call policy for the current chat, in priority:
 *   1. Conversation-level saved policy (when the assistant allows override)
 *   2. Assistant-level policy (strictest across attached assistants)
 *   3. AUTO_APPROVE
 *
 * `setPolicy` persists via PUT /v1/conversations/{id}; for a new/empty chat it
 * only writes to local state and gets flushed to the server after the chat is
 * created (see chatGeneration.ts).
 */
export function useToolPermissions(): ToolPermissionsState {
  const enabled = isFeatureEnabled(FEATURE_FLAGS.TOOL_PERMISSIONS)
  const { currentChat, isNewChat } = useSnapshot(chatsStore)
  const { defaultAssistant } = useSnapshot(assistantsStore)

  // For an empty chat, fall back to the default assistant that will actually be
  // used at submit — otherwise the policy stays at AUTO_APPROVE regardless of
  // what the target assistant configured.
  const assistantIds = currentChat?.assistantIds?.length
    ? currentChat.assistantIds
    : compact([defaultAssistant?.id])

  const [assistantResolved, setAssistantResolved] = useState<{
    policy: ToolCallPolicy
    allowOverride: boolean
    loaded: boolean
  }>({ ...DEFAULT_STATE, loaded: false })

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setAssistantResolved(DEFAULT_STATE)
    } else {
      setAssistantResolved((prev) => ({ ...prev, loaded: false }))

      if (!assistantIds.length) {
        setAssistantResolved(DEFAULT_STATE)
      } else {
        Promise.all(
          assistantIds.map((id) =>
            assistantsStore.getAssistant(id).then(
              (assistant) => ({ assistant, failed: false }),
              () => ({ assistant: undefined, failed: true })
            )
          )
        ).then((results) => {
          if (cancelled) {
            return
          }

          // Fail closed: if we couldn't confirm an assistant's policy, don't risk
          // silently landing on AUTO_APPROVE — require explicit approval instead.
          if (results.some((r) => r.failed)) {
            setAssistantResolved({
              policy: ToolCallPolicy.ASK_FOR_APPROVAL,
              allowOverride: false,
              loaded: true,
            })
            return
          }

          const fetched = results.map((r) => r.assistant)
          const allowOverride = fetched.every((a) => a?.tool_permissions?.allow_override === true)
          const policy = reduceAssistantPolicies(
            fetched.map((a) => a?.tool_permissions?.tool_call_policy as ToolCallPolicy | undefined)
          )
          setAssistantResolved({ policy, allowOverride, loaded: true })
        })
      }
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantIds.join(','), enabled])

  const rawConversationPolicy = currentChat?.toolCallPolicy
  const conversationPolicy = Object.values(ToolCallPolicy).includes(
    rawConversationPolicy as ToolCallPolicy
  )
    ? (rawConversationPolicy as ToolCallPolicy)
    : undefined
  const policy =
    assistantResolved.allowOverride && conversationPolicy
      ? conversationPolicy
      : assistantResolved.policy

  const setPolicy = useCallback(
    (next: ToolCallPolicy) => {
      if (!currentChat) return
      // updateChat handles both cases: for a real conversation it PUTs the
      // change to the server; for isNewChat it only mutates the local proxy —
      // the pending value is flushed to the server after the chat is created.
      chatsStore.updateChat(currentChat.id, { toolCallPolicy: next })
    },
    [currentChat?.id, isNewChat]
  )

  return {
    policy,
    allowOverride: assistantResolved.allowOverride,
    loaded: assistantResolved.loaded,
    enabled,
    setPolicy,
  }
}
