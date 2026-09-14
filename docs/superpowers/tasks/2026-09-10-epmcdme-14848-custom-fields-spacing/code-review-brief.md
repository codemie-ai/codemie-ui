# Code review — 2026-09-10-epmcdme-14848-custom-fields-spacing (2026-09-10)

**request-changes** · confidence: low · 1 blocking · 0 deferred · 3 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · verification-gap — n/a (compact profile) · acceptance — n/a (no spec)  (1/1 applicable lenses ran)

## Look here first

- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx:142` — [other] UI interaction: releasing the fixed control height lets chips wrap, but MultiSelect's absolute "Clear selected options" button stays pinned at `top-1/2`, so it lands on the middle chip row; the label reserves only `pr-1` and now has `!overflow-visible`, so chips run under it — CR-001

## Checked and clean

commit-format — n/a · code-quality — n/a · security — n/a · no standards audit in this profile · 0 deferred
