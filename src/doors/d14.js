import './d05-boulder.css';
import { mountBoulder } from './d05-boulder.js';
import { D14 } from './d05-levels.js';

export default {
  mount(root, ctx) {
    return mountBoulder(root, ctx, {
      theme: 'ueberhang', levels: D14,
      intro: {
        title: 'Der Überhang',
        text: 'Der Fels wird kühler, die Griffe werden eigensinniger. Zwei kurze Übungen zeigen Sloper und Kreuzgriff; danach warten zwei Boulder mit Sackgassen. Rückgängig ist hier eine vollwertige Technik.',
      },
      outro: {
        title: 'Gut durchgezogen',
        text: 'Sloper, Kreuzgriff, Top. Die Wand hatte Gegenargumente, aber keine besseren.',
        note: 'Lorelai will den nächsten Boulder benoten. Logan stimmt für Pause.',
      },
    });
  },
};
