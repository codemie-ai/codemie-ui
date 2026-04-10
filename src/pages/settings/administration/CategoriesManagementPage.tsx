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

import { FC, useMemo, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import Cross18Svg from '@/assets/icons/cross.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import MarketplaceSvg from '@/assets/icons/explore.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import Table from '@/components/Table'
import { ButtonSize, DECIMAL_PAGINATION_OPTIONS, ButtonType, InfoWarningType } from '@/constants'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { useVueRouter } from '@/hooks/useVueRouter'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { categoriesStore } from '@/store/categories'
import { Category } from '@/types/entity/category'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { FILTER_ENTITY, setFilters } from '@/utils/filters'
import toaster from '@/utils/toaster'
import { displayValue } from '@/utils/utils'

import CategoryModal, { CategoryFormData } from './components/CategoryModal'

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'name',
    label: 'Name',
    type: DefinitionTypes.String,
    sortable: true,
    headClassNames: 'w-[25%]',
  },
  {
    key: 'description',
    label: 'Description',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[53.4%]',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[15%]',
  },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom, headClassNames: 'w-[6.6%]' },
]

const CategoriesManagementPage: FC = () => {
  const { categories, pagination, loading } = useSnapshot(categoriesStore)
  const router = useVueRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        await categoriesStore.indexCategories(pagination.page, pagination.perPage)
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    }

    loadCategories()
  }, [])

  const handleAddCategory = useCallback(() => {
    setEditingCategory(null)
    setShowModal(true)
  }, [])

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category)
    setShowModal(true)
  }, [])

  const handleDeleteCategory = useCallback((category: Category) => {
    setDeletingCategory(category)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingCategory) return

    try {
      await categoriesStore.deleteCategory(deletingCategory.id)
      toaster.info('Category deleted successfully')
      setDeletingCategory(null)
    } catch (error: any) {
      console.error('Failed to delete category:', error)
    }
  }, [deletingCategory])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingCategory(null)
  }, [])

  const handleModalSubmit = useCallback(
    async (data: CategoryFormData) => {
      const isEdit = !!editingCategory

      try {
        if (isEdit) {
          await categoriesStore.updateCategory(editingCategory.id, data)
          toaster.info('Category updated successfully')
        } else {
          await categoriesStore.createCategory(data)
          toaster.info('Category created successfully')
        }
        handleModalClose()
      } catch (error: any) {
        console.error(isEdit ? 'Failed to update category:' : 'Failed to create category:', error)
      }
    },
    [editingCategory, handleModalClose]
  )

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.perPage
      categoriesStore.indexCategories(page, perPage).catch((error) => {
        console.error('Failed to load categories:', error)
      })
    },
    [pagination.perPage]
  )

  const handleProjectClick = useCallback(
    (categoryId: string) => {
      const filterKey = `${FILTER_ENTITY.ASSISTANTS}.${ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER}`
      setFilters(filterKey, { categories: [categoryId] })
      router.push({ name: 'assistants-project' })
    },
    [router]
  )

  const handleMarketplaceClick = useCallback(
    (categoryId: string) => {
      const filterKey = `${FILTER_ENTITY.ASSISTANTS}.${ASSISTANT_INDEX_SCOPES.MARKETPLACE}`
      setFilters(filterKey, { categories: [categoryId] })
      router.push({ name: 'assistants-marketplace' })
    },
    [router]
  )

  const customRenderColumns = useMemo(
    () => ({
      description: (item: Category) => (
        <span className="text-text-quaternary line-clamp-2">{displayValue(item.description)}</span>
      ),
      assignments: (item: Category) => {
        const projectCount = item.projectAssistantCount ?? 0
        const marketplaceCount = item.marketplaceAssistantCount ?? 0
        const totalCount = projectCount + marketplaceCount

        if (totalCount === 0) {
          return <span className="text-text-quaternary">-</span>
        }

        return (
          <div className="flex gap-2 items-center">
            <button
              className="flex items-center border rounded-md px-2 py-1 border-border-structural hover:bg-surface-specific-dropdown-hover transition cursor-pointer"
              onClick={() => handleProjectClick(item.id)}
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Project Assistants"
            >
              <AssistantSvg className="w-5 h-5" />
              <span className="ml-2">{projectCount}</span>
            </button>
            <button
              className="flex items-center border rounded-md px-2 py-1 border-border-structural hover:bg-surface-specific-dropdown-hover transition cursor-pointer"
              onClick={() => handleMarketplaceClick(item.id)}
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Marketplace Assistants"
            >
              <MarketplaceSvg className="w-5 h-5" />
              <span className="ml-2">{marketplaceCount}</span>
            </button>
          </div>
        )
      },
      actions: (item: Category) => {
        const hasCountData =
          item.projectAssistantCount !== undefined && item.marketplaceAssistantCount !== undefined
        const totalCount = (item.projectAssistantCount ?? 0) + (item.marketplaceAssistantCount ?? 0)
        const shouldDisableDelete = !hasCountData || totalCount > 0

        let deleteTooltip: string | undefined
        if (shouldDisableDelete) {
          if (!hasCountData) {
            deleteTooltip = 'Cannot delete category: assistant count data unavailable'
          } else {
            deleteTooltip =
              'This category is used by existing assistants and cannot be deleted. Remove the category from all assistants first.'
          }
        }

        return (
          <div className="flex justify-end">
            <NavigationMore
              items={[
                {
                  title: 'Edit',
                  icon: <EditSvg />,
                  onClick: () => handleEditCategory(item),
                },
                {
                  title: 'Delete',
                  icon: <DeleteSvg />,
                  onClick: () => handleDeleteCategory(item),
                  disabled: shouldDisableDelete,
                  tooltip: deleteTooltip,
                },
              ]}
            />
          </div>
        )
      },
    }),
    [handleEditCategory, handleDeleteCategory, handleProjectClick, handleMarketplaceClick]
  )

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={handleAddCategory} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Add Category
      </Button>
    ),
    [handleAddCategory]
  )

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full pt-6">
        <Table
          items={categories}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
          }}
          onPaginationChange={handlePageChange}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        />

        <CategoryModal
          visible={showModal}
          category={editingCategory}
          onHide={handleModalClose}
          onSubmit={handleModalSubmit}
        />

        <ConfirmationModal
          visible={!!deletingCategory}
          onCancel={() => setDeletingCategory(null)}
          header="Delete Category?"
          message={`Are you sure you want to delete "${deletingCategory?.name}"?`}
          confirmText="Delete"
          confirmButtonType={ButtonType.DELETE}
          confirmButtonIcon={<Cross18Svg className="w-4 mr-px" />}
          onConfirm={confirmDelete}
        >
          {deletingCategory &&
          (deletingCategory.projectAssistantCount ?? 0) +
            (deletingCategory.marketplaceAssistantCount ?? 0) >
            0 ? (
            <InfoWarning
              type={InfoWarningType.WARNING}
              message="This category is used by existing assistants. Deleting it may affect them."
              className="mt-4"
            />
          ) : (
            <InfoWarning
              type={InfoWarningType.INFO}
              message="This action cannot be undone. The category will be permanently removed."
              className="mt-4"
            />
          )}
        </ConfirmationModal>
      </div>
    )
  }

  return (
    <SettingsLayout
      contentTitle="Categories management"
      content={renderContent()}
      rightContent={renderHeaderActions}
    />
  )
}

export default CategoriesManagementPage
