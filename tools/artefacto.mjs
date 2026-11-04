// Arma dist/pautado.html, la app en un solo archivo para publicarla como Artifact de claude.ai: estilos y scripts en línea y
// fuentes como data: URI. El Artifact pone por su cuenta el esqueleto (doctype, head, body), así que el archivo empieza por
// <title>. También escribe dist/prueba.html, el mismo contenido con ese esqueleto, para pasarle las pruebas (ARTEFACTO=1 npm test).
// La app en sí no necesita esto: se usa abriendo index.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const title = html.match(/<title>(.*?)<\/title>/)[1];
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
const scripts = [...body.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const markup = body.replace(/<script src="[^"]+"><\/script>\n?/g, '').trim();
const MIME = { '.woff2': 'font/woff2', '.woff': 'font/woff' };
const css = read('styles.css').replace(/url\((fonts\/[^)]+)\)/g, (m, f) => `url(data:${MIME[path.extname(f)]};base64,${fs.readFileSync(path.join(ROOT, f)).toString('base64')})`);
const js = scripts.map(s => `/* ===== ${s} ===== */\n` + read(s)).join('\n');
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('Un script o estilo contiene una etiqueta de cierre: no se puede poner en línea');

const notice = `<!--
Pautado: archivo único generado por tools/artefacto.mjs a partir de index.html, styles.css y js/. No editarlo a mano.
Fuentes incluidas (SIL Open Font License 1.1; textos en fonts/OFL-*.txt del repositorio):
  Pautado Cifra y Pautado Simbolos, subconjuntos renombrados de Petaluma Script y Petaluma, © 2018 y 2021 Steinberg Media Technologies GmbH.
  Atkinson Hyperlegible © 2020 Braille Institute of America, Inc. · Young Serif © 2023 The Young Serif Project Authors · JetBrains Mono © 2020 The JetBrains Mono Project Authors.
-->`;
const page = `<title>${title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${notice}\n<style>\n${css}</style>\n${markup}\n<script>\n${js}</script>\n`;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'pautado.html'), page);
const skel = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
fs.writeFileSync(path.join(ROOT, 'dist', 'prueba.html'), skel + page + '</body></html>');
console.log(`dist/pautado.html: ${Math.round(page.length / 1024)} KB`);
