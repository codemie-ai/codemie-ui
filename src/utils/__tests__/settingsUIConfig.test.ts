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

import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'

describe('CREDENTIAL_UI_MAPPING', () => {
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
})
