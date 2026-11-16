DONE
commit: no commit needed
changed_paths:
  - none
test_command: npx vitest run --reporter=verbose
notes: All tests passed with EXIT=0 without any changes. The `status` field is optional in `ModelOption` and defaults correctly in the store mapping (`status: model.status ?? 'enabled'`), so no existing test fixtures needed updating.
