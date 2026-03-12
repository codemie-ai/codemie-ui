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

import React, { useEffect, useState } from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import { skillsStore } from '@/store/skills'
import { SkillAssistantItem } from '@/types/entity/skill'
import { getRootPath } from '@/utils/utils'

interface SkillAssistantsModalProps {
  visible: boolean
  onHide: () => void
  skillId: string
  skillName: string
}

const SkillAssistantsModal: React.FC<SkillAssistantsModalProps> = ({
  visible,
  onHide,
  skillId,
  skillName,
}) => {
  const [assistants, setAssistants] = useState<SkillAssistantItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !skillId) return

    const loadAssistants = async () => {
      try {
        setLoading(true)
        const result = await skillsStore.getAssistantsUsingSkill(skillId)
        setAssistants(result)
      } catch (error) {
        console.error('Error loading assistants:', error)
        setAssistants([])
      } finally {
        setLoading(false)
      }
    }

    loadAssistants()
  }, [visible, skillId])

  const handleAssistantClick = (assistant: SkillAssistantItem) => {
    const url = `${getRootPath()}/#/assistants/${assistant.id}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const footerContent = (
    <div className="flex justify-end">
      <Button variant={ButtonType.BASE} onClick={onHide}>
        Close
      </Button>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={`Assistants using "${skillName}"`}
      className="max-w-lg w-full"
      footerContent={footerContent}
      withBorder
    >
      <div className="flex flex-col gap-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {!loading && assistants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-text-secondary">No assistants are using this skill yet.</p>
          </div>
        )}

        {!loading && assistants.length > 0 && (
          <>
            <p className="text-sm text-text-secondary">
              Click on an assistant to view its details in a new tab.
            </p>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {assistants.map((assistant) => {
                const createdByName =
                  assistant.created_by?.name ?? assistant.created_by?.username ?? ''
                const hasMetadata = Boolean(assistant.project) || Boolean(createdByName)

                return (
                  <div
                    key={assistant.id}
                    onClick={() => handleAssistantClick(assistant)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border-secondary bg-surface-base-secondary hover:border-border-accent cursor-pointer transition-colors"
                  >
                    <Avatar
                      iconUrl={assistant.icon_url}
                      name={assistant.name}
                      type={AvatarType.SMALL}
                    />

                    <div className="flex flex-col min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {assistant.name}
                      </p>
                      {hasMetadata && (
                        <p className="text-xs text-text-tertiary truncate">
                          {assistant.project && <span>{assistant.project}</span>}
                          {assistant.project && createdByName && <span> • </span>}
                          {createdByName && <span>by {createdByName}</span>}
                        </p>
                      )}
                    </div>

                    <ExternalSvg className="w-4 h-4 text-text-tertiary shrink-0" />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Popup>
  )
}

SkillAssistantsModal.displayName = 'SkillAssistantsModal'

export default SkillAssistantsModal
