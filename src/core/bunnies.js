// Lorelai (schwarz) und Logan (hellgrau, weißes Schwänzchen) als gezeichnete SVG-Figuren.
// Überall dieselben zwei – auf der Karte und in den Türchen.
import { html } from './ui.js';

const LOOKS = {
  lorelai: { fur: '#23202b', shade: '#15131b', light: '#3a3645', ear: '#6b4a57', tail: '#2c2935', eye: '#0b0a10', ring: '#4a4556', nose: '#c98a96', rim: 'rgba(176,170,214,.75)' },
  logan: { fur: '#c9cdd9', shade: '#a9aebd', light: '#e6e9f1', ear: '#eab9c2', tail: '#ffffff', eye: '#2a2530', ring: '#dfe2ea', nose: '#e79aa6', rim: 'rgba(255,255,255,.0)' },
};

export const NAMES = { lorelai: 'Lorelai', logan: 'Logan' };

/**
 * Sitzendes Kaninchen von der Seite. who: 'lorelai' | 'logan'.
 * flip: true = schaut nach links. Klassen für Animation: .bunny, .b-ear, .b-eye, .b-body, .b-tail
 */
export function bunny(who = 'lorelai', { size = 64, flip = false, sleeping = false } = {}) {
  const c = LOOKS[who] || LOOKS.lorelai;
  const eye = sleeping
    ? `<path class="b-eye" d="M87 47 q5 4 10 0" fill="none" stroke="${who === 'lorelai' ? '#8d8799' : c.eye}" stroke-width="2.2" stroke-linecap="round"/>`
    : `<g class="b-eye"><circle cx="92" cy="46" r="5" fill="${c.ring}"/><circle cx="92" cy="46" r="3.9" fill="${c.eye}"/><circle cx="93.4" cy="44.6" r="1.4" fill="#fff"/></g>`;
  const el = html(`
<svg class="bunny bunny-${who}${flip ? ' flip' : ''}${sleeping ? ' asleep' : ''}" viewBox="0 0 124 112" width="${size}" height="${Math.round(size * 0.9)}" role="img" aria-label="${NAMES[who]}">
  <ellipse cx="60" cy="106" rx="42" ry="5" fill="rgba(10,14,40,.28)"/>
  <circle class="b-tail" cx="20" cy="80" r="11.5" fill="${c.tail}"/>
  <g class="b-body">
    <ellipse cx="55" cy="75" rx="37" ry="30" fill="${c.fur}" stroke="${c.rim}" stroke-width="1.6"/>
    <ellipse cx="50" cy="84" rx="26" ry="18" fill="${c.shade}" opacity=".45"/>
    <ellipse cx="62" cy="100" rx="21" ry="7.5" fill="${c.light}"/>
    <ellipse cx="88" cy="99" rx="9" ry="5.5" fill="${c.light}"/>
  </g>
  <g class="b-head">
    <g class="b-ear b-ear-back"><ellipse cx="74" cy="21" rx="7.5" ry="16" transform="rotate(-14 74 21)" fill="${c.shade}"/></g>
    <circle cx="85" cy="49" r="23" fill="${c.fur}" stroke="${c.rim}" stroke-width="1.6"/>
    <g class="b-ear b-ear-front">
      <ellipse cx="90" cy="19" rx="8" ry="17" transform="rotate(9 90 19)" fill="${c.fur}" stroke="${c.rim}" stroke-width="1.4"/>
      <ellipse cx="90.5" cy="20" rx="3.8" ry="11.5" transform="rotate(9 90 19)" fill="${c.ear}"/>
    </g>
    <circle cx="97" cy="57" r="9.5" fill="${c.light}" opacity=".5"/>
    ${eye}
    <ellipse cx="107" cy="53" rx="2.6" ry="2" fill="${c.nose}"/>
    <path d="M105 58 q3 3 5 0" fill="none" stroke="${who === 'lorelai' ? '#7b7388' : '#8d8794'}" stroke-width="1.4" stroke-linecap="round"/>
  </g>
</svg>`);
  return el;
}

/** Kaninchengesicht von vorn – für Sprechblasen und Dialoge. */
export function bunnyFace(who = 'lorelai', { size = 56 } = {}) {
  const c = LOOKS[who] || LOOKS.lorelai;
  return html(`
<svg class="bunny-face bunny-${who}" viewBox="0 0 100 110" width="${size}" height="${Math.round(size * 1.1)}" role="img" aria-label="${NAMES[who]}">
  <g class="b-ear"><ellipse cx="34" cy="26" rx="10" ry="23" transform="rotate(-10 34 26)" fill="${c.fur}"/><ellipse cx="34.5" cy="28" rx="4.6" ry="15" transform="rotate(-10 34 26)" fill="${c.ear}"/></g>
  <g class="b-ear"><ellipse cx="66" cy="26" rx="10" ry="23" transform="rotate(10 66 26)" fill="${c.fur}"/><ellipse cx="65.5" cy="28" rx="4.6" ry="15" transform="rotate(10 66 26)" fill="${c.ear}"/></g>
  <ellipse cx="50" cy="70" rx="36" ry="32" fill="${c.fur}" stroke="${c.rim}" stroke-width="1.6"/>
  <ellipse cx="38" cy="80" rx="13" ry="10" fill="${c.light}" opacity=".55"/>
  <ellipse cx="62" cy="80" rx="13" ry="10" fill="${c.light}" opacity=".55"/>
  <g class="b-eye"><circle cx="35" cy="64" r="6" fill="${c.ring}"/><circle cx="35" cy="64" r="4.8" fill="${c.eye}"/><circle cx="36.6" cy="62.4" r="1.7" fill="#fff"/></g>
  <g class="b-eye"><circle cx="65" cy="64" r="6" fill="${c.ring}"/><circle cx="65" cy="64" r="4.8" fill="${c.eye}"/><circle cx="66.6" cy="62.4" r="1.7" fill="#fff"/></g>
  <ellipse cx="50" cy="75" rx="4" ry="3" fill="${c.nose}"/>
  <path d="M50 78 v4 M50 82 q-5 5 -9 1 M50 82 q5 5 9 1" fill="none" stroke="${who === 'lorelai' ? '#8a8296' : '#8d8794'}" stroke-width="1.6" stroke-linecap="round"/>
</svg>`);
}

/**
 * Ein Glimmling: kleiner Lichtgeist, der in den Laternen wohnt.
 * mood: 'happy' | 'sleepy' | 'wow'
 */
export function glimmling({ size = 34, mood = 'happy' } = {}) {
  const eyes = mood === 'sleepy'
    ? '<path d="M17 27 q3 2.5 6 0 M29 27 q3 2.5 6 0" fill="none" stroke="#7a4a1c" stroke-width="2" stroke-linecap="round"/>'
    : `<circle cx="20" cy="27" r="${mood === 'wow' ? 3.2 : 2.5}" fill="#7a4a1c"/><circle cx="32" cy="27" r="${mood === 'wow' ? 3.2 : 2.5}" fill="#7a4a1c"/>`;
  const mouth = mood === 'wow' ? '<ellipse cx="26" cy="34" rx="2.2" ry="2.8" fill="#b9682a"/>' : '<path d="M22.5 33 q3.5 3.5 7 0" fill="none" stroke="#b9682a" stroke-width="1.8" stroke-linecap="round"/>';
  return html(`
<svg class="glimmling" viewBox="0 0 52 56" width="${size}" height="${Math.round(size * 1.08)}" role="img" aria-label="Glimmling">
  <defs>
    <radialGradient id="glg" cx="50%" cy="55%" r="55%">
      <stop offset="0" stop-color="#fffbe6"/><stop offset=".55" stop-color="#ffe19a"/><stop offset="1" stop-color="#ffb65a"/>
    </radialGradient>
  </defs>
  <circle cx="26" cy="30" r="25" fill="rgba(255,200,110,.22)"/>
  <path class="g-tuft" d="M26 2 C31 9 33 12 30 17 C28 13 24 13 22 17 C19 11 22 8 26 2 Z" fill="#ffcf7a"/>
  <ellipse cx="26" cy="31" rx="17" ry="16" fill="url(#glg)"/>
  ${eyes}${mouth}
  <ellipse cx="15.5" cy="32" rx="2.6" ry="1.6" fill="#ff9d6b" opacity=".55"/><ellipse cx="36.5" cy="32" rx="2.6" ry="1.6" fill="#ff9d6b" opacity=".55"/>
</svg>`);
}
