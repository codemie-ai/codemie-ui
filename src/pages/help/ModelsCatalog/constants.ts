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

export const HELP_MODELS_ROUTE = '/help/models'

export const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertexai: 'Google Vertex AI',
  anthropic: 'Anthropic',
  'vertex_ai-anthropic_models': 'Vertex AI Anthropic',
}

export const CHIP_CLASS =
  'text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary'
