'use strict';
const $ = id => document.getElementById(id);
const palette = ['#087e92','#b95617','#6e53a7','#227a4a','#b33c68','#596a12'];
function normalized(load, unit, basis, limbs, target='lb') {
  const factor = unit === target ? 1 : unit === 'kg' ? 2.2046226218487757 : 1/2.2046226218487757;
  return load * factor / (basis === 'combined' ? limbs : 1);
}
function rowsOf(data) {
  return data.workouts.flatMap(w => w.exercises.flatMap(b => b.sets.map(s => ({...s,
    date:w.date, workout:w.id, location:w.location, exercise:b.exercise, equipment:b.equipment,
    basis:b.load_basis, limbs:b.limbs_sharing_load, key:`${w.location}/${b.equipment}`,
    notes:[w.notes,b.notes,s.notes].filter(Boolean).join(' · ')}))));
}
function options(id, entries, first) {
  const select=$(id), previous=select.value;
  select.replaceChildren();
  for (const [value,label] of (first ? [['',first],...entries] : entries)) {
    const option=document.createElement('option'); option.value=value;option.textContent=label;select.append(option);
  }
  if ([...select.options].some(o=>o.value===previous)) select.value=previous;
}
function svgElement(name, attrs={}, text) {
  const el=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [key,value] of Object.entries(attrs)) el.setAttribute(key,String(value));
  if(text!==undefined) el.textContent=text;
  return el;
}
function drawChart(rows, valueOf, names, unit) {
  $('chart').replaceChildren();$('legend').replaceChildren();
  if(!rows.length){$('chart').textContent='No working sets match these filters.';return;}
  const groups=new Map();
  for(const r of rows){
    // Keep side-specific observations separate as well as equipment.
    const key=`${r.key} · ${r.side || 'unspecified'}`;
    if(!groups.has(key)) groups.set(key,new Map());
    const previous=groups.get(key).get(r.workout);
    if(!previous || valueOf(r)>valueOf(previous)) groups.get(key).set(r.workout,r);
  }
  const all=[...groups.values()].flatMap(g=>[...g.values()]);
  const times=all.map(r=>Date.parse(r.date+'T00:00:00Z'));
  const min=Math.min(...times),max=Math.max(...times),top=Math.max(1,...all.map(valueOf))*1.15;
  const x=r=>min===max?475:70+(Date.parse(r.date+'T00:00:00Z')-min)/(max-min)*810;
  const y=r=>285-valueOf(r)/top*240;
  const svg=svgElement('svg',{viewBox:'0 0 940 340',role:'img','aria-label':`Best matching load per session in ${unit}. Exact sets are in the history table.`});
  for(let i=0;i<=4;i++){
    const yy=285-i*60;
    svg.append(svgElement('line',{x1:70,x2:880,y1:yy,y2:yy,stroke:'#e1e8ed'}));
    svg.append(svgElement('text',{x:58,y:yy+5,'text-anchor':'end',fill:'#536878','font-size':14},(top*i/4).toFixed(1)));
  }
  svg.append(svgElement('text',{x:70,y:320,fill:'#536878','font-size':14},new Date(min).toISOString().slice(0,10)));
  if(max!==min)svg.append(svgElement('text',{x:880,y:320,'text-anchor':'end',fill:'#536878','font-size':14},new Date(max).toISOString().slice(0,10)));
  let index=0;
  for(const [key,group] of groups){
    const color=palette[index++%palette.length],points=[...group.values()].sort((a,b)=>a.date.localeCompare(b.date));
    svg.append(svgElement('polyline',{points:points.map(r=>`${x(r)},${y(r)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));
    for(const r of points){const dot=svgElement('circle',{cx:x(r),cy:y(r),r:5,fill:color});dot.append(svgElement('title',{},`${r.date} · ${key}: ${valueOf(r).toFixed(2)} ${unit} × ${r.reps}`));svg.append(dot);}
    const label=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=color;
    label.append(swatch,document.createTextNode(key));$('legend').append(label);
  }
  $('chart').append(svg);
}
function start(){
  const data=window.GYM_DATA;
  if(!data)throw new Error('Workout data could not be loaded. Rebuild the dashboard and try again.');
  const all=rowsOf(data), names=Object.fromEntries(data.locations.map(l=>[l.id,l.name]));
  $('empty').hidden=all.length>0;$('dashboard').hidden=!all.length;
  if(!all.length)return;
  $('updated').textContent=`Last recorded workout · ${data.workouts.at(-1).date}`;
  options('exercise',data.exercises.filter(e=>all.some(r=>r.exercise===e.id)).map(e=>[e.id,e.name]));
  options('location',data.locations.map(l=>[l.id,l.name]),'All locations');
  function equipmentOptions(){
    const subset=all.filter(r=>r.exercise===$('exercise').value&&(!$('location').value||r.location===$('location').value));
    options('equipment',[...new Set(subset.map(r=>r.key))].map(k=>[k,k]),'All equipment');
  }
  function render(){
    const mode=$('mode').value,unit=$('unit').value;
    const valueOf=r=>normalized(r.load,r.unit,mode==='raw'?'total':r.basis,r.limbs,unit);
    const matching=all.filter(r=>r.exercise===$('exercise').value&&(!$('location').value||r.location===$('location').value)&&(!$('equipment').value||r.key===$('equipment').value));
    const rows=matching.filter(r=>(r.kind||'working')==='working'
      && (mode==='raw'||(mode==='total'?r.basis==='total':r.basis!=='total'))
      && r.reps>=Number($('minReps').value||1)&&(!$('maxReps').value||r.reps<=Number($('maxReps').value))
      && (!$('from').value||r.date>=$('from').value)&&(!$('to').value||r.date<=$('to').value)
      && ($('effort').value==='all'||(r[$('effort').value]!==undefined
        && (!$('minEffort').value||r[$('effort').value]>=Number($('minEffort').value))
        && (!$('maxEffort').value||r[$('effort').value]<=Number($('maxEffort').value)))));
    $('minEffort').disabled=$('maxEffort').disabled=$('effort').value==='all';
    $('sessions').textContent=new Set(rows.map(r=>r.workout)).size;$('setCount').textContent=rows.length;
    $('latest').textContent=rows.length?rows.map(r=>r.date).sort().at(-1):'—';
    $('chartTitle').textContent=`Best ${mode==='normalized'?'per-limb ':mode==='total'?'total ':''}load per session (${unit})`;
    $('comparison').textContent=mode==='normalized'?'Nominal load per limb. Combined two-arm loads are divided by two; dumbbell loads stay per dumbbell. Equipment remains separate.':mode==='total'?'Only entries recorded as total load are included.':'Original load conventions, converted only between lb and kg. Combined and per-limb weights are not comparable in this view.';
    drawChart(rows,valueOf,names,unit);
    const body=$('history');body.replaceChildren();
    for(const r of [...rows].sort((a,b)=>b.date.localeCompare(a.date))){
      const tr=document.createElement('tr');
      const effort=r.rir!==undefined?`${r.rir} RIR`:r.rpe!==undefined?`${r.rpe} RPE`:'—';
      for(const value of [r.date,`${names[r.location]} / ${r.equipment}`,`${r.load} ${r.unit} (${r.basis.replace('_',' ')})`,`${Number(valueOf(r).toFixed(2))} ${unit}`,r.reps,effort,r.side||'unspecified',r.notes||'—']){
        const td=document.createElement('td');td.textContent=value;tr.append(td);
      }body.append(tr);
    }
  }
  equipmentOptions();
  function chooseMode(){const subset=all.filter(r=>r.exercise===$('exercise').value);$('mode').value=subset.every(r=>r.basis==='total')?'total':'normalized';}
  chooseMode();
  for(const el of document.querySelectorAll('select,input'))el.addEventListener('change',()=>{
    if(el.id==='exercise'||el.id==='location')equipmentOptions();
    if(el.id==='exercise')chooseMode();
    render();
  });render();
}
if(typeof module!=='undefined')module.exports={normalized,rowsOf};
if(typeof document!=='undefined')try{start();}catch(error){$('error').hidden=false;$('error').textContent=error.message;}
