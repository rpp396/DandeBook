// Seguridad: datos guardados maliciosos o corruptos, textos hostiles al importar, política de seguridad (CSP) y apertura con file://.
import { part, ok, done, ROOT } from './lib.mjs';
import path from 'node:path';

const XSS = `<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>`;

await part('Datos guardados hostiles', { width: 1280, height: 900 }, async (b, E) => {
  ok(await E(`!!document.querySelector('meta[http-equiv="Content-Security-Policy"]') || ${!!process.env.ARTEFACTO}`), 'index.html lleva la política de seguridad');
  const evil = {
    pages: [
      { id: '__proto__', title: 'x' }, { id: 'constructor' }, null, 7, 'texto',
      { id: 'abcd1234', title: XSS + 'a'.repeat(500), sig: 'constructor', key: '__proto__', bpm: 1e9, created: -5, updated: 'ayer',
        chords: [{ r: 9, d: 12 }, { r: 1, q: '__proto__', d: 12 }, { r: 2, d: 7 }, { r: 0, a: 99, q: 'm7', d: 24, b: { r: 'x' } }, { nc: true, d: 12 }, ...Array(600).fill({ r: 0, d: 12 })],
        notes: [{ s: 999, d: 12 }, 'x', { s: 30, a: -9, d: 6, rest: 'sí', tie: 1 }, ...Array(1100).fill({ s: 34, d: 3 })] },
    ],
    cur: 'abcd1234', gone: ['<b>', 5], set: { style: 'evil', names: { toString: 1 }, view: 'staff', simile: 'no', min: 1 },
  };
  await E(`localStorage.setItem('pautado-v1', ${JSON.stringify(JSON.stringify(evil))})`);
  await b.reload();
  ok(await E(`JSON.stringify(store.pages.map(p=>p.id))`) === '["constructor","abcd1234"]', 'quedan solo las páginas con id válido («constructor» es un id más: no se usa como clave de objeto)', await E('store.pages.map(p=>p.id)'));
  ok(await E(`P.id==='abcd1234' && !Object.prototype.polluted && ({}).constructor===Object`), 'abre la página elegida sin contaminar Object');
  ok(await E(`P.sig==='4/4' && P.key==='C' && P.bpm===100 && P.title.length===80`), 'compás, tono, tempo y título vuelven a valores válidos', await E('[P.sig,P.key,P.bpm,P.title.length]'));
  ok(await E(`P.chords.length===510 && P.chords[0].q==='' && P.chords[1].a===0 && !P.chords[1].b && P.chords[2].nc===true`), 'acordes recortados a 512 y sin los 2 inválidos', await E('JSON.stringify(P.chords.slice(0,3))'));
  ok(await E(`P.notes.length===1023 && P.notes[0].s===34 && P.notes[1].a===0 && P.notes[1].rest===false && P.notes[1].tie===false`), 'notas recortadas a 1024 y sin la inválida', await E('JSON.stringify(P.notes.slice(0,2))'));
  ok(await E(`store.set.style==='pop' && store.set.names==='us' && store.set.view==='staff' && store.set.simile===true && store.set.min===false`), 'ajustes limpios', await E('JSON.stringify(store.set)'));
  ok(await E(`!document.querySelector('#pageSel img, #readout img, #grid img, #staff img') && ![...document.scripts].some(s=>s.textContent.includes('__pwned')) && !window.__pwned`), 'el título no se interpreta como HTML');
  await E(`store.set.view='grid'; renderAll()`);
  ok(await E('!window.__pwned'), 'tampoco al pintar la grilla');
});

await part('Importar texto hostil', { width: 1280, height: 900 }, async (b, E) => {
  const tries = [
    ['Título: ' + XSS + '\n| C | G |', 'ok'],
    ['Compás: constructor\n| C |', 'No conozco el compás'],
    ['Compás: __proto__\n| C |', 'No conozco el compás'],
    ['Tono: toString\n| C |', 'No conozco el tono'],
    ['| C:0.333 |', 'No sé cuánto dura'],
    ['| C '.repeat(600) + '|', 'demasiado largo'],
    ['| ' + 'C '.repeat(600) + '|', 'no se pueden repartir'],
    ['Melodía: ' + 'C4s '.repeat(1200), 'demasiado largo'],
    ['| Q7 |', 'No entiendo el acorde'],
    ['', 'no tiene acordes'],
  ];
  for (const [txt, want] of tries) {
    const got = await E(`(()=>{ try{ const p=importText(${JSON.stringify(txt)}); return 'ok:'+p.title; }catch(e){ return e.message; } })()`);
    ok(want === 'ok' ? got.startsWith('ok:') : got.includes(want), `importar «${txt.slice(0, 30).replace(/\n/g, ' ')}…»`, got.slice(0, 120));
  }
  await E(`document.querySelector('#txtBox').open=true; document.querySelector('#txtIn').value=${JSON.stringify('Título: ' + XSS + '\n| C | G |')}; document.querySelector('#bImport').click()`);
  await b.sleep(100);
  ok(await E(`P.title.includes('<img') && !document.querySelector('#pageSel img, #impMsg img') && !window.__pwned`), 'una página importada con HTML en el título se muestra como texto');
});

await part('Tope de páginas', { width: 1280, height: 900 }, async (b, E) => {
  await E(`(()=>{ for(let i=store.pages.length;i<PAGES_MAX;i++){ const p=newPage('P'+i); store.pages.push(p); } saveLocal(); renderAll(); })()`);
  await E(`document.querySelector('#bNew').click(); document.querySelector('#bDup').click()`);
  ok(await E('store.pages.length') === 300, 'no deja crear ni duplicar la página 301', await E('store.pages.length'));
  ok((await E(`document.querySelector('#selLine').textContent`)).includes('lleno'), 'avisa de que el cuaderno está lleno');
  await E(`document.querySelector('#txtIn').value='| C |'; document.querySelector('#bImport').click()`);
  ok(await E('store.pages.length') === 300 && (await E(`document.querySelector('#impMsg').textContent`)).includes('lleno'), 'tampoco al importar');
  await b.reload();
  ok(await E('store.pages.length') === 300, 'las 300 siguen al recargar');
});

if (!process.env.ARTEFACTO) await part('Abrir con file://', { width: 1000, height: 800 }, async (b, E) => {
  await b.goto('file://' + path.join(ROOT, 'index.html'));
  ok(await E(`typeof P==='object' && document.querySelectorAll('#grid .bar').length>=8`), 'la app arranca con file://');
  ok(await E(`document.fonts.check('16px "Pautado Cifra"')`), 'la fuente del cifrado carga con file://');
});

done('seguridad');
