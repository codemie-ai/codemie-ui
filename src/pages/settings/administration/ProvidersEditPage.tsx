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

import { useState, useCallback, useEffect, useMemo } from 'react'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { providersStore } from '@/store/providers'
import toaster from '@/utils/toaster'

import ProviderForm from './components/ProviderForm'

const PROVIDER_UPDATED_MESSAGE = 'Provider updated successfully'

const ProvidersEditPage = () => {
  const router = useVueRouter()
  const id = router.params.id as string
  const [provider, setProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      setLoading(true)
      providersStore
        .getProvider(id)
        .then((data) => {
          setProvider(data)
          const { id: _id, date: _date, update_date: _update_date, ...editableData } = data
          setJsonValue(JSON.stringify(editableData, null, 2))
        })
        .catch((error) => {
          console.error('Failed to load provider:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [id])

  const handleBack = useCallback(() => {
    router.push({ name: 'providers-management' })
  }, [router])

  const handleJsonChange = (value: string) => {
    setJsonValue(value)
    setJsonError(null)
  }

  const handleSubmit = async () => {
    if (!id) return

    let parsedData
    try {
      parsedData = JSON.parse(jsonValue)
      setJsonError(null)
    } catch (error: any) {
      setJsonError(`Invalid JSON: ${error.message}`)
      return
    }

    setIsSubmitting(true)
    try {
      await providersStore.updateProvider(id, parsedData)
      toaster.info(PROVIDER_UPDATED_MESSAGE)
      router.push({ name: 'providers-management' })
    } catch {
      setIsSubmitting(false)
    }
  }

  const renderHeaderActions = useMemo(
    () => (
      <div className="flex gap-4">
        <Button onClick={handleBack} variant={ButtonType.SECONDARY} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant={ButtonType.PRIMARY} disabled={isSubmitting}>
          Save
        </Button>
      </div>
    ),
    [handleBack, handleSubmit, isSubmitting]
  )

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )
    }

    if (!provider) {
      return (
        <div className="pt-6">
          <p className="text-text-quaternary">Provider not found</p>
        </div>
      )
    }

    return (
      <ProviderForm jsonValue={jsonValue} jsonError={jsonError} onJsonChange={handleJsonChange} />
    )
  }

  return (
    <SettingsLayout
      contentTitle={provider?.name ?? 'Edit Provider'}
      content={renderContent()}
      onBack={handleBack}
      rightContent={!loading && provider ? renderHeaderActions : undefined}
    />
  )
}

export default ProvidersEditPage
