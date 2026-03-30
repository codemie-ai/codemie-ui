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

import AwsSvg from '@/assets/icons/aws.svg?react'
import AdminTabSvg from '@/assets/icons/lightning.svg?react'
import ProfileTabSvg from '@/assets/icons/profile-tab.svg?react'
import { LayoutTab } from '@/components/Layouts/Layout/Layout'
import { SettingsTab } from '@/constants'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { isCostCentersEnabled, isMcpEnabled } from '@/utils/featureFlags'

export const getNavigationTabs = (isAdmin: boolean, awsSupported = false): LayoutTab[] => {
  const isMcpFeatureEnabled = isMcpEnabled()
  const isCostCentersFeatureEnabled = isCostCentersEnabled()
  const isUserManagementEnabled = window._env_?.VITE_ENABLE_USER_MANAGEMENT === 'true'
  const isEnterprise = isEnterpriseEdition()

  // Build administration children and sort alphabetically
  const administrationChildren = isAdmin
    ? [
        ...(isCostCentersFeatureEnabled
          ? [
              {
                id: SettingsTab.COST_CENTERS_MANAGEMENT,
                name: 'Cost centers management',
                title: 'Cost centers management',
                url: '/settings/administration/cost-centers',
              },
            ]
          : []),
        {
          id: SettingsTab.PROJECTS_MANAGEMENT,
          name: 'Projects management',
          title: 'Projects management',
          url: '/settings/administration/projects',
        },
        ...(isEnterprise
          ? [
              {
                id: SettingsTab.AI_ADOPTION_CONFIG,
                name: 'AI/Run Adoption Framework',
                title: 'AI/Run Adoption Framework',
                url: '/settings/administration/ai-adoption-config',
              },
              {
                id: SettingsTab.CATEGORIES_MANAGEMENT,
                name: 'Categories management',
                title: 'Categories management',
                url: '/settings/administration/categories',
              },
              ...(isMcpFeatureEnabled
                ? [
                    {
                      id: SettingsTab.MCP_MANAGEMENT,
                      name: 'MCPs management',
                      title: 'MCPs catalog management',
                      url: '/settings/administration/mcps',
                    },
                  ]
                : []),
              {
                id: SettingsTab.PROVIDERS_MANAGEMENT,
                name: 'Providers management',
                title: 'Providers management',
                url: '/settings/administration/providers',
              },
              ...(isUserManagementEnabled
                ? [
                    {
                      id: SettingsTab.USERS_MANAGEMENT,
                      name: 'Users management',
                      title: 'Users management',
                      url: '/settings/administration/users',
                    },
                  ]
                : []),
            ]
          : []),
      ].sort((a, b) => a.name.localeCompare(b.name))
    : [
        {
          id: SettingsTab.PROJECTS_MANAGEMENT,
          name: 'Projects management',
          title: 'Projects management',
          url: '/settings/administration/projects',
        },
      ]

  const administrationTab: LayoutTab = {
    id: SettingsTab.ADMINISTRATION,
    name: 'Administration',
    title: 'Administration',
    url: '/settings/administration',
    icon: <AdminTabSvg />,
    children: administrationChildren,
  }

  // Build AWS children and sort alphabetically
  const awsChildren = [
    {
      id: SettingsTab.AWS_ASSISTANTS,
      name: 'Agents',
      title: 'AWS Integration',
      url: '/settings/aws/assistants',
    },
    {
      id: SettingsTab.AWS_WORKFLOWS,
      name: 'Flows',
      title: 'AWS Integration',
      url: '/settings/aws/workflows',
    },
    {
      id: SettingsTab.AWS_DATA_SOURCES,
      name: 'Knowledge Bases',
      title: 'AWS Integration',
      url: '/settings/aws/data-sources',
    },
    {
      id: SettingsTab.AWS_GUARDRAILS,
      name: 'Guardrails',
      title: 'AWS Integration',
      url: '/settings/aws/guardrails',
    },
  ].sort((a, b) => a.name.localeCompare(b.name))

  return [
    {
      id: SettingsTab.PROFILE,
      name: 'Profile',
      title: 'Profile',
      url: '/settings/profile',
      icon: <ProfileTabSvg />,
    },
    ...(administrationTab.children?.length ? [administrationTab] : []),
    ...(awsSupported
      ? [
          {
            id: 'aws',
            name: 'AWS Integration',
            title: '',
            section: 'External Vendors',
            url: '/settings/aws',
            icon: <AwsSvg />,
            children: awsChildren,
          },
        ]
      : []),
  ]
}
