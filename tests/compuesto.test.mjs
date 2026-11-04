// Tono de G♭ mayor y puntillo por defecto en compás compuesto (6/8, 12/8).
import { part, ok, done } from './lib.mjs';

await part('Tono de G♭ mayor', { width: 1280, height: 900 }, async (b, E) => {
  ok(await E(`KEYMAP.Gb && KEYMAP.Gb.n===-6 && LET[KEYMAP.Gb.r]==='G' && KEYMAP.Gb.a===-1`), 'G♭ mayor con 6 bemoles');
  ok((await E(`document.querySelector('#pKey option[value="Gb"]').textContent`)) === 'G♭ mayor (6 ♭)', 'aparece en el selector de tono', await E(`[...document.querySelectorAll('#pKey option')].map(o=>o.textContent)`));
  ok(await E(`[...document.querySelectorAll('#trTo option')].some(o=>o.value==='Gb')`), 'y en el de transportar');
  // transportar la página de ejemplo de Do a Sol bemol
  await E(`document.querySelector('#bTr').click(); document.querySelector('#trTo').value='Gb'; document.querySelector('#bTrGo').click()`); await b.sleep(60);
  ok(await E('P.key') === 'Gb', 'tono Gb');
  ok(await E('P.chords.map(chordText).join(" ")') === 'Abm7 Db7 Gbmaj7 Gbmaj7 Bbm7 Eb7 Abm7 Db7 Gb6 Gb6', 'acordes transportados a G♭', await E('P.chords.map(chordText).join(" ")'));
  ok(await E('P.notes.filter(n=>!n.rest).map(pitchTok).slice(0,4).join(" ")') === 'Cb5 Eb5 Gb5 Bb5', 'melodía transportada (F4 → Cb5)', await E('P.notes.filter(n=>!n.rest).map(pitchTok).slice(0,4).join(" ")'));
  // armadura de 6 bemoles en el pentagrama y alteraciones que ya da la armadura
  await E(`store.set.view='staff'; renderAll()`);
  ok(await E(`document.querySelectorAll('#staff svg.sys')[0].querySelectorAll('.gl use[href="#g-flat"]').length`) === 6, 'armadura de 6 bemoles', await E(`document.querySelectorAll('#staff svg.sys')[0].querySelectorAll('.gl use[href="#g-flat"]').length`));
  ok(await E(`ST.sys[0].bars[0].els.filter(e=>!e.rest).every(e=>e.acc==null)`), 'las notas de la escala no llevan alteración propia');
  ok(await E(`(()=>{ const n=P.notes.length; noteByLetter(0); const c=P.notes[n]; noteByLetter(3); const f=P.notes[n+1]; return pitchTok(c).startsWith('Cb')&&pitchTok(f).startsWith('F')&&f.a===0; })()`), 'la tecla C escribe C♭ y la F, F natural');
  await E('undo(); undo()');
  // texto: exportar e importar
  ok((await E('exportText(P)')).includes('Tono: Gb'), 'se exporta como «Tono: Gb»');
  ok(await E(`importText('Tono: G♭\\n| Gb | Db7 |').key==='Gb' && importText('Tono: Gb\\n| Gb |').key==='Gb'`), 'se importa como Gb y como G♭');
  // vuelta a Do
  await E(`document.querySelector('#bTr').click(); document.querySelector('#trTo').value='C'; document.querySelector('#bTrGo').click()`); await b.sleep(60);
  ok(await E('P.chords.map(chordText).join(" ")') === 'Dm7 G7 Cmaj7 Cmaj7 Em7 A7 Dm7 G7 C6 C6', 'de G♭ a Do: acordes originales', await E('P.chords.map(chordText).join(" ")'));
  ok(await E('P.notes.filter(n=>!n.rest).map(pitchTok).slice(0,4).join(" ")') === 'F4 A4 C5 E5', 'y la melodía en su octava (el tritono baja si la melodía está aguda)', await E('P.notes.filter(n=>!n.rest).map(pitchTok).slice(0,4).join(" ")'));
  ok(await E(`(()=>{ const lo=[{s:28,a:0,d:12}], hi=[{s:40,a:0,d:12}]; return trFor(KEYMAP.C,KEYMAP['F#'],lo).dc===6 && trFor(KEYMAP.C,KEYMAP['F#'],hi).dc===-6 && trFor(KEYMAP.C,KEYMAP.F,hi).dc===5; })()`), 'el tritono sube con la melodía grave y baja con la aguda; los demás intervalos no cambian');
  // se guarda y se recupera
  await E(`P.key='Gb'; touch(P); saveLocal()`); await b.reload();
  ok(await E('P.key') === 'Gb', 'el tono G♭ se conserva al recargar');
});

await part('Puntillo en compás compuesto', { width: 1280, height: 900 }, async (b, E) => {
  const pal = s => b.clickSel('#palette ' + s);
  const dotOn = sel => E(`document.querySelector('${sel}').getAttribute('aria-pressed')==='true'`);
  await E(`document.querySelector('#bNew').click()`); await b.sleep(60);
  ok(await E('ed.cdot===false && ed.ndot===false && ed.cdur===48 && ed.ndur===12'), '4/4: puntillo desactivado', await E('JSON.stringify(ed)'));
  ok(!(await dotOn('[data-act="dot"]')), '4/4: botón de puntillo sin pulsar');
  // cambiar a 6/8
  await E(`(()=>{ const s=document.querySelector('#pSig'); s.value='6/8'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(60);
  ok(await E('ed.cdot===true && ed.ndot===true && ed.cdur===36 && ed.ndur===18'), '6/8: puntillo activado; acordes de un compás y notas de negra con puntillo', await E('JSON.stringify([ed.cdot,ed.ndot,ed.cdur,ed.ndur])'));
  ok(await dotOn('[data-act="dot"]'), '6/8: botón de puntillo pulsado');
  // grilla
  await pal('[data-act="root"][data-r="1"]');
  ok(await E('P.chords[0].d') === 36, 'un acorde nuevo ocupa el compás de 6/8', await E('P.chords[0].d'));
  await pal('[data-act="dur"][data-d="12"]'); ok(await E('P.chords[0].d') === 18, 'negra → negra con puntillo', await E('P.chords[0].d'));
  await pal('[data-act="dur"][data-d="24"]'); ok(await E('P.chords[0].d') === 36, 'blanca → blanca con puntillo');
  await pal('[data-act="dur"][data-d="6"]'); ok(await E('P.chords[0].d') === 9, 'corchea → corchea con puntillo');
  await pal('[data-act="dot"]');
  ok(await E('P.chords[0].d') === 6 && await E('ed.cdot') === false && !(await dotOn('[data-act="dot"]')), 'quitar el puntillo: corchea y botón sin pulsar');
  await pal('[data-act="dur"][data-d="12"]'); ok(await E('P.chords[0].d') === 12, 'sin puntillo, negra es negra');
  await pal('[data-act="dot"]'); ok(await E('P.chords[0].d') === 18 && await E('ed.cdot'), 'volver a ponerlo');
  await b.clickSel('#grid .seg[data-ci="0"]'); await b.key('2');
  ok(await E('P.chords[0].d') === 36, 'tecla 2 con puntillo: blanca con puntillo');
  await pal('[data-act="dur"][data-d="bar"]'); ok(await E('P.chords[0].d') === 36, '«Compás» es siempre el compás');
  // el puntillo sigue al acorde que eliges
  await E(`P.chords=[[1,18],[4,18],[0,12],[3,6],[2,18],[5,36]].map(([r,d])=>({r,a:0,q:'',d})); ed.cs=-1; renderAll()`);
  await E('selectChord(2)'); ok(await E('ed.cdot') === false, 'elegir una negra quita el puntillo');
  await E('selectChord(0)'); ok(await E('ed.cdot') === true, 'elegir una negra con puntillo lo pone');
  await E('selectChord(2); selectChord(5)'); ok(await E('ed.cdot') === false, 'un compás entero no cambia el puntillo');
  // pentagrama
  await E(`store.set.view='staff'; P.notes=[]; ed.ns=-1; ed.ndot=true; ed.ndur=18; renderAll()`);
  ok(await dotOn('[data-act="ndot"]'), 'puntillo de notas pulsado');
  const pos = await E(`(()=>{ const sv=document.querySelector('#staff svg.sys'); const r=sv.getBoundingClientRect(); const bl=ST.sys[0].bars[0]; return {x:r.left+bl.xs[0]+ST.sp, y:r.top+ST.y0+2*ST.sp}; })()`);
  await b.click(pos.x, pos.y); await b.sleep(60);
  ok(await E('P.notes.length===1 && P.notes[0].d===18'), 'la primera nota es una negra con puntillo', await E('JSON.stringify(P.notes)'));
  await E(`document.querySelector('#staff').focus()`);
  await b.key('8'); ok(await E('P.notes[0].d') === 9, 'tecla 8: corchea con puntillo');
  await b.key('.'); ok(await E('P.notes[0].d') === 6 && await E('ed.ndot') === false, 'tecla . quita el puntillo: corchea');
  await b.key('4'); ok(await E('P.notes[0].d') === 12, 'sin puntillo, tecla 4: negra');
  await b.key('e'); ok(await E('P.notes[1].d') === 12, 'la nota siguiente sale igual');
  await b.key('.'); ok(await E('P.notes[1].d') === 18 && await E('ed.ndot'), 'tecla . lo vuelve a poner');
  await b.key('6'); ok(await E('P.notes[1].d') === 3 && await E('ed.ndot'), 'la semicorchea no lleva puntillo, pero el puntillo sigue activado');
  await b.key('4'); ok(await E('P.notes[1].d') === 18, 'y la figura siguiente vuelve a salir con puntillo');
  await E('selectNote(0)'); ok(await E('ed.ndot') === false && !(await dotOn('[data-act="ndot"]')), 'elegir una negra sin puntillo quita el puntillo');
  await E('selectNote(1)'); ok(await E('ed.ndot') === true, 'elegir una negra con puntillo lo pone');
  // 12/8, vuelta a 4/4 y cambio de página
  await E(`(()=>{ const s=document.querySelector('#pSig'); s.value='12/8'; s.dispatchEvent(new Event('change')); })()`);
  ok(await E('ed.cdot && ed.ndot && ed.cdur===72 && ed.ndur===18'), '12/8: puntillo activado y acordes de 4 pulsos');
  await E(`(()=>{ const s=document.querySelector('#pSig'); s.value='4/4'; s.dispatchEvent(new Event('change')); })()`);
  ok(await E('!ed.cdot && !ed.ndot && ed.cdur===48 && ed.ndur===12'), 'de vuelta a 4/4 se desactiva');
  await E('undo()'); const comp = await E('P.id');
  await E(`(()=>{ const s=document.querySelector('#pSig'); s.value='6/8'; s.dispatchEvent(new Event('change')); })()`);
  await E(`store.cur=store.pages.find(p=>p.ex).id; afterSwitch()`);
  ok(await E('!ed.cdot && !ed.ndot'), 'al abrir una página en 4/4, sin puntillo');
  await E(`store.cur=${JSON.stringify(comp)}; afterSwitch()`);
  ok(await E('ed.cdot && ed.ndot'), 'al volver a la página en 6/8, con puntillo');
  await E(`document.querySelector('#bNew').click()`);
  ok(await E(`P.sig==='6/8' && ed.cdot && ed.ndot`), 'una página nueva hereda el compás y el puntillo');
  await b.reload();
  ok(await E(`P.sig==='6/8' && ed.cdot && ed.ndot && ed.cdur===36`), 'al recargar en 6/8, con puntillo');
});

await part('Puntillo en compás simple', { width: 1280, height: 900 }, async (b, E) => {
  const pal = s => b.clickSel('#palette ' + s);
  await E(`document.querySelector('#bNew').click()`); await b.sleep(60);
  await pal('[data-act="root"][data-r="0"]'); await pal('[data-act="dur"][data-d="24"]');
  ok(await E('P.chords[0].d') === 24, '4/4: blanca sin puntillo');
  await pal('[data-act="dot"]'); ok(await E('P.chords[0].d') === 36 && await E('ed.cdot'), 'el puntillo se activa a mano');
  await pal('[data-act="dur"][data-d="12"]'); ok(await E('P.chords[0].d') === 18, 'y se mantiene al cambiar de figura');
  await pal('[data-act="dot"]'); ok(await E('P.chords[0].d') === 12 && !(await E('ed.cdot')), 'hasta quitarlo');
  await E(`(()=>{ const s=document.querySelector('#pSig'); s.value='3/4'; s.dispatchEvent(new Event('change')); })()`);
  ok(await E('!ed.cdot && ed.cdur===36'), '3/4: sin puntillo y acordes de un compás');
  await E(`P.chords=parseChordBars('| C | G7 |',SIGS['3/4'],36); renderAll(); selectChord(0)`);
  ok(await E('ed.cdot') === false, 'en 3/4, elegir un acorde de compás entero (blanca con puntillo) no activa el puntillo');
});

done('compuesto');
