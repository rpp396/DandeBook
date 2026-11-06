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
// Una pasada sigue la forma: path[k] = compás de la partitura que suena en el lugar k (repeticiones, casillas y saltos)
function passPath(){ return formPath(P,formBars(P)); }
function passTicks(path=passPath()){ return path.length*SIGS[P.sig].L; }
function schedulePass(t0,path){
  const sg=SIGS[P.sig], L=sg.L, spt=A.spt, N=formBars(P);
  if(store.set.chords){ const bars=chordSegs(P,N);
    // un acorde que viene del compás anterior se vuelve a atacar si en la forma no le precede ese compás
    path.forEach((b,k)=>bars[b].forEach(s=>{ if(s.gap) return; const c=P.chords[s.ci]; if(c.nc) return; const fresh=s.head||k===0||path[k-1]!==b-1;
      playChord(c,t0+(k*L+s.t)*spt,s.d*spt,fresh?1:0.6); })); }
  if(store.set.melody){ const {bars,flat}=melBars(P,N), idx=new Map(flat.map((e,i)=>[e,i]));
    const seq=[]; path.forEach((b,k)=>bars[b].forEach(e=>seq.push({e,at:k*L+e.t})));
    // las ligaduras solo siguen si la nota ligada suena justo después (no tras un salto)
    for(let i=0;i<seq.length;i++){ const {e,at}=seq[i]; if(e.rest) continue; let d=e.d, j=i;
      while(seq[j].e.tie&&seq[j+1]&&flat[idx.get(seq[j].e)+1]===seq[j+1].e&&!seq[j+1].e.rest){ j++; d+=seq[j].e.d; } i=j;
      voice(A.bus,mf(midiOf(e.s,e.a)),t0+at*spt,d*spt-0.03,'triangle',0.24,0.15,3600); } }
  if(store.set.metro){ const per=L/sg.beat; for(let k=0;k<path.length*per;k++) click(t0+k*sg.beat*spt,k%per===0); }
}
function play(){
  if(A.playing){ stop(); return; }
  const path=passPath(), pt=passTicks(path); if(!pt){ say('La página está vacía'); flashSel('La página está vacía: añade acordes o notas para oírlos.'); return; }
  if(!ensureAudio()){ flashSel('Este navegador no puede reproducir sonido.'); return; }
  A.bus=A.ctx.createGain(); A.bus.gain.value=1; A.bus.connect(A.out);
  A.spt=60/(P.bpm*SIGS[P.sig].beat); A.pass=pt; A.path=path; A.t0=A.ctx.currentTime+0.12; A.next=A.t0+pt*A.spt; A.page=P.id; A.nextStart=0;
  schedulePass(A.t0,path); A.playing=true;
  // en bucle, la pasada siguiente se programa un poco antes de que acabe la actual (lee la página de nuevo: los cambios se oyen en la vuelta siguiente)
  A.timer=setInterval(()=>{ if(!A.playing||A.nextStart) return; if(store.set.loop&&A.ctx.currentTime>A.next-1.2){ const np=passPath(), len=passTicks(np); if(!len) return; schedulePass(A.next,np); A.nextStart=A.next; A.nextLen=len; A.nextPath=np; A.next+=len*A.spt; } },150);
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
  if(A.nextStart&&now>=A.nextStart){ A.t0=A.nextStart; A.pass=A.nextLen; A.path=A.nextPath; A.nextStart=0; }
  const el=(now-A.t0)/A.spt;
  if(!A.nextStart&&el>=A.pass+6){ stop(); return; }
  if(el>=0&&A.page===P.id){
    // del tiempo de la pasada al compás de la partitura que suena (la forma puede volver atrás o saltar)
    const L=SIGS[P.sig].L, k=Math.floor(el/L), pb=A.path[k], T=pb==null?-1:pb*L+(el-k*L);
    let ci=-1, t=0; if(T>=0) for(let i=0;i<P.chords.length;i++){ if(T<t+P.chords[i].d){ ci=T>=t?i:-1; break; } t+=P.chords[i].d; }
    let ni=-1; t=0; if(T>=0) for(let i=0;i<P.notes.length;i++){ if(T<t+P.notes[i].d){ ni=T>=t?i:-1; break; } t+=P.notes[i].d; }
    if(ci!==A.cc){ $$('#grid .seg.now').forEach(x=>x.classList.remove('now')); const segs=$$(`#grid .seg[data-ci="${ci}"]`); segs.forEach(x=>x.classList.add('now'));
      const b=pb??-1; if(b>=0&&b!==A.cb&&store.set.view==='grid'){ const bar=$(`#grid .bar[data-b="${b}"]`); if(bar) followEl(bar); A.cb=b; } A.cc=ci; }
    if(ni!==A.cn){ $$('#staff .nt.now').forEach(x=>x.classList.remove('now')); const ns=$$(`#staff .nt[data-ni="${ni}"]`); ns.forEach(x=>x.classList.add('now'));
      if(store.set.view==='staff'&&ns[0]){ const sv=ns[0].closest('.sysw'); if(sv) followEl(sv); } A.cn=ni; }
  }
  A.raf=requestAnimationFrame(frame);
}
function followEl(el){ const r=el.getBoundingClientRect(); const bottom=innerHeight-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH'))||0); if(r.top<0||r.bottom>bottom) el.scrollIntoView({block:'nearest',behavior:smooth()}); }
function flashSel(t){ const el=$('#selLine'); el.textContent=t; }
