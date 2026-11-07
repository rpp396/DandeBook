// Enlace: enviar una página por URL (#p=…), recibirla, duplicados, cuaderno lleno y enlaces hostiles.
import { part, ok, done } from './lib.mjs';

const XSS = `<img src=x onerror="window.__pwned=1">`;
// lo mismo que b64url de la app, para fabricar enlaces en las pruebas
const b64u = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let link = '';
await part('Enviar', { width: 1280, height: 900 }, async (b, E) => {
  // una página con acentos, alteraciones, inversión, melodía y forma
  await E(`(()=>{ P.title='Canción de prueba · Sí♭ ñ'; P.sig='3/4'; P.bpm=132; P.key='Bb';
    P.chords=parseChordBars('| Bb | Gm7/F | Cm7 F7 |',SIGS['3/4'],36); P.notes=parseMelody('D5h. | Bb4q C5q D5q | Eb5h F5q~ | F5h.');
    P.marks=cleanMarks([{b:0,rs:true},{b:2,re:3},{b:3,fine:true}]); touch(P); renderAll(); })()`);
  // espía del portapapeles
  await E(`navigator.clipboard.writeText=t=>{ window.__clip=t; return Promise.resolve(); }`);
  await b.clickSel('#bLink'); await b.sleep(100);
  link = await E('window.__clip');
  ok(/#p=[A-Za-z0-9_-]+$/.test(link), 'copia un enlace #p= con solo letras, números, - y _', link.slice(-40));
  ok(link.startsWith(await E(`location.href.split('#')[0]`)), 'apunta a esta misma app');
  ok((await E(`document.querySelector('#linkNote').textContent`)).startsWith('Enlace copiado') && await E(`!document.querySelector('#linkNote').hidden`), 'avisa bajo el título');
  ok(await E(`pageFromCode(${JSON.stringify(link.split('#p=')[1])}).title`) === 'Canción de prueba · Sí♭ ñ', 'el código se lee con acentos y ♭');
  // si no se puede copiar, el enlace queda en «Texto», seleccionado
  await E(`navigator.clipboard.writeText=()=>Promise.reject(new Error('no'))`);
  await b.clickSel('#bLink'); await b.sleep(100);
  ok(await E(`document.querySelector('#txtBox').open && document.querySelector('#txtIn').value.includes('#p=')`), 'sin portapapeles, el enlace queda en «Texto»');
  // otra página: el aviso no la sigue
  await E(`document.querySelector('#bNew').click()`); await b.sleep(80);
  ok(await E(`document.querySelector('#linkNote').hidden`), 'el aviso es de su página');
});

await part('Recibir', { width: 1280, height: 900 }, async (b, E) => {
  const code = link.split('#p=')[1];
  const n0 = await E('store.pages.length');
  await b.goto(b.url + '#p=' + code);
  ok(await E('store.pages.length') === n0 + 1, 'el enlace guarda la página en el cuaderno');
  ok(await E('P.title') === 'Canción de prueba · Sí♭ ñ' && await E('P.sig') === '3/4' && await E('P.bpm') === 132 && await E('P.key') === 'Bb', 'y la abre con título, compás, tempo y tono');
  ok(await E('P.chords.map(chordText).join(" ")') === 'Bb Gm7/F Cm7 F7', 'acordes con su bajo', await E('P.chords.map(chordText).join(" ")'));
  ok(await E('P.notes.length') === 7 && await E('P.notes[5].tie') === true, 'melodía con ligadura', await E('JSON.stringify(P.notes)'));
  ok(await E('JSON.stringify(P.marks)') === '[{"b":0,"rs":true},{"b":2,"re":3},{"b":3,"fine":true}]', 'repeticiones y saltos', await E('JSON.stringify(P.marks)'));
  ok(await E('location.hash') === '', 'el enlace se quita de la barra de direcciones');
  ok((await E(`document.querySelector('#linkNote').textContent`)).includes('recibida por enlace'), 'lo avisa');
  await b.sleep(400);
  ok(await E(`JSON.parse(localStorage.getItem('pautado-v1')).pages.some(p=>p.title==='Canción de prueba · Sí♭ ñ')`), 'queda guardada en el navegador');
  // abrir el mismo enlace otra vez no la duplica
  await b.goto(b.url + '#p=' + code);
  ok(await E('store.pages.length') === n0 + 1 && (await E(`document.querySelector('#linkNote').textContent`)).startsWith('Ya tenías'), 'el mismo enlace no la duplica');
  // con la app abierta (hashchange)
  await E(`document.querySelector('#bNew').click()`); await b.sleep(80);
  const code2 = await E(`b64url('Pautado\\nTítulo: Otra\\nCompás: 4/4 · Tempo: 90 · Tono: F\\n| F | C7 |')`);
  await E(`location.hash='p=${code2}'`); await b.sleep(250);
  ok(await E('P.title') === 'Otra' && await E('P.chords.map(chordText).join(" ")') === 'F C7', 'un enlace abierto con la app ya en marcha también entra');
  ok(await E(`document.querySelector('#pageSel').value===P.id`), 'el selector de páginas la muestra');
});

await part('Enlaces hostiles', { width: 1280, height: 900 }, async (b, E) => {
  const tries = [
    ['basura', '#p=' + b64u('esto no es una página'), 'no es de una página de Pautado'],
    ['vacío', '#p=', 'vacío'],
    ['base64 roto', '#p=A', 'incompleto o dañado'],
    ['UTF-8 roto', '#p=' + Buffer.from([0x50, 0xff, 0xfe]).toString('base64url'), 'incompleto o dañado'],
    ['compás constructor', '#p=' + b64u('Pautado\nCompás: constructor\n| C |'), 'No conozco el compás'],
    ['tono __proto__', '#p=' + b64u('Pautado\nTono: __proto__\n| C |'), 'No conozco el tono'],
    ['demasiado largo', '#p=' + 'A'.repeat(60001), 'demasiado largo'],
    ['demasiados acordes', '#p=' + b64u('Pautado\n' + '| C '.repeat(600) + '|'), 'demasiado largo'],
  ];
  for (const [name, hash, want] of tries) {
    const n0 = await E('store.pages.length');
    await b.goto(b.url + hash);
    const note = await E(`document.querySelector('#linkNote').textContent`);
    ok(note.includes(want) && await E(`document.querySelector('#linkNote').classList.contains('err')`) && await E('store.pages.length') === n0, `enlace ${name}: no guarda nada y lo dice`, note);
  }
  // título con HTML: se guarda como texto, sin interpretarlo
  await b.goto(b.url + '#p=' + b64u(`Pautado\nTítulo: ${XSS}\n| C |`));
  ok(await E('P.title') === XSS.slice(0, 80) && !(await E('window.__pwned')) && !(await E(`!!document.querySelector('#linkNote img, #pageSel img')`)), 'un título con HTML no se interpreta');
  // otra cosa en el hash no hace nada
  const n0 = await E('store.pages.length');
  await b.goto(b.url + '#otra-cosa');
  ok(await E('store.pages.length') === n0 && await E('location.hash') === '#otra-cosa', 'otro #… se ignora');
  // cuaderno lleno
  await E(`(()=>{ for(let i=store.pages.length;i<PAGES_MAX;i++) store.pages.push(newPage('P'+i)); saveLocal(); })()`);
  await b.goto(b.url + '#p=' + b64u('Pautado\nTítulo: Nueva\n| C |'));
  ok(await E('store.pages.length') === 300 && (await E(`document.querySelector('#linkNote').textContent`)).includes('el cuaderno está lleno'), 'con el cuaderno lleno no se guarda y lo dice');
});

await part('Enlace en el móvil', { width: 320, height: 640, mobile: true, scale: 2 }, async (m, E) => {
  // el menú de compartir del sistema, si lo hay
  await E(`navigator.share=o=>{ window.__shared=o; return Promise.resolve(); }`);
  await m.clickSel('#bLink'); await m.sleep(100);
  ok((await E('window.__shared?.url') || '').includes('#p=') && (await E(`document.querySelector('#linkNote').textContent`)) === 'Enlace enviado.', 'en el móvil usa el menú de compartir');
  ok(await E(`document.querySelector('#bLink').getBoundingClientRect().height`) >= 43.5, 'botón de 44 px');
  ok(await E('document.documentElement.scrollWidth') <= 320, 'sin desbordar');
});

done('enlace');
