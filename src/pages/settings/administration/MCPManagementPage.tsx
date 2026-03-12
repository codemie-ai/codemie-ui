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

import { FC, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import Table from '@/components/Table'
import { ButtonSize } from '@/constants'
import { MCP_PAGINATION_OPTIONS } from '@/constants/mcp'
import { useMcpEnabled } from '@/hooks/useFeatureFlags'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { mcpStore } from '@/store/mcp'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import MCPServerDetails from './components/MCPServerDetails'
import MCPServerModal from './components/MCPServerModal'
import { useMCPManagement } from './hooks/useMCPManagement'
import { createColumnRenderers } from './utils/columnRenderers'

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'name',
    label: 'Name',
    type: DefinitionTypes.Custom,
    sortable: true,
    headClassNames: 'w-[25%]',
  },
  {
    key: 'categories',
    label: 'Categories',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[20%]',
  },
  {
    key: 'description',
    label: 'Description',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[30%]',
  },
  {
    key: 'is_public',
    label: 'Visibility',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[10%]',
  },
  { key: 'is_active', label: 'Status', type: DefinitionTypes.Custom, headClassNames: 'w-[10%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[5%]' },
]

const MCPManagementPage: FC = () => {
  const navigate = useNavigate()
  const { configs, pagination, loading } = useSnapshot(mcpStore) as typeof mcpStore
  const [isMcpFeatureEnabled, isConfigLoaded] = useMcpEnabled()

  useEffect(() => {
    if (isConfigLoaded && !isMcpFeatureEnabled) {
      navigate('/settings/administration', { replace: true })
    }
  }, [isMcpFeatureEnabled, isConfigLoaded, navigate])

  const {
    showModal,
    editingServer,
    detailsServer,
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    handleDeleteServer,
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  } = useMCPManagement()

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      const promise = mcpStore.indexConfigs({}, page, newPerPage ?? pagination.perPage)
      promise.catch((error) => {
        console.error('Failed to load MCP configs:', error)
      })
    },
    [pagination.perPage]
  )

  // Wrap async handlers to ensure void return type
  const handleDeleteServerWrapper = useCallback(
    (server: (typeof configs)[0]) => {
      const promise = handleDeleteServer(server)
      promise.catch((error) => {
        console.error('Failed to delete MCP server:', error)
      })
    },
    [handleDeleteServer]
  )

  const customRenderColumns = useMemo(
    () =>
      createColumnRenderers({
        handleEditServer,
        handleDeleteServer: handleDeleteServerWrapper,
        handleViewDetails,
      }),
    [handleEditServer, handleDeleteServerWrapper, handleViewDetails]
  )

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={handleAddMCPServer} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Add MCP Server
      </Button>
    ),
    [handleAddMCPServer]
  )

  // Wait for config to load before making decisions
  if (!isConfigLoaded) {
    return null
  }

  if (!isMcpFeatureEnabled) {
    return null
  }

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full pt-6">
        <Table
          items={configs}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
          }}
          onPaginationChange={handlePageChange}
          perPageOptions={MCP_PAGINATION_OPTIONS}
        />

        {/* Modal */}
        <MCPServerModal
          visible={showModal}
          server={editingServer}
          onHide={handleModalClose}
          onSubmit={handleModalSubmit}
        />

        {/* Details Sidebar */}
        {detailsServer && (
          <MCPServerDetails
            server={detailsServer}
            onClose={handleCloseDetails}
            onEdit={handleEditFromDetails}
            onDelete={handleDeleteFromDetails}
          />
        )}
      </div>
    )
  }

  return (
    <SettingsLayout
      contentTitle="MCPs catalog management"
      content={renderContent()}
      rightContent={renderHeaderActions}
    />
  )
}

export default MCPManagementPage
