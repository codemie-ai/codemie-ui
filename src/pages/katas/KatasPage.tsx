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

import { classNames as cn } from 'primereact/utils'
import { useMemo, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Pagination from '@/components/Pagination'
import Sidebar from '@/components/Sidebar'
import { ButtonSize } from '@/constants'
import { MetricEvent } from '@/constants/metrics'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { useVueRouter } from '@/hooks/useVueRouter'
import { katasStore } from '@/store/katas'
import { metricsStore } from '@/store/metrics'
import { userStore } from '@/store/user'
import { clearUrlFilters } from '@/utils/filters'

import KataFilters from './components/KataFilters'
import KatasContent from './components/KatasContent'
import KatasNavigation from './components/KatasNavigation'
import { useKataFilters } from './hooks/useKataFilters'
import { useKatasList } from './hooks/useKatasList'

export enum KatasCategory {
  ALL_KATAS = 'all-katas',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  LEADERBOARD = 'leaderboard',
}

interface KatasPageProps {
  category?: KatasCategory
}

const KatasPage = ({ category = KatasCategory.ALL_KATAS }: KatasPageProps) => {
  const router = useVueRouter()
  const activeCategory =
    category ??
    (router.currentRoute.value.params.category as KatasCategory) ??
    KatasCategory.ALL_KATAS
  const { filters, handleFilterChange } = useKataFilters()
  const { katas } = useSnapshot(katasStore)
  const { user } = useSnapshot(userStore)
  const isAdmin = user?.isAdmin ?? false
  const { loadKatasList, currentPage, perPage, totalPages, totalCount } = useKatasList({
    filterValues: filters,
  })
  const isInitialMountRef = useRef(true)
  const paginationOffset = useSidebarOffsetClass()

  const handleCreateKata = () => {
    router.push({ path: '/katas/new' })
  }

  const reloadKatas = () => {
    loadKatasList({ page: currentPage }, false)
  }

  const handlePageChange = (page: number, perPage?: number) => {
    loadKatasList({ page, perPage }, false)
  }

  const headerActions = useMemo(() => {
    if (activeCategory === KatasCategory.ALL_KATAS && isAdmin) {
      return (
        <Button type="primary" onClick={handleCreateKata} size={ButtonSize.MEDIUM}>
          <PlusIcon />
          Create Kata
        </Button>
      )
    }
    // Return empty div to maintain consistent spacing for pages without actions
    return <div />
  }, [activeCategory, isAdmin])

  // Memoize filters key to avoid recreating on every render
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  // Track metric when AI Katas page is opened or category changes
  useEffect(() => {
    const metricName = (() => {
      switch (activeCategory) {
        case KatasCategory.ALL_KATAS:
          return MetricEvent.AI_KATAS_ALL_VIEW
        case KatasCategory.IN_PROGRESS:
          return MetricEvent.AI_KATAS_IN_PROGRESS_VIEW
        case KatasCategory.COMPLETED:
          return MetricEvent.AI_KATAS_COMPLETED_VIEW
        case KatasCategory.LEADERBOARD:
          return MetricEvent.AI_KATAS_LEADERBOARD_VIEW
        default:
          return MetricEvent.AI_KATAS_PAGE_VIEW
      }
    })()

    metricsStore.trackMetric(metricName, {
      category: activeCategory,
      has_filters:
        activeCategory === KatasCategory.ALL_KATAS ? Object.keys(filters).length > 0 : false,
    })
  }, [activeCategory])

  // Load katas when filters or category change
  useEffect(() => {
    if (activeCategory === KatasCategory.ALL_KATAS) {
      const isInitialLoad = isInitialMountRef.current

      if (isInitialLoad) {
        isInitialMountRef.current = false
      }

      loadKatasList({ page: 1 }, isInitialLoad)
    }
    // loadKatasList is intentionally omitted to prevent infinite loop
    // It depends on filterValues which changes on every render
    // eslint-disable-next-line
  }, [filtersKey, activeCategory])

  // Cleanup: Clear URL filters when navigating away from Katas page
  useEffect(() => {
    return () => {
      // Only clear if we're actually navigating away from katas routes
      const currentPath = window.location.hash
      if (!currentPath.includes('/katas')) {
        clearUrlFilters()
      }
    }
  }, [])

  return (
    <div className="flex h-full">
      <Sidebar
        title="AI Katas"
        description="Practice and master AI skills through hands-on challenges and tutorials"
      >
        <KatasNavigation activeCategory={activeCategory} />
        {activeCategory === KatasCategory.ALL_KATAS && (
          <KataFilters filters={filters} onFilterChange={handleFilterChange} />
        )}
      </Sidebar>
      <PageLayout rightContent={headerActions}>
        <KatasContent
          activeCategory={activeCategory}
          filters={filters}
          reloadKatas={reloadKatas}
          hasPagination={!!katas.length && activeCategory === KatasCategory.ALL_KATAS}
          totalCount={totalCount}
        />
        {!!katas.length && activeCategory === KatasCategory.ALL_KATAS && (
          <Pagination
            className={cn(
              'z-[10] mt-6 fixed bottom-0 right-0 bg-surface-base-primary duration-150 px-6 pt-[20px] pb-[14px]',
              paginationOffset
            )}
            currentPage={currentPage - 1}
            totalPages={totalPages}
            setPage={(page, perPage) => handlePageChange(page + 1, perPage)}
            perPage={perPage}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default KatasPage
