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

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router'

import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { useSkillDetails } from '@/pages/skills/hooks/useSkillDetails'
import { downloadSkillAsMarkdown } from '@/pages/skills/utils/skillUtils'
import { skillsStore } from '@/store/skills'
import toaster from '@/utils/toaster'

import SkillDetails from './components/SkillDetails'
import SkillsNavigation from './components/SkillsNavigation'

const SkillDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { skill, loading, error } = useSkillDetails(id!)
  const [exporting, setExporting] = useState(false)

  const handleBack = () => {
    navigate(-1)
  }

  const handleExport = async () => {
    if (!skill) return

    try {
      setExporting(true)
      const blob = await skillsStore.exportSkill(skill.id)
      const content = await blob.text()
      downloadSkillAsMarkdown(skill, content)
    } catch (err) {
      console.error('Error exporting skill:', err)
      toaster.error('Failed to export skill')
    } finally {
      setExporting(false)
    }
  }

  const loadSkill = async (skillId: string) => {
    try {
      await skillsStore.getSkillById(skillId)
    } catch (err) {
      console.error('Error loading skill:', err)
    }
  }

  const handleReload = async () => {
    if (id) {
      await loadSkill(id)
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        title="Skills"
        description="Create and manage reusable knowledge for your assistants"
      >
        <SkillsNavigation />
      </Sidebar>

      <PageLayout title="Skill Details" onBack={handleBack}>
        {loading && (
          <div className="flex justify-center m-40">
            <Spinner />
          </div>
        )}

        {!loading && (error || !skill) && (
          <div className="flex flex-col items-center justify-center m-40">
            <h2 className="text-xl font-semibold text-text-primary mb-2">Skill not found</h2>
            <p className="text-sm text-text-secondary">
              The skill you&apos;re looking for doesn&apos;t exist or was deleted.
            </p>
          </div>
        )}

        {!loading && skill && (
          <SkillDetails
            skill={skill}
            onExport={handleExport}
            exporting={exporting}
            reloadSkill={handleReload}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default SkillDetailsPage
