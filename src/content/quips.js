// Was Lorelai und Logan sagen, wenn man sie antippt. Reine Fantasie-Kaninchen:
// die Märchenversionen, die auf dem Laternenberg wohnen.
export const QUIPS = [
  ['lorelai', 'Kaffee. Erst Kaffee. Dann rede ich mit dir. Vielleicht.'],
  ['logan', 'Ich hab die Laterne nicht angeknabbert. Die war schon so.'],
  ['lorelai', 'Wetterbericht: Schnee, Nebel, akuter Kaffeemangel. Letzteres ist der eigentliche Notfall.'],
  ['logan', 'Mein Schwänzchen ist nicht „niedlich“. Es ist aerodynamisch.'],
  ['lorelai', 'Wir haben fünf Minuten auf dich gewartet. In Kaninchenzeit sind das drei Staffeln.'],
  ['logan', 'Plan für heute: hoppeln, snacken, Nickerchen. In beliebiger Reihenfolge.'],
  ['lorelai', 'Wenn ich schneller rede, wird mir wärmer. Das ist Physik.'],
  ['logan', 'Ich wollte den Berg ja hochtragen. Lorelai meinte, das sei „unrealistisch“.'],
  ['lorelai', 'Oben am Gipfel gibt es Tee. Sag ich jetzt einfach mal so.'],
  ['logan', 'Hast du Chalk dabei? Nein? Egal, wir haben Schnee. Fast dasselbe.'],
  ['lorelai', 'Das ist kein Umweg. Das ist eine landschaftlich wertvolle Variante.'],
  ['logan', 'Ich schlafe nicht. Ich lese Beta. Mit geschlossenen Augen.'],
  ['lorelai', 'Basti hat gesagt, wir sollen dich schön grüßen. Schön gegrüßt!'],
  ['logan', 'Eine Möhre am Tag. Mindestens. Ich mache die Regeln nicht.'],
  ['lorelai', 'Ich hab schon wieder ein Türchen gesehen, das ich dir nicht verraten darf. Es ist gut.'],
  ['logan', 'Mein Plan für den Abend: erst snacken, dann nachdenken. Meistens bleibt es beim Snacken.'],
  ['lorelai', 'Tipp: Tipp ruhig mal auf Dinge. Der Berg mag das.'],
  ['logan', 'Irgendwo hier versteckt sich jeden Tag ein Glimmling. Ich sag nicht, wo. Ich weiß es nämlich nicht.'],
  ['lorelai', 'Wir waren nicht eingeschlafen. Wir haben die Laterne bewacht. Von innen. Mit den Augenlidern.'],
  ['logan', 'Könnte dieser Abend noch gemütlicher sein? Ich frage für ein Kaninchen.'],
  ['lorelai', 'Schnee ist nur Regen, der sich Mühe gibt.'],
  ['logan', 'Ich hab den Weg freigehoppelt. Bitte, gern geschehen.'],
  ['lorelai', 'Noch ein paar Laternen und man sieht uns vom Mond aus.'],
  ['logan', 'Ich wollte nur kurz um die Ecke hoppeln. Das war vor zwei Möhren und einem Nickerchen.'],
];

export const LOCKED_LINES = [
  (n) => (n === 1 ? 'Morgen. Versprochen. Heute Nacht um zwölf.' : `Noch ${n}× schlafen. Die Laterne übt noch.`),
  (n) => (n === 1 ? 'Fast! Nur noch einmal schlafen.' : `Geduld. Noch ${n} Nächte.`),
  (n) => (n === 1 ? 'Die ist morgen dran. Nicht schummeln!' : `Erst in ${n} Tagen. Auch Laternen haben Dienstpläne.`),
];

export const GLIMM_LINES = [
  'Gefunden! Ich war so gut versteckt. Fand ich.',
  'Huch! Du hast aber gute Augen.',
  'Pssst. Morgen verstecke ich mich woanders.',
  'Erwischt! Ich leuchte halt zu gern.',
  'Na endlich. Mir wurde schon kalt ums Flämmchen.',
  'Du schon wieder! Schön.',
  'Ich bin gar nicht hier. Ich bin ein sehr kleiner Mond.',
];
