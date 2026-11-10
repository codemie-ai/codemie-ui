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
import { FC } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import {
  FILE_FILTER_PLACEHOLDER,
  GIT_FILE_FILTER_PLACEHOLDER,
  GIT_FILE_FILTER_ROWS,
} from '@/constants/dataSources'

import FilesFilterField from '../FilesFilterField'

const Wrapper: FC<{ placeholder?: string; rows?: number }> = ({ placeholder, rows }) => {
  const {
    control,
    formState: { errors },
  } = useForm({ defaultValues: { filesFilter: '' } })

  return (
    <FilesFilterField control={control} errors={errors} placeholder={placeholder} rows={rows} />
  )
}

const TICKET_PATTERNS = ['*.py', '*.txt', 'debug.log*', '/<folder_name>/*', '/<folder_name>/*/*.cs']

describe('GIT_FILE_FILTER_PLACEHOLDER', () => {
  it('contains the ticket example patterns as whole lines', () => {
    const lines = GIT_FILE_FILTER_PLACEHOLDER.split('\n')

    TICKET_PATTERNS.forEach((pattern) => expect(lines).toContain(pattern))
  })

  it('contains only known patterns besides comment and blank lines', () => {
    const allowed = [...TICKET_PATTERNS, '/<folder_name>/**/*.cs']
    const patternLines = GIT_FILE_FILTER_PLACEHOLDER.split('\n').filter(
      (line) => line.trim() !== '' && !line.startsWith('#')
    )

    patternLines.forEach((line) => expect(allowed).toContain(line))
  })

  it('has one textarea row per placeholder line so no example is clipped', () => {
    expect(GIT_FILE_FILTER_ROWS).toBe(GIT_FILE_FILTER_PLACEHOLDER.trimEnd().split('\n').length)
  })
})

describe('FilesFilterField', () => {
  it('shows the passed placeholder and rows', () => {
    render(<Wrapper placeholder={GIT_FILE_FILTER_PLACEHOLDER} rows={GIT_FILE_FILTER_ROWS} />)

    const textarea = screen.getByPlaceholderText(/folder_name/)

    expect(textarea.getAttribute('placeholder')).toBe(GIT_FILE_FILTER_PLACEHOLDER)
    expect(textarea.getAttribute('rows')).toBe(String(GIT_FILE_FILTER_ROWS))
  })

  it('keeps the shared placeholder and 4 rows by default', () => {
    render(<Wrapper />)

    const textarea = screen.getByPlaceholderText(/debug\.log/)

    expect(textarea.getAttribute('placeholder')).toBe(FILE_FILTER_PLACEHOLDER)
    expect(textarea.getAttribute('rows')).toBe('4')
  })
})
