// Pautado · Web Audio: acordes, melodía, metrónomo, bucle y cursor de reproducción.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Sonido ---------- */
const A={ctx:null,out:null,bus:null,playing:false,t0:0,spt:0,pass:0,next:0,timer:0,raf:0,cc:-9,cn:-9,cb:-9};
function ensureAudio(){
  if(!A.ctx){ try{ try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
      A.ctx=new (window.AudioContext||window.webkitAudioContext)(); const comp=A.ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=4; comp.connect(A.ctx.destination); A.out=comp; }
    catch(e){ return false; } }
  if(A.ctx.state!=='running') A.ctx.resume().catch(()=>{});
  return true;
}
const mf=m=>440*Math.pow(2,(m-69)/12);
function voice(dest,freq,t,dur,type,peak,sus,cut){
  const c=A.ctx, o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=freq;
  const end=t+Math.max(0.06,dur); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+0.012); g.gain.setTargetAtTime(sus,t+0.014,0.09); g.gain.setTargetAtTime(0.0001,end,0.05);
  let n=o; if(cut){ const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=cut; o.connect(f); n=f; } n.connect(g); g.connect(dest); o.start(t); o.stop(end+0.4);
}
function click(t,acc){ const c=A.ctx, o=c.createOscillator(), g=c.createGain(); o.type='square'; o.frequency.value=acc?1600:1050; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(acc?0.16:0.09,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.04); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t+0.06); }
function playChord(c,t,dur,v){
  const rootPc=(PC[c.r]+c.a+12)%12; let base=48+rootPc; if(base>54) base-=12;
  const bpc=c.b?(PC[c.b.r]+c.b.a+12)%12:rootPc; voice(A.bus,mf(36+bpc),t,dur*0.97,'triangle',0.30*v,0.16*v,700);
  QM[c.q].iv.forEach(iv=>{ voice(A.bus,mf(base+(iv===0?12:iv)),t,dur*0.97,'triangle',0.075*v,0.04*v,2400); });
}
function passTicks(){ const L=SIGS[P.sig].L; return Math.ceil(Math.max(sumD(P.chords),sumD(P.notes))/L)*L; }
function schedulePass(t0){
  const sg=SIGS[P.sig], L=sg.L, spt=A.spt, pt=passTicks(), N=pt/L;
  if(store.set.chords){ chordSegs(P,N).forEach((segs,b)=>segs.forEach(s=>{ if(s.gap) return; const c=P.chords[s.ci]; if(c.nc) return; playChord(c,t0+(b*L+s.t)*spt,s.d*spt,s.head?1:0.6); })); }
  if(store.set.melody){ let t=0; for(let i=0;i<P.notes.length;i++){ const n=P.notes[i]; let d=n.d; const st=t; t+=n.d; if(n.rest) continue;
      let j=i; while(P.notes[j].tie&&P.notes[j+1]&&!P.notes[j+1].rest){ j++; d+=P.notes[j].d; t+=P.notes[j].d; } i=j;
      voice(A.bus,mf(midiOf(n.s,n.a)),t0+st*spt,d*spt-0.03,'triangle',0.24,0.15,3600); } }
  if(store.set.metro){ const per=L/sg.beat; for(let k=0;k<N*per;k++) click(t0+k*sg.beat*spt,k%per===0); }
}
function play(){
  if(A.playing){ stop(); return; }
  const pt=passTicks(); if(!pt){ say('La página está vacía'); flashSel('La página está vacía: añade acordes o notas para oírlos.'); return; }
  if(!ensureAudio()){ flashSel('Este navegador no puede reproducir sonido.'); return; }
  A.bus=A.ctx.createGain(); A.bus.gain.value=1; A.bus.connect(A.out);
  A.spt=60/(P.bpm*SIGS[P.sig].beat); A.pass=pt; A.t0=A.ctx.currentTime+0.12; A.next=A.t0+pt*A.spt; A.page=P.id; A.nextStart=0;
  schedulePass(A.t0); A.playing=true;
  // en bucle, la pasada siguiente se programa un poco antes de que acabe la actual (lee la página de nuevo: los cambios se oyen en la vuelta siguiente)
  A.timer=setInterval(()=>{ if(!A.playing||A.nextStart) return; if(store.set.loop&&A.ctx.currentTime>A.next-1.2){ const len=passTicks()||A.pass; schedulePass(A.next); A.nextStart=A.next; A.nextLen=len; A.next+=len*A.spt; } },150);
  A.raf=requestAnimationFrame(frame); updatePlay(); say('Reproduciendo');
}
function stop(){
  if(!A.playing) return; A.playing=false; clearInterval(A.timer); cancelAnimationFrame(A.raf);
  const bus=A.bus; if(bus){ const t=A.ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value,t); bus.gain.linearRampToValueAtTime(0,t+0.08); setTimeout(()=>{ try{bus.disconnect();}catch(e){} },200); }
  A.bus=null; $$('.now').forEach(el=>el.classList.remove('now')); A.cc=A.cn=A.cb=-9; updatePlay();
}
function updatePlay(){ $('#playTxt').textContent=A.playing?'Detener':'Reproducir'; $('#icPlay').hidden=A.playing; $('#icStop').hidden=!A.playing; }
function frame(){
  if(!A.playing) return;
  const now=A.ctx.currentTime;
  if(A.nextStart&&now>=A.nextStart){ A.t0=A.nextStart; A.pass=A.nextLen; A.nextStart=0; }
  const el=(now-A.t0)/A.spt;
  if(!A.nextStart&&el>=A.pass+6){ stop(); return; }
  if(el>=0&&A.page===P.id){
    let ci=-1, t=0; for(let i=0;i<P.chords.length;i++){ if(el<t+P.chords[i].d){ ci=el>=t?i:-1; break; } t+=P.chords[i].d; }
    let ni=-1; t=0; for(let i=0;i<P.notes.length;i++){ if(el<t+P.notes[i].d){ ni=el>=t?i:-1; break; } t+=P.notes[i].d; }
    if(ci!==A.cc){ $$('#grid .seg.now').forEach(x=>x.classList.remove('now')); const segs=$$(`#grid .seg[data-ci="${ci}"]`); segs.forEach(x=>x.classList.add('now'));
      const b=Math.floor(el/SIGS[P.sig].L); if(b!==A.cb&&store.set.view==='grid'){ const bar=$(`#grid .bar[data-b="${b}"]`); if(bar) followEl(bar); A.cb=b; } A.cc=ci; }
    if(ni!==A.cn){ $$('#staff .nt.now').forEach(x=>x.classList.remove('now')); const ns=$$(`#staff .nt[data-ni="${ni}"]`); ns.forEach(x=>x.classList.add('now'));
      if(store.set.view==='staff'&&ns[0]){ const sv=ns[0].closest('.sysw'); if(sv) followEl(sv); } A.cn=ni; }
  }
  A.raf=requestAnimationFrame(frame);
}
function followEl(el){ const r=el.getBoundingClientRect(); const bottom=innerHeight-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH'))||0); if(r.top<0||r.bottom>bottom) el.scrollIntoView({block:'nearest',behavior:smooth()}); }
function flashSel(t){ const el=$('#selLine'); el.textContent=t; }
