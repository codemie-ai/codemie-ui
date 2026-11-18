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
import orderBy from 'lodash/orderBy'
import { AutoComplete } from 'primereact/autocomplete'
import { MultiSelect as PrimeMultiselect } from 'primereact/multiselect'
import { forwardRef, useImperativeHandle, useState, useEffect, useMemo, useRef } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import RadioGroup from '@/components/form/RadioGroup/RadioGroup'
import RecordInput from '@/components/form/RecordInput/RecordInput'
import Switch from '@/components/form/Switch'
import InfoWarning from '@/components/InfoWarning'
import InfoMessage from '@/components/Message/Message'
import ProjectSelector from '@/components/ProjectSelector'
import { InfoWarningType } from '@/constants'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import {
  GOOGLE_OAUTH_CREDENTIAL_TYPE,
  OAUTH_VARIANT_BY_BASE_TYPE,
  OAUTH_VARIANT_CREDENTIAL_TYPES,
  OAUTH_VARIANT_FEATURE_FLAG,
  OAUTH_VARIANT_PROVIDER_LABEL,
  SHAREPOINT_AUTH_METHOD_OPTIONS,
  SHAREPOINT_AUTH_METHODS,
  SHAREPOINT_CREDENTIAL_TYPE,
} from '@/constants/integration'
import { useActiveHelpSegment } from '@/hooks/useActiveHelpSegment'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { ConfigItem } from '@/types/entity/configuration'
import { User } from '@/types/entity/user'
import { FilterOption } from '@/types/filters'
import { CredentialComponentPosition, CredentialComponentType } from '@/types/settingsUI'
import api from '@/utils/api'
import {
  IntegrationScope,
  IntegrationScopeValue,
  SCOPE_LABEL,
  toIntegrationScope,
} from '@/utils/integrationScope'
import { ASSISTANT_IDS_KEY } from '@/utils/msTeamsSettings'
import { registerCredentialTypeCallback } from '@/utils/onboarding'
import {
  getConfigItem,
  getAvailableCredentialsTypes,
  getCredentialUIMapping,
  getTypeScopeBinding,
  getOriginalCredentialType,
  convertCredsToKeyValue,
  SETTING_TYPE_USER,
  getCredentialMessage,
  getTestableCredentialTypes,
  getSettingsFieldsSectionTitle,
  SETTING_TYPE_PROJECT,
  generateDefaultAlias,
  slugifyType,
} from '@/utils/settings'
import toaster from '@/utils/toaster'
import { canUseProjectScope, isUserProjectAdmin } from '@/utils/user'

import OAuthTestAction from '../OAuthTestAction'
import CredentialFields from './CredentialFields'
import GoogleOAuthField from './GoogleOAuthField'
import ScopeField from './ScopeField'
import SettingFormMessage from '../SettingFormMessage/SettingFormMessage'
import TestIntegration from '../TestIntegration'
import SharePointOAuthField from './SharePointOAuthField'

export interface SettingsFormRef {
  submit: () => Promise<void>
  validate: () => Promise<boolean>
}

interface SettingsFormProps {
  onSubmit: (values: Record<string, unknown>, scope: IntegrationScope) => void | Promise<void>
  onClose?: () => void
  submitText?: string
  editing?: boolean
  projectName?: string
  settingId?: string
  settingAlias?: string
  credentialType?: string
  credentialKey?: string
  credentialValues?: Record<string, unknown>
  isGlobal?: boolean
  hideActions?: boolean
  hideType?: boolean
  settingType?: IntegrationScopeValue
  disableProject?: boolean
  disableType?: boolean
  /** Renders the Scope field (User | Project) as the first field. Off for Schedulers and the quick-create popup. */
  showScope?: boolean
  /** Initial scope when `showScope` is on; falls back to `settingType`. */
  scope?: IntegrationScopeValue
  /** Locks the Scope field (e.g. opened from a project page). */
  scopeLocked?: boolean
  /**
   * Suppresses the provider OAuth 2.0 sign-in toggle. Set by contexts that cannot consume a
   * delegated OAuth integration (e.g. the data source form), so the user cannot create one there
   * and then not find it in that form's integration dropdown.
   */
  hideOAuthToggle?: boolean
  onCredentialValuesChange?: (values: Record<string, unknown>) => void
  onCredentialTypeChange?: (type: string) => void
  shouldAutofocusInput?: boolean
}

const ALIAS_REQUIRED_ERR = 'Alias is required'

interface TypeOptionsParams {
  types: string[]
  mapping: Record<string, { displayName?: string }>
  showScope: boolean
  otherScope: IntegrationScope
  otherScopeMapping: Record<string, { displayName?: string }>
  formScope: IntegrationScope
  needsAdmin: boolean
  locked: boolean
}

const getOtherScopeTypeHint = ({
  needsAdmin,
  locked,
  formScope,
  otherScope,
}: Pick<TypeOptionsParams, 'needsAdmin' | 'locked' | 'formScope' | 'otherScope'>): string => {
  if (needsAdmin) return 'Project only · needs project admin rights'
  if (locked) return `Not available at ${SCOPE_LABEL[formScope]} scope`
  return `Switches Scope to ${SCOPE_LABEL[otherScope]}`
}

// The current scope's types plus, with the Scope field, the other scope's bound types
// (selectable when the scope can still change, listed disabled otherwise).
const buildCredentialTypeOptions = (params: TypeOptionsParams): FilterOption[] => {
  const { types, mapping, showScope, otherScope, otherScopeMapping, needsAdmin, locked } = params
  const options: FilterOption[] = types
    .filter((type) => !OAUTH_VARIANT_CREDENTIAL_TYPES.has(type))
    .map((type) => {
      const binding = showScope ? getTypeScopeBinding(type) : null
      return {
        label: mapping[type]?.displayName || getOriginalCredentialType(type),
        value: type,
        ...(binding && { badge: `${SCOPE_LABEL[binding]} only` }),
      }
    })

  if (showScope) {
    Object.entries(otherScopeMapping).forEach(([type, config]) => {
      options.push({
        label: config.displayName || getOriginalCredentialType(type),
        value: type,
        badge: `${SCOPE_LABEL[otherScope]} only`,
        disabled: locked || needsAdmin,
        hint: getOtherScopeTypeHint(params),
      })
    })
  }

  return orderBy(options, ['label'], 'asc')
}

// Types bound to the other scope. A member cannot use Project, but its Project-only types are
// still listed (disabled), so they are looked up as if by an admin.
const getOtherScopeBoundTypes = ({
  otherScope,
  user,
  canProject,
  project,
  customerConfig,
}: {
  otherScope: IntegrationScope
  user: User | null
  canProject: boolean
  project: string
  customerConfig: readonly ConfigItem[] | undefined
}) => {
  const lister = (
    otherScope === IntegrationScope.PROJECT && !canProject ? { ...user, isAdmin: true } : user
  ) as User | null
  const mapping = getCredentialUIMapping({
    settingType: otherScope,
    user: lister,
    project,
    checkIfAdminOfAnyProject: !project,
    customerConfig,
  })
  return Object.fromEntries(
    Object.entries(mapping).filter(
      ([key]) => !OAUTH_VARIANT_CREDENTIAL_TYPES.has(key) && getTypeScopeBinding(key) === otherScope
    )
  )
}

const scopeLockedByTypeMessage = (label: string, binding: IntegrationScope, other: string) =>
  `${label} is available only at ${SCOPE_LABEL[binding]} scope, so ${other} is unavailable. Pick another type to change it.`

// Project scope offers only projects the person can create in (AC-11), so a project handed in at
// Project scope (the ?project= address) that the person cannot use there is not applied. A locked
// project, as the admin project page hands in with project_name, is kept as given.
const isHandedProjectUnusable = ({
  showScope,
  scope,
  locked,
  project,
  user,
}: {
  showScope: boolean
  scope: IntegrationScope
  locked: boolean
  project?: string
  user: User | null
}): boolean =>
  showScope &&
  scope === IntegrationScope.PROJECT &&
  !locked &&
  !!project &&
  !isUserProjectAdmin(user, project)

const projectScopeTooltip = (canProject: boolean, bound: boolean, boundTooltip?: string) => {
  if (!canProject) return 'Project integrations can be created by project admins only.'
  return bound ? boundTooltip : undefined
}

const SettingsForm = forwardRef<SettingsFormRef, SettingsFormProps>((props, ref) => {
  const {
    onSubmit,
    onClose,
    submitText,
    editing = false,
    projectName: initialProjectName,
    settingId,
    settingAlias: initialSettingAlias,
    credentialType: initialCredentialType,
    credentialValues: initialCredentialValues,
    isGlobal: initialIsGlobal,
    hideActions = false,
    hideType = false,
    settingType: formSettingTypeProp = SETTING_TYPE_USER,
    disableProject = false,
    disableType = false,
    showScope = false,
    scope: initialScope,
    scopeLocked = false,
    hideOAuthToggle = false,
    onCredentialValuesChange,
    onCredentialTypeChange,
    shouldAutofocusInput = false,
  } = props

  const { user } = useSnapshot(userStore)
  const { toolFieldDefaults } = useSnapshot(appInfoStore)

  const [formScope, setFormScope] = useState<IntegrationScope>(() =>
    toIntegrationScope(showScope ? initialScope ?? formSettingTypeProp : formSettingTypeProp)
  )
  // A dropped project leaves the field empty and required, with the note a scope change shows (AC-15).
  const [handedProjectDropped] = useState(() =>
    isHandedProjectUnusable({
      showScope,
      scope: formScope,
      locked: scopeLocked || disableProject || editing,
      project: initialProjectName,
      user,
    })
  )
  const [projectName, setProjectName] = useState(() =>
    handedProjectDropped ? '' : initialProjectName || ''
  )
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal || false)
  // Once the person changes scope, or a handed-in project was dropped, the project list must not
  // pick a project for them.
  const [projectAutoPickOff, setProjectAutoPickOff] = useState(handedProjectDropped)
  const [projectClearedNote, setProjectClearedNote] = useState(handedProjectDropped)
  const [projectError, setProjectError] = useState('')
  const [typeSwitchNote, setTypeSwitchNote] = useState('')
  const [typeError, setTypeError] = useState('')
  const projectSelectorRef = useRef<PrimeMultiselect>(null)
  const credentialTypeRef = useRef<AutoComplete<FilterOption>>(null)
  // The form scope drives adminOnly, the Global switch and the credential-type lookups.
  const settingType = formScope
  const canProject = canUseProjectScope(user)
  const [customerConfig, setCustomerConfig] = useState<any>(null)
  const aliasManuallyEdited = useRef(false)
  const webhookIdManuallyEdited = useRef(false)
  const prevResourceType = useRef<string | undefined>(undefined)
  const prevProjectName = useRef<string>(projectName)

  const CREDENTIAL_TYPES = useMemo(() => {
    return getAvailableCredentialsTypes({
      settingType,
      user,
      project: projectName,
      // With the Scope field the project may still be empty: judge admin rights over any project.
      checkIfAdminOfAnyProject: showScope && !projectName,
      customerConfig,
    })
  }, [settingType, user, projectName, customerConfig, showScope])

  const CREDENTIAL_VALUES_MAPPING = useMemo(() => {
    return getCredentialUIMapping({
      settingType,
      user,
      project: projectName,
      checkIfAdminOfAnyProject: showScope && !projectName,
      customerConfig,
    })
  }, [settingType, user, projectName, customerConfig, showScope])

  // EPMCDME-14586/14587: OAuth is an authentication method within the base integration type, not a
  // separate credential type. credentialType stays the base type ('jira'/'confluence'/'git') throughout
  // — mirroring how SharePoint keeps credentialType='sharepoint' and holds its method separately. The
  // OAuth field config lives under the variant key ('jiraoauth'…) and is reached via
  // effectiveCredentialType below; that key is never the credentialType state value.
  const [credentialType, setCredentialType] = useState(
    () => initialCredentialType?.toLowerCase() ?? CREDENTIAL_TYPES[0]
  )
  const oauthVariantType = OAUTH_VARIANT_BY_BASE_TYPE[credentialType]
  // isOAuth is the separate auth-method flag (like sharePointAuthMethod). On edit it re-opens from the
  // saved auth_type=oauth marker. It does NOT depend on CREDENTIAL_VALUES_MAPPING (which loads with
  // customerConfig) so a saved OAuth integration always re-opens as OAuth even before config resolves.
  const [isOAuth, setIsOAuth] = useState<boolean>(
    () => !!oauthVariantType && initialCredentialValues?.auth_type === 'oauth'
  )
  // The config-lookup key: the OAuth variant when the toggle is on and its field config is available,
  // otherwise the base type. Used for every field/defaults/schema/message/help lookup; credentialType
  // remains the persisted identity and isOAuth remains the source of truth for the marker.
  const effectiveCredentialType =
    isOAuth && oauthVariantType && CREDENTIAL_VALUES_MAPPING[oauthVariantType] !== undefined
      ? oauthVariantType
      : credentialType
  // Incremented on every external reset() so transient field-level messages
  // (e.g. the multiselect empty-selection guard) clear even when the reset
  // re-applies a string-equal value.
  const [resetCount, setResetCount] = useState(0)
  const [manualCredentialValues, setManualCredentialValues] = useState<
    { key: string; value: string }[]
  >(() => {
    const hasManualConfig =
      CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]?.fieldsManualConfiguration
    return hasManualConfig && initialCredentialValues
      ? (convertCredsToKeyValue(initialCredentialValues) as { key: string; value: string }[])
      : []
  })

  const getCredentialDefaults = (type: string, mapping = CREDENTIAL_VALUES_MAPPING) => {
    const config = mapping[type]
    const defaults: Record<string, any> = {}

    if (config?.fields) {
      Object.entries(config.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.defaultValue !== undefined) {
          const val = fieldConfig.defaultValue
          defaults[fieldName] = typeof val === 'function' ? val() : val
        }
      })
    }

    return defaults
  }

  const getInitialCredentialValues = () => {
    const defaults = getCredentialDefaults(effectiveCredentialType)

    if (initialCredentialValues) {
      const storedValues = Object.fromEntries(
        Object.entries(initialCredentialValues).filter(
          ([, v]) => v !== '' && v !== null && v !== undefined
        )
      )
      const merged: Record<string, any> = { ...defaults, ...storedValues }
      // Auto-derive virtual gate for saved gitlab_event_filter so the toggle
      // reflects an already-persisted filter on edit.
      if (
        merged.gitlab_event_filter !== undefined &&
        merged.gitlab_event_filter !== '' &&
        merged.gitlab_filter_mr_actions === undefined
      ) {
        merged.gitlab_filter_mr_actions = true
      }
      return merged
    }

    const hasManualConfig =
      CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]?.fieldsManualConfiguration
    if (hasManualConfig) return {}

    return defaults
  }

  // SharePoint supports two mutually exclusive authentication methods, so only the
  // fields belonging to the selected one are shown - mirrors the SharePoint
  // datasource form. Existing integrations open on whichever method they were saved with.
  const isSharePoint = credentialType === SHAREPOINT_CREDENTIAL_TYPE
  const [selectedSharePointAuthMethod, setSelectedSharePointAuthMethod] = useState<string>(() => {
    if (initialCredentialValues?.auth_type === SHAREPOINT_AUTH_METHODS.OAUTH) {
      return SHAREPOINT_AUTH_METHODS.OAUTH
    }
    // Integrations saved before delegated auth existed carry no auth_type, so an
    // existing one must stay on app auth rather than appear unauthenticated.
    if (editing) return SHAREPOINT_AUTH_METHODS.APP
    // New integrations default to signing in - it needs no Azure admin involvement.
    return SHAREPOINT_AUTH_METHODS.OAUTH
  })
  // Signing in runs the PKCE flow, which the backend answers with 503 when it is off,
  // so only app auth is offered then, including for an integration saved with sign-in.
  const [isSharePointPkceAvailable] = useFeatureFlag(FEATURE_FLAGS.SHAREPOINT_PKCE)
  const sharePointAuthMethod = isSharePointPkceAvailable
    ? selectedSharePointAuthMethod
    : SHAREPOINT_AUTH_METHODS.APP
  const sharePointAuthMethodOptions = SHAREPOINT_AUTH_METHOD_OPTIONS.filter(
    (option) => isSharePointPkceAvailable || option.value !== SHAREPOINT_AUTH_METHODS.OAUTH
  )
  const isSharePointOAuth = isSharePoint && sharePointAuthMethod === SHAREPOINT_AUTH_METHODS.OAUTH
  // An integration already saved with delegated credentials stays authenticated
  // without signing in again, so only a fresh sign-in has to be required.
  const isSharePointSignedIn = initialCredentialValues?.auth_type === SHAREPOINT_AUTH_METHODS.OAUTH

  const formSchema = useMemo(() => {
    const schema: Record<string, Yup.Schema> = {
      alias: Yup.string().required(ALIAS_REQUIRED_ERR),
    }

    if (credentialType === GOOGLE_OAUTH_CREDENTIAL_TYPE) {
      if (!editing) {
        schema.oauth_state = Yup.string().required('Please sign in with Google before saving')
      }
      return Yup.object(schema)
    }

    // Signing in is the only credential the delegated method collects, so without it
    // the integration would save with no authentication at all and every later call
    // would fail asking for the app-registration fields the user never saw.
    if (isSharePointOAuth && !isSharePointSignedIn) {
      schema.oauth_state = Yup.string().required('Please sign in with Microsoft before saving')
      return Yup.object(schema)
    }

    // GitLab / Jira / Confluence OAuth integrations are saved with app credentials only; each user
    // connects their own token afterwards via the per-user OAuth flow, so there is no sign-in
    // (oauth_state) to require here. Their app-credential fields are still validated below.
    const config = CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]
    if (!config) return Yup.object(schema)

    Object.entries(config?.fields ?? {}).forEach(([key, fieldConfig]) => {
      if (fieldConfig.type === CredentialComponentType.message) return

      schema[key] = fieldConfig.validation || Yup.string().nullable().optional()
    })

    return Yup.object(schema)
  }, [
    CREDENTIAL_VALUES_MAPPING,
    effectiveCredentialType,
    credentialType,
    editing,
    isSharePointOAuth,
    isSharePointSignedIn,
  ])

  const {
    control,
    setValue: setFormValue,
    getValues,
    trigger,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(formSchema),
    defaultValues: getInitialCredentialValues(),
  })

  const formValues = useWatch({ control })

  const mappingExists = useMemo(() => {
    return CREDENTIAL_VALUES_MAPPING[effectiveCredentialType] !== undefined
  }, [CREDENTIAL_VALUES_MAPPING, effectiveCredentialType])

  const handleSharePointAuthMethodChange = (method: string) => {
    setSelectedSharePointAuthMethod(method)
    // Drop a sign-in captured before the user switched back to app auth, so the
    // backend does not receive an oauth_state that would override the typed fields.
    if (method === SHAREPOINT_AUTH_METHODS.APP) {
      setFormValue('oauth_state', '')
      clearErrors('oauth_state')
    }
  }

  // EPMCDME-14587: the provider's OAuth sign-in is gated by an env-driven runtime feature flag
  // (delivered on GET /v1/config). A disabled flag hides the toggle, matching the backend routers
  // that 503 on the same flag. Called unconditionally; a non-OAuth type resolves to no flag -> false.
  const [providerOAuthEnabled] = useFeatureFlag(
    (oauthVariantType && OAUTH_VARIANT_FEATURE_FLAG[oauthVariantType]) || ''
  )
  // Only offer the toggle when the OAuth variant is actually available in this context
  // (role/enterprise gating via CREDENTIAL_VALUES_MAPPING) and the provider's flag is enabled.
  const showOAuthToggle =
    !hideOAuthToggle &&
    !!oauthVariantType &&
    CREDENTIAL_VALUES_MAPPING[oauthVariantType] !== undefined &&
    providerOAuthEnabled

  const handleOAuthToggle = (useOAuth: boolean) => {
    if (!oauthVariantType) return
    // credentialType stays the base type; only the auth-method flag flips. Re-seed the form with the
    // now-effective config's defaults so OAuth/PAT fields swap in (mirrors handleCredentialTypeChange).
    setIsOAuth(useOAuth)
    const nextEffective = useOAuth ? oauthVariantType : credentialType
    reset({ alias: getValues('alias'), ...getCredentialDefaults(nextEffective) })
    setResetCount((count) => count + 1)
  }

  useEffect(() => {
    const loadConfig = async () => {
      const config = await appInfoStore.fetchCustomerConfig()
      setCustomerConfig(config)
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (onCredentialValuesChange) {
      const emitted = Object.fromEntries(
        Object.entries(formValues).filter(([_, value]) => value !== undefined)
      )
      // EPMCDME-14587: isOAuth is the source of truth for the auth method, so ensure the auth_type=oauth
      // marker rides along in the propagated values. Consumers (e.g. the integration edit page's
      // EditIntegrationActions) read credentialValues.auth_type to route the OAuth vs PAT test action;
      // without this an OAuth-toggled integration would emit no marker and fall back to the PAT test.
      // Toggling OAuth off resets the form to the base-type defaults, so no stale marker survives here.
      if (isOAuth) emitted.auth_type = 'oauth'
      onCredentialValuesChange(emitted)
    }
  }, [formValues, isOAuth, onCredentialValuesChange])

  useActiveHelpSegment(effectiveCredentialType)

  useEffect(() => {
    if (onCredentialTypeChange) {
      onCredentialTypeChange(credentialType)
    }
  }, [credentialType, onCredentialTypeChange])

  useEffect(() => {
    if (initialSettingAlias) {
      setFormValue('alias', initialSettingAlias)
    }
  }, [initialSettingAlias, setFormValue])

  useEffect(() => {
    if (editing || aliasManuallyEdited.current || !credentialType) return
    // Use the base type so toggling OAuth on/off keeps a stable "jira-…"/"confluence-…" alias.
    const defaultAlias = generateDefaultAlias(credentialType)
    if (defaultAlias) setFormValue('alias', defaultAlias)
  }, [credentialType])

  useEffect(() => {
    if (credentialType !== 'webhook' || editing || webhookIdManuallyEdited.current) return
    const alias = formValues.alias as string | undefined
    if (!alias) return
    const slug = slugifyType(alias)
    if (!slug || (formValues.webhook_id as string | undefined) === slug) return
    setFormValue('webhook_id', slug, { shouldDirty: false, shouldTouch: false })
  }, [formValues.alias, formValues.webhook_id, credentialType, editing])

  // Clear the linked resource when the user switches between two real resource
  // types (its stored id belongs to the old type). Never fires on the initial
  // mount or edit-mode prefill (prev undefined / empty → value transition).
  useEffect(() => {
    const current = (formValues.resource_type as string | undefined) ?? ''
    const prev = prevResourceType.current
    prevResourceType.current = current
    if (prev && prev !== current && formValues.resource_id) {
      setFormValue('resource_id', '', { shouldDirty: false, shouldTouch: false })
    }
  }, [formValues.resource_type])

  // Clear the linked resource when the project changes — the previously selected
  // entity may belong to the old project and would be invalid in the new one.
  // Never fires on mount (prev === current on first render).
  useEffect(() => {
    const prev = prevProjectName.current
    prevProjectName.current = projectName
    if (prev && prev !== projectName) {
      setFormValue('resource_id', '', { shouldDirty: false, shouldTouch: false })
      setFormValue(ASSISTANT_IDS_KEY, [], { shouldDirty: false, shouldTouch: false })
    }
  }, [projectName])

  // One place for every scope switch (the Scope field today; type-driven switches later).
  // `typeAfter` is the type the caller sets in the same step (a type-driven switch); a type the
  // new scope does not offer is cleared, never replaced by another one.
  const changeScope = (next: IntegrationScope, typeAfter: string = credentialType) => {
    if (next === formScope) return
    setFormScope(next)
    setProjectAutoPickOff(true)
    setProjectError('')
    setProjectClearedNote(false)
    setTypeSwitchNote('')
    let nextProject = projectName
    if (next === IntegrationScope.PROJECT) {
      setIsGlobal(false)
      if (projectName && !isUserProjectAdmin(user, projectName)) {
        setProjectName('')
        setProjectClearedNote(true)
        nextProject = ''
      }
    }
    if (typeAfter) {
      const nextTypes = getAvailableCredentialsTypes({
        settingType: next,
        user,
        project: nextProject,
        checkIfAdminOfAnyProject: !nextProject,
        customerConfig,
      })
      if (!nextTypes.includes(typeAfter)) {
        setCredentialType('')
        setIsOAuth(false)
        reset({ alias: getValues('alias') })
        setResetCount((count) => count + 1)
      }
    }
  }

  const isScopeLocked = scopeLocked || editing
  const otherScope: IntegrationScope =
    formScope === IntegrationScope.USER ? IntegrationScope.PROJECT : IntegrationScope.USER

  // Types bound to the other scope, offered (or listed disabled) next to the current scope's types.
  const otherScopeMapping = useMemo(
    () =>
      showScope
        ? getOtherScopeBoundTypes({
            otherScope,
            user,
            canProject,
            project: projectName,
            customerConfig,
          })
        : {},
    [showScope, otherScope, canProject, user, projectName, customerConfig]
  )

  const typeLabel = (type: string) =>
    (CREDENTIAL_VALUES_MAPPING[type] ?? otherScopeMapping[type])?.displayName ||
    getOriginalCredentialType(type)

  const selectedBinding = showScope ? getTypeScopeBinding(credentialType) : null
  const lockedScopeTooltip = selectedBinding
    ? scopeLockedByTypeMessage(typeLabel(credentialType), selectedBinding, SCOPE_LABEL[otherScope])
    : undefined

  const scopeInfo = (() => {
    if (!canProject) {
      return 'Only you can use it. Project integrations can be created by project admins only.'
    }
    if (formScope === IntegrationScope.PROJECT) {
      return `Every member of the selected project can use it.${
        user?.isAdmin ? '' : ' Only projects you administer are listed.'
      }`
    }
    return 'Only you can use it. Turn on Global Integration to use it in every project you work in.'
  })()

  const credentialTypeOptions = useMemo(
    () =>
      buildCredentialTypeOptions({
        types: CREDENTIAL_TYPES,
        mapping: CREDENTIAL_VALUES_MAPPING,
        showScope,
        otherScope,
        otherScopeMapping,
        formScope,
        needsAdmin: otherScope === IntegrationScope.PROJECT && !canProject,
        locked: isScopeLocked,
      }),
    [
      CREDENTIAL_TYPES,
      CREDENTIAL_VALUES_MAPPING,
      showScope,
      otherScopeMapping,
      otherScope,
      formScope,
      canProject,
      isScopeLocked,
    ]
  )

  const handleCredentialTypeChange = (
    newType: string,
    mapping: typeof CREDENTIAL_VALUES_MAPPING = CREDENTIAL_VALUES_MAPPING
  ) => {
    setCredentialType(newType)
    setTypeError('')
    // Switching the base type resets the auth method to PAT; the toggle re-derives from the new type's
    // variant availability.
    setIsOAuth(false)
    webhookIdManuallyEdited.current = false

    const hasManualConfig = mapping[newType]?.fieldsManualConfiguration
    if (hasManualConfig) {
      setManualCredentialValues([])
    }

    if (mapping[newType]?.hideGlobalToggle) {
      setIsGlobal(false)
    }

    reset({ alias: getValues('alias'), ...getCredentialDefaults(newType, mapping) })
    setResetCount((count) => count + 1)
  }

  // The form can move to a scope unless its scope is fixed, or it is Project for a member.
  const canSwitchTo = (next: IntegrationScope) =>
    !isScopeLocked && (next !== IntegrationScope.PROJECT || canProject)

  // Picking a type bound to the other scope switches the scope through changeScope; a type bound
  // to a scope the form cannot move to is not taken.
  const pickCredentialType = (newType: string) => {
    const binding = showScope ? getTypeScopeBinding(newType) : null
    if (binding && binding !== formScope) {
      setTypeSwitchNote('')
      if (!canSwitchTo(binding)) return
      const nextMapping = getCredentialUIMapping({
        settingType: binding,
        user,
        project: projectName,
        checkIfAdminOfAnyProject: !projectName,
        customerConfig,
      })
      handleCredentialTypeChange(newType, nextMapping)
      changeScope(binding, newType)
      setTypeSwitchNote(
        `${typeLabel(newType)} is available only at ${
          SCOPE_LABEL[binding]
        } scope, so Scope switched to ${SCOPE_LABEL[binding]}.`
      )
      return
    }
    // The type field re-selects its current option when it loses focus, e.g. on the mousedown that
    // opens it. That is no change: dropping the scope-switch note or resetting the fields here moves
    // the field up under the pointer, so the click that should open it never lands (AC-13).
    if (newType === credentialType) return
    setTypeSwitchNote('')
    handleCredentialTypeChange(newType)
  }

  useEffect(() => {
    if (!customerConfig) return
    // Skip while editing: changing Project can drop the current credentialType out of
    // CREDENTIAL_TYPES (admin-only types filtered by the newly selected project), and
    // Credential Type is already locked during edit — auto-switching it here would
    // silently reset() and discard the loaded credential values (EPMCDME-12586).
    // With the Scope field nothing is auto-picked: a scope change leaves the type empty.
    if (editing || showScope) return
    if (!CREDENTIAL_TYPES.includes(credentialType) && CREDENTIAL_TYPES.length > 0) {
      handleCredentialTypeChange(CREDENTIAL_TYPES[0])
    }
    // handleCredentialTypeChange intentionally uses current form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CREDENTIAL_TYPES, credentialType, customerConfig, editing, showScope])

  // A type handed in from outside (?credentialType= on the New Integration route) is reconciled
  // with the scope once, like a pick; one bound to a scope the form cannot reach is dropped.
  useEffect(() => {
    if (!showScope || editing || !initialCredentialType) return
    const type = initialCredentialType.toLowerCase()
    const binding = getTypeScopeBinding(type)
    if (!binding || binding === formScope) return
    if (canSwitchTo(binding)) pickCredentialType(type)
    else setCredentialType('')
    // Runs on mount only: later types arrive through pickCredentialType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The tour picks a type as the person would, against the form's current state.
  const pickCredentialTypeRef = useRef(pickCredentialType)
  pickCredentialTypeRef.current = pickCredentialType
  useEffect(() => {
    return registerCredentialTypeCallback((type: string) => pickCredentialTypeRef.current(type))
  }, [])

  const isToolDefaultsLoaded = Object.keys(toolFieldDefaults).length > 0
  const appliedInitialDefaultsRef = useRef(isToolDefaultsLoaded)
  useEffect(() => {
    if (appliedInitialDefaultsRef.current || !isToolDefaultsLoaded || initialCredentialValues)
      return
    appliedInitialDefaultsRef.current = true
    reset({ alias: getValues('alias'), ...getCredentialDefaults(effectiveCredentialType) })
  }, [isToolDefaultsLoaded, effectiveCredentialType, reset, initialCredentialValues])

  const buildWebhookURL = (value: string) => {
    const webhookId = value && value.trim() !== '' ? value : '<id>'
    return `${api.BASE_URL}/v1/webhooks/${webhookId}`
  }

  const isMessagePresent = (credType: string) => {
    const messageConfig = getCredentialMessage(credType)
    if (!messageConfig) return false

    // Check shouldShow function if present
    if (messageConfig.shouldShow && !messageConfig.shouldShow(formValues)) {
      return false
    }

    if (!messageConfig.configKey) return true

    if (!customerConfig) return false
    const config = getConfigItem(customerConfig, messageConfig.configKey)
    return config?.settings?.enabled !== false
  }

  // Press Save with required fields empty: move focus to the first invalid one, in field order,
  // so a screen reader announces the error instead of focus staying on Save.
  const focusFirstInvalidField = (projectMissing: boolean, typeMissing: boolean) => {
    if (projectMissing) {
      projectSelectorRef.current?.getInput()?.focus()
      return
    }
    if (typeMissing) {
      // getInput()'s PrimeReact typing claims the InputText component itself; at runtime it is
      // the underlying <input> DOM node (see autocomplete.esm.js), which is what actually needs focus.
      ;(credentialTypeRef.current?.getInput() as unknown as HTMLInputElement | null)?.focus()
    }
  }

  const submit = async () => {
    const isValid = await trigger()
    // Any non-Global integration needs a project; a scope round trip can leave it empty at User.
    const projectMissing = showScope && !isGlobal && !projectName
    setProjectError(projectMissing ? 'Project is required' : '')
    const typeMissing = showScope && !hideType && !credentialType
    setTypeError(typeMissing ? 'Credential Type is required' : '')
    if (!isValid || projectMissing || typeMissing) {
      focusFirstInvalidField(projectMissing, typeMissing)
      return
    }

    const isGoogleOAuth = credentialType === GOOGLE_OAUTH_CREDENTIAL_TYPE

    const hasManualConfig =
      CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]?.fieldsManualConfiguration
    let credential_values: { key: string; value: unknown }[] = []
    if (!isGoogleOAuth) {
      if (hasManualConfig) {
        credential_values = manualCredentialValues.filter((item) => item.key && item.value)
      } else {
        const rawValues = { ...getValues() }
        const fieldsCfg = CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]?.fields ?? {}
        // Evaluate shouldShow against the ORIGINAL values (before stripping virtuals),
        // then drop UI-only virtual fields — so a virtual gate can still hide its dependents.
        Object.entries(fieldsCfg).forEach(([name, cfg]) => {
          if (cfg.shouldShow && !cfg.shouldShow(rawValues)) delete rawValues[name]
        })
        Object.entries(fieldsCfg).forEach(([name, cfg]) => {
          if (cfg.virtual) delete rawValues[name]
        })
        // Send the selected method explicitly. Without this the stale auth_type loaded
        // with the integration is submitted, so switching to app registration would
        // leave it marked delegated and the tool would keep using the old sign-in.
        if (isSharePoint) rawValues.auth_type = sharePointAuthMethod
        // oauth_state is forwarded as a top-level field, not stored as a credential value.
        delete rawValues.oauth_state
        credential_values = convertCredsToKeyValue(rawValues).filter(
          ({ value }) => value !== undefined
        )
      }
    }

    // EPMCDME-14586/14587: an OAuth variant is persisted under its base credential type (Jira /
    // Confluence / Git) with an auth_type=oauth marker in credential_values, rather than as its own
    // credential type. getOriginalCredentialType already folds the type; add the marker here.
    if (isOAuth) {
      credential_values = credential_values.filter(({ key }) => key !== 'auth_type')
      credential_values.push({ key: 'auth_type', value: 'oauth' })
    }

    onSubmit(
      {
        project_name: projectName,
        alias: getValues('alias'),
        credential_type: getOriginalCredentialType(credentialType),
        credential_values,
        is_global: isGlobal,
        ...(isGoogleOAuth && {
          oauth_state: getValues('oauth_state') || undefined,
        }),
        // Only sent when the user chose "Sign in with Microsoft"; the backend then
        // replaces the auth fields with the delegated tokens.
        ...(isSharePointOAuth &&
          getValues('oauth_state') && { oauth_state: getValues('oauth_state') }),
      },
      formScope
    )
  }

  useImperativeHandle(ref, () => ({
    submit,
    validate: async () => {
      const isValid = await trigger()
      if (!isValid) {
        toaster.error('Please fix form errors before testing')
      }
      return isValid
    },
  }))

  return (
    <>
      <form
        className="flex flex-col w-full gap-y-6 pt-6 px-6 mx-auto max-w-5xl pb-[272px]"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {showScope && (
          <ScopeField
            value={formScope}
            disabled={scopeLocked || editing}
            options={[
              {
                label: 'User',
                value: IntegrationScope.USER,
                disabled: selectedBinding === IntegrationScope.PROJECT,
                tooltip:
                  selectedBinding === IntegrationScope.PROJECT ? lockedScopeTooltip : undefined,
              },
              {
                label: 'Project',
                value: IntegrationScope.PROJECT,
                disabled: !canProject || selectedBinding === IntegrationScope.USER,
                tooltip: projectScopeTooltip(
                  canProject,
                  selectedBinding === IntegrationScope.USER,
                  lockedScopeTooltip
                ),
              },
            ]}
            onChange={changeScope}
            info={scopeInfo}
            lockedTooltip={lockedScopeTooltip}
            typeSwitchNote={typeSwitchNote}
            projectClearedNote={projectClearedNote}
          />
        )}
        <div data-onboarding="integration-project-scope-fields" className="flex flex-col gap-y-6">
          <ProjectSelector
            ref={projectSelectorRef}
            value={projectName}
            onChange={(e: any) => {
              const val = typeof e === 'string' ? e : e.value
              setProjectName(val)
              setProjectError('')
              setProjectClearedNote(false)
            }}
            label="Project"
            disabled={disableProject || isGlobal}
            adminOnly={settingType === SETTING_TYPE_PROJECT}
            selectDefault={!(showScope && projectAutoPickOff)}
            error={projectError || undefined}
          />

          {CREDENTIAL_VALUES_MAPPING[effectiveCredentialType] && (
            <CredentialFields
              key={effectiveCredentialType}
              control={control}
              credentialFields={CREDENTIAL_VALUES_MAPPING[effectiveCredentialType].fields}
              buildWebhookURL={buildWebhookURL}
              position={CredentialComponentPosition.top}
              editing={editing}
              resetKey={resetCount}
              project={projectName}
              onManualFieldEdit={(fieldName) => {
                if (fieldName === 'webhook_id') webhookIdManuallyEdited.current = true
              }}
            />
          )}

          {settingType === SETTING_TYPE_USER &&
            !CREDENTIAL_VALUES_MAPPING[credentialType]?.hideGlobalToggle && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isGlobal"
                    value={isGlobal}
                    onChange={(e) => setIsGlobal(e.target.checked)}
                    label="Global Integration"
                  />
                </div>
                <InfoMessage>
                  By enabling, it will become versatile and can be applied across multiple projects
                  without being tied to any specific one.
                </InfoMessage>
              </div>
            )}
        </div>

        {!hideType && (
          <div data-onboarding="integration-credential-type-field">
            <Autocomplete
              ref={credentialTypeRef}
              id="credentialType"
              value={credentialType}
              name="credentialType"
              placeholder="Credential Type"
              label="Credential Type"
              allowEmpty={showScope}
              options={credentialTypeOptions}
              disabled={editing || disableType}
              error={typeError || undefined}
              onChange={pickCredentialType}
            />
          </div>
        )}

        {showOAuthToggle && (
          <div data-onboarding="integration-oauth-toggle">
            <Switch
              id="useOAuth"
              value={isOAuth}
              onChange={(e) => handleOAuthToggle(e.target.checked)}
              // EPMCDME-14582: only `editing` disables the auth-method toggle. `disableType` locks the
              // base credential type (e.g. the assistant-tools popup fixes it to the tool's type) but
              // must NOT block choosing OAuth vs PAT — OAuth persists under the same base type.
              disabled={editing}
              styledDisabled
              // EPMCDME-14587: name the provider — GitLab is the only OAuth provider under the shared
              // Git type, so a bare "Use OAuth 2.0 sign-in" was ambiguous. showOAuthToggle guarantees
              // oauthVariantType is a known variant here.
              label={`Use ${OAUTH_VARIANT_PROVIDER_LABEL[oauthVariantType]} OAuth 2.0 sign-in`}
              hint="Authorize with your own account through a browser sign-in instead of a shared API token. Each user connects individually."
            />
            {isOAuth && (
              <InfoWarning
                className="mt-2"
                type={InfoWarningType.WARNING}
                message="OAuth integrations are available only for assistants and workflows. They can not be used with datasources."
              />
            )}
          </div>
        )}

        <div data-onboarding="integration-alias-field">
          <Controller
            name="alias"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                id="settingAlias"
                name="settingAlias"
                placeholder="Alias*"
                label="Alias"
                error={fieldState.error?.message}
                autoFocus={shouldAutofocusInput}
                onChange={(e) => {
                  aliasManuallyEdited.current = true
                  field.onChange(e)
                }}
              />
            )}
          />
        </div>

        {isMessagePresent(effectiveCredentialType) &&
          getCredentialMessage(effectiveCredentialType) && (
            <SettingFormMessage message={getCredentialMessage(effectiveCredentialType)!} />
          )}

        {credentialType === GOOGLE_OAUTH_CREDENTIAL_TYPE ? (
          <GoogleOAuthField
            setValue={setFormValue}
            editing={editing}
            formError={errors.oauth_state?.message as string | undefined}
            initialUserEmail={initialCredentialValues?.email as string | undefined}
          />
        ) : (
          <div data-onboarding="integration-credential-fields" className="flex flex-col gap-y-6">
            {isSharePoint && (
              <div>
                <p className="mb-2 text-xs text-text-tertiary">Authentication Method:</p>
                <RadioGroup
                  name="sharePointAuthMethod"
                  options={sharePointAuthMethodOptions}
                  value={sharePointAuthMethod}
                  onChange={(v) => handleSharePointAuthMethodChange(String(v))}
                />
              </div>
            )}
            {isSharePointOAuth && (
              <SharePointOAuthField
                setValue={setFormValue}
                formError={errors.oauth_state?.message as string | undefined}
                signedIn={isSharePointSignedIn}
                initialUsername={initialCredentialValues?.username as string | undefined}
              />
            )}
            {!isSharePointOAuth &&
              (CREDENTIAL_VALUES_MAPPING[effectiveCredentialType]?.fieldsManualConfiguration ? (
                <RecordInput
                  id="manualFields"
                  value={manualCredentialValues}
                  onChange={setManualCredentialValues}
                  name="manualFields"
                  label={
                    CREDENTIAL_VALUES_MAPPING[effectiveCredentialType].fieldsManualConfiguration
                      .label
                  }
                  sensitive={
                    CREDENTIAL_VALUES_MAPPING[effectiveCredentialType].fieldsManualConfiguration
                      .sensitive
                  }
                  addText={
                    CREDENTIAL_VALUES_MAPPING[effectiveCredentialType].fieldsManualConfiguration
                      .addText
                  }
                />
              ) : (
                <>
                  {getSettingsFieldsSectionTitle(effectiveCredentialType) && (
                    <div className="-mt-3 -mb-2">
                      <hr className="opacity-25 mb-6 border-border-structural" />
                      <h4 className="text-sm font-medium">
                        {getSettingsFieldsSectionTitle(effectiveCredentialType)}
                      </h4>
                    </div>
                  )}
                  {CREDENTIAL_VALUES_MAPPING[effectiveCredentialType] && (
                    <CredentialFields
                      key={effectiveCredentialType}
                      control={control}
                      credentialFields={CREDENTIAL_VALUES_MAPPING[effectiveCredentialType].fields}
                      buildWebhookURL={buildWebhookURL}
                      editing={editing}
                      resetKey={resetCount}
                      project={projectName}
                      onManualFieldEdit={(fieldName) => {
                        if (fieldName === 'webhook_id') webhookIdManuallyEdited.current = true
                      }}
                    />
                  )}
                </>
              ))}
          </div>
        )}

        <InfoMessage>
          Important note: Your sensitive information is encrypted for security and displayed here in
          a masked format. If you&apos;re updating non-sensitive information, there&apos;s no need
          to modify the masked values — they will remain unchanged and secure.
        </InfoMessage>

        {!mappingExists && (
          <div className="text-xl">
            <p>Not implemented yet 😔</p>
          </div>
        )}
      </form>

      {!hideActions && (
        <div className="sticky bottom-0 bg-surface-base-secondary p-6 !pr-2">
          <div className="flex flex-row justify-end gap-3">
            {onClose && (
              <Button type="secondary" onClick={onClose}>
                Cancel
              </Button>
            )}

            {/* EPMCDME-14587: the PAT test button is for non-OAuth auth; hide it whenever the OAuth
                method is selected (isOAuth), whether on create (no marker yet) or edit. */}
            {!isOAuth && getTestableCredentialTypes().includes(credentialType) && (
              <TestIntegration
                credentialType={credentialType}
                credentialValues={getValues()}
                settingId={settingId}
                label="Test Integration"
                onBeforeTest={async () => {
                  const isValid = await trigger()
                  if (!isValid) {
                    toaster.error('Please fix form errors before testing')
                  }
                  return isValid
                }}
              />
            )}

            {/* Pass effectiveCredentialType so OAuthTestAction resolves the provider from the variant
                key directly — on create the auth_type=oauth marker is not in getValues() yet. */}
            <OAuthTestAction
              credentialType={effectiveCredentialType}
              credentialValues={getValues()}
              settingId={settingId}
            />

            <Button onClick={submit}>{submitText || 'Save'}</Button>
          </div>
        </div>
      )}
    </>
  )
})

SettingsForm.displayName = 'SettingsForm'

export default SettingsForm
