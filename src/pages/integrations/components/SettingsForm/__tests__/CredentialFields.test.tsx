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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { describe, it, expect, vi } from 'vitest'

import { CredentialComponentType, CredentialFieldConfig } from '@/types/settingsUI'
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'

import CredentialFields from '../CredentialFields'
import MultiSelectCheckboxGroup from '../MultiSelectCheckboxGroup'

const MR_ACTION_OPTIONS = [
  { value: 'open', label: 'Created (open)' },
  { value: 'update', label: 'Updated' },
  { value: 'close', label: 'Closed' },
  { value: 'reopen', label: 'Reopened' },
  { value: 'merge', label: 'Merged' },
  { value: 'approved,unapproved', label: 'Approved / Unapproved' },
]

const gitlabEventFilterField: Record<string, CredentialFieldConfig> = {
  gitlab_event_filter: {
    label: 'GitLab MR Event Filter',
    type: CredentialComponentType.multiselect,
    options: MR_ACTION_OPTIONS,
    emptySelectionError: 'At least one merge request action must stay selected.',
  },
}

function Wrapper({ defaultValue }: Readonly<{ defaultValue?: string }>) {
  const { control } = useForm({
    defaultValues: { gitlab_event_filter: defaultValue },
  })
  return <CredentialFields control={control as any} credentialFields={gitlabEventFilterField} />
}

describe('CredentialFields — multiselect (GitLab MR event filter)', () => {
  it('renders one checkbox per configured MR action', () => {
    render(<Wrapper defaultValue="" />)

    MR_ACTION_OPTIONS.forEach((option) => {
      expect(screen.getByRole('checkbox', { name: option.label })).toBeInTheDocument()
    })
  })

  it('defaults to every action checked when no filter is stored (backward-compatible "allow all")', () => {
    render(<Wrapper defaultValue="" />)

    MR_ACTION_OPTIONS.forEach((option) => {
      expect(screen.getByRole('checkbox', { name: option.label })).toBeChecked()
    })
  })

  it('reflects a previously stored filter as only the matching boxes checked', () => {
    render(<Wrapper defaultValue="open,merge" />)

    expect(screen.getByRole('checkbox', { name: 'Created (open)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Merged' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Updated' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Closed' })).not.toBeChecked()
  })

  it('treats the combined Approved/Unapproved option as checked when both raw actions are stored', () => {
    render(<Wrapper defaultValue="open,approved,unapproved" />)

    expect(screen.getByRole('checkbox', { name: 'Approved / Unapproved' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Created (open)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Merged' })).not.toBeChecked()
  })

  it('serializes both raw actions when the combined Approved/Unapproved box is checked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    function CaptureWrapper() {
      const { control, handleSubmit } = useForm({ defaultValues: { gitlab_event_filter: 'open' } })
      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CredentialFields control={control as any} credentialFields={gitlabEventFilterField} />
          <button type="submit">Save</button>
        </form>
      )
    }

    render(<CaptureWrapper />)
    await user.click(screen.getByRole('checkbox', { name: 'Approved / Unapproved' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ gitlab_event_filter: 'open,approved,unapproved' }),
      expect.anything()
    )
  })

  it('prevents unchecking the last remaining selected action', async () => {
    const user = userEvent.setup()
    render(<Wrapper defaultValue="open" />)

    const openCheckbox = screen.getByRole('checkbox', { name: 'Created (open)' })
    expect(openCheckbox).toBeChecked()

    await user.click(openCheckbox)

    expect(screen.getByRole('checkbox', { name: 'Created (open)' })).toBeChecked()
    expect(
      screen.getByText(/at least one merge request action must stay selected/i)
    ).toBeInTheDocument()
  })

  it('clears a stale "must stay selected" message when CredentialFields remounts (e.g. re-keyed by credentialType on a type switch, per SettingsForm.tsx)', async () => {
    // Reproduces SettingsForm.tsx's real reset behavior: react-hook-form's reset() falls back to
    // the *original* mount-time defaultValues for any key omitted from the new values (confirmed
    // empirically), so switching credential type away and back can leave gitlab_event_filter at
    // the exact same string it had before — a value-diffing effect would never see a change. The
    // actual fix is SettingsForm.tsx keying <CredentialFields key={credentialType} .../> so the
    // whole subtree (and its local "blocked" state) remounts on every type switch, regardless of
    // whether the underlying value happens to come back identical.
    const user = userEvent.setup()

    function RemountingWrapper() {
      const [credentialType, setCredentialType] = useState('webhook')
      const { control } = useForm({ defaultValues: { gitlab_event_filter: 'open' } })
      return (
        <>
          <CredentialFields
            key={credentialType}
            control={control as any}
            credentialFields={gitlabEventFilterField}
          />
          <button type="button" onClick={() => setCredentialType('github')}>
            Switch away
          </button>
          <button type="button" onClick={() => setCredentialType('webhook')}>
            Switch back
          </button>
        </>
      )
    }

    render(<RemountingWrapper />)

    const openCheckbox = screen.getByRole('checkbox', { name: 'Created (open)' })
    await user.click(openCheckbox)
    expect(
      screen.getByText(/at least one merge request action must stay selected/i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Switch away' }))
    await user.click(screen.getByRole('button', { name: 'Switch back' }))

    expect(
      screen.queryByText(/at least one merge request action must stay selected/i)
    ).not.toBeInTheDocument()
    // The underlying value is unchanged ("open") — this is the remount clearing stale UI state,
    // not a value change.
    expect(screen.getByRole('checkbox', { name: 'Created (open)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Merged' })).not.toBeChecked()
  })

  it('falls back to a generic empty-selection message for multiselect fields that do not set emptySelectionError', async () => {
    const user = userEvent.setup()
    const genericMultiselectField: Record<string, CredentialFieldConfig> = {
      some_other_filter: {
        label: 'Some Other Filter',
        type: CredentialComponentType.multiselect,
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
      },
    }

    function OtherWrapper() {
      const { control } = useForm({ defaultValues: { some_other_filter: 'a' } })
      return (
        <CredentialFields control={control as any} credentialFields={genericMultiselectField} />
      )
    }

    render(<OtherWrapper />)
    await user.click(screen.getByRole('checkbox', { name: 'Option A' }))

    expect(screen.getByText(/at least one option must stay selected/i)).toBeInTheDocument()
    expect(screen.queryByText(/merge request/i)).not.toBeInTheDocument()
  })
})

describe('CredentialFields — note "Full URL" preview scoping', () => {
  const buildWebhookURL = (value: string) =>
    `https://api.example.com/v1/webhooks/${value && value.trim() !== '' ? value : '<id>'}`

  function NoteWrapper({
    fields,
    values,
  }: Readonly<{
    fields: Record<string, CredentialFieldConfig>
    values: Record<string, unknown>
  }>) {
    const { control } = useForm({ defaultValues: values })
    return (
      <CredentialFields
        control={control as any}
        credentialFields={fields}
        buildWebhookURL={buildWebhookURL}
      />
    )
  }

  it('appends the Full URL only when the field opts in via showWebhookUrl', () => {
    render(
      <NoteWrapper
        fields={{
          webhook_id: {
            placeholder: 'Webhook ID',
            note: 'A webhook identifier.',
            showWebhookUrl: true,
          },
        }}
        values={{ webhook_id: 'abc123' }}
      />
    )

    expect(
      screen.getByText(/Full URL: https:\/\/api\.example\.com\/v1\/webhooks\/abc123/)
    ).toBeInTheDocument()
  })

  it('does NOT append the Full URL to a multiselect note (regression: stray URL under MR action filter)', () => {
    render(
      <NoteWrapper
        fields={{
          gitlab_event_filter: {
            label: 'Trigger on merge request actions',
            type: CredentialComponentType.multiselect,
            note: 'Applies to merge_request events only.',
            options: MR_ACTION_OPTIONS,
          },
        }}
        values={{ gitlab_event_filter: 'approved,unapproved,close,open' }}
      />
    )

    expect(screen.getByText(/Applies to merge_request events only\./)).toBeInTheDocument()
    expect(screen.queryByText(/Full URL:/)).not.toBeInTheDocument()
  })
})

describe('MultiSelectCheckboxGroup — hardening', () => {
  it('renders without crashing when no options are provided', () => {
    render(<MultiSelectCheckboxGroup name="empty" value="" onChange={vi.fn()} />)

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('clears the empty-selection message when resetKey changes even if value stays string-equal', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <MultiSelectCheckboxGroup
        name="filter"
        options={[{ value: 'open', label: 'Created (open)' }]}
        value="open"
        resetKey={0}
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: 'Created (open)' }))
    expect(screen.getByText(/at least one option must stay selected/i)).toBeInTheDocument()

    rerender(
      <MultiSelectCheckboxGroup
        name="filter"
        options={[{ value: 'open', label: 'Created (open)' }]}
        value="open"
        resetKey={1}
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/at least one option must stay selected/i)).not.toBeInTheDocument()
  })
})

describe('gitlab_event_filter Yup validation', () => {
  const { validation } = (CREDENTIAL_UI_MAPPING.webhook.fields as any).gitlab_event_filter

  it('accepts undefined, null and empty string (backend treats them as "allow all")', () => {
    expect(validation.isValidSync(undefined)).toBe(true)
    expect(validation.isValidSync(null)).toBe(true)
    expect(validation.isValidSync('')).toBe(true)
  })

  it('accepts a comma-separated action list', () => {
    expect(validation.isValidSync('open')).toBe(true)
    expect(validation.isValidSync('open,merge,approved,unapproved')).toBe(true)
  })

  it('rejects non-empty values with no real tokens (backend would parse an empty allowlist)', () => {
    expect(validation.isValidSync(' ')).toBe(false)
    expect(validation.isValidSync(' , ')).toBe(false)
    expect(validation.isValidSync(',,')).toBe(false)
  })
})

describe('webhook form section grouping', () => {
  const { fields } = CREDENTIAL_UI_MAPPING.webhook

  it('declares the five section headers in the expected order', () => {
    const keys = Object.keys(fields)
    const headers = keys.filter((k) => fields[k].type === CredentialComponentType.sectionHeader)
    expect(headers).toEqual([
      '_general_section',
      '_verification_section',
      '_github_section',
      '_gitlab_section',
      '_target_section',
    ])
    expect(headers.map((h) => fields[h].label)).toEqual([
      'General',
      'Request verification (legacy header)',
      'GitHub',
      'GitLab',
      'Target resource',
    ])
  })

  it('groups fields under their section headers (order preserved)', () => {
    const keys = Object.keys(fields)
    const idx = (k: string) => keys.indexOf(k)
    // General
    expect(idx('webhook_id')).toBeGreaterThan(idx('_general_section'))
    expect(idx('is_enabled')).toBeGreaterThan(idx('_general_section'))
    expect(idx('is_enabled')).toBeLessThan(idx('_verification_section'))
    // Request verification (legacy)
    expect(idx('secure_header_name')).toBeGreaterThan(idx('_verification_section'))
    expect(idx('secure_header_value')).toBeLessThan(idx('_github_section'))
    // GitHub
    expect(idx('github_require_sha256')).toBeGreaterThan(idx('_github_section'))
    expect(idx('github_event_filter')).toBeLessThan(idx('_gitlab_section'))
    // GitLab
    expect(idx('gitlab_webhook_token')).toBeGreaterThan(idx('_gitlab_section'))
    expect(idx('gitlab_event_filter')).toBeLessThan(idx('_target_section'))
    // Target
    expect(idx('resource_id')).toBeGreaterThan(idx('_target_section'))
  })

  it('does not gate provider blocks by another provider (both GitHub and GitLab always reachable)', () => {
    // A single webhook may receive from multiple providers; don't hide a
    // provider block based on what's filled in another provider block.
    const providerKeys = [
      'github_require_sha256',
      'github_webhook_secret',
      'github_event_filter',
      'gitlab_webhook_token',
    ]
    providerKeys.forEach((k) => expect(fields[k].shouldShow).toBeUndefined())
  })

  it('gates the GitLab MR-action multiselect behind the opt-in toggle (default: hidden)', () => {
    // The MR-action checkboxes are noise for webhooks that don't need MR
    // filtering, so they hide behind a virtual switch. The switch itself
    // has no shouldShow — it's always visible in the GitLab section.
    expect(fields.gitlab_filter_mr_actions.shouldShow).toBeUndefined()
    expect(fields.gitlab_filter_mr_actions.virtual).toBe(true)

    const gate = fields.gitlab_event_filter.shouldShow
    expect(gate).toBeDefined()
    expect(gate?.({})).toBe(false)
    expect(gate?.({ gitlab_filter_mr_actions: false })).toBe(false)
    expect(gate?.({ gitlab_filter_mr_actions: true })).toBe(true)
  })
})

describe('CredentialFields — sectionHeader rendering', () => {
  function SectionWrapper() {
    const { control } = useForm({ defaultValues: {} })
    const fields: Record<string, CredentialFieldConfig> = {
      _general_section: { type: CredentialComponentType.sectionHeader, label: 'General' },
      webhook_id: { placeholder: 'Webhook ID' },
      _github_section: { type: CredentialComponentType.sectionHeader, label: 'GitHub' },
      github_webhook_secret: { placeholder: 'GitHub Webhook Secret', sensitive: true },
    }
    return <CredentialFields control={control as any} credentialFields={fields} />
  }

  it('renders each sectionHeader as an <h5> with its label', () => {
    render(<SectionWrapper />)
    const general = screen.getByRole('heading', { level: 5, name: 'General' })
    const github = screen.getByRole('heading', { level: 5, name: 'GitHub' })
    expect(general).toBeInTheDocument()
    expect(github).toBeInTheDocument()
  })

  it('sectionHeader does not render an input Controller', () => {
    render(<SectionWrapper />)
    // The pseudo-field name should NOT appear as any form input.
    expect(screen.queryByRole('textbox', { name: /_general_section/i })).not.toBeInTheDocument()
  })
})

describe('azuredevops credential fields', () => {
  it('lists fields in order: url, organization, project, token', () => {
    const keys = Object.keys(CREDENTIAL_UI_MAPPING.azuredevops.fields)
    expect(keys).toEqual(['url', 'organization', 'project', 'token'])
  })

  it('url rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('https://dev.azure.com')).toBe(true)
  })

  it('organization rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).organization
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('my-org')).toBe(true)
  })

  it('token rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).token
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('pat-secret-123')).toBe(true)
  })

  it('project has no validation (optional)', () => {
    const projectField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).project
    expect(projectField.validation).toBeUndefined()
  })

  it('url field label is Hostname', () => {
    const urlField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(urlField.label).toBe('Hostname')
  })

  it('url required message is Hostname is required', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(() => validation.validateSync('')).toThrow('Hostname is required')
  })

  it('project placeholder indicates optional', () => {
    const projectField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).project
    expect(projectField.placeholder).toBe('Project Name (optional)')
  })
})
