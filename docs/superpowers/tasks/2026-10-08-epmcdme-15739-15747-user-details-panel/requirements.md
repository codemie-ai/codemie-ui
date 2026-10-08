# EPMCDME-15739 + EPMCDME-15747: user details panel fixes

## EPMCDME-15739 — Project column is too narrow in the user projects table

In the user details projects table, the Project column is too narrow. Long project names, including
personal email addresses, wrap onto multiple lines. Move the Default and Role columns to the right to
give the Project column more width.

Acceptance criteria:

1. The Default and Role columns are shifted right to increase the Project column's width.
2. Long project names, including personal email addresses, fit on one row at the displayed table width.
3. The change does not cause column overlap or make the Default, Role, or row actions unusable.
4. The result is verified against the attached screenshot.

## EPMCDME-15747 — User details panel scrolls to the top after saving a default project

Saving a user's default project moves the user details panel to the top instead of preserving its
scroll position. The panel should remain at the same scroll level after a default project is saved.

Acceptance criteria:

1. Saving a default project does not reset the open user details panel's scroll position.
2. The saved default project is shown correctly without requiring the user to scroll back to their
   previous position.

## Related backend change (separate MR, epm-cdme/codemie!4452, EPMCDME-15738)

The API now always reports exactly one effective default project per user (stored, else personal,
else first by name). The table renders `is_default` from the API as-is; the frontend must keep showing
what the API returns after project changes (set default, unassign, add, role change).
