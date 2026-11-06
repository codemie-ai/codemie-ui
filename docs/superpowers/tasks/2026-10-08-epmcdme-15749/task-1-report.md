DONE

## Commit
b18cede94 - EPMCDME-15749: Add isOwner ownership helper

## Changed Files
- src/utils/entity.ts
- src/utils/__tests__/entity.test.ts

## Test Command
```
npx vitest run --project unit src/utils/__tests__/entity.test.ts
```

## Test Exit Code
EXIT=0

## Details
Successfully implemented the `isOwner` helper function following test-driven development:

1. **RED**: Created failing test with 3 assertions
   - `isOwner({ created_by: { id: 'u1' } }, 'u1')` should be true
   - `isOwner({ created_by: { id: 'u1' } }, 'u2')` should be false
   - `isOwner({}, 'u1')` should be false

2. **GREEN**: Implemented the function exactly as specified
   - Added export to `src/utils/entity.ts` after `canView` (line 43)
   - Used the exact signature and implementation provided
   - All 3 tests pass

3. **Verification**: 
   - All tests pass (3/3)
   - Pre-commit hooks ran successfully (prettier, eslint, TypeScript, license headers, secrets scan)
   - Changed files match the required list exactly
