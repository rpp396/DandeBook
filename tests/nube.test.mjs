// Guardado en la cuenta con un db simulado (window.claude.use) inyectado antes de cargar la página.
import { part, ok, done } from './lib.mjs';
const mock = `(()=>{ const remote={id:'remote01',title:'Desde otro dispositivo',sig:'3/4',bpm:120,key:'F',chords:[{r:3,a:0,q:'maj7',d:36}],notes:[],created:1,updated:Date.now()-1000};
  window.__db=JSON.parse(sessionStorage.getItem('__db')||'null')||{docs:{'data/users/u_test/remote01':remote},sets:[]};
  const persist=()=>sessionStorage.setItem('__db',JSON.stringify(window.__db));
  window.claude={use:async(name)=>{ await new Promise(r=>setTimeout(r,60));
    if(name==='user') return {id:async()=>'u_test'};
    if(name==='db') return {collection(path){ return {
      get:async()=>({docs:Object.entries(window.__db.docs).filter(([k])=>k.startsWith(path+'/')).map(([k,v])=>({id:k.split('/').pop(),data:()=>v}))}),
      doc(id){ return {set:async(body)=>{ window.__db.docs[path+'/'+id]=JSON.parse(JSON.stringify(body)); window.__db.sets.push(id); persist(); }}; } }; }};
    return null; }}; })();`;
await part('Guardado en la cuenta', { inject: mock }, async (b, E) => {
  await b.sleep(500);
  ok(await E('DB.ready'), 'db listo');
  ok(await E(`store.pages.length===1 && store.pages[0].id==='remote01'`), 'la página remota sustituye a la de ejemplo', await E('store.pages.map(p=>p.title)'));
  ok(await E(`document.querySelector('#saveState').textContent`) === 'Guardado en tu cuenta', 'estado: en tu cuenta');
  ok(await E('P.sig') === '3/4' && await E('P.key') === 'F', 'abre la página remota');
  ok(await E('window.__db.sets.length') === 0, 'no sube nada sin cambios', await E('window.__db.sets'));
  await E(`rootTap(4)`); await b.sleep(1300);
  ok(await E(`window.__db.sets.includes('remote01')`), 'un cambio se sube', await E('window.__db.sets'));
  ok(await E(`window.__db.docs['data/users/u_test/remote01'].chords.length`) === 2, 'el documento remoto tiene el acorde nuevo');
  await E(`document.querySelector('#bNew').click()`); await b.sleep(1300);
  const nid = await E('P.id');
  ok(await E(`!!window.__db.docs['data/users/u_test/'+${JSON.stringify(nid)}]`), 'una página nueva se sube');
  // borrar deja una marca de borrado
  await E(`document.querySelector('#bDel').click(); document.querySelector('#bDelYes').click()`); await b.sleep(1300);
  ok(await E(`window.__db.docs['data/users/u_test/'+${JSON.stringify(nid)}].del===true`), 'borrar marca el documento como borrado');
  // otro navegador (localStorage vacío) con el mismo db
  await E(`localStorage.clear()`); await b.reload(); await b.sleep(500);
  ok(await E(`store.pages.length===1 && store.pages[0].chords.length===2`), 'en otro navegador aparece lo guardado, sin la página borrada', await E('store.pages.map(p=>[p.title,p.chords.length])'));
});
done('nube');
