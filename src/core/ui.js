// Kleine Bausteine für Oberfläche und Text.
import { sfx } from './audio.js';
import { wait, reducedMotion } from './fx.js';

/** DOM-Helfer: h('div', { class: 'x', onclick: fn }, 'Text', kind) */
export function h(tag, attrs = {}, ...children) {
  const svgTags = ['svg', 'path', 'circle', 'ellipse', 'g', 'rect', 'line', 'polygon', 'polyline', 'defs', 'linearGradient', 'radialGradient', 'stop', 'text', 'use', 'mask', 'clipPath', 'filter', 'feGaussianBlur'];
  const el = svgTags.includes(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Baut ein Element aus einem HTML-String. */
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

/** Knopf im Stil des Bergs. variant: '' | 'ghost' | 'small' */
export function button(label, onTap, { variant = '', sound = 'tap' } = {}) {
  const b = h('button', { class: `btn ${variant}`.trim(), type: 'button' }, label);
  b.addEventListener('click', (e) => {
    if (sound) sfx.play(sound);
    onTap?.(e);
  });
  return b;
}

/** Text tippt sich Buchstabe für Buchstabe. Tippen auf den Text zeigt ihn sofort ganz. */
export function typewriter(el, text, { speed = 28 } = {}) {
  return new Promise((resolve) => {
    if (reducedMotion()) {
      el.textContent = text;
      resolve();
      return;
    }
    let i = 0;
    let done = false;
    el.textContent = '';
    el.classList.add('typing');
    const finish = () => {
      if (done) return;
      done = true;
      el.textContent = text;
      el.classList.remove('typing');
      el.removeEventListener('click', finish);
      resolve();
    };
    el.addEventListener('click', finish);
    const step = () => {
      if (done) return;
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) return finish();
      const ch = text[i - 1];
      setTimeout(step, /[.!?…]/.test(ch) ? speed * 9 : /[,;:–]/.test(ch) ? speed * 4 : speed);
    };
    step();
  });
}

let toastEl = null;
let toastTimer = null;
/** Kurze Meldung am unteren Rand. */
export function toast(text, { ms = 2600 } = {}) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status' });
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/** Blendet Kinder eines Elements nacheinander ein (Klasse .reveal → .in). */
export async function revealSeq(els, { gap = 160 } = {}) {
  for (const el of els) {
    el.classList.add('reveal');
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('in');
    await wait(reducedMotion() ? 0 : gap);
  }
}

/** Leichtes Vibrieren, wo unterstützt (Android). */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nicht verfügbar */
  }
}

/** Bild vorladen. Löst auch bei Fehler auf (dann mit null). */
export function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Pfad zu einem Bild in public/img (WebP). */
export const img = (name) => `/img/${name}.webp`;
