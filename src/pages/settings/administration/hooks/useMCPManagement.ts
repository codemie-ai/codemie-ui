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

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { collectCopyValuePaths } from '@/pages/settings/administration/components/MCPCopyValuesDialog/useMCPCopyValuesDialog'
import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPConfigRequest } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

/**
 * Returns true when a server's config has any values that could be copied.
 * Delegates to collectCopyValuePaths so this always agrees with what the
 * copy-values dialog would actually offer - a truthy `url` with no query
 * params, or one that fails to parse, must not count as copyable.
 */
const hasCopyableValues = (server: MCPConfig): boolean => collectCopyValuePaths(server).length > 0

/**
 * Custom hook for MCP Management Page
 * Manages state and handlers for MCP server configuration management
 */
export const useMCPManagement = () => {
  const { pagination } = useSnapshot(mcpStore)
  const [showModal, setShowModal] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPConfig | null>(null)
  const [detailsServer, setDetailsServer] = useState<MCPConfig | null>(null)
  const [cloneDialogServer, setCloneDialogServer] = useState<MCPConfig | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [strippedFields, setStrippedFields] = useState<string[]>([])
  // Synchronous guard against double-dispatch: React state updates from setCloningId
  // are not visible until the next render, so a rapid double-click/double-select on
  // Clone before that render can otherwise fire two concurrent clone requests.
  const cloningRef = useRef<string | null>(null)

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
    setStrippedFields([])
    setShowModal(true)
  }, [])

  const handleEditServer = useCallback((server: MCPConfig) => {
    setEditingServer(server)
    setStrippedFields([])
    setShowModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingServer(null)
    setStrippedFields([])
  }, [])

  const handleModalSubmit = useCallback(
    async (data: Partial<MCPConfigRequest>) => {
      let response: MCPConfig
      if (editingServer) {
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
    [editingServer, handleModalClose]
  )

  // Delete handlers
  const handleDeleteServer = useCallback(async (server: MCPConfig) => {
    await mcpStore.deleteConfig(server.id)
  }, [])

  // Clone handlers
  const runClone = useCallback(async (server: MCPConfig, copyValues?: string[]) => {
    // Guard against double-dispatch: cloningRef is set synchronously, unlike the
    // cloningId state update that drives the UI's disabled rendering.
    if (cloningRef.current === server.id) return
    cloningRef.current = server.id
    setCloningId(server.id)
    try {
      const response = await mcpStore.cloneConfig(server.id, copyValues)

      const placeholderWarning = response.warnings?.find(
        (warning) => warning.code === 'placeholder_value_present'
      )
      if (placeholderWarning) {
        toaster.info(placeholderWarning.message)
      }

      setStrippedFields(response.stripped_fields ?? [])
      setEditingServer(response)
      setShowModal(true)
    } catch (error: any) {
      toaster.error(error?.response?.data?.message ?? error?.message)
    } finally {
      setCloningId(null)
      cloningRef.current = null
    }
  }, [])

  const handleCloneServer = useCallback(
    (server: MCPConfig) => {
      if (cloningRef.current) return
      if (!hasCopyableValues(server)) {
        runClone(server).catch((error) => {
          console.error('Failed to clone MCP server:', error)
        })
        return
      }
      setCloneDialogServer(server)
    },
    [runClone]
  )

  const handleConfirmClone = useCallback(
    async (copyValues: string[]) => {
      if (!cloneDialogServer || cloningRef.current) return
      const server = cloneDialogServer
      await runClone(server, copyValues)
      setCloneDialogServer(null)
    },
    [cloneDialogServer, runClone]
  )

  const handleCloneDialogClose = useCallback(() => {
    setCloneDialogServer(null)
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
    cloneDialogServer,
    cloningId,
    strippedFields,
    // Modal handlers
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    // Delete handlers
    handleDeleteServer,
    // Clone handlers
    handleCloneServer,
    handleConfirmClone,
    handleCloneDialogClose,
    // Details handlers
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  }
}
