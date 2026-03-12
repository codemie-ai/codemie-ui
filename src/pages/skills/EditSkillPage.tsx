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

import React from 'react'
import { useParams } from 'react-router'

import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import { useSkillDetails } from '@/pages/skills/hooks/useSkillDetails'
import { goBackSkills } from '@/pages/skills/utils/goBackSkills'

import EditSkillForm from './components/EditSkillForm'
import SkillsNavigation from './components/SkillsNavigation'

const EditSkillPage: React.FC = () => {
  const router = useVueRouter()
  const { id } = useParams<{ id: string }>()
  const { skill, loading, error } = useSkillDetails(id!)

  const handleBack = () => {
    goBackSkills(router)
  }

  if (loading) {
    return (
      <div className="flex h-full">
        <Sidebar title="Skills" description="Browse and manage your knowledge skills">
          <SkillsNavigation />
        </Sidebar>
        <PageLayout>
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        </PageLayout>
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div className="flex h-full">
        <Sidebar title="Skills" description="Browse and manage your knowledge skills">
          <SkillsNavigation />
        </Sidebar>
        <PageLayout>
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-xl font-semibold text-text-primary mb-2">Skill not found</h2>
            <p className="text-sm text-text-secondary">
              The skill you&apos;re looking for doesn&apos;t exist or was deleted.
            </p>
          </div>
        </PageLayout>
      </div>
    )
  }

  return <EditSkillForm skill={skill} onBack={handleBack} />
}

export default EditSkillPage
