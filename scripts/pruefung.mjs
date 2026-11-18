// Dauerhafte Prüfung des Rahmens (Karte, Datumsfreigabe, Speichern, Türchen-Rahmen, Medien, Layout).
// Aufruf: node scripts/pruefung.mjs [--base http://127.0.0.1:5173] [--nur a,c,f]
// Läuft auch gegen die veröffentlichte Seite (--base https://…). Exit-Code 1 bei Fehlern.
// Voraussetzung: installiertes Chrome und playwright-core (wie scripts/shot.mjs).
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i > -1 ? args[i + 1] : def;
};
const base = opt('base', 'http://127.0.0.1:5173').replace(/\/$/, '');
const only = opt('nur', '') ? opt('nur', '').split(',') : null;
const here = dirname(fileURLToPath(import.meta.url));
const KEY = 'laternenberg-2026-v1';
const V = 'vorschau=bergfuehrer';

const results = []; // { group, label, ok, detail }
let group = '';
function check(label, ok, detail = '') {
  results.push({ group, label, ok: !!ok, detail });
  console.log(`${ok ? 'OK    ' : 'FEHLER'} [${group}] ${label}${!ok && detail ? ' — ' + detail : ''}`);
}
const wants = (g) => !only || only.includes(g);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

/** Neuer Handy-Kontext. seed: Speicherstand vorbelegen (nur wenn noch leer). block: localStorage sperren. */
async function newCtx({ w = 390, h = 844, tz = 'Europe/Berlin', seed = null, rawSeed = null, block = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'de-DE', timezoneId: tz });
  if (seed) {
    await ctx.addInitScript(([key, value]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
      } catch { /* egal */ }
    }, [KEY, seed]);
  }
  if (rawSeed !== null) {
    await ctx.addInitScript(([key, value]) => {
      try { localStorage.setItem(key, value); } catch { /* egal */ }
    }, [KEY, rawSeed]);
  }
  if (block === 'methods') {
    await ctx.addInitScript(() => {
      const boom = () => { throw new DOMException('blockiert', 'SecurityError'); };
      for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) Storage.prototype[m] = boom;
    });
  } else if (block === 'getter') {
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blockiert', 'SecurityError'); } });
    });
  }
  return ctx;
}

/** Seite öffnen und Fehler mitschneiden. */
async function open(ctx, hash, { wait = 400 } = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.errors = errors;
  await page.goto(`${base}/#${hash}`, { waitUntil: 'load' });
  await page.waitForSelector('.lantern[data-day="24"]', { timeout: 15000, state: 'attached' }).catch(() => {});
  await page.waitForTimeout(wait);
  return page;
}

const classes = (page) => page.evaluate(() => {
  const o = {};
  for (const b of document.querySelectorAll('.lantern')) o[+b.dataset.day] = b.className;
  return o;
});
const readyDays = async (page) => {
  const c = await classes(page);
  return Object.keys(c).map(Number).filter((d) => !/\blocked\b/.test(c[d])).sort((a, b) => a - b);
};
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const fmtDays = (d) => (d.length ? (d.length === 24 ? '1–24' : d.join(',')) : 'keine');

async function dismissCover(page) {
  if (await page.locator('.cover').count()) {
    await page.locator('.cover button').first().tap();
    await page.waitForTimeout(1200);
    await page.waitForTimeout(6200); // Kamerafahrt (5,2 s nach 0,5 s) abwarten
  }
}
const doorOpen = (page) => page.locator('.door.in').count().then((n) => n > 0);

try {
  // ---------- a) Datumsfreigabe ----------
  if (wants('a')) {
    group = 'a Datum';
    {
      const ctx = await newCtx({ seed: { intro: true } });
      let page = await open(ctx, `${V}&tag=0`);
      const r = await readyDays(page);
      check('tag=0: alle 24 Laternen gesperrt', r.length === 0, 'antippbar: ' + fmtDays(r));
      const cd = await page.evaluate(() => {
        const c = document.querySelector('.countdown');
        if (!c || c.hidden) return null;
        const r = c.getBoundingClientRect();
        return { text: c.innerText, w: r.width, h: r.height };
      });
      check('tag=0: Countdown sichtbar', cd && cd.w > 50 && cd.h > 20 && /\d/.test(cd.text), cd ? cd.text : 'nicht vorhanden');
      await page.close();

      page = await open(ctx, `${V}&tag=5`);
      const r5 = await readyDays(page);
      check('tag=5: genau 1–5 antippbar, 6–24 gesperrt', same(r5, range(1, 5)), 'antippbar: ' + fmtDays(r5));
      const cdGone = await page.evaluate(() => document.querySelector('.countdown')?.hidden !== false);
      check('tag=5: Countdown ausgeblendet', cdGone);
      // gesperrte Laterne antippen: nichts öffnet, Sprechblase erscheint
      await page.locator('.lantern[data-day="9"]').tap({ timeout: 8000 });
      await page.waitForTimeout(500);
      const locked = await page.evaluate(() => ({
        door: !!document.querySelector('.door'),
        bubble: !!document.querySelector('.map-bubble.show'),
        text: document.querySelector('.map-bubble')?.innerText || '',
        opened: Object.keys(JSON.parse(localStorage.getItem('laternenberg-2026-v1') || '{}').opened || {}),
      }));
      check('tag=5: gesperrte Laterne 9 öffnet nichts', !locked.door && locked.opened.length === 0, JSON.stringify(locked));
      check('tag=5: gesperrte Laterne 9 zeigt Sprechblase', locked.bubble && locked.text.length > 5, locked.text);
      const bub = await page.evaluate(() => {
        const r = document.querySelector('.map-bubble').getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight };
      });
      check('tag=5: Sprechblase liegt vollständig im Bild', bub.l >= 0 && bub.r <= bub.w && bub.t >= 0 && bub.b <= bub.h, JSON.stringify(bub));
      await page.close();

      for (const tag of [24, 28]) {
        page = await open(ctx, `${V}&tag=${tag}`);
        const rr = await readyDays(page);
        check(`tag=${tag}: alle 24 antippbar`, rr.length === 24, 'antippbar: ' + fmtDays(rr));
        await page.close();
      }
      await ctx.close();
    }
    // Mitternacht Berliner Zeit (MEZ = UTC+1); Browser-Zeitzone Berlin und Los Angeles
    const cases = [
      ['2026-11-30T23:59:30+01:00', 0], ['2026-12-01T00:00:30+01:00', 1],
      ['2026-12-04T23:59:30+01:00', 4], ['2026-12-05T00:00:30+01:00', 5],
      ['2026-12-04T22:59:30Z', 4], ['2026-12-04T23:00:30Z', 5],
      ['2026-12-23T23:59:59+01:00', 23], ['2026-12-24T00:00:30+01:00', 24],
      ['2026-12-23T22:59:59Z', 23], ['2026-12-23T23:00:00Z', 24],
    ];
    for (const tz of ['Europe/Berlin', 'America/Los_Angeles']) {
      const ctx = await newCtx({ tz, seed: { intro: true } });
      const bad = [];
      for (const [zeit, want] of cases) {
        const page = await open(ctx, `${V}&zeit=${encodeURIComponent(zeit)}&frisch`, { wait: 150 });
        const r = await readyDays(page);
        if (!same(r, range(1, want))) bad.push(`${zeit}: erwartet ${want}, offen ${fmtDays(r)}`);
        await page.close();
      }
      check(`Mitternachtsgrenzen (${cases.length} Zeitpunkte, Browser-Zeitzone ${tz})`, bad.length === 0, bad.join(' | '));
      await ctx.close();
    }
    {
      // Echtzeit ohne Vorschau: erwartet nach der Geräteuhr
      const ctx = await newCtx({ seed: { intro: true } });
      const page = await ctx.newPage();
      await page.goto(`${base}/`, { waitUntil: 'load' });
      await page.waitForSelector('.lantern[data-day="24"]', { state: 'attached', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(500);
      const now = Date.now();
      let want = 0;
      for (let d = 1; d <= 24; d++) if (now >= Date.UTC(2026, 11, d) - 3600_000) want = d;
      const r = await readyDays(page);
      check(`Echtzeit ohne Vorschau: ${want} Laternen offen`, same(r, range(1, want)), 'antippbar: ' + fmtDays(r));
      await ctx.close();
    }
  }

  // ---------- b) Unabhängigkeit ----------
  if (wants('b')) {
    group = 'b Unabhängig';
    const ctx = await newCtx({ seed: { intro: true } });
    const page = await open(ctx, `${V}&tag=12`);
    await page.locator('.lantern[data-day="12"]').tap({ timeout: 8000 });
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({
      door: document.querySelector('.door.in')?.dataset.day,
      opened: Object.keys(JSON.parse(localStorage.getItem('laternenberg-2026-v1') || '{}').opened || {}),
    }));
    check('tag=12, leerer Speicher: Laterne 12 öffnet direkt (Türchen 12)', st.door === '12', JSON.stringify(st));
    check('Nur Türchen 12 ist als geöffnet vermerkt (1–11 nicht)', same(st.opened, ['12']), JSON.stringify(st.opened));
    await ctx.close();
  }

  // ---------- c) Öffnen und Speichern ----------
  if (wants('c')) {
    group = 'c Speichern';
    const ctx = await newCtx({ seed: { intro: true } });
    const page = await open(ctx, `${V}&tag=5`);
    const L = (d) => page.locator(`.lantern[data-day="${d}"]`);
    check('Laterne 3 anfangs „ready“', /\bready\b/.test(await L(3).getAttribute('class')));
    await L(3).tap({ timeout: 8000 });
    await page.waitForSelector('.door.in', { timeout: 5000 }).then(() => check('Antippen öffnet den Türchen-Rahmen (.door.in)', true)).catch(() => check('Antippen öffnet den Türchen-Rahmen (.door.in)', false, 'nicht erschienen'));
    await page.waitForTimeout(900);
    await page.locator('.door-close').tap({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    check('Schließen-Knopf führt zurück zur Karte', (await page.locator('.door').count()) === 0 && (await page.locator('.world').count()) === 1);
    check('Laterne 3 ist danach „lit“', /\blit\b/.test(await L(3).getAttribute('class')));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.lantern[data-day="24"]', { state: 'attached' });
    await page.waitForTimeout(500);
    check('Nach Neuladen ist Laterne 3 weiterhin „lit“', /\blit\b/.test(await L(3).getAttribute('class')));
    check('Nach Neuladen kein erneuter Begrüßungsbildschirm', (await page.locator('.cover').count()) === 0);
    await L(3).tap({ timeout: 8000 });
    await page.waitForTimeout(1200);
    check('Erneutes Antippen öffnet das Türchen wieder', await doorOpen(page));
    await ctx.close();
  }

  // ---------- d) Speicherverlust ----------
  if (wants('d')) {
    group = 'd Speicherverlust';
    {
      // Kontext ohne Vorbelegung: Begrüßung echt durchlaufen, dann Speicher leeren
      const ctx = await newCtx();
      const page = await open(ctx, `${V}&tag=5`, { wait: 500 });
      await dismissCover(page);
      await page.locator('.lantern[data-day="2"]').tap({ timeout: 8000 });
      await page.waitForTimeout(1500);
      await page.locator('.door-close').tap().catch(() => {});
      await page.waitForTimeout(900);
      check('Vorbereitung: Laterne 2 war „lit“', /\blit\b/.test(await page.locator('.lantern[data-day="2"]').getAttribute('class')));
      page.errors.length = 0;
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('.lantern[data-day="24"]', { state: 'attached' });
      await page.waitForTimeout(600);
      const r = await readyDays(page);
      const c = await classes(page);
      check('Nach localStorage.clear(): alle bis zum Datum freigegebenen Laternen antippbar', same(r, range(1, 5)), 'antippbar: ' + fmtDays(r));
      check('Nach localStorage.clear(): freigegebene Laternen sind „ready“ (keine „lit“)', range(1, 5).every((d) => /\bready\b/.test(c[d]) && !/\blit\b/.test(c[d])));
      check('Nach localStorage.clear(): Begrüßung erscheint wieder', (await page.locator('.cover').count()) === 1);
      check('Nach localStorage.clear(): keine Fehler', page.errors.length === 0, page.errors.join(' | '));
      await ctx.close();
    }
    for (const [name, raw] of [['kein JSON', 'das ist {kein json'], ['null-Felder', '{"opened":null,"done":5,"found":[],"data":"x"}'], ['Zahl statt Objekt', '42']]) {
      const ctx = await newCtx({ rawSeed: raw });
      const page = await open(ctx, `${V}&tag=5`);
      await dismissCover(page);
      await page.locator('.lantern[data-day="3"]').tap({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const opened = await doorOpen(page);
      const lit = /\blit\b/.test((await page.locator('.lantern[data-day="3"]').getAttribute('class')) || '');
      check(`Beschädigter Speicher (${name}): Seite lädt, Laterne öffnet und leuchtet`, page.errors.length === 0 && (await page.locator('.lantern').count()) === 24 && opened && lit, `door=${opened} lit=${lit} ${page.errors.join(' | ')}`);
      await ctx.close();
    }
    for (const mode of ['methods', 'getter']) {
      const ctx = await newCtx({ block: mode });
      const page = await open(ctx, `${V}&tag=5`);
      const label = mode === 'methods' ? 'Storage-Methoden werfen' : 'window.localStorage wirft';
      check(`localStorage blockiert (${label}): Seite lädt ohne Fehler`, page.errors.length === 0 && (await page.locator('.lantern').count()) === 24, page.errors.join(' | '));
      await dismissCover(page);
      check(`localStorage blockiert (${label}): Begrüßung lässt sich schließen`, (await page.locator('.cover').count()) === 0);
      await page.locator('.lantern[data-day="3"]').tap({ timeout: 8000 });
      await page.waitForTimeout(1500);
      const opened = await doorOpen(page);
      await page.locator('.door-close').tap().catch(() => {});
      await page.waitForTimeout(900);
      const lit = /\blit\b/.test(await page.locator('.lantern[data-day="3"]').getAttribute('class'));
      check(`localStorage blockiert (${label}): Laterne öffnen/schließen funktioniert`, opened && lit && page.errors.length === 0, `door=${opened} lit=${lit} ${page.errors.join(' | ')}`);
      await ctx.close();
    }
  }

  // ---------- e) Zurück-Geste ----------
  if (wants('e')) {
    group = 'e Zurück';
    {
      const ctx = await newCtx({ seed: { intro: true } });
      const page = await open(ctx, `${V}&tag=5`);
      await page.locator('.lantern[data-day="3"]').tap({ timeout: 8000 });
      await page.waitForSelector('.door.in', { timeout: 5000 }).catch(() => {});
      await page.goBack();
      await page.waitForTimeout(1000);
      check('Zurück bei offenem Türchen schließt es', (await page.locator('.door').count()) === 0);
      check('Zurück verlässt die Seite nicht', page.url().startsWith(base) && (await page.locator('.world').count()) === 1, page.url());
      check('Laterne ist nach Zurück „lit“ (Karte aktualisiert)', /\blit\b/.test(await page.locator('.lantern[data-day="3"]').getAttribute('class')));
      await ctx.close();
    }
    {
      const ctx = await newCtx({ seed: { intro: true } });
      const page = await open(ctx, `${V}&tag=24&tuer=7&frisch`, { wait: 1200 });
      const was = await doorOpen(page);
      await page.goBack();
      await page.waitForTimeout(1000);
      check('Türchen direkt per Link geöffnet: Zurück schließt es, Seite bleibt', was && (await page.locator('.door').count()) === 0 && page.url().startsWith(base), `offen=${was} url=${page.url()}`);
      await ctx.close();
    }
  }

  // ---------- f) alle 24 Türchen ----------
  if (wants('f')) {
    group = 'f Türchen';
    const ctx = await newCtx();
    const bad = [];
    for (let n = 1; n <= 24; n++) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`); });
      await page.goto(`${base}/#${V}&tag=24&tuer=${n}&frisch`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const info = await page.evaluate((day) => {
        const door = document.querySelector('.door.in');
        const stage = document.querySelector('.door-stage');
        const text = (stage?.innerText || '').replace(/\s+/g, ' ').trim();
        const hasDone = [...(stage?.querySelectorAll('button') || [])].some((b) => b.innerText.trim() === 'Fertig');
        return {
          in: !!door,
          err: !!document.querySelector('.door-error'),
          placeholder: hasDone && text.replace('Fertig', '').trim() === `Türchen ${day}`,
          empty: !stage || stage.children.length === 0,
        };
      }, n);
      const problems = [];
      if (!info.in) problems.push('Rahmen nicht geöffnet');
      if (info.err) problems.push('.door-error');
      if (info.placeholder) problems.push('Platzhalter');
      if (info.empty) problems.push('leere Bühne');
      problems.push(...errors);
      check(`Türchen ${n} lädt sauber`, problems.length === 0, problems.join(' | '));
      if (problems.length) bad.push(n);
      await page.close();
    }
    console.log(bad.length ? `       → Türchen mit Befund: ${bad.join(', ')}` : '       → alle 24 Türchen ohne Befund');
    await ctx.close();
  }

  // ---------- g) Medien ----------
  if (wants('g')) {
    group = 'g Medien';
    const webps = readdirSync(join(here, '..', 'public', 'img')).filter((f) => f.endsWith('.webp')).sort();
    const files = [
      ['/video/hasenkino.mp4', /^video\/mp4/], ['/audio/lied.mp3', /^audio\/(mpeg|mp3)/], ['/audio/bad.mp3', /^audio\/(mpeg|mp3)/],
      ['/img/wallpaper/laternenberg.jpg', /^image\/jpeg/], ['/img/wallpaper/stiefel.jpg', /^image\/jpeg/],
      ...webps.map((f) => [`/img/${f}`, /^image\/webp/]),
    ];
    const ctx = await newCtx();
    const page = await open(ctx, `${V}&tag=0&frisch`, { wait: 200 });
    const bad = [];
    for (const [url, typ] of files) {
      const res = await page.request.fetch(base + url, { method: 'HEAD' });
      const ct = res.headers()['content-type'] || '';
      if (res.status() !== 200 || !typ.test(ct)) bad.push(`${url}: ${res.status()} ${ct}`);
    }
    check(`${files.length} Mediendateien: Status 200 und passender Content-Type (${webps.length} WebP)`, bad.length === 0, bad.join(' | '));
    for (const [url, tag] of [['/video/hasenkino.mp4', 'video'], ['/audio/lied.mp3', 'audio'], ['/audio/bad.mp3', 'audio']]) {
      const r = await page.evaluate(([u, t]) => new Promise((resolve) => {
        const el = document.createElement(t);
        el.preload = 'metadata';
        el.muted = true;
        const timer = setTimeout(() => resolve({ ok: false, why: 'Zeitüberschreitung' }), 15000);
        el.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve({ ok: el.duration > 0, d: el.duration, w: el.videoWidth }); });
        el.addEventListener('error', () => { clearTimeout(timer); resolve({ ok: false, why: 'Ladefehler ' + (el.error && el.error.code) }); });
        el.src = u;
      }), [url, tag]);
      check(`${url} lädt im Browser (loadedmetadata, Dauer > 0)`, r.ok, r.why || '');
    }
    await ctx.close();
  }

  // ---------- h) Layout ----------
  if (wants('h')) {
    group = 'h Layout';
    const measure = () => {
      const world = document.querySelector('.world');
      const wr = world.getBoundingClientRect();
      const sc = document.querySelector('.world-scroll');
      const ls = [...document.querySelectorAll('.lantern')].map((b) => {
        const r = b.getBoundingClientRect();
        const tag = b.querySelector('.l-tag').getBoundingClientRect();
        return { d: +b.dataset.day, cx: r.left + r.width / 2, cy: r.top + r.height / 2, l: Math.min(r.left, tag.left), r: Math.max(r.right, tag.right) };
      });
      let min = 1e9; let pair = '';
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
        const d = Math.hypot(ls[i].cx - ls[j].cx, ls[i].cy - ls[j].cy);
        if (d < min) { min = d; pair = `${ls[i].d}/${ls[j].d}`; }
      }
      return {
        docOver: document.documentElement.scrollWidth - innerWidth,
        bodyOver: document.body.scrollWidth - innerWidth,
        scrollOver: sc.scrollWidth - sc.clientWidth,
        worldW: wr.width, vw: innerWidth,
        outside: ls.filter((x) => x.l < wr.left - 0.5 || x.r > wr.right + 0.5).map((x) => x.d),
        min, pair,
      };
    };
    for (const w of [360, 390, 430]) {
      const ctx = await newCtx({ w, seed: { intro: true } });
      const page = await open(ctx, `${V}&tag=24&frisch`);
      const m = await page.evaluate(measure);
      check(`${w} px: kein horizontales Scrollen auf der Karte`, m.docOver <= 0 && m.bodyOver <= 0 && m.scrollOver <= 0 && m.worldW <= m.vw + 0.5, JSON.stringify(m));
      check(`${w} px: alle 24 Laternen (samt Zahl) innerhalb der Weltbreite`, m.outside.length === 0, 'außerhalb: ' + m.outside.join(','));
      const mo = await page.evaluate(() => {
        const wr = document.querySelector('.world').getBoundingClientRect();
        const mr = document.querySelector('.moon').getBoundingClientRect();
        const textBox = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
        const tr = textBox(document.querySelector('.world-title p'));
        const tt = textBox(document.querySelector('.world-title h1'));
        const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return { inside: mr.left >= wr.left && mr.right <= wr.right, overTitle: hit(mr, tr) || hit(mr, tt) };
      });
      check(`${w} px: Mond liegt in der Welt und überdeckt den Titel nicht`, mo.inside && !mo.overTitle, JSON.stringify(mo));
      if (w === 360) check(`360 px: Laternen überlappen nicht (kleinster Mittelpunktabstand ${m.min.toFixed(0)} px, Paar ${m.pair}, Soll ≥ 50)`, m.min >= 50);
      await ctx.close();
    }
    // Countdown und Kaninchen dürfen die aktuelle Laterne nicht überdecken
    for (const w of [360, 390, 430]) {
      for (const tag of [0, 1, 12, 24]) {
        const ctx = await newCtx({ w, seed: { intro: true } });
        const page = await open(ctx, `${V}&tag=${tag}&frisch`, { wait: 800 });
        const o = await page.evaluate((t) => {
          const day = Math.max(1, t);
          const lr = document.querySelector(`.lantern[data-day="${day}"]`).getBoundingClientRect();
          const tg = document.querySelector(`.lantern[data-day="${day}"] .l-tag`).getBoundingClientRect();
          const box = { l: Math.min(lr.left, tg.left), r: Math.max(lr.right, tg.right), t: lr.top, b: Math.max(lr.bottom, tg.bottom) };
          const hit = (r) => r.left < box.r && r.right > box.l && r.top < box.b && r.bottom > box.t;
          const out = [];
          const cd = document.querySelector('.countdown');
          if (cd && !cd.hidden && hit(cd.getBoundingClientRect())) out.push('Countdown');
          for (const b of document.querySelectorAll('.duo-b')) if (hit(b.getBoundingClientRect())) out.push('Kaninchen');
          const wr = document.querySelector('.world').getBoundingClientRect();
          const duo = document.querySelector('.duo').getBoundingClientRect();
          if (duo.left < wr.left || duo.right > wr.right) out.push('Kaninchen außerhalb der Welt');
          return out;
        }, tag);
        check(`${w} px, tag=${tag}: nichts überdeckt Laterne ${Math.max(1, tag)}`, o.length === 0, o.join(', '));
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log('\n===== Zusammenfassung =====');
const groups = [...new Set(results.map((r) => r.group))];
for (const g of groups) {
  const rs = results.filter((r) => r.group === g);
  const bad = rs.filter((r) => !r.ok).length;
  console.log(`${bad ? 'FEHLER' : 'OK    '} ${g}: ${rs.length - bad}/${rs.length} Prüfungen bestanden`);
}
console.log(failed.length ? `\n${failed.length} von ${results.length} Prüfungen fehlgeschlagen.` : `\nAlle ${results.length} Prüfungen bestanden.`);
process.exit(failed.length ? 1 : 0);
