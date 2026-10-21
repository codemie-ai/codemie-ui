// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PROJECT_MODEL_SETTINGS } from '@/types/entity/projectModelSettings'

import ProjectOverviewIndicators from '../ProjectOverviewIndicators'

const { mockAppInfoStore, mockSettingsStore } = vi.hoisted(() => ({
  mockAppInfoStore: { getLLMModels: vi.fn(), llmRouters: [] as any[] },
  mockSettingsStore: { fetchSettings: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/projectModelSettings', () => ({ projectModelSettingsStore: mockSettingsStore }))
vi.mock('@/store/analytics', () => ({
  analyticsStore: { fetchTabularData: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/store/projectSettings', () => ({
  projectSettingsStore: { listAllProjectSettings: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

describe('ProjectOverviewIndicators - Model availability (EPMCDME-16177)', () => {
  it('counts router models in the total alongside concrete models', async () => {
    mockAppInfoStore.getLLMModels.mockResolvedValue([
      { value: 'm1', label: 'Model 1', isDefault: false },
    ])
    mockAppInfoStore.llmRouters = [{ value: 'r1', label: 'Router 1', tiers: {} as any }]
    mockSettingsStore.fetchSettings.mockResolvedValue(DEFAULT_PROJECT_MODEL_SETTINGS)

    render(
      <ProjectOverviewIndicators projectName="p1" canManageProject={false} isModelsConfigEnabled />
    )

    expect(await screen.findByText(/of 2 models/)).toBeTruthy()
  })

  it('shows "Visible" when a premium model is enabled for the project', async () => {
    mockAppInfoStore.getLLMModels.mockResolvedValue([
      { value: 'm1', label: 'Model 1', isDefault: false, isPremium: true },
    ])
    mockAppInfoStore.llmRouters = []
    mockSettingsStore.fetchSettings.mockResolvedValue(DEFAULT_PROJECT_MODEL_SETTINGS)

    render(
      <ProjectOverviewIndicators projectName="p1" canManageProject={false} isModelsConfigEnabled />
    )

    expect(await screen.findByText('Premium models: Visible')).toBeTruthy()
  })

  it('shows "Not visible" when no premium model is enabled/selected', async () => {
    mockAppInfoStore.getLLMModels.mockResolvedValue([
      { value: 'm1', label: 'Model 1', isDefault: false, isPremium: true },
    ])
    mockAppInfoStore.llmRouters = []
    mockSettingsStore.fetchSettings.mockResolvedValue({
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      mode: 'allow_list',
      models: [],
    })

    render(
      <ProjectOverviewIndicators projectName="p1" canManageProject={false} isModelsConfigEnabled />
    )

    expect(await screen.findByText('Premium models: Not visible')).toBeTruthy()
  })
})
