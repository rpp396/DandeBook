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

done('forma');
