(function(){
const INC=DATA.incidents, LEG=DATA.legislation;
const YEARS=[2020,2021,2022,2023,2024];
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y)));
const count=(arr,f)=>{const m={};arr.forEach(e=>{const v=f(e);(Array.isArray(v)?v:[v]).forEach(x=>{x=x||'Not recorded';m[x]=(m[x]||0)+1})});return Object.entries(m).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
const safeUrl=u=>/^https?:\/\//.test(u||'')?u:null;
const link=(u,t)=>safeUrl(u)?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`:'';
const FEAT=[...INC].sort((a,b)=>String(b.date||b.year).localeCompare(String(a.date||a.year))).slice(0,5);

/* Legislation in the 2020–2024 tables excludes pre-2020 laws; the map and state pages keep them. */
const LEG_SCOPE=LEG.filter(l=>!l.pre2020);
const BILLS=LEG_SCOPE.filter(l=>l.type==='Bill');

const ABBR={Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE','District of Columbia':'DC',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY'};
const STATES=Object.keys(ABBR).sort();

/* ---------- state status as of Dec 31, 2024 ---------- */
function stateInfo(name){
  const recs=LEG.filter(l=>l.state===name);
  const enactedBills=recs.filter(l=>l.type==='Bill'&&l.outcome==='Enacted');
  const enactedLaws=enactedBills.length?enactedBills:recs.filter(l=>l.type==='Statute');
  let status='None';
  if(recs.some(l=>l.outcome==='Enacted'))status='Enacted';
  else if(recs.some(l=>l.outcome==='Pending'||l.outcome==='Passed'))status='Pending';
  else if(recs.some(l=>l.outcome==='Vetoed'))status='Vetoed';
  else if(recs.length)status='Failed';
  return {name,recs,status,enacted:enactedLaws,bills:recs.filter(l=>l.type==='Bill')};
}
const SI={};STATES.forEach(s=>SI[s]=stateInfo(s));
const STATUS_LABEL={Enacted:'Law enacted',Pending:'Legislation pending',Vetoed:'Not enacted (vetoed)',Failed:'Bills failed',None:'No data'};
function tipHtml(name){
  const s=SI[name];
  let h=`<b>${esc(name)}</b><br>${esc(STATUS_LABEL[s.status])}`;
  if(s.enacted.length)h+='<br>'+s.enacted.slice(0,4).map(l=>`${esc(l.bill)} (${l.year})`).join(', ')+(s.enacted.length>4?`, +${s.enacted.length-4} more`:'');
  else if(s.bills.length)h+=`<br>${s.bills.length} bill${s.bills.length>1?'s':''} tracked`;
  return h+'<br><small>Click for details</small>';
}

/* ---------- map ---------- */
const SMALL=['VT','NH','MA','RI','CT','NJ','DE','MD','DC'];
function mapHtml(){
  const feats=topojson.feature(US_TOPO,US_TOPO.objects.states).features;
  const path=d3.geoPath();
  const paths=feats.map(f=>{const n=f.properties.name,a=ABBR[n];if(!a)return'';const s=SI[n].status;
    return `<path class="st ${s}" d="${path(f)}" tabindex="0" role="link" data-state="${esc(n)}" aria-label="${esc(n)}: ${esc(STATUS_LABEL[s])}"></path>`}).join('');
  const boxes=SMALL.map((a,i)=>{const n=Object.keys(ABBR).find(k=>ABBR[k]===a),s=SI[n].status,x=975+(i%2)*46,y=250+Math.floor(i/2)*44;
    return `<g class="stbox"><rect class="st ${s}" x="${x}" y="${y}" width="40" height="34" rx="6" tabindex="0" role="link" data-state="${esc(n)}" aria-label="${esc(n)}: ${esc(STATUS_LABEL[s])}"></rect><text x="${x+20}" y="${y+22}" text-anchor="middle">${a}</text></g>`}).join('');
  const labels=feats.map(f=>{const n=f.properties.name,a=ABBR[n];if(!a||SMALL.includes(a))return'';const c=path.centroid(f);if(isNaN(c[0]))return'';
    const adj={FL:[12,8],LA:[-12,0],MI:[10,12],AK:[0,0]};const o=adj[a]||[0,0];return `<text class="lb" x="${c[0]+o[0]}" y="${c[1]+o[1]+4}" text-anchor="middle">${a}</text>`}).join('');
  const cnt=k=>STATES.filter(s=>SI[s].status===k).length;
  return `<div class="mapwrap"><svg viewBox="0 0 1075 610" role="group" aria-label="Map of state laws on deepfakes in elections, as of 2024">${paths}${boxes}${labels}</svg><div class="maptip" id="maptip" hidden></div></div>
  <ul class="legend"><li><i class="sw Enacted"></i>Law enacted (${cnt('Enacted')})</li><li><i class="sw Pending"></i>Legislation pending (${cnt('Pending')})</li><li><i class="sw Vetoed"></i>Not enacted, vetoed (${cnt('Vetoed')})</li><li><i class="sw Failed"></i>Bills failed (${cnt('Failed')})</li><li><i class="sw None"></i>No data (${cnt('None')})</li></ul>
  <p class="small">Status as of Dec. 31, 2024. A state shows its most advanced outcome: enacted, then pending, then vetoed, then failed. "No data" means neither source lists a bill for that state. Hover a state for details and click it to open its page. Laws passed in 2025 or later are not counted.</p>`;
}
function wireMap(){
  const tip=$('#maptip');if(!tip)return;const wrap=tip.parentElement;
  const show=(el,x,y)=>{tip.innerHTML=tipHtml(el.dataset.state);tip.hidden=false;const r=wrap.getBoundingClientRect();let l=x-r.left+14,t=y-r.top+14;if(l>r.width-190)l=x-r.left-190;tip.style.left=l+'px';tip.style.top=t+'px'};
  wrap.querySelectorAll('[data-state]').forEach(el=>{
    el.addEventListener('pointermove',e=>show(el,e.clientX,e.clientY));
    el.addEventListener('pointerleave',()=>{tip.hidden=true});
    el.addEventListener('focus',()=>{const b=el.getBoundingClientRect();show(el,b.left+b.width/2,b.top+b.height/2)});
    el.addEventListener('blur',()=>{tip.hidden=true});
    el.addEventListener('click',()=>{location.hash='state/'+encodeURIComponent(el.dataset.state)});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();location.hash='state/'+encodeURIComponent(el.dataset.state)}});
  });
}

/* ---------- charts ---------- */
const yearData=(arr,f)=>{const m=Object.fromEntries(count(arr,f));return YEARS.map(y=>[String(y),m[String(y)]||0])};
const CHARTS={
  incYear:{title:'Incidents by year',desc:'When each U.S. incident occurred.',data:()=>yearData(INC,e=>String(e.year)),unit:'incidents',vertical:true,about:'U.S. incidents only. 2024 is dominated by the WIRED AI Elections Project. Earlier years come from public reporting, so the rise reflects collection effort as well as real growth.'},
  category:{title:'Incident category',desc:'The purpose assigned to each incident.',data:()=>count(INC,e=>e.category),unit:'incidents',about:'Categories follow the WIRED AI Elections Project labels (for example Campaigning, Sow discord/confusion, Voting misinformation).'},
  intent:{title:'Deceptive intent',desc:'Whether the use was meant to deceive.',data:()=>count(INC,e=>e.deceptive),unit:'incidents',about:'"Yes" means deceptive intent was recorded. "Unclear" is used where the creator\'s intent was not established.'},
  outcome:{title:'Bill outcomes as of 2024',desc:'What happened to U.S. state deepfake election bills.',data:()=>count(BILLS,e=>e.outcome),unit:'bills',about:'One record per bill, merged across Public Citizen and NCSL. Outcome is the last status recorded on or before Dec. 31, 2024; a bill still pending then may have been decided later.'},
  year:{title:'Bills by year',desc:'Bills by the year of their latest recorded action.',data:()=>yearData(BILLS,e=>String(e.year)),unit:'bills',vertical:true,about:'Year is the latest action date on or before 2024. Bills introduced only in 2025 or later are excluded.'},
  enactedState:{title:'Enacted bills by state',desc:'States with enacted deepfake election bills, 2020–2024.',data:()=>count(BILLS.filter(e=>e.outcome==='Enacted'),e=>e.state),unit:'bills',about:'Counts enacted bills in 2020–2024. Laws from before 2020 (California and Texas, 2019) are shown on the map but not here.'},
  lawType:{title:'Disclosure vs. prohibition',desc:'Type of state election deepfake statute in force by 2024.',data:()=>count(LEG.filter(e=>e.type==='Statute'),e=>e.lawType),unit:'statutes',about:'From the NCSL statute table. Statutes first enacted in 2025 or later are excluded.'}
};

/* ---------- views ---------- */
const views={};
let carIdx=0,carTimer=null;
const enactedStates=STATES.filter(s=>SI[s].status==='Enacted');

views.overview=()=>`<h1>U.S. election deepfakes, 2020–2024</h1>
<p class="lede">Documented deepfakes and cheapfakes in U.S. elections, alongside the state laws written in response. Browse incidents, compare state laws on the map, and explore patterns.</p>
<div class="note">Working draft. Incidents come from the WIRED AI Elections Project and hand-compiled public reporting. Pre-2024 U.S. coverage is thin, so these numbers are not a complete count.</div>
<div class="stats">
 <div class="stat"><b>${INC.length}</b><span>U.S. incidents</span></div>
 <div class="stat"><b>${enactedStates.length}</b><span>states with an enacted law by end of 2024</span></div>
 <div class="stat"><b>${BILLS.length}</b><span>bills tracked, 2020–2024</span></div>
 <div class="stat"><b>${BILLS.filter(b=>b.outcome==='Enacted').length}</b><span>bills enacted</span></div>
</div>
<h2>State laws on election deepfakes</h2>
${mapHtml()}
<div class="cta">
 <a href="#incidents"><b>Browse incidents →</b>Search and filter U.S. incidents.</a>
 <a href="#legislation"><b>Browse legislation →</b>State bills and statutes with source links.</a>
 <a href="#visualizations"><b>Explore visualizations →</b>Charts with downloads and data tables.</a>
</div>
<h2>Featured examples</h2>
<div class="car" id="car">${carHtml()}</div>`;
function carHtml(){
  const e=FEAT[carIdx%FEAT.length];
  return `<div class="meta"><span class="pill">${esc(e.date||e.year)}</span> <span class="pill">${esc(e.category)}</span></div>
  <h3>${esc(e.title)}</h3>
  <p>Deceptive intent: <span class="pill ${esc(e.deceptive)}">${esc(e.deceptive)}</span></p>
  <div class="bar"><button data-car="-1">← Previous</button><span>${carIdx%FEAT.length+1} / ${FEAT.length}</span><button data-car="1">Next →</button><span class="sp"></span><button data-open="${esc(e.id)}">View details</button></div>`;
}

const IS={q:'',year:'',category:'',deceptive:'',sort:'newest',page:1};
views.incidents=()=>{
  const sel=(id,label,vals,cur)=>`<div><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${vals.map(v=>`<option ${String(v)===String(cur)?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`;
  return `<h1>Browse incidents</h1><p class="lede">U.S. election deepfakes and cheapfakes, 2020–2024.</p>
<div class="filters">
 <div><label for="iq">Search titles</label><input id="iq" placeholder="Search" value="${esc(IS.q)}"></div>
 ${sel('iy','Year',YEARS,IS.year)}
 ${sel('ik','Category',uniq(INC.map(e=>e.category)),IS.category)}
 ${sel('id','Deceptive intent (<a href="#about">how decided</a>)',['Yes','No','Unclear'],IS.deceptive)}
 <div><label for="is">Sort by</label><select id="is">${[['newest','Newest first'],['title','Title A–Z'],['category','Category']].map(o=>`<option value="${o[0]}" ${IS.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
</div>
<div id="ilist"></div>`;
};
function incList(){
  let r=INC.filter(e=>(!IS.q||(e.title+e.category+(e.cheapfake||'')).toLowerCase().includes(IS.q.toLowerCase()))&&(!IS.year||String(e.year)===IS.year)&&(!IS.category||e.category===IS.category)&&(!IS.deceptive||e.deceptive===IS.deceptive));
  if(IS.sort==='newest')r.sort((a,b)=>String(b.date||b.year).localeCompare(String(a.date||a.year)));else r.sort((a,b)=>String(a[IS.sort]).localeCompare(String(b[IS.sort])));
  const per=12,pages=Math.max(1,Math.ceil(r.length/per));IS.page=Math.min(IS.page,pages);
  const s=r.slice((IS.page-1)*per,IS.page*per);
  $('#ilist').innerHTML=`<div class="bar"><b>${r.length} of ${INC.length} incidents</b><span class="sp"></span><button id="iclear">Clear filters</button></div>
  <div class="grid">${s.map(e=>`<article class="card"><div class="meta"><span>${esc(e.date||e.year)}</span><span>${esc(e.source)}</span></div>
   <button class="title" data-open="${esc(e.id)}">${esc(e.title)}</button>
   <div><span class="pill">${esc(e.category)}</span> <span class="pill ${esc(e.deceptive)}">Deceptive: ${esc(e.deceptive)}</span></div>
   ${e.cheapfake?`<div class="meta">Method: ${esc(e.cheapfake)}</div>`:''}
   <div class="row"><button data-open="${esc(e.id)}">View details</button>${link(e.url,'Original source')}</div></article>`).join('')||'<p>No incidents match.</p>'}</div>
  <div class="pager"><button id="ip" ${IS.page<=1?'disabled':''}>Previous</button><span>Page ${IS.page} of ${pages}</span><button id="in" ${IS.page>=pages?'disabled':''}>Next</button></div>`;
}
function openInc(id){
  const e=INC.find(x=>x.id===id);if(!e)return;
  $('#dlgBody').innerHTML=`<h2 style="margin-top:0">${esc(e.title)}</h2><dl>
   <dt>Category</dt><dd>${esc(e.category)}</dd>
   <dt>Deceptive intent</dt><dd>${esc(e.deceptive)}</dd><dt>Date</dt><dd>${esc(e.date||e.year)}</dd>
   <dt>Method</dt><dd>${esc(e.cheapfake||'Not recorded')}</dd><dt>Estimated cost</dt><dd>${esc(e.cost||'Not recorded')}</dd>
   ${e.note?`<dt>Notes</dt><dd>${esc(e.note)}</dd>`:''}<dt>Dataset</dt><dd>${esc(e.dataset)}</dd><dt>Source</dt><dd>${link(e.url,e.source||'Open source')}</dd></dl>
   <p class="note">Inclusion does not establish that the media is fake. Open the source to inspect it in context.</p>
   <button data-close>Close</button>`;
  $('#dlg').showModal();
}

const LS={q:'',state:'',outcome:'',source:'',type:'',sort:'state',dir:1,page:1};
views.legislation=()=>{
  const sel=(id,label,vals,cur)=>`<div><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${vals.map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`;
  return `<h1>Browse legislation</h1>
<p class="lede">State bills and statutes on deepfakes in elections, 2020–2024, merged from Public Citizen and NCSL. Status is as of Dec. 31, 2024.</p>
<div class="filters">
 <div><label for="lq">Search</label><input id="lq" placeholder="State, bill, title or summary" value="${esc(LS.q)}"></div>
 ${sel('ls','State',STATES,LS.state)}
 ${sel('lo','Outcome',['Enacted','Passed','Pending','Vetoed','Failed'],LS.outcome)}
 ${sel('lsrc','Source',['NCSL','Public Citizen'],LS.source)}
 ${sel('lt','Record type',['Bill','Statute'],LS.type)}
</div>
<div id="llist"></div>`;
};
function legList(){
  let r=LEG_SCOPE.filter(e=>(!LS.state||e.state===LS.state)&&(!LS.outcome||e.outcome===LS.outcome)&&(!LS.source||e.source.includes(LS.source))&&(!LS.type||e.type===LS.type)&&(!LS.q||[e.state,e.bill,e.title,e.summary,e.status].join(' ').toLowerCase().includes(LS.q.toLowerCase())));
  r.sort((a,b)=>LS.dir*String(a[LS.sort]==null?'':a[LS.sort]).localeCompare(String(b[LS.sort]==null?'':b[LS.sort]),undefined,{numeric:true}));
  const per=25,pages=Math.max(1,Math.ceil(r.length/per));LS.page=Math.min(LS.page,pages);
  const s=r.slice((LS.page-1)*per,LS.page*per);
  const th=(k,l)=>`<th data-sort="${k}">${l}${LS.sort===k?(LS.dir>0?' ▲':' ▼'):''}</th>`;
  window.__legRows=r;
  $('#llist').innerHTML=`<div class="bar"><b>${r.length} of ${LEG_SCOPE.length} records</b><span class="sp"></span><button id="lcsv">Download CSV</button><button id="lclear">Reset filters</button></div>
  <div class="scroll"><table><thead><tr>${th('state','State')}${th('bill','Bill')}${th('title','Title')}${th('outcome','Outcome')}${th('year','Year')}${th('source','Source')}<th></th></tr></thead><tbody>
  ${s.map((e,i)=>`<tr><td><a href="#state/${encodeURIComponent(e.state)}">${esc(e.state)}</a></td><td>${safeUrl(e.url)?link(e.url,e.bill):esc(e.bill)}</td><td>${esc(e.title||e.lawType||'')}</td><td><span class="pill ${e.outcome}">${esc(e.outcome)}</span></td><td>${e.year||''}</td><td>${esc(e.source)}</td><td><button data-leg="${(LS.page-1)*per+i}">Details</button></td></tr>`).join('')||'<tr><td colspan="7">No records match.</td></tr>'}
  </tbody></table></div>
  <div class="pager"><button id="lp" ${LS.page<=1?'disabled':''}>Previous</button><span>Page ${LS.page} of ${pages}</span><button id="ln" ${LS.page>=pages?'disabled':''}>Next</button></div>`;
}
function legDetail(e){
  return `<h2 style="margin-top:0">${esc(e.state)}: ${esc(e.bill)}</h2><dl>
  ${e.title?`<dt>Title</dt><dd>${esc(e.title)}</dd>`:''}
  <dt>Status</dt><dd>${esc(e.status)}</dd><dt>Outcome</dt><dd>${esc(e.outcome)} (as of 2024)</dd><dt>Year</dt><dd>${e.year||'Not recorded'}</dd>
  ${e.lawType?`<dt>Statute type</dt><dd>${esc(e.lawType)}</dd>`:''}
  ${e.summary?`<dt>Summary</dt><dd>${esc(e.summary)}</dd>`:''}
  ${e.penalties?`<dt>Penalties</dt><dd>${esc(e.penalties)}</dd>`:''}
  <dt>Source</dt><dd>${esc(e.source)}</dd><dt>Official record</dt><dd>${link(e.url,'Open record')||'Not linked'}</dd></dl><button data-close>Close</button>`;
}
function openLeg(i){const e=window.__legRows[i];if(!e)return;$('#dlgBody').innerHTML=legDetail(e);$('#dlg').showModal()}
function openLegRec(i){const e=window.__stateRecs[i];if(!e)return;$('#dlgBody').innerHTML=legDetail(e);$('#dlg').showModal()}

views.state=(name)=>{
  const s=SI[name];if(!s)return `<p><a href="#visualizations">← Back to map</a></p><h1>State not found</h1>`;
  const recs=[...s.recs].sort((a,b)=>({Enacted:0,Vetoed:1,Passed:2,Pending:3,Failed:4}[a.outcome]-{Enacted:0,Vetoed:1,Passed:2,Pending:3,Failed:4}[b.outcome])||b.year-a.year);
  window.__stateRecs=recs;
  const prev=STATES[(STATES.indexOf(name)+STATES.length-1)%STATES.length],next=STATES[(STATES.indexOf(name)+1)%STATES.length];
  return `<p><a href="#visualizations">← Back to map</a></p>
  <h1>${esc(name)}</h1>
  <p class="lede"><span class="pill ${s.status==='None'?'':s.status}">${esc(STATUS_LABEL[s.status])}</span> as of Dec. 31, 2024.</p>
  ${s.enacted.length?`<h2>Enacted</h2><div class="grid">${s.enacted.map(l=>`<article class="card"><div class="meta"><span>${l.pre2020?'Before 2020':l.year}</span><span>${esc(l.source)}</span></div><h3>${esc(l.bill)}</h3><p>${esc(l.title||l.summary||l.status)}</p><div class="row"><button data-staterec="${recs.indexOf(l)}">Details</button>${link(l.url,'Official record')}</div></article>`).join('')}</div>`:'<p>No law enacted in this state by the end of 2024 in the sources reviewed.</p>'}
  <h2>All recorded legislation (${recs.length})</h2>
  ${recs.length?`<div class="scroll"><table><thead><tr><th>Bill</th><th>Title</th><th>Outcome</th><th>Year</th><th>Source</th><th></th></tr></thead><tbody>${recs.map((l,i)=>`<tr><td>${safeUrl(l.url)?link(l.url,l.bill):esc(l.bill)}</td><td>${esc(l.title||l.lawType||'')}</td><td><span class="pill ${l.outcome}">${esc(l.outcome)}</span></td><td>${l.pre2020?'Before 2020':l.year}</td><td>${esc(l.source)}</td><td><button data-staterec="${i}">Details</button></td></tr>`).join('')}</tbody></table></div>`:'<p>Nothing recorded.</p>'}
  <div class="bar"><a href="#state/${encodeURIComponent(prev)}">← ${esc(prev)}</a><span class="sp"></span><a href="#state/${encodeURIComponent(next)}">${esc(next)} →</a></div>`;
};

const VS={mode:'count',orient:null};
views.visualizations=(chart)=>{
  if(chart&&CHARTS[chart])return chartPage(chart);
  return `<h1>Patterns in the collection</h1><p class="lede">Start with the map, then select a tile to examine a chart, its definitions and the data behind it.</p>
  <h2>State laws on election deepfakes</h2>${mapHtml()}
  <h2>Charts</h2>
  <div class="charts">${Object.entries(CHARTS).map(([k,c])=>{const d=c.data();return `<a class="tile" href="#visualizations?chart=${k}" style="text-decoration:none;color:inherit;display:block"><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>${hbars(d.slice(0,5),d.reduce((a,x)=>a+x[1],0),'count')}<small>${d.reduce((a,x)=>a+x[1],0)} ${c.unit} · Explore chart</small></a>`}).join('')}</div>`;
};
function hbars(d,total,mode){
  const max=Math.max(...d.map(x=>x[1]),1);
  return d.map(([k,v])=>`<div class="hb"><span>${esc(k)}</span><span class="t"><span class="f" style="display:block;width:${v/max*100}%"></span></span><span class="n">${mode==='pct'?(total?(v/total*100).toFixed(1):0)+'%':v}</span></div>`).join('');
}
function chartPage(k){
  const c=CHARTS[k],d=c.data(),total=d.reduce((a,x)=>a+x[1],0);
  const orient=VS.orient||(c.vertical?'v':'h');
  const max=Math.max(...d.map(x=>x[1]),1);
  const pct=v=>total?(v/total*100).toFixed(1):'0.0';
  const body=orient==='h'?hbars(d,total,VS.mode):`<div class="vb">${d.map(([a,v])=>`<div><span>${VS.mode==='pct'?pct(v)+'%':v}</span><i style="height:${v/max*85}%"></i><small>${esc(a)}</small></div>`).join('')}</div>`;
  return `<p><a href="#visualizations">← All visualizations</a></p><h1>${esc(c.title)}</h1><p class="lede">${esc(c.desc)}</p>
  <div class="bar"><button data-orient="h" class="${orient==='h'?'on':''}">Horizontal</button><button data-orient="v" class="${orient==='v'?'on':''}">Vertical</button>
  <button data-mode="count" class="${VS.mode==='count'?'on':''}">Count</button><button data-mode="pct" class="${VS.mode==='pct'?'on':''}">Percentage</button><span class="sp"></span><button data-csv="${k}">Download CSV</button></div>
  <div class="card">${body}<small>${total} ${c.unit} counted</small></div>
  <details class="card" style="margin-top:14px"><summary>About this chart</summary><p>${esc(c.about)}</p><p>Percentages are shares of the ${total} counted ${c.unit}. Figures describe collected records, not all events, and do not show how widely content spread or its effect on any election.</p></details>
  <details class="card" style="margin-top:14px"><summary>View data table</summary><table><thead><tr><th>Category</th><th>Count</th><th>Share</th></tr></thead><tbody>${d.map(([a,v])=>`<tr><td>${esc(a)}</td><td>${v}</td><td>${pct(v)}%</td></tr>`).join('')}</tbody></table></details>`;
}

views.about=()=>`<h1>About the collection</h1>
<p class="lede">This site tracks U.S. election-related deepfakes and cheapfakes and the state laws written in response, for 2020–2024.</p>
<h2>Sources</h2><ul>
<li><b>Incidents:</b> ${INC.filter(i=>i.dataset.startsWith('WIRED')).length} U.S. records from the WIRED AI Elections Project "Election Deepfakes Dataset" (2024 elections).</li>
<li><b>Incidents:</b> ${INC.filter(i=>!i.dataset.startsWith('WIRED')).length} further U.S. cases compiled by hand from news reports and fact-checks. Each links to its source.</li>
<li><b>Legislation:</b> <a href="https://www.citizen.org/article/tracker-legislation-on-deepfakes-in-elections/" target="_blank" rel="noopener noreferrer">Public Citizen, Tracker: Legislation on Deepfakes in Elections</a>.</li>
<li><b>Legislation:</b> <a href="https://www.ncsl.org/elections-and-campaigns/artificial-intelligence-ai-in-elections-and-campaigns" target="_blank" rel="noopener noreferrer">NCSL, Artificial Intelligence in Elections and Campaigns</a>.</li></ul>
<h2>Method and limits</h2><ul>
<li><b>Scope:</b> United States only. Incidents are limited to 2020–2024. Legislation shows actions through Dec. 31, 2024; the map and state pages also show two pre-2020 laws (California and Texas, 2019).</li>
<li><b>As-of rule:</b> The sources are updated into 2026. Outcomes here use only actions dated 2024 or earlier, so a law enacted in 2025 is not shown as enacted. Bills with no action by 2024 are excluded.</li>
<li><b>Merging:</b> A bill listed by both Public Citizen and NCSL is merged into one record (matched on state and bill number). Public Citizen's status text takes priority.</li>
<li><b>Outcomes:</b> Derived from status text: Enacted, Vetoed, Failed, Passed (including bills folded into a passed bill), or Pending.</li>
<li><b>Incidents are thin before 2024:</b> only a handful of U.S. cases from 2020–2023 were found. Treat them as notable examples, not a count.</li>
<li>Incident "deceptive intent" for compiled cases is our reading of the reporting; "Unclear" is used where intent was not established.</li></ul>
<h2 id="deception">Codebook: what determines deceptive intent</h2>
<p>"Deceptive intent" records whether the person or group who made or shared the media meant to make viewers believe something false. It is about the <b>creator's apparent intent</b>, not whether the media is fake: authentic footage can be deceptive when edited or framed to mislead, and AI media can be harmless when it is labeled. It is a judgment from public reporting, not a legal finding, and it does not use any state statute's definition of "materially deceptive."</p>
<div class="scroll"><table><thead><tr><th>Value</th><th>Assign when</th><th>Examples in this collection</th></tr></thead><tbody>
<tr><td><span class="pill Yes">Yes</span></td><td>The media was presented as genuine (or in a way a reasonable viewer would take as genuine) <b>and</b> at least one sign of intent to mislead is documented: a fact-checker or reporting says it was fabricated or edited to change its meaning; the source was hidden or impersonated; or it was released at a time that limits correction, such as just before a vote.</td><td>Biden New Hampshire robocall; Vallas audio posted the night before the Chicago election; the fake Warren clip.</td></tr>
<tr><td><span class="pill No">No</span></td><td>The creator disclosed the media as AI-made, satire, parody or a demonstration, either on the media itself (label, disclaimer, watermark) or openly when it was released.</td><td>RNC ad labeled "Built entirely with AI imagery"; the Arizona Agenda's Kari Lake demonstration, made to show how easy deepfakes are.</td></tr>
<tr><td><span class="pill">Unclear</span></td><td>Intent cannot be established from the sources: the creator says it was a demonstration but copies spread as real; the creator denies manipulating it; the creator admitted a prank only after it spread; or the authenticity itself is unresolved.</td><td>Midjourney Trump arrest images; the Biden clip Twitter labeled "manipulated media" (the poster said it was only shortened); the Clinton-endorses-DeSantis video (shared, then admitted manipulated).</td></tr></tbody></table></div>
<h3>Signals checked, in order</h3>
<ol>
<li><b>Disclosure:</b> Is there a label, disclaimer, watermark or on-record statement that it is AI, satire or a demonstration?</li>
<li><b>Presentation:</b> Was it framed as real footage or a real statement (news logo, captioned as a quote, no hint of parody)?</li>
<li><b>Fact-check verdict:</b> Did a fact-checker or news outlet find it fabricated or edited to change meaning?</li>
<li><b>Concealment:</b> Was the source hidden, impersonated, or a newly created account?</li>
<li><b>Timing and target:</b> Was it timed near a vote, or aimed at voters or a candidate in a way that limits response?</li>
<li><b>Creator statement:</b> Did the creator claim, deny or admit anything, and when? An admission after spreading does not count as disclosure.</li></ol>
<ul>
<li>Disclosure alone gives <b>No</b>. A label that is hidden, tiny or removed when reshared does not, so such cases default to <b>Unclear</b> unless reporting shows deliberate removal.</li>
<li>If signals conflict, the entry is marked <b>Unclear</b> and the Notes field says why.</li>
<li><b>Who coded it:</b> WIRED's records use WIRED's own "Deceptive intent?" label, applied as published. WIRED's criteria are not published alongside the data, and some of its labels may not match the rules above. For example, WIRED marks the deepfake porn of Rep. Ocasio-Cortez as "No"; we have not changed it, but it is worth checking. The other records were coded by this project using the rules above, by one reviewer working from the cited sources, so they are not double-coded and have no inter-coder reliability check. Treat them as a starting point and check the source links before relying on any label.</li></ul>
<h2>Codebook</h2>
<div class="scroll"><table><thead><tr><th>Field</th><th>Applies to</th><th>Meaning</th></tr></thead><tbody>
<tr><td>category</td><td>Incident</td><td>Purpose of the use (Campaigning, Sow discord/confusion, Voting misinformation, and others).</td></tr>
<tr><td>deceptive</td><td>Incident</td><td>Whether the use was intended to deceive.</td></tr>
<tr><td>method</td><td>Incident</td><td>How the media was made (AI voice clone, edited video, stage actors, and so on).</td></tr>
<tr><td>cost</td><td>Incident</td><td>Estimated cost to produce the cheapfake equivalent (WIRED).</td></tr>
<tr><td>outcome</td><td>Legislation</td><td>Derived outcome as of Dec. 31, 2024.</td></tr>
<tr><td>lawType</td><td>Statute</td><td>Disclosure or Prohibition (NCSL).</td></tr>
<tr><td>penalties</td><td>Statute</td><td>Civil, criminal, or both (NCSL).</td></tr></tbody></table></div>`;

/* ---------- router ---------- */
function csv(rows,head){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';return [head.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\n')}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
const TITLES={overview:'U.S. Election Deepfakes Tracker',incidents:'Incidents',legislation:'Legislation',visualizations:'Visualizations',about:'About',state:'State'};
function render(){
  clearInterval(carTimer);
  const h=location.hash.slice(1)||'overview';const [pathPart,qs]=h.split('?');
  const [route,arg]=pathPart.split('/');
  const r=views[route]?route:'overview';
  const param=r==='state'?decodeURIComponent(arg||''):new URLSearchParams(qs||'').get('chart');
  $('#app').innerHTML=views[r](param);
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===r||(r==='state'&&a.dataset.r==='visualizations')));
  $('#nav').classList.remove('open');
  if(r==='incidents')incList();
  if(r==='legislation')legList();
  if(r==='overview'||(r==='visualizations'&&!param))wireMap();
  if(r==='overview')carTimer=setInterval(()=>{carIdx++;const c=$('#car');if(c)c.innerHTML=carHtml()},7000);
  window.scrollTo(0,0);
  document.title=(r==='state'?param:TITLES[r])+' | U.S. Election Deepfakes Tracker';
}
window.addEventListener('hashchange',render);
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');

document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='iq'){IS.q=t.value;IS.page=1;incList()}
  if(t.id==='lq'){LS.q=t.value;LS.page=1;legList()}
});
document.addEventListener('change',e=>{
  const t=e.target,m={iy:'year',ik:'category',id:'deceptive',is:'sort'};
  if(m[t.id]){IS[m[t.id]]=t.value;IS.page=1;incList()}
  const l={ls:'state',lo:'outcome',lsrc:'source',lt:'type'};
  if(l[t.id]){LS[l[t.id]]=t.value;LS.page=1;legList()}
});
document.addEventListener('click',e=>{
  const t=e.target.closest('button,th');if(!t)return;
  const D=t.dataset;
  if(D.open)openInc(D.open);
  if(D.leg!=null&&D.leg!=='')openLeg(+D.leg);
  if(D.staterec!=null&&D.staterec!=='')openLegRec(+D.staterec);
  if('close' in D)$('#dlg').close();
  if(D.car){carIdx=(carIdx+ +D.car+FEAT.length)%FEAT.length;$('#car').innerHTML=carHtml()}
  if(t.id==='ip'){IS.page--;incList()}if(t.id==='in'){IS.page++;incList()}
  if(t.id==='lp'){LS.page--;legList()}if(t.id==='ln'){LS.page++;legList()}
  if(t.id==='iclear'){Object.assign(IS,{q:'',year:'',category:'',deceptive:'',page:1});render()}
  if(t.id==='lclear'){Object.assign(LS,{q:'',state:'',outcome:'',source:'',type:'',page:1});render()}
  if(D.sort){LS.dir=LS.sort===D.sort?-LS.dir:1;LS.sort=D.sort;legList()}
  if(D.mode){VS.mode=D.mode;render()}
  if(D.orient){VS.orient=D.orient;render()}
  if(D.csv){const c=CHARTS[D.csv];download(D.csv+'.csv',csv(c.data(),['category','count']))}
  if(t.id==='lcsv')download('legislation.csv',csv(window.__legRows.map(l=>[l.state,l.bill,l.title||'',l.outcome,l.status,l.year,l.source,l.url]),['state','bill','title','outcome','status','year','source','url']));
});
$('#dlg').addEventListener('click',e=>{if(e.target.id==='dlg')e.target.close()});
render();
})();
