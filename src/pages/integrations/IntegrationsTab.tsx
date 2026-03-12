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

import React, { FC, useCallback } from 'react'

import ProjectSettings from '@/pages/integrations/components/ProjectSettings'
import UserSettings from '@/pages/integrations/components/UserSettings'
import { ColumnDefinition } from '@/types/table'

export const INITIAL_FILTERS = {
  search: '',
  type: [],
  project: [],
  created_by: '',
  is_global: null,
}

interface IntegrationTabProps {
  integrationType: string
  portalSidebarRef: React.RefObject<HTMLDivElement | null>
}

const IntegrationsTab: FC<IntegrationTabProps> = ({ portalSidebarRef, integrationType }) => {
  const getTableColumns = useCallback(
    (isUserColumns = false) =>
      [
        { label: 'Project', key: 'project_name', type: 'string', shrink: true, semiBold: true },
        { label: 'Alias', key: 'alias', type: 'string', shrink: true },
        { label: 'Type', key: 'credential_type', type: 'custom' },
        ...(isUserColumns ? [{ label: 'Global', key: 'is_global', type: 'boolean' }] : []),
        { label: 'URL', key: 'credential_values', type: 'custom' },
        { label: '', key: 'actions', type: 'custom' },
      ] as ColumnDefinition[],
    []
  )

  return (
    <div>
      {integrationType === 'User' ? (
        <UserSettings tableColumns={getTableColumns(true)} portalSidebarRef={portalSidebarRef} />
      ) : (
        <ProjectSettings tableColumns={getTableColumns()} portalSidebarRef={portalSidebarRef} />
      )}
    </div>
  )
}

export default IntegrationsTab
