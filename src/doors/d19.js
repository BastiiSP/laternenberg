import './d05-boulder.css';
import { mountBoulder } from './d05-boulder.js';
import { D19 } from './d05-levels.js';

export default {
  mount(root, ctx) {
    return mountBoulder(root, ctx, {
      theme: 'polar', levels: D19,
      intro: {
        title: 'Das Projekt',
        text: 'Ein letzter Boulder unter dem Polarlicht. Im Aufwärmer lernst du den Dynamo: beide Hände an den Absprung, dann ein Henkel weit oben. Das Projekt verlangt mehr als Schwung. Erst lesen, dann fliegen.',
      },
      outro: {
        title: 'Top am Polarlicht',
        text: 'Das war die Boulder-Trilogie. Lorelai nennt es einen sauberen Durchstieg. Logan fragt, ob die Chalkwolke essbar ist. Ist sie nicht.',
        note: 'Projekt abgehakt – die Boulder-Trilogie ist komplett.',
      },
    });
  },
};
