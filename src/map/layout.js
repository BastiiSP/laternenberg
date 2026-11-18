// Geografie des Laternenbergs. Vier gemalte Abschnitte (je 2:3) liegen übereinander:
// 4 = Gipfel (oben) … 1 = Tal (unten). Koordinaten: s = Abschnitt, x/y = 0..1 im Bild.
export const SEC_H = 1.5; // Höhe eines Abschnitts in Einheiten der Weltbreite
export const OVERLAP = 0.15; // Überlappung benachbarter Abschnitte
export const FOOT = 0.4; // Schneefeld unter dem Tal
export const WORLD_H = 4 * SEC_H - 3 * OVERLAP + FOOT;

export const secTop = (s) => (4 - s) * (SEC_H - OVERLAP);

/** Weltposition in Prozent. */
export function place(s, x, y) {
  return { left: x * 100, top: ((secTop(s) + y * SEC_H) / WORLD_H) * 100 };
}

export const SECTIONS = [
  { s: 4, img: 'map-4-gipfel', name: 'Gipfel', days: [21, 24] },
  { s: 3, img: 'map-3-fels', name: 'Fels', days: [14, 20] },
  { s: 2, img: 'map-2-wald', name: 'Wald', days: [7, 13] },
  { s: 1, img: 'map-1-tal', name: 'Tal', days: [1, 6] },
];

// Laternen entlang des gemalten Wegs, vom Tal zum Gipfel.
export const LANTERNS = [
  null,
  { s: 1, x: 0.4, y: 0.885 },
  { s: 1, x: 0.67, y: 0.66 },
  { s: 1, x: 0.47, y: 0.525 },
  { s: 1, x: 0.6, y: 0.415 },
  { s: 1, x: 0.44, y: 0.3 },
  { s: 1, x: 0.57, y: 0.15 },
  { s: 2, x: 0.48, y: 0.915 },
  { s: 2, x: 0.56, y: 0.79 },
  { s: 2, x: 0.44, y: 0.67 },
  { s: 2, x: 0.66, y: 0.555 },
  { s: 2, x: 0.55, y: 0.43 },
  { s: 2, x: 0.42, y: 0.305 },
  { s: 2, x: 0.5, y: 0.165 },
  { s: 3, x: 0.44, y: 0.905 },
  { s: 3, x: 0.56, y: 0.8 },
  { s: 3, x: 0.39, y: 0.685 },
  { s: 3, x: 0.47, y: 0.565 },
  { s: 3, x: 0.36, y: 0.46 },
  { s: 3, x: 0.5, y: 0.335 },
  { s: 3, x: 0.54, y: 0.19 },
  { s: 4, x: 0.4, y: 0.905 },
  { s: 4, x: 0.6, y: 0.8 },
  { s: 4, x: 0.49, y: 0.69 },
  { s: 4, x: 0.62, y: 0.565 },
];

// Wo Lorelai und Logan neben der Laterne des Tages sitzen: [Versatz x, Versatz y] in Abschnittseinheiten.
// Je Tag so gewählt (bei 360 px Breite geprüft), dass sie weder die nächste Laterne noch ein Geheimnis
// überdecken und innerhalb der Weltbreite bleiben.
export const DUO_OFFSETS = [
  null,
  [0.2, 0.004], [-0.2, 0.025], [-0.2, 0.095], [0.2, 0.004], [0.2, 0.004], [0.2, 0.004],
  [-0.2, 0.004], [0.2, 0.004], [-0.2, 0.004], [0.2, 0.004], [0.2, 0.004], [0.2, 0.004],
  [0.2, 0.004], [-0.2, 0.004], [0.2, 0.004], [-0.2, 0.004], [0.2, 0.004], [-0.2, 0.004],
  [-0.2, 0.004], [-0.2, 0.004], [-0.2, 0.004], [0.2, 0.004], [-0.2, 0.004], [-0.2, 0.004],
];

// Verstecke für den Glimmling des Tages.
export const GLIMM_SPOTS = [
  { s: 1, x: 0.12, y: 0.655 }, { s: 1, x: 0.86, y: 0.555 }, { s: 1, x: 0.22, y: 0.2 }, { s: 1, x: 0.78, y: 0.3 }, { s: 1, x: 0.58, y: 0.79 },
  { s: 2, x: 0.3, y: 0.535 }, { s: 2, x: 0.19, y: 0.31 }, { s: 2, x: 0.84, y: 0.2 }, { s: 2, x: 0.2, y: 0.86 }, { s: 2, x: 0.8, y: 0.72 },
  { s: 3, x: 0.31, y: 0.1 }, { s: 3, x: 0.72, y: 0.4 }, { s: 3, x: 0.1, y: 0.4 }, { s: 3, x: 0.8, y: 0.64 }, { s: 3, x: 0.2, y: 0.28 },
  { s: 4, x: 0.16, y: 0.5 }, { s: 4, x: 0.82, y: 0.62 }, { s: 4, x: 0.3, y: 0.78 }, { s: 4, x: 0.76, y: 0.9 },
];

// Feste Geheimnisse auf der Karte.
export const SECRETS = [
  { id: 'teestube', s: 1, x: 0.83, y: 0.585, name: 'Die Teestube', hint: 'Im Tal duftet es irgendwo nach Zimt.', say: 'Die Teestube. Riecht bis hierher nach Zimt und frisch aufgegossenem Tee.', fx: 'steam' },
  { id: 'bach', s: 1, x: 0.76, y: 0.735, name: 'Der Bach', hint: 'Wasser, das nicht zufriert, hat etwas zu erzählen.', say: 'Platsch. Der Bach friert nie ganz zu – er hat es zu eilig.', fx: 'ripple' },
  { id: 'schornstein', s: 1, x: 0.205, y: 0.495, name: 'Der Schornstein', hint: 'Wo Rauch ist, ist auch ein warmes Sofa.', say: 'Im Tal wird schon geheizt. Irgendwo da drin steht ein Sofa mit deinem Namen.', fx: 'steam' },
  { id: 'teich', s: 2, x: 0.37, y: 0.545, name: 'Der Waldteich', hint: 'Mitten im Wald liegt ein Spiegel aus Eis.', say: 'Knack! – Keine Sorge, der Teich hält. Logan hat es getestet. Unfreiwillig.', fx: 'crack' },
  { id: 'eule', s: 2, x: 0.115, y: 0.415, name: 'Die Eule', hint: 'Zwischen den Stämmen blinzelt jemand.', say: 'Hu-huu. Die Eule findet, du bist spät dran. Das findet sie bei allen.', fx: 'owl' },
  { id: 'huette', s: 3, x: 0.775, y: 0.265, name: 'Die Boulderhütte', hint: 'Am Fels brennt noch Licht.', say: 'Die Boulderhütte. Chalk ist alle, Tee ist da. Prioritäten.', fx: 'window' },
  { id: 'block', s: 3, x: 0.7, y: 0.415, name: 'Der große Block', hint: 'Ein Felsen, an dem schon viele Fingerkuppen hingen.', say: 'Dieser Block hat 14 Linien. Lorelai sagt 15. Die 15. ist einfach außen herumlaufen.', fx: 'chalk' },
  { id: 'polarlicht', s: 4, x: 0.3, y: 0.2, name: 'Das Polarlicht', hint: 'Ganz oben tanzt etwas am Himmel.', say: 'Polarlicht. Der Berg gibt ein bisschen an – extra für dich.', fx: 'aurora' },
  { id: 'mond', s: 4, x: 0.82, y: 0.28, name: 'Der Mond', hint: 'Er nimmt zu, er nimmt ab – und er ist echt.', say: '', fx: 'moon' },
];
