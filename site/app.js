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
function maps(data){return {
  locations:Object.fromEntries(data.locations.map(x=>[x.id,x.name])),
  exercises:Object.fromEntries(data.exercises.map(x=>[x.id,x.name]))
};}
function effortText(s){return s.rir!==undefined?`${s.rir} RIR`:s.rpe!==undefined?`${s.rpe} RPE`:'—';}
function prettyDate(date){return new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
function exerciseSummary(block,names){
  const wrap=document.createElement('div');wrap.className='exercise-block';
  const head=document.createElement('div');head.className='exercise-title';
  const h=document.createElement('h3');h.textContent=names.exercises[block.exercise]||block.exercise;
  const eq=document.createElement('span');eq.className='muted';eq.textContent=block.equipment;
  head.append(h,eq);wrap.append(head);
  const sets=document.createElement('div');sets.className='set-chips';
  for(const s of block.sets){
    const chip=document.createElement('span');chip.className='set-chip';
    const kind=s.kind||'working';
    if(kind==='warmup')chip.classList.add('warmup');
    chip.textContent=`${s.load} ${s.unit} × ${s.reps} · ${effortText(s)}${kind==='warmup'?' · Warm-up':kind==='drop'?' · Drop':''}`;
    sets.append(chip);
  }
  wrap.append(sets);return wrap;
}
function workoutCard(w,names,compact=false){
  const card=document.createElement('article');card.className='workout-card';
  const head=document.createElement('div');head.className='workout-card-head';
  const date=document.createElement('strong');date.textContent=prettyDate(w.date);
  const loc=document.createElement('span');loc.className='muted';loc.textContent=names.locations[w.location]||w.location;
  head.append(date,loc);card.append(head);
  if(!compact) for(const b of w.exercises)card.append(exerciseSummary(b,names));
  else {const p=document.createElement('p');p.className='muted';p.textContent=`${w.exercises.length} exercise${w.exercises.length===1?'':'s'} · ${w.exercises.reduce((n,b)=>n+b.sets.length,0)} sets`;card.append(p);}
  return card;
}
function startHome(data){
  const all=rowsOf(data), names=maps(data), workouts=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date));
  $('empty').hidden=all.length>0;$('home').hidden=!all.length;if(!all.length)return;
  const latest=workouts.at(-1);$('updated').textContent=`Last workout · ${prettyDate(latest.date)}`;
  $('totalWorkouts').textContent=workouts.length;$('totalSets').textContent=all.filter(r=>(r.kind||'working')==='working').length;
  const now=new Date(),ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $('daysThisMonth').textContent=new Set(workouts.filter(w=>w.date.startsWith(ym)).map(w=>w.date)).size;
  $('latestWorkout').append(workoutCard(latest,names));
  const recent=$('recentDays');for(const w of workouts.slice(-6).reverse())recent.append(workoutCard(w,names,true));
}
function startCalendar(data){
  const names=maps(data), workouts=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date));
  $('calendarEmpty').hidden=workouts.length>0;$('calendarPage').hidden=!workouts.length;if(!workouts.length)return;
  const byDate=new Map();for(const w of workouts){if(!byDate.has(w.date))byDate.set(w.date,[]);byDate.get(w.date).push(w);}
  const latest=new Date(workouts.at(-1).date+'T12:00:00');let year=latest.getFullYear(),month=latest.getMonth();
  function showDay(date){
    const list=byDate.get(date)||[];$('dayTitle').textContent=list.length?prettyDate(date):'No workout';$('dayDetails').replaceChildren();
    if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='No workout was logged on this day.';$('dayDetails').append(p);return;}
    for(const w of list)$('dayDetails').append(workoutCard(w,names));
    for(const el of document.querySelectorAll('.calendar-day.selected'))el.classList.remove('selected');
    const cell=document.querySelector(`[data-date="${date}"]`);if(cell)cell.classList.add('selected');
  }
  function renderMonth(){
    $('monthLabel').textContent=new Date(year,month,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});const cal=$('calendar');cal.replaceChildren();
    for(const d of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){const x=document.createElement('div');x.className='weekday';x.textContent=d;cal.append(x);}
    const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
    for(let i=0;i<first;i++){const blank=document.createElement('div');blank.className='calendar-day blank';cal.append(blank);}
    for(let day=1;day<=days;day++){
      const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, list=byDate.get(date)||[];
      const button=document.createElement('button');button.type='button';button.className='calendar-day';button.dataset.date=date;
      const n=document.createElement('span');n.className='day-number';n.textContent=day;button.append(n);
      if(list.length){button.classList.add('trained');const dot=document.createElement('span');dot.className='workout-dot';dot.textContent=`${list.reduce((n,w)=>n+w.exercises.reduce((m,b)=>m+b.sets.length,0),0)} sets`;button.append(dot);button.addEventListener('click',()=>showDay(date));}
      else button.disabled=true;cal.append(button);
    }
  }
  $('prevMonth').addEventListener('click',()=>{month--;if(month<0){month=11;year--;}renderMonth();});
  $('nextMonth').addEventListener('click',()=>{month++;if(month>11){month=0;year++;}renderMonth();});
  renderMonth();showDay(workouts.at(-1).date);
}
function options(id, entries, first) {
  const select=$(id), previous=select.value;select.replaceChildren();
  for (const [value,label] of (first ? [['',first],...entries] : entries)) {const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  if ([...select.options].some(o=>o.value===previous)) select.value=previous;
}
function svgElement(name, attrs={}, text) {const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
function drawChart(rows, valueOf, unit) {
  $('chart').replaceChildren();$('legend').replaceChildren();if(!rows.length){$('chart').textContent='No sets match these filters.';return;}
  const groups=new Map();for(const r of rows){const key=`${r.key} · ${r.side||'unspecified'}`;if(!groups.has(key))groups.set(key,new Map());const prev=groups.get(key).get(r.workout);if(!prev||valueOf(r)>valueOf(prev))groups.get(key).set(r.workout,r);}
  const all=[...groups.values()].flatMap(g=>[...g.values()]),times=all.map(r=>Date.parse(r.date+'T00:00:00Z')),min=Math.min(...times),max=Math.max(...times),top=Math.max(1,...all.map(valueOf))*1.15;
  const x=r=>min===max?475:70+(Date.parse(r.date+'T00:00:00Z')-min)/(max-min)*810,y=r=>285-valueOf(r)/top*240;
  const svg=svgElement('svg',{viewBox:'0 0 940 340',role:'img','aria-label':`Best matching load per session in ${unit}.`});
  for(let i=0;i<=4;i++){const yy=285-i*60;svg.append(svgElement('line',{x1:70,x2:880,y1:yy,y2:yy,stroke:'#dfe5e8'}));svg.append(svgElement('text',{x:58,y:yy+5,'text-anchor':'end',fill:'#65747d','font-size':14},(top*i/4).toFixed(1)));}
  svg.append(svgElement('text',{x:70,y:320,fill:'#65747d','font-size':14},new Date(min).toISOString().slice(0,10)));if(max!==min)svg.append(svgElement('text',{x:880,y:320,'text-anchor':'end',fill:'#65747d','font-size':14},new Date(max).toISOString().slice(0,10)));
  let index=0;for(const [key,group] of groups){const color=palette[index++%palette.length],points=[...group.values()].sort((a,b)=>a.date.localeCompare(b.date));svg.append(svgElement('polyline',{points:points.map(r=>`${x(r)},${y(r)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));for(const r of points){const dot=svgElement('circle',{cx:x(r),cy:y(r),r:5,fill:color});dot.append(svgElement('title',{},`${r.date} · ${key}: ${valueOf(r).toFixed(2)} ${unit} × ${r.reps}`));svg.append(dot);}const label=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=color;label.append(swatch,document.createTextNode(key));$('legend').append(label);}$('chart').append(svg);
}
function startProgress(data){
  const all=rowsOf(data), names=maps(data);$('progressEmpty').hidden=all.length>0;$('dashboard').hidden=!all.length;if(!all.length)return;
  options('exercise',data.exercises.filter(e=>all.some(r=>r.exercise===e.id)).map(e=>[e.id,e.name]));options('location',data.locations.map(l=>[l.id,l.name]),'All locations');
  function equipmentOptions(){const subset=all.filter(r=>r.exercise===$('exercise').value&&(!$('location').value||r.location===$('location').value));options('equipment',[...new Set(subset.map(r=>r.key))].map(k=>[k,k]),'All equipment');}
  function render(){
    const mode=$('mode').value,unit=$('unit').value,valueOf=r=>normalized(r.load,r.unit,mode==='raw'?'total':r.basis,r.limbs,unit);
    const matching=all.filter(r=>r.exercise===$('exercise').value&&(!$('location').value||r.location===$('location').value)&&(!$('equipment').value||r.key===$('equipment').value));
    const includeWarmups=$('includeWarmups').checked;
    const rows=matching.filter(r=>((r.kind||'working')==='working'||(includeWarmups&&(r.kind||'working')==='warmup'))&&(mode==='raw'||(mode==='total'?r.basis==='total':r.basis!=='total'))&&r.reps>=Number($('minReps').value||1)&&(!$('maxReps').value||r.reps<=Number($('maxReps').value))&&(!$('from').value||r.date>=$('from').value)&&(!$('to').value||r.date<=$('to').value)&&($('effort').value==='all'||(r[$('effort').value]!==undefined&&(!$('minEffort').value||r[$('effort').value]>=Number($('minEffort').value))&&(!$('maxEffort').value||r[$('effort').value]<=Number($('maxEffort').value)))));
    $('minEffort').disabled=$('maxEffort').disabled=$('effort').value==='all';$('sessions').textContent=new Set(rows.map(r=>r.workout)).size;$('setCount').textContent=rows.length;$('latest').textContent=rows.length?rows.map(r=>r.date).sort().at(-1):'—';
    $('chartTitle').textContent=`Best ${mode==='normalized'?'per-limb ':mode==='total'?'total ':''}load per session (${unit})`;
    $('comparison').textContent=(mode==='normalized'?'Nominal load per limb. Combined loads are divided by the recorded number of limbs; equipment remains separate.':mode==='total'?'Only entries recorded as total load are included.':'Original load conventions, converted only between lb and kg.')+(includeWarmups?' Warmups are included.':' Warmups are excluded.');
    drawChart(rows,valueOf,unit);
    const body=$('history');body.replaceChildren();
    for(const r of [...rows].sort((a,b)=>b.date.localeCompare(a.date))){const tr=document.createElement('tr');for(const value of [r.date,`${names.locations[r.location]||r.location} / ${r.equipment}`,r.kind||'working',`${r.load} ${r.unit} (${r.basis.replace('_',' ')})`,`${Number(valueOf(r).toFixed(2))} ${unit}`,r.reps,effortText(r),r.side||'unspecified',r.notes||'—']){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
  }
  equipmentOptions();function chooseMode(){$('mode').value='raw';}chooseMode();for(const el of document.querySelectorAll('select,input'))el.addEventListener('change',()=>{if(el.id==='exercise'||el.id==='location')equipmentOptions();if(el.id==='exercise')chooseMode();render();});render();
}
function start(){const data=window.GYM_DATA;if(!data)throw new Error('Workout data could not be loaded. Rebuild the dashboard and try again.');const page=document.body.dataset.page;if(page==='home')startHome(data);else if(page==='calendar')startCalendar(data);else if(page==='progress')startProgress(data);}
if(typeof module!=='undefined')module.exports={normalized,rowsOf};
if(typeof document!=='undefined')try{start();}catch(error){if($('error')){$('error').hidden=false;$('error').textContent=error.message;}else console.error(error);}
