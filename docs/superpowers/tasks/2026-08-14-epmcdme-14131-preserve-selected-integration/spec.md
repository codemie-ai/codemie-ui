# Spec — an integration slot keeps the integration its author pinned

## Problem

An integration slot in the assistant form renders as **Automatic lookup** even when an
integration is pinned on it. The auto-lookup switch reads ON and the integration dropdown is
not rendered at all, so the pinned choice is invisible and looks lost. It is not lost: the
value is still carried on the slot and still saved. Only the reading of it is wrong.

The slot's mode is currently derived from the stored `auto_credentials_lookup` flag alone. Two
populations of slots have a flag that does not describe them:

- Slots restored from a workflow tool configuration. That configuration stores an integration
  alias and nothing else, so the flag is absent on every reload.
- Slots of assistants saved before the flag existed. The backend model declares
  `auto_credentials_lookup: bool = True` — not optional — so those slots come back with the
  flag set to `true` regardless of what is pinned on them.

The runtime does not share the UI's reading. Integration resolution treats an author-pinned
integration as decisive and only consults the flag for slots that have none
(`toolkit_service.py:841`). A slot the UI shows as Automatic lookup therefore still executes
with the pinned integration. The defect is a divergence between what the form displays and what
the assistant does.

## Behaviour

### The pinned integration decides the mode

A slot that carries a pinned integration is not in automatic-lookup mode, whatever the stored
flag says. Its switch reads OFF and its integration dropdown is rendered with the pinned value
selected.

This holds for both slot levels — a tool that takes its own integration, and a toolkit that
carries one integration for all its tools — and on every surface that renders the assistant
form, including the assistant page, a workflow tool node, a workflow MCP node, and an inline
assistant inside a workflow.

### Without a pinned integration, the stored flag decides

A slot with no pinned integration keeps today's behaviour:

- Flag stored as disabled: automatic lookup is off. The slot resolves to no integration, and
  the switch reads OFF.
- Flag stored as enabled, or absent: automatic lookup is on, the switch reads ON, and no
  dropdown is offered.

### Choosing an integration records the decision, where the choice is offered

When a user pins an integration on a slot, automatic lookup is recorded as disabled on that
slot in the same change. The two states stop being derivable-but-unrecorded: subsequent reads
find an explicit decision rather than inferring one.

Clearing a pinned integration does not re-enable automatic lookup: an emptied slot becomes an
explicit "no integration". A slot may carry no flag at all, or one that predates the decision,
so clearing records the decision rather than assuming the right one is already stored.

Only surfaces that show the automatic-lookup switch record this decision. A surface that offers
an integration dropdown without the switch leaves the flag exactly as it found it, since it gives
the user no way to see or undo a decision recorded on their behalf.

### Enabling automatic lookup is unchanged

Turning the switch ON still clears any pinned integration on the slot, in a single change.
Automatic lookup and a pinned integration remain mutually exclusive; this spec only makes the
reading agree with that rule as well as the writing already does.

## Acceptance criteria

1. A slot with a pinned integration renders with the auto-lookup switch OFF and the dropdown
   showing that integration, including when the stored flag says automatic lookup is enabled
   and when no flag is stored at all.
2. Reopening a saved configuration shows the pinned integration that was saved, not Automatic
   lookup.
3. A slot with no pinned integration and no stored flag still renders with the switch ON and no
   dropdown.
4. A slot with no pinned integration and automatic lookup stored as disabled still renders with
   the switch OFF.
5. Pinning an integration records automatic lookup as disabled on that slot.
6. Clearing a pinned integration leaves automatic lookup disabled rather than re-enabling it,
   including on slots that carried no flag or a flag saying it was enabled.
7. Turning automatic lookup ON continues to clear the pinned integration in the same change.
8. Both the tool-level and the toolkit-level slot follow all of the above.
9. A surface that offers the integration dropdown without the switch records no decision at all.

## Out of scope

- The workflow configuration format. It continues to carry an integration alias with no
  auto-lookup flag; this spec makes that representation readable rather than extending it.
- Any backend change. Resolution already treats a pinned integration as decisive.
- The consumer-facing "Your Integration Settings" panel. It reads the same flag through a
  separate component tree and a separate API, and any defect there is a separate change.
- Whether a workflow tool node should offer an auto-lookup switch at all. That is a product
  question; this spec keeps the switch where it is today.
- The order in which a workflow form rebuilds a stored slot and the integrations index resolves.
  That race predates this change and can leave a restored slot looking unpinned regardless of how
  the flag is read. It was attempted here and reverted: guarding on a populated index blocks form
  initialisation outright when a user legitimately has no integrations, and its first population can
  overwrite edits made in the meantime. It needs a settled/failed signal on the settings store, and
  so belongs to its own change.

## Verification

Automated coverage asserts each acceptance criterion at the component and hook level. Manual
verification on a running stack confirms criteria 1, 2 and 5 end to end: pin an integration on
a tool in a workflow, save, reopen, and observe the pinned integration rather than Automatic
lookup. That verification was performed and the symptom no longer reproduces.
