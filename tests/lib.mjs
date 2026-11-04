// Pautado · Utilidades de las pruebas, sin dependencias: un servidor estático en Node y Chrome sin interfaz controlado por el
// protocolo DevTools (CDP). Necesita Node 22 o posterior (fetch y WebSocket globales) y Chrome o Chromium instalado
// (variable CHROME para indicar la ruta; si no, busca google-chrome, chromium…).
// Con ARTEFACTO=1 las pruebas cargan dist/prueba.html (el archivo único de tools/artefacto.mjs) en vez de index.html.
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = process.env.CAPTURAS || path.join(os.tmpdir(), 'pautado-capturas') + path.sep;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Servidor estático ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
let server = null, base = '';
async function serve() {
  if (server) return base;
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const f = path.join(ROOT, path.normalize(u === '/' ? '/index.html' : u));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  server.unref();
  base = `http://127.0.0.1:${server.address().port}`;
  return base;
}
export async function pageURL() { const b = await serve(); return b + (process.env.ARTEFACTO ? '/dist/prueba.html' : '/index.html'); }

/* ---------- Chrome por DevTools ---------- */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const c of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']) {
    try { execFileSync('which', [c], { stdio: 'ignore' }); return c; } catch (e) { }
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(mac)) return mac;
  throw new Error('No encuentro Chrome ni Chromium: instálalo o indica la ruta en la variable CHROME');
}

// Abre un Chrome nuevo con la página de la app ya cargada y el almacenamiento vacío.
// opts: width, height, mobile (táctil), dark, scale, inject (script que corre antes que la página), keepStorage.
export async function open(opts = {}) {
  const { width = 1280, height = 900, mobile = false, dark = false, scale = 1, inject = null, keepStorage = false } = opts;
  const url = await pageURL();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pautado-chrome-'));
  const proc = spawn(findChrome(), ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let port = null; let errBuf = '';
  proc.stderr.on('data', d => { errBuf += d; const m = errBuf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) port = +m[1]; });
  for (let i = 0; i < 150 && !port; i++) await sleep(100);
  if (!port) { proc.kill('SIGKILL'); throw new Error('Chrome no arrancó'); }
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try { const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = j.find(t => t.type === 'page'); if (pg) wsUrl = pg.webSocketDebuggerUrl; } catch (e) { }
    if (!wsUrl) await sleep(100);
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = []; const external = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (!u.startsWith(base) && !/^(data|blob|about|file):/.test(u)) external.push(u); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  // recoge las violaciones de la política de seguridad (el script inyectado por CDP no está sujeto a ella)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__csp=[]; document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));` });
  if (inject) await send('Page.addScriptToEvaluateOnNewDocument', { source: inject });

  const api = {
    send, errors, external, url,
    async goto(u = url) { await send('Page.navigate', { url: u }); await api.waitReady(); },
    async reload() { await api.goto(url); },
    async waitReady() {
      for (let i = 0; i < 100; i++) { try { if (await api.eval(`document.readyState==='complete' && typeof P!=='undefined' && !!P`)) break; } catch (e) { } await sleep(50); }
      await api.eval('document.fonts.ready.then(()=>1)'); await sleep(150);
    },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description) || r.exceptionDetails.text); return r.result.value; },
    async shot(file, full = true) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      let clip;
      if (full) { const m = await send('Page.getLayoutMetrics'); clip = { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 }; }
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async mouse(type, x, y, extra = {}) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra }); },
    async click(x, y) { await api.mouse('mouseMoved', x, y, { buttons: 0 }); await api.mouse('mousePressed', x, y); await api.mouse('mouseReleased', x, y); await sleep(60); },
    async tap(x, y) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(80); },
    async key(key, o = {}) {
      const map = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Backspace: 8, Delete: 46, Enter: 13, Escape: 27, Tab: 9, Home: 36, End: 35 };
      const code = map[key] || key.toUpperCase().charCodeAt(0);
      const text = key.length === 1 ? key : (key === 'Enter' ? '\r' : undefined);
      const mods = (o.shift ? 8 : 0) | (o.ctrl ? 2 : 0) | (o.alt ? 1 : 0) | (o.meta ? 4 : 0);
      await send('Input.dispatchKeyEvent', { type: text && !o.ctrl ? 'keyDown' : 'rawKeyDown', key, windowsVirtualKeyCode: code, modifiers: mods, ...(text && !o.ctrl ? { text } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code, modifiers: mods });
      await sleep(30);
    },
    async type(text) { await send('Input.insertText', { text }); },
    async rect(sel) { return api.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};})()`); },
    async clickSel(sel) { await api.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center'})`); await sleep(50); const r = await api.rect(sel); if (!r) throw new Error('No existe ' + sel); await api.click(r.cx, r.cy); },
    // errores de consola, violaciones de la política y peticiones a otros sitios
    async problems() { let csp = []; try { csp = await api.eval('window.__csp||[]'); } catch (e) { } return [...errors, ...csp.map(c => 'CSP: ' + c), ...external.map(u => 'Petición externa: ' + u)]; },
    async close() { try { ws.close(); } catch (e) { } proc.kill('SIGKILL'); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { } },
    sleep,
  };
  await api.goto(url);
  if (!keepStorage) { await api.eval('localStorage.clear(); sessionStorage.clear()'); await api.goto(url); }
  return api;
}

/* ---------- Comprobaciones ---------- */
let oks = 0, fails = 0; const pages = new Set();
export function ok(cond, msg, extra) {
  if (cond) { oks++; return; }
  fails++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra) : '');
}
// Ejecuta una parte de la suite con su propia página: comprueba al final que no hubo errores ni peticiones externas.
export async function part(name, opts, fn) {
  let b;
  try {
    b = await open(opts); pages.add(b);
    await fn(b, s => b.eval(s));
    const pr = await b.problems();
    ok(pr.length === 0, `${name}: sin errores de consola, violaciones de la política ni peticiones externas`, pr.slice(0, 6));
  } catch (e) { fails++; console.log(`  ✗ ${name}: ${e.message}`); if (b) console.log('    ', (await b.problems().catch(() => [])).slice(0, 4)); }
  finally { if (b) { await b.close(); pages.delete(b); } }
}
export function done(suite) {
  console.log(`${suite}: ${oks} correctas, ${fails} fallos`);
  process.exitCode = fails ? 1 : 0;
}
