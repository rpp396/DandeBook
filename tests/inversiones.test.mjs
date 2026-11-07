// Inversiones: bajo correcto, se conservan al editar, tecla I, botones, nombre hablado, sonido y móvil.
import { part, ok, done } from './lib.mjs';
await part('Inversiones', { width: 1280, height: 900 }, async (b, E) => {
  // bajo de cada inversión, con su ortografía
  const cases = { 'C': ['C/E', 'C/G', null], 'Bb': ['Bb/D', 'Bb/F', null], 'Dm7': ['Dm7/F', 'Dm7/A', 'Dm7/C'], 'G7': ['G7/B', 'G7/D', 'G7/F'],
    'F#m7b5': ['F#m7b5/A', 'F#m7b5/C', 'F#m7b5/E'], 'Ebdim7': ['Ebdim7/Gb', 'Ebdim7/A', 'Ebdim7/C'], 'Abmaj7': ['Abmaj7/C', 'Abmaj7/Eb', 'Abmaj7/G'],
    'Dsus4': ['Dsus4/G', 'Dsus4/A', null], 'C6': ['C6/E', 'C6/G', 'C6/A'], 'Caug': ['Caug/E', 'Caug/G#', null], 'E7alt': ['E7alt/G#', 'E7alt/C', 'E7alt/D'] };
  const got = JSON.parse(await E(`JSON.stringify(Object.fromEntries(${JSON.stringify(Object.keys(cases))}.map(t=>{ const c=parseChord(t); return [t,[1,2,3].map(k=>{ const bb=invBass(c,k); return bb?chordText({...c,b:bb,d:12}):null; })]; })))`));
  for (const [k, v] of Object.entries(cases)) ok(JSON.stringify(got[k]) === JSON.stringify(v), `inversiones de ${k}`, got[k]);
  ok(await E(`invOf(parseChord('C/E'))===1 && invOf(parseChord('C/G'))===2 && invOf(parseChord('G7/F'))===3 && invOf(parseChord('C/D'))===-1 && invOf(parseChord('C'))===0 && invOf(parseChord('C/C'))===0`), 'invOf reconoce cada caso');
  ok(await E(`invOf(parseChord('C/Fb'))===1`), 'invOf por sonido: C/Fb cuenta como 1.ª');

  // paleta
  await E(`document.querySelector('#bNew').click()`); await b.sleep(80);
  const pal = s => b.clickSel('#palette ' + s);
  await pal('[data-act="root"][data-r="0"]'); // C
  ok(await E(`[...document.querySelectorAll('[data-act="inv"] .ib')].map(x=>x.textContent).join(' ')`) === 'C /E /G ', 'botones: C /E /G y 3.ª vacía', await E(`[...document.querySelectorAll('[data-act="inv"] .ib')].map(x=>x.textContent)`));
  ok(await E(`document.querySelector('[data-act="inv"][data-k="3"]').disabled && document.querySelector('[data-act="inv"][data-k="0"]').getAttribute('aria-pressed')==='true'`), '3.ª apagada en una tríada; Fund. pulsado');
  await pal('[data-act="inv"][data-k="1"]');
  ok(await E('chordText(P.chords[0])') === 'C/E', '1.ª → C/E', await E('chordText(P.chords[0])'));
  ok(await E(`document.querySelector('[data-act="inv"][data-k="1"]').getAttribute('aria-pressed')==='true'`), '1.ª queda pulsada');
  ok((await E('chordSay(P.chords[0])')) === 'Do mayor, primera inversión, bajo en Mi', 'nombre hablado', await E('chordSay(P.chords[0])'));
  ok((await E(`document.querySelector('#grid .seg[data-ci="0"]').getAttribute('aria-label')`)).includes('primera inversión'), 'la grilla lo anuncia');
  await pal('[data-act="qual"][data-q="m"]');
  ok(await E('chordText(P.chords[0])') === 'Cm/Eb', 'cambiar la calidad conserva la inversión: Cm/Eb', await E('chordText(P.chords[0])'));
  await pal('[data-act="qual"][data-q="m7"]'); await pal('[data-act="inv"][data-k="3"]');
  ok(await E('chordText(P.chords[0])') === 'Cm7/Bb', '3.ª de Cm7 → Cm7/Bb', await E('chordText(P.chords[0])'));
  await pal('[data-act="qual"][data-q="m"]');
  ok(await E('chordText(P.chords[0])') === 'Cm/Bb', 'si la calidad nueva no tiene séptima, el bajo se queda', await E('chordText(P.chords[0])'));
  await pal('[data-act="qual"][data-q="maj7"]');
  ok(await E('chordText(P.chords[0])') === 'Cmaj7/Bb', 'y queda como otro bajo', await E('chordText(P.chords[0])'));
  await pal('[data-act="inv"][data-k="2"]');
  ok(await E('chordText(P.chords[0])') === 'Cmaj7/G', '2.ª → Cmaj7/G');
  await pal('[data-act="rmode"]'); await pal('[data-act="root"][data-r="3"]'); await pal('[data-act="rmode"]');
  ok(await E('chordText(P.chords[0])') === 'Fmaj7/C', 'cambiar la fundamental conserva la inversión: Fmaj7/C', await E('chordText(P.chords[0])'));
  await pal('[data-act="acc"][data-a="1"]');
  ok(await E('chordText(P.chords[0])') === 'F#maj7/C#', 'el sostenido de la fundamental arrastra el bajo', await E('chordText(P.chords[0])'));
  await pal('[data-act="inv"][data-k="0"]');
  ok(await E('chordText(P.chords[0])') === 'F#maj7', 'Fund. quita el bajo');
  // teclado
  await b.clickSel('#grid .seg[data-ci="0"]');
  const seq = [];
  for (let i = 0; i < 5; i++) { await b.key('i'); seq.push(await E('chordText(P.chords[0])')); }
  ok(seq.join(' ') === 'F#maj7/A# F#maj7/C# F#maj7/E# F#maj7 F#maj7/A#', 'la tecla I recorre las inversiones', seq);
  await b.key('ArrowUp');
  ok(await E('chordText(P.chords[0])') === 'Gmaj7/B', '↑ con inversión: Gmaj7/B', await E('chordText(P.chords[0])'));
  await E('undo()'); ok(await E('chordText(P.chords[0])') === 'F#maj7/A#', 'deshacer');
  // otro bajo con / Bajo sigue funcionando
  await pal('[data-act="bass"]'); await pal('[data-act="root"][data-r="1"]');
  ok(await E('chordText(P.chords[0])') === 'F#maj7/D' && await E('invOf(P.chords[0])') === -1, '/ Bajo pone un bajo ajeno', await E('chordText(P.chords[0])'));
  ok(await E(`[...document.querySelectorAll('[data-act="inv"]')].every(x=>x.getAttribute('aria-pressed')==='false')`), 'con otro bajo no hay inversión pulsada');
  // transporte conserva la inversión
  await E(`P.chords=[parseChord('C/E'),parseChord('G7/D'),parseChord('Am7/G')].map(c=>({...c,d:48})); ed.cs=0; renderAll(); document.querySelector('#bTr').click(); document.querySelector('#trTo').value='Eb'; document.querySelector('#bTrGo').click()`);
  ok(await E('P.chords.map(chordText).join(" ")') === 'Eb/G Bb7/F Cm7/Bb', 'transportar a Eb', await E('P.chords.map(chordText).join(" ")'));
  // texto
  ok(await E(`(()=>{ const q=importText(exportText(P)); return q.chords.map(chordText).join(' '); })()`) === 'Eb/G Bb7/F Cm7/Bb', 'ida y vuelta por texto');
  // sonido: el bajo que suena es el de la inversión
  ok(await E(`(()=>{ ensureAudio(); A.bus=A.ctx.createGain(); const ms=[]; const orig=tone; window.tone=(inst,m,t,d,v,role)=>{ ms.push(role+m); }; try{ playChord(parseChord('C/E'),A.ctx.currentTime+1,0.5,1); } finally { window.tone=orig; } return ms[0]; })()`) === 'bass40', 'suena E2 en el bajo');
});
// móvil: la paleta con la fila nueva
await part('Inversiones en el móvil', { width: 390, height: 844, mobile: true, scale: 2 }, async (m) => {
  await m.eval(`(()=>{ store.cur=store.pages[0].id; ed.cs=1; P.chords[1].b={r:6,a:0}; renderAll(); dockSize(); document.querySelector('#grid').scrollIntoView({block:'start'}); })()`); await m.sleep(200);
  const small = await m.eval(`[...document.querySelectorAll('#palette .invs button')].filter(b=>b.getBoundingClientRect().height<43.5).length`);
  ok(small === 0, 'móvil: botones de inversión de 44 px');
  ok(await m.eval(`[...document.querySelectorAll('#palette .invs .ib, #palette .invs .il')].every(e=>{ const r=e.getBoundingClientRect(), p=e.closest('button').getBoundingClientRect(); return r.right<=p.right+0.5&&r.left>=p.left-0.5; })`), 'móvil: los textos caben en los botones');
  ok(await m.eval('document.documentElement.scrollWidth') <= 390, 'móvil: sin desbordar');
});
done('inversiones');
