// Pautado · Arranque. Debe ser el último script.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.
'use strict';

/* ---------- Arranque ---------- */
load();
P=store.pages.find(p=>p.id===store.cur)||store.pages[0];
ed.cs=P.chords.length-1; ed.ns=P.notes.length-1; meterDefaults();
$('#pSig').innerHTML=Object.keys(SIGS).map(s=>`<option value="${s}">${s}</option>`).join('');
fillKeySelects(); buildPalette(); buildForms(); relabelPalette(); syncMB();
$('#sStyle').value=store.set.style; $('#sNames').value=store.set.names; $('#sSim').checked=store.set.simile;
bind(); renderAll(); dockSize();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ labCache.clear(); if(store.set.view==='staff') renderStaff(); else renderGrid(); });
initCloud();
