# Agent instructions

This repository is a personal gym log. Prefer the simplest representation that preserves what was actually logged.

## Data rules

- Reuse canonical exercise and location IDs from `data/exercises.json` and `data/locations.json`.
- Before creating or assigning an equipment/machine ID for any exercise, search existing workout data for all equipment IDs already used with that exercise. Reuse an existing ID for the same equipment, and consolidate synonymous IDs; create a new ID only for genuinely distinct equipment. Do not merge genuinely different machines or equipment merely because they share an exercise name.
- An exercise block contains `exercise`, `sets`, optional `equipment`, and optional `notes`.
- A set contains `id` and `reps`, plus optional `load` + `unit`, `rir`, `rpe`, `side`, `kind`, and `notes`.
- Omit fields whose value is effectively `n/a` when the schema allows it. Tables may render missing values as `n/a`, but non-table UI should not show literal `n/a`.
- `load` and `unit` are recorded together or both omitted. Omit them for movements where external load is not applicable or not recorded, such as unweighted pull-ups.
- `side` is only `left` or `right` when explicitly applicable; omitted means sidedness does not apply.
- Never invent or infer left/right work that was not stated.
- `kind` defaults to `working`; warmups should be stored explicitly when known.
- Warmup sets do not record RIR or RPE.
- Do not add load normalization metadata. There is no `load_scope`, `load_basis`, `limbs_sharing_load`, or `equipment_type`.

## Comparison rule

Progress and records are scoped to the exact tuple `(location, exercise, equipment, side)`, with omitted equipment/side treated as not applicable. Never pool or compare across locations or distinct equipment. Only convert lb and kg.

## Safety / integrity

- Give every workout and set a stable unique ID.
- Check existing data before retrying a write so sets are not duplicated.
- Do not invent manufacturer specifications, machine ratios, or cross-machine conversion factors.
- Follow `README.md` and run validation/tests before pushing.
