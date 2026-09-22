# EPMCDME-15126: Change Resource Font Size in Schedulers

## Requirements

Set Resource name and Resource type font size to 12px in the schedulers table.

## Tasks

### Task 1 — Update font size for Resource name
- Change `<span className="font-medium">` to `<span className="text-xs font-medium">` in `renderResource` callback
- Test-first: yes — verify rendered resource name span has `text-xs` class

### Task 2 — Update font size for Resource type
- Change `<span className="text-[10px] text-text-secondary">` to `<span className="text-xs text-text-secondary">`
- Test-first: yes — verify rendered resource type span has `text-xs` class (replacing `text-[10px]`)

## Status

Implementation complete. Both changes applied in `src/pages/schedulers/SchedulersPage.tsx`.
