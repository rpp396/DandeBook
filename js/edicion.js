// Pautado · Edición con deshacer, operaciones sobre acordes y notas, paleta y repintado general.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Edición ---------- */
function H(){ let h=hist.get(P.id); if(!h){ h={u:[],r:[]}; hist.set(P.id,h); } return h; }
function snap(){ return JSON.stringify({chords:P.chords,notes:P.notes,marks:P.marks,sig:P.sig,key:P.key,cs:ed.cs,ns:ed.ns}); }
function restore(s){ const o=JSON.parse(s); P.chords=o.chords; P.notes=o.notes; P.marks=o.marks; P.sig=o.sig; P.key=o.key; ed.cs=o.cs; ed.ns=o.ns; }
function change(fn,msg){ const before=snap(), cs=ed.cs, ns=ed.ns; const ok=fn(); if(ok!==false&&(cs!==ed.cs||ns!==ed.ns)) syncMB(); if(ok===false) return; const h=H(); h.u.push(before); if(h.u.length>100) h.u.shift(); h.r.length=0; commit(); if(msg) say(typeof msg==='function'?msg():msg); }
function commit(){ clampSel(); touch(P); renderAll(); saveSoon(); revealSel(); }
function revealSel(){
  const el=store.set.view==='grid'?($(`#grid .seg.sel`)||$('#grid .seg.caret-before')):$('#staff .nt.sel')||$('#staff .caret');
  if(!el) return; const r=el.getBoundingClientRect(); const dock=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH'))||0;
  if(r.top<8||r.bottom>innerHeight-dock-8) el.scrollIntoView({block:'nearest',behavior:smooth()});
}
function undo(){ const h=H(); if(!h.u.length) return; h.r.push(snap()); restore(h.u.pop()); commit(); say('Deshecho'); }
function redo(){ const h=H(); if(!h.r.length) return; h.u.push(snap()); restore(h.r.pop()); commit(); say('Rehecho'); }
function clampSel(){ ed.cs=Math.max(-1,Math.min(ed.cs,P.chords.length-1)); ed.ns=Math.max(-1,Math.min(ed.ns,P.notes.length-1)); }
const selC=()=>ed.cs>=0?P.chords[ed.cs]:null;
// ed.mb = compás al que se aplican las marcas de forma: el de lo marcado (o el compás tocado en la grilla)
function syncMB(){ const L=SIGS[P.sig].L; ed.mb=store.set.view==='grid'?(ed.cs>=0?chordBarOf(ed.cs):0):(ed.ns>=0?Math.floor(startOf(P.notes,ed.ns)/L):0); }
const selN=()=>ed.ns>=0?P.notes[ed.ns]:null;
// Duraciones por defecto al abrir una página o cambiar de compás: acordes de un compás; notas de un pulso (negra, o negra con puntillo en compuesto)
function meterDefaults(){ const comp=isCompound(P.sig); ed.cdot=ed.ndot=comp; ed.cdur=SIGS[P.sig].L; ed.ndur=comp?18:12; }
// Al elegir un acorde o una nota, el puntillo sigue a su figura (salvo un compás entero o una semicorchea, que no dicen nada del puntillo)
function syncDot(kind){ const it=kind==='c'?selC():selN(); if(!it||!isFig(it.d)||it.d===SIGS[P.sig].L||it.d===3) return; ed[kind==='c'?'cdot':'ndot']=DOTTED.includes(it.d); }
const dotApply=(d,on)=>isFig(d)?withDot(baseOf(d),on):d;
const dotSay=(on,d)=>(on?'Puntillo activado':'Puntillo desactivado')+(d?`: ${FIGNAME[d]||beatsSay(d)}`:'');

function insertChord(c){ change(()=>{ c.d=c.d||ed.cdur; marksShift(ed.cs+1,c.d); P.chords.splice(ed.cs+1,0,c); ed.cs++; },()=>`Añadido ${chordSay(c)}`); }
function rootTap(r){
  const c=selC();
  if(ed.bassMode&&c&&!c.nc){ change(()=>{ c.b={r,a:0}; ed.bassMode=false; ed.accTo='bass'; },()=>`Bajo en ${rootSay(r,0)}`); return; }
  ed.bassMode=false;
  if(ed.rootMode==='change'&&c&&!c.nc){ change(()=>{ keepInv(c,()=>{ c.r=r; c.a=0; }); ed.accTo='root'; },()=>`Cambiado a ${chordSay(c)}`); return; }
  ed.accTo='root'; insertChord({r,a:0,q:'',d:ed.cdur});
}
function chordAcc(a){ const c=selC(); if(!c||c.nc) return; change(()=>{ if(ed.accTo==='bass'&&c.b) c.b.a=a; else keepInv(c,()=>{ c.a=a; }); },()=>chordSay(c)); }
function chordQual(q){ const c=selC(); if(!c||c.nc) return; change(()=>{ keepInv(c,()=>{ c.q=q; }); },()=>chordSay(c)); }
function chordInv(k){ const c=selC(); if(!c||c.nc) return; if(k>0&&!invBass(c,k)) return; change(()=>{ setInv(c,k); ed.accTo='root'; ed.bassMode=false; },()=>chordSay(c)); }
function chordDur(d){ const c=selC(); ed.cdur=d; if(!c){ renderPalette(); return; } change(()=>{ c.d=d; },()=>`${chordSay(c)}, ${beatsSay(d)}`); }
function chordFig(base){ chordDur(withDot(base,ed.cdot)); }
function chordDot(){ ed.cdot=!ed.cdot; const c=selC();
  if(!c){ ed.cdur=dotApply(ed.cdur,ed.cdot); renderPalette(); say(dotSay(ed.cdot)); return; }
  const d=dotApply(c.d,ed.cdot); if(d===c.d){ renderPalette(); say(dotSay(ed.cdot)); return; }
  change(()=>{ c.d=d; ed.cdur=d; },()=>`${dotSay(ed.cdot)}, ${beatsSay(d)}`); }
function delChord(){ if(ed.cs<0) return; const c=selC(); change(()=>{ marksCut(ed.cs); P.chords.splice(ed.cs,1); ed.cs--; },()=>`Borrado ${chordSay(c)}`); }
function chordSemi(dir){ const c=selC(); if(!c||c.nc) return;
  change(()=>{ const k=invOf(c); const n=semiShift(c.r,c.a,dir); c.r=n.r; c.a=n.a;
    if(k>0) setInv(c,k); else if(c.b){ const b=semiShift(c.b.r,c.b.a,dir); c.b={r:b.r,a:b.a}; } },()=>chordSay(c)); }
function selectChord(i,focus,bar){ ed.cs=Math.max(-1,Math.min(i,P.chords.length-1)); syncMB(); if(bar!=null) ed.mb=bar; ed.bassMode=false; ed.accTo='root'; syncDot('c'); markGrid(); renderPalette(); renderSelLine(); if(focus) focusSel(); }

function noteRef(){ const n=selN()||P.notes.slice().reverse().find(x=>!x.rest); return n?n.s:34; }
function insertNote(n,at){ change(()=>{ const i=at==null?ed.ns+1:at; P.notes.splice(i,0,n); ed.ns=i; },()=>n.rest?`Silencio de ${FIGNAME[n.d]}`:`${noteSay(n.s,n.a)}, ${FIGNAME[n.d]}`); }
function noteByLetter(r){ const ref=noteRef(); let best=null; for(let o=1;o<=7;o++){ const s=o*7+r; if(s<23||s>46) continue; if(best===null||Math.abs(s-ref)<Math.abs(best-ref)) best=s; } insertNote({s:best,a:keyAlter(KEYMAP[P.key],r),d:ed.ndur,rest:false,tie:false}); }
function noteFig(base){ const d=withDot(base,ed.ndot); const n=selN(); ed.ndur=d; if(!n){ renderPalette(); return; } change(()=>{ n.d=d; },()=>FIGNAME[d]); }
function noteDot(){ ed.ndot=!ed.ndot; const n=selN();
  if(!n){ ed.ndur=dotApply(ed.ndur,ed.ndot); renderPalette(); say(dotSay(ed.ndot)); return; }
  const d=dotApply(n.d,ed.ndot); if(d===n.d){ renderPalette(); say(dotSay(ed.ndot)); return; }
  change(()=>{ n.d=d; ed.ndur=d; },()=>dotSay(ed.ndot,d)); }
function noteRest(){ const n=selN(); if(!n) return; change(()=>{ n.rest=!n.rest; if(n.rest) n.tie=false; },()=>n.rest?'Silencio':noteSay(n.s,n.a)); }
function noteTie(){ const n=selN(); if(!n||n.rest) return;
  change(()=>{ if(n.tie){ n.tie=false; return; } const nx=P.notes[ed.ns+1];
    if(nx&&!nx.rest){ nx.s=n.s; nx.a=n.a; n.tie=true; }
    else { P.notes.splice(ed.ns+1,0,{s:n.s,a:n.a,d:ed.ndur,rest:false,tie:false}); n.tie=true; ed.ns++; } },()=>n.tie?'Ligada a la siguiente':'Sin ligadura'); }
function noteStep(v){ const n=selN(); if(!n||n.rest) return; const s=n.s+v; if(s<14||s>56) return; change(()=>{ n.s=s; n.a=keyAlter(KEYMAP[P.key],((s%7)+7)%7); fixTies(); },()=>noteSay(n.s,n.a)); }
function noteOct(v){ const n=selN(); if(!n||n.rest) return; const s=n.s+7*v; if(s<14||s>56) return; change(()=>{ n.s=s; fixTies(); },()=>noteSay(n.s,n.a)); }
function noteAcc(a){ const n=selN(); if(!n||n.rest) return; change(()=>{ n.a=a; fixTies(); },()=>noteSay(n.s,n.a)); }
function noteAlter(v){ const n=selN(); if(!n||n.rest) return; const a=n.a+v; if(a<-2||a>2) return; change(()=>{ n.a=a; fixTies(); },()=>noteSay(n.s,n.a)); }
function fixTies(){ for(let i=0;i<P.notes.length-1;i++){ const n=P.notes[i], nx=P.notes[i+1]; if(n.tie&&!n.rest&&!nx.rest){ nx.s=n.s; nx.a=n.a; } } } // las ligadas siguen a la primera
function delNote(){ if(ed.ns<0) return; change(()=>{ P.notes.splice(ed.ns,1); if(ed.ns>0&&P.notes[ed.ns-1]&&!P.notes[ed.ns]) P.notes[ed.ns-1].tie=false; ed.ns--; },'Nota borrada'); }
function selectNote(i){ ed.ns=Math.max(-1,Math.min(i,P.notes.length-1)); syncMB(); syncDot('n'); markStaff(); renderStaffCaretOnly(); renderPalette(); renderSelLine(); }
function renderStaffCaretOnly(){ renderStaff(); }
/* ---------- Forma ---------- */
// Las marcas van fijas al número de compás; al meter o quitar compases enteros en medio de los acordes, las de detrás se mueven con ellos
function marksShift(i,d){ const L=SIGS[P.sig].L, t=startOf(P.chords,i); if(i>=P.chords.length||t%L||d%L) return; const at=t/L, k=d/L;
  P.marks=P.marks.map(m=>m.b>=at?{...m,b:m.b+k}:m).filter(m=>m.b<=255); }
function marksCut(i){ const L=SIGS[P.sig].L, t=startOf(P.chords,i), d=P.chords[i].d; if(i>=P.chords.length-1||t%L||d%L) return; const at=t/L, k=d/L;
  P.marks=P.marks.filter(m=>m.b<at||m.b>=at+k).map(m=>m.b>=at+k?{...m,b:m.b-k}:m); }
// Cambia la marca del compás ed.mb (o la crea) y quita las que se quedan vacías
function editMark(fn){ const b=ed.mb; let o=P.marks.find(m=>m.b===b); if(!o){ o={b}; P.marks.push(o); } fn(o); P.marks=P.marks.filter(m=>Object.keys(m).length>1).sort((x,y)=>x.b-y.b); }
const dropKeys=(o,...ks)=>ks.forEach(k=>{ Reflect.deleteProperty(o,k); });
const markSayBar=()=>{ const m=markAt(P,ed.mb); return `Compás ${ed.mb+1}: ${m?markSay(m):'sin marcas'}`; };
// Segno, Coda, Al Coda y Fine van una vez por página: ponerlos en un compás los quita del anterior
function markToggle(k){ const on=!markAt(P,ed.mb)?.[k];
  change(()=>{ if(on&&MARK_ONE.includes(k)) P.marks.forEach(m=>dropKeys(m,k)); editMark(o=>{ if(on) o[k]=k==='re'?2:true; else dropKeys(o,k); }); },markSayBar); }
function markTimes(){ const m=markAt(P,ed.mb); if(!m?.re) return; change(()=>{ editMark(o=>{ o.re=o.re>=8?2:o.re+1; }); },markSayBar); }
function markVolta(n){ const on=markAt(P,ed.mb)?.v!==n; change(()=>{ editMark(o=>{ if(on) o.v=n; else dropKeys(o,'v'); }); },markSayBar); }
function markJump(go){ const on=markAt(P,ed.mb)?.go!==go;
  change(()=>{ P.marks.forEach(m=>dropKeys(m,'go','al')); editMark(o=>{ if(on){ o.go=go; o.al=''; } }); },markSayBar); }
// Marcas escritas en «Escribir acordes»: b es relativo al primer compás escrito (base)
function mergeMarks(list,base){
  list.forEach(x=>{ const b=base+x.b; if(b>255) return;
    MARK_ONE.forEach(k=>{ if(has(x,k)) P.marks.forEach(m=>{ dropKeys(m,k); if(k==='go') dropKeys(m,'al'); }); });
    let o=P.marks.find(m=>m.b===b); if(!o){ o={b}; P.marks.push(o); } Object.assign(o,x,{b}); });
  P.marks=cleanMarks(P.marks);
}
function markAl(al){ const m=markAt(P,ed.mb); if(!m?.go) return; change(()=>{ editMark(o=>{ o.al=o.al===al?'':al; }); },markSayBar); }
function repIcon(start){ // barra de repetición: gruesa, fina y dos puntos
  const th=start?'<rect x="0" y="0" width="5" height="40"/><rect x="8" y="0" width="2" height="40"/>':'<rect x="17" y="0" width="5" height="40"/><rect x="12" y="0" width="2" height="40"/>';
  const cx=start?15:7; return `<svg class="ric" viewBox="0 0 22 40" aria-hidden="true">${th}<circle cx="${cx}" cy="15" r="2.6"/><circle cx="${cx}" cy="25" r="2.6"/></svg>`; }
function buildForms(){
  const k=(act,extra,lab,inner,cls='')=>`<button type="button" class="k${cls}" data-act="${act}" ${extra} aria-pressed="false" aria-label="${lab}">${inner}</button>`;
  $('#forms').innerHTML=
    k('mark','data-k="rs"','Inicio de repetición',repIcon(true))+k('mark','data-k="re"','Fin de repetición',repIcon(false))+
    `<button type="button" class="k" data-act="times" aria-label="Vueltas">×2</button>`+
    [1,2,3].map(n=>k('volta',`data-n="${n}"`,`Casilla ${n}`,`${n}.`)).join('')+
    k('mark','data-k="segno"','Segno',markSVG('segno'))+k('mark','data-k="coda"','Coda',markSVG('coda'))+
    k('mark','data-k="tocoda"','Al Coda','Al Coda',' w2')+k('mark','data-k="fine"','Fine','Fine',' w2')+
    k('jump','data-go="dc"','Da capo','D.C.')+k('jump','data-go="ds"','Dal segno','D.S.')+
    k('al','data-al="fine"','Al fine','al Fine',' w2')+k('al','data-al="coda"','Al coda','al Coda',' w2');
}
function renderForms(){
  const open=!!ed.moreF, f=$('#moreF'); $('#forms').hidden=!open; f.setAttribute('aria-expanded',open?'true':'false');
  ed.mb=Math.max(0,Math.min(ed.mb||0,255)); const m=markAt(P,ed.mb);
  f.textContent=`${open?'Ocultar repeticiones y saltos':'Repeticiones y saltos'} · compás ${ed.mb+1}`;
  if(!open) return;
  $$('#forms [data-act="mark"]').forEach(el=>setPressed(el,!!m?.[el.dataset.k]));
  $$('#forms [data-act="volta"]').forEach(el=>setPressed(el,m?.v===+el.dataset.n));
  $$('#forms [data-act="jump"]').forEach(el=>setPressed(el,m?.go===el.dataset.go));
  $$('#forms [data-act="al"]').forEach(el=>{ el.disabled=!m?.go; setPressed(el,!!m?.go&&m.al===el.dataset.al); });
  const t=$('#forms [data-act="times"]'); t.disabled=!m?.re; t.textContent=`×${m?.re||2}`; t.setAttribute('aria-label',`Vueltas: ${m?.re||2}`);
}
/* ---------- Paleta ---------- */
function figIcon(base,dot){
  let s='', w=250;
  if(base===48) s=`<use href="#g-nhW" transform="translate(40 240)"/>`;
  else { const hk=base===24?'nhH':'nhB'; s=`<use href="#g-${hk}" transform="translate(30 360)"/>`; const sx=30+133.6-6;
    s+=`<rect x="${sx-6}" y="40" width="12" height="${360-29-40}"/>`; if(base===6) s+=`<use href="#g-f8u" transform="translate(${sx-6} 40)"/>`; if(base===3) s+=`<use href="#g-f16u" transform="translate(${sx-6} 40)"/>`; }
  if(dot){ s+=`<use href="#g-dot" transform="translate(${base===48?215:205} ${base===48?240:345})"/>`; w=290; }
  return `<svg class="fic" viewBox="0 0 ${w} 440" aria-hidden="true">${s}</svg>`;
}
function buildPalette(){
  $('#roots').innerHTML=LET.map((n,r)=>`<button type="button" class="k hand" data-act="root" data-r="${r}"></button>`).join('');
  $('#quals').innerHTML=QUAL.map(q=>`<button type="button" class="k${q[0]===''?' word':''}${q[6]?'':' qx'}" data-act="qual" data-q="${q[0]}" aria-label="${esc(q[5])}" aria-pressed="false"></button>`).join('');
  $('#durs').innerHTML=`<button type="button" class="k" data-act="dur" data-d="bar" aria-pressed="false" aria-label="Compás entero"><span class="sub">Compás</span></button>`+
    [48,24,12,6].map(d=>`<button type="button" class="k" data-act="dur" data-d="${d}" aria-pressed="false" aria-label="${FIGNAME[d]}">${figIcon(d)}</button>`).join('')+
    `<button type="button" class="k" data-act="dot" aria-pressed="false" aria-label="Puntillo"><svg class="fic" viewBox="0 0 120 440" aria-hidden="true"><circle cx="60" cy="300" r="34"/></svg></button>`;
  $('#figs').innerHTML=[48,24,12,6,3].map(d=>`<button type="button" class="k" data-act="fig" data-d="${d}" aria-pressed="false" aria-label="${FIGNAME[d]}">${figIcon(d)}</button>`).join('')+
    `<button type="button" class="k" data-act="ndot" aria-pressed="false" aria-label="Puntillo"><svg class="fic" viewBox="0 0 120 440" aria-hidden="true"><circle cx="60" cy="300" r="34"/></svg></button>`;
}
function relabelPalette(){
  $$('#roots .k').forEach(el=>{ const r=+el.dataset.r; el.textContent=(store.set.names==='lat'?LAT:LET)[r]; el.setAttribute('aria-label',LAT[r]+(store.set.names==='us'?` (${LET[r]})`:'')); });
  $$('#quals .k').forEach(el=>{ const q=el.dataset.q; const s=sfx(q); el.innerHTML=s?`<span class="ch"><span class="sf">${symHTML(s)}</span></span>`:'mayor'; });
}
function setPressed(el,v){ el.setAttribute('aria-pressed',v?'true':'false'); }
function renderPalette(){
  const grid=store.set.view==='grid'; $('#palGrid').hidden=!grid; $('#palStaff').hidden=grid;
  const h=H(); $('[data-act="undo"]').disabled=!h.u.length; $('[data-act="redo"]').disabled=!h.r.length;
  const ro=$('#readout');
  if(grid){
    const c=selC(); const chord=c&&!c.nc;
    $('[data-act="del"]').disabled=!c;
    const tgtA=c&&!c.nc?(ed.accTo==='bass'&&c.b?c.b.a:c.a):null;
    $$('[data-act="acc"]').forEach(el=>{ el.disabled=!chord; setPressed(el,chord&&+el.dataset.a===tgtA); el.setAttribute('aria-label',{'-1':'Bemol','0':'Natural','1':'Sostenido'}[el.dataset.a]+(ed.accTo==='bass'&&c&&c.b?' del bajo':'')); });
    const bass=$('[data-act="bass"]'); bass.disabled=!chord; setPressed(bass,ed.bassMode);
    const ik=chord?invOf(c):null;
    $$('[data-act="inv"]').forEach(el=>{
      const k=+el.dataset.k, b=chord?(k===0?{r:c.r,a:c.a}:invBass(c,k)):null, ib=el.querySelector('.ib');
      el.disabled=!b; setPressed(el,!!b&&ik===k);
      if(b){ const n=rootName(b.r,b.a); ib.textContent=(k?'/':'')+n.n+n.acc; el.setAttribute('aria-label',`${cap(INV_NAME[k])}: ${k?'bajo en ':''}${rootSay(b.r,b.a)}${k?'':' en el bajo'}`); }
      else { ib.textContent=''; el.setAttribute('aria-label',cap(INV_NAME[k])); }
    });
    const rm=$('[data-act="rmode"]'); rm.disabled=!chord; setPressed(rm,ed.rootMode==='change');
    $$('#roots .k').forEach(el=>{ const r=+el.dataset.r; el.removeAttribute('aria-pressed'); if(chord&&(ed.bassMode||ed.rootMode==='change')) setPressed(el,ed.bassMode?(c.b&&c.b.r===r):c.r===r); });
    $$('#quals .k').forEach(el=>{ el.disabled=!chord; setPressed(el,chord&&c.q===el.dataset.q); });
    const L=SIGS[P.sig].L, d=c?c.d:ed.cdur, base=DOTTED.includes(d)?d/1.5:d;
    $$('[data-act="dur"]').forEach(el=>{ const v=el.dataset.d==='bar'?L:+el.dataset.d; setPressed(el,el.dataset.d==='bar'?d===L:(base===v&&!(d===L&&L!==48))); });
    setPressed($('[data-act="dot"]'),ed.cdot);
    $('#quals').classList.toggle('open',ed.moreQ||(chord&&!QM[c.q].main)); $('#moreQ').setAttribute('aria-expanded',$('#quals').classList.contains('open')?'true':'false');
    $('#moreQ').textContent=$('#quals').classList.contains('open')?'Menos calidades':'Más calidades';
    if(c){ const b=chordBarOf(ed.cs);
      ro.innerHTML=`<span class="big">${chordHTML(c)}</span><span class="say"><b>${esc(cap(chordSay(c)))}</b>${esc(beatsSay(c.d))} · compás ${b+1}${ed.bassMode?' · toca la nota del bajo':''}</span>`; }
    else ro.innerHTML=`<span class="big mute">${P.chords.length?'Lo nuevo va al principio':'Toca una nota para empezar'}</span>`;
  } else {
    const n=selN(); $('[data-act="del"]').disabled=!n;
    const d=n?n.d:ed.ndur, base=DOTTED.includes(d)?d/1.5:d;
    $$('[data-act="fig"]').forEach(el=>setPressed(el,+el.dataset.d===base));
    setPressed($('[data-act="ndot"]'),ed.ndot);
    const isNote=n&&!n.rest;
    setPressed($('[data-act="rest"]'),!!(n&&n.rest)); $('[data-act="rest"]').disabled=!n;
    setPressed($('[data-act="tie"]'),!!(n&&n.tie)); $('[data-act="tie"]').disabled=!isNote;
    $$('[data-act="nacc"]').forEach(el=>{ el.disabled=!isNote; setPressed(el,isNote&&n.a===+el.dataset.a); });
    $$('[data-act="step"],[data-act="oct"]').forEach(el=>{ el.disabled=!isNote; });
    if(n){ const b=Math.floor(startOf(P.notes,ed.ns)/SIGS[P.sig].L);
      ro.innerHTML=`<span class="say"><b>${n.rest?'Silencio':esc(noteName(n.s,n.a))+' · '+esc(noteSay(n.s,n.a))}</b>${esc(cap(FIGNAME[n.d]||beatsSay(n.d)))}${n.tie?' · ligada':''} · compás ${b+1}</span>`; }
    else ro.innerHTML=`<span class="big mute">${P.notes.length?'Lo nuevo va al principio':'Toca el pentagrama para empezar'}</span>`;
  }
  renderForms();
  const pal=$('#palette'); pal.classList.toggle('min',!!store.set.min); const mb=$('[data-act="min"]');
  mb.setAttribute('aria-expanded',store.set.min?'false':'true'); mb.setAttribute('aria-label',store.set.min?'Mostrar la paleta':'Plegar la paleta');
  mb.querySelector('path').setAttribute('d',store.set.min?'m6 15 6-6 6 6':'m6 9 6 6 6-6');
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function chordBarOf(i){ return Math.floor(startOf(P.chords,i)/SIGS[P.sig].L); }
function renderSelLine(){
  const el=$('#selLine'); let t='';
  if(store.set.view==='grid'){ const c=selC(); t=c?`Lo siguiente se añade después de ${chordSay(c)} (compás ${chordBarOf(ed.cs)+1}).`:(P.chords.length?'Lo siguiente se añade al principio.':'La grilla está vacía: toca una nota en la paleta o escribe los acordes.'); }
  else { const n=selN(); t=n?`Marcada: ${n.rest?'silencio de '+(FIGNAME[n.d]||'figura'):noteSay(n.s,n.a)+', '+(FIGNAME[n.d]||'')} (compás ${Math.floor(startOf(P.notes,ed.ns)/SIGS[P.sig].L)+1}). Lo siguiente va detrás.`:(P.notes.length?'Lo siguiente va al principio.':'Sin melodía todavía: toca el pentagrama para poner la primera nota.'); }
  el.textContent=t;
}
/* ---------- Pintar todo ---------- */
function renderSaveState(){ const el=$('#saveState'); el.className='save'+(saveState==='cloud'?' cloud':saveState==='fail'?' fail':''); el.textContent=saveState==='cloud'?'Guardado en tu cuenta':saveState==='fail'?'No se puede guardar en este navegador':'Guardado en este navegador'; }
function renderPages(){
  const sel=$('#pageSel'); const list=store.pages.slice().sort((a,b)=>b.updated-a.updated);
  sel.innerHTML=list.map(p=>`<option value="${p.id}">${esc(p.title||'Sin título')}</option>`).join(''); sel.value=P.id;
  $('#bDel').disabled=false;
}
function renderHead(){
  const t=$('#pTitle'); if(document.activeElement!==t) t.value=P.title;
  $('#pSig').value=P.sig; $('#pKey').value=P.key; $('#bpm').value=P.bpm; $('#exChip').hidden=!P.ex;
  const ln=$('#linkNote'), showLn=!!linkNote&&linkNote.id===P.id; ln.hidden=!showLn; if(showLn){ ln.textContent=linkNote.t; ln.classList.toggle('err',linkNote.err); }
  const sg=SIGS[P.sig]; const base=sg.beat===18?12:sg.beat; $('#tGlyph').innerHTML=figIcon(base,sg.beat===18);
  $('#tGlyph').title=(sg.beat===18?'Negra con puntillo':sg.beat===24?'Blanca':'Negra')+' por minuto';
  $('#bpm').setAttribute('aria-label',`Tempo: ${sg.beat===18?'negras con puntillo':sg.beat===24?'blancas':'negras'} por minuto`);
  const grid=store.set.view==='grid';
  setPressed($('#vGrid'),grid); setPressed($('#vStaff'),!grid);
  $('#grid').hidden=!grid; $('#staff').hidden=grid; $('#wForm').hidden=!grid; $('#staffHint').hidden=grid;
  ['oChords:chords','oMelody:melody','oMetro:metro','oLoop:loop'].forEach(x=>{ const [id,k]=x.split(':'); setPressed($('#'+id),store.set[k]); });
}
function renderAll(){
  clampSel(); renderHead();
  if(store.set.view==='grid') renderGrid(); else renderStaff();
  renderPalette(); renderSelLine(); renderPages(); renderSaveState();
  A.cc=A.cn=-9;
}
function afterSwitch(keepSel){
  P=store.pages.find(p=>p.id===store.cur)||store.pages[0]; store.cur=P.id;
  if(!keepSel){ ed.cs=P.chords.length-1; ed.ns=P.notes.length-1; meterDefaults(); } clampSel(); syncMB(); ed.bassMode=false; ed.rootMode='add';
  $('#trRow').hidden=true; $('#bTr').setAttribute('aria-expanded','false');
  renderAll();
}
