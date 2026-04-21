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

import React, { useState } from 'react'

import ChatSvg from '@/assets/icons/chat.svg?react'
import DeleteDangerSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { chatsStore } from '@/store/chats'

import InfoCard from './InfoCard'

const ConversationCard: React.FC = () => {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const deleteAllConversations = () => {
    setShowConfirmationModal(true)
  }

  const handleConfirmDelete = async () => {
    await chatsStore.deleteAllConversations()
    setShowConfirmationModal(false)
  }

  return (
    <InfoCard
      heading="Conversations Management"
      description="Manage your saved conversation history across workflows and assistants."
      icon={ChatSvg}
      data-onboarding="conversation-card"
    >
      <Button type="delete" onClick={deleteAllConversations}>
        <DeleteDangerSvg className="w-4 mr-px" />
        Delete All Conversations
      </Button>

      <ConfirmationModal
        visible={showConfirmationModal}
        header="Confirm Deletion"
        message="Are you sure you want to delete all conversations?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmationModal(false)}
      />
    </InfoCard>
  )
}

export default ConversationCard
