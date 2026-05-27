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

import { useCallback } from 'react'

import { ASSISTANT_DETAILS, SKILL_DETAILS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { downloadSkillAsMarkdown } from '@/pages/skills/utils/skillUtils'
import { skillsStore } from '@/store/skills'
import { Assistant } from '@/types/entity/assistant'
import { Skill } from '@/types/entity/skill'

export const useFavoritesNavigation = () => {
  const router = useVueRouter()

  const handleViewAssistant = useCallback(
    (assistant: Assistant) => {
      router.push({ name: ASSISTANT_DETAILS, params: { id: assistant.id } })
    },
    [router]
  )

  const handleViewSkill = useCallback(
    (skill: Skill) => {
      router.push({ name: SKILL_DETAILS, params: { id: skill.id } })
    },
    [router]
  )

  const handleExportSkill = useCallback(async (skill: Skill) => {
    try {
      const blob = await skillsStore.exportSkill(skill.id)
      const content = await blob.text()
      downloadSkillAsMarkdown(skill, content)
    } catch (err) {
      console.error('Error exporting skill:', err)
    }
  }, [])

  return { handleViewAssistant, handleViewSkill, handleExportSkill }
}
