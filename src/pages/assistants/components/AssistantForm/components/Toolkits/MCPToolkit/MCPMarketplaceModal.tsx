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
import { useSnapshot } from 'valtio'

import CrossSvg from '@/assets/icons/cross.svg?react'
import SearchSvg from '@/assets/icons/search.svg?react'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Pagination from '@/components/Pagination'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { MCP_PAGINATION_OPTIONS } from '@/constants/mcp'
import { mcpStore } from '@/store/mcp'
import { MCPConfig } from '@/types/entity/mcp'

import MCPMarketplaceCard from './MCPMarketplaceCard'
import { useMarketplaceModal } from './useMarketplaceModal'

interface MCPMarketplaceModalProps {
  visible: boolean
  onHide: () => void
  onSelectConfig: (config: MCPConfig) => void
  existingServerNames: string[]
}

const SearchBar: React.FC<{
  searchInputRef: React.RefObject<HTMLInputElement | null>
  inputValue: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
}> = ({ searchInputRef, inputValue, onSearchChange, onClearSearch }) => (
  <div className="flex-1 relative">
    <SearchSvg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
    <Input
      ref={searchInputRef}
      value={inputValue}
      placeholder="Search MCP servers..."
      onChange={onSearchChange}
      className="pl-10 pr-10"
      aria-label="Search MCP servers"
    />
    {inputValue && (
      <button
        onClick={onClearSearch}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-quaternary hover:text-text-primary transition"
        aria-label="Clear search"
      >
        <CrossSvg className="w-3 h-3" aria-hidden="true" />
      </button>
    )}
  </div>
)

const EmptyState: React.FC<{ searchQuery: string; selectedCategory: string | null }> = ({
  searchQuery,
  selectedCategory,
}) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <p className="text-h2 text-text-primary mb-2">No MCP servers found</p>
    <p className="text-sm text-text-quaternary">
      {searchQuery || selectedCategory
        ? 'Try adjusting your search or filters'
        : 'No MCP servers available in the marketplace'}
    </p>
  </div>
)

const MCPMarketplaceModal: React.FC<MCPMarketplaceModalProps> = ({
  visible,
  onHide,
  onSelectConfig,
  existingServerNames,
}) => {
  const { configs, loading, pagination } = useSnapshot(mcpStore)

  const {
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
  } = useMarketplaceModal(visible, onHide, onSelectConfig, existingServerNames)

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header="Browse MCP Servers"
      hideFooter
      className="w-full max-w-[1200px] h-[80vh] !bg-surface-base-primary"
      bodyClassName="!bg-surface-base-primary"
    >
      <div className="flex flex-col h-full relative">
        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <SearchBar
            searchInputRef={searchInputRef}
            inputValue={inputValue}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
          />

          {/* Category Filter */}
          <div className="w-48">
            <Select
              value={selectedCategory ?? 'all'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              options={categoryOptions}
              placeholder="All Categories"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          )}

          {!loading && configs.length === 0 && (
            <EmptyState searchQuery={searchQuery} selectedCategory={selectedCategory} />
          )}

          {!loading && configs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 mb-[80px]">
              {configs.map((config) => (
                <MCPMarketplaceCard
                  key={config.id}
                  config={config as MCPConfig}
                  onSelect={handleSelectConfig}
                  isSelected={selectedConfig?.id === config.id}
                  isAlreadyAdded={isConfigAlreadyAdded(config as MCPConfig)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Pagination Footer */}
        {pagination.totalPages > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            perPage={pagination.perPage}
            setPage={handlePageChange}
            perPageOptions={MCP_PAGINATION_OPTIONS}
            className="absolute bottom-0 left-0 right-0 bg-surface-base-primary border-t border-border-structural px-6 pt-[20px] pb-[14px]"
          />
        )}
      </div>
    </Popup>
  )
}

export default MCPMarketplaceModal
