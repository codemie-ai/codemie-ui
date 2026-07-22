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

import { useSnapshot } from 'valtio'

import { assistantsStore } from '@/store/assistants'
import { workflowsStore } from '@/store/workflows'
import { type ChatListItem } from '@/types/entity/conversation'

export interface ResolvedChatAvatar {
  iconUrl: string | null
  name: string | undefined
}

type AvatarStores = {
  assistants: readonly { id: string; icon_url?: string; name: string }[]
  recentAssistants: readonly { id: string; icon_url?: string; name: string }[]
  pinnedAssistants: readonly { id: string; icon_url?: string; name: string }[]
  workflows: readonly { id: string; icon_url?: string; name: string | null }[]
  recentWorkflows: readonly { id: string; icon_url?: string; name: string | null }[]
  chatWorkflows: readonly { id: string; icon_url?: string; name: string | null }[]
}

export function resolveChatAvatar(chat: ChatListItem, stores: AvatarStores): ResolvedChatAvatar {
  // Short-circuit only when the API provided an icon — skip store lookup entirely
  if (chat.iconUrl) {
    return { iconUrl: chat.iconUrl, name: chat.assistantNames?.[0] }
  }

  if (chat.isWorkflow && chat.initialWorkflowId) {
    const w =
      stores.workflows.find((w) => w.id === chat.initialWorkflowId) ??
      stores.recentWorkflows.find((w) => w.id === chat.initialWorkflowId) ??
      stores.chatWorkflows.find((w) => w.id === chat.initialWorkflowId)
    return { iconUrl: w?.icon_url ?? null, name: w?.name ?? chat.assistantNames?.[0] ?? undefined }
  }

  if (!chat.isWorkflow && chat.initialAssistantId) {
    const a =
      stores.assistants.find((a) => a.id === chat.initialAssistantId) ??
      stores.recentAssistants.find((a) => a.id === chat.initialAssistantId) ??
      stores.pinnedAssistants.find((a) => a.id === chat.initialAssistantId)
    return { iconUrl: a?.icon_url ?? null, name: a?.name ?? chat.assistantNames?.[0] }
  }

  return { iconUrl: null, name: chat.assistantNames?.[0] }
}

export function useResolveChatAvatar(chat: ChatListItem): ResolvedChatAvatar {
  const { assistants, recentAssistants, pinnedAssistants } = useSnapshot(assistantsStore)
  const { workflows, recentWorkflows, chatWorkflows } = useSnapshot(workflowsStore)
  return resolveChatAvatar(chat, {
    assistants,
    recentAssistants,
    pinnedAssistants,
    workflows,
    recentWorkflows,
    chatWorkflows,
  })
}

export function resolveGroupChatAvatars(
  chat: ChatListItem,
  stores: AvatarStores
): ResolvedChatAvatar[] {
  const ids = chat.assistantIds?.length ? chat.assistantIds : []
  if (!ids.length) return [resolveChatAvatar(chat, stores)]

  return ids.map((id, i) => {
    const a =
      stores.assistants.find((a) => a.id === id) ??
      stores.recentAssistants.find((a) => a.id === id) ??
      stores.pinnedAssistants.find((a) => a.id === id)
    const iconUrl = a?.icon_url ?? (id === chat.initialAssistantId ? chat.iconUrl ?? null : null)
    const name = a?.name ?? chat.assistantNames?.[i]
    return { iconUrl, name }
  })
}

export function useResolveGroupChatAvatars(chat: ChatListItem): ResolvedChatAvatar[] {
  const stores = useAvatarStores()
  return resolveGroupChatAvatars(chat, stores)
}

export function useAvatarStores(): AvatarStores {
  const { assistants, recentAssistants, pinnedAssistants } = useSnapshot(assistantsStore)
  const { workflows, recentWorkflows, chatWorkflows } = useSnapshot(workflowsStore)
  return {
    assistants,
    recentAssistants,
    pinnedAssistants,
    workflows,
    recentWorkflows,
    chatWorkflows,
  }
}
