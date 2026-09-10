const assert=require('node:assert/strict');
const {normalized,rowsOf}=require('../site/app.js');
const fixture=require('./fixtures/workout.json');
const rows=rowsOf({workouts:[fixture]});
assert.equal(rows.length,2);
assert.deepEqual(rows.map(r=>normalized(r.load,r.unit,r.basis,r.limbs)),[20,20]);
assert.notEqual(rows[0].key,rows[1].key);
assert.equal(rows[0].key,'example-gym/dumbbells');
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
