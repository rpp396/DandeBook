// Móvil: toques en la paleta y el pentagrama, la paleta fija no tapa, 320 px sin desbordar, objetivos de 44 px.
import { part, ok, done } from './lib.mjs';
for (const [w, h] of [[390, 844], [320, 640]]) {
  await part(`Móvil ${w}×${h}`, { width: w, height: h, mobile: true, scale: 2 }, async (b, E) => {
    ok(await E('document.documentElement.scrollWidth') <= w, `${w}px: sin desplazamiento horizontal`, await E('document.documentElement.scrollWidth'));
    ok(await E('coarseMQ.matches'), `${w}px: puntero grueso emulado`);
    const small = await E(`[...document.querySelectorAll('#palette button:not([hidden])')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<43.5).map(b=>b.textContent.trim()||b.getAttribute('aria-label'))`);
    ok(small.length === 0, `${w}px: botones de la paleta de 44 px`, small);
    // tocar una nota en la paleta (toque real) añade un acorde
    await E(`document.querySelector('#bNew').click()`); await b.sleep(80);
    const r = await b.rect('#roots [data-r="1"]'); await b.tap(r.cx, r.cy); await b.sleep(60);
    const q = await b.rect('#quals [data-q="m7"]'); if (q) await b.tap(q.cx, q.cy); await b.sleep(60);
    ok(await E('P.chords.map(chordText).join()') === 'Dm7', `${w}px: toque D + m7`, await E('P.chords.map(chordText)'));
    // la paleta fija no tapa el acorde marcado
    const seg = await b.rect('#grid .seg.sel'); const dock = await b.rect('#palette');
    await E(`document.querySelector('#grid .seg.sel').scrollIntoView({block:'nearest'})`); await b.sleep(50);
    const seg2 = await b.rect('#grid .seg.sel');
    ok(seg2.y + seg2.h <= dock.y + 1, `${w}px: el acorde marcado queda por encima de la paleta`, [seg2, dock.y]);
    // plegar la paleta
    const mn = await b.rect('[data-act="min"]'); await b.tap(mn.cx, mn.cy); await b.sleep(120);
    ok(await E(`document.querySelector('#palette').offsetHeight`) < 90, `${w}px: paleta plegada`, await E(`document.querySelector('#palette').offsetHeight`));
    ok(await E(`parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH'))`) < 90, `${w}px: el hueco inferior sigue a la paleta`);
    await b.tap(mn.cx, (await b.rect('[data-act="min"]')).cy); await b.sleep(120);
    // pentagrama: tocar inserta
    await b.tap((await b.rect('#vStaff')).cx, (await b.rect('#vStaff')).cy); await b.sleep(200);
    await E(`document.querySelector('#staff').scrollIntoView({block:'start'})`); await b.sleep(80);
    const pos = await E(`(()=>{ const sv=document.querySelector('#staff svg.sys'); const r=sv.getBoundingClientRect(); const bl=ST.sys[0].bars[0]; return {x:r.left+bl.xs[0]+ST.sp, y:r.top+ST.y0+2*ST.sp}; })()`);
    await b.tap(pos.x, pos.y); await b.sleep(100);
    ok(await E('P.notes.length') === 1 && await E('P.notes[0].s') === 34, `${w}px: tocar el pentagrama pone B4`, await E('JSON.stringify(P.notes)'));
    ok(await E('ST.per') === 2 && await E('ST.sp') === 10, `${w}px: 2 compases por sistema y espacio de 10 px`, [await E('ST.per'), await E('ST.sp')]);
    ok(await E('document.documentElement.scrollWidth') <= w, `${w}px: pentagrama sin desbordar`, await E('document.documentElement.scrollWidth'));
    // acordes con bajo de negra: todo el cifrado a la vista en la grilla y sin solaparse en el pentagrama
    await E(`(()=>{ P.chords=parseChordBars('| Dm7:1 G7/B:1 C/E:1 Am7/G:1 | Fmaj7/A:2 G7/D:2 | Bb/D:1 C7/E:1 F:2 | Cmaj7 |',SIGS['4/4'],48); P.notes=[]; ed.cs=1; ed.ns=-1; store.set.view='grid'; renderAll(); })()`);
    const cut = await E(`[...document.querySelectorAll('#grid .seg.head')].filter(s=>{ const c=s.querySelector('.ch'); if(!c) return false; const a=s.getBoundingClientRect(), r=c.getBoundingClientRect(); return r.right>a.right+0.5||r.left<a.left-0.5; }).length`);
    ok(cut === 0, `${w}px: ningún acorde con bajo cortado en la grilla`, cut);
    ok(await E(`Math.min(...[...document.querySelectorAll('#grid .seg.head .ch')].map(c=>parseFloat(getComputedStyle(c).fontSize)))`) >= 13, `${w}px: cifrado de 13 px o más`);
    ok(await E(`document.querySelector('#grid .seg[data-ci="3"] .ch').classList.contains('stack')||${w}>360`), `${w}px: Am7/G con el bajo debajo cuando no cabe`);
    await E(`store.set.view='staff'; renderAll()`);
    const ov = await E(`(()=>{ let n=0; document.querySelectorAll('#staff .chrow').forEach(row=>{ const ls=[...row.querySelectorAll('.clab')].map(l=>l.getBoundingClientRect()); for(let i=0;i+1<ls.length;i++) if(ls[i].right>ls[i+1].left+0.5) n++; }); return n; })()`);
    ok(ov === 0, `${w}px: cifrados del pentagrama sin solaparse`, ov);
    ok(await E('document.documentElement.scrollWidth') <= w, `${w}px: sin desbordar con acordes densos`);
    const ro = await E(`(()=>{ const t=document.querySelector('#readout').getBoundingClientRect(), a=document.querySelector('.pal-acts').getBoundingClientRect(); return t.right<=a.left+1; })()`);
    ok(ro, `${w}px: el aviso de la paleta no se mete bajo los botones`);
  });
}
done('movil');
