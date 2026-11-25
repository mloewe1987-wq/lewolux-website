// Deep Signal – game data: balance, upgrades, zones, finds, signal fragments (EN + DE)
(function (DS) {
'use strict';
const M = 4; // world units per meter
DS.M = M;

// ---------- Zones ----------
DS.ZONES = [
  {id: 'sun', from: 0, to: 200, name: {en: 'Sunlit Zone', de: 'Sonnenzone'}},
  {id: 'twi', from: 200, to: 1000, name: {en: 'Twilight Zone', de: 'Dämmerzone'}},
  {id: 'mid', from: 1000, to: 4000, name: {en: 'Midnight Zone', de: 'Mitternachtszone'}},
  {id: 'aby', from: 4000, to: 6000, name: {en: 'The Abyss', de: 'Der Abgrund'}},
  {id: 'tre', from: 6000, to: 7200, name: {en: 'Hadal Trench', de: 'Hadal-Graben'}},
];
DS.FLOOR_M = 7000;   // sea floor of the trench
DS.SOURCE_M = 6900;  // Meridian Station (source of the signal), resting on the trench floor
DS.zoneAt = m => { for (let i = DS.ZONES.length - 1; i >= 0; i--) if (m >= DS.ZONES[i].from) return i; return 0; };

// ---------- Regions (prestige) ----------
// lure: what draws predators in this sea ('light' = headlamp, 'sound' = drilling and engine noise, 'both')
// station: the goal at the bottom of each sea; welcome: grammatical greeting per language
DS.REGIONS = [
  {id: 'rift', name: {en: 'Meridian Rift', de: 'Meridian-Graben'}, mult: 1, lure: 'light', station: {en: 'Meridian', de: 'Meridian'}, welcome: {en: 'Welcome to the Meridian Rift', de: 'Willkommen im Meridian-Graben'}},
  {id: 'ice', name: {en: 'Ice Sea', de: 'Eismeer'}, mult: 3, lure: 'sound', station: {en: 'Boreas', de: 'Boreas'}, welcome: {en: 'Welcome to the Ice Sea', de: 'Willkommen im Eismeer'}},
  {id: 'vent', name: {en: 'Ember Vents', de: 'Glutschlote'}, mult: 9, lure: 'both', station: {en: 'Caldera', de: 'Caldera'}, welcome: {en: 'Welcome to the Ember Vents', de: 'Willkommen in den Glutschloten'}},
];
DS.regionOf = r => DS.REGIONS[Math.min(r || 0, DS.REGIONS.length - 1)];
DS.lureOf = r => DS.REGIONS[Math.min(r || 0, DS.REGIONS.length - 1)].lure;
DS.regionMult = S => DS.REGIONS[Math.min(S.region, DS.REGIONS.length - 1)].mult * (1 + 0.5 * Math.max(0, S.region - DS.REGIONS.length + 1));

// ---------- Economy ----------
// value of loot by depth: a flat early bonus makes the first dives rewarding, the curve flattens late (no overflow)
DS.valueAt = m => 2.4 + m / 32 + Math.pow(m / 205, 2.0);
DS.hpAt = m => 1 + m / 210 + Math.pow(m / 1500, 2);
// fc: chance to hold a find; zone: [from, to] zones where it spawns as a regular object
DS.OBJ = {
  crate: {hp: 2.2, value: 9, pieces: [2, 3], w: 34, h: 26, fc: 0.07},
  barrel: {hp: 1.6, value: 6, pieces: [1, 2], w: 22, h: 30, fc: 0.03},
  ore: {hp: 3.6, value: 13, pieces: [3, 4], w: 40, h: 30, fc: 0},
  wreck: {hp: 8, value: 34, pieces: [5, 7], w: 120, h: 50, fc: 0.24},
  bigwreck: {hp: 18, value: 80, pieces: [8, 11], w: 220, h: 80, fc: 0.6},
  cache: {hp: 6, value: 34, pieces: [6, 6], w: 46, h: 34, fc: 1},
  sigcache: {hp: 4.5, value: 30, pieces: [5, 6], w: 38, h: 30, fc: 1},
  whale: {hp: 24, value: 150, pieces: [12, 14], w: 270, h: 70, fc: 1},
  // zone objects (more variety per zone)
  amphora: {hp: 1.8, value: 11, pieces: [2, 3], w: 22, h: 32, fc: 0.12, zone: [0, 1]},
  clam: {hp: 4.2, value: 18, pieces: [2, 3], w: 44, h: 30, fc: 0.32, zone: [1, 4]},
  pod: {hp: 5, value: 26, pieces: [4, 5], w: 50, h: 26, fc: 0.18, zone: [2, 4]},
  // rare spawns: glowing treasure, wreck with a locked vault (needs a drill level), contract recorder
  treasure: {hp: 5, value: 95, pieces: [8, 9], w: 44, h: 34, fc: 1},
  vault: {hp: 16, value: 120, pieces: [10, 12], w: 150, h: 70, fc: 1},
  recorder: {hp: 3.5, value: 12, pieces: [2, 2], w: 36, h: 28, fc: 0},
};
// drill level needed to crack a vault at a zone (the breaker drill needs 2 less)
DS.vaultReq = z => 2 + z * 2;

// ---------- Upgrades ----------
const geo = (b, g) => l => Math.round(b * Math.pow(g, l) / (b > 999 ? 10 : 1)) * (b > 999 ? 10 : 1);
const HULL = [120, 250, 420, 650, 950, 1350, 1850, 2450, 3150, 3950, 4850, 5850, 7000];
DS.HULL = HULL;
DS.HULL_COST = [35, 120, 360, 1150, 3300, 9800, 30000, 88000, 205000, 440000, 990000, 2300000];
const T_ = k => DS.T ? DS.T(k) : k;
DS.UPG = [
  {id: 'hull', icon: 'hull', max: 12, cost: l => DS.HULL_COST[l],
    val: l => HULL[l], fmt: v => DS.fmtM(v), ring: 1, ang: -90},
  {id: 'oxy', icon: 'oxy', max: 15, cost: geo(55, 1.95), val: l => 30 + 5 * l, fmt: v => v + '\u00a0s', ring: 1, ang: -30},
  {id: 'cargo', icon: 'cargo', max: 15, cost: geo(55, 1.95), val: l => 14 + 5 * l, fmt: v => String(v), ring: 1, ang: 30},
  {id: 'drill', icon: 'drill', max: 15, cost: geo(65, 1.95), val: l => Math.round(140 * Math.pow(1.36, l)) / 100, fmt: v => '×' + DS.num(v, v < 10 ? 2 : 1), ring: 1, ang: 90},
  {id: 'engine', icon: 'engine', max: 12, cost: geo(90, 2.12), val: l => Math.round(14 * Math.pow(1.21, l)), fmt: v => v + '\u00a0m/s', ring: 1, ang: 150},
  {id: 'light', icon: 'light', max: 8, cost: geo(150, 2.85), val: l => 210 + 48 * l, fmt: v => Math.round(v / M) + '\u00a0m', ring: 1, ang: 210},
  {id: 'lift', icon: 'lift', max: 5, req: {hull: 3}, cost: l => [1500, 12000, 90000, 400000, 1500000][l], val: l => [0, 150, 600, 1500, 3000, 3800][l], fmt: v => v ? DS.fmtM(v) : '–', ring: 2, ang: -72},
  {id: 'winch', icon: 'winch', max: 5, req: {oxy: 1}, cost: geo(160, 3.4), val: l => Math.round((1 + 0.35 * l) * 100) / 100, fmt: v => '×' + DS.num(v, 2), ring: 2, ang: -48},
  {id: 'buoy', icon: 'buoy', max: 4, req: {oxy: 2}, cost: geo(260, 2.6), val: l => 35 + 12 * l, fmt: v => DS.pct(v), ring: 2, ang: -12},
  // level 1 is a cheap mini drone (early idle income, so coming back pays off from the first evening); full drones from level 2
  {id: 'drones', icon: 'drones', max: 10, req: {hull: 2}, reqLv: {magnet: 1, hull: 4}, cost: l => l ? geo(3000, 2.05)(l - 1) : 250, val: l => DS.droneK(l), fmt: v => v ? '+' + DS.pct(Math.round(v * 25)) : '–', ring: 2, ang: 12},
  {id: 'magnet', icon: 'magnet', max: 6, req: {cargo: 2}, cost: geo(320, 3.1), val: l => 34 + 34 * l, fmt: v => Math.round(v / M) + '\u00a0m', ring: 2, ang: 48},
  {id: 'charge', icon: 'charge', max: 3, req: {drill: 5, hull: 5}, cost: l => [9000, 70000, 520000][l], val: l => l, fmt: v => String(v), ring: 2, ang: 72},
  {id: 'silent', icon: 'silent', max: 4, req: {engine: 2, hull: 2}, cost: geo(600, 3.8), val: l => 18 * l, fmt: v => v ? '−' + DS.pct(v) : '–', ring: 2, ang: 120},
  {id: 'flare', icon: 'flare', max: 4, req: {light: 1, hull: 2}, cost: geo(500, 3.5), val: l => l, fmt: v => String(v), ring: 2, ang: 168},
  {id: 'filter', icon: 'filter', max: 3, req: {light: 2, hull: 3}, cost: l => [2400, 26000, 240000][l], val: l => 22 * l, fmt: v => v ? '−' + DS.pct(v) : '–', ring: 2, ang: 192},
  {id: 'sonar', icon: 'sonar', max: 5, req: {light: 1}, cost: geo(450, 3.2), val: l => 300 + 500 * l, fmt: v => Math.round(v / M) + '\u00a0m', ring: 2, ang: 228},
  {id: 'decoder', icon: 'decoder', max: 3, req: {sonar: 1, hull: 3}, cost: l => [2400, 42000, 560000][l], val: l => l, fmt: v => T_('Lv') + ' ' + v, ring: 2, ang: 252},
];
// Specializations: at a certain level an upgrade asks for a choice between two modules (can be switched later for a fee)
DS.SPECS = {
  hull: {at: 4, opts: ['quiet', 'armor']},
  light: {at: 3, opts: ['wide', 'cold']},
  drill: {at: 6, opts: ['salvage', 'breaker']},
  engine: {at: 5, opts: ['sprint', 'rebreather']},
};
DS.specOf = (S, id) => { const sp = DS.SPECS[id]; return sp && (S.up[id] || 0) >= sp.at && S.spec && sp.opts.includes(S.spec[id]) ? S.spec[id] : null; };
DS.specPending = (S, id) => { const sp = DS.SPECS[id]; return !!sp && (S.up[id] || 0) >= sp.at && !DS.specOf(S, id); };
// switching costs a fee (the first choice is free)
DS.specFee = (S, id) => Math.round(DS.U[id].cost(DS.SPECS[id].at - 1) * DS.costK(S) * 0.5 / 10) * 10;
DS.U = {}; DS.UPG.forEach(u => DS.U[u.id] = u);
DS.reqOk = (S, u) => !u.req || Object.keys(u.req).every(k => (S.up[k] || 0) >= u.req[k]);
// some upgrades need more for their later levels (drones: the mini drone first, full drones need magnet + hull)
DS.reqOf = (S, u) => u.reqLv && (S.up[u.id] || 0) >= 1 ? u.reqLv : u.req;
DS.reqNext = (S, u) => { const r = DS.reqOf(S, u); return !r || Object.keys(r).every(k => (S.up[k] || 0) >= r[k]); };
// drone power per level: 0.6 for the mini drone, then +1 per full drone
DS.droneK = l => l <= 0 ? 0 : l === 1 ? 0.6 : l - 0.4;
// upgrade prices: the first levels are cheaper (a purchase about every minute early on); later seas cost more (loot is worth more there)
DS.costK = S => { const r = Math.min(S.region || 0, DS.REGIONS.length - 1); return r ? Math.pow(DS.regionMult(S), 0.3) : 1; };
DS.EARLY = [0.65, 0.74, 0.83, 0.92];
// the middle levels (5–11) are a bit cheaper, so that around dive 7–15 something is affordable every 1–2 dives
// (the last levels cost a bit more instead, so the whole sea still takes about as long)
DS.MID = l => l < 4 ? 1 : l >= 11 ? 1.12 : 1 - 0.3 * Math.exp(-(((l - 6.5) / 2.3) ** 2));
DS.costOf = (S, u) => { const l = S.up[u.id] || 0; if (l >= u.max) return Infinity; const c = u.cost(l) * DS.costK(S) * (u.id !== 'hull' && u.id !== 'drones' ? (l < 4 ? DS.EARLY[l] : DS.MID(l)) : 1); return c > 999 ? Math.round(c / 10) * 10 : Math.round(c); };

// Stats for a dive from the upgrade levels
DS.stats = S => {
  const L = id => S.up[id] || 0, V = id => DS.U[id].val(L(id)), sp = id => DS.specOf(S, id);
  const st = {
    o2: V('oxy'), hullM: V('hull'), cap: V('cargo'), dps: V('drill'), descent: V('engine') * M, light: V('light'),
    sonar: V('sonar'), magnet: V('magnet'), keep: V('buoy') / 100, charges: L('charge'), decoder: L('decoder'), drones: L('drones'),
    hspeed: (110 + 9 * L('engine')) * 1.0, mult: DS.regionMult(S) * (1 + 0.12 * L('decoder')),
    winch: V('winch'), lift: V('lift'), silent: V('silent') / 100, filter: V('filter') / 100, flares: L('flare'), lure: DS.lureOf(S.region),
    drillLv: L('drill'), noiseK: 1, armor: 1, lightLure: 1, lootK: 1, vaultCut: 0,
  };
  if (sp('hull') === 'quiet') st.noiseK = 0.6; else if (sp('hull') === 'armor') st.armor = 0.55;
  if (sp('light') === 'wide') st.light = Math.round(st.light * 1.3); else if (sp('light') === 'cold') st.lightLure = 0.6;
  if (sp('drill') === 'salvage') st.lootK = 1.2; else if (sp('drill') === 'breaker') { st.dps *= 1.3; st.vaultCut = 2; }
  if (sp('engine') === 'sprint') st.descent *= 1.25; else if (sp('engine') === 'rebreather') st.o2 = Math.round(st.o2 * 1.15);
  return st;
};
// Drone income per hour: based on the average dive (not on one lucky dive), drones work while the game is closed or open
DS.avgDive = S => S.avg || Math.min(S.bestDive || 0, 2000) * 0.5 || 0;
// floor for rewards that follow the average dive: grows with the sea (never the average of the previous sea)
DS.avgFloor = (S, v) => Math.max(DS.avgDive(S), v * DS.regionMult(S));
DS.droneRate = S => { const d = S.up.drones || 0; if (!d) return 0; return Math.round(DS.avgFloor(S, 200) * 0.25 * DS.droneK(d)); };
DS.DRONE_CAP_H = 8;
// login streak in weeks: the bonus grows from day 1 to day 7, day 7 is a bonus chest (double); then a new week starts,
// each new week pays 10 % more (up to +40 %)
DS.streakWeekDay = n => ((Math.max(1, n) - 1) % 7) + 1;
DS.streakReward = (S, n) => { const w = DS.streakWeekDay(n), wk = Math.floor((Math.max(1, n) - 1) / 7);
  return Math.round(Math.max(120 * DS.regionMult(S), DS.avgDive(S) * 0.6) * (1 + 0.35 * (w - 1)) * (w === 7 ? 2 : 1) * (1 + 0.1 * Math.min(4, wk)) / 10) * 10; };

// ---------- Signal fragments (depth thresholds in meters) ----------
DS.SIG_DEPTH = [30, 110, 200, 300, 420, 560, 720, 920, 1150, 1400, 1700, 2050, 2450, 2900, 3400, 3900, 4500, 5200, 5900, 6900];
DS.sigNeed = i => i < 6 ? 0 : i < 12 ? 1 : i < 17 ? 2 : 3; // decoder level needed
DS.SIGNALS = [
  {en: '…this is Meridian Station. Depth six thousand eight hundred meters. If anyone can hear this, we are…', de: '…hier ist Station Meridian. Tiefe sechstausendachthundert Meter. Falls uns jemand hört, wir sind…'},
  {en: 'Day 41. The hydrophones caught the tone again. Low. Patient. Dr. Varga calls it "the hum".', de: 'Tag 41. Die Hydrofone haben den Ton wieder aufgefangen. Tief. Geduldig. Dr. Varga nennt ihn „das Summen“.'},
  {en: 'Day 44. The hum matches no whale, no quake, no machine. It repeats every nineteen minutes.', de: 'Tag 44. Das Summen passt zu keinem Wal, keinem Beben, keiner Maschine. Es wiederholt sich alle neunzehn Minuten.'},
  {en: 'Day 47. Supply sub cancelled. Surface reports storms. Our sensors say the sea above is perfectly calm.', de: 'Tag 47. Versorgungs-U-Boot abgesagt. Oben soll Sturm sein. Unsere Sensoren sagen: Das Meer über uns ist völlig ruhig.'},
  {en: 'Day 52. Varga mapped the source. It is not below us. It is all around us.', de: 'Tag 52. Varga hat die Quelle kartiert. Sie ist nicht unter uns. Sie ist überall um uns herum.'},
  {en: 'Day 53. Lights in the trench walls tonight. They blink when we blink ours.', de: 'Tag 53. Heute Nacht Lichter in den Grabenwänden. Sie blinken, wenn wir blinken.'},
  {en: 'Day 58. Half the crew sleeps badly. Everyone dreams of the same door.', de: 'Tag 58. Die halbe Crew schläft schlecht. Alle träumen von derselben Tür.'},
  {en: 'Day 60. The hum changed key. Varga says it is answering our sonar.', de: 'Tag 60. Das Summen hat die Tonart gewechselt. Varga sagt, es antwortet auf unser Sonar.'},
  {en: 'Day 61. We stopped pinging. The hum did not stop.', de: 'Tag 61. Wir haben aufgehört zu pingen. Das Summen nicht.'},
  {en: 'Day 66. Something passed the observation window. Too long to see where it ended.', de: 'Tag 66. Etwas zog am Beobachtungsfenster vorbei. Zu lang, um sein Ende zu sehen.'},
  {en: 'Day 67. It did not touch the station. It only listened.', de: 'Tag 67. Es hat die Station nicht berührt. Es hat nur zugehört.'},
  {en: 'Day 70. Varga wants to go deeper. The anchors were never meant to be released.', de: 'Tag 70. Varga will tiefer. Die Anker waren nie dafür gedacht, gelöst zu werden.'},
  {en: 'Day 71. The vote passed, nine to three. I voted no. Logging that for whoever finds this.', de: 'Tag 71. Abstimmung angenommen, neun zu drei. Ich war dagegen. Das notiere ich für den, der das hier findet.'},
  {en: 'Day 72. Anchors released. We are sinking slowly. The hum feels almost… warm.', de: 'Tag 72. Anker gelöst. Wir sinken langsam. Das Summen fühlt sich fast… warm an.'},
  {en: 'Day 74. The pressure gauges stopped making sense. The hull is fine. The hull should not be fine.', de: 'Tag 74. Die Druckanzeigen ergeben keinen Sinn mehr. Der Rumpf hält. Der Rumpf dürfte nicht halten.'},
  {en: 'Day 75. We can see the door now. It is not a door. It is an eye that has been closed for a very long time.', de: 'Tag 75. Jetzt sehen wir die Tür. Es ist keine Tür. Es ist ein Auge, das sehr lange geschlossen war.'},
  {en: 'Day 76. Varga recorded a message for the surface. She asked me to put it on a loop.', de: 'Tag 76. Varga hat eine Nachricht für oben aufgenommen. Ich soll sie in Dauerschleife senden.'},
  {en: 'Day 77. If you can hear this, you are deeper than anyone was ever supposed to go.', de: 'Tag 77. Wenn du das hörst, bist du tiefer, als je jemand tauchen sollte.'},
  {en: 'Day 78. The eye is opening. It is not angry. It is curious. Like you.', de: 'Tag 78. Das Auge öffnet sich. Es ist nicht wütend. Es ist neugierig. So wie du.'},
  {en: 'This is Meridian Station. We are fine. We are listening. …The signal shifts. It now points north.', de: 'Hier ist Station Meridian. Uns geht es gut. Wir hören zu. …Das Signal verschiebt sich. Es zeigt jetzt nach Norden.'},
];
// The finale at Meridian Station (region 1) – shown line by line in the in-engine sequence
DS.FINALE = [
  {en: 'MERIDIAN STATION · POWER RESTORED', de: 'STATION MERIDIAN · STROM WIEDERHERGESTELLT'},
  {en: '"You followed the hum all the way down. Thank you for listening." – Dr. Ilse Varga', de: '„Du bist dem Summen bis ganz nach unten gefolgt. Danke, dass du zugehört hast.“ – Dr. Ilse Varga'},
  {en: 'Behind the station, the great eye opens… and turns north.', de: 'Hinter der Station öffnet sich das große Auge … und dreht sich nach Norden.'},
];
DS.ECHO = {en: 'Another station. Another signal. The hum is the same, only colder. It points further on.', de: 'Eine andere Station. Ein anderes Signal. Das Summen ist dasselbe, nur kälter. Es zeigt weiter.'};

// Fragments of the other seas (always readable; received at new depth records there)
DS.SIG_R = {
  1: {d: [40, 300, 900, 1800, 2900, 4200, 5600, 6900], t: [
    {en: '…Boreas Station, calling Meridian. We hear your loop. We hear the hum. It is colder here, and it is louder.', de: '…Station Boreas ruft Meridian. Wir hören eure Schleife. Wir hören das Summen. Hier ist es kälter – und lauter.'},
    {en: 'Boreas, day 12. The ice ceiling sings when the hum passes. The divers call it "the choir".', de: 'Boreas, Tag 12. Die Eisdecke singt, wenn das Summen vorbeizieht. Die Taucher nennen es „den Chor“.'},
    {en: 'Day 19. Light means nothing to them up here. Every drill, every engine – they turn toward it.', de: 'Tag 19. Licht ist ihnen hier egal. Jeder Bohrer, jeder Motor – sie drehen sich danach um.'},
    {en: 'Day 23. We drill only when the choir is loud. It covers the sound. Clever, or desperate.', de: 'Tag 23. Wir bohren nur, wenn der Chor laut ist. Er übertönt uns. Klug oder verzweifelt.'},
    {en: 'Day 31. Found a Meridian buoy frozen into the ice. Its recorder still plays Varga\'s voice.', de: 'Tag 31. Eine Meridian-Boje steckte im Eis. Ihr Rekorder spielt noch Vargas Stimme.'},
    {en: 'Day 36. The hum is not one voice. It is many, very far apart, calling to each other.', de: 'Tag 36. Das Summen ist nicht eine Stimme. Es sind viele, weit voneinander entfernt, die sich rufen.'},
    {en: 'Day 40. We stopped the engines and listened for an hour. Something listened back.', de: 'Tag 40. Wir haben die Motoren gestoppt und eine Stunde gelauscht. Etwas hat zurückgelauscht.'},
    {en: 'Boreas Station. Quiet now. If you came this far without a sound – you understand. The signal turns toward the fire.', de: 'Station Boreas. Jetzt still. Wenn du lautlos bis hierher gekommen bist, verstehst du es. Das Signal dreht sich zum Feuer.'},
  ]},
  2: {d: [40, 600, 1800, 3400, 5200, 6900], t: [
    {en: '…Caldera relay. Boreas, Meridian – we hear you both. Down here the water glows.', de: '…Caldera-Relais. Boreas, Meridian – wir hören euch beide. Hier unten leuchtet das Wasser.'},
    {en: 'Caldera, day 5. The vents hum in the same key. We think the hum heats them.', de: 'Caldera, Tag 5. Die Schlote summen in derselben Tonart. Wir glauben, das Summen heizt sie.'},
    {en: 'Day 11. They see our lights and hear our drills. There is nowhere to hide here. Only to be quick.', de: 'Tag 11. Sie sehen unser Licht und hören unsere Bohrer. Hier kann man sich nicht verstecken. Nur schnell sein.'},
    {en: 'Day 17. Three stations, one song. We are not the first to answer it.', de: 'Tag 17. Drei Stationen, ein Lied. Wir sind nicht die Ersten, die antworten.'},
    {en: 'Day 22. The eye at Meridian, the choir at Boreas, the fire here. One creature, or one family.', de: 'Tag 22. Das Auge bei Meridian, der Chor bei Boreas, das Feuer hier. Ein Wesen – oder eine Familie.'},
    {en: 'Caldera. Power restored. Thank you for coming all this way. Keep listening.', de: 'Caldera. Strom wiederhergestellt. Danke, dass du so weit gekommen bist. Hör weiter zu.'},
  ]},
};
DS.sigList = r => r ? DS.SIG_R[Math.min(r, 2)] : {d: DS.SIG_DEPTH, t: DS.SIGNALS};
// Echoes: extra voice logs, only found in signal caches (follow the signal!)
DS.ECHOES = [
  {en: 'Echo – Pilot Ostrowski: "Supply run four. If the hum gets louder, I turn back. Promise."', de: 'Echo – Pilotin Ostrowski: „Versorgungsfahrt vier. Wird das Summen lauter, kehre ich um. Versprochen.“'},
  {en: 'Echo – Cook Abara: "Day 30. Fish soup again. The fish stopped coming close to the windows."', de: 'Echo – Koch Abara: „Tag 30. Wieder Fischsuppe. Die Fische kommen nicht mehr an die Fenster.“'},
  {en: 'Echo – Engineer Lund: "Switching the lamps off calms them. The big ones only see what shines."', de: 'Echo – Ingenieur Lund: „Wenn wir die Lampen ausschalten, beruhigen sie sich. Die Großen sehen nur, was leuchtet.“'},
  {en: 'Echo – Dr. Varga: "Note: the hum is loudest wherever we drop a black box. It likes to be found."', de: 'Echo – Dr. Varga: „Notiz: Das Summen ist dort am lautesten, wo wir eine Blackbox ablegen. Es will gefunden werden.“'},
  {en: 'Echo – Pilot Ostrowski: "Run nine. The hum got louder. I did not turn back."', de: 'Echo – Pilotin Ostrowski: „Fahrt neun. Das Summen wurde lauter. Ich bin nicht umgekehrt.“'},
  {en: 'Echo – Engineer Lund: "Pressure waves every few minutes now. Hold on to something heavy."', de: 'Echo – Ingenieur Lund: „Jetzt alle paar Minuten Druckwellen. Halt dich an etwas Schwerem fest.“'},
  {en: 'Echo – Cook Abara: "Someone keeps humming in the galley. Nobody is in the galley."', de: 'Echo – Koch Abara: „Jemand summt in der Kombüse. Niemand ist in der Kombüse.“'},
  {en: 'Echo – Dr. Varga: "The controls drift near the trench. It is not a fault. It is a hand on ours."', de: 'Echo – Dr. Varga: „Nahe am Graben driftet die Steuerung. Kein Defekt. Eine Hand auf unserer.“'},
  {en: 'Echo – Unknown voice: "…station… listening… come closer…"', de: 'Echo – Unbekannte Stimme: „…Station… hört zu… komm näher…“'},
  {en: 'Echo – Dr. Varga: "If you found all of these, you already know the way. Follow the signal home."', de: 'Echo – Dr. Varga: „Wenn du all das gefunden hast, kennst du den Weg schon. Folge dem Signal nach Hause.“'},
];

// ---------- Predators (attracted by light – or by noise in other seas). Never instant death: they cost oxygen or cargo. ----------
// wind = telegraph time before the lunge; switching the light off during it makes them lose interest.
DS.PRED = {
  // viperfish: small, quick, only nips (a little oxygen, no loot lost) – the second species of the twilight zone
  viper: {name: {en: 'Viperfish', de: 'Vipernfisch'}, minM: 330, len: 70, speed: 150, lunge: 620, wind: 0.85, lungeT: 0.42, hit: 'bite', dmg: 2, nip: true, sense: 480, col: '#b8ff9a'},
  eel: {name: {en: 'Gulper eel', de: 'Pelikanaal'}, minM: 230, len: 112, speed: 135, lunge: 600, wind: 0.95, lungeT: 0.5, hit: 'bite', dmg: 4, sense: 560, col: '#8fe9ff'},
  angler: {name: {en: 'Anglerfish', de: 'Anglerfisch'}, minM: 1050, len: 84, speed: 115, lunge: 560, wind: 1.05, lungeT: 0.55, hit: 'steal', steal: 3, sense: 620, col: '#ffd36a'},
  squid: {name: {en: 'Giant squid', de: 'Riesenkalmar'}, minM: 4000, len: 168, speed: 140, lunge: 640, wind: 1.15, lungeT: 0.6, hit: 'grab', drain: 2.4, grabT: 1.5, sense: 720, col: '#ff7ab0'},
};
// Random events (one per dive at most, from the 3rd dive on)
DS.EVENTS = ['shoal', 'whalefall', 'storm'];

// Daily tasks (3 per day, picked from this pool with the date as seed)
DS.TASKS = [
  {id: 'finds', n: S => 3, ok: S => true},
  {id: 'wrecks', n: S => 5, ok: S => true},
  {id: 'cache', n: S => 2, ok: S => (S.dives || 0) >= 1},
  {id: 'gold', n: S => 1, ok: S => (S.dives || 0) >= 3},
  {id: 'dark', n: S => Math.max(150, Math.min(2000, Math.round((S.rec || 0) * 0.6 / 50) * 50)), ok: S => (S.rec || 0) >= 260},
  {id: 'dodge', n: S => 3, ok: S => (S.rec || 0) >= 300},
  {id: 'sell', n: S => Math.max(300 * DS.regionMult(S), Math.round(DS.avgDive(S) * 3 / 50) * 50), ok: S => true},
  {id: 'contract', n: S => (S.dives || 0) >= 15 ? 2 : 1, ok: S => (S.dives || 0) >= 3},
  {id: 'event', n: S => 1, ok: S => (S.dives || 0) >= 3},
  {id: 'flare', n: S => 2, ok: S => ((S.up || {}).flare || 0) >= 1},
];
DS.taskReward = S => Math.round(DS.avgFloor(S, 100) * 0.8 / 10) * 10;

// ---------- Contracts: one goal per dive (from the 3rd dive on), shown before the dive, paid on top of the loot ----------
// k: reward as a share of the average dive
DS.CONTRACTS = [
  {id: 'box', k: 0.5, ok: S => true},
  {id: 'wrecks', k: 0.5, ok: S => true},
  {id: 'ore', k: 0.5, ok: S => true},
  {id: 'jelly', k: 0.55, ok: S => (S.up.hull || 0) >= 1 && (S.dives || 0) >= 7},
  // "light off" makes no sense where predators hunt by sound (Ice Sea)
  {id: 'dark', k: 0.5, ok: S => (S.dives || 0) >= 6 && DS.lureOf(S.region) !== 'sound'},
  {id: 'deep', k: 0.5, ok: S => (S.dives || 0) >= 6 && (S.rec || 0) < DS.HULL[S.up.hull || 0] - 40},
  {id: 'haul', k: 0.45, ok: S => true},
];
DS.CK = {}; DS.CONTRACTS.forEach(c => DS.CK[c.id] = c.k);
// the reward follows the current average dive (also for a contract that is still open from earlier) – never tiny in a later sea
DS.contractReward = (S, c) => Math.max(40, Math.round(DS.avgFloor(S, 100) * (DS.CK[c.id] || 0.45) / 10) * 10);
DS.makeContract = (S, seed) => {
  const r = DS.rng(DS.hash(seed, 31337)), lim = Math.min(DS.HULL[S.up.hull || 0], DS.FLOOR_M - 300), rec = Math.max(60, S.rec || 0);
  // never the same kind twice in a row
  let pool = DS.CONTRACTS.filter(c => c.ok(S) && c.id !== S.cLast); if (!pool.length) pool = DS.CONTRACTS.filter(c => c.ok(S));
  const c = pool[Math.floor(r() * pool.length)];
  const dv = S.dives || 0, easy = dv < 6, early = dv < 12, z = DS.zoneAt(Math.min(lim, rec)), o = {id: c.id, n: 1, m: 0, prog: 0, done: false};
  // the black box lies where the player has already been (early: well above the record), never below the hull limit
  if (c.id === 'box') { const hi = early ? Math.min(lim - 20, Math.max(50, rec * (easy ? 0.7 : 0.85))) : Math.min(lim - 20, rec + 60), lo = Math.max(40, hi * (early ? 0.45 : 0.55)); o.m = Math.round((lo + (hi - lo) * r()) / 10) * 10; }
  else if (c.id === 'wrecks') o.n = easy ? 1 : z === 0 || early ? 2 : 3;
  else if (c.id === 'ore') o.n = easy ? 1 : z === 0 || early ? 2 : 3;
  else if (c.id === 'jelly') o.n = early ? 2 : 3;
  else if (c.id === 'dark') o.n = rec < 300 ? 15 : rec < 1500 ? 20 : 25;
  else if (c.id === 'deep') o.m = Math.min(lim - 10, Math.round((rec + Math.max(40, rec * 0.12)) / 10) * 10);
  // a full hold is hard deep down (less time per item): at most about half of the hold
  else if (c.id === 'haul') o.n = Math.max(6, Math.round(DS.stats(S).cap * (easy ? 0.4 : early ? 0.5 : 0.5)));
  o.reward = DS.contractReward(S, o);
  return o;
};

// ---------- Materials (normal loot) ----------
DS.MATS = [
  {id: 'scrap', z: 0, col: '#b9c4cc', name: {en: 'Scrap metal', de: 'Altmetall'}},
  {id: 'copper', z: 0, col: '#e08a4f', name: {en: 'Copper wire', de: 'Kupferdraht'}},
  {id: 'brass', z: 1, col: '#e6c15a', name: {en: 'Brass fittings', de: 'Messingteile'}},
  {id: 'goods', z: 1, col: '#a98a6a', name: {en: 'Cargo goods', de: 'Frachtgut'}},
  {id: 'titan', z: 2, col: '#9fb7d6', name: {en: 'Titanium plate', de: 'Titanplatte'}},
  {id: 'circuit', z: 2, col: '#5fe0a0', name: {en: 'Circuit boards', de: 'Platinen'}},
  {id: 'alloy', z: 3, col: '#c99bff', name: {en: 'Rare alloy', de: 'Seltene Legierung'}},
  {id: 'cobalt', z: 3, col: '#4f8cff', name: {en: 'Cobalt crust', de: 'Kobaltkruste'}},
  {id: 'glass', z: 4, col: '#7af7ff', name: {en: 'Black glass', de: 'Schwarzglas'}},
  {id: 'reso', z: 4, col: '#ff8a5c', name: {en: 'Resonant ore', de: 'Resonanzerz'}},
];
DS.ORES = ['copper', 'brass', 'circuit', 'cobalt', 'reso'];
// the Ice Sea has its own loot names
DS.MAT_ICE = {scrap: {en: 'Frozen scrap', de: 'Gefrorenes Altmetall'}, copper: {en: 'Frost copper', de: 'Frostkupfer'}, brass: {en: 'Rimed brass', de: 'Bereiftes Messing'}, goods: {en: 'Ice-bound cargo', de: 'Eingefrorene Fracht'},
  titan: {en: 'Polar titanium', de: 'Polar-Titan'}, circuit: {en: 'Cold circuits', de: 'Kalte Platinen'}, alloy: {en: 'Glacier alloy', de: 'Gletscher-Legierung'}, cobalt: {en: 'Blue cobalt', de: 'Blaukobalt'},
  glass: {en: 'Ice glass', de: 'Eisglas'}, reso: {en: 'Singing ore', de: 'Singendes Erz'}};
DS.matName = (id, region) => (region === 1 && DS.MAT_ICE[id]) || DS.MAT[id].name;
DS.MAT = {}; DS.MATS.forEach(m => DS.MAT[m.id] = m);

// ---------- Finds (collection book, 12 per zone = 60) ----------
// r: rarity 0 common, 1 uncommon, 2 rare
const F = (z, id, r, en, de, len, lde) => ({z, id, r, name: {en, de}, log: {en: len, de: lde}});
DS.FINDS = [
  F(0, 'compass', 0, 'Brass Compass', 'Messingkompass', 'Still points north. Stubbornly.', 'Zeigt noch immer nach Norden. Stur.'),
  F(0, 'watch', 0, "Diver's Watch", 'Taucheruhr', 'Stopped at 4:19. Water resistant, apparently not forever.', 'Stehen geblieben um 4:19. Wasserdicht, aber offenbar nicht ewig.'),
  F(0, 'float', 0, 'Glass Float', 'Glaskugel', 'A fishing float, green as old bottles.', 'Ein Fischerei-Schwimmer, grün wie alte Flaschen.'),
  F(0, 'bottle', 0, 'Message Bottle', 'Flaschenpost', 'The note inside only says: "Do not answer it."', 'Auf dem Zettel steht nur: „Antworte ihm nicht.“'),
  F(0, 'reel', 0, 'Fishing Reel', 'Angelrolle', 'Someone lost the big one here.', 'Hier hat jemand den großen Fang verloren.'),
  F(0, 'radio', 1, 'Pocket Radio', 'Taschenradio', 'Dead batteries. It still hisses when you hold it close.', 'Batterien leer. Es rauscht trotzdem, wenn man es ans Ohr hält.'),
  F(0, 'porthole', 0, 'Porthole', 'Bullauge', 'From a fishing trawler named "Patience".', 'Von einem Fischkutter namens „Geduld“.'),
  F(0, 'bell', 1, "Ship's Bell", 'Schiffsglocke', 'Engraved: M.V. Halcyon, 1962.', 'Graviert: M.S. Halcyon, 1962.'),
  F(0, 'locket', 1, "Sailor's Locket", 'Seemanns-Medaillon', 'A faded photo of a lighthouse.', 'Ein verblasstes Foto von einem Leuchtturm.'),
  F(0, 'lens', 2, 'Lighthouse Lens Shard', 'Leuchtturm-Linse', 'Still bends light into a perfect line.', 'Bricht das Licht noch immer zu einer perfekten Linie.'),
  F(0, 'coins', 1, 'Coin Purse', 'Münzbeutel', 'Old coins from four different countries.', 'Alte Münzen aus vier verschiedenen Ländern.'),
  F(0, 'chain', 0, 'Anchor Shackle', 'Ankerschäkel', 'Heavy. Honest. Rusted shut.', 'Schwer. Ehrlich. Festgerostet.'),

  F(1, 'manifest', 0, 'Manifest Tube', 'Frachtbrief-Rolle', 'Cargo: 40 crates of "scientific glass".', 'Fracht: 40 Kisten „wissenschaftliches Glas“.'),
  F(1, 'logbook', 1, "Captain's Logbook", 'Kapitänslogbuch', 'Last entry: "Hum on the radio again. Changing course."', 'Letzter Eintrag: „Wieder Summen im Funk. Ändern Kurs.“'),
  F(1, 'sextant', 1, 'Brass Sextant', 'Messing-Sextant', 'Calibrated for stars nobody could see down here.', 'Geeicht für Sterne, die hier unten niemand sieht.'),
  F(1, 'teapot', 0, 'Silver Teapot', 'Silberne Teekanne', 'The officers had standards.', 'Die Offiziere hatten Ansprüche.'),
  F(1, 'telegraph', 1, 'Telegraph Key', 'Morsetaste', 'Worn smooth by one message, tapped over and over.', 'Glatt gewetzt von einer Nachricht, immer und immer wieder.'),
  F(1, 'insulator', 0, 'Ceramic Insulator', 'Keramik-Isolator', 'From a cable that once ran all the way down.', 'Von einem Kabel, das einmal ganz nach unten führte.'),
  F(1, 'seal', 0, 'Cargo Seal', 'Frachtsiegel', 'Stamped "MERIDIAN – DO NOT OPEN".', 'Gestempelt „MERIDIAN – NICHT ÖFFNEN“.'),
  F(1, 'wheel', 0, "Ship's Wheel Hub", 'Steuerrad-Nabe', 'The spokes are gone. The brass remembers.', 'Die Speichen fehlen. Das Messing erinnert sich.'),
  F(1, 'record', 1, 'Gramophone Record', 'Schallplatte', 'Label reads "Lullabies of the Deep".', 'Auf dem Etikett: „Wiegenlieder der Tiefe“.'),
  F(1, 'chart', 0, 'Chart Case', 'Kartenköcher', 'A sea chart with one trench circled in red.', 'Eine Seekarte, ein Graben rot eingekreist.'),
  F(1, 'lamp', 0, 'Deck Lamp', 'Decklampe', 'Kerosene, long gone. The glass is unbroken.', 'Das Petroleum ist lange weg. Das Glas ist heil.'),
  F(1, 'binoc', 2, 'Naval Binoculars', 'Marine-Fernglas', 'One lens is fogged from the inside.', 'Eine Linse ist von innen beschlagen.'),

  F(2, 'periscope', 1, 'Periscope Lens', 'Periskop-Linse', 'From the research sub "Kittiwake".', 'Vom Forschungs-U-Boot „Kittiwake“.'),
  F(2, 'headset', 0, 'Sonar Headset', 'Sonar-Kopfhörer', 'The left speaker still crackles at nineteen minutes past.', 'Der linke Hörer knackt noch immer um neunzehn nach.'),
  F(2, 'valve', 0, 'Ballast Valve', 'Ballastventil', 'Stuck open. Someone wanted to go down.', 'Klemmt offen. Jemand wollte nach unten.'),
  F(2, 'hydrobuoy', 1, 'Hydrophone Buoy', 'Hydrofon-Boje', 'Its memory holds one hour of the hum.', 'Im Speicher: eine Stunde Summen.'),
  F(2, 'jar', 0, 'Sample Jar', 'Probenglas', 'Labelled "water, 6800 m". It is warm.', 'Beschriftet „Wasser, 6800 m“. Es ist warm.'),
  F(2, 'gauge', 0, 'Pressure Gauge', 'Druckmesser', 'The needle points past the last number.', 'Die Nadel steht hinter der letzten Zahl.'),
  F(2, 'idcard', 1, 'Meridian ID Card', 'Meridian-Ausweis', 'Dr. Ilse Varga, Acoustics. Clearance: ALL.', 'Dr. Ilse Varga, Akustik. Freigabe: ALLES.'),
  F(2, 'mug', 0, 'Crew Mug', 'Crew-Tasse', '"World\'s okayest diver."', '„Mittelmäßigster Taucher der Welt.“'),
  F(2, 'tape', 1, 'Cassette Tape', 'Kassette', 'Side A: static. Side B: someone humming along.', 'Seite A: Rauschen. Seite B: jemand summt mit.'),
  F(2, 'thermos', 0, 'Thermos', 'Thermoskanne', 'Still holds coffee. Do not drink it.', 'Noch Kaffee drin. Nicht trinken.'),
  F(2, 'camera', 2, 'Deep-Sea Camera', 'Tiefseekamera', 'The last photo is just a very large shadow.', 'Das letzte Foto zeigt nur einen sehr großen Schatten.'),
  F(2, 'beacon', 2, 'Emergency Beacon', 'Notfunkbake', 'It blinks in time with the hum.', 'Es blinkt im Takt des Summens.'),

  F(3, 'sponge', 0, 'Glass Sponge', 'Glasschwamm', 'A skeleton of pure silica, delicate as lace.', 'Ein Skelett aus reinem Glas, zart wie Spitze.'),
  F(3, 'pearl', 2, 'Black Pearl', 'Schwarze Perle', 'Larger than any oyster could make.', 'Größer, als jede Auster sie machen könnte.'),
  F(3, 'plate', 0, 'Station Hull Plate', 'Stations-Rumpfplatte', 'Bent outward. From the inside.', 'Nach außen gebogen. Von innen.'),
  F(3, 'notebook', 1, "Varga's Notebook", 'Vargas Notizbuch', 'Pages of one waveform, drawn by hand, perfectly.', 'Seitenweise eine Wellenform, von Hand gezeichnet, perfekt.'),
  F(3, 'photo', 1, 'Crew Photo', 'Crew-Foto', 'Twelve smiling people. Someone circled the window behind them.', 'Zwölf lächelnde Menschen. Jemand hat das Fenster hinter ihnen eingekreist.'),
  F(3, 'crystal', 1, 'Glow Crystal', 'Leuchtkristall', 'Pulses softly. Gets brighter when you hum.', 'Pulsiert sanft. Wird heller, wenn man summt.'),
  F(3, 'clock', 0, 'Frozen Clock', 'Stehende Uhr', 'Wall clock from the mess hall. 4:19.', 'Wanduhr aus der Messe. 4:19.'),
  F(3, 'chip', 0, 'Relay Chip', 'Relais-Chip', 'Part of the transmitter that never stopped.', 'Teil des Senders, der nie aufgehört hat.'),
  F(3, 'amber', 1, 'Abyssal Amber', 'Tiefsee-Bernstein', 'Something tiny and glowing is caught inside.', 'Darin ist etwas Winziges, Leuchtendes eingeschlossen.'),
  F(3, 'helmet', 0, 'Diving Helmet', 'Taucherhelm', 'Pressure-warped, but the visor is clean.', 'Vom Druck verformt, aber das Visier ist sauber.'),
  F(3, 'tag', 0, 'Specimen Tag #19', 'Probenetikett Nr. 19', '"Too large for the tank. Released."', '„Zu groß für das Becken. Freigelassen.“'),
  F(3, 'idol', 2, 'Coral Idol', 'Korallen-Figur', 'Not carved. Grown. In the shape of an ear.', 'Nicht geschnitzt. Gewachsen. In Form eines Ohres.'),

  F(4, 'core', 2, 'Beacon Core', 'Baken-Kern', 'The heart of the Meridian transmitter. Still warm.', 'Das Herz des Meridian-Senders. Noch warm.'),
  F(4, 'nameplate', 1, 'Station Nameplate', 'Stations-Schild', 'MERIDIAN – HADAL RESEARCH – EST. 1994.', 'MERIDIAN – HADAL-FORSCHUNG – SEIT 1994.'),
  F(4, 'door', 0, 'Door Fragment', 'Türstück', 'The paint says "AIRLOCK 2". It opens outward.', 'Die Farbe sagt „SCHLEUSE 2“. Sie öffnet nach außen.'),
  F(4, 'shell', 0, 'Resonant Shell', 'Klingende Muschel', 'Hold it to your ear. Hear the hum.', 'Ans Ohr halten. Das Summen hören.'),
  F(4, 'scale', 1, 'Giant Scale', 'Riesenschuppe', 'Wide as a car door, light as paper.', 'Breit wie eine Autotür, leicht wie Papier.'),
  F(4, 'eyeglass', 1, 'Observation Glass', 'Beobachtungsglas', 'From the big window. Not a single scratch.', 'Vom großen Fenster. Kein einziger Kratzer.'),
  F(4, 'vtape', 2, "Varga's Tape", 'Vargas Band', '"Tell them we chose this." Then: humming.', '„Sag ihnen, wir haben es so gewollt.“ Dann: Summen.'),
  F(4, 'key', 0, 'Anchor Release Key', 'Anker-Schlüssel', 'Turned all the way.', 'Bis zum Anschlag gedreht.'),
  F(4, 'tpearl', 1, 'Trench Pearl', 'Grabenperle', 'Lit from within, like a tiny moon.', 'Leuchtet von innen, wie ein kleiner Mond.'),
  F(4, 'stone', 0, 'Humming Stone', 'Summender Stein', 'It vibrates very gently in your hand.', 'Er vibriert ganz leicht in der Hand.'),
  F(4, 'page', 0, 'Last Log Page', 'Letzte Logbuchseite', '"Day 79. It sees us. We are not afraid."', '„Tag 79. Es sieht uns. Wir haben keine Angst.“'),
  F(4, 'first', 2, 'The First Signal', 'Das erste Signal', 'A tiny recorder. On it, the hum, years before Meridian was built.', 'Ein winziges Aufnahmegerät. Darauf das Summen, Jahre bevor Meridian gebaut wurde.'),
];
DS.FIND = {}; DS.FINDS.forEach((f, i) => { f.i = i; DS.FIND[f.id] = f; });
DS.RAR_W = [1, 0.42, 0.14];
DS.RAR_MULT = [1, 2, 4];

// ---------- helpers ----------
DS.rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
DS.hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= v & 0xffffffff; h = Math.imul(h, 16777619); h ^= h >>> 13; } return h >>> 0; };
// numbers follow the language: 6,900 m / 6.900 m · ×30.3 / ×30,3 · 1.63M / 1,63 Mio. · 71% / 71 %
const isDe = () => DS.lang === 'de';
DS.num = (v, d = 0) => { const s = Number(v).toFixed(d), [a, b] = s.split('.'), neg = a[0] === '-', i = neg ? a.slice(1) : a;
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, isDe() ? '.' : ','); return (neg ? '-' : '') + g + (b ? (isDe() ? ',' : '.') + b : ''); };
DS.fmt = v => {
  v = Math.floor(v);
  if (v < 100000) return DS.num(v);
  const u = isDe() ? [[1e12, '\u00a0Bio.'], [1e9, '\u00a0Mrd.'], [1e6, '\u00a0Mio.'], [1e3, '\u00a0Tsd.']] : [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [d, s] of u) if (v >= d) { const x = v / d; return (x < 10 ? DS.num(x, 2) : x < 100 ? DS.num(x, 1) : DS.num(Math.floor(x))) + s; }
  return String(v);
};
DS.fmtM = m => DS.num(Math.round(m)) + '\u00a0m';
DS.pct = v => v + (isDe() ? '\u00a0%' : '%');
DS.dayKey = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
})(typeof window !== 'undefined' ? (window.DS = window.DS || {}) : (globalThis.DS = globalThis.DS || {}));
