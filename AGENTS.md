# Agent instructions

This repository is a personal gym log. Prefer the simplest representation that preserves what was actually logged.

## Data rules

- Reuse canonical exercise and location IDs from `data/exercises.json` and `data/locations.json`.
- An exercise block contains only `exercise`, `equipment`, `sets`, and optional `notes`.
- A set contains `id`, `load`, `unit`, `reps`, plus optional `rir`, `rpe`, `side`, `kind`, and `notes`.
- `side` is only `left`, `right`, or `both`; omitted means `both`.
- In user-facing labels, omit the side when it is `both`.
- Never invent or infer left/right work that was not stated.
- `kind` defaults to `working`; warmups should be stored explicitly when known.
- Do not add load normalization metadata. There is no `load_scope`, `load_basis`, `limbs_sharing_load`, or `equipment_type`.

## Comparison rule

Progress and records are scoped to the exact tuple `(location, exercise, equipment, side)`. Never pool or compare across locations or equipment. Only convert lb and kg.

## Safety / integrity

- Give every workout and set a stable unique ID.
- Check existing data before retrying a write so sets are not duplicated.
- Do not invent manufacturer specifications, machine ratios, or cross-machine conversion factors.
- Follow `README.md` and run validation/tests before pushing.
