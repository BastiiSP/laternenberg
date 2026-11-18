// Liedtext zu „24 Laternen" (Text: für Melli geschrieben; Musik und Gesang: Suno).
// Format: zeilen = [{ t: Sekunden, text }]. Eine Zeile mit text: '' ist eine Strophenpause.
// Fehlt bei einer Zeile `t`, zeigt der Abspieler den Text nur zum Lesen (ohne Mitlaufen).
// Die Zeiten stammen aus einer Transkription der Aufnahme (Gesang 12–141 s, Länge 157 s).
export const LIED = {
  titel: '24 Laternen',
  src: '/audio/lied.mp3',
  zeilen: [
    { t: 12.3, text: 'Im Tal ist es still, der Schnee fällt sacht,' },
    { t: 17.5, text: 'ein Berg schläft tief in der Dezembernacht.' },
    { t: 21.7, text: 'Da kommst du den Weg herauf, Schritt für Schritt,' },
    { t: 26.4, text: 'und bringst ganz nebenbei das Leuchten mit.' },
    { t: 29.6, text: '' },
    { t: 30.9, text: 'Vierundzwanzig Laternen, eine für jeden Tag,' },
    { t: 35.7, text: 'vierundzwanzig kleine Lichter, weil ich dich so mag.' }, // BASTI-STIMME
    { t: 40.6, text: 'Vom Tal bis zum Gipfel, durch Wald und über Stein –' },
    { t: 45.1, text: 'wo du bist, wird es hell. So soll es sein.' },
    { t: 50.4, text: '' },
    { t: 52.9, text: 'Zwei Kaninchen warten schon am Wegesrand,' },
    { t: 57.5, text: 'die eine redet viel, der andre futtert Proviant.' },
    { t: 62.4, text: 'Du hast Chalk an den Fingern und Tee im Gepäck' },
    { t: 67.3, text: 'und findest an jedem Felsen deinen Weg.' },
    { t: 70.5, text: '' },
    { t: 71.1, text: 'Vierundzwanzig Laternen, eine für jeden Tag,' },
    { t: 75.8, text: 'vierundzwanzig kleine Lichter, weil ich dich so mag.' }, // BASTI-STIMME
    { t: 80.7, text: 'Vom Tal bis zum Gipfel, durch Wald und über Stein –' },
    { t: 85.3, text: 'wo du bist, wird es hell. So soll es sein.' },
    { t: 91.4, text: '' },
    { t: 93.9, text: 'Kerzen im Fenster, Dampf überm Bad,' },
    { t: 98.3, text: 'ein Stern fällt leise über den Grat.' },
    { t: 103.1, text: 'Der Mond wird rund, die Nacht wird klar –' },
    { t: 107.9, text: 'schön, dass es dich gibt. Wirklich wahr.' }, // BASTI-STIMME
    { t: 111.2, text: '' },
    { t: 113.7, text: 'Vierundzwanzig Laternen, und bald brennen sie all,' },
    { t: 118.8, text: 'ein Berg voller Lichter, vom Gipfel bis ins Tal.' },
    { t: 123.8, text: 'Das war der Aufstieg – und weißt du, was ich seh?' }, // BASTI-STIMME
    { t: 128.2, text: 'Alles ab hier ist Aussicht und Lichter im Schnee.' },
    { t: 136.2, text: '' },
    { t: 138.7, text: 'Frohe Weihnachten, Melli.' },
  ],
};
