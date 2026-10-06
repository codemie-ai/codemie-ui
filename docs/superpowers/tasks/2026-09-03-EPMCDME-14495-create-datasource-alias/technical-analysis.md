# Technical Analysis: EPMCDME-14495 Create datasource page auto-generates datasource alias incorrectly

## Codebase Findings

1. **DataSource Form Auto-Generation**:
   - File: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`
   - Lines: 260-264
   - Code:
     ```typescript
     useEffect(() => {
       if (isEditing || nameManuallyEdited.current || !indexType) return
       const defaultName = generateDefaultAlias(indexType)
       if (defaultName) setValue('name', defaultName)
     }, [indexType])
     ```
   - Analysis: This `useEffect` hook auto-fills the name field by calling `generateDefaultAlias(indexType)` on indexType change when creating a datasource. This triggers auto-generation for all datasources, which violates the requirement that datasource alias (name) must not be generated automatically.
   - We must remove this hook and the corresponding import `generateDefaultAlias` from line 55.

2. **Integration Form Auto-Generation**:
   - File: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`
   - Lines: 352-355
   - Analysis: In `SettingsForm.tsx`, the `generateDefaultAlias` function is used to auto-generate the alias for integrations. This logic is completely isolated and will not be impacted by changes in `DataSourceForm.tsx`.

3. **Affected Tests**:
   - File: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
   - Lines: 183-207 (Unsaved Changes Guard test block)
   - Code:
     ```typescript
     it('does not show unsaved-changes popup when navigating away from an untouched form', async () => {
       // The form defaults indexType to GIT and auto-generates a name on mount.
       // Before the fix, the auto-generated name made the form appear dirty even
       // though the user had not typed anything (regression: EPMCDME-14129).
       ...
       // Wait for the auto-generated name — signals name-fill is complete
       await waitFor(
         () => {
           expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveValue('')
         },
         { timeout: 10000 }
       )
     ```
   - Analysis: This test expects the name field to have an auto-populated value on mount. If we disable auto-generation, the name field will remain empty (`''`).
   - We need to modify this test. Since there is no auto-generated name, the form will not have a value initially (`toHaveValue('')`), and navigating away will still not trigger the unsaved-changes popup (as the form is completely untouched).
   - We must change the assertion to expect `toHaveValue('')`.

## Risk Indicators

- **Test Regression**: Removing the auto-generation could break `DataSourceCreatePage.integration.test.tsx` as it relies on waiting for the name to be populated. Correctly updating this test is required.
- **Form Validation**: Form requires the name field to be non-empty and at least 4 characters. Disabling auto-generation means the user must type a name, which works perfectly with the existing validation of the form (it will block submission with an error if left empty).

## Architectural and Implementation Strategy

- Remove the `useEffect` hook responsible for name auto-generation from `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`.
- Remove the unused `generateDefaultAlias` import from `DataSourceForm.tsx`.
- Update the `DataSourceCreatePage.integration.test.tsx` test case to assert that the `Name` textbox remains empty.
- Run the unit and integration tests to verify everything passes.
