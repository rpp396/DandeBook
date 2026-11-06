// Pautado · Pentagrama en SVG con glifos de Petaluma: disposición, figuras, barras, ligaduras, cifrado y puntero.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Pentagrama ---------- */
const HW={nhB:1.336,nhH:1.336,nhW:1.52};
const ACCW={'1':1.65,'-1':1.05,'0':1.05,'2':3.2,'-2':2.0};
const ACCG={'1':['sharp'],'-1':['flat'],'0':['nat'],'2':['sharp','sharp'],'-2':['flat','flat']};
const headKey=d=>d>=48?'nhW':(d>=24?'nhH':'nhB');
const gw=k=>(GLYPHS[k]?GLYPHS[k].w:100)/100;
function use(k,x,y,sp){ return `<use href="#g-${k}" transform="translate(${r2(x)} ${r2(y)}) scale(${r2(sp/100*1000)/1000})"/>`; }
let ST=null;
const labCache=new Map(); let measEl=null;
function labWidth(c,px){
  const h=chordHTML(c), k=px+'|'+h; let w=labCache.get(k); if(w!==undefined) return w;
  if(!measEl){ measEl=document.createElement('span'); measEl.className='meas'; measEl.setAttribute('aria-hidden','true'); document.body.appendChild(measEl); }
  measEl.style.fontSize=px+'px'; measEl.innerHTML=h; w=measEl.getBoundingClientRect().width; labCache.set(k,w); return w;
}
function layoutStaff(W){
  const sp=coarseMQ.matches?10:9, labPx=W<300?17:W<500?19:22;
  const sg=SIGS[P.sig], L=sg.L, N=barCount(P), key=KEYMAP[P.key];
  const {bars:mel,flat}=melBars(P,N), chs=chordSegs(P,N);
  const y0=Math.round(sp*4.6), H=Math.round(y0+4*sp+sp*4.4); const kN=Math.abs(key.n);
  // compases por sistema: los que quepan con el ancho mínimo del compás más exigente (notas apretadas y cifrado sin solaparse)
  const needs=mel.map((els,b)=>barNeeds(els,chs[b],sp,key,L,labPx,markAt(P,b)));
  const headFirst=sp*3.9+(kN?kN*sp*1.05+sp*0.5:0)+sp*(sg.top>9?3.9:2.9), maxMin=Math.max(...needs.map(n=>n.minW));
  const cands=W>=660?[4,2,1]:W>=250?[2,1]:[1]; let per=cands[cands.length-1];
  for(const c of cands){ if((W-headFirst-2)/c>=maxMin){ per=c; break; } }
  const sys=[];
  for(let si=0;si*per<N;si++){
    const first=si===0; let x=sp*0.6; const clefX=x; x+=sp*3.3; const keyX=x; x+=kN?kN*sp*1.05+sp*0.5:0; const tsX=x;
    if(first) x+=sp*(sg.top>9?3.9:2.9);
    const head=x, bw=(W-head-2)/per, bars=[];
    for(let j=0;j<per;j++){ const b=si*per+j; if(b>=N) break; const bl=layoutBar(b,mel[b],chs[b],needs[b],head+j*bw,head+(j+1)*bw,sp,y0,L); bl.si=si; bars.push(bl); }
    sys.push({si,first,clefX,keyX,tsX,head,bars});
  }
  return {sp,per,y0,H,W,N,L,sys,flat,key,sg,labPx};
}
// Anchos de un compás: ws = natural, wsMin = notas apretadas (65 %) con sitio para que cada cifrado no pise al siguiente
function barNeeds(els,segs,sp,key,L,labPx,m){
  const mem={};
  for(const e of els){ if(e.rest) continue; const r=((e.s%7)+7)%7; const cur=has(mem,e.s)?mem[e.s]:keyAlter(key,r); e.acc=(e.first&&e.a!==cur)?e.a:null; mem[e.s]=e.a; }
  const on=new Set([0]); els.forEach(e=>on.add(e.t)); segs.forEach(s=>{ if(!s.gap) on.add(s.t); });
  const ts=[...on].sort((a,c)=>a-c); const accAt={}, dotAt={};
  els.forEach(e=>{ if(e.acc!=null) accAt[e.t]=Math.max(accAt[e.t]||0,ACCW[e.acc]); if(DOTTED.includes(e.d)) dotAt[e.t]=1; });
  const ws=ts.map((t,i)=>{ const dur=(i+1<ts.length?ts[i+1]:L)-t; return sp*(1.8+1.9*Math.sqrt(dur/12))+(accAt[t]||0)*sp+(dotAt[t]?sp*0.6:0); });
  const wsMin=ws.map(w=>w*0.65), padL=sp*(m?.rs?2.2:1.0), padR=sp*(m?.re?2.0:0.5); // sitio para las barras de repetición
  const heads=segs.filter(s=>!s.gap&&s.head);
  heads.forEach((s,k)=>{
    const last=k+1===heads.length, need=labWidth(P.chords[s.ci],labPx)+(last?2-padR:8), tEnd=last?L:heads[k+1].t;
    const i0=ts.indexOf(s.t); let i1=ts.findIndex(t=>t>=tEnd); if(i1<0) i1=ts.length;
    let sum=0; for(let i=i0;i<i1;i++) sum+=wsMin[i]; if(sum>0&&sum<need){ const k2=need/sum; for(let i=i0;i<i1;i++) wsMin[i]*=k2; }
  });
  return {ts,ws,wsMin,accAt,padL,padR,minW:padL+padR+wsMin.reduce((a,v)=>a+v,0)};
}
function layoutBar(b,els,segs,nd,x0,x1,sp,y0,L){
  const {ts,ws,wsMin,accAt,padL,padR}=nd;
  const inner=x1-x0-padL-padR, sMin=wsMin.reduce((a,v)=>a+v,0), sNat=ws.reduce((a,v)=>a+v,0), extra=inner-sMin;
  // lo que sobra se reparte en proporción al ancho natural; si no cabe ni lo mínimo, se aprieta todo por igual
  const w=extra>=0?wsMin.map((m,i)=>m+extra*ws[i]/sNat):wsMin.map(m=>m*inner/sMin), af=extra>=0?1:inner/sMin;
  const xs=[]; let cx=x0+padL; w.forEach(v=>{ xs.push(cx); cx+=v; });
  for(const e of els){
    const cxx=xs[ts.indexOf(e.t)]; e.si=null;
    if(e.mr){ e.hx=(x0+x1)/2-sp; e.hw=2*sp; continue; }
    if(e.rest){ e.hx=cxx+sp*0.1; e.hw=sp*1.3; continue; }
    e.hk=headKey(e.d); e.hw=HW[e.hk]*sp; e.hx=cxx+(accAt[e.t]?accAt[e.t]*sp*af:0); e.hy=y0+(38-e.s)*sp/2;
  }
  return {b,x0,x1,ts,xs,padL,padR,els,segs,L,sp,y0};
}
function tickToX(bl,t){
  const {ts,xs}=bl, end=bl.x1-bl.padR;
  for(let i=0;i<ts.length;i++){ const ta=ts[i], tb=i+1<ts.length?ts[i+1]:bl.L, xa=xs[i], xb=i+1<ts.length?xs[i+1]:end;
    if(t<tb||i===ts.length-1) return xa+(xb-xa)*Math.max(0,Math.min(1,(t-ta)/Math.max(1,tb-ta))); }
  return xs[0];
}
function xToTick(bl,x){
  const {ts,xs}=bl, end=bl.x1-bl.padR; if(x<=xs[0]) return 0;
  for(let i=0;i<ts.length;i++){ const xa=xs[i], xb=i+1<ts.length?xs[i+1]:end, ta=ts[i], tb=i+1<ts.length?ts[i+1]:bl.L;
    if(x<xb||i===ts.length-1) return Math.min(bl.L,ta+(tb-ta)*Math.max(0,Math.min(1,(x-xa)/Math.max(1,xb-xa)))); }
  return bl.L;
}
function ledgers(s,hx,hw,sp,y0){ let o=''; const y=st=>y0+(38-st)*sp/2; const xa=hx-sp*0.45, xb=hx+hw+sp*0.45;
  for(let st=28;st>=s;st-=2) o+=`<line class="led" x1="${r2(xa)}" x2="${r2(xb)}" y1="${r2(y(st))}" y2="${r2(y(st))}"/>`;
  for(let st=40;st<=s;st+=2) o+=`<line class="led" x1="${r2(xa)}" x2="${r2(xb)}" y1="${r2(y(st))}" y2="${r2(y(st))}"/>`;
  return o; }
function drawBar(bl,Y,tieOut){
  const {sp,y0}=Y, BU=Y.sg.beam, th=Math.max(1.2,sp*0.13); let s='';
  // grupos de barras: corcheas y semicorcheas seguidas dentro del mismo pulso
  const groups=[]; let cur=null;
  for(const e of bl.els){
    e.grp=null; if(e.rest||e.d>=12){ cur=null; continue; }
    const u=Math.floor(e.t/BU); if(e.t+e.d>(u+1)*BU){ cur=null; continue; }
    if(cur&&cur.u===u&&cur.end===e.t){ cur.els.push(e); cur.end=e.t+e.d; } else { cur={u,els:[e],end:e.t+e.d}; groups.push(cur); }
  }
  const beams=[];
  groups.forEach(g=>{
    if(g.els.length<2) return; const up=g.els.reduce((a,e)=>a+e.s,0)/g.els.length<34; g.up=up;
    g.els.forEach(e=>{ e.grp=g; e.up=up; e.sx=up?e.hx+e.hw-th/2:e.hx+th/2; });
    const f=g.els[0], l=g.els[g.els.length-1]; const tip=e=>up?e.hy-3.4*sp:e.hy+3.4*sp;
    let slope=(tip(l)-tip(f))/Math.max(1,l.sx-f.sx); slope=Math.max(-0.14,Math.min(0.14,slope));
    let yb=x=>tip(f)+slope*(x-f.sx); let delta=0;
    g.els.forEach(e=>{ const need=up?(e.hy-2.9*sp):(e.hy+2.9*sp); const v=yb(e.sx); delta=up?Math.max(delta,v-need):Math.max(delta,need-v); });
    const base=yb; yb=x=>base(x)+(up?-delta:delta); g.yb=yb;
    g.els.forEach(e=>{ e.tip=yb(e.sx); });
    const bt=sp*0.5, dir=up?1:-1, poly=(xa,xb,off)=>{ const ya=yb(xa)+off*dir, yc=yb(xb)+off*dir; return `<polygon points="${r2(xa)},${r2(ya)} ${r2(xb)},${r2(yc)} ${r2(xb)},${r2(yc+bt*dir)} ${r2(xa)},${r2(ya+bt*dir)}"/>`; };
    let bs=poly(f.sx-th/2,l.sx+th/2,0);
    g.els.forEach((e,i)=>{ if(e.d!==3) return; const nx=g.els[i+1], pv=g.els[i-1];
      if(nx&&nx.d===3) bs+=poly(e.sx-th/2,nx.sx+th/2,sp*0.75);
      else if(!(pv&&pv.d===3)){ const len=sp*1.1; bs+=nx?poly(e.sx-th/2,e.sx+len,sp*0.75):poly(e.sx-len,e.sx+th/2,sp*0.75); } });
    beams.push(`<g class="bm">${bs}</g>`);
  });
  for(const e of bl.els){
    if(e.mr){ s+=`<g class="nt rest" data-ni="${e.ni}">${use('rW',e.hx,y0+sp,sp)}</g>`; continue; }
    if(e.rest){
      const k={48:'rW',36:'rH',24:'rH',18:'rQ',12:'rQ',9:'r8',6:'r8',3:'r16'}[e.d]; const ry=k==='rW'?y0+sp:y0+2*sp;
      let g=use(k,e.hx,ry,sp); if(DOTTED.includes(e.d)) g+=use('dot',e.hx+gw(k)*sp+sp*0.35,y0+1.5*sp,sp);
      s+=`<g class="nt rest" data-ni="${e.ni}">${g}</g>`; continue;
    }
    if(!e.grp){ e.up=e.s<34; e.sx=e.up?e.hx+e.hw-th/2:e.hx+th/2; e.tip=e.up?Math.min(e.hy-3.5*sp,y0+2*sp):Math.max(e.hy+3.5*sp,y0+2*sp); }
    let g=ledgers(e.s,e.hx,e.hw,sp,y0);
    if(e.acc!=null){ const gs=ACCG[e.acc]; let ax=e.hx-sp*0.25; for(let i=gs.length-1;i>=0;i--){ ax-=gw(gs[i])*sp+sp*0.05; g+=use(gs[i],ax,e.hy,sp); } }
    g+=use(e.hk,e.hx,e.hy,sp);
    if(DOTTED.includes(e.d)) g+=use('dot',e.hx+e.hw+sp*0.3,e.s%2===0?e.hy-sp/2:e.hy,sp);
    if(e.d<48){
      const y1=e.up?e.hy-0.29*sp:e.hy+0.24*sp;
      g+=`<line class="stem" stroke-width="${r2(th)}" x1="${r2(e.sx)}" x2="${r2(e.sx)}" y1="${r2(y1)}" y2="${r2(e.tip)}"/>`;
      if(!e.grp&&e.d<12){ const fk=(e.d===3?'f16':'f8')+(e.up?'u':'d'); g+=use(fk,e.sx-th/2,e.tip,sp); }
    }
    s+=`<g class="nt" data-ni="${e.ni}">${g}</g>`;
  }
  return s+beams.join('');
}
/* ---------- Pentagrama: forma ---------- */
// Barras de cada compás: normal, final, o de repetición (gruesa, fina y puntos). Si el compás siguiente empieza con «‖:», su barra gruesa hace de barra.
function barLines(sy,Y){
  const {sp,y0}=Y, tw=sp*0.5, g=sp*0.3, h=4*sp, dw=gw('repDots')*sp; let s='';
  const thick=x=>`<rect class="blt" x="${r2(x)}" y="${y0}" width="${r2(tw)}" height="${h}"/>`;
  const thin=x=>`<line class="bl" x1="${r2(x)}" x2="${r2(x)}" y1="${y0}" y2="${y0+h}"/>`;
  const dots=x=>`<g class="gl">${use('repDots',x,y0+h,sp)}</g>`;
  sy.bars.forEach((bl,j)=>{
    const m=markAt(P,bl.b), nx=sy.bars[j+1], nm=nx?markAt(P,nx.b):null, pm=j>0?markAt(P,sy.bars[j-1].b):null;
    if(m?.rs){ let x=bl.x0; if(!pm?.re){ s+=thick(x); x+=tw; } s+=thin(x+g)+dots(x+g+sp*0.35); }
    if(m?.re){ const x=bl.x1-tw; s+=thick(x)+thin(x-g)+dots(x-g-sp*0.35-dw); }
    else if(bl.b===Y.N-1) s+=`${thin(bl.x1-sp*0.75)}<rect class="blt" x="${r2(bl.x1-sp*0.45)}" y="${y0}" width="${r2(sp*0.45)}" height="${h}"/>`;
    else if(!nm?.rs) s+=thin(bl.x1);
  });
  return s;
}
const hasBand=sy=>sy.bars.some(bl=>{ const m=markAt(P,bl.b); return !!(m&&(m.v||m.segno||m.coda)); });
// Casillas, Segno y Coda en una banda encima de las notas (by = línea de la casilla, top = lo más alto de las notas)
function topMarks(sy,Y,by,top){
  const {sp}=Y; let s='';
  sy.bars.forEach((bl,j)=>{
    const m=markAt(P,bl.b); if(!m) return; let x=bl.x0+sp*0.4;
    if(m.v){ const pm=j>0?markAt(P,sy.bars[j-1].b):null, nm=markAt(P,bl.b+1), st=pm?.v!==m.v, en=nm?.v!==m.v;
      const xa=bl.x0+(st?sp*0.3:0), xb=bl.x1-(en?sp*0.3:0), hk=sp*1.4;
      s+=`<path class="vbs" d="M${r2(xa)} ${r2(st?by+hk:by)}${st?`V${r2(by)}`:''}H${r2(xb)}${en&&m.re?`V${r2(by+hk)}`:''}"/>`;
      if(st||j===0){ s+=`<text class="mkt" x="${r2(xa+sp*0.35)}" y="${r2(by+sp*1.25)}" font-size="${r2(sp*1.15)}">${m.v}.</text>`; x+=sp*1.8; } }
    if(m.segno){ s+=`<g class="gl">${use('segno',x,top-sp*0.25,sp*0.55)}</g>`; x+=gw('segno')*sp*0.55+sp*0.3; }
    if(m.coda) s+=`<g class="gl">${use('coda',x,top-sp*0.5,sp*0.45)}</g>`;
  });
  return s;
}
// Al Coda, Fine, D.C./D.S. y «×n», debajo del pentagrama al final del compás
function endMarks(sy,Y){ let s=''; const {sp,H}=Y;
  sy.bars.forEach(bl=>{ const t=markEndText(markAt(P,bl.b)); if(t) s+=`<text class="mkt" x="${r2(bl.x1-sp*0.3)}" y="${r2(H-sp*0.6)}" font-size="${r2(sp*1.15)}" text-anchor="end">${esc(t)}</text>`; });
  return s; }
function tiePath(x1,x2,y,dir){ const w=x2-x1, h=Math.min(8,2.5+w*0.06)*dir, c1=x1+w*0.25, c2=x2-w*0.25, t=1.7*dir;
  return `<path class="tie" d="M${r2(x1)} ${r2(y)}C${r2(c1)} ${r2(y+h)} ${r2(c2)} ${r2(y+h)} ${r2(x2)} ${r2(y)}C${r2(c2)} ${r2(y+h-t)} ${r2(c1)} ${r2(y+h-t)} ${r2(x1)} ${r2(y)}Z"/>`; }
function renderStaff(){
  const box=$('#staff'); const W=Math.max(240,Math.floor(box.clientWidth||600));
  const Y=layoutStaff(W); ST=Y; const {sp,y0,H,sg,key}=Y; const kN=Math.abs(key.n);
  const out=Y.sys.map(()=>'');
  // ligaduras (pueden cruzar de sistema)
  Y.sys.forEach(sy=>sy.bars.forEach(bl=>bl.els.forEach(e=>{ e.si=sy.si; })));
  const ties=Y.sys.map(()=>'');
  // primero se dibujan los compases (fijan e.up), después las ligaduras
  const barsSvg=Y.sys.map(sy=>sy.bars.map(bl=>drawBar(bl,Y)).join(''));
  for(let i=0;i<Y.flat.length;i++){
    const e=Y.flat[i], nx=Y.flat[i+1]; if(!e.tie||!nx||e.si==null||nx.si==null) continue;
    const dir=e.up?1:-1, y=e.hy+dir*sp*0.62;
    if(nx.si===e.si) ties[e.si]+=tiePath(e.hx+e.hw*0.85,nx.hx+nx.hw*0.15,y,dir);
    else { ties[e.si]+=tiePath(e.hx+e.hw*0.85,W-3,y,dir); const sy=Y.sys[nx.si]; ties[nx.si]+=tiePath(sy.head-sp*0.6,nx.hx+nx.hw*0.15,nx.hy+dir*sp*0.62,dir); }
  }
  // cursor de inserción
  const T=ed.ns<0?0:startOf(P.notes,ed.ns)+P.notes[ed.ns].d; let caret={si:-1};
  { const b=Math.min(Y.N-1,Math.floor(T/Y.L)); const sy=Y.sys[Math.floor(b/Y.per)]; const bl=sy&&sy.bars.find(x=>x.b===b);
    if(bl){ const x=T>=(b+1)*Y.L?bl.x1-sp*0.3:tickToX(bl,T-b*Y.L)-sp*0.55; caret={si:sy.si,x}; } }
  let html='';
  Y.sys.forEach((sy,si)=>{
    const last=sy.bars[sy.bars.length-1], xEnd=last.x1; let s='';
    for(let i=0;i<5;i++) s+=`<line class="stl" x1="0" x2="${r2(xEnd)}" y1="${y0+i*sp}" y2="${y0+i*sp}"/>`;
    s+=`<g class="gl">${use('gClef',sy.clefX,y0+3*sp,sp)}`;
    for(let k=0;k<kN;k++){ const st=key.n>0?SHARP_POS[k]:FLAT_POS[k]; s+=use(key.n>0?'sharp':'flat',sy.keyX+k*sp*1.05,y0+(38-st)*sp/2,sp); }
    if(sy.first){ const k=0.5, dig=(n,yy)=>{ const ds=String(n).split(''); const wsum=ds.reduce((a,d)=>a+gw('t'+d),0)*sp*k; let x=sy.tsX+(sp*(sg.top>9?3.4:2.4)-wsum)/2; ds.forEach(d=>{ s+=use('t'+d,x,yy,sp*k); x+=gw('t'+d)*sp*k; }); };
      dig(sg.top,y0+sp); dig(sg.bot,y0+3*sp); }
    s+='</g>';
    s+=barsSvg[si];
    s+=barLines(sy,Y)+endMarks(sy,Y);
    s+=ties[si];
    if(caret.si===si) s+=`<line class="caret" x1="${r2(caret.x)}" x2="${r2(caret.x)}" y1="${y0-sp*1.2}" y2="${y0+5.2*sp}"/>`;
    s+=`<g class="ghost" visibility="hidden"></g>`;
    let labs='', topY=y0-sp*0.7;
    sy.bars.forEach(bl=>bl.els.forEach(e=>{ if(e.rest) return; let t=e.hy-sp*0.8; if(e.up&&e.d<48) t=Math.min(t,e.tip); if(e.acc!=null) t=Math.min(t,e.hy-sp*2); topY=Math.min(topY,t); }));
    // con casillas, Segno o Coda, una banda encima de las notas; el cifrado sube y, si no cabe, el sistema se aparta del anterior (pad)
    let pad=0, labTop=Math.max(0,Math.round(topY-sp*0.3-28));
    if(hasBand(sy)){ const by=topY-sp*2.4; s+=topMarks(sy,Y,by,topY); const raw=Math.round(by-sp*0.4-34); pad=Math.max(0,-raw); labTop=raw+pad; }
    sy.bars.forEach(bl=>bl.segs.forEach(sg2=>{ if(sg2.gap||!sg2.head) return; labs+=`<span class="clab" data-x="${r2(tickToX(bl,sg2.t)-2)}" aria-hidden="true">${chordHTML(P.chords[sg2.ci])}</span>`; }));
    html+=`<div class="sysw" data-pad="${pad}"><div class="chrow" data-top="${labTop}">${labs}</div><svg class="sys" data-s="${si}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sysLabel(sy))}">${s}</svg></div>`;
  });
  box.innerHTML=html; box.style.setProperty('--labfs',Y.labPx+'px');
  $$('.clab',box).forEach(el=>{ el.style.left=el.dataset.x+'px'; }); $$('.chrow',box).forEach(el=>{ el.style.top=el.dataset.top+'px'; });
  $$('.sysw',box).forEach(el=>{ if(+el.dataset.pad) el.style.paddingTop=el.dataset.pad+'px'; });
  markStaff();
}
function sysLabel(sy){
  const a=sy.bars[0].b+1, b=sy.bars[sy.bars.length-1].b+1; let t=a===b?`Compás ${a}. `:`Compases ${a} a ${b}. `;
  sy.bars.forEach(bl=>{
    const chs=bl.segs.filter(s=>!s.gap&&s.head).map(s=>chordSay(P.chords[s.ci]));
    const ns=bl.els.map(e=>e.mr?'silencio de compás':e.rest?`silencio de ${FIGNAME[e.d]||'figura'}`:`${noteSay(e.s,e.a)} ${FIGNAME[e.d]||''}${e.tie?' ligada':''}`);
    const ms=markSay(markAt(P,bl.b));
    if(!chs.length&&!ns.length&&!ms) return;
    t+=`Compás ${bl.b+1}${ms?` (${ms})`:''}${chs.length?', '+chs.join(' y '):''}: ${ns.length?ns.join(', '):'sin notas'}. `;
  });
  return t;
}
function markStaff(){ $$('#staff .nt.sel').forEach(el=>el.classList.remove('sel')); if(ed.ns>=0) $$(`#staff .nt[data-ni="${ed.ns}"]`).forEach(el=>el.classList.add('sel')); }
/* ---------- Pentagrama: puntero ---------- */
let drag=null;
function svgPt(svg,e){ const r=svg.getBoundingClientRect(); return {x:(e.clientX-r.left)*(ST.W/r.width),y:(e.clientY-r.top)*(ST.H/r.height)}; }
function stepAt(y){ return Math.max(23,Math.min(46,Math.round(38-(y-ST.y0)/(ST.sp/2)))); }
function staffHit(si,pt){
  const sy=ST.sys[si]; if(!sy) return null; const lastB=sy.bars[sy.bars.length-1];
  const bl=sy.bars.find(b=>pt.x>=b.x0&&pt.x<b.x1)||(pt.x>=lastB.x1?lastB:(pt.x>=sy.head-ST.sp?sy.bars[0]:null)); if(!bl) return null;
  const sp=ST.sp; let el=null, best=1e9;
  for(const e of bl.els){ const cx=e.hx+e.hw/2, dx=Math.abs(pt.x-cx); if(dx<Math.max(sp*1.05,e.hw*0.75)&&dx<best){ best=dx; el=e; } }
  return {bl,el,step:stepAt(pt.y)};
}
function showGhost(si,x,step){
  $$('#staff .ghost').forEach(g=>g.setAttribute('visibility','hidden'));
  const svg=$(`#staff svg.sys[data-s="${si}"]`); if(!svg) return; const g=$('.ghost',svg); const sp=ST.sp, y0=ST.y0, hw=HW[headKey(ed.ndur)]*sp, hx=x-hw/2, hy=y0+(38-step)*sp/2;
  const a=keyAlter(KEYMAP[P.key],((step%7)+7)%7);
  g.innerHTML=ledgers(step,hx,hw,sp,y0)+use(headKey(ed.ndur),hx,hy,sp)+`<text class="ghostlab" x="${r2(hx+hw+sp*0.5)}" y="${r2(hy-sp*0.7)}">${esc(noteName(step,a))}</text>`;
  g.setAttribute('visibility','visible');
}
function hideGhost(){ $$('#staff .ghost').forEach(g=>g.setAttribute('visibility','hidden')); }
function commitInsert(hit,x,step){
  const bl=hit.bl, L=ST.L, tick=bl.b*L+Math.round(xToTick(bl,x)/3)*3, end=sumD(P.notes);
  const n={s:step,a:keyAlter(KEYMAP[P.key],((step%7)+7)%7),d:ed.ndur,rest:false,tie:false};
  if(tick>=end){
    const barStart=bl.b*L;
    change(()=>{ let gap=barStart-end; const fill=[]; let t=end;
      while(gap>0){ const room=Math.min(gap,L-(t%L)); fill.push({s:34,a:0,d:room,rest:true,tie:false}); gap-=room; t+=room; }
      P.notes.push(...fill,n); ed.ns=P.notes.length-1; },()=>`${noteSay(n.s,n.a)}, ${FIGNAME[n.d]}`);
  } else {
    let i=0,t=0; while(i<P.notes.length&&t+P.notes[i].d/2<=tick){ t+=P.notes[i].d; i++; }
    insertNote(n,i);
  }
}
function bindStaff(){
  const box=$('#staff');
  box.addEventListener('pointerdown',e=>{
    const svg=e.target.closest('svg.sys'); if(!svg||e.button!==0) return; const si=+svg.dataset.s, pt=svgPt(svg,e), hit=staffHit(si,pt); if(!hit) return;
    box.focus({preventScroll:true});
    if(hit.el){ selectNote(hit.el.ni); const n=selN();
      if(n&&!n.rest&&e.pointerType!=='touch'){ drag={kind:'move',cy:e.clientY,s0:n.s,snap:snap(),moved:false,id:e.pointerId}; try{ box.setPointerCapture(e.pointerId);}catch(_){} } return; }
    drag={kind:'add',si,hit,x:pt.x,step:hit.step,id:e.pointerId}; showGhost(si,pt.x,hit.step);
    if(e.pointerType!=='touch'){ try{ svg.setPointerCapture(e.pointerId);}catch(_){} }
  });
  box.addEventListener('pointermove',e=>{
    const svg=e.target.closest('svg.sys')||(drag&&$(`#staff svg.sys[data-s="${drag.si}"]`));
    if(drag&&drag.kind==='move'){ const n=selN(); if(!n) return; const ns=Math.max(14,Math.min(56,drag.s0+Math.round((drag.cy-e.clientY)/(ST.sp/2))));
      if(ns!==n.s){ n.s=ns; n.a=keyAlter(KEYMAP[P.key],((ns%7)+7)%7); fixTies(); drag.moved=true; renderStaff(); renderPalette(); } return; }
    if(drag&&drag.kind==='add'){ const sv=$(`#staff svg.sys[data-s="${drag.si}"]`); const pt=svgPt(sv,e); drag.step=stepAt(pt.y); drag.x=pt.x; showGhost(drag.si,pt.x,drag.step); return; }
    if(svg&&e.pointerType==='mouse'){ const si=+svg.dataset.s, pt=svgPt(svg,e), hit=staffHit(si,pt); if(hit&&!hit.el) showGhost(si,pt.x,hit.step); else hideGhost(); }
  });
  const end=e=>{ if(!drag) return; const d=drag; drag=null;
    if(d.kind==='add'){ hideGhost(); if(e.type==='pointerup') { const hit=staffHit(d.si,{x:d.x,y:0}); commitInsert(hit||d.hit,d.x,d.step); } }
    else if(d.kind==='move'&&d.moved){ const h=H(); h.u.push(d.snap); if(h.u.length>100) h.u.shift(); h.r.length=0; commit(); const n=selN(); if(n) say(noteSay(n.s,n.a)); } };
  box.addEventListener('pointerup',end); box.addEventListener('pointercancel',end);
  box.addEventListener('pointerleave',e=>{ if(!drag&&e.pointerType==='mouse') hideGhost(); });
}
