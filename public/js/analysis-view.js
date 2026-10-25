function chartColors(){
 const css=getComputedStyle(document.body);
 return Object.fromEntries(['text','grid','cyan','lime','amber','pink'].map(k=>[k,css.getPropertyValue('--chart-'+k).trim()]));
}
function drawAnalysisCanvas(id, draw, options={}) {
  const canvas=document.getElementById(id); if(!canvas.getClientRects().length)return;
  const {width:w,height:h}=canvas.getBoundingClientRect();if(w<1||h<1)return;
  const dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const colors=chartColors();ctx.font='12px monospace';ctx.fillStyle=colors.text;ctx.strokeStyle=colors.grid;ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=25+i*(h-55)/3;ctx.beginPath();ctx.moveTo(options.left??48,y);ctx.lineTo(w-(options.right??18),y);ctx.stroke();}
  draw(ctx,w,h);
}
function seriesPlot(id,series,options={}) {
 drawAnalysisCanvas(id,(ctx,w,h)=>{
  const points=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(points.length<2){ctx.fillText(translateText(options.empty||'Collecting samples…'),48,h/2);return;}
  let minX=options.minX??Math.min(...points.map(p=>p.x)),maxX=options.maxX??Math.max(...points.map(p=>p.x));if(maxX===minX)maxX++;
  const bounds=options.separate?series.map(s=>[0,Math.max(1,...s.points.map(p=>p.y).filter(Number.isFinite))]):[[Math.min(0,...points.map(p=>p.y)),Math.max(1,...points.map(p=>p.y))]];
  ctx.fillText(localizedNumber(bounds[0][1]),4,26);ctx.fillText(localizedNumber(bounds[0][0]),4,h-29);
  ctx.fillText(translateText(options.xLabel||'time →'),Math.max(48,w-130),h-8);
  series.forEach((s,index)=>{
   const [minY,maxY]=bounds[options.separate?index:0];ctx.strokeStyle=s.color;ctx.lineWidth=1.8;ctx.beginPath();let started=false;
   for(const p of s.points){if(!Number.isFinite(p.y)||p.x<minX||p.x>maxX){started=false;continue;}const x=48+(p.x-minX)/(maxX-minX)*(w-66),y=h-30-(p.y-minY)/(maxY-minY)*(h-55);if(!started||p.break){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}
   ctx.stroke();if(options.separate){ctx.fillStyle=s.color;ctx.fillText(`${s.label} ${translateText('max')} ${localizedNumber(maxY,0)}`,55+index*140,14);}
  });
 });
}
function renderAnalysis(model,windowSeconds) {
 renderSlipPlane(model,windowSeconds);
 const colors=chartColors();
 const now=model.samples.at(-1)?.t??0, samples=model.samples.filter(s=>s.t>=now-windowSeconds*1000);
 const opts={minX:now-windowSeconds*1000,maxX:now,xLabel:`−${windowSeconds}s → ${translateText('NOW')}`};
 const dyno=[...model.dyno.values()].sort((a,b)=>a.rpm-b.rpm);
 seriesPlot('dynoCanvas',[{label:'kW',color:colors.cyan,points:dyno.map(p=>({x:p.rpm,y:p.power}))},{label:'N·m',color:colors.amber,points:dyno.map(p=>({x:p.rpm,y:p.torque}))}],{separate:true,xLabel:'engine RPM →',empty:'Use >95% throttle to collect power samples.'});
 seriesPlot('damperCanvas',[colors.cyan,colors.lime,colors.amber,colors.pink].map((color,i)=>({color,points:samples.map(s=>({x:s.t,y:s.damper[i]===null?null:s.damper[i]*1000,break:s.break}))})),opts);
 drawAnalysisCanvas('pathCanvas',(ctx,w,h)=>{
  if(samples.length<2){ctx.fillText(translateText('Drive to trace world positions.'),48,h/2);return;}
  const xs=samples.map(s=>s.raw.PositionX),zs=samples.map(s=>s.raw.PositionZ);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const scale=Math.min((w-80)/Math.max(1,maxX-minX),(h-60)/Math.max(1,maxZ-minZ));
  const point=s=>[w/2+(s.raw.PositionX-(minX+maxX)/2)*scale,h/2-(s.raw.PositionZ-(minZ+maxZ)/2)*scale];
  for(let i=1;i<samples.length;i++){if(samples[i].break)continue;const a=point(samples[i-1]),b=point(samples[i]);ctx.strokeStyle=`hsl(${190-Math.min(1,samples[i].raw.Speed/100)*160},80%,65%)`;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
  const last=point(samples.at(-1));ctx.fillStyle=colors.text;ctx.beginPath();ctx.arc(...last,4,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.text;ctx.fillText(`${(maxX-minX).toFixed(0)}m × ${(maxZ-minZ).toFixed(0)}m`,48,h-8);
 });
}

function renderSlipPlane(model,windowSeconds){
 drawAnalysisCanvas('slipCanvas',(ctx,w,h)=>{
  ctx.clearRect(0,0,w,h);
  const colors=chartColors(),corners=['FrontLeft','FrontRight','RearLeft','RearRight'];
  const current=model.samples.at(-1),points=model.samples.filter(s=>s.raw.IsRaceOn===1&&s.t>=(current?.t??0)-windowSeconds*1000);
  corners.forEach((corner,i)=>{
   const cx=w*(i%2?.75:.25),cy=h*(i<2?.25:.75),radius=Math.max(15,Math.min(w/4-26,h/4-28));
   ctx.strokeStyle=colors.grid;ctx.lineWidth=1;
   for(const ring of [.5,1]){ctx.beginPath();ctx.arc(cx,cy,radius*ring,0,Math.PI*2);ctx.stroke();}
   ctx.beginPath();ctx.moveTo(cx-radius,cy);ctx.lineTo(cx+radius,cy);ctx.moveTo(cx,cy-radius);ctx.lineTo(cx,cy+radius);ctx.stroke();
   ctx.fillStyle=colors.text;ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(['FL','FR','RL','RR'][i]+' · ±2',cx,cy-radius-8);
   for(const point of points){const x=point.raw['TireSlipAngle'+corner],y=point.raw['TireSlipRatio'+corner];ctx.fillStyle=Math.abs(point.raw['TireCombinedSlip'+corner])>1?colors.pink:colors.cyan;ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(cx+Math.max(-2,Math.min(2,x))*radius/2,cy-Math.max(-2,Math.min(2,y))*radius/2,2,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;
   if(current){ctx.fillStyle=colors.amber;ctx.beginPath();ctx.arc(cx+Math.max(-2,Math.min(2,current.raw['TireSlipAngle'+corner]))*radius/2,cy-Math.max(-2,Math.min(2,current.raw['TireSlipRatio'+corner]))*radius/2,4,0,Math.PI*2);ctx.fill();}
  });ctx.textAlign='left';
 });
}

function renderChannelComparison(samples,fields,selected){
 drawAnalysisCanvas('channelCanvas',(ctx,w,h)=>{
  if(samples.length<2||!fields.length){ctx.fillText(translateText('Collecting samples…'),64,h/2);return;}
  const colors=chartColors(),left=64,right=w-64,top=25,bottom=h-30,start=samples[0].t,end=samples.at(-1).t;
  const x=time=>left+(time-start)/Math.max(1,end-start)*(right-left);
  const axis=value=>Math.abs(value)>=10000||(Math.abs(value)>0&&Math.abs(value)<.01)?value.toExponential(1):localizedNumber(value,1);
  if(selected){ctx.strokeStyle=colors.text;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x(selected.t),top);ctx.lineTo(x(selected.t),bottom);ctx.stroke();ctx.setLineDash([]);}
  fields.forEach((field,i)=>{
   const stats=channelStatistics(samples,field.name);if(!stats.count)return;
   let min=stats.min,max=stats.max;if(min===max){const padding=Math.max(1,Math.abs(min)*.01);min-=padding;max+=padding;}
   const color=i?colors.amber:colors.cyan,y=value=>bottom-(value-min)/(max-min)*(bottom-top);
   ctx.fillStyle=color;ctx.textAlign=i?'left':'right';
   for(let tick=0;tick<4;tick++){const value=max-(max-min)*tick/3;ctx.fillText(axis(value),i?right+8:left-8,top+(bottom-top)*tick/3+4);}
   ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(i?[6,4]:[]);ctx.beginPath();let started=false;
   for(const sample of samples){const value=sample.raw[field.name];if(!Number.isFinite(value)){started=false;continue;}if(!started||sample.break){ctx.moveTo(x(sample.t),y(value));started=true;}else ctx.lineTo(x(sample.t),y(value));}
   ctx.stroke();ctx.setLineDash([]);
   const value=selected?.raw[field.name];if(Number.isFinite(value)){ctx.fillStyle=color;ctx.beginPath();if(i)ctx.rect(x(selected.t)-4,y(value)-4,8,8);else ctx.arc(x(selected.t),y(value),4,0,Math.PI*2);ctx.fill();}
  });
  ctx.fillStyle=colors.text;ctx.textAlign='left';ctx.fillText(`${localizedNumber((start-end)/1000,1)} s`,left,h-8);ctx.textAlign='right';ctx.fillText('0 s',right,h-8);ctx.textAlign='left';
 },{left:64,right:64});
}
