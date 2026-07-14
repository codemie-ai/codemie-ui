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

import { FC, useState } from 'react'

import Popup from '@/components/Popup/Popup'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import AssistantSelector, { AssistantOption } from '@/pages/assistants/components/AssistantSelector'
import { assistantsProjectMappingStore } from '@/store/assistantsProjectMapping'
import toaster from '@/utils/toaster'

interface AddAssistantModalProps {
  projectName: string
  onClose: () => void
}

const AddAssistantModal: FC<AddAssistantModalProps> = ({ projectName, onClose }) => {
  const [selected, setSelected] = useState<AssistantOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!selected.length) return
    setSubmitting(true)
    try {
      await Promise.all(
        selected.map((assistant) =>
          assistantsProjectMappingStore.addMapping(assistant.id, projectName)
        )
      )
      toaster.info(
        selected.length === 1 ? 'Assistant added' : `${selected.length} assistants added`
      )
      onClose()
    } catch (error: any) {
      const message =
        error?.response?.status === 404
          ? 'Assistant not found'
          : error?.message || 'Failed to add assistants'
      toaster.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Popup
      visible
      header="Add assistants"
      onHide={onClose}
      onSubmit={handleConfirm}
      submitText="Add"
      submitDisabled={!selected.length || submitting}
      cancelText="Cancel"
      limitWidth
    >
      <p className="text-xs text-text-tertiary mb-3">
        You can add project-specific or public assistants.
      </p>

      <div className="my-4">
        <AssistantSelector
          hideHeader
          project={projectName}
          scope={ASSISTANT_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE}
          value={selected}
          onChange={setSelected}
          placeholder="Search assistants…"
          scrollHeight="450px"
          className="h-10"
        />
      </div>
    </Popup>
  )
}

export default AddAssistantModal
