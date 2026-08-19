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

import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { premiumModelTipStore } from '@/store/premiumModelTip'
import type { ModelOption } from '@/types/entity/configuration'

interface PremiumModelTipState {
  /** The model actually driving this conversation, or null while unresolved. */
  effectiveModel: ModelOption | null
  isPremiumActive: boolean
  /** `${chatId}:${modelValue}` — null until both parts are known. */
  tipKey: string | null
  tipIsVisible: boolean
  dismissTip: () => void
}

/**
 * Single source of truth for "is a premium model driving this chat, and should
 * the tip be showing?".
 *
 * Previously this derivation was duplicated in `ChatHistory` and `ChatPrompt`,
 * each with its own dismissal state, which is how the tip could be visible in
 * one and dismissed in the other.
 */
export const usePremiumModelTip = (): PremiumModelTipState => {
  const { currentChat } = useSnapshot(chatsStore)
  const { llmModels } = useSnapshot(appInfoStore)
  const { dismissedKeys } = useSnapshot(premiumModelTipStore)

  const effectiveModel = currentChat?.llmModel
    ? llmModels.find((model) => model.value === currentChat.llmModel) ?? null
    : null
  const isPremiumActive = effectiveModel?.isPremium ?? false
  const tipKey = premiumModelTipStore.buildKey(currentChat?.id, effectiveModel?.value)

  // Read through the snapshot so the component re-renders on dismissal;
  // `isDismissed` is reused for the null-key guard.
  const isDismissed = tipKey !== null && dismissedKeys[tipKey] === true
  const tipIsVisible = isPremiumActive && tipKey !== null && !isDismissed

  return {
    effectiveModel: effectiveModel as ModelOption | null,
    isPremiumActive,
    tipKey,
    tipIsVisible,
    dismissTip: () => premiumModelTipStore.dismiss(tipKey),
  }
}
