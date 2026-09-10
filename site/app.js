'use strict';
const $ = id => document.getElementById(id);
const strength = typeof module !== 'undefined' ? require('./strength.js') : window.GymStrength;
const palette = ['#087e92','#b95617','#6e53a7','#227a4a','#b33c68','#596a12'];

function rowsOf(data) {
  return data.workouts.flatMap(w => w.exercises.flatMap(b => b.sets.map(s => ({
    ...s,
    side:s.side || 'n/a',
    date:w.date,
    workout:w.id,
    location:w.location,
    exercise:b.exercise,
    equipment:b.equipment,
    notes:[w.notes,b.notes,s.notes].filter(Boolean).join(' · ')
  }))));
}
function maps(data){return {
  locations:Object.fromEntries(data.locations.map(x=>[x.id,x.name])),
  exercises:Object.fromEntries(data.exercises.map(x=>[x.id,x.name]))
};}
function effortText(s){if((s.kind||'working')==='warmup')return'n/a';return s.rir!==undefined?`${s.rir} RIR`:s.rpe!==undefined?`${s.rpe} RPE`:'—';}
function sideLabel(side){return !side||side==='n/a'?'':side;}
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
    const kind=s.kind||'working';if(kind==='warmup')chip.classList.add('warmup');
    chip.textContent=`${s.load} ${s.unit} × ${s.reps}${sideLabel(s.side)?' · '+sideLabel(s.side):''}${effortText(s)==='—'?'':' · '+effortText(s)}${kind==='warmup'?' · Warm-up':kind==='drop'?' · Drop':''}`;
    sets.append(chip);
  }
  wrap.append(sets);return wrap;
}
function workoutCard(w,names,compact=false){
  const card=document.createElement('article');card.className='workout-card';
  const head=document.createElement('div');head.className='workout-card-head';
  const date=document.createElement('strong');date.textContent=prettyDate(w.date);
  if(compact){const link=document.createElement('a');link.href=`calendar.html?date=${encodeURIComponent(w.date)}`;link.textContent=date.textContent;date.replaceChildren(link);}
  const loc=document.createElement('span');loc.className='muted';loc.textContent=names.locations[w.location]||w.location;
  head.append(date,loc);card.append(head);
  if(!compact)for(const b of w.exercises)card.append(exerciseSummary(b,names));
  else{const p=document.createElement('p');p.className='muted';p.textContent=`${w.exercises.length} exercise${w.exercises.length===1?'':'s'} · ${w.exercises.reduce((n,b)=>n+b.sets.length,0)} sets`;card.append(p);}
  return card;
}
function weeklyActivity(workouts,today=new Date()){
  const end=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const start=new Date(end);start.setDate(start.getDate()-start.getDay()-49);
  return Array.from({length:8},(_,i)=>{
    const from=new Date(start);from.setDate(from.getDate()+7*i);
    const to=new Date(from);to.setDate(to.getDate()+7);
    const selected=workouts.filter(w=>{const d=new Date(w.date+'T00:00:00');return d>=from&&d<to&&d<=end;});
    return {label:from.toLocaleDateString(undefined,{month:'short',day:'numeric'}),days:new Set(selected.map(w=>w.date)).size,sets:selected.reduce((n,w)=>n+w.exercises.reduce((m,b)=>m+b.sets.filter(s=>(s.kind||'working')==='working').length,0),0)};
  });
}
function startHome(data){
  const all=rowsOf(data),names=maps(data),workouts=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date));
  $('empty').hidden=all.length>0;$('home').hidden=!all.length;if(!all.length)return;
  const latest=workouts.at(-1);$('updated').textContent=`Last workout · ${prettyDate(latest.date)}`;
  $('totalWorkouts').textContent=workouts.length;$('totalSets').textContent=all.length;$('workingSets').textContent=all.filter(r=>(r.kind||'working')==='working').length;
  const now=new Date(),ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $('daysThisMonth').textContent=new Set(workouts.filter(w=>w.date.startsWith(ym)).map(w=>w.date)).size;
  const weeks=weeklyActivity(workouts),max=Math.max(1,...weeks.map(w=>w.sets));
  for(const week of weeks){const column=document.createElement('div');column.className='rhythm-column';const bar=document.createElement('div');bar.className='rhythm-bar';bar.style.height=`${Math.max(3,week.sets/max*100)}px`;const number=document.createElement('strong');number.textContent=week.sets;const label=document.createElement('span');label.textContent=week.label;column.title=`Week of ${week.label}: ${week.days} training days, ${week.sets} working sets`;column.append(number,bar,label);$('rhythm').append(column);}
  $('rhythmSummary').textContent=`${weeks.reduce((n,w)=>n+w.days,0)} training days across these weeks · Current week is in progress.`;
  $('latestWorkout').append(workoutCard(latest,names));for(const w of workouts.slice(-6).reverse())$('recentDays').append(workoutCard(w,names,true));
}
function startCalendar(data){
  const names=maps(data),workouts=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date));
  $('calendarEmpty').hidden=workouts.length>0;$('calendarPage').hidden=!workouts.length;if(!workouts.length)return;
  const byDate=new Map();for(const w of workouts){if(!byDate.has(w.date))byDate.set(w.date,[]);byDate.get(w.date).push(w);}
  const requested=new URLSearchParams(window.location.search).get('date'),initial=byDate.has(requested)?requested:workouts.at(-1).date;
  const latest=new Date(initial+'T12:00:00');let year=latest.getFullYear(),month=latest.getMonth();
  function showDay(date){
    const list=byDate.get(date)||[];$('dayTitle').textContent=list.length?prettyDate(date):'No workout';$('dayDetails').replaceChildren();
    if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='No workout was logged on this day.';$('dayDetails').append(p);return;}
    for(const w of list)$('dayDetails').append(workoutCard(w,names));
    for(const el of document.querySelectorAll('.calendar-day.selected')){el.classList.remove('selected');el.setAttribute('aria-pressed','false');}
    const cell=document.querySelector(`[data-date="${date}"]`);if(cell){cell.classList.add('selected');cell.setAttribute('aria-pressed','true');}
  }
  function renderMonth(){
    const prefix=`${year}-${String(month+1).padStart(2,'0')}`,monthWorkouts=workouts.filter(w=>w.date.startsWith(prefix));
    $('monthSummary').textContent=`${new Set(monthWorkouts.map(w=>w.date)).size} training days · ${monthWorkouts.length} workouts`;
    $('monthLabel').textContent=new Date(year,month,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
    const cal=$('calendar');cal.replaceChildren();for(const d of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){const x=document.createElement('div');x.className='weekday';x.textContent=d;cal.append(x);}
    const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
    for(let i=0;i<first;i++){const blank=document.createElement('div');blank.className='calendar-day blank';cal.append(blank);}
    for(let day=1;day<=days;day++){
      const date=`${prefix}-${String(day).padStart(2,'0')}`,list=byDate.get(date)||[],button=document.createElement('button');button.type='button';button.className='calendar-day';button.dataset.date=date;
      const n=document.createElement('span');n.className='day-number';n.textContent=day;button.append(n);
      if(list.length){button.classList.add('trained');const dot=document.createElement('span');dot.className='workout-dot';dot.textContent=`${list.reduce((n,w)=>n+w.exercises.reduce((m,b)=>m+b.sets.length,0),0)} sets`;button.append(dot);button.addEventListener('click',()=>showDay(date));}else button.disabled=true;
      cal.append(button);
    }
  }
  $('prevMonth').addEventListener('click',()=>{month--;if(month<0){month=11;year--;}renderMonth();});
  $('nextMonth').addEventListener('click',()=>{month++;if(month>11){month=0;year++;}renderMonth();});
  $('todayMonth').addEventListener('click',()=>{const now=new Date();year=now.getFullYear();month=now.getMonth();renderMonth();});
  renderMonth();showDay(initial);
}
function options(id,entries){
  const select=$(id),previous=select.value;select.replaceChildren();
  for(const [value,label] of entries){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  if([...select.options].some(o=>o.value===previous))select.value=previous;
}
function svgElement(name,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
function niceAxis(maximum){
  const limit=maximum>0?maximum*1.05:1,rough=limit/5,magnitude=10**Math.floor(Math.log10(rough));
  const step=[1,2,2.5,5,10].find(n=>n*magnitude>=rough)*magnitude,count=Math.ceil(limit/step);
  const ticks=Array.from({length:count+1},(_,i)=>Number((i*step).toPrecision(12)));return{top:ticks.at(-1),ticks};
}
function exactLabel(row,names){return `${names.locations[row.location]||row.location} / ${row.equipment}`;}
function drawChart(rows,valueOf,unit){
  $('chart').replaceChildren();$('legend').replaceChildren();if(!rows.length){$('chart').textContent='No sets match these filters.';return;}
  const groups=new Map();for(const r of rows){const side=strength.sideOf(r);if(!groups.has(side))groups.set(side,new Map());const prev=groups.get(side).get(r.workout);if(!prev||valueOf(r)>valueOf(prev))groups.get(side).set(r.workout,r);}
  const all=[...groups.values()].flatMap(g=>[...g.values()]),times=all.map(r=>Date.parse(r.date+'T00:00:00Z')),min=Math.min(...times),max=Math.max(...times),axis=niceAxis(Math.max(0,...all.map(valueOf))),top=axis.top;
  const x=r=>min===max?475:70+(Date.parse(r.date+'T00:00:00Z')-min)/(max-min)*810,y=r=>285-valueOf(r)/top*240,svg=svgElement('svg',{viewBox:'0 0 940 340',role:'img','aria-label':`Best load per session in ${unit}.`});
  for(const tick of axis.ticks){const yy=285-tick/top*240;svg.append(svgElement('line',{x1:70,x2:880,y1:yy,y2:yy,stroke:'#dfe5e8'}));svg.append(svgElement('text',{x:58,y:yy+5,'text-anchor':'end',fill:'#65747d','font-size':14},String(tick)));}
  let index=0;for(const [side,group]of groups){const label=sideLabel(side)||'All sets',color=palette[index++%palette.length],points=[...group.values()].sort((a,b)=>a.date.localeCompare(b.date));svg.append(svgElement('polyline',{points:points.map(r=>`${x(r)},${y(r)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));for(const r of points)svg.append(svgElement('circle',{cx:x(r),cy:y(r),r:5,fill:color}));const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=color;item.append(swatch,document.createTextNode(label));$('legend').append(item);}
  $('chart').append(svg);
}
function startProgress(data){
  const all=rowsOf(data),names=maps(data);$('progressEmpty').hidden=all.length>0;$('dashboard').hidden=!all.length;if(!all.length)return;
  options('exercise',data.exercises.filter(e=>all.some(r=>r.exercise===e.id)).map(e=>[e.id,e.name]));
  const requested=new URLSearchParams(window.location.search).get('exercise');if([...$('exercise').options].some(o=>o.value===requested))$('exercise').value=requested;
  function locationOptions(){const subset=all.filter(r=>r.exercise===$('exercise').value),ids=[...new Set(subset.map(r=>r.location))];options('location',ids.map(id=>[id,names.locations[id]||id]));}
  function equipmentOptions(){const subset=all.filter(r=>r.exercise===$('exercise').value&&r.location===$('location').value),ids=[...new Set(subset.map(r=>r.equipment))];options('equipment',ids.map(id=>[id,id]));}
  function render(){
    const unit=$('unit').value,valueOf=r=>strength.comparisonLoad(r,unit);
    const matching=all.filter(r=>r.exercise===$('exercise').value&&r.location===$('location').value&&r.equipment===$('equipment').value);
    const includeWarmups=$('includeWarmups').checked;
    const rows=matching.filter(r=>((r.kind||'working')==='working'||(includeWarmups&&(r.kind||'working')==='warmup'))&&r.reps>=Number($('minReps').value||1)&&(!$('maxReps').value||r.reps<=Number($('maxReps').value))&&(!$('from').value||r.date>=$('from').value)&&(!$('to').value||r.date<=$('to').value)&&($('effort').value==='all'||(r[$('effort').value]!==undefined&&(!$('minEffort').value||r[$('effort').value]>=Number($('minEffort').value))&&(!$('maxEffort').value||r[$('effort').value]<=Number($('maxEffort').value)))));
    $('minEffort').disabled=$('maxEffort').disabled=$('effort').value==='all';$('sessions').textContent=new Set(rows.map(r=>r.workout)).size;$('setCount').textContent=rows.length;$('latest').textContent=rows.length?rows.map(r=>r.date).sort().at(-1):'—';
    $('chartTitle').textContent=`Best load per session (${unit})`;drawChart(rows,valueOf,unit);
    renderStrengthCharts(strength.strengthSeries(matching,unit),names,unit,$('from').value,$('to').value);
    const body=$('history');body.replaceChildren();for(const r of [...rows].sort((a,b)=>b.date.localeCompare(a.date))){const tr=document.createElement('tr');for(const value of [r.date,exactLabel(r,names),r.kind||'working',`${Number(valueOf(r).toFixed(2))} ${unit}`,r.reps,effortText(r),sideLabel(r.side),r.notes||'—']){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
  }
  $('resetFilters').addEventListener('click',()=>{for(const id of ['from','to','maxReps','minEffort','maxEffort'])$(id).value='';$('minReps').value='1';$('effort').value='all';$('includeWarmups').checked=true;$('unit').value='lb';render();});
  locationOptions();equipmentOptions();
  $('exercise').addEventListener('change',()=>{locationOptions();equipmentOptions();render();});
  $('location').addEventListener('change',()=>{equipmentOptions();render();});
  for(const el of document.querySelectorAll('select,input'))if(!['exercise','location'].includes(el.id))el.addEventListener('change',render);
  render();
}
function maxText(value,unit){return value===null?'Not recorded':`${Number(value.toFixed(1))} ${unit}`;}
function sourceText(record,includeEffort=false){if(!record)return'';const row=record.row;return`${row.load} ${row.unit} × ${row.reps}${includeEffort?` · ${row.rir} RIR`:''}`;}
function appendRecordCell(tr,record,unit,estimated=false){
  const td=document.createElement('td'),value=document.createElement('strong');value.textContent=maxText(record?record.value:null,unit);td.append(value);
  if(record){const source=document.createElement('a');source.className='record-source';source.href=`calendar.html?date=${encodeURIComponent(record.row.date)}`;source.textContent=`${record.row.date} · ${sourceText(record,estimated)}`;td.append(source);}
  tr.append(td);
}
function startRecords(data){
  const rows=rowsOf(data),names=maps(data);
  function render(){
    const groups=strength.recordSeries(rows,$('recordUnit').value);$('recordsEmpty').hidden=groups.length>0;$('recordsTable').hidden=!groups.length;
    const body=$('recordsBody');body.replaceChildren();
    for(const group of groups){const tr=document.createElement('tr'),exercise=document.createElement('td'),link=document.createElement('a');link.href=`progress.html?exercise=${encodeURIComponent(group.row.exercise)}#one-rm`;link.textContent=names.exercises[group.row.exercise]||group.row.exercise;exercise.append(link);tr.append(exercise);
      for(const text of [exactLabel(group.row,names),sideLabel(group.row.side)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}
      appendRecordCell(tr,group.bestEstimate,$('recordUnit').value,true);appendRecordCell(tr,group.actualPR,$('recordUnit').value);body.append(tr);}
  }
  $('recordUnit').addEventListener('change',render);render();
}
function drawStrengthGraph(days,unit){
  const values=days.flatMap(day=>[day.estimate?.value,day.actualPR?.value]).filter(v=>v!==undefined);if(!values.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No estimates or one-rep sets recorded for these dates.';return empty;}
  const svg=svgElement('svg',{viewBox:'0 0 940 340'}),dates=days.map(d=>Date.parse(d.date+'T00:00:00Z')),min=Math.min(...dates),max=Math.max(...dates),axis=niceAxis(Math.max(...values));
  const x=day=>min===max?475:70+(Date.parse(day.date+'T00:00:00Z')-min)/(max-min)*810,y=value=>285-value/axis.top*240;
  let estimatePath='',was=false,actualPath='',previous=null;for(const day of days){if(day.estimate){estimatePath+=`${was?'L':'M'}${x(day)},${y(day.estimate.value)} `;was=true;}else was=false;if(day.actualPR){actualPath+=previous===null?`M${x(day)},${y(day.actualPR.value)} `:`H${x(day)} V${y(day.actualPR.value)} `;previous=day.actualPR;}}
  svg.append(svgElement('path',{d:estimatePath,fill:'none',stroke:'#087e92','stroke-width':2.5}));svg.append(svgElement('path',{d:actualPath,fill:'none',stroke:'#555','stroke-width':2,'stroke-dasharray':'7 5'}));return svg;
}
function renderStrengthCharts(groups,names,unit,from='',to=''){
  const root=$('strengthCharts');root.replaceChildren();let count=0;
  for(const group of groups){const days=group.days.filter(day=>(!from||day.date>=from)&&(!to||day.date<=to));if(!days.length)continue;count++;
    const card=document.createElement('article');card.className='strength-card';const title=document.createElement('h3');title.textContent=[exactLabel(group.row,names),sideLabel(group.row.side)].filter(Boolean).join(' · ');card.append(title);
    const chart=document.createElement('div');chart.className='strength-chart';chart.append(drawStrengthGraph(days,unit));card.append(chart);root.append(card);}
  if(!count)root.textContent='No workouts match these dates.';
}
function start(){const data=window.GYM_DATA;if(!data)throw new Error('Workout data could not be loaded.');const page=document.body.dataset.page;if(page==='home')startHome(data);else if(page==='calendar')startCalendar(data);else if(page==='progress')startProgress(data);else if(page==='records')startRecords(data);}
if(typeof module!=='undefined')module.exports={rowsOf,weeklyActivity,niceAxis};
if(typeof document!=='undefined')try{start();}catch(error){if($('error')){$('error').hidden=false;$('error').textContent=error.message;}else console.error(error);}
