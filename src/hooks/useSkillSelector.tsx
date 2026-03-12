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

import { useCallback, useEffect, useState } from 'react'

import { skillsStore } from '@/store/skills'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

export const useSkillSelector = (project: string) => {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)

  const loadSkills = useCallback(async () => {
    if (!project) {
      setOptions([])
      return
    }

    try {
      setLoading(true)
      const skills = await skillsStore.getSkillsForProject(project)

      if (!skills || !Array.isArray(skills)) {
        setOptions([])
        return
      }

      const skillOptions: SelectOption[] = skills.map((skill) => ({
        value: skill.id,
        label: skill.name,
        description: skill.description,
      }))

      setOptions(skillOptions)
    } catch (error) {
      console.error('[useSkillSelector] Error loading skills:', error)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  return {
    options,
    loading,
    refetch: loadSkills,
  }
}
