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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MCPConfig } from '@/types/entity/mcp'

import MCPMarketplaceCard from '../MCPMarketplaceCard'

afterEach(cleanup)

const config: MCPConfig = {
  id: 'radar',
  name: 'EPAM Radar',
  categories: ['Development'],
  required_env_vars: [],
  user_id: 'user',
  project: 'project',
  is_public: true,
  is_system: true,
  usage_count: 7,
  is_active: true,
}

describe('MCPMarketplaceCard', () => {
  it.each([
    ['equal URLs', 'https://example.com/docs', 'https://example.com/docs', ['Documentation']],
    [
      'distinct URLs',
      'https://example.com/docs',
      'https://example.com/source',
      ['Documentation', 'Source Code'],
    ],
    [
      'trailing-slash difference',
      'https://example.com/docs',
      'https://example.com/docs/',
      ['Documentation', 'Source Code'],
    ],
    ['home only', 'https://example.com/docs', undefined, ['Documentation']],
    ['source only', undefined, 'https://example.com/source', ['Source Code']],
    ['empty source', 'https://example.com/docs', '', ['Documentation']],
    ['empty home', '', 'https://example.com/source', ['Source Code']],
    ['undefined URLs', undefined, undefined, []],
    ['empty URLs', '', '', []],
  ])('renders the correct destinations for %s', (_name, homeUrl, sourceUrl, titles) => {
    render(
      <MCPMarketplaceCard
        config={{ ...config, server_home_url: homeUrl, source_url: sourceUrl }}
        onSelect={vi.fn()}
        isSelected={false}
        isAlreadyAdded={false}
      />
    )

    const links = screen.queryAllByRole('link')
    expect(links.map((link) => link.getAttribute('title'))).toEqual(titles)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(link.title === 'Documentation' ? homeUrl : sourceUrl)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('deduplicates within each Radar card without changing badges, usage or Add/Added', () => {
    const onSelect = vi.fn()
    // Synthetic destinations: these do not establish equality of production Radar URLs.
    const configs: MCPConfig[] = ['EPAM Radar', 'Deprecated EPAM Radar', 'Stage EPAM Radar'].map(
      (name) => ({
        ...config,
        id: name,
        name,
        server_home_url: 'https://example.com/radar',
        source_url: 'https://example.com/radar',
      })
    )

    render(
      <>
        {configs.map((cardConfig, index) => (
          <section key={cardConfig.id} aria-label={cardConfig.name}>
            <MCPMarketplaceCard
              config={cardConfig}
              onSelect={onSelect}
              isSelected={index === 0}
              isAlreadyAdded={index === 1}
            />
          </section>
        ))}
      </>
    )

    for (const [index, cardConfig] of configs.entries()) {
      const card = within(screen.getByRole('region', { name: cardConfig.name }))
      const links = card.getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('title', 'Documentation')
      expect(links[0].getAttribute('href')).toBe('https://example.com/radar')
      expect(card.getByText('7')).toBeInTheDocument()
      expect(card.getByText('Development')).toBeInTheDocument()
      expect(card.getByText('Public')).toBeInTheDocument()
      expect(card.getByText('System')).toBeInTheDocument()

      const button = card.getByRole('button', { name: index === 1 ? 'Added' : 'Add' })
      if (index === 1) {
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(onSelect).not.toHaveBeenCalled()
      } else {
        expect(button).toBeEnabled()
        fireEvent.click(button)
        expect(onSelect).toHaveBeenCalledExactlyOnceWith(cardConfig)
        onSelect.mockClear()
      }
    }
  })
})
