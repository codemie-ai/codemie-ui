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

import { yupResolver } from '@hookform/resolvers/yup'
import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import PlusSVG from '@/assets/icons/plus.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { katasStore } from '@/store/katas'
import { userStore } from '@/store/user'
import { KataTag, KataRole } from '@/types/entity/kata'
import toaster from '@/utils/toaster'

import KataFormFields from './components/KataFormFields'
import KatasNavigation from './components/KatasNavigation'
import { kataSchema, defaultKataFormValues, KataFormData } from './schema'

// Page-specific constants
const COPY_SUFFIX = ' (Copy)'
const KATAS_ROUTE = '/katas'

const MESSAGES = {
  ACCESS_DENIED: 'Access denied. Only administrators can create katas.',
  FETCH_ERROR: 'Failed to load tags and roles',
  PUBLISH_SUCCESS: 'Kata published successfully!',
  DRAFT_SUCCESS: 'Kata saved as draft!',
  CREATE_ERROR: (action: string) => `Failed to ${action} kata. Please try again.`,
}

const BUTTONS = {
  CANCEL: 'Cancel',
  SAVE_DRAFT: 'Save as Draft',
  SAVING: 'Saving...',
  PUBLISH: 'Publish',
  PUBLISHING: 'Publishing...',
}

const NewKataPage = () => {
  const navigate = useNavigate()
  const { user } = useSnapshot(userStore)
  const isAdmin = user?.isAdmin ?? false
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableTags, setAvailableTags] = useState<KataTag[]>([])
  const [availableRoles, setAvailableRoles] = useState<KataRole[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const submitActionRef = useRef<'draft' | 'publish'>('draft')
  const [cloneFrom, setCloneFrom] = useState<KataFormData | null>(null)

  // Get clone data from store on mount
  useEffect(() => {
    if (katasStore.cloneData) {
      setCloneFrom(katasStore.cloneData)
      katasStore.setCloneData(null)
    }
  }, [])

  // Redirect non-admins
  useEffect(() => {
    if (user && !isAdmin) {
      toaster.error(MESSAGES.ACCESS_DENIED)
      navigate(KATAS_ROUTE)
    }
  }, [user, isAdmin, navigate])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KataFormData>({
    resolver: yupResolver(kataSchema),
    defaultValues: defaultKataFormValues,
  })

  // Reset form with clone data when available
  useEffect(() => {
    if (cloneFrom) {
      reset({
        title: cloneFrom.title + COPY_SUFFIX,
        description: cloneFrom.description,
        steps: cloneFrom.steps,
        level: cloneFrom.level,
        duration_minutes: cloneFrom.duration_minutes,
        tags: cloneFrom.tags ?? [],
        roles: cloneFrom.roles ?? [],
        image_url: cloneFrom.image_url ?? '',
        links: cloneFrom.links ?? [],
        references: cloneFrom.references ?? [],
      })
    }
  }, [cloneFrom, reset])

  // Fetch reference data on mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      setIsLoadingOptions(true)
      try {
        await Promise.all([katasStore.fetchKataTags(), katasStore.fetchKataRoles()])
        setAvailableTags(katasStore.availableTags)
        setAvailableRoles(katasStore.availableRoles)
      } catch (error) {
        console.error('Failed to fetch reference data:', error)
        toaster.error(MESSAGES.FETCH_ERROR)
      } finally {
        setIsLoadingOptions(false)
      }
    }

    fetchReferenceData()
  }, [])

  const handleBack = () => {
    navigate(KATAS_ROUTE)
  }

  const onSubmit = async (data: KataFormData) => {
    setIsSubmitting(true)
    const action = submitActionRef.current

    try {
      // Clean up optional fields
      // Filter out empty references
      const nonEmptyReferences = data.references.filter((ref) => ref && ref.trim() !== '')

      const payload = {
        ...data,
        image_url: data.image_url || undefined,
        links: data.links.length > 0 ? data.links : undefined,
        references: nonEmptyReferences.length > 0 ? nonEmptyReferences : undefined,
      }

      const result = await katasStore.createKata(payload)

      // If user clicked Publish, call the publish endpoint
      if (action === 'publish') {
        await katasStore.publishKata(result.id)
        toaster.info(MESSAGES.PUBLISH_SUCCESS)
      } else {
        toaster.info(MESSAGES.DRAFT_SUCCESS)
      }

      navigate(KATAS_ROUTE)
    } catch (error) {
      console.error('Failed to create kata:', error)
      const errorAction = action === 'publish' ? 'publish' : 'save'
      toaster.error(MESSAGES.CREATE_ERROR(errorAction))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAsDraft = handleSubmit((data) => {
    submitActionRef.current = 'draft'
    onSubmit(data)
  })

  const handlePublish = handleSubmit((data) => {
    submitActionRef.current = 'publish'
    onSubmit(data)
  })

  const tagOptions = availableTags.map((tag) => ({
    label: tag.name,
    value: tag.id,
  }))

  const roleOptions = availableRoles.map((role) => ({
    label: role.name,
    value: role.id,
  }))

  return (
    <div className="flex h-full">
      <Sidebar
        title="AI Katas"
        description="Practice and master AI skills through hands-on challenges and tutorials"
      >
        <KatasNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        title="Create New Kata"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button type="secondary" onClick={handleBack}>
              {BUTTONS.CANCEL}
            </Button>
            <Button
              type="secondary"
              disabled={isSubmitting || isLoadingOptions}
              onClick={handleSaveAsDraft}
            >
              <PlusSVG />
              {isSubmitting && submitActionRef.current === 'draft'
                ? BUTTONS.SAVING
                : BUTTONS.SAVE_DRAFT}
            </Button>
            <Button
              type="primary"
              disabled={isSubmitting || isLoadingOptions}
              onClick={handlePublish}
            >
              <PublishSvg />
              {isSubmitting && submitActionRef.current === 'publish'
                ? BUTTONS.PUBLISHING
                : BUTTONS.PUBLISH}
            </Button>
          </div>
        }
      >
        <div className="max-w-4xl mx-auto py-6">
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <KataFormFields
              control={control}
              errors={errors}
              tagOptions={tagOptions}
              roleOptions={roleOptions}
              isLoadingOptions={isLoadingOptions}
            />
          </form>
        </div>
      </PageLayout>
    </div>
  )
}

export default NewKataPage
