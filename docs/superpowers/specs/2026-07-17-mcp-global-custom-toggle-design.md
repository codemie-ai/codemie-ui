# MCP Global/Custom Configuration Toggle Design

**Issue:** EPMCDME-13500  
**Date:** 2026-07-17  
**Status:** Draft

## Problem Statement

When a global MCP is added from the catalog to an assistant, the UI auto-prefills the MCP Configuration field with JSON. If the user saves with that prefilled configuration, CodeMie stores it as a custom/local configuration instead of preserving inheritance from the global MCP. As a result, any later updates to the global MCP are not propagated to assistants that were intended to use the shared configuration.

The root cause: the UI sends both `mcp_config_id` (global reference) and `config` (JSON configuration) in the same payload. The backend runtime prefers `config` when both are present, effectively breaking the global inheritance link.

## Goals

1. Add from catalog defaults to global inheritance (updates propagate automatically)
2. User can explicitly switch to custom mode (breaks inheritance, allows edits)
3. Toggling between Global ↔ Custom preserves both configurations (no data loss)
4. UI clearly communicates the current mode and consequences of switching
5. Backward compatible with existing assistants

## Non-Goals

- Partial config overrides (all-or-nothing: global or custom)
- Per-field inheritance granularity

## Design

### UX Pattern

**Toggle Control:**
- Positioned to the right of "MCP Configuration" label
- SelectButton component with options: `[Global] [Custom]`
- Always visible when MCP was added from catalog (`mcp_config_id` exists)
- Hidden for fully custom MCPs (no `mcp_config_id`)

**Global Mode:**
- Config textarea is **read-only** (disabled, grayed background)
- Displays config fetched from catalog via `mcp_config_id`
- Field label updated: "Configuration (JSON format, inherited)"

**Custom Mode:**
- Config textarea is **editable** (normal input styling)
- User can modify JSON freely
- Field label updated: "Configuration (JSON format, overrides global)"

**Toggling Behavior:**
- **Global → Custom:** Toggle switches immediately, config becomes editable
- **Custom → Global:** Toggle switches immediately, config becomes read-only
- No confirmation modals (toggling doesn't apply permanent changes until save)

### Data Model

#### Backend Change: Add Mode Flag

```python
# src/codemie/rest_api/models/assistant.py

class MCPServerDetails(BaseModel):
    name: str
    description: Optional[str] = None
    enabled: bool = True
    mcp_config_id: Optional[str] = Field(
        None, 
        description="Reference to MCP configuration in catalog"
    )
    config: Optional[MCPServerConfig] = Field(
        None, 
        description="Custom MCP configuration (stored even when not active)"
    )
    use_custom_config: bool = Field(
        False,
        description="If True, use custom config; if False, use catalog reference"
    )
    # ... other fields
```

**Backend Resolution Logic:**

Update `src/codemie/service/mcp/access_control.py`:

```python
@staticmethod
def resolve_catalog_config(mcp_server: MCPServerDetails) -> MCPServerDetails | None:
    """Resolve MCP config based on use_custom_config flag."""
    
    # If custom mode is enabled, use inline config
    if mcp_server.use_custom_config:
        if mcp_server.config is None:
            logger.warning(f"MCP server '{mcp_server.name}': custom mode enabled but no config present")
            return None
        return mcp_server
    
    # Global mode: fetch from catalog
    config_id = mcp_server.mcp_config_id
    if not config_id:
        # No catalog reference and not custom mode - fallback to inline config
        return mcp_server
    
    entry = MCPConfig.find_by_id(config_id)
    if entry is None or entry.config is None:
        logger.warning(f"MCP server '{mcp_server.name}': catalog entry {config_id} unavailable")
        return None
    
    try:
        resolved_config = MCPServerConfig(**entry.config.model_dump())
        return mcp_server.model_copy(update={"config": resolved_config})
    except Exception as e:
        logger.warning(f"Failed to resolve catalog config {config_id}: {e}", exc_info=True)
        return None
```

#### Frontend Changes

**1. Add mode flag to form state:**

```typescript
// formTypes.ts
export interface MCPFormValues {
  name: string
  description: string
  tokensSizeLimit: number | null
  connectUrl: string
  configJson: string
  command: string
  arguments: string
  useCustomConfig: boolean  // NEW - maps directly to backend field
}
```

**2. Update form initialization:**

```typescript
// useMCPForm.ts
const getInitialValues = (mcpServer?: MCPServerDetails): MCPFormValues => ({
  name: mcpServer?.name ?? '',
  description: mcpServer?.description ?? '',
  tokensSizeLimit: mcpServer?.tools_tokens_size_limit ?? null,
  connectUrl: mcpServer?.mcp_connect_url ?? '',
  configJson: mcpServer?.config ? JSON.stringify(mcpServer.config) : '{}',
  command: mcpServer?.command ?? '',
  arguments: mcpServer?.arguments ?? '',
  useCustomConfig: mcpServer?.use_custom_config ?? false,  // NEW - pass through directly
})
```

**3. Update config section component:**

```typescript
// MCPServerConfigStep.tsx
interface MCPServerConfigStepProps {
  // ... existing props
  useCustomConfig: boolean
  onUseCustomConfigChange: (value: boolean) => void
  hasCatalogReference: boolean
  catalogConfig?: MCPServerConfig
}
```

**4. Update MCPConfigSection with toggle:**

```typescript
// MCPConfigSection.tsx
interface MCPConfigSectionProps {
  control: Control<MCPFormValues>
  setValue: UseFormSetValue<MCPFormValues>
  hasCatalogReference: boolean
  catalogConfig?: MCPServerConfig
}

const MCPConfigSection: React.FC<MCPConfigSectionProps> = ({
  control,
  setValue,
  hasCatalogReference,
  catalogConfig,
}) => {
  const useCustomConfig = useWatch({ control, name: 'useCustomConfig' })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="font-bold text-sm">
          MCP Configuration
        </label>
        
        {hasCatalogReference && (
          <Controller
            name="useCustomConfig"
            control={control}
            render={({ field }) => (
              <SelectButton
                value={field.value ? 'custom' : 'global'}
                onChange={(e) => field.onChange(e.value === 'custom')}
                options={[
                  { label: 'Global', value: 'global' },
                  { label: 'Custom', value: 'custom' },
                ]}
              />
            )}
          />
        )}
      </div>

      <Controller
        name="configJson"
        control={control}
        render={({ field, fieldState }) => (
          <Textarea
            label={
              useCustomConfig 
                ? "Configuration (JSON format, overrides global)" 
                : "Configuration (JSON format, inherited)"
            }
            rows={10}
            className="font-mono"
            disabled={!useCustomConfig}
            style={{
              backgroundColor: !useCustomConfig ? 'var(--surface-base-secondary)' : undefined
            }}
            error={fieldState.error?.message}
            {...field}
            value={!useCustomConfig && catalogConfig 
              ? JSON.stringify(catalogConfig, null, 2)
              : field.value
            }
          />
        )}
      />
    </div>
  )
}
```

**5. Update submit logic:**

```typescript
// formHelpers.ts
export const buildServerConfig = (
  values: MCPFormValues,
  mcpConfigId?: string
): MCPServerDetails => {
  const mcpServer: MCPServerDetails = {
    name: values.name,
    description: values.description,
  }

  if (values.connectUrl) {
    mcpServer.mcp_connect_url = values.connectUrl
  }

  if (values.tokensSizeLimit !== null && values.tokensSizeLimit !== undefined) {
    mcpServer.tools_tokens_size_limit = values.tokensSizeLimit
  }

  // Always parse and store the config from the form
  const config: MCPServerConfig = parseConfigJson(values.configJson)
  mcpServer.config = config

  // Set the mode flag directly from form
  mcpServer.use_custom_config = values.useCustomConfig
  
  // Preserve catalog reference if it exists
  if (mcpConfigId) {
    mcpServer.mcp_config_id = mcpConfigId
  }

  return mcpServer
}
```

**6. Update marketplace selection:**

```typescript
// MCPToolkit.tsx - handleSelectFromMarketplace
const handleSelectFromMarketplace = (config: MCPConfig) => {
  const serverDetails: MCPServerDetails = {
    name: config.name,
    description: config.description,
    enabled: true,
    mcp_config_id: config.id,
    config: config.config,  // Store the config
    use_custom_config: false,  // Default to Global mode
    required_env_vars: config.required_env_vars,
    isFromMarketplace: true,
    categories: config.categories,
    logo_url: config.logo_url,
  }

  setSelectedMcpServer(serverDetails)
  setIsMarketplaceVisible(false)
  setIsFormPopupVisible(true)
}
```

### User Flows

#### Flow 1: Add MCP from Catalog (Happy Path)

1. User clicks "Browse Catalog" → selects MCP
2. Form opens with:
   - Toggle showing **[● Global] [ Custom]**
   - Config displayed as **read-only** (inherited from catalog)
   - Env vars section (editable)
3. User configures env vars → clicks Next → saves
4. Saved to DB:
   ```json
   {
     "mcp_config_id": "cfg-123",
     "config": {...},
     "use_custom_config": false
   }
   ```
5. ✅ Runtime uses global config, updates propagate

#### Flow 2: Customize a Catalog MCP

1. User edits existing assistant with catalog MCP
2. Sees toggle in **Global** mode, config read-only
3. Toggles switch to **Custom**
4. Config becomes editable immediately
5. User modifies JSON
6. Clicks Save
7. Saved to DB:
   ```json
   {
     "mcp_config_id": "cfg-123",
     "config": {...edited...},
     "use_custom_config": true
   }
   ```
8. ✅ Runtime uses custom config, global updates ignored

#### Flow 3: Revert to Global

1. User has customized MCP (toggle showing **Custom**)
2. Toggles switch to **Global**
3. Config becomes read-only immediately, displays global config
4. Clicks Save
5. Saved to DB:
   ```json
   {
     "mcp_config_id": "cfg-123",
     "config": {...edited...},
     "use_custom_config": false
   }
   ```
6. ✅ Runtime uses global config, custom edits preserved but inactive

#### Flow 4: Toggle Back to Custom

1. User previously reverted to Global
2. Toggles switch to **Custom**
3. Config becomes editable immediately, **shows preserved custom config**
4. ✅ User's previous edits are still there, can continue editing

### Edge Cases

**1. Catalog MCP deleted:**
- Backend `resolve_catalog_config` returns `None`
- UI shows warning: "Global MCP unavailable. Please contact your administrator or switch to Custom mode."
- Toggle disabled in Global mode until user switches to Custom

**2. Custom config but no catalog reference:**
- Toggle hidden (no `mcp_config_id`)
- Config always editable
- Backward compatible with existing custom MCPs

**3. Both config and mcp_config_id missing:**
- Validation error on save: "Must provide either global reference or custom configuration"

**4. Restricted mode (custom MCPs disabled):**
- Toggle forced to Global, disabled
- Config always read-only
- Existing `isCatalogRef` flag remains for this case

### Validation Rules

**Backend validator (recommended):**

```python
@model_validator(mode="after")
def validate_config_presence(self) -> Self:
    if self.use_custom_config:
        if self.config is None:
            raise ValueError("Custom mode requires config to be present")
    else:
        if not self.mcp_config_id and not self.mcp_connect_url:
            raise ValueError("Global mode requires mcp_config_id or mcp_connect_url")
    return self
```

**UI validation:**
- Prevent saving in Global mode if `mcp_config_id` is missing
- Prevent saving in Custom mode if `config` is invalid JSON

### Testing Strategy

**Unit Tests (Backend):**
- `resolve_catalog_config` with `use_custom_config=true` → uses inline config
- `resolve_catalog_config` with `use_custom_config=false` → fetches from catalog
- Validator rejects custom mode without config
- Validator rejects global mode without mcp_config_id

**Integration Tests (UI):**
- Add from catalog → verify only `use_custom_config=false` saved
- Toggle to Custom → edit → save → verify `use_custom_config=true` and config saved
- Toggle back to Global → verify `use_custom_config=false`, config preserved
- Toggle to Custom again → verify preserved config visible

**E2E Tests:**
- Add catalog MCP → update global MCP → verify assistant sees new config
- Customize MCP → update global MCP → verify assistant ignores update
- Revert to global → verify assistant sees global updates again

### Migration Strategy

**Existing Data:**

All existing MCP servers have both fields present (UI always copies config from catalog):
```json
{
  "mcp_config_id": "cfg-123",
  "config": {...},  // Always present, copied from global at creation
  "use_custom_config": null  // Missing field
}
```

**Current Runtime Behavior:**

`access_control.py` line 169:
```python
if mcp_server.config is not None:
    return mcp_server  # Uses inline config, ignores mcp_config_id
```

**This means ALL existing catalog MCPs are currently:**
- Using their inline `config` (not fetching from catalog)
- NOT receiving global MCP updates
- Behaving as if they were custom (even if never edited)

**Migration Strategy:**

Set `use_custom_config=true` for **all existing MCPs that have inline config** to preserve current behavior and prevent breaking them:

```python
# One-time data migration
def migrate_mcp_configs():
    """Add use_custom_config field to existing MCP servers.
    
    Since all existing catalog MCPs have inline config and are currently
    using it (not fetching from catalog), we set use_custom_config=true
    to preserve that behavior. Users can manually toggle to Global later.
    """
    assistants = Assistant.get_all()
    
    for assistant in assistants:
        if not assistant.mcp_servers:
            continue
        
        modified = False
        for mcp in assistant.mcp_servers:
            if 'use_custom_config' not in mcp:
                # All MCPs with inline config are currently using it
                # Preserve that behavior to avoid breaking existing assistants
                has_inline_config = mcp.get('config') is not None
                mcp['use_custom_config'] = has_inline_config
                modified = True
                
                if has_inline_config and mcp.get('mcp_config_id'):
                    logger.info(
                        f"Assistant {assistant.id}, MCP '{mcp.get('name')}': "
                        f"was catalog MCP but using inline config, "
                        f"migrated to use_custom_config=true"
                    )
        
        if modified:
            assistant.save()
```

**Why this is safe:**
- Existing catalog MCPs were already NOT receiving updates (using inline config)
- Setting `use_custom_config=true` preserves this exact behavior
- No runtime change = no risk of breaking production assistants
- Users can opt into global updates by toggling to Global mode later

**Deployment Order:**
1. Run migration script (adds `use_custom_config=true` to all existing MCPs with inline config)
2. Deploy backend (new field + updated `resolve_catalog_config`)
3. Deploy frontend (toggle UI + fixed marketplace selection)

### Backward Compatibility

**Pre-migration assistants:**
- Missing `use_custom_config` field defaults to `False` in backend Pydantic model
- Migration sets it explicitly based on presence of inline config
- Post-migration: all MCPs have the field set

**API compatibility:**
- `use_custom_config` is optional in payloads (defaults to `False`)
- New assistants from catalog will have `use_custom_config=false` (global mode)
- Existing API clients (mobile, CLI) continue working

## Open Questions

None remaining.

## Alternatives Considered

**Alternative 1: Validator that rejects both fields**
- Rejected: Loses custom config when toggling back and forth
- Reason: No way to preserve inactive configuration

**Alternative 2: Separate `custom_config` field**
- Would work but unnecessarily complex
- Reason: `config` field already exists, just need to know which to use

**Alternative 3: Backend auto-fix (prefer global)**
- Rejected: Silent data loss of custom configs
- Reason: User intent unclear, could lose valuable edits

## Success Criteria

1. ✅ Adding from catalog defaults to Global mode (`use_custom_config=false`)
2. ✅ Global MCPs receive updates when admin changes global config
3. ✅ Toggling to Custom allows edits without losing global reference
4. ✅ Toggling back to Global preserves custom config for future use
5. ✅ No permission prompts for read-only global config display
6. ✅ Backward compatible with existing assistants
