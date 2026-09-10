const assert=require('node:assert/strict');
const {normalized,rowsOf}=require('../site/app.js');
const fixture=require('./fixtures/workout.json');
const rows=rowsOf({workouts:[fixture]});
assert.equal(rows.length,2);
assert.deepEqual(rows.map(r=>normalized(r.load,r.unit,r.basis,r.limbs)),[20,20]);
assert.notEqual(rows[0].key,rows[1].key);
assert.equal(rows[0].key,'free-weight/dumbbells');
assert.ok(Math.abs(normalized(20,'kg','combined',2)-22.046226218487757)<1e-10);
console.log('Dashboard normalization and equipment identity checks passed.');

const {weeklyActivity}=require('../site/app.js');
const workout=(date,kinds)=>({date,exercises:[{sets:kinds.map(kind=>({kind}))}]});
const weeks=weeklyActivity([
  workout('2026-09-06',['working','warmup','drop']),
  workout('2026-09-06',['working']),
  workout('2026-09-10',['working']),
  workout('2026-09-11',['working']),
  workout('2026-01-01',['working'])
],new Date(2026,8,10));
assert.equal(weeks.length,8);
assert.equal(weeks.at(-1).days,2);
assert.equal(weeks.at(-1).sets,3);
assert.equal(weeks.reduce((n,w)=>n+w.sets,0),3);
console.log('Weekly activity checks passed.');

const {niceAxis}=require('../site/app.js');
assert.deepEqual(niceAxis(42),{top:50,ticks:[0,10,20,30,40,50]});
assert.deepEqual(niceAxis(0),{top:1,ticks:[0,0.2,0.4,0.6,0.8,1]});
assert.deepEqual(niceAxis(0.42),{top:0.5,ticks:[0,0.1,0.2,0.3,0.4,0.5]});
for(const maximum of [1,20,100,225,999,2400]){
  const axis=niceAxis(maximum);
  assert.ok(axis.top>maximum);
  assert.ok(axis.ticks.length>=3&&axis.ticks.length<=7);
  assert.equal(axis.ticks[0],0);
}
console.log('Rounded chart axes passed.');

const {impliedOneRM, strengthSeries, comparisonKey, comparisonLoad}=require('../site/strength.js');
const close=(actual, expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const set=(id, extras={})=>({id,workout:'w-'+id,date:'2026-09-01',exercise:'preacher-curl',equipment:'dumbbells',equipment_type:'free_weight',location:'gym-a',load_scope:'per_limb',basis:'per_limb',limbs:1,side:'left',load:20,unit:'lb',reps:8,rir:2,...extras});
close(impliedOneRM(175,6,1),215.83333333333334);
assert.equal(impliedOneRM(100,1,0),100);
close(impliedOneRM(100,1,2),110);
assert.equal(impliedOneRM(100,6,undefined),null);
assert.equal(impliedOneRM(0,6,1),null);

// Lowest RIR takes priority over the largest formula result, across sessions on the same day.
let groups=strengthSeries([set('easy-heavy',{load:100,rir:3}),set('harder',{load:20,rir:1}),set('hardest',{load:10,rir:0})]);
assert.equal(groups[0].days.length,1);
assert.equal(groups[0].days[0].estimate.row.id,'hardest');
assert.equal(groups[0].bestEstimate.row.id,'hardest');
// Equal RIR chooses the greater estimate, then a stable source identity independent of input order.
const tied=[set('b',{reps:7,rir:0}),set('c',{reps:8,rir:0}),set('a',{reps:8,rir:0})];
assert.equal(strengthSeries(tied)[0].bestEstimate.row.id,'a');
assert.equal(strengthSeries([...tied].reverse())[0].bestEstimate.row.id,'a');

// RPE and missing effort never become invented RIR. Warmups/drop sets don't displace working sets.
groups=strengthSeries([set('missing',{rir:undefined,rpe:10}),set('warmup',{kind:'warmup',rir:0,load:100}),set('drop',{kind:'drop',rir:0,load:100}),set('working',{rir:1})]);
assert.equal(groups[0].bestEstimate.row.id,'working');
assert.equal(strengthSeries([set('missing',{rir:undefined,rpe:10})])[0].bestEstimate,null);

// Singles establish actual PR without RIR; PRs carry forward, never backward from the future.
const timeline=[set('single',{reps:1,load:25,rir:undefined}),set('next',{date:'2026-09-02',load:22}),set('bigger-single',{date:'2026-09-03',reps:1,load:30,rir:undefined}),set('lower-single',{date:'2026-09-04',reps:1,load:28,rir:undefined})];
groups=strengthSeries(timeline);
assert.deepEqual(groups[0].days.map(d=>d.actualPR.value),[25,25,30,30]);
assert.equal(groups[0].actualPR.value,30);
assert.equal(groups[0].days.filter(d=>d.date>='2026-09-02')[0].actualPR.value,25);
assert.equal(strengthSeries([set('multi',{load:100,reps:2})])[0].actualPR,null);
assert.equal(strengthSeries([set('single-warmup',{load:25,reps:1,kind:'warmup',rir:undefined})])[0].actualPR.value,25);
const futureOnly=strengthSeries([set('before'),set('later',{date:'2026-09-02',reps:1})])[0];
assert.equal(futureOnly.days[0].actualPR,null);
assert.equal(futureOnly.days[1].actualPR.value,20);

// Summary max is the highest of daily selected estimates, not of all sets or just the latest day.
const daily=strengthSeries([set('unselected',{load:100,rir:3}),set('day-one',{rir:0}),set('day-two',{date:'2026-09-02',load:15,rir:0})])[0];
assert.equal(daily.bestEstimate.row.id,'day-one');

// Free weights pool locations. Machines, equipment types, exercises, and sides never merge.
assert.equal(strengthSeries([set('a'),set('b',{location:'gym-b'})]).length,1);
assert.equal(strengthSeries([set('a'),set('b',{equipment:'barbell',basis:'total'})]).length,2);
assert.equal(strengthSeries([set('a'),set('b',{side:'both'})]).length,2);
assert.equal(strengthSeries([set('a'),set('b',{side:undefined})]).length,2);
assert.equal(strengthSeries([set('a'),set('b',{exercise:'hammer-curl'})]).length,2);
assert.equal(strengthSeries([set('a',{equipment_type:'machine'}),set('b',{equipment_type:'machine',location:'gym-b'})]).length,2);
assert.equal(strengthSeries([set('a',{equipment_type:'machine'}),set('b',{equipment_type:'machine',equipment:'other-station'})]).length,2);

// Changing conventions is safe: raw loads split; a per-limb view can join compatible conventions.
const shared=set('shared',{equipment_type:'machine',equipment:'curl-machine',side:'both',basis:'combined',limbs:2,load:40});
const independent={...shared,id:'independent',basis:'per_limb',limbs:1,load:20};
assert.notEqual(comparisonKey(shared),comparisonKey(independent));
assert.equal(comparisonKey(shared,'normalized'),comparisonKey(independent,'normalized'));
assert.equal(strengthSeries([shared,independent]).length,2);
assert.equal(strengthSeries([shared,independent],'normalized').length,1);
assert.equal(comparisonLoad(shared,'normalized'),20);
assert.equal(comparisonLoad({...shared,side:'left',limbs:1},'normalized'),40);
const total={...shared,load_scope:'total',basis:'total',limbs:1};
assert.equal(comparisonLoad(total,'normalized'),40);
assert.notEqual(comparisonKey(total,'normalized'),comparisonKey(shared,'normalized'));

// Unit conversion happens before selection and maximization.
const units=strengthSeries([set('lb',{load:44,reps:1,rir:0}),set('kg',{load:20,unit:'kg',reps:1,rir:0})],'raw','kg')[0];
assert.equal(units.bestEstimate.row.id,'kg');
close(units.actualPR.value,20);
assert.deepEqual(strengthSeries([]),[]);
console.log('Daily RIR selection, actual PR timeline, equipment grouping, conventions, and units passed.');

const {recordSeries}=require('../site/strength.js');
const recordRows=[
  set('left-single',{load:200,reps:1,rir:0}),
  set('right-estimate',{side:'right',load:200,reps:8,rir:0}),
  set('unknown',{side:undefined,load:300,reps:1,rir:0}),
  set('bilateral-estimate',{side:'both',load:20,reps:8,rir:1}),
  set('bilateral-single',{side:'both',load:25,reps:1,rir:undefined,date:'2026-09-02'})
];
for(const mode of ['raw','normalized']){
  const records=recordSeries(recordRows,mode);
  assert.equal(records.length,1);
  assert.equal(records[0].bestEstimate.row.id,'bilateral-estimate');
  assert.equal(records[0].actualPR.row.id,'bilateral-single');
}
assert.equal(recordSeries(recordRows.slice(0,3)).length,0);
const wholeMovement=set('whole',{exercise:'abdominal-crunch',load_scope:'total',basis:'total',side:undefined,reps:1});
assert.equal(recordSeries([wholeMovement])[0].actualPR.value,20);
assert.equal(recordSeries([{...wholeMovement,side:'left'}]).length,0);
// Keep unilateral history available on Progress.
assert.ok(strengthSeries(recordRows).some(g=>g.row.side==='left'));
console.log('Records exclude unilateral actual and implied maxes; whole-movement records remain.');
