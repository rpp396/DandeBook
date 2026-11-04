// Pautado · Grilla de acordes: reparto por compases, ajuste del cifrado al ancho y selección.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Grilla ---------- */
function sameChord(a,b){ if(!a||!b||a.nc!==b.nc) return false; if(a.nc) return true; return a.r===b.r&&a.a===b.a&&a.q===b.q&&(a.b?.r??-1)===(b.b?.r??-1)&&(a.b?.a??0)===(b.b?.a??0); }
function simSVG(){ return `<svg viewBox="-10 -80 260 190" aria-hidden="true"><use href="#g-sim"/></svg>`; }
function renderGrid(){
  const grid=$('#grid'); const hadFocus=grid.contains(document.activeElement);
  const N=barCount(P), sg=SIGS[P.sig], bars=chordSegs(P,N), beats=sg.L/sg.beat;
  let h='';
  bars.forEach((segs,b)=>{
    const empty=segs.length===1&&segs[0].gap; const fin=b===N-1;
    const one=segs.length===1&&!segs[0].gap&&segs[0].head, prev=b>0?bars[b-1]:null;
    const sim=store.set.simile&&one&&prev&&prev.length===1&&!prev[0].gap&&prev[0].ci!==segs[0].ci&&sameChord(P.chords[prev[0].ci],P.chords[segs[0].ci]);
    h+=`<div class="bar${empty?' empty':''}${fin?' fin':''}" data-b="${b}"><span class="bn" aria-hidden="true">${b+1}</span><div class="segs">`;
    segs.forEach(s=>{
      if(s.gap){ h+=`<div class="seg gap" data-g="${s.d}" data-b="${b}" aria-hidden="true"></div>`; return; }
      const c=P.chords[s.ci];
      const lab=`Compás ${b+1}: ${chordSay(c)}${s.head?'':', sigue del compás anterior'}, ${beatsSay(s.d)}`;
      const inner=s.head?(sim?simSVG():chordHTML(c)):'<span class="cline" aria-hidden="true"></span>';
      h+=`<button type="button" class="seg${s.head?' head':' cont'}${sim?' sim':''}" data-ci="${s.ci}" data-g="${s.d}" tabindex="-1" aria-label="${esc(lab)}">${inner}</button>`;
    });
    h+=`</div><div class="beats" aria-hidden="true">${'<i></i>'.repeat(beats)}</div></div>`;
  });
  grid.innerHTML=h;
  $$('.seg',grid).forEach(el=>{ el.style.flexGrow=el.dataset.g; });
  // 4 compases por fila si todo el cifrado cabe legible (13 px o más, con el bajo debajo si hace falta); si no, 2 o 1
  const barEls=$$('.bar',grid);
  for(const per of [4,2,1]){
    grid.style.setProperty('--per',per); barEls.forEach((el,i)=>el.classList.toggle('rowend',(i+1)%per===0));
    if(fitGrid()>=13||per===1){ grid.dataset.per=per; break; }
  }
  markGrid();
  if(hadFocus) focusSel();
}
// Cada acorde de la grilla debe verse entero: primero baja el bajo a una segunda línea, después reduce la letra. Devuelve el tamaño más pequeño usado.
function fitGrid(){
  let min=99;
  $$('#grid .seg.head').forEach(seg=>{
    const ch=seg.querySelector('.ch'); if(!ch) return; ch.classList.remove('stack'); ch.style.fontSize='';
    const cs=getComputedStyle(seg), avail=seg.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+0.5;
    const wd=()=>ch.getBoundingClientRect().width; let fs=parseFloat(getComputedStyle(ch).fontSize);
    if(wd()>avail&&ch.querySelector('.bs')) ch.classList.add('stack');
    while(wd()>avail&&fs>11){ fs-=1; ch.style.fontSize=fs+'px'; }
    min=Math.min(min,fs);
  });
  return min;
}
function markGrid(){
  const grid=$('#grid'); $$('.seg',grid).forEach(el=>el.classList.remove('sel','caret-after','caret-before'));
  let tab=null;
  if(ed.cs>=0){ const els=$$(`.seg[data-ci="${ed.cs}"]`,grid); els.forEach(el=>el.classList.add('sel')); if(els.length){ els[els.length-1].classList.add('caret-after'); tab=els[0]; } }
  else { const f=$('.seg',grid); if(f) f.classList.add('caret-before'); }
  $$('button.seg',grid).forEach(el=>{ el.tabIndex=-1; });
  if(!tab) tab=$('button.seg',grid);
  if(tab){ tab.tabIndex=0; grid.removeAttribute('tabindex'); } else grid.tabIndex=0;
}
function focusSel(){
  if(store.set.view==='grid'){ const el=$(`#grid .seg[data-ci="${ed.cs}"]`)||$('#grid button.seg')||$('#grid'); el&&el.focus({preventScroll:false}); }
  else $('#staff').focus({preventScroll:true});
}
