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

import { type FC } from 'react'

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import DataSourceSvg from '@/assets/icons/datasource.svg?react'
import IntegrationSvg from '@/assets/icons/integration.svg?react'
import SkillsSvg from '@/assets/icons/lightning.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import { useVueRouter } from '@/hooks/useVueRouter'
import { Project } from '@/types/entity/project'

import ResourceCounterBadge from './ResourceCounterBadge'

const TOOLTIPS = {
  ASSISTANTS: 'Project Assistants',
  WORKFLOWS: 'Workflows',
  INTEGRATIONS: 'Integrations',
  DATA_SOURCES: 'Data Sources',
  SKILLS: 'Skills',
}

interface ProjectResourceCountersProps {
  project: Project
}

const ProjectResourceCounters: FC<ProjectResourceCountersProps> = ({ project }) => {
  const router = useVueRouter()
  const c = project.counters

  const buildTo = (routeName: string) => {
    const { path, searchParamsString } = router.resolve({
      name: routeName,
      query: { project: project.name },
    })
    return searchParamsString ? `${path}?${searchParamsString}` : path
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <ResourceCounterBadge
        icon={AssistantSvg}
        count={c?.assistants_count}
        tooltip={TOOLTIPS.ASSISTANTS}
        to={buildTo('assistants-project')}
      />
      <ResourceCounterBadge
        icon={WorkflowSvg}
        count={c?.workflows_count}
        tooltip={TOOLTIPS.WORKFLOWS}
        to={buildTo('workflows-all')}
      />
      <ResourceCounterBadge
        icon={IntegrationSvg}
        count={c?.integrations_count}
        tooltip={TOOLTIPS.INTEGRATIONS}
        to={buildTo('integrations')}
      />
      <ResourceCounterBadge
        icon={DataSourceSvg}
        count={c?.datasources_count}
        tooltip={TOOLTIPS.DATA_SOURCES}
        to={buildTo('data-sources')}
      />
      <ResourceCounterBadge
        icon={SkillsSvg}
        count={c?.skills_count}
        tooltip={TOOLTIPS.SKILLS}
        to={buildTo('skills-project')}
      />
    </div>
  )
}

export default ProjectResourceCounters
