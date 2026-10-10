// Umgebung je nach Strecken-Thema
import { makeKit } from './scenery_common.js';
import { jungle } from './scenery_jungle.js';
import { school } from './scenery_school.js';
import { pond } from './scenery_pond.js';
import { desert } from './scenery_desert.js';
import { market } from './scenery_market.js';
import { sky } from './scenery_sky.js';
const THEMES = { jungle, school, pond, desert, market, sky };
export function buildScenery(scene, tr, toon, quality = 1, def = {}) {
  const K = makeKit(scene, tr, toon, quality); K.def = def;
  return (THEMES[def.theme] || jungle)(K, def);
}
