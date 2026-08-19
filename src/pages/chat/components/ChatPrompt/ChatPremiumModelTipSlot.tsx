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

import { FC } from 'react'

import { usePremiumModelTip } from '@/pages/chat/hooks/usePremiumModelTip'

import ChatPremiumModelTip from './ChatPremiumModelTip'
import { PREMIUM_TIP_SLOT_MAX_HEIGHT } from './premiumTipLayout'

/**
 * The single place the premium-model tip is rendered.
 *
 * It sits directly above the prompt panel rather than inside `ChatHistory`,
 * because `ChatHistory` is only mounted once a conversation has messages — a
 * brand-new chat shows `ChatPromptStarters` instead, and the tip vanished with
 * it. Mounting one slot outside that branch keeps the tip present in both page
 * states.
 */
const ChatPremiumModelTipSlot: FC = () => {
  const { effectiveModel, tipIsVisible, dismissTip } = usePremiumModelTip()

  if (!tipIsVisible || !effectiveModel) return null

  return (
    // The height cap keeps the row inside the budget ChatPage adds to the
    // history panel's floor; on a panel narrow enough to wrap the tip past it,
    // the tip scrolls rather than eating the conversation's space.
    <div
      data-testid="premium-tip-slot"
      className="shrink-0 overflow-y-auto px-6 py-2"
      style={{ maxHeight: PREMIUM_TIP_SLOT_MAX_HEIGHT }}
    >
      <ChatPremiumModelTip modelLabel={effectiveModel.label} onDismiss={dismissTip} />
    </div>
  )
}

export default ChatPremiumModelTipSlot
