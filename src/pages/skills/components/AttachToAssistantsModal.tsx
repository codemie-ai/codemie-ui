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

import Button from '@/components/Button/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import AssistantSelector, { AssistantOption } from '@/pages/assistants/components/AssistantSelector'
import { skillsStore } from '@/store/skills'
import { Skill } from '@/types/entity/skill'

interface AttachToAssistantsModalProps {
  isOpen: boolean
  skill: Skill
  onClose: () => void
  onSuccess: () => void
}

const AttachToAssistantsModal: React.FC<AttachToAssistantsModalProps> = ({
  isOpen,
  skill,
  onClose,
  onSuccess,
}) => {
  const [selectedAssistants, setSelectedAssistants] = useState<AssistantOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const handleClose = () => {
    if (!isLoading) {
      setSelectedAssistants([])
      setError('')
      setProgress(null)
      onClose()
    }
  }

  const handleAttach = async () => {
    if (selectedAssistants.length === 0) {
      setError('Please select at least one assistant')
      return
    }

    setError('')
    setIsLoading(true)
    setProgress({ current: 0, total: selectedAssistants.length })

    try {
      const assistantsData = selectedAssistants.map((a) => ({ id: a.id, name: a.name }))

      const { successCount } = await skillsStore.attachSkillToAssistants(skill.id, assistantsData)

      if (successCount > 0) {
        onSuccess() // Refresh skill details
        handleClose()
      }
    } catch (error) {
      console.error('Error attaching skill to assistants:', error)
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.BASE} onClick={handleClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        variant={ButtonType.PRIMARY}
        onClick={handleAttach}
        disabled={isLoading || selectedAssistants.length === 0}
      >
        {isLoading ? 'Attaching...' : 'Attach'}
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[650px]"
      hideClose
      header="Attach to Assistants"
      visible={isOpen}
      onHide={handleClose}
      withBorder
      footerContent={footerContent}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Select assistants to attach the skill &quot;{skill.name}&quot; to.
        </p>

        <AssistantSelector
          value={selectedAssistants}
          onChange={setSelectedAssistants}
          placeholder="Select assistants"
          hideHeader
          error={error}
        />

        {isLoading && progress && (
          <div className="text-sm text-text-secondary">
            Attaching to {progress.current} of {progress.total} assistants...
          </div>
        )}
      </div>
    </Popup>
  )
}

export default AttachToAssistantsModal
