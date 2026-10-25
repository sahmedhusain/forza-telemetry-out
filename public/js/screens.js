'use strict';
function mobileNavigation(nav,items,activate,label='Screen') {
  const wrapper=document.createElement('label');wrapper.className='mobile-navigation';wrapper.append(document.createTextNode(label));
  const select=document.createElement('select');select.setAttribute('aria-label',label);
  for(const [id,text] of items){const option=document.createElement('option');option.value=id;option.textContent=text;select.append(option);}
  wrapper.append(select);nav.before(wrapper);
  select.onchange=()=>activate(select.value);
  const sync=()=>{const active=nav.querySelector('[aria-selected="true"]');if(active)select.value=active.id;};
  new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-selected']});sync();
  return select;
}
function screenPages(id,definitions){
  const root=document.getElementById('view-'+id), tabs=document.createElement('div'),stack=document.createElement('div');
  root.classList.add('paginated');tabs.className='screen-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Screen');stack.className='screen-stack';
  const panels=[];
  definitions.forEach(([key,label,nodes],i)=>{
    const panel=document.createElement('section');panel.className='screen-pane';panel.id=`screen-${id}-${key}`;panel.hidden=i!==0;panel.setAttribute('role','tabpanel');panel.tabIndex=0;
    const button=document.createElement('button');button.id=`screen-tab-${id}-${key}`;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-selected',String(i===0));button.tabIndex=i===0?0:-1;panel.setAttribute('aria-labelledby',button.id);
    panel.append(...nodes);panels.push(panel);stack.append(panel);tabs.append(button);
    button.onclick=()=>{for(const p of panels)p.hidden=p!==panel;for(const b of tabs.children){b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;}button.scrollIntoView({block:'nearest',inline:'nearest'});window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('screenchange'));};
  });
  tabs.onkeydown=e=>{const buttons=[...tabs.children];let i=buttons.indexOf(document.activeElement);if(i<0)return;const forward=document.documentElement.dir==='rtl'?-1:1;if(e.key==='ArrowRight')i=(i+forward+buttons.length)%buttons.length;else if(e.key==='ArrowLeft')i=(i-forward+buttons.length)%buttons.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=buttons.length-1;else return;e.preventDefault();buttons[i].click();buttons[i].focus();};
  root.append(tabs,stack);mobileNavigation(tabs,definitions.map(([key,label])=>[`screen-tab-${id}-${key}`,label]),target=>document.getElementById(target).click());
}
const cockpitRoot=document.getElementById('cockpit'),enginePanel=document.getElementById('tachCard'),driverPanel=document.querySelector('.driver'),motionPanel=document.getElementById('gMeterCanvas').closest('article');
const raceDetails=document.querySelector('.detail-grid'),racePanel=raceDetails.children[0],bodyPanel=raceDetails.children[1];
const vehiclePanel=document.createElement('article');vehiclePanel.className='panel vehicle-metadata';vehiclePanel.innerHTML=`<div class="panel-head"><h2>Vehicle metadata</h2></div><h2 id="vehicleName" dir="auto">—</h2><dl class="metrics" id="vehicleMetadata"></dl><p class="panel-note">Model names come from a community lookup. Raw packets contain an ID, not a name. Unknown IDs remain visible.</p>`;
screenPages('cockpit',[['instruments','Instruments',[enginePanel,document.querySelector('.strip')]],['controls','Driver inputs',[driverPanel]],['motion','Motion',[motionPanel,bodyPanel]],['vehicle','Vehicle',[vehiclePanel]]]);cockpitRoot.remove();raceDetails.remove();
const chassisRoot=document.getElementById('view-chassis'),tireRoot=document.querySelector('.tire-panel'),carPanel=document.createElement('article');carPanel.className='panel car-screen';carPanel.append(tireRoot.querySelector('.panel-head'),document.querySelector('.car-diagram'),tireRoot.querySelector('.panel-note'));
const front=document.createElement('div'),rear=document.createElement('div');front.className=rear.className='axle-grid wheel-layout';front.append(document.getElementById('wheelFL'),document.getElementById('wheelFR'));rear.append(document.getElementById('wheelRL'),document.getElementById('wheelRR'));
screenPages('chassis',[['vehicle','Vehicle',[carPanel,chassisRoot.querySelector('.insight-strip')]],['front','Front axle',[front]],['rear','Rear axle',[rear]]]);tireRoot.remove();
const sessionRoot=document.getElementById('view-session'),sessionTitle=sessionRoot.querySelector('.view-title'),sessionPeaks=sessionRoot.querySelector('.insight-strip'),usage=document.getElementById('usageBars'),lapPanel=document.getElementById('lapRows').closest('article'),lapPeaks=document.getElementById('lapMean').closest('.insight-strip'),suspensionPanel=document.getElementById('suspensionRows').closest('article'),exportsPanel=document.querySelector('.session-exports');
const recordingStats=document.createElement('dl');recordingStats.id='recordingStats';recordingStats.className='metrics';
const recordingInfo=document.createElement('p');recordingInfo.className='panel-note';recordingInfo.textContent='Record live packets, stop, then export CSV or JSON before clearing or closing the receiver.';
const historySummary=document.createElement('div');historySummary.className='saved-records';historySummary.innerHTML=`<div class="view-title"><label>Vehicle<select id="historyCar"></select></label><button id="refreshHistory">Refresh history</button><a class="button" id="historyDownload" href="/api/history?download=1&all=1" download>Export history</a></div><p id="historyStatus" class="panel-note" role="status">No historical packets yet.</p><div class="insight-strip" id="historyPeaks"></div><dl class="metrics" id="historyDetails"></dl><p class="panel-note">Saved bests combine all received packets per car, across performance-index changes. Raw recordings remain separate. History starts when this version receives packets.</p><p class="panel-note">Lap minima may combine different events; FH6 sends no track ID.</p>`;
const historyCoverage=document.createElement('div');historyCoverage.innerHTML='<p id="historyContext" class="panel-note">No historical packets yet.</p>';historyCoverage.append(historySummary.querySelector('#historyDetails'));
const fieldRecords=document.createElement('article');fieldRecords.className='panel field-records';fieldRecords.innerHTML=`<div class="panel-head"><h2>Historical field records</h2><label>System<select id="historyGroup"><option value="">All systems</option></select></label></div><p class="panel-note">Minimum, maximum and latest active-driving value across received packets for the selected saved car.</p><div class="table-wrap"><table><thead><tr><th>CHANNEL</th><th>Minimum</th><th>Maximum</th><th>Latest</th><th>UNIT</th></tr></thead><tbody id="historyFields"></tbody></table></div>`;
screenPages('session',[['summary','Summary',[document.getElementById('resetAnalysis'),sessionPeaks,usage]],['recording','Recording',[exportsPanel,recordingStats,recordingInfo]],['timing','Race timing',[racePanel]],['laps','Laps',[lapPanel,lapPeaks]],['suspension','Suspension',[suspensionPanel]],['saved','Saved bests',[historySummary]],['coverage','History coverage',[historyCoverage]],['fields','Field records',[fieldRecords]]]);sessionTitle.remove();
const connectRoot=document.getElementById('view-connection'),connectTitle=connectRoot.querySelector('.view-title'),refreshNetworkButton=document.getElementById('refreshNetwork');
const addressChoice=document.createElement('label');addressChoice.className='address-choice';addressChoice.innerHTML='Receiver address<select id="receiverAddress"></select>';
const phoneAccess=document.createElement('div');phoneAccess.id='phoneAccess';
const connectionGrid=connectRoot.querySelector('.connection-grid'),receiverForm=document.getElementById('connectionForm'),diagnostics=document.getElementById('connectionHealth').closest('article');
screenPages('connection',[['addresses','Addresses',[refreshNetworkButton,addressChoice,document.getElementById('networkCards')]],['receiver','Receiver',[receiverForm]],['diagnostics','Diagnostics',[diagnostics]],['phone','Phone access',[phoneAccess]],['setup','Game setup',[document.getElementById('setup')]],['desktop','Desktop',[connectRoot.querySelector('.install-panel')]]]);connectTitle.remove();connectionGrid.remove();
const settingsRoot=document.getElementById('view-settings'),settingsGrid=settingsRoot.querySelector('.settings-grid'),fieldsets=[...settingsGrid.children],languageFieldset=document.createElement('fieldset');languageFieldset.innerHTML='<legend>Language and theme</legend>';
for(const key of ['language','theme','numberSize'])languageFieldset.append(document.getElementById('pref-'+key).closest('label'));
function settingsPanel(fieldset){const wrapper=document.createElement('div');wrapper.className='settings-grid';wrapper.append(fieldset);return wrapper;}
screenPages('settings',[['language','Language and theme',[settingsPanel(languageFieldset)]],['display','Display',[settingsPanel(fieldsets[0])]],['instruments','Instruments',[settingsPanel(fieldsets[1])]],['tires','Tires',[settingsPanel(fieldsets[2])]]]);settingsGrid.remove();
const mainTabs=document.querySelector('.tab-nav');mobileNavigation(mainTabs,Object.entries(tabNames).map(([id,label])=>['tab-'+id,label]),id=>document.getElementById(id).click(),'View');
mobileNavigation(document.querySelector('.graph-nav'),graphs.map(([id,label])=>['graph-tab-'+id,label]),id=>document.getElementById(id).click());
for(const table of document.querySelectorAll('.table-wrap')){table.tabIndex=0;table.setAttribute('aria-label','Data table');}
translateStatic();
