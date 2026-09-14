// EPMCDME-14848 verification harness. Copy to src/__verify__/verifyJiraCustomFields.tsx
// together with harness.verify-jira-fields.html -> <repo>/verify-jira-fields.html, then
// `npx vite --port 5199 --strictPort` and run verify_jira_custom_fields.py.
// Renders the real JiraCustomFieldsField inside the exact wrapper markup from IndexTypeJira.tsx,
// against the app's real global SCSS + Tailwind cascade. Delete both files after the run.
// eslint-disable-next-line -- artifact copy; paths resolve only once placed under src/
/* eslint-disable import/no-unresolved */
import ReactDOM from 'react-dom/client'
import { useForm } from 'react-hook-form'

import JiraCustomFieldsField from '@/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField'
import EmbeddingsModelField from '@/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/EmbeddingsModelField'

import '../assets/stylesheets/main.scss'
import '../assets/stylesheets/vue_components.scss'

const embeddingModels = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
]

const Harness = () => {
  const { control, formState } = useForm<any>({
    defaultValues: {
      setting_id: 'setting-1',
      embeddingsModel: 'text-embedding-3-small',
      jiraCustomFields: [],
      jql: '',
    },
  })

  return (
    <div style={{ width: 520 }} className="p-8" data-testid="harness-root">
      <div data-testid="embeddings-field">
        <EmbeddingsModelField control={control} embeddingModels={embeddingModels} />
      </div>

      {/* Exactly the markup under verification from IndexTypeJira.tsx */}
      <div className="mt-6 mb-4" data-testid="custom-fields-wrapper">
        <JiraCustomFieldsField
          control={control}
          errors={formState.errors}
          projectName="TESTPROJ"
          availableSettings={[{ id: 'setting-1' }]}
        />
      </div>

      <div data-testid="next-field" className="text-sm text-text-primary">
        Next form section (stands in for IntegrationSection)
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Harness />)
