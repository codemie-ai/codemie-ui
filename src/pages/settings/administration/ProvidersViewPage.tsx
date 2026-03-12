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

import { FC, useEffect, useState, useCallback } from 'react'

import CodeBlock from '@/components/CodeBlock/CodeBlock'
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { providersStore } from '@/store/providers'

const ProvidersViewPage: FC = () => {
  const router = useVueRouter()
  const id = router.params.id as string
  const [provider, setProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      setLoading(true)
      providersStore
        .getProvider(id)
        .then((data) => {
          setProvider(data)
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
      <div className="flex flex-col h-full pt-6">
        <CodeBlock
          language="json"
          text={JSON.stringify(provider, null, 2)}
          title="Provider Configuration"
          downloadFilename={`provider-${provider.name || provider.id}`}
        />
      </div>
    )
  }

  return (
    <SettingsLayout
      contentTitle={provider?.name ?? 'Provider Details'}
      content={renderContent()}
      onBack={handleBack}
    />
  )
}

export default ProvidersViewPage
