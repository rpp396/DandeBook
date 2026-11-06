// Forma: repeticiones, casillas, D.C., D.S., Coda y Fine. Recorrido (formPath), validación de las marcas y deshacer.
import { part, ok, done } from './lib.mjs';

await part('Recorrido', { width: 1280, height: 900 }, async (b, E) => {
  // [descripción, marcas, compases, recorrido esperado]
  const cases = [
    ['sin marcas', [], 4, [0, 1, 2, 3]],
    ['«:‖» sin «‖:» vuelve al principio', [{ b: 1, re: 2 }], 4, [0, 1, 0, 1, 2, 3]],
    ['«‖: :‖» tres veces', [{ b: 1, rs: true }, { b: 2, re: 3 }], 4, [0, 1, 2, 1, 2, 1, 2, 3]],
    ['dos repeticiones seguidas', [{ b: 1, re: 2 }, { b: 3, re: 2 }], 4, [0, 1, 0, 1, 2, 3, 2, 3]],
    ['casillas 1.ª y 2.ª', [{ b: 0, rs: true }, { b: 2, v: 1, re: 2 }, { b: 3, v: 2 }], 5, [0, 1, 2, 0, 1, 3, 4]],
    ['casillas de dos compases', [{ b: 0, rs: true }, { b: 1, v: 1 }, { b: 2, v: 1, re: 2 }, { b: 3, v: 2 }, { b: 4, v: 2 }], 6, [0, 1, 2, 0, 3, 4, 5]],
    ['tres vueltas con dos casillas: la última se repite', [{ b: 0, rs: true }, { b: 1, v: 1, re: 3 }, { b: 2, v: 2, re: 3 }, { b: 3 }], 4, [0, 1, 0, 2, 0, 2, 3]],
    ['casillas en la segunda repetición', [{ b: 1, re: 2 }, { b: 2, rs: true }, { b: 3, v: 1, re: 2 }, { b: 4, v: 2 }], 5, [0, 1, 0, 1, 2, 3, 2, 4]],
    ['D.C. al Fine', [{ b: 1, fine: true }, { b: 3, go: 'dc', al: 'fine' }], 4, [0, 1, 2, 3, 0, 1]],
    ['D.C. sin más: hasta el final', [{ b: 2, go: 'dc', al: '' }], 3, [0, 1, 2, 0, 1, 2]],
    ['D.S. al Coda', [{ b: 1, segno: true }, { b: 2, tocoda: true }, { b: 3, go: 'ds', al: 'coda' }, { b: 4, coda: true }], 6, [0, 1, 2, 3, 1, 2, 4, 5]],
    ['después del D.C. no se repite', [{ b: 1, re: 2 }, { b: 2, go: 'dc', al: '' }], 3, [0, 1, 0, 1, 2, 0, 1, 2]],
    ['después del D.C. solo la última casilla', [{ b: 0, rs: true }, { b: 1, v: 1, re: 2 }, { b: 2, v: 2, go: 'dc', al: '' }], 3, [0, 1, 0, 2, 0, 2]],
    ['D.S. sin Segno no salta', [{ b: 2, go: 'ds', al: '' }], 4, [0, 1, 2, 3]],
    ['Fine y Al Coda no hacen nada antes del salto', [{ b: 0, fine: true }, { b: 1, tocoda: true }, { b: 2, coda: true }], 3, [0, 1, 2]],
    ['Coda antes del «Al Coda»: salta una sola vez', [{ b: 0, coda: true }, { b: 1, tocoda: true }, { b: 2, go: 'dc', al: 'coda' }], 3, [0, 1, 2, 0, 1, 0, 1, 2]],
    ['marcas más allá del final se ignoran', [{ b: 1, re: 2 }, { b: 9, go: 'dc', al: '' }], 2, [0, 1, 0, 1]],
  ];
  const got = JSON.parse(await E(`JSON.stringify(${JSON.stringify(cases)}.map(([, m, n]) => formPath({ sig: '4/4', chords: [], notes: [], marks: cleanMarks(m) }, n)))`));
  cases.forEach(([name, , , want], i) => ok(JSON.stringify(got[i]) === JSON.stringify(want), `recorrido: ${name}`, got[i]));
  // datos raros: el recorrido nunca pasa del máximo
  ok(await E(`(()=>{ const m=[]; for(let b=0;b<256;b++) m.push({b,rs:true,re:8,v:1+(b%4)}); m[200].go='dc'; return formPath({sig:'4/4',chords:[],notes:[],marks:cleanMarks(m)},256).length<=FORM_MAX; })()`), 'recorrido acotado con marcas hostiles');
  // formBars y barCount cuentan los compases con marcas
  ok(await E(`formBars({sig:'4/4',chords:[{r:0,a:0,q:'',d:48}],notes:[],marks:[{b:10,fine:true}]})===11 && barCount({sig:'4/4',chords:[],notes:[],marks:[{b:10,fine:true}]})===12`), 'formBars y barCount llegan hasta la última marca');
});

await part('Validación de las marcas', { width: 1280, height: 900 }, async (b, E) => {
  const clean = async m => JSON.parse(await E(`JSON.stringify(cleanMarks(${JSON.stringify(m)}))`));
  ok(JSON.stringify(await clean([{ b: 3, re: 2 }, { b: 1, rs: true }])) === '[{"b":1,"rs":true},{"b":3,"re":2}]', 'ordenadas por compás');
  ok(JSON.stringify(await clean([{ b: 1, rs: true }, { b: 1, fine: true }])) === '[{"b":1,"rs":true}]', 'una marca por compás: vale la primera');
  ok(JSON.stringify(await clean([{ b: 1, segno: true }, { b: 2, segno: true, rs: true }])) === '[{"b":1,"segno":true},{"b":2,"rs":true}]', 'un solo Segno por página');
  ok(JSON.stringify(await clean([{ b: 1, go: 'dc', al: 'fine' }, { b: 2, go: 'ds' }])) === '[{"b":1,"go":"dc","al":"fine"}]', 'un solo salto por página');
  ok(JSON.stringify(await clean([{ b: 1, go: 'ds', al: '__proto__' }])) === '[{"b":1,"go":"ds","al":""}]', '«al» desconocido queda vacío');
  ok(JSON.stringify(await clean([{ b: -1, rs: true }, { b: 256, rs: true }, { b: 1.5, rs: true }, { b: '2', rs: true }, null, 'x', [], { b: 4 }])) === '[]', 'compases fuera de rango o sin nada se descartan');
  ok(JSON.stringify(await clean([{ b: 1, re: 9, v: 0, rs: 'sí', fine: 1, go: 'constructor', segno: true }])) === '[{"b":1,"segno":true}]', 'valores fuera de rango o de tipo se descartan');
  ok((await clean(Array.from({ length: 300 }, (_, i) => ({ b: i % 256, rs: true })))).length === 256, 'como mucho 256 marcas');
  ok(JSON.stringify(await clean({ b: 1 })) === '[]' && JSON.stringify(await clean(undefined)) === '[]', 'si no es una lista, ninguna');

  // datos guardados hostiles: la página se abre con marcas limpias
  const evil = { pages: [{ id: 'abcd1234', title: 'x', chords: [{ r: 0, d: 48 }], notes: [], marks: [{ b: 0, rs: true, __proto__: { polluted: 1 } }, { b: 1, re: 1e9 }, { b: 2, v: 2, go: 'ds', al: 'coda', toString: 1 }, ...Array(400).fill({ b: 3, fine: true })] }], cur: 'abcd1234' };
  await E(`localStorage.setItem('pautado-v1', ${JSON.stringify(JSON.stringify(evil))})`);
  await b.reload();
  ok(await E(`JSON.stringify(P.marks)`) === '[{"b":0,"rs":true},{"b":2,"v":2,"go":"ds","al":"coda"},{"b":3,"fine":true}]', 'marcas guardadas hostiles, limpias al cargar', await E('JSON.stringify(P.marks)'));
  ok(await E(`!Object.prototype.polluted && ({}).polluted===undefined`), 'sin contaminar Object');
  // páginas antiguas, sin marcas
  await E(`localStorage.setItem('pautado-v1', JSON.stringify({pages:[{id:'vieja123',title:'v',chords:[],notes:[]}],cur:'vieja123'}))`);
  await b.reload();
  ok(await E(`Array.isArray(P.marks) && P.marks.length===0`), 'una página antigua carga con marcas vacías');
  ok(await E(`Array.isArray(newPage('x').marks) && Array.isArray(store.pages[0].marks)`), 'las páginas nuevas llevan marcas');
});

await part('Deshacer las marcas', { width: 1280, height: 900 }, async (b, E) => {
  await E(`change(()=>{ P.marks=cleanMarks([{b:1,re:2}]); })`);
  ok(await E(`P.marks.length===1`), 'se pone una marca dentro de change');
  await E('undo()'); ok(await E(`P.marks.length===0`), 'deshacer la quita');
  await E('redo()'); ok(await E(`P.marks.length===1 && P.marks[0].re===2`), 'rehacer la vuelve a poner');
});

await part('Grilla y paleta', { width: 1280, height: 900 }, async (b, E) => {
  const pal = s => b.clickSel('#palette ' + s);
  ok(await E(`document.querySelector('#forms').hidden && document.querySelector('#moreF').getAttribute('aria-expanded')==='false'`), 'la sección «Repeticiones y saltos» empieza plegada');
  await b.clickSel('#moreF');
  ok(await E(`!document.querySelector('#forms').hidden && document.querySelector('#moreF').textContent.includes('compás')`), 'se despliega y dice a qué compás se aplica');
  // tocar el compás 3 de la grilla (Cmaj7) y ponerle «‖:»
  await b.clickSel('#grid .bar[data-b="2"] .seg.head');
  ok(await E('ed.mb') === 2, 'tocar un compás lo elige para las marcas');
  await pal('[data-act="mark"][data-k="rs"]');
  ok(await E('JSON.stringify(P.marks)') === '[{"b":2,"rs":true}]', '«‖:» en el compás 3', await E('JSON.stringify(P.marks)'));
  ok(await E(`!!document.querySelector('#grid .bar[data-b="2"] .rp.l') && document.querySelector('[data-act="mark"][data-k="rs"]').getAttribute('aria-pressed')==='true'`), 'la grilla la dibuja y el botón queda pulsado');
  ok((await E(`document.querySelector('#grid .bar[data-b="2"] .seg').getAttribute('aria-label')`)).startsWith('Compás 3 (inicio de repetición)'), 'el nombre del compás la anuncia');
  await b.clickSel('#grid .bar[data-b="3"] .seg.head');
  await pal('[data-act="mark"][data-k="re"]'); await pal('[data-act="times"]');
  ok(await E('JSON.stringify(markAt(P,3))') === '{"b":3,"re":3}', '«:‖» y ×3 en el compás 4', await E('JSON.stringify(markAt(P,3))'));
  ok(await E(`document.querySelector('#grid .bar[data-b="3"] .rpn').textContent==='×3' && document.querySelector('[data-act="times"]').textContent==='×3'`), 'se ve ×3');
  for (let i = 0; i < 6; i++) await pal('[data-act="times"]');
  ok(await E('markAt(P,3).re') === 2, 'las vueltas dan la vuelta de 8 a 2');
  // casillas
  await pal('[data-act="volta"][data-n="1"]');
  ok(await E('markAt(P,3).v') === 1 && await E(`document.querySelector('#grid .bar[data-b="3"] .vb.st b').textContent`) === '1.', 'casilla 1 con su corchete');
  await pal('[data-act="volta"][data-n="1"]'); ok(await E('markAt(P,3).v') === undefined, 'tocarla otra vez la quita');
  // Segno: uno por página, se mueve
  await pal('[data-act="mark"][data-k="segno"]');
  await b.clickSel('#grid .bar[data-b="1"] .seg.head'); await pal('[data-act="mark"][data-k="segno"]');
  ok(await E(`P.marks.filter(m=>m.segno).map(m=>m.b).join()`) === '1', 'el Segno se mueve al compás nuevo', await E('JSON.stringify(P.marks)'));
  ok(await E(`!!document.querySelector('#grid .bar[data-b="1"] .mks svg use[href="#g-segno"]')`), 'se dibuja el glifo del Segno');
  // D.S. al Coda: los botones «al…» solo con salto
  await b.clickSel('#grid .bar[data-b="5"] .seg.head');
  ok(await E(`document.querySelector('[data-act="al"][data-al="coda"]').disabled`), 'sin salto, «al Coda» está apagado');
  await pal('[data-act="jump"][data-go="ds"]'); await pal('[data-act="al"][data-al="coda"]');
  ok(await E('JSON.stringify(markAt(P,5))') === '{"b":5,"go":"ds","al":"coda"}', 'D.S. al Coda en el compás 6', await E('JSON.stringify(markAt(P,5))'));
  ok(await E(`document.querySelector('#grid .bar[data-b="5"] .mke').textContent`) === 'D.S. al Coda', 'el texto se ve en la grilla');
  await pal('[data-act="jump"][data-go="dc"]');
  ok(await E('JSON.stringify(markAt(P,5))') === '{"b":5,"go":"dc","al":""}', 'D.C. sustituye al D.S.');
  await b.sleep(80); ok((await E(`document.querySelector('#sr').textContent`)) === 'Compás 6: da capo', 'lo anuncia', await E(`document.querySelector('#sr').textContent`));
  await pal('[data-act="jump"][data-go="dc"]'); ok(await E('markAt(P,5)') === null, 'tocar D.C. otra vez lo quita y el compás queda sin marcas');
  // deshacer
  await E('undo()'); ok(await E('markAt(P,5)?.go') === 'dc', 'deshacer devuelve el D.C.');
  // un compás vacío también se puede marcar
  await b.clickSel('#grid .bar[data-b="10"]');
  ok(await E('ed.mb') === 10, 'un compás vacío se elige al tocarlo');
  await pal('[data-act="mark"][data-k="fine"]');
  ok(await E('markAt(P,10)?.fine') === true, 'Fine en un compás vacío');
  // el % no sale en el primer compás de una sección
  await E(`P.chords=parseChordBars('| C | C | C | C |',SIGS['4/4'],48); P.marks=cleanMarks([{b:2,rs:true}]); renderAll()`);
  ok(await E(`[...document.querySelectorAll('#grid .bar')].slice(0,4).map(x=>x.querySelector('.seg.sim')?1:0).join('')`) === '0101', 'el % no sale en el compás con «‖:»', await E(`[...document.querySelectorAll('#grid .bar')].slice(0,4).map(x=>x.querySelector('.seg.sim')?1:0).join('')`));
});

await part('Las marcas siguen a sus compases', { width: 1280, height: 900 }, async (b, E) => {
  await E(`P.chords=parseChordBars('| C | F | G | C |',SIGS['4/4'],48); P.marks=cleanMarks([{b:1,re:2},{b:2,rs:true},{b:3,fine:true}]); ed.cs=0; renderAll()`);
  await E(`insertChord({r:1,a:0,q:'m',d:48})`); // un compás nuevo detrás del primero
  ok(await E(`P.marks.map(m=>m.b).join()`) === '2,3,4', 'meter un compás entero en medio mueve las marcas de detrás', await E('JSON.stringify(P.marks)'));
  await E(`ed.cs=1; delChord()`);
  ok(await E(`P.marks.map(m=>m.b).join()`) === '1,2,3', 'quitarlo las devuelve', await E('JSON.stringify(P.marks)'));
  await E(`ed.cs=0; insertChord({r:1,a:0,q:'m',d:24})`);
  ok(await E(`P.marks.map(m=>m.b).join()`) === '1,2,3', 'medio compás no mueve nada');
  await E('undo()');
  await E(`ed.cs=P.chords.length-1; insertChord({r:4,a:0,q:'7',d:48})`);
  ok(await E(`P.marks.map(m=>m.b).join()`) === '1,2,3', 'añadir al final no mueve nada');
  await E(`P.marks=cleanMarks([{b:4,rs:true}]); ed.cs=P.chords.length-1; document.querySelector('#wIn').value='| D | E |'; document.querySelector('#wForm').requestSubmit()`);
  ok(await E(`P.marks.map(m=>m.b).join()`) === '4', 'escribir al final tampoco: la marca puesta en un compás vacío espera a sus acordes');
  await E(`P.marks=cleanMarks([{b:2,rs:true}]); ed.cs=0; document.querySelector('#wIn').value='| D | E |'; document.querySelector('#wForm').requestSubmit()`);
  ok(await E(`P.marks.map(m=>m.b).join()`) === '4', 'escribir dos compases en medio mueve las marcas dos compases');
});

await part('Forma en el móvil', { width: 320, height: 700, mobile: true, scale: 2 }, async (m, E) => {
  await E(`P.marks=cleanMarks([{b:0,rs:true,segno:true},{b:2,v:1,re:3},{b:3,v:2,tocoda:true},{b:5,fine:true},{b:7,go:'ds',al:'coda'},{b:8,coda:true}]); ed.moreF=true; renderAll(); dockSize();`);
  await m.sleep(150);
  ok(await E(`[...document.querySelectorAll('#forms button, #moreF')].filter(b=>b.getBoundingClientRect().height<43.5).length`) === 0, 'móvil: botones de 44 px');
  ok(await E(`[...document.querySelectorAll('#forms button')].every(b=>b.scrollWidth<=b.clientWidth+1)`), 'móvil: los textos caben en los botones');
  ok(await E('document.documentElement.scrollWidth') <= 320, 'móvil: sin desbordar');
  ok(await E(`[...document.querySelectorAll('#grid .mke')].every(e=>{ const r=e.getBoundingClientRect(), g=document.querySelector('#sheet').getBoundingClientRect(); return r.left>=g.left&&r.right<=g.right; })`), 'móvil: los textos del final caben en la hoja');
});

await part('Sonido con la forma', { width: 1280, height: 900 }, async (b, E) => {
  // espía: qué acordes, notas y clics se programan y cuándo (en ticks desde el principio de la pasada)
  const spy = `(()=>{ ensureAudio(); A.bus=A.ctx.createGain(); A.spt=60/(P.bpm*SIGS[P.sig].beat); const t0=A.ctx.currentTime+5, log={c:[],n:[],k:0};
    const tk=t=>Math.round((t-t0)/A.spt), oc=playChord, ov=voice, ok=click;
    window.playChord=(c,t,d,v)=>log.c.push(chordText(c)+'@'+tk(t)+(v<1?'~':''));
    window.voice=(dst,f,t,d)=>log.n.push(tk(t)+'+'+Math.round((d+0.03)/A.spt));
    window.click=()=>{ log.k++; };
    try{ schedulePass(t0,passPath()); } finally { window.playChord=oc; window.voice=ov; window.click=ok; }
    return JSON.stringify(log); })()`;
  await E(`P.chords=parseChordBars('| C | F | G |',SIGS['4/4'],48); P.notes=[]; P.marks=cleanMarks([{b:1,re:2}]); store.set.melody=true; store.set.chords=true; store.set.metro=true; renderAll()`);
  let log = JSON.parse(await E(spy));
  ok(log.c.join(' ') === 'C@0 F@48 C@96 F@144 G@192', 'los acordes siguen la repetición', log.c);
  ok(log.k === 20, 'el metrónomo cubre los 5 compases del recorrido', log.k);
  ok(await E('passTicks()') === 240, 'la pasada dura 5 compases');
  // D.S. al Coda
  await E(`P.chords=parseChordBars('| C | F | G | A | D | E |',SIGS['4/4'],48); P.marks=cleanMarks([{b:1,segno:true},{b:2,tocoda:true},{b:3,go:'ds',al:'coda'},{b:4,coda:true}]); store.set.metro=false`);
  log = JSON.parse(await E(spy));
  ok(log.c.join(' ') === 'C@0 F@48 G@96 A@144 F@192 G@240 D@288 E@336', 'D.S. al Coda', log.c);
  // un acorde de dos compases: si se vuelve a su segundo compás tras un salto, se ataca de nuevo
  await E(`P.chords=parseChordBars('| C | - | G |',SIGS['4/4'],48); P.marks=cleanMarks([{b:1,rs:true},{b:2,re:2}])`);
  log = JSON.parse(await E(spy));
  ok(log.c.join(' ') === 'C@0 C@48~ G@96 C@144 G@192', 'el acorde que cruza la barra se vuelve a atacar al repetir', log.c);
  // ligadura hacia un compás que no sigue en la forma: se corta
  await E(`P.chords=[]; P.notes=parseMelody('C4w~ | C4w | E4w'); P.marks=cleanMarks([{b:0,re:2}])`);
  log = JSON.parse(await E(spy));
  ok(log.n.join(' ') === '0+48 48+96 144+48', 'la ligadura solo sigue con el compás que suena después', log.n);

  // la grilla marca lo que suena aunque la forma vuelva atrás
  await E(`P.chords=parseChordBars('| C | F | G |',SIGS['4/4'],48); P.notes=[]; P.marks=cleanMarks([{b:1,re:2}]); store.set.loop=false; renderAll()`);
  await b.clickSel('#bPlay'); await b.sleep(300);
  ok(await E('JSON.stringify(A.path)') === '[0,1,0,1,2]', 'la reproducción lleva el recorrido');
  const at = async k => { await E(`A.t0=A.ctx.currentTime-(${k}*48+6)*A.spt`); await b.sleep(120); return E(`[...document.querySelectorAll('#grid .seg.now')].map(x=>x.dataset.ci).join()`); };
  ok(await at(1) === '1', 'lugar 2 del recorrido: suena F');
  ok(await at(2) === '0', 'lugar 3: vuelve a C', await at(2));
  ok(await at(4) === '2', 'lugar 5: G');
  await E('stop()');
});

for (const [w, mobile] of [[1280, false], [320, true]]) {
  await part(`Pentagrama ${w}px`, { width: w, height: 900, mobile, scale: mobile ? 2 : 1 }, async (b, E) => {
    await E(`P.marks=cleanMarks([{b:0,rs:true,segno:true},{b:2,v:1,re:3},{b:3,v:2,rs:true},{b:4,re:2,tocoda:true},{b:5,fine:true},{b:7,go:'ds',al:'coda'},{b:8,coda:true}]); P.chords.push(...parseChordBars('| Fm6 | C6 |',SIGS['4/4'],48)); store.set.view='staff'; store.set.min=true; renderAll(); dockSize()`);
    await b.sleep(150);
    const n = sel => E(`document.querySelectorAll('#staff ${sel}').length`);
    ok(await n('use[href="#g-repDots"]') === 4, 'cuatro pares de puntos de repetición', await n('use[href="#g-repDots"]'));
    ok(await n('use[href="#g-segno"]') === 1 && await n('use[href="#g-coda"]') === 1, 'Segno y Coda');
    ok(await n('path.vbs') >= 2, 'corchetes de las casillas');
    const texts = await E(`[...document.querySelectorAll('#staff text.mkt')].map(t=>t.textContent).join('|')`);
    ok(['1.', '2.', '×3', 'Al Coda', 'Fine', 'D.S. al Coda'].every(t => texts.split('|').includes(t)), 'textos de casillas y del final', texts);
    ok((await E(`[...document.querySelectorAll('#staff svg.sys')].map(s=>s.getAttribute('aria-label')).join(' ')`)).includes('Compás 3 (casilla 1, fin de repetición, 3 veces)'), 'la descripción del sistema nombra las marcas');
    // el cifrado no pisa los corchetes de las casillas
    const clash = await E(`(()=>{ let n=0; document.querySelectorAll('#staff .sysw').forEach(w=>{ const ls=[...w.querySelectorAll('.clab')].map(l=>l.getBoundingClientRect()); w.querySelectorAll('path.vbs').forEach(p=>{ const r=p.getBoundingClientRect(); ls.forEach(l=>{ if(l.bottom>r.top+0.5&&l.top<r.bottom&&l.right>r.left&&l.left<r.right) n++; }); }); }); return n; })()`);
    ok(clash === 0, 'el cifrado queda por encima de las casillas', clash);
    // las barras de repetición no pisan las notas
    const hit = await E(`(()=>{ let n=0; document.querySelectorAll('#staff svg.sys').forEach(sv=>{ const ds=[...sv.querySelectorAll('use[href="#g-repDots"]')].map(u=>u.getBoundingClientRect()); sv.querySelectorAll('.nt use').forEach(u=>{ const r=u.getBoundingClientRect(); ds.forEach(d=>{ if(r.left<d.right-0.5&&r.right>d.left+0.5&&r.top<d.bottom&&r.bottom>d.top) n++; }); }); }); return n; })()`);
    ok(hit === 0, 'los puntos de repetición no pisan las notas', hit);
    ok(await E('document.documentElement.scrollWidth') <= w, 'sin desbordar');
    // en el pentagrama, las marcas se aplican al compás de la nota marcada
    await E(`selectNote(5)`);
    ok(await E('ed.mb') === 1, 'la nota marcada elige su compás');
    await E(`ed.moreF=true; store.set.min=false; renderPalette(); dockSize()`); await b.clickSel('#palette [data-act="mark"][data-k="fine"]');
    ok(await E('markAt(P,1)?.fine===true && markAt(P,5)?.fine===undefined'), 'Fine se mueve al compás 2 desde el pentagrama');
  });
}

await part('Texto', { width: 1280, height: 900 }, async (b, E) => {
  // exportar
  await E(`P.chords=parseChordBars('| Dm7 | G7 | Cmaj7 | A7 | Dm7 G7 | C | Fm6 | C |',SIGS['4/4'],48); P.notes=[];
    P.marks=cleanMarks([{b:0,rs:true,segno:true},{b:2,v:1,re:3},{b:3,v:2,tocoda:true},{b:4,fine:true},{b:5,go:'ds',al:'coda'},{b:6,coda:true}]); renderAll()`);
  const txt = await E('exportText(P)');
  const rows = txt.split('\n').filter(l => l.startsWith('|'));
  ok(rows[0] === '|: Segno Dm7 | G7 | 1. Cmaj7 x3 :| 2. A7 Al Coda |', 'primera fila con «|:», Segno, casillas y «x3 :|»', rows[0]);
  ok(rows[1] === '| Dm7 G7 Fine | C D.S. al Coda | Coda Fm6 | C |', 'segunda fila con Fine, D.S. al Coda y Coda', rows[1]);
  // ida y vuelta
  ok(await E(`(()=>{ const q=importText(exportText(P)); return JSON.stringify(q.marks)===JSON.stringify(P.marks) && q.chords.map(chordText).join()===P.chords.map(chordText).join(); })()`), 'ida y vuelta por texto: mismas marcas y acordes', await E('JSON.stringify(importText(exportText(P)).marks)'));
  ok(await E(`(()=>{ const q={...P,marks:[]}; return exportText(q).split('\\n').filter(l=>l.startsWith('|')).join(' / '); })()`) === '| Dm7 | G7 | Cmaj7 | A7 | / | Dm7 G7 | C | Fm6 | C |', 'sin marcas, el texto queda como antes');
  // importar a mano, con otras grafías
  const imp = async t => E(`(()=>{ try{ return JSON.stringify(importText(${JSON.stringify(t)}).marks); }catch(e){ return 'ERR '+e.message; } })()`);
  ok(await imp('|: C | F x2 :|\n| G | d.c. al fine |') === '[{"b":0,"rs":true},{"b":1,"re":2},{"b":3,"go":"dc","al":"fine"}]', 'minúsculas y un compás solo con el salto', await imp('|: C | F x2 :|\n| G | d.c. al fine |'));
  ok(await imp('| 𝄋 C | G7 al coda | D.S. | 𝄌 F |') === '[{"b":0,"segno":true},{"b":1,"tocoda":true},{"b":2,"go":"ds","al":""},{"b":3,"coda":true}]', 'glifos 𝄋 y 𝄌 y «al coda»', await imp('| 𝄋 C | G7 al coda | D.S. | 𝄌 F |'));
  ok(await imp('| C x3 | G |') === 'ERR «x3» va con «:|», al final de la repetición', '«x3» sin «:|» da un error claro', await imp('| C x3 | G |'));
  ok((await imp('| C x9 :|')).startsWith('ERR No entiendo el acorde «x9»'), '«x9» no vale', await imp('| C x9 :|'));
  ok(await imp('| Segno C | Segno G |') === '[{"b":0,"segno":true}]', 'dos Segno: vale el primero');
  // escribir acordes con marcas en medio de la página
  await E(`P.chords=parseChordBars('| C | F |',SIGS['4/4'],48); P.marks=[]; ed.cs=1; renderAll()`);
  await E(`document.querySelector('#wIn').value='|: Dm7 | G7 :|'; document.querySelector('#wForm').requestSubmit()`);
  ok(await E('JSON.stringify(P.marks)') === '[{"b":2,"rs":true},{"b":3,"re":2}]', 'escribir «|: Dm7 | G7 :|» pone las marcas en sus compases', await E('JSON.stringify(P.marks)'));
  await E('undo()'); ok(await E('P.marks.length') === 0 && await E('P.chords.length') === 2, 'deshacer quita acordes y marcas a la vez');
  await E(`P.marks=cleanMarks([{b:0,fine:true}]); ed.cs=1; document.querySelector('#wIn').value='| G | C Fine |'; document.querySelector('#wForm').requestSubmit()`);
  ok(await E('JSON.stringify(P.marks)') === '[{"b":3,"fine":true}]', 'el Fine escrito sustituye al que había', await E('JSON.stringify(P.marks)'));
  await E(`document.querySelector('#wIn').value='Dm7 Fine'; document.querySelector('#wForm').requestSubmit()`);
  ok((await E(`document.querySelector('#wMsg').textContent`)).includes('No entiendo el acorde «Fine»'), 'sin «|» no hay marcas: lo dice', await E(`document.querySelector('#wMsg').textContent`));
  // texto hostil
  ok((await imp('|: '.repeat(400) + 'C :|')).startsWith('[') || (await imp('|: '.repeat(400) + 'C :|')).startsWith('ERR'), 'muchas marcas seguidas no rompen nada');
  ok(await E(`(()=>{ const q=importText('| C '.repeat(200)+'| D.C. |'); return q.marks.length===1 && q.marks[0].b===200 && formPath(q).length===402; })()`), 'un texto largo con un D.C. al final', await E(`(()=>{ const q=importText('| C '.repeat(200)+'| D.C. |'); return [JSON.stringify(q.marks),formPath(q).length]; })()`));
});

done('forma');
