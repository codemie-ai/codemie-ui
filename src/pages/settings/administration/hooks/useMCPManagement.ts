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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPConfigRequest } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

/**
 * Custom hook for MCP Management Page
 * Manages state and handlers for MCP server configuration management
 */
export const useMCPManagement = () => {
  const { pagination, configs } = useSnapshot(mcpStore)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'clone'>('add')
  const [editingServer, setEditingServer] = useState<MCPConfig | null>(null)
  const [cloneSource, setCloneSource] = useState<MCPConfig | null>(null)
  // The row whose Clone modal is currently open, so its menu item stays disabled for the
  // whole lifetime of the open draft, preventing a second click from discarding in-progress edits.
  const activeCloneId = useMemo(
    () => (showModal && modalMode === 'clone' ? cloneSource?.id ?? null : null),
    [showModal, modalMode, cloneSource]
  )
  // Synchronous guard against double-dispatch: React state updates from setCloningId
  // are not visible until the next render, so a rapid double-click/double-select on
  // Clone before that render can otherwise fire two concurrent clone requests.
  const [detailsServerId, setDetailsServerId] = useState<string | null>(null)
  // Last-known snapshot of the server shown in the details panel. Falls back to this when
  // the live lookup below misses (pagination/filter/list refresh dropped the config), so the
  // panel keeps showing the server instead of silently vanishing.
  const lastKnownDetailsServerRef = useRef<MCPConfig | null>(null)
  // Derived live from the configs snapshot so list refreshes/updates show up here.
  const liveDetailsServer = detailsServerId
    ? configs.find((config) => config.id === detailsServerId) ?? null
    : null
  if (liveDetailsServer) {
    lastKnownDetailsServerRef.current = liveDetailsServer
  }
  const detailsServer = detailsServerId
    ? liveDetailsServer ?? lastKnownDetailsServerRef.current
    : null

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
    setModalMode('add')
    setShowModal(true)
  }, [])

  const handleEditServer = useCallback((server: MCPConfig) => {
    setEditingServer(server)
    setModalMode('edit')
    setShowModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingServer(null)
    setCloneSource(null)
    setModalMode('add')
  }, [])

  const handleModalSubmit = useCallback(
    async (data: Partial<MCPConfigRequest>) => {
      let response: MCPConfig
      if (modalMode === 'clone' && cloneSource) {
        response = await mcpStore.cloneConfigFromForm(cloneSource.id, data)
      } else if (editingServer) {
        response = await mcpStore.updateConfig(editingServer.id, data)
      } else {
        // Type assertion: form validation ensures required fields are present for creation
        response = await mcpStore.createConfig(data as MCPConfigRequest)
      }

      const placeholderWarning = response.warnings?.find(
        (warning) => warning.code === 'placeholder_value_present'
      )
      if (placeholderWarning) {
        toaster.info(placeholderWarning.message)
      }

      handleModalClose()
    },
    [editingServer, modalMode, cloneSource, handleModalClose]
  )

  // Delete handlers
  const handleDeleteServer = useCallback(async (server: MCPConfig) => {
    await mcpStore.deleteConfig(server.id)
  }, [])

  // Clone handlers
  const handleCloneMenuClick = useCallback((server: MCPConfig) => {
    setCloneSource(server)
    setModalMode('clone')
    setShowModal(true)
  }, [])

  // Details sidebar handlers
  const handleViewDetails = useCallback((server: MCPConfig) => {
    lastKnownDetailsServerRef.current = server
    setDetailsServerId(server.id)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setDetailsServerId(null)
    lastKnownDetailsServerRef.current = null
  }, [])

  const handleEditFromDetails = useCallback(
    (server: MCPConfig) => {
      setDetailsServerId(null)
      lastKnownDetailsServerRef.current = null
      handleEditServer(server)
    },
    [handleEditServer]
  )

  const handleDeleteFromDetails = useCallback(
    async (server: MCPConfig) => {
      setDetailsServerId(null)
      lastKnownDetailsServerRef.current = null
      await handleDeleteServer(server)
    },
    [handleDeleteServer]
  )

  return {
    // State
    showModal,
    modalMode,
    editingServer,
    cloneSource,
    activeCloneId,
    detailsServer,
    // Modal handlers
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    // Delete handlers
    handleDeleteServer,
    // Clone handlers
    handleCloneMenuClick,
    // Details handlers
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  }
}
