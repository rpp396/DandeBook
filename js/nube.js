// Pautado · Guardado en la cuenta de claude.ai (window.claude). Fuera de claude.ai no hace nada y basta localStorage.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Guardado en la cuenta (db de claude.ai) ---------- */
// Cada página es un documento privado en data/users/<id>/<página>. Fuera de claude.ai no existe y basta localStorage.
const DB={col:null,ready:false,pend:new Set(),busy:false,t:0};
async function initCloud(){
  if(!window.claude||typeof window.claude.use!=='function') return;
  try{
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    const col=db.collection('data/users/'+id);
    const snap=await col.get();
    const remote=[];
    snap.docs.forEach(d=>{ const p=cleanPage(isObj(d.data())?{...d.data(),id:d.id}:null); if(p) remote.push(p); });
    mergeRemote(remote);
    DB.col=col; DB.ready=true; saveState='cloud';
    store.pages.forEach(p=>{ if(!p.ex){ const r=remote.find(x=>x.id===p.id); if(!r||r.updated<p.updated) DB.pend.add(p.id); } });
    store.gone.forEach(id=>{ const r=remote.find(x=>x.id===id); if(r&&!r.del) DB.pend.add(id); });
    saveLocal(); afterSwitch(true); cloudFlush();
  }catch(e){ /* sin cuenta: sigue en este navegador */ }
}
function mergeRemote(remote){
  const realLocal=store.pages.filter(p=>!p.ex);
  if(remote.some(r=>!r.del)&&!realLocal.length){ // solo había la página de ejemplo
    store.pages=store.pages.filter(p=>!p.ex);
  }
  remote.forEach(r=>{
    if(store.gone.includes(r.id)) return;
    const i=store.pages.findIndex(p=>p.id===r.id);
    if(r.del){ if(i>=0&&store.pages[i].updated<=r.updated){ store.pages.splice(i,1); store.gone.push(r.id); } return; }
    if(i<0) store.pages.push(r); else if(r.updated>store.pages[i].updated) store.pages[i]=r;
  });
  if(!store.pages.length) store.pages=[examplePage()];
  if(!store.pages.some(p=>p.id===store.cur)) store.cur=store.pages[0].id;
}
function cloudQueue(id){ if(!DB.ready) return; DB.pend.add(id); clearTimeout(DB.t); DB.t=setTimeout(cloudFlush,900); }
async function cloudFlush(){
  if(!DB.ready||DB.busy) return; DB.busy=true;
  try{
    while(DB.pend.size){
      const id=DB.pend.values().next().value; DB.pend.delete(id);
      const p=store.pages.find(x=>x.id===id);
      const body=p?JSON.parse(JSON.stringify(p)):{id,del:true,updated:Date.now(),title:'',chords:[],notes:[]};
      if(p&&p.ex) continue;
      try{ await DB.col.doc(id).set(body); }
      catch(e){
        if(e&&e.code==='unavailable'){ await new Promise(r=>setTimeout(r,600+Math.random()*600)); try{ await DB.col.doc(id).set(body); }catch(e2){ DB.pend.add(id); break; } }
        else if(e&&(e.code==='revoked'||e.code==='not_granted'||e.code==='invalid_argument')){ DB.ready=false; saveState='local'; renderSaveState(); break; }
        else { DB.pend.add(id); break; }
      }
    }
  } finally { DB.busy=false; }
}
