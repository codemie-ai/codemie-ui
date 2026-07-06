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

import React, { FC, useEffect, useRef, useState } from 'react'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import SkillForm, { SkillFormRef } from '@/pages/skills/components/SkillForm'
import { SkillFormData, useSkillForm } from '@/pages/skills/hooks/useSkillForm'
import { downloadSkillExample, parseSkillMarkdownFile } from '@/pages/skills/utils/skillUtils'
import { skillsStore } from '@/store/skills'
import { Skill, SkillVisibility } from '@/types/entity/skill'
import toaster from '@/utils/toaster'

interface CreateSkillPopupProps {
  visible: boolean
  onClose: () => void
  onSuccess: (skill: Skill) => void
  defaultProject?: string
}

const CreateSkillPopup: FC<CreateSkillPopupProps> = ({
  visible,
  onClose,
  onSuccess,
  defaultProject,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isFormReady, setIsFormReady] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const formRef = useRef<SkillFormRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createdSkillRef = useRef<Skill | null>(null)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const {
    form,
    onSubmit,
    companionFiles,
    setCompanionFiles,
    bundleFolders,
    setBundleFolders,
    isCompanionFilesLoading,
    applyBundlePreview,
  } = useSkillForm()
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup()

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    if (visible) {
      setIsFormReady(false)
      form.reset({
        name: '',
        description: '',
        content: '',
        project: defaultProject ?? '',
        visibility: SkillVisibility.PRIVATE,
        categories: [],
        toolkits: [],
        mcp_servers: [],
        enabled_builtin_subagents: [],
      })
      setCompanionFiles([])
      setBundleFolders([])
      // Increment key to force remount and wait for next tick
      setFormKey((prev) => prev + 1)
      timeoutId = setTimeout(() => setIsFormReady(true), 0)
    } else {
      setIsFormReady(false)
    }
    return () => clearTimeout(timeoutId)
  }, [visible, defaultProject, form])

  const handleCancel = () => {
    form.reset({
      name: '',
      description: '',
      content: '',
      project: defaultProject ?? '',
      visibility: SkillVisibility.PRIVATE,
      categories: [],
      toolkits: [],
      mcp_servers: [],
      enabled_builtin_subagents: [],
    })
    setCompanionFiles([])
    setBundleFolders([])
    onClose()
  }

  const handleSubmitClick = () => {
    formRef.current?.submit()
  }

  const handleFormSubmit = async (data: SkillFormData): Promise<Skill> => {
    setIsSubmitting(true)
    try {
      const skill = await onSubmit(data)
      createdSkillRef.current = skill
      return skill
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSuccess = () => {
    const skill = createdSkillRef.current
    createdSkillRef.current = null
    form.reset({
      name: '',
      description: '',
      content: '',
      project: defaultProject ?? '',
      visibility: SkillVisibility.PRIVATE,
      categories: [],
      toolkits: [],
      mcp_servers: [],
      enabled_builtin_subagents: [],
    })
    setCompanionFiles([])
    setBundleFolders([])
    if (skill) {
      onSuccessRef.current(skill)
    }
    onClose()
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.md') && !file.name.endsWith('.zip')) {
      toaster.error('Please select a markdown (.md) file or a bundle (.zip) archive')
      return
    }

    try {
      setImporting(true)

      if (file.name.endsWith('.zip')) {
        const bundlePreview = await skillsStore.importSkillBundlePreview(file)
        applyBundlePreview(bundlePreview)
        return
      }

      const { name, description, content } = await parseSkillMarkdownFile(file)
      form.setValue('name', name, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
      form.setValue('description', description, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
      form.setValue('content', content, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
      setCompanionFiles([])
      setBundleFolders([])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import skill file'
      toaster.error(message)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <h4 className="text-base font-semibold mb-0">Create New Skill</h4>
      <div className="flex items-center gap-2">
        <Button variant="tertiary" size="small" onClick={downloadSkillExample}>
          Download Example
        </Button>
        <Button variant="tertiary" size="small" disabled={importing} onClick={handleImportClick}>
          {importing ? 'Importing...' : 'Import File or Bundle'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Popup
        hideFooter
        visible={visible}
        onHide={handleCancel}
        className="h-auto w-[600px]"
        bodyClassName="show-scroll overflow-y-auto"
        headerContent={headerContent}
        dismissableMask={false}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.zip"
          onChange={handleImportFile}
          className="hidden"
        />

        {isFormReady && (
          <>
            <SkillForm
              key={formKey}
              ref={formRef}
              form={form}
              onSubmit={handleFormSubmit}
              companionFiles={companionFiles}
              bundleFolders={bundleFolders}
              isCompanionFilesLoading={isCompanionFilesLoading}
              onCompanionFilesChange={setCompanionFiles}
              onBundleFoldersChange={setBundleFolders}
              onSuccess={handleFormSuccess}
              showNewIntegrationPopup={showNewIntegrationPopup}
              isCompactView
            />

            <div className="flex gap-4 py-4 justify-end">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" disabled={isSubmitting} onClick={handleSubmitClick}>
                <PlusSvg />
                Create Skill
              </Button>
            </div>
          </>
        )}

        {!isFormReady && visible && (
          <div className="flex items-center justify-center p-10">
            <div className="text-text-tertiary">Loading...</div>
          </div>
        )}
      </Popup>

      <NewIntegrationPopup
        visible={showNewIntegration}
        credentialType={selectedCredentialType}
        project={selectedProject}
        onHide={hideNewIntegrationPopup}
        onSuccess={onIntegrationSuccess}
      />
    </>
  )
}

export default CreateSkillPopup
