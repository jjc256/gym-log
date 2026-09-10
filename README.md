# Gym Log

A small Git-backed workout log with a static dashboard.

## Schema

Catalogs are intentionally minimal:

- `data/exercises.json`: `{ "id", "name", "aliases"? }`
- `data/locations.json`: `{ "id", "name", "aliases"? }`

Each workout is stored at `data/workouts/YYYY-MM-DD_ID.json`:

```json
{
  "id": "workout-id",
  "date": "2026-09-10",
  "location": "gym-id",
  "exercises": [
    {
      "exercise": "preacher-curl",
      "equipment": "preacher-curl-machine",
      "sets": [
        {
          "id": "set-id",
          "load": 80,
          "unit": "lb",
          "reps": 10,
          "rir": 2,
          "side": "left"
        }
      ]
    }
  ]
}
```

`side` may be `left`, `right`, or `both`. If omitted, it means `both`. In the UI, `both` is the ordinary unsuffixed case.

Optional set fields are `rir`, `rpe`, `side`, `kind`, and `notes`. `kind` is `working`, `warmup`, or `drop`.

## Comparison rule

The only comparable identity is:

`location + exercise + equipment + side`

Different locations or equipment are never pooled, normalized, or converted into one another. The only numeric conversion is lb ↔ kg. Left and right stay separate. `both` is treated as the plain location/exercise/equipment case.

There is no `load_scope`, `load_basis`, `limbs_sharing_load`, or `equipment_type`.

## Commands

```bash
python scripts/gymlog.py check
python scripts/gymlog.py build
python -m unittest tests/test_gymlog.py
node tests/test_dashboard.js
```
