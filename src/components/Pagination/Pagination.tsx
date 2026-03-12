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

import { DropdownChangeEvent } from 'primereact/dropdown'
import React, { useState, useEffect, useMemo, useCallback } from 'react'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import contentGradient from '@/assets/images/content-gradient.png'
import Select from '@/components/form/Select/Select'
import { DEFAULT_PAGINATION_OPTIONS } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

export interface PaginationProps {
  className?: string
  currentPage: number
  totalPages: number
  setPage: (_page: number, _perPage?: number) => void
  perPage?: number
  perPageOptions?: Array<{ value: string; label: string }>
  responsive?: boolean
}

const Pagination: React.FC<PaginationProps> = ({
  className = '',
  currentPage,
  totalPages,
  setPage,
  perPage,
  perPageOptions,
  responsive = false,
}) => {
  const { isDark } = useTheme()
  const [currentPerPage, setCurrentPerPage] = useState<number | undefined>(perPage)
  const [span, setSpan] = useState<number>(7)

  useEffect(() => {
    setCurrentPerPage(perPage)
  }, [perPage])

  useEffect(() => {
    if (!responsive) return

    // For responsive mode, use a smaller default span
    setSpan(2)
  }, [responsive])

  const pageNumbers = useMemo(() => {
    const numbers = Array.from({ length: totalPages }, (_, i) => i)
    const minPage = Math.max(0, currentPage - span)
    const maxPage = Math.min(totalPages, currentPage + span)
    return numbers.slice(minPage, maxPage)
  }, [currentPage, totalPages, span])

  const hasFirstPage = pageNumbers.includes(0)
  const hasLastPage = pageNumbers.includes(totalPages - 1)
  const showFirstPageSpread = !hasFirstPage && !pageNumbers.includes(1)
  const showLastPageSpread = !hasLastPage && !pageNumbers.includes(totalPages - 2)
  const isActivePage = (page: number) => page === currentPage

  const options = perPageOptions || DEFAULT_PAGINATION_OPTIONS

  const handlePerPageChange = (e: DropdownChangeEvent) => {
    const newPerPage = parseInt(e.value, 10)
    setCurrentPerPage(newPerPage)
    setPage(0, newPerPage)
  }

  const buttonClasses = useCallback(
    (isActive: boolean = false) =>
      [
        'px-2 flex justify-center items-center',
        'text-text-accent text-h5 bg-surface-base-secondary',
        'rounded-lg border transition-colors select-none',
        'hover:!border-border-accent',
        isActive
          ? 'border-border-accent !bg-surface-specific-pagination-active'
          : 'border-border-structural cursor-pointer',
      ].join(' '),
    []
  )

  return (
    <div
      className={cn(
        'flex items-center text-sm gap-2 border-t-1 border-border-structural bg-surface-base-primary bg-no-repeat bg-right-bottom',
        responsive && 'flex-wrap',
        className
      )}
      style={{
        backgroundImage: !isDark ? `url(${contentGradient})` : 'none',
      }}
    >
      {pageNumbers.length > 1 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-text-quaternary text-h5 flex-shrink-0">Page: </div>
          <div className="flex gap-[4px] items-stretch h-[32px]">
            {currentPage !== 0 && (
              <span
                className={buttonClasses()}
                onClick={() => setPage(currentPage - 1, currentPerPage)}
              >
                <ChevronLeftSvg />
              </span>
            )}

            {!hasFirstPage && (
              <span className={buttonClasses()} onClick={() => setPage(0, currentPerPage)}>
                1
              </span>
            )}

            {showFirstPageSpread && (
              <span className="text-text-primary text-h5 select-none leading-[32px]">...</span>
            )}

            {pageNumbers.map((page) => (
              <span
                key={page}
                className={buttonClasses(isActivePage(page))}
                onClick={() => setPage(page, currentPerPage)}
              >
                {page + 1}
              </span>
            ))}

            {showLastPageSpread && (
              <span className="text-text-primary text-h5 select-none leading-[32px]">...</span>
            )}

            {!hasLastPage && (
              <span
                className={buttonClasses()}
                onClick={() => setPage(totalPages - 1, currentPerPage)}
              >
                {totalPages}
              </span>
            )}

            {currentPage !== totalPages - 1 && (
              <span
                className={buttonClasses()}
                onClick={() => setPage(currentPage + 1, currentPerPage)}
              >
                <ChevronRightSvg />
              </span>
            )}
          </div>
        </div>
      )}

      {perPage && (
        <div className={cn('flex items-center justify-center ml-auto flex-shrink-0')}>
          <div className="text-text-quaternary text-h5 mr-3.5 flex-shrink-0">Show:</div>
          <Select
            id="per-page"
            name="perPage"
            options={options}
            placeholder="Per Page"
            value={currentPerPage?.toString()}
            className="!w-33 !border-border-tertiary"
            classNameValue="!text-text-accent"
            onChange={handlePerPageChange}
          />
        </div>
      )}
    </div>
  )
}

export default Pagination
