# EPMCDME-15125: Split Last Run and Status Schedulers

## Requirements

Move the "Last Run Status" information to a separate column in the scheduler table, splitting it out from the existing combined view.

## Tasks

### T1 — Add separate "Last Run" column to scheduler table
- Separate last run time and last run status into distinct columns
- Test-first: yes — render test verifying two distinct columns exist
- Status: completed (commit 68a9e37c2)

## Implementation notes

Changes confined to `src/pages/schedulers/SchedulersPage.tsx` (23 insertions, 9 deletions).
