# Gym log

Log workouts in chat, keep the records in Git, and view progress on a small static dashboard.

**Dashboard:** https://jjc256.github.io/gym-log/

Real workouts live under `data/workouts/`. Synthetic examples live only under `tests/fixtures/` and are excluded from the dashboard. This repository and published dashboard are public: recorded notes and all published workout data are readable by visitors.

## Log with chat

Use an assistant with write access to this repository and tell it to follow `AGENTS.md`. For example:

> Log today at Downtown: dumbbell preacher curl, 20 lb on my left arm for 10 reps, 2 RIR. Then preacher machine, 40 lb combined across both arms for 10 reps, 8 RPE. Save and push.

The assistant resolves your location/equipment, writes structured records, validates them, and returns the commit link. GitHub Actions rebuilds the dashboard after a push to `main`. GitHub read access alone is insufficient for saving; use a repository-writing connection or Codex checkout.

## Data model

- `data/exercises.json`: array of `{ "id": "preacher-curl", "name": "Preacher curl", "load_scope": "per_limb", "aliases": ["preacher curls"] }` records.
- `data/locations.json`: array of `{ "id": "downtown", "name": "Downtown", "aliases": [] }` records.
- `data/workouts/YYYY-MM-DD_<id>.json`: one workout per file. IDs use lowercase letters, numbers and hyphens. Prefer UUIDs for workout/set IDs.
- Each exercise has a required `load_scope`: `per_limb` when per-limb comparisons are meaningful, or `total` for whole-movement loads such as abdominal crunches. A `total` exercise must use `total/1` blocks. A `per_limb` exercise can still record a total-only load (for example a barbell variation); it stays separate from per-limb comparisons.
- Each block has a required `equipment_type`: `machine` or `free_weight`. Machines are identified by `location/equipment`. Free weights use a canonical equipment slug (such as `dumbbells` or `barbell`) across locations. Keep different implements separate; don't include gym names in free-weight slugs.
- Charts and records separate exercises, equipment, sides, and incompatible load conventions. Machine stations remain separate by location; free-weight records combine locations unless a location filter is explicitly selected. No machine registry or adjustable setup settings are required.

A workout (illustrative only):

```json
{
  "id": "example-workout",
  "date": "2026-09-09",
  "location": "downtown",
  "exercises": [{
    "exercise": "preacher-curl",
    "equipment": "dumbbells",
    "equipment_type": "free_weight",
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

Optional `notes` strings are accepted on workouts, exercise blocks, and sets. Sets may contain `rir` (nonnegative) OR `rpe` (1–10), `side` (`left`, `right`, `both`, `unspecified`), and `kind` (`working`, `warmup`, `drop`; default `working`). Omit unknown effort. Load must be finite and nonnegative; units are `lb` or `kg`; reps are positive integers. Unknown fields are rejected to catch logging mistakes. The set view includes warmups by default and excludes drop sets. Implied 1RM uses working sets only; actual 1RM considers all logged singles. Assistance tracking is not supported in this version.

## Load normalization

| Convention | Example | Per-limb display |
| --- | --- | --- |
| `per_limb`, 1 | 20 lb dumbbell, one arm | 20 lb |
| `per_limb`, 1 | Two 20 lb dumbbells together | 20 lb |
| `combined`, 2 | 40 lb machine load shared by two arms | 20 lb |
| `combined`, 1 | 40 lb shared-stack machine used by one arm | 40 lb |
| `total`, 1 | Total external load | Separate total-load view |

The divisor describes how many limbs share the recorded combined load. `per_limb/1` stays unchanged even when two independently loaded limbs move together. Combined loads allow one or two sharing limbs; explicit left/right sets cannot use `combined/2`, and `both` cannot use `combined/1`. Unknown side remains unspecified.

Conventions may change between blocks on the same equipment. When switching one-arm versus two-arm use of a shared machine, create separate blocks with the actual convention. Preserve each block's original load and unit. In “As recorded,” incompatible conventions have separate chart lines and record rows; “Per limb” can combine compatible conventions while keeping sides separate. Changing a new block never requires rewriting history.

Normalized machine values are **nominal**, not measurements of actual resistance. Matching dumbbell/machine numbers do not account for leverage, cams, or friction. Equipment series remain separate; empirical machine conversions are intentionally deferred. The per-limb view excludes total-only entries, and vice versa. “As recorded” converts units only.

For unilateral exercises, record the stated side. Separate left/right sets when both are explicitly logged; do not assume the unmentioned arm performed the same work. Charts keep sides separate.

## View progress

The dashboard filters by exercise, location, equipment, date, rep range, effort scale/range, and unit. It shows the best matching load per session, matching-set counts, original set history, and daily implied 1RM alongside the running actual one-rep PR. Narrow the rep and effort filters for fair comparisons. Missing effort is included only with the “Any / unrecorded” option. Separate machine lines are never joined.

### 1RM estimates and records

Progress includes one chart per comparable exercise/equipment/side/load group. `records.html` shows each group's highest implied 1RM and actual 1RM, with dates and links to the source workouts. Both pages default to original load conventions; choose per-limb display for nominal comparisons where applicable. Total loads are never divided in the Records page's per-limb view.

For each calendar date and comparable group (including multiple workouts that day):

1. Select the **working set with the lowest explicitly recorded RIR**. Ignore RPE-only sets and missing RIR; never convert RPE or assume zero. Zero-load entries do not produce estimates.
2. Compute **Epley with RIR adjustment**: `load × (1 + (reps + RIR) / 30)`. A single at zero RIR returns its observed load. If the minimum RIR is tied, use the larger estimate, then the stable workout/set ID for a deterministic tie.
3. Keep the **highest of the daily selected estimates** for the all-time implied record. Never substitute a higher estimate from an easier set that lost the day's RIR selection.
4. Actual 1RM is the heaviest logged **one-rep set**, including singles without effort data. It is an observed single, not proof that the lifter reached failure. No singles means “Not recorded.” The graph's dashed PR line is cumulative through each date, with no future records applied backward.

Exercise/location/equipment/load-view/unit/date controls apply to the 1RM graph. Rep/effort/warmup filters apply only to the ordinary set view: they cannot change the lowest-RIR selection or erase a prior actual PR. Date filtering happens after cumulative PR calculation. Free-weight days combine locations when no location filter is selected.

The base Epley equation is described in [this research paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11940757/). Adding RIR to reps is this app's modeling assumption about reps remaining to failure, not an individually calibrated measurement. Estimates above 10 effective reps (`reps + RIR`) carry a “less certain” label; values remain visible rather than silently discarded. Machine estimates use the recorded labels, not measured force.

### Schema update

Existing exercise entries now declare `load_scope`, and blocks declare `equipment_type`. The existing abdominal-crunch blocks were corrected from `combined/2` to `total/1`; original loads, units, reps, effort, dates, and IDs were retained. No synthetic workouts are published.

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
