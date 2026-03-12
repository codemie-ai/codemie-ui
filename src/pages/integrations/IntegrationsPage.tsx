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

import { useRef, useMemo, useState } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import DropdownButton from '@/components/DropdownButton/DropdownButton'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import SelectButton from '@/components/SelectButton/SelectButton'
import Sidebar from '@/components/Sidebar'
import { IntegrationOption } from '@/constants/integration'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userStore } from '@/store'
import { clearUrlFilters } from '@/utils/filters'

import IntegrationsTabComponent from './IntegrationsTab'

const IntegrationsPage = () => {
  const router = useVueRouter()
  const currentUser = userStore.user
  const portalSidebarRef = useRef<HTMLDivElement>(null)
  const integrationOptions = useMemo(() => {
    const projectPermission = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin

    return [IntegrationOption.USER, IntegrationOption.PROJECT].filter(
      (option) => option !== IntegrationOption.PROJECT || projectPermission
    )
  }, [currentUser])
  const [integrationType, setIntegrationType] = useState(IntegrationOption.USER)

  const showProjectSettings = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin

  const headerActionOptions = [
    {
      label: 'Create User Integration',
      onClick: () => router.push({ name: 'new-user-integration' }),
    },
    ...(showProjectSettings
      ? [
          {
            label: 'Create Project Integration',
            onClick: () => router.push({ name: 'new-project-integration' }),
          },
        ]
      : []),
  ]

  const handleChangeIntegrationType = (type) => {
    clearUrlFilters()
    setIntegrationType(type)
  }

  const renderHeaderActions = useMemo(
    () => (
      <div className="flex items-center justify-end text-white">
        <SelectButton
          caption="Integration Type:"
          value={integrationType}
          options={integrationOptions}
          onChange={handleChangeIntegrationType}
        />
        <div className="border-l border-border-primary h-[21px] mx-5" />
        <div className="flex gap-2">
          <DropdownButton
            label="Create"
            size="medium"
            iconLeft={<PlusIcon />}
            items={headerActionOptions}
          />
        </div>
      </div>
    ),
    [integrationType, integrationOptions, headerActionOptions]
  )

  return (
    <div className="flex h-full">
      <Sidebar title="Integrations" description="Manage your integrations">
        <div className="mt-6" ref={portalSidebarRef} />
      </Sidebar>
      <PageLayout rightContent={renderHeaderActions}>
        <IntegrationsTabComponent
          portalSidebarRef={portalSidebarRef}
          integrationType={integrationType}
        />
      </PageLayout>
    </div>
  )
}

export default IntegrationsPage
