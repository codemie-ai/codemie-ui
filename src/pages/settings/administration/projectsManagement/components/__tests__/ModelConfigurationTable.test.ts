// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { describe, expect, it } from 'vitest'

import { formatModelCost, getCapabilities, getProviderLabel } from '../ModelConfigurationTable'

describe('ModelConfigurationTable helpers', () => {
  it('formats provider labels and costs from model metadata', () => {
    expect(getProviderLabel('azure_openai')).toBe('Azure OpenAI')
    expect(getProviderLabel('anthropic')).toBe('Anthropic')
    expect(formatModelCost({ input: 0.000002, output: 0.000008 })).toBe('$2.00 / $8.00')
  })

  it('keeps capabilities in the compact two-line format', () => {
    expect(
      getCapabilities({
        value: 'gpt-4.1',
        label: 'GPT-4.1',
        isDefault: false,
        multimodal: true,
        supportsTools: true,
      })
    ).toEqual(['multimodal', 'tools'])
  })
})
