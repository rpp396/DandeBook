// Pautado · Teclado y conexión de todos los controles.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Teclado ---------- */
function onKey(e){
  if(e.defaultPrevented||e.isComposing) return;
  const tg=e.target; if(tg.closest&&tg.closest('input,textarea,select,[contenteditable="true"]')) return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.altKey&&(e.key==='z'||e.key==='Z')){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); return; }
  if(mod&&!e.altKey&&(e.key==='y'||e.key==='Y')){ e.preventDefault(); redo(); return; }
  if(e.key==='Escape'&&A.playing){ stop(); return; }
  const inSheet=tg.closest&&tg.closest('#sheetBody'); if(!inSheet) return; // los atajos de una tecla solo con la grilla o el pentagrama enfocados
  const grid=store.set.view==='grid'; const k=e.key;
  if(grid){
    if(mod||e.altKey) return;
    if(/^[a-gA-G]$/.test(k)){ e.preventDefault(); const inp=$('#wIn'); inp.value=k.toUpperCase(); inp.focus(); inp.setSelectionRange(1,1); return; }
    if(k==='ArrowLeft'||k==='ArrowRight'){ e.preventDefault(); selectChord(ed.cs+(k==='ArrowLeft'?-1:1),true); return; }
    if(k==='Home'||k==='End'){ e.preventDefault(); selectChord(k==='Home'?0:P.chords.length-1,true); return; }
    if(k==='ArrowUp'||k==='ArrowDown'){ e.preventDefault(); chordSemi(k==='ArrowUp'?1:-1); return; }
    if(k==='Backspace'||k==='Delete'){ e.preventDefault(); delChord(); return; }
    if({'1':48,'2':24,'4':12,'8':6}[k]){ e.preventDefault(); chordDur({'1':48,'2':24,'4':12,'8':6}[k]); return; }
    if(k==='.'){ e.preventDefault(); chordDot(); return; }
    if(k==='/'){ e.preventDefault(); if(selC()&&!selC().nc){ ed.bassMode=!ed.bassMode; renderPalette(); } return; }
    if(k==='i'||k==='I'){ e.preventDefault(); const c=selC(); if(c&&!c.nc){ const n=chordTones(c).length, cur=invOf(c); chordInv(cur<0||cur>=n?0:cur+1); } return; }
    if(k==='p'||k==='P'){ e.preventDefault(); play(); return; }
  } else {
    if(k==='ArrowUp'||k==='ArrowDown'){ e.preventDefault(); const v=k==='ArrowUp'?1:-1; if(mod) noteOct(v); else if(e.shiftKey) noteAlter(v); else noteStep(v); return; }
    if(mod||e.altKey) return;
    if(/^[a-gA-G]$/.test(k)){ e.preventDefault(); noteByLetter(LET.indexOf(k.toUpperCase())); return; }
    if(k==='ArrowLeft'||k==='ArrowRight'){ e.preventDefault(); selectNote(ed.ns+(k==='ArrowLeft'?-1:1)); return; }
    if(k==='Home'||k==='End'){ e.preventDefault(); selectNote(k==='Home'?0:P.notes.length-1); return; }
    if(k==='Backspace'||k==='Delete'){ e.preventDefault(); delNote(); return; }
    if({'1':48,'2':24,'4':12,'8':6,'6':3}[k]){ e.preventDefault(); noteFig({'1':48,'2':24,'4':12,'8':6,'6':3}[k]); return; }
    if(k==='.'){ e.preventDefault(); noteDot(); return; }
    if(k==='s'||k==='S'){ e.preventDefault(); noteRest(); return; }
    if(k==='l'||k==='L'){ e.preventDefault(); noteTie(); return; }
    if(k==='p'||k==='P'){ e.preventDefault(); play(); return; }
  }
}
/* ---------- Conexión de controles ---------- */
function bind(){
  $('#palette').addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse'&&e.target.closest('button')) e.preventDefault(); }); // la paleta no roba el foco de la hoja
  $('#palette').addEventListener('click',e=>{
    const b=e.target.closest('[data-act]'); if(!b||b.disabled) return; const a=b.dataset.act;
    switch(a){
      case 'undo': undo(); break; case 'redo': redo(); break;
      case 'del': store.set.view==='grid'?delChord():delNote(); break;
      case 'min': store.set.min=!store.set.min; saveSoon(); renderPalette(); dockSize(); break;
      case 'root': rootTap(+b.dataset.r); break;
      case 'acc': chordAcc(+b.dataset.a); break;
      case 'bass': ed.bassMode=!ed.bassMode; renderPalette(); say(ed.bassMode?'Toca la nota del bajo':'Sin cambio de bajo'); break;
      case 'rmode': ed.rootMode=ed.rootMode==='change'?'add':'change'; renderPalette(); say(ed.rootMode==='change'?'Las notas cambian la fundamental':'Las notas añaden acordes'); break;
      case 'nc': insertChord({nc:true,d:ed.cdur}); break;
      case 'inv': chordInv(+b.dataset.k); break;
      case 'qual': chordQual(b.dataset.q); break;
      case 'dur': chordDur(b.dataset.d==='bar'?SIGS[P.sig].L:+b.dataset.d); break;
      case 'dot': chordDot(); break;
      case 'fig': noteFig(+b.dataset.d); break;
      case 'ndot': noteDot(); break;
      case 'rest': noteRest(); break; case 'tie': noteTie(); break;
      case 'nacc': noteAcc(+b.dataset.a); break;
      case 'step': noteStep(+b.dataset.v); break; case 'oct': noteOct(+b.dataset.v); break;
    }
  });
  $('#moreQ').addEventListener('click',()=>{ ed.moreQ=!$('#quals').classList.contains('open'); renderPalette(); });
  $('#grid').addEventListener('click',e=>{
    const s=e.target.closest('.seg'); const bar=e.target.closest('.bar');
    if(s&&!s.classList.contains('gap')){ selectChord(+s.dataset.ci,true); return; }
    if(bar){ selectChord(P.chords.length-1,true); }
  });
  bindStaff();
  document.addEventListener('keydown',onKey);
  $('#wForm').addEventListener('submit',e=>{
    e.preventDefault(); const inp=$('#wIn'), msg=$('#wMsg'); const txt=inp.value.trim(); if(!txt) return;
    try{
      // con «|» y el cursor a mitad de compás: lo primero llena lo que queda del compás; si el texto empieza por «|», el acorde anterior se alarga hasta la barra
      const L=SIGS[P.sig].L, at=startOf(P.chords,ed.cs+1), rem=(L-at%L)%L, bars=txt.includes('|');
      let src=txt, ext=0;
      if(bars&&rem&&/^\|/.test(src)){ if(ed.cs<0) throw new Error('No hay ningún acorde antes que alargar'); ext=rem; src=src.replace(/^\|\s*/,''); }
      const list=src.trim()?parseChordBars(src,SIGS[P.sig],ed.cdur,bars&&rem&&!ext?rem:0,bars):[];
      if(!list.length&&!ext) return;
      change(()=>{ if(ext) P.chords[ed.cs].d+=ext; P.chords.splice(ed.cs+1,0,...list); ed.cs+=list.length; },()=>`Añadidos ${list.length} acordes`);
      inp.value=''; msg.textContent=`Añadido: ${list.map(chordText).join(' ')}`; msg.className='wmsg';
    }catch(err){ msg.textContent=err.message; msg.className='wmsg err'; }
  });
  $('#wIn').addEventListener('keydown',e=>{ if(e.key==='Escape'){ $('#wIn').value=''; focusSel(); } });
  $('#bPlay').addEventListener('click',play);
  const setB=v=>{ const b=Math.max(30,Math.min(300,Math.round(v)||P.bpm)); if(b===P.bpm){ $('#bpm').value=b; return; } P.bpm=b; touch(P); saveSoon(); $('#bpm').value=b; if(A.playing){ stop(); play(); } };
  $('#bpm').addEventListener('change',e=>setB(+e.target.value));
  $('#tDown').addEventListener('click',()=>setB(P.bpm-4)); $('#tUp').addEventListener('click',()=>setB(P.bpm+4));
  ['oChords:chords','oMelody:melody','oMetro:metro','oLoop:loop'].forEach(x=>{ const [id,k]=x.split(':'); $('#'+id).addEventListener('click',()=>{ store.set[k]=!store.set[k]; setPressed($('#'+id),store.set[k]); saveSoon(); }); });
  const setView=v=>{ if(store.set.view===v) return; store.set.view=v; saveSoon(); renderAll(); };
  $('#vGrid').addEventListener('click',()=>setView('grid')); $('#vStaff').addEventListener('click',()=>setView('staff'));
  $('#pTitle').addEventListener('input',e=>{ P.title=e.target.value.slice(0,80); touch(P); saveSoon(); clearTimeout(bind.tt); bind.tt=setTimeout(renderPages,400); });
  $('#pTitle').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); focusSel(); } });
  $('#pSig').addEventListener('change',e=>{ const v=e.target.value; if(!has(SIGS,v)) return; change(()=>{ P.sig=v; },`Compás ${v}`); });
  $('#pKey').addEventListener('change',e=>{ const v=e.target.value; if(!has(KEYMAP,v)) return; change(()=>{ P.key=v; },`Tono ${keyLabel(KEYMAP[v])}`); });
  $('#bTr').addEventListener('click',()=>{ const row=$('#trRow'); row.hidden=!row.hidden; $('#bTr').setAttribute('aria-expanded',row.hidden?'false':'true'); if(!row.hidden){ $('#trTo').value=P.key; $('#trTo').focus(); } });
  $('#bTrNo').addEventListener('click',()=>{ $('#trRow').hidden=true; $('#bTr').setAttribute('aria-expanded','false'); $('#bTr').focus(); });
  $('#bTrGo').addEventListener('click',()=>{ const to=KEYMAP[$('#trTo').value]; if(!to) return; const from=KEYMAP[P.key]; if(to===from){ $('#trRow').hidden=true; return; }
    const iv=trInterval(from,to);
    change(()=>{ P.chords.forEach(c=>{ if(c.nc) return; const n=trPC(c.r,c.a,iv); c.r=n.r; c.a=n.a; if(c.b){ const b=trPC(c.b.r,c.b.a,iv); c.b={r:b.r,a:b.a}; } });
      P.notes.forEach(n=>{ if(n.rest) return; const t=trNote(n,iv); n.s=t.s; n.a=t.a; }); P.key=to.k; },`Transportado a ${keyLabel(to)}`);
    $('#trRow').hidden=true; $('#bTr').setAttribute('aria-expanded','false'); });
  $('#pageSel').addEventListener('change',e=>{ stop(); store.cur=e.target.value; saveSoon(); afterSwitch(); });
  $('#bNew').addEventListener('click',()=>{ if(bookFull()) return; stop(); const p=newPage(`Página ${store.pages.length+1}`); p.sig=P.sig; p.key='C'; store.pages.push(p); store.cur=p.id; cloudQueue(p.id); saveSoon(); afterSwitch(); say('Página nueva'); if(!coarseMQ.matches){ const t=$('#pTitle'); t.focus(); t.select(); } });
  $('#bDup').addEventListener('click',()=>{ if(bookFull()) return; stop(); const p=JSON.parse(JSON.stringify(P)); p.id=uid(); p.title=(P.title+' (copia)').slice(0,80); p.created=p.updated=Date.now(); delete p.ex; store.pages.push(p); store.cur=p.id; cloudQueue(p.id); saveSoon(); afterSwitch(); say('Página duplicada'); });
  $('#bDel').addEventListener('click',()=>{ $('#delQ').textContent=`¿Borrar «${P.title||'Sin título'}»? No se puede deshacer.`; $('#delAsk').hidden=false; $('#bDelNo').focus(); });
  $('#bDelNo').addEventListener('click',()=>{ $('#delAsk').hidden=true; $('#bDel').focus(); });
  $('#bDelYes').addEventListener('click',()=>{ stop(); const id=P.id; store.pages=store.pages.filter(p=>p.id!==id); store.gone.push(id); store.gone=store.gone.slice(-300); hist.delete(id);
    if(DB.ready){ DB.pend.add(id); cloudFlush(); }
    if(!store.pages.length) store.pages.push(newPage('Página 1')); store.cur=store.pages.slice().sort((a,b)=>b.updated-a.updated)[0].id;
    $('#delAsk').hidden=true; saveSoon(); afterSwitch(); say('Página borrada'); $('#pageSel').focus(); });
  $('#bCopy').addEventListener('click',()=>{ const txt=exportText(P), msg=$('#copyMsg');
    const fallback=()=>{ const ta=$('#txtIn'); ta.value=txt; ta.focus(); ta.select(); msg.textContent='No se pudo copiar solo: el texto está abajo, seleccionado, para copiarlo.'; };
    try{ navigator.clipboard.writeText(txt).then(()=>{ msg.textContent='Copiado. Pégalo donde quieras; para recuperarlo, pégalo abajo y crea una página.'; },fallback); }catch(e){ fallback(); } });
  $('#bImport').addEventListener('click',()=>{ const msg=$('#impMsg'); try{ if(store.pages.length>=PAGES_MAX) throw new Error(`El cuaderno está lleno (${PAGES_MAX} páginas): borra alguna para crear otra.`); const p=importText($('#txtIn').value); stop(); store.pages.push(p); store.cur=p.id; cloudQueue(p.id); saveSoon(); afterSwitch(); msg.className='tmsg'; msg.textContent=`Creada «${p.title}».`; say(`Página creada: ${p.title}`); }
    catch(err){ msg.className='tmsg err'; msg.textContent=err.message; } });
  $('#sStyle').addEventListener('change',e=>{ store.set.style=oneOf(e.target.value,['pop','jazz','lat'],'pop'); saveSoon(); relabelPalette(); renderAll(); });
  $('#sNames').addEventListener('change',e=>{ store.set.names=oneOf(e.target.value,['us','lat'],'us'); saveSoon(); relabelPalette(); fillKeySelects(); renderAll(); });
  $('#sSim').addEventListener('change',e=>{ store.set.simile=e.target.checked; saveSoon(); renderAll(); });
  let lastW=0; new ResizeObserver(()=>{ const w=$('#sheetBody').clientWidth; if(Math.abs(w-lastW)>2){ lastW=w; if(store.set.view==='staff') renderStaff(); else renderGrid(); } }).observe($('#sheetBody'));
  new ResizeObserver(dockSize).observe($('#palette')); dockMQ.addEventListener('change',dockSize);
  coarseMQ.addEventListener('change',()=>{ if(store.set.view==='staff') renderStaff(); });
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&A.ctx&&A.playing) A.ctx.resume().catch(()=>{}); });
}
// tope de páginas: load() solo lee PAGES_MAX, así que no se deja crear más (se perderían al recargar)
function bookFull(){ if(store.pages.length<PAGES_MAX) return false; const t=`El cuaderno está lleno (${PAGES_MAX} páginas): borra alguna para crear otra.`; flashSel(t); say(t); return true; }
function dockSize(){ const h=dockMQ.matches?$('#palette').offsetHeight:0; document.documentElement.style.setProperty('--dockH',h+'px'); }
function keyLabel(k){ const n=rootName(k.r,k.a); return `${n.n}${n.acc} mayor`; }
function fillKeySelects(){ const opts=KEYS.map(k=>`<option value="${k.k}">${esc(keyLabel(k))}${k.n?` (${Math.abs(k.n)} ${k.n>0?'♯':'♭'})`:''}</option>`).join(''); $('#pKey').innerHTML=opts; $('#trTo').innerHTML=opts; if(P){ $('#pKey').value=P.key; } }
