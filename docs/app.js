(function(){
const INC=DATA.incidents, LEG=DATA.legislation;
const FEAT=[...INC].sort((a,b)=>String(b.date||b.year).localeCompare(String(a.date||a.year))).slice(0,5);
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y)));
const count=(arr,f)=>{const m={};arr.forEach(e=>{const v=f(e);(Array.isArray(v)?v:[v]).forEach(x=>{x=x||'Not recorded';m[x]=(m[x]||0)+1})});return Object.entries(m).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
const safeUrl=u=>/^https?:\/\//.test(u||'')?u:null;
const link=(u,t)=>safeUrl(u)?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`:'';

// legislation scope: years 2020-2024 by default
const inScope=l=>l.year!=null&&l.year>=2020&&l.year<=2024;
const LEG_SCOPE=LEG.filter(inScope);

/* ---------- charts ---------- */
const CHARTS={
  incYear:{title:'Incidents by year',desc:'When each incident occurred.',data:()=>count(INC,e=>String(e.year)).sort((a,b)=>a[0]-b[0]),unit:'incidents',vertical:true,about:'2024 is dominated by the WIRED AI Elections Project. Earlier years come from public reporting and fact-checks, so the sharp rise reflects collection effort as well as real growth.'},
  country:{title:'Incidents by country',desc:'Where each incident took place.',data:()=>count(INC,e=>e.country),unit:'incidents',about:'Each WIRED incident is assigned one country. Counts are collected incidents, not all incidents worldwide.'},
  category:{title:'Incident category',desc:'The purpose assigned to each incident.',data:()=>count(INC,e=>e.category),unit:'incidents',about:'Category follows the WIRED AI Elections Project labels (for example Campaigning, Sow discord/confusion, Voting misinformation).'},
  intent:{title:'Deceptive intent',desc:'Whether the use was meant to deceive.',data:()=>count(INC,e=>e.deceptive),unit:'incidents',about:'"Yes" means WIRED recorded deceptive intent. Intent is a judgement by the dataset authors.'},
  outcome:{title:'Bill outcomes, 2020–2024',desc:'What happened to deepfake election bills.',data:()=>count(LEG_SCOPE,e=>e.outcome),unit:'records',about:'Outcome is derived from the status text on the Public Citizen and NCSL pages (Enacted, Vetoed, Failed, Passed, Pending). A bill listed on both sources appears twice.'},
  year:{title:'Legislation by year',desc:'Records by year of introduction or enactment.',data:()=>count(LEG_SCOPE,e=>String(e.year)).sort((a,b)=>a[0]-b[0]),unit:'records',vertical:true,about:'Year is the first year in the status text, or the NCSL list year. Records without a year are excluded.'},
  enactedState:{title:'Enacted laws by state',desc:'States with the most enacted records.',data:()=>count(LEG_SCOPE.filter(e=>e.outcome==='Enacted'),e=>e.state).slice(0,25),unit:'records',about:'Counts enacted records from both sources in 2020–2024. Duplicates across sources are possible.'},
  lawType:{title:'Disclosure vs. prohibition',desc:'Type of state election deepfake statute.',data:()=>count(LEG.filter(e=>e.type==='Statute'),e=>e.lawType),unit:'statutes',about:'From the NCSL statute table (31 states). Not limited to 2020–2024.'}
};

/* ---------- views ---------- */
const views={};
let carIdx=0,carTimer=null;

views.overview=()=>{
  const feat=FEAT;
  const enacted=LEG_SCOPE.filter(l=>l.outcome==='Enacted');
  return `<h1>Election deepfakes, 2020–2024</h1>
<p class="lede">A collection of documented election deepfakes and cheapfakes, alongside state legislation written in response. Browse incidents, compare laws, and explore patterns.</p>
<div class="note">Working draft. Incidents come from the WIRED AI Elections Project (2024) and a hand-compiled set of earlier cases from public reporting. 2020–2023 coverage is thin, so these numbers are not a complete count.</div>
<div class="stats">
 <div class="stat"><b>${INC.length}</b><span>incidents</span></div>
 <div class="stat"><b>${uniq(INC.map(e=>e.country)).length}</b><span>countries</span></div>
 <div class="stat"><b>${LEG_SCOPE.length}</b><span>bill records, 2020–2024</span></div>
 <div class="stat"><b>${uniq(enacted.map(e=>e.state)).length}</b><span>states with an enacted record</span></div>
</div>
<div class="cta">
 <a href="#incidents"><b>Browse incidents →</b>Search and filter by country, category and intent.</a>
 <a href="#legislation"><b>Browse legislation →</b>State bills and statutes with status and source links.</a>
 <a href="#visualizations"><b>Explore visualizations →</b>Charts with downloads and data tables.</a>
 <a href="#about"><b>About the collection →</b>Sources, method and limits.</a>
</div>
<h2>Featured examples</h2>
<div class="car" id="car">${carHtml(feat)}</div>`;
};
function carHtml(feat){
  const e=feat[carIdx%feat.length];
  return `<div class="meta"><span class="pill">${esc(e.country)}</span> <span class="pill">${esc(e.category)}</span></div>
  <h3>${esc(e.title)}</h3>
  <p>Deceptive intent: <span class="pill ${esc(e.deceptive)}">${esc(e.deceptive)}</span></p>
  <div class="bar"><button data-car="-1">← Previous</button><span>${carIdx%feat.length+1} / ${feat.length}</span><button data-car="1">Next →</button><span class="sp"></span><button data-open="${esc(e.id)}">View details</button></div>`;
}

const IS={q:'',country:'',category:'',deceptive:'',sort:'newest',page:1};
views.incidents=()=>{
  const sel=(id,label,vals,cur)=>`<div><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${vals.map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`;
  return `<h1>Browse incidents</h1>
<div class="filters">
 <div><label for="iq">Search titles</label><input id="iq" placeholder="Search" value="${esc(IS.q)}"></div>
 ${sel('ic','Country',uniq(INC.map(e=>e.country)),IS.country)}
 ${sel('ik','Category',uniq(INC.map(e=>e.category)),IS.category)}
 ${sel('id','Deceptive intent',['Yes','No','Unclear'],IS.deceptive)}
 <div><label for="is">Sort by</label><select id="is">${[['newest','Newest first'],['title','Title A–Z'],['country','Country'],['category','Category']].map(o=>`<option value="${o[0]}" ${IS.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
</div>
<div id="ilist"></div>`;
};
function incList(){
  let r=INC.filter(e=>(!IS.q||(e.title+e.country+e.category+(e.cheapfake||'')).toLowerCase().includes(IS.q.toLowerCase()))&&(!IS.country||e.country===IS.country)&&(!IS.category||e.category===IS.category)&&(!IS.deceptive||e.deceptive===IS.deceptive));
  if(IS.sort==='newest')r.sort((a,b)=>String(b.date||b.year).localeCompare(String(a.date||a.year)));else r.sort((a,b)=>String(a[IS.sort]).localeCompare(String(b[IS.sort])));
  const per=12,pages=Math.max(1,Math.ceil(r.length/per));IS.page=Math.min(IS.page,pages);
  const s=r.slice((IS.page-1)*per,IS.page*per);
  $('#ilist').innerHTML=`<div class="bar"><b>${r.length} of ${INC.length} incidents</b><span class="sp"></span><button id="iclear">Clear filters</button></div>
  <div class="grid">${s.map(e=>`<article class="card"><div class="meta"><span>${esc(e.country)} · ${esc(e.date||e.year)}</span><span>${esc(e.source)}</span></div>
   <button class="title" data-open="${esc(e.id)}">${esc(e.title)}</button>
   <div><span class="pill">${esc(e.category)}</span> <span class="pill ${esc(e.deceptive)}">Deceptive: ${esc(e.deceptive)}</span></div>
   ${e.cheapfake?`<div class="meta">Method: ${esc(e.cheapfake)}</div>`:''}
   <div class="row"><button data-open="${esc(e.id)}">View details</button>${link(e.url,'Original source')}</div></article>`).join('')||'<p>No incidents match.</p>'}</div>
  <div class="pager"><button id="ip" ${IS.page<=1?'disabled':''}>Previous</button><span>Page ${IS.page} of ${pages}</span><button id="in" ${IS.page>=pages?'disabled':''}>Next</button></div>`;
}
function openInc(id){
  const e=INC.find(x=>x.id===id);if(!e)return;
  $('#dlgBody').innerHTML=`<h2 style="margin-top:0">${esc(e.title)}</h2><dl>
   <dt>Country</dt><dd>${esc(e.country)}</dd><dt>Category</dt><dd>${esc(e.category)}</dd>
   <dt>Deceptive intent</dt><dd>${esc(e.deceptive)}</dd><dt>Date</dt><dd>${esc(e.date||e.year)}</dd>
   <dt>Method</dt><dd>${esc(e.cheapfake||'Not recorded')}</dd><dt>Estimated cost</dt><dd>${esc(e.cost||'Not recorded')}</dd>
   ${e.note?`<dt>Notes</dt><dd>${esc(e.note)}</dd>`:''}<dt>Dataset</dt><dd>${esc(e.dataset)}</dd><dt>Source</dt><dd>${link(e.url,e.source||'Open source')}</dd></dl>
   <p class="note">Inclusion does not establish that the media is fake. Open the source to inspect it in context.</p>
   <button data-close>Close</button>`;
  $('#dlg').showModal();
}

const LS={q:'',state:'',outcome:'',source:'',type:'',from:2020,to:2024,undated:false,sort:'state',dir:1,page:1};
views.legislation=()=>{
  const sel=(id,label,vals,cur)=>`<div><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${vals.map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`;
  return `<h1>Browse legislation</h1>
<p class="lede">State bills and statutes on deepfakes in elections, from Public Citizen and NCSL. Default range is 2020–2024.</p>
<div class="filters">
 <div><label for="lq">Search</label><input id="lq" placeholder="State, bill, title or summary" value="${esc(LS.q)}"></div>
 ${sel('ls','State',uniq(LEG.map(e=>e.state)),LS.state)}
 ${sel('lo','Outcome',['Enacted','Passed','Pending','Vetoed','Failed'],LS.outcome)}
 ${sel('lsrc','Source',['NCSL','Public Citizen'],LS.source)}
 ${sel('lt','Record type',['Bill','Statute','Related AI bill'],LS.type)}
 <div><label for="lf">From year</label><input id="lf" type="number" min="2019" max="2026" value="${LS.from}"></div>
 <div><label for="lto">To year</label><input id="lto" type="number" min="2019" max="2026" value="${LS.to}"></div>
 <div><label>&nbsp;</label><label><input id="lu" type="checkbox" style="width:auto" ${LS.undated?'checked':''}> Include records with no year</label></div>
</div>
<div id="llist"></div>`;
};
function legList(){
  let r=LEG.filter(e=>{
    const y=e.year;const okY=y==null?LS.undated:(y>=LS.from&&y<=LS.to);
    return okY&&(!LS.state||e.state===LS.state)&&(!LS.outcome||e.outcome===LS.outcome)&&(!LS.source||e.source===LS.source)&&(!LS.type||e.type===LS.type)&&(!LS.q||[e.state,e.bill,e.title,e.summary,e.status].join(' ').toLowerCase().includes(LS.q.toLowerCase()));
  });
  r.sort((a,b)=>LS.dir*String(a[LS.sort]==null?'':a[LS.sort]).localeCompare(String(b[LS.sort]==null?'':b[LS.sort]),undefined,{numeric:true}));
  const per=25,pages=Math.max(1,Math.ceil(r.length/per));LS.page=Math.min(LS.page,pages);
  const s=r.slice((LS.page-1)*per,LS.page*per);
  const th=(k,l)=>`<th data-sort="${k}">${l}${LS.sort===k?(LS.dir>0?' ▲':' ▼'):''}</th>`;
  window.__legRows=r;
  $('#llist').innerHTML=`<div class="bar"><b>${r.length} of ${LEG.length} records</b><span class="sp"></span><button id="lcsv">Download CSV</button><button id="lclear">Reset filters</button></div>
  <div class="scroll"><table><thead><tr>${th('state','State')}${th('bill','Bill')}${th('title','Title')}${th('outcome','Outcome')}${th('year','Year')}${th('source','Source')}<th></th></tr></thead><tbody>
  ${s.map((e,i)=>`<tr><td>${esc(e.state)}</td><td>${safeUrl(e.url)?link(e.url,e.bill):esc(e.bill)}</td><td>${esc(e.title||e.lawType||'')}</td><td><span class="pill ${e.outcome}">${esc(e.outcome)}</span></td><td>${e.year||''}</td><td>${esc(e.source)}</td><td><button data-leg="${(LS.page-1)*per+i}">Details</button></td></tr>`).join('')||'<tr><td colspan="7">No records match.</td></tr>'}
  </tbody></table></div>
  <div class="pager"><button id="lp" ${LS.page<=1?'disabled':''}>Previous</button><span>Page ${LS.page} of ${pages}</span><button id="ln" ${LS.page>=pages?'disabled':''}>Next</button></div>`;
}
function openLeg(i){
  const e=window.__legRows[i];if(!e)return;
  $('#dlgBody').innerHTML=`<h2 style="margin-top:0">${esc(e.state)}: ${esc(e.bill)}</h2><dl>
  ${e.title?`<dt>Title</dt><dd>${esc(e.title)}</dd>`:''}
  <dt>Status</dt><dd>${esc(e.status)}</dd><dt>Outcome</dt><dd>${esc(e.outcome)}</dd><dt>Year</dt><dd>${e.year||'Not recorded'}</dd>
  ${e.lawType?`<dt>Statute type</dt><dd>${esc(e.lawType)}</dd>`:''}
  ${e.summary?`<dt>Summary</dt><dd>${esc(e.summary)}</dd>`:''}
  ${e.penalties?`<dt>Penalties</dt><dd>${esc(e.penalties)}</dd>`:''}
  <dt>Source</dt><dd>${esc(e.source)}</dd><dt>Bill text</dt><dd>${link(e.url,'Open official record')||'Not linked'}</dd></dl><button data-close>Close</button>`;
  $('#dlg').showModal();
}

const VS={mode:'count',orient:null};
views.visualizations=(chart)=>{
  if(chart&&CHARTS[chart])return chartPage(chart);
  return `<h1>Patterns in the collection</h1><p class="lede">Select a tile to examine the full chart, its definitions and the data behind it.</p>
  <div class="charts">${Object.entries(CHARTS).map(([k,c])=>{const d=c.data();return `<a class="tile" href="#visualizations?chart=${k}" style="text-decoration:none;color:inherit;display:block"><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>${hbars(d.slice(0,5),d.reduce((a,x)=>a+x[1],0),'count',false)}<small>${d.reduce((a,x)=>a+x[1],0)} ${c.unit} · Explore chart</small></a>`}).join('')}</div>`;
};
function hbars(d,total,mode,full){
  const max=Math.max(...d.map(x=>x[1]),1);
  return d.map(([k,v])=>`<div class="hb"><span>${esc(k)}</span><span class="t"><span class="f" style="display:block;width:${v/max*100}%"></span></span><span class="n">${mode==='pct'?(v/total*100).toFixed(1)+'%':v}</span></div>`).join('');
}
function chartPage(k){
  const c=CHARTS[k],d=c.data(),total=d.reduce((a,x)=>a+x[1],0);
  const orient=VS.orient||(c.vertical?'v':'h');
  const max=Math.max(...d.map(x=>x[1]),1);
  const body=orient==='h'?hbars(d,total,VS.mode):`<div class="vb">${d.map(([a,v])=>`<div><span>${VS.mode==='pct'?(v/total*100).toFixed(0)+'%':v}</span><i style="height:${v/max*85}%"></i><small>${esc(a)}</small></div>`).join('')}</div>`;
  return `<p><a href="#visualizations">← All visualizations</a></p><h1>${esc(c.title)}</h1><p class="lede">${esc(c.desc)}</p>
  <div class="bar"><button data-orient="h" class="${orient==='h'?'on':''}">Horizontal</button><button data-orient="v" class="${orient==='v'?'on':''}">Vertical</button>
  <button data-mode="count" class="${VS.mode==='count'?'on':''}">Count</button><button data-mode="pct" class="${VS.mode==='pct'?'on':''}">Percentage</button><span class="sp"></span><button data-csv="${k}">Download CSV</button></div>
  <div class="card">${body}<small>${total} ${c.unit} counted</small></div>
  <details class="card" style="margin-top:14px"><summary>About this chart</summary><p>${esc(c.about)}</p><p>Percentages are shares of the ${total} counted ${c.unit}. Figures describe collected records, not all events, and do not show how widely content spread or its effect on any election.</p></details>
  <details class="card" style="margin-top:14px"><summary>View data table</summary><table><thead><tr><th>Category</th><th>Count</th><th>Share</th></tr></thead><tbody>${d.map(([a,v])=>`<tr><td>${esc(a)}</td><td>${v}</td><td>${(v/total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></details>`;
}

views.about=()=>`<h1>About the collection</h1>
<p class="lede">This site tracks election-related deepfakes and cheapfakes and the state laws written in response, for the years 2020–2024.</p>
<h2>Sources</h2><ul>
<li><b>Incidents:</b> ${INC.filter(i=>i.dataset.startsWith('WIRED')).length} records from the WIRED AI Elections Project "Election Deepfakes Dataset" (2024 elections worldwide).</li>
<li><b>Incidents:</b> ${INC.filter(i=>!i.dataset.startsWith('WIRED')).length} earlier or additional cases compiled by hand from news reports, fact-checks and incident trackers (AI Incident Database, OECD AI Incidents Monitor, Full Fact, NPR and others). Each links to its source.</li>
<li><b>Legislation:</b> <a href="https://www.citizen.org/article/tracker-legislation-on-deepfakes-in-elections/" target="_blank" rel="noopener noreferrer">Public Citizen, Tracker: Legislation on Deepfakes in Elections</a> (${LEG.filter(l=>l.source==='Public Citizen').length} bill records).</li>
<li><b>Legislation:</b> <a href="https://www.ncsl.org/elections-and-campaigns/artificial-intelligence-ai-in-elections-and-campaigns" target="_blank" rel="noopener noreferrer">NCSL, Artificial Intelligence in Elections and Campaigns</a> (${LEG.filter(l=>l.source==='NCSL').length} records: 31 statutes plus 2024 and 2025 bill tables).</li></ul>
<h2>Method and limits</h2><ul>
<li>Outcome (Enacted, Vetoed, Failed, Passed, Pending) is derived from each source's status text.</li>
<li>Legislation year is the first year in the status text, or the NCSL table year. Records without a year are hidden unless you include them.</li>
<li>A bill on both sources appears twice. The collection is not a complete count of incidents or laws.</li>
<li>The sources include records after 2024. Change the year range on the Legislation page to see them.</li>
<li>2020–2023 incidents were gathered through a limited search, not a systematic database. Treat them as notable examples, not a count. Planned: the Political Deepfakes Incidents Database and AI Incident Database exports.</li>
<li>"Deceptive intent" for compiled cases is our reading of the reporting. "Unclear" is used where the creator's intent was not established.</li></ul>
<h2>Codebook</h2>
<div class="scroll"><table><thead><tr><th>Field</th><th>Applies to</th><th>Meaning</th></tr></thead><tbody>
<tr><td>country</td><td>Incident</td><td>Country where the incident took place.</td></tr>
<tr><td>category</td><td>Incident</td><td>Purpose of the use (Campaigning, Sow discord/confusion, Voting misinformation, and others).</td></tr>
<tr><td>deceptive</td><td>Incident</td><td>Whether the use was intended to deceive.</td></tr>
<tr><td>cheapfake</td><td>Incident</td><td>Low-tech method (for example stage actors or edited video).</td></tr>
<tr><td>cost</td><td>Incident</td><td>Estimated cost to produce the cheapfake equivalent.</td></tr>
<tr><td>outcome</td><td>Legislation</td><td>Derived outcome from the status text.</td></tr>
<tr><td>lawType</td><td>Statute</td><td>Disclosure or Prohibition (NCSL).</td></tr>
<tr><td>penalties</td><td>Statute</td><td>Civil, criminal, or both (NCSL).</td></tr></tbody></table></div>`;

/* ---------- router ---------- */
function csv(rows,head){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';return [head.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\n')}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function render(){
  clearInterval(carTimer);
  const h=location.hash.slice(1)||'overview';const [route,qs]=h.split('?');
  const r=views[route]?route:'overview';
  const chart=new URLSearchParams(qs||'').get('chart');
  $('#app').innerHTML=views[r](chart);
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===r));
  $('#nav').classList.remove('open');
  if(r==='incidents')incList();
  if(r==='legislation')legList();
  if(r==='overview')carTimer=setInterval(()=>{carIdx++;const c=$('#car');if(c)c.innerHTML=carHtml(FEAT)},7000);
  window.scrollTo(0,0);
  document.title=({overview:'Election Deepfakes Tracker',incidents:'Incidents',legislation:'Legislation',visualizations:'Visualizations',about:'About'}[r])+' | Election Deepfakes Tracker';
}
window.addEventListener('hashchange',render);
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');

document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='iq'){IS.q=t.value;IS.page=1;incList()}
  if(t.id==='lq'){LS.q=t.value;LS.page=1;legList()}
});
document.addEventListener('change',e=>{
  const t=e.target,m={ic:'country',ik:'category',id:'deceptive',is:'sort'};
  if(m[t.id]){IS[m[t.id]]=t.value;IS.page=1;incList()}
  const l={ls:'state',lo:'outcome',lsrc:'source',lt:'type'};
  if(l[t.id]){LS[l[t.id]]=t.value;LS.page=1;legList()}
  if(t.id==='lf'){LS.from=+t.value||2019;LS.page=1;legList()}
  if(t.id==='lto'){LS.to=+t.value||2026;LS.page=1;legList()}
  if(t.id==='lu'){LS.undated=t.checked;LS.page=1;legList()}
});
document.addEventListener('click',e=>{
  const t=e.target.closest('button,th');if(!t)return;
  const D=t.dataset;
  if(D.open)openInc(D.open);
  if(D.leg!=null&&D.leg!=='')openLeg(+D.leg-0);
  if('close' in D)$('#dlg').close();
  if(D.car){carIdx=(carIdx+ +D.car+5)%5;$('#car').innerHTML=carHtml(FEAT)}
  if(t.id==='ip'){IS.page--;incList()}if(t.id==='in'){IS.page++;incList()}
  if(t.id==='lp'){LS.page--;legList()}if(t.id==='ln'){LS.page++;legList()}
  if(t.id==='iclear'){Object.assign(IS,{q:'',country:'',category:'',deceptive:'',page:1});render()}
  if(t.id==='lclear'){Object.assign(LS,{q:'',state:'',outcome:'',source:'',type:'',from:2020,to:2024,undated:false,page:1});render()}
  if(D.sort){LS.dir=LS.sort===D.sort?-LS.dir:1;LS.sort=D.sort;legList()}
  if(D.mode){VS.mode=D.mode;render()}
  if(D.orient){VS.orient=D.orient;render()}
  if(D.csv){const c=CHARTS[D.csv];download(D.csv+'.csv',csv(c.data(),['category','count']))}
  if(t.id==='lcsv')download('legislation.csv',csv(window.__legRows.map(l=>[l.state,l.bill,l.title||'',l.outcome,l.status,l.year,l.source,l.url]),['state','bill','title','outcome','status','year','source','url']));
});
$('#dlg').addEventListener('click',e=>{if(e.target.id==='dlg')e.target.close()});
render();
})();
