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

done('forma');
