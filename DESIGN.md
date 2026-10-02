# Portfolio Planner

## Intent

A personal allocation workbench for Brazilian investors. Planning only; never executes trades. English project content with BRL values, per workspace instructions.

## Visual system

Blue ink sidebar, pale slate canvas, white surfaces, teal contribution accent. Allocation bars are the signature: current and target positions are readable together. Runtime tokens live in src/app/globals.css; this document describes their roles.
System sans for interface and restrained Georgia display headings. Tabular numerals for money. Rounded 16px panels, quiet borders, natural document scrolling.
Position editing uses a responsive card grid with grouped identity, balance and target fields. On phones, contribution tables become cards; all five navigation destinations remain visible. Summary cards use a full-width portfolio total and two compact supporting metrics.

## Behavior ownership

Dashboard owns drafts and explicit save. Native labeled inputs, selects and month pickers own platform interaction. Shared live status region handles feedback. Local drafts stay separate from authenticated cloud data. Quotes never silently modify balances. Target allocation and deficit-based allocation are separate named modes. Removal is reversible with Undo. No real transactions.

## Verification

Unit tests for monetary allocation, build and lint, browser desktop/mobile interaction. Cloud persistence requires an explicitly configured Supabase project.
