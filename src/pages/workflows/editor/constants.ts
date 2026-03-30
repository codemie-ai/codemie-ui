import { Tab } from '@/components/Tabs/Tabs'

export const TAB_DATA = {
  CONFIGURATION: { ID: 'configuration', LABEL: 'Basic' },
  ADVANCED: { ID: 'advanced', LABEL: 'Advanced' },
  NODE: { ID: 'node', LABEL: '' },
  EDGE: { ID: 'edge', LABEL: 'Connection' },
  YAML: { ID: 'yaml', LABEL: 'YAML' },
  ISSUES: { ID: 'issues', LABEL: 'Issues' },
} as const

export type PanelTabId = (typeof TAB_DATA)[keyof typeof TAB_DATA]['ID']
export type PanelTab = Tab<PanelTabId>
