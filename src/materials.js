// The material board's own page.
import { initLooks } from './ui/looks.js';

initLooks().catch(() => {
  /* the page keeps its heading and links if the board's files fail to load */
});
