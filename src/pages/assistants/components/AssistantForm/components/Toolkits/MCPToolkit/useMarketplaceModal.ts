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

import debounce from 'lodash/debounce'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { MCP_SEARCH_DEBOUNCE_MS, MCP_MARKETPLACE_PER_PAGE } from '@/constants/mcp'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCP_CATEGORY_OPTIONS } from '@/types/entity/mcp'

export const useMarketplaceModal = (
  visible: boolean,
  onHide: () => void,
  onSelectConfig: (config: MCPConfig) => void,
  existingServerNames: string[]
) => {
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<MCPConfig | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Build category options
  const categoryOptions = useMemo(
    () => [{ label: 'All Categories', value: 'all' }, ...MCP_CATEGORY_OPTIONS],
    []
  )

  // Handle modal close
  const handleClose = useCallback(() => {
    setInputValue('')
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedConfig(null)
    onHide()
  }, [onHide])

  // Focus on search input when modal opens
  useFocusOnVisible(searchInputRef as React.RefObject<HTMLElement>, visible)

  // Keyboard navigation - ESC to close
  useEscapeKey(handleClose, visible)

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setSearchQuery(query)
      }, MCP_SEARCH_DEBOUNCE_MS),
    []
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Fetch configs when modal opens or filters change
  useEffect(() => {
    if (!visible) return

    const filters: any = {
      is_public: true,
      active_only: true,
    }
    if (searchQuery) filters.search = searchQuery
    if (selectedCategory && selectedCategory !== 'all') {
      filters.category = selectedCategory
    }

    // Reset to first page when filters change, use store's perPage
    mcpStore.indexConfigs(filters, 0, MCP_MARKETPLACE_PER_PAGE).catch((error) => {
      console.error('Failed to fetch MCP configs:', error)
    })
  }, [visible, searchQuery, selectedCategory])

  // Event handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target
      setInputValue(value)
      debouncedSearch(value)
    },
    [debouncedSearch]
  )

  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setSearchQuery('')
    debouncedSearch('')
  }, [debouncedSearch])

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value === 'all' ? null : value)
  }, [])

  const handleSelectConfig = useCallback(
    (config: MCPConfig) => {
      setSelectedConfig(config)
      onSelectConfig(config)
      handleClose()
    },
    [onSelectConfig, handleClose]
  )

  const handlePageChange = useCallback(
    (newPage: number, newPerPage?: number) => {
      const filters: any = {
        is_public: true,
        active_only: true,
      }
      if (searchQuery) filters.search = searchQuery
      if (selectedCategory && selectedCategory !== 'all') {
        filters.category = selectedCategory
      }

      // Call store to fetch with new page/perPage
      mcpStore
        .indexConfigs(filters, newPage, newPerPage ?? MCP_MARKETPLACE_PER_PAGE)
        .catch((error) => {
          console.error('Failed to fetch MCP configs:', error)
        })
    },
    [searchQuery, selectedCategory]
  )

  const isConfigAlreadyAdded = useCallback(
    (config: MCPConfig) => {
      return existingServerNames.includes(config.name)
    },
    [existingServerNames]
  )

  return {
    searchInputRef,
    inputValue,
    searchQuery,
    selectedCategory,
    selectedConfig,
    categoryOptions,
    handleClose,
    handleSearchChange,
    handleClearSearch,
    handleCategoryChange,
    handleSelectConfig,
    handlePageChange,
    isConfigAlreadyAdded,
  }
}
