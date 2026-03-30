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

import { useMemo, useState } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import SidebarTags from '@/pages/assistants/components/AssistantDetails/components/sidebar_details/SidebarTags'
import ToolkitsViewList from '@/pages/assistants/components/ToolkitsViewList/ToolkitsViewList'
import SkillAssistantsModal from '@/pages/skills/components/SkillAssistantsModal'
import SkillDetailsActions from '@/pages/skills/components/SkillDetailsActions'
import { getVisibilityLabel } from '@/pages/skills/utils/skillUtils'
import { AssistantToolkit } from '@/types/entity/assistant'
import { Skill } from '@/types/entity/skill'
import { copyToClipboard, getToolkitFromMcpServers, getRootPath } from '@/utils/utils'

interface SkillDetailsProps {
  skill: Skill
  onExport: () => void
  exporting: boolean
  reloadSkill?: () => Promise<void>
}

const SkillDetails = ({ skill, onExport, exporting, reloadSkill }: SkillDetailsProps) => {
  // Get author info from created_by field (matches assistant structure)
  const authorName = skill.created_by?.name ?? skill.created_by?.username ?? 'Unknown'
  const assistantsCount = skill.assistants_count ?? 0
  const canRead = skill.user_abilities?.includes('read') ?? false
  const [showAssistantsModal, setShowAssistantsModal] = useState(false)

  const skillDetailsLink = useMemo(() => {
    return `${getRootPath()}/#/skills/${skill.id}`
  }, [skill.id])

  const displayToolkits = useMemo(() => {
    const baseToolkits: AssistantToolkit[] = skill.toolkits || []

    if (skill.mcp_servers?.length) {
      return [
        ...baseToolkits,
        getToolkitFromMcpServers(skill.mcp_servers, true),
      ] as AssistantToolkit[]
    }

    return baseToolkits
  }, [skill.toolkits, skill.mcp_servers])

  return (
    <div className="flex flex-col max-w-5xl mx-auto py-8">
      {/* Header with profile and actions */}
      <div className="flex justify-between flex-row gap-3 max-view-details-bp:flex-col">
        {/* Profile section */}
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 rounded-xl bg-surface-elevated border border-border-secondary flex items-center justify-center shrink-0">
            <span className="text-3xl">📚</span>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-text-primary">{skill.name}</h1>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>by {authorName}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <SkillDetailsActions
          skill={skill}
          onExport={onExport}
          exporting={exporting}
          reloadSkill={reloadSkill}
        />
      </div>

      {/* Main content with sidebar */}
      <div className="mt-8 flex flex-row gap-9 z-10 max-view-details-bp:flex-col">
        {/* Main content */}
        <div className="flex flex-col gap-6 grow min-w-0 max-view-details-bp:order-2">
          {/* About section */}
          <div>
            <h5 className="font-bold text-sm">About Skill:</h5>
            <p className="mt-2.5 text-sm text-text-tertiary break-words whitespace-pre-wrap">
              {skill.description}
            </p>
          </div>

          {/* Instructions section - matches SystemInstructions style */}
          <div className="flex flex-col bg-surface-base-secondary border border-border-secondary rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-surface-elevated">
              <p className="text-xs">Skill Instructions</p>
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(skill.content, 'Instructions copied to clipboard')}
              >
                <CopySvg />
                Copy
              </Button>
            </div>
            <p className="text-sm p-4 whitespace-pre-wrap w-full">{skill.content}</p>
          </div>
        </div>

        {/* Sidebar */}
        <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
          <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
            <DetailsProperty label="Project" value={skill.project} />
            <DetailsProperty label="Visibility" value={getVisibilityLabel(skill.visibility)} />
            <DetailsCopyField
              label="SKILL ID:"
              value={skill.id}
              className="mt-2 font-semibold"
              notification="Skill ID copied to clipboard"
            />
          </DetailsSidebarSection>

          <DetailsSidebarSection headline="ACCESS LINKS">
            <DetailsCopyField
              label="Link to skill details:"
              value={skillDetailsLink}
              notification="Link to skill copied to clipboard"
            />
          </DetailsSidebarSection>

          {skill.categories && skill.categories.length > 0 && (
            <DetailsSidebarSection headline="CATEGORIES">
              <SidebarTags
                noItemsMessage="No categories assigned"
                items={skill.categories.map((category) => ({
                  value: category,
                }))}
              />
            </DetailsSidebarSection>
          )}

          {displayToolkits.length > 0 && (
            <DetailsSidebarSection headline="REQUIRED TOOLS">
              <ToolkitsViewList toolkits={displayToolkits} className="flex flex-col gap-4" />
            </DetailsSidebarSection>
          )}

          <DetailsSidebarSection headline="STATISTICS">
            <div className="flex flex-col gap-3">
              <div className="flex flex-row items-center gap-2">
                <p className="text-sm text-text-tertiary">Assistants using:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-elevated rounded-lg border border-border-secondary text-sm leading-5">
                  {assistantsCount}
                </div>
              </div>
              {canRead && (
                <Button
                  variant="secondary"
                  onClick={() => setShowAssistantsModal(true)}
                  className="w-full"
                  disabled={assistantsCount === 0}
                >
                  Show Assistants
                </Button>
              )}
            </div>
          </DetailsSidebarSection>
        </DetailsSidebar>
      </div>

      {/* Assistants Modal */}
      <SkillAssistantsModal
        visible={showAssistantsModal}
        onHide={() => setShowAssistantsModal(false)}
        skillId={skill.id}
        skillName={skill.name}
      />
    </div>
  )
}

SkillDetails.displayName = 'SkillDetails'

export default SkillDetails
