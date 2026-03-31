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

import React, { useRef } from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { useSkillForm } from '@/pages/skills/hooks/useSkillForm'
import { goBackSkills } from '@/pages/skills/utils/goBackSkills'
import { Skill } from '@/types/entity/skill'
import toaster from '@/utils/toaster'

import SkillForm, { SkillFormRef } from './SkillForm'
import SkillsNavigation from './SkillsNavigation'

interface EditSkillFormProps {
  skill: Skill
  onBack: () => void
}

const EditSkillForm: React.FC<EditSkillFormProps> = ({ skill, onBack }) => {
  const router = useVueRouter()
  const formRef = useRef<SkillFormRef>(null)
  const { form, onSubmit } = useSkillForm(skill)
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup()

  const handleSuccess = () => {
    toaster.success('Skill has been updated successfully!')
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
        title={`Edit Skill`}
        onBack={onBack}
        rightContent={
          <div className="flex gap-4">
            <Button
              type="magical"
              buttonType="button"
              onClick={() => formRef.current?.handleRefineWithAI()}
            >
              <AIGenerateSVG /> Refine with AI
            </Button>
            <Button type="secondary" onClick={onBack}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => formRef.current?.submit()}>
              Update Skill
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

export default EditSkillForm
