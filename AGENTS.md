# Gym logging instructions

Read README.md and data/ before recording workouts. The JSON files are the source of truth. Chat messages alone do not constitute saved records.

## Resolve the entry
- Store location once per workout; infer equipment identity as `<location>/<equipment>`.
- Progress series is `(exercise, location, equipment)`. Do not track adjustable settings.
- Reuse canonical IDs and aliases from data/exercises.json and data/locations.json. Reuse equipment slugs from existing workouts. Clarify ambiguous location, equipment, units, or genuinely ambiguous load conventions. Distinguish duplicate stations by a stable equipment name.
- Default ordinary bilateral selectorized/plate-loaded machines to `load_basis: combined`, `limbs_sharing_load: 2` when the displayed number is conventionally the machine's single shared load. Do not ask for confirmation just because two limbs are involved.
- Only clarify combined-vs-per-limb when the exercise/equipment is genuinely ambiguous, such as curl variations, independent-arm machines, unilateral stations, or equipment with separate per-side labels.
- Dumbbell loads are per dumbbell/per limb, including two dumbbells moved simultaneously: `load_basis: per_limb`, `limbs_sharing_load: 1`.
- Equipment with independent per-arm/per-leg labels uses `per_limb`, `1`.
- General total loads use `total`, `1`; these are displayed separately from per-limb comparisons. Do not record assistance as resistance; assistance is outside this initial schema.
- Record each set's original load and unit. Never replace them with normalized values. Copy the existing series load convention into each block. Never silently change it historically.
- Record side if specified; use `unspecified` if unknown. Do not duplicate a one-arm set into the other arm. For explicitly stated sets on each arm, record separate left/right sets.
- Omit RIR/RPE if not supplied. Record one scale, never fabricate or translate between scales. Preserve the user's reps exactly; clarify ambiguous per-side rep counts.
- Examples and hypotheticals are not actual workouts. Resolve relative dates against the user's date/timezone, not the server's UTC date.

## Save reliably
- Fetch the latest main branch before editing; preserve unrelated changes.
- Inspect recent workouts first. Append to the explicitly active workout or create a fresh stable UUID-based ID; date alone is not unique. Save as `data/workouts/YYYY-MM-DD_<id>.json`.
- Give every set a stable ID. Check existing data before retrying a write; never create duplicate sets because a save result was uncertain.
- New exercise/location catalog entries have an id, readable name, and optional aliases. Do not invent manufacturer or equipment specifications.
- Follow README.md's schema. Run validation and tests before pushing.
- When authorized to log and push, commit the data changes and push without asking again for routine confirmation. Check the push result; report saved sets and a commit link. A local edit or unmerged PR is not a completed save to main.
- If push is rejected, fetch and reconcile records by ID; never force push or overwrite unrelated workouts. Ask only if reconciliation is ambiguous.
- Never change repository visibility or add credentials to the dashboard. This repository and its Pages dashboard are public.
