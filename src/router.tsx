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

import { createHashRouter, redirect, RouteObject } from 'react-router'

// import SignInPage from '@/authentication/local/SignInPage'
// import SignUpPage from '@/authentication/local/SignUpPage'
import { AssistantTab } from '@/constants'
import { ANALYTICS, ANALYTICS_EDIT_DASHBOARD, ANALYTICS_NEW_DASHBOARD } from '@/constants/routes'
import AnalyticsDashboardFormPage from '@/pages/analytics/AnalyticsDashboardFormPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import ApplicationFederationPage from '@/pages/applications/ApplicationFederationPage'
import ApplicationIframePage from '@/pages/applications/ApplicationIframePage'
import ApplicationsPage from '@/pages/applications/ApplicationsPage'
import AssistantChatStartPage from '@/pages/assistants/AssistantChatStartPage'
import AssistantDetailsPage from '@/pages/assistants/AssistantDetailsPage'
import AssistantsListPage from '@/pages/assistants/AssistantsListPage'
import EditAssistantPage from '@/pages/assistants/EditAssistantPage'
import EditRemoteAssistantPage from '@/pages/assistants/EditRemoteAssistantPage'
import NewAssistantPage from '@/pages/assistants/NewAssistantPage'
import NewRemoteAssistantPage from '@/pages/assistants/NewRemoteAssistantPage'
import Chat from '@/pages/chat/ChatPage'
import SharedChatPage from '@/pages/chat/SharedChatPage'
import DataSourceCreatePage from '@/pages/dataSources/DataSourceCreatePage'
import DataSourceDetailsPage from '@/pages/dataSources/DataSourceDetailsPage'
import DataSourceEditPage from '@/pages/dataSources/DataSourceEditPage'
import DataSourcesPage from '@/pages/dataSources/DataSourcesPage'
import ErrorPage from '@/pages/error/ErrorPage'
import HelpPage from '@/pages/help/HelpPage'
import EditProjectIntegrationPage from '@/pages/integrations/EditProjectIntegrationPage'
import EditUserIntegrationPage from '@/pages/integrations/EditUserIntegrationPage'
import IntegrationsPage from '@/pages/integrations/IntegrationsPage'
import NewProjectIntegrationPage from '@/pages/integrations/NewProjectIntegrationPage'
import NewUserIntegrationPage from '@/pages/integrations/NewUserIntegrationPage'
import KataDetailView from '@/pages/katas/components/KataDetailView'
import EditKataPage from '@/pages/katas/EditKataPage'
import KatasPage, { KatasCategory } from '@/pages/katas/KatasPage'
import NewKataPage from '@/pages/katas/NewKataPage'
import LoginSuccessPage from '@/pages/login-success/LoginSuccessPage'
import ReleaseNotesPage from '@/pages/releaseNotes/ReleaseNotesPage'
import AiAdoptionConfigPage from '@/pages/settings/administration/AiAdoptionConfigPage'
import CategoriesManagementPage from '@/pages/settings/administration/CategoriesManagementPage'
import MCPManagementPage from '@/pages/settings/administration/MCPManagementPage'
import ProjectsManagementPage from '@/pages/settings/administration/ProjectsManagementPage'
import ProvidersCreatePage from '@/pages/settings/administration/ProvidersCreatePage'
import ProvidersEditPage from '@/pages/settings/administration/ProvidersEditPage'
import ProvidersManagementPage from '@/pages/settings/administration/ProvidersManagementPage'
import ProvidersViewPage from '@/pages/settings/administration/ProvidersViewPage'
import AdministrationPage from '@/pages/settings/AdministrationPage'
import {
  AwsAssistantsPage,
  AwsWorkflowsPage,
  AwsDataSourcesPage,
  AwsGuardrailsPage,
} from '@/pages/settings/aws'
import ProfilePage from '@/pages/settings/ProfilePage'
import { SkillTab } from '@/pages/skills/components/SkillsNavigation'
import EditSkillPage from '@/pages/skills/EditSkillPage'
import NewSkillPage from '@/pages/skills/NewSkillPage'
import SkillDetailsPage from '@/pages/skills/SkillDetailsPage'
import SkillsListPage from '@/pages/skills/SkillsListPage'
import { WORKFLOW_LIST_SCOPE } from '@/pages/workflows/constants'
import EditWorkflowPage from '@/pages/workflows/EditWorkflowPage'
import NewWorkflowPage from '@/pages/workflows/NewWorkflowPage'
import ViewWorkflowPage from '@/pages/workflows/ViewWorkflowPage'
import ViewWorkflowTemplatePage from '@/pages/workflows/ViewWorkflowTemplatePage'
import WorkflowExecutionPage from '@/pages/workflows/WorkflowExecutionPage'
import WorkflowsListPage from '@/pages/workflows/WorkflowsListPage'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'

import App from './App'

const chatRoutes: RouteObject[] = [
  {
    path: 'chats',
    Component: Chat,
  },
  {
    id: 'chats',
    path: 'chats/:id',
    Component: Chat,
  },
  {
    id: 'chats-detail',
    path: 'chats/:id',
    Component: Chat,
  },
  {
    id: 'shared-chat',
    path: '/share/conversations/:token',
    Component: SharedChatPage,
  },
]

const assistantRoutes: RouteObject[] = [
  {
    id: 'assistants',
    path: 'assistants',
    element: <AssistantsListPage tab={AssistantTab.ALL} />,
  },
  {
    id: 'assistants-project',
    path: 'assistants/project',
    element: <AssistantsListPage tab={AssistantTab.ALL} />,
  },
  {
    id: 'assistants-marketplace',
    path: 'assistants/marketplace',
    element: <AssistantsListPage tab={AssistantTab.MARKETPLACE} />,
  },
  {
    id: 'assistants-templates',
    path: 'assistants/templates',
    element: <AssistantsListPage tab={AssistantTab.TEMPLATES} />,
  },
  {
    id: 'new-assistant',
    path: 'assistants/new',
    Component: NewAssistantPage,
  },
  {
    id: 'new-remote-assistant',
    path: 'assistants/remote/new',
    Component: NewRemoteAssistantPage,
  },
  {
    id: 'new-assistant-from-template',
    path: 'assistants/from-template/:slug',
    Component: NewAssistantPage,
  },
  {
    id: 'assistant',
    path: '/assistants/:id',
    Component: AssistantDetailsPage,
  },
  {
    id: 'assistant-template',
    path: 'assistants/templates/:id',
    element: <AssistantDetailsPage isTemplate />,
  },
  {
    id: 'clone-assistant',
    path: 'assistants/:id/clone',
    Component: NewAssistantPage,
  },
  {
    id: 'edit-assistant',
    path: 'assistants/:id/edit',
    Component: EditAssistantPage,
  },
  {
    id: 'edit-remote-assistant',
    path: 'assistants/remote/:id/edit',
    Component: EditRemoteAssistantPage,
  },
  {
    id: 'start-assistant-chat',
    path: 'assistants/:slug/start',
    Component: AssistantChatStartPage,
  },
]

const skillRoutes: RouteObject[] = [
  {
    id: 'skills',
    path: 'skills',
    element: <SkillsListPage tab={SkillTab.PROJECT} />,
  },
  {
    id: 'skills-project',
    path: 'skills/project',
    element: <SkillsListPage tab={SkillTab.PROJECT} />,
  },
  {
    id: 'skills-marketplace',
    path: 'skills/marketplace',
    element: <SkillsListPage tab={SkillTab.MARKETPLACE} />,
  },
  {
    id: 'new-skill',
    path: 'skills/new',
    Component: NewSkillPage,
  },
  {
    id: 'skill-details',
    path: 'skills/:id',
    Component: SkillDetailsPage,
  },
  {
    id: 'edit-skill',
    path: 'skills/:id/edit',
    Component: EditSkillPage,
  },
]

const integrationRoutes: RouteObject[] = [
  {
    id: 'integrations',
    path: 'integrations',
    Component: IntegrationsPage,
  },
  {
    id: 'new-user-integration',
    path: '/integrations/user/new',
    Component: NewUserIntegrationPage,
  },
  {
    id: 'edit-user-integration',
    path: '/integrations/user/edit',
    Component: EditUserIntegrationPage,
  },
  {
    id: 'new-project-integration',
    path: '/integrations/project/new',
    Component: NewProjectIntegrationPage,
  },
  {
    id: 'edit-project-integration',
    path: '/integrations/project/edit',
    Component: EditProjectIntegrationPage,
  },
]

const dataSourceRoutes: RouteObject[] = [
  {
    id: 'data-sources',
    path: 'data-sources',
    Component: DataSourcesPage,
  },
  {
    id: 'data-source-details',
    path: 'data-sources/:id',
    Component: DataSourceDetailsPage,
  },
  {
    id: 'edit-data-source',
    path: 'data-sources/:id/edit',
    Component: DataSourceEditPage,
  },
  {
    id: 'create-data-source',
    path: 'data-sources/create',
    Component: DataSourceCreatePage,
  },
]

const katasRoutes: RouteObject[] = [
  {
    id: 'katas',
    path: 'katas',
    Component: KatasPage,
  },
  {
    id: 'new-kata',
    path: 'katas/new',
    Component: NewKataPage,
  },
  {
    id: 'edit-kata',
    path: 'katas/:kataId/edit',
    Component: EditKataPage,
  },
  {
    id: 'katas-in-progress',
    path: 'katas/in-progress',
    element: <KatasPage category={KatasCategory.IN_PROGRESS} />,
  },
  {
    id: 'katas-completed',
    path: 'katas/completed',
    element: <KatasPage category={KatasCategory.COMPLETED} />,
  },
  {
    id: 'katas-leaderboard',
    path: 'katas/leaderboard',
    element: <KatasPage category={KatasCategory.LEADERBOARD} />,
  },
  {
    id: 'kata-detail',
    path: 'katas/:kataId',
    Component: KataDetailView,
  },
]

const workflowRoutes: RouteObject[] = [
  {
    id: 'workflows',
    path: 'workflows',
    loader: () => redirect('/workflows/my'),
  },
  {
    id: 'workflows-all',
    path: 'workflows/all',
    element: <WorkflowsListPage scope={WORKFLOW_LIST_SCOPE.ALL} />,
  },
  {
    id: 'workflows-my',
    path: 'workflows/my',
    element: <WorkflowsListPage scope={WORKFLOW_LIST_SCOPE.MY} />,
  },
  {
    id: 'workflows-templates',
    path: 'workflows/templates',
    element: <WorkflowsListPage scope={WORKFLOW_LIST_SCOPE.TEMPLATES} />,
  },
  {
    id: 'new-workflow',
    path: 'workflows/new',
    Component: NewWorkflowPage,
  },
  {
    id: 'new-workflow-from-template',
    path: 'workflows/from-template/:slug',
    Component: NewWorkflowPage,
  },
  {
    id: 'clone-workflow',
    path: 'workflows/:id/clone',
    Component: NewWorkflowPage,
  },
  {
    id: 'edit-workflow',
    path: 'workflows/:id/edit',
    Component: EditWorkflowPage,
  },
  {
    id: 'view-workflow',
    path: 'workflows/:id',
    Component: ViewWorkflowPage,
  },
  {
    id: 'view-workflow-template',
    path: 'workflows/templates/:slug',
    Component: ViewWorkflowTemplatePage,
  },
  {
    id: 'workflow-execution',
    path: 'workflows/:workflowId/workflow-executions/:executionId',
    Component: WorkflowExecutionPage,
  },
]

const applicationRoutes: RouteObject[] = [
  {
    id: 'applications',
    path: 'applications',
    Component: ApplicationsPage,
  },
  {
    id: 'application-federation',
    path: 'applications/:slug',
    Component: ApplicationFederationPage,
  },
  {
    id: 'application-iframe',
    path: 'applications/iframe/:slug',
    Component: ApplicationIframePage,
  },
]

const aiAdoptionConfigRoutes: RouteObject[] = [
  {
    id: 'ai-adoption-config',
    path: '/settings/administration/ai-adoption-config',
    Component: AiAdoptionConfigPage,
  },
]

const settingsRoutes: RouteObject[] = [
  {
    id: 'settings',
    path: '/settings/profile',
    Component: ProfilePage,
  },
  {
    path: '/settings/administration',
    Component: AdministrationPage,
  },
  {
    path: '/settings/administration/projects',
    Component: ProjectsManagementPage,
  },
  {
    path: '/settings/administration/mcps',
    Component: MCPManagementPage,
  },
  {
    path: '/settings/administration/categories',
    Component: CategoriesManagementPage,
  },
  {
    id: 'providers-management',
    path: '/settings/administration/providers',
    Component: ProvidersManagementPage,
  },
  {
    id: 'providers-create',
    path: '/settings/administration/providers/new',
    Component: ProvidersCreatePage,
  },
  {
    id: 'providers-view',
    path: '/settings/administration/providers/:id',
    Component: ProvidersViewPage,
  },
  {
    id: 'providers-edit',
    path: '/settings/administration/providers/:id/edit',
    Component: ProvidersEditPage,
  },
]

const awsSettingsRoutes: RouteObject[] = [
  {
    id: 'aws-assistant-settings',
    path: 'settings/aws/assistants',
    Component: AwsAssistantsPage,
  },
  {
    id: 'aws-assistant-settings-detail',
    path: 'settings/aws/assistants/:settingId',
    Component: AwsAssistantsPage,
  },
  {
    path: 'settings/aws/assistants/:settingId/:agentId',
    Component: AwsAssistantsPage,
  },
  {
    id: 'aws-workflow-settings',
    path: 'settings/aws/workflows',
    Component: AwsWorkflowsPage,
  },
  {
    id: 'aws-workflow-settings-detail',
    path: 'settings/aws/workflows/:settingId',
    Component: AwsWorkflowsPage,
  },
  {
    path: 'settings/aws/workflows/:settingId/:flowId',
    Component: AwsWorkflowsPage,
  },
  {
    id: 'aws-data-source-settings',
    path: 'settings/aws/data-sources',
    Component: AwsDataSourcesPage,
  },
  {
    id: 'aws-data-source-settings-detail',
    path: 'settings/aws/data-sources/:settingId',
    Component: AwsDataSourcesPage,
  },
  {
    id: 'aws-guardrail-settings',
    path: 'settings/aws/guardrails',
    Component: AwsGuardrailsPage,
  },
  {
    id: 'aws-guardrail-settings-detail',
    path: 'settings/aws/guardrails/:settingId',
    Component: AwsGuardrailsPage,
  },
  {
    path: 'settings/aws/guardrails/:settingId/:guardrailId',
    Component: AwsGuardrailsPage,
  },
]

const analyticsRoutes: RouteObject[] = [
  {
    id: ANALYTICS,
    path: 'analytics',
    Component: AnalyticsPage,
  },
  {
    id: ANALYTICS_NEW_DASHBOARD,
    path: 'analytics/dashboards/new',
    element: <AnalyticsDashboardFormPage />,
  },
  {
    id: ANALYTICS_EDIT_DASHBOARD,
    path: 'analytics/dashboards/:dashboardId/edit',
    element: <AnalyticsDashboardFormPage isEditing />,
  },
]

const otherRoutes: RouteObject[] = [
  {
    index: true,
    Component: Chat,
  },
  {
    id: 'release-notes',
    path: 'release-notes',
    Component: ReleaseNotesPage,
  },
  {
    id: 'help',
    path: 'help',
    Component: HelpPage,
  },
]

export const router = createHashRouter([
  {
    id: 'root',
    path: '/',
    Component: App,
    ErrorBoundary: ErrorPage,
    children: [
      ...chatRoutes,
      ...assistantRoutes,
      ...skillRoutes,
      ...integrationRoutes,
      ...dataSourceRoutes,
      ...katasRoutes,
      ...workflowRoutes,
      ...applicationRoutes,
      ...(isEnterpriseEdition() ? analyticsRoutes : []),
      ...(isEnterpriseEdition() ? aiAdoptionConfigRoutes : []),
      ...settingsRoutes,
      ...awsSettingsRoutes,
      ...otherRoutes,
    ],
  },
  {
    id: 'login-success',
    path: '/login-success',
    Component: LoginSuccessPage,
  },
  // {
  //   id: 'sign-in',
  //   path: '/auth/sign-in',
  //   Component: SignInPage,
  // },
  // {
  //   id: 'sign-up',
  //   path: '/auth/sign-up',
  //   Component: SignUpPage,
  // },
])

export default router
