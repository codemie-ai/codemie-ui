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

import React, { useMemo } from 'react'

import { bindSharing, SharePopup } from '@/components/sharing'
import { assistantsStore } from '@/store/assistants'
import { userStore } from '@/store/user'
import { Assistant } from '@/types/entity/assistant'
import { isOwner } from '@/utils/entity'

interface ShareAssistantPopupProps {
  visible: boolean
  assistant: Assistant | null
  onHide: () => void
}

const TEXTS = {
  shared: 'Assistant sharing updated.',
  shareFailed: 'Failed to add some users. Please try again.',
  unshared: 'User removed from sharing.',
  unshareFailed: 'Failed to remove user. Please try again.',
}

const ShareAssistantPopup: React.FC<ShareAssistantPopupProps> = ({
  visible,
  assistant,
  onHide,
}) => {
  const currentUserId = userStore.user?.userId
  const owner = !!assistant && isOwner(assistant, currentUserId)

  const sharing = useMemo(
    () => bindSharing(assistantsStore.sharing, assistant?.id ?? '', currentUserId),
    [assistant?.id, currentUserId]
  )

  return (
    <SharePopup
      visible={visible && !!assistant}
      onHide={onHide}
      header="Share assistant"
      headerDescription="Can chat and view setup; cannot edit"
      searchUsers={sharing.searchUsers}
      share={sharing.share}
      unshare={sharing.unshare}
      loadSharedWith={owner ? sharing.loadSharedWith : undefined}
      entityKey={assistant?.id}
      canGrant
      texts={TEXTS}
    />
  )
}

export default ShareAssistantPopup
