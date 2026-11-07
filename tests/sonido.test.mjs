// Sonido: cada instrumento suena, afinado y sin saturar (renderizado sin altavoces con OfflineAudioContext), los ajustes
// se guardan y se validan, y la reproducción calcula las notas antes de arrancar.
import { part, ok, done } from './lib.mjs';

await part('Instrumentos', { width: 1280, height: 900 }, async (b, E) => {
  // renderiza un acorde de C con bajo y una melodía con cada instrumento y mide el resultado
  const res = JSON.parse(await E(`(async()=>{ ensureAudio(); const out={};
    for(const inst of INST_KEYS){
      const sr=44100, off=new OfflineAudioContext(2,sr*4,sr), keep={ctx:A.ctx,bus:A.bus,rev:A.rev,out:A.out};
      A.ctx=off; const comp=off.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=4; comp.connect(off.destination);
      A.out=comp; A.rev=makeReverb(off); const wet=off.createGain(); wet.gain.value=0.22; A.rev.connect(wet); wet.connect(comp);
      A.bus=off.createGain(); A.bus.connect(A.out); A.bus.connect(A.rev);
      try{ playChord({r:0,a:0,q:'maj7',d:48},0.05,1.2,1); [72,74,76,77].forEach((m,i)=>tone(inst,m,1.4+i*0.3,0.3,1,'mel')); }
      finally{ Object.assign(A,keep); }
      const buf=await off.startRendering(), d=buf.getChannelData(0); let pk=0, s=0, bad=false;
      for(let i=0;i<d.length;i++){ const v=d[i]; if(!isFinite(v)) bad=true; pk=Math.max(pk,Math.abs(v)); s+=v*v; }
      // el acorde suena y la cola se apaga: energía entre 0,1 y 1 s, y casi nada al final
      const rms=(a,z)=>{ let q=0; for(let i=a;i<z;i++) q+=d[i]*d[i]; return Math.sqrt(q/(z-a)); };
      out[inst]={pk:+pk.toFixed(3), body:+rms(sr*0.1,sr*1).toFixed(4), tail:+rms(sr*3.8,sr*4).toFixed(5), bad};
    }
    return JSON.stringify(out); })()`));
  for (const inst of Object.keys(res)) {
    const r = res[inst];
    ok(!r.bad && r.body > 0.01, `${inst}: suena`, r);
    ok(r.pk < 0.99, `${inst}: sin saturar`, r);
    ok(r.tail < r.body / 5, `${inst}: se apaga`, r);
  }
  ok(Object.keys(res).length === 6, 'seis instrumentos', Object.keys(res));

  // afinación de los que se calculan nota a nota (autocorrelación: el primer pico casi tan alto como el mayor)
  const tune = JSON.parse(await E(`(()=>{ const out={};
    const f0=d=>{ const s=Math.round(BSR*0.2), n=4096, ac=[]; let mx=0; for(let lag=8;lag<900;lag++){ let a=0; for(let i=0;i<n;i++) a+=d[s+i]*d[s+i+lag]; ac[lag]=a; if(a>mx) mx=a; }
      for(let lag=9;lag<899;lag++) if(ac[lag]>0.9*mx&&ac[lag]>=ac[lag-1]&&ac[lag]>=ac[lag+1]){ const y0=ac[lag-1],y1=ac[lag],y2=ac[lag+1], p=lag+0.5*(y0-y2)/(y0-2*y1+y2); return BSR/p; } return 0; };
    for(const inst of ['piano','epiano','guitar']) out[inst]=[45,57,69,76].map(m=>{ const f=f0(instBuf(inst,m).getChannelData(0)); return +(1200*Math.log2(f/mf(m))).toFixed(1); });
    return JSON.stringify(out); })()`));
  for (const [inst, cents] of Object.entries(tune)) ok(cents.every(c => Math.abs(c) < 15), `${inst}: afinado (A2, A3, A4, E5 a menos de 15 cents)`, cents);
  ok(await E(`instBuf('piano',60)===instBuf('piano',60)`), 'cada nota se calcula una vez');
});

await part('Ajustes de sonido', { width: 1280, height: 900 }, async (b, E) => {
  ok(await E(`store.set.snd==='piano' && store.set.msnd==='piano'`), 'piano por defecto');
  ok(await E(`[...document.querySelectorAll('#sSnd option')].map(o=>o.textContent).join()`) === 'Piano,Piano eléctrico,Guitarra,Órgano,Cuerdas,8 bits', 'la lista de sonidos');
  await E(`document.querySelector('#setBox').open=true; const s=document.querySelector('#sSnd'); s.value='guitar'; s.dispatchEvent(new Event('change')); const m=document.querySelector('#sMsnd'); m.value='epiano'; m.dispatchEvent(new Event('change'))`);
  await b.sleep(400);
  ok(await E(`store.set.snd==='guitar' && store.set.msnd==='epiano'`), 'se eligen');
  ok(await E(`JSON.parse(localStorage.getItem('pautado-v1')).set.snd`) === 'guitar', 'se guardan');
  ok((await E(`document.querySelector('#sr').textContent`)).startsWith('Melodía: Piano eléctrico'), 'se anuncian');
  await b.reload();
  ok(await E(`document.querySelector('#sSnd').value==='guitar' && document.querySelector('#sMsnd').value==='epiano'`), 'se recuerdan al volver');
  // valores raros en lo guardado
  await E(`localStorage.setItem('pautado-v1', JSON.stringify({pages:[],set:{snd:'__proto__',msnd:'<b>'}}))`); await b.reload();
  ok(await E(`store.set.snd==='piano' && store.set.msnd==='piano'`), 'un sonido desconocido vuelve a piano');
  // reproducir con cada instrumento: las notas ya están calculadas al arrancar y no hay errores
  for (const inst of ['piano', 'organ', 'pad', 'chip']) {
    await E(`store.set.snd=store.set.msnd='${inst}'; bufCache.clear()`);
    await b.clickSel('#bPlay'); await b.sleep(500);
    ok(await E('A.playing'), `reproduce con ${inst}`);
    await E('stop()');
  }
  await E(`store.set.snd=store.set.msnd='guitar'; bufCache.clear(); play()`);
  ok(await E(`P.chords.every(c=>c.nc||bufCache.has('guitar'+(36+((PC[c.r]+c.a+12)%12))) || !!c.b)`), 'al darle a reproducir, las notas de guitarra ya están calculadas');
  await E('stop()');
});

done('sonido');
