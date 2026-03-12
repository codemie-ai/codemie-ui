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
import { useSnapshot } from 'valtio'

import { skillsStore } from '@/store/skills'
import { Skill } from '@/types/entity/skill'

export const useSkillDetails = (id: string) => {
  const { selectedSkill, loading } = useSnapshot(skillsStore)
  const [error, setError] = useState<Error | null>(null)

  const loadSkill = useCallback(async () => {
    try {
      setError(null)
      await skillsStore.getSkillById(id)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading skill:', err)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadSkill()
    }
  }, [id, loadSkill])

  return {
    skill: selectedSkill as Skill | null,
    loading,
    error,
    refresh: loadSkill,
  }
}
