# Post-review addendum — 2026-09-30

**Source**: MR !2009 code review comment (reviewer feedback on gitbud, not part of the
`code-review-final.json` / `code-review-check.json` verdict chain above).

**Request**: the Schedulers nav item is a genuinely new feature and should carry the "NEW" badge,
consistent with the ticket's goal of keeping badges accurate rather than removing them wholesale.

**Change made**: added `badge: 'NEW'` to the Schedulers entry in
`src/components/Navigation/Navigation.tsx` (the item pushed via `items.splice(2, 0, ...)` when
`isSchedulersViewEnabled` is true). `NavigationLink.tsx` already renders `item.badge` generically,
so no other code changed.

No existing Navigation test asserted the absence of a badge on Schedulers, so no test needed
updating.
