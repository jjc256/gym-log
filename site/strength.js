'use strict';

function converted(load, unit, target = 'lb') {
  return load * (unit === target ? 1 : unit === 'kg' ? 2.2046226218487757 : 1 / 2.2046226218487757);
}
function sideOf(row) {
  return row.side || 'n/a';
}
function comparisonKey(row) {
  return JSON.stringify([row.location, row.exercise, row.equipment, sideOf(row)]);
}
function comparisonLoad(row, unit = 'lb') {
  return converted(row.load, row.unit, unit);
}
function impliedOneRM(load, reps, rir) {
  if (!Number.isFinite(load) || load <= 0 || !Number.isInteger(reps) || reps < 1 || !Number.isFinite(rir) || rir < 0) return null;
  const effectiveReps = reps + rir;
  return effectiveReps === 1 ? load : load * (1 + effectiveReps / 30);
}
function sourceKey(row) { return `${row.workout}/${row.id}`; }
function betterEstimate(candidate, previous) {
  return !previous || candidate.row.rir < previous.row.rir ||
    (candidate.row.rir === previous.row.rir && (candidate.value > previous.value ||
      (candidate.value === previous.value && sourceKey(candidate.row) < sourceKey(previous.row))));
}
function betterActual(candidate, previous) {
  return !previous || candidate.value > previous.value ||
    (candidate.value === previous.value && sourceKey(candidate.row) < sourceKey(previous.row));
}
function strengthSeries(rows, unit = 'lb') {
  const groups = new Map();
  for (const row of rows) {
    const key = comparisonKey(row);
    if (!groups.has(key)) groups.set(key, {key, row:{...row, side:sideOf(row)}, days:new Map()});
    const group = groups.get(key);
    if (!group.days.has(row.date)) group.days.set(row.date, {date:row.date, estimate:null, actual:null});
    const day = group.days.get(row.date), load = comparisonLoad(row, unit);
    if ((row.kind || 'working') === 'working') {
      const value = impliedOneRM(load, row.reps, row.rir);
      if (value !== null) {
        const candidate = {row, value};
        if (betterEstimate(candidate, day.estimate)) day.estimate = candidate;
      }
    }
    if (row.reps === 1 && Number.isFinite(load)) {
      const candidate = {row, value:load};
      if (betterActual(candidate, day.actual)) day.actual = candidate;
    }
  }
  return [...groups.values()].map(group => {
    let actualPR = null, bestEstimate = null;
    const days = [...group.days.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(day => {
      if (day.actual && (!actualPR || day.actual.value > actualPR.value)) actualPR = day.actual;
      if (day.estimate && (!bestEstimate || day.estimate.value > bestEstimate.value)) bestEstimate = day.estimate;
      return {...day, actualPR};
    });
    return {...group, days, bestEstimate, actualPR};
  }).sort((a,b)=>a.key.localeCompare(b.key));
}
function recordSeries(rows, unit = 'lb') {
  return strengthSeries(rows, unit);
}
const GymStrength = {converted, sideOf, comparisonKey, comparisonLoad, impliedOneRM, strengthSeries, recordSeries};
if (typeof module !== 'undefined') module.exports = GymStrength;
if (typeof window !== 'undefined') window.GymStrength = GymStrength;
