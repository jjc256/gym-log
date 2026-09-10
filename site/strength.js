'use strict';

// Pure calculations shared by the progress graph and all-time records page.
function converted(load, unit, target = 'lb') {
  return load * (unit === target ? 1 : unit === 'kg' ? 2.2046226218487757 : 1 / 2.2046226218487757);
}
function equipmentKey(row) {
  return row.equipment_type === 'free_weight' ? `free-weight/${row.equipment}` : `${row.location}/${row.equipment}`;
}
function loadConvention(row, mode = 'raw') {
  if (mode === 'normalized' && row.load_scope === 'per_limb' && row.basis !== 'total') return 'per limb';
  return row.basis === 'combined' ? `shared by ${row.limbs}` : row.basis === 'per_limb' ? 'per limb' : 'total';
}
function comparisonKey(row, mode = 'raw') {
  return JSON.stringify([row.exercise, equipmentKey(row), row.side || 'unspecified', loadConvention(row, mode)]);
}
function comparisonLoad(row, mode = 'raw', unit = 'lb') {
  const divisor = mode === 'normalized' && row.load_scope === 'per_limb' && row.basis === 'combined' ? row.limbs : 1;
  return converted(row.load, row.unit, unit) / divisor;
}
function impliedOneRM(load, reps, rir) {
  if (!Number.isFinite(load) || load <= 0 || !Number.isInteger(reps) || reps < 1 || !Number.isFinite(rir) || rir < 0) return null;
  const effectiveReps = reps + rir;
  // A single at zero RIR is already an observed max, without Epley's rep bonus.
  const estimate = effectiveReps === 1 ? load : load * (1 + effectiveReps / 30);
  return Number.isFinite(estimate) ? estimate : null;
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
function strengthSeries(rows, mode = 'raw', unit = 'lb') {
  const groups = new Map();
  for (const row of rows) {
    const key = comparisonKey(row, mode);
    if (!groups.has(key)) groups.set(key, {key, row, convention: loadConvention(row, mode), days: new Map()});
    const group = groups.get(key);
    if (!group.days.has(row.date)) group.days.set(row.date, {date: row.date, estimate: null, actual: null});
    const day = group.days.get(row.date), load = comparisonLoad(row, mode, unit);
    if ((row.kind || 'working') === 'working') {
      const value = impliedOneRM(load, row.reps, row.rir);
      if (value !== null) {
        const candidate = {row, value};
        if (betterEstimate(candidate, day.estimate)) day.estimate = candidate;
      }
    }
    // Every successfully logged single is evidence, even if effort was not supplied.
    if (row.reps === 1 && Number.isFinite(load)) {
      const candidate = {row, value: load};
      if (betterActual(candidate, day.actual)) day.actual = candidate;
    }
  }
  return [...groups.values()].map(group => {
    let actualPR = null, bestEstimate = null;
    const days = [...group.days.values()].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
      if (day.actual && (!actualPR || day.actual.value > actualPR.value)) actualPR = day.actual;
      if (day.estimate && (!bestEstimate || day.estimate.value > bestEstimate.value)) bestEstimate = day.estimate;
      return {...day, actualPR};
    });
    return {...group, days, bestEstimate, actualPR};
  }).sort((a, b) => a.key.localeCompare(b.key));
}
const GymStrength = {converted, equipmentKey, loadConvention, comparisonKey, comparisonLoad, impliedOneRM, strengthSeries};
if (typeof module !== 'undefined') module.exports = GymStrength;
if (typeof window !== 'undefined') window.GymStrength = GymStrength;
