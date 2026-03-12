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

import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal'
import { useAiAdoptionConfig } from '@/hooks/useAiAdoptionConfig'

import SettingsLayout from '../components/SettingsLayout'
import AiAdoptionConfigView from './components/AiAdoptionConfigView'

const AiAdoptionConfigPage: FC = () => {
  const {
    aiAdoptionConfig,
    loading,
    error,
    editingConfig,
    validationErrors,
    showResetConfirmation,
    handleCancel,
    handleSaveMaturity,
    handleSaveUserEngagement,
    handleSaveAssetReusability,
    handleSaveExpertiseDistribution,
    handleSaveFeatureAdoption,
    handleReset,
    handleResetConfirm,
    handleResetCancel,
    updateNestedValue,
  } = useAiAdoptionConfig({ fetchOnMount: true })

  const renderContent = () => (
    <>
      <AiAdoptionConfigView
        config={(aiAdoptionConfig?.data ?? null) as any}
        loading={loading['ai-adoption-config']}
        error={error['ai-adoption-config']?.message}
        readOnly={false}
        editingConfig={editingConfig}
        validationErrors={validationErrors}
        showResetButton={true}
        onSaveMaturity={handleSaveMaturity}
        onSaveUserEngagement={handleSaveUserEngagement}
        onSaveAssetReusability={handleSaveAssetReusability}
        onSaveExpertiseDistribution={handleSaveExpertiseDistribution}
        onSaveFeatureAdoption={handleSaveFeatureAdoption}
        onReset={handleReset}
        onCancel={handleCancel}
        onUpdate={updateNestedValue}
      />
      <ConfirmationModal
        header="Reset to Defaults"
        message="Are you sure you want to reset to default configuration? This will clear your custom settings."
        confirmText="Reset"
        cancelText="Cancel"
        visible={showResetConfirmation}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </>
  )

  return <SettingsLayout contentTitle="AI/Run Adoption Framework" content={renderContent()} />
}

export default AiAdoptionConfigPage
