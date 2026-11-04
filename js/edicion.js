// Pautado · Edición con deshacer, operaciones sobre acordes y notas, paleta y repintado general.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Edición ---------- */
function H(){ let h=hist.get(P.id); if(!h){ h={u:[],r:[]}; hist.set(P.id,h); } return h; }
function snap(){ return JSON.stringify({chords:P.chords,notes:P.notes,sig:P.sig,key:P.key,cs:ed.cs,ns:ed.ns}); }
function restore(s){ const o=JSON.parse(s); P.chords=o.chords; P.notes=o.notes; P.sig=o.sig; P.key=o.key; ed.cs=o.cs; ed.ns=o.ns; }
function change(fn,msg){ const before=snap(); const ok=fn(); if(ok===false) return; const h=H(); h.u.push(before); if(h.u.length>100) h.u.shift(); h.r.length=0; commit(); if(msg) say(typeof msg==='function'?msg():msg); }
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
const selN=()=>ed.ns>=0?P.notes[ed.ns]:null;
function toggleDot(d){ if(DOTTED.includes(d)) return d/1.5; if(BASES.includes(d)&&d!==3) return d*1.5; return d; }

function insertChord(c){ change(()=>{ c.d=c.d||ed.cdur; P.chords.splice(ed.cs+1,0,c); ed.cs++; },()=>`Añadido ${chordSay(c)}`); }
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
function chordDot(){ const c=selC(); if(!c){ ed.cdur=toggleDot(ed.cdur); renderPalette(); return; } const d=toggleDot(c.d); if(d===c.d) return; change(()=>{ c.d=d; ed.cdur=d; },()=>beatsSay(d)); }
function delChord(){ if(ed.cs<0) return; const c=selC(); change(()=>{ P.chords.splice(ed.cs,1); ed.cs--; },()=>`Borrado ${chordSay(c)}`); }
function chordSemi(dir){ const c=selC(); if(!c||c.nc) return;
  change(()=>{ const k=invOf(c); const n=semiShift(c.r,c.a,dir); c.r=n.r; c.a=n.a;
    if(k>0) setInv(c,k); else if(c.b){ const b=semiShift(c.b.r,c.b.a,dir); c.b={r:b.r,a:b.a}; } },()=>chordSay(c)); }
function selectChord(i,focus){ ed.cs=Math.max(-1,Math.min(i,P.chords.length-1)); ed.bassMode=false; ed.accTo='root'; markGrid(); renderPalette(); renderSelLine(); if(focus) focusSel(); }

function noteRef(){ const n=selN()||P.notes.slice().reverse().find(x=>!x.rest); return n?n.s:34; }
function insertNote(n,at){ change(()=>{ const i=at==null?ed.ns+1:at; P.notes.splice(i,0,n); ed.ns=i; },()=>n.rest?`Silencio de ${FIGNAME[n.d]}`:`${noteSay(n.s,n.a)}, ${FIGNAME[n.d]}`); }
function noteByLetter(r){ const ref=noteRef(); let best=null; for(let o=1;o<=7;o++){ const s=o*7+r; if(s<23||s>46) continue; if(best===null||Math.abs(s-ref)<Math.abs(best-ref)) best=s; } insertNote({s:best,a:keyAlter(KEYMAP[P.key],r),d:ed.ndur,rest:false,tie:false}); }
function noteFig(d){ const n=selN(); ed.ndur=d; if(!n){ renderPalette(); return; } change(()=>{ n.d=d; },()=>FIGNAME[d]); }
function noteDot(){ const n=selN(); if(!n){ ed.ndur=toggleDot(ed.ndur); renderPalette(); return; } const d=toggleDot(n.d); if(d===n.d) return; change(()=>{ n.d=d; ed.ndur=d; },()=>FIGNAME[d]); }
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
function selectNote(i){ ed.ns=Math.max(-1,Math.min(i,P.notes.length-1)); markStaff(); renderStaffCaretOnly(); renderPalette(); renderSelLine(); }
function renderStaffCaretOnly(){ renderStaff(); }
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
    setPressed($('[data-act="dot"]'),DOTTED.includes(d)&&d!==L);
    $('#quals').classList.toggle('open',ed.moreQ||(chord&&!QM[c.q].main)); $('#moreQ').setAttribute('aria-expanded',$('#quals').classList.contains('open')?'true':'false');
    $('#moreQ').textContent=$('#quals').classList.contains('open')?'Menos calidades':'Más calidades';
    if(c){ const b=chordBarOf(ed.cs);
      ro.innerHTML=`<span class="big">${chordHTML(c)}</span><span class="say"><b>${esc(cap(chordSay(c)))}</b>${esc(beatsSay(c.d))} · compás ${b+1}${ed.bassMode?' · toca la nota del bajo':''}</span>`; }
    else ro.innerHTML=`<span class="big mute">${P.chords.length?'Lo nuevo va al principio':'Toca una nota para empezar'}</span>`;
  } else {
    const n=selN(); $('[data-act="del"]').disabled=!n;
    const d=n?n.d:ed.ndur, base=DOTTED.includes(d)?d/1.5:d;
    $$('[data-act="fig"]').forEach(el=>setPressed(el,+el.dataset.d===base));
    const nd=$('[data-act="ndot"]'); setPressed(nd,DOTTED.includes(d)); nd.disabled=base===3;
    const isNote=n&&!n.rest;
    setPressed($('[data-act="rest"]'),!!(n&&n.rest)); $('[data-act="rest"]').disabled=!n;
    setPressed($('[data-act="tie"]'),!!(n&&n.tie)); $('[data-act="tie"]').disabled=!isNote;
    $$('[data-act="nacc"]').forEach(el=>{ el.disabled=!isNote; setPressed(el,isNote&&n.a===+el.dataset.a); });
    $$('[data-act="step"],[data-act="oct"]').forEach(el=>{ el.disabled=!isNote; });
    if(n){ const b=Math.floor(startOf(P.notes,ed.ns)/SIGS[P.sig].L);
      ro.innerHTML=`<span class="say"><b>${n.rest?'Silencio':esc(noteName(n.s,n.a))+' · '+esc(noteSay(n.s,n.a))}</b>${esc(cap(FIGNAME[n.d]||beatsSay(n.d)))}${n.tie?' · ligada':''} · compás ${b+1}</span>`; }
    else ro.innerHTML=`<span class="big mute">${P.notes.length?'Lo nuevo va al principio':'Toca el pentagrama para empezar'}</span>`;
  }
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
  if(!keepSel){ ed.cs=P.chords.length-1; ed.ns=P.notes.length-1; } clampSel(); ed.bassMode=false; ed.rootMode='add';
  $('#trRow').hidden=true; $('#bTr').setAttribute('aria-expanded','false');
  renderAll();
}
