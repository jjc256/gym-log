#!/usr/bin/env python3
"""Validate chat-authored workout records and build a dependency-free dashboard."""
import argparse
import datetime as dt
import json
import math
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def fields(obj, required, optional=()):
    require(isinstance(obj, dict), 'Expected an object')
    require(set(required) <= obj.keys(), f'Missing fields: {set(required) - obj.keys()}')
    require(obj.keys() <= set(required) | set(optional), f'Unknown fields: {obj.keys() - set(required) - set(optional)}')


def slug(value):
    require(isinstance(value, str) and SLUG.fullmatch(value), f'Invalid ID: {value!r}')


def normalize(load, unit, basis, limbs, target_unit='lb'):
    """Nominal per-limb/total load, NOT a machine-resistance conversion."""
    value = load / (limbs if basis == 'combined' else 1)
    if unit != target_unit:
        value *= 2.2046226218487757 if unit == 'kg' else 1 / 2.2046226218487757
    return value


def catalog(path):
    items = json.loads(path.read_text())
    require(isinstance(items, list), f'{path}: expected a list')
    result = {}
    for item in items:
        fields(item, ('id', 'name'), ('aliases',))
        slug(item['id'])
        require(isinstance(item['name'], str) and item['name'].strip(), 'Name required')
        require(item['id'] not in result, f'Duplicate ID: {item["id"]}')
        aliases = item.get('aliases', [])
        require(isinstance(aliases, list) and all(isinstance(a, str) and a.strip() for a in aliases), 'Invalid aliases')
        result[item['id']] = item
    return result


def validate_workout(w, exercises, locations):
    fields(w, ('id', 'date', 'location', 'exercises'), ('notes',))
    slug(w['id'])
    require(isinstance(w['date'], str), 'Date must be a string')
    require(dt.date.fromisoformat(w['date']).isoformat() == w['date'], 'Use YYYY-MM-DD')
    require(w['location'] in locations, f'Unknown location: {w["location"]}')
    require(isinstance(w['exercises'], list) and w['exercises'], 'Workout needs exercises')
    require(isinstance(w.get('notes', ''), str), 'Notes must be text')
    set_ids = set()
    for block in w['exercises']:
        fields(block, ('exercise', 'equipment', 'load_basis', 'limbs_sharing_load', 'sets'), ('notes',))
        require(block['exercise'] in exercises, f'Unknown exercise: {block["exercise"]}')
        slug(block['equipment'])
        require(block['load_basis'] in ('per_limb', 'combined', 'total'), 'Invalid load_basis')
        limbs = block['limbs_sharing_load']
        require(type(limbs) is int and limbs in (1, 2), 'limbs_sharing_load must be 1 or 2')
        require(limbs == (2 if block['load_basis'] == 'combined' else 1), 'Use combined/2, per_limb/1, or total/1')
        require(isinstance(block.get('notes', ''), str), 'Notes must be text')
        require(isinstance(block['sets'], list) and block['sets'], 'Exercise needs sets')
        for s in block['sets']:
            fields(s, ('id', 'load', 'unit', 'reps'), ('rir', 'rpe', 'side', 'kind', 'notes'))
            slug(s['id'])
            require(s['id'] not in set_ids, f'Duplicate set ID: {s["id"]}')
            set_ids.add(s['id'])
            require(number(s['load']) and s['load'] >= 0, 'Load must be a finite nonnegative number')
            require(s['unit'] in ('lb', 'kg'), 'Unit must be lb or kg')
            require(type(s['reps']) is int and s['reps'] > 0, 'Reps must be a positive integer')
            require(not ('rir' in s and 'rpe' in s), 'Record RIR or RPE, not both')
            if 'rir' in s:
                require(number(s['rir']) and s['rir'] >= 0, 'RIR must be nonnegative')
            if 'rpe' in s:
                require(number(s['rpe']) and 1 <= s['rpe'] <= 10, 'RPE must be between 1 and 10')
            require(s.get('side', 'both') in ('left', 'right', 'both', 'unspecified'), 'Invalid side')
            require(s.get('kind', 'working') in ('working', 'warmup', 'drop'), 'Invalid kind')
            require(isinstance(s.get('notes', ''), str), 'Notes must be text')
    return w


def load_data(root=ROOT):
    exercises = catalog(root / 'data/exercises.json')
    locations = catalog(root / 'data/locations.json')
    workouts, ids = [], set()
    for path in sorted((root / 'data/workouts').glob('*.json')):
        try:
            w = validate_workout(json.loads(path.read_text()), exercises, locations)
            require(w['id'] not in ids, f'Duplicate workout ID: {w["id"]}')
            require(path.name == f'{w["date"]}_{w["id"]}.json', 'Filename must be DATE_ID.json')
            ids.add(w['id'])
            workouts.append(w)
        except (ValueError, TypeError, KeyError) as exc:
            raise ValueError(f'{path.name}: {exc}') from exc
    # A series must retain its measurement basis; fixes require explicit historical review.
    bases = {}
    for w in workouts:
        for b in w['exercises']:
            key = (b['exercise'], w['location'], b['equipment'])
            convention = (b['load_basis'], b['limbs_sharing_load'])
            require(key not in bases or bases[key] == convention, f'Changed load convention for {key}')
            bases[key] = convention
    return {'exercises': list(exercises.values()), 'locations': list(locations.values()),
            'workouts': sorted(workouts, key=lambda w: (w['date'], w['id']))}


def build(root=ROOT, output=None):
    data = load_data(root)
    output = output or root / 'dist'
    output.mkdir(parents=True, exist_ok=True)
    for filename in ('index.html', 'app.js', 'style.css'):
        shutil.copyfile(root / 'site' / filename, output / filename)
    # Script-safe JSON also lets the built dashboard open directly from disk.
    payload = json.dumps(data, ensure_ascii=True, separators=(',', ':')).replace('<', '\\u003c')
    (output / 'data.js').write_text(f'window.GYM_DATA = {payload};\n')
    (output / '.nojekyll').touch()
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('check', 'build'))
    args = parser.parse_args()
    try:
        if args.command == 'build':
            print(f'Built {build()}')
        else:
            data = load_data()
            print(f'Valid: {len(data["workouts"])} workouts')
    except (ValueError, TypeError, KeyError) as exc:
        print(f'Invalid data: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
