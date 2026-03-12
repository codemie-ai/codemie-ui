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

import LightningSvg from '@/assets/icons/lightning.svg?react'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { cn } from '@/utils/utils'

import { useChatContext } from '../../hooks/useChatContext'
import { SkillOption } from '../ChatConfiguration/ChatConfigSkillsSelector'
import ChatSkillsSelector from '../ChatSkillsSelector'

interface ChatPromptSkillsButtonProps {
  disabled?: boolean
}

const ChatPromptSkillsButton: FC<ChatPromptSkillsButtonProps> = ({ disabled = false }) => {
  const [isSkillsEnabled] = useFeatureFlag('skills')
  const { selectedSkills, setSelectedSkills } = useChatContext()

  const [isModalOpen, setIsModalOpen] = useState(false)

  // Hide if skills feature is disabled
  if (!isSkillsEnabled) {
    return null
  }

  const handleOpenModal = () => {
    if (disabled) return
    setIsModalOpen(true)
  }

  const handleConfirm = (skills: SkillOption[]) => {
    setSelectedSkills(skills)
  }

  const selectedCount = selectedSkills.length

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={disabled}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={
          'Attach skills to this conversation without modifying the assistant.\n\n' +
          'Skills are invoked on demand — the model decides when to use them based on your request.\n\n' +
          'Skills already assigned to the assistant are automatically skipped to avoid duplication.'
        }
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
          'text-text-quaternary hover:text-text-primary hover:bg-surface-elevated',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
        )}
      >
        <LightningSvg className="w-4 h-4" />
        <span className="text-xs font-medium">Skills</span>
        {selectedCount > 0 && (
          <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full bg-action-primary-solid text-text-on-primary">
            {selectedCount}
          </span>
        )}
      </button>

      <ChatSkillsSelector
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedSkills={selectedSkills}
        onConfirm={handleConfirm}
      />
    </>
  )
}

ChatPromptSkillsButton.displayName = 'ChatPromptSkillsButton'

export default ChatPromptSkillsButton
