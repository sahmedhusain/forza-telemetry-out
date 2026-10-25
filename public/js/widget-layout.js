'use strict';
const WIDGETS=Object.freeze({
 engine:{label:'Engine + speed',span:5,height:320,group:'engine'},car:{label:'Vehicle visualization',span:3,height:320,group:'chassis'},inputs:{label:'Driver inputs',span:4,height:320,group:'driver'},
 powertrain:{label:'Powertrain',span:5,height:240,group:'engine'},gforce:{label:'Body acceleration',span:3,height:240,group:'motion'},tires:{label:'Four tire states',span:4,height:320,group:'chassis'},
 trace:{label:'Inputs + speed',span:6,height:280,group:'driver'},peaks:{label:'Session peaks',span:6,height:240,group:'session'},race:{label:'Race timing',span:4,height:320,group:'session'},
 channels:{label:'All 88 channels',span:8,height:480,group:'data'},handling:{label:'Handling relationships',span:6,height:200,group:'motion'},metadata:{label:'Vehicle metadata',span:6,height:480,group:'data'},
 body:{label:'Body / world',span:6,height:360,group:'motion'},dyno:{label:'Power curve',span:6,height:360,group:'engine'},path:{label:'Driven path',span:6,height:360,group:'motion'},
 damper:{label:'Suspension velocity',span:6,height:360,group:'chassis'},slip:{label:'Tire slip plane',span:6,height:400,group:'chassis'},compare:{label:'Compare channels',span:12,height:640,group:'data'},
 recording:{label:'Recording',span:6,height:280,group:'session'},diagnostics:{label:'Connection health',span:6,height:360,group:'data'},coverage:{label:'History coverage',span:6,height:400,group:'session'},fieldrecords:{label:'Historical field records',span:12,height:480,group:'data'},
 usage:{label:'Driving behavior',span:6,height:280,group:'driver'},laps:{label:'Observed laps',span:6,height:400,group:'session'},suspension:{label:'Suspension summary',span:6,height:360,group:'chassis'},records:{label:'Saved bests',span:12,height:640,group:'session'}
});
const WIDGET_WIDTHS=[3,4,5,6,8,12],WIDGET_HEIGHTS=[200,240,280,320,360,400,480,640];
const DASHBOARD_PRESETS={drive:['engine','car','inputs','powertrain','gforce','tires','trace','peaks','race','channels'],engineering:['car','tires','gforce','handling','slip','damper','dyno','body','channels'],all:Object.keys(WIDGETS)};
class WidgetLayout {
 constructor(saved){this.items=[];if(saved?.version===1&&Array.isArray(saved.items)&&saved.items.length<=Object.keys(WIDGETS).length){for(const item of saved.items){if(!item||typeof item.id!=='string'||!Object.hasOwn(WIDGETS,item.id)||this.items.some(w=>w.id===item.id))continue;const d=WIDGETS[item.id];this.items.push({id:item.id,span:WIDGET_WIDTHS.includes(item.span)?item.span:d.span,height:WIDGET_HEIGHTS.includes(item.height)?item.height:d.height});}}else this.preset('drive');}
 preset(name){if(!Object.hasOwn(DASHBOARD_PRESETS,name))return;this.items=DASHBOARD_PRESETS[name].map(id=>({id,span:WIDGETS[id].span,height:WIDGETS[id].height}));if(name==='engineering')for(const item of this.items){if(['car','tires','gforce'].includes(item.id))item.span=4;if(['body','channels'].includes(item.id))item.span=12;}}
 add(id){if(!Object.hasOwn(WIDGETS,id)||this.items.some(w=>w.id===id))return false;this.items.push({id,span:WIDGETS[id].span,height:WIDGETS[id].height});return true;}
 remove(id){this.items=this.items.filter(w=>w.id!==id);}
 move(id,offset){const index=this.items.findIndex(w=>w.id===id);if(index<0||!Number.isInteger(offset))return;const target=Math.max(0,Math.min(this.items.length-1,index+offset));const [item]=this.items.splice(index,1);this.items.splice(target,0,item);}
 before(id,target){if(id===target)return;const index=this.items.findIndex(w=>w.id===id);if(index<0||!this.items.some(w=>w.id===target))return;const [item]=this.items.splice(index,1);this.items.splice(this.items.findIndex(w=>w.id===target),0,item);}
 resize(id,span,height){const item=this.items.find(w=>w.id===id);if(!item)return;if(WIDGET_WIDTHS.includes(span))item.span=span;if(WIDGET_HEIGHTS.includes(height))item.height=height;}
 serialize(){return {version:1,items:this.items.map(w=>({...w}))};}
}
if(typeof module!=='undefined')module.exports={WidgetLayout,WIDGETS,WIDGET_WIDTHS,WIDGET_HEIGHTS,DASHBOARD_PRESETS};
