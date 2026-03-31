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

import React, { useRef, useState } from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import PlusSVG from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { useSkillForm } from '@/pages/skills/hooks/useSkillForm'
import { goBackSkills } from '@/pages/skills/utils/goBackSkills'
import { downloadSkillExample, parseSkillMarkdownFile } from '@/pages/skills/utils/skillUtils'
import { skillsStore } from '@/store/skills'
import toaster from '@/utils/toaster'

import FormGenAIPopup from './components/FormGenAIPopup'
import SkillForm, { SkillFormRef } from './components/SkillForm'
import SkillsNavigation from './components/SkillsNavigation'

const NewSkillPage: React.FC = () => {
  const router = useVueRouter()
  const formRef = useRef<SkillFormRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [isGenWithAIPopupVisible, setIsGenWithAIPopupVisible] = useState(
    skillsStore.loadShowNewSkillAIPopup()
  )
  const { form, onSubmit } = useSkillForm()
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup()

  const handleBack = () => {
    goBackSkills(router)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.md')) {
      toaster.error('Please select a markdown (.md) file')
      return
    }

    try {
      setImporting(true)
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

      // Don't show toast - data is loaded into form, not yet created
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import skill file'
      toaster.error(message)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleSuccess = () => {
    toaster.success('Skill has been created successfully!')
    goBackSkills(router)
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Skills" description="Browse and manage your knowledge skills">
        <SkillsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        title="Create New Skill"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button type="tertiary" buttonType="button" onClick={downloadSkillExample}>
              Download Example
            </Button>
            <Button
              type="tertiary"
              buttonType="button"
              disabled={importing}
              onClick={handleImportClick}
            >
              {importing ? 'Importing...' : 'Import from File'}
            </Button>
            <Button
              type="magical"
              buttonType="button"
              onClick={() => setIsGenWithAIPopupVisible(true)}
            >
              <AIGenerateSVG /> Generate with AI
            </Button>
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => formRef.current?.submit()}>
              <PlusSVG /> Create Skill
            </Button>
          </div>
        }
      >
        <SkillForm
          ref={formRef}
          form={form}
          onSubmit={onSubmit}
          onSuccess={handleSuccess}
          showNewIntegrationPopup={showNewIntegrationPopup}
        />
      </PageLayout>

      <FormGenAIPopup
        isVisible={isGenWithAIPopupVisible}
        onHide={() => setIsGenWithAIPopupVisible(false)}
        onGenerated={(values) => formRef.current?.addAIGeneratedFields(values)}
      />

      <NewIntegrationPopup
        visible={showNewIntegration}
        credentialType={selectedCredentialType}
        project={selectedProject}
        onHide={hideNewIntegrationPopup}
        onSuccess={onIntegrationSuccess}
      />
    </div>
  )
}

export default NewSkillPage
