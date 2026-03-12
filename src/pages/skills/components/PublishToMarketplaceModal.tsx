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

import React, { useState, useEffect } from 'react'

import Button from '@/components/Button/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { skillsStore } from '@/store/skills'
import { Skill } from '@/types/entity/skill'

import SkillCategorySelector from './SkillCategorySelector'

interface PublishToMarketplaceModalProps {
  isOpen: boolean
  skill: Skill
  onClose: () => void
  onSuccess: () => void
}

const PublishToMarketplaceModal: React.FC<PublishToMarketplaceModalProps> = ({
  isOpen,
  skill,
  onClose,
  onSuccess,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(skill.categories ?? [])
  const [categoriesError, setCategoriesError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(skill.categories ?? [])
      setCategoriesError('')
    }
  }, [isOpen, skill.categories])

  const handlePublish = async () => {
    if (selectedCategories.length === 0) {
      setCategoriesError('Please select at least one category')
      return
    }

    setCategoriesError('')
    setIsLoading(true)

    try {
      await skillsStore.publishToMarketplace(skill.id, selectedCategories)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to publish skill:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCategories = (categories: string[]) => {
    setCategoriesError('')
    setSelectedCategories(categories)
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.BASE} onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handlePublish} disabled={isLoading}>
        {isLoading ? 'Publishing...' : 'Publish'}
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[650px]"
      hideClose
      header="Publish to Marketplace"
      visible={isOpen}
      onHide={onClose}
      withBorder
      footerContent={footerContent}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This will make your skill available in the marketplace for all users. Please review the
          details below before continuing.
        </p>

        <SkillCategorySelector
          selectedCategories={selectedCategories}
          onCategoriesChange={handleSelectCategories}
          error={categoriesError}
          disabled={isLoading}
          hint="Choose up to 3 categories that best describe what your skill does. This will help users find your skill more easily in the marketplace."
        />
      </div>
    </Popup>
  )
}

export default PublishToMarketplaceModal
