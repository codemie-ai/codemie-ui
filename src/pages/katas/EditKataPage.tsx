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
import { useNavigate, useParams } from 'react-router'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { katasStore } from '@/store/katas'
import { userStore } from '@/store/user'
import { KataTag, KataRole } from '@/types/entity/kata'
import toaster from '@/utils/toaster'

import KataFormFields from './components/KataFormFields'
import KatasNavigation from './components/KatasNavigation'
import { kataSchema, defaultKataFormValues, KataFormData } from './schema'

// Page-specific constants
const BUTTONS = {
  CANCEL: 'Cancel',
  SAVE_CHANGES: 'Save Changes',
  SAVING: 'Saving...',
}

const EditKataPage = () => {
  const { kataId } = useParams<{ kataId: string }>()
  const navigate = useNavigate()
  const { user } = useSnapshot(userStore)
  const isAdmin = user?.isAdmin ?? false
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableTags, setAvailableTags] = useState<KataTag[]>([])
  const [availableRoles, setAvailableRoles] = useState<KataRole[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isLoadingKata, setIsLoadingKata] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const { currentKata } = useSnapshot(katasStore)

  // Redirect non-admins
  useEffect(() => {
    if (user && !isAdmin) {
      toaster.error('Access denied. Only administrators can edit katas.')
      navigate('/katas')
    }
  }, [user, isAdmin, navigate])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KataFormData>({
    resolver: yupResolver(kataSchema),
    mode: 'onChange',
    defaultValues: defaultKataFormValues,
  })

  // Fetch kata details and reference data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!kataId) return

      setIsLoadingKata(true)
      setIsLoadingOptions(true)

      try {
        await Promise.all([
          katasStore.fetchKataById(kataId),
          katasStore.fetchKataTags(),
          katasStore.fetchKataRoles(),
        ])

        setAvailableTags(katasStore.availableTags)
        setAvailableRoles(katasStore.availableRoles)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toaster.error('Failed to load kata details')
        navigate('/katas')
      } finally {
        setIsLoadingKata(false)
        setIsLoadingOptions(false)
      }
    }

    fetchData()

    return () => {
      katasStore.clearCurrentKata()
    }
  }, [kataId, navigate])

  // Populate form when kata is loaded and check permissions
  useEffect(() => {
    if (currentKata && !isLoadingKata) {
      // Check if user is admin
      if (!isAdmin) {
        toaster.error('You do not have permission to edit this kata')
        navigate(`/katas/${kataId}`)
        return
      }

      reset({
        title: currentKata.title,
        description: currentKata.description,
        steps: currentKata.steps,
        level: currentKata.level,
        duration_minutes: currentKata.duration_minutes,
        tags: currentKata.tags ?? [],
        roles: currentKata.roles ?? [],
        image_url: currentKata.image_url ?? '',
        links: currentKata.links ?? [],
        references: currentKata.references ?? [],
      })
    }
  }, [currentKata, isLoadingKata, isAdmin, reset, navigate, kataId])

  const handleBack = () => {
    navigate(`/katas/${kataId}`)
  }

  const onSubmit = async (data: KataFormData) => {
    if (!kataId) return

    setIsSubmitting(true)
    try {
      // Filter out empty references
      const nonEmptyReferences = data.references.filter((ref) => ref && ref.trim() !== '')

      const payload = {
        ...data,
        image_url: data.image_url || undefined,
        links: data.links.length > 0 ? data.links : undefined,
        references: nonEmptyReferences.length > 0 ? nonEmptyReferences : undefined,
      }

      await katasStore.updateKata(kataId, payload)
      toaster.info('Kata updated successfully!')
      navigate(`/katas/${kataId}`)
    } catch (error) {
      console.error('Failed to update kata:', error)
      toaster.error('Failed to update kata. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = () => {
    formRef.current?.requestSubmit()
  }

  const tagOptions = availableTags.map((tag) => ({
    label: tag.name,
    value: tag.id,
  }))

  const roleOptions = availableRoles.map((role) => ({
    label: role.name,
    value: role.id,
  }))

  if (isLoadingKata) {
    return (
      <div className="flex h-full">
        <Sidebar
          title="AI Katas"
          description="Practice and master AI skills through hands-on challenges and tutorials"
        >
          <KatasNavigation />
        </Sidebar>

        <PageLayout showBack limitWidth title="Edit Kata" onBack={handleBack}>
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        </PageLayout>
      </div>
    )
  }

  if (!currentKata) {
    return (
      <div className="flex h-full">
        <Sidebar
          title="AI Katas"
          description="Practice and master AI skills through hands-on challenges and tutorials"
        >
          <KatasNavigation />
        </Sidebar>

        <PageLayout showBack limitWidth title="Edit Kata" onBack={handleBack}>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-text-tertiary">Kata not found</p>
            <Button variant="secondary" onClick={() => navigate('/katas')}>
              Back to Katas
            </Button>
          </div>
        </PageLayout>
      </div>
    )
  }

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
        title="Edit Kata"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button type="secondary" onClick={handleBack}>
              {BUTTONS.CANCEL}
            </Button>
            <Button
              type="primary"
              disabled={isSubmitting || isLoadingOptions}
              onClick={handleFormSubmit}
            >
              <CheckSvg /> {isSubmitting ? BUTTONS.SAVING : BUTTONS.SAVE_CHANGES}
            </Button>
          </div>
        }
      >
        <div className="max-w-4xl mx-auto py-6">
          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate>
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

export default EditKataPage
