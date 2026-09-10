# Gym logging instructions

Read README.md and data/ before recording workouts. The JSON files are the source of truth. Chat messages alone do not constitute saved records.

## Resolve the entry
- Store location once per workout; infer equipment identity as `<location>/<equipment>`.
- Machine progress is grouped by exercise/location/station; free weights combine locations by canonical implement slug (`dumbbells`, `barbell`, etc.). Keep sides and incompatible load conventions separate. Do not track adjustable settings.
- Reuse canonical IDs and aliases from data/exercises.json and data/locations.json. Reuse equipment slugs from existing workouts. Clarify ambiguous location, equipment, units, or genuinely ambiguous load conventions. Distinguish duplicate stations by a stable equipment name.
- Set `equipment_type` to `machine` or `free_weight` on every block. Use the same canonical free-weight equipment slug across locations.
- Every exercise catalog entry requires `load_scope`: `per_limb` if that comparison is meaningful, otherwise `total`. Abdominal crunches and other whole-movement exercises use `total/1`; do not halve them merely because a machine is involved.
- For exercises supporting per-limb comparisons, default ordinary bilateral selectorized/plate-loaded machines to `load_basis: combined`, `limbs_sharing_load: 2` when the displayed number is conventionally the machine's single shared load. Do not ask for confirmation just because two limbs are involved.
- Only clarify combined-vs-per-limb when the exercise/equipment is genuinely ambiguous, such as curl variations, independent-arm machines, unilateral stations, or equipment with separate per-side labels.
- Dumbbell loads are per dumbbell/per limb, including two dumbbells moved simultaneously: `load_basis: per_limb`, `limbs_sharing_load: 1`.
- Equipment with independent per-arm/per-leg labels uses `per_limb`, `1`.
- General total loads use `total`, `1`; these are displayed separately from per-limb comparisons. Do not record assistance as resistance; assistance is outside this initial schema.
- Record each set's original load and unit. Never replace them with normalized values. Load conventions may vary between blocks on the same equipment; use the actual convention for that performance and do not rewrite history to match it. A shared-load machine used by one limb can use `combined/1`; bilateral use uses `combined/2`. Split blocks when the convention changes.
- Never display the stored side value `both` as an app label. Keep it in the data for grouping; show left/right when relevant.
- Record side if specified; use `unspecified` if unknown. Do not duplicate a one-arm set into the other arm. For explicitly stated sets on each arm, record separate left/right sets.
- Do not save derived 1RM values as workout data. The dashboard computes daily estimates from the lowest-RIR working set, and actual 1RM from the heaviest recorded single.
- Omit RIR/RPE if not supplied. Record one scale, never fabricate or translate between scales. Preserve the user's reps exactly; clarify ambiguous per-side rep counts.
- Examples and hypotheticals are not actual workouts. Resolve relative dates against the user's date/timezone, not the server's UTC date.

## Save reliably
- Work directly on `main` and push validated changes there. Do not create pull requests unless the user explicitly requests one.
- Fetch the latest main branch before editing; preserve unrelated changes.
- Inspect recent workouts first. Append to the explicitly active workout or create a fresh stable UUID-based ID; date alone is not unique. Save as `data/workouts/YYYY-MM-DD_<id>.json`.
- Give every set a stable ID. Check existing data before retrying a write; never create duplicate sets because a save result was uncertain.
- New exercise/location catalog entries have an id, readable name, and optional aliases; exercises also require `load_scope`. Do not invent manufacturer or equipment specifications.
- Follow README.md's schema. Run validation and tests before pushing.
- When authorized to log and push, commit the data changes and push without asking again for routine confirmation. Check the push result; report saved sets and a commit link. A local edit or unmerged PR is not a completed save to main.
- If push is rejected, fetch and reconcile records by ID; never force push or overwrite unrelated workouts. Ask only if reconciliation is ambiguous.
- Never change repository visibility or add credentials to the dashboard. This repository and its Pages dashboard are public.
