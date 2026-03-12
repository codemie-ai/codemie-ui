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

import { FC } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import DetailsSidebar from '@/components/details/DetailsSidebar/DetailsSidebar'
import { MCPConfig } from '@/types/entity/mcp'

import ServerActions from './MCPServerDetails/ServerActions'
import ServerVariables from './MCPServerDetails/ServerVariables'

interface MCPServerDetailsProps {
  server: MCPConfig | null
  onClose: () => void
  onEdit: (server: MCPConfig) => void
  onDelete: (server: MCPConfig) => void
}

interface ServerHeaderProps {
  server: MCPConfig
  onClose: () => void
}

interface ServerDescriptionProps {
  description: string
}

interface ServerCategoriesProps {
  categories: string[]
}

interface ServerMetadataSidebarProps {
  server: MCPConfig
  categoriesCount: number
  variablesCount: number
}

const ServerHeader: FC<ServerHeaderProps> = ({ server, onClose }) => (
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
        {server.logo_url ? (
          <img src={server.logo_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <MCPIconSvg className="w-8 h-8 text-text-quaternary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-text-primary break-words">{server.name}</h2>
      </div>
    </div>
    <button
      onClick={onClose}
      className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center text-text-primary hover:text-text-secondary transition ml-2"
      aria-label="Close details"
    >
      <CrossSvg aria-hidden="true" />
    </button>
  </div>
)

const ServerDescription: FC<ServerDescriptionProps> = ({ description }) => (
  <div>
    <h3 className="text-xs font-semibold text-text-primary mb-2">Description</h3>
    <p className="text-xs text-text-quaternary whitespace-pre-wrap break-words">{description}</p>
  </div>
)

const ServerCategories: FC<ServerCategoriesProps> = ({ categories }) => (
  <div>
    <h3 className="text-xs font-semibold text-text-primary mb-2">Categories</h3>
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <div
          key={category}
          className="bg-surface-base-secondary border border-border-structural rounded-lg px-2 pt-[2px] pb-0 text-xs text-text-primary whitespace-nowrap"
        >
          {category}
        </div>
      ))}
    </div>
  </div>
)

const ServerOverviewSection: FC<{
  categoriesCount: number
  variablesCount: number
  serverId: string
}> = ({ categoriesCount, variablesCount, serverId }) => (
  <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
    <DetailsProperty
      label="Categories"
      value={categoriesCount > 0 ? `${categoriesCount} categories` : 'No categories'}
    />
    <DetailsProperty
      label="Variables"
      value={variablesCount > 0 ? `${variablesCount} variables` : 'No variables'}
    />
    <DetailsCopyField
      label="Server ID"
      value={serverId}
      className="mt-2 uppercase"
      notification="MCP Server ID copied to clipboard"
    />
  </DetailsSidebarSection>
)

const ServerTimestampsSection: FC<{ date?: string; updateDate?: string }> = ({
  date,
  updateDate,
}) => {
  if (!date && !updateDate) return null

  return (
    <DetailsSidebarSection headline="TIMESTAMPS">
      {date && <DetailsProperty label="Created" value={new Date(date).toLocaleString()} />}
      {updateDate && (
        <DetailsProperty label="Updated" value={new Date(updateDate).toLocaleString()} />
      )}
    </DetailsSidebarSection>
  )
}

const ServerStatusSection: FC<{ isActive: boolean }> = ({ isActive }) => (
  <DetailsSidebarSection headline="STATUS">
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${isActive ? 'bg-success-primary' : 'bg-text-quaternary'}`}
      />
      <span className="text-xs text-text-primary capitalize">
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  </DetailsSidebarSection>
)

const ServerUsageSection: FC<{ usageCount: number }> = ({ usageCount }) => {
  if (usageCount <= 0) return null

  return (
    <DetailsSidebarSection headline="USAGE">
      <DetailsProperty label="Usage Count" value={usageCount.toString()} />
    </DetailsSidebarSection>
  )
}

const ServerCreatedBySection: FC<{ createdBy?: { name: string; email: string } }> = ({
  createdBy,
}) => {
  if (!createdBy) return null

  return (
    <DetailsSidebarSection headline="CREATED BY">
      <DetailsProperty label="Name" value={createdBy.name} />
      <DetailsProperty label="Email" value={createdBy.email} />
    </DetailsSidebarSection>
  )
}

const ServerMetadataSidebar: FC<ServerMetadataSidebarProps> = ({
  server,
  categoriesCount,
  variablesCount,
}) => (
  <DetailsSidebar>
    <ServerOverviewSection
      categoriesCount={categoriesCount}
      variablesCount={variablesCount}
      serverId={server.id}
    />
    <ServerTimestampsSection date={server.date} updateDate={server.update_date} />
    <ServerStatusSection isActive={server.is_active} />
    <ServerUsageSection usageCount={server.usage_count} />
    <ServerCreatedBySection createdBy={server.created_by} />
  </DetailsSidebar>
)

const MCPServerDetails: FC<MCPServerDetailsProps> = ({ server, onClose, onEdit, onDelete }) => {
  if (!server) return null

  const variablesCount = server.required_env_vars?.length || 0
  const categoriesCount = server.categories?.length || 0

  return (
    <div className="fixed top-0 right-0 h-full w-[400px] bg-surface-base-primary border-l border-border-structural shadow-block z-50 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6">
        <ServerHeader server={server} onClose={onClose} />

        {server.description && <ServerDescription description={server.description} />}

        {categoriesCount > 0 && <ServerCategories categories={server.categories} />}

        <ServerVariables variables={server.required_env_vars || []} />

        <ServerMetadataSidebar
          server={server}
          categoriesCount={categoriesCount}
          variablesCount={variablesCount}
        />

        <ServerActions server={server} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

export default MCPServerDetails
