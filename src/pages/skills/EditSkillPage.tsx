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
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import { useSkillDetails } from '@/pages/skills/hooks/useSkillDetails'
import { goBackSkills } from '@/pages/skills/utils/goBackSkills'

import EditSkillForm from './components/EditSkillForm'
import SkillsPageShell from './components/SkillsPageShell'

const EditSkillPage: React.FC = () => {
  const router = useVueRouter()
  const { id } = useParams<{ id: string }>()
  const { skill, loading } = useSkillDetails(id!)

  const handleBack = () => {
    goBackSkills(router)
  }

  if (!loading && skill) {
    return <EditSkillForm skill={skill} onBack={handleBack} />
  }

  return (
    <SkillsPageShell>
      <PageLayout>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-xl font-semibold text-text-primary mb-2">Skill not found</h2>
            <p className="text-sm text-text-secondary">
              The skill you&apos;re looking for doesn&apos;t exist or was deleted.
            </p>
          </div>
        )}
      </PageLayout>
    </SkillsPageShell>
  )
}

export default EditSkillPage
