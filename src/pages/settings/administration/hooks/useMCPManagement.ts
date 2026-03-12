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

import { useState, useEffect, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPConfigRequest } from '@/types/entity/mcp'

/**
 * Custom hook for MCP Management Page
 * Manages state and handlers for MCP server configuration management
 */
export const useMCPManagement = () => {
  const { pagination } = useSnapshot(mcpStore)
  const [showModal, setShowModal] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPConfig | null>(null)
  const [detailsServer, setDetailsServer] = useState<MCPConfig | null>(null)

  // Load configs on mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        await mcpStore.indexConfigs({}, pagination.page, pagination.perPage)
      } catch (error) {
        console.error('Failed to load MCP configurations:', error)
      }
    }

    // Call async function - errors are handled within
    // noinspection JSIgnoredPromiseFromCall
    loadConfigs()
  }, [])

  // Modal handlers
  const handleAddMCPServer = useCallback(() => {
    setEditingServer(null)
    setShowModal(true)
  }, [])

  const handleEditServer = useCallback((server: MCPConfig) => {
    setEditingServer(server)
    setShowModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingServer(null)
  }, [])

  const handleModalSubmit = useCallback(
    async (data: Partial<MCPConfigRequest>) => {
      if (editingServer) {
        await mcpStore.updateConfig(editingServer.id, data)
      } else {
        // Type assertion: form validation ensures required fields are present for creation
        await mcpStore.createConfig(data as MCPConfigRequest)
      }
      handleModalClose()
    },
    [editingServer, handleModalClose]
  )

  // Delete handlers
  const handleDeleteServer = useCallback(async (server: MCPConfig) => {
    await mcpStore.deleteConfig(server.id)
  }, [])

  // Details sidebar handlers
  const handleViewDetails = useCallback((server: MCPConfig) => {
    setDetailsServer(server)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setDetailsServer(null)
  }, [])

  const handleEditFromDetails = useCallback(
    (server: MCPConfig) => {
      setDetailsServer(null)
      handleEditServer(server)
    },
    [handleEditServer]
  )

  const handleDeleteFromDetails = useCallback(
    async (server: MCPConfig) => {
      setDetailsServer(null)
      await handleDeleteServer(server)
    },
    [handleDeleteServer]
  )

  return {
    // State
    showModal,
    editingServer,
    detailsServer,
    // Modal handlers
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    // Delete handlers
    handleDeleteServer,
    // Details handlers
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  }
}
