import copy
import json
from pathlib import Path
import tempfile
import unittest
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from gymlog import validate_workout, normalize, load_data, build, ROOT


class GymLogTests(unittest.TestCase):
    def setUp(self):
        self.workout = json.loads((ROOT / 'tests/fixtures/workout.json').read_text())
        self.exercises = {'preacher-curl': {}}
        self.locations = {'example-gym': {}}

    def validate(self, w=None):
        return validate_workout(w or self.workout, self.exercises, self.locations)

    def test_twenty_per_arm_equals_forty_combined(self):
        self.validate()
        values = [normalize(b['sets'][0]['load'], 'lb', b['load_basis'], b['limbs_sharing_load']) for b in self.workout['exercises']]
        self.assertEqual(values, [20, 20])

    def test_dumbbell_pair_is_not_halved(self):
        self.assertEqual(normalize(20, 'lb', 'per_limb', 1), 20)

    def test_unit_conversion(self):
        self.assertAlmostEqual(normalize(20, 'kg', 'combined', 2), 22.046226218487757)
        self.assertAlmostEqual(normalize(22.046226218487757, 'lb', 'per_limb', 1, 'kg'), 10)

    def test_invalid_inputs(self):
        for field,value in [('load',-1),('load',True),('load',float('nan')),('unit','lbs'),('reps',0),('reps',True),('rir',-1)]:
            with self.subTest(field=field,value=value):
                w=copy.deepcopy(self.workout);w['exercises'][0]['sets'][0][field]=value
                with self.assertRaises(ValueError):self.validate(w)

    def test_effort_not_invented(self):
        del self.workout['exercises'][0]['sets'][0]['rir']
        self.validate()
        self.assertNotIn('rir',self.workout['exercises'][0]['sets'][0])

    def test_reject_duplicate_sets_and_conflicting_effort(self):
        block=self.workout['exercises'][0]
        block['sets'].append(copy.deepcopy(block['sets'][0]))
        with self.assertRaises(ValueError):self.validate()
        block['sets'].pop();block['sets'][0]['rpe']=8
        with self.assertRaises(ValueError):self.validate()

    def test_unknown_location_and_convention(self):
        self.workout['location']='other-gym'
        with self.assertRaises(ValueError):self.validate()
        self.workout['location']='example-gym'
        self.workout['exercises'][1]['limbs_sharing_load']=1
        with self.assertRaises(ValueError):self.validate()

    def test_fixture_is_not_in_real_data(self):
        self.assertNotIn('example-workout', [w['id'] for w in load_data()['workouts']])

    def test_empty_build(self):
        with tempfile.TemporaryDirectory() as directory:
            output=build(output=Path(directory))
            self.assertTrue((output/'index.html').exists())
            self.assertIn('window.GYM_DATA', (output/'data.js').read_text())

    def test_changed_convention_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'data/workouts').mkdir(parents=True)
            for name,values in [('exercises',[{'id':'preacher-curl','name':'Preacher curl'}]),('locations',[{'id':'example-gym','name':'Example gym'}])]:
                (root/f'data/{name}.json').write_text(json.dumps(values))
            for i in range(2):
                w=copy.deepcopy(self.workout);w['id']=f'workout-{i}'
                if i:w['exercises'][0].update(load_basis='combined',limbs_sharing_load=2)
                (root/f'data/workouts/{w["date"]}_{w["id"]}.json').write_text(json.dumps(w))
            with self.assertRaises(ValueError):load_data(root)

if __name__=='__main__':unittest.main()
