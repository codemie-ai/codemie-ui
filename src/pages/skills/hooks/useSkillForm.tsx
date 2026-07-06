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
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { skillValidationSchema } from '@/pages/skills/validation/skillValidation'
import { skillsStore } from '@/store/skills'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import {
  Skill,
  SkillCreateRequest,
  SkillBundlePreview,
  SkillCompanionFile,
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
  enabled_builtin_subagents: string[]
}

export const useSkillForm = (initialData?: Skill) => {
  const [companionFiles, setCompanionFilesState] = useState<SkillCompanionFile[]>([])
  const [bundleFolders, setBundleFoldersState] = useState<string[]>([])
  const [isCompanionFilesLoading, setIsCompanionFilesLoading] = useState(false)
  const [areCompanionFilesDirty, setAreCompanionFilesDirty] = useState(false)

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
          enabled_builtin_subagents: initialData.enabled_builtin_subagents ?? [],
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
          enabled_builtin_subagents: [],
        },
    mode: 'all',
  })

  const { setValue } = form

  const setCompanionFiles = useCallback((files: SkillCompanionFile[]) => {
    setCompanionFilesState(files)
    setAreCompanionFilesDirty(true)
  }, [])

  const setBundleFolders = useCallback((folders: string[]) => {
    setBundleFoldersState(folders)
  }, [])

  const applyBundlePreview = useCallback(
    (bundlePreview: SkillBundlePreview) => {
      setValue('name', bundlePreview.name, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
      setValue('description', bundlePreview.description, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
      setValue('content', bundlePreview.content, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
      setCompanionFilesState(bundlePreview.companion_files ?? [])
      setBundleFoldersState([])
      setAreCompanionFilesDirty(true)
    },
    [setValue]
  )

  useEffect(() => {
    let isActive = true

    const loadCompanionFiles = async () => {
      if (!initialData?.id || !initialData.companion_files?.length) {
        setCompanionFilesState([])
        setBundleFoldersState([])
        setAreCompanionFilesDirty(false)
        return
      }

      try {
        setIsCompanionFilesLoading(true)
        const files = await Promise.all(
          initialData.companion_files.map((file) =>
            skillsStore.getSkillCompanionFileContent(initialData.id, file.path)
          )
        )

        if (!isActive) return

        setCompanionFilesState(files)
        setBundleFoldersState([])
        setAreCompanionFilesDirty(false)
      } catch (error) {
        if (!isActive) return
        setCompanionFilesState([])
      } finally {
        if (isActive) {
          setIsCompanionFilesLoading(false)
        }
      }
    }

    loadCompanionFiles()

    return () => {
      isActive = false
    }
  }, [initialData])

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
        enabled_builtin_subagents: data.enabled_builtin_subagents ?? [],
      }

      if (areCompanionFilesDirty) {
        updateData.companion_files = companionFiles
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
      enabled_builtin_subagents: data.enabled_builtin_subagents ?? [],
      ...(companionFiles.length > 0 ? { companion_files: companionFiles } : {}),
    }

    return skillsStore.createSkill(createData)
  }

  return {
    form,
    onSubmit,
    companionFiles,
    setCompanionFiles,
    bundleFolders,
    setBundleFolders,
    isCompanionFilesLoading,
    applyBundlePreview,
  }
}
