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

import { FC } from 'react'

import Button from '@/components/Button/Button'
import InfoBox from '@/components/form/InfoBox'
import { ButtonType } from '@/constants'
import type { AiAdoptionConfig } from '@/types/analytics'

import ConfigItem from './ConfigItem'
import ConfigItemList from './ConfigItemList'
import ConfigSection from './ConfigSection'
import ConfigSubSection from './ConfigSubSection'
import DimensionConfigSection from './DimensionConfigSection'

interface AiAdoptionConfigViewProps {
  config: AiAdoptionConfig | null
  loading?: boolean
  error?: string
  readOnly?: boolean
  editingConfig?: AiAdoptionConfig | null
  validationErrors?: Record<string, string>
  showResetButton?: boolean
  onSaveMaturity?: () => Promise<void>
  onSaveUserEngagement?: () => Promise<void>
  onSaveAssetReusability?: () => Promise<void>
  onSaveExpertiseDistribution?: () => Promise<void>
  onSaveFeatureAdoption?: () => Promise<void>
  onReset?: () => void
  onCancel?: (section: string) => void
  onUpdate?: (path: string[], value: string) => void
}

const AiAdoptionConfigView: FC<AiAdoptionConfigViewProps> = ({
  config,
  loading = false,
  error,
  readOnly = false,
  editingConfig,
  validationErrors = {},
  showResetButton = false,
  onSaveMaturity,
  onSaveUserEngagement,
  onSaveAssetReusability,
  onSaveExpertiseDistribution,
  onSaveFeatureAdoption,
  onReset,
  onCancel,
  onUpdate,
}) => {
  const displayConfig = editingConfig ?? config

  if (loading) {
    return (
      <div className="pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface-elevated rounded-lg"></div>
          <div className="h-64 bg-surface-elevated rounded-lg"></div>
          <div className="h-64 bg-surface-elevated rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-8">
        <div className="p-4 bg-failed-tertiary border border-border-error rounded-lg text-text-error">
          Error loading configuration: {error}
        </div>
      </div>
    )
  }

  if (!displayConfig) {
    return (
      <div className="pt-8">
        <div className="p-4 bg-border-specific-panel-outline rounded-lg text-text-quaternary">
          No configuration data available
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pt-8 text-text-primary">
      <div className="flex flex-col gap-4">
        <div className="p-4 rounded-lg border border-border-secondary bg-surface-base-primary/5">
          <InfoBox>
            {readOnly
              ? 'AI Adoption Framework configuration parameters. These settings determine how user activity and AI capabilities are measured and scored.'
              : 'Configure the AI Adoption Framework parameters below. These settings determine how user activity and AI capabilities are measured and scored. Changes will affect all users and projects. Weights must sum to 1.0 within each section.'}
          </InfoBox>
        </div>

        {showResetButton && onReset && (
          <div className="flex justify-end">
            <Button variant={ButtonType.DELETE} onClick={onReset}>
              Reset to Defaults
            </Button>
          </div>
        )}
      </div>

      {/* Overall Maturity Settings */}
      <ConfigSection
        title="Overall Maturity Settings"
        icon="🎯"
        onSave={onSaveMaturity}
        onCancel={() => onCancel?.('maturity')}
        hideEditButtons={readOnly}
      >
        {(isEditing) => (
          <>
            <ConfigItem
              label="Activation Threshold"
              value={displayConfig.ai_maturity?.activation_threshold?.value ?? 0}
              description={displayConfig.ai_maturity?.activation_threshold?.description}
              unit="conversations"
              isEditing={isEditing}
              onChange={(value) => onUpdate?.(['ai_maturity', 'activation_threshold'], value)}
            />

            <ConfigItem
              label="Minimum Users Threshold"
              value={displayConfig.ai_maturity?.minimum_users_threshold?.value ?? 5}
              description={displayConfig.ai_maturity?.minimum_users_threshold?.description}
              unit="users"
              isEditing={isEditing}
              onChange={(value) => onUpdate?.(['ai_maturity', 'minimum_users_threshold'], value)}
            />

            <div className="pt-4 border-t border-border-specific-panel-outline">
              <p className="text-sm font-medium text-text-primary mb-3">
                Maturity Level Thresholds
              </p>
              <div className="space-y-4">
                <ConfigItem
                  label="L2 (Augmented)"
                  value={displayConfig.ai_maturity?.maturity_levels?.level_2_threshold?.value ?? 0}
                  description={
                    displayConfig.ai_maturity?.maturity_levels?.level_2_threshold?.description
                  }
                  isEditing={isEditing}
                  onChange={(value) =>
                    onUpdate?.(['ai_maturity', 'maturity_levels', 'level_2_threshold'], value)
                  }
                />
                <ConfigItem
                  label="L3 (Agentic)"
                  value={displayConfig.ai_maturity?.maturity_levels?.level_3_threshold?.value ?? 0}
                  description={
                    displayConfig.ai_maturity?.maturity_levels?.level_3_threshold?.description
                  }
                  isEditing={isEditing}
                  onChange={(value) =>
                    onUpdate?.(['ai_maturity', 'maturity_levels', 'level_3_threshold'], value)
                  }
                />
              </div>
            </div>

            {displayConfig.ai_maturity?.adoption_index_weights && (
              <ConfigSubSection title="Adoption Index Weights (must sum to 1.0)">
                <ConfigItemList
                  items={displayConfig.ai_maturity.adoption_index_weights}
                  isEditing={isEditing}
                  basePath={['ai_maturity', 'adoption_index_weights']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}
          </>
        )}
      </ConfigSection>

      {/* User Engagement */}
      <DimensionConfigSection
        title="User Engagement"
        icon="👥"
        dimensionData={displayConfig.user_engagement}
        basePath={['user_engagement']}
        validationError={validationErrors['user_engagement-weights']}
        onSave={onSaveUserEngagement ?? (async () => {})}
        onCancel={() => onCancel?.('user_engagement')}
        onUpdate={onUpdate ?? (() => {})}
        hideEditButtons={readOnly}
      />

      {/* Asset Reusability */}
      <DimensionConfigSection
        title="Asset Reusability"
        icon="🔄"
        dimensionData={displayConfig.asset_reusability}
        basePath={['asset_reusability']}
        validationError={validationErrors['asset_reusability-weights']}
        onSave={onSaveAssetReusability ?? (async () => {})}
        onCancel={() => onCancel?.('asset_reusability')}
        onUpdate={onUpdate ?? (() => {})}
        hideEditButtons={readOnly}
      />

      {/* Expertise Distribution */}
      <DimensionConfigSection
        title="Expertise Distribution"
        icon="🏆"
        dimensionData={displayConfig.expertise_distribution}
        basePath={['expertise_distribution']}
        validationError={validationErrors['expertise_distribution-weights']}
        onSave={onSaveExpertiseDistribution ?? (async () => {})}
        onCancel={() => onCancel?.('expertise_distribution')}
        onUpdate={onUpdate ?? (() => {})}
        hideEditButtons={readOnly}
      >
        {(isEditing) => (
          <>
            {displayConfig.expertise_distribution?.component_weights && (
              <div>
                <p className="text-sm font-medium text-text-primary mb-3">
                  Component Weights (must sum to 1.0)
                </p>
                <div className="space-y-4">
                  <ConfigItemList
                    items={displayConfig.expertise_distribution.component_weights}
                    isEditing={isEditing}
                    basePath={['expertise_distribution', 'component_weights']}
                    onUpdate={onUpdate ?? (() => {})}
                  />
                </div>
              </div>
            )}

            {displayConfig.expertise_distribution?.parameters && (
              <ConfigSubSection title="Parameters">
                <ConfigItemList
                  items={displayConfig.expertise_distribution.parameters}
                  isEditing={isEditing}
                  basePath={['expertise_distribution', 'parameters']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.expertise_distribution?.scoring?.concentration && (
              <ConfigSubSection title="Scoring: Concentration">
                <ConfigItemList
                  items={displayConfig.expertise_distribution.scoring.concentration}
                  isEditing={isEditing}
                  basePath={['expertise_distribution', 'scoring', 'concentration']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.expertise_distribution?.scoring?.non_champion_activity?.multipliers && (
              <ConfigSubSection title="Scoring: Non-Champion Activity - Multipliers">
                <ConfigItemList
                  items={
                    displayConfig.expertise_distribution.scoring.non_champion_activity.multipliers
                  }
                  isEditing={isEditing}
                  basePath={[
                    'expertise_distribution',
                    'scoring',
                    'non_champion_activity',
                    'multipliers',
                  ]}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.expertise_distribution?.scoring?.non_champion_activity?.scores && (
              <ConfigSubSection title="Scoring: Non-Champion Activity - Scores">
                <ConfigItemList
                  items={displayConfig.expertise_distribution.scoring.non_champion_activity.scores}
                  isEditing={isEditing}
                  basePath={[
                    'expertise_distribution',
                    'scoring',
                    'non_champion_activity',
                    'scores',
                  ]}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.expertise_distribution?.scoring?.creator_diversity?.thresholds && (
              <ConfigSubSection title="Scoring: Creator Diversity - Thresholds">
                <ConfigItemList
                  items={displayConfig.expertise_distribution.scoring.creator_diversity.thresholds}
                  isEditing={isEditing}
                  basePath={[
                    'expertise_distribution',
                    'scoring',
                    'creator_diversity',
                    'thresholds',
                  ]}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.expertise_distribution?.scoring?.creator_diversity?.scores && (
              <ConfigSubSection title="Scoring: Creator Diversity - Scores">
                <ConfigItemList
                  items={displayConfig.expertise_distribution.scoring.creator_diversity.scores}
                  isEditing={isEditing}
                  basePath={['expertise_distribution', 'scoring', 'creator_diversity', 'scores']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}
          </>
        )}
      </DimensionConfigSection>

      {/* Feature Adoption */}
      <DimensionConfigSection
        title="Feature Adoption"
        icon="⚡"
        dimensionData={displayConfig.feature_adoption}
        basePath={['feature_adoption']}
        validationError={validationErrors['feature_adoption-weights']}
        onSave={onSaveFeatureAdoption ?? (async () => {})}
        onCancel={() => onCancel?.('feature_adoption')}
        onUpdate={onUpdate ?? (() => {})}
        hideEditButtons={readOnly}
      >
        {(isEditing) => (
          <>
            {displayConfig.feature_adoption?.component_weights && (
              <div>
                <p className="text-sm font-medium text-text-primary mb-3">
                  Component Weights (must sum to 1.0)
                </p>
                <div className="space-y-4">
                  <ConfigItemList
                    items={displayConfig.feature_adoption.component_weights}
                    isEditing={isEditing}
                    basePath={['feature_adoption', 'component_weights']}
                    onUpdate={onUpdate ?? (() => {})}
                  />
                </div>
              </div>
            )}

            {displayConfig.feature_adoption?.complexity_weights && (
              <ConfigSubSection title="Complexity Weights">
                <ConfigItemList
                  items={displayConfig.feature_adoption.complexity_weights}
                  isEditing={isEditing}
                  basePath={['feature_adoption', 'complexity_weights']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.feature_adoption?.parameters && (
              <ConfigSubSection title="Parameters">
                <ConfigItemList
                  items={displayConfig.feature_adoption.parameters}
                  isEditing={isEditing}
                  basePath={['feature_adoption', 'parameters']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.feature_adoption?.scoring?.workflow_count?.thresholds && (
              <ConfigSubSection title="Scoring: Workflow Count - Thresholds">
                <ConfigItemList
                  items={displayConfig.feature_adoption.scoring.workflow_count.thresholds}
                  isEditing={isEditing}
                  basePath={['feature_adoption', 'scoring', 'workflow_count', 'thresholds']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}

            {displayConfig.feature_adoption?.scoring?.workflow_count?.scores && (
              <ConfigSubSection title="Scoring: Workflow Count - Scores">
                <ConfigItemList
                  items={displayConfig.feature_adoption.scoring.workflow_count.scores}
                  isEditing={isEditing}
                  basePath={['feature_adoption', 'scoring', 'workflow_count', 'scores']}
                  onUpdate={onUpdate ?? (() => {})}
                />
              </ConfigSubSection>
            )}
          </>
        )}
      </DimensionConfigSection>
    </div>
  )
}

export default AiAdoptionConfigView
