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

import { FC, useEffect, useState } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import Popup from '@/components/Popup'
import { userStore } from '@/store/user'
import { BUDGET_CATEGORY_OPTIONS, BudgetCategory } from '@/types/entity/budget'
import { UserListItem } from '@/types/entity/user'

interface BulkResetBudgetsPopupProps {
  isOpen: boolean
  selectedUsers: UserListItem[]
  categories?: BudgetCategory[]
  onClose: () => void
  onSave: () => void
}

const BulkResetBudgetsPopup: FC<BulkResetBudgetsPopupProps> = ({
  isOpen,
  selectedUsers,
  categories,
  onClose,
  onSave,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<BudgetCategory[]>(
    categories?.length ? categories : BUDGET_CATEGORY_OPTIONS.map((option) => option.value)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(
        categories?.length ? categories : BUDGET_CATEGORY_OPTIONS.map((option) => option.value)
      )
    }
  }, [categories, isOpen])

  const handleToggleCategory = (category: BudgetCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const handleClose = () => {
    setSelectedCategories(BUDGET_CATEGORY_OPTIONS.map((option) => option.value))
    onClose()
  }

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) return
    setIsSubmitting(true)
    try {
      const userIds = selectedUsers.map((u) => u.id)
      const categories = selectedCategories.length > 0 ? selectedCategories : undefined
      await userStore.bulkResetBudgets(userIds, categories)
      setSelectedCategories([])
      onSave()
    } catch {
      // error handled in store
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popup
      header="Reset Budgets"
      className="w-[480px]"
      submitText="Reset"
      submitDisabled={isSubmitting || selectedCategories.length === 0}
      visible={isOpen}
      onHide={handleClose}
      onSubmit={handleSubmit}
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-primary">
          Reset budget usage for{' '}
          <span className="font-medium">{selectedUsers.length} selected user(s)</span>?
        </p>

        <div>
          <p className="text-xs text-text-quaternary mb-2">Select categories to reset:</p>
          <div className="flex flex-col gap-2">
            {BUDGET_CATEGORY_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={selectedCategories.includes(option.value)}
                onChange={() => handleToggleCategory(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default BulkResetBudgetsPopup
