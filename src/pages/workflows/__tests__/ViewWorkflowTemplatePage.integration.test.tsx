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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { mockAPI, renderPage } from '@/test-utils/integration'

describe('ViewWorkflowTemplatePage - Integration', () => {
  const user = userEvent.setup()

  const createTemplateFixture = (overrides: Record<string, any> = {}) => ({
    id: 'tmpl-1',
    slug: 'my-template',
    name: 'My Template',
    description: 'Automate your data pipelines with ease',
    project: 'Project Alpha',
    yaml_config: 'nodes:\n  - id: start\n    type: START',
    video_link: null,
    created_by: { name: 'Jane Doe', username: 'jane.doe', user_id: 'u-1', id: 'u-1' },
    shared: false,
    ...overrides,
  })

  beforeEach(() => {
    ;(mockRouterState as any).params = { slug: 'my-template' }
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
  })

  afterEach(() => {
    ;(mockRouterState as any).params = {}
  })

  const waitForTemplateLoaded = (name: string) =>
    waitFor(() => {
      expect(screen.getByText(name)).toBeInTheDocument()
    })

  describe('Page Initialization', () => {
    it('loads template by slug and displays content', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.getByText('My Template')).toBeInTheDocument()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/workflows/prebuilt/my-template'),
        expect.anything()
      )
    })

    it('shows page title "Workflow Template Details" in header', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Workflow Template Details')).toBeInTheDocument()
      })
    })

    it('shows "Template not found" when API returns null', async () => {
      ;(mockRouterState as any).params = { slug: 'nonexistent' }
      mockAPI('GET', 'v1/workflows/prebuilt/nonexistent', null)

      renderPage('/workflows/templates/nonexistent')

      await waitFor(() => {
        expect(screen.getByText('Template not found')).toBeInTheDocument()
      })
    })

    it('hides template content before API resolves', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      const { container } = renderPage('/workflows/templates/my-template')

      expect(screen.queryByText('My Template')).not.toBeInTheDocument()

      await waitForTemplateLoaded('My Template')
      expect(container).toBeTruthy()
    })
  })

  describe('Template Data Display', () => {
    it('displays template name in header', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ name: 'Pipeline Automator' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Pipeline Automator')).toBeInTheDocument()
      })
    })

    it('displays author name from created_by.name', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ created_by: { name: 'Jane Doe' } })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText(/by Jane Doe/)).toBeInTheDocument()
      })
    })

    it('falls back to "System" when created_by is undefined', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ created_by: undefined })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText(/by System/)).toBeInTheDocument()
      })
    })

    it('falls back to username when created_by has no name', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ created_by: { username: 'jane.doe' } })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText(/by jane\.doe/)).toBeInTheDocument()
      })
    })

    it('displays "Shared with Project" badge when shared=true', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture({ shared: true }))

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Shared with Project')).toBeInTheDocument()
      })
    })

    it('displays "Not shared" badge when shared=false', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture({ shared: false }))

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Not shared')).toBeInTheDocument()
      })
    })

    it('displays template description', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ description: 'Automate your data pipelines with ease' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Automate your data pipelines with ease')).toBeInTheDocument()
      })
    })

    it('renders without crashing when description is absent', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ description: undefined })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')
    })

    it('renders YAML config in code block', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ yaml_config: 'nodes:\n  - id: start\n    type: START' })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      const codeEl = document.querySelector('code.language-yaml')
      expect(codeEl).not.toBeNull()
    })

    it('renders code block with empty content when yaml_config is absent', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ yaml_config: undefined })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      const codeEl = document.querySelector('code.language-yaml')
      expect(codeEl).not.toBeNull()
      expect(codeEl?.textContent?.trim()).toBe('')
    })

    it('displays project field and Overview section', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ project: 'Project Alpha' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText(/Project:/)).toBeInTheDocument()
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })
    })

    it('displays template link input in Overview', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ slug: 'my-template' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Link to workflow template')).toBeInTheDocument()
        const linkInput = screen.getByDisplayValue(/\/workflows\/templates\/my-template/)
        expect(linkInput).toBeInTheDocument()
        expect(linkInput).toHaveAttribute('readOnly')
      })
    })

    it('displays video link section when video_link is present', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ video_link: 'https://youtube.com/watch?v=abc123' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Link to Video')).toBeInTheDocument()
        const input = screen.getByDisplayValue('https://youtube.com/watch?v=abc123')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('readOnly')
      })
    })

    it('hides video link section when video_link is absent', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ video_link: undefined })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.queryByText('Link to Video')).not.toBeInTheDocument()
    })
  })

  describe('Header Action Buttons', () => {
    it('navigates to new-workflow-from-template when Create Workflow clicked', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ slug: 'my-template' })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      await user.click(screen.getByRole('button', { name: /create workflow/i }))

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'new-workflow-from-template',
        params: { slug: 'my-template' },
      })
    })

    it('navigates back when Back button is clicked', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'view-workflow-template' })
      )
    })

    it('does not show Start Chat button on template page', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.queryByRole('button', { name: /start chat/i })).not.toBeInTheDocument()
    })

    it('does not show Run workflow button on template page', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.queryByRole('button', { name: /run workflow/i })).not.toBeInTheDocument()
    })
  })

  describe('CodeBlock Interactions', () => {
    it('renders Copy button in YAML code block', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ yaml_config: 'nodes:\n  - id: start' })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
    })

    it('renders Download button in YAML code block', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ yaml_config: 'nodes:\n  - id: start' })
      )

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument()
    })
  })

  describe('Sidebar Navigation', () => {
    it('renders all standard navigation tabs', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('My Workflows')).toBeInTheDocument()
        expect(screen.getByText('All Workflows')).toBeInTheDocument()
        expect(screen.getByText('Marketplace')).toBeInTheDocument()
        expect(screen.getByText('Templates')).toBeInTheDocument()
      })
    })

    it('hides Favorites tab when features:favorites is disabled', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    })

    it('shows Favorites tab when features:favorites is enabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument()
      })
    })

    it('navigates to My Workflows when sidebar tab clicked', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      await user.click(screen.getByText('My Workflows'))

      expect(mockRouterState.push).toHaveBeenCalledWith('/workflows-my')
    })

    it('navigates to Templates when sidebar tab clicked', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', createTemplateFixture())

      renderPage('/workflows/templates/my-template')

      await waitForTemplateLoaded('My Template')

      await user.click(screen.getByText('Templates'))

      expect(mockRouterState.push).toHaveBeenCalledWith('/workflows-templates')
    })
  })

  describe('Full Page Integration Scenarios', () => {
    it('renders all fields when template has full data', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', {
        id: 'tmpl-full',
        slug: 'my-template',
        name: 'Full Template',
        description: 'Desc here',
        project: 'MyProject',
        yaml_config: 'nodes:\n  - id: start',
        video_link: 'https://video.example.com/x',
        created_by: { name: 'Alice' },
        shared: true,
      })

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Full Template')).toBeInTheDocument()
        expect(screen.getByText(/by Alice/)).toBeInTheDocument()
        expect(screen.getByText('Shared with Project')).toBeInTheDocument()
        expect(screen.getByText('Desc here')).toBeInTheDocument()
        expect(screen.getByText('MyProject')).toBeInTheDocument()
        expect(screen.getByText('Link to Video')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /start chat/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /run workflow/i })).not.toBeInTheDocument()
    })

    it('renders minimal template without optional fields', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt/my-template', {
        id: 'tmpl-min',
        slug: 'my-template',
        name: 'Minimal Template',
      })

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Minimal Template')).toBeInTheDocument()
        expect(screen.getByText(/by System/)).toBeInTheDocument()
        expect(screen.getByText('Not shared')).toBeInTheDocument()
      })

      expect(screen.queryByText('Link to Video')).not.toBeInTheDocument()

      const codeEl = document.querySelector('code.language-yaml')
      expect(codeEl).not.toBeNull()
    })

    it('fetches template using the slug from route params', async () => {
      mockAPI(
        'GET',
        'v1/workflows/prebuilt/my-template',
        createTemplateFixture({ name: 'Template A' })
      )

      renderPage('/workflows/templates/my-template')

      await waitFor(() => {
        expect(screen.getByText('Template A')).toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/prebuilt/my-template'),
          expect.anything()
        )
      })
    })
  })
})
