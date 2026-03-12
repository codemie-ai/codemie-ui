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

import { FC, useRef } from 'react'
import { useSnapshot } from 'valtio'

import Spinner from '@/components/Spinner'
import { AssistantType } from '@/constants/assistants'
import AssistantForm, {
  AssistantFormRef,
} from '@/pages/assistants/components/AssistantForm/AssistantForm'
import RemoteAssistantForm, {
  RemoteAssistantFormRef,
} from '@/pages/assistants/components/RemoteAssistantForm/RemoteAssistantForm'
import { assistantsStore } from '@/store'
import { canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'

import { useChatContext } from '../../../hooks/useChatContext'

interface ChatConfigAssistantFormProps {
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

const ChatConfigAssistantForm: FC<ChatConfigAssistantFormProps> = ({ showNewIntegrationPopup }) => {
  const formRef = useRef<AssistantFormRef>(null)
  const remoteFormRef = useRef<RemoteAssistantFormRef>(null)

  const { updateAssistant, updateRemoteAssistant } = useSnapshot(assistantsStore)
  const { selectedAssistant, isLoading, closeConfigForm } = useChatContext()

  const isRemoteAssistant =
    selectedAssistant?.type === AssistantType.A2A ||
    selectedAssistant?.type === AssistantType.REMOTE

  const handleSuccess = () => {
    toaster.info('Assistant has been updated successfully!')
    closeConfigForm()
  }

  const handleSubmit = async (values, skipValidation = false) => {
    if (!selectedAssistant) return { error: 'No assistant selected' }

    return isRemoteAssistant
      ? updateRemoteAssistant(selectedAssistant.id, values)
      : updateAssistant(selectedAssistant.id, values, skipValidation)
  }

  if (isLoading) return <Spinner inline className="mx-auto my-auto" rootClassName="h-full" />

  if (!selectedAssistant || !canEdit(selectedAssistant)) {
    closeConfigForm()
    return null
  }

  if (isRemoteAssistant) {
    return (
      <RemoteAssistantForm
        isEditing
        isChatConfig
        ref={remoteFormRef}
        key={selectedAssistant.id}
        assistant={selectedAssistant}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={closeConfigForm}
      />
    )
  }

  return (
    <AssistantForm
      isEditing
      isChatConfig
      ref={formRef}
      key={selectedAssistant.id}
      assistant={selectedAssistant}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={closeConfigForm}
      showNewIntegrationPopup={showNewIntegrationPopup}
    />
  )
}

export default ChatConfigAssistantForm
