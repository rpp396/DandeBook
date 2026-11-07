// Pautado · Instrumentos sintetizados en el navegador (sin muestras ni archivos): piano, piano eléctrico, guitarra, órgano,
// cuerdas y el triángulo de 8 bits del principio, más una reverberación suave.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Instrumentos ---------- */
const INSTS=[['piano','Piano'],['epiano','Piano eléctrico'],['guitar','Guitarra'],['organ','Órgano'],['pad','Cuerdas'],['chip','8 bits']];
const INST_KEYS=INSTS.map(x=>x[0]);
const mf=m=>440*Math.pow(2,(m-69)/12);
// Los de cuerda (piano, piano eléctrico, guitarra) se calculan una vez por nota en un AudioBuffer y se guardan:
// 32 kHz basta para estos timbres y ocupa la mitad que 44,1 kHz. Mono, normalizado a 1.
const BSR=32000, bufCache=new Map();
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalize(d){ let pk=0; for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; } if(pk>0) for(let i=0;i<d.length;i++) d[i]/=pk; return d; }
// Piano: parciales algo inarmónicos (más agudos cuanto más arriba), cada uno con caída en dos tiempos (golpe y resonancia),
// los graves con dos cuerdas un poco desafinadas entre sí (el batido del piano) y un golpe de macillo de ruido muy corto.
function pianoData(m){
  const f=mf(m), T0=clampN(3.2*Math.sqrt(110/f),0.7,4.5), len=Math.round(BSR*clampN(T0*1.6,1.4,5)), d=new Float32Array(len);
  const B=0.00012*Math.pow(2,(m-48)/12), bright=clampN(2600+f*2,2600,7000);
  for(let n=1;n<=16;n++){
    const fn=f*n*Math.sqrt(1+B*n*n); if(fn>BSR*0.45) break;
    const amp=(1/Math.pow(n,1.1))*Math.exp(-fn/bright)*(n===1?1:1.15), tau=T0/(1+0.45*(n-1));
    for(const det of n<=6?[1-0.0004,1+0.0004]:[1]){
      const w=2*Math.PI*fn*det/BSR, c=Math.cos(w), s=Math.sin(w); let x=1, y=0;
      const d1=Math.exp(-1/(tau*0.18*BSR)), d2=Math.exp(-1/(tau*BSR)); let e1=0.62*amp, e2=0.38*amp;
      for(let i=0;i<len;i++){ d[i]+=y*(e1+e2); const nx=x*c-y*s; y=x*s+y*c; x=nx; e1*=d1; e2*=d2; }
    }
  }
  // macillo: ruido filtrado de 12 ms
  let lp=0; const k=clampN(f/4000,0.05,0.5); for(let i=0;i<BSR*0.012;i++){ lp+=k*((Math.random()*2-1)-lp); d[i]+=lp*0.25*(1-i/(BSR*0.012)); }
  for(let i=0;i<64;i++) d[i]*=i/64; // ataque sin chasquido
  return normalize(d);
}
// Piano eléctrico (FM, tipo Rhodes): portadora y moduladora a la misma frecuencia con índice que se apaga, más el «ping» de la púa
function epianoData(m){
  const f=mf(m), tau=clampN(2.2*Math.pow(220/f,0.45),0.6,3.5), len=Math.round(BSR*clampN(tau*1.8,1.2,4.5)), d=new Float32Array(len);
  const w=2*Math.PI*f/BSR, wb=2*Math.PI*f*14/BSR, I0=clampN(2.4*Math.pow(220/f,0.3),0.6,3);
  for(let i=0;i<len;i++){ const t=i/BSR, I=I0*Math.exp(-t/0.28)+0.25;
    d[i]=Math.exp(-t/tau)*Math.sin(w*i+I*Math.sin(w*i))+0.18*Math.exp(-t/0.04)*Math.sin(wb*i); }
  for(let i=0;i<48;i++) d[i]*=i/48;
  return normalize(d);
}
// Guitarra: Karplus-Strong (una línea de retardo con un filtro que promedia), afinada con un paso todo de retardo fraccionario
function guitarData(m){
  const f=mf(m), P=BSR/f, N=Math.max(2,Math.floor(P-0.5)), frac=P-N-0.5, C=(1-frac)/(1+frac);
  const T60=clampN(4.5*Math.sqrt(110/f),1.2,6), rho=Math.pow(10,-3/(T60*f)), len=Math.round(BSR*clampN(T60*0.8,1.2,5)), d=new Float32Array(len);
  const D=new Float32Array(N); let lp=0; const soft=clampN(0.25+f/2500,0.25,0.8); // nailon: pulsación suave
  for(let i=0;i<N;i++){ lp+=soft*((Math.random()*2-1)-lp); D[i]=lp; }
  // posición de la pulsación (a 1/7 de la cuerda): resta una copia retrasada
  const q=Math.max(1,Math.round(N/7)), D0=D.slice(); for(let i=0;i<N;i++) D[i]=D0[i]-0.7*D0[(i+N-q)%N];
  let idx=0, x1=0, ax=0, ay=0;
  for(let i=0;i<len;i++){ const x=D[idx]; const avg=rho*0.5*(x+x1); x1=x; const y=C*avg+ax-C*ay; ax=avg; ay=y; D[idx]=y; d[i]=x; idx=(idx+1)%N; }
  for(let i=0;i<32;i++) d[i]*=i/32;
  return normalize(d);
}
const BUILD={piano:pianoData,epiano:epianoData,guitar:guitarData};
function instBuf(inst,m){
  const k=inst+m; let b=bufCache.get(k); if(b) return b;
  const data=BUILD[inst](m); b=A.ctx.createBuffer(1,data.length,BSR); b.copyToChannel(data,0); bufCache.set(k,b); return b;
}
// Volumen y apagado (al soltar la tecla) de cada instrumento y papel: bajo, voces del acorde, melodía
const MIX={
  piano:{bass:0.31,chord:0.12,mel:0.27,rel:0.12}, epiano:{bass:0.22,chord:0.083,mel:0.19,rel:0.15}, guitar:{bass:0.55,chord:0.2,mel:0.48,rel:0.25},
  organ:{bass:0.20,chord:0.06,mel:0.15,rel:0.04}, pad:{bass:0.16,chord:0.055,mel:0.13,rel:0.35}, chip:{bass:0.30,chord:0.075,mel:0.24,rel:0.05},
};
let organWave=null;
// Una nota: inst, midi, inicio y duración en segundos, fuerza 0–1 y papel ('bass', 'chord' o 'mel')
function tone(inst,m,t,dur,vel,role,dest=A.bus){
  const c=A.ctx, mx=MIX[inst]||MIX.piano, peak=mx[role]*vel, end=t+Math.max(0.06,dur);
  if(inst==='chip'){ const p={bass:[0.30,0.16,700],chord:[0.075,0.04,2400],mel:[0.24,0.15,3600]}[role]; voice(dest,mf(m),t,dur,'triangle',p[0]*vel,p[1]*vel,p[2]); return; }
  const g=c.createGain(); g.connect(dest);
  if(BUILD[inst]){
    const src=c.createBufferSource(); src.buffer=instBuf(inst,m); src.connect(g);
    g.gain.setValueAtTime(peak,t); g.gain.setTargetAtTime(0.0001,end,mx.rel);
    src.start(t); src.stop(Math.min(t+src.buffer.duration,end+mx.rel*6)); return;
  }
  const f=mf(m);
  if(inst==='organ'){ // registros 8', 4', 2 2/3' y 2' en una onda, más el 16' aparte, con un vibrato lento
    if(!organWave){ const re=new Float32Array([0,1,0.7,0.45,0.35,0,0.2,0,0.15]), im=new Float32Array(re.length); organWave=c.createPeriodicWave(re,im); }
    const o=c.createOscillator(), sub=c.createOscillator(), sg=c.createGain(), lfo=c.createOscillator(), lg=c.createGain();
    o.setPeriodicWave(organWave); o.frequency.value=f; sub.type='sine'; sub.frequency.value=f/2; sg.gain.value=0.5;
    lfo.frequency.value=5.6; lg.gain.value=f*0.0025; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); sub.connect(sg); sg.connect(g);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+0.012); g.gain.setTargetAtTime(0.0001,end,mx.rel);
    [o,sub,lfo].forEach(x=>{ x.start(t); x.stop(end+mx.rel*6); }); return;
  }
  // cuerdas: dos sierras desafinadas, filtro paso bajo y entrada lenta
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(5000,1400+f*2); lp.Q.value=0.4; lp.connect(g);
  const os=[-7,7].map(ct=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=ct; o.connect(lp); return o; });
  const att=role==='bass'?0.06:0.14;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+att); g.gain.setTargetAtTime(0.0001,Math.max(end,t+att),mx.rel);
  os.forEach(o=>{ o.start(t); o.stop(Math.max(end,t+att)+mx.rel*6); });
}
// Reverberación: respuesta al impulso de ruido estéreo que se apaga en 2 s (calculada una vez)
function makeReverb(c){
  const len=Math.round(c.sampleRate*2.2), ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); let lp=0; for(let i=0;i<len;i++){ lp+=0.35*((Math.random()*2-1)-lp); d[i]=lp*Math.pow(1-i/len,2.6)*(i<c.sampleRate*0.01?i/(c.sampleRate*0.01):1); } }
  const cv=c.createConvolver(); cv.buffer=ir; return cv;
}
// Para oír un instrumento al elegirlo: un acorde de Do mayor, o una frase corta de melodía
function previewInst(inst,role){
  if(A.playing||!ensureAudio()) return; const c=A.ctx, bus=c.createGain(); bus.connect(A.out); bus.connect(A.rev);
  const keep=A.bus; A.bus=bus; const t=c.currentTime+0.05;
  try{ if(role==='mel') [72,76,79,84].forEach((m,i)=>tone(inst,m,t+i*0.22,0.24,1,'mel',bus));
    else { tone(inst,36,t,1.4,1,'bass',bus); [60,64,67,72].forEach(m=>tone(inst,m,t,1.4,1,'chord',bus)); } }
  finally{ A.bus=keep; }
}
