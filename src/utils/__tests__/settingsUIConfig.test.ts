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

import { describe, expect, it } from 'vitest'

import { OAUTH_VARIANT_CREDENTIAL_TYPES } from '@/constants/integration'
import { getTestableCredentialTypes } from '@/utils/settings'
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'

describe('CREDENTIAL_UI_MAPPING', () => {
  // Regression for EPMCDME-15199: SettingsForm resolves a saved integration's config by
  // lowercasing the backend's credential_type and looking it up as a map key. A key that
  // doesn't equal serverEnum.toLowerCase() (e.g. 'msExchange' instead of 'msexchange') silently
  // fails that lookup, so edit mode falls back to defaults instead of the saved config.
  // OAuth-variant keys are exempt: they're never set as the backend's raw credential_type, and
  // deliberately carry their base type's serverEnum (see OAUTH_VARIANT_BY_BASE_TYPE).
  it('registers every non-OAuth-variant type under key === serverEnum.toLowerCase()', () => {
    Object.entries(CREDENTIAL_UI_MAPPING).forEach(([key, config]) => {
      if (OAUTH_VARIANT_CREDENTIAL_TYPES.has(key)) return
      if (!config.serverEnum) return
      expect(config.serverEnum.toLowerCase()).toBe(key)
    })
  })

  describe('sql', () => {
    const portValidation = CREDENTIAL_UI_MAPPING.sql.fields.port.validation!
    const databaseNameValidation = CREDENTIAL_UI_MAPPING.sql.fields.database_name.validation!
    const tokenValidation = CREDENTIAL_UI_MAPPING.sql.fields.token.validation!
    const urlValidation = CREDENTIAL_UI_MAPPING.sql.fields.url.validation!
    const dialectValidation = CREDENTIAL_UI_MAPPING.sql.fields.dialect.validation!
    const usernameValidation = CREDENTIAL_UI_MAPPING.sql.fields.username.validation!
    const passwordValidation = CREDENTIAL_UI_MAPPING.sql.fields.password.validation!
    const orgValidation = CREDENTIAL_UI_MAPPING.sql.fields.org.validation!
    const bucketValidation = CREDENTIAL_UI_MAPPING.sql.fields.bucket.validation!

    it('rejects non-numeric ports', async () => {
      await expect(portValidation.validate('abc')).rejects.toThrow('Port must be a number')
    })

    it('accepts numeric ports', async () => {
      await expect(portValidation.validate('3306')).resolves.toBe('3306')
    })

    it('rejects out-of-range ports', async () => {
      await expect(portValidation.validate('0')).rejects.toThrow('Port must be between 1 and 65535')
      await expect(portValidation.validate('65536')).rejects.toThrow(
        'Port must be between 1 and 65535'
      )
    })

    it('rejects empty port', async () => {
      await expect(portValidation.validate('')).rejects.toThrow('Port is required')
      await expect(portValidation.validate(undefined)).rejects.toThrow('Port is required')
    })

    it('rejects leading-zero ports', async () => {
      await expect(portValidation.validate('007')).rejects.toThrow(
        'Port must be between 1 and 65535'
      )
    })

    it('requires database_name for generic SQL dialects', async () => {
      await expect(
        databaseNameValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).rejects.toThrow('Database name is required')
    })

    it('does not require database_name for influxdb', async () => {
      await expect(
        databaseNameValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).resolves.toBe('')
    })

    it('requires influxdb token only for influxdb dialect', async () => {
      await expect(
        tokenValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).rejects.toThrow('Token is required')
      await expect(
        tokenValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).resolves.toBe('')
    })

    it('requires username and password for generic SQL dialects', async () => {
      await expect(
        usernameValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).rejects.toThrow('Username is required')
      await expect(
        usernameValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).resolves.toBe('')
      await expect(
        passwordValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).rejects.toThrow('Password is required')
      await expect(
        passwordValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).resolves.toBe('')
    })

    it('requires org and bucket for influxdb', async () => {
      await expect(
        orgValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).rejects.toThrow('Organization is required')
      await expect(
        orgValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).resolves.toBe('')
      await expect(
        bucketValidation.validate('', { context: {}, parent: { dialect: 'influxdb' } } as any)
      ).rejects.toThrow('Bucket is required')
      await expect(
        bucketValidation.validate('', { context: {}, parent: { dialect: 'postgres' } } as any)
      ).resolves.toBe('')
    })

    it('shows generic SQL fields only for generic SQL dialects', () => {
      expect(
        CREDENTIAL_UI_MAPPING.sql.fields.database_name.shouldShow?.({ dialect: 'postgres' })
      ).toBe(true)
      expect(
        CREDENTIAL_UI_MAPPING.sql.fields.database_name.shouldShow?.({ dialect: 'mysql' })
      ).toBe(true)
      expect(
        CREDENTIAL_UI_MAPPING.sql.fields.database_name.shouldShow?.({ dialect: 'mssql' })
      ).toBe(true)
      expect(
        CREDENTIAL_UI_MAPPING.sql.fields.database_name.shouldShow?.({ dialect: 'influxdb' })
      ).toBe(false)
    })

    it('requires database url', async () => {
      await expect(urlValidation.validate('')).rejects.toThrow('Database URL is required')
      await expect(urlValidation.validate('localhost')).resolves.toBe('localhost')
    })

    it('requires dialect', async () => {
      await expect(dialectValidation.validate('')).rejects.toThrow('Dialect is required')
      await expect(dialectValidation.validate('postgres')).resolves.toBe('postgres')
    })

    it('shows influxdb fields only for influxdb dialect', () => {
      expect(CREDENTIAL_UI_MAPPING.sql.fields.token.shouldShow?.({ dialect: 'influxdb' })).toBe(
        true
      )
      expect(CREDENTIAL_UI_MAPPING.sql.fields.org.shouldShow?.({ dialect: 'influxdb' })).toBe(true)
      expect(CREDENTIAL_UI_MAPPING.sql.fields.bucket.shouldShow?.({ dialect: 'influxdb' })).toBe(
        true
      )
      expect(CREDENTIAL_UI_MAPPING.sql.fields.token.shouldShow?.({ dialect: 'postgres' })).toBe(
        false
      )
    })
  })

  describe('msExchange', () => {
    const entry = CREDENTIAL_UI_MAPPING.msexchange
    const oauthFields = ['oauth_tenant_id', 'oauth_client_id', 'oauth_client_secret'] as const
    const ntlmFields = ['ews_url', 'service_account_username', 'service_account_password'] as const

    it('has exact serverEnum/displayName, is testable, auth_type has no default', () => {
      expect(entry.serverEnum).toBe('MSExchange')
      expect(entry.displayName).toBe('Microsoft Exchange')
      expect(entry.testable).toBe(true)
      expect(getTestableCredentialTypes()).toContain('msexchange')
      expect(entry.fields.auth_type.defaultValue).toBeUndefined()
    })

    it('requires auth_type and non-blank mailbox', async () => {
      await expect(entry.fields.auth_type.validation!.validate(undefined)).rejects.toThrow()
      await expect(entry.fields.mailbox.validation!.validate('   ')).rejects.toThrow()
    })

    it.each([
      ['oauth_azure', oauthFields, ntlmFields],
      ['ntlm', ntlmFields, oauthFields],
    ])('shows and requires only the %s path fields', async (authType, shown, hidden) => {
      shown.forEach((f) => {
        expect(entry.fields[f].shouldShow?.({ auth_type: authType })).toBe(true)
      })
      await Promise.all(
        shown.map((f) =>
          expect(
            entry.fields[f].validation!.validate('', {
              context: {},
              parent: { auth_type: authType },
            } as any)
          ).rejects.toThrow()
        )
      )
      hidden.forEach((f) => {
        expect(entry.fields[f].shouldShow?.({ auth_type: authType })).toBe(false)
      })
    })

    it('marks both secrets sensitive', () => {
      expect(entry.fields.oauth_client_secret.sensitive).toBe(true)
      expect(entry.fields.service_account_password.sensitive).toBe(true)
    })
  })
})
