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

import { useState, useCallback, useMemo } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { providersStore } from '@/store/providers'
import toaster from '@/utils/toaster'

import ProviderForm from './components/ProviderForm'

const PROVIDER_CREATED_MESSAGE = 'Provider created successfully'

const ProvidersCreatePage = () => {
  const router = useVueRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jsonValue, setJsonValue] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleBack = useCallback(() => {
    router.push({ name: 'providers-management' })
  }, [router])

  const handleJsonChange = (value: string) => {
    setJsonValue(value)
    setJsonError(null)
  }

  const handleSubmit = async () => {
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
      await providersStore.createProvider(parsedData)
      toaster.info(PROVIDER_CREATED_MESSAGE)
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
          <PlusIcon /> Save
        </Button>
      </div>
    ),
    [handleBack, handleSubmit, isSubmitting]
  )

  const renderContent = () => {
    return (
      <ProviderForm jsonValue={jsonValue} jsonError={jsonError} onJsonChange={handleJsonChange} />
    )
  }

  return (
    <SettingsLayout
      contentTitle="Create Provider"
      content={renderContent()}
      onBack={handleBack}
      rightContent={renderHeaderActions}
    />
  )
}

export default ProvidersCreatePage
