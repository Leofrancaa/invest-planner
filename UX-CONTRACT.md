# Interaction contract

## Canonical UI Map

| Capability     | Canonical owner           | Source of truth  | Allowed variants              | Verification             |
| -------------- | ------------------------- | ---------------- | ----------------------------- | ------------------------ |
| Select/Listbox | Native select             | Dashboard        | Platform-owned popup          | Browser test             |
| Date           | Native month input        | Dashboard        | Platform-owned month picker   | Monthly override test    |
| Form           | Labeled native fields     | Dashboard        | Portfolio and account         | Validation test          |
| Scrollbar      | globals.css               | DESIGN.md        | Horizontal table overflow     | Mobile browser test      |
| Toast          | Shared status live region | Dashboard        | Success and error text        | Persistence browser test |
| CRUD           | Dashboard explicit saves  | Portfolio schema | Local and authenticated cloud | Unit and browser tests   |

## Rules

Portfolio targets must total 100%. Entered balances are authoritative; quotes cannot update them. Monetary allocation uses cent rounding. Removing a position has Undo until the next removal. Planned contributions do not execute transactions or mutate balances.
Save is explicit. Invalid drafts cannot be saved. Browser unload warns about unsaved changes. Tabs preserve draft state. Cloud loading is blocked for unsaved drafts. Account data loads explicitly and uses version checks for concurrent updates. No automatic local-to-cloud replacement.
English interface, BRL formatting, America/Sao_Paulo timestamps. Native month and select popups intentionally follow platform presentation. Lists are bounded to 50 positions, 120 monthly overrides and 12 quote symbols. Portfolio input errors are shown in a persistent alert; cloud errors preserve drafts.
