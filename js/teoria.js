// Pautado · Nombres de notas y acordes, inversiones, transporte, lectura y escritura en texto y reparto en compases.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Teoría: nombres, transporte ---------- */
const accStr=a=>a>0?'♯'.repeat(a):a<0?'♭'.repeat(-a):'';
const accAscii=a=>a>0?'#'.repeat(a):a<0?'b'.repeat(-a):'';
function rootName(r,a){ return {n:(store.set.names==='lat'?LAT:LET)[r],acc:accStr(a)}; }
function rootSay(r,a){ return LAT[r]+(a===1?' sostenido':a===-1?' bemol':a===2?' doble sostenido':a===-2?' doble bemol':''); }
function sfx(q){ return QM[q][store.set.style]; }
const SYM={'△':'','°':'','ø':'','−':'','+':''};
function symHTML(s){ return [...s].map(c=>has(SYM,c)?`<span class="sym">${SYM[c]}</span>`:esc(c)).join(''); }
function chordHTML(c){
  if(c.nc) return '<span class="ch nc">N.C.</span>';
  const {n,acc}=rootName(c.r,c.a); let h=`<span class="ch"><span class="mn"><span class="rt">${n}</span>`;
  if(acc) h+=`<span class="ac">${acc}</span>`;
  const s=sfx(c.q); if(s) h+=`<span class="sf">${symHTML(s)}</span>`;
  h+='</span>';
  if(c.b){ const b=rootName(c.b.r,c.b.a); h+=`<span class="bs">/${b.n}${b.acc?`<span class="ac">${b.acc}</span>`:''}</span>`; }
  return h+'</span>';
}
// Inversiones: la nota que va al bajo en 1.ª, 2.ª y 3.ª, como [grados por encima de la fundamental, semitonos]
const T3=[2,4],t3=[2,3],T5=[4,7],d5=[4,6],a5=[4,8],m7=[6,10],M7=[6,11],d7=[6,9],S6=[5,9];
const INV={'':[T3,T5],m:[t3,T5],'7':[T3,T5,m7],maj7:[T3,T5,M7],m7:[t3,T5,m7],m7b5:[t3,d5,m7],dim:[t3,d5],dim7:[t3,d5,d7],
  sus4:[[3,5],T5],'6':[T3,T5,S6],'9':[T3,T5,m7],aug:[T3,a5],sus2:[[1,2],T5],'7sus4':[[3,5],T5,m7],m6:[t3,T5,S6],mmaj7:[t3,T5,M7],
  add9:[T3,T5],'69':[T3,T5,S6],maj9:[T3,T5,M7],m9:[t3,T5,m7],m11:[t3,T5,m7],'7b9':[T3,T5,m7],'7#9':[T3,T5,m7],'7#11':[T3,T5,m7],
  '7#5':[T3,a5,m7],'13':[T3,T5,m7],'7alt':[T3,[5,8],m7]}; // en el alterado, la «quinta» se escribe como trecena bemol (E7alt/C)
const INV_NAME=['estado fundamental','primera inversión','segunda inversión','tercera inversión'];
const pcOf=(r,a)=>((PC[r]+a)%12+12)%12;
const chordTones=c=>INV[c.q]||INV[''];
function invBass(c,k){ const t=chordTones(c)[k-1]; if(!t) return null; const n=trPC(c.r,c.a,{ds:t[0],dc:t[1]}); return {r:n.r,a:n.a}; }
// 0 = sin bajo o con la fundamental en el bajo; 1–3 = inversión; -1 = otro bajo
function invOf(c){ if(c.nc||!c.b) return 0; const bp=pcOf(c.b.r,c.b.a), rp=pcOf(c.r,c.a); if(bp===rp) return 0; const ts=chordTones(c); for(let k=0;k<ts.length;k++) if((rp+ts[k][1])%12===bp) return k+1; return -1; }
function setInv(c,k){ if(k<=0){ delete c.b; return; } const b=invBass(c,k); if(b) c.b=b; }
// cambia el acorde conservando su inversión (C/E → Cm/E♭); si la nueva calidad no tiene esa nota, el bajo se queda como estaba
function keepInv(c,fn){ const k=invOf(c); fn(); if(k>0){ const b=invBass(c,k); if(b) c.b=b; } }
function chordSay(c){
  if(c.nc) return 'sin acorde'; let t=`${rootSay(c.r,c.a)} ${QM[c.q].say}`;
  if(c.b){ const k=invOf(c); t+=k>0?`, ${INV_NAME[k]}, bajo en ${rootSay(c.b.r,c.b.a)}`:`, bajo en ${rootSay(c.b.r,c.b.a)}`; }
  return t;
}
function chordText(c){
  if(c.nc) return 'N.C.';
  const q=QM[c.q].pop.replace(/♭/g,'b').replace(/♯/g,'#');
  return LET[c.r]+accAscii(c.a)+q+(c.b?'/'+LET[c.b.r]+accAscii(c.b.a):'');
}
function fmtNum(v){ return String(+v.toFixed(2)).replace('.',','); }
function beatsSay(d){ const b=d/SIGS[P.sig].beat; if(b===1) return '1 tiempo'; if(b===0.5) return 'medio tiempo'; return `${fmtNum(b)} tiempos`; }
const midiNat=s=>12*(Math.floor(s/7)+1)+PC[((s%7)+7)%7];
const midiOf=(s,a)=>midiNat(s)+a;
function noteName(s,a){ const r=((s%7)+7)%7; return (store.set.names==='lat'?LAT:LET)[r]+accStr(a)+Math.floor(s/7); }
function noteSay(s,a){ const r=((s%7)+7)%7; return `${rootSay(r,a)} ${Math.floor(s/7)}`; }
function trInterval(from,to){ let ds=(to.r-from.r+7)%7; let dc=((PC[to.r]+to.a)-(PC[from.r]+from.a)+24)%12; if(dc>6){dc-=12; ds-=7;} return {ds,dc}; }
function respell(r,a){
  while(a>1){ const r2=(r+1)%7; a-=(PC[r2]-PC[r]+12)%12; r=r2; }
  while(a<-1){ const r2=(r+6)%7; a+=(PC[r]-PC[r2]+12)%12; r=r2; }
  return {r,a};
}
// Intervalo para transportar una página: el más cercano; en el tritono (6 semitonos, igual de lejos arriba que abajo)
// la melodía sube o baja según quede más cerca del centro del pentagrama (B4), para que ir y volver no la suba una octava.
function trFor(from,to,notes){
  const iv=trInterval(from,to); if(iv.dc!==6) return iv;
  const ss=notes.filter(n=>!n.rest).map(n=>n.s); const avg=ss.length?ss.reduce((a,v)=>a+v,0)/ss.length:34;
  return avg>34?{ds:iv.ds-7,dc:-6}:iv;
}
function trPC(r,a,iv){ const r2=((r+iv.ds)%7+7)%7; let a2=(PC[r]+a+iv.dc)-PC[r2]; a2=((a2%12)+18)%12-6; return respell(r2,a2); }
function trNote(n,iv){
  const midi=midiOf(n.s,n.a)+iv.dc; let s=n.s+iv.ds, a=midi-midiNat(s);
  while(a>1){ s+=1; a=midi-midiNat(s); } while(a<-1){ s-=1; a=midi-midiNat(s); }
  return {s:Math.max(14,Math.min(56,s)),a};
}
const SH_NAMES=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]];
const FL_NAMES=[[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]];
function semiShift(r,a,dir){ const pc=((PC[r]+a+dir)%12+12)%12; const [nr,na]=(dir>0?SH_NAMES:FL_NAMES)[pc]; return {r:nr,a:na}; }
/* ---------- Lectura de acordes y melodía en texto ---------- */
const ALIAS={'':'','M':'','maj':'','ma':'','mayor':'','m':'m','min':'m','mi':'m','menor':'m',
  '7':'7','dom7':'7','maj7':'maj7','M7':'maj7','7M':'maj7','ma7':'maj7','7maj':'maj7','j7':'maj7',
  'm7':'m7','min7':'m7','mi7':'m7','m7b5':'m7b5','min7b5':'m7b5','mi7b5':'m7b5','m7-5':'m7b5','m7(b5)':'m7b5','hdim':'m7b5','hdim7':'m7b5',
  'dim':'dim','o':'dim','dim7':'dim7','o7':'dim7','aug':'aug','+':'aug','#5':'aug','+5':'aug','5+':'aug',
  'sus':'sus4','sus4':'sus4','4':'sus4','sus2':'sus2','2':'sus2','7sus':'7sus4','7sus4':'7sus4','sus7':'7sus4',
  '6':'6','m6':'m6','min6':'m6','mmaj7':'mmaj7','mM7':'mmaj7','m7M':'mmaj7','minmaj7':'mmaj7','mmaj':'mmaj7','m(maj7)':'mmaj7',
  'add9':'add9','add2':'add9','69':'69','6/9':'69','6(9)':'69','6add9':'69',
  '9':'9','7(9)':'9','79':'9','maj9':'maj9','M9':'maj9','7M(9)':'maj9','7M9':'maj9','m9':'m9','min9':'m9','m7(9)':'m9','m79':'m9',
  'm11':'m11','m7(11)':'m11','m711':'m11','7b9':'7b9','7(b9)':'7b9','7-9':'7b9','7#9':'7#9','7(#9)':'7#9','7+9':'7#9',
  '7#11':'7#11','7(#11)':'7#11','7+11':'7#11','7#5':'7#5','7(#5)':'7#5','7+5':'7#5','aug7':'7#5','+7':'7#5',
  '13':'13','7(13)':'13','713':'13','7alt':'7alt','alt':'7alt'};
const CASE_KEYS=new Set(['M','M7','M9','mM7','7M','7M(9)','7M9','m7M']);
const ALIAS_LC={}; Object.keys(ALIAS).forEach(k=>{ if(!CASE_KEYS.has(k)&&!/^m/.test(k)) ALIAS_LC[k.toLowerCase()]=ALIAS[k]; });
const LATI={do:0,re:1,mi:2,fa:3,sol:4,la:5,si:6};
function parseNoteName(n,acc){ const r=n.length>1?LATI[n.toLowerCase()]:LET.indexOf(n.toUpperCase()); let a=0; for(const ch of acc) a+=(ch==='#'||ch==='♯')?1:-1; return {r,a}; }
function parseChord(tok){
  const t=tok.trim(); if(/^(n\.?c\.?)$/i.test(t)) return {nc:true};
  // primero como nombre latino (Do, Sol…) y, si no sale, como letra (Faug = F aumentado, no Fa + «ug»)
  const tries=[]; let m=t.match(/^(do|re|mi|fa|sol|la|si)([#♯b♭]{0,2})(.*)$/i); if(m) tries.push(m);
  m=t.match(/^([a-g])([#♯b♭]{0,2})(.*)$/i); if(m) tries.push(m);
  for(const [,n,acc,rest] of tries){ const c=parseChordRest(n,acc,rest); if(c) return c; }
  return null;
}
function parseChordRest(n,acc,rest){
  let bass=null; const bm=rest.match(/\/(do|re|mi|fa|sol|la|si|[a-g])([#♯b♭]{0,2})$/i);
  if(bm){ bass=parseNoteName(bm[1],bm[2]); rest=rest.slice(0,rest.length-bm[0].length); }
  let q=rest.replace(/♭/g,'b').replace(/♯/g,'#').replace(/\s+/g,'');
  q=q.replace(/[Δ△^](?=\d)/g,'maj').replace(/[Δ△^]/g,'maj7').replace(/[ø]7?/g,'m7b5').replace(/[°º]/g,'o').replace(/^[−–-]/,'m');
  let k=has(ALIAS,q)?ALIAS[q]:null;
  if(k===null){ const q2=q.replace(/[()]/g,''); if(has(ALIAS,q2)) k=ALIAS[q2]; else if(has(ALIAS_LC,q2.toLowerCase())) k=ALIAS_LC[q2.toLowerCase()]; }
  if(k===null) return null;
  const root=parseNoteName(n,acc); const c={r:root.r,a:root.a,q:k}; if(bass) c.b=bass; return c;
}
function parseTok(tok,sg){
  const m=tok.match(/^(.*?)(?::(\d+(?:[.,]\d+)?))?$/); const name=m[1]; let d=null;
  if(m[2]!==undefined){ d=Math.round(parseFloat(m[2].replace(',','.'))*sg.beat); if(!(d>0)||d%3) throw new Error(`No sé cuánto dura «${tok}»: usa tiempos enteros o medios`); }
  if(name==='-'||name==='/') return {c:'-',d};
  const c=parseChord(name); if(!c) throw new Error(`No entiendo el acorde «${name}»`);
  return {c,d};
}
// Retornelos: se escriben «||:» y «:||»; también se aceptan «|:» y «:|» (los textos y enlaces de antes). normRep deja la forma corta.
const normRep=s=>s.replace(/:\|\|/g,':|').replace(/\|\|:/g,'|:');
// Marcas de forma escritas en un compás: «:» al principio («||:») o al final («:||»), «x3» (vueltas), «1.» «2.» (casillas),
// Segno, Coda, «Al Coda», Fine, «D.C.», «D.S.», «D.C. al Fine», «D.S. al Coda». Devuelve los demás tokens y la marca.
function barMarks(part){
  let p=part.trim(); const m={}; let times=0;
  if(p.startsWith(':')){ m.rs=true; p=p.slice(1); }
  if(p.endsWith(':')){ m.re=2; p=p.slice(0,-1); }
  p=p.replace(/(^|\s)(D\.[CS]\.)\s+al\s+(fine|coda)(?=\s|$)/gi,'$1$2_al_$3').replace(/(^|\s)al\s+coda(?=\s|$)/gi,'$1al_coda');
  const toks=[];
  for(const t of p.split(/\s+/).filter(Boolean)){
    let x;
    if(/^[1-4]\.$/.test(t)) m.v=+t[0];
    else if(/^(segno|𝄋)$/i.test(t)) m.segno=true;
    else if(/^(coda|𝄌)$/i.test(t)) m.coda=true;
    else if(/^al_coda$/i.test(t)) m.tocoda=true;
    else if(/^fine$/i.test(t)) m.fine=true;
    else if((x=t.match(/^D\.([CS])\.(?:_al_(fine|coda))?$/i))){ m.go=x[1].toUpperCase()==='C'?'dc':'ds'; m.al=(x[2]||'').toLowerCase(); }
    else if((x=t.match(/^[x×]([2-8])$/i))) times=+x[1];
    else toks.push(t);
  }
  if(times){ if(!m.re) throw new Error(`«x${times}» va con «:||», al final de la repetición`); m.re=times; }
  return {toks,m};
}
function parseChordBars(text,sg,defDur,firstL=0,forceBars=false,marks=null){
  const out=[]; const L=sg.L; const src=normRep(text.replace(/\n/g,' '));
  const pushTok=(it,d)=>{ if(it.c==='-'){ if(!out.length) throw new Error('«-» alarga el acorde anterior, y todavía no hay ninguno'); out[out.length-1].d+=d; } else out.push({...it.c,d}); };
  if(!src.includes('|')&&!forceBars){
    for(const tok of src.split(/\s+/).filter(Boolean)){ const it=parseTok(tok,sg); pushTok(it,it.d??defDur); }
    return out;
  }
  const parts=src.split('|').map(s=>s.trim()); if(parts[0]==='') parts.shift(); if(parts.length&&parts[parts.length-1]==='') parts.pop();
  let prev=null;
  // compases del final sin acordes que llevan marcas (un Fine o un D.C. en compases de solo melodía): no alargan el acorde anterior
  const bms=parts.map(barMarks), lastCh=bms.reduce((a,x,i)=>x.toks.length?i:a,-1), tail=bms.some((x,i)=>i>lastCh&&Object.keys(x.m).length);
  parts.forEach((part,pi)=>{
    const BL=pi===0&&firstL?firstL:L;
    const bm=bms[pi]; if(Object.keys(bm.m).length){ if(!marks) throw new Error(`Aquí no se pueden poner repeticiones ni saltos («${part.trim()}»)`); marks.push({b:pi,...bm.m}); }
    if(tail&&pi>lastCh) return;
    let toks=bm.toks; if(!toks.length) toks=['-'];
    if(toks.length===1&&toks[0]==='%'){ if(!prev) throw new Error('«%» repite el compás anterior, y aquí no hay ninguno'); toks=prev.slice(); }
    const items=toks.map(t=>parseTok(t,sg));
    const fixed=items.reduce((a,i)=>a+(i.d||0),0), free=items.filter(i=>i.d==null).length;
    let each=0;
    if(free){ const rem=BL-fixed; each=rem/free; if(rem<=0||!Number.isInteger(each)||each%3) throw new Error(`Los acordes de «${part}» no se pueden repartir en ${BL<L?'lo que queda del':'el'} compás: indica los tiempos con «:» (Dm7:3 G7:1)`); }
    else if(fixed>BL||(fixed<BL&&pi<parts.length-1)) throw new Error(`«${part}» dura ${fmtNum(fixed/sg.beat)} tiempos y ${BL<L?'quedan':'el compás tiene'} ${fmtNum(BL/sg.beat)}`);
    items.forEach(it=>pushTok(it,it.d??each));
    prev=toks;
  });
  return out;
}
function parseMelody(text){
  const out=[]; const DL={w:48,h:24,q:12,e:6,s:3};
  for(const tok of text.replace(/\|/g,' ').split(/\s+/).filter(Boolean)){
    let m=tok.match(/^r([whqes])(\.)?$/i);
    if(m){ let d=DL[m[1].toLowerCase()]; if(m[2]) d*=1.5; if(d%3) throw new Error(`«${tok}»: la semicorchea no lleva puntillo`); out.push({s:34,a:0,d,rest:true,tie:false}); continue; }
    m=tok.match(/^([A-Ga-g])(##|bb|#|b|♯|♭)?(\d)([whqes])(\.)?(~)?$/);
    if(!m) throw new Error(`No entiendo la nota «${tok}» (ejemplos: C4q, Bb3e., F#5h~, rq)`);
    const r=LET.indexOf(m[1].toUpperCase()); const acc=m[2]||''; let a=0; for(const ch of acc) a+=(ch==='#'||ch==='♯')?1:-1;
    let d=DL[m[4].toLowerCase()]; if(m[5]) d*=1.5; if(d%3) throw new Error(`«${tok}»: la semicorchea no lleva puntillo`);
    const s=+m[3]*7+r; if(s<14||s>56) throw new Error(`«${tok}» está fuera del registro`);
    out.push({s,a,d,rest:false,tie:!!m[6]});
  }
  return out;
}
function exportText(p){
  const sg=SIGS[p.sig], L=sg.L; const lines=['Pautado',`Título: ${p.title}`,`Compás: ${p.sig} · Tempo: ${p.bpm} · Tono: ${p.key}`];
  const pm=p.marks||[], nb=Math.max(Math.ceil(sumD(p.chords)/L),pm.length?pm[pm.length-1].b+1:0); // también los compases sin acordes que llevan marcas
  if(nb){ const bars=chordSegs(p,nb); const toks=bars.map((segs,b)=>{ const real=segs.filter(s=>!s.gap); const eq=!segs.some(s=>s.gap)&&real.every(s=>s.d===real[0].d);
      return barText(markAt(p,b),real.map(s=>(s.head?chordText(p.chords[s.ci]):'-')+(eq?'':':'+fmtNum(s.d/sg.beat).replace(',','.'))).join(' ')); });
    for(let i=0;i<toks.length;i+=4) lines.push((toks.slice(i,i+4).join(' ')+' |').replace(/ : \|\|:/g,' :||:').replace(/ : \|(?!\|)/g,' :||')); }
  if(p.notes.length){ let t=0; const parts=[]; p.notes.forEach(n=>{ if(t>0&&t%L===0) parts.push('|'); parts.push(noteTok(n)); t+=n.d; }); lines.push('Melodía: '+parts.join(' ')); }
  return lines.join('\n');
}
// Un compás en texto, con sus marcas: «||: 1. Segno Dm7 G7 x3 Fine :» (exportText cierra el «:||»)
function barText(m,chords){
  if(!m) return chords?'| '+chords:'|';
  const pre=[m.v?`${m.v}.`:'',m.segno?'Segno':'',m.coda?'Coda':''].filter(Boolean), post=[m.re>2?`x${m.re}`:'',m.tocoda?'Al Coda':'',m.fine?'Fine':'',m.go?JUMP_TXT[m.go]+AL_TXT[m.al||'']:''].filter(Boolean);
  const body=[...pre,chords,...post].filter(Boolean).join(' ');
  return (m.rs?'||:':'|')+(body?' '+body:'')+(m.re?' :':'');
}
function noteTok(n){
  const base=DOTTED.includes(n.d)?n.d/1.5:n.d; const dl=DLET[base]; const dot=DOTTED.includes(n.d)?'.':'';
  if(!dl) return (n.rest?'rq':pitchTok(n)+'q'); // no debería pasar: las duraciones vienen de la paleta
  if(n.rest) return 'r'+dl+dot;
  return pitchTok(n)+dl+dot+(n.tie?'~':'');
}
function pitchTok(n){ const r=((n.s%7)+7)%7; return LET[r]+accAscii(n.a)+Math.floor(n.s/7); }
function importText(txt){
  let title='Página importada', sig='4/4', bpm=100, key='C'; const ch=[], mel=[];
  for(const raw of txt.split(/\r?\n/)){
    const line=raw.trim(); if(!line||/^pautado$/i.test(line)) continue;
    let m=line.match(/^t[ií]tulo\s*:\s*(.*)$/i); if(m){ title=m[1].slice(0,80)||title; continue; }
    m=line.match(/^melod[ií]a\s*:\s*(.*)$/i); if(m){ mel.push(m[1]); continue; }
    if(/^(comp[aá]s|tempo|tono)\s*:/i.test(line)){
      line.split(/[·,;]/).forEach(part=>{ const kv=part.split(':'); if(kv.length<2) return; const k=kv[0].trim().toLowerCase(), v=kv.slice(1).join(':').trim();
        if(/^comp/.test(k)){ if(!has(SIGS,v)) throw new Error(`No conozco el compás «${v}»`); sig=v; }
        else if(k==='tempo'){ const b=parseInt(v,10); if(b>=30&&b<=300) bpm=b; }
        else if(k==='tono'){ const kk=v.replace('♭','b').replace('♯','#'); if(!has(KEYMAP,kk)) throw new Error(`No conozco el tono «${v}»`); key=kk; } });
      continue;
    }
    ch.push(normRep(line)); // «||:» y «:||» pasan a «|:» y «:|» antes de quitar las barras de los extremos de la línea
  }
  const p=newPage(title); p.sig=sig; p.bpm=bpm; p.key=key;
  const rows=ch.map(l=>l.replace(/^\|\s*/,'').replace(/\s*\|$/,'').trim()).filter(Boolean);
  const ctext=rows.length&&!ch.some(l=>l.includes('|'))?rows.join(' ').split(/\s+/).join(' | '):rows.join(' | ');
  const mk=[]; if(ctext.trim()) p.chords=parseChordBars(ctext,SIGS[sig],SIGS[sig].L,0,true,mk); p.marks=cleanMarks(mk);
  if(mel.length) p.notes=parseMelody(mel.join(' '));
  if(!p.chords.length&&!p.notes.length) throw new Error('El texto no tiene acordes ni melodía');
  if(p.chords.length>512||p.notes.length>1024) throw new Error('El texto es demasiado largo para una página');
  return p;
}
/* ---------- Reparto en compases ---------- */
function barCount(p){ const content=formBars(p); return Math.min(256,Math.max(8,Math.ceil((content+1)/4)*4)); }
function chordSegs(p,N){
  const L=SIGS[p.sig].L; const st=[]; let t=0; p.chords.forEach(c=>{ st.push(t); t+=c.d; });
  const bars=[];
  for(let b=0;b<N;b++){
    const b0=b*L, b1=b0+L, segs=[];
    for(let i=0;i<p.chords.length;i++){ const s=st[i], e=s+p.chords[i].d; if(e<=b0) continue; if(s>=b1) break; const a=Math.max(s,b0); segs.push({ci:i,t:a-b0,d:Math.min(e,b1)-a,head:s>=b0}); }
    const filled=segs.reduce((a,s)=>a+s.d,0); if(filled<L) segs.push({ci:-1,t:filled,d:L-filled,gap:true});
    bars.push(segs);
  }
  return bars;
}
function decomp(x){ const out=[]; while(x>0){ const f=FIGS_DESC.find(v=>v<=x); out.push(f); x-=f; } return out; }
function melBars(p,N){
  const L=SIGS[p.sig].L; const bars=Array.from({length:N},()=>[]); const flat=[]; let t=0;
  p.notes.forEach((n,ni)=>{
    let s=t, rem=n.d, first=true;
    while(rem>0){
      const b=Math.floor(s/L); if(b>=N) break; const take=Math.min(rem,(b+1)*L-s);
      const parts=(n.rest&&s%L===0&&take===L)?[L]:decomp(take);
      for(const d of parts){ const e={ni,b,t:s-b*L,d,rest:n.rest,s:n.s,a:n.a,first,tie:false,mr:n.rest&&d===L&&s%L===0}; bars[b].push(e); flat.push(e); first=false; s+=d; rem-=d; }
    }
    t+=n.d;
  });
  for(let i=0;i<flat.length;i++){ const e=flat[i], nx=flat[i+1]; if(e.rest||!nx||nx.rest) continue; if(nx.ni===e.ni||(p.notes[e.ni].tie&&nx.s===e.s)) e.tie=true; }
  return {bars,flat};
}
const startOf=(arr,i)=>{ let t=0; for(let k=0;k<i;k++) t+=arr[k].d; return t; };
/* ---------- Forma: repeticiones y saltos ---------- */
const FORM_MAX=1024; // compases como mucho en el recorrido (protege de bucles con datos raros)
// Compases con contenido o con alguna marca
function formBars(p){ const L=SIGS[p.sig].L; const content=Math.ceil(Math.max(sumD(p.chords),sumD(p.notes))/L); const m=p.marks||[]; return Math.max(content,m.length?m[m.length-1].b+1:0); }
const markAt=(p,b)=>(p.marks||[]).find(m=>m.b===b)||null;
// Orden en que suenan los compases 0…n−1. Convenciones: «:‖» con n vueltas vuelve al «‖:» anterior (o al principio);
// en cada vuelta se toca la casilla de ese número (la última si hay más vueltas que casillas). D.C. y D.S. saltan una sola
// vez y, después del salto, no se repite y solo se toca la última casilla; entonces «Al Coda» lleva a la Coda y Fine termina.
function formPath(p,n=formBars(p)){
  const ms=(p.marks||[]).filter(m=>m.b<n), M=new Map(ms.map(m=>[m.b,m]));
  const at=k=>{ const m=ms.find(x=>x[k]); return m?m.b:-1; };
  const segno=at('segno'), coda=at('coda');
  const vmax=new Map(); // número más alto de casilla en cada tramo de casillas seguidas
  for(let b=0;b<n;){ if(!M.get(b)?.v){ b++; continue; } let e=b, mx=0; while(e<n&&M.get(e)?.v){ mx=Math.max(mx,M.get(e).v); e++; } for(let k=b;k<e;k++) vmax.set(k,mx); b=e; }
  const path=[]; let b=0, start=0, pass=1, jumped=false, back=false, inV=false, toCoda=false;
  while(b<n&&path.length<FORM_MAX){
    const m=M.get(b)||{}, wasBack=back; back=false;
    if(m.rs&&!jumped&&!wasBack){ start=b; pass=1; }
    // pass = vuelta de la sección que se repite; al salir de un tramo de casillas empieza otra sección
    if(m.v){ inV=true; const want=jumped?vmax.get(b):Math.min(pass,vmax.get(b)); if(m.v!==want){ b++; continue; } }
    else if(inV){ inV=false; if(!wasBack&&!jumped){ start=b; pass=1; } }
    path.push(b);
    if(jumped&&m.fine) break;
    if(jumped&&m.tocoda&&!toCoda&&coda>=0&&coda!==b){ toCoda=true; b=coda; continue; }
    if(m.re&&!jumped){
      if(pass<m.re){ pass++; b=start; back=true; continue; }
      start=b+1; if(!M.get(b+1)?.v) pass=1;
    }
    if(m.go&&!jumped){ const t=m.go==='dc'?0:segno; if(t>=0){ jumped=true; b=t; continue; } }
    b++;
  }
  return path;
}
// Nombre de los saltos en pantalla y en voz
const JUMP_TXT={dc:'D.C.',ds:'D.S.'}, AL_TXT={'':'',fine:' al Fine',coda:' al Coda'};
const JUMP_SAY={dc:'da capo',ds:'dal segno'}, AL_SAY={'':'',fine:' al fine',coda:' al coda'};
// Lo que se lee al final del compás: vueltas, Al Coda, Fine y el salto
function markEndText(m,times=true){ const t=[]; if(!m) return ''; if(times&&m.re>2) t.push(`×${m.re}`); if(m.tocoda) t.push('Al Coda'); if(m.fine) t.push('Fine'); if(m.go) t.push(JUMP_TXT[m.go]+AL_TXT[m.al||'']); return t.join(' · '); }
function markSay(m){
  if(!m) return ''; const t=[];
  if(m.segno) t.push('segno'); if(m.coda) t.push('coda'); if(m.rs) t.push('inicio de repetición'); if(m.v) t.push(`casilla ${m.v}`);
  if(m.re) t.push(`fin de repetición${m.re>2?`, ${m.re} veces`:''}`); if(m.tocoda) t.push('al coda'); if(m.fine) t.push('fine');
  if(m.go) t.push(JUMP_SAY[m.go]+AL_SAY[m.al||'']);
  return t.join(', ');
}
