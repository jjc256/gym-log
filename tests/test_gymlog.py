import copy
import json
from pathlib import Path
import tempfile
import unittest
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from gymlog import validate_workout, load_data, build, ROOT

class GymLogTests(unittest.TestCase):
    def setUp(self):
        self.workout=json.loads((ROOT/'tests/fixtures/workout.json').read_text())
        self.exercises={'preacher-curl':{}}
        self.locations={'example-gym':{}}

    def validate(self,w=None):
        return validate_workout(w or self.workout,self.exercises,self.locations)

    def test_valid_fixture(self):
        self.validate()

    def test_side_is_only_left_right_both(self):
        for side in ('left','right','both'):
            w=copy.deepcopy(self.workout);w['exercises'][0]['sets'][0]['side']=side;self.validate(w)
        w=copy.deepcopy(self.workout);del w['exercises'][0]['sets'][0]['side'];self.validate(w)
        w=copy.deepcopy(self.workout);w['exercises'][0]['sets'][0]['side']='unspecified'
        with self.assertRaises(ValueError):self.validate(w)

    def test_old_comparison_fields_are_rejected(self):
        for field,value in [('load_basis','combined'),('limbs_sharing_load',2),('equipment_type','machine')]:
            w=copy.deepcopy(self.workout);w['exercises'][0][field]=value
            with self.assertRaises(ValueError):self.validate(w)

    def test_invalid_inputs(self):
        for field,value in [('load',-1),('load',True),('unit','lbs'),('reps',0),('reps',True),('rir',-1)]:
            w=copy.deepcopy(self.workout);w['exercises'][0]['sets'][0][field]=value
            with self.assertRaises(ValueError):self.validate(w)

    def test_catalog_no_longer_has_load_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'data/workouts').mkdir(parents=True)
            (root/'data/exercises.json').write_text(json.dumps([{'id':'preacher-curl','name':'Preacher curl','load_scope':'per_limb'}]))
            (root/'data/locations.json').write_text(json.dumps([{'id':'example-gym','name':'Example gym'}]))
            with self.assertRaises(ValueError):load_data(root)

    def test_fixture_is_not_real_data(self):
        self.assertNotIn('example-workout',[w['id'] for w in load_data()['workouts']])

    def test_build(self):
        with tempfile.TemporaryDirectory() as directory:
            output=build(output=Path(directory))
            for page in ('index.html','calendar.html','progress.html','records.html'):
                self.assertTrue((output/page).exists())
            self.assertIn('window.GYM_DATA',(output/'data.js').read_text())

if __name__=='__main__':unittest.main()
