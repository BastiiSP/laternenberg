// Zeit und Freigabe. Türchen n öffnet am n. Dezember 2026 um 0:00 Uhr in Europe/Berlin
// (im Dezember immer MEZ = UTC+1) und bleibt danach für immer offen.

const YEAR = 2026;
const HOUR = 3600_000;
const PREVIEW_KEY = 'bergfuehrer';

// Serverzeit: letzter erfolgreicher Abgleich, danach monoton mit performance.now() fortgeschrieben.
// Eine später verstellte Geräteuhr ändert damit nichts mehr. Ohne Abgleich gilt die Geräteuhr.
let anchor = null; // { server: ms (Serverzeit), perf: performance.now() zum selben Zeitpunkt }
let syncing = null;
let previewAt = null; // fester Zeitpunkt in der Vorschau
export const preview = { active: false, door: null, fresh: false, reset: false };

export function unlockAt(day) {
  return Date.UTC(YEAR, 11, day) - HOUR;
}

function readPreview() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return;
  const p = new URLSearchParams(raw);
  if (p.get('vorschau') !== PREVIEW_KEY) return;
  preview.active = true;
  const warn = (name) => console.warn(`Vorschau: Parameter „${name}“ ungültig und ignoriert.`);
  if (p.has('tag')) {
    const d = Math.max(0, Math.min(31, parseInt(p.get('tag'), 10) || 0));
    previewAt = d === 0 ? Date.UTC(YEAR, 10, 20, 9) : unlockAt(d) + 10 * HOUR;
    if (p.has('stunde')) previewAt = unlockAt(Math.max(1, d)) + (parseFloat(p.get('stunde')) || 0) * HOUR;
  }
  if (p.has('zeit')) {
    // In URLs wird ein unkodiertes „+“ zum Leerzeichen: für den Offset (+01:00) zurückdeuten.
    const t = Date.parse(p.get('zeit').trim().replace(/ /g, '+'));
    if (!Number.isNaN(t)) previewAt = t;
    else warn('zeit');
  }
  if (p.has('tuer')) {
    const n = parseInt(p.get('tuer'), 10);
    if (n >= 1 && n <= 24) preview.door = n;
    else warn('tuer');
  }
  preview.fresh = p.has('frisch');
  // Speicherstand dieses Geräts löschen (Laternen, Geheimnisse, Glimmlinge).
  preview.reset = p.has('zuruecksetzen');
}
readPreview();

/**
 * Gleicht die Zeit mit dem Server ab. Jede erfolgreiche Messung wird übernommen.
 * Gibt true zurück, wenn ein neuer Abgleich gelang (dann ggf. die Karte aktualisieren).
 */
export function syncTime() {
  if (previewAt != null) return Promise.resolve(false);
  if (syncing) return syncing;
  const run = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const p0 = performance.now();
      const res = await fetch('/api/zeit', { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) return false;
      const data = await res.json();
      const p1 = performance.now();
      if (typeof data.now !== 'number' || !Number.isFinite(data.now)) return false;
      // Die Serverzeit gilt etwa in der Mitte der Anfrage.
      anchor = { server: data.now, perf: (p0 + p1) / 2 };
      return true;
    } catch {
      return false; // offline oder lokal: bisherigen Abgleich bzw. Geräteuhr behalten
    } finally {
      clearTimeout(timer);
    }
  };
  syncing = run().finally(() => { syncing = null; });
  return syncing;
}

export function nowMs() {
  if (previewAt != null) return previewAt;
  return anchor ? anchor.server + (performance.now() - anchor.perf) : Date.now();
}

/** Höchstes freigeschaltetes Türchen (0 = noch keins, 24 = alle). */
export function unlockedDay() {
  const t = nowMs();
  let n = 0;
  for (let d = 1; d <= 24; d++) if (t >= unlockAt(d)) n = d;
  return n;
}

export function isUnlocked(day) {
  return nowMs() >= unlockAt(day);
}

/** Wie viele Nächte noch bis Türchen `day` (mindestens 1, wenn noch gesperrt). */
export function sleepsUntil(day) {
  const ms = unlockAt(day) - nowMs();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * HOUR));
}

export function msUntil(day) {
  return unlockAt(day) - nowMs();
}

const fmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', weekday: 'long', hour12: false,
});

/** Datumsteile in Berliner Zeit. */
export function berlin(ms = nowMs()) {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour % 24, minute: +parts.minute, weekday: parts.weekday,
  };
}

/** Tag im Dezember 2026 (1–31) oder 0 davor bzw. 32 danach. */
export function decemberDay() {
  const b = berlin();
  if (b.year < YEAR || (b.year === YEAR && b.month < 12)) return 0;
  if (b.year > YEAR) return 32;
  return b.day;
}

/** Mondphase als Näherung (mittlerer Mondzyklus): age in Tagen, illum 0..1, waxing true/false. */
export function moon(ms = nowMs()) {
  const syn = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
  const age = (((ms / 864e5 - ref) % syn) + syn) % syn;
  const illum = (1 - Math.cos((2 * Math.PI * age) / syn)) / 2;
  let name = 'Neumond';
  if (illum > 0.985) name = 'Vollmond';
  else if (illum > 0.03) {
    const waxing = age < syn / 2;
    if (Math.abs(illum - 0.5) < 0.06) name = waxing ? 'Halbmond (zunehmend)' : 'Halbmond (abnehmend)';
    else name = waxing ? 'Zunehmender Mond' : 'Abnehmender Mond';
  }
  return { age, illum, waxing: age < syn / 2, name };
}
