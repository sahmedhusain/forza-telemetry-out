const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('RPM scale follows the reported car maximum and disappears when the maximum is unavailable',()=>{
 const text=[],arcs=[],leds=Array.from({length:10},()=>({classList:{add(){this.on=true},remove(){this.on=false}}}));
 const ctx=new Proxy({fillText(v){text.push(v)},arc(...v){arcs.push(v)},createConicGradient(){return {addColorStop(){}}}},{get:(o,k)=>o[k]??(()=>{})});
 const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:500,height:300}),getClientRects:()=>[{}]};
 const sandbox={window:{devicePixelRatio:1,addEventListener(){}},document:{getElementById:()=>canvas,querySelectorAll:()=>leds,body:{dataset:{motion:'reduced'}}},matchMedia:()=>({matches:true})};
 vm.runInNewContext(fs.readFileSync('public/js/gauges/tachometer.js','utf8'),sandbox);const gauge=new sandbox.window.TachometerGauge('test');
 gauge.update({currentRpm:2000,maxRpm:4000,idleRpm:500});assert.ok(text.includes('4.0'));text.length=0;
 gauge.update({currentRpm:2000,maxRpm:8500,idleRpm:900});assert.ok(text.includes('8.5'));text.length=0;arcs.length=0;
 gauge.update({currentRpm:2000,maxRpm:0});assert.equal(gauge.maxRpm,0);assert.equal(arcs.length,0);assert.equal(text.length,0);assert.ok(leds.every(l=>!l.classList.on));
});
