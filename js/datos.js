// Pautado · Utilidades, datos musicales (compases, tonos, calidades), estado, guardado en el navegador y página de ejemplo.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const intIn=(v,a,b,d)=>Number.isInteger(v)&&v>=a&&v<=b?v:d;
const oneOf=(v,list,d)=>list.includes(v)?v:d;
const r2=v=>Math.round(v*100)/100;
const coarseMQ=matchMedia('(any-pointer: coarse)'), fineMQ=matchMedia('(any-pointer: fine)'), reduceMQ=matchMedia('(prefers-reduced-motion: reduce)'), dockMQ=matchMedia('(max-width: 920px)');
const smooth=()=>reduceMQ.matches?'auto':'smooth';
const sumD=a=>a.reduce((s,x)=>s+x.d,0);
let srT=0;
function say(t){ const el=$('#sr'); clearTimeout(srT); el.textContent=''; srT=setTimeout(()=>{el.textContent=t;},40); }
/* ---------- Datos musicales ---------- */
const LET=['C','D','E','F','G','A','B'], LAT=['Do','Re','Mi','Fa','Sol','La','Si'], PC=[0,2,4,5,7,9,11];
// 1 negra = 12 ticks, como en DandEtudeDuR. beat = pulso del metrónomo; beam = unidad de agrupación de las barras.
const SIGS={
  '4/4':{L:48,beat:12,beam:12,top:4,bot:4}, '3/4':{L:36,beat:12,beam:12,top:3,bot:4}, '2/4':{L:24,beat:12,beam:12,top:2,bot:4},
  '5/4':{L:60,beat:12,beam:12,top:5,bot:4}, '2/2':{L:48,beat:24,beam:12,top:2,bot:2},
  '6/8':{L:36,beat:18,beam:18,top:6,bot:8}, '12/8':{L:72,beat:18,beam:18,top:12,bot:8},
};
const KEYS=[['C',0,0,0],['G',4,0,1],['D',1,0,2],['A',5,0,3],['E',2,0,4],['B',6,0,5],['F#',3,1,6],['Gb',4,-1,-6],['Db',1,-1,-5],['Ab',5,-1,-4],['Eb',2,-1,-3],['Bb',6,-1,-2],['F',3,0,-1]].map(([k,r,a,n])=>({k,r,a,n}));
const KEYMAP={}; KEYS.forEach(k=>{KEYMAP[k.k]=k;});
const SHARP_ORDER=[3,0,4,1,5,2,6], FLAT_ORDER=[6,2,5,1,4,0,3];
const SHARP_POS=[38,35,39,36,33,37,34], FLAT_POS=[34,37,33,36,32,35,31]; // posición en clave de sol
function keyAlter(key,r){ if(key.n>0) return SHARP_ORDER.slice(0,key.n).includes(r)?1:0; if(key.n<0) return FLAT_ORDER.slice(0,-key.n).includes(r)?-1:0; return 0; }
// calidad: [clave, intervalos, claro, jazz, latino, nombre hablado, principal]
const QUAL=[
  ['',      [0,4,7],          '',        '',      '',        'mayor',1],
  ['m',     [0,3,7],          'm',       '−',     'm',       'menor',1],
  ['7',     [0,4,7,10],       '7',       '7',     '7',       'siete',1],
  ['maj7',  [0,4,7,11],       'maj7',    '△7',    '7M',      'séptima mayor',1],
  ['m7',    [0,3,7,10],       'm7',      '−7',    'm7',      'menor séptima',1],
  ['m7b5',  [0,3,6,10],       'm7♭5',    'ø7',    'm7(♭5)',  'semidisminuido',1],
  ['dim',   [0,3,6],          'dim',     '°',     '°',       'disminuido',1],
  ['dim7',  [0,3,6,9],        'dim7',    '°7',    '°7',      'disminuido séptima',1],
  ['sus4',  [0,5,7],          'sus4',    'sus4',  'sus4',    'cuarta suspendida',1],
  ['6',     [0,4,7,9],        '6',       '6',     '6',       'sexta',1],
  ['9',     [0,4,7,10,14],    '9',       '9',     '7(9)',    'novena',1],
  ['aug',   [0,4,8],          'aug',     '+',     '+',       'aumentado',1],
  ['sus2',  [0,2,7],          'sus2',    'sus2',  'sus2',    'segunda suspendida',0],
  ['7sus4', [0,5,7,10],       '7sus4',   '7sus4', '7sus4',   'siete con cuarta suspendida',0],
  ['m6',    [0,3,7,9],        'm6',      '−6',    'm6',      'menor sexta',0],
  ['mmaj7', [0,3,7,11],       'm(maj7)', '−△7',   'm(7M)',   'menor con séptima mayor',0],
  ['add9',  [0,4,7,14],       'add9',    'add9',  'add9',    'con novena añadida',0],
  ['69',    [0,4,7,9,14],     '6/9',     '6/9',   '6(9)',    'sexta y novena',0],
  ['maj9',  [0,4,7,11,14],    'maj9',    '△9',    '7M(9)',   'novena mayor',0],
  ['m9',    [0,3,7,10,14],    'm9',      '−9',    'm7(9)',   'menor novena',0],
  ['m11',   [0,3,7,10,14,17], 'm11',     '−11',   'm7(11)',  'menor once',0],
  ['7b9',   [0,4,7,10,13],    '7♭9',     '7♭9',   '7(♭9)',   'siete con novena bemol',0],
  ['7#9',   [0,4,7,10,15],    '7♯9',     '7♯9',   '7(♯9)',   'siete con novena sostenida',0],
  ['7#11',  [0,4,7,10,18],    '7♯11',    '7♯11',  '7(♯11)',  'siete con once sostenida',0],
  ['7#5',   [0,4,8,10],       '7♯5',     '7♯5',   '7(♯5)',   'siete con quinta aumentada',0],
  ['13',    [0,4,7,10,14,21], '13',      '13',    '7(13)',   'trece',0],
  ['7alt',  [0,4,10,13,15,20],'7alt',    '7alt',  '7alt',    'siete alterado',0],
];
const QM={}; QUAL.forEach(([k,iv,pop,jazz,lat,sayq,main])=>{QM[k]={k,iv,pop,jazz,lat,say:sayq,main};});
const FIGNAME={72:'redonda con puntillo',48:'redonda',36:'blanca con puntillo',24:'blanca',18:'negra con puntillo',12:'negra',9:'corchea con puntillo',6:'corchea',3:'semicorchea'};
const FIGS_DESC=[48,36,24,18,12,9,6,3];
const BASES=[48,24,12,6,3], DOTTED=[72,36,18,9];
const isCompound=sig=>SIGS[sig].beat===18; // 6/8 y 12/8: el pulso es la negra con puntillo
const baseOf=d=>DOTTED.includes(d)?d/1.5:d;
const isFig=d=>BASES.includes(d)||DOTTED.includes(d);
const withDot=(base,on)=>on&&base!==3&&BASES.includes(base)?base*1.5:base; // la semicorchea no lleva puntillo
const DLET={48:'w',24:'h',12:'q',6:'e',3:'s'};
/* ---------- Estado y guardado ---------- */
const LSKEY='pautado-v1', PAGES_MAX=300;
const DEF_SET={style:'pop',names:'us',simile:true,view:'grid',chords:true,melody:true,metro:false,loop:false,min:false,snd:'piano',msnd:'piano'};
let store={pages:[],cur:'',gone:[],set:{...DEF_SET}};
let P=null;
// cdot / ndot: el puntillo de la paleta de acordes y de notas es un interruptor que se mantiene; empieza activado en compás compuesto
const ed={cs:-1,ns:-1,rootMode:'add',bassMode:false,accTo:'root',cdur:48,ndur:12,cdot:false,ndot:false,moreQ:false,mb:0,moreF:false};
const hist=new Map();
let saveState='local';

function uid(){ let s=''; const a='abcdefghijklmnopqrstuvwxyz0123456789'; const r=new Uint8Array(12); crypto.getRandomValues(r); r.forEach(v=>{s+=a[v%36];}); return s; }
function newPage(title){ const t=Date.now(); return {id:uid(),title,sig:'4/4',bpm:100,key:'C',chords:[],notes:[],marks:[],created:t,updated:t}; }
function cleanChord(c){
  if(!isObj(c)) return null; const d=intIn(c.d,3,288,null); if(d===null||d%3) return null;
  if(c.nc===true) return {nc:true,d};
  const r=intIn(c.r,0,6,null); if(r===null) return null;
  const o={r,a:intIn(c.a,-2,2,0),q:typeof c.q==='string'&&has(QM,c.q)?c.q:'',d};
  if(isObj(c.b)){ const br=intIn(c.b.r,0,6,null); if(br!==null) o.b={r:br,a:intIn(c.b.a,-2,2,0)}; }
  return o;
}
function cleanNote(n){
  if(!isObj(n)) return null; const d=intIn(n.d,3,288,null); if(d===null||d%3) return null;
  const o={s:intIn(n.s,14,56,34),a:intIn(n.a,-2,2,0),d,rest:n.rest===true,tie:n.tie===true};
  return o;
}
// Signos de repetición y saltos de un compás: {b, rs, re, v, segno, coda, tocoda, fine, go, al}. Solo una marca por compás
// y un Segno, una Coda, un «Al Coda», un Fine y un salto (D.C. o D.S.) por página: si vienen repetidos, vale el primero.
const MARK_ONE=['segno','coda','tocoda','fine','go'];
function cleanMarks(list){
  const out=[], seen=new Set(), one=new Set();
  for(const m of Array.isArray(list)?list.slice(0,256):[]){
    if(!isObj(m)) continue; const b=intIn(m.b,0,255,null); if(b===null||seen.has(b)) continue;
    const o={b};
    if(m.rs===true) o.rs=true;
    if(m.re!==undefined){ const n=intIn(m.re,2,8,null); if(n!==null) o.re=n; }
    if(m.v!==undefined){ const n=intIn(m.v,1,4,null); if(n!==null) o.v=n; }
    ['segno','coda','tocoda','fine'].forEach(k=>{ if(m[k]===true) o[k]=true; });
    const go=oneOf(m.go,['dc','ds'],null); if(go){ o.go=go; o.al=oneOf(m.al,['','fine','coda'],''); }
    MARK_ONE.forEach(k=>{ if(!has(o,k)) return; if(one.has(k)){ delete o[k]; if(k==='go') delete o.al; } else one.add(k); });
    if(Object.keys(o).length>1){ out.push(o); seen.add(b); }
  }
  return out.sort((x,y)=>x.b-y.b);
}
function cleanPage(p){
  if(!isObj(p)||typeof p.id!=='string'||!/^[a-z0-9]{4,24}$/.test(p.id)) return null;
  const num=v=>Number.isFinite(v)&&v>0?v:Date.now();
  const o={id:p.id,title:typeof p.title==='string'?p.title.slice(0,80):'Sin título',
    sig:typeof p.sig==='string'&&has(SIGS,p.sig)?p.sig:'4/4',bpm:intIn(p.bpm,30,300,100),
    key:typeof p.key==='string'&&has(KEYMAP,p.key)?p.key:'C',
    chords:(Array.isArray(p.chords)?p.chords.slice(0,512):[]).map(cleanChord).filter(Boolean),
    notes:(Array.isArray(p.notes)?p.notes.slice(0,1024):[]).map(cleanNote).filter(Boolean),
    marks:cleanMarks(p.marks),
    created:num(p.created),updated:num(p.updated)};
  if(p.ex===true) o.ex=true; if(p.del===true) o.del=true;
  return o;
}
function cleanSet(s){
  const o={...DEF_SET}; if(!isObj(s)) return o;
  o.snd=oneOf(s.snd,INST_KEYS,'piano'); o.msnd=oneOf(s.msnd,INST_KEYS,'piano'); // INST_KEYS es de instrumentos.js: cleanSet solo se llama al arrancar
  o.style=oneOf(s.style,['pop','jazz','lat'],'pop'); o.names=oneOf(s.names,['us','lat'],'us'); o.view=oneOf(s.view,['grid','staff'],'grid');
  ['simile','chords','melody','metro','loop','min'].forEach(k=>{ if(typeof s[k]==='boolean') o[k]=s[k]; });
  return o;
}
function load(){
  let raw=null; try{ raw=JSON.parse(localStorage.getItem(LSKEY)||'null'); }catch(e){ raw=null; }
  if(isObj(raw)){
    store.pages=(Array.isArray(raw.pages)?raw.pages.slice(0,PAGES_MAX):[]).map(cleanPage).filter(p=>p&&!p.del);
    store.gone=(Array.isArray(raw.gone)?raw.gone:[]).filter(x=>typeof x==='string'&&/^[a-z0-9]{4,24}$/.test(x)).slice(-300);
    store.set=cleanSet(raw.set); store.cur=typeof raw.cur==='string'?raw.cur:'';
  }
  if(!store.pages.length) store.pages=[examplePage()];
  if(!store.pages.some(p=>p.id===store.cur)) store.cur=store.pages[0].id;
}
let saveT=0;
function saveLocal(){
  clearTimeout(saveT); saveT=0;
  try{ localStorage.setItem(LSKEY,JSON.stringify({pages:store.pages,cur:store.cur,gone:store.gone,set:store.set})); if(saveState==='fail') saveState='local'; }
  catch(e){ saveState=DB.ready?'cloud':'fail'; }
  renderSaveState();
}
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(saveLocal,250); }
function touch(p){ p.updated=Date.now(); delete p.ex; cloudQueue(p.id); }
/* ---------- Página de ejemplo ---------- */
function examplePage(){
  const p=newPage('Ejemplo · ii–V–I en Do'); p.ex=true; p.bpm=96;
  p.chords=parseChordBars('| Dm7 | G7 | Cmaj7 | Cmaj7 | Em7 A7 | Dm7 G7 | C6 | C6 |',SIGS['4/4'],48);
  p.notes=parseMelody('F4q A4q C5q E5q | D5h B4q G4q | E4q G4q B4h~ | B4h rh | G4e A4e B4q C#5q E5q | D5q C5q B4q G4q | A4h G4q E4q | C4w');
  return p;
}
