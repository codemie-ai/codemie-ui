# MCP Global/Custom Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Global/Custom mode toggle to MCP configuration UI, preserving both configs while allowing users to choose which is active.

**Architecture:** Introduce `use_custom_config` boolean flag to MCPServerDetails model. Backend resolver uses flag to determine whether to fetch from catalog or use inline config. Frontend adds SelectButton toggle with conditional read-only textarea. Migration script sets flag based on existing data patterns.

**Tech Stack:** FastAPI (backend), React with React Hook Form (frontend), SQLModel (data models), PrimeReact SelectButton

---

## Task 1: Backend Model - Add use_custom_config Field

**Files:**
- Modify: `src/codemie/rest_api/models/assistant.py` (MCPServerDetails class)

- [ ] **Step 1: Add use_custom_config field to MCPServerDetails**

In `src/codemie/rest_api/models/assistant.py`, locate the `MCPServerDetails` class and add the new field after the `config` field:

```python
use_custom_config: bool = Field(
    False,
    description="If True, use custom config; if False, use catalog reference"
)
```

- [ ] **Step 2: Verify model loads correctly**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -c "from codemie.rest_api.models.assistant import MCPServerDetails; print('Model loads successfully')"`

Expected: "Model loads successfully"

- [ ] **Step 3: Commit backend model change**

```bash
git add src/codemie/rest_api/models/assistant.py
git commit -m "feat(EPMCDME-13500): Add use_custom_config field to MCPServerDetails"
```

---

## Task 2: Backend Resolver - Update resolve_catalog_config Logic

**Files:**
- Modify: `src/codemie/service/mcp/access_control.py:158-186` (resolve_catalog_config method)

- [ ] **Step 1: Replace resolve_catalog_config method implementation**

In `src/codemie/service/mcp/access_control.py`, replace the existing `resolve_catalog_config` method (lines 158-186) with:

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

- [ ] **Step 2: Verify syntax**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -m py_compile src/codemie/service/mcp/access_control.py`

Expected: No output (successful compilation)

- [ ] **Step 3: Commit resolver update**

```bash
git add src/codemie/service/mcp/access_control.py
git commit -m "feat(EPMCDME-13500): Update resolve_catalog_config to use use_custom_config flag"
```

---

## Task 3: Backend Migration Script

**Files:**
- Create: `src/codemie/migrations/add_use_custom_config_flag.py`

- [ ] **Step 1: Create migration script**

Create `src/codemie/migrations/add_use_custom_config_flag.py`:

```python
"""Migration: Add use_custom_config field to existing MCP servers.

Since all existing catalog MCPs have inline config and are currently
using it (not fetching from catalog), we set use_custom_config=true
to preserve that behavior. Users can manually toggle to Global later.
"""
import logging
from codemie.repository.assistant_repository import AssistantRepository

logger = logging.getLogger(__name__)


def migrate_mcp_configs():
    """Add use_custom_config field to existing MCP servers."""
    assistant_repo = AssistantRepository()
    assistants = assistant_repo.get_all()
    
    migrated_count = 0
    
    for assistant in assistants:
        if not assistant.mcp_servers:
            continue
        
        modified = False
        for mcp in assistant.mcp_servers:
            # Check if field already exists
            if hasattr(mcp, 'use_custom_config'):
                continue
            
            # All MCPs with inline config are currently using it
            # Preserve that behavior to avoid breaking existing assistants
            has_inline_config = mcp.config is not None
            mcp.use_custom_config = has_inline_config
            modified = True
            
            if has_inline_config and mcp.mcp_config_id:
                logger.info(
                    f"Assistant {assistant.id}, MCP '{mcp.name}': "
                    f"was catalog MCP but using inline config, "
                    f"migrated to use_custom_config=true"
                )
        
        if modified:
            assistant_repo.update(assistant)
            migrated_count += 1
    
    logger.info(f"Migration complete: {migrated_count} assistants updated")
    return migrated_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = migrate_mcp_configs()
    print(f"Migrated {count} assistants")
```

- [ ] **Step 2: Test migration script syntax**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -m py_compile src/codemie/migrations/add_use_custom_config_flag.py`

Expected: No output (successful compilation)

- [ ] **Step 3: Commit migration script**

```bash
git add src/codemie/migrations/add_use_custom_config_flag.py
git commit -m "feat(EPMCDME-13500): Add migration script for use_custom_config field"
```

---

## Task 4: Frontend Types - Add useCustomConfig Field

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/formTypes.ts`

- [ ] **Step 1: Add useCustomConfig to MCPFormValues interface**

In `formTypes.ts`, locate the `MCPFormValues` interface and add the new field:

```typescript
export interface MCPFormValues {
  name: string
  description: string
  tokensSizeLimit: number | null
  connectUrl: string
  configJson: string
  command: string
  arguments: string
  useCustomConfig: boolean  // NEW
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run type-check`

Expected: No type errors

- [ ] **Step 3: Commit form types update**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/formTypes.ts
git commit -m "feat(EPMCDME-13500): Add useCustomConfig to MCPFormValues"
```

---

## Task 5: Frontend Form Initialization

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/useMCPForm.ts`

- [ ] **Step 1: Add useCustomConfig to getInitialValues**

In `useMCPForm.ts`, locate the `getInitialValues` function and add the new field to the return object:

```typescript
const getInitialValues = (mcpServer?: MCPServerDetails): MCPFormValues => ({
  name: mcpServer?.name ?? '',
  description: mcpServer?.description ?? '',
  tokensSizeLimit: mcpServer?.tools_tokens_size_limit ?? null,
  connectUrl: mcpServer?.mcp_connect_url ?? '',
  configJson: mcpServer?.config ? JSON.stringify(mcpServer.config) : '{}',
  command: mcpServer?.command ?? '',
  arguments: mcpServer?.arguments ?? '',
  useCustomConfig: mcpServer?.use_custom_config ?? false,  // NEW
})
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run type-check`

Expected: No type errors

- [ ] **Step 3: Commit form initialization update**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/useMCPForm.ts
git commit -m "feat(EPMCDME-13500): Initialize useCustomConfig in form"
```

---

## Task 6: Frontend UI - Add SelectButton Toggle

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPConfigSection.tsx`

- [ ] **Step 1: Import required dependencies**

At the top of `MCPConfigSection.tsx`, add imports:

```typescript
import { SelectButton } from 'primereact/selectbutton'
import { Controller, useWatch } from 'react-hook-form'
```

- [ ] **Step 2: Add SelectButton toggle above config textarea**

In the component, after the section header, add the toggle:

```typescript
const useCustomConfig = useWatch({ control, name: 'useCustomConfig' })
const hasCatalogReference = !!mcpServer?.mcp_config_id

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
    {/* Existing textarea code follows */}
  </div>
)
```

- [ ] **Step 3: Update textarea to be conditional read-only**

Update the existing `Controller` for `configJson`:

```typescript
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
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run type-check`

Expected: No type errors

- [ ] **Step 5: Commit UI toggle implementation**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPConfigSection.tsx
git commit -m "feat(EPMCDME-13500): Add SelectButton toggle and conditional read-only config"
```

---

## Task 7: Frontend Submit Logic

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/formHelpers.ts`

- [ ] **Step 1: Update buildServerConfig to include useCustomConfig**

In `formHelpers.ts`, locate `buildServerConfig` and update it:

```typescript
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run type-check`

Expected: No type errors

- [ ] **Step 3: Commit submit logic update**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/formHelpers.ts
git commit -m "feat(EPMCDME-13500): Update buildServerConfig to include use_custom_config"
```

---

## Task 8: Frontend Marketplace Default

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkit.tsx:156`

- [ ] **Step 1: Update handleSelectFromMarketplace default**

In `MCPToolkit.tsx`, locate `handleSelectFromMarketplace` (around line 156) and update the `serverDetails` object:

```typescript
const handleSelectFromMarketplace = (config: MCPConfig) => {
  const serverDetails: MCPServerDetails = {
    name: config.name,
    description: config.description,
    enabled: true,
    mcp_config_id: config.id,
    config: config.config,
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run type-check`

Expected: No type errors

- [ ] **Step 3: Commit marketplace default update**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkit.tsx
git commit -m "feat(EPMCDME-13500): Default new marketplace MCPs to Global mode"
```

---

## Task 9: Run Backend Migration

Test-first: No (migration script, run-once operation)

**Files:**
- Execute: `src/codemie/migrations/add_use_custom_config_flag.py`

- [ ] **Step 1: Back up database**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -c "import shutil; from datetime import datetime; shutil.copy('codemie.db', f'codemie.db.backup-{datetime.now().strftime(\"%Y%m%d-%H%M%S\")}')"`

Expected: No output (backup created silently)

- [ ] **Step 2: Run migration script**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -m codemie.migrations.add_use_custom_config_flag`

Expected: "Migrated N assistants" where N is the count of assistants with MCPs

- [ ] **Step 3: Verify migration results**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && python -c "from codemie.repository.assistant_repository import AssistantRepository; repo = AssistantRepository(); assistants = repo.get_all(); mcps_with_flag = sum(1 for a in assistants for m in (a.mcp_servers or []) if hasattr(m, 'use_custom_config')); print(f'MCPs with use_custom_config: {mcps_with_flag}')"`

Expected: "MCPs with use_custom_config: N" where N > 0 if there are existing MCPs

- [ ] **Step 4: Document migration completion**

Create a commit message documenting the migration:

```bash
git commit --allow-empty -m "chore(EPMCDME-13500): Ran migration for use_custom_config field"
```

---

## Task 10: Integration Testing

Test-first: No (integration validation after implementation)

**Files:**
- N/A (manual browser testing)

- [ ] **Step 1: Start backend server**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie && make run`

Expected: Backend starts on configured port

- [ ] **Step 2: Start frontend dev server**

Run: `cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next && npm run dev`

Expected: Frontend starts on http://localhost:3000

- [ ] **Step 3: Test Flow 1 - Add MCP from catalog (Global mode)**

1. Navigate to Assistant creation/edit
2. Click "Browse Catalog" → select an MCP
3. Verify toggle shows "Global" selected
4. Verify config textarea is read-only and grayed
5. Save assistant
6. Verify backend receives `use_custom_config: false`

Expected: MCP saved in Global mode

- [ ] **Step 4: Test Flow 2 - Toggle to Custom mode**

1. Edit the assistant from Step 3
2. Toggle switch to "Custom"
3. Verify config textarea becomes editable
4. Modify JSON config
5. Save assistant
6. Verify backend receives `use_custom_config: true` with modified config

Expected: MCP switches to Custom mode with edits preserved

- [ ] **Step 5: Test Flow 3 - Toggle back to Global**

1. Edit the assistant from Step 4
2. Toggle switch to "Global"
3. Verify config textarea becomes read-only
4. Verify config shows global catalog config (not custom edits)
5. Save assistant
6. Verify backend receives `use_custom_config: false`
7. Edit assistant again
8. Toggle to "Custom"
9. Verify previous custom edits are still present

Expected: Custom config preserved when toggling back

- [ ] **Step 6: Test migrated assistants**

1. Open assistant that existed before migration
2. Verify toggle shows "Custom" selected (migration set use_custom_config=true)
3. Verify config is editable
4. Verify no data loss

Expected: Existing MCPs show Custom mode and function normally

- [ ] **Step 7: Document test results**

Create a commit noting tests passed:

```bash
git commit --allow-empty -m "test(EPMCDME-13500): Verified Global/Custom toggle flows"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Backend: use_custom_config field added (Task 1)
- ✅ Backend: resolve_catalog_config updated (Task 2)
- ✅ Backend: Migration script created (Task 3)
- ✅ Frontend: Form types updated (Task 4)
- ✅ Frontend: Form initialization updated (Task 5)
- ✅ Frontend: SelectButton toggle added (Task 6)
- ✅ Frontend: Submit logic updated (Task 7)
- ✅ Frontend: Marketplace default set (Task 8)
- ✅ Migration: Script executed (Task 9)
- ✅ Testing: Integration flows validated (Task 10)

**Placeholder Scan:** None found - all code blocks contain actual implementation

**Type Consistency:**
- `use_custom_config` (backend) ↔ `useCustomConfig` (frontend) ✅
- `MCPServerDetails.use_custom_config` referenced consistently ✅
- `MCPFormValues.useCustomConfig` referenced consistently ✅
