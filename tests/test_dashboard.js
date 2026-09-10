const assert=require('node:assert/strict');
const {rowsOf,weeklyActivity,niceAxis}=require('../site/app.js');
const {converted,comparisonKey,comparisonLoad,impliedOneRM,strengthSeries,recordSeries}=require('../site/strength.js');
const fixture=require('./fixtures/workout.json');

const rows=rowsOf({workouts:[fixture]});
assert.equal(rows.length,2);
assert.equal(rows[0].side,'left');
assert.equal(rows[1].side,'n/a');
assert.equal(converted(20,'kg','lb').toFixed(6),'44.092452');
assert.equal(comparisonLoad(rows[0],'lb'),20);

const base={id:'a',workout:'w-a',date:'2026-09-01',location:'gym-a',exercise:'curl',equipment:'machine-a',side:'n/a',load:100,unit:'lb',reps:8,rir:2};
assert.equal(comparisonKey({...base,side:undefined}),comparisonKey(base));
assert.notEqual(comparisonKey({...base,side:'left'}),comparisonKey(base));
assert.notEqual(comparisonKey({...base,location:'gym-b'}),comparisonKey(base));
assert.notEqual(comparisonKey({...base,equipment:'machine-b'}),comparisonKey(base));
assert.notEqual(comparisonKey({...base,exercise:'row'}),comparisonKey(base));

assert.ok(Math.abs(impliedOneRM(100,8,2)-133.33333333333331)<1e-9);
let groups=strengthSeries([
  base,
  {...base,id:'b',workout:'w-b',date:'2026-09-02',load:110},
  {...base,id:'c',workout:'w-c',location:'gym-b',load:999},
  {...base,id:'d',workout:'w-d',equipment:'machine-b',load:999},
  {...base,id:'e',workout:'w-e',side:'left',load:999}
]);
assert.equal(groups.length,4);
const same=groups.find(g=>g.row.location==='gym-a'&&g.row.equipment==='machine-a'&&g.row.side==='n/a');
assert.equal(same.days.length,2);

assert.equal(recordSeries([{...base,reps:1,rir:undefined},{...base,id:'l',workout:'wl',side:'left',reps:1,rir:undefined}]).length,2);

const workout=(date,kinds)=>({date,exercises:[{sets:kinds.map(kind=>({kind}))}]});
const weeks=weeklyActivity([workout('2026-09-06',['working','warmup']),workout('2026-09-10',['working'])],new Date(2026,8,10));
assert.equal(weeks.at(-1).sets,2);
assert.deepEqual(niceAxis(42),{top:50,ticks:[0,10,20,30,40,50]});
console.log('Simplified identity, side, unit conversion, and dashboard checks passed.');
