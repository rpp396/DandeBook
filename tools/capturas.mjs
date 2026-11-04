// Rehace las capturas del README (docs/capturas/) con la página de ejemplo: escritorio a 1200 px y móvil a 390 px, ambas a ×2.
import { open, ROOT } from '../tests/lib.mjs';
import path from 'node:path';
const D = path.join(ROOT, 'docs', 'capturas') + path.sep;

{ // escritorio: grilla con un acorde invertido marcado
  const b = await open({ width: 1200, height: 760, scale: 2 });
  await b.eval(`(()=>{ const c=P.chords[1]; c.b=invBass(c,1); ed.cs=1; renderAll(); })()`);
  await b.shot(D + 'grilla.png', false);
  await b.eval(`store.set.view='staff'; ed.ns=4; renderAll()`); await b.sleep(150);
  await b.shot(D + 'pentagrama.png', false);
  await b.eval(`(()=>{ store.set.view='grid'; store.set.style='jazz'; store.set.names='lat'; relabelPalette(); fillKeySelects();
    P.chords=parseChordBars('| Dm7b5 G7b9 | Cm(maj7) | Fmaj7/A | Bb7/D | Ebdim7 | Ab6/C | Dm7b5/Ab G7alt | Cm6 |',SIGS['4/4'],48); ed.cs=2; ed.moreQ=true; renderAll(); })()`);
  await b.shot(D + 'cifrado-jazz.png', false);
  await b.close();
}
{ // móvil: grilla con la paleta fija y pentagrama
  const b = await open({ width: 390, height: 844, mobile: true, scale: 2 });
  await b.eval(`(()=>{ const c=P.chords[1]; c.b=invBass(c,1); ed.cs=1; renderAll(); dockSize(); window.scrollTo(0, document.querySelector('.sheet').getBoundingClientRect().top+scrollY-12); })()`); await b.sleep(150);
  await b.shot(D + 'movil-grilla.png', false);
  await b.eval(`store.set.view='staff'; ed.ns=4; renderAll(); window.scrollTo(0, document.querySelector('#staff').getBoundingClientRect().top+scrollY-20)`); await b.sleep(150);
  await b.shot(D + 'movil-pentagrama.png', false);
  await b.close();
}
console.log('Capturas en', D);
