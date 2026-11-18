// Bildschirmfoto in Handygröße mit dem installierten Chrome (ohne Fenster).
// Aufruf: node scripts/shot.mjs <ausgabe.png> [--hash "vorschau=bergfuehrer&tag=5&tuer=5&frisch"] [--wait 1500]
//         [--js "Ausdruck, der vor dem Foto im Browser läuft"] [--tap "x,y;x,y"] [--full] [--base http://127.0.0.1:5173]
//         [--w 390 --h 844] [--dpr 2]  (Standard dpr 1: kleine, sparsame Bilder)
// Für komplexere Abläufe: dieses Skript als Vorlage kopieren (playwright-core, channel 'chrome').
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const out = args[0] || 'shot.png';
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i > -1 ? args[i + 1] : def;
};
const base = opt('base', 'http://127.0.0.1:5173');
const hash = opt('hash', 'vorschau=bergfuehrer&tag=24&frisch');
const waitMs = +opt('wait', 1500);
const w = +opt('w', 390);
const hgt = +opt('h', 844);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: +opt('dpr', 1), hasTouch: true, isMobile: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
page.on('requestfailed', (r) => errors.push('REQFAILED ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
await page.goto(`${base}/#${hash}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(waitMs);
const taps = opt('tap', '');
for (const t of taps.split(';').filter(Boolean)) {
  const [x, y] = t.split(',').map(Number);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(+opt('tapwait', 700));
}
const js = opt('js', '');
if (js) {
  const r = await page.evaluate(js);
  if (r !== undefined) console.log('JS →', JSON.stringify(r));
  await page.waitForTimeout(+opt('jswait', 600));
}
await page.screenshot({ path: out, fullPage: args.includes('--full') });
if (errors.length) console.log(errors.join('\n'));
console.log('OK', out);
await browser.close();
