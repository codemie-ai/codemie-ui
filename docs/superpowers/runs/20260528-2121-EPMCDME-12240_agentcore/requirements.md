# Requirements — EPMCDME-12240: configuration_json Structured Form

## Goal

Replace the plain JSON textarea in `AwsAgentCoreImportPopup.tsx` with a structured form that exposes all `ConfigurationJson` fields with labels and hints. The form has two modes controlled by a streaming toggle.

## Context

- **Branch**: `EPMCDME-12240_agentcore` (already active)
- **POST field**: Already `configuration_json` in `src/store/vendor.ts` — no rename needed
- **Entity field**: Already `configurationJson` on `VendorAgentCoreEndpoint` — no rename needed
- **Ticket**: EPMCDME-12240

## Key Files

| File | Role |
|---|---|
| `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx` | Main change — replace textarea with structured form |
| `src/types/entity/vendor.ts` | Add `ConfigurationJson` TypeScript type |
| `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx` | New extracted component for the structured form fields |
| `src/pages/settings/aws/agentCoreRuntimes/constants.ts` | `IMPORT_INVOCATION_PLACEHOLDER` stays (legacy support) |

## ConfigurationJson Type

```typescript
interface ConfigurationJsonReasoning {
  text_path: string
  active_path: string
  name_path?: string
  args_path?: string
}

interface ConfigurationJson {
  request?: {
    message_path?: string
  }
  response: {
    streaming: boolean
    body?: {
      text_path: string
      reasoning?: ConfigurationJsonReasoning
    }
    chunk?: {
      text_path: string
      reasoning?: ConfigurationJsonReasoning
    }
  }
}
```

## Form Fields

### Common (both modes)
| Field | Type | Required | Label | Hint |
|---|---|---|---|---|
| `request.message_path` | string | no | Message Path | Dot-notation path for the user query in the request body. Default: `message` |
| `response.streaming` | boolean | yes | Enable Streaming | Toggle between single-response and streaming SSE mode |

### Non-streaming mode (`streaming = false`)
| Field | Type | Required | Label | Hint |
|---|---|---|---|---|
| `response.body.text_path` | string | **yes** | Response Text Path | Dot-notation path to the answer text in the response body (e.g. `output`, `result.answer`) |
| `response.body.reasoning.text_path` | string | no | Thought Text Path | Path to the thought/reasoning content |
| `response.body.reasoning.active_path` | string | no | Thought Active Path | Boolean path — `true` = thought in progress, `false` = closed |
| `response.body.reasoning.name_path` | string | no | Thought Name Path | Path to the thought title/name |
| `response.body.reasoning.args_path` | string | no | Thought Args Path | Path to the thought arguments |

### Streaming mode (`streaming = true`)
| Field | Type | Required | Label | Hint |
|---|---|---|---|---|
| `response.chunk.text_path` | string | **yes** | Chunk Text Path | Dot-notation path to extract text from each SSE chunk |
| `response.chunk.reasoning.text_path` | string | no | Thought Text Path | Path to the thought/reasoning content in each chunk |
| `response.chunk.reasoning.active_path` | string | no | Thought Active Path | Boolean path — `true` = thought in progress, `false` = closed |
| `response.chunk.reasoning.name_path` | string | no | Thought Name Path | Path to the thought title/name |
| `response.chunk.reasoning.args_path` | string | no | Thought Args Path | Path to the thought arguments |

## Serialization

The form values are serialized to a JSON string (`JSON.stringify`) before sending to the store. Only non-empty optional fields are included. If `reasoning.*` fields are all empty, omit the entire `reasoning` object.

## Pre-filling

`AwsAgentCoreImportPopup` receives an optional `initialConfigurationJson?: string` prop. On mount:
1. Try `JSON.parse(initialConfigurationJson)`
2. If result has `response` key → new structured format → map to form fields
3. Otherwise → legacy format or unparseable → use form defaults

Default values:
- `streaming: false`
- `request.message_path: ''`
- `body.text_path: ''`
- All reasoning fields: `''`

## Validation

- Non-streaming: `response.body.text_path` is required
- Streaming: `response.chunk.text_path` is required
- `IMPORT_INVOCATION_PLACEHOLDER` validation is removed (new structured format doesn't need it)
- Reasoning: if any reasoning field is filled, `text_path` and `active_path` are also required within that reasoning section

## Reasoning Section UX

The reasoning fields are grouped under a collapsible "Thought Extraction (optional)" section (use a disclosure/expand toggle). Collapsed by default.

## Open Questions

_None — requirements are complete._
