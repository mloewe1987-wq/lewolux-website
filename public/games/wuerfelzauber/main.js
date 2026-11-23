// Würfelzauber – Hauptspiel (v2: Karten, Raub, Beutezug, Duell, Event, Tutorial)
import { Dice3D, FACES, SKINS } from './dice3d.js';
import * as snd from './sfx.js';

const $ = s => document.querySelector(s);
const app = $('#app');
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => { n = Math.floor(n); if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.', ',') + ' Mrd'; if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' Mio'; if (n >= 1e5) return Math.round(n / 1e3) + 'K'; return n.toLocaleString('de-DE'); };
const AV = new Set();

// ================= Daten =================
const NIGHT = 'brightness(.82) saturate(.9) hue-rotate(205deg) contrast(1.08)';
const KINGDOMS = [
  { name: 'Rosenhain', b: ['castle', 'mill', 'library', 'smithy', 'tavern'] },
  { name: 'Perlenbucht', b: ['palace', 'lighthouse', 'market', 'coral', 'shipyard'] },
  { name: 'Mondwiesen', b: ['observatory', 'teahouse', 'greenhouse', 'moonbridge', 'mushroom'] },
  { name: 'Sonnenkamm', b: ['suntemple', 'bazaar', 'windspire', 'caravan', 'phoenix'] },
  { name: 'Kirschwolken', b: ['pagoda', 'koipond', 'dojo', 'festival', 'sakurashrine'] },
  // Dunkle Welten
  { name: 'Schattenmoor', night: 1, b: ['manor', 'ghostlight', 'crystalmine', 'moonlib', 'belltower'], fb: ['castle', 'lighthouse', 'smithy', 'library', 'mill'] },
  { name: 'Kürbisnacht', night: 1, b: ['dragonlair', 'thorngate', 'alchemist', 'starcrater', 'pumpkin'], fb: ['suntemple', 'castle', 'observatory', 'phoenix', 'bazaar'] },
  { name: 'Nebelbucht', night: 1, b: ['ghostship', 'seatemple', 'fishhut', 'krakengate', 'fogmarket'], fb: ['palace', 'lighthouse', 'market', 'coral', 'shipyard'] },
  { name: 'Glutschlund', night: 1, b: ['lavaforge', 'obsidian', 'embermarket', 'golemshrine', 'magmabridge'], fb: ['suntemple', 'bazaar', 'windspire', 'caravan', 'phoenix'] },
  { name: 'Finsterblüte', night: 1, b: ['darkpagoda', 'foxshrine', 'darkkoi', 'ninjadojo', 'spiritgate'], fb: ['pagoda', 'koipond', 'dojo', 'festival', 'sakurashrine'] },
];
// fehlen Bilder einer dunklen Welt, nimm die Ersatz-Gebäude im Nachtlicht
const kB = (K, i) => (K.fb && !AV.has(K.b[i] + '_1') && AV.size) ? K.fb[i] : K.b[i];
const kF = (K, i = 0) => K.f || (K.fb && AV.size && !AV.has(K.b[i] + '_1') ? NIGHT : '');

const BNAME = { ghostship: 'Geisterschiff-Steg', seatemple: 'Versunkener Tempel', fishhut: 'Hexen-Fischerhütte', krakengate: 'Krakentor', fogmarket: 'Nebelmarkt', lavaforge: 'Lavaschmiede', obsidian: 'Obsidianturm', embermarket: 'Glutmarkt', golemshrine: 'Golemschrein', magmabridge: 'Magmabrücke', darkpagoda: 'Schwarze Pagode', foxshrine: 'Mondfuchs-Schrein', darkkoi: 'Laternen-Koiteich', ninjadojo: 'Schatten-Dojo', spiritgate: 'Geistertor', observatory: 'Sternwarte', teahouse: 'Laternen-Teehaus', greenhouse: 'Sternblumenhaus', moonbridge: 'Mondbrücke', mushroom: 'Feenpilzhaus', suntemple: 'Sonnentempel', bazaar: 'Oasenbasar', windspire: 'Windturm', caravan: 'Karawanserei', phoenix: 'Phönixschrein', pagoda: 'Kirschpagode', koipond: 'Koi-Teegarten', dojo: 'Sakura-Dojo', festival: 'Laternenbühne', sakurashrine: 'Baumgeist-Schrein', manor: 'Hexenhaus', ghostlight: 'Geisterleuchte', crystalmine: 'Kristallmine', moonlib: 'Mondbibliothek', belltower: 'Fledermausturm', dragonlair: 'Drachenhort', thorngate: 'Dornentor', alchemist: 'Alchemistenturm', starcrater: 'Sternkrater', pumpkin: 'Kürbismarkt', castle: 'Schloss', mill: 'Windmühle', library: 'Zauberturm', smithy: 'Schmiede', tavern: 'Gasthaus', lighthouse: 'Leuchtturm', palace: 'Meerespalast', market: 'Hafenmarkt', coral: 'Korallengarten', shipyard: 'Werft' };
// Bereiche eines Gebäudes für den Angriff (x/y in % des Bildes)
const AREAS = {
  castle: [['Turmspitze', 50, 18], ['Westturm', 25, 42], ['Haupttor', 52, 70], ['Schatzkammer', 76, 50]],
  mill: [['Windrad', 46, 28], ['Kornspeicher', 70, 58], ['Mühlentür', 42, 68], ['Mehlsäcke', 22, 62]],
  library: [['Sternwarte', 50, 14], ['Bücherturm', 50, 42], ['Zaubertor', 50, 70], ['Archiv', 26, 64]],
  smithy: [['Esse', 30, 52], ['Schornstein', 58, 22], ['Amboss', 66, 68], ['Waffenlager', 82, 50]],
  tavern: [['Dachstube', 50, 28], ['Schankraum', 48, 58], ['Bierkeller', 26, 70], ['Terrasse', 76, 66]],
  lighthouse: [['Leuchtfeuer', 50, 14], ['Turm', 50, 42], ['Anleger', 40, 76], ['Lager', 70, 66]],
  palace: [['Perlenkuppel', 50, 20], ['Thronsaal', 50, 50], ['Muschelgarten', 24, 66], ['Schatzgrotte', 76, 66]],
  market: [['Gewürzstand', 30, 50], ['Fischstand', 66, 46], ['Kasse', 50, 66], ['Lagerhaus', 74, 72]],
  coral: [['Korallenbogen', 50, 30], ['Perlenbank', 30, 60], ['Seesternbeet', 70, 60], ['Muschelschatz', 50, 76]],
  shipyard: [['Mast', 50, 22], ['Rumpf', 46, 52], ['Werkstatt', 76, 56], ['Holzlager', 24, 66]],
  _: [['Dachspitze', 50, 22], ['Westflügel', 27, 50], ['Eingang', 50, 72], ['Schatzkammer', 74, 52]],
};
const STAGE_COST = [12, 22, 34, 48, 64];
const SLOT_MUL = [1.5, 1, 1.1, 1.2, 1.3];
const SLOTS = [{ x: 50, y: .64, w: 150 }, { x: 30, y: .34, w: 112 }, { x: 70, y: .34, w: 112 }, { x: 27, y: .97, w: 122 }, { x: 73, y: .97, w: 122 }];

const RAR = [
  { n: 'Gewöhnlich', c: 'r0', hatch: 15, w: 60 }, { n: 'Selten', c: 'r1', hatch: 40, w: 25 },
  { n: 'Episch', c: 'r2', hatch: 80, w: 10 }, { n: 'Legendär', c: 'r3', hatch: 140, w: 4 }, { n: 'Mythisch', c: 'r4', hatch: 220, w: 1.5 },
];
const PETS = [
  { id: 7, n: 'Funki', sp: 'Blitzhamster', r: 0, bt: 'coin', bv: 4 }, { id: 5, n: 'Wolke', sp: 'Wollschaf', r: 0, bt: 'regen', bv: 5 },
  { id: 3, n: 'Moosi', sp: 'Blütenhase', r: 0, bt: 'egg', bv: 6 }, { id: 11, n: 'Pilzi', sp: 'Pilzigel', r: 0, bt: 'steal', bv: 6 },
  { id: 1, n: 'Flämmchen', sp: 'Feuerfuchs', r: 1, bt: 'attack', bv: 8 }, { id: 2, n: 'Welli', sp: 'Wellenkröte', r: 1, bt: 'coin', bv: 7 },
  { id: 8, n: 'Frosti', sp: 'Eiseule', r: 1, bt: 'shield', bv: 8 }, { id: 4, n: 'Nyx', sp: 'Sternenkatze', r: 2, bt: 'jackpot', bv: 12 },
  { id: 9, n: 'Glut', sp: 'Lavaschwein', r: 2, bt: 'attack', bv: 14 }, { id: 6, n: 'Amethyst', sp: 'Kristalldrache', r: 3, bt: 'steal', bv: 20 },
  { id: 10, n: 'Prisma', sp: 'Regenbogen-Einhorn', r: 3, bt: 'egg', bv: 20 }, { id: 12, n: 'Sol', sp: 'Sonnenphönix', r: 4, bt: 'coin', bv: 25 },
  { id: 13, n: 'Wattebausch', sp: 'Wolkenschäfchen', r: 0, bt: 'regen', bv: 4 }, { id: 14, n: 'Mondi', sp: 'Mondfledermaus', r: 1, bt: 'steal', bv: 8 },
  { id: 15, n: 'Beeri', sp: 'Erdbeerschleim', r: 0, bt: 'coin', bv: 4 }, { id: 16, n: 'Pingo', sp: 'Zuckerpinguin', r: 1, bt: 'shield', bv: 8 },
  { id: 17, n: 'Kitzi', sp: 'Blattkitz', r: 0, bt: 'egg', bv: 5 }, { id: 18, n: 'Blubbi', sp: 'Blasenqualle', r: 2, bt: 'jackpot', bv: 12 },
  { id: 19, n: 'Glitzer', sp: 'Kristallschnecke', r: 0, bt: 'shield', bv: 5 }, { id: 20, n: 'Brummel', sp: 'Honigbär', r: 1, bt: 'coin', bv: 7 },
  { id: 21, n: 'Zapp', sp: 'Donnerkätzchen', r: 2, bt: 'attack', bv: 13 }, { id: 22, n: 'Sakura', sp: 'Kirschblütenfuchs', r: 3, bt: 'jackpot', bv: 20 },
  { id: 23, n: 'Greifi', sp: 'Goldgreif', r: 3, bt: 'attack', bv: 22 }, { id: 24, n: 'Flöckchen', sp: 'Frosthase', r: 1, bt: 'regen', bv: 8 },
  { id: 25, n: 'Magma', sp: 'Lavasalamander', r: 2, bt: 'steal', bv: 13 }, { id: 26, n: 'Hüpfi', sp: 'Pilzfrosch', r: 0, bt: 'steal', bv: 5 },
  { id: 27, n: 'Nova', sp: 'Sternenwal', r: 3, bt: 'regen', bv: 18 }, { id: 28, n: 'Schatten', sp: 'Schattenpanther', r: 2, bt: 'shield', bv: 14 },
  { id: 29, n: 'Iris', sp: 'Regenbogen-Koidrache', r: 4, bt: 'jackpot', bv: 30 }, { id: 30, n: 'Kosmo', sp: 'Kosmos-Eulenkönig', r: 4, bt: 'egg', bv: 30 },
];
// Sammel-Sets: volles Set = Belohnung
const SETS = [
  { n: 'Waldfreunde', ids: [3, 11, 17, 26, 20, 9] }, { n: 'Himmelsflieger', ids: [14, 23, 30, 13, 5, 10] },
  { n: 'Wasserwelt', ids: [2, 18, 27, 29, 16, 19] }, { n: 'Feuer & Blitz', ids: [1, 7, 21, 25, 12, 6] },
  { n: 'Süß & Zauber', ids: [15, 24, 22, 4, 28, 8] },
];
const havePet = id => AV.size === 0 || AV.has('pet_' + id);
const PETS_OK = () => PETS.filter(p => havePet(p.id));
// Tagesaufgaben
const QUESTS = [
  { k: 'roll', n: 'Würfle {x}-mal', x: [30, 50, 80] }, { k: 'triple', n: 'Würfle {x} Dreier', x: [3, 5, 8] },
  { k: 'attack', n: 'Greife {x}-mal an', x: [2, 3, 4] }, { k: 'card', n: 'Ziehe {x} Karten', x: [2, 3] },
  { k: 'build', n: 'Baue {x} Stufen aus', x: [2, 3, 5] }, { k: 'wheel', n: 'Drehe das Glücksrad', x: [1] },
];
const CHESTS = [
  { n: 'Holztruhe', f: 'sepia(.6) saturate(1.4) hue-rotate(-10deg) brightness(.9)', rw: [{ t: 'rolls', v: 10 }, { t: 'coins', v: 5 }, { t: 'crowns', v: 5 }] },
  { n: 'Silbertruhe', f: 'grayscale(1) brightness(1.35) contrast(1.1)', rw: [{ t: 'rolls', v: 20 }, { t: 'coins', v: 10 }, { t: 'crowns', v: 12 }] },
  { n: 'Goldtruhe', f: 'saturate(1.5) brightness(1.15)', rw: [{ t: 'rolls', v: 40 }, { t: 'crowns', v: 25 }, { t: 'gems', v: 5 }, { t: 'egg', v: 1 }] },
];
const BTXT = { coin: 'Münzen', regen: 'Würfel-Aufladung', egg: 'Ei-Chance', steal: 'Raub & Beutezug', attack: 'Angriff', shield: 'Schild-Chance', jackpot: 'Jackpot-Chance' };
const CARDS = {
  attack: { n: 'Angriff', img: 1, w: 22, k: 0, d: 'Schieße auf ein Gebäude eines Rivalen.' },
  steal: { n: 'Raub', img: 2, w: 24, k: 0, d: 'Würfle Münzen aus der Schatzkammer – bis die Bombe kommt.' },
  raid: { n: 'Beutezug', img: 3, w: 14, k: 1, d: 'Finde den sicheren Weg zur Schatztruhe.' },
  coins: { n: 'Goldschatz', img: 4, w: 14, k: 0, d: 'Ein großer Haufen Münzen.' },
  rolls: { n: 'Würfelregen', img: 5, w: 10, k: 0, d: 'Extra-Würfe für dich.' },
  joker: { n: 'Joker', img: 6, w: 6, k: 2, d: '60 Sekunden lang kostenlos würfeln!' },
  fight: { n: 'Duell', img: 7, w: 6, k: 1, d: 'Schere, Stein, Papier gegen einen Rivalen.' },
  egg: { n: 'Zauberei', img: 8, w: 4, k: 0, d: 'Ein magisches Ei für deine Brutstätte.' },
};
const cardCost = lv => 20 + lv * 25;
const RIVALS = ['Kira', 'Taro', 'Yuki', 'Ren', 'Mika', 'Sora', 'Haru', 'Aiko', 'Kenta', 'Nami', 'Ryo', 'Emi'].map((n, i) => ({ n, av: i }));
const BETS = [{ m: 1, lv: 1 }, { m: 2, lv: 1 }, { m: 3, lv: 3 }, { m: 5, lv: 5 }, { m: 10, lv: 8 }, { m: 20, lv: 12 }, { m: 50, lv: 18 }];
const MAXR = 50, REGEN = 360;
const WHEEL = [
  { t: 'rolls', v: 10, ic: 'ic_star', l: '10 Würfe' }, { t: 'coins', v: 8, ic: 'ic_coin', l: 'Münzen' },
  { t: 'gems', v: 5, ic: 'ic_gem', l: '5 Kristalle' }, { t: 'rolls', v: 25, ic: 'ic_star', l: '25 Würfe' },
  { t: 'egg', v: 0, ic: 'ic_egg', l: 'Ei' }, { t: 'crowns', v: 15, ic: 'ic_crowntok', l: '15 Kronen' },
  { t: 'shield', v: 1, ic: 'ic_shield', l: 'Schild' }, { t: 'rolls', v: 50, ic: 'ic_star', l: '50 Würfe' },
];
const DAILY = [{ t: 'rolls', v: 10 }, { t: 'coins', v: 10 }, { t: 'crowns', v: 10 }, { t: 'rolls', v: 20 }, { t: 'gems', v: 10 }, { t: 'egg', v: 1 }, { t: 'rolls', v: 60 }];
const EV_MS = [60, 150, 300, 500, 800, 1200, 1700, 2400];
const EV_RW = [{ t: 'rolls', v: 10 }, { t: 'coins', v: 10 }, { t: 'crowns', v: 15 }, { t: 'rolls', v: 25 }, { t: 'egg', v: 1 }, { t: 'gems', v: 15 }, { t: 'rolls', v: 60 }, { t: 'egg', v: 3 }];
const TIPS = [
  'Halte immer Schilde bereit – sie wehren Angriffe ab.',
  'Ein höherer Einsatz bringt mehr, kostet aber auch mehr Würfe.',
  'Gib Münzen lieber aus: Wer viel hortet, wird gern angegriffen.',
  'Kronen bekommst du beim Bauen und für neue Haustiere. Damit verbesserst du deine Karten.',
  'Beim Angriff: Tippe, wenn der Ring grün ist – dann gibt es ×3 Beute!',
  'Wähle im Album ein Begleit-Haustier – es gibt dir den vollen Bonus.',
  'Alle 30 Würfe schenkt dir Leo einen garantierten Goldwurf.',
  'Im Event gibt es Punkte für jeden Dreier – hol dir die Meilensteine!',
  'Beim Raub beendet die Bombe nur den Raub – deine Münzen bleiben.',
  'Die Gewinntabelle (oben rechts) zeigt, was jeder Wurf bringt.',
  'Schick Haustiere, die nicht dein Begleiter sind, auf Ausflüge – sie bringen Beute mit.',
  'Ein Haustier auf Stufe 5 wird beim nächsten Schlüpfen golden – doppelter Bonus!',
  'Unter „Täglich“ warten 3 Aufgaben mit Truhen auf dich.',
  'Tippe auf Leo, um seine Stufe und Fähigkeiten zu sehen.',
  'Jeder Dreier schwächt den Wolkengeist im Event – hol dir die Truhen!',
];

// ================= Spielstand =================
const KEY = 'wz_save_v1';
const fresh = () => ({
  v: 2, coins: 600, gems: 10, crowns: 0, rolls: MAXR, rollT: Date.now(), shields: 0, lv: 1, xp: 0,
  k: 0, st: [0, 0, 0, 0, 0], dmg: [0, 0, 0, 0, 0], bet: 0, leo: 0, gold: false,
  eggs: [], pets: {}, active: null, wheelT: 0, revenge: [], log: [], seen: Date.now(),
  tut: 0, stats: { rolls: 0, att: 0, raid: 0, built: 0, hatched: 0 }, sound: true, music: true,
  cards: { attack: 1, steal: 1, coins: 1, rolls: 1, egg: 1 }, joker: 0,
  day: { n: 0, last: '' }, ev: { id: 0, end: 0, pts: 0, got: 0, bots: [] }, tipI: 0,
  name: '', avatar: 'hero_face', frame: 0, sets: {}, q: { day: '', list: [], bonus: 0 },
  shiny: {}, exp: [], leoLv: 1, leoXp: 0, skin: 0, skins: { 0: 1 }, boss: { id: 0, end: 0, hp: 0, max: 0, got: 0 },
});
let G;
try { G = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { G = fresh(); }
G = Object.assign(fresh(), G);
if (G.v < 2) { G.v = 2; G.cards = fresh().cards; if (G.tut) G.tut = 9; }
const save = () => { G.seen = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { } };
snd.S.on = G.sound; snd.S.music = G.music;

const KG = () => KINGDOMS[G.k % KINGDOMS.length];
const kScale = (k = G.k) => Math.pow(1.8, k);
const base = () => 50 * kScale();
// Kosten wachsen pro Königreich schneller als die Einnahmen: K1 ≈ ½ Tag, K2 ≈ 1 Tag, K5 ≈ 2 Tage, K10 ≈ 4 Tage (siehe tools/balance.js)
const costF = k => k === 0 ? .55 : 1.1 + .6 * (k - 1);
const stageCost = (slot, s) => Math.round(base() * STAGE_COST[s] * SLOT_MUL[slot] * costF(G.k) / 10) * 10;
const repairCost = slot => Math.round(stageCost(slot, Math.max(0, G.st[slot] - 1)) * 0.35 / 10) * 10;
const xpNeed = lv => 60 + lv * 40;
const betM = () => BETS[G.bet].m;
const maxShields = () => Math.min(5, 3 + Math.floor((G.lv - 1) / 6));
const cardLv = id => G.cards[id] || 0;
const cardMul = id => 1 + (Math.max(1, cardLv(id)) - 1) * 0.25;
const jokerOn = () => G.joker > Date.now();
function bonus(type) {
  let b = 0;
  for (const p of PETS) { const lv = G.pets[p.id]; if (!lv) continue; if (p.bt === type) b += (G.active === p.id ? p.bv * (1 + (lv - 1) * 0.5) : p.bv * 0.25 * lv) * (G.shiny[p.id] ? 2 : 1); }
  return Math.min(1.5, b / 100); // Bonus je Art höchstens +150 %
}

// ================= Würfel =================
const iconNames = { coin: 'ic_coin', crown: 'ic_crown', swords: 'ic_swords', shield: 'ic_shield', card: 'ic_card', star: 'ic_star' };
let dice;
async function initDice() {
  const load = n => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = `assets/${n}.webp`; });
  const icons = {};
  for (const f of FACES) icons[f] = await load(iconNames[f]);
  dice = new Dice3D($('#dice'), icons);
  if (G.skin) dice.setSkin(SKINS[G.skin].t);
  dice.onLand = () => snd.play('land', 0.7);
}

// ================= Layout =================
let H = 844;
function fit() {
  const vw = innerWidth, vh = innerHeight;
  const sc = Math.min(vw / 390, vh / 680);
  window.__appScale = sc;
  H = Math.round(Math.min(Math.max(vh / sc, 680), 940));
  app.style.height = H + 'px';
  app.style.transform = `translate(-50%,-50%) scale(${sc})`;
  const trayH = 218, rowB = 24, trayB = rowB + 84 - 30;
  $('#rollInfo').style.bottom = '4px';
  $('#rollRow').style.bottom = rowB + 'px';
  $('#trayWrap').style.bottom = trayB + 'px';
  $('#trayWrap').style.height = trayH + 'px';
  const kTop = 92, kH = H - trayB - trayH - kTop - 26; // Inseln enden über der Schale (Platz für Sterne und Leo-Energie)
  const kd = $('#kingdom'); kd.style.height = kH + 'px'; kd.dataset.h = kH;
  // Seitenknöpfe so groß machen, dass sie über Leo und dem Begleiter enden
  const trayTop = H - trayB - trayH, avail = trayTop - 58 - 112 - 14;
  const sb = Math.max(40, Math.min(52, (avail - 3 * 14) / 4)), gap = Math.max(8, Math.min(16, (avail - 4 * sb) / 3));
  document.querySelectorAll('.side').forEach(s => s.style.gap = gap + 'px');
  document.querySelectorAll('.sb').forEach(b => { b.style.width = b.style.height = sb + 'px'; b.querySelector('img').style.width = b.querySelector('img').style.height = (sb * .78) + 'px'; });
  renderKingdom();
  if (dice) dice.resize();
}
addEventListener('resize', fit);

// ================= Anzeige =================
function hud() {
  $('#coins').textContent = fmt(G.coins);
  $('#gems').textContent = fmt(G.gems);
  $('#plev').textContent = G.lv;
  $('#avBtn').style.setProperty('--p', Math.round(G.xp / xpNeed(G.lv) * 100) + '%');
  const sh = $('#shields'); const ms = maxShields();
  if (sh.children.length !== ms) sh.innerHTML = '<i></i>'.repeat(ms);
  [...sh.children].forEach((e, i) => e.classList.toggle('on', i < G.shields));
  const jk = jokerOn();
  $('#rollTxt').textContent = jk ? `JOKER: noch ${Math.ceil((G.joker - Date.now()) / 1000)} s gratis!` : `${G.rolls} / ${MAXR}` + (G.rolls < MAXR ? `  ·  +1 in ${timeLeft()}` : '');
  $('#rollBar div').style.width = jk ? '100%' : Math.min(100, G.rolls / MAXR * 100) + '%';
  $('#rollBar div').style.background = jk ? 'linear-gradient(90deg,#ff8ab8,#ffd25e,#7ee3ff)' : '';
  $('#betV').textContent = '×' + betM();
  $('#roll').classList.toggle('off', !jk && G.rolls < betM());
  $('#kTitle').textContent = KG().name;
  $('#kSub').textContent = `Königreich ${G.k + 1}  ·  ${G.st.reduce((a, b) => a + b, 0)} / 25 ★`;
  const c = $('#combo'); c.classList.add('on');
  c.textContent = G.gold ? '✨ Leos Goldwurf bereit!' : `Leo St. ${G.leoLv} · Energie ${G.leo} / ${leoNeed()}`;
  c.style.background = G.gold ? 'linear-gradient(#ffe066,#f5a524)' : ''; c.style.color = G.gold ? '#5a2b00' : '';
  $('#deckN').textContent = fmt(G.crowns);
  badge('#bBuild', canBuildAny() ? '!' : '');
  badge('#bEggs', G.eggs.some(e => e.p >= RAR[e.r].hatch) ? '!' : (G.eggs.length || ''));
  badge('#bWheel', Date.now() >= G.wheelT ? '1' : '');
  badge('#bRivals', G.revenge.length || '');
  badge('#bPets', G.exp.some(x => x.end <= Date.now()) ? '!' : '');
  badge('#bCards', Object.keys(CARDS).some(id => cardLv(id) && G.crowns >= cardCost(cardLv(id)) && cardLv(id) < 10) ? '!' : '');
  qCheck(); badge('#bDaily', G.day.last !== today() || G.q.list.some(q => q.p >= q.x && !q.got) || (!G.q.bonus && G.q.list.every(q => q.got)) ? '!' : '');
  bossCheck(); badge('#bEvent', EV_MS.some((m, i) => G.ev.pts >= m && G.ev.got <= i) || (G.boss.got < 4 && G.boss.hp <= G.boss.max * [.75, .5, .25, 0][Math.min(3, G.boss.got)]) ? '!' : '');
}
function badge(sel, v) { const i = document.querySelector(sel + ' i'); if (!i) return; i.textContent = v; i.classList.toggle('on', !!v); }
function timeLeft() { const s = Math.max(0, REGEN * (1 - bonus('regen')) - (Date.now() - G.rollT) / 1000); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
function canBuildAny() { return G.st.some((s, i) => (G.dmg[i] && G.coins >= repairCost(i)) || (s < 5 && G.coins >= stageCost(i, s))); }
const today = () => new Date().toISOString().slice(0, 10);
const bImg = (b, s) => `assets/${b}_${Math.max(1, s)}.webp`;

function renderKingdom() {
  app.classList.toggle('night', !!KG().night);
  { const want = KG().night && AV.has('sky_night') ? 'assets/sky_night.webp' : 'assets/sky.webp'; if (!$('#bg').src.endsWith(want)) $('#bg').src = want; }
  const kd = $('#kingdom'); const kH = +kd.dataset.h || 480; const sc = Math.min(1, kH / 470);
  kd.innerHTML = '';
  const K = KG();
  SLOTS.forEach((p, i) => {
    const b = kB(K, i), s = G.st[i];
    const d = document.createElement('div');
    d.className = 'islet' + (s === 0 ? ' empty' : '') + (G.dmg[i] ? ' dmg' : '');
    // Höhe begrenzt durch den Platz nach oben; Breite schrumpft auf kleinen Handys nur leicht
    const maxH = Math.min(p.y * kH - (p.y < .5 ? 18 : 30), p.w * 1.55, p.y < .5 ? kH * .36 : kH * .42);
    d.style.left = p.x + '%'; d.style.top = (p.y * kH) + 'px'; d.style.width = (p.w * Math.max(sc, .88)) + 'px'; d.style.height = maxH + 'px';
    d.style.animationDelay = (-i * 0.9) + 's'; d.style.zIndex = Math.round(p.y * 10); d.dataset.slot = i;
    const im = document.createElement('img'); im.src = bImg(b, s);
    if (kF(K, i)) im.style.filter = kF(K, i);
    d.appendChild(im);
    const stars = document.createElement('div'); stars.className = 'stars';
    for (let k = 0; k < 5; k++) { const e = document.createElement('i'); if (k < s) e.className = 'on'; stars.appendChild(e); }
    d.appendChild(stars);
    if (G.dmg[i]) { const sm = document.createElement('div'); sm.className = 'smoke'; d.appendChild(sm); }
    const afford = G.dmg[i] ? G.coins >= repairCost(i) : (s < 5 && G.coins >= stageCost(i, s));
    if (afford) { const t = document.createElement('div'); t.className = 'tag'; t.textContent = G.dmg[i] ? 'Reparieren' : (s ? 'Ausbauen' : 'Bauen'); d.appendChild(t); }
    d.onclick = () => tryBuild(i);
    kd.appendChild(d);
  });
}

// ================= Effekte =================
function pos(el) { const r = el.getBoundingClientRect(), a = app.getBoundingClientRect(), sc = a.width / 390; return { x: (r.left - a.left + r.width / 2) / sc, y: (r.top - a.top + r.height / 2) / sc, w: r.width / sc, h: r.height / sc }; }
function floatTxt(txt, x, y, color = '#ffe27a', size = 22) {
  const e = document.createElement('div'); e.className = 'float'; e.textContent = txt;
  e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.color = color; e.style.fontSize = size + 'px';
  app.appendChild(e); setTimeout(() => e.remove(), 1400);
}
function sparks(x, y, n = 14, spread = 70) {
  for (let i = 0; i < n; i++) {
    const e = document.createElement('div'); e.className = 'spark';
    e.style.left = x + 'px'; e.style.top = y + 'px';
    const a = Math.random() * Math.PI * 2, d = rnd(spread * .4, spread);
    e.style.setProperty('--dx', Math.cos(a) * d + 'px'); e.style.setProperty('--dy', Math.sin(a) * d + 'px');
    app.appendChild(e); setTimeout(() => e.remove(), 950);
  }
}
function flyCoins(n, from, toSel = '#pCoins', icon = 'ic_coin') {
  const tEl = $(toSel); if (!tEl) return; const to = pos(tEl); n = Math.min(n, 16);
  for (let i = 0; i < n; i++) {
    const e = document.createElement('img'); e.src = `assets/${icon}.webp`; e.className = 'coinfx';
    e.style.left = (from.x - 15) + 'px'; e.style.top = (from.y - 15) + 'px';
    app.appendChild(e);
    const mx = from.x + rnd(-80, 80), my = from.y + rnd(-90, -20);
    e.animate([
      { transform: 'translate(0,0) scale(.4)', opacity: 0 },
      { transform: `translate(${mx - from.x}px,${my - from.y}px) scale(1.1)`, opacity: 1, offset: .35 },
      { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) scale(.6)`, opacity: 1 },
    ], { duration: 750 + i * 45, easing: 'cubic-bezier(.4,0,.6,1)' }).onfinish = () => { e.remove(); if (i % 3 === 0) snd.play('coin', 0.5, 1 + i * 0.03); };
  }
  setTimeout(() => tEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 300 }), 800);
}
function banner(txt, color) {
  const b = $('#banner'); b.innerHTML = ''; const d = document.createElement('div'); d.textContent = txt;
  if (color) d.style.textShadow = `0 3px 0 #2a0b5e,0 0 18px ${color}`;
  b.appendChild(d); b.style.display = 'block'; clearTimeout(banner.t); banner.t = setTimeout(() => b.style.display = 'none', 1800);
}
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
let toastT;
function toast(t, ms = 1900) { let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; app.appendChild(e); } e.innerHTML = t; e.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => e.style.opacity = 0, ms); }
function result(parts, total) {
  const r = $('#result'); r.innerHTML = parts + (total ? ` <b>+${fmt(total)}</b>` : '');
  r.classList.remove('on'); void r.offsetWidth; r.classList.add('on');
}
function shake(el = app) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

// ================= Fenster =================
let ovStack = [];
function panel(html, { onClose, cls = '' } = {}) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<div class="panel ${cls}">${onClose === false ? '' : '<div class="x" data-close>✕</div>'}${html}</div>`;
  app.appendChild(ov); ovStack.push(ov);
  const close = () => { if (!ov.isConnected) return; ov.remove(); ovStack = ovStack.filter(o => o !== ov); if (onClose) onClose(); focusReset(); hud(); tutNext('close'); };
  ov.close = close;
  ov.addEventListener('click', e => { if (e.target === ov && onClose !== false) close(); const c = e.target.closest('[data-close]'); if (c) { snd.play('click'); close(); } });
  focusReset();
  return ov;
}
const closeTop = () => { const o = ovStack[ovStack.length - 1]; if (o && o.querySelector('[data-close]')) o.close(); };
const icon = (n, s = 22) => `<img src="assets/${n}.webp" style="width:${s}px;height:${s}px;display:inline-block;vertical-align:middle">`;
function grant(rw, from) {
  const p = from || { x: 195, y: H / 2 };
  if (rw.t === 'rolls') { G.rolls += rw.v; flyCoins(4, p, '#rollTxt', 'ic_star'); return `${rw.v} Würfe`; }
  if (rw.t === 'coins') { const c = Math.round(base() * rw.v); G.coins += c; flyCoins(8, p); return `${fmt(c)} Münzen`; }
  if (rw.t === 'gems') { G.gems += rw.v; flyCoins(4, p, '#pGems', 'ic_gem'); return `${rw.v} Kristalle`; }
  if (rw.t === 'crowns') { G.crowns += rw.v; flyCoins(4, p, '#deck', 'ic_crowntok'); return `${rw.v} Kronen`; }
  if (rw.t === 'shield') { G.shields = Math.min(maxShields(), G.shields + rw.v); return 'Schild'; }
  if (rw.t === 'egg') { for (let i = 0; i < rw.v; i++) gainEgg(rw.v > 1 ? 1 : 0, true); return rw.v > 1 ? `${rw.v} seltene Eier` : 'Ei'; }
  return '';
}
const rwLabel = rw => ({ rolls: `${rw.v} Würfe`, coins: 'Münzen', gems: `${rw.v} Kristalle`, crowns: `${rw.v} Kronen`, shield: 'Schild', egg: rw.v > 1 ? `${rw.v} Eier` : 'Ei' })[rw.t];
const rwIcon = rw => ({ rolls: 'ic_star', coins: 'ic_coin', gems: 'ic_gem', crowns: 'ic_crowntok', shield: 'ic_shield', egg: 'ic_egg' })[rw.t];

// ================= Würfeln =================
let busy = false, auto = false, holdT = null, forced = null, forced2 = null;
function regen() {
  const per = REGEN * 1000 * (1 - bonus('regen'));
  if (G.rolls >= MAXR) { G.rollT = Date.now(); return; }
  const n = Math.floor((Date.now() - G.rollT) / per);
  if (n > 0) { G.rolls = Math.min(MAXR, G.rolls + n); G.rollT += n * per; if (G.rolls >= MAXR) G.rollT = Date.now(); }
}
const FI = f => FACES.indexOf(f);
function decide() {
  if (forced) { const t = forced; forced = null; return { t }; }
  if (G.gold) { G.gold = false; leoXP(); return Math.random() < (G.leoLv >= 7 ? .5 : .35) ? { t: 'crown', gold: 1 } : { t: 'coin', gold: 1 }; }
  const r = Math.random();
  const jp = 0.025 * (1 + bonus('jackpot')), sh = 0.06 * (1 + bonus('shield'));
  const table = [['coin', .08], ['crown', jp], ['swords', .07], ['shield', sh], ['card', .065], ['star', .02]];
  let acc = 0;
  for (const [t, p] of table) { acc += p; if (r < acc) return { t }; }
  let faces; do { faces = [ri(0, 5), ri(0, 5), ri(0, 5)]; } while (faces[0] === faces[1] && faces[1] === faces[2]);
  return { t: 'mix', faces };
}
const singlePay = faces => faces.reduce((a, f) => a + (f === FI('coin') ? 1 : f === FI('crown') ? 2 : 0), 0);

async function roll() {
  if (busy || ovStack.length || gameOpen) return;
  if (tut.block && tut.block !== 'roll') return;
  regen();
  const m = betM(), jk = jokerOn();
  if (!jk && G.rolls < m) {
    auto = false; setAuto();
    if (G.rolls > 0 && G.bet > 0) { G.bet = 0; hud(); toast('Einsatz auf ×1 gesetzt'); return; }
    return outOfRolls();
  }
  snd.unlock(); busy = true; clearHand();
  if (G.rolls >= MAXR) G.rollT = Date.now();
  if (!jk) G.rolls -= m; G.stats.rolls++; qAdd('roll');
  const res = decide();
  const faces = res.faces || [FI(res.t), FI(res.t), FI(res.t)];
  hud(); $('#result').classList.remove('on');
  snd.play('roll');
  $('#roll').classList.add('down'); setTimeout(() => $('#roll').classList.remove('down'), 120);
  await dice.roll(faces);
  if (!G.gold) { G.leo++; if (G.leo >= leoNeed()) { G.leo = 0; G.gold = true; setTimeout(() => { banner('Leo ist bereit!', '#ffd25e'); snd.play('star'); lionJump(); }, 900); } }
  if (res.t !== 'mix') { qAdd('triple'); bossHit(res.t === 'swords' ? 3 : 1); }
  if (res.t !== 'mix') evAdd(res.t === 'crown' ? 25 : res.t === 'swords' || res.t === 'card' ? 12 : 8, m);
  try { await resolve(res, m); } catch (e) { console.error(e); if (gameOpen) g2close(); }
  tickEggs(1);
  if (G.tut >= 9 && Math.random() < 0.022 * (1 + bonus('egg'))) { await wait(250); gainEgg(); }
  if (G.tut >= 9 && G.stats.rolls > 25 && Math.random() < 0.012) { await wait(400); await rivalAttacksYou(); }
  if (G.tut >= 9 && G.stats.rolls % 15 === 0) toast('💡 ' + TIPS[(G.tipI++) % TIPS.length], 3800);
  save(); hud(); renderKingdom();
  busy = false;
  tutNext('rolled');
  if (auto) setTimeout(() => { if (auto && !ovStack.length && !gameOpen) roll(); }, 380);
}

async function resolve(res, m) {
  const trayC = pos($('#dice'));
  const B = base() * m * (res.gold ? 1 + .15 * (G.leoLv - 1) : 1);
  const coinB = 1 + bonus('coin');
  if (res.gold && G.leoLv >= 4) { G.rolls += 5; setTimeout(() => floatTxt('+5 Würfe von Leo', 195, H * .55, '#9be7ff', 18), 900); }
  const give = (c, big) => { c = Math.round(c * coinB); G.coins += c; floatTxt('+' + fmt(c), trayC.x, trayC.y - 30, '#ffe27a', big ? 30 : 22); flyCoins(big ? 14 : Math.max(3, Math.min(8, c / B * 2)), trayC); if (big) snd.play('coins'); return c; };
  const tri = n => icon(n) + icon(n) + icon(n);
  switch (res.t) {
    case 'coin': { leoMood('cheer'); lionJump(); dice.glow(true); flash(); banner('MÜNZREGEN!'); snd.play('jackpot', 0.7); const c = give(B * 15, true); result(`${tri('ic_coin')} Münzregen`, c); sparks(trayC.x, trayC.y, 24, 120); await wait(1100); dice.glow(false); break; }
    case 'crown': { leoMood('cheer', 2200); lionJump(); dice.glow(true); flash(); banner('KRONEN-JACKPOT!', '#ffcf6b'); snd.play('jackpot'); const c = give(B * 40, true); G.gems += 3 * Math.min(m, 5); result(`${tri('ic_crown')} Jackpot + ${3 * Math.min(m, 5)} ${icon('ic_gem', 18)}`, c); flyCoins(5, trayC, '#pGems', 'ic_gem'); sparks(trayC.x, trayC.y, 40, 160); await wait(1400); dice.glow(false); break; }
    case 'star': flash(); banner(`WÜRFELREGEN! +${10 * m}`, '#9be7ff'); snd.play('star'); G.rolls += 10 * m; result(`${tri('ic_star')} +${10 * m} Würfe`); sparks(trayC.x, trayC.y, 24, 120); await wait(1000); break;
    case 'shield':
      snd.play('shield'); flash();
      if (G.shields < maxShields()) { G.shields++; banner('SCHILD!', '#7fd0ff'); result(`${tri('ic_shield')} +1 Schild`); flyCoins(1, trayC, '#shields', 'ic_shield'); }
      else { banner('Schilde voll: +5 Würfe'); G.rolls += 5; result(`Schilde voll → +5 Würfe`); }
      await wait(900); break;
    case 'swords': banner('ANGRIFF!', '#ff6b6b'); snd.play('alarm'); result(`${tri('ic_swords')} Angriff!`); await wait(900); await attackFlow(m); break;
    case 'card': banner('KARTE!', '#c78bff'); snd.play('mask'); result(`${tri('ic_card')} Karte ziehen`); await wait(700); await drawCard(m); break;
    default: {
      const s = singlePay(res.faces);
      const c = give(B * (s ? s : 0.5));
      const parts = res.faces.filter(f => f === FI('coin') || f === FI('crown')).map(f => icon(iconNames[FACES[f]])).join('') || 'Trostpreis';
      result(parts, c); snd.play('coin', 0.6);
      if (!s && Math.random() < .5) leoMood('pout', 1200);
    }
  }
}

let moodT;
function leoMood(m, ms = 1600) { const l = $('#lion'); l.src = `assets/${m === 'idle' ? 'lion' : 'leo_' + m}.webp`; clearTimeout(moodT); if (m !== 'idle') moodT = setTimeout(() => l.src = 'assets/lion.webp', ms); }
function lionJump() { leoMood('cheer', 1400); $('#lion').animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-26px) scale(1.12)' }, { transform: 'translateY(0) scale(1)' }], { duration: 600, easing: 'ease-out' }); const p = pos($('#lion')); sparks(p.x, p.y, 16, 60); }

function outOfRolls() {
  snd.play('error');
  const cost = 20, n = 30;
  const ov = panel(`<h2>Keine Würfe mehr</h2><img src="assets/lion.webp" style="width:110px;margin:4px auto">
    <p>Neue Würfe laden sich von selbst auf: <b>+1 alle ${Math.round(REGEN / 60)} Minuten</b> (nächster in ${timeLeft()}).</p>
    <p>Gratis-Würfe gibt es auch im Glücksrad, beim Tagesbonus und im Event.</p>
    <div class="btn gold ${G.gems < cost ? 'off' : ''}" id="buyR">${n} Würfe für ${cost} ${icon('ic_gem', 20)}</div>
    <p class="tip">💡 ${pick(TIPS)}</p>`);
  ov.querySelector('#buyR').onclick = () => { G.gems -= cost; G.rolls += n; snd.play('star'); ov.close(); save(); };
}

// ---- Gewinntabelle ----
function payPanel() {
  const B = base() * betM(), cb = 1 + bonus('coin');
  const row = (ic, t, v) => `<div class="pay"><span>${ic}</span><b>${t}</b><em>${v}</em></div>`;
  const tri = n => icon(n, 24) + icon(n, 24) + icon(n, 24);
  panel(`<h2>Gewinntabelle</h2><p>Werte für Einsatz ×${betM()} in ${KG().name}</p>
  <div class="paylist">
   ${row(tri('ic_crown'), 'Jackpot', `${fmt(B * 40 * cb)} + ${3 * Math.min(betM(), 5)} ${icon('ic_gem', 16)}`)}
   ${row(tri('ic_coin'), 'Münzregen', fmt(B * 15 * cb))}
   ${row(tri('ic_swords'), 'Angriff', `bis ${fmt(B * 33 * cardMul('attack'))}`)}
   ${row(tri('ic_card'), 'Karte', 'Raub, Beutezug …')}
   ${row(tri('ic_shield'), 'Schild', `+1 (max. ${maxShields()})`)}
   ${row(tri('ic_star'), 'Würfelregen', `+${10 * betM()} Würfe`)}
   ${row(icon('ic_coin', 24), 'je Münze', fmt(B * cb))}
   ${row(icon('ic_crown', 24), 'je Krone', fmt(B * 2 * cb))}
   ${row('', 'sonst', fmt(B * .5 * cb))}
  </div><p class="tip">Mit etwas Glück findest du bei jedem Wurf ein Ei (ca. 2 %).</p>`);
}

// ================= Karten =================
function drawPool() { return Object.entries(CARDS).filter(([id]) => cardLv(id) > 0); }
const cardArt = (id, small) => `<div class="cardart${small ? ' sm' : ''}" style="background-image:url(assets/card_${CARDS[id].img}.webp)"></div>`;
async function drawCard(m) {
  qAdd('card');
  if (auto) { auto = false; setAuto(); }
  let id;
  if (forced2) { id = forced2; forced2 = null; } else {
    const pool = drawPool(); let x = Math.random() * pool.reduce((a, [, c]) => a + c.w, 0);
    for (const [k, c] of pool) { x -= c.w; if (x < 0) { id = k; break; } }
    id = id || 'coins';
  }
  const C = CARDS[id];
  await new Promise(res => {
    const ov = panel(`<div class="cardflip"><div class="cf-in"><div class="cf-back"></div><div class="cf-front">${cardArt(id)}</div></div></div>
      <h2 style="margin-top:10px">${C.n}</h2><p>${C.d}</p><p class="r3">Stufe ${cardLv(id)}</p><div class="btn gold" id="cGo">${['attack', 'steal', 'raid', 'fight'].includes(id) ? 'Los!' : 'Einsammeln'}</div>`, { onClose: false });
    snd.play('whoosh'); setTimeout(() => { const f = ov.querySelector('.cardflip'); if (f) f.classList.add('flip'); snd.play('star'); }, 350);
    ov.querySelector('#cGo').onclick = () => { snd.play('click'); ov.close(); res(); };
  });
  const B = base() * m * cardMul(id);
  const p = { x: 195, y: H * .55 };
  if (id === 'attack') await attackFlow(m, cardMul(id));
  else if (id === 'steal') await stealFlow(m);
  else if (id === 'raid') await raidFlow(m);
  else if (id === 'fight') await fightFlow(m);
  else if (id === 'coins') { const c = Math.round(B * 20); G.coins += c; flyCoins(14, p); snd.play('coins'); floatTxt('+' + fmt(c), 195, H * .5, '#ffe27a', 30); }
  else if (id === 'rolls') { const n = Math.round(12 * m * cardMul(id)); G.rolls += n; snd.play('star'); floatTxt(`+${n} Würfe`, 195, H * .5, '#9be7ff', 28); }
  else if (id === 'joker') { G.joker = Date.now() + 60000 * cardMul(id); banner('JOKER! Gratis würfeln!', '#ff8ab8'); snd.play('jackpot'); }
  else if (id === 'egg') gainEgg(cardLv('egg') >= 5 ? 1 : 0);
  save(); hud();
}
function cardsPanel() {
  const rows = Object.entries(CARDS).map(([id, C]) => {
    const lv = cardLv(id), cost = cardCost(lv);
    if (!lv) return `<div class="card lock">${cardArt(id, 1)}<b>${C.n}</b><small>ab Königreich ${C.k + 1}</small></div>`;
    return `<div class="card">${cardArt(id, 1)}<b>${C.n}</b><small class="r3">Stufe ${lv}${lv < 10 ? '' : ' (max)'}</small>
      ${lv < 10 ? `<div class="mini ${G.crowns < cost ? 'off' : ''}" data-up="${id}" style="margin-top:4px;font-size:11px">${icon('ic_crowntok', 14)} ${cost}</div>` : ''}</div>`;
  }).join('');
  const ov = panel(`<h2>Meine Karten</h2><p>Drei ${icon('ic_card', 20)} ziehen eine Karte. Mit Kronen ${icon('ic_crowntok', 18)} (du hast <b>${G.crowns}</b>) verbesserst du sie: +25 % Gewinn je Stufe.</p><div class="grid3 g4">${rows}</div>
   <p class="tip">Kronen gibt es fürs Bauen, für neue Haustiere, im Glücksrad und im Event.</p>`);
  ov.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const id = b.dataset.up, c = cardCost(cardLv(id)); if (G.crowns < c) return; G.crowns -= c; G.cards[id]++; snd.play('levelup'); save(); ov.close(); cardsPanel(); toast(`${CARDS[id].n} ist jetzt Stufe ${G.cards[id]}!`); });
}

// ================= Bauen =================
function tryBuild(i) {
  if (busy) return;
  if (tut.block && tut.block !== 'build') return;
  const s = G.st[i];
  if (G.dmg[i]) {
    const c = repairCost(i);
    if (G.coins < c) { snd.play('error'); toast(`Reparatur: ${fmt(c)} Münzen`); return; }
    G.coins -= c; G.dmg[i] = 0; snd.play('build'); const p = pos(document.querySelector(`.islet[data-slot="${i}"]`)); sparks(p.x, p.y, 18, 80); floatTxt('Repariert!', p.x, p.y - 20, '#9effa0');
    save(); hud(); renderKingdom(); return;
  }
  if (s >= 5) { toast(`${BNAME[kB(KG(), i)]} ist fertig ★★★★★`); return; }
  const c = stageCost(i, s);
  if (G.coins < c) { snd.play('error'); toast(`${BNAME[kB(KG(), i)]}: ${fmt(c)} Münzen nötig`); return; }
  G.coins -= c; G.st[i]++; G.stats.built++; qAdd('build'); G.crowns += 2 + G.k;
  addXP(10 + s * 5 + G.k * 5);
  snd.play('build'); hud(); renderKingdom();
  const el = document.querySelector(`.islet[data-slot="${i}"]`); const p = pos(el);
  el.animate([{ transform: 'translate(-50%,-100%) scale(.6)', filter: 'brightness(2.5)' }, { transform: 'translate(-50%,-100%) scale(1.12)', filter: 'brightness(1.4)' }, { transform: 'translate(-50%,-100%) scale(1)', filter: 'brightness(1)' }], { duration: 650, easing: 'cubic-bezier(.3,1.5,.5,1)' });
  sparks(p.x, p.y, 26, 110); flash();
  floatTxt('★ ' + BNAME[kB(KG(), i)], p.x, p.y - 30, '#fff', 18);
  setTimeout(() => floatTxt(`+${2 + G.k} Kronen`, p.x, p.y, '#ffd25e', 16), 400);
  save(); tutNext('built');
  if (G.st.every(x => x >= 5)) setTimeout(kingdomDone, 900);
}
function buildPanel() {
  const K = KG();
  const rows = K.b.map((b0, i) => {
    const b = kB(K, i), s = G.st[i], dm = G.dmg[i];
    const c = dm ? repairCost(i) : stageCost(i, Math.min(s, 4));
    const done = s >= 5 && !dm;
    return `<div class="row"><img src="${bImg(b, Math.min(5, done ? 5 : s + 1))}" style="filter:${kF(K, i)}">
      <div class="t"><b>${BNAME[b]}</b><small>${'★'.repeat(s)}${'☆'.repeat(5 - s)}${dm ? ' · beschädigt' : ''}</small></div>
      ${done ? '<div class="mini off">Fertig</div>' : `<div class="mini ${G.coins < c ? 'off' : ''} ${dm ? 'red' : ''}" data-b="${i}">${dm ? 'Reparieren' : 'Bauen'}<br>${icon('ic_coin', 14)} ${fmt(c)}</div>`}</div>`;
  }).join('');
  const ov = panel(`<h2>${K.name} bauen</h2><p>Baue alle 5 Gebäude auf ★★★★★. Belohnung: 60 Würfe, 25 Kristalle, Kronen und ein seltenes Ei.</p><div class="list">${rows}</div>`);
  ov.querySelectorAll('[data-b]').forEach(e => e.onclick = () => { ov.close(); tryBuild(+e.dataset.b); setTimeout(() => { if (canBuildAny() && !ovStack.length && !G.st.every(x => x >= 5) && !tut.block) buildPanel(); }, 700); });
}
function addXP(n) {
  G.xp += n;
  while (G.xp >= xpNeed(G.lv)) {
    G.xp -= xpNeed(G.lv); G.lv++;
    const lv = G.lv, nb = BETS.find(b => b.lv === lv), ns = lv > 1 && (lv - 1) % 6 === 0 && maxShields() <= 5;
    setTimeout(() => {
      snd.play('levelup');
      panel(`<h2>Stufe ${lv}!</h2><img src="assets/hero.webp" style="height:190px;margin:0 auto">
        <p>Toll gemacht! Du bekommst <b>${10 + lv * 2} Würfe</b> und <b>5 Kristalle</b>.</p>
        ${nb ? `<p class="r3"><b>Neu: Einsatz ×${nb.m} freigeschaltet!</b></p>` : ''}${ns ? `<p class="r1"><b>Neu: Platz für ${maxShields()} Schilde!</b></p>` : ''}
        <div class="btn gold" data-close>Super!</div>`);
      G.rolls += 10 + lv * 2; G.gems += 5; save();
    }, 700);
  }
}
function kingdomDone() {
  snd.play('levelup'); flash();
  const next = KINGDOMS[(G.k + 1) % KINGDOMS.length];
  const unlock = Object.entries(CARDS).filter(([id, c]) => c.k === G.k + 1 && !cardLv(id));
  panel(`<h2>👑 ${KG().name} vollendet!</h2><img src="assets/hero.webp" style="height:200px;margin:0 auto">
    <p>Lia: „Wunderschön! Die Bewohner feiern dich!"</p>
    <p><b>Belohnung:</b> 60 Würfe · 25 Kristalle · ${20 + G.k * 10} Kronen · 1 seltenes Ei</p>
    ${unlock.length ? `<p class="r3"><b>Neue Karten: ${unlock.map(([, c]) => c.n).join(', ')}</b></p>` : ''}
    <div class="btn gold" data-close>Weiter nach ${next.name}</div>`, {
    onClose: () => {
      G.rolls += 60; G.gems += 25; G.crowns += 20 + G.k * 10; gainEgg(1, true);
      unlock.forEach(([id]) => G.cards[id] = 1);
      G.k++; G.st = [0, 0, 0, 0, 0]; G.dmg = [0, 0, 0, 0, 0]; save(); renderKingdom(); hud();
      banner(KG().name, '#9be7ff');
    }
  });
}

// ================= Eier & Haustiere =================
function rollRarity(min = 0) { let tot = RAR.reduce((a, r, i) => a + (i >= min ? r.w : 0), 0), x = Math.random() * tot; for (let i = min; i < RAR.length; i++) { x -= RAR[i].w; if (x < 0) return i; } return min; }
function gainEgg(min = 0, quiet = false) {
  const r = rollRarity(min);
  if (G.eggs.length >= 4) { const c = Math.round(base() * 6); G.coins += c; toast(`Brutstätte voll – Ei gegen ${fmt(c)} Münzen getauscht`); return; }
  G.eggs.push({ r, p: 0 });
  if (quiet) return;
  snd.play('egg'); flash();
  if (auto) { auto = false; setAuto(); }
  panel(`<h2>Ein Ei!</h2><img src="assets/egg_${r + 1}.webp" style="width:130px;margin:6px auto;animation:bob 1.6s infinite">
    <p class="${RAR[r].c}" style="font-size:18px"><b>${RAR[r].n}es Ei</b></p>
    <p>Es schlüpft nach <b>${RAR[r].hatch} Würfen</b>. Es liegt jetzt in deiner Brutstätte.</p><div class="btn gold" data-close>Toll!</div>`);
}
function tickEggs(n) { G.eggs.forEach(e => e.p = Math.min(RAR[e.r].hatch, e.p + n)); }
function eggPanel() {
  const slots = [0, 1, 2, 3].map(i => {
    const e = G.eggs[i];
    if (!e) return `<div class="card"><img src="assets/ic_egg.webp" style="opacity:.18;filter:grayscale(1)"><b>Frei</b><small>Eier gibt es beim Würfeln</small></div>`;
    const R = RAR[e.r], done = e.p >= R.hatch;
    return `<div class="card ${done ? 'on' : ''}" data-e="${i}"><img src="assets/egg_${e.r + 1}.webp" style="${done ? 'animation:pulse2 .8s infinite' : ''}"><b class="${R.c}">${R.n}</b>
      <div class="bar"><div style="width:${e.p / R.hatch * 100}%"></div></div>
      <small>${done ? 'Tippen zum Schlüpfen!' : `${R.hatch - e.p} Würfe`}</small>
      ${!done ? `<div class="mini" data-q="${i}" style="margin-top:4px;font-size:11px">Sofort: ${Math.ceil((R.hatch - e.p) / 4)} ${icon('ic_gem', 13)}</div>` : ''}</div>`;
  }).join('');
  const ov = panel(`<h2>Brutstätte</h2><p>Beim Würfeln findest du manchmal Eier. Jeder Wurf brütet sie weiter aus.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${slots}</div>
    <p style="font-size:12px">Chancen: Gewöhnlich 59 % · Selten 25 % · Episch 10 % · Legendär 4 % · Mythisch 1,5 %</p>`);
  ov.querySelectorAll('[data-q]').forEach(b => b.onclick = ev => {
    ev.stopPropagation(); const e = G.eggs[+b.dataset.q], c = Math.ceil((RAR[e.r].hatch - e.p) / 4);
    if (G.gems < c) { snd.play('error'); toast('Zu wenig Kristalle'); return; }
    G.gems -= c; e.p = RAR[e.r].hatch; save(); ov.close(); eggPanel();
  });
  ov.querySelectorAll('[data-e]').forEach(c => c.onclick = () => { const i = +c.dataset.e; if (G.eggs[i].p >= RAR[G.eggs[i].r].hatch) { ov.close(); hatch(i); } });
}
async function hatch(i) {
  const e = G.eggs.splice(i, 1)[0];
  const pool = PETS_OK().filter(p => p.r === e.r); const pet = pick(pool.length ? pool : PETS_OK().filter(p => p.r <= e.r));
  const had = G.pets[pet.id] || 0;
  let shinyNew = false;
  if (had >= 5 && !G.shiny[pet.id]) { G.shiny[pet.id] = 1; shinyNew = true; }
  G.pets[pet.id] = Math.min(5, had + 1); G.stats.hatched++;
  const cr = (had ? 3 + e.r * 3 : 5 + e.r * 8) + (had >= 5 && !shinyNew ? 20 : 0); G.crowns += cr;
  if (!G.active) G.active = pet.id;
  save();
  const ov = panel(`<div id="hatchBox" style="height:320px;position:relative;display:flex;align-items:center;justify-content:center">
     <img id="hEgg" src="assets/egg_${e.r + 1}.webp" style="width:150px"></div><div id="hInfo" style="display:none;text-align:center"></div>`, { onClose: false });
  const egg = ov.querySelector('#hEgg');
  for (let k = 0; k < 3; k++) { snd.play('crack'); egg.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0)' }], { duration: 380 }); await wait(520); }
  flash(); snd.play('hatch');
  const box = ov.querySelector('#hatchBox');
  box.innerHTML = `<div class="rays"></div><img class="${G.shiny[pet.id] ? 'shiny' : ''}" src="assets/pet_${pet.id}.webp" style="width:230px;position:relative;animation:pin .5s cubic-bezier(.3,1.6,.5,1)">`;
  const p = pos(box); sparks(p.x, p.y, 40, 160);
  const info = ov.querySelector('#hInfo'); info.style.display = 'block';
  info.innerHTML = `<h2 class="${RAR[e.r].c}">${pet.n}</h2><p>${pet.sp} · <span class="${RAR[e.r].c}">${RAR[e.r].n}</span></p>
    <p>${shinyNew ? '<b class="r3">✨ GOLD-FORM erreicht! Bonus doppelt!</b>' : had ? (had >= 5 ? 'Schon in Gold-Form – +20 Kronen' : `Schon im Album – <b>steigt auf Stufe ${G.pets[pet.id]}!</b>`) : '<b>Neu im Album!</b>'}<br>Bonus: +${pet.bv} % ${BTXT[pet.bt]} · +${cr} ${icon('ic_crowntok', 16)}</p>
    <div class="btn gold" id="hOk">Juhu!</div>`;
  info.querySelector('#hOk').onclick = () => { snd.play('click'); ov.close(); showPet(); };
}
function petPanel() {
  const list = PETS_OK(), n = list.filter(p => G.pets[p.id]).length;
  const card = p => { const lv = G.pets[p.id]; return `<div class="card ${lv ? '' : 'lock'} ${G.active === p.id ? 'on' : ''} ${G.shiny[p.id] ? 'gold' : ''} ${G.exp.some(x => x.id === p.id) ? 'away' : ''}" data-p="${p.id}"><img class="${G.shiny[p.id] ? 'shiny' : ''}" src="assets/pet_${p.id}.webp">
      <b>${lv ? p.n : '???'}</b><small class="${RAR[p.r].c}">${RAR[p.r].n}${lv ? ' · St. ' + lv : ''}</small>${lv ? `<small>+${p.bv} % ${BTXT[p.bt]}</small>` : ''}</div>`; };
  const sets = SETS.map((st, si) => {
    const ps = st.ids.map(id => PETS.find(p => p.id === id)).filter(p => havePet(p.id)); if (!ps.length) return '';
    const got = ps.filter(p => G.pets[p.id]).length, full = got === ps.length && ps.length === st.ids.length;
    return `<div class="setbox ${full ? 'full' : ''}"><div class="sethead"><b>${st.n}</b><span>${got} / ${st.ids.length}</span>${full && !G.sets[si] ? `<div class="mini" data-set="${si}">Belohnung holen</div>` : G.sets[si] ? '<em>✓ erledigt</em>' : `<small>Belohnung: 50 Würfe, 30 Kronen, 20 Kristalle</small>`}</div><div class="grid3">${ps.map(card).join('')}</div></div>`;
  }).join('');
  const ov = panel(`<h2>Haustier-Album</h2><div class="btn" id="goExp" style="margin:0 auto 8px;background:linear-gradient(#5fd0ff,#2a7fd6);box-shadow:0 5px 0 #154a8a">🧭 Ausflüge ${G.exp.filter(x => x.end <= Date.now()).length ? '– Beute wartet!' : `(${G.exp.length}/${expSlots()})`}</div><p>${n} / ${list.length} gesammelt. 5 gleiche ergeben die ✨ Gold-Form (doppelter Bonus). Tippe ein Haustier an, um es als Begleiter zu wählen (voller Bonus). Volles Set = große Belohnung!</p>${sets}`);
  ov.querySelectorAll('[data-p]').forEach(c => c.onclick = () => {
    const id = +c.dataset.p, p = PETS.find(x => x.id === id), lv = G.pets[id];
    if (!lv) { toast('Noch nicht geschlüpft – ' + RAR[p.r].n + 'es Ei'); return; }
    G.active = id; save(); snd.play('pop'); ov.close(); petPanel();
    toast(`${p.n}: +${Math.round(p.bv * (1 + (lv - 1) * .5))} % ${BTXT[p.bt]}`); showPet();
  });
  ov.querySelector('#goExp').onclick = () => { snd.play('click'); ov.close(); expPanel(); };
  ov.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { const si = +b.dataset.set; G.sets[si] = 1; const p = pos(b); grant({ t: 'rolls', v: 50 }, p); grant({ t: 'crowns', v: 30 }, p); grant({ t: 'gems', v: 20 }, p); snd.play('jackpot'); banner(SETS[si].n + ' komplett!'); save(); ov.close(); petPanel(); });
}
function showPet() {
  let e = $('#petOnTray');
  if (!G.active) { if (e) e.remove(); return; }
  if (!e) { e = document.createElement('img'); e.id = 'petOnTray'; e.onclick = () => { if (tut.block) return; snd.play('pop'); petPanel(); }; $('#trayWrap').appendChild(e); }
  e.src = `assets/pet_${G.active}.webp`;
}

// ================= Rivalen & Minispiele =================
const avatar = r => r.av < 4 && AV.has('rival_1') ? `assets/rival_${r.av + 1}.webp` : `assets/pet_${(r.av % 12) + 1}.webp`;
const rival = () => { const r = pick(RIVALS); return { ...r, k: Math.max(0, G.k + ri(-1, 0)), sh: Math.random() < 0.3 ? 1 : 0, st: [0, 0, 0, 0, 0].map(() => ri(1, 5)), lvl: Math.max(1, G.lv + ri(-2, 3)) }; };
let gameOpen = false;
function g2(html, cls = '') { snd.music('battle'); const g = $('#game2'); g.className = cls; g.innerHTML = `<div class="bg2"></div>${html}`; g.style.display = 'block'; gameOpen = true; focusReset(); return g; }
function g2close() { snd.music('main'); const g = $('#game2'); g.style.display = 'none'; g.innerHTML = ''; gameOpen = false; g2.fire = null; focusReset(); hud(); renderKingdom(); }
function rivalKingdomHTML(R) {
  const K = KINGDOMS[R.k % KINGDOMS.length];
  return SLOTS.map((p, i) => `<div class="islet" data-t="${i}" style="left:${p.x}%;top:${p.y * 400}px;width:${p.w}px;height:${Math.min(p.y * 400 - 10, p.w * 1.5)}px;z-index:${Math.round(p.y * 10)};animation-delay:${-i * .8}s">
    <img src="${bImg(kB(K, i), R.st[i])}" style="filter:${kF(K, i)}"><div class="tag red">${BNAME[kB(K, i)]}</div></div>`).join('');
}
async function chooseRival(title) {
  const opts = [];
  if (G.revenge.length) { const r = RIVALS.find(x => x.n === G.revenge[0]); if (r) opts.push({ ...rival(), ...r, rev: true }); }
  while (opts.length < 3) { const r = rival(); if (!opts.some(o => o.n === r.n)) opts.push(r); }
  return new Promise(res => {
    const rows = opts.map((o, i) => `<div class="row"><img src="${avatar(o)}" style="width:54px;height:54px;border-radius:50%">
      <div class="t"><b>${o.n}${o.rev ? ' <span class="red">· Rache!</span>' : ''}</b><small>Stufe ${o.lvl} · ${KINGDOMS[o.k % KINGDOMS.length].name}${o.rev ? ' · Beute ×1,5' : ''}</small></div><div class="mini red" data-o="${i}">Wählen</div></div>`).join('');
    const ov = panel(`<h2>${title}</h2><div class="list">${rows}</div>`, { onClose: false });
    ov.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { snd.play('click'); ov.close(); res(opts[+b.dataset.o]); });
  });
}
const bottomBtn = (g, txt, cls = 'gold', id = '') => { const b = document.createElement('div'); b.className = 'btn ' + cls; if (id) b.id = id; b.innerHTML = txt; b.style.cssText = 'position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:9;margin:0'; g.appendChild(b); return b; };

// ---- Angriff: Gebäude → Bereich → Zielring ----
async function attackFlow(m, mul = 1) {
  if (auto) { auto = false; setAuto(); }
  const R = await chooseRival('⚔️ Wen greifst du an?');
  if (R.rev) G.revenge = G.revenge.filter(n => n !== R.n);
  G.stats.att++; qAdd('attack');
  const K = KINGDOMS[R.k % KINGDOMS.length];
  const B = base() * m * (1 + bonus('attack')) * (R.rev ? 1.5 : 1) * mul;
  const g = g2(`<div class="steps"><span class="on">1 Gebäude wählen</span><span>2 Zielen & schießen</span></div>
    <div id="g2head"><img class="ravatar" src="${avatar(R)}"><b>Angriff auf ${R.n}!</b><small>Tippe auf das Gebäude, das du angreifen willst.</small></div>
    <div id="g2k">${rivalKingdomHTML(R)}</div>
    ${R.sh ? `<div class="shieldInfo">${icon('ic_shield', 22)} ${R.n} hat ein Schild – Leo prallt ab, Beute nur ×3</div>` : ''}`, 'attack');
  const slot = await new Promise(res => g.querySelectorAll('[data-t]').forEach(e => e.onclick = () => { snd.play('click'); res(+e.dataset.t); }));
  const b = kB(K, slot);
  const areas = AREAS[b] || AREAS._;
  const mults = [3, 5, 7, 11].sort(() => Math.random() - .5);
  g.querySelector('.steps').innerHTML = '<span class="done">1 Gebäude ✓</span><span class="on">2 Zielen & schießen</span>';
  g.querySelector('#g2head small').innerHTML = 'Ziehe Leo in der Schleuder <b>nach unten</b> und lass los!<br>Jede Zielscheibe versteckt andere Beute – die <b>goldene Mitte</b> gibt ×3.';
  g.querySelector('#g2k').innerHTML = `<div class="zoomB"><img src="${bImg(b, R.st[slot])}" style="filter:${kF(K, slot)}">
     ${areas.map((a, i) => `<div class="area" data-a="${i}" style="left:${a[1]}%;top:${a[2]}%"><i></i><span>${a[0]}<br><b>?</b></span></div>`).join('')}</div>`;
  const zb = g.querySelector('.zoomB');
  zb.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  // Schleuder mit Leo
  const sl = document.createElement('div'); sl.className = 'sling2';
  sl.innerHTML = `<svg viewBox="0 0 160 170" class="fork"><defs><linearGradient id="wd" x1="0" x2="1"><stop offset="0" stop-color="#b9783c"/><stop offset="1" stop-color="#6e3d17"/></linearGradient></defs>
    <path d="M70 170 L72 100 Q40 80 30 20" stroke="url(#wd)" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M90 170 L88 100 Q120 80 130 20" stroke="url(#wd)" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M72 100 Q80 92 88 100" stroke="url(#wd)" stroke-width="18" fill="none"/><circle cx="30" cy="20" r="11" fill="#ffd25e" stroke="#8a5a10" stroke-width="3"/><circle cx="130" cy="20" r="11" fill="#ffd25e" stroke="#8a5a10" stroke-width="3"/></svg>
    <svg class="band" viewBox="0 0 390 300"><path id="bandL" stroke="#e0364f" stroke-width="9" fill="none" stroke-linecap="round"/><path id="bandR" stroke="#e0364f" stroke-width="9" fill="none" stroke-linecap="round"/><path id="traj" stroke="#fff" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" fill="none" opacity="0"/></svg>
    <img class="leoAmmo" src="assets/lion.webp">`;
  g.appendChild(sl);
  const cross = document.createElement('div'); cross.className = 'cross'; cross.style.display = 'none'; g.appendChild(cross);
  const leo = sl.querySelector('.leoAmmo');
  const SX = 195, SY = H - 150; // Ruheposition von Leo (Mitte)
  const cs = sl.querySelectorAll('.fork circle'); const forkL = pos(cs[0]), forkR = pos(cs[1]);
  let drag = { x: 0, y: 0 }, aiming = false;
  const aimPt = () => ({ x: SX - drag.x * 2.6, y: SY - 40 - drag.y * 4.2 });
  const draw = () => {
    const lx = SX + drag.x, ly = SY + drag.y;
    leo.style.transform = `translate(${drag.x}px,${drag.y}px) rotate(${-drag.x * .15}deg) scale(${1 + drag.y / 600},${1 - drag.y / 900})`;
    const top = H - 300; // Band-SVG oben
    sl.querySelector('#bandL').setAttribute('d', `M${forkL.x} ${forkL.y - top} L${lx - 26} ${ly - top + 14}`);
    sl.querySelector('#bandR').setAttribute('d', `M${forkR.x} ${forkR.y - top} L${lx + 26} ${ly - top + 14}`);
    const a = aimPt(), tr = sl.querySelector('#traj');
    if (drag.y > 12) {
      tr.setAttribute('d', `M${lx} ${ly - top} Q${(lx + a.x) / 2} ${Math.min(ly, a.y) - 140 - top} ${a.x} ${a.y - top}`); tr.setAttribute('opacity', '.9');
      cross.style.display = 'block'; cross.style.left = a.x + 'px'; cross.style.top = a.y + 'px';
    } else { tr.setAttribute('opacity', '0'); cross.style.display = 'none'; }
  };
  draw();
  // Erste Erklärung
  if (!G.seenAtt) { const hd = document.createElement('div'); hd.className = 'dragHint'; hd.textContent = '👆'; g.appendChild(hd); setTimeout(() => hd.remove(), 4200); G.seenAtt = 1; }
  const toApp = e => { const a = app.getBoundingClientRect(), sc = a.width / 390; return { x: (e.clientX - a.left) / sc, y: (e.clientY - a.top) / sc }; };
  const shot = await new Promise(res => {
    let start = null;
    const clamp = () => { drag.y = Math.max(0, Math.min(120, drag.y)); drag.x = Math.max(-110, Math.min(110, drag.x)); };
    sl.onpointerdown = e => { start = toApp(e); aiming = true; sl.setPointerCapture(e.pointerId); snd.play('stretch', .8); const h = g.querySelector('.dragHint'); if (h) h.remove(); };
    sl.onpointermove = e => { if (!aiming) return; const p = toApp(e); drag = { x: p.x - start.x, y: p.y - start.y }; clamp(); draw(); };
    sl.onpointerup = () => { if (!aiming) return; aiming = false; if (drag.y < 25) { drag = { x: 0, y: 0 }; draw(); toast('Weiter nach unten ziehen!'); return; } res(aimPt()); };
    // Controller / Tastatur: Stick zielt, A schießt
    g2.aimPad = (ax, ay) => { drag.x = Math.max(-110, Math.min(110, drag.x + ax * 4)); drag.y = Math.max(30, Math.min(120, (drag.y || 60) + ay * 3)); draw(); };
    g2.fire = () => { if (drag.y < 25) { drag = { x: 0, y: 70 }; draw(); return; } res(aimPt()); };
  });
  g2.fire = null; g2.aimPad = null; cross.style.display = 'none'; sl.querySelector('#traj').setAttribute('opacity', '0');
  // Treffer bestimmen
  let best = -1, bd = 1e9; const aPos = [...g.querySelectorAll('.area')].map(e => pos(e));
  aPos.forEach((p, i) => { const d = Math.hypot(p.x - shot.x, p.y - shot.y); if (d < bd) { bd = d; best = i; } });
  const hit = bd < 16 ? 3 : bd < 40 ? 2 : bd < 95 ? 1 : 0;
  const tp = hit ? aPos[best] : shot;
  // Abschuss: Leo wird zum Kometen
  const pull = { ...drag };
  snd.play('launch'); snd.play('whoosh', .7); setTimeout(() => snd.play('roar', .8), 120);
  // Band schnalzt mit Überschwingen zurück
  (async () => { for (const k of [-.35, .18, -.08, 0]) { drag = { x: pull.x * k, y: pull.y * k }; draw(); await wait(45); } })();
  leo.style.opacity = 0;
  const fly = document.createElement('img'); fly.src = 'assets/leo_fly.webp'; fly.className = 'leoFly'; app.appendChild(fly);
  const lines = document.createElement('div'); lines.className = 'speedlines'; g.appendChild(lines);
  const sx = SX + pull.x, sy = SY + pull.y, cx = (sx + tp.x) / 2, cy = Math.min(sy, tp.y) - 170;
  const dur = hit === 3 ? 900 : 650;
  // Kamera fährt Richtung Ziel
  zb.style.transformOrigin = `${tp.x - pos(zb).x + 165}px ${tp.y - pos(zb).y + 180}px`;
  zb.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
  await new Promise(done => {
    const t0 = performance.now(); let lastTrail = 0, px = sx, py = sy;
    const step = now => {
      let t = Math.min(1, (now - t0) / dur);
      if (hit === 3 && t > .78 && t < .93) t = .78 + (t - .78) * .35; // Zeitlupe kurz vor dem Volltreffer
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = (1 - e) ** 2 * sx + 2 * (1 - e) * e * cx + e * e * tp.x, y = (1 - e) ** 2 * sy + 2 * (1 - e) * e * cy + e * e * tp.y;
      const ang = Math.atan2(y - py, x - px) * 180 / Math.PI - 180; // Flug-Bild schaut nach links
      const sc = 1.15 - e * .5, stretch = 1 + Math.min(.45, Math.hypot(x - px, y - py) / 30);
      fly.style.left = x + 'px'; fly.style.top = y + 'px';
      fly.style.transform = `translate(-50%,-50%) rotate(${ang}deg) scale(${sc * stretch},${sc / Math.sqrt(stretch)})`;
      if (now - lastTrail > 16) { lastTrail = now; trail(x, y, sc); }
      px = x; py = y;
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  lines.remove();
  fly.style.left = tp.x + 'px'; fly.style.top = tp.y + 'px';
  if (hit) { // Treffer-Stopp: Bild friert kurz ein, weißer Blitz, Schockwelle, Comic-Schrift
    const wf = document.createElement('div'); wf.className = 'whiteframe'; app.appendChild(wf); setTimeout(() => wf.remove(), 110);
    await wait(hit === 3 ? 140 : 70);
    const sw = document.createElement('div'); sw.className = 'shockwave'; sw.style.left = tp.x + 'px'; sw.style.top = tp.y + 'px'; app.appendChild(sw); setTimeout(() => sw.remove(), 700);
    if (!(R.sh)) { const cw = document.createElement('div'); cw.className = 'comic'; cw.textContent = hit === 3 ? 'KAWUMM!' : hit === 2 ? 'BAMM!' : 'PLONK!'; cw.style.left = tp.x + 'px'; cw.style.top = (tp.y - 70) + 'px'; app.appendChild(cw); setTimeout(() => cw.remove(), 1100); }
  }
  zb.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 900, delay: 900, easing: 'ease-out', fill: 'forwards' });
  let gain, msg;
  fly.style.transform = 'translate(-50%,-50%)';
  if (R.sh && hit) {
    fly.src = 'assets/leo_pout.webp'; snd.play('block');
    const bub = document.createElement('div'); bub.className = 'bubble'; bub.style.left = (tp.x - 90) + 'px'; bub.style.top = (tp.y - 90) + 'px'; app.appendChild(bub); setTimeout(() => bub.remove(), 1300);
    // Leo prallt ab und fällt runter
    await new Promise(r => fly.animate([{ transform: 'translate(-50%,-50%) scale(1.3,.6)' }, { transform: 'translate(-50%,-50%) translate(60px,-90px) rotate(-200deg) scale(.8)' }, { transform: 'translate(-50%,-50%) translate(120px,420px) rotate(-540deg) scale(.7)' }], { duration: 1100, easing: 'cubic-bezier(.3,0,.7,1)' }).onfinish = r);
    gain = Math.round(B * 3); msg = `Boing! Das Schild von ${R.n} hat Leo abprallen lassen.`;
  } else if (!hit) {
    fly.src = 'assets/leo_pout.webp'; snd.play('land'); floatTxt('Daneben!', tp.x, tp.y - 30, '#fff', 26);
    await new Promise(r => fly.animate([{ transform: 'translate(-50%,-50%) scale(.7)' }, { transform: 'translate(-50%,-50%) translateY(500px) rotate(300deg) scale(.6)' }], { duration: 800, easing: 'ease-in' }).onfinish = r);
    gain = Math.round(B * 2); msg = 'Daneben! Leo hat nur ein paar Münzen aufgesammelt.';
  } else {
    if (hit === 3) { flash(); banner('VOLLTREFFER ×3!', '#ffd25e'); }
    fly.src = 'assets/leo_flat.webp'; snd.play('boom'); shake(g);
    // Leo platscht flach, Gebäude wackelt, Trümmer und Staub
    fly.animate([{ transform: 'translate(-50%,-50%) scale(1.5,.45)' }, { transform: 'translate(-50%,-50%) scale(.8,1.2)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, easing: 'ease-out' });
    zb.querySelector('img').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg) scale(.97)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(0)' }], { duration: 600 });
    zb.querySelector('img').style.filter = 'grayscale(.5) brightness(.8)';
    const bm = document.createElement('div'); bm.className = 'boom'; bm.style.left = tp.x + 'px'; bm.style.top = tp.y + 'px'; app.appendChild(bm); setTimeout(() => bm.remove(), 650);
    debris(tp.x, tp.y, 16); dust(tp.x, tp.y + 20);
    gain = Math.round(B * mults[best] * hit);
    msg = hit === 3 ? `VOLLTREFFER auf ${areas[best][0]}! ×3` : `Treffer auf ${areas[best][0]}! ×2`;
    if (hit === 1) msg = `Gestreift: ${areas[best][0]}`;
    await wait(380);
    // Leo sieht Sterne und rutscht runter
    const st = document.createElement('div'); st.className = 'dizzy'; st.innerHTML = '<i>★</i><i>★</i><i>★</i>'; st.style.left = tp.x + 'px'; st.style.top = (tp.y - 46) + 'px'; app.appendChild(st);
    fly.animate([{ transform: 'translate(-50%,-50%) rotate(-8deg)' }, { transform: 'translate(-50%,-50%) rotate(8deg)' }], { duration: 300, iterations: 4, direction: 'alternate' });
    coinFountain(tp.x, tp.y, Math.min(20, 6 + hit * 4));
    await wait(1300); st.remove();
    await new Promise(r => fly.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(-50%,-50%) translateY(460px) rotate(25deg)' }], { duration: 700, easing: 'ease-in' }).onfinish = r);
  }
  fly.remove();
  g.querySelectorAll('.area').forEach((e, i) => { e.querySelector('span').innerHTML = `${areas[i][0]}<br><b>${fmt(B * mults[i])}</b>`; if (i === best && hit) e.classList.add('hitA'); });
  G.coins += gain; evAdd(15, m); if (hit) bossHit(hit); save();
  g.querySelector('.steps').remove(); sl.remove();
  g.querySelector('#g2head small').innerHTML = `${msg}<br>Beute: <b>${fmt(gain)}</b> Münzen`;
  const ok = bottomBtn(g, `${fmt(gain)} einsammeln`, 'gold', 'g2ok');
  snd.play('coins');
  await new Promise(r => { ok.onclick = r; g2.fire = r; });
  flyCoins(12, pos(ok)); snd.play('click'); g2close(); tutNext('attackDone');
}
function trail(x, y, sc) {
  const e = document.createElement('div'); e.className = 'trail'; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = e.style.height = (58 * sc) + 'px'; app.appendChild(e);
  e.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: .9 }, { transform: `translate(calc(-50% + ${rnd(-12, 12)}px),calc(-50% + ${rnd(-12, 12)}px)) scale(.2)`, opacity: 0 }], { duration: 520, easing: 'ease-out' }).onfinish = () => e.remove();
  if (Math.random() < .7) { const s = document.createElement('div'); s.className = 'trailstar'; s.textContent = '✦'; s.style.left = x + rnd(-18, 18) + 'px'; s.style.top = y + rnd(-18, 18) + 'px'; app.appendChild(s); s.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.3) rotate(180deg)' }], { duration: 600 }).onfinish = () => s.remove(); }
}
function debris(x, y, n) {
  for (let i = 0; i < n; i++) {
    const e = document.createElement('div'); e.className = 'debris';
    e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.background = pick(['#9a6a3a', '#c9a06a', '#7a7a8a', '#d8c8a8']);
    app.appendChild(e);
    const a = rnd(-Math.PI, 0), v = rnd(80, 190);
    e.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v}px) rotate(${rnd(-300, 300)}deg)`, offset: .45 }, { transform: `translate(${Math.cos(a) * v * 1.4}px,${Math.sin(a) * v + 260}px) rotate(${rnd(-600, 600)}deg)`, opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.2,.6,.6,1)' }).onfinish = () => e.remove();
  }
}
function dust(x, y) {
  for (let i = 0; i < 7; i++) {
    const e = document.createElement('div'); e.className = 'dust'; e.style.left = x + 'px'; e.style.top = y + 'px'; app.appendChild(e);
    const dx = rnd(-70, 70);
    e.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: .9 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% - ${rnd(10, 40)}px)) scale(${rnd(1.2, 2)})`, opacity: 0 }], { duration: 900 }).onfinish = () => e.remove();
  }
}
function coinFountain(x, y, n) {
  for (let i = 0; i < n; i++) {
    const e = document.createElement('img'); e.src = 'assets/ic_coin.webp'; e.className = 'coinfx'; e.style.left = (x - 15) + 'px'; e.style.top = (y - 15) + 'px'; app.appendChild(e);
    const dx = rnd(-110, 110), up = rnd(90, 200);
    setTimeout(() => snd.play('coin', .35, 1 + Math.random() * .3), i * 40);
    e.animate([{ transform: 'translate(0,0) scale(.5)' }, { transform: `translate(${dx * .5}px,${-up}px) scale(1) rotateY(360deg)`, offset: .4 }, { transform: `translate(${dx}px,${120}px) scale(.8) rotateY(720deg)`, opacity: 0 }], { duration: 1100 + i * 30, delay: i * 25, easing: 'cubic-bezier(.2,.7,.5,1)' }).onfinish = () => e.remove();
  }
}

// ---- Raub: großer Würfel, bis die Bombe kommt ----
async function stealFlow(m) {
  const R = await chooseRival('💰 Bei wem willst du rauben?');
  G.stats.raid++;
  const B = base() * m * (1 + bonus('steal')) * cardMul('steal');
  const max = Math.round(B * 40);
  const faces = [{ v: 2 }, { v: 3 }, { v: 4 }, { v: 6 }, { v: 8 }, { bomb: 1 }];
  const g = g2(`<div id="g2head"><img class="ravatar" src="${avatar(R)}"><b>Raub bei ${R.n}</b><small>Würfle Münzen aus der Schatzkammer – Vorsicht vor der Bombe!</small></div>
   <div class="vault"><img src="assets/ic_chest.webp"><div class="bar big"><div id="stBar"></div></div><div id="stTxt">0 / ${fmt(max)}</div></div>
   <div class="bigdie" id="bd">${icon('ic_coin', 70)}</div>
   <div class="facesRow">${faces.map(f => `<div>${f.bomb ? icon('ic_bomb', 30) : icon('ic_coin', 24)}<small>${f.bomb ? 'Ende' : '×' + f.v}</small></div>`).join('')}</div>`, 'steal');
  const go = bottomBtn(g, 'Würfeln!', 'gold', 'stGo');
  let sum = 0, done = false, n = 0; const bd = g.querySelector('#bd');
  while (!done) {
    await new Promise(r => { go.onclick = r; g2.fire = r; });
    g2.fire = null; snd.play('roll'); go.classList.add('off');
    bd.classList.remove('rolling'); void bd.offsetWidth; bd.classList.add('rolling');
    for (let i = 0; i < 8; i++) { const f = pick(faces); bd.innerHTML = f.bomb ? icon('ic_bomb', 70) : `${icon('ic_coin', 50)}<b>×${f.v}</b>`; await wait(70 + i * 12); }
    const f = n++ === 0 ? faces[ri(0, 4)] : pick(faces);
    bd.innerHTML = f.bomb ? icon('ic_bomb', 70) : `${icon('ic_coin', 50)}<b>×${f.v}</b>`;
    const p = pos(bd);
    if (f.bomb) { snd.play('bomb'); shake(g); sparks(p.x, p.y, 30, 120); done = true; g.querySelector('#g2head small').textContent = 'BUMM! Die Bombe beendet den Raub – deine Beute bleibt.'; }
    else {
      const add = Math.min(max - sum, Math.round(B * f.v)); sum += add; snd.play('coins', .6); floatTxt('+' + fmt(add), p.x, p.y - 50);
      if (sum >= max) { done = true; banner('PERFEKTER RAUB!', '#ffd25e'); snd.play('jackpot'); }
    }
    g.querySelector('#stBar').style.width = (sum / max * 100) + '%'; g.querySelector('#stTxt').textContent = `${fmt(sum)} / ${fmt(max)}`;
    go.classList.remove('off');
  }
  G.coins += sum; evAdd(12, m); save();
  go.innerHTML = `${fmt(sum)} einsammeln`;
  await new Promise(r => { go.onclick = r; g2.fire = r; });
  flyCoins(12, { x: 195, y: 300 }); snd.play('click'); g2close(); tutNext('stealDone');
}

// ---- Beutezug: sicherer Weg durchs Fallenfeld ----
async function raidFlow(m) {
  const R = await chooseRival('🗺️ Wessen Schatzweg plünderst du?');
  G.stats.raid++;
  const B = base() * m * (1 + bonus('steal')) * cardMul('raid');
  const rows = 4;
  const traps = Array.from({ length: rows }, (_, r) => r === 0 ? -1 : ri(0, 2)); // erste Reihe ist immer sicher
  const vals = [3, 5, 8, 12].map(v => Math.round(B * v));
  const g = g2(`<div id="g2head"><img class="ravatar" src="${avatar(R)}"><b>Beutezug bei ${R.n}</b><small>Wähle in jeder Reihe ein Feld. Ab Reihe 2 versteckt sich eine Falle!</small></div>
   <div class="path"><div class="goal">${icon('ic_chest', 54)}<b>Ziel: Beute ×2</b></div>${Array.from({ length: rows }, (_, r) => `<div class="prow" data-r="${rows - 1 - r}">${[0, 1, 2].map(c => `<div class="tile" data-c="${c}"><img src="assets/ic_card.webp"></div>`).join('')}<em>${fmt(vals[rows - 1 - r])}</em></div>`).join('')}</div>
   <div id="g2btm"><b id="rsum">0</b> Münzen</div>`, 'raid');
  let sum = 0, row = 0, alive = true;
  const mark = () => g.querySelectorAll('.prow').forEach(p => p.classList.toggle('act', +p.dataset.r === row && alive));
  mark(); focusReset();
  while (alive && row < rows) {
    const c = await new Promise(res => g.querySelectorAll(`.prow[data-r="${row}"] .tile`).forEach(t => t.onclick = () => res(+t.dataset.c)));
    const rowEl = g.querySelector(`.prow[data-r="${row}"]`);
    rowEl.querySelectorAll('.tile').forEach((t, i) => { t.classList.add('open'); t.innerHTML = i === traps[row] ? icon('ic_bomb', 40) : icon('ic_coin', 34); if (i !== c) t.style.opacity = .45; });
    const p = pos(rowEl.querySelectorAll('.tile')[c]);
    if (c === traps[row]) { alive = false; snd.play('bomb'); shake(g); sparks(p.x, p.y, 24, 90); g.querySelector('#g2head small').textContent = 'Falle! Der Beutezug ist vorbei – deine Beute bleibt.'; }
    else { sum += vals[row]; snd.play('coins', .7); floatTxt('+' + fmt(vals[row]), p.x, p.y - 20); row++; }
    g.querySelector('#rsum').textContent = fmt(sum); mark(); focusReset();
  }
  if (alive) { sum *= 2; banner('SCHATZ ERREICHT ×2!', '#ffd25e'); snd.play('jackpot'); g.querySelector('#rsum').textContent = fmt(sum); }
  G.coins += sum; evAdd(12, m); save();
  const ok = bottomBtn(g, 'Einsammeln');
  await new Promise(r => { ok.onclick = r; g2.fire = r; });
  flyCoins(12, { x: 195, y: 360 }); snd.play('click'); g2close();
}

// ---- Duell: Schere, Stein, Papier (best of 3) ----
async function fightFlow(m) {
  const R = await chooseRival('✊ Wen forderst du zum Duell?');
  const B = base() * m * cardMul('fight');
  const H3 = [['rock', 'Stein'], ['paper', 'Papier'], ['scissors', 'Schere']];
  const hi = k => AV.has('ic_' + k) ? icon('ic_' + k, 64) : `<span style="font-size:54px">${{ rock: '✊', paper: '✋', scissors: '✌️' }[k]}</span>`;
  const g = g2(`<div id="g2head"><img class="ravatar" src="${avatar(R)}"><b>Duell gegen ${R.n}</b><small>Wer zuerst 2 Runden gewinnt!</small></div>
    <div class="duel"><div class="side2"><img src="assets/${G.avatar}.webp"><small>${myName()}</small><b id="sMe">0</b></div><div class="vs">VS</div><div class="side2"><img src="${avatar(R)}"><b id="sOp">0</b></div></div>
    <div class="duelShow"><div id="dMe">?</div><div id="dOp">?</div></div>
    <div class="duelPick">${H3.map(([k, n], i) => `<div class="tile" data-h="${i}">${hi(k)}<b>${n}</b></div>`).join('')}</div>`, 'fight');
  let me = 0, op = 0;
  while (me < 2 && op < 2) {
    const h = await new Promise(res => g.querySelectorAll('[data-h]').forEach(t => t.onclick = () => res(+t.dataset.h)));
    snd.play('click');
    const o = ri(0, 2);
    const dm = g.querySelector('#dMe'), dO = g.querySelector('#dOp');
    for (let i = 0; i < 3; i++) { dm.innerHTML = hi('rock'); dO.innerHTML = hi('rock'); [dm, dO].forEach(x => x.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }], { duration: 250 })); snd.play('land', .5); await wait(280); }
    dm.innerHTML = hi(H3[h][0]); dO.innerHTML = hi(H3[o][0]);
    const w = (h - o + 3) % 3;
    if (w === 1) { me++; snd.play('coin'); floatTxt('Gewonnen!', 110, 400, '#9effa0'); }
    else if (w === 2) { op++; snd.play('error'); floatTxt('Verloren', 280, 400, '#ff9a8a'); }
    else floatTxt('Unentschieden', 195, 400, '#fff');
    g.querySelector('#sMe').textContent = me; g.querySelector('#sOp').textContent = op;
    await wait(500);
  }
  const win = me === 2, gain = Math.round(B * (win ? 25 : 4));
  G.coins += gain; save();
  if (win) { banner('DUELL GEWONNEN!', '#9effa0'); snd.play('win'); } else snd.play('lose');
  const ok = bottomBtn(g, `${fmt(gain)} einsammeln`);
  await new Promise(r => { ok.onclick = r; g2.fire = r; });
  flyCoins(10, { x: 195, y: 360 }); g2close();
}

function hitYou(name) {
  if (G.shields > 0) { G.shields--; return { n: name, blocked: true }; }
  const built = G.st.map((s, i) => s > 0 && !G.dmg[i] ? i : -1).filter(i => i >= 0);
  if (!G.revenge.includes(name)) G.revenge.unshift(name); G.revenge = G.revenge.slice(0, 5);
  if (!built.length) { const c = Math.round(Math.min(G.coins * 0.1, base() * 8)); G.coins -= c; return { n: name, coins: c }; }
  const i = pick(built); G.dmg[i] = 1;
  return { n: name, slot: i };
}
async function rivalAttacksYou() {
  if (auto) { auto = false; setAuto(); }
  const R = pick(RIVALS); const r = hitYou(R.n); leoMood(r.blocked ? 'cheer' : 'pout', 2500);
  G.log.unshift(r.blocked ? `${r.n}: abgewehrt` : r.slot !== undefined ? `${r.n}: ${BNAME[kB(KG(), r.slot)]} beschädigt` : `${r.n}: ${fmt(r.coins)} Münzen geklaut`); G.log = G.log.slice(0, 10);
  snd.play(r.blocked ? 'block' : 'boom');
  if (!r.blocked) shake();
  renderKingdom();
  await new Promise(res => panel(`<h2>${r.blocked ? '🛡️ Abgewehrt!' : '💥 Angriff!'}</h2><img src="${avatar(R)}" style="width:100px;margin:0 auto;border-radius:50%">
    <p><b>${R.n}</b> hat dich angegriffen.</p>
    <p>${r.blocked ? 'Dein Schild hat alles abgewehrt!' : r.slot !== undefined ? `Dein ${BNAME[kB(KG(), r.slot)]} wurde beschädigt. Repariere es im Baumenü.` : `${fmt(r.coins)} Münzen wurden geklaut.`}</p>
    ${r.blocked ? '' : '<p class="red">Würfle drei Schwerter – dann kannst du dich rächen (Beute ×1,5)!</p>'}
    <div class="btn" data-close>OK</div>`, { onClose: res }));
}
function rivalsPanel() {
  const rows = RIVALS.map(r => `<div class="row"><img src="${avatar(r)}" style="width:48px;height:48px;border-radius:50%"><div class="t"><b>${r.n}</b><small>${G.revenge.includes(r.n) ? '<span class="red">hat dich angegriffen – Rache offen</span>' : 'Rivale'}</small></div></div>`).join('');
  const log = G.log.slice(0, 6).map(l => `<small style="display:block;color:#d8c9ff">• ${l}</small>`).join('');
  panel(`<h2>Rivalen</h2><p>Drei ${icon('ic_swords', 18)} = Angriff. Drei ${icon('ic_card', 18)} = Karte (Raub, Beutezug, Duell …). Schilde ${icon('ic_shield', 18)} schützen dich.</p>${log ? `<h3>Letzte Angriffe</h3>${log}` : ''}<div class="list">${rows}</div>`);
}

// ================= Event =================
function evCheck() {
  if (Date.now() > G.ev.end) {
    G.ev = { id: (G.ev.id || 0) + 1, end: Date.now() + 2 * 864e5, pts: 0, got: 0, bots: RIVALS.slice().sort(() => Math.random() - .5).slice(0, 9).map(r => ({ n: r.n, av: r.av, p: 0, sp: rnd(.4, 1.6) })) };
  }
  const el = (Date.now() - (G.ev.end - 2 * 864e5)) / 3600e3;
  G.ev.bots.forEach(b => b.p = Math.round((el + 2) * 35 * b.sp));
}
function evAdd(p, m) { evCheck(); const before = G.ev.pts; G.ev.pts += p * Math.min(m, 10); const i = EV_MS.findIndex(x => before < x && G.ev.pts >= x); if (i >= 0) setTimeout(() => toast(`🏆 Event-Meilenstein ${i + 1} erreicht! Belohnung abholen.`, 2600), 1200); }
function eventPanel() {
  evCheck(); snd.music('event'); setTimeout(() => { const o = ovStack[ovStack.length - 1]; if (o) { const c = o.close; o.close = () => { c(); snd.music('main'); }; } }, 0);
  const cur = G.ev.pts, h = Math.max(0, Math.ceil((G.ev.end - Date.now()) / 3600e3));
  const ms = EV_MS.map((m, i) => { const ok = cur >= m, got = G.ev.got > i; return `<div class="ms ${ok ? 'ok' : ''} ${got ? 'got' : ''}">${icon(rwIcon(EV_RW[i]), 30)}<small>${rwLabel(EV_RW[i])}</small><b>${m}</b>${ok && !got ? `<div class="mini" data-ms="${i}">Holen</div>` : got ? '<em>✓</em>' : ''}</div>`; }).join('');
  const lb = [...G.ev.bots, { n: myName(), av: -1, p: cur, me: 1 }].sort((a, b) => b.p - a.p);
  const rank = lb.findIndex(x => x.me) + 1;
  bossCheck(); const bp = G.boss.hp / G.boss.max;
  const ov = panel(`<div class="boss"><img src="assets/${AV.has('boss') ? 'boss' : 'ic_swords'}.webp" class="${G.boss.hp ? 'bossfloat' : 'bossdown'}"><div class="t"><b>Wolkengeist-Jagd</b><small>Alle Dreier treffen ihn, drei Schwerter und Angriffs-Treffer besonders hart. Noch ${Math.max(0, Math.ceil((G.boss.end - Date.now()) / 864e5))} Tage.</small><div class="evbar boss"><div style="width:${bp * 100}%"></div><span>${G.boss.hp} / ${G.boss.max} LP</span></div>
   <div class="bms">${[.75, .5, .25, 0].map((t, i) => `<i class="${G.boss.got > i ? 'got' : bp <= t ? 'ok' : ''}">${icon('ic_chest', 22)}</i>`).join('')}</div>${G.boss.hp <= G.boss.max * [.75, .5, .25, 0][Math.min(3, G.boss.got)] && G.boss.got < 4 ? '<div class="mini" id="bossRw">Truhe holen</div>' : ''}</div></div>
   <h2>🏆 Sternenfest</h2><p>Punkte gibt es für jeden Dreier, Angriff und Raub (mal Einsatz). Noch <b>${h} Std</b>.</p>
   <div class="evbar"><div style="width:${Math.min(100, cur / EV_MS[EV_MS.length - 1] * 100)}%"></div><span>${cur} Punkte</span></div>
   <div class="mslist">${ms}</div>
   <h3>Rangliste – du bist Platz ${rank}</h3><div class="list">${lb.slice(0, 10).map((x, i) => `<div class="row lb ${x.me ? 'me' : ''}"><b class="rk">${i + 1}</b><img src="${x.me ? `assets/${G.avatar}.webp` : avatar(x)}"><div class="t"><b>${x.n}</b></div><b>${x.p}</b></div>`).join('')}</div>
   <p class="tip">Am Ende bekommen die Plätze 1–3 große Truhen mit Würfeln und Eiern.</p>`);
  const br = ov.querySelector('#bossRw'); if (br) br.onclick = () => { const i = G.boss.got; G.boss.got++; save(); ov.close(); openChest([0, 1, 1, 2][i]); if (i === 3) { gainEgg(2, true); toast('Bonus: ein episches Ei!'); } };
  ov.querySelectorAll('[data-ms]').forEach(b => b.onclick = () => { const i = +b.dataset.ms; for (let k = G.ev.got; k <= i; k++) grant(EV_RW[k], pos(b)); G.ev.got = i + 1; snd.play('jackpot'); save(); ov.close(); eventPanel(); });
}

// ================= Glücksrad & Tagesbonus =================
function wheelPanel() {
  const ready = Date.now() >= G.wheelT, seg = 360 / WHEEL.length;
  const cols = ['#7b4ce0', '#ff8ab8', '#4aa3ff', '#ffb648', '#7ee36a', '#e05ce0', '#4ad1c8', '#ff6b6b'];
  const grad = WHEEL.map((w, i) => `${cols[i]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const items = WHEEL.map((w, i) => `<div class="wseg" style="transform:rotate(${(i + .5) * seg}deg)"><div><img src="assets/${w.ic}.webp"><b>${w.l}</b></div></div>`).join('');
  const ov = panel(`<h2>Glücksrad</h2><div style="position:relative"><div id="wheelPin"></div>
    <div id="wheel" style="background:conic-gradient(${grad})">${items}<div class="hub"></div></div></div>
    <div class="btn gold ${ready ? '' : 'off'}" id="spin">${ready ? 'Drehen!' : 'Wieder in ' + hm(G.wheelT - Date.now())}</div>`);
  const btn = ov.querySelector('#spin');
  btn.onclick = async () => {
    if (!ready || btn.dataset.done) return; btn.dataset.done = 1;
    btn.classList.add('off'); ov.querySelector('[data-close]').style.display = 'none';
    const k = ri(0, WHEEL.length - 1), w = WHEEL[k];
    const deg = 360 * 6 + (360 - (k + .5) * seg) + rnd(-seg * .3, seg * .3);
    const wh = ov.querySelector('#wheel'); wh.style.transform = `rotate(${deg}deg)`;
    for (let i = 0; i < 28; i++) setTimeout(() => snd.play('wheel'), 4200 * (1 - Math.pow(1 - i / 28, .45)));
    await wait(4400);
    G.wheelT = Date.now() + 8 * 3600e3; qAdd('wheel');
    const p = pos(wh); sparks(p.x, p.y, 30, 140); snd.play('jackpot');
    if (w.t === 'egg') { save(); ov.close(); gainEgg(); return; }
    const got = grant(w, p);
    btn.textContent = 'Gewonnen: ' + got; save(); hud();
    ov.querySelector('[data-close]').style.display = '';
  };
}
const hm = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} Std ${m % 60} Min` : `${m} Min`; };

// ================= Profil =================
const FRAMES = [['Gold', '#ffd25e'], ['Rosé', '#ff8ab8'], ['Minze', '#7ee3b0'], ['Himmel', '#7fc8ff'], ['Amethyst', '#b78bff'], ['Feuer', '#ff7a3c']];
const AVATARS = () => [
  { id: 'hero_face', n: 'Lia', ok: true }, { id: 'rival_1', n: 'Ritter', ok: true }, { id: 'rival_2', n: 'Hexe', ok: true },
  { id: 'rival_3', n: 'Elfe', ok: true }, { id: 'rival_4', n: 'Zwergin', ok: true }, { id: 'lion', n: 'Leo', ok: true },
  ...PETS.map(p => ({ id: 'pet_' + p.id, n: p.n, ok: !!G.pets[p.id], hint: 'Schlüpft aus einem ' + RAR[p.r].n.toLowerCase() + 'en Ei' })),
];
const myName = () => G.name || 'Du';
function applyProfile() {
  const a = $('#avBtn img'); a.src = `assets/${G.avatar}.webp`;
  a.style.objectPosition = G.avatar === 'hero_face' ? '50% 18%' : '50% 30%';
  $('#avBtn').style.setProperty('--fc', FRAMES[G.frame || 0][1]);
}
function profilePanel(first = false) {
  let sel = G.avatar, fr = G.frame || 0;
  const pets = Object.keys(G.pets).length;
  const ov = panel(`<h2>${first ? 'Dein Profil' : 'Mein Profil'}</h2>
    ${first ? '<p>Wie heißt du, Zauberin oder Zauberer? Such dir auch ein Bild aus.</p>' : ''}
    <div class="prof"><div class="pav" id="pAv" style="--fc:${FRAMES[fr][1]}"><img src="assets/${sel}.webp"></div>
      <div class="pin"><input id="pName" maxlength="14" placeholder="Dein Name" value="${(G.name || '').replace(/"/g, '')}" autocomplete="off">
      <small>Stufe ${G.lv} · ${G.stats.rolls} Würfe · ${G.stats.att} Angriffe · ${pets} Haustiere · Königreich ${G.k + 1}</small></div></div>
    <h3>Bild</h3><div class="avgrid">${AVATARS().map(a => `<div class="avc ${a.ok ? '' : 'lock'} ${a.id === sel ? 'on' : ''}" data-av="${a.id}" title="${a.ok ? a.n : a.hint}"><img src="assets/${a.id}.webp"><small>${a.ok ? a.n : '🔒'}</small></div>`).join('')}</div>
    <h3>Rahmen</h3><div class="frgrid">${FRAMES.map((f, i) => `<div class="frc ${i === fr ? 'on' : ''}" data-fr="${i}" style="--fc:${f[1]}"><i></i><small>${f[0]}</small></div>`).join('')}</div>
    <h3>Würfel</h3><div class="skgrid">${SKINS.map((k, i) => { const ok = skinOk(i); return `<div class="skc ${i === (G.skin || 0) ? 'on' : ''} ${ok ? '' : 'lock'}" data-sk="${i}"><i style="background:linear-gradient(135deg,${k.t[0].a},${k.t[0].b} 60%,${k.t[1].b})"></i><small>${k.n}</small><small class="r3">${ok ? '' : SKIN_REQ[i][1]}</small></div>`; }).join('')}</div>
    <div class="btn gold" id="pSave">Speichern</div>${first ? '' : '<div class="btn" id="pMenu" style="background:linear-gradient(#8f6bff,#4b2f9e);box-shadow:0 5px 0 #23125a">Einstellungen</div>'}`, { onClose: first ? false : undefined });
  const inp = ov.querySelector('#pName');
  ov.querySelectorAll('[data-av]').forEach(c => c.onclick = () => {
    const a = AVATARS().find(x => x.id === c.dataset.av);
    if (!a.ok) { snd.play('error'); toast(a.hint); return; }
    sel = a.id; snd.play('pop'); ov.querySelectorAll('.avc').forEach(x => x.classList.toggle('on', x === c)); ov.querySelector('#pAv img').src = `assets/${sel}.webp`;
  });
  ov.querySelectorAll('[data-fr]').forEach(c => c.onclick = () => { fr = +c.dataset.fr; snd.play('click'); ov.querySelectorAll('.frc').forEach(x => x.classList.toggle('on', x === c)); ov.querySelector('#pAv').style.setProperty('--fc', FRAMES[fr][1]); });
  ov.querySelectorAll('[data-sk]').forEach(c => c.onclick = () => {
    const i = +c.dataset.sk;
    if (!skinOk(i)) { if (G.gems >= 80) { G.gems -= 80; G.skins[i] = 1; snd.play('levelup'); toast(SKINS[i].n + ' freigeschaltet!'); } else { snd.play('error'); toast(SKIN_REQ[i][1] + ' – oder 80 Kristalle'); return; } }
    G.skin = i; dice.setSkin(SKINS[i].t); save(); snd.play('pop'); ov.querySelectorAll('.skc').forEach(x => x.classList.toggle('on', x === c)); c.classList.remove('lock'); c.querySelector('.r3').textContent = '';
  });
  ov.querySelector('#pSave').onclick = () => {
    const n = inp.value.replace(/[<>&"]/g, '').trim().slice(0, 14);
    if (!n) { snd.play('error'); toast('Bitte gib einen Namen ein'); inp.focus(); return; }
    G.name = n; G.avatar = sel; G.frame = fr; save(); applyProfile(); snd.play('levelup'); ov.close(); toast(`Hallo, ${n}!`); tutNext('profile');
  };
  const m = ov.querySelector('#pMenu'); if (m) m.onclick = () => { ov.close(); menuPanel(); };
  if (first) setTimeout(() => inp.focus(), 300);
}

// ================= Tagesaufgaben & Truhen =================
function qCheck() {
  if (G.q.day === today()) return;
  const pool = QUESTS.slice().sort(() => Math.random() - .5).slice(0, 3);
  G.q = { day: today(), bonus: 0, list: pool.map((q, i) => { const x = pick(q.x); return { k: q.k, t: q.n.replace('{x}', x), x, p: 0, chest: i === 2 ? 1 : 0, got: 0 }; }) };
}
function qAdd(k, n = 1) {
  if (G.tut < 9) return; qCheck();
  for (const q of G.q.list) if (q.k === k && q.p < q.x) { q.p = Math.min(q.x, q.p + n); if (q.p >= q.x) setTimeout(() => toast(`✅ Aufgabe geschafft: ${q.t}`, 2600), 900); }
}
async function openChest(ci) {
  const C = CHESTS[ci];
  const ov = panel(`<div style="height:250px;position:relative;display:flex;align-items:center;justify-content:center"><div class="rays"></div><img id="chImg" src="assets/ic_chest.webp" style="width:170px;position:relative;filter:${C.f}"></div><h2>${C.n}</h2><div id="chR" class="chr"></div>`, { onClose: false });
  const im = ov.querySelector('#chImg');
  for (let k = 0; k < 3; k++) { snd.play('crack', .6); im.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-8deg) scale(1.05)' }, { transform: 'rotate(8deg) scale(1.08)' }, { transform: 'rotate(0) scale(1)' }], { duration: 350 }); await wait(420); }
  flash(); snd.play('jackpot'); const p = pos(im); sparks(p.x, p.y, 36, 150);
  im.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1.1)' }], { duration: 400, fill: 'forwards' });
  const out = []; for (const rw of C.rw) out.push(`<div>${icon(rwIcon(rw), 34)}<b>${grant(rw, p)}</b></div>`);
  if (ci === 1 && Math.random() < .25) { gainEgg(0, true); out.push(`<div>${icon('ic_egg', 34)}<b>Ei</b></div>`); }
  ov.querySelector('#chR').innerHTML = out.join('') + '<div class="btn gold" id="chOk" style="grid-column:1/-1">Super!</div>';
  ov.querySelector('#chOk').onclick = () => { snd.play('click'); ov.close(); save(); hud(); };
}
function dailyPanel() {
  qCheck();
  const ready = G.day.last !== today();
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const n = ready ? (G.day.last === yest ? G.day.n % 7 : 0) : (G.day.n - 1) % 7;
  const days = DAILY.map((d, i) => `<div class="day ${i < n || (!ready && i === n) ? 'got' : ''} ${ready && i === n ? 'now' : ''}"><small>Tag ${i + 1}</small>${icon(rwIcon(d), 30)}<b>${rwLabel(d)}</b></div>`).join('');
  const qs = G.q.list.map((q, i) => `<div class="row q"><img src="assets/ic_chest.webp" style="width:44px;height:44px;filter:${CHESTS[q.chest].f}"><div class="t"><b>${q.t}</b><div class="bar"><div style="width:${q.p / q.x * 100}%"></div></div><small>${q.p} / ${q.x} · ${CHESTS[q.chest].n}</small></div>${q.got ? '<em class="okm">✓</em>' : `<div class="mini ${q.p < q.x ? 'off' : ''}" data-q="${i}">Öffnen</div>`}</div>`).join('');
  const all = G.q.list.every(q => q.got);
  const ov = panel(`<h2>Täglich</h2><h3>Tagesbonus</h3><div class="days">${days}</div>
    <div class="btn gold ${ready ? '' : 'off'}" id="dGo">${ready ? 'Tagesbonus abholen' : 'Morgen wieder'}</div>
    <h3>Aufgaben von heute</h3><div class="list">${qs}</div>
    <div class="row q"><img src="assets/ic_chest.webp" style="width:44px;height:44px;filter:${CHESTS[2].f}"><div class="t"><b>Alle 3 Aufgaben geschafft</b><small>Extra-Goldtruhe</small></div>${G.q.bonus ? '<em class="okm">✓</em>' : `<div class="mini ${all ? '' : 'off'}" id="qB">Öffnen</div>`}</div>
    <p class="tip">Neue Aufgaben gibt es jeden Tag um Mitternacht.</p>`);
  ov.querySelector('#dGo').onclick = () => { if (!ready || G.day.last === today()) return; const got = grant(DAILY[n], pos(ov.querySelector('.day.now'))); G.day = { n: n + 1, last: today() }; snd.play('jackpot'); save(); ov.close(); toast('Tagesbonus: ' + got); dailyPanel(); };
  ov.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const q = G.q.list[+b.dataset.q]; if (q.p < q.x || q.got) return; q.got = 1; save(); ov.close(); openChest(q.chest); });
  const qb = ov.querySelector('#qB'); if (qb) qb.onclick = () => { if (!all || G.q.bonus) return; G.q.bonus = 1; save(); ov.close(); openChest(2); };
}

// ================= Leo-Freundschaft =================
const leoNeed = () => Math.max(18, 30 - 2 * (G.leoLv - 1));
const leoXpNeed = () => 2 + G.leoLv;
const LEO_PERKS = [[2, 'Goldwurf schon nach weniger Würfen'], [3, 'Goldwurf bringt +30 % mehr'], [4, 'Jeder Goldwurf schenkt +5 Würfe'], [7, 'Goldwurf wird öfter zum Kronen-Jackpot'], [10, 'Leo ist ein Legenden-Löwe!']];
function leoXP() {
  G.leoXp++;
  if (G.leoXp >= leoXpNeed()) { G.leoXp = 0; G.leoLv = Math.min(10, G.leoLv + 1); setTimeout(() => { banner(`Leo ist jetzt Stufe ${G.leoLv}!`, '#ffd25e'); snd.play('levelup'); leoMood('cheer', 2500); }, 1800); }
}
function leoPanel() {
  const perks = LEO_PERKS.map(([lv, t]) => `<div class="row" style="padding:5px 8px;${G.leoLv >= lv ? '' : 'opacity:.5'}"><b style="width:52px;color:#ffe27a">St. ${lv}</b><div class="t"><small style="color:#fff;font-size:13px">${t}</small></div>${G.leoLv >= lv ? '<em class="okm">✓</em>' : ''}</div>`).join('');
  panel(`<div class="lia"><img src="assets/leo_cheer.webp" style="height:150px;margin:0"><div style="flex:1"><h2 style="text-align:left">Leo · Stufe ${G.leoLv}</h2><p style="text-align:left!important">Leo sammelt mit jedem Wurf Energie (${G.leo} / ${leoNeed()}). Ist sie voll, ist dein nächster Wurf ein garantierter Gold-Dreier.</p></div></div>
    <div class="evbar"><div style="width:${G.leoXp / leoXpNeed() * 100}%"></div><span>Freundschaft ${G.leoXp} / ${leoXpNeed()} Goldwürfe</span></div><div class="list">${perks}</div>`);
}
// ================= Ausflüge =================
const expSlots = () => G.lv >= 10 ? 3 : 2;
const EXP_DUR = [[1, '1 Std'], [4, '4 Std'], [8, '8 Std']];
function expReward(x) { const p = PETS.find(q => q.id === x.id), r = p.r, d = x.h, lv = G.pets[x.id] || 1, sh = G.shiny[x.id] ? 1.5 : 1;
  return { rolls: Math.round(d * (2 + r) * sh), coins: Math.round(base() * d * (1.5 + r) * (1 + lv * .1) * sh), crowns: Math.round(d * (1 + r * .7) * sh), egg: Math.min(.6, .04 * d * (1 + r * .5)) }; }
function expPanel() {
  const now = Date.now();
  const slots = Array.from({ length: expSlots() }, (_, i) => {
    const x = G.exp[i];
    if (!x) return `<div class="row"><div class="t"><b>Freier Platz</b><small>Schicke ein Haustier los, das gerade nicht dein Begleiter ist.</small></div><div class="mini" data-send="${i}">Losschicken</div></div>`;
    const p = PETS.find(q => q.id === x.id), done = x.end <= now, rw = expReward(x);
    return `<div class="row"><img src="assets/pet_${p.id}.webp" class="${G.shiny[p.id] ? 'shiny' : ''}" style="width:56px;height:56px"><div class="t"><b>${p.n}</b><small>${done ? 'Ist zurück!' : 'Unterwegs – noch ' + hm(x.end - now)}</small><small>Bringt: ${rw.rolls} Würfe · ${fmt(rw.coins)} Münzen · ${rw.crowns} Kronen · ${Math.round(rw.egg * 100)} % Ei</small></div>${done ? `<div class="mini" data-get="${i}">Abholen</div>` : ''}</div>`;
  }).join('');
  const ov = panel(`<h2>🧭 Ausflüge</h2><p>Deine Haustiere gehen auf Abenteuer und bringen Beute mit. Seltene und goldene Haustiere bringen mehr.</p><div class="list">${slots}</div>${G.lv < 10 ? '<p class="tip">Ab Stufe 10 bekommst du einen dritten Platz.</p>' : ''}`);
  ov.querySelectorAll('[data-get]').forEach(b => b.onclick = () => {
    const i = +b.dataset.get, x = G.exp[i], rw = expReward(x), p = pos(b);
    G.rolls += rw.rolls; G.coins += rw.coins; G.crowns += rw.crowns; flyCoins(10, p); snd.play('coins');
    const egg = Math.random() < rw.egg; if (egg) gainEgg(0, true);
    G.exp.splice(i, 1); save(); ov.close(); toast(`Beute: ${rw.rolls} Würfe, ${fmt(rw.coins)} Münzen, ${rw.crowns} Kronen${egg ? ' und ein Ei!' : ''}`, 3200); expPanel();
  });
  ov.querySelectorAll('[data-send]').forEach(b => b.onclick = () => { ov.close(); expPick(); });
}
function expPick() {
  const can = PETS.filter(p => G.pets[p.id] && p.id !== G.active && !G.exp.some(x => x.id === p.id));
  if (!can.length) { toast('Kein freies Haustier – brüte mehr Eier aus!'); expPanel(); return; }
  let sel = can[0].id, h = 1;
  const ov = panel(`<h2>Wer geht auf Ausflug?</h2><div class="avgrid">${can.map(p => `<div class="avc ${p.id === sel ? 'on' : ''}" data-ep="${p.id}"><img src="assets/pet_${p.id}.webp" class="${G.shiny[p.id] ? 'shiny' : ''}"><small>${p.n}</small></div>`).join('')}</div>
    <h3>Wie lange?</h3><div class="durs">${EXP_DUR.map(([d, t]) => `<div class="mini ${d === h ? '' : 'dim'}" data-h="${d}">${t}</div>`).join('')}</div><p id="expRw"></p><div class="btn gold" id="expGo">Los geht's!</div>`);
  const upd = () => { const rw = expReward({ id: sel, h }); ov.querySelector('#expRw').textContent = `Erwartet: ${rw.rolls} Würfe · ${fmt(rw.coins)} Münzen · ${rw.crowns} Kronen · ${Math.round(rw.egg * 100)} % Chance auf ein Ei`; };
  ov.querySelectorAll('[data-ep]').forEach(c => c.onclick = () => { sel = +c.dataset.ep; snd.play('pop'); ov.querySelectorAll('[data-ep]').forEach(x => x.classList.toggle('on', x === c)); upd(); });
  ov.querySelectorAll('.durs [data-h]').forEach(c => c.onclick = () => { h = +c.dataset.h; snd.play('click'); ov.querySelectorAll('.durs .mini').forEach(x => x.classList.toggle('dim', x !== c)); upd(); });
  ov.querySelector('#expGo').onclick = () => { G.exp.push({ id: sel, h, end: Date.now() + h * 3600e3 }); save(); snd.play('whoosh'); ov.close(); toast(PETS.find(p => p.id === sel).n + ' ist unterwegs!'); expPanel(); };
  upd();
}
// ================= Wolkengeist-Boss =================
function bossCheck() { if (Date.now() > G.boss.end || G.boss.max < 400) { const mx = 400 + 50 * G.k; /* ca. 4–5 Tage */ G.boss = { id: (G.boss.id || 0) + 1, end: Date.now() + 7 * 864e5, hp: mx, max: mx, got: 0 }; } }
function bossHit(n) {
  if (G.tut < 9) return; bossCheck(); if (!G.boss.hp) return;
  const before = G.boss.hp; G.boss.hp = Math.max(0, G.boss.hp - n);
  const t = [.75, .5, .25, 0].find(t => before > G.boss.max * t && G.boss.hp <= G.boss.max * t);
  if (t !== undefined) setTimeout(() => { toast(G.boss.hp ? `⚡ Wolkengeist geschwächt! Truhe im Event abholen.` : '🎉 Wolkengeist besiegt! Hol dir die große Truhe im Event!', 3000); snd.play(G.boss.hp ? 'block' : 'jackpot'); }, 1400);
}
// ================= Würfel-Designs =================
const SKIN_REQ = [[() => true, ''], [() => G.k >= 1, 'ab Königreich 2'], [() => G.stats.att >= 15, 'nach 15 Angriffen'], [() => G.k >= 3, 'ab Königreich 4'], [() => G.k >= 5, 'ab den dunklen Welten'], [() => Object.keys(G.sets).length >= 2, 'nach 2 vollen Sets']];
const skinOk = i => !!G.skins[i] || SKIN_REQ[i][0]();

// ================= Menü =================
function menuPanel() {
  const ov = panel(`<h2>Menü</h2>
    <div class="row"><img src="assets/hero_face.webp" style="width:56px;height:56px;border-radius:50%"><div class="t"><b>Stufe ${G.lv}</b><small>${G.xp} / ${xpNeed(G.lv)} EP · ${G.stats.rolls} Würfe · ${G.stats.built} Ausbauten · ${G.stats.att} Angriffe</small></div></div>
    <div class="list" style="margin-top:10px">
      <div class="row"><div class="t"><b>Gewinntabelle</b><small>Was bringt welcher Wurf?</small></div><div class="mini" id="mP">Ansehen</div></div>
      <div class="row"><div class="t"><b>So geht's</b><small>Alle Regeln und Tipps</small></div><div class="mini" id="mH">Anleitung</div></div>
      <div class="row"><div class="t"><b>Soundeffekte</b></div><div class="mini" id="mS">${G.sound ? 'An' : 'Aus'}</div></div>
      <div class="row"><div class="t"><b>Musik</b></div><div class="mini" id="mM">${G.music ? 'An' : 'Aus'}</div></div>
      <div class="row"><div class="t"><b>Neu starten</b><small>Löscht deinen Spielstand</small></div><div class="mini red" id="mR">Zurücksetzen</div></div>
    </div>`);
  ov.querySelector('#mP').onclick = () => { ov.close(); payPanel(); };
  ov.querySelector('#mS').onclick = () => { G.sound = !G.sound; snd.S.on = G.sound; save(); ov.close(); menuPanel(); };
  ov.querySelector('#mM').onclick = () => { G.music = !G.music; snd.setMusic(G.music); save(); ov.close(); menuPanel(); };
  ov.querySelector('#mH').onclick = () => { ov.close(); help(); };
  ov.querySelector('#mR').onclick = e => { const b = e.target; if (b.dataset.sure) { try { localStorage.removeItem(KEY); } catch (er) { } location.reload(); } else { b.dataset.sure = 1; b.textContent = 'Wirklich?'; } };
}
function help() {
  const sec = (t, x) => `<h3>${t}</h3><p style="text-align:left">${x}</p>`;
  panel(`<h2>So geht's</h2><div style="text-align:left">
   ${sec('Würfeln', `Jeder Wurf kostet Würfe (so viele wie dein Einsatz). Drei gleiche Symbole lösen etwas Besonderes aus. Einzelne ${icon('ic_coin', 16)} und ${icon('ic_crown', 16)} bringen immer Münzen. Halte den Knopf gedrückt für Auto-Würfeln.`)}
   ${sec('Bauen', 'Mit Münzen baust du die 5 Gebäude deines Königreichs aus. Sind alle auf ★★★★★, geht es ins nächste Königreich – mit großer Belohnung.')}
   ${sec('Angriff', `Drei ${icon('ic_swords', 16)}: Wähle einen Rivalen, dann ein Gebäude, dann einen Bereich. Jeder Bereich versteckt eine andere Beute. Tippe auf FEUER, wenn der Ring grün ist (×3).`)}
   ${sec('Karten', `Drei ${icon('ic_card', 16)}: Du ziehst eine Karte – Raub, Beutezug, Duell, Joker, Goldschatz, Würfelregen oder ein Ei. Verbessere Karten mit Kronen.`)}
   ${sec('Schilde', `Drei ${icon('ic_shield', 16)} = 1 Schild. Ein Schild wehrt einen Angriff ab. Später passen bis zu 5 Schilde in deine Leiste.`)}
   ${sec('Eier & Haustiere', 'Eier findest du zufällig. Sie schlüpfen nach einigen Würfen. Jedes Haustier gibt einen Bonus, doppelte steigen auf.')}
   ${sec('Leo', 'Leo sammelt mit jedem Wurf Energie. Bei 30 ist dein nächster Wurf ein garantierter Münz- oder Kronen-Dreier.')}
   ${sec('Event & Wolkengeist', 'Im Sternenfest sammelst du Punkte für Meilensteine und die Rangliste. Jede Woche greift der Wolkengeist an: Jeder Dreier trifft ihn, Schwerter und Angriffs-Treffer besonders hart. Für jedes Viertel seiner Lebenspunkte gibt es eine Truhe.')}
   ${sec('Täglich', 'Jeden Tag gibt es einen Tagesbonus und 3 Aufgaben mit Truhen. Schaffst du alle 3, wartet eine extra Goldtruhe.')}
   ${sec('Ausflüge & Gold-Form', 'Schick Haustiere auf Ausflüge – sie bringen Würfe, Münzen, Kronen und manchmal Eier mit. Schlüpft ein Haustier, das schon Stufe 5 hat, wird es golden und sein Bonus verdoppelt sich. Volle Sets im Album geben große Belohnungen.')}
   ${sec('Leo & Würfel-Designs', 'Jeder Goldwurf stärkt eure Freundschaft – Leo steigt auf und bekommt neue Fähigkeiten (tippe auf Leo). Im Profil kannst du neue Würfel-Designs freischalten.')}
   ${sec('Dunkle Welten', 'Nach Königreich 5 geht es in die dunklen Welten – geheimnisvoll, schwerer und mit größerer Beute.')}
   </div><div class="btn gold" data-close>Verstanden!</div>`);
}

// ================= Tutorial =================
const tut = { block: null };
function hand(el, text, where = 'top') {
  clearHand();
  const p = pos(el);
  const sp = document.createElement('div'); sp.id = 'spot'; sp.style.left = (p.x - p.w / 2 - 8) + 'px'; sp.style.top = (p.y - p.h / 2 - 8) + 'px'; sp.style.width = (p.w + 16) + 'px'; sp.style.height = (p.h + 16) + 'px';
  const hd = document.createElement('div'); hd.id = 'hand'; hd.textContent = '👆'; hd.style.left = (p.x - 8) + 'px'; hd.style.top = (p.y + p.h / 2 - 14) + 'px';
  const tx = document.createElement('div'); tx.id = 'tutTxt'; tx.innerHTML = `<img src="assets/hero_face.webp"><span>${text}</span>`;
  tx.style.top = (where === 'top' ? Math.max(60, p.y - p.h / 2 - 96) : Math.min(H - 120, p.y + p.h / 2 + 40)) + 'px';
  app.append(sp, hd, tx);
}
function clearHand() { ['#spot', '#hand', '#tutTxt'].forEach(s => { const e = $(s); if (e) e.remove(); }); }
function lia(text, btn = 'Weiter') {
  return new Promise(res => { const ov = panel(`<div class="lia"><img src="assets/hero.webp"><p>${text}</p></div><div class="btn gold" id="lOk">${btn}</div>`, { onClose: false }); ov.querySelector('#lOk').onclick = () => { snd.unlock(); snd.play('click'); ov.close(); res(); }; });
}
let tutWait = null;
function tutNext(ev) { if (tutWait && tutWait.ev === ev) { const r = tutWait.res; tutWait = null; r(); } }
const tutOn = ev => new Promise(res => tutWait = { ev, res });
async function tutorial() {
  if (G.tut <= 0) {
    await lia('Willkommen in den Himmelsinseln! Ich bin <b>Lia</b>, und das ist mein Löwengeist <b>Leo</b>.');
    await lia('Wolkengeister haben unser Königreich zerstört. Hilfst du mir, es wieder aufzubauen?', 'Na klar!');
    if (!G.name) { profilePanel(true); await tutOn('profile'); }
    G.tut = 1; save();
  }
  if (G.tut === 1) {
    tut.block = 'roll'; forced = 'coin';
    hand($('#roll'), 'Tippe auf <b>WÜRFELN</b>! Drei gleiche Symbole bringen große Gewinne.');
    await tutOn('rolled'); clearHand(); G.tut = 2; save();
  }
  if (G.tut === 2) {
    await wait(300);
    await lia('Super, ein <b>Münzregen</b>! Mit Münzen bauen wir unser Königreich wieder auf.');
    tut.block = 'build'; renderKingdom();
    hand(document.querySelector('.islet[data-slot="0"]'), 'Tippe auf das <b>Schloss</b>, um es zu bauen!', 'bottom');
    await tutOn('built'); clearHand(); G.tut = 3; save();
  }
  if (G.tut === 3) {
    await wait(900);
    await lia(`Wunderschön! Jetzt holen wir uns Münzen von den Rivalen. Drei <b>Schwerter</b> ${icon('ic_swords', 22)} bedeuten Angriff!`);
    tut.block = 'roll'; forced = 'swords';
    hand($('#roll'), 'Würfle noch einmal!');
    await tutOn('rolled'); clearHand(); G.tut = 5; save();
  }
  if (G.tut === 4 || G.tut === 5) {
    await lia(`Klasse! Drei <b>Karten</b> ${icon('ic_card', 22)} lassen dich eine Karte ziehen – zum Beispiel einen <b>Raub</b>.`);
    tut.block = 'roll'; forced = 'card'; forced2 = 'steal';
    hand($('#roll'), 'Würfle für eine Karte!');
    await tutOn('rolled'); clearHand(); G.tut = 6; save();
  }
  if (G.tut === 6) {
    tut.block = 'pay';
    hand($('#payBtn'), 'Hier siehst du jederzeit, <b>was welcher Wurf bringt</b>. Tippe drauf!', 'bottom');
    await new Promise(r => $('#payBtn').addEventListener('click', r, { once: true })); clearHand();
    await tutOn('close'); G.tut = 7; save();
  }
  if (G.tut === 7) {
    tut.block = null;
    await lia(`Noch zwei Tipps: Drei <b>Schilde</b> ${icon('ic_shield', 20)} schützen dich vor Angriffen. Und manchmal findest du ein <b>magisches Ei</b> – daraus schlüpft ein Haustier mit Bonus!`);
    await lia('Mit dem <b>Einsatz-Knopf</b> links gewinnst du mehr pro Wurf. Und alle 30 Würfe schenkt dir Leo einen Goldwurf. Viel Spaß!', "Los geht's!");
    G.tut = 9; G.rolls = Math.max(G.rolls, MAXR); G.wheelT = 0; save(); hud();
    snd.music('main');
  }
  tut.block = null;
}

// ================= Steuerung =================
function setAuto() { $('#autoV').textContent = auto ? '■' : '▶'; $('#auto').classList.toggle('on', auto); }
const rb = $('#roll');
rb.addEventListener('pointerdown', () => { snd.unlock(); if (tut.block) return; holdT = setTimeout(() => { auto = true; setAuto(); toast('Auto-Würfeln an'); roll(); holdT = null; }, 600); });
rb.addEventListener('pointerup', () => { if (tut.block) { roll(); return; } if (holdT) { clearTimeout(holdT); holdT = null; roll(); } });
rb.addEventListener('pointerleave', () => { if (holdT) { clearTimeout(holdT); holdT = null; } });
const gate = f => () => { if (tut.block) return; snd.play('click'); f(); };
$('#auto').onclick = gate(() => { auto = !auto; setAuto(); if (auto) roll(); });
$('#bet').onclick = gate(() => { const av = BETS.filter(b => b.lv <= G.lv); G.bet = (G.bet + 1) % av.length; hud(); toast(G.bet ? `Einsatz ×${betM()}: Gewinn ×${betM()}, kostet ${betM()} Würfe` : 'Einsatz ×1'); save(); });
$('#bBuild').onclick = gate(buildPanel);
$('#bEggs').onclick = gate(eggPanel);
$('#bPets').onclick = gate(petPanel);
$('#bWheel').onclick = gate(wheelPanel);
$('#bRivals').onclick = gate(rivalsPanel);
$('#bCards').onclick = gate(cardsPanel);
$('#bEvent').onclick = gate(eventPanel);
$('#bDaily').onclick = gate(dailyPanel);
$('#avBtn').onclick = gate(() => profilePanel());
$('#deck').onclick = gate(cardsPanel);
$('#payBtn').onclick = () => { if (tut.block && tut.block !== 'pay') return; snd.play('click'); payPanel(); };
$('#lion').onclick = () => { if (tut.block) return; snd.play('roar', .7); lionJump(); leoPanel(); };
addEventListener('keydown', e => {
  if (e.repeat || e.target.matches('input,textarea')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (g2.fire) { g2.fire(); return; } if (!ovStack.length && !gameOpen) roll(); else if (fEl) press(fEl); }
  if (e.code === 'Escape') closeTop();
});

// ---- Xbox-Controller ----
const focus = $('#focus'); let fEl = null, padOn = false;
function focusables() {
  const root = ovStack[ovStack.length - 1] || (gameOpen ? $('#game2') : app);
  const els = [...root.querySelectorAll('.btn:not(.off),.mini:not(.off),[data-close],.card[data-e],.card[data-p],.prow.act .tile,.tile[data-h],[data-t],[data-a],#bet,#roll,#auto,.sb,#payBtn,#deck')];
  return els.filter(e => e.offsetParent !== null && (root !== app || !e.closest('.ov,#game2')));
}
function focusReset() { fEl = null; if (padOn) setTimeout(() => { const f = focusables(); fEl = f.find(e => e.matches('.btn,.prow.act .tile,[data-t],[data-a],[data-h],[data-o]')) || f.find(e => e.id === 'roll') || f[0]; drawFocus(); }, 60); }
function drawFocus() {
  if (!fEl || !padOn) { focus.style.display = 'none'; return; }
  const r = fEl.getBoundingClientRect(), a = app.getBoundingClientRect(), sc = a.width / 390;
  focus.style.display = 'block'; focus.style.left = ((r.left - a.left) / sc - 4) + 'px'; focus.style.top = ((r.top - a.top) / sc - 4) + 'px';
  focus.style.width = (r.width / sc + 8) + 'px'; focus.style.height = (r.height / sc + 8) + 'px';
}
function moveFocus(dx, dy) {
  const f = focusables(); if (!f.length) return;
  if (!fEl || !f.includes(fEl)) { fEl = f[0]; drawFocus(); return; }
  const c = pos(fEl); let best = null, bd = 1e9;
  f.forEach(e => { if (e === fEl) return; const p = pos(e), vx = p.x - c.x, vy = p.y - c.y; const along = vx * dx + vy * dy; if (along <= 4) return; const side = Math.abs(vx * dy - vy * dx); const d = along + side * 2.2; if (d < bd) { bd = d; best = e; } });
  if (best) { fEl = best; drawFocus(); snd.play('wheel', .5); if (fEl.scrollIntoView) fEl.scrollIntoView({ block: 'nearest' }); }
}
function press(el) { if (!el) return; if (el.id === 'roll') { roll(); return; } el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
const prev = {};
function padLoop() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const st = { A: b(0), B: b(1), X: b(2), Y: b(3), LB: b(4), RB: b(5), BK: b(8), ST: b(9), U: b(12) || ay < -.6, D: b(13) || ay > .6, L: b(14) || ax < -.6, R: b(15) || ax > .6 };
    const down = k => st[k] && !prev[k];
    if (Object.values(st).some(Boolean) && !padOn) { padOn = true; $('#padHelp').style.display = 'block'; focusReset(); }
    const inUI = ovStack.length || gameOpen;
    if (down('A')) {
      if (g2.fire && !ovStack.length && (!fEl || fEl.matches('.btn'))) g2.fire();
      else if (inUI) press(fEl);
      else if (tut.block === 'build') tryBuild(0);
      else if (fEl && fEl.id !== 'roll') press(fEl); else roll();
    }
    if (down('B')) { if (ovStack.length) closeTop(); else if (!gameOpen) { fEl = $('#roll'); drawFocus(); } }
    if (!inUI) {
      if (down('X')) $('#bet').click();
      if (down('Y')) $('#auto').click();
      if (down('LB')) $('#bEggs').click();
      if (down('RB')) $('#bBuild').click();
      if (down('ST')) menuPanel();
      if (down('BK')) $('#payBtn').click();
    }
    if (g2.aimPad && (Math.abs(ax) > .2 || Math.abs(ay) > .2 || st.U || st.D || st.L || st.R)) { g2.aimPad(st.L ? -1 : st.R ? 1 : ax, st.U ? -1 : st.D ? 1 : ay); Object.assign(prev, st); break; }
    if (down('U')) moveFocus(0, -1); if (down('D')) moveFocus(0, 1); if (down('L')) moveFocus(-1, 0); if (down('R')) moveFocus(1, 0);
    Object.assign(prev, st);
    break;
  }
  if (padOn && fEl && !document.contains(fEl)) focusReset();
  if (padOn) drawFocus();
  requestAnimationFrame(padLoop);
}
addEventListener('pointerdown', () => { if (padOn) { padOn = false; focus.style.display = 'none'; $('#padHelp').style.display = 'none'; } }, true);

// ================= Start / Offline =================
function offlineCheck() {
  const away = (Date.now() - G.seen) / 3600e3;
  regen();
  if (away < 0.75 || G.stats.rolls < 10) return false;
  const n = Math.min(3, Math.floor(away * 0.6 + Math.random()));
  if (!n) return false;
  const res = []; for (let i = 0; i < n; i++) res.push(hitYou(pick(RIVALS).n));
  res.forEach(r => G.log.unshift(r.blocked ? `${r.n}: abgewehrt` : r.slot !== undefined ? `${r.n}: ${BNAME[kB(KG(), r.slot)]} beschädigt` : `${r.n}: ${fmt(r.coins)} Münzen geklaut`));
  G.log = G.log.slice(0, 10); save();
  setTimeout(() => panel(`<h2>Während du weg warst…</h2><div class="list">${res.map(r => { const R = RIVALS.find(x => x.n === r.n); return `<div class="row"><img src="${avatar(R)}" style="width:48px;height:48px;border-radius:50%"><div class="t"><b>${r.n}</b><small>${r.blocked ? '🛡️ Schild hat geblockt' : r.slot !== undefined ? `💥 ${BNAME[kB(KG(), r.slot)]} beschädigt` : `💰 ${fmt(r.coins)} Münzen geklaut`}</small></div></div>`; }).join('')}</div>
    <p>Deine Würfe sind wieder aufgeladen: <b>${G.rolls}</b></p><div class="btn gold" data-close>Rache!</div>`), 600);
  return true;
}

setInterval(() => { regen(); hud(); }, 1000);
setInterval(save, 10000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
(async () => {
  try { const r = await fetch('assets/list.json'); if (r.ok) (await r.json()).forEach(n => AV.add(n)); } catch (e) { }
  fit();
  await initDice();
  evCheck(); fit(); hud(); showPet(); applyProfile();
  snd.preload(['roll', 'land', 'coin', 'coins', 'jackpot', 'build', 'click']);
  if (G.tut < 9) tutorial();
  else { const off = offlineCheck(); if (!G.name) setTimeout(() => profilePanel(true), 400); else if (!off && G.day.last !== today()) setTimeout(dailyPanel, 500); document.addEventListener('pointerdown', () => snd.music('main'), { once: true }); }
  requestAnimationFrame(padLoop);
  window.__wz = { G, petPanel, expPanel, leoPanel, profilePanel, openChest, bossHit, roll, gainEgg, hatch, attackFlow, stealFlow, raidFlow, fightFlow, drawCard, rivalAttacksYou, save, hud, renderKingdom, eventPanel, dailyPanel, cardsPanel, payPanel, wheelPanel };
})();
