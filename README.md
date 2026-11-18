# Der Laternenberg

Ein Adventskalender als begehbare Winterkarte. Zwei Zwergkaninchen begleiten den Aufstieg vom Tal bis zum Gipfel. Unterwegs wird jede der 24 Laternen zu einem eigenen Türchen. Wer die Karte auf dem Handy öffnet, kann zum Beispiel eine Boulderroute lösen, eine Spieluhr anstoßen oder eine Schneekugel schütteln.

**Zum Ausprobieren:** [Am Fels einsteigen (Türchen 5)](https://laternenberg.vercel.app/#vorschau=bergfuehrer&tag=5&tuer=5&frisch) · [Die ganze Karte erkunden](https://laternenberg.vercel.app/#vorschau=bergfuehrer&tag=24&frisch) · [Kalender mit heutigem Datum öffnen](https://laternenberg.vercel.app)

![Zwei Kaninchen im Licht einer Laterne](public/img/og.jpg)

## Wie der Kalender funktioniert

- Vom 1. bis zum 24. Dezember 2026 öffnet sich um Mitternacht deutscher Zeit jeweils eine weitere Laterne. Frühere Türchen bleiben zugänglich. Wer einige Tage aussetzt, kann überall wieder einsteigen.
- Der Browser merkt sich geöffnete Laternen, Funde und Spielfortschritte auf dem Gerät. Ist der Speicher gesperrt, funktioniert der Kalender für die laufende Sitzung weiter. Die beiden Vorschau-Links oben verwenden einen flüchtigen Spielstand.
- Jedes Türchen hat sein eigenes JavaScript-Modul. Die Karte lädt es beim Öffnen. Unter den 24 Erlebnissen sind ein Boulderspiel mit berechneten Lösungshilfen, eine interaktive 3D-Schneekugel, ein vertontes Lied mit mitlaufendem Text und ein kurzer Hochkantfilm.

## Technik

Vite bündelt JavaScript, CSS und lokal ausgelieferte Schriften. Die Karte und die meisten Türchen verwenden Browser-APIs. Einzelne Szenen nutzen GSAP für Animationen und Three.js für 3D. Eine kleine Vercel-Funktion liefert die Serverzeit. Ohne Zeitabgleich verwendet der Kalender die Geräteuhr.

Die Kartenlogik liegt in `src/map/`, die Türchen in `src/doors/`. Datumsfreigabe und Speicherung sind in `src/core/time.js` und `src/core/store.js` gebündelt.

## Lokal starten

Mit Node.js 24 und npm im geklonten Repository:

```sh
npm ci
npm run dev
```

[Lokale Karte öffnen](http://127.0.0.1:5173/) · [Lokale Vorschau mit 24 Türchen](http://127.0.0.1:5173/#vorschau=bergfuehrer&tag=24&frisch)

`npm run build` erstellt die Produktionsdateien in `dist/`. Mit `npm run preview` lässt sich dieser Build auf Port 4173 ansehen. Für den lokalen Vite-Start genügen die Geräteuhr und die mitgelieferten Medien.

## Prüfen

```sh
node scripts/boulder-check.mjs
node scripts/pruefung.mjs --base http://127.0.0.1:5173
```

Die erste Prüfung berechnet die Lösbarkeit der neun Boulderrouten. Die zweite benötigt den laufenden Entwicklungsserver und installiertes Google Chrome. Sie prüft unter anderem die Freigabe um Mitternacht, den Wiedereinstieg mit beschädigtem Speicher, alle 24 Türchen, die Medienwiedergabe und das Layout auf schmalen Displays.

## Mein Beitrag und der Einsatz von KI

Ich habe den Kalender als persönliches Geschenk konzipiert. Mir war wichtig, dass er auf dem Handy funktioniert und man auch nach verpassten Tagen direkt weiterspielen kann. Ich habe den persönlichen Rahmen und die Anforderungen vorgegeben, die Live-Seite auf meinem Handy ausprobiert, Musik und Film angehört und die Formulierungen in den persönlichen Türchen überarbeitet.

Claude Code und Codex haben aus diesem Briefing die Spielwelt, die einzelnen Interaktionen, den Code und automatisierte Prüfungen ausgearbeitet. Für die Illustrationen kam die Bildgenerierung über Codex zum Einsatz, für das Video Veo über ElevenLabs und für die Musik Suno. Die entstandenen Medien sind hier in den für die Website verwendeten Fassungen enthalten.
