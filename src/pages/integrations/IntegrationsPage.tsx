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

import { useRef, useState } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { NEW_INTEGRATION } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { IntegrationScope, ScopeFilterValue } from '@/utils/integrationScope'

import IntegrationsList from './components/IntegrationsList/IntegrationsList'

const IntegrationsPage = () => {
  const router = useVueRouter()
  const portalSidebarRef = useRef<HTMLDivElement>(null)
  const [scope, setScope] = useState<ScopeFilterValue>(IntegrationScope.USER)

  const createIntegration = () =>
    router.push({
      name: NEW_INTEGRATION,
      query: {
        scope:
          scope === IntegrationScope.PROJECT ? IntegrationScope.PROJECT : IntegrationScope.USER,
      },
    })

  const headerActions = (
    <div className="flex items-center justify-end text-white">
      <Button size="medium" onClick={createIntegration}>
        <PlusIcon /> New Integration
      </Button>
    </div>
  )

  return (
    <div className="flex h-full">
      <Sidebar title="Integrations" description="Manage your integrations">
        <div className="mt-6" ref={portalSidebarRef} />
      </Sidebar>
      <PageLayout rightContent={headerActions}>
        <IntegrationsList portalSidebarRef={portalSidebarRef} onScopeChange={setScope} />
      </PageLayout>
    </div>
  )
}

export default IntegrationsPage
