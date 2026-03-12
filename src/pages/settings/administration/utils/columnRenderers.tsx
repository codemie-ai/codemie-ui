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

import { MCPConfig } from '@/types/entity/mcp'

import MCPServerActions from '../components/MCPServerActions'

interface ColumnRenderersProps {
  handleEditServer: (server: MCPConfig) => void
  handleDeleteServer: (server: MCPConfig) => void
  handleViewDetails: (server: MCPConfig) => void
}

export const createColumnRenderers = ({
  handleEditServer,
  handleDeleteServer,
  handleViewDetails,
}: ColumnRenderersProps) => ({
  name: (item: MCPConfig) => (
    <button
      onClick={() => handleViewDetails(item)}
      className="text-left text-text-primary hover:text-electric-main transition-colors cursor-pointer font-medium"
    >
      {item.name}
    </button>
  ),

  categories: (item: MCPConfig) => (
    <div className="flex flex-wrap gap-1">
      {item.categories?.map((cat) => (
        <span
          key={cat}
          className="px-2 py-1 rounded text-xs bg-in-progress-tertiary text-in-progress-primary border border-in-progress-secondary"
        >
          {cat}
        </span>
      ))}
    </div>
  ),

  description: (item: MCPConfig) => (
    <span className="text-text-quaternary line-clamp-2">{item.description || '-'}</span>
  ),

  is_public: (item: MCPConfig) => (
    <span
      className={`px-2 py-1 rounded text-xs border ${
        item.is_public
          ? 'bg-interrupted-tertiary text-interrupted-primary border-interrupted-secondary'
          : 'bg-not-started-quaternary text-not-started-primary border-border-subtle'
      }`}
    >
      {item.is_public ? 'Public' : 'Private'}
    </span>
  ),

  is_active: (item: MCPConfig) => (
    <span
      className={`px-2 py-1 rounded text-xs border ${
        item.is_active
          ? 'bg-success-secondary text-success-primary border-success-primary'
          : 'bg-not-started-quaternary text-not-started-primary border-border-subtle'
      }`}
    >
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  ),

  actions: (item: MCPConfig) => (
    <MCPServerActions
      server={item}
      onEdit={handleEditServer}
      onDelete={handleDeleteServer}
      onViewDetails={handleViewDetails}
    />
  ),
})
