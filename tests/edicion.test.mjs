// Pruebas funcionales: edición en la grilla y en el pentagrama, lector de acordes, transporte, texto, guardado y sonido.
import { part, ok, done } from './lib.mjs';

await part('Edición', { width: 1280, height: 900 }, async (b, E) => {

  // --- lector de acordes
  const cases = {
    'Dm7': 'D·0·m7', 'G7/B': 'G·0·7/B0', 'Bbmaj7': 'B·-1·maj7', 'C-7': 'C·0·m7', 'F#m7b5': 'F·1·m7b5', 'Cø': 'C·0·m7b5', 'CΔ': 'C·0·maj7', 'CΔ9': 'C·0·maj9',
    'C7M': 'C·0·maj7', 'Cm7(b5)': 'C·0·m7b5', 'Eb°7': 'E·-1·dim7', 'Faug': 'F·0·aug', 'C+': 'C·0·aug', 'Sol7': 'G·0·7', 'Lam': 'A·0·m', 'Sib7': 'B·-1·7', 'Do': 'C·0·',
    'C6/9': 'C·0·69', 'C7(b9)': 'C·0·7b9', 'Am7/G': 'A·0·m7/G0', 'C/Eb': 'C·0·/E-1', 'Dsus': 'D·0·sus4', 'A7alt': 'A·0·7alt', 'bb7': 'B·-1·7', 'C(add9)': 'C·0·add9', 'Cm(maj7)': 'C·0·mmaj7', 'N.C.': 'nc',
  };
  const got = await E(`JSON.stringify(Object.fromEntries(${JSON.stringify(Object.keys(cases))}.map(t=>{const c=parseChord(t); return [t, !c?null:c.nc?'nc':LET[c.r]+'·'+c.a+'·'+c.q+(c.b?'/'+LET[c.b.r]+c.b.a:'')];})))`);
  const g = JSON.parse(got); for (const [k, v] of Object.entries(cases)) ok(g[k] === v, `parseChord(${k})`, g[k]);
  ok(await E(`parseChord('Xm7')===null && parseChord('Cfoo')===null`), 'acordes inválidos dan null');

  // --- grilla: añadir con la paleta
  await E(`document.querySelector('#bNew').click()`); await b.sleep(100);
  ok(await E('P.chords.length===0 && P.title==="Página 2"'), 'página nueva vacía', await E('P.title'));
  const pal = async (sel) => { await b.clickSel('#palette ' + sel); };
  await pal('[data-act="root"][data-r="1"]'); // D
  await pal('[data-act="qual"][data-q="m7"]');
  await pal('[data-act="dur"][data-d="24"]'); // blanca
  await pal('[data-act="root"][data-r="4"]'); // G (sale con blanca)
  await pal('[data-act="qual"][data-q="7"]');
  ok(await E(`JSON.stringify(P.chords.map(chordText))`) === '["Dm7","G7"]', 'paleta: Dm7 G7', await E('P.chords.map(chordText)'));
  ok(await E(`P.chords.map(c=>c.d).join()`) === '24,24', 'duraciones 24,24', await E(`P.chords.map(c=>c.d).join()`));
  ok(await E(`document.querySelectorAll('#grid .bar[data-b="0"] .seg.head').length`) === 2, 'dos acordes en el compás 1');
  await pal('[data-act="bass"]'); await pal('[data-act="root"][data-r="6"]'); // /B
  ok(await E('chordText(P.chords[1])') === 'G7/B', 'bajo /B', await E('chordText(P.chords[1])'));
  await pal('[data-act="acc"][data-a="-1"]');
  ok(await E('chordText(P.chords[1])') === 'G7/Bb', 'bemol aplicado al bajo', await E('chordText(P.chords[1])'));
  // seleccionar el primero y cambiar su fundamental
  await b.clickSel('#grid .seg[data-ci="0"]');
  ok(await E('ed.cs') === 0, 'clic selecciona el acorde 0');
  await pal('[data-act="rmode"]'); await pal('[data-act="root"][data-r="2"]');
  ok(await E('chordText(P.chords[0])') === 'Em7' && await E('P.chords.length') === 2, 'Cambiar: Dm7 → Em7', await E('P.chords.map(chordText)'));
  await pal('[data-act="rmode"]');
  await pal('[data-act="undo"]');
  ok(await E('chordText(P.chords[0])') === 'Dm7', 'deshacer vuelve a Dm7');
  await pal('[data-act="redo"]');
  ok(await E('chordText(P.chords[0])') === 'Em7', 'rehacer');
  // puntillo
  await pal('[data-act="dot"]');
  ok(await E('P.chords[0].d') === 36, 'puntillo: 36', await E('P.chords[0].d'));
  await pal('[data-act="dot"]');
  // teclado: flechas, borrar, ↑ semitono
  await b.clickSel('#grid .seg[data-ci="0"]');
  await b.key('ArrowRight'); ok(await E('ed.cs') === 1, 'flecha → selecciona el siguiente');
  await b.key('ArrowUp'); ok(await E('chordText(P.chords[1])') === 'G#7/B', '↑ sube medio tono el acorde y su bajo', await E('chordText(P.chords[1])'));
  await b.key('ArrowDown'); ok(await E('chordText(P.chords[1])') === 'G7/Bb', '↓ baja medio tono');
  await b.key('Backspace'); ok(await E('P.chords.length') === 1 && await E('ed.cs') === 0, 'Retroceso borra');
  // letra abre el campo de escribir
  await b.clickSel('#grid .seg[data-ci="0"]');
  await b.key('a'); ok(await E(`document.activeElement.id==='wIn' && document.activeElement.value==='A'`), 'tecla A abre el campo con «A»');
  await b.type('m7 D7'); await b.key('Enter'); await b.sleep(80);
  ok(await E('JSON.stringify(P.chords.map(chordText))') === '["Em7","Am7","D7"]', 'escribir «Am7 D7»', await E('P.chords.map(chordText)'));
  // compases con | desde un límite de compás
  await E(`selectChord(P.chords.length-1)`);
  await E(`document.querySelector('#wIn').value='| Gmaj7 | % | Cm7:3 F7:1 |'; document.querySelector('#wForm').requestSubmit()`); await b.sleep(80);
  ok(await E('JSON.stringify(P.chords.map(c=>chordText(c)+":"+c.d))') === '["Em7:24","Am7:24","D7:48","Gmaj7:48","Gmaj7:48","Cm7:36","F7:12"]', '| a mitad de compás alarga D7 hasta la barra; % repite', await E('P.chords.map(c=>chordText(c)+":"+c.d)'));
  await E(`selectChord(0); document.querySelector('#wIn').value='Bb7 | Ebmaj7'; document.querySelector('#wForm').requestSubmit()`); await b.sleep(60);
  ok(await E('JSON.stringify(P.chords.slice(0,3).map(c=>chordText(c)+":"+c.d))') === '["Em7:24","Bb7:24","Ebmaj7:48"]', 'a mitad de compás, lo primero llena lo que queda', await E('P.chords.slice(0,4).map(c=>chordText(c)+":"+c.d)'));
  await E('undo()');
  await E(`document.querySelector('#wIn').value='Hm7'; document.querySelector('#wForm').requestSubmit()`); await b.sleep(60);
  ok((await E(`document.querySelector('#wMsg').textContent`)).includes('No entiendo'), 'error con acorde desconocido', await E(`document.querySelector('#wMsg').textContent`));
  ok(await E(`document.querySelectorAll('#grid .seg.sim').length`) === 1, 'el compás repetido se ve como %');
  // N.C.
  await pal('[data-act="nc"]'); ok(await E('P.chords[ed.cs].nc===true'), 'N.C. añadido tras el acorde marcado');
  await E('delChord()');

  // --- texto: ida y vuelta
  const rt = await E(`(()=>{ const ex=store.pages.find(p=>p.ex); const t=exportText(ex); const q=importText(t); return JSON.stringify({t, same: JSON.stringify(q.chords)===JSON.stringify(ex.chords) && JSON.stringify(q.notes)===JSON.stringify(ex.notes) && q.sig===ex.sig && q.bpm===ex.bpm}); })()`);
  const rto = JSON.parse(rt); ok(rto.same, 'exportar/importar conserva la página', rto.t);
  const rt2 = await E(`(()=>{ const t=exportText(P); const q=importText(t); return JSON.stringify(q.chords)===JSON.stringify(P.chords); })()`);
  ok(rt2, 'ida y vuelta con duraciones desiguales', await E('exportText(P)'));
  ok(await E(`(()=>{ try{ importText('| C | D'); return 'sin error'; }catch(e){ return e.message; } })()`) === 'sin error', 'importar sin barra final');
  ok((await E(`(()=>{ try{ importText('Compás: 7/4\\n| C |'); return 'x'; }catch(e){ return e.message; } })()`)).includes('7/4'), 'compás desconocido avisa');

  // --- transporte
  await E(`store.cur=store.pages.find(p=>p.ex).id; afterSwitch()`);
  await E(`document.querySelector('#bTr').click(); document.querySelector('#trTo').value='Bb'; document.querySelector('#bTrGo').click()`); await b.sleep(60);
  ok(await E('P.key') === 'Bb', 'tono Bb');
  ok(await E('P.chords.map(chordText).join(" ")') === 'Cm7 F7 Bbmaj7 Bbmaj7 Dm7 G7 Cm7 F7 Bb6 Bb6', 'acordes transportados', await E('P.chords.map(chordText).join(" ")'));
  ok(await E('P.notes.filter(n=>!n.rest).map(pitchTok).slice(0,4).join(" ")') === 'Eb4 G4 Bb4 D5', 'melodía transportada', await E('P.notes.map(pitchTok).slice(0,4).join(" ")'));
  ok(await E('P.notes.filter(n=>!n.rest).map(pitchTok).includes("B4")'), 'C#5 → B4');
  await E('undo()'); ok(await E('P.key') === 'C', 'deshacer el transporte');
  await E(`(()=>{ const iv=trInterval(KEYMAP['C'],KEYMAP['E']); return 1; })()`);
  ok(await E(`(()=>{ const iv=trInterval(KEYMAP['C'],KEYMAP['A']); const n=trPC(3,0,iv); return LET[n.r]+n.a; })()`) === 'D0', 'F en Do → D en La');
  ok(await E(`(()=>{ const iv=trInterval(KEYMAP['C'],KEYMAP['F#']); const n=trPC(6,-1,iv); return LET[n.r]+n.a; })()`) === 'E0', 'Bb en Do → E en F#');

  // --- pentagrama
  await E(`document.querySelector('#bNew').click()`); await b.sleep(80);
  await b.clickSel('#vStaff'); await b.sleep(200);
  ok(await E(`document.querySelectorAll('#staff svg.sys').length`) > 0, 'pentagrama dibujado');
  // tocar el pentagrama en el primer compás, en la tercera línea (B4 = 34)
  const pos = await E(`(()=>{ const sv=document.querySelector('#staff svg.sys'); const r=sv.getBoundingClientRect(); const bl=ST.sys[0].bars[0]; return {x:r.left+bl.xs[0]+ST.sp, y:r.top+ST.y0+2*ST.sp, top:r.top}; })()`);
  await b.click(pos.x, pos.y); await b.sleep(80);
  ok(await E('P.notes.length') === 1 && await E('P.notes[0].s') === 34, 'clic en el pentagrama pone B4', await E('JSON.stringify(P.notes)'));
  await b.click(pos.x + 80, pos.y + 4.5); await b.sleep(80); // 9 px de espacio → 4,5 px por grado
  ok(await E('P.notes.length') === 2 && await E('P.notes[1].s') === 33, 'segunda nota un grado más abajo (A4)', await E('JSON.stringify(P.notes.map(n=>n.s))'));
  await E(`document.querySelector('#staff').focus()`);
  await b.key('8'); ok(await E('P.notes[1].d') === 6, 'tecla 8: corchea');
  await b.key('e'); ok(await E('P.notes.length') === 3 && await E('pitchTok(P.notes[2])') === 'E4' && await E('P.notes[2].d') === 6, 'tecla e añade la E más cercana (E4) con la misma figura', await E('JSON.stringify(P.notes[2])'));
  await b.key('ArrowDown'); ok(await E('pitchTok(P.notes[2])') === 'D4', '↓ baja un grado');
  await b.key('ArrowUp', { shift: true }); ok(await E('pitchTok(P.notes[2])') === 'D#4', 'Mayús+↑ sube medio tono');
  await b.key('.'); ok(await E('P.notes[2].d') === 9, 'puntillo');
  await b.key('l'); ok(await E('P.notes.length') === 4 && await E('P.notes[2].tie') && await E('pitchTok(P.notes[3])') === 'D#4', 'L liga con una nota nueva');
  await b.key('s'); ok(await E('P.notes[3].rest') === true, 'S: silencio');
  await b.key('Backspace'); ok(await E('P.notes.length') === 3 && !(await E('P.notes[2].tie')), 'borrar quita la ligadura que quedó suelta', await E('JSON.stringify(P.notes)'));
  // clic en un compás lejano rellena con silencios
  const far = await E(`(()=>{ const sv=document.querySelectorAll('#staff svg.sys')[0]; const r=sv.getBoundingClientRect(); const bl=ST.sys[0].bars[2]; return {x:r.left+bl.xs[0]+ST.sp, y:r.top+ST.y0+3*ST.sp}; })()`);
  await b.click(far.x, far.y); await b.sleep(80);
  ok(await E('startOf(P.notes,P.notes.length-1)') === 96, 'nota en el compás 3 tras rellenar con silencios', await E('JSON.stringify(P.notes.map(n=>[n.d,n.rest]))'));
  ok(await E(`document.querySelectorAll('#staff .nt.rest').length`) >= 2, 'silencios dibujados');
  // arrastrar una nota con el ratón cambia la altura
  const nt = await b.rect('#staff .nt[data-ni="0"]');
  const s0 = await E('P.notes[0].s');
  await b.mouse('mouseMoved', nt.cx, nt.cy, { buttons: 0 }); await b.mouse('mousePressed', nt.cx, nt.cy); await b.mouse('mouseMoved', nt.cx, nt.cy - 18); await b.mouse('mouseReleased', nt.cx, nt.cy - 18); await b.sleep(80);
  ok(await E('P.notes[0].s') === s0 + 4, 'arrastrar 18 px arriba sube 4 grados', [s0, await E('P.notes[0].s')]);
  await E('undo()'); ok(await E('P.notes[0].s') === s0, 'deshacer el arrastre');

  // --- guardado y recarga
  await E(`saveLocal()`); const id = await E('P.id');
  await b.reload();
  ok(await E('P.id') === id && await E('P.notes.length') > 0, 'la página se recupera al recargar');
  ok(await E('store.pages.length') === 3, 'tres páginas guardadas', await E('store.pages.length'));
  ok(await E(`store.set.view`) === 'staff', 'recuerda la vista');

  // --- datos hostiles en localStorage
  await E(`localStorage.setItem('pautado-v1', JSON.stringify({pages:[{id:'__proto__',title:'x'},{id:'abcd1234',title:'<img src=x onerror=alert(1)>',sig:'constructor',key:'toString',chords:[{r:9,d:12},{r:1,q:'__proto__',d:12},{r:2,d:7}],notes:[{s:999,d:12},'x']}],set:{style:'evil',view:'grid'}}))`);
  await b.reload();
  ok(await E(`P.id==='abcd1234' && P.sig==='4/4' && P.key==='C' && P.chords.length===1 && P.chords[0].q==='' && P.notes.length===1 && P.notes[0].s===34 && store.set.style==='pop'`), 'limpia datos corruptos', await E('JSON.stringify(P)'));
  ok(await E(`!document.querySelector('#pageSel img') && document.querySelector('#pageSel option').textContent.includes('<img')`), 'el título se escapa');

  // --- sonido
  await E(`localStorage.clear()`); await b.reload();
  await b.clickSel('#bPlay'); await b.sleep(1300);
  ok(await E('A.playing'), 'reproduciendo');
  ok(await E(`document.querySelectorAll('#grid .seg.now').length`) > 0, 'la grilla marca el acorde que suena');
  await b.key('Escape'); ok(!(await E('A.playing')), 'Esc detiene');

  // --- pentagrama: cuenta de compases y 6/8
  ok(await E(`(()=>{ P.sig='6/8'; renderAll(); return document.querySelectorAll('#grid .bar').length; })()`) >= 8, '6/8 se dibuja');
  ok(await E(`(()=>{ store.set.view='staff'; renderAll(); return document.querySelectorAll('#staff svg.sys').length; })()`) > 0, '6/8 en pentagrama');
});
done('edicion');
