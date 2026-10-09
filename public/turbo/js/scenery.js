// Umgebung je nach Strecken-Thema
import { makeKit } from './scenery_common.js';
import { jungle } from './scenery_jungle.js';
import { school } from './scenery_school.js';
import { pond } from './scenery_pond.js';
import { desert } from './scenery_desert.js';
const THEMES = { jungle, school, pond, desert };
export function buildScenery(scene, tr, toon, quality = 1, theme = 'jungle') {
  const K = makeKit(scene, tr, toon, quality);
  return (THEMES[theme] || jungle)(K);
}
