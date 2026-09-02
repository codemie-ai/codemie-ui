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

import * as Yup from 'yup'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import {
  // EPMCDME-14586: Jira/Confluence/GitLab OAuth types temporarily hidden — do not delete (see entries below).
  // CONFLUENCE_OAUTH_CREDENTIAL_TYPE,
  // GITLAB_OAUTH_CREDENTIAL_TYPE,
  GOOGLE_OAUTH_CREDENTIAL_TYPE,
  // JIRA_OAUTH_CREDENTIAL_TYPE,
} from '@/constants/integration'
import { MCP_SETTINGS_TYPE } from '@/constants/settings'
import { appInfoStore } from '@/store/appInfo'
import {
  CredentialAccessType,
  CredentialComponentType,
  CredentialComponentPosition,
  CredentialRoleRestriction,
  CredentialUIMap,
} from '@/types/settingsUI'
import { validateCronExpression } from '@/utils/cronValidator'
import { ASSISTANT_IDS_KEY, MS_TEAMS_CREDENTIAL_TYPE } from '@/utils/msTeamsSettings'
import { getIANATimezoneOptions } from '@/utils/timezone'

const dynDefault =
  (credType: string, field: string, fallback = ''): (() => string) =>
  () =>
    (appInfoStore.toolFieldDefaults[`${credType}.${field}`] as string) ?? fallback

const dynDefaultBool =
  (credType: string, field: string): (() => boolean) =>
  () =>
    (appInfoStore.toolFieldDefaults[`${credType}.${field}`] as boolean) ?? false

const dynPlaceholder =
  (credType: string, field: string): (() => string) =>
  () =>
    appInfoStore.toolFieldPlaceholders[`${credType}.${field}`] ?? ''

const JIRA_URL = dynDefault('jira', 'url')
const GIT_URL = dynDefault('git', 'url')
const CONFLUENCE_URL = dynDefault('confluence', 'url')
const KUBERNETES_URL = dynDefault('kubernetes', 'url')
const KEYCLOAK_URL = dynDefault('keycloak', 'base_url')
const AZUREDEVOPS_URL = dynDefault('azuredevops', 'url')
const ELASTIC_URL = dynDefault('elastic', 'url')
const EMAIL_URL = dynDefault('email', 'url')
const SONAR_URL = dynDefault('sonar', 'url')
const ZEPHYRSCALE_URL = dynDefault('zephyrscale', 'url')
const XRAY_URL = dynDefault('xray', 'base_url')
const SERVICENOW_URL = dynDefault('servicenow', 'url')
const XWIKI_URL = dynDefault('xwiki', 'url')
const SHAREPOINT_URL = dynDefault('sharepoint', 'url')
const REPORTPORTAL_URL = dynDefault('reportportal', 'url')

const AUTH_TYPE = {
  BASIC: 'basic',
  BEARER: 'bearer',
  API_KEY: 'apikey',
  AWS_SIGNATURE: 'aws_signature',
}

const GIT_AUTH_TYPE = {
  PAT: 'pat',
  GITHUB_APP: 'github_app',
}

const SQL_DIALECT = {
  POSTGRES: 'postgres',
  MYSQL: 'mysql',
  MSSQL: 'mssql',
  INFLUXDB: 'influxdb',
}

const EMAIL_AUTH_TYPE = {
  BASIC: 'basic',
  OAUTH_AZURE: 'oauth_azure',
}

const RESOURCE_TYPE = {
  WORKFLOW: 'workflow',
  ASSISTANT: 'assistant',
}

const isBasicAuth = (values) => values.auth_type === AUTH_TYPE.BASIC
const isBearerAuth = (values) => values.auth_type === AUTH_TYPE.BEARER
const isApiKeyAuth = (values) => values.auth_type === AUTH_TYPE.API_KEY
const isAwsSignature = (values) => values.auth_type === AUTH_TYPE.AWS_SIGNATURE
const isPatGitAuth = (values) => values.auth_type === GIT_AUTH_TYPE.PAT
const isGithubAppAuth = (values) => values.auth_type === GIT_AUTH_TYPE.GITHUB_APP

const isGenericSQLDIalect = (values) =>
  [SQL_DIALECT.POSTGRES, SQL_DIALECT.MYSQL, SQL_DIALECT.MSSQL].includes(values.dialect as string)
const isInfluxDBDialect = (values) => values.dialect === SQL_DIALECT.INFLUXDB
const isWorkflowOrAsstResource = (values) =>
  [RESOURCE_TYPE.WORKFLOW, RESOURCE_TYPE.ASSISTANT].includes(values.resource_type)
const isBasicEmailAuth = (values) => values.auth_type === EMAIL_AUTH_TYPE.BASIC
const isOAuthAzureAuth = (values) => values.auth_type === EMAIL_AUTH_TYPE.OAUTH_AZURE

export const CREDENTIAL_UI_MAPPING: CredentialUIMap = {
  a2a: {
    displayName: 'A2A',
    serverEnum: 'A2A',
    fields: {
      auth_type: {
        placeholder: 'Authentication Type',
        type: CredentialComponentType.select,
        options: [
          { value: 'apikey', label: 'API Key' },
          { value: 'basic', label: 'Basic Auth' },
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'aws_signature', label: 'AWS Signature' },
        ],
      },
      auth_value: {
        placeholder: (values) => {
          if (isBearerAuth(values)) return 'Bearer Token'
          if (isApiKeyAuth(values)) return 'API Key Value'
          if (isAwsSignature(values)) return 'AWS Signature'
          return 'Authentication Value'
        },
        sensitive: true,
        shouldShow: (values) => isBearerAuth(values) || isApiKeyAuth(values),
      },
      aws_region: {
        placeholder: 'AWS Region',
        shouldShow: isAwsSignature,
      },
      aws_access_key_id: {
        placeholder: 'AWS Access Key',
        sensitive: true,
        shouldShow: isAwsSignature,
      },
      aws_secret_access_key: {
        placeholder: 'AWS Secret Key',
        sensitive: true,
        shouldShow: isAwsSignature,
      },
      aws_session_token: {
        placeholder: 'AWS Session Token',
        sensitive: true,
        shouldShow: isAwsSignature,
      },
      aws_service_name: {
        placeholder: 'AWS Service Name',
        shouldShow: isAwsSignature,
      },
      username: {
        placeholder: 'Username',
        shouldShow: isBasicAuth,
      },
      password: {
        placeholder: 'Password',
        sensitive: true,
        shouldShow: isBasicAuth,
      },
      header_name: {
        placeholder: 'Header Name (e.g. "X-API-Key")',
        shouldShow: isApiKeyAuth,
      },
    },
  },
  litellm: {
    displayName: 'LiteLLM',
    serverEnum: 'LiteLLM',
    enterpriseOnly: true,
    roleRestrictionType: CredentialRoleRestriction.ADMIN_ONLY,
    personalFeatureFlag: 'features:personalLiteLLMIntegrations',
    fields: {
      api_key: { placeholder: 'API Key', sensitive: true },
    },
  },
  jira: {
    defaultUrl: JIRA_URL,
    testable: true,
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('jira', 'url'),
        defaultValue: JIRA_URL,
        validation: Yup.string().required('URL is required').url('Value must be a valid URL'),
      },
      is_cloud: {
        placeholder: 'Is Jira Cloud',
        type: CredentialComponentType.switch,
        defaultValue: dynDefaultBool('jira', 'cloud'),
      },
      username: { placeholder: 'Username/email for Jira (Required for Jira Cloud)' },
      token: {
        validation: Yup.string().required('Token is required'),
        placeholder: 'Token',
        help: 'https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html',
        sensitive: true,
      },
    },
  },
  git: {
    defaultUrl: GIT_URL,
    fields: {
      url: { label: 'URL', placeholder: dynPlaceholder('git', 'url'), defaultValue: GIT_URL },
      auth_type: {
        placeholder: 'Authentication Type',
        type: CredentialComponentType.select,
        options: [
          { value: 'pat', label: 'Personal Access Token' },
          { value: 'github_app', label: 'GitHub Application' },
        ],
        defaultValue: dynDefault('git', 'auth_type', 'pat'),
      },
      _github_app_message: {
        type: CredentialComponentType.message,
        shouldShow: isGithubAppAuth,
        message: {
          type: 'info',
          title: 'GitHub App Setup',
          message:
            'To use GitHub App authentication, you need to create a GitHub App and install it in your organization or repository',
          link: {
            url: 'https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation',
            text: 'SETUP GUIDE',
          },
        },
      },
      _header_auth_info: {
        type: CredentialComponentType.message,
        shouldShow: isPatGitAuth,
        message: {
          type: 'info',
          title: 'Extra Header',
          message:
            'Most repositories use URL-based authentication, but some on-premise git servers (e.g., Azure DevOps Server) require header-based authentication.',
          link: {
            url: 'https://learn.microsoft.com/en-us/azure/devops/repos/git/auth-overview?view=azure-devops',
            text: 'LEARN MORE',
          },
        },
      },
      use_header_auth: {
        placeholder: 'Use Header-Based Authentication',
        type: CredentialComponentType.switch,
        defaultValue: false,
        shouldShow: isPatGitAuth,
      },
      name: {
        placeholder: 'Token name',
        shouldShow: isPatGitAuth,
      },
      token: {
        placeholder: 'Token',
        sensitive: true,
        shouldShow: isPatGitAuth,
      },
      app_id: {
        placeholder: 'GitHub App ID',
        shouldShow: isGithubAppAuth,
      },
      private_key: {
        placeholder: 'GitHub App Private Key',
        type: CredentialComponentType.textarea,
        sensitive: true,
        shouldShow: isGithubAppAuth,
      },
      installation_id: {
        placeholder: 'GitHub App Installation ID',
        shouldShow: isGithubAppAuth,
      },
    },
  },
  svn: {
    displayName: 'SVN',
    serverEnum: 'SVN',
    fields: {
      username: {
        placeholder: 'Username',
      },
      password: {
        placeholder: 'Password',
        sensitive: true,
      },
    },
  },
  confluence: {
    defaultUrl: CONFLUENCE_URL,
    testable: true,
    message: {
      type: 'warn',
      title: 'EPAM users only',
      message: 'you need to log on to kb.epam.com web app first if you use it as an URL',
      link: {
        url: 'https://kb.epam.com/',
        text: 'GO TO KB',
      },
      configKey: 'confluenceIntegrationMessage',
    },
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('confluence', 'url'),
        defaultValue: CONFLUENCE_URL,
      },
      is_cloud: {
        type: CredentialComponentType.switch,
        placeholder: 'Is Confluence Cloud',
        defaultValue: dynDefaultBool('confluence', 'cloud'),
      },
      username: { placeholder: 'Username/email for Confluence (Required for Confluence Cloud)' },
      token: {
        placeholder: 'Token/ApiKey',
        sensitive: true,
        help: 'https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html',
      },
    },
  },
  kubernetes: {
    defaultUrl: KUBERNETES_URL,
    testable: true,
    fields: {
      kubernetes_url: {
        label: 'URL',
        placeholder: dynPlaceholder('kubernetes', 'url'),
        defaultValue: KUBERNETES_URL,
      },
      kubernetes_token: { placeholder: 'Kubernetes Bearer Token', sensitive: true },
    },
  },
  aws: {
    testable: true,
    displayName: 'AWS',
    serverEnum: 'AWS',
    fields: {
      aws_region: { placeholder: 'Region (e.g. us-east-1)' },
      aws_access_key_id: {
        placeholder: 'Access Key ID (e.g. AKIAIOSFODNN7EXAMPLE)',
        sensitive: true,
      },
      aws_secret_access_key: {
        placeholder: 'Secret Access Key (e.g. wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY)',
        sensitive: true,
      },
      aws_session_token: {
        placeholder: 'Session Token (e.g. IQoJb3JpZ2luX+FZ/kfNpbPOTYB66y...NXg==)',
        sensitive: true,
      },
    },
  },
  gcp: {
    testable: true,
    displayName: 'GCP',
    serverEnum: 'GCP',
    fields: {
      gcp_api_key: { placeholder: 'Service Account Key in JSON format', sensitive: true },
    },
  },
  keycloak: {
    defaultUrl: KEYCLOAK_URL,
    fields: {
      base_url: {
        label: 'Base URL',
        placeholder: dynPlaceholder('keycloak', 'base_url'),
        defaultValue: KEYCLOAK_URL,
      },
      realm: { placeholder: 'Keycloak Realm' },
      client_id: { placeholder: 'Keycloak Client ID' },
      client_secret: { placeholder: 'Keycloak Client Secret', sensitive: true },
    },
  },
  azure: {
    defaultUrl: 'AutoGenerated',
    testable: true,
    fields: {
      azure_subscription_id: { placeholder: 'Subscription ID' },
      azure_tenant_id: { placeholder: 'Tenant ID' },
      azure_client_id: { placeholder: 'Client ID' },
      azure_client_secret: { placeholder: 'Client Secret', sensitive: true },
    },
  },
  azuredevops: {
    defaultUrl: AZUREDEVOPS_URL,
    testable: false,
    displayName: 'AzureDevOps',
    serverEnum: 'AzureDevOps',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('azuredevops', 'url'),
        defaultValue: AZUREDEVOPS_URL,
      },
      project: { placeholder: 'Project Name' },
      organization: { placeholder: 'Organization Name' },
      token: { placeholder: 'Personal Access Token (PAT)', sensitive: true },
    },
  },
  elastic: {
    defaultUrl: ELASTIC_URL,
    testable: false,
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('elastic', 'url'),
        defaultValue: ELASTIC_URL,
      },
      elastic_api_key_id: { placeholder: 'API Key ID', sensitive: true },
      elastic_api_key: { placeholder: 'API Key', sensitive: true },
    },
  },
  openapi: {
    defaultUrl: 'AutoGenerated',
    testable: false,
    displayName: 'OpenAPI',
    serverEnum: 'OpenAPI',
    fields: {
      openapi_spec: {
        placeholder: 'Open API Spec',
        type: CredentialComponentType.textarea,
      },
      is_basic_auth: {
        type: CredentialComponentType.switch,
        placeholder: 'Is Basic authorization',
      },
      openapi_username: {
        placeholder: 'Username',
        shouldShow: (values) => values.is_basic_auth === true,
      },
      openapi_api_key: {
        placeholder: (values) =>
          values.is_basic_auth === true ? 'Password' : 'API Key or header value (Optional)',
        sensitive: true,
      },
      auth_header_name: {
        placeholder: 'Auth header name',
        shouldShow: (values) => !values.is_basic_auth || values.is_basic_auth === false,
      },
    },
  },
  plugin: {
    defaultUrl: 'AutoGenerated',
    testable: false,
    fields: {
      plugin_key: { placeholder: 'Plugin Key', sensitive: true },
    },
  },
  filesystem: {
    defaultUrl: 'AutoGenerated',
    testable: false,
    displayName: 'FileSystem',
    serverEnum: 'FileSystem',
    fields: {
      root_directory: { placeholder: 'Root directory' },
    },
  },
  email: {
    defaultUrl: EMAIL_URL,
    testable: true,
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('email', 'url'),
        defaultValue: EMAIL_URL,
      },
      auth_type: {
        placeholder: 'Authentication Type',
        type: CredentialComponentType.select,
        options: [
          { value: 'basic', label: 'Basic Authentication' },
          { value: 'oauth_azure', label: 'OAuth via Microsoft Entra ID Application' },
        ],
        defaultValue: dynDefault('email', 'auth_type', 'basic'),
      },
      smtp_username: {
        placeholder: 'SMTP Server Username',
        shouldShow: isBasicEmailAuth,
      },
      smtp_password: {
        placeholder: 'SMTP Server Password',
        sensitive: true,
        shouldShow: isBasicEmailAuth,
      },
      oauth_from_email: {
        label: 'Email address to send from',
        placeholder: 'Required',
        shouldShow: isOAuthAzureAuth,
      },
      oauth_tenant_id: {
        label: 'Microsoft Entra ID Tenant',
        placeholder: 'Required',
        shouldShow: isOAuthAzureAuth,
      },
      oauth_client_id: {
        label: 'Microsoft Entra ID Application Client ID',
        placeholder: 'Required',
        shouldShow: isOAuthAzureAuth,
      },
      oauth_client_secret: {
        label: 'Microsoft Entra ID Application Secret',
        placeholder: 'Required',
        sensitive: true,
        shouldShow: isOAuthAzureAuth,
      },
      oauth_authority: {
        label: 'Microsoft Entra ID Authority',
        placeholder: 'Optional, e.g. https://login.microsoftonline.com',
        shouldShow: isOAuthAzureAuth,
      },
      oauth_scope: {
        label: 'OAuth Scope for Token Acquisition',
        placeholder: 'Optional, e.g. https://outlook.office365.com/.default',
        shouldShow: isOAuthAzureAuth,
      },
    },
  },
  sonar: {
    defaultUrl: SONAR_URL,
    testable: true,
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('sonar', 'url'),
        defaultValue: SONAR_URL,
      },
      token: { placeholder: 'Token', sensitive: true },
      sonar_project_name: { placeholder: 'Project key inside Sonar' },
    },
  },
  sql: {
    defaultUrl: 'localhost',
    testable: false,
    displayName: 'SQL',
    serverEnum: 'SQL',
    fields: {
      dialect: {
        placeholder: 'Database Dialect',
        type: CredentialComponentType.select,
        options: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mssql', label: 'MSSql' },
          { value: 'mysql', label: 'MySQL' },
          { value: 'influxdb', label: 'InfluxDB' },
        ],
      },
      url: { placeholder: 'Database URL (e.g. "localhost")' },
      port: { label: 'Port Number', placeholder: '3306' },
      database_name: {
        placeholder: 'Database or schema name',
        shouldShow: isGenericSQLDIalect,
      },
      username: {
        placeholder: 'Username',
        shouldShow: isGenericSQLDIalect,
      },
      password: {
        placeholder: 'Password',
        shouldShow: isGenericSQLDIalect,
        sensitive: true,
      },
      // InfluxDB specific fields
      token: {
        placeholder: 'InfluxDB Token',
        sensitive: true,
        shouldShow: isInfluxDBDialect,
      },
      verify_ssl: {
        type: CredentialComponentType.switch,
        placeholder: 'Verify SSL',
        shouldShow: isInfluxDBDialect,
      },
      org: {
        placeholder: 'Organization',
        shouldShow: isInfluxDBDialect,
      },
      bucket: {
        placeholder: 'Bucket',
        shouldShow: isInfluxDBDialect,
      },
    },
  },
  telegram: {
    defaultUrl: 'AutoGenerated',
    testable: false,
    fields: {
      token: { placeholder: 'Telegram Bot Token', sensitive: true },
    },
  },
  zephyrscale: {
    defaultUrl: ZEPHYRSCALE_URL,
    testable: true,
    displayName: 'ZephyrScale',
    serverEnum: 'ZephyrScale',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('zephyrscale', 'url'),
        defaultValue: ZEPHYRSCALE_URL,
      },
      token: {
        placeholder: 'API Access Token',
        sensitive: true,
        help: 'https://support.smartbear.com/zephyr-squad-cloud/docs/en/rest-api/api-access-token-management.html',
      },
    },
  },
  zephyrsquad: {
    defaultUrl: 'AutoGenerated',
    testable: true,
    displayName: 'ZephyrSquad',
    serverEnum: 'ZephyrSquad',
    deprecated: true,
    message: {
      type: 'warn',
      title: 'ZephyrSquad integration is deprecated',
      message:
        'Existing configurations are read-only — you cannot save changes here. Please migrate to Zephyr Scale or another supported integration.',
    },
    fields: {
      account_id: {
        placeholder: 'Jira Accout ID',
        help: 'https://zephyr-squad-cloud-v1.sb-docs.com/en/zephyr-squad-cloud-rest-api/generating-api-access-and-secret-keys',
      },
      access_key: { placeholder: 'Zephyr Squad Access Key', sensitive: true },
      secret_key: { placeholder: 'Zephyr Squad Secret Key', sensitive: true },
    },
  },
  xray: {
    defaultUrl: XRAY_URL,
    displayName: 'X-ray',
    serverEnum: 'Xray',
    fields: {
      base_url: {
        label: 'Base URL',
        placeholder: dynPlaceholder('xray', 'base_url'),
        defaultValue: XRAY_URL,
      },
      client_id: {
        placeholder: 'Client ID',
        help: 'https://docs.getxray.app/display/XRAYCLOUD/Authentication+-+REST+v2',
      },
      client_secret: {
        placeholder: 'Client Secret',
        sensitive: true,
        help: 'https://docs.getxray.app/display/XRAYCLOUD/Authentication+-+REST+v2',
      },
      limit: {
        placeholder: 'Max results per query (1-1000, default: 100)',
      },
    },
  },
  servicenow: {
    defaultUrl: SERVICENOW_URL,
    testable: true,
    displayName: 'ServiceNow',
    serverEnum: 'ServiceNow',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('servicenow', 'url'),
        defaultValue: SERVICENOW_URL,
      },
      api_key: {
        placeholder: 'API Key',
        help: 'https://www.servicenow.com/docs/bundle/yokohama-platform-security/page/integrate/authentication/task/configure-api-key.html',
        sensitive: true,
      },
    },
  },
  xwiki: {
    displayName: 'xWiki',
    serverEnum: 'XWiki',
    defaultUrl: XWIKI_URL,
    testable: false,
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('xwiki', 'url'),
        defaultValue: XWIKI_URL,
        validation: Yup.string().required('URL is required').url('Value must be a valid URL'),
      },
      use_bearer: {
        placeholder: 'Use Bearer Token Authentication',
        type: CredentialComponentType.switch,
        defaultValue: dynDefaultBool('xwiki', 'use_bearer'),
      },
      username: {
        placeholder: 'Username',
        shouldShow: (values) => !values.use_bearer,
        validation: Yup.string().when('use_bearer', {
          is: (value) => !value,
          then: (schema) => schema.required('Username is required for Basic Auth'),
          otherwise: (schema) => schema.notRequired(),
        }),
      },
      token: {
        placeholder: (values) => (values.use_bearer ? 'Bearer Token' : 'API Token'),
        sensitive: true,
        validation: Yup.string().required('Token is required'),
      },
    },
  },
  sharepoint: {
    defaultUrl: SHAREPOINT_URL,
    testable: false,
    displayName: 'SharePoint',
    serverEnum: 'SharePoint',
    // The authentication method radio group labels this section, so the default
    // "Authentication" header would duplicate it.
    fieldsSectionTitle: '',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('sharepoint', 'url'),
        defaultValue: SHAREPOINT_URL,
      },
      client_id: {
        placeholder: 'Azure AD Application (Client) ID',
        help: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app',
      },
      tenant_id: {
        placeholder: 'Azure AD Tenant ID',
        help: 'https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/how-to-find-tenant',
      },
      client_secret: {
        placeholder: 'Azure AD Client Secret',
        sensitive: true,
        help: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app#add-a-client-secret',
      },
    },
  },
  [MCP_SETTINGS_TYPE]: {
    defaultUrl: 'AutoGenerated',
    testable: false,
    displayName: 'MCP',
    serverEnum: 'MCP',
    fieldsManualConfiguration: {
      label: 'Environment Variables',
      sensitive: true,
      addText: 'Add Environment Variable',
    },
    fields: {},
  },
  reportportal: {
    defaultUrl: REPORTPORTAL_URL,
    testable: true,
    displayName: 'ReportPortal',
    serverEnum: 'ReportPortal',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('reportportal', 'url'),
        defaultValue: REPORTPORTAL_URL,
      },
      project: { placeholder: 'Project name' },
      api_key: { placeholder: 'API Key', sensitive: true },
    },
  },
  scheduler: {
    fieldsSectionTitle: '', // will hide Authentication header
    defaultUrl: 'AutoGenerated',
    testable: false,
    message: {
      type: 'warn',
      title: 'Warning: Budget Impact',
      message:
        'Scheduler integrations may result in significant costs if configured to run frequently. ' +
        'Use schedulers WITH CAUTION and only after thorough testing. ' +
        'Always test Assistants/Workflows manually first to prevent excessive resource consumption.',
    },
    fields: {
      is_enabled: {
        placeholder: 'Is Enabled',
        type: CredentialComponentType.switch,
        position: CredentialComponentPosition.top,
      },
      schedule: {
        placeholder: 'Valid Cron Expression (example nigtly run: 0 0 * * 1-5)',
        help: 'https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules',
        validation: Yup.string()
          .required('Schedule is required')
          .test('valid-cron', function (value) {
            if (!value || value.trim() === '') {
              return this.createError({ message: 'Schedule is required' })
            }
            const error = validateCronExpression(value)
            if (error) {
              return this.createError({ message: error })
            }
            return true
          }),
      },
      timezone: {
        placeholder: 'Timezone (e.g. Europe/Warsaw)',
        type: CredentialComponentType.select,
        options: getIANATimezoneOptions().map(({ label, value }) => ({
          label,
          value: value as string,
        })),
        validation: Yup.string().required('Timezone is required'),
      },
      resource_type: {
        placeholder: 'Resource Type',
        type: CredentialComponentType.select,
        validation: Yup.string().required('Resource Type is required'),
        options: [
          { value: 'assistant', label: 'Assistant' },
          { value: 'workflow', label: 'Workflow' },
          { value: 'datasource', label: 'Datasource' },
        ],
      },
      resource_id: { placeholder: 'Resource ID' },
      prompt: {
        placeholder: 'Initial prompt to send to the resource',
        type: CredentialComponentType.textarea,
        rows: 5,
        shouldShow: isWorkflowOrAsstResource,
      },
    },
  },
  // PROJECT_ONLY credentials
  dial: {
    accessType: CredentialAccessType.PROJECT_ONLY,
    defaultUrl: 'AutoGenerated',
    testable: false,
    displayName: 'DIAL',
    serverEnum: 'DIAL',
    fields: {
      url: { placeholder: 'URL' },
      api_key: { placeholder: 'API Key', sensitive: true },
      api_version: { placeholder: 'API Version' },
    },
  },
  // ADMIN_ONLY credentials
  webhook: {
    roleRestrictionType: CredentialRoleRestriction.ADMIN_ONLY,
    defaultUrl: 'AutoGenerated',
    testable: false,
    // Inline section headers below already group the form; suppress the outer
    // 'Authentication' heading that would otherwise sit above everything.
    fieldsSectionTitle: '',
    message: {
      type: 'warn',
      title: 'Warning: Budget Impact',
      message:
        'Webhook integrations may result in significant costs if triggered frequently. ' +
        'Use webhooks in automated pipelines WITH CAUTION and only after thorough testing. ' +
        'Always test Assistants/Workflows manually first to prevent excessive resource consumption.',
    },
    // Section groupings keep the dense form readable when GitHub, GitLab and
    // legacy header fields are all visible at once. Both provider sections
    // stay reachable simultaneously — a single webhook URL may receive events
    // from more than one source.
    fields: {
      _general_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'General',
      },
      webhook_id: {
        label: 'Webhook ID',
        placeholder: 'Webhook ID: Unique identifier of the webhook, e.g. "webhook-qwerty"',
        note: 'A webhook identifier is a unique ID for each webhook created in an application, allowing external apps like GitHub/GitLab to receive events.',
        defaultValue: '',
        autoComplete: 'off',
      },
      webhook_url_display: {
        label: 'Webhook URL',
        type: CredentialComponentType.webhookUrl,
      },
      is_enabled: {
        placeholder: 'Is Enabled',
        type: CredentialComponentType.switch,
      },
      _verification_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'Request verification (legacy header)',
        collapsible: true,
        accordionTitle: 'Advanced Security Settings (optional)',
      },
      secure_header_name: {
        label: 'Secure Header Name',
        placeholder: 'Secure Header Name: Optional field, e.g. "X-Secure-Header"',
      },
      secure_header_value: {
        label: 'Secure Header Value to check',
        placeholder: 'Secure Header Value to check: Optional field, e.g. "HASHED_VALUE"',
        sensitive: true,
      },
      _github_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'GitHub',
        collapsible: true,
        accordionTitle: 'GitHub Settings (optional)',
      },
      github_require_sha256: {
        placeholder: 'Require SHA-256 Signature',
        type: CredentialComponentType.switch,
      },
      github_webhook_secret: {
        label: 'GitHub Webhook Secret',
        placeholder: 'GitHub Webhook Secret: Optional field',
        sensitive: true,
      },
      github_event_filter: {
        label: 'GitHub Event Filter',
        placeholder:
          'GitHub Event Filter: Optional field, comma-separated events, e.g. "pull_request,push"',
      },
      _gitlab_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'GitLab',
        collapsible: true,
        accordionTitle: 'GitLab Settings (optional)',
      },
      gitlab_webhook_token: {
        label: 'GitLab Webhook Secret Token',
        placeholder: 'GitLab Webhook Secret Token: Optional field',
        sensitive: true,
      },
      gitlab_filter_mr_actions: {
        label: 'Filter merge request actions',
        placeholder: 'Filter merge request actions',
        type: CredentialComponentType.switch,
        virtual: true,
        note: 'Turn on to restrict which merge_request actions trigger this webhook. Other GitLab events (push, pipeline, tag) are always delivered regardless.',
      },
      gitlab_event_filter: {
        label: 'Allowed merge request actions',
        type: CredentialComponentType.multiselect,
        shouldShow: (values) => values.gitlab_filter_mr_actions === true,
        emptySelectionError: 'At least one merge request action must stay selected.',
        // Backend semantics (webhook.py): an unset/empty filter allows all MR
        // actions, so undefined/'' are valid. Only reject a non-empty value
        // that contains no real tokens (e.g. ' , ') — the backend would parse
        // it as an empty allowlist and reject every event.
        validation: Yup.string()
          .nullable()
          .optional()
          .test(
            'has-action-token',
            'At least one merge request action must stay selected.',
            (value) =>
              value == null || value === '' || value.split(',').some((token) => token.trim() !== '')
          ),
        options: [
          { value: 'open', label: 'Created (open)' },
          { value: 'update', label: 'Updated' },
          { value: 'close', label: 'Closed' },
          { value: 'reopen', label: 'Reopened' },
          { value: 'merge', label: 'Merged' },
          { value: 'approved,unapproved', label: 'Approved / Unapproved' },
        ],
      },
      _target_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'Target resource',
      },
      resource_type: {
        placeholder: 'Resource Type',
        type: CredentialComponentType.select,
        rowGroup: 'resource_row',
        options: [
          { value: 'assistant', label: 'Assistant' },
          { value: 'workflow', label: 'Workflow' },
          { value: 'datasource', label: 'Datasource' },
        ],
      },
      resource_id: {
        label: 'Resource',
        type: CredentialComponentType.resourceSelect,
        rowGroup: 'resource_row',
      },
    },
  },
  [GOOGLE_OAUTH_CREDENTIAL_TYPE]: {
    displayName: 'Google OAuth',
    serverEnum: 'GoogleOAuth',
    accessType: CredentialAccessType.USER_ONLY,
    fields: {},
  },
  [MS_TEAMS_CREDENTIAL_TYPE]: {
    displayName: 'MS Teams Bot',
    accessType: CredentialAccessType.PROJECT_ONLY,
    roleRestrictionType: CredentialRoleRestriction.ADMIN_ONLY,
    serverEnum: 'MSTeams',
    featureFlag: FEATURE_FLAGS.TEAMS_BOT_INTEGRATION,
    defaultUrl: 'AutoGenerated',
    testable: false,
    fieldsSectionTitle: '',
    fields: {
      [ASSISTANT_IDS_KEY]: {
        label: 'Assistants',
        type: CredentialComponentType.assistantMultiSelect,
        validation: Yup.array().of(Yup.string().required()).nullable().optional(),
      },
    },
  },
  // EPMCDME-14586: GitLab OAuth credential type temporarily hidden from the integration form.
  // Do NOT delete — uncomment (and the GITLAB_OAUTH_CREDENTIAL_TYPE import above) to re-enable.
  // [GITLAB_OAUTH_CREDENTIAL_TYPE]: {
  //   displayName: 'GitLab (OAuth)',
  //   serverEnum: 'GitLabOAuth',
  //   accessType: CredentialAccessType.ALL,
  //   fields: {
  //     instance_url: {
  //       placeholder: 'https://gitlab.com',
  //       defaultValue: 'https://gitlab.com',
  //       help: 'GitLab instance URL (gitlab.com or a self-hosted instance).',
  //     },
  //     client_id: {
  //       placeholder: 'GitLab OAuth Application ID',
  //       help: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
  //     },
  //     client_secret: {
  //       placeholder: 'GitLab OAuth Application Secret',
  //       sensitive: true,
  //       help: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
  //     },
  //     callback_base_url: {
  //       placeholder: 'https://your-codemie-host',
  //       help:
  //         'Base URL of this CodeMie deployment; the OAuth redirect URI is derived from it and ' +
  //         'must match the Redirect URI registered on the GitLab OAuth application.',
  //     },
  //   },
  // },
  // EPMCDME-14586: Jira OAuth credential type temporarily hidden from the integration form and the
  // TYPE filter. Do NOT delete — uncomment (and the JIRA_OAUTH_CREDENTIAL_TYPE import above) to re-enable.
  // [JIRA_OAUTH_CREDENTIAL_TYPE]: {
  //   displayName: 'Jira (OAuth)',
  //   serverEnum: 'JiraOAuth',
  //   accessType: CredentialAccessType.ALL,
  //   fields: {
  //     client_id: {
  //       placeholder: 'Atlassian OAuth Client ID',
  //       help: 'https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/',
  //     },
  //     client_secret: {
  //       placeholder: 'Atlassian OAuth Client Secret',
  //       sensitive: true,
  //       help: 'https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/',
  //     },
  //     callback_base_url: {
  //       placeholder: 'https://your-codemie-host',
  //       help:
  //         'Base URL of this CodeMie deployment; the OAuth redirect URI is derived from it and ' +
  //         'must match the Callback URL registered on the Atlassian OAuth (3LO) app.',
  //     },
  //   },
  // },
  // EPMCDME-14586: Confluence OAuth credential type temporarily hidden from the integration form and
  // the TYPE filter. Do NOT delete — uncomment (and the CONFLUENCE_OAUTH_CREDENTIAL_TYPE import above).
  // [CONFLUENCE_OAUTH_CREDENTIAL_TYPE]: {
  //   displayName: 'Confluence (OAuth)',
  //   serverEnum: 'ConfluenceOAuth',
  //   accessType: CredentialAccessType.ALL,
  //   fields: {
  //     client_id: {
  //       placeholder: 'Atlassian OAuth Client ID',
  //       help: 'https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/',
  //     },
  //     client_secret: {
  //       placeholder: 'Atlassian OAuth Client Secret',
  //       sensitive: true,
  //       help: 'https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/',
  //     },
  //     callback_base_url: {
  //       placeholder: 'https://your-codemie-host',
  //       help:
  //         'Base URL of this CodeMie deployment; the OAuth redirect URI is derived from it and ' +
  //         'must match the Callback URL registered on the Atlassian OAuth (3LO) app.',
  //     },
  //   },
  // },
}
