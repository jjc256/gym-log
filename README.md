# Gym log

Log workouts in chat, keep the records in Git, and view progress on a small static dashboard.

**Dashboard:** https://jjc256.github.io/gym-log/

The repository starts with no real workouts. Synthetic examples live only under `tests/fixtures/` and are excluded from the dashboard. This repository and published dashboard are public: recorded notes and all published workout data are readable by visitors.

## Log with chat

Use an assistant with write access to this repository and tell it to follow `AGENTS.md`. For example:

> Log today at Downtown: dumbbell preacher curl, 20 lb on my left arm for 10 reps, 2 RIR. Then preacher machine, 40 lb combined across both arms for 10 reps, 8 RPE. Save and push.

The assistant resolves your location/equipment, writes structured records, validates them, and returns the commit link. GitHub Actions rebuilds the dashboard after a push to `main`. GitHub read access alone is insufficient for saving; use a repository-writing connection or Codex checkout.

## Data model

- `data/exercises.json`: array of `{ "id": "preacher-curl", "name": "Preacher curl", "aliases": ["preacher curls"] }` records.
- `data/locations.json`: array of `{ "id": "downtown", "name": "Downtown", "aliases": [] }` records.
- `data/workouts/YYYY-MM-DD_<id>.json`: one workout per file. IDs use lowercase letters, numbers and hyphens. Prefer UUIDs for workout/set IDs.
- Equipment identity is derived as `location/equipment`; no redundant machine registry or setup settings.
- The same exercise at a different equipment station or location remains a separate progress series, including dumbbells.

A workout (illustrative only):

```json
{
  "id": "example-workout",
  "date": "2026-09-09",
  "location": "downtown",
  "exercises": [{
    "exercise": "preacher-curl",
    "equipment": "dumbbells",
    "load_basis": "per_limb",
    "limbs_sharing_load": 1,
    "sets": [{
      "id": "example-set",
      "load": 20,
      "unit": "lb",
      "reps": 10,
      "rir": 2,
      "side": "left"
    }]
  }]
}
```

Optional `notes` strings are accepted on workouts, exercise blocks, and sets. Sets may contain `rir` (nonnegative) OR `rpe` (1–10), `side` (`left`, `right`, `both`, `unspecified`), and `kind` (`working`, `warmup`, `drop`; default `working`). Omit unknown effort. Load must be finite and nonnegative; units are `lb` or `kg`; reps are positive integers. Unknown fields are rejected to catch logging mistakes. Warmup/drop entries are saved but excluded from the initial progress view. Assistance tracking is not supported in this version.

## Load normalization

| Convention | Example | Per-limb display |
| --- | --- | --- |
| `per_limb`, 1 | 20 lb dumbbell, one arm | 20 lb |
| `per_limb`, 1 | Two 20 lb dumbbells together | 20 lb |
| `combined`, 2 | 40 lb machine load shared by two arms | 20 lb |
| `total`, 1 | Total external load | Separate total-load view |

The divisor describes the recorded number, not the number of arms moving. Each exercise block stores its convention so historical data stays interpretable. The validator prevents a convention from changing silently within a series.

Normalized machine values are **nominal**, not measurements of actual resistance. Matching dumbbell/machine numbers do not account for leverage, cams, or friction. Equipment series remain separate; empirical machine conversions are intentionally deferred. The per-limb view excludes total-only entries, and vice versa. “As recorded” converts units only.

For unilateral exercises, record the stated side. Separate left/right sets when both are explicitly logged; do not assume the unmentioned arm performed the same work. Charts keep sides separate.

## View progress

The dashboard filters by exercise, location, equipment, date, rep range, effort scale/range, and unit. It shows the best matching load per session, working-set counts, and original set history. Narrow the rep and effort filters for fair comparisons. Missing effort is included only with the “Any / unrecorded” option. Separate machine lines are never joined.

GitHub Pages serves read-only static files. Chat writes data to GitHub; the dashboard updates after the publishing workflow completes. All data in the dashboard can be downloaded by visitors, even if filters hide it visually.

## Run locally

Requires Python 3.10+; there are no Python or frontend dependencies. Node is used only for the dashboard calculation test.

```sh
python3 scripts/gymlog.py check
python3 -m unittest discover -s tests -v
node tests/test_dashboard.js
python3 scripts/gymlog.py build
```

Open `dist/index.html` directly in a browser, or serve `dist/` with `python3 -m http.server --directory dist 8000`.

The build embeds the validated data in `data.js`; it requires no server database, network libraries, or browser credentials. Generated output is ignored by Git.

## GitHub Pages

Select **Settings → Pages → Source → GitHub Actions**. `.github/workflows/publish.yml` validates and tests every pull request, then publishes successful main-branch builds. Review the Actions run if a published chart has not updated.

## Why JSON instead of committed SQLite?

One file per workout gives readable diffs and allows separate workouts to merge normally. SQLite is excellent for queries but binary database conflicts require manual recovery. JSON is the sole source of truth here; a future SQLite export should be disposable. CSV can be added as an export without losing nested workout context.

Stable IDs prevent duplicate retries. Same-workout conflicts still require reconciliation; do not force push. Correct a record by editing its original set ID, then validate and commit. Git provides the edit history.
