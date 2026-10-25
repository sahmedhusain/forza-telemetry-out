'use strict';
const $ = id => document.getElementById(id);
const set = (id, value) => { $(id).textContent = value; translateStatic($(id)); };
const number = (v, places = 1) => localizedNumber(v,places);
const vector = obj => obj ? Object.values(obj).map(v => number(v)).join(' / ') : '—';
const tach = new TachometerGauge('tachCanvas');
const gMeter = new GMeterGauge('gMeterCanvas');
const timeline = new TelemetryTimelineChart('timelineCanvas');
let latest, status, schema = [], imperial = false, frozen = false, lastFrame = 0, lastTable = 0, source, frozenData;
const rows = new Map();
const analytics = new DriveAnalytics();
const channelReview = new ChannelReview();
let lastAnalysisRender = 0;
let savedHistory=null, historySelection=null, historyRequest=false, lastHistoryFetch=0;
imperial = preferences.units === 'imperial';
function notice(text) { set('notice', text); }
function buildTable() {
  const filter = $('rawSearchInput').value.toLowerCase();
  const group = $('groupFilter').value;
  $('rawTableBody').replaceChildren(); rows.clear();
  for (const f of schema.filter(f => (!group || f.group === group) && f.name.toLowerCase().includes(filter))) {
    const tr = document.createElement('tr');
    for (const text of [f.name, '—', f.unit, `${f.type} / ${f.offset}`]) {
      const td = document.createElement('td'); td.textContent = text; tr.append(td);
    }
    $('rawTableBody').append(tr); rows.set(f.name, tr.children[1]);
  }
  set('fieldCount', message('channels',{n:number(rows.size,0)})); updateTable();
}
function updateTable() {
  for (const [name, cell] of rows) cell.textContent = (frozen ? frozenData : latest)?.raw?.[name] ?? '—';
  set('reservedByte', (frozen ? frozenData : latest)?.reservedByte ?? '—');
}
fetch('/packet-schema.json').then(r => { if (!r.ok) throw Error('Schema unavailable'); return r.json(); }).then(fields => {
  schema = fields;
  for (const f of fields) { const option=document.createElement('option');option.value=f.name;option.textContent=`${f.name} · ${f.unit}`;option.dataset.value='';$('chartChannel').append(option);$('compareChannel').append(option.cloneNode(true)); }
  $('chartChannel').value='Speed';$('compareChannel').value='Accel';
  for (const group of new Set(fields.map(f => f.group))) {
    const option = document.createElement('option'); option.value = group; option.textContent = group; $('groupFilter').append(option);
  }
  for(const group of new Set(fields.map(f=>f.group))){const option=document.createElement('option');option.value=group;option.textContent=group;$('historyGroup').append(option);}
  translateStatic($('historyGroup'));translateStatic($('groupFilter'));buildTable();renderDerived();
}).catch(e => notice(message('schemaError',{error:e.message})));
function render(data, appendHistory = true) {
  const shift = data.engine?.maxRpm > 0 && data.engine.currentRpm / data.engine.maxRpm * 100 >= preferences.shift;
  tach.update({...data.engine,isRevLimit:shift}); gMeter.update(data.dynamics?.gForce);
  set('speedVal', number(imperial ? data.speed?.mph : data.speed?.kmh, 0)); set('speedUnit', imperial ? 'MPH' : 'KM/H');
  set('gearDisplay', data.inputs?.gear ?? '—');
  set('rpmNumeric', `${number(data.engine?.currentRpm, 0)} / ${number(data.engine?.maxRpm, 0)} RPM`);
  $('tachCard').classList.toggle('redline-active', shift);
  set('carClassBadge', data.car?.classCode ?? '—'); set('carPiBadge', `PI ${data.car?.pi ?? '—'}`);
  set('carDrivetrainBadge', data.car?.drivetrain ?? '—'); set('carNameText', data.car?.name??message('vehicle',{id:data.car?.ordinal??'—',group:data.car?.group??'—'}));
  for (const key of ['throttle', 'brake', 'clutch', 'handbrake']) {
    const value = data.inputs?.[`${key}Percent`];
    $(`${key}Fill`).style.height = `${Math.max(0, Math.min(100, value ?? 0))}%`; set(`${key}Val`, `${number(value, 0)}%`);
  }
  const steer = data.inputs?.steeringPercent ?? 0;
  $('steeringWheel').style.transform = `rotate(${steer * 1.8}deg)`; set('steeringDeg', `${number(steer, 0)}%`);
  for (const [id, key] of [['latGVal', 'lateral'], ['longGVal', 'longitudinal'], ['vertGVal', 'vertical']]) set(id, `${number(data.dynamics?.gForce?.[key], 2)} G`);
  for (const [corner, name] of [['FL', 'FrontLeft'], ['FR', 'FrontRight'], ['RL', 'RearLeft'], ['RR', 'RearRight']]) {
    const key = corner.toLowerCase(), wheels = data.wheels;
    set(`temp${corner}`, number(data.raw?.[`TireTemp${name}`], 0));
    $(`susp${corner}`).style.width = `${Math.max(0, Math.min(100, (wheels?.suspensionTravel?.[key] ?? 0) * 100))}%`;
    set(`slip${corner}`, number(wheels?.slipRatio?.[key], 2));
    $(`wheel${corner}`).classList.toggle('slip-warning', Math.abs(wheels?.slipRatio?.[key] ?? 0) > 1);
    $(`wheel${corner}`).classList.toggle('rumble-active', Boolean(wheels?.rumbleStrip?.[key]));
    const r=data.raw||{},combined=r[`TireCombinedSlip${name}`];
    const colorValue=preferences.heat==='slip'?Math.abs(combined??0)/1.5:preferences.heat==='compression'?(r[`NormalizedSuspensionTravel${name}`]??0):((r[`TireTemp${name}`]??preferences.tempLow)-preferences.tempLow)/(preferences.tempHigh-preferences.tempLow);
    const color=`hsl(${190-Math.max(0,Math.min(1,colorValue))*190},85%,65%)`;
    $(`tireVisual${corner}`).style.color=color;$(`wheel${corner}`).style.setProperty('--wheel-color',color);
    if(corner.startsWith('F'))$(`tireVisual${corner}`).style.transform=`rotate(${(preferences.motion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches)?0:steer*.25}deg)`;
    set(`combined${corner}`,number(combined,2));set(`angle${corner}`,number(r[`TireSlipAngle${name}`],2));
    set(`travel${corner}`,number(r[`SuspensionTravelMeters${name}`]*1000));
    const damping=analytics.current.damper?.[['FL','FR','RL','RR'].indexOf(corner)];set(`damper${corner}`,number(damping==null?null:damping*1000));
    set(`rotation${corner}`,number(r[`WheelRotationSpeed${name}`]));set(`rumble${corner}`,number(r[`SurfaceRumble${name}`],2));
    set(`contact${corner}`,`${r[`WheelInPuddle${name}`]?translateText('WATER')+' · ':''}${r[`WheelOnRumbleStrip${name}`]?translateText('CURB')+' · ':''}${translateText(Math.abs(combined)>1?'GRIP LOSS':'NO SLIP ALERT')}`);
  }
  set('powerVal', number(imperial ? data.powertrain?.powerHp : data.powertrain?.powerKw, 0)); set('powerUnit', imperial ? 'hp' : 'kW');
  set('torqueVal', number(data.powertrain?.torqueNm, 0)); set('boostVal', number(data.powertrain?.boostPsi)); set('fuelVal', number(data.powertrain?.fuelPercent, 0));
  set('currentLapTime', data.race?.formattedTimes.current ?? '—'); set('bestLapTime', data.race?.formattedTimes.best ?? '—');
  set('lastLapTime', data.race?.formattedTimes.last ?? '—'); set('raceTime', data.race?.formattedTimes.total ?? '—');
  set('lapNum', data.race?.lapNumber ?? '—'); set('racePos', data.race?.racePosition || '—');
  set('distanceVal', `${number((data.race?.distanceMeters ?? 0) / (imperial ? 1609.344 : 1000), 2)} ${imperial ? 'mi' : 'km'}`);
  set('positionVal', vector(data.position)); set('velocityVal', vector(data.dynamics?.velocity)); set('orientationVal', vector(data.dynamics?.orientation)); set('angularVal', vector(data.dynamics?.angularVelocity));
  set('collisionSpeed', number(data.collision?.velocityLoss)); set('collisionMass', number(data.collision?.mass));
  renderVehicle(data);
  if (appendHistory) timeline.pushFrame(data);
  if(performance.now()-lastAnalysisRender>100 || !appendHistory){renderDerived();lastAnalysisRender=performance.now();}
}
function updateStatus(s) {
  status = s; updateConnectionHealth(s);
  $('recordingStats').replaceChildren();
  for(const [label,value] of [['Recorded frames',number(s.recorder.frameCount,0)],['Recording duration · s',s.recorder.durationSec]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('recordingStats').append(dt,dd);}
  translateStatic($('recordingStats')); set('udpPort', s.udp.port); set('recordCount', number(s.recorder.frameCount,0));
  $('recBtn').classList.toggle('active', s.recorder.isRecording); set('recBtn', s.recorder.isRecording ? '■ STOP RECORDING' : '● RECORD');
  if (s.udp.error) notice(message('udpError',{error:s.udp.error}));
  else if (s.recorder.limitReached) notice('Recording limit reached (18,000 frames). Recording stopped without deleting frames. Export to keep this session.');
  else if (s.udp.hasActiveStream) notice(message('live',{pps:number(s.udp.currentPps,0),bad:number(s.udp.invalidPackets,0)}));
  else notice('Waiting for driving data. Pauses, menus, replays and rewinds stop the game’s stream. Last values are held.');
  updateFreshness();
}
function updateFreshness() {
  const active = Date.now() - lastFrame < 2000;
  document.body.classList.toggle('stale', !active);
  $('streamDot').className = active ? 'live' : '';
  set('streamText', active ? 'LIVE / RECEIVING' : 'WAITING / NO SIGNAL');
  set('sourceLabel', active ? 'LIVE UDP' : 'VALUES HELD');
}
async function command(path) {
  const response = await fetch(path, { method: 'POST' });
  if (!response.ok) throw Error(await response.text());
  return response.json();
}
function action(id, callback) {
  $(id).addEventListener('click', async () => {
    $(id).disabled = true;
    try { await callback(); } catch (e) { notice(message('actionError',{error:e.message})); }
    finally { $(id).disabled = false; }
  });
}
action('recBtn', () => command(`/api/recorder/${status?.recorder.isRecording ? 'stop' : 'start'}`));
action('clearBtn', async () => { if (confirm(translateText('Clear the in-memory recording? Export CSV or JSON first to keep it.'))) await command('/api/recorder/clear'); });
action('fsBtn', () => window.electronAPI ? window.electronAPI.toggleFullscreen() : document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
action('freezeBtn', () => { frozen = !frozen; frozenData = frozen ? latest : null; set('freezeBtn', frozen ? 'RESUME VALUES' : 'FREEZE VALUES'); $('freezeBtn').setAttribute('aria-pressed', String(frozen)); if (!frozen) updateTable(); });
$('rawSearchInput').addEventListener('input', buildTable); $('groupFilter').addEventListener('change', buildTable);
let pending;
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.type === 'status') updateStatus(message.data);
    if (message.type === 'telemetry') {
      analytics.push(message.data);
      lastFrame = Date.now(); pending = message.data;
    }
  };
  ws.onclose = () => { lastFrame = 0; updateFreshness(); notice('Server disconnected. Reconnecting in two seconds…'); setTimeout(connect, 2000); };
  ws.onerror = () => ws.close();
}
function frame(now) {
  if (pending) {
    latest = pending; pending = null;
    const newSource = `live-${latest.car.ordinal}-${latest.car.pi}`;
    if (source !== newSource) { timeline.clear(); gMeter.trail = []; source = newSource; }
    render(latest);
    if (!frozen && now - lastTable > 250) { updateTable(); lastTable = now; }
  }
  animateTelemetry(now,latest,Date.now()-lastFrame<2000);
  requestAnimationFrame(frame);
}
window.addEventListener('preferenceschange',()=>{syncPreferences();if(status)updateStatus(status);refreshNetwork();renderSavedHistory();});
window.addEventListener('tabchange',()=>{if(latest)render(latest,false);renderDerived();refreshSavedHistory();});
window.addEventListener('screenchange',()=>{if(latest)render(latest,false);refreshSavedHistory();});
window.addEventListener('resize',()=>{if(latest)render(latest,false);else renderDerived();});
$('chartChannel').addEventListener('change',renderDerived);
$('compareChannel').addEventListener('change',renderDerived);
action('holdChannel',()=>{if(channelReview.held)channelReview.resume();else channelReview.hold(analytics.samples,preferences.history);renderDerived();});
$('reviewCursor').oninput=()=>{channelReview.hold(analytics.samples,preferences.history);channelReview.select(channelReview.held||[],Number($('reviewCursor').value));renderDerived();};
$('channelCanvas').onclick=e=>{if(!channelReview.hold(analytics.samples,preferences.history))return;const rows=channelReview.held,rect=e.currentTarget.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left-64)/(rect.width-128))),target=rows[0].t+fraction*(rows.at(-1).t-rows[0].t);let index=0;for(let i=1;i<rows.length;i++)if(Math.abs(rows[i].t-target)<Math.abs(rows[index].t-target))index=i;channelReview.select(rows,index);renderDerived();};
action('resetAnalysis',()=>{analytics.reset();channelReview.resume(); if(latest)analytics.push(latest);renderDerived();});
syncPreferences(); refreshNetwork(); refreshSavedHistory(true);
setInterval(()=>{if(savedHistoryVisible())refreshSavedHistory();},5000);
setInterval(updateFreshness, 1000); connect(); requestAnimationFrame(frame);

function syncPreferences(){
 set('fieldCount',message('channels',{n:number(rows.size,0)}));
 imperial=preferences.units==='imperial';
 timeline.windowSeconds=preferences.history;timeline.maxPoints=preferences.history*10;
 gMeter.maxG=preferences.gScale;
 document.querySelector('.trace h2').textContent=message('trace',{n:number(preferences.history,0)});
 document.querySelector('.trace-axis span').textContent=`−${number(preferences.history,0)}s`;
 set('freezeBtn',frozen?'RESUME VALUES':'FREEZE VALUES');
 if(latest)render(latest,false);else renderDerived();
 renderSavedHistory();
}
function renderDerived(){
 const c=analytics.current;
 const lap=analytics.lapStatistics();set('lapMean',number(lap.mean,3));set('lapSigma',number(lap.stddev,3));set('peakBraking',analytics.previous?number(analytics.peakBrakingG,2):'—');
 $('suspensionRows').innerHTML=analytics.suspensionSummary().map((v,i)=>`<tr><td>${['FL','FR','RL','RR'][i]}</td><td>${number(v.rms)}</td><td>${number(v.extension)}</td><td>${number(v.compression)}</td></tr>`).join('');
 set('driftValue',`${number(c.drift)}°`);set('balanceValue',number(c.frontRearSlip,3));set('spreadValue',number(c.tempSpread));set('compressionValue',`${number(c.compressionBalance)} pp`);
 set('peakSpeed',analytics.previous?`${number(analytics.peakSpeed*(imperial ? .621371 : 1))} ${imperial?'mph':'km/h'}`:'—');set('peakPower',analytics.previous?number(analytics.peakPower):'—');set('peakG',analytics.previous?number(analytics.peakG,2):'—');set('driveDuration',analytics.previous?number(analytics.elapsed):'—');
 if(!document.getElementById('view-session').hidden||overview.active){
  $('usageBars').replaceChildren();
  for(const [label,key] of [['Throttle >5%','throttleTime'],['Brake >5%','brakeTime'],['Pedal overlap','overlapTime'],['Coasting','coastTime'],['Any wheel slip >1','slipTime']]){
   const value=analytics.percent(analytics[key]);const div=document.createElement('div');div.className='usage';
   div.innerHTML=`<span>${label}</span><strong>${value==null?'—':number(value)+'%'}</strong><div class="usage-track"><i style="width:${value??0}%"></i></div>`;$('usageBars').append(div);
  }
  if(analytics.laps.length){const best=Math.min(...analytics.laps.map(l=>l.time));$('lapRows').innerHTML=analytics.laps.map(l=>`<tr><td>${l.lap}</td><td>${number(l.time,3)}</td><td>+${number(l.time-best,3)}</td></tr>`).join('');}
  else $('lapRows').innerHTML='<tr><td colspan="3">Complete a lap while connected to populate this view.</td></tr>';
  translateStatic($('usageBars'));translateStatic($('lapRows'));
 }
 if(!document.getElementById('view-analysis').hidden||overview.active){renderAnalysis(analytics,preferences.history);renderChannelReview();}
}
async function refreshNetwork(){
 try{
  const res=await fetch('/api/network');if(!res.ok)throw Error('Network information unavailable');const network=await res.json();
  $('receiverPort').value=network.udpPort;$('networkCards').replaceChildren();
  const addresses=[{name:'SAME GAMING PC',address:'127.0.0.1'},...network.interfaces.map(i=>({name:`LAN · ${i.name}`,address:i.address}))];
  const addressSelect=$('receiverAddress'),previousAddress=addressSelect.value;addressSelect.replaceChildren();
  for(const item of addresses){const option=document.createElement('option');option.value=item.address;option.textContent=translateText(item.name)+' · '+item.address;addressSelect.append(option);const card=document.createElement('article');card.className='network-card';card.dataset.address=item.address;
   const title=document.createElement('h3');title.textContent=item.name;const address=document.createElement('strong');address.textContent=item.address;
   const detail=document.createElement('p');detail.textContent=message('udp',{port:network.udpPort,host:network.udpHost});
   const button=document.createElement('button');button.textContent='COPY IP';button.onclick=async()=>{try{await navigator.clipboard.writeText(item.address);button.textContent=translateText('COPIED');}catch{button.textContent=translateText('SELECT IP ABOVE TO COPY');}};
   card.append(title,address,detail,button);$('networkCards').append(card);
  }
  const web=document.createElement('article');web.className='network-card';const title=document.createElement('h3');title.textContent='BROWSER / SECOND SCREEN';const details=document.createElement('p');details.textContent=network.lanEnabled?message('lan',{port:network.webPort}):message('local',{url:network.localUrl});web.append(title,details);$('phoneAccess').replaceChildren(web);translateStatic($('phoneAccess'));translateStatic($('networkCards'));
  addressSelect.value=addresses.some(a=>a.address===previousAddress)?previousAddress:addresses[0].address;
  addressSelect.onchange=()=>{for(const card of $('networkCards').children)card.hidden=card.dataset.address!==addressSelect.value;};addressSelect.onchange();
 }catch(e){set('connectionResult',e.message);}
}
function updateConnectionHealth(s){
 $('connectionHealth').replaceChildren();
 for(const [label,value] of [['UDP listener',s.udp.error|| (s.udp.isListening?'Listening':'Not listening')],['Bind address',`${s.udp.host}:${s.udp.port}`],['Valid packets',s.udp.packetsReceived],['Rejected packets',s.udp.invalidPackets],['Packets / second',s.udp.currentPps],['Last sender',latest?.senderIp??'None'],['Web / TCP port',s.webPort],['Connected viewers',s.clientsCount]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('connectionHealth').append(dt,dd);}
 translateStatic($('connectionHealth'));
}
action('refreshNetwork',refreshNetwork);
$('connectionForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
 try{const res=await fetch('/api/connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:Number($('receiverPort').value)})});if(!res.ok)throw Error(await res.text());const data=await res.json();set('connectionResult',message('port',{port:data.port}));await refreshNetwork();}
 catch(e){set('connectionResult',message('notChanged',{error:e.message}));}finally{button.disabled=false;}
});

function renderVehicle(data){
 set('vehicleName',data.car?.name??message('vehicle',{id:data.car?.ordinal??'—',group:data.car?.group??'—'}));
 const r=data.raw||{};$('vehicleMetadata').replaceChildren();
 for(const [label,value] of [['Vehicle ID',r.CarOrdinal],['Name source',data.car?.name?'Community lookup':'Unknown vehicle ID'],['Model year (lookup)',data.car?.name?.match(/^\d{4}/)?.[0]??'—'],['Class number',r.CarClass],['Performance index',r.CarPerformanceIndex],['Drivetrain',data.car?.drivetrain],['Cylinders',r.NumCylinders],['Car group ID',r.CarGroup]]){
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value??'—';$('vehicleMetadata').append(dt,dd);
 }
 translateStatic($('vehicleMetadata'));
}
function savedHistoryVisible(){return ['records','coverage','fieldrecords'].some(dashboardHas)||!document.getElementById('view-session').hidden&&['saved','fields','coverage'].some(id=>!document.getElementById('screen-session-'+id).hidden);}
async function refreshSavedHistory(force=false){
 if(historyRequest||(!force&&(!savedHistoryVisible()||Date.now()-lastHistoryFetch<1000)))return;
 historyRequest=true;lastHistoryFetch=Date.now();
 try{
  const query=historySelection===null?'':'?car='+encodeURIComponent(historySelection);
  let response=await fetch('/api/history'+query);if(!response.ok)throw Error('History unavailable');let result=await response.json();
  if(!result.profile&&result.vehicles.length){historySelection=result.vehicles[0].ordinal;response=await fetch('/api/history?car='+historySelection);if(!response.ok)throw Error('History unavailable');result=await response.json();}
  savedHistory=result;historySelection=result.profile?.ordinal??null;renderSavedHistory();
 }catch(error){set('historyStatus',message('actionError',{error:error.message}));}
 finally{historyRequest=false;}
}
function renderSavedHistory(){
 if(!savedHistory)return;
 const p=savedHistory.profile,selection=$('historyCar');selection.replaceChildren();
 for(const v of savedHistory.vehicles){const option=document.createElement('option');option.value=v.ordinal;option.textContent=v.name||'#'+v.ordinal;selection.append(option);}
 selection.disabled=!savedHistory.vehicles.length;if(p)selection.value=p.ordinal;
 set('historyStatus',savedHistory.error|| (p?'Automatically saved by the receiver every five seconds.':'No historical packets yet.'));
 $('historyPeaks').replaceChildren();$('historyDetails').replaceChildren();$('historyFields').replaceChildren();
 set('historyContext',p?(p.metadata.name||'#'+p.ordinal):'No historical packets yet.');
 if(!p)return;
 const b=p.bounds,stats=[['PEAK SPEED',b.Speed?number(b.Speed.max*(imperial?2.236936:3.6))+' '+(imperial?'mph':'km/h'):'—'],['PEAK POWER · kW',b.Power?number(b.Power.max/1000):'—'],['Peak torque · N·m',b.Torque?number(b.Torque.max):'—'],['Peak RPM',b.CurrentEngineRpm?number(b.CurrentEngineRpm.max,0):'—'],['PEAK PLANAR G',number(p.peakG,2)],['PEAK BRAKING · G',number(p.peakBrakingG,2)],['Lowest reported lap · s',number(p.bestLap,3)],['Lowest observed lap · s',number(p.observedBestLap,3)]];
 for(const [label,value] of stats){const div=document.createElement('div'),small=document.createElement('small'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;strong.className='history-number';div.append(small,strong);$('historyPeaks').append(div);}
 for(const [label,value] of [['Vehicle ID',p.ordinal],['Packets processed',number(p.packets,0)],['Active driving packets',number(p.activePackets,0)],['Observed driving · s',number(p.activeSeconds)],['Observed distance · km',number(p.distanceMeters/1000,2)],['Wet contact time · s',number(p.wetSeconds)],['Curb contact time · s',number(p.curbSeconds)],['Grip-loss time · s',number(p.slipSeconds)],['Last received',new Date(p.lastSeen).toLocaleString(preferences.language)]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('historyDetails').append(dt,dd);}
 const group=$('historyGroup').value;
 for(const f of schema.filter(f=>(!group||f.group===group)&&b[f.name])){const row=document.createElement('tr');for(const [i,value] of [f.name,b[f.name].min,b[f.name].max,b[f.name].last,f.unit].entries()){const cell=document.createElement('td');cell.textContent=value;if(i>0&&i<4)cell.dataset.label=translateText(['','Minimum','Maximum','Latest'][i]);row.append(cell);}$('historyFields').append(row);}
 translateStatic($('historyPeaks'));translateStatic($('historyDetails'));
}
$('historyCar').onchange=()=>{historySelection=Number($('historyCar').value);refreshSavedHistory(true);};
$('historyGroup').onchange=renderSavedHistory;
action('refreshHistory',()=>refreshSavedHistory(true));

function renderChannelReview(){
 const samples=channelReview.samples(analytics.samples,preferences.history),selected=channelReview.selected(samples),fields=[$('chartChannel').value,$('compareChannel').value].filter(Boolean).map(name=>schema.find(f=>f.name===name)).filter(Boolean);
 set('holdChannel',channelReview.held?'Resume live':'Hold window');$('holdChannel').disabled=!samples.length;$('holdChannel').setAttribute('aria-pressed',String(Boolean(channelReview.held)));
 $('reviewCursor').max=Math.max(0,samples.length-1);$('reviewCursor').value=channelReview.cursor??Math.max(0,samples.length-1);$('reviewCursor').disabled=samples.length<2;
 const time=selected?new Date(selected.t).toLocaleTimeString(preferences.language,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,fractionalSecondDigits:3}):'—';
 $('reviewStatus').textContent=selected?`${translateText(channelReview.held?'Held window':'Live window')} · ${translateText('Vehicle ID')} ${selected.raw.CarOrdinal??'—'} · PI ${selected.raw.CarPerformanceIndex??'—'} · ${samples.length} ${translateText('samples')}`:translateText('Waiting for samples.');
 $('reviewTime').textContent=selected?`${time} · ${number((selected.t-samples.at(-1).t)/1000,2)} s`:'—';
 $('comparisonReadouts').replaceChildren();
 for(const [i,field] of fields.entries()){const box=document.createElement('div'),label=document.createElement('code'),value=document.createElement('strong'),range=document.createElement('small');box.className='comparison-value';box.dataset.series=i;label.textContent=`${field.name} · ${field.unit}`;const rawValue=selected?.raw[field.name];value.textContent=number(rawValue,Number.isInteger(rawValue)?0:3);value.dataset.value='';const exact=document.createElement('small');exact.textContent=`${translateText('Exact raw')} ${rawValue??'—'}`;const stats=channelStatistics(samples,field.name);range.textContent=`${translateText('Minimum')} ${number(stats.min,3)} · ${translateText('Maximum')} ${number(stats.max,3)}`;range.title=`${stats.min??'—'} / ${stats.max??'—'}`;box.append(label,value,exact,range);$('comparisonReadouts').append(box);}
 set('channelRange',selected?.break?'Sampled raw values · independent axes · boundary before selected sample.':'Sampled raw values · independent axes · gaps are not interpolated.');
 renderChannelComparison(samples,fields,selected);
}
