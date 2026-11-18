import './d05-boulder.css';
import { mountBoulder } from './d05-boulder.js';
import { D05 } from './d05-levels.js';

export default {
  mount(root, ctx) {
    return mountBoulder(root, ctx, {
      theme: 'granit', levels: D05, basics: true,
      intro: {
        title: 'Beta lesen',
        text: 'Eine kleine Wand im Laternenlicht. Erst der Aufwärmer, dann zwei Boulder: Schau dir die Griffe an, wähle eine Hand und finde eine Beta zum Top. Lorelai behauptet, sie hätte schon eine. Logan sucht noch sein Chalk.',
      },
      outro: {
        title: 'Zwei Tops, ein Berg',
        text: 'Die Griffe bleiben, die Beta darf sich ändern. Lorelai führt Buch; Logan hat vor allem die Matte getestet.',
        note: 'Der erste Teil der Boulder-Trilogie ist geschafft.',
      },
    });
  },
};
