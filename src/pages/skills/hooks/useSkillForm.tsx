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

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'

import { skillValidationSchema } from '@/pages/skills/validation/skillValidation'
import { skillsStore } from '@/store/skills'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import {
  Skill,
  SkillCreateRequest,
  SkillUpdateRequest,
  SkillVisibility,
} from '@/types/entity/skill'

export interface SkillFormData {
  name: string
  description: string
  content: string
  project: string
  visibility: SkillVisibility
  categories: string[]
  toolkits: AssistantToolkit[]
  mcp_servers: MCPServerDetails[]
}

export const useSkillForm = (initialData?: Skill) => {
  const form = useForm<SkillFormData>({
    resolver: yupResolver(skillValidationSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description,
          content: initialData.content,
          project: initialData.project,
          visibility: initialData.visibility,
          categories: initialData.categories,
          toolkits: initialData.toolkits ?? [],
          mcp_servers: initialData.mcp_servers ?? [],
        }
      : {
          name: '',
          description: '',
          content: '',
          project: '',
          visibility: SkillVisibility.PRIVATE,
          categories: [],
          toolkits: [],
          mcp_servers: [],
        },
    mode: 'all',
  })

  const onSubmit = async (data: SkillFormData) => {
    if (initialData) {
      // Update existing skill - PUT request requires full object
      const updateData: SkillUpdateRequest = {
        name: data.name,
        description: data.description,
        content: data.content,
        project: data.project,
        visibility: data.visibility,
        categories: data.categories,
        toolkits: data.toolkits,
        mcp_servers: data.mcp_servers,
      }

      return skillsStore.updateSkill(initialData.id, updateData)
    }
    // Create new skill
    const createData: SkillCreateRequest = {
      name: data.name,
      description: data.description,
      content: data.content,
      project: data.project,
      visibility: data.visibility,
      categories: data.categories,
      toolkits: data.toolkits,
      mcp_servers: data.mcp_servers,
    }

    return skillsStore.createSkill(createData)
  }

  return {
    form,
    onSubmit,
  }
}
