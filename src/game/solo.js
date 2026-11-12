(() => {
  const PW = 52, CAP = 16;
  const GREEN = { main:'#4cd964', light:'#b6ffa8', dark:'#1e8a3c' };
  const PINK  = { main:'#ff7eb6', light:'#ffc2dc', dark:'#b3265f' };
  const INK = '#1a1033', BROWN = '#2b1b00';
  const canvas = document.getElementById('c');
  let ctx = canvas.getContext('2d');

  // Two layouts: portrait 2:3 (phones, narrow windows) and landscape 16:9 (PC, laptops)
  let L = null, W = 320, H = 480, GROUND = 430, SPACING = 175, GMAX = 150, GMIN = 105, TW = 420;
  let state = 'READY', screen = 'MENU', settingsFrom = 'MENU', focus = 0, btns = [], toasts = [];
  let resetArmed = false, runPink = 0, score = 0, newBest = false;
  let shake = 0, flash = 0, pop = 0, overAt = 0, groundX = 0, bgX = 0, ticks = 0;
  let pipes = [], particles = [], stars = [], skyline = [], clouds = [], weather = [], trailParticles = [];

  const store = {
    get(k, d) { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k))); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const cfg = store.get('flyingBirdCfg', { theme: 'NIGHT', music: 4, sfx: 7, cb: 'OFF', fx: false, diff: 'NORMAL', skin: 0, muted: false, lang: 'EN', map: 'CITY', fps: 'MAX', showFps: false });
  if (!['EN', 'ZH', 'RU', 'ES', 'PT'].includes(cfg.lang)) cfg.lang = 'EN';
  const save = store.get('flyingBirdSave', { best: { EASY: 0, NORMAL: 0, HARD: 0, EXTREME: 0 }, games: 0, flaps: 0, pipes: 0, earnedCoins: 0, ach: {} });
  // Older saves have only three difficulty records; initialize EXTREME safely.
  save.best = Object.assign({EASY:0,NORMAL:0,HARD:0,EXTREME:0}, save.best || {});
  window.flyingBirdRenderFps = () => cfg.fps;
  const saveCfg = () => { store.set('flyingBirdCfg', cfg); window.dispatchEvent(new Event('flyingbird:progress-changed')); };
  const saveGame = () => { store.set('flyingBirdSave', save); window.dispatchEvent(new Event('flyingbird:progress-changed')); };
  const bestNow = () => save.best[cfg.diff] || 0;
  const maxBest = () => Math.max(0, ...['EASY','NORMAL','HARD','EXTREME'].map(mode => Number(save.best[mode])||0));
  const themeName = () => cfg.theme !== 'AUTO' ? cfg.theme : (h => (h >= 6 && h < 19 ? 'DAY' : 'NIGHT'))(new Date().getHours());

  const DIFF = {
    EASY: { gap: 15, spd: 0.9, mv: 15 }, NORMAL: { gap: 0, spd: 1, mv: 10 },
    HARD: { gap: -10, spd: 1.12, mv: 5 },
    EXTREME: { gap: -5, spd: 1.12, mv: 3 }
  };
  // Collectible coin payouts scale by obstacles already passed in this run.
  // Each mode has its own 2-coin and 3-coin unlock thresholds.
  const COIN_REWARD_THRESHOLDS = {
    EASY: [50, 100], NORMAL: [35, 70], HARD: [26, 52], EXTREME: [14, 36]
  };
  const coinReward = (mode, passedPipes) => {
    const [twoCoins, threeCoins] = COIN_REWARD_THRESHOLDS[mode] || COIN_REWARD_THRESHOLDS.NORMAL;
    return passedPipes >= threeCoins ? 3 : passedPipes >= twoCoins ? 2 : 1;
  };
  // One EXTREME level every eight scored pipes. A cap keeps it progressively
  // challenging without producing mathematically unplayable gaps or speeds.
  const extremeTier = () => cfg.diff === 'EXTREME' ? Math.min(10, Math.floor(score / 8)) : 0;
  const hardTier = () => cfg.diff === 'HARD' ? Math.min(10, Math.floor(score / 16)) : 0;
  const hardGap = () => Math.max(GMIN - 12, GMAX - 10 - score * 1.2 - hardTier() * 1.7);
  const extremeLevel = () => extremeTier() + 1;
  const extremeGap = () => Math.max(GMIN - 12, GMAX - 5 - score * 1.05 - extremeTier() * 1.7);
  const extremeSpeedMultiplier = () => 1 + extremeTier() * 0.052;
  const THEMES = {
    NIGHT: { sky: ['#0f0c29', '#302b63', '#d4638f'], mount: '#2a2468', snow: '#d8d4ff', city: INK, top: '#2b2250', lit: '#ffd66b', off: '#2b2250', cloud: 'rgba(255,226,240,0.22)' },
    DAY:   { sky: ['#3aa0ff', '#7fd0ff', '#d6f3ff'], mount: '#6f8fd8', snow: '#ffffff', city: '#4a5f9a', top: '#6d84c0', lit: '#bcd6f7', off: '#5f78b0', cloud: 'rgba(255,255,255,0.8)' }
  };
  const SKINS = [
    { name: 'CLASSIC', need: 0,  body: '#ffd23f', hi: '#ffe98a', wing: '#ff9f1c', wingD: '#d97a00', belly: '#fff4d6' },
    { name: 'RED',     need: 15, body: '#ff5a4d', hi: '#ff9a8f', wing: '#b3261e', wingD: '#7a150f', belly: '#ffe0dc' },
    { name: 'BLUE',    need: 30, body: '#4da3ff', hi: '#9fd0ff', wing: '#1f5fbf', wingD: '#143f80', belly: '#e6f2ff' },
    { name: 'GHOST',   need: 50, body: '#e8e8f5', hi: '#ffffff', wing: '#9aa0c8', wingD: '#6c7299', belly: '#ffffff' },
    // Five themes, two shop skins each. All skins reuse the exact same pixel geometry.
    { name: 'LEAF',    theme: 'NATURE', price: 200, body: '#78c850', hi: '#c7f58a', wing: '#3c9b45', wingD: '#236b32', belly: '#efffd5' },
    { name: 'BLOOM',   theme: 'NATURE', price: 200, body: '#ff9acb', hi: '#ffd5e8', wing: '#d94d91', wingD: '#9e2866', belly: '#fff0f7' },
    { name: 'NEBULA',  theme: 'SPACE',  price: 200, body: '#9b7bff', hi: '#d8caff', wing: '#6544c9', wingD: '#40278f', belly: '#f0eaff' },
    { name: 'COSMIC',  theme: 'SPACE',  price: 200, body: '#42c9d8', hi: '#b5f8ff', wing: '#287cae', wingD: '#175274', belly: '#e6ffff' },
    { name: 'EMBER',   theme: 'FIRE',   price: 200, body: '#ff8a3d', hi: '#ffd08a', wing: '#df452e', wingD: '#98251f', belly: '#fff0cf' },
    { name: 'MAGMA',   theme: 'FIRE',   price: 200, body: '#e94b4b', hi: '#ffaaaa', wing: '#8e244f', wingD: '#571735', belly: '#ffe2d7' },
    { name: 'AQUA',    theme: 'OCEAN',  price: 200, body: '#38c6c8', hi: '#b4ffff', wing: '#2386b8', wingD: '#155578', belly: '#e3ffff' },
    { name: 'CORAL',   theme: 'OCEAN',  price: 200, body: '#ff806b', hi: '#ffd0b8', wing: '#d34d67', wingD: '#8d2948', belly: '#fff0df' },
    { name: 'MINT',    theme: 'SWEETS', price: 200, body: '#a7e8c2', hi: '#e5ffdf', wing: '#56b9a0', wingD: '#317d79', belly: '#f4fff1' },
    { name: 'BERRY',   theme: 'SWEETS', price: 200, body: '#c77dff', hi: '#edc9ff', wing: '#9149c5', wingD: '#5c2d8c', belly: '#fff0ff' },
    { name: 'PHOENIX', theme: 'FIRE', price: 250, rarity:'EPIC', body:'#ff6335',hi:'#ffd067',wing:'#f33526',wingD:'#9c2428',belly:'#ffe0aa' },
    { name: 'FROSTWING', theme:'ICE', price:200, rarity:'RARE', body:'#7be0ff',hi:'#e2ffff',wing:'#43a8ed',wingD:'#3779bb',belly:'#f3ffff' },
    { name: 'CYBER BIRD', theme:'CYBER', price:275, rarity:'EPIC', body:'#5c5b87',hi:'#64f4ff',wing:'#a14ce8',wingD:'#4c248b',belly:'#d2eaff' },
    { name: 'GALAXY BIRD', theme:'SPACE', price:300, rarity:'LEGENDARY', body:'#5933a8',hi:'#d4a7ff',wing:'#8b53e9',wingD:'#38216f',belly:'#f6d8ff' },
    { name: 'FOREST SPIRIT', theme:'NATURE', price:225, rarity:'RARE', body:'#56b96c',hi:'#c8f5a0',wing:'#2d9054',wingD:'#22603e',belly:'#e8ffb9' },
    { name: 'ARCTIC OWL', theme:'ICE', price:275, rarity:'EPIC', body:'#f2f8ff',hi:'#ffffff',wing:'#8fc3f0',wingD:'#4f7fb8',belly:'#dcecff' },
    { name: 'ROYAL RAVEN', theme:'ROYAL', price:325, rarity:'LEGENDARY', body:'#1c1530',hi:'#4a3a7a',wing:'#6a3fb0',wingD:'#2a1a4e',belly:'#3a2c5c' },
    { name: 'JADE BIRD', theme:'JADE', price:275, rarity:'EPIC', body:'#2fbf8a',hi:'#9af0cf',wing:'#1b8a62',wingD:'#0f5a40',belly:'#d6ffe9' }
    ,{name:'Lorean',art:'lorean',theme:'SWEETS',price:600,bundleTrail:'STARDUST',body:'#82bd48',hi:'#c7ef86',wing:'#579844',wingD:'#326b42',belly:'#b8db79'}
    // ELITE tier: six premium skins, 350 coins each (same pixel geometry as every other skin).
    ,{ name: 'AURUM',        theme:'ELITE', price:350, rarity:'ELITE', body:'#e0a516',hi:'#ffe27a',wing:'#8f5b0e',wingD:'#573406',belly:'#fff0b8' }
    ,{ name: 'OBSIDIAN',     theme:'ELITE', price:350, rarity:'ELITE', body:'#17141f',hi:'#5a4f6b',wing:'#d11f3f',wingD:'#7a0f27',belly:'#3a2f46' }
    ,{ name: 'ABYSS',        theme:'ELITE', price:350, rarity:'ELITE', body:'#0e2a52',hi:'#3fe0ff',wing:'#1a6fd6',wingD:'#0a3578',belly:'#bfe9ff' }
    ,{ name: 'ECLIPSE',      theme:'ELITE', price:350, rarity:'ELITE', body:'#241038',hi:'#ffb347',wing:'#ff7a18',wingD:'#a63d00',belly:'#4b2a6b' }
    ,{ name: 'EMERALD KING', theme:'ELITE', price:350, rarity:'ELITE', body:'#0c4a34',hi:'#3fe0a0',wing:'#e8b923',wingD:'#8a6a0a',belly:'#c9f5de' }
    ,{ name: 'PLATINUM',     theme:'ELITE', price:350, rarity:'ELITE', body:'#aab4c4',hi:'#f2f6fc',wing:'#3f5bd0',wingD:'#24348a',belly:'#e9eef7' }
    ,{ name: 'ZxcGoul', art: 'zxcgoul', theme: 'SPECIAL', price: 450, rarity: 'SPECIAL', body: '#16141e', hi: '#ffffff', wing: '#ae1127', wingD: '#590719', belly: '#34303d' }
  ];
  const SHOP_MAPS = [
    {id:'SAKURA',name:'SAKURA GARDEN',price:250,rarity:'RARE'},
    {id:'NEON',name:'NEON CITY',price:300,rarity:'EPIC'},
    {id:'OCEAN',name:'OCEAN DEPTHS',price:275,rarity:'RARE'},
    {id:'VOLCANO_PLUS',name:'VOLCANO CORE',price:300,rarity:'EPIC'},
    {id:'COSMIC',name:'COSMIC VOYAGE',price:300,rarity:'LEGENDARY'},
    {id:'FOREST',name:'ENCHANTED FOREST',price:325,rarity:'EPIC'},
    {id:'CRYSTAL',name:'CRYSTAL CAVERNS',price:350,rarity:'LEGENDARY'},
    {id:'DESERT',name:'DESERT MIRAGE',price:300,rarity:'EPIC'},
    {id:'CELESTIAL',name:'CELESTIAL ISLANDS',price:450,rarity:'LEGENDARY'},
    {id:'CYBERPUNK',name:'CYBERPUNK DISTRICT',price:500,rarity:'LEGENDARY'},
    {id:'MYSTIC',name:'MYSTIC FOREST',price:550,rarity:'LEGENDARY'},
    {id:'SHATTERED',name:'SHATTERED MOON',price:650,rarity:'LEGENDARY'},
    // Mythic worlds: unique animated environments, obstacle inlays and quality-scaled ambience.
    {id:'TEMPEST',name:'TEMPEST CITADEL',price:700,rarity:'LEGENDARY'},
    {id:'ECLIPSE_REALM',name:'ECLIPSE SANCTUARY',price:775,rarity:'LEGENDARY'},
    {id:'PRISM',name:'PRISM CATHEDRAL',price:825,rarity:'LEGENDARY'},
    {id:'CLOCKWORK',name:'CLOCKWORK NEXUS',price:875,rarity:'LEGENDARY'},
    {id:'AURORA',name:'AURORA CROWN',price:950,rarity:'LEGENDARY'},
    {id:'NECROPOLIS',name:'CRIMSON NECROPOLIS',price:1100,rarity:'LEGENDARY'}
  ];
  const TRAILS = [
    {id:'FIRE',name:'FIRE',price:150,rarity:'RARE',colors:['#ffba35','#ff5127','#ffe279']},
    {id:'WATER',name:'WATER',price:150,rarity:'RARE',colors:['#65d9ff','#2b8fff','#c5f8ff']},
    {id:'LIGHTNING',name:'LIGHTNING',price:200,rarity:'EPIC',colors:['#ad76ff','#f2dbff','#6e9bff']},
    {id:'RAINBOW',name:'RAINBOW',price:250,rarity:'EPIC',colors:['#ff5d79','#ffe166','#66f5ad','#7cc9ff','#bd83ff']},
    {id:'NATURE',name:'NATURE',price:175,rarity:'RARE',colors:['#62d477','#a9ed5c','#d4ff98']},
    {id:'GOLDEN',name:'GOLDEN',price:300,rarity:'LEGENDARY',colors:['#ffca35','#fff4aa','#ff9c29']},
    {id:'FROST',name:'FROST',price:200,rarity:'RARE',colors:['#e6fbff','#9be9ff','#5fc8ff']},
    {id:'STARDUST',name:'STARDUST',price:225,rarity:'EPIC',colors:['#fff6b0','#ffe066','#ffffff','#ffb3f0']},
    {id:'SHADOW',name:'SHADOW',price:225,rarity:'EPIC',colors:['#3a1b66','#5b2a9a','#240f45']},
    {id:'AURORA',name:'AURORA',price:300,rarity:'LEGENDARY',colors:['#5dffb0','#5de0ff','#b07aff','#ff7ad8']},
    {id:'HEART',name:'HEARTS',price:250,rarity:'EPIC',colors:['#ff5d8f','#ff9ac0','#ffd0e0']},
    // Eight new silhouette-driven effects. Existing IDs/order remain unchanged for cloud saves.
    {id:'RIFT',name:'RIFT',price:400,rarity:'EPIC',colors:['#a16cff','#72f7e7','#281354']},
    {id:'ARCANE',name:'ARCANE SIGILS',price:425,rarity:'EPIC',colors:['#e8c47c','#ba8cff','#fff5d1']},
    {id:'CHRONO',name:'CHRONO GEARS',price:450,rarity:'LEGENDARY',colors:['#e9b95b','#78d9e8','#684f74']},
    {id:'ORIGAMI',name:'ORIGAMI FLIGHT',price:375,rarity:'EPIC',colors:['#fff8e9','#b6ddff','#ffb6cb']},
    {id:'MOTH',name:'LUMEN MOTHS',price:425,rarity:'LEGENDARY',colors:['#a3ffe1','#a88bff','#f7dcff']},
    {id:'PRISM',name:'PRISM SHARDS',price:475,rarity:'LEGENDARY',colors:['#79ecff','#ff80e9','#fff1aa']},
    {id:'GLITCH',name:'GLITCH',price:450,rarity:'LEGENDARY',colors:['#47efff','#ff4ca8','#d9f9ff']},
    {id:'CONSTELLATION',name:'CONSTELLATION',price:550,rarity:'LEGENDARY',colors:['#c4c7ff','#fff1b7','#78dcff']},
    // Six hand-drawn trails; append-only IDs preserve existing players' cloud cosmetics.
    {id:'INKFLOW',name:'INK FLOW',price:350,rarity:'EPIC',colors:['#131b28','#647487','#d4e1eb']},
    {id:'BUBBLE',name:'BUBBLEVERSE',price:375,rarity:'EPIC',colors:['#85e7ff','#ffc1eb','#c7d8ff']},
    {id:'SONIC',name:'SONIC PULSE',price:450,rarity:'LEGENDARY',colors:['#49edff','#867bff','#e3ffff']},
    {id:'PHOENIX',name:'PHOENIX FEATHERS',price:500,rarity:'LEGENDARY',colors:['#f7b447','#ff7242','#fff0b4']},
    {id:'LUNAR',name:'LUNAR PHASES',price:575,rarity:'LEGENDARY',colors:['#d8e4fa','#7e97cf','#f8faff']},
    {id:'OMEN',name:'CRIMSON OMEN',price:650,rarity:'LEGENDARY',colors:['#10111e','#a4172a','#ff5061']}
  ];
  const wallet = store.get('flyingBirdWallet', { coins: 0, owned: [], maps: [], trails: [] });
  wallet.coins = Math.max(0, Math.floor(Number(wallet.coins) || 0));
  wallet.owned = Array.isArray(wallet.owned) ? wallet.owned.filter(i => Number.isInteger(i) && i >= 4 && i < SKINS.length) : [];
  wallet.maps = Array.isArray(wallet.maps) ? [...new Set(wallet.maps.filter(id => SHOP_MAPS.some(m => m.id === id)))] : [];
  wallet.trails = Array.isArray(wallet.trails) ? [...new Set(wallet.trails.filter(id => TRAILS.some(t => t.id === id)))] : [];
  cfg.trail = TRAILS.some(t => t.id === cfg.trail) && wallet.trails.includes(cfg.trail) ? cfg.trail : 'NONE';
  cfg.particleQuality = ['AUTO','HIGH','LOW','OFF'].includes(cfg.particleQuality) ? cfg.particleQuality : 'AUTO';
  const saveWallet = () => { store.set('flyingBirdWallet', wallet); window.dispatchEvent(new Event('flyingbird:progress-changed')); };
  // Apply a cloud save to the game's live objects (not just localStorage).
  window.addEventListener('flyingbird:apply-progress', e => {
    const data = e.detail || {};
    if (data.cfg && typeof data.cfg === 'object') {
      Object.assign(cfg, data.cfg);
      if (!['EASY','NORMAL','HARD','EXTREME'].includes(cfg.diff)) cfg.diff = 'NORMAL';
      if (!['EN','ZH','RU','ES','PT'].includes(cfg.lang)) cfg.lang = 'EN';
      if (!MAPS[cfg.map]) cfg.map = 'CITY';
      cfg.fps = String(cfg.fps);
      if (cfg.fps !== 'MAX' && !/^\d{2,3}$/.test(cfg.fps)) cfg.fps = 'MAX';
      if (!['AUTO','HIGH','LOW','OFF'].includes(cfg.particleQuality)) cfg.particleQuality = 'AUTO';
    }
    if (data.save && typeof data.save === 'object') {
      const x = data.save;
      save.best = Object.fromEntries(['EASY','NORMAL','HARD','EXTREME'].map(d => [d, Math.max(0,Number(x.best?.[d])||0)]));
      save.games = Math.max(0,Number(x.games)||0);
      save.flaps = Math.max(0,Number(x.flaps)||0);
      save.pipes = Math.max(0,Number(x.pipes)||0);
      save.earnedCoins = Math.max(0,Number(x.earnedCoins)||0);
      save.ach = x.ach && typeof x.ach === 'object' ? x.ach : {};
    }
    if (data.wallet && typeof data.wallet === 'object') {
      wallet.coins = Math.max(0,Math.floor(Number(data.wallet.coins)||0));
      wallet.owned = Array.isArray(data.wallet.owned) ? [...new Set(data.wallet.owned.filter(i => Number.isInteger(i) && i >= 4 && i < SKINS.length))] : [];
      wallet.maps = Array.isArray(data.wallet.maps) ? [...new Set(data.wallet.maps.filter(id => SHOP_MAPS.some(m => m.id === id)))] : [];
      wallet.trails = Array.isArray(data.wallet.trails) ? [...new Set(data.wallet.trails.filter(id => TRAILS.some(t => t.id === id)))] : [];
    }
    if (!skinOK(cfg.skin)) cfg.skin = 0;
    if (!mapOK(cfg.map)) cfg.map = 'CITY';
    if (!wallet.trails.includes(cfg.trail)) cfg.trail = 'NONE';
    store.set('flyingBirdCfg',cfg); store.set('flyingBirdSave',save); store.set('flyingBirdWallet',wallet);
    initWeather();
  });
  const ACH = [
    { id: 'first', name: 'FIRST FLIGHT', desc: 'Finish your first game' },
    { id: 's5',    name: 'ROOKIE',       desc: 'Score 5' },
    { id: 's15',   name: 'PRO',          desc: 'Score 15' },
    { id: 's30',   name: 'MASTER',       desc: 'Score 30' },
    { id: 's50',   name: 'LEGEND',       desc: 'Score 50' },
    { id: 'pink',  name: 'PINK PASSER',  desc: 'Pass 5 moving pipes in one run' },
    { id: 'reg',   name: 'REGULAR',      desc: 'Play 25 games' },
    { id: 'flap',  name: 'FLAP HAPPY',   desc: 'Flap 1000 times' },
    { id: 'owl',   name: 'NIGHT OWL',    desc: 'Score 10 at night' },
    { id: 'early', name: 'EARLY BIRD',   desc: 'Score 10 by day' }
  ];
  const PIPES = {   // [static pipe, moving pipe]: color-blind modes keep the two clearly different
    'OFF': [GREEN, PINK],
    'RED-GREEN': [{ main: '#3a86ff', light: '#a9d0ff', dark: '#1b4fa8' }, { main: '#ff9f1c', light: '#ffd699', dark: '#b35f00' }],
    'BLUE-YELLOW': [{ main: '#e63946', light: '#ffa3aa', dark: '#9d1f2b' }, { main: '#2ec4b6', light: '#a8f0e8', dark: '#13766d' }],
    'HIGH CONTRAST': [{ main: '#ffffff', light: '#ffffff', dark: '#9a9a9a' }, { main: '#ffe600', light: '#fff7a0', dark: '#a89a00' }]
  };

  // ---------- Maps ----------
  const MAP_KEYS = ['CITY', 'MOUNTAINS', 'VOLCANO', 'SAKURA', 'NEON', 'OCEAN', 'VOLCANO_PLUS', 'COSMIC', 'FOREST', 'CRYSTAL', 'DESERT', 'CELESTIAL', 'CYBERPUNK', 'MYSTIC', 'SHATTERED', 'TEMPEST', 'ECLIPSE_REALM', 'PRISM', 'CLOCKWORK', 'AURORA', 'NECROPOLIS'];
  const MAPS = {
    CITY: { pipes: [GREEN, PINK] },
    MOUNTAINS: { pipes: [{ main: '#8fd3ff', light: '#e6f8ff', dark: '#4a90c2' }, { main: '#b9a0ff', light: '#e6dcff', dark: '#6d4fc0' }] },
    VOLCANO: { pipes: [{ main: '#4a3d44', light: '#8a7780', dark: '#2a1f25' }, { main: '#ff7b2e', light: '#ffc27a', dark: '#b8400f' }] },
    SAKURA: { pipes: [{main:'#7bb47a',light:'#d5ffb9',dark:'#3c7556'},{main:'#e977ae',light:'#ffd6e9',dark:'#a84878'}] },
    NEON: { pipes: [{main:'#26b4c7',light:'#91faff',dark:'#126179'},{main:'#b36aff',light:'#efc7ff',dark:'#6936a2'}] },
    OCEAN: { pipes: [{main:'#21a9b2',light:'#b3faff',dark:'#146179'},{main:'#d97a9b',light:'#ffd2df',dark:'#9b4968'}] },
    VOLCANO_PLUS: { pipes: [{main:'#6c4051',light:'#c28798',dark:'#342334'},{main:'#ff792b',light:'#ffce64',dark:'#a63d1e'}] },
    COSMIC: { pipes: [{main:'#7464da',light:'#cbc1ff',dark:'#393385'},{main:'#e16bb6',light:'#ffbce5',dark:'#84386c'}] },
    FOREST: { pipes: [{main:'#6a4a30',light:'#b38a5a',dark:'#3a2716'},{main:'#35b08a',light:'#a8ffd8',dark:'#1a6a58'}] },
    CRYSTAL: { pipes: [{main:'#4aa8d8',light:'#c8f4ff',dark:'#24608f'},{main:'#9a6af0',light:'#e2d0ff',dark:'#5a35a8'}] },
    DESERT: { pipes: [{main:'#d9a85c',light:'#ffe3a8',dark:'#8f5f2a'},{main:'#c9692e',light:'#ffb67a',dark:'#7a3414'}] },
    CELESTIAL: { pipes: [{main:'#9c91cf',light:'#f3e6bd',dark:'#555385'},{main:'#cb9b57',light:'#fff1be',dark:'#8b5c4d'}] },
    CYBERPUNK: { pipes: [{main:'#273f77',light:'#66f3f2',dark:'#132046'},{main:'#7b2b79',light:'#ff8cd8',dark:'#3c194f'}] },
    MYSTIC: { pipes: [{main:'#30695e',light:'#a5fbe1',dark:'#163c3b'},{main:'#665093',light:'#e5c6ff',dark:'#342453'}] },
    SHATTERED: { pipes: [{main:'#393757',light:'#c7b6f8',dark:'#191b39'},{main:'#87476e',light:'#ffc0a0',dark:'#452648'}] },
    TEMPEST: { pipes: [{main:'#35536d',light:'#b6d8e8',dark:'#142b48'},{main:'#6178a4',light:'#e8f5ff',dark:'#2e4370'}] },
    ECLIPSE_REALM: { pipes: [{main:'#292238',light:'#ffa45a',dark:'#120d20'},{main:'#723041',light:'#ffca85',dark:'#331626'}] },
    PRISM: { pipes: [{main:'#658cba',light:'#c9ffff',dark:'#304a93'},{main:'#9c6bd2',light:'#ffe7ff',dark:'#513d9e'}] },
    CLOCKWORK: { pipes: [{main:'#8e6541',light:'#ffe0a0',dark:'#403327'},{main:'#356c70',light:'#baffed',dark:'#20444c'}] },
    AURORA: { pipes: [{main:'#40788c',light:'#d1ffff',dark:'#24466c'},{main:'#4c649c',light:'#d9dcff',dark:'#232e62'}] },
    NECROPOLIS: { pipes: [{main:'#221322',light:'#6f3b48',dark:'#09050b'},{main:'#3d0f1c',light:'#d14d62',dark:'#19060a'}] }
  };
  if (!MAPS[cfg.map]) cfg.map = 'CITY';
  cfg.fps = String(cfg.fps);
  if (cfg.fps !== 'MAX' && !/^\d{2,3}$/.test(cfg.fps)) cfg.fps = 'MAX';
  function initWeather() {   // snow on the mountains, rising embers on the volcano
    const n = cfg.map === 'MOUNTAINS' ? Math.round(W * H / 2200) : cfg.map === 'VOLCANO' ? Math.round(W * H / 5000) : 0;
    weather = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() < 0.3 ? 2 : 1, p: Math.random() * 6.28 }));
  }

  // ---------- Player profile ----------
  // ID format: FB-XXXX-XXXX. 7 random characters + 1 check character (so a mistyped ID can be caught
  // before it is ever sent to a server). The alphabet has no 0/O/1/I/L to avoid look-alike mistakes.
  const ID_CH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const idCheck = body => ID_CH[[...body].reduce((t, c, i) => t + (ID_CH.indexOf(c) + 1) * (i + 1), 0) % ID_CH.length];
  function newId() {
    const r = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(7)) : Array.from({ length: 7 }, () => Math.floor(Math.random() * 256));
    const body = Array.from(r, b => ID_CH[b % ID_CH.length]).join('');
    const full = body + idCheck(body);
    return 'FB-' + full.slice(0, 4) + '-' + full.slice(4);
  }
  function isValidId(id) {
    const m = /^FB-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(String(id || ''));
    if (!m) return false;
    const full = m[1] + m[2];
    return [...full].every(c => ID_CH.includes(c)) && idCheck(full.slice(0, 7)) === full[7];
  }
  const cleanNick = v => Array.from(String(v).replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim()).slice(0, 12).join('');
  const AV_BG = ['#ff6b9d', '#ffd23f', '#4cd964', '#4da3ff', '#b9a0ff', '#ff7b2e', '#2ec4b6', '#e8e8f5'];
  window.flyingBirdFriendSkinPalette = SKINS.map(({name,body,hi,wing,belly})=>({name,body,hi,wing,belly}));
  window.flyingBirdFriendAvatarBackgrounds = AV_BG.slice();
  const profile = store.get('flyingBirdProfile', { id: '', nick: '', av: { skin: 0, bg: 0 }, created: 0 });
  if (!isValidId(profile.id)) { profile.id = newId(); profile.created = Date.now(); }
  profile.nick = cleanNick(profile.nick);
  if (Array.from(profile.nick).length < 3) profile.nick = 'BIRD' + (1000 + Math.floor(Math.random() * 9000));
  profile.av = { skin: Math.max(0, (profile.av && profile.av.skin) | 0), bg: (((profile.av && profile.av.bg) | 0) % AV_BG.length + AV_BG.length) % AV_BG.length };
  window.addEventListener('flyingbird:cloud-profile', e => {
    if (!e.detail) return;
    Object.assign(profile, e.detail);
    store.set('flyingBirdProfile', profile);
  });
  window.addEventListener('flyingbird:new-guest-profile', () => {
    profile.id = newId(); profile.created = Date.now();
    profile.nick = 'BIRD' + (1000 + Math.floor(Math.random()*9000));
    profile.av = {skin:0,bg:0};
    store.set('flyingBirdProfile',profile);
  });
  const saveProfile = () => {
    store.set('flyingBirdProfile', profile);
    window.dispatchEvent(new CustomEvent('flyingbird:profile-changed'));
  };
  saveProfile();

  const nickEl = document.getElementById('nick');
  let editing = false;
  function positionNicknameInput() {
    if (!editing) return;
    const r = canvas.getBoundingClientRect(), vp = window.visualViewport;
    const viewTop = vp ? vp.offsetTop : 0;
    const viewBottom = viewTop + (vp ? vp.height : innerHeight);
    const k = r.width / W;
    const inputW = Math.min(320, Math.max(180, Math.min(r.width - 24, 260 * k)));
    const inputH = Math.max(42, Math.min(54, 40 * k));
    // The iOS keyboard reduces visualViewport.height; move only the input,
    // not the Canvas/world, above the keyboard.
    const idealTop = r.top + H * k / 2 - inputH / 2;
    const safeTop = Math.max(viewTop + 12, Math.min(idealTop, viewBottom - inputH - 18));
    Object.assign(nickEl.style, {
      left: Math.round(Math.max(8, (innerWidth - inputW) / 2)) + 'px',
      top: Math.round(safeTop) + 'px',
      width: Math.round(inputW) + 'px',
      height: Math.round(inputH) + 'px',
      fontSize: Math.max(16, Math.min(20, 18 * k)) + 'px'
    });
  }
  function editNick() {
    nickEl.value = profile.nick; nickEl.placeholder = tr('NICKNAME_PH');
    editing = true;
    document.body.classList.add('nick-editing');
    nickEl.style.display = 'block';
    positionNicknameInput();
    nickEl.focus({preventScroll:true}); nickEl.select();
    requestAnimationFrame(positionNicknameInput);
  }
  function endNick(ok) {
    if (!editing) return;
    editing = false; nickEl.style.display = 'none'; document.body.classList.remove('nick-editing');
    nickEl.blur();
    queueFit();
    if (!ok) return;
    const v = cleanNick(nickEl.value);
    if (Array.from(v).length >= 3) { profile.nick = v; saveProfile(); }
    else toasts.push({ text: tr('NICK_SHORT'), plain: true, t: 120 });
  }
  nickEl.addEventListener('keydown', e => {
    e.stopPropagation();   // typing must not trigger game keys
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') endNick(true); else if (e.key === 'Escape') endNick(false);
  });
  nickEl.addEventListener('blur', () => endNick(true));
  function copyId() {
    const done = () => toasts.push({ text: tr('COPIED'), plain: true, t: 90 });
    const fb = () => { try { const ta = document.createElement('textarea'); ta.value = profile.id; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch (e) {} };
    try { navigator.clipboard.writeText(profile.id).then(done, fb); } catch (e) { fb(); }
  }

  // ---------- Localization ----------
  // English is the default. Language choice is stored in flyingBirdCfg.
  const LANGS = ['EN', 'ZH', 'RU', 'ES', 'PT'];
  const LANG_NAMES = { EN: 'ENGLISH', ZH: '简体中文', RU: 'РУССКИЙ', ES: 'ESPAÑOL', PT: 'PORTUGUÊS (BR)' };
  const I18N = {
    EN: {
      PROFILE_PRIVACY:'PROFILE PRIVACY',       PROFILE:'PROFILE', PLAYER_ID:'PLAYER ID', EDIT_NICK:'EDIT NICKNAME', AVATAR:'AVATAR', AVATAR_BG:'BACKGROUND', COPY_ID:'COPY ID', COPIED:'COPIED!', NICKNAME_PH:'NICKNAME (3-12 CHARS)', NICK_SHORT:'NICKNAME TOO SHORT',
      FPS_LIMIT:'FPS LIMIT', SHOW_FPS:'SHOW FPS', MAX:'MAX',
      SELECT_MAP:'SELECT MAP', MAP_CITY:'CITY', MAP_MOUNTAINS:'MOUNTAINS', MAP_VOLCANO:'VOLCANO',
      PLAY:'PLAY', SHOP:'SHOP', INVENTORY:'INVENTORY', EMPTY_INVENTORY:'NO SKINS YET', COINS:'COINS', BUY:'BUY', SELECT:'SELECT', SELECTED:'SELECTED', OWNED:'OWNED', NOT_ENOUGH:'NOT ENOUGH COINS', SKIN_BOUGHT:'SKIN UNLOCKED!', ACHIEVEMENTS:'ACHIEVEMENTS', SETTINGS:'SETTINGS', BEST:'BEST', PAUSED:'PAUSED',
      RESUME:'RESUME', MAIN_MENU:'MAIN MENU', THEME:'THEME', MUSIC:'MUSIC', SOUND_FX:'SOUND FX',
      COLOR_MODE:'COLOR MODE', REDUCE_EFFECTS:'REDUCE EFFECTS', DIFFICULTY:'DIFFICULTY',
      BIRD_SKIN:'BIRD SKIN', FULLSCREEN:'FULLSCREEN', LANGUAGE:'LANGUAGE',
      RESET_PROGRESS:'RESET PROGRESS', PRESS_RESET:'PRESS AGAIN TO RESET', BACK:'BACK',
      ON:'ON', OFF:'OFF', NIGHT:'NIGHT', DAY:'DAY', AUTO:'AUTO',
      EASY:'EASY', NORMAL:'NORMAL', HARD:'HARD', CLASSIC:'CLASSIC', RED:'RED',
      BLUE:'BLUE', GHOST:'GHOST', NONE:'OFF', RED_GREEN:'RED-GREEN',
      BLUE_YELLOW:'BLUE-YELLOW', HIGH_CONTRAST:'HIGH CONTRAST',
      SKIN_UNLOCK:'SKIN UNLOCKS AT BEST SCORE', SPACE_CLICK_TAP:'SPACE / CLICK / TAP',
      GAME_OVER:'GAME OVER', SCORE:'SCORE', RANK:'RANK', NEW:'NEW!',
      RETRY:'RETRY', MENU:'MENU', GAMES:'GAMES', FLAPS:'FLAPS',
      FIRST_FLIGHT:'FIRST FLIGHT', FIRST_FLIGHT_DESC:'Finish your first game',
      ROOKIE:'ROOKIE', ROOKIE_DESC:'Score 5', PRO:'PRO', PRO_DESC:'Score 15',
      MASTER:'MASTER', MASTER_DESC:'Score 30', LEGEND:'LEGEND', LEGEND_DESC:'Score 50',
      PINK_PASSER:'PINK PASSER', PINK_PASSER_DESC:'Pass 5 moving pipes in one run',
      REGULAR:'REGULAR', REGULAR_DESC:'Play 25 games', FLAP_HAPPY:'FLAP HAPPY',
      FLAP_HAPPY_DESC:'Flap 1000 times', NIGHT_OWL:'NIGHT OWL', NIGHT_OWL_DESC:'Score 10 at night',
      EARLY_BIRD:'EARLY BIRD', EARLY_BIRD_DESC:'Score 10 by day',
      PAUSE_HINT:'P: PAUSE', MUTE:'MUTE', UNMUTE:'UNMUTE', FULLSCREEN_HINT:'F: FULLSCREEN',
      ACHIEVEMENT_TOAST:'ACHIEVEMENT'
    },
    ZH: {
      PROFILE_PRIVACY:'资料隐私',       PROFILE:'个人资料', PLAYER_ID:'玩家ID', EDIT_NICK:'修改昵称', AVATAR:'头像', AVATAR_BG:'背景', COPY_ID:'复制ID', COPIED:'已复制！', NICKNAME_PH:'昵称（3-12个字符）', NICK_SHORT:'昵称太短',
      FPS_LIMIT:'帧率上限', SHOW_FPS:'显示帧率', MAX:'最大',
      SELECT_MAP:'选择地图', MAP_CITY:'城市', MAP_MOUNTAINS:'雪山', MAP_VOLCANO:'火山',
      PLAY:'开始游戏', SHOP:'商店', INVENTORY:'背包', EMPTY_INVENTORY:'暂无外观', COINS:'金币', BUY:'购买', SELECT:'选择', SELECTED:'已选择', OWNED:'已拥有', NOT_ENOUGH:'金币不足', SKIN_BOUGHT:'外观已解锁！', ACHIEVEMENTS:'成就', SETTINGS:'设置', BEST:'最高分', PAUSED:'已暂停',
      RESUME:'继续游戏', MAIN_MENU:'主菜单', THEME:'主题', MUSIC:'音乐', SOUND_FX:'音效',
      COLOR_MODE:'色盲模式', REDUCE_EFFECTS:'减少特效', DIFFICULTY:'难度',
      BIRD_SKIN:'小鸟外观', FULLSCREEN:'全屏', LANGUAGE:'语言',
      RESET_PROGRESS:'重置进度', PRESS_RESET:'再按一次确认', BACK:'返回',
      ON:'开', OFF:'关', NIGHT:'夜晚', DAY:'白天', AUTO:'自动',
      EASY:'简单', NORMAL:'普通', HARD:'困难', CLASSIC:'经典', RED:'红色',
      BLUE:'蓝色', GHOST:'幽灵', NONE:'关闭', RED_GREEN:'红绿模式',
      BLUE_YELLOW:'蓝黄模式', HIGH_CONTRAST:'高对比度',
      SKIN_UNLOCK:'达到最高分解锁外观', SPACE_CLICK_TAP:'按空格 / 点击 / 触摸',
      GAME_OVER:'游戏结束', SCORE:'得分', RANK:'等级', NEW:'新纪录!',
      RETRY:'重试', MENU:'菜单', GAMES:'游戏', FLAPS:'拍翅',
      FIRST_FLIGHT:'初次飞行', FIRST_FLIGHT_DESC:'完成第一局游戏',
      ROOKIE:'新手', ROOKIE_DESC:'得分达到 5', PRO:'高手', PRO_DESC:'得分达到 15',
      MASTER:'大师', MASTER_DESC:'得分达到 30', LEGEND:'传奇', LEGEND_DESC:'得分达到 50',
      PINK_PASSER:'穿越粉色管道', PINK_PASSER_DESC:'一局中穿过 5 个移动管道',
      REGULAR:'常客', REGULAR_DESC:'进行 25 局游戏', FLAP_HAPPY:'振翅达人',
      FLAP_HAPPY_DESC:'拍翅 1000 次', NIGHT_OWL:'夜猫子', NIGHT_OWL_DESC:'夜间得分达到 10',
      EARLY_BIRD:'早起的鸟', EARLY_BIRD_DESC:'白天得分达到 10',
      PAUSE_HINT:'P：暂停', MUTE:'静音', UNMUTE:'取消静音', FULLSCREEN_HINT:'F：全屏',
      ACHIEVEMENT_TOAST:'获得成就'
    },
    RU: {
      PROFILE_PRIVACY:'ПРИВАТНОСТЬ ПРОФИЛЯ',       PROFILE:'ПРОФИЛЬ', PLAYER_ID:'ID ИГРОКА', EDIT_NICK:'СМЕНИТЬ НИК', AVATAR:'АВАТАР', AVATAR_BG:'ФОН', COPY_ID:'КОПИРОВАТЬ ID', COPIED:'СКОПИРОВАНО!', NICKNAME_PH:'НИК (3-12 СИМВОЛОВ)', NICK_SHORT:'НИК СЛИШКОМ КОРОТКИЙ',
      FPS_LIMIT:'ЛИМИТ FPS', SHOW_FPS:'ПОКАЗАТЬ FPS', MAX:'МАКС',
      SELECT_MAP:'ВЫБОР КАРТЫ', MAP_CITY:'ГОРОД', MAP_MOUNTAINS:'ГОРЫ', MAP_VOLCANO:'ВУЛКАН',
      PLAY:'ИГРАТЬ', SHOP:'МАГАЗИН', INVENTORY:'ИНВЕНТАРЬ', EMPTY_INVENTORY:'ПОКА НЕТ СКИНОВ', COINS:'МОНЕТЫ', BUY:'КУПИТЬ', SELECT:'ВЫБРАТЬ', SELECTED:'ВЫБРАН', OWNED:'КУПЛЕН', NOT_ENOUGH:'НЕ ХВАТАЕТ МОНЕТ', SKIN_BOUGHT:'СКИН КУПЛЕН!', ACHIEVEMENTS:'ДОСТИЖЕНИЯ', SETTINGS:'НАСТРОЙКИ', BEST:'РЕКОРД', PAUSED:'ПАУЗА',
      RESUME:'ПРОДОЛЖИТЬ', MAIN_MENU:'ГЛАВНОЕ МЕНЮ', THEME:'ТЕМА', MUSIC:'МУЗЫКА', SOUND_FX:'ЗВУКИ',
      COLOR_MODE:'РЕЖИМ ЦВЕТА', REDUCE_EFFECTS:'МЕНЬШЕ ЭФФЕКТОВ', DIFFICULTY:'СЛОЖНОСТЬ',
      BIRD_SKIN:'ВНЕШНИЙ ВИД', FULLSCREEN:'ПОЛНЫЙ ЭКРАН', LANGUAGE:'ЯЗЫК',
      RESET_PROGRESS:'СБРОСИТЬ ПРОГРЕСС', PRESS_RESET:'НАЖМИТЕ ЕЩЁ РАЗ', BACK:'НАЗАД',
      ON:'ВКЛ', OFF:'ВЫКЛ', NIGHT:'НОЧЬ', DAY:'ДЕНЬ', AUTO:'АВТО',
      EASY:'ЛЕГКО', NORMAL:'НОРМАЛЬНО', HARD:'СЛОЖНО', CLASSIC:'КЛАССИКА', RED:'КРАСНЫЙ',
      BLUE:'СИНИЙ', GHOST:'ПРИЗРАК', NONE:'ВЫКЛ', RED_GREEN:'КРАСНЫЙ-ЗЕЛЁНЫЙ',
      BLUE_YELLOW:'СИНИЙ-ЖЁЛТЫЙ', HIGH_CONTRAST:'ВЫСОКИЙ КОНТРАСТ',
      SKIN_UNLOCK:'ОТКРОЕТСЯ ПРИ РЕКОРДЕ', SPACE_CLICK_TAP:'ПРОБЕЛ / КЛИК / КАСАНИЕ',
      GAME_OVER:'ИГРА ОКОНЧЕНА', SCORE:'СЧЁТ', RANK:'РАНГ', NEW:'НОВЫЙ!',
      RETRY:'ЗАНОВО', MENU:'МЕНЮ', GAMES:'ИГРЫ', FLAPS:'ВЗМАХИ',
      FIRST_FLIGHT:'ПЕРВЫЙ ПОЛЁТ', FIRST_FLIGHT_DESC:'Завершите первую игру',
      ROOKIE:'НОВИЧОК', ROOKIE_DESC:'Наберите 5 очков', PRO:'ПРОФИ', PRO_DESC:'Наберите 15 очков',
      MASTER:'МАСТЕР', MASTER_DESC:'Наберите 30 очков', LEGEND:'ЛЕГЕНДА', LEGEND_DESC:'Наберите 50 очков',
      PINK_PASSER:'РОЗОВЫЙ ПРОЛЁТ', PINK_PASSER_DESC:'Пролетите 5 движущихся труб за игру',
      REGULAR:'ПОСТОЯННЫЙ ИГРОК', REGULAR_DESC:'Сыграйте 25 раз', FLAP_HAPPY:'МАСТЕР ВЗМАХОВ',
      FLAP_HAPPY_DESC:'Сделайте 1000 взмахов', NIGHT_OWL:'НОЧНАЯ СОВА', NIGHT_OWL_DESC:'Наберите 10 очков ночью',
      EARLY_BIRD:'РАННЯЯ ПТИЧКА', EARLY_BIRD_DESC:'Наберите 10 очков днём',
      PAUSE_HINT:'P: ПАУЗА', MUTE:'ВКЛЮЧИТЬ ЗВУК', UNMUTE:'ВЫКЛЮЧИТЬ ЗВУК', FULLSCREEN_HINT:'F: ПОЛНЫЙ ЭКРАН',
      ACHIEVEMENT_TOAST:'ДОСТИЖЕНИЕ'
    },
    ES: {
      PROFILE_PRIVACY:'PRIVACIDAD DEL PERFIL',       PROFILE:'PERFIL', PLAYER_ID:'ID DE JUGADOR', EDIT_NICK:'EDITAR APODO', AVATAR:'AVATAR', AVATAR_BG:'FONDO', COPY_ID:'COPIAR ID', COPIED:'¡COPIADO!', NICKNAME_PH:'APODO (3-12 CARACTERES)', NICK_SHORT:'APODO MUY CORTO',
      FPS_LIMIT:'LÍMITE DE FPS', SHOW_FPS:'MOSTRAR FPS', MAX:'MÁX',
      SELECT_MAP:'ELEGIR MAPA', MAP_CITY:'CIUDAD', MAP_MOUNTAINS:'MONTAÑAS', MAP_VOLCANO:'VOLCÁN',
      PLAY:'JUGAR', SHOP:'TIENDA', INVENTORY:'INVENTARIO', EMPTY_INVENTORY:'SIN ASPECTOS', COINS:'MONEDAS', BUY:'COMPRAR', SELECT:'ELEGIR', SELECTED:'ELEGIDO', OWNED:'COMPRADO', NOT_ENOUGH:'FALTAN MONEDAS', SKIN_BOUGHT:'¡ASPECTO DESBLOQUEADO!', ACHIEVEMENTS:'LOGROS', SETTINGS:'AJUSTES', BEST:'RÉCORD', PAUSED:'EN PAUSA',
      RESUME:'CONTINUAR', MAIN_MENU:'MENÚ PRINCIPAL', THEME:'TEMA', MUSIC:'MÚSICA', SOUND_FX:'EFECTOS',
      COLOR_MODE:'MODO DE COLOR', REDUCE_EFFECTS:'REDUCIR EFECTOS', DIFFICULTY:'DIFICULTAD',
      BIRD_SKIN:'ASPECTO DEL AVE', FULLSCREEN:'PANTALLA COMPLETA', LANGUAGE:'IDIOMA',
      RESET_PROGRESS:'REINICIAR PROGRESO', PRESS_RESET:'PULSA OTRA VEZ', BACK:'VOLVER',
      ON:'SÍ', OFF:'NO', NIGHT:'NOCHE', DAY:'DÍA', AUTO:'AUTO',
      EASY:'FÁCIL', NORMAL:'NORMAL', HARD:'DIFÍCIL', CLASSIC:'CLÁSICO', RED:'ROJO',
      BLUE:'AZUL', GHOST:'FANTASMA', NONE:'NO', RED_GREEN:'ROJO-VERDE',
      BLUE_YELLOW:'AZUL-AMARILLO', HIGH_CONTRAST:'ALTO CONTRASTE',
      SKIN_UNLOCK:'ASPECTO AL LOGRAR RÉCORD', SPACE_CLICK_TAP:'ESPACIO / CLIC / TOCAR',
      GAME_OVER:'FIN DEL JUEGO', SCORE:'PUNTOS', RANK:'RANGO', NEW:'¡NUEVO!',
      RETRY:'REINTENTAR', MENU:'MENÚ', GAMES:'PARTIDAS', FLAPS:'ALETEOS',
      FIRST_FLIGHT:'PRIMER VUELO', FIRST_FLIGHT_DESC:'Termina tu primera partida',
      ROOKIE:'NOVATO', ROOKIE_DESC:'Consigue 5 puntos', PRO:'PRO', PRO_DESC:'Consigue 15 puntos',
      MASTER:'MAESTRO', MASTER_DESC:'Consigue 30 puntos', LEGEND:'LEYENDA', LEGEND_DESC:'Consigue 50 puntos',
      PINK_PASSER:'PASO ROSA', PINK_PASSER_DESC:'Pasa 5 tuberías móviles en una partida',
      REGULAR:'HABITUAL', REGULAR_DESC:'Juega 25 partidas', FLAP_HAPPY:'ALAS FELICES',
      FLAP_HAPPY_DESC:'Aletea 1000 veces', NIGHT_OWL:'AVE NOCTURNA', NIGHT_OWL_DESC:'Consigue 10 puntos de noche',
      EARLY_BIRD:'MADRUGADOR', EARLY_BIRD_DESC:'Consigue 10 puntos de día',
      PAUSE_HINT:'P: PAUSA', MUTE:'ACTIVAR SONIDO', UNMUTE:'SILENCIAR', FULLSCREEN_HINT:'F: PANTALLA COMPLETA',
      ACHIEVEMENT_TOAST:'LOGRO'
    },
    PT: {
      PROFILE_PRIVACY:'PRIVACIDADE DO PERFIL',       PROFILE:'PERFIL', PLAYER_ID:'ID DO JOGADOR', EDIT_NICK:'EDITAR APELIDO', AVATAR:'AVATAR', AVATAR_BG:'FUNDO', COPY_ID:'COPIAR ID', COPIED:'COPIADO!', NICKNAME_PH:'APELIDO (3-12 CARACTERES)', NICK_SHORT:'APELIDO MUITO CURTO',
      FPS_LIMIT:'LIMITE DE FPS', SHOW_FPS:'MOSTRAR FPS', MAX:'MÁX',
      SELECT_MAP:'ESCOLHER MAPA', MAP_CITY:'CIDADE', MAP_MOUNTAINS:'MONTANHAS', MAP_VOLCANO:'VULCÃO',
      PLAY:'JOGAR', SHOP:'LOJA', INVENTORY:'INVENTÁRIO', EMPTY_INVENTORY:'SEM VISUAIS', COINS:'MOEDAS', BUY:'COMPRAR', SELECT:'ESCOLHER', SELECTED:'SELECIONADO', OWNED:'COMPRADO', NOT_ENOUGH:'MOEDAS INSUFICIENTES', SKIN_BOUGHT:'VISUAL DESBLOQUEADO!', ACHIEVEMENTS:'CONQUISTAS', SETTINGS:'CONFIGURAÇÕES', BEST:'RECORDE', PAUSED:'PAUSADO',
      RESUME:'CONTINUAR', MAIN_MENU:'MENU PRINCIPAL', THEME:'TEMA', MUSIC:'MÚSICA', SOUND_FX:'EFEITOS SONOROS',
      COLOR_MODE:'MODO DE COR', REDUCE_EFFECTS:'REDUZIR EFEITOS', DIFFICULTY:'DIFICULDADE',
      BIRD_SKIN:'VISUAL DO PÁSSARO', FULLSCREEN:'TELA CHEIA', LANGUAGE:'IDIOMA',
      RESET_PROGRESS:'REINICIAR PROGRESSO', PRESS_RESET:'PRESSIONE NOVAMENTE', BACK:'VOLTAR',
      ON:'LIGADO', OFF:'DESLIGADO', NIGHT:'NOITE', DAY:'DIA', AUTO:'AUTO',
      EASY:'FÁCIL', NORMAL:'NORMAL', HARD:'DIFÍCIL', CLASSIC:'CLÁSSICO', RED:'VERMELHO',
      BLUE:'AZUL', GHOST:'FANTASMA', NONE:'DESLIGADO', RED_GREEN:'VERMELHO-VERDE',
      BLUE_YELLOW:'AZUL-AMARELO', HIGH_CONTRAST:'ALTO CONTRASTE',
      SKIN_UNLOCK:'VISUAL LIBERADO NO RECORDE', SPACE_CLICK_TAP:'ESPAÇO / CLIQUE / TOQUE',
      GAME_OVER:'FIM DE JOGO', SCORE:'PONTUAÇÃO', RANK:'NÍVEL', NEW:'NOVO!',
      RETRY:'TENTAR NOVAMENTE', MENU:'MENU', GAMES:'JOGOS', FLAPS:'BATIDAS',
      FIRST_FLIGHT:'PRIMEIRO VOO', FIRST_FLIGHT_DESC:'Conclua sua primeira partida',
      ROOKIE:'INICIANTE', ROOKIE_DESC:'Faça 5 pontos', PRO:'PROFISSIONAL', PRO_DESC:'Faça 15 pontos',
      MASTER:'MESTRE', MASTER_DESC:'Faça 30 pontos', LEGEND:'LENDA', LEGEND_DESC:'Faça 50 pontos',
      PINK_PASSER:'PASSAGEM ROSA', PINK_PASSER_DESC:'Passe por 5 canos móveis em uma partida',
      REGULAR:'FREQUENTE', REGULAR_DESC:'Jogue 25 partidas', FLAP_HAPPY:'ASAS FELIZES',
      FLAP_HAPPY_DESC:'Bata as asas 1000 vezes', NIGHT_OWL:'CORUJA NOTURNA', NIGHT_OWL_DESC:'Faça 10 pontos à noite',
      EARLY_BIRD:'AVE MADRUGADORA', EARLY_BIRD_DESC:'Faça 10 pontos durante o dia',
      PAUSE_HINT:'P: PAUSAR', MUTE:'ATIVAR SOM', UNMUTE:'MUTAR', FULLSCREEN_HINT:'F: TELA CHEIA',
      ACHIEVEMENT_TOAST:'CONQUISTA'
    }
  };
  const COSMETIC_TEXT = {
    EN:{BIRDS:'BIRDS',MAPS_TAB:'MAPS',TRAILS:'TRAILS',PREVIEW:'PREVIEW',EQUIP:'EQUIP',EQUIPPED:'EQUIPPED',LOCKED:'LOCKED',PARTICLE_QUALITY:'PARTICLE QUALITY',NONE_TRAIL:'NO TRAIL',RARITY_COMMON:'COMMON',RARITY_RARE:'RARE',RARITY_EPIC:'EPIC',RARITY_LEGENDARY:'LEGENDARY'},
    RU:{BIRDS:'ПТИЦЫ',MAPS_TAB:'КАРТЫ',TRAILS:'СЛЕДЫ',PREVIEW:'ПРОСМОТР',EQUIP:'НАДЕТЬ',EQUIPPED:'ВЫБРАНО',LOCKED:'ЗАКРЫТО',PARTICLE_QUALITY:'КАЧЕСТВО ЧАСТИЦ',NONE_TRAIL:'БЕЗ СЛЕДА',RARITY_COMMON:'ОБЫЧНЫЙ',RARITY_RARE:'РЕДКИЙ',RARITY_EPIC:'ЭПИЧЕСКИЙ',RARITY_LEGENDARY:'ЛЕГЕНДАРНЫЙ'},
    ZH:{BIRDS:'小鸟',MAPS_TAB:'地图',TRAILS:'尾迹',PREVIEW:'预览',EQUIP:'装备',EQUIPPED:'已装备',LOCKED:'未解锁',PARTICLE_QUALITY:'粒子质量',NONE_TRAIL:'无尾迹',RARITY_COMMON:'普通',RARITY_RARE:'稀有',RARITY_EPIC:'史诗',RARITY_LEGENDARY:'传说'},
    ES:{BIRDS:'AVES',MAPS_TAB:'MAPAS',TRAILS:'ESTELAS',PREVIEW:'VISTA PREVIA',EQUIP:'EQUIPAR',EQUIPPED:'EQUIPADO',LOCKED:'BLOQUEADO',PARTICLE_QUALITY:'CALIDAD PARTÍCULAS',NONE_TRAIL:'SIN ESTELA',RARITY_COMMON:'COMÚN',RARITY_RARE:'RARO',RARITY_EPIC:'ÉPICO',RARITY_LEGENDARY:'LEGENDARIO'},
    PT:{BIRDS:'AVES',MAPS_TAB:'MAPAS',TRAILS:'RASTROS',PREVIEW:'PRÉVIA',EQUIP:'EQUIPAR',EQUIPPED:'EQUIPADO',LOCKED:'BLOQUEADO',PARTICLE_QUALITY:'QUALIDADE PARTÍCULAS',NONE_TRAIL:'SEM RASTRO',RARITY_COMMON:'COMUM',RARITY_RARE:'RARO',RARITY_EPIC:'ÉPICO',RARITY_LEGENDARY:'LENDÁRIO'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], COSMETIC_TEXT[lang]);
  // Extra UI copy: identical keys in all supported languages.
  const COLLECTION_TEXT = {
    EN:{COLLECTION:'COLLECTION',SHOP_HINT:'Discover a new look',INVENTORY_HINT:'Your unlocked collection',MAP_HINT:'Choose your next world',TAP_TO_PREVIEW:'VIEW DETAILS',ACTIVE:'ACTIVE',IN_COLLECTION:'IN COLLECTION',AVAILABLE:'AVAILABLE',COST:'PRICE',FREE:'FREE',READY_TO_PLAY:'READY TO PLAY',SHOP_TO_UNLOCK:'PREVIEW TO UNLOCK',ITEMS:'ITEMS',WORLD:'WORLD',APPEARANCE:'APPEARANCE',FLIGHT_EFFECT:'FLIGHT EFFECT',PREVIEW_DETAIL:'See this item in action',NO_ITEMS:'NOTHING UNLOCKED HERE YET',TOTAL_OWNED:'OWNED',BUY_NOW:'BUY',PREVIEW_PRICE:'PRICE',BIRD_TYPE:'BIRD SKIN',MAP_TYPE:'GAME WORLD',TRAIL_TYPE:'FLIGHT TRAIL',BUY_SUCCESS:'PURCHASE COMPLETE!',PAGE:'PAGE',PREVIEW_ITEM:'ITEM PREVIEW',VIEW_SHOP:'BROWSE SHOP',MAP_SHOP:'UNLOCK IN SHOP',STATUS:'STATUS'},
    RU:{COLLECTION:'КОЛЛЕКЦИЯ',SHOP_HINT:'Найди новый стиль',INVENTORY_HINT:'Твоя коллекция предметов',MAP_HINT:'Выбери мир для полёта',TAP_TO_PREVIEW:'ПОДРОБНЕЕ',ACTIVE:'АКТИВНО',IN_COLLECTION:'В КОЛЛЕКЦИИ',AVAILABLE:'ДОСТУПНО',COST:'ЦЕНА',FREE:'БЕСПЛАТНО',READY_TO_PLAY:'ГОТОВО К ИГРЕ',SHOP_TO_UNLOCK:'ПОСМОТРЕТЬ В МАГАЗИНЕ',ITEMS:'ПРЕДМЕТОВ',WORLD:'МИР',APPEARANCE:'ОБЛИК',FLIGHT_EFFECT:'ЭФФЕКТ ПОЛЁТА',PREVIEW_DETAIL:'Посмотри, как выглядит предмет',NO_ITEMS:'ЗДЕСЬ ПОКА НИЧЕГО НЕТ',TOTAL_OWNED:'КУПЛЕНО',BUY_NOW:'КУПИТЬ',PREVIEW_PRICE:'ЦЕНА',BIRD_TYPE:'ОБЛИК ПТИЦЫ',MAP_TYPE:'ИГРОВОЙ МИР',TRAIL_TYPE:'СЛЕД В ПОЛЁТЕ',BUY_SUCCESS:'ПОКУПКА УСПЕШНА!',PAGE:'СТРАНИЦА',PREVIEW_ITEM:'ПРОСМОТР ПРЕДМЕТА',VIEW_SHOP:'В МАГАЗИН',MAP_SHOP:'ОТКРЫТЬ В МАГАЗИНЕ',STATUS:'СТАТУС'},
    ZH:{COLLECTION:'收藏',SHOP_HINT:'探索全新外观',INVENTORY_HINT:'已解锁的收藏品',MAP_HINT:'选择下一个世界',TAP_TO_PREVIEW:'查看详情',ACTIVE:'使用中',IN_COLLECTION:'已收藏',AVAILABLE:'可用',COST:'价格',FREE:'免费',READY_TO_PLAY:'可以游玩',SHOP_TO_UNLOCK:'预览后解锁',ITEMS:'物品',WORLD:'世界',APPEARANCE:'外观',FLIGHT_EFFECT:'飞行特效',PREVIEW_DETAIL:'查看物品实际效果',NO_ITEMS:'这里还没有物品',TOTAL_OWNED:'已拥有',BUY_NOW:'购买',PREVIEW_PRICE:'价格',BIRD_TYPE:'小鸟外观',MAP_TYPE:'游戏世界',TRAIL_TYPE:'飞行尾迹',BUY_SUCCESS:'购买成功！',PAGE:'页码',PREVIEW_ITEM:'物品预览',VIEW_SHOP:'前往商店',MAP_SHOP:'商店解锁',STATUS:'状态'},
    ES:{COLLECTION:'COLECCIÓN',SHOP_HINT:'Descubre un nuevo estilo',INVENTORY_HINT:'Tu colección desbloqueada',MAP_HINT:'Elige tu próximo mundo',TAP_TO_PREVIEW:'VER DETALLES',ACTIVE:'ACTIVO',IN_COLLECTION:'EN COLECCIÓN',AVAILABLE:'DISPONIBLE',COST:'PRECIO',FREE:'GRATIS',READY_TO_PLAY:'LISTO PARA JUGAR',SHOP_TO_UNLOCK:'VISTA PREVIA PARA COMPRAR',ITEMS:'ARTÍCULOS',WORLD:'MUNDO',APPEARANCE:'ASPECTO',FLIGHT_EFFECT:'EFECTO DE VUELO',PREVIEW_DETAIL:'Mira el artículo en acción',NO_ITEMS:'AÚN NO HAY ARTÍCULOS',TOTAL_OWNED:'OBTENIDOS',BUY_NOW:'COMPRAR',PREVIEW_PRICE:'PRECIO',BIRD_TYPE:'ASPECTO DEL AVE',MAP_TYPE:'MUNDO DE JUEGO',TRAIL_TYPE:'ESTELA DE VUELO',BUY_SUCCESS:'¡COMPRA REALIZADA!',PAGE:'PÁGINA',PREVIEW_ITEM:'VISTA PREVIA',VIEW_SHOP:'IR A LA TIENDA',MAP_SHOP:'COMPRAR EN TIENDA',STATUS:'ESTADO'},
    PT:{COLLECTION:'COLEÇÃO',SHOP_HINT:'Descubra um novo visual',INVENTORY_HINT:'Sua coleção desbloqueada',MAP_HINT:'Escolha seu próximo mundo',TAP_TO_PREVIEW:'VER DETALHES',ACTIVE:'ATIVO',IN_COLLECTION:'NA COLEÇÃO',AVAILABLE:'DISPONÍVEL',COST:'PREÇO',FREE:'GRÁTIS',READY_TO_PLAY:'PRONTO PARA JOGAR',SHOP_TO_UNLOCK:'PRÉVIA PARA COMPRAR',ITEMS:'ITENS',WORLD:'MUNDO',APPEARANCE:'VISUAL',FLIGHT_EFFECT:'EFEITO DE VOO',PREVIEW_DETAIL:'Veja o item em ação',NO_ITEMS:'SEM ITENS DESBLOQUEADOS',TOTAL_OWNED:'OBTIDOS',BUY_NOW:'COMPRAR',PREVIEW_PRICE:'PREÇO',BIRD_TYPE:'VISUAL DO PÁSSARO',MAP_TYPE:'MUNDO DO JOGO',TRAIL_TYPE:'RASTRO DE VOO',BUY_SUCCESS:'COMPRA REALIZADA!',PAGE:'PÁGINA',PREVIEW_ITEM:'PRÉVIA DO ITEM',VIEW_SHOP:'IR À LOJA',MAP_SHOP:'COMPRAR NA LOJA',STATUS:'STATUS'}
  };
  const ITEM_TEXT = {
    EN:{MAP_CITY:'CITY',MAP_MOUNTAINS:'MOUNTAINS',MAP_VOLCANO:'VOLCANO',MAP_SAKURA:'SAKURA GARDEN',MAP_NEON:'NEON CITY',MAP_OCEAN:'OCEAN DEPTHS',MAP_VOLCANO_PLUS:'VOLCANO CORE',MAP_COSMIC:'COSMIC VOYAGE',TRAIL_FIRE:'FIRE',TRAIL_WATER:'WATER',TRAIL_LIGHTNING:'LIGHTNING',TRAIL_RAINBOW:'RAINBOW',TRAIL_NATURE:'NATURE',TRAIL_GOLDEN:'GOLDEN'},
    RU:{MAP_CITY:'ГОРОД',MAP_MOUNTAINS:'ГОРЫ',MAP_VOLCANO:'ВУЛКАН',MAP_SAKURA:'САД САКУРЫ',MAP_NEON:'НЕОНОВЫЙ ГОРОД',MAP_OCEAN:'ГЛУБИНЫ ОКЕАНА',MAP_VOLCANO_PLUS:'СЕРДЦЕ ВУЛКАНА',MAP_COSMIC:'КОСМИЧЕСКИЙ ПОЛЁТ',TRAIL_FIRE:'ОГОНЬ',TRAIL_WATER:'ВОДА',TRAIL_LIGHTNING:'МОЛНИЯ',TRAIL_RAINBOW:'РАДУГА',TRAIL_NATURE:'ПРИРОДА',TRAIL_GOLDEN:'ЗОЛОТО'},
    ZH:{MAP_CITY:'城市',MAP_MOUNTAINS:'群山',MAP_VOLCANO:'火山',MAP_SAKURA:'樱花花园',MAP_NEON:'霓虹之城',MAP_OCEAN:'海洋深处',MAP_VOLCANO_PLUS:'火山核心',MAP_COSMIC:'宇宙之旅',TRAIL_FIRE:'火焰',TRAIL_WATER:'水流',TRAIL_LIGHTNING:'闪电',TRAIL_RAINBOW:'彩虹',TRAIL_NATURE:'自然',TRAIL_GOLDEN:'金色'},
    ES:{MAP_CITY:'CIUDAD',MAP_MOUNTAINS:'MONTAÑAS',MAP_VOLCANO:'VOLCÁN',MAP_SAKURA:'JARDÍN DE SAKURA',MAP_NEON:'CIUDAD NEÓN',MAP_OCEAN:'FONDO DEL OCÉANO',MAP_VOLCANO_PLUS:'NÚCLEO VOLCÁNICO',MAP_COSMIC:'VIAJE CÓSMICO',TRAIL_FIRE:'FUEGO',TRAIL_WATER:'AGUA',TRAIL_LIGHTNING:'RELÁMPAGO',TRAIL_RAINBOW:'ARCOÍRIS',TRAIL_NATURE:'NATURALEZA',TRAIL_GOLDEN:'DORADO'},
    PT:{MAP_CITY:'CIDADE',MAP_MOUNTAINS:'MONTANHAS',MAP_VOLCANO:'VULCÃO',MAP_SAKURA:'JARDIM DE SAKURA',MAP_NEON:'CIDADE NEON',MAP_OCEAN:'PROFUNDEZAS DO MAR',MAP_VOLCANO_PLUS:'NÚCLEO DO VULCÃO',MAP_COSMIC:'VIAGEM CÓSMICA',TRAIL_FIRE:'FOGO',TRAIL_WATER:'ÁGUA',TRAIL_LIGHTNING:'RAIO',TRAIL_RAINBOW:'ARCO-ÍRIS',TRAIL_NATURE:'NATUREZA',TRAIL_GOLDEN:'DOURADO'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], COLLECTION_TEXT[lang], ITEM_TEXT[lang]);
  // High Fly elite worlds: localized names everywhere (menu, store, inventory, previews).
  const ELITE_MAP_TEXT = {
    EN:{MAP_CELESTIAL:'CELESTIAL ISLANDS',MAP_CYBERPUNK:'CYBERPUNK DISTRICT',MAP_MYSTIC:'MYSTIC FOREST',MAP_SHATTERED:'SHATTERED MOON',MAP_TEMPEST:'TEMPEST CITADEL',MAP_ECLIPSE_REALM:'ECLIPSE SANCTUARY',MAP_PRISM:'PRISM CATHEDRAL',MAP_CLOCKWORK:'CLOCKWORK NEXUS',MAP_AURORA:'AURORA CROWN',MAP_NECROPOLIS:'CRIMSON NECROPOLIS'},
    RU:{MAP_CELESTIAL:'НЕБЕСНЫЕ ОСТРОВА',MAP_CYBERPUNK:'КИБЕРПАНК-КВАРТАЛ',MAP_MYSTIC:'МИСТИЧЕСКИЙ ЛЕС',MAP_SHATTERED:'РАСКОЛОТАЯ ЛУНА',MAP_TEMPEST:'ЦИТАДЕЛЬ БУРИ',MAP_ECLIPSE_REALM:'СВЯТИЛИЩЕ ЗАТМЕНИЯ',MAP_PRISM:'ПРИЗМАТИЧЕСКИЙ СОБОР',MAP_CLOCKWORK:'МЕХАНИЧЕСКИЙ НЕКСУС',MAP_AURORA:'КОРОНА СИЯНИЯ',MAP_NECROPOLIS:'БАГРОВЫЙ НЕКРОПОЛИС'},
    ZH:{MAP_CELESTIAL:'天空群岛',MAP_CYBERPUNK:'赛博朋克街区',MAP_MYSTIC:'神秘森林',MAP_SHATTERED:'破碎之月',MAP_TEMPEST:'风暴堡垒',MAP_ECLIPSE_REALM:'日蚀圣殿',MAP_PRISM:'棱镜圣堂',MAP_CLOCKWORK:'发条枢纽',MAP_AURORA:'极光之冠',MAP_NECROPOLIS:'猩红死城'},
    ES:{MAP_CELESTIAL:'ISLAS CELESTIALES',MAP_CYBERPUNK:'DISTRITO CIBERPUNK',MAP_MYSTIC:'BOSQUE MÍSTICO',MAP_SHATTERED:'LUNA FRACTURADA',MAP_TEMPEST:'CIUDADELA DE TORMENTA',MAP_ECLIPSE_REALM:'SANTUARIO DEL ECLIPSE',MAP_PRISM:'CATEDRAL PRISMÁTICA',MAP_CLOCKWORK:'NEXO MECÁNICO',MAP_AURORA:'CORONA AURORA',MAP_NECROPOLIS:'NECRÓPOLIS CARMESÍ'},
    PT:{MAP_CELESTIAL:'ILHAS CELESTIAIS',MAP_CYBERPUNK:'DISTRITO CYBERPUNK',MAP_MYSTIC:'FLORESTA MÍSTICA',MAP_SHATTERED:'LUA ESTILHAÇADA',MAP_TEMPEST:'CIDADELA DA TEMPESTADE',MAP_ECLIPSE_REALM:'SANTUÁRIO DO ECLIPSE',MAP_PRISM:'CATEDRAL PRISMÁTICA',MAP_CLOCKWORK:'NEXO MECÂNICO',MAP_AURORA:'COROA AURORA',MAP_NECROPOLIS:'NECRÓPOLE CARMESIM'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], ELITE_MAP_TEXT[lang]);
  const SKIN_TEXT = {
    EN:{SKIN_LEAF:'LEAF',SKIN_BLOOM:'BLOOM',SKIN_NEBULA:'NEBULA',SKIN_COSMIC:'COSMIC',SKIN_EMBER:'EMBER',SKIN_MAGMA:'MAGMA',SKIN_AQUA:'AQUA',SKIN_CORAL:'CORAL',SKIN_MINT:'MINT',SKIN_BERRY:'BERRY',SKIN_PHOENIX:'PHOENIX',SKIN_FROSTWING:'FROSTWING',SKIN_CYBER_BIRD:'CYBER BIRD',SKIN_GALAXY_BIRD:'GALAXY BIRD',SKIN_FOREST_SPIRIT:'FOREST SPIRIT'},
    RU:{SKIN_LEAF:'ЛИСТОК',SKIN_BLOOM:'ЦВЕТЕНИЕ',SKIN_NEBULA:'ТУМАННОСТЬ',SKIN_COSMIC:'КОСМИК',SKIN_EMBER:'УГОЛЁК',SKIN_MAGMA:'МАГМА',SKIN_AQUA:'АКВА',SKIN_CORAL:'КОРАЛЛ',SKIN_MINT:'МЯТА',SKIN_BERRY:'ЯГОДА',SKIN_PHOENIX:'ФЕНИКС',SKIN_FROSTWING:'ЛЕДЯНОЕ КРЫЛО',SKIN_CYBER_BIRD:'КИБЕРПТИЦА',SKIN_GALAXY_BIRD:'ПТИЦА ГАЛАКТИКИ',SKIN_FOREST_SPIRIT:'ДУХ ЛЕСА'},
    ZH:{SKIN_LEAF:'绿叶',SKIN_BLOOM:'花开',SKIN_NEBULA:'星云',SKIN_COSMIC:'宇宙',SKIN_EMBER:'余烬',SKIN_MAGMA:'岩浆',SKIN_AQUA:'水蓝',SKIN_CORAL:'珊瑚',SKIN_MINT:'薄荷',SKIN_BERRY:'浆果',SKIN_PHOENIX:'凤凰',SKIN_FROSTWING:'冰霜之翼',SKIN_CYBER_BIRD:'赛博鸟',SKIN_GALAXY_BIRD:'银河鸟',SKIN_FOREST_SPIRIT:'森林精灵'},
    ES:{SKIN_LEAF:'HOJA',SKIN_BLOOM:'FLORACIÓN',SKIN_NEBULA:'NEBULOSA',SKIN_COSMIC:'CÓSMICO',SKIN_EMBER:'BRASA',SKIN_MAGMA:'MAGMA',SKIN_AQUA:'AGUA',SKIN_CORAL:'CORAL',SKIN_MINT:'MENTA',SKIN_BERRY:'BAYA',SKIN_PHOENIX:'FÉNIX',SKIN_FROSTWING:'ALA HELADA',SKIN_CYBER_BIRD:'AVE CIBERNÉTICA',SKIN_GALAXY_BIRD:'AVE GALÁCTICA',SKIN_FOREST_SPIRIT:'ESPÍRITU DEL BOSQUE'},
    PT:{SKIN_LEAF:'FOLHA',SKIN_BLOOM:'FLORADA',SKIN_NEBULA:'NEBULOSA',SKIN_COSMIC:'CÓSMICO',SKIN_EMBER:'BRASA',SKIN_MAGMA:'MAGMA',SKIN_AQUA:'ÁGUA',SKIN_CORAL:'CORAL',SKIN_MINT:'HORTELÃ',SKIN_BERRY:'FRUTAS',SKIN_PHOENIX:'FÊNIX',SKIN_FROSTWING:'ASA GELADA',SKIN_CYBER_BIRD:'PÁSSARO CIBERNÉTICO',SKIN_GALAXY_BIRD:'PÁSSARO GALÁCTICO',SKIN_FOREST_SPIRIT:'ESPÍRITO DA FLORESTA'},
  };
  for (const lang of LANGS) Object.assign(I18N[lang], SKIN_TEXT[lang]);
  const NEW_TEXT = {
    EN:{MAP_FOREST:'ENCHANTED FOREST',MAP_CRYSTAL:'CRYSTAL CAVERNS',MAP_DESERT:'DESERT MIRAGE',TRAIL_FROST:'FROST',TRAIL_STARDUST:'STARDUST',TRAIL_SHADOW:'SHADOW',TRAIL_AURORA:'AURORA',TRAIL_HEART:'HEARTS',SKIN_ARCTIC_OWL:'ARCTIC OWL',SKIN_ROYAL_RAVEN:'ROYAL RAVEN',SKIN_JADE_BIRD:'JADE BIRD',SKIN_AURUM:'AURUM',SKIN_OBSIDIAN:'OBSIDIAN',SKIN_ABYSS:'ABYSS',SKIN_ECLIPSE:'ECLIPSE',SKIN_EMERALD_KING:'EMERALD KING',SKIN_PLATINUM:'PLATINUM'},
    RU:{MAP_FOREST:'ЗАКОЛДОВАННЫЙ ЛЕС',MAP_CRYSTAL:'КРИСТАЛЬНЫЕ ПЕЩЕРЫ',MAP_DESERT:'МИРАЖ ПУСТЫНИ',TRAIL_FROST:'МОРОЗ',TRAIL_STARDUST:'ЗВЁЗДНАЯ ПЫЛЬ',TRAIL_SHADOW:'ТЕНЬ',TRAIL_AURORA:'АВРОРА',TRAIL_HEART:'СЕРДЕЧКИ',SKIN_ARCTIC_OWL:'ПОЛЯРНАЯ СОВА',SKIN_ROYAL_RAVEN:'КОРОЛЕВСКИЙ ВОРОН',SKIN_JADE_BIRD:'НЕФРИТОВАЯ ПТИЦА',SKIN_AURUM:'АУРУМ',SKIN_OBSIDIAN:'ОБСИДИАН',SKIN_ABYSS:'БЕЗДНА',SKIN_ECLIPSE:'ЗАТМЕНИЕ',SKIN_EMERALD_KING:'ИЗУМРУДНЫЙ КОРОЛЬ',SKIN_PLATINUM:'ПЛАТИНА'},
    ZH:{MAP_FOREST:'魔法森林',MAP_CRYSTAL:'水晶洞窟',MAP_DESERT:'沙漠幻景',TRAIL_FROST:'寒霜',TRAIL_STARDUST:'星尘',TRAIL_SHADOW:'暗影',TRAIL_AURORA:'极光',TRAIL_HEART:'爱心',SKIN_ARCTIC_OWL:'北极猫头鹰',SKIN_ROYAL_RAVEN:'皇家渡鸦',SKIN_JADE_BIRD:'翡翠鸟',SKIN_AURUM:'黄金',SKIN_OBSIDIAN:'黑曜石',SKIN_ABYSS:'深渊',SKIN_ECLIPSE:'日食',SKIN_EMERALD_KING:'祖母绿之王',SKIN_PLATINUM:'铂金'},
    ES:{MAP_FOREST:'BOSQUE ENCANTADO',MAP_CRYSTAL:'CAVERNAS DE CRISTAL',MAP_DESERT:'ESPEJISMO DEL DESIERTO',TRAIL_FROST:'ESCARCHA',TRAIL_STARDUST:'POLVO ESTELAR',TRAIL_SHADOW:'SOMBRA',TRAIL_AURORA:'AURORA',TRAIL_HEART:'CORAZONES',SKIN_ARCTIC_OWL:'BÚHO ÁRTICO',SKIN_ROYAL_RAVEN:'CUERVO REAL',SKIN_JADE_BIRD:'AVE DE JADE',SKIN_AURUM:'AURUM',SKIN_OBSIDIAN:'OBSIDIANA',SKIN_ABYSS:'ABISMO',SKIN_ECLIPSE:'ECLIPSE',SKIN_EMERALD_KING:'REY ESMERALDA',SKIN_PLATINUM:'PLATINO'},
    PT:{MAP_FOREST:'FLORESTA ENCANTADA',MAP_CRYSTAL:'CAVERNAS DE CRISTAL',MAP_DESERT:'MIRAGEM DO DESERTO',TRAIL_FROST:'GEADA',TRAIL_STARDUST:'POEIRA ESTELAR',TRAIL_SHADOW:'SOMBRA',TRAIL_AURORA:'AURORA',TRAIL_HEART:'CORAÇÕES',SKIN_ARCTIC_OWL:'CORUJA ÁRTICA',SKIN_ROYAL_RAVEN:'CORVO REAL',SKIN_JADE_BIRD:'PÁSSARO DE JADE',SKIN_AURUM:'AURUM',SKIN_OBSIDIAN:'OBSIDIANA',SKIN_ABYSS:'ABISMO',SKIN_ECLIPSE:'ECLIPSE',SKIN_EMERALD_KING:'REI ESMERALDA',SKIN_PLATINUM:'PLATINA'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], NEW_TEXT[lang]);
  const qualityText = {
    EN:{HIGH:'HIGH',LOW:'LOW'},RU:{HIGH:'ВЫСОКОЕ',LOW:'НИЗКОЕ'},
    ZH:{HIGH:'高',LOW:'低'},ES:{HIGH:'ALTA',LOW:'BAJA'},PT:{HIGH:'ALTA',LOW:'BAIXA'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], qualityText[lang]);
  const EXTREME_TEXT = {
    EN:{EXTREME:'EXTREME',EXTREME_LEVEL:'EXTREME LEVEL'},
    RU:{EXTREME:'ЭКСТРИМ',EXTREME_LEVEL:'УРОВЕНЬ ЭКСТРИМА'},
    ZH:{EXTREME:'极限',EXTREME_LEVEL:'极限等级'},
    ES:{EXTREME:'EXTREMO',EXTREME_LEVEL:'NIVEL EXTREMO'},
    PT:{EXTREME:'EXTREMO',EXTREME_LEVEL:'NÍVEL EXTREMO'}
  };
  for (const lang of LANGS) Object.assign(I18N[lang], EXTREME_TEXT[lang]);
  // Localized names for the eight new Trails in all five supported UI languages.
  const EXPANDED_TRAIL_TEXT = {
    EN:{TRAIL_RIFT:'RIFT',TRAIL_ARCANE:'ARCANE SIGILS',TRAIL_CHRONO:'CHRONO GEARS',TRAIL_ORIGAMI:'ORIGAMI FLIGHT',TRAIL_MOTH:'LUMEN MOTHS',TRAIL_PRISM:'PRISM SHARDS',TRAIL_GLITCH:'GLITCH',TRAIL_CONSTELLATION:'CONSTELLATION'},
    RU:{TRAIL_RIFT:'РАЗЛОМ',TRAIL_ARCANE:'МАГИЧЕСКИЕ ПЕЧАТИ',TRAIL_CHRONO:'ШЕСТЕРЁНКИ ВРЕМЕНИ',TRAIL_ORIGAMI:'ОРИГАМИ',TRAIL_MOTH:'СВЕТЛЯЧКОВЫЕ МОТЫЛЬКИ',TRAIL_PRISM:'ПРИЗМАТИЧЕСКИЕ ОСКОЛКИ',TRAIL_GLITCH:'ГЛИТЧ',TRAIL_CONSTELLATION:'СОЗВЕЗДИЕ'},
    ZH:{TRAIL_RIFT:'空间裂隙',TRAIL_ARCANE:'奥术符印',TRAIL_CHRONO:'时光齿轮',TRAIL_ORIGAMI:'折纸之翼',TRAIL_MOTH:'流光飞蛾',TRAIL_PRISM:'棱镜碎片',TRAIL_GLITCH:'数字故障',TRAIL_CONSTELLATION:'星座连线'},
    ES:{TRAIL_RIFT:'GRIETA',TRAIL_ARCANE:'SIGILOS ARCANOS',TRAIL_CHRONO:'ENGRANAJES DEL TIEMPO',TRAIL_ORIGAMI:'VUELO ORIGAMI',TRAIL_MOTH:'POLILLAS LUMINOSAS',TRAIL_PRISM:'FRAGMENTOS PRISMA',TRAIL_GLITCH:'FALLO DIGITAL',TRAIL_CONSTELLATION:'CONSTELACIÓN'},
    PT:{TRAIL_RIFT:'FENDA',TRAIL_ARCANE:'SIGILOS ARCANOS',TRAIL_CHRONO:'ENGRENAGENS DO TEMPO',TRAIL_ORIGAMI:'VOO ORIGAMI',TRAIL_MOTH:'MARIPOSAS LUMINOSAS',TRAIL_PRISM:'ESTILHAÇOS PRISMA',TRAIL_GLITCH:'FALHA DIGITAL',TRAIL_CONSTELLATION:'CONSTELAÇÃO'}
  };
  for(const lang of LANGS) Object.assign(I18N[lang],EXPANDED_TRAIL_TEXT[lang]);
  // All new cosmetic labels are localized, even when shop language is switched mid-session.
  const SIX_TRAIL_TEXT = {
    EN:{TRAIL_INKFLOW:'INK FLOW',TRAIL_BUBBLE:'BUBBLEVERSE',TRAIL_SONIC:'SONIC PULSE',TRAIL_PHOENIX:'PHOENIX FEATHERS',TRAIL_LUNAR:'LUNAR PHASES',TRAIL_OMEN:'CRIMSON OMEN'},
    RU:{TRAIL_INKFLOW:'ПОТОК ЧЕРНИЛ',TRAIL_BUBBLE:'МИР ПУЗЫРЕЙ',TRAIL_SONIC:'ЗВУКОВОЙ ИМПУЛЬС',TRAIL_PHOENIX:'ПЕРЬЯ ФЕНИКСА',TRAIL_LUNAR:'ФАЗЫ ЛУНЫ',TRAIL_OMEN:'БАГРОВОЕ ЗНАМЕНИЕ'},
    ZH:{TRAIL_INKFLOW:'水墨流痕',TRAIL_BUBBLE:'泡泡宇宙',TRAIL_SONIC:'声波脉冲',TRAIL_PHOENIX:'凤凰之羽',TRAIL_LUNAR:'月相之光',TRAIL_OMEN:'猩红凶兆'},
    ES:{TRAIL_INKFLOW:'FLUJO DE TINTA',TRAIL_BUBBLE:'UNIVERSO DE BURBUJAS',TRAIL_SONIC:'PULSO SÓNICO',TRAIL_PHOENIX:'PLUMAS DE FÉNIX',TRAIL_LUNAR:'FASES LUNARES',TRAIL_OMEN:'PRESAGIO CARMESÍ'},
    PT:{TRAIL_INKFLOW:'FLUXO DE TINTA',TRAIL_BUBBLE:'UNIVERSO DE BOLHAS',TRAIL_SONIC:'PULSO SÔNICO',TRAIL_PHOENIX:'PENAS DE FÊNIX',TRAIL_LUNAR:'FASES DA LUA',TRAIL_OMEN:'PRESSÁGIO CARMESIM'}
  };
  for(const lang of LANGS) Object.assign(I18N[lang], SIX_TRAIL_TEXT[lang]);
  const tr = key => (I18N[cfg.lang] || I18N.EN)[key] || I18N.EN[key] || key;
  const displayValue = value => ({
    NIGHT:tr('NIGHT'), DAY:tr('DAY'), AUTO:tr('AUTO'),
    EASY:tr('EASY'), NORMAL:tr('NORMAL'), HARD:tr('HARD'), EXTREME:tr('EXTREME'),
    CLASSIC:tr('CLASSIC'), RED:tr('RED'), BLUE:tr('BLUE'), GHOST:tr('GHOST'), ROOKIE:tr('ROOKIE'), PRO:tr('PRO'), MASTER:tr('MASTER'), LEGEND:tr('LEGEND'),
    OFF:tr('NONE'), 'RED-GREEN':tr('RED_GREEN'), 'BLUE-YELLOW':tr('BLUE_YELLOW'),
    'HIGH CONTRAST':tr('HIGH_CONTRAST'), HIGH:tr('HIGH'), LOW:tr('LOW'), ON:tr('ON')
  }[value] || value);

  const mapOK = id => !!MAPS[id] && (!SHOP_MAPS.some(m => m.id === id) || wallet.maps.includes(id));
  const trailOK = id => id === 'NONE' || wallet.trails.includes(id);
  const skinOK = i => !!SKINS[i] && (i < 4 ? maxBest() >= SKINS[i].need : wallet.owned.includes(i));
  // All map and trail showcases reflect the player's live equipped skin, including
  // changes restored from the account cloud and changes made in the inventory.
  const equippedPreviewSkin = () => SKINS[skinOK(cfg.skin) ? cfg.skin : 0];
  if (!skinOK(cfg.skin)) cfg.skin = 0;
  if (!mapOK(cfg.map)) cfg.map = 'CITY';

  const bird = { x: 70, y: 200, w: 20, h: 16, vy: 0, rot: 0 };
  const speed = () => (2 + Math.min(score * 0.04, 1.4)) * DIFF[cfg.diff].spd * (cfg.diff === 'EXTREME' ? extremeSpeedMultiplier() : 1 + hardTier() * 0.052);

  function layout(
  land,
  width = land ? 640 : 320,
  height = land ? 360 : 480
) {
  const oldGround = GROUND;
  const oldBirdX = bird.x;
  const initialized = L !== null;

  L = land;
  W = width;
  H = height;
    GROUND = H - (land ? 44 : 50);
    SPACING = land ? 230 : 175;
    GMAX = land ? 128 : 150; GMIN = land ? 95 : 105;
    bird.x = land ? 120 : 70;
    TW = W + 100;
    stars = Array.from({ length: Math.round(W * H / 3400) }, () => ({
      x: Math.random() * W, y: Math.random() * (GROUND - 80),
      s: Math.random() < 0.2 ? 2 : 1, t: Math.random() * 6.28 }));
    skyline = [];
    for (let x = 0; x < TW; ) {
      const w = 30 + Math.floor(Math.random() * 40), h = 40 + Math.floor(Math.random() * (land ? 70 : 90));
      skyline.push({ x, w, h }); x += w + 4;
    }
    clouds = Array.from({ length: land ? 7 : 4 }, () => ({
      x: Math.random() * W, y: 30 + Math.random() * GROUND * 0.45, w: 40 + Math.floor(Math.random() * 40) }));
    initWeather();

if (!initialized) {
  reset();
} else {
  // Сохраняем текущую партию при повороте и изменении экрана.
  const sy = GROUND / oldGround;
  const dx = bird.x - oldBirdX;

  bird.y = Math.min(GROUND - bird.h, bird.y * sy);

  for (const p of pipes) {
    p.x += dx;
    p.base *= sy;
    p.top *= sy;
    p.gap *= sy;
    p.amp *= sy;
    p.px = p.x;
    p.pt = p.top;
  }

  for (const p of particles) {
    p.x += dx;
    p.y *= sy;
    p.ox = p.x;
    p.oy = p.y;
  }

  prev.by = bird.y;
  prev.br = bird.rot;
  prev.gx = groundX;
  prev.bx = bgX;
}
  }

  // ---------- Sound + procedural music ----------
  let AC = null;
  function initAudio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function tone(f1, f2, d, type = 'square', v = 0.06, ch = 'sfx') {
    const vol = cfg[ch] / 10;
    if (!AC || cfg.muted || vol <= 0) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v * vol * 1.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + d);
  }
  const MEL = {
    VOLCANO: [196, 233, 262, 233, 175, 208, 262, 208, 196, 233, 311, 233, 147, 175, 196, 175],
    DAY:   [523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 988, 784, 523, 784, 659, 523],
    NIGHT: [330, 392, 494, 392, 294, 370, 440, 370, 330, 392, 523, 392, 247, 294, 330, 294]
  };
  let mi = 0;
  (function music() {
    const th = cfg.map === 'VOLCANO' ? 'VOLCANO' : themeName();
    if (AC && !document.hidden && !(state === 'PLAYING' && screen)) {
      const n = MEL[th][mi % 16];
      tone(n, n, 0.2, 'triangle', 0.05, 'music');
      if (mi % 4 === 0) tone(n / 2, n / 2, 0.35, 'square', 0.025, 'music');
      mi++;
    }
    setTimeout(music, th === 'DAY' ? 190 : th === 'VOLCANO' ? 220 : 260);
  })();

  function unlock(id) {
    if (save.ach[id]) return;
    save.ach[id] = 1; saveGame();
    toasts.push({ text: tr(({ first:'FIRST_FLIGHT', s5:'ROOKIE', s15:'PRO', s30:'MASTER', s50:'LEGEND', pink:'PINK_PASSER', reg:'REGULAR', flap:'FLAP_HAPPY', owl:'NIGHT_OWL', early:'EARLY_BIRD' })[id]), t: 180 });
    tone(660, 1320, 0.25, 'triangle', 0.08);
  }
  function onScore(p) {
    save.pipes++;
    if (p.amp && ++runPink >= 5) unlock('pink');
    for (const n of [5, 15, 30, 50]) if (score >= n) unlock('s' + n);
    if (score >= 10) unlock(themeName() === 'DAY' ? 'early' : 'owl');
  }

  // ---------- Particles ----------
  const coarsePointer = matchMedia('(pointer: coarse)');
  const particleReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function particleLevel() {
    if (cfg.fx || cfg.particleQuality === 'OFF') return 0;
    if (cfg.particleQuality === 'LOW') return 1;
    if (cfg.particleQuality === 'HIGH') return 3;
    return coarsePointer.matches || particleReducedMotion.matches ? 1 : 2;
  }
  function burst(x, y, n, spd, life, cols = ['#fff']) {
    const quality = particleLevel();
    if (!quality) return;
    n = Math.min(Math.ceil(n * quality / 3), Math.max(0, 160 - particles.length));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = Math.random() * spd;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
        col: cols[Math.floor(Math.random() * cols.length)], size: 1 + Math.floor(Math.random() * 3) });
    }
  }

  // ---------- Game logic ----------
  function flap() {
    bird.vy = -4.4; save.flaps++;
    tone(380, 640, 0.1);
    burst(bird.x + 2, bird.y + bird.h, 4, 1.2, 18, ['#fff', '#ffe98a']);
    // A brief, capped pulse on each actual flap makes premium trails respond to input.
    if(ELITE_TRAIL_IDS.has(cfg.trail) && particleLevel() && !screen){
      const t=TRAILS.find(item=>item.id===cfg.trail);
      const n=particleLevel()===1?2:3;
      for(let j=0;j<n;j++){
        const life=16+j*3;
        trailParticles.push({x:bird.x-6-j*2,y:bird.y+bird.h*.5,
          vx:-2.3-j*.37,vy:(j-1)*.65-.24,life,max:life,
          col:t.colors[j%t.colors.length],size:5.1+j*.2,k:cfg.trail,i:(ticks+j*3)|0,flare:true});
      }
    }
  }

  // Make each new gap reachable from the last one. On tall phones the old
  // independent random heights could jump from the floor to the ceiling.
  // Use the *free* horizontal space between pipe hitboxes, current pipe speed,
  // minimum safe gap and moving-pipe amplitudes to bound each height change.
  function spawnPipe() {
    const D = DIFF[cfg.diff];
    const gap = cfg.diff === 'EXTREME' ? extremeGap() : cfg.diff === 'HARD' ? hardGap() : Math.max(GMIN + D.gap, GMAX + D.gap - score * 1.2);
    const movingChance = cfg.diff === 'EXTREME' ? Math.min(0.72, 0.40 + extremeTier() * 0.032) : Math.min(.72,.45+hardTier()*.032);
    const moving = score >= D.mv && Math.random() < movingChance;
    const m = moving ? (cfg.diff === 'EXTREME' ? Math.min(28, 18 + extremeTier()) : Math.min(28,22+hardTier())) : 0;
    const lo = 40 + m, hi = Math.max(lo, GROUND - gap - 40 - m);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const minCenter = lo + gap / 2, maxCenter = hi + gap / 2;
    let center;
    if (pipes.length) {
      const prev = pipes[pipes.length - 1];
      const prevCenter = prev.base + prev.gap / 2;
      // Available time after clearing the previous pipe and before the next.
      const freeTicks = Math.max(1, SPACING - PW - bird.w - 8) / Math.max(1, speed());
      const safeHalfGap = Math.max(0, (Math.min(prev.gap, gap) - bird.h - 8) / 2);
      const motionReserve = (prev.amp + m) * 0.8;
      const maxStep = clamp(freeTicks * 2.25 + safeHalfGap * 0.44 - motionReserve, 30, 105);
      // Gentle centre bias avoids spending many consecutive pipes at an edge.
      const bias = (GROUND / 2 - prevCenter) * 0.12;
      const step = clamp((Math.random() * 2 - 1) * maxStep + bias, -maxStep, maxStep);
      center = clamp(prevCenter + step, minCenter, maxCenter);
    } else {
      // The first obstacle begins near the starting bird, not a distant extreme.
      center = clamp(bird.y + bird.h / 2 + (Math.random() * 2 - 1) * 90,
        minCenter, maxCenter);
    }
    const base = center - gap / 2;
    pipes.push({ x: W + 10, base, top: base, gap, amp: m, phase: Math.random() * 6.28, scored: false, coinTaken: false });
  }

  function die(onGround) {
    if (state === 'DEAD' || state === 'GAMEOVER') return;
    tone(240, 50, 0.35, 'sawtooth', 0.1);
    if (!cfg.fx) { shake = 12; flash = 0.8; }
    burst(bird.x + bird.w / 2, bird.y + bird.h / 2, cfg.fx ? 6 : 24, 4, 40, ['#ffd23f', '#ff9f1c', '#ff6b35', '#fff']);
    save.games++;
    if (score > save.best[cfg.diff]) { save.best[cfg.diff] = score; newBest = true; }
    unlock('first');
    if (save.games >= 25) unlock('reg');
    if (save.flaps >= 1000) unlock('flap');
    saveGame();
    focus = 0;
    if (onGround) { state = 'GAMEOVER'; overAt = performance.now(); }
    else { state = 'DEAD'; bird.vy = -2.5; }
  }

  function reset() {
    pipes = []; particles = []; trailParticles = [];
    score = 0; newBest = false; runPink = 0;
    bird.y = H * 0.42; bird.vy = 0; bird.rot = 0;
    state = 'READY';
  }

  function act() {
    initAudio();
    if (state === 'READY') { state = 'PLAYING'; flap(); }
    else if (state === 'PLAYING') flap();
  }


  function update() {
    ticks++;
    if (shopAnim > 0) shopAnim--;
    if (shake > 0) shake *= 0.9;
    if (flash > 0) flash = Math.max(0, flash - 0.05);
    if (pop > 0) pop = Math.max(0, pop - 0.08);
    toasts.forEach(t => t.t--); toasts = toasts.filter(t => t.t > 0);

    if (!particleLevel()) { particles.length = 0; trailParticles.length = 0; }
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--; }
    particles = particles.filter(p => p.life > 0);
    for(const p of trailParticles){p.x+=p.vx;p.y+=p.vy;p.life--;advanceTrailParticle(p,1);}
    trailParticles=trailParticles.filter(p=>p.life>0);
    if(state==='PLAYING'&&!screen&&cfg.trail!=='NONE'&&cfg.particleQuality!=='OFF'&&!cfg.fx){
      const t=TRAILS.find(t=>t.id===cfg.trail);
      if(t){const count=particleLevel();
        const premium=PREMIUM_TRAIL_IDS.has(t.id);
        const emitted=ELITE_TRAIL_IDS.has(t.id)?Math.max(1,Math.ceil(count*.52)):premium?Math.max(1,Math.ceil(count*.67)):count;
        for(let i=0;i<emitted;i++){
          if(t.id==='HEART'&&ticks%3)continue;
          const life=premium?23+Math.random()*15:17+Math.random()*16;
          trailParticles.push({x:bird.x-4,y:bird.y+bird.h/2+(Math.random()-.5)*(premium?7:9),
            vx:-1.3-Math.random()*1.5,vy:(Math.random()-.5)*1.2,
            life,max:premium?life:33,col:t.colors[Math.floor(Math.random()*t.colors.length)],
            size:premium?3+Math.random()*2.1:2+Math.random()*3,k:t.id,i:(ticks+i)|0});
        }
        const maxTrail=ELITE_TRAIL_IDS.has(t.id)?(count===1?32:count===2?48:64):120;
        if(trailParticles.length>maxTrail)trailParticles.splice(0,trailParticles.length-maxTrail);
      }
    }

    if (state === 'PLAYING' && screen) return;   // paused or in a menu
    const spd = speed();

    for (const w of weather) {
      if (cfg.map === 'MOUNTAINS') { w.y += 0.6 + w.s * 0.5; w.x += Math.sin(ticks / 40 + w.p) * 0.3 - 0.5 - spd * 0.15; }
      else { w.y -= 0.35 + w.s * 0.35; w.x += Math.sin(ticks / 30 + w.p) * 0.4 - spd * 0.15; }
      if (w.y > H) w.y = -2;
      if (w.y < -2) w.y = GROUND;
      if (w.x < 0) w.x += W;
      if (w.x > W) w.x -= W;
    }

    if (state === 'READY') {
      bird.y = H * 0.42 + Math.sin(ticks / 12) * 6;
      groundX += 2; bgX += 0.4;
    }

    if (state === 'PLAYING') {
      groundX += spd; bgX += 0.4;
      bird.vy = Math.min(bird.vy + 0.26, 7.5);
      bird.y += bird.vy;
      if (bird.y < 0) { bird.y = 0; bird.vy = 0; }

      if (!pipes.length || pipes[pipes.length - 1].x < W - SPACING) spawnPipe();

      const hx = bird.x + 2, hy = bird.y + 2, hw = bird.w - 4, hh = bird.h - 4;
      for (const p of pipes) {
        p.x -= spd;
        p.phase += 0.04 + (cfg.diff === 'EXTREME' ? extremeTier() * 0.0015 : hardTier() * .0015);
        p.top = p.base + Math.sin(p.phase) * p.amp;
        if (hx + hw > p.x - 4 && hx < p.x + PW + 4) {
          if (hy < p.top || hy + hh > p.top + p.gap) die(false);
        }
        // One collectible coin sits in the centre of every pipe gap.
        const coinX = p.x + PW / 2, coinY = p.top + p.gap / 2;
        const birdCX = bird.x + bird.w / 2, birdCY = bird.y + bird.h / 2;
        if (state === 'PLAYING' && !p.coinTaken && Math.abs(birdCX - coinX) < 15 && Math.abs(birdCY - coinY) < 17) {
          p.coinTaken = true;
          const reward = coinReward(cfg.diff, score);
          wallet.coins += reward;
          save.earnedCoins = (save.earnedCoins || 0) + reward;
          saveWallet(); saveGame();
          tone(1040, 1560, 0.13, 'square', 0.07);
          burst(coinX, coinY, 10, 2, 24, ['#fff2a6', '#ffd23f', '#ff9f1c']);
        }
        if (!p.scored && p.x + PW < bird.x) {
          p.scored = true; score++; pop = cfg.fx ? 0 : 1;
          // Score sound removed: coin collection has its own chime.
          onScore(p);
          // EXTREME tiers adjust difficulty silently; no disruptive overlay or toast.
        }
      }
      pipes = pipes.filter(p => p.x + PW + 4 > 0);
      if (bird.y + bird.h >= GROUND) { bird.y = GROUND - bird.h; die(true); }
    }
    else if (state === 'DEAD') {
      bird.vy += 0.4;
      bird.y += bird.vy;
      if (bird.y + bird.h >= GROUND) {
        bird.y = GROUND - bird.h;
        state = 'GAMEOVER'; overAt = performance.now();
        shake = 5; tone(120, 40, 0.15, 'triangle', 0.08);
      }
    }

    const target = state === 'READY' ? 0 : Math.max(-0.45, Math.min(1.3, bird.vy * 0.09));
    bird.rot += (target - bird.rot) * (bird.vy < 0 ? 0.22 : 0.16);
  }

  // ---------- Drawing ----------
  function txt(s, x, y, size, color = '#fff', align = 'center', outline = true) {
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineWidth = Math.max(3, size / 5); ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  function title(s, x, y, size, color, align) {
    txt(s, x + 3, y + 4, size, '#5b1a4a', align);   // retro drop shadow
    txt(s, x, y, size, color, align);
  }

  function drawBackground() {
    if (cfg.cb === 'HIGH CONTRAST') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
    if (cfg.map !== 'CITY') { drawMapBg(); return; }
    const day = themeName() === 'DAY', T = day ? THEMES.DAY : THEMES.NIGHT;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, T.sky[0]); g.addColorStop(0.6, T.sky[1]); g.addColorStop(1, T.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const mx = W - (L ? 110 : 70), my = L ? 65 : 85;
    if (day) {                       // sun with spinning rays
      ctx.fillStyle = 'rgba(255,224,102,0.3)'; ctx.beginPath(); ctx.arc(mx, my, 36, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      for (let a = 0; a < 8; a++) {
        const an = a * 0.785 + ticks / 90;
        ctx.fillRect(Math.round(mx + Math.cos(an) * 30) - 2, Math.round(my + Math.sin(an) * 30) - 2, 4, 4);
      }
    } else {                         // moon with craters + twinkling stars
      ctx.fillStyle = 'rgba(255,247,214,0.15)'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#e8dcae';
      ctx.fillRect(mx - 9, my - 7, 5, 5); ctx.fillRect(mx + 5, my + 3, 6, 6); ctx.fillRect(mx - 4, my + 8, 4, 4);
      for (const s of stars) {
        const x = ((s.x - bgX * 0.3) % W + W) % W;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(ticks / 30 + s.t)) + ')';
        ctx.fillRect(Math.floor(x), Math.floor(s.y), s.s, s.s);
      }
    }

    ctx.fillStyle = T.cloud;
    for (const c of clouds) {
      const x = Math.floor(((c.x - bgX * 0.25) % (W + 120) + (W + 120)) % (W + 120)) - 60, y = Math.floor(c.y);
      ctx.fillRect(x, y, c.w, 10);
      ctx.fillRect(x + 8, y - 6, Math.floor(c.w * 0.5), 6);
      ctx.fillRect(x + Math.floor(c.w * 0.4), y - 10, Math.floor(c.w * 0.35), 4);
    }

    for (let x = 0; x < W; x += 4) {
      const m = x + bgX * 0.12;
      const h = Math.floor(85 + 35 * Math.sin(m * 0.021) + 20 * Math.sin(m * 0.057 + 1.3));
      ctx.fillStyle = T.mount; ctx.fillRect(x, GROUND - h, 4, h);
      if (h > 118) { ctx.fillStyle = T.snow; ctx.fillRect(x, GROUND - h, 4, 5); }
    }

    const off = -(bgX % TW);
    for (let k = 0; k < 2; k++) {
      for (const b of skyline) {
        const x = Math.floor(b.x + off + k * TW), y = GROUND - b.h;
        if (x > W || x + b.w < 0) continue;
        ctx.fillStyle = T.city; ctx.fillRect(x, y, b.w, b.h);
        ctx.fillStyle = T.top; ctx.fillRect(x, y, b.w, 2);
        for (let wy = y + 8; wy < GROUND - 8; wy += 12)
          for (let wx = x + 6; wx < x + b.w - 6; wx += 10) {
            ctx.fillStyle = ((wx - x) * 3 + (wy - y) * 5 + b.w) % 7 < 2 ? T.lit : T.off;
            ctx.fillRect(wx, wy, 3, 5);
          }
      }
    }

    const sh = groundX * 0.8, first = Math.floor(sh / 56);
    for (let i = first - 1; i < first + W / 56 + 2; i++) {
      const x = Math.floor(i * 56 - sh), t = ((i % 3) + 3) % 3, w = 18 + t * 6;
      ctx.fillStyle = '#1b6b2b'; ctx.fillRect(x, GROUND - 8, w, 8); ctx.fillRect(x + 3, GROUND - 12, w - 6, 4);
      ctx.fillStyle = '#2f9e44'; ctx.fillRect(x + 2, GROUND - 8, w - 4, 6); ctx.fillRect(x + 5, GROUND - 11, w - 10, 3);
      if (t === 2) { ctx.fillStyle = '#ff6b9d'; ctx.fillRect(x + 6, GROUND - 11, 2, 2); ctx.fillRect(x + w - 9, GROUND - 9, 2, 2); }
    }
  }

  function drawCoin(cx, cy, opts = {}) {
  const R = 11;                                        // радиус лицевой части
  const spin = opts.static ? 0 : Math.floor(ticks / 5) % 4;
  const edge = spin === 1 || spin === 3;               // "поворот" монеты
  const rx = edge ? R * 0.45 : R;
  const ry = R;
  const x = Math.floor(cx), y = Math.floor(cy);
  // Glow is a draw effect only: collection still uses the original hit distance.
  if (!opts.static && !cfg.fx && cfg.particleQuality !== 'OFF') {
    const pulse=.13+.07*Math.sin(ticks*.12);
    ctx.save();ctx.globalAlpha=pulse;
    ctx.fillStyle='#ffdc55';ctx.beginPath();ctx.ellipse(x,y,rx+7,ry+7,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // 1) Внешний тёмный контур
  ctx.fillStyle = BROWN;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 3, ry + 3, 0, 0, 6.2832);
  ctx.fill();

  // 2) Рубцы по краю (reeded edge)
  const nRidges = 24;
  for (let i = 0; i < nRidges; i++) {
    const a = (i / nRidges) * 6.2832;
    const cos = Math.cos(a), sin = Math.sin(a);
    const px = x + cos * (rx + 1.5);
    const py = y + sin * (ry + 1.5);
    const lit = cos < 0 && sin < 0;                    // свет падает с верхнего левого
    ctx.fillStyle = i % 2 === 0
      ? (lit ? '#fff2a6' : '#a45a10')
      : (lit ? '#ffd23f' : '#6b3a08');
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
  }

  // 3) Тёмное золото под лицевой частью (ободок)
  ctx.fillStyle = '#e99b19';
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 1, ry + 1, 0, 0, 6.2832);
  ctx.fill();

  // 4) Золотой диск
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832);
  ctx.fill();

  // 5) Внутренняя канавка
  ctx.strokeStyle = '#c47a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.75, ry * 0.75, 0, 0, 6.2832);
  ctx.stroke();

  // 6) Внутреннее светлое поле
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.68, ry * 0.68, 0, 0, 6.2832);
  ctx.fill();

  if (!edge) {
    // 7a) Tiny bird silhouette stamped into the gold (not a separate skin).
    // Keep the emblem centred and inside the inner coin field.
     ctx.fillStyle = '#99510b';

    // Силуэт головы
    ctx.fillRect(x - 3, y - 4, 5, 2);
    ctx.fillRect(x - 4, y - 2, 7, 5);
    ctx.fillRect(x - 3, y + 3, 5, 2);

    // Маленький клюв справа
    ctx.fillRect(x + 3, y - 1, 3, 2);
    ctx.fillRect(x + 5, y, 1, 1);

    // Глаз
    ctx.fillStyle = '#ffe7a0';
    ctx.fillRect(x, y - 1, 1, 1);

    // 8a) Блик сверху-слева
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.35, y - ry * 0.42, rx * 0.22, ry * 0.16, -0.6, 0, 6.2832);
    ctx.fill();

    // An angled mint-glass-like specular glint that follows the rotation.
    if(!opts.static){
      const bx=x-4+Math.round(Math.sin(ticks*.045)*2);
      ctx.fillStyle='rgba(255,255,235,.88)';ctx.fillRect(bx,y-7,4,2);
      ctx.fillRect(bx-1,y-5,2,3);
      ctx.fillStyle='#fff5ae';ctx.fillRect(x+3,y+5,3,1);
      if(!cfg.fx&&cfg.particleQuality!=='OFF'){
        const a=ticks*.055;
        const sx=x+Math.cos(a)*15,sy=y+Math.sin(a)*15;
        ctx.fillStyle='rgba(255,245,172,.8)';ctx.fillRect(Math.round(sx)-2,Math.round(sy),5,1);
        ctx.fillRect(Math.round(sx),Math.round(sy)-2,1,5);
      }
    }
    // 9a) Мягкая тень снизу-справа
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.4, y + ry * 0.35, rx * 0.15, ry * 0.1, 0, 0, 6.2832);
    ctx.fill();
  } else {
    // 7b) Монета "в профиль" — светлая вертикальная полоса
    ctx.fillStyle = '#fff2a6';
    ctx.fillRect(x - 1, y - Math.floor(ry * 0.68), 2, Math.floor(ry * 1.36));
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x + 1, y - Math.floor(ry * 0.68), 1, Math.floor(ry * 1.36));
  }
}

  function drawPipe(p) {
    const x = Math.floor(p.x), top = Math.floor(p.top), bot = top + p.gap;
    const c = (cfg.cb === 'OFF' ? MAPS[cfg.map].pipes : PIPES[cfg.cb])[p.amp ? 1 : 0];   // moving pipes: second color + square marks
    const block = (bx, by, bw, bh, cap) => {
      ctx.fillStyle = c.main; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = c.light; ctx.fillRect(bx + 4, by, 5, bh);
      ctx.fillStyle = c.dark; ctx.fillRect(bx + bw - 10, by, 10, bh);
      if (!cap) {
        ctx.fillStyle=c.light;
        for(let y=by+6;y<by+bh-3;y+=14)ctx.fillRect(bx+14,y,2,2);
        if(bh>9){
          ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(bx+11,by+3,2,bh-6);
          ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(bx+bw-14,by+3,2,bh-6);
        }
        for(let y=by+14;y<by+bh-7;y+=26){
          ctx.fillStyle=c.dark;ctx.fillRect(bx+5,y,4,4);ctx.fillRect(bx+bw-8,y,4,4);
          ctx.fillStyle=c.light;ctx.fillRect(bx+6,y+1,1,1);ctx.fillRect(bx+bw-7,y+1,1,1);
        }
      }else{
        ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(bx+3,by+3,bw-6,2);
        ctx.fillStyle=c.dark;ctx.fillRect(bx+3,by+bh-3,bw-6,1);
      }
      ctx.fillStyle=INK;ctx.fillRect(bx,by,2,bh);ctx.fillRect(bx+bw-2,by,2,bh);
    };
    block(x, 0, PW, top - CAP, false);
    block(x - 4, top - CAP, PW + 8, CAP, true);
    block(x - 4, bot, PW + 8, CAP, true);
    block(x, bot + CAP, PW, GROUND - bot - CAP, false);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 4, top - CAP, PW + 8, 2); ctx.fillRect(x - 4, top - 2, PW + 8, 2);
    ctx.fillRect(x - 4, bot, PW + 8, 2); ctx.fillRect(x - 4, bot + CAP - 2, PW + 8, 2);
    ctx.fillStyle = c.light;
    ctx.fillRect(x - 2, top - CAP + 2, PW + 4, 1);ctx.fillRect(x - 2, bot + 2, PW + 4, 1);
    // Raised bolt heads and a bevel keep both pipe types readable.
    for(const yy of [top-CAP+8,bot+8]){
      for(const xx of [x+5,x+PW-9]){
        ctx.fillStyle=c.dark;ctx.fillRect(xx,yy,5,5);
        ctx.fillStyle=c.light;ctx.fillRect(xx+1,yy+1,2,2);
      }
    }
    if (cfg.cb==='OFF'){
      if(cfg.map==='NEON'||cfg.map==='COSMIC'){
        ctx.fillStyle=cfg.map==='NEON'?'#82f4ff':'#f4baff';
        for(const yy of [top-CAP+5,bot+5])ctx.fillRect(x+PW/2-4,yy,8,2);
      }else if(cfg.map==='OCEAN'||cfg.map==='SAKURA'){
        ctx.fillStyle=cfg.map==='OCEAN'?'#a8f4f7':'#ffe0e8';
        for(const yy of [top-CAP+5,bot+5]){ctx.fillRect(x+20,yy,3,3);ctx.fillRect(x+28,yy+4,2,2);}
      }else if(cfg.map==='VOLCANO_PLUS'){
        ctx.fillStyle='#ffba52';
        for(const yy of [top-CAP+4,bot+4])ctx.fillRect(x+12,yy,28,2);
      }
    }
    if (cfg.cb === 'OFF' && RICH[cfg.map]) pipeDeco(x, top, bot);
    if (p.amp) {   // marks make moving pipes recognizable without color
      ctx.fillStyle = INK;
      for (let cx = x + 1; cx < x + PW - 4; cx += 8) { ctx.fillRect(cx, top - CAP + 6, 4, 4); ctx.fillRect(cx, bot + 6, 4, 4); }
    }
    if (cfg.cb === 'OFF' && cfg.map === 'MOUNTAINS') {   // icicle teeth and snow on the caps (all inside the caps)
      ctx.fillStyle = '#e6f8ff';
      for (let i = 0; i < 5; i++) { const ix = x + 2 + i * 10; ctx.fillRect(ix, top - 7, 6, 3); ctx.fillRect(ix + 1, top - 4, 4, 2); ctx.fillRect(ix + 2, top - 2, 2, 2); }
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, bot + 2, PW + 6, 3);
    } else if (cfg.cb === 'OFF' && cfg.map === 'VOLCANO') {   // glowing lava rims and cracks
      ctx.fillStyle = '#ff7b2e';
      ctx.fillRect(x - 2, top - 6, PW + 4, 2); ctx.fillRect(x - 2, bot + 4, PW + 4, 2);
      for (let yy = 10; yy < top - CAP - 4; yy += 28) ctx.fillRect(x + 22, yy, 2, 8);
      for (let yy = bot + CAP + 10; yy < GROUND - 8; yy += 28) ctx.fillRect(x + 30, yy, 2, 8);
    }
  }

  function drawGround() {
    if (cfg.cb === 'HIGH CONTRAST') {
      ctx.fillStyle = '#222'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, GROUND, W, 3);
      return;
    }
    if (cfg.map !== 'CITY') { drawMapGround(); return; }
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#7ed957'; ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = '#4fae35'; ctx.fillRect(0, GROUND + 8, W, 3);
    ctx.fillStyle = INK; ctx.fillRect(0, GROUND - 2, W, 2);
    const gw = Math.floor(groundX);
    for (let x = -(gw % 12); x < W; x += 12) {          // grass tufts and stones
      const i = Math.floor((x + gw) / 12);
      ctx.fillStyle = '#a8f27f'; ctx.fillRect(x + (i % 3) * 3, GROUND + 1, 2, 2 + (i % 2));
      ctx.fillStyle = '#6e4420'; ctx.fillRect(x + 4, GROUND + 18 + (i % 2) * 9, 4, 3);
    }
    ctx.strokeStyle = '#a06a38'; ctx.lineWidth = 3;
    const o = groundX % 16;
    ctx.beginPath();
    for (let x = -16 - o; x < W + 16; x += 16) { ctx.moveTo(x + 16, GROUND + 14); ctx.lineTo(x, GROUND + 28); }
    ctx.stroke();
  }

  function drawBird() {
    ctx.save();
    const sk = SKINS[skinOK(cfg.skin) ? cfg.skin : 0];
    ctx.translate(Math.floor(bird.x + bird.w / 2), Math.floor(bird.y + bird.h / 2));
    ctx.rotate(bird.rot);
    const f = state === 'GAMEOVER' || state === 'DEAD' ? 1 : Math.floor(ticks / 5) % 3;
    const wy = (f - 1) * 3;
    birdShapes(sk, wy);
    ctx.restore();
  }

  const rc = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const NEW_SKIN = new Set(['ARCTIC OWL', 'ROYAL RAVEN', 'JADE BIRD', 'Lorean']);
  // Per-skin silhouette layers: pre = behind the body (tail), post = over it (crest, wing, face). Same bounding area for all.
  const SPEC = {
    'PHOENIX': {
      pre() { const f = (ticks >> 2) & 1;
        rc(BROWN,-23,-1,12,9); rc('#f33526',-22,0,10,7); rc('#ff9a30',-22+f,2,9,3); rc('#ffe58a',-25,3+f,4,3); rc('#ff6633',-20,8,5,5+f); rc('#ffbd35',-17,9,3,4); },
      post(wy) { const f = (ticks >> 2) & 1;
        rc('#ff6633',-8,-14,3,4); rc('#ffbd35',-5,-16,4,5); rc('#ffe58a',-1,-20-f,3,9);
        rc(BROWN,-12,-6+wy,15,11); rc('#f33526',-11,-5+wy,13,9); rc('#ff9a30',-11,-5+wy,13,3); rc('#ffe58a',-11,-2+wy,6,2);
        rc('#ff6633',-15,-1+wy,4,3); rc('#ffe58a',-17,2+wy,3,2); rc('#9c2428',-11,3+wy,13,1); }
    },
    'CYBER BIRD': {
      pre() { rc(BROWN,-22,-5,11,12); rc('#5c5b87',-21,-4,9,3); rc('#a14ce8',-21,0,9,3); rc('#47f8ff',-21,4,9,2); rc('#f074ff',-24,-2,3,2); rc('#f074ff',-24,3,3,2); },
      post(wy) {
        rc(BROWN,-12,-4+wy,13,10); rc('#a14ce8',-11,-3+wy,11,8); rc('#47f8ff',-11,-3+wy,11,1); rc('#47f8ff',-8,wy,1,4); rc('#47f8ff',-4,wy,1,4); rc('#4c248b',-11,4+wy,11,1);
        rc('#0b0b24',2,-9,9,5); rc('#47f8ff',(ticks >> 3) & 1 ? 4 : 6,-8,5,2);
        rc('#47f8ff',-1,-18,2,7); rc('#f074ff',-2,-20,4,3); rc('#47f8ff',3,6,5,1); }
    },
    'ARCTIC OWL': {
      beak() { rc(BROWN,9,-1,6,6); rc('#f0a030',10,0,4,3); rc('#c77a10',10,3,3,1); },
      pre() { rc(BROWN,-18,-3,8,8); rc('#dcecff',-17,-2,6,6); rc('#8fc3f0',-17,2,6,2); },
      post(wy) {
        rc(BROWN,-7,-15,5,7); rc('#f2f8ff',-6,-14,3,5); rc('#8fc3f0',-6,-14,3,1); rc(BROWN,3,-15,5,7); rc('#f2f8ff',4,-14,3,5); rc('#8fc3f0',4,-14,3,1);
        rc(BROWN,0,-9,12,13); rc('#ffffff',1,-8,10,11);
        rc(BROWN,1,-7,5,5); rc('#ffd23f',2,-6,3,3); rc('#000',3,-5,1,2); rc(BROWN,6,-7,5,5); rc('#ffd23f',7,-6,3,3); rc('#000',8,-5,1,2);
        rc(BROWN,-12,-4+wy,13,10); rc('#8fc3f0',-11,-3+wy,11,8); rc('#f2f8ff',-11,-3+wy,11,2); rc('#4f7fb8',-9,1+wy,2,2); rc('#4f7fb8',-5,2+wy,2,2); rc('#4f7fb8',-2,wy,2,2); }
    },
    'ROYAL RAVEN': {
      beak() { rc(BROWN,9,-4,13,10); rc('#2d2542',10,-3,11,4); rc('#4a3a7a',10,-3,11,1); rc('#1c1530',10,1,10,4); rc('#ffd23f',19,-3,2,3); },
      pre() { rc(BROWN,-25,-4,14,10); rc('#2a1a4e',-24,-3,12,8); rc('#6a3fb0',-24,-3,12,2); rc('#ffd23f',-27,0,3,3); },
      post(wy) {
        rc(BROWN,-6,-17,12,5); rc('#ffd23f',-5,-16,10,3); rc('#fff0a0',-5,-16,10,1); rc('#ffd23f',-5,-19,2,3); rc('#ffd23f',-1,-20,2,4); rc('#ffd23f',3,-19,2,3); rc('#d12a5a',-1,-15,2,2);
        rc(BROWN,-15,-5+wy,17,12); rc('#2a1a4e',-14,-4+wy,15,10); rc('#6a3fb0',-14,-4+wy,15,2); rc('#4a2a86',-14,wy,12,1); rc('#ffd23f',-17,3+wy,3,2); rc('#ffd23f',-13,6+wy,2,2); }
    },
    'JADE BIRD': {
      pre() { rc(BROWN,-24,-1,13,5); rc('#1b8a62',-23,0,11,3); rc('#9af0cf',-23,0,11,1); rc(BROWN,-27,4,10,4); rc('#2fbf8a',-26,5,8,2); rc('#ffd05a',-28,6,3,2); },
      post(wy) {
        rc('#9af0cf',-6,-15,3,5); rc('#2fbf8a',-3,-18,3,8); rc('#1b8a62',0,-16,3,6); rc('#ffd05a',-3,-19,3,2);
        rc(BROWN,-12,-4+wy,14,10); rc('#1b8a62',-11,-3+wy,12,8); rc('#2fbf8a',-11,-3+wy,12,2);
        rc('#ffd05a',-9,wy,2,2); rc('#ffd05a',-5,wy,2,2); rc('#9af0cf',-7,2+wy,2,2); rc('#ffd05a',-3,2+wy,2,2); rc('#ffd05a',-2,7,11,1); }
    },
    'AURUM': {
      beak() { rc(BROWN,9,-4,12,10); rc('#8f5b0e',10,-3,10,4); rc('#e0a516',10,-3,10,2); rc('#ffca45',10,-3,10,1); rc('#9c5e08',10,1,9,4); rc('#fff0a6',17,-2,2,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#8f5b0e',-23,-4,12,9); rc('#e0a516',-23,-4,12,2); rc('#ffe27a',-22,-1,9,1); rc('#fff0b8',-22,2,7,1); rc('#573406',-22,5,8,1);
        rc('#e0a516',-26,-2,3,3); rc('#fff0b8',-25,-1,1,1); rc('#ffe27a',-26,3,3,2); rc('#fff0b8',-25,4,1,1);
      },
      post(wy) { const s = (ticks >> 3) & 1;
        rc(BROWN,-9,-18,15,5); rc('#8f5b0e',-8,-17,13,3); rc('#e0a516',-8,-17,13,1); rc('#ffe27a',-6,-21,3,4); rc('#fff0b8',-5,-20,1,1); rc('#ffe27a',-1,-22,3,5); rc('#fff0b8',0,-21,1,1); rc('#ffe27a',4,-21,3,4); rc('#fff0b8',5,-20,1,1);
        rc(BROWN,1,-11,9,7); rc('#8f5b0e',2,-10,7,5); rc('#e0a516',2,-10,7,1); rc('#fff0b8',4,-8,3,1); rc('#ffe27a',3,-6,5,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#8f5b0e',-14,-5+wy,15,11); rc('#e0a516',-14,-5+wy,15,2); rc('#ffe27a',-12,-2+wy,11,1); rc('#fff0b8',-10,0+wy,2,2); rc('#fff0b8',-5+s,2+wy,2,2); rc('#fff0b8',-1,4+wy,2,1); rc('#573406',-14,5+wy,15,1);
        rc('#e0a516',-18,1+wy,3,3); rc('#fff0b8',-17,2+wy,1,1); rc('#e0a516',-13,7,11,1); rc('#ffe27a',-12,6,8,1);
      }
    },
    'OBSIDIAN': {
      beak() { rc(BROWN,9,-4,12,10); rc('#2c2237',10,-3,10,4); rc('#5a4f6b',10,-3,10,1); rc('#17141f',10,1,9,4); rc('#d11f3f',17,-1,2,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#17141f',-23,-4,12,9); rc('#5a4f6b',-23,-4,12,1); rc('#7a0f27',-23,0,9,1); rc('#d11f3f',-23,3,7,1);
        rc('#d11f3f',-26,-1,3,2); rc('#d11f3f',-25,4,2,3); rc('#3a2f46',-22,5,7,1);
      },
      post(wy) { const p = (ticks >> 4) & 1;
        rc(BROWN,-8,-19,14,5); rc('#17141f',-7,-18,12,3); rc('#5a4f6b',-7,-18,12,1); rc('#d11f3f',-7,-22,2,4); rc('#7a0f27',-6,-21,1,3); rc('#d11f3f',-2,-21-p,2,5); rc('#7a0f27',-1,-20,1,4); rc('#d11f3f',3,-22,2,4);
        rc(BROWN,1,-11,9,7); rc('#17141f',2,-10,7,5); rc('#5a4f6b',2,-10,7,1); rc('#d11f3f',4,-8,3,1); rc('#7a0f27',3,-6,5,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#17141f',-14,-5+wy,15,11); rc('#5a4f6b',-14,-5+wy,15,1); rc('#7a0f27',-14,-1+wy,12,1); rc('#d11f3f',-12,1+wy,2,2); rc('#d11f3f',-8,2+wy,2,2); rc('#d11f3f',-4,0+wy,2,2); rc('#3a2f46',-14,5+wy,15,1);
        rc(BROWN,2,-8,8,4); rc('#17141f',3,-7,6,2); rc('#d11f3f',4,-7,4,1); rc('#d11f3f',8,-6,1,1); rc('#3a2f46',3,-5,6,1); rc('#d11f3f',-18,3+wy,3,2);
      }
    },
    'ABYSS': {
      beak() { rc(BROWN,9,-4,11,10); rc('#0a3578',10,-3,9,4); rc('#1a6fd6',10,-3,9,2); rc('#3fe0ff',10,-3,9,1); rc('#0a3578',10,1,8,4); rc('#bfe9ff',16,-2,2,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#0a3578',-23,-4,12,9); rc('#1a6fd6',-23,-4,12,2); rc('#3fe0ff',-22,-1,8,1); rc('#3fe0ff',-22,2,6,1); rc('#0e2a52',-22,5,8,1);
        rc('#3fe0ff',-26,-1,3,3); rc('#bfe9ff',-25,0,1,1); rc('#3fe0ff',-24,5,2,2);
      },
      post(wy) { const g = (ticks >> 3) & 1;
        rc('#3fe0ff',-7,-19,3,7); rc('#0e2a52',-6,-18,1,6); rc('#3fe0ff',-2,-21,2,9); rc('#bfe9ff',-2,-21,2,1); rc('#3fe0ff',2,-19,3,7); rc('#bfe9ff',3,-18,1,1);
        rc(BROWN,1,-11,10,7); rc('#0a3578',2,-10,8,5); rc('#1a6fd6',2,-10,8,1); rc('#3fe0ff',3,-8,5,1); rc('#bfe9ff',7,-7,1,1); rc('#1a6fd6',4,-6,4,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#0a3578',-14,-5+wy,15,11); rc('#1a6fd6',-14,-5+wy,15,2); rc('#3fe0ff',-14,-2+wy,11,1); rc('#3fe0ff',-11+g,1+wy,2,2); rc('#bfe9ff',-7,0+wy,2,2); rc('#3fe0ff',-3,2+wy,2,2); rc('#0e2a52',-14,5+wy,15,1);
        rc(BROWN,2,-9,8,8); rc('#0a3578',3,-8,6,6); rc('#3fe0ff',4,-7,4,1); rc('#bfe9ff',7,-6,1,1); rc('#3fe0ff',-18,1+wy,3,4); rc('#1a6fd6',-19,3+wy,2,3);
      }
    },
    'ECLIPSE': {
      beak() { rc(BROWN,9,-4,12,10); rc('#4b2a6b',10,-3,10,4); rc('#ff7a18',10,-3,10,2); rc('#ffb347',10,-3,10,1); rc('#a63d00',10,1,9,4); rc('#ffcf73',18,-2,1,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#4b2a6b',-23,-4,12,9); rc('#ff7a18',-23,-4,12,2); rc('#ffb347',-22,-1,9,1); rc('#241038',-22,5,8,1); rc('#ff7a18',-26,0,3,3); rc('#ffcf73',-25,1,1,1);
      },
      post(wy) { const a = (ticks >> 3) & 1;
        rc(BROWN,-11,-18,19,5); rc('#241038',-10,-17,17,3); rc('#ff7a18',-9,-17,15,1); rc('#ffb347',-4,-22,5,6); rc('#ffcf73',-3,-21,3,4); rc('#4b2a6b',-2,-20,2,2); rc('#ff7a18',5,-19,2,2); rc('#ff7a18',-8,-19,2,2);
        rc(BROWN,1,-11,10,7); rc('#4b2a6b',2,-10,8,5); rc('#ff7a18',2,-10,8,1); rc('#ffb347',4,-8,4,1); rc('#a63d00',3,-6,5,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#4b2a6b',-14,-5+wy,15,11); rc('#ff7a18',-14,-5+wy,15,2); rc('#ffb347',-12,-2+wy,11,1); rc('#ffcf73',-9+a,1+wy,2,2); rc('#ff7a18',-5,2+wy,2,2); rc('#a63d00',-14,5+wy,15,1); rc('#ff7a18',-18,0+wy,3,3); rc('#ffb347',-17,1+wy,1,1);
      }
    },
    'EMERALD KING': {
      beak() { rc(BROWN,9,-4,12,10); rc('#8a6a0a',10,-3,10,4); rc('#e8b923',10,-3,10,2); rc('#fff0a6',10,-3,10,1); rc('#8a6a0a',10,1,9,4); rc('#3fe0a0',17,-2,2,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#0c4a34',-23,-4,12,9); rc('#1b8a62',-23,-4,12,2); rc('#3fe0a0',-22,-1,9,1); rc('#8a6a0a',-22,5,8,1); rc('#3fe0a0',-25,3,3,2); rc('#e8b923',-26,-1,3,3);
      },
      post(wy) { const s = (ticks >> 4) & 1;
        rc(BROWN,-9,-19,15,5); rc('#8a6a0a',-8,-18,13,3); rc('#e8b923',-8,-18,13,1); rc('#e8b923',-7,-22,3,4); rc('#3fe0a0',-6,-21,1,2); rc('#e8b923',-2,-23,3,5); rc('#3fe0a0',-1,-22,1,2); rc('#e8b923',3,-22,3,4); rc('#3fe0a0',4,-21,1,2);
        rc(BROWN,1,-11,9,7); rc('#0c4a34',2,-10,7,5); rc('#3fe0a0',2,-10,7,1); rc('#e8b923',3,-8,5,1); rc('#c9f5de',5,-7,2,1); rc('#1b8a62',3,-6,5,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#1b8a62',-14,-5+wy,15,11); rc('#3fe0a0',-14,-5+wy,15,2); rc('#c9f5de',-12,-2+wy,10,1); rc('#e8b923',-12,0+wy,2,2); rc('#e8b923',-8,1+wy,2,2); rc('#3fe0a0',-4+s,2+wy,2,2); rc('#0c4a34',-14,5+wy,15,1); rc('#e8b923',-18,2+wy,3,2); rc('#e8b923',-13,7,11,1);
      }
    },
    'PLATINUM': {
      beak() { rc(BROWN,9,-4,12,10); rc('#6d7888',10,-3,10,4); rc('#aab4c4',10,-3,10,2); rc('#f2f6fc',10,-3,10,1); rc('#24348a',10,1,9,4); rc('#f2f6fc',17,-2,2,2); },
      pre() {
        rc(BROWN,-24,-5,14,11); rc('#6d7888',-23,-4,12,9); rc('#aab4c4',-23,-4,12,2); rc('#f2f6fc',-22,-1,9,1); rc('#3f5bd0',-22,2,7,1); rc('#24348a',-22,5,8,1);
        rc('#d8e0ec',-26,-1,3,3); rc('#f2f6fc',-25,0,1,1); rc('#3f5bd0',-25,4,2,2);
      },
      post(wy) { const b = (ticks >> 3) & 1;
        rc(BROWN,-10,-18,16,5); rc('#6d7888',-9,-17,14,3); rc('#aab4c4',-9,-17,14,1); rc('#f2f6fc',-5,-21,6,4); rc('#3f5bd0',-2,-22,1,5); rc('#d8e0ec',2,-20,2,2);
        rc(BROWN,1,-11,10,7); rc('#aab4c4',2,-10,8,5); rc('#f2f6fc',2,-10,8,1); rc('#3f5bd0',5,-9,2,5); rc('#24348a',3,-6,6,1); rc('#d8e0ec',3,-8,2,1);
        rc(BROWN,-15,-6+wy,17,13); rc('#6d7888',-14,-5+wy,15,11); rc('#aab4c4',-14,-5+wy,15,2); rc('#f2f6fc',-12,-2+wy,10,1); rc('#3f5bd0',-10+b,1+wy,2,2); rc('#3f5bd0',-5,2+wy,2,2); rc('#24348a',-14,5+wy,15,1); rc('#d8e0ec',-8,0+wy,2,2); rc('#f2f6fc',-18,1+wy,3,3);
        rc(BROWN,2,-9,8,8); rc('#aab4c4',3,-8,6,6); rc('#f2f6fc',3,-8,6,2); rc('#3f5bd0',5,-7,2,5); rc('#24348a',3,-2,6,1);
      }
    }
  };
  // Three high-resolution Canvas frames, shared by gameplay, ghosts, avatars and shop.
  // Artwork has a stable key: renaming the visible skin no longer changes its drawing.
  const loreanFrames = new Map();
  function drawLorean(wy) {
    const frame = Math.max(-1, Math.min(1, Math.round(wy / 3)));
    if (!loreanFrames.has(frame)) {
      const tile = document.createElement('canvas'); tile.width = 256; tile.height = 192;
      const g = tile.getContext('2d'); g.scale(4,4); g.translate(30,25);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const ink='#302034', purple='#50205f';
      const path=(d,fill,stroke=ink,width=1.25)=>{const p=new Path2D(d);if(fill){g.fillStyle=fill;g.fill(p);}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke(p);}};
      const oval=(x,y,rx,ry,fill,stroke=null,width=.5)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}};
      const grad=(x,y,x2,y2,stops)=>{const c=g.createLinearGradient(x,y,x2,y2);stops.forEach(([p,col])=>c.addColorStop(p,col));return c;};
      // Layered violet tail, curved feather shafts and satin highlights.
      path('M-10 -3 C-18 -3 -27 4 -26 10 Q-25 14 -21 10 Q-23 17 -18 15 Q-14 17 -12 12 L-7 4 Z', '#742b98');
      path('M-12 -2 Q-23 3 -24 10 Q-21 9 -15 2 M-10 1 Q-20 9 -18 14 Q-15 12 -11 6', '#a74ac7',null);
      path('M-16 1 Q-22 5 -23 9 M-12 5 Q-16 10 -16 12',null,'#d48aea',.8);
      // Tied bandana ends behind the head.
      path('M-12 -11 Q-21 -16 -23 -13 Q-22 -9 -17 -9 Q-22 -5 -20 -2 Q-15 -3 -13 -9 Z','#a142bf',purple);
      path('M-19 -12 Q-17 -12 -15 -10 M-18 -4 L-15 -8',null,'#db85e7',.8);
      oval(-14,-10,2.5,2.6,'#b257d0',purple,1);
      // Green body retains the compact block-like silhouette of the reference.
      path('M-12 -8 L6 -10 Q11 -9 12 -4 L12 8 Q4 12 -9 10 L-13 5 Z',grad(-10,-8,7,11,[[0,'#c6ef82'],[.45,'#89c552'],[1,'#509743']]),ink,1.8);
      path('M-8 6 Q2 9 10 5 L10 8 Q1 11 -8 8 Z','#d2f19b',null);
      path('M-11 -5 L-9 4',null,'#d9f4a2',.7);
      // Far lens and orange beak are behind the nearer lens.
      path('M9 -9 Q13 -18 17 -18 Q20 -13 18 -5 Q17 0 13 1 L9 -1 Z','#6e727a',ink,1.5);
      path('M11 -8 Q14 -14 16 -15 Q18 -10 16 -5 L13 -2 Z',grad(11,-14,18,0,[[0,'#e4f7ff'],[1,'#7ea9bf']]),'#b9c7d0',.7);
      path('M15 -13 L13 -5',null,'#f7fcff',1);
      path('M9 -1 L21 -3 L22 8 L10 10 Z','#fa7135',ink,1.6);
      path('M11 5 L21 3 L21 7 L11 8 Z','#c84729',null);
      path('M12 0 L20 -1',null,'#ffaf62',.65);
      // Animated wing with layered green feathers.
      g.save();g.translate(-5,2);g.rotate(frame*.12);
      path('M-6 -3 Q-1 -5 4 -2 L5 5 Q0 7 -6 4 Z','#438b4c',ink,1.05);
      path('M-5 -2 Q0 -3 3 -1 L3 1 L-5 1 Z','#86c858',null);
      path('M-4 2 L3 2 M-3 4 L2 4',null,'#256d49',.65);g.restore();
      // Purple scarf drapes diagonally with a knot and two flowing tips.
      path('M2 0 Q4 6 10 9 L15 10 L14 13 Q5 11 0 4 Z',grad(0,2,14,12,[[0,'#a84dc7'],[1,'#702789']]),purple,1);
      path('M13 11 Q17 10 18 13 Q18 15 15 15 L13 13 Z','#a44cc0',purple,.9);
      path('M15 14 Q15 18 12 20 L12 15 Z M17 14 Q20 15 22 18 Q18 19 16 16 Z','#aa51c4',purple,.9);
      [[3,4,.65],[5,7,.65],[8,9,.65],[11,11,.6],[15.6,12.7,.6],[13,17,.5],[19,16.7,.55]].forEach(p=>oval(...p,p[2],'#fff4fc'));
      // Satin headscarf: dome, folded brim, fabric creases and seam.
      path('M-14 -10 Q-13 -20 -5 -22 Q5 -25 12 -16 L14 -12 Q6 -10 -2 -11 Z',grad(-10,-22,2,-9,[[0,'#d884e6'],[.28,'#ad48cf'],[.8,'#8c31b0'],[1,'#6d288b']]),purple,1.5);
      path('M-11 -16 Q-4 -23 4 -20 Q8 -19 10 -16 Q0 -19 -11 -16 Z','#c969db',null);
      path('M-13 -11 Q0 -16 12 -14 Q15 -14 14 -12 Q3 -10 -13 -9 Z','#b952ce',purple,.8);
      path('M-12 -12 Q-8 -16 -5 -16 M-12 -11 Q-6 -13 -2 -13',null,'#74308d',.65);
      // Glasses strap, large expressive eye and cat-eye metal frame.
      path('M-13 -8 Q-8 -8 -2 -10 L0 -6 Q-7 -4 -13 -5 Z','#424452',ink,1);
      path('M-12 -7 Q-6 -7 -2 -8',null,'#92919c',.65);
      const lens='M-3 -13 Q4 -16 11 -10 Q14 -6 11 0 Q8 5 3 3 Q-2 2 -3 -5 Z';
      path(lens,grad(-3,-13,11,4,[[0,'#9ba7b8'],[.5,'#d1e3e8'],[1,'#8daeb7']]),ink,1.6);
      // Eye is clipped inside the lens, never spills over the frame.
      g.save();g.clip(new Path2D(lens));
      oval(5,-3,4.6,5.7,'#eff9fa');oval(7,-2.6,1.7,3.8,'#4b626d');oval(7.4,-3,1,3,'#283b4b');
      oval(7.8,-5,1.1,1.3,'#ffffff');oval(6.6,-.3,.45,.6,'#d7f3ff');
      path('M0 -8 Q4 -6 8 -8 M1 -8 L0 -10 M3 -7 L2 -10 M5 -7 L5 -10 M7 -8 L8 -10',null,'#506471',.75);
      path('M-2 -10 L1 -12 L9 2 L6 3 Z','rgba(255,255,255,.3)',null);
      path('M5 -12 L6 -12 L12 -2 L11 0 Z','rgba(255,255,255,.4)',null);g.restore();
      path(lens,null,'#525263',.9);
      path('M-2 -12 Q4 -14 10 -9',null,'#f0e6e7',.7);
      path('M12 -7 Q13 -9 14 -7',null,'#343243',1.4);
      oval(-1,-10,.45,.45,'#f9e4cf');oval(11,-7,.4,.4,'#f9e4cf');
      // Strawberry lollipop: slender stick, rounded candy, swirl and sugar shine.
      path('M17 5 L27 3',null,ink,1.9);path('M17 4.7 L27 2.7',null,'#fff7e8',.85);
      oval(28.1,2.1,3.4,4.5,'#dc3156','#571e38',1);
      oval(28.7,1.6,2.4,3.5,'#f46c83');
      path('M27 -1 Q30 0 29 3 Q28 5 27 4 Q25 2 27 1 Q29 0 29 2',null,'#ffbdc5',.65);
      oval(29,-.3,.8,1,'#fff8f5');oval(30.1,1.2,.35,.5,'#fff8f5');
      loreanFrames.set(frame,tile);
    }
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.scale(.82,.82);ctx.drawImage(loreanFrames.get(frame),-30,-25,64,48);ctx.restore();
  }

  // ZxcGoul — a smaller, more faithful Canvas rendition of the supplied image.
  // The three crimson appendages are rendered as a built-in signature effect that
  // always ships with this skin, without adding a separate shop inventory item.
  function drawZxcGoul(wy) {
    const g=ctx, outline='#0d0912', shell='#18131f', shellHi='#302736';
    const poly=(pts,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fill();};
    const line=(pts,color,width=.9,alpha=1)=>{g.save();g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.stroke();g.restore();};
    g.save();
    // Slightly smaller than the previous draft so the skin sits closer to standard birds.
    g.scale(.87,.87);
    const sway=wy*.34;
    // Three crimson tendrils bundled with the skin.
    const tendril=(pts,fill,vein)=>{
      poly(pts,outline);
      poly([[pts[0][0]+1.1,pts[0][1]],[pts[1][0]+1.3,pts[1][1]],[pts[2][0]+1.4,pts[2][1]],[pts[3][0]+1.2,pts[3][1]],[pts[4][0]+1,pts[4][1]],[pts[5][0]+1.1,pts[5][1]]],fill);
      line([pts[1],[pts[2][0]+1.8,pts[2][1]+.5],[pts[3][0]+1.1,pts[3][1]+.2]],vein,.9,.88);
    };
    tendril([[-12,-2],[-23,-15-sway],[-27,-21-sway*1.2],[-21,-20-sway],[-14,-17-sway*.35],[-9,-9]],'#960d21','#ff3a49');
    tendril([[-14,2],[-27,0-sway*.18],[-31,4+sway*.2],[-27,7+sway*.4],[-18,8+sway*.2],[-11,7]],'#86091d','#ff2f41');
    tendril([[-11,9],[-22,13+sway*.45],[-28,20+sway],[-23,18+sway*.9],[-15,16+sway*.55],[-10,13]],'#a40f24','#ff5362');
    g.fillStyle='rgba(255,28,58,.13)';g.beginPath();g.ellipse(-20,1,12,16,0,0,Math.PI*2);g.fill();
    // Main head silhouette.
    poly([[-19,-12],[11,-14],[17,-9],[18,8],[10,16],[-14,16],[-21,10],[-21,-2]],outline);
    poly([[-17,-10],[10,-11],[15,-7],[15,7],[8,14],[-13,13],[-18,8],[-18,-1]],shell);
    poly([[-16,2],[-9,-1],[-5,3],[0,7],[7,10],[-13,11]],shellHi);
    poly([[-15,7],[-8,9],[0,12],[-13,14]],'#0b0a10');
    // Hair — denser and more jagged, closer to the reference.
    poly([[-22,-12],[-18,-16],[-15,-16],[-10,-20],[-7,-18],[-2,-22],[1,-19],[7,-21],[9,-18],[15,-17],[16,-13],[20,-11],[17,-8],[20,-5],[16,-4],[13,-1],[9,-4],[5,-2],[2,-7],[-2,-4],[-6,0],[-9,-5],[-13,2],[-16,-2],[-20,0],[-18,-5],[-23,-5]],outline);
    poly([[-21,-12],[-17,-15],[-14,-15],[-9,-19],[-6,-17],[-2,-21],[1,-18],[6,-20],[8,-17],[14,-16],[15,-13],[18,-10],[16,-8],[18,-5],[14,-5],[12,-2],[8,-5],[5,-3],[2,-8],[-2,-6],[-6,-1],[-9,-7],[-13,0],[-15,-4],[-19,-1],[-17,-6],[-22,-6]],'#f5f3ff');
    poly([[-15,-12],[-11,-15],[-8,-11],[-14,-7]],'#b5b1d4');
    poly([[-7,-18],[-2,-18],[-5,-11],[-9,-6]],'#c9c4e2');
    poly([[1,-20],[6,-18],[7,-12],[4,-13]],'#d0cae4');
    poly([[10,-15],[14,-13],[13,-8],[10,-9]],'#b4b0ca');
    // Visor and single red eye.
    poly([[-2,-7],[12,-8],[13,1],[1,3]],'#06060b');
    g.fillStyle='rgba(255,24,40,.26)';g.beginPath();g.arc(7,-3,6.9,0,Math.PI*2);g.fill();
    g.fillStyle='#7d0914';g.beginPath();g.arc(7,-3,3.4,0,Math.PI*2);g.fill();
    g.fillStyle='#ff1428';g.beginPath();g.arc(7,-3,2.35,0,Math.PI*2);g.fill();
    g.fillStyle='#ffc4b8';g.fillRect(6.3,-5.1,1.2,1.2);
    line([[8,-8],[8,-12],[9,-14]],'#d81628',.7,.8);
    line([[8,-1],[8,4],[7,6]],'#d81628',.7,.64);
    // Face plates and bolts.
    poly([[-16,-7],[-8,-10],[-4,-7],[-12,-3]],'#0e0d15');
    poly([[-17,0],[-11,-1],[-7,3],[-14,5]],'#25202c');
    g.fillStyle='#8f8998';g.beginPath();g.arc(-10.5,1.6,1.4,0,Math.PI*2);g.fill();g.fillStyle='#d7d5dd';g.beginPath();g.arc(-10.1,1.1,.45,0,Math.PI*2);g.fill();
    g.fillStyle='#8f8998';g.beginPath();g.arc(2.2,10.6,1.35,0,Math.PI*2);g.fill();g.fillStyle='#d7d5dd';g.beginPath();g.arc(1.8,10.2,.42,0,Math.PI*2);g.fill();
    // Mouth / teeth.
    poly([[-8,2],[9,1],[11,8],[-8,10]],'#08080e');
    poly([[-7,4],[8,3],[8,7],[-7,8]],'#dde0ea');
    for(let i=-5;i<8;i+=3){g.fillStyle='#6e6478';g.fillRect(i,4,1,4);}
    g.fillStyle='#a10c23';g.fillRect(-7.2,8.1,15.7,1.55);
    g.fillStyle='#cf192f';g.fillRect(-3,2.8,11,.8);
    // Two orange beak blocks.
    poly([[13.5,-8],[27,-10],[28,1],[14.5,2.7]],outline);
    poly([[15.5,-7],[25.5,-8],[26.5,-1],[16,0]],'#ff6f38');
    poly([[15.2,1.2],[27.2,1.2],[27.2,9.2],[15.2,10.2]],outline);
    poly([[16.5,2.2],[25.4,2.2],[25.4,7.4],[16.6,8.2]],'#ea532a');
    g.fillStyle='#ff9f6e';g.fillRect(17.4,-6,6.1,1.1);
    g.fillStyle='#ff7342';g.fillRect(18.1,3,6,1);
    // Small lower shard.
    poly([[-11,11+wy*.24],[-5,12+wy*.24],[-7,14.5+wy*.24],[-13,14.5+wy*.24]],'#251c30');
    g.restore();
  }

  function birdShapes(sk, wy) {
    if (sk.art === 'zxcgoul') { drawZxcGoul(wy); return; }
    if (sk.art === 'lorean') { drawLorean(wy); return; }
    const S = SPEC[sk.name];
    // tail feathers
    ctx.fillStyle = BROWN; ctx.fillRect(-16, -5, 7, 10);
    ctx.fillStyle = sk.wing; ctx.fillRect(-15, -4, 6, 2); ctx.fillRect(-15, -1, 6, 2); ctx.fillRect(-15, 2, 6, 2);
    // head crest
    ctx.fillStyle = BROWN; ctx.fillRect(-3, -12, 8, 4);
    ctx.fillStyle = sk.body; ctx.fillRect(-2, -11, 2, 3); ctx.fillRect(1, -12, 2, 4);
    if (S && S.pre) S.pre(wy);
    // body: outline, fill, highlight, belly, cheek
    ctx.fillStyle = BROWN; ctx.fillRect(-12, -8, 24, 16); ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = sk.body; ctx.fillRect(-10, -6, 20, 12); ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = sk.hi; ctx.fillRect(-8, -8, 16, 3);
    ctx.fillStyle = sk.belly; ctx.fillRect(-6, 3, 13, 4);
    ctx.fillStyle = '#ffb3c6'; ctx.fillRect(3, 1, 4, 3);
    // beak (two-tone)
    if (S && S.beak) S.beak(); else {
    ctx.fillStyle = BROWN; ctx.fillRect(9, -4, 10, 11);
    ctx.fillStyle = '#ff6b35'; ctx.fillRect(10, -3, 8, 4);
    ctx.fillStyle = '#d94a1e'; ctx.fillRect(10, 1, 7, 4);
    ctx.fillStyle = BROWN; ctx.fillRect(10, 1, 7, 1); }
    // wing with feather line
    ctx.fillStyle = BROWN; ctx.fillRect(-9, -3 + wy, 12, 8);
    ctx.fillStyle = sk.wing; ctx.fillRect(-8, -2 + wy, 10, 6);
    ctx.fillStyle = sk.body; ctx.fillRect(-8, -2 + wy, 10, 2);
    ctx.fillStyle = sk.wingD; ctx.fillRect(-8, 2 + wy, 10, 1);
    // eye
    ctx.fillStyle = BROWN; ctx.fillRect(2, -9, 8, 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(3, -8, 6, 6);
    ctx.fillStyle = '#000'; ctx.fillRect(6, -6, 3, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(7, -6, 1, 1);
    // Distinctive details for the five new premium birds; same collision geometry.
    if (S && S.post) { S.post(wy); } else if (sk.name === 'FROSTWING') {
      ctx.fillStyle='#eaffff';ctx.fillRect(-6,-14,4,5);ctx.fillRect(-2,-17,3,6);
      ctx.fillStyle='#b5f8ff';ctx.fillRect(-14,5,5,4);
    } else if (sk.name === 'GALAXY BIRD') {
      ctx.fillStyle='#f7d6ff';ctx.fillRect(-6,-4,2,2);ctx.fillRect(-3,2,2,2);ctx.fillRect(0,-7,2,2);
      ctx.fillStyle='#ffe8a1';ctx.fillRect(-13,-12,3,3);
    } else if (sk.name === 'FOREST SPIRIT') {
      ctx.fillStyle='#a7e977';ctx.fillRect(-5,-15,4,6);ctx.fillRect(-1,-13,5,4);
      ctx.fillStyle='#346b42';ctx.fillRect(-16,4,5,4);
    }
  }

  function birdIcon(sk, cx, cy, k) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    birdShapes(sk, 0);
    ctx.restore();
  }

  const ELITE_TRAIL_IDS = new Set(['INKFLOW','BUBBLE','SONIC','PHOENIX','LUNAR','OMEN']);
  const PREMIUM_TRAIL_IDS = new Set(['RIFT','ARCANE','CHRONO','ORIGAMI','MOTH','PRISM','GLITCH','CONSTELLATION',...ELITE_TRAIL_IDS]);
  const NEWTR = Object.fromEntries(['FROST','STARDUST','SHADOW','AURORA','HEART',...PREMIUM_TRAIL_IDS].map(id => [id, TRAILS.find(t => t.id === id).colors]));

  // All eight effects share one compact vector renderer in game, shop, avatar preview
  // and multiplayer. No external textures/shaders and no shadowBlur per particle.
  function premiumTrailMark(id,x,y,size,seed,opacity,time){
    const g=ctx;
    const unit=Math.max(.62,Math.min(1.35,size/4.1));
    const t=time*.075+seed*1.17;
    g.save();
    g.globalAlpha=Math.max(0,Math.min(1,opacity));
    g.translate(Math.round(x),Math.round(y));
    g.scale(unit,unit);
    const poly=(points,col)=>{g.fillStyle=col;g.beginPath();for(let i=0;i<points.length;i++){if(i)g.lineTo(points[i][0],points[i][1]);else g.moveTo(points[i][0],points[i][1]);}g.closePath();g.fill();};
    const disc=(xx,yy,r,col)=>{g.beginPath();g.arc(xx,yy,r,0,Math.PI*2);g.fillStyle=col;g.fill();};
    const ring=(r,col,w=1,a=0,b=Math.PI*2)=>{g.beginPath();g.arc(0,0,r,a,b);g.strokeStyle=col;g.lineWidth=w;g.stroke();};
    if(id==='RIFT'){
      g.rotate(t*.52);
      disc(0,0,6.3,'rgba(122,74,244,.19)');disc(0,0,3.2,'#1a1236');
      ring(5.9,'#8960fe',1.6,.15,2.36);ring(5.9,'#64f9df',1.6,3.04,5.71);
      poly([[-7,-2],[-10,-4],[-7,2],[-5,1]],'#c6b0ff');
      poly([[4,-7],[7,-9],[8,-4],[5,-3]],'#79ffe8');
      poly([[4,5],[8,6],[5,9],[3,7]],'#916bff');
      disc(0,0,1.25,'#d9fff7');
    }else if(id==='ARCANE'){
      g.rotate(-t*.26);
      disc(0,0,6.5,'rgba(170,125,255,.15)');ring(6,'#c5a0ff',.7);ring(4.6,'#efc97f',1.1);
      for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4;disc(Math.cos(a)*6,Math.sin(a)*6,.75,'#fff0bb');}
      g.strokeStyle='#fff1c6';g.lineWidth=1;g.beginPath();g.moveTo(-2.9,-2);g.lineTo(0,-4);g.lineTo(2.8,-2);g.moveTo(0,-4);g.lineTo(0,3.8);g.moveTo(-2.9,1.1);g.lineTo(2.9,1.1);g.moveTo(-2.6,3.5);g.lineTo(2.6,3.5);g.stroke();
      disc(0,1.1,.85,'#b988ff');
    }else if(id==='CHRONO'){
      g.rotate(t*.28);
      for(let j=0;j<8;j++){const a=j*Math.PI/4;g.fillStyle='#b88a42';g.fillRect(Math.cos(a)*6.4-1.2,Math.sin(a)*6.4-1.2,2.4,2.4);}
      disc(0,0,5.5,'#6b5372');disc(0,0,4.5,'#e7bd74');disc(0,0,3.7,'#2e2945');
      for(let j=0;j<4;j++){const a=j*Math.PI/2;disc(Math.cos(a)*3.1,Math.sin(a)*3.1,.62,'#a0f2f5');}
      g.strokeStyle='#faf3cc';g.lineWidth=1.05;g.beginPath();g.moveTo(0,0);g.lineTo(0,-2.8);g.moveTo(0,0);g.lineTo(2.3,.85);g.stroke();
      disc(0,0,.95,'#8df4ff');
    }else if(id==='ORIGAMI'){
      g.rotate(Math.sin(t*.8)*.27);
      const flap=.76+.24*Math.sin(t*1.8);
      disc(0,0,6,'rgba(145,197,255,.13)');
      poly([[-1,0],[-7,-5*flap],[-4,2],[0,4]],'#f9f4ec');
      poly([[-1,0],[6,-6*flap],[5,2],[0,4]],'#bde7ff');
      poly([[-7,-5*flap],[-2,-1],[0,4]],'#ffcbdb');
      poly([[0,4],[5,2],[8,4],[3,3]],'#8abde9');
      poly([[1,-2],[5,-4],[4,0]],'#ffffff');
      g.strokeStyle='#8db1cf';g.lineWidth=.65;g.beginPath();g.moveTo(-6,-4*flap);g.lineTo(0,4);g.lineTo(6,-5*flap);g.stroke();
    }else if(id==='MOTH'){
      const flap=.78+.2*Math.cos(t*1.9);
      disc(0,0,7,'rgba(126,255,211,.17)');
      poly([[-1,-1],[-6*flap,-5],[-7*flap,0],[-3,3]],'#ab8bff');
      poly([[1,-1],[6*flap,-5],[7*flap,0],[3,3]],'#8affdf');
      poly([[-2,1],[-5*flap,5],[-1,4]],'#e7caff');
      poly([[2,1],[5*flap,5],[1,4]],'#c4fff1');
      disc(-3.7*flap,-.7,1.15,'#f3e6ff');disc(3.7*flap,-.7,1.15,'#fff8e3');
      g.strokeStyle='#eaffef';g.lineWidth=.7;g.beginPath();g.moveTo(-.3,-2);g.lineTo(-2,-5);g.moveTo(.3,-2);g.lineTo(2,-5);g.stroke();
      disc(0,1,1.5,'#eaffc8');
    }else if(id==='PRISM'){
      g.rotate(t*.46);
      disc(0,0,7,'rgba(114,234,255,.17)');
      poly([[0,-7],[5,0],[0,7],[-5,0]],'#93e8ff');
      poly([[0,-7],[5,0],[0,0]],'#fff1bd');
      poly([[5,0],[0,7],[0,0]],'#ff8cd2');
      poly([[0,7],[-5,0],[0,0]],'#765cff');
      poly([[-5,0],[0,-7],[0,0]],'#7bf2d5');
      g.strokeStyle='#ffffff';g.lineWidth=.8;g.beginPath();g.moveTo(0,-7);g.lineTo(5,0);g.lineTo(0,7);g.lineTo(-5,0);g.closePath();g.stroke();
      g.fillStyle='#7ff9ff';g.fillRect(5,-4,4,1);g.fillStyle='#ff77ca';g.fillRect(5,-2,3,1);g.fillStyle='#ffe795';g.fillRect(5,0,2,1);
    }else if(id==='GLITCH'){
      const jitter=((time>>2)+seed)%3-1;
      g.fillStyle='rgba(66,241,255,.18)';g.fillRect(-7,-5,14,10);
      g.fillStyle='#fd4db1';g.fillRect(-6+jitter,-4,8,2);g.fillRect(3-jitter,1,4,2);
      g.fillStyle='#4efff4';g.fillRect(-4-jitter,-3,8,3);g.fillRect(-7+jitter,3,8,1);
      g.fillStyle='#1a244f';g.fillRect(-2,-2,7,2);
      g.fillStyle='#f4faff';g.fillRect(-3,-2,5,1);g.fillRect(2,3,2,1);
      if((seed+Math.floor(time/5))%4===0){g.fillStyle='#ff4ca8';g.fillRect(6,-7,1,4);g.fillStyle='#48e8ff';g.fillRect(-7,4,5,1);}
    }else if(id==='INKFLOW'){
      // A directional sumi-e brushstroke, not a recolored square particle.
      g.rotate(Math.sin(t*.57)*.42);
      poly([[-8,-1],[-4,-4],[2,-3],[7,-1],[3,1],[-3,2],[-8,3]],'#131a26');
      g.strokeStyle='#8292a4';g.lineWidth=.85;g.beginPath();g.moveTo(-7,0);g.bezierCurveTo(-3,-4,2,-2,6,-1);g.stroke();
      g.strokeStyle='#c3d2dd';g.lineWidth=.5;g.beginPath();g.moveTo(-5,-1);g.quadraticCurveTo(0,-3,4,-1);g.stroke();
      disc(-7,-4,.9,'#718091');disc(5,3,.6,'#dce9f1');
      if(seed%3===0)disc(-3,5,1.2,'#354152');
    }else if(id==='BUBBLE'){
      // Iridescent thin-film bubbles, drifting upward and swelling before they pop.
      const rad=5.2+Math.sin(t*.6)*.45;
      disc(0,0,rad,'rgba(149,220,255,.09)');
      g.strokeStyle='#9ae9ff';g.lineWidth=1;g.beginPath();g.arc(0,0,rad,0,Math.PI*2);g.stroke();
      g.strokeStyle='#efb5ff';g.lineWidth=1.35;g.beginPath();g.arc(0,0,rad,-.22,1.7);g.stroke();
      g.strokeStyle='#bbfff9';g.lineWidth=.8;g.beginPath();g.arc(0,0,rad,2.55,4.55);g.stroke();
      disc(-2.2,-2,1.18,'#e9ffff');disc(2.6,2.7,.56,'#ffd2f6');
      if(seed%4===0){g.strokeStyle='rgba(222,249,255,.72)';g.lineWidth=.65;g.beginPath();g.arc(0,0,rad+2.7,.4,2.9);g.stroke();}
    }else if(id==='SONIC'){
      // Ring + 8 radial wave bars; each flap emits its own larger, faster pulse.
      const r=4.8+Math.sin(t*.9)*.7;
      disc(0,0,6.7,'rgba(45,211,255,.10)');
      ring(r,'#52eaff',1.25,-.35,2.8);ring(r,'#b6b0ff',1.15,3.1,5.95);
      for(let j=0;j<8;j++){
        const a=j*Math.PI/4+t*.05,inner=6.3,outer=inner+1.3+(j%3)*1.1;
        g.strokeStyle=j%2?'#9a9aff':'#92faff';g.lineWidth=.75;
        g.beginPath();g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);g.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);g.stroke();
      }
      disc(0,0,1.25,'#ecfeff');
    }else if(id==='PHOENIX'){
      // Two-tone curved feathers with a quill, barbs and a soft ember, separate from Fire.
      g.rotate(-.45+Math.sin(t*.6)*.38);
      disc(0,1,6.8,'rgba(255,143,52,.12)');
      g.fillStyle='#d44c30';g.beginPath();g.moveTo(-5,6);g.bezierCurveTo(-8,-4,-1,-9,5,-8);g.bezierCurveTo(8,-2,4,4,-5,6);g.fill();
      g.fillStyle='#ffc05e';g.beginPath();g.moveTo(-5,6);g.bezierCurveTo(-3,-4,1,-8,5,-8);g.bezierCurveTo(6,-1,1,3,-5,6);g.fill();
      g.strokeStyle='#fff0af';g.lineWidth=.9;g.beginPath();g.moveTo(-6,7);g.quadraticCurveTo(.5,-2,5,-8);g.stroke();
      g.strokeStyle='#8d2e32';g.lineWidth=.55;g.beginPath();g.moveTo(-3,1);g.lineTo(2,1);g.moveTo(-1,-2);g.lineTo(4,-3);g.moveTo(-4,4);g.lineTo(-1,4);g.stroke();
      disc(7,-7,.9,'#ffe698');
    }else if(id==='LUNAR'){
      // True phase silhouettes: crescent -> quarter -> gibbous -> full -> waning.
      const phase=((seed%8)+8)%8/8, waxing=phase<=.5;
      disc(0,0,6.3,'rgba(165,193,252,.16)');
      g.save();if(!waxing)g.scale(-1,1);
      disc(0,0,4.9,'#18233f');
      if(phase!==0){
        const q=waxing?phase:1-phase, terminator=Math.cos(q*2*Math.PI)*4.9;
        g.fillStyle='#e1eaff';g.beginPath();g.moveTo(0,-4.9);
        g.arc(0,0,4.9,-Math.PI/2,Math.PI/2,false);
        g.bezierCurveTo(terminator*1.35,4.9,terminator*1.35,-4.9,0,-4.9);g.closePath();g.fill();
      }
      g.restore();
      g.strokeStyle='rgba(139,169,243,.78)';g.lineWidth=.75;g.beginPath();g.arc(0,0,5.8,.35,2.55);g.stroke();
      if(seed%3===0)disc(7,-5,.75,'#eff7ff');
    }else if(id==='OMEN'){
      // Obsidian smoke with red cracks, a sinister red glint and floating cinders.
      g.rotate(Math.sin(t*.42)*.24);
      disc(0,0,7.3,'rgba(218,27,48,.13)');
      poly([[-8,5],[-6,1],[-7,-4],[-2,-7],[0,-5],[3,-8],[7,-4],[5,0],[8,4],[3,6],[-1,4],[-5,7]],'#0d101a');
      poly([[-5,5],[-2,-1],[0,-3],[2,-1],[5,-5],[4,1],[7,3],[1,4]],'#29303c');
      g.strokeStyle='#a4192a';g.lineWidth=1.25;g.beginPath();g.moveTo(-7,3);g.lineTo(-3,0);g.lineTo(-1,3);g.lineTo(2,-3);g.lineTo(6,-5);g.stroke();
      g.strokeStyle='#f43c52';g.lineWidth=.8;g.beginPath();g.moveTo(-3,-3);g.lineTo(-1,-5);g.lineTo(0,-3);g.moveTo(3,1);g.lineTo(5,3);g.stroke();
      disc(2,-1,1.2,'#ff5d64');disc(-6,5,.7,'#ff7380');
      if(seed%3===0)disc(7,-7,.9,'#dc243b');
    }else if(id==='CONSTELLATION'){
      g.rotate(Math.sin(t*.22)*.25);
      g.strokeStyle='#9ba7fa';g.lineWidth=.8;g.beginPath();g.moveTo(-5,3);g.lineTo(-2,-3);g.lineTo(4,-5);g.lineTo(6,2);g.lineTo(-2,-3);g.stroke();
      disc(-5,3,1.2,'#74e6f8');disc(-2,-3,1.35,'#fff4cb');disc(4,-5,1.1,'#c4c0ff');disc(6,2,.95,'#fff4cb');
      g.strokeStyle='#fff8d9';g.lineWidth=.65;g.beginPath();g.moveTo(-2,-6);g.lineTo(-2,0);g.moveTo(-5,-3);g.lineTo(1,-3);g.stroke();
      disc(-2,-3,.9,'#fff');
    }
    g.restore();
  }

  // The constellation is one connected pattern, not independent stars.
  function constellationLinks(particles){
    if(!particles.length)return;
    ctx.save();ctx.strokeStyle='#9cb8ff';ctx.lineWidth=.9;
    let last=null;
    for(const p of particles){
      if(p.k!=='CONSTELLATION'||p.life<=0)continue;
      if(last){const dx=p.x-last.x,dy=p.y-last.y;
        if(dx*dx+dy*dy<34*34){ctx.globalAlpha=Math.min(.42,p.life/p.max,last.life/last.max)*Math.min(p.opacity??1,last.opacity??1);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
      }
      last=p;
    }
    ctx.restore();
  }
  function advanceTrailParticle(p,dt){
    if(p.k==='SHADOW'){p.size+=.1*dt;p.vx*=Math.pow(.97,dt)}
    else if(p.k==='FROST')p.vy+=.012*dt;
    else if(p.k==='HEART')p.vy-=.012*dt;
    else if(p.k==='STARDUST')p.vx*=Math.pow(.98,dt);
    else if(p.k==='RIFT'){p.vy+=Math.sin((p.max-p.life)*.25+p.i)*.028*dt;p.vx*=Math.pow(.992,dt);}
    else if(p.k==='ARCANE'){p.vy-=.024*dt;p.vx*=Math.pow(.989,dt);}
    else if(p.k==='CHRONO'){p.vx*=Math.pow(.991,dt);p.vy*=Math.pow(.991,dt);}
    else if(p.k==='ORIGAMI'){p.y+=Math.sin((p.max-p.life)*.34+p.i)*.27*dt;p.vy+=.007*dt;}
    else if(p.k==='MOTH'){p.vy-=.023*dt;p.y+=Math.sin((p.max-p.life)*.31+p.i)*.22*dt;}
    else if(p.k==='PRISM'){p.vx*=Math.pow(.986,dt);}
    else if(p.k==='GLITCH'){p.vy*=Math.pow(.97,dt);}
    else if(p.k==='CONSTELLATION'){p.vx*=Math.pow(.995,dt);p.vy*=Math.pow(.995,dt);}
    else if(p.k==='INKFLOW'){p.vx*=Math.pow(.955,dt);p.vy+=Math.sin((p.max-p.life)*.15+p.i)*.012*dt;}
    else if(p.k==='BUBBLE'){p.vy-=.033*dt;p.vx*=Math.pow(.991,dt);p.size=Math.min(6.5,p.size+.026*dt);}
    else if(p.k==='SONIC'){p.vx*=Math.pow(.97,dt);p.size=Math.min(7,p.size+.04*dt);}
    else if(p.k==='PHOENIX'){p.vy-=.024*dt;p.y+=Math.sin((p.max-p.life)*.22+p.i)*.13*dt;}
    else if(p.k==='LUNAR'){p.vx*=Math.pow(.994,dt);p.vy*=Math.pow(.994,dt);}
    else if(p.k==='OMEN'){p.vx*=Math.pow(.985,dt);p.vy-=.015*dt;p.size=Math.min(6.8,p.size+.036*dt);}
  }

  function trailMark(id,x,y,s,i,a,now){   // one cheap pixel renderer for live particles and for shop previews
    if(PREMIUM_TRAIL_IDS.has(id)){premiumTrailMark(id,x,y,s,i,a,now);return;}
    const cl=NEWTR[id];x=Math.floor(x);y=Math.floor(y);ctx.globalAlpha=a;
    if(id==='HEART'){const u=s>5.5?3:s>3?2:1;ctx.fillStyle=cl[i%3];
      ctx.fillRect(x+u,y,u,u);ctx.fillRect(x+3*u,y,u,u);ctx.fillRect(x,y+u,5*u,u);ctx.fillRect(x+u,y+2*u,3*u,u);ctx.fillRect(x+2*u,y+3*u,u,u);
      ctx.fillStyle='#fff';ctx.fillRect(x+u,y+u,u,u);
    }else if(id==='FROST'){const k=Math.max(1,Math.round(s/3));
      ctx.globalAlpha=a*.28;ctx.fillStyle=cl[2];ctx.fillRect(x-2,y-2,3*k+4,3*k+4);
      ctx.globalAlpha=a;ctx.fillStyle=cl[i%2];ctx.fillRect(x+k,y,k,3*k);ctx.fillRect(x,y+k,3*k,k);
      if(i%3===0){ctx.fillStyle='#fff';ctx.fillRect(x+k,y+k,k,k);}
    }else if(id==='STARDUST'){
      const tw=.65+.35*Math.sin(now*.08+i*1.7),radius=Math.max(2,Math.min(5,s*1.35));
      ctx.globalAlpha=a*tw;ctx.fillStyle=cl[i%4];ctx.beginPath();
      for(let j=0;j<10;j++){const angle=-Math.PI/2+j*Math.PI/5,r=j%2?radius*.43:radius,px=Math.round(x+Math.cos(angle)*r),py=Math.round(y+Math.sin(angle)*r);if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
      ctx.closePath();ctx.fill();
    }else if(id==='SHADOW'){const q=Math.max(2,Math.round(s*1.6));
      ctx.globalAlpha=a*.5;ctx.fillStyle=cl[i%3];ctx.fillRect(x-(q>>1),y-(q>>1),q,q);
      ctx.globalAlpha=a*.17;ctx.fillStyle='#9a6ae8';ctx.fillRect(x-q,y-q,q*2,q*2);
    }else{const hgt=Math.max(3,Math.round(s*2.6));   // AURORA: drifting colour ribbons
      const col=cl[((i>>1)+(now>>3))%4];
      ctx.globalAlpha=a*.2;ctx.fillStyle=col;ctx.fillRect(x-2,y-(hgt>>1)-2,s+4,hgt+4);
      ctx.globalAlpha=a*.6;ctx.fillRect(x,y-(hgt>>1),Math.max(2,Math.round(s)),hgt);
    }
    ctx.globalAlpha=1;
  }
  function drawPreviewTrail(id,cx,cy,phase,scale=1){
    const t=TRAILS.find(t=>t.id===id);
    if(!t||id==='NONE')return;
    for(let i=0;i<18;i++){
      const px=cx-scale*(10+i*5.6);
      const py=cy+Math.sin(phase-i*.55)*scale*3.8+i*.18;
      const s=Math.max(2,scale*(4.6-i*.16));
      if(NEWTR[id]){trailMark(id,px,py,s*1.4,i,Math.max(.15,.82-i*.037),uiMotionTime());continue;}
      ctx.globalAlpha=Math.max(.15,.82-i*.037);
      ctx.fillStyle=t.colors[i%t.colors.length];
      ctx.fillRect(px,py,s,s);
    }
    ctx.globalAlpha=1;
  }

  function animatedBirdIcon(sk,cx,cy,k,o={}){
    const phase=ticks*.12+(o.phase||0);
    const bob=(o.bob||1)*Math.sin(phase)*Math.max(1.4,k*2.2);
    const drift=(o.drift||0)*Math.sin(phase*.55);
    const rot=(o.rotBase??-.12)+Math.sin(phase*.7)*(.07+(o.rotAmp||0));
    const wing=Math.round(Math.sin(phase*1.8)*3);
    const bx=cx+drift,by=cy+bob;
    if(o.trailId&&o.trailId!=='NONE')drawPreviewTrail(o.trailId,bx-k*10,by+k*2,phase,k);
    ctx.save();
    ctx.translate(bx,by);
    ctx.rotate(rot);
    ctx.scale(k,k);
    birdShapes(sk, wing);
    ctx.restore();
  }

  function drawPreviewPipePair(pal,x,y,w,h,center,gap,pipeX,pipeW=22){
    const floor=y+h-10;
    const top=center-gap/2,bot=center+gap/2;
    const cap=Math.max(4,Math.min(9,pipeW*.28));
    const segment=(px,py,ph,capAtBottom)=>{
      if(ph<=0)return;
      ctx.fillStyle=pal.main;ctx.fillRect(px,py,pipeW,ph);
      ctx.fillStyle=pal.light;ctx.fillRect(px+2,py,Math.max(3,pipeW*.16),ph);
      ctx.fillStyle=pal.dark;ctx.fillRect(px+pipeW-5,py,5,ph);
      ctx.fillStyle=INK;ctx.fillRect(px,py,2,ph);ctx.fillRect(px+pipeW-2,py,2,ph);
      const cy=capAtBottom?py+ph-cap:py;
      ctx.fillStyle=pal.main;ctx.fillRect(px-3,cy,pipeW+6,cap);
      ctx.fillStyle=pal.light;ctx.fillRect(px-1,cy+1,pipeW+2,2);
      ctx.fillStyle=INK;ctx.fillRect(px-3,cy,pipeW+6,2);
    };
    segment(pipeX,y,Math.max(cap,top-y),true);
    segment(pipeX,bot,Math.max(cap,floor-bot),false);
  }

  function drawBirdPreviewScene(sk,x,y,w,h,trailId='NONE'){
    trailId=sk.bundleTrail||trailId;
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#22376f');g.addColorStop(.6,'#4c73b3');g.addColorStop(1,'#8cc9ff');
    ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    const floor=y+h-11;
    for(let i=0;i<3;i++){
      const cx=x+w*(.18+i*.34); // Static scenery; only the bird animates.
      ctx.fillStyle='rgba(255,255,255,.24)';ctx.fillRect(cx,floor-34-i*8,30+i*10,10);
      ctx.fillRect(cx+8,floor-42-i*8,18+i*6,8);
    }
    ctx.fillStyle='#43639b';
    for(let i=0;i<Math.ceil(w/18)+1;i++){
      const hx=x+i*18;
      const hh=16+(i%3)*6;
      ctx.fillRect(hx,floor-hh,14,hh);
      if(i%2===0){ctx.fillStyle='rgba(255,237,153,.6)';ctx.fillRect(hx+4,floor-hh+4,2,3);ctx.fillStyle='#43639b';}
    }
    ctx.fillStyle='#8ddc66';ctx.fillRect(x,floor,w,11);
    ctx.fillStyle='#54b247';ctx.fillRect(x,floor+4,w,7);
    ctx.fillStyle=INK;ctx.fillRect(x,floor-2,w,2);
    const pal=MAPS[cfg.map]?.pipes?.[0]||GREEN;
    const center=y+h*.48;
    const big=h>90,gap=Math.max(40,Math.min(big?96:72,h*(big?.62:.42)));
    const pipeX=x+w*.73;
    drawPreviewPipePair(pal,x,y,w,h,center,gap,pipeX,Math.max(18,Math.min(28,w*.09)));
    const birdX=x+w*.34+Math.sin(ticks*.08)*Math.min(10,w*.03);
    const birdY=center+Math.cos(ticks*.1)*Math.min(6,h*.035);
    animatedBirdIcon(sk,birdX,birdY,(big?Math.min(2.3,Math.max(1.55,h/58)):Math.min(1.55,Math.max(.9,h/48))),{trailId,drift:3,phase:w*.01});
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = BROWN; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 3; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  }

  function rank() {
    return score >= 50 ? 'LEGEND' : score >= 30 ? 'MASTER' : score >= 15 ? 'PRO' : score >= 5 ? 'ROOKIE' : '-';
  }

  // ---------- Map art ----------
  function skyGrad(c) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, c[0]); g.addColorStop(0.6, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const PREMIUM_COLORS={
    SAKURA:['#5e91d8','#f9b5d8','#9c6eb4','#f4a3c5','#6aab7e'],
    NEON:['#0c163d','#56317e','#28356a','#8a3bd0','#22c9d5'],
    OCEAN:['#05456d','#2bafc5','#0a779b','#43c7b0','#ffc6ad'],
    VOLCANO_PLUS:['#1d091c','#e05b25','#4c1c2b','#9e3529','#ffb135'],
    COSMIC:['#080d2e','#5a3c99','#252258','#6942aa','#e0a8ff'],
    FOREST:['#0b1f2e','#2f6b52','#14382f','#2b5a2a','#7bd35a'],
    CRYSTAL:['#0a0a2e','#2a4f9a','#1a2760','#2a2368','#58e6e0'],
    DESERT:['#6a2c5e','#ffb25a','#9a4a3a','#d9a24a','#ffd98a'],
    CELESTIAL:['#456dba','#c5bcf5','#7599ba','#695b9b','#fff1bb'],
    CYBERPUNK:['#060c27','#43266e','#1a2856','#0e244c','#59dfee'],
    MYSTIC:['#071d2c','#285765','#123941','#183d3f','#a3ffce'],
    SHATTERED:['#090b24','#514079','#272b55','#302642','#e0a5ff'],
    TEMPEST:['#06172e','#36567d','#1d3654','#203b56','#a4dfff'],
    ECLIPSE_REALM:['#080917','#46243c','#241c31','#2e1d30','#ffb266'],
    PRISM:['#121c4f','#638bd4','#34487c','#365f97','#bafaff'],
    CLOCKWORK:['#211b2d','#8a654f','#4c3942','#60452e','#e6b977'],
    AURORA:['#071a39','#33698c','#21466b','#264b6c','#a7ffea'],
    NECROPOLIS:['#07060d','#3f0f1f','#1d0c12','#2a0f16','#ff6d7f']
  };
  const RICH = { FOREST: 1, CRYSTAL: 1, DESERT: 1, CELESTIAL: 1, CYBERPUNK: 1, MYSTIC: 1, SHATTERED: 1, TEMPEST: 1, ECLIPSE_REALM: 1, PRISM: 1, CLOCKWORK: 1, AURORA: 1 };
  const ELITE_MAPS = new Set(['CELESTIAL','CYBERPUNK','MYSTIC','SHATTERED']);
  const MYTHIC_MAPS = new Set(['TEMPEST','ECLIPSE_REALM','PRISM','CLOCKWORK','AURORA','NECROPOLIS']);
  const wr = (v, m) => ((v % m) + m) % m;
  function depthLayer(c,x,w,fl,h,far){   // soft far silhouette that gives premium maps one extra depth plane
    const k=Math.max(.45,Math.min(1,h/150));ctx.globalAlpha=.5;ctx.fillStyle=c[2];
    for(let i=0;i<w;i+=6){const m=i+far,hh=(22+10*Math.sin(m*.035)+7*Math.sin(m*.1+1))*k;ctx.fillRect(x+i,fl-hh,6,hh);}
    ctx.globalAlpha=1;
  }
  // Premium world renderer. Background-only Canvas art: safe in shop thumbnails and
  // synchronized multiplayer; no textures, random draws, timers, or simulation state.
  function eliteArt(key,x,y,w,h,staticCard=false){
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const c=PREMIUM_COLORS[key], grad=ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0,c[0]);grad.addColorStop(.57,c[1]);grad.addColorStop(1,c[2]);
    ctx.fillStyle=grad;ctx.fillRect(x,y,w,h);
    const reduced=staticCard||cfg.fx||particleReducedMotion.matches;
    const t=reduced?0:ticks, shift=staticCard?0:bgX, floor=y+h-12;
    const scale=Math.min(1.32,Math.max(.42,h/220)), k=scale;
    const r=(color,rx,ry,rw,rh)=>{if(rw<=0||rh<=0)return;ctx.fillStyle=color;ctx.fillRect(Math.round(rx),Math.round(ry),Math.ceil(rw),Math.ceil(rh));};
    const poly=(color,pts)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let j=2;j<pts.length;j+=2)ctx.lineTo(pts[j],pts[j+1]);ctx.closePath();ctx.fill();};
    const circ=(color,cx,cy,radius)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx,cy,Math.max(1,radius),0,Math.PI*2);ctx.fill();};
    const line=(color,ax,ay,bx,by,lw=1)=>{ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();};
    const tile=(step,speed,fn)=>{const off=shift*speed,start=Math.floor(off/step)-1;for(let i=start;i<=start+Math.ceil(w/step)+2;i++)fn(x+i*step-off,i);};
    const star=(sx,sy,color,size=2)=>{r(color,sx-size*2,sy,size*5,1);r(color,sx,sy-size*2,1,size*5);};
    if(key==='CELESTIAL'){
      // Marble sky-palaces and bottom-tapered islands, with cascading waterfalls.
      const sx=x+w*.74,sy=y+h*.25;
      circ('rgba(255,244,203,.14)',sx,sy,46*k);circ('rgba(255,241,213,.18)',sx,sy,34*k);circ('#fff1c5',sx,sy,21*k);
      for(let i=0;i<6;i++){let a=i*Math.PI/3;line('rgba(255,247,209,.42)',sx+Math.cos(a)*28*k,sy+Math.sin(a)*28*k,sx+Math.cos(a)*39*k,sy+Math.sin(a)*39*k,2*k);}
      tile(208,.09,(px,i)=>{const top=floor-(77+(i%3)*12)*k,iw=108*k;
        poly('#817caf',[px,top,px+iw,top,px+iw*.79,top+45*k,px+iw*.46,top+69*k,px+iw*.21,top+43*k]);
        r('#a9c4cf',px-5*k,top-5*k,iw+10*k,8*k);
        poly('#e1def2',[px+22*k,top-5*k,px+42*k,top-24*k,px+62*k,top-5*k]);
        r('#eee8e2',px+35*k,top-24*k,31*k,19*k);r('#867aa8',px+38*k,top-21*k,25*k,13*k);
        r('#fff0c1',px+38*k,top-24*k,25*k,3*k);r('#f2cb84',px+46*k,top-16*k,8*k,11*k);
        // Water appears to vanish into the clouds, without crossing the flight gap.
        r('rgba(138,236,255,.25)',px+iw*.7,top+2*k,9*k,Math.min(h*.44,65*k));
        r('#c7faff',px+iw*.72,top+4*k,3*k,Math.min(h*.42,60*k));
      });
      tile(126,.24,(px,i)=>{const yy=floor-(31+i%3*7)*k;
        poly('#5f789a',[px,yy+8*k,px+20*k,yy,px+55*k,yy+3*k,px+67*k,yy+16*k,px+38*k,yy+37*k]);
        r('#b4dbcd',px+9*k,yy-1*k,48*k,4*k);
        r('#f7e9bd',px+29*k,yy-18*k,6*k,18*k);
        poly('#e4c991',[px+22*k,yy-18*k,px+32*k,yy-27*k,px+43*k,yy-18*k]);
      });
      for(let i=0;i<8;i++){const px=x+((i*113)%(Math.max(1,w))),py=y+16+(i*31)%Math.max(22,h*.49);star(px,py,'rgba(255,255,236,.68)',i%3?1:2);}
    }else if(key==='CYBERPUNK'){
      // Dense elevated high-rise tiers, transit lanes, luminous display panels and rain.
      const scanY=y+h*.22;
      r('rgba(252,87,199,.15)',x,scanY,w,5*k);
      tile(102,.10,(px,i)=>{const hh=(100+(i*37%53))*k,bw=80*k,base=floor;
        r('#101c42',px,base-hh,bw,hh);
        r('#344575',px+5*k,base-hh-4*k,bw-10*k,5*k);
        r('#6a3e86',px+15*k,base-hh-16*k,3*k,12*k);r('#e785c9',px+12*k,base-hh-18*k,9*k,2*k);
        for(let row=0;row<7;row++)for(let col=0;col<4;col++){
          if((row+col+i)%4===0)continue;
          r((row+col)%3?'#3d638d':'#a96bb7',px+(10+col*16)*k,base-hh+(15+row*17)*k,5*k,8*k);
        }
      });
      tile(170,.28,(px,i)=>{const hh=(65+i%3*15)*k;
        r('#10234d',px+14*k,floor-hh,110*k,hh);
        r('#0a1835',px+19*k,floor-hh+5*k,100*k,hh-5*k);
        r(i%2?'#ff4fae':'#32e0f4',px+24*k,floor-hh+12*k,57*k,34*k);
        r('#151a3a',px+28*k,floor-hh+16*k,49*k,26*k);
        for(let j=0;j<3;j++)r(i%2?'#ff8dc9':'#90fff8',px+(32+j*14)*k,floor-hh+22*k,9*k,2*k);
        r(i%2?'#ff68c4':'#42edff',px+15*k,floor-hh+5*k,110*k,3*k);
        r('#263655',px+100*k,floor-hh-8*k,3*k,8*k);
      });
      const rail=floor-21*k;r('#142b56',x,rail,w,8*k);r('#66e7ed',x,rail,w,2*k);
      for(let i=0;i<w/34+2;i++)r('#365e87',x+i*34-(shift*.55%34),rail+8*k,5*k,13*k);
      if(!staticCard)r('rgba(102,246,241,.05)',x,y+h*.58,w,16*k);
    }else if(key==='MYSTIC'){
      // Ancient luminous trees and broad mushroom canopies, distinct from FOREST.
      circ('rgba(172,255,221,.07)',x+w*.28,y+h*.29,57*k);
      circ('rgba(205,243,214,.20)',x+w*.28,y+h*.29,26*k);
      circ('#c8e9da',x+w*.28,y+h*.29,15*k);
      tile(166,.10,(px,i)=>{const hh=(127+i%3*30)*k;
        r('#123c44',px+55*k,floor-hh,23*k,hh);
        r('#1b565a',px+59*k,floor-hh,6*k,hh);
        for(let b=0;b<3;b++){const ey=floor-hh+(14+b*22)*k;
          line('#20605e',px+65*k,ey,px+(11+b*9)*k,ey-30*k,5*k);
          line('#245859',px+72*k,ey+5*k,px+(123-b*8)*k,ey-26*k,4*k);
        }
        for(let f=0;f<5;f++)circ(f%2?'#1c6462':'#35776f',px+(25+f*19)*k,floor-hh+(f%3-2)*23*k,18*k);
      });
      tile(106,.30,(px,i)=>{const cap=floor-(23+i%3*8)*k,mc=i%2?'#94e9e0':'#d5a6ef';
        r('#b8c9cc',px+34*k,cap,8*k,floor-cap);
        r('#e7e1d6',px+38*k,cap,2*k,floor-cap);
        circ('rgba(164,255,233,.09)',px+38*k,cap,28*k);
        poly(mc,[px+11*k,cap+2*k,px+21*k,cap-16*k,px+35*k,cap-20*k,px+53*k,cap-14*k,px+66*k,cap+2*k]);
        r('#f3f9ed',px+28*k,cap-14*k,4*k,3*k);r('#fff4e8',px+49*k,cap-8*k,3*k,2*k);
        for(let j=0;j<3;j++)r('#cfffea',px+(26+j*12)*k,cap+1*k,3*k,3*k);
      });
      tile(140,.17,(px,i)=>{const yy=floor-49*k;
        poly('#244a5a',[px+10*k,yy+24*k,px+13*k,yy+3*k,px+28*k,yy-3*k,px+39*k,yy+15*k,px+43*k,yy+27*k]);
        star(px+25*k,yy+11*k,'#9bffe2',2*k);
      });
    }else if(key==='SHATTERED'){
      // Cracked planetary crescent, violet energy faults and drifting wreckage.
      const mx=x+w*.70,my=y+h*.27,mr=Math.min(58*k,w*.18,h*.23);
      circ('rgba(222,173,255,.08)',mx,my,mr*1.6);
      circ('#a08db9',mx,my,mr);
      circ('#746d9e',mx-mr*.16,my+mr*.04,mr*.82);
      for(let i=0;i<4;i++){
        line('#dec3ff',mx-mr*.65+i*mr*.24,my-mr*.64+i*mr*.17,mx-mr*.22+i*mr*.27,my+mr*.23,Math.max(1,2*k));
        line('#382f76',mx-mr*.22+i*mr*.27,my+mr*.23,mx+mr*.2+i*mr*.12,my+mr*.64,Math.max(1,3*k));
      }
      poly('#5b447b',[mx-mr*.65,my-mr*.35,mx-mr*.86,my-mr*.79,mx-mr*.55,my-mr*.86]);
      poly('#d7b1ef',[mx+mr*.22,my-mr*.91,mx+mr*.60,my-mr*.78,mx+mr*.39,my-mr*.43]);
      tile(230,.13,(px,i)=>{const off=(i%3)*20*k,yy=y+h*.38+off;
        poly('#55517e',[px+40*k,yy,px+72*k,yy-13*k,px+96*k,yy+2*k,px+83*k,yy+29*k,px+55*k,yy+24*k]);
        poly('#9284b6',[px+40*k,yy,px+72*k,yy-13*k,px+64*k,yy+8*k]);
        r('#d4b6f4',px+66*k,yy+8*k,14*k,2*k);
      });
      tile(94,.33,(px,i)=>{const hh=(40+i%4*16)*k;
        poly('#202543',[px,floor,px+15*k,floor-hh*.77,px+36*k,floor-hh,px+57*k,floor-hh*.46,px+71*k,floor]);
        line(i%2?'#bc7efa':'#edacb6',px+36*k,floor-hh+3*k,px+25*k,floor-7*k,2*k);
        r('#7c6da6',px+35*k,floor-hh,4*k,6*k);
      });
      for(let i=0;i<5;i++){
        const ax=x+((i*191)%(Math.max(1,w))),ay=y+((i*47+17)%Math.max(30,h*.62));
        star(ax,ay,i%2?'#e2a5ff':'#c4f5ff',i%2?1:2);
      }
      const ex=x+w*.18;line('rgba(226,115,246,.33)',ex,y,ex+42*k,floor,4*k);
      line('rgba(255,192,225,.40)',ex+1,y,ex+40*k,floor,1*k);
    }
    r(c[3],x,floor,w,12);r(c[4],x,floor,w,3);
    ctx.restore();
  }

  function richArt(key,x,y,w,h,st){   // st = static card: no scrolling, only gentle twinkle (keeps previews calm)
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const c=PREMIUM_COLORS[key],g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    const T=st||cfg.fx||particleReducedMotion.matches?0:ticks,bx=st?0:bgX,gx=st?0:groundX,fl=y+h-12,k=Math.max(.45,Math.min(h>330?1.35:1,h/150));
    const r=(col,a,b,cw,ch)=>{ctx.fillStyle=col;ctx.fillRect(Math.floor(a),Math.floor(b),Math.ceil(cw),Math.ceil(ch));};
    if(key==='FOREST'){
      for(let i=0;i<w/44+2;i++){const tx=x+wr(i*44-bx*.12,w+88)-44;r(c[2],tx,fl-78*k,7*k,78*k);r('#0f3a34',tx-13*k,fl-100*k,33*k,34*k);r('#134a3c',tx-8*k,fl-114*k,23*k,20*k);}
      for(let i=0;i<w/70+2;i++){const tx=x+wr(i*70+20-bx*.3,w+140)-70,th=60+(i*23%30);r('#25180f',tx,fl-th*k,10*k,th*k);r('#1c5a3a',tx-22*k,fl-(th+26)*k,54*k,30*k);r('#2a8a4c',tx-16*k,fl-(th+34)*k,42*k,14*k);r('#5ad06a',tx-8*k,fl-(th+36)*k,18*k,4*k);}
      ctx.fillStyle='rgba(255,247,170,'+(.05+.03*Math.sin(T*.03))+')';
      for(let i=0;i<3;i++){const sx=x+w*(.2+i*.3);ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx+16*k,y);ctx.lineTo(sx+(60+i*10)*k,fl);ctx.lineTo(sx+30*k,fl);ctx.fill();}
      for(let i=0;i<w/48+2;i++){const mx=x+wr(i*48+11-gx*.55,w+96)-48,mh=(6+i%3*3)*k,pl=.55+.45*Math.sin(T*.07+i),cp=i%2?'#ff6ad8':'#4fd2ff';
        ctx.globalAlpha=.22*pl;r(cp,mx-5*k,fl-mh-5*k,18*k,mh+8*k);ctx.globalAlpha=1;r('#e9e2ff',mx+3*k,fl-mh,4*k,mh);r(cp,mx-k,fl-mh-5*k,12*k,6*k);r('#fff',mx+2*k,fl-mh-4*k,2*k,2*k);}
    }else if(key==='CRYSTAL'){
      for(let L2=0;L2<2;L2++){const sp=L2?.24:.09,sw=L2?36:54,hh=(L2?34:50)*k;ctx.fillStyle=L2?'#1e2c70':'#121a48';
        for(let i=0;i<w/sw+2;i++){const sx=x+wr(i*sw-bx*sp,w+sw*2)-sw,ln=hh*(.6+((i*7+L2*3)%5)*.18);ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx+sw*.7,y);ctx.lineTo(sx+sw*.35,y+ln);ctx.fill();}}
      for(let i=0;i<w/54+2;i++){const cx=x+wr(i*54+14-gx*.5,w+108)-54,ch=(30+(i*13%34))*k,pl=.5+.5*Math.sin(T*.05+i*1.9),col=i%3===0?'#a77bff':i%3===1?'#58e6e0':'#6aa8ff';
        ctx.globalAlpha=.16+.14*pl;r(col,cx-10*k,fl-ch-8*k,34*k,ch+8*k);ctx.globalAlpha=1;
        ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx,fl);ctx.lineTo(cx+4*k,fl-ch*.8);ctx.lineTo(cx+9*k,fl-ch);ctx.lineTo(cx+15*k,fl-ch*.75);ctx.lineTo(cx+18*k,fl);ctx.fill();
        r('rgba(255,255,255,.55)',cx+7*k,fl-ch+3*k,2,ch*.55);r('rgba(0,0,40,.3)',cx+13*k,fl-ch*.7,4*k,ch*.7);}
      ctx.globalAlpha=.08;ctx.fillStyle='#fff';const sw2=x+wr(T*.6,w+120)-60;ctx.beginPath();ctx.moveTo(sw2,y);ctx.lineTo(sw2+14,y);ctx.lineTo(sw2-20,fl);ctx.lineTo(sw2-34,fl);ctx.fill();ctx.globalAlpha=1;
    }else{   // DESERT
      const sx=x+w*.7,sy=fl-h*.42;
      ctx.globalAlpha=.25;ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(sx,sy,34*k,0,6.283);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle='#ffd070';ctx.beginPath();ctx.arc(sx,sy,21*k,0,6.283);ctx.fill();r('#ff9a4a',sx-20*k,sy+6*k,40*k,3*k);r('#ff9a4a',sx-16*k,sy+13*k,32*k,3*k);
      for(let i=0;i<w;i+=4){const m=i+bx*.1,hh=(26+14*Math.sin(m*.03)+8*Math.sin(m*.09+1))*k;r('#b0503e',x+i,fl-hh,4,hh);}
      for(let i=0;i<w/150+2;i++){const rx=x+wr(i*150+30-gx*.4,w+300)-150,rh=(62+i%3*16)*k;
        r('#8a4a2c',rx,fl-rh,10*k,rh);r('#c27a4a',rx,fl-rh,4*k,rh);r('#8a4a2c',rx+40*k,fl-rh*.6,10*k,rh*.6);r('#c27a4a',rx+40*k,fl-rh*.6,4*k,rh*.6);
        r('#8a4a2c',rx-4*k,fl-rh-6*k,58*k,7*k);r('#c27a4a',rx-4*k,fl-rh-6*k,58*k,2*k);r('#6a3320',rx+14*k,fl-rh*.4,6*k,rh*.4);}
      for(let i=0;i<w;i+=4){const m=i+bx*.25+60,hh=(16+12*Math.sin(m*.045+2)+6*Math.sin(m*.12))*k;r('#d58a45',x+i,fl-hh,4,hh);r('#ffc678',x+i,fl-hh,4,2);}
      ctx.fillStyle='rgba(255,220,150,'+(.07+.03*Math.sin(T*.05))+')';ctx.fillRect(x,fl-14*k,w,10*k);
    }
    r(c[3],x,fl,w,12);r(c[4],x,fl,w,3);
    ctx.restore();
  }
  function richGround(){
    const gw=Math.floor(groundX),pc=({FOREST:['#173a1c','#b6ff7a'],CRYSTAL:['#8ff3ff','#1d1850'],DESERT:['#b0702a','#ffe9b0'],TEMPEST:['#253f69','#9fddff'],ECLIPSE_REALM:['#3c2337','#ffad70'],PRISM:['#3f6bc0','#b7f9ff'],CLOCKWORK:['#6d4b37','#ffe6a2'],AURORA:['#2b5874','#b8fff0'],CELESTIAL:['#6e6a94','#f6e8bd'],CYBERPUNK:['#102e5c','#65f6ef'],MYSTIC:['#17594c','#b5f9de'],SHATTERED:['#33284c','#d2a6f6']})[cfg.map];
    for(let x=-(gw%18);x<W;x+=18){const i=Math.floor((x+gw)/18);
      if(i%3===0){ctx.fillStyle=pc[1];ctx.fillRect(x+4,GROUND+2,3,2);}
      ctx.fillStyle=pc[0];ctx.fillRect(x+2,GROUND+22+(i%2)*8,6,3);
      if((cfg.map==='CRYSTAL'||cfg.map==='SHATTERED')&&i%5===0)ctx.fillRect(x+6,GROUND+9,2,5);}
  }
  function pipeDeco(x,top,bot){   // decoration stays inside pipe bodies and caps: it never changes the gap you see
    const m=cfg.map,t=ticks;
    if(m==='FOREST'){
      rc('#3f9a3a',x-3,top-CAP,PW+6,3);rc('#3f9a3a',x-3,bot,PW+6,3);rc('#7be06a',x+2,top-CAP,8,2);rc('#7be06a',x+26,bot,10,2);
      for(let i=0;i<3;i++){const vx=x+6+i*16,vl=10+(i*9%12);rc('#2f8a3a',vx,top-CAP-vl,2,vl);rc('#6fd06a',vx-1,top-CAP-vl,4,3);}
      const cp=(t>>4)&1?'#ff6ad8':'#ff9ae8';rc(cp,x+30,bot+CAP+2,12,5);rc('#fff',x+33,bot+CAP+3,2,2);rc('#e9e2ff',x+34,bot+CAP+7,4,4);
    }else if(m==='CRYSTAL'){
      rc('#c8f4ff',x+8,top-CAP-9,4,9);rc('#8ee9ff',x+15,top-CAP-15,5,15);rc('#e2d0ff',x+27,top-CAP-8,4,8);
      rc('#c8f4ff',x+8,bot+CAP,4,9);rc('#8ee9ff',x+15,bot+CAP,5,15);rc('#e2d0ff',x+27,bot+CAP,4,8);
      if(((t>>4)&3)===0){rc('#fff',x+16,top-CAP-13,2,2);rc('#fff',x+16,bot+CAP+11,2,2);}
    }else if(MYTHIC_MAPS.has(m)){
      // Mythic cap engravings stay within solid pipe geometry; the flight gap is unchanged.
      const light={TEMPEST:'#b6e9ff',ECLIPSE_REALM:'#ffc07e',PRISM:'#d5ffff',CLOCKWORK:'#ffdf90',AURORA:'#bbffe7',NECROPOLIS:'#ffd0d0'}[m];
      const dark={TEMPEST:'#355d92',ECLIPSE_REALM:'#a54742',PRISM:'#8f9eff',CLOCKWORK:'#ae8648',AURORA:'#62bdc1',NECROPOLIS:'#6b2131'}[m];
      for(const yy of [top-CAP+4,bot+4]){
        rc(dark,x+2,yy,PW-4,3);rc(light,x+10,yy+1,PW-20,1);
        if(m==='TEMPEST'){rc('#e1f6ff',x+22,yy+5,8,2);rc(light,x+26,yy+7,3,4);}
        else if(m==='ECLIPSE_REALM'){rc('#22182b',x+22,yy+3,9,9);rc(light,x+21,yy+3,1,9);rc(light,x+30,yy+3,1,9);}
        else if(m==='PRISM'){rc('#c4fbff',x+21,yy+3,10,3);rc('#e7c6ff',x+24,yy+6,4,5);}
        else if(m==='CLOCKWORK'){rc('#ffe4a5',x+23,yy+3,6,6);rc('#392b31',x+25,yy+5,2,2);}
        else if(m==='AURORA'){rc('#a7fff6',x+22,yy+4,8,2);rc('#ffffff',x+25,yy+6,2,3);}
        else{rc('#f0e6e6',x+21,yy+3,10,2);rc('#f0e6e6',x+20,yy+5,2,4);rc('#f0e6e6',x+30,yy+5,2,4);rc('#f0e6e6',x+23,yy+8,6,2);rc('#1a1014',x+23,yy+5,2,2);rc('#1a1014',x+28,yy+5,2,2);} 
      }
      for(let yy=top-CAP-10;yy>10;yy-=26){rc(dark,x+10,yy,PW-20,2);rc(light,x+24,yy+3,3,7);}
      for(let yy=bot+CAP+10;yy<GROUND-10;yy+=26){rc(dark,x+10,yy,PW-20,2);rc(light,x+24,yy+3,3,7);}
    }else if(ELITE_MAPS.has(m)){
      // Cap inlays and body marks never protrude into the passable gap.
      const glow=({CELESTIAL:'#fff3c3',CYBERPUNK:'#6af5f1',MYSTIC:'#c4ffe6',SHATTERED:'#ebb9ff'})[m];
      for(const yy of [top-CAP+4,bot+4]){
        rc(glow,x+7,yy,PW-14,2);rc(glow,x+22,yy+3,8,2);
        if(m==='CELESTIAL'){rc('#f4d692',x+15,yy+6,4,4);rc('#fffbe1',x+32,yy+6,4,4);}
        else if(m==='CYBERPUNK'){rc('#f963c4',x+8,yy+6,4,4);rc('#9afff7',x+40,yy+6,3,4);}
        else if(m==='MYSTIC'){rc('#d2abfb',x+19,yy+6,4,3);rc('#fff4c3',x+30,yy+5,3,3);}
        else{rc('#e6bbff',x+15,yy+6,3,5);rc('#ffb7ad',x+31,yy+6,3,5);}
      }
      for(let yy=top-CAP-11;yy>8;yy-=27){rc(glow,x+PW/2-1,yy,2,8);rc(m==='CYBERPUNK'?'#f963c4':'#857cb9',x+PW/2+4,yy+2,4,3);}
      for(let yy=bot+CAP+12;yy<GROUND-8;yy+=27){rc(glow,x+PW/2-1,yy,2,8);rc(m==='CYBERPUNK'?'#f963c4':'#857cb9',x+PW/2+4,yy+2,4,3);}
    }else if(m==='DESERT'){
      for(let yy=top-CAP-10;yy>0;yy-=18){rc('#8f5f2a',x+3,yy,PW-6,2);if((yy/18|0)%2)rc('#6b3f1a',x+18,yy+5,4,4);}
      for(let yy=bot+CAP+8;yy<GROUND-4;yy+=18){rc('#8f5f2a',x+3,yy,PW-6,2);if((yy/18|0)%2)rc('#6b3f1a',x+18,yy+5,4,4);}
      rc('#ffe3a8',x-2,top-CAP+3,PW+4,1);
    }
  }
  const HAZE={CITY:'#d4638f',MOUNTAINS:'#8fb8ff',VOLCANO:'#ff5a1f',SAKURA:'#ffb5d8',NEON:'#b04bff',OCEAN:'#2bd0d8',VOLCANO_PLUS:'#ff6a2a',COSMIC:'#a67bff',FOREST:'#7affc0',CRYSTAL:'#58e6e0',DESERT:'#ffb25a',CELESTIAL:'#f5dfb4',CYBERPUNK:'#71baff',MYSTIC:'#7bfbd5',SHATTERED:'#da9df9',TEMPEST:'#a3d8fa',ECLIPSE_REALM:'#d97358',PRISM:'#c4dbff',CLOCKWORK:'#f1c287',AURORA:'#92e9e1',NECROPOLIS:'#ff6f7f'};
  let hzK='',hzG=null,vgG=null;
  function drawAtmos(){   // horizon haze + soft top vignette on every map; stronger on premium maps. Skipped by REDUCE EFFECTS.
    if(cfg.cb==='HIGH CONTRAST'||cfg.fx)return;
    const key=cfg.map+'|'+GROUND+'|'+themeName();
    if(key!==hzK){hzK=key;const prem=SHOP_MAPS.some(m=>m.id===cfg.map);
      hzG=ctx.createLinearGradient(0,GROUND-70,0,GROUND);hzG.addColorStop(0,(HAZE[cfg.map]||'#ffffff')+'00');hzG.addColorStop(1,(HAZE[cfg.map]||'#ffffff')+(prem?'66':'33'));
      vgG=ctx.createLinearGradient(0,0,0,70);vgG.addColorStop(0,'rgba(5,4,25,.26)');vgG.addColorStop(1,'rgba(5,4,25,0)');}
    ctx.fillStyle=hzG;ctx.fillRect(0,GROUND-70,W,70);ctx.fillStyle=vgG;ctx.fillRect(0,0,W,70);
  }
  const NEW_ITEMS=new Set(['MAPS:CELESTIAL','MAPS:CYBERPUNK','MAPS:MYSTIC','MAPS:SHATTERED','MAPS:TEMPEST','MAPS:ECLIPSE_REALM','MAPS:PRISM','MAPS:CLOCKWORK','MAPS:AURORA','MAPS:NECROPOLIS','MAPS:FOREST','MAPS:CRYSTAL','MAPS:DESERT','TRAILS:FROST','TRAILS:STARDUST','TRAILS:SHADOW','TRAILS:AURORA','TRAILS:HEART','TRAILS:INKFLOW','TRAILS:BUBBLE','TRAILS:SONIC','TRAILS:PHOENIX','TRAILS:LUNAR','TRAILS:OMEN']);
  const isNew=i=>i.kind==='BIRDS'?NEW_SKIN.has(i.name):NEW_ITEMS.has(i.kind+':'+i.id);
  function premiumArt(key,x,y,w,h,staticCard=false){
    if(MYTHIC_MAPS.has(key)){
      window.flyingBirdMythicArt?.(ctx,{map:key,x,y,w,h,tick:ticks,distance:bgX,quality:particleLevel(),staticCard,reducedMotion:cfg.fx||particleReducedMotion.matches});
      return;
    }
    if(ELITE_MAPS.has(key)){eliteArt(key,x,y,w,h,staticCard);return;}
    if(RICH[key]){richArt(key,x,y,w,h,staticCard);return;}
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const c=PREMIUM_COLORS[key],g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    const far=staticCard?0:bgX*.08,mid=staticCard?0:bgX*.25,near=staticCard?0:groundX*.6;
    const artTicks=staticCard?0:ticks;
    if(key==='COSMIC'||key==='NEON'){
      for(let i=0;i<36;i++){
        const sx=x+((i*79-far*.3)%(w+20)+w+20)%(w+20),sy=y+((i*41)%Math.max(15,h*.7));
        ctx.fillStyle=i%3?'#d6e6ff':'#f6a4f9';ctx.fillRect(sx,sy,i%5?1:2,i%5?1:2);
      }
      if(key==='COSMIC'){
        ctx.fillStyle='#c39ce9';ctx.beginPath();ctx.arc(x+w*.75,y+h*.3,Math.min(20,h*.18),0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#f2c7ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x+w*.75,y+h*.3,Math.min(29,h*.25),Math.min(9,h*.08),-.3,0,Math.PI*2);ctx.stroke();
      }
    }
    const floor=y+h-12;
    depthLayer(c,x,w,floor,h,far*.7);
    if(key==='NEON'){
      for(let i=-1;i<w/22+2;i++){
        const bx=x+((i*22-mid)%(w+44)+w+44)%(w+44)-22,bh=20+((i*19+900)%36);
        ctx.fillStyle=c[2];ctx.fillRect(bx,floor-bh,18,bh);
        ctx.fillStyle=i%2?'#f55ec6':'#62f2ff';ctx.fillRect(bx+5,floor-bh+7,3,5);
      }
    }else if(key==='SAKURA'){
      for(let i=-1;i<w/52+2;i++){
        const tx=x+((i*52-mid)%(w+100)+w+100)%(w+100)-50;
        ctx.fillStyle='#785477';ctx.fillRect(tx,floor-36,6,36);
        ctx.fillStyle=i%2?'#ffbbdb':'#f394c7';
        for(let a=0;a<5;a++){ctx.beginPath();ctx.arc(tx+3+Math.cos(a*1.25)*13,floor-40+Math.sin(a*1.25)*9,10,0,Math.PI*2);ctx.fill();}
      }
      for(let i=0;i<(staticCard?10:0);i++){ctx.fillStyle='#ffe4ee';ctx.fillRect(x+((i*43-near*.4)%(w+10)+w+10)%(w+10),y+(i*31+artTicks*.3)%(h-12),3,2);}
    }else if(key==='OCEAN'){
      for(let i=0;i<12;i++){
        const cx=x+((i*37-mid)%(w+25)+w+25)%(w+25),cy=floor-8-(i*13)%25;
        ctx.fillStyle=i%2?'#41c9a3':'#f39aaf';ctx.fillRect(cx,cy,5,20);
        if(staticCard){ctx.fillStyle='#a7f5ee';ctx.beginPath();ctx.arc(cx,y+(i*27)%(h+10),2+i%3,0,Math.PI*2);ctx.fill();}
      }
    }else if(key==='VOLCANO_PLUS'){
      for(let i=-1;i<w/65+2;i++){
        const px=x+((i*65-mid)%(w+130)+w+130)%(w+130)-65;
        ctx.fillStyle='#371923';ctx.beginPath();ctx.moveTo(px,floor);ctx.lineTo(px+32,floor-57);ctx.lineTo(px+65,floor);ctx.fill();
        ctx.fillStyle='#ff852d';ctx.fillRect(px+29,floor-51,6,9);
      }
      for(let i=0;i<(staticCard?16:0);i++){ctx.fillStyle=i%2?'#ffbc47':'#ff6c29';ctx.fillRect(x+((i*41-near*.3)%(w+15)+w+15)%(w+15),y+((i*17-artTicks*.7)%(h+15)+h+15)%(h+15),2,3);}
    }else{
      for(let i=0;i<w/40+2;i++){const px=x+((i*40-mid)%(w+80)+w+80)%(w+80)-40;
        ctx.fillStyle=c[2];ctx.fillRect(px,floor-(20+i%4*9),33,30+i%4*9);}
    }
    ctx.fillStyle=c[3];ctx.fillRect(x,floor,w,12);
    ctx.fillStyle=c[4];ctx.fillRect(x,floor,w,3);
    // Small deterministic pixel-art details make shop thumbnails readable at a glance.
    if(staticCard){
      if(key==='NEON'){
        for(let i=0;i<Math.ceil(w/15);i++){
          const bx=x+3+i*15,by=floor-16-(i*11%27);
          ctx.fillStyle=i%2?'#62eaff':'#ff72d1';
          ctx.fillRect(bx,by,2,4);ctx.fillRect(bx+5,by+8,2,3);
          if(i%3===0){ctx.fillStyle='#fbd86d';ctx.fillRect(bx-1,by-7,9,2);}
        }
      }else if(key==='SAKURA'){
        for(let i=0;i<Math.ceil(w/13);i++){
          const px=x+5+i*13,py=y+7+(i*19)%Math.max(8,h-24);
          ctx.fillStyle=i%2?'#fff1f7':'#ffb4d3';ctx.fillRect(px,py,3,2);
        }
      }else if(key==='OCEAN'){
        for(let i=0;i<Math.ceil(w/20);i++){
          const px=x+8+i*20,py=y+12+(i*13)%Math.max(8,h-34);
          ctx.fillStyle='#b4faff';ctx.fillRect(px,py,2,2);ctx.fillRect(px+3,py-6,1,1);
          ctx.fillStyle=i%2?'#ffd5a3':'#ff9cae';ctx.fillRect(px+4,floor-8,5,5);
        }
      }else if(key==='VOLCANO_PLUS'){
        for(let i=0;i<Math.ceil(w/17);i++){
          const px=x+6+i*17,py=y+8+(i*23)%Math.max(8,h-26);
          ctx.fillStyle=i%2?'#ffcc64':'#ff733a';ctx.fillRect(px,py,2,3);
        }
      }else if(key==='COSMIC'){
        for(let i=0;i<Math.ceil(w/26);i++){
          const px=x+12+i*26,py=y+9+(i*17)%Math.max(8,h-29);
          ctx.fillStyle=i%2?'#ffe5a5':'#c9eaff';ctx.fillRect(px-2,py,5,1);ctx.fillRect(px,py-2,1,5);
        }
      }
    }
    ctx.restore();
  }
  function drawPremiumMapBg(){premiumArt(cfg.map,0,0,W,GROUND);}
  function drawPremiumGround(){
    const c=PREMIUM_COLORS[cfg.map];ctx.fillStyle=c[3];ctx.fillRect(0,GROUND,W,H-GROUND);
    ctx.fillStyle=c[4];ctx.fillRect(0,GROUND,W,6);
    for(let x=-(Math.floor(groundX)%24);x<W;x+=24){ctx.fillStyle='rgba(255,255,255,.13)';ctx.fillRect(x+5,GROUND+14,9,3);}
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(0,GROUND+6,W,3);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(0,GROUND+2,W,1);
    if(RICH[cfg.map])richGround();
    ctx.fillStyle=INK;ctx.fillRect(0,GROUND-2,W,2);
  }
  function mapLabel(id){ return tr('MAP_'+id); }
  function itemName(item) {
    if (item.kind === 'MAPS') return mapLabel(item.id);
    if (item.kind === 'TRAILS') return item.id === 'NONE' ? tr('NONE_TRAIL') : tr('TRAIL_'+item.id);
    if (['CLASSIC','RED','BLUE','GHOST'].includes(item.name)) return displayValue(item.name);
    const key = 'SKIN_'+item.name.replace(/\s+/g,'_');
    const label = tr(key);
    return label === key ? item.name : label;
  }
  function drawMapBg() {
    const mx = W - (L ? 110 : 70), my = L ? 65 : 85;
    if (SHOP_MAPS.some(m => m.id === cfg.map)) { drawPremiumMapBg(); return; }
    if (cfg.map === 'MOUNTAINS') {
      const day = themeName() === 'DAY';
      skyGrad(day ? ['#4aa8ff', '#8fd8ff', '#e8f8ff'] : ['#070b24', '#16285a', '#5a7fc0']);
      if (day) {
        ctx.fillStyle = 'rgba(255,224,102,0.3)'; ctx.beginPath(); ctx.arc(mx, my, 36, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 6.28); ctx.fill();
      } else {
        for (const st of stars) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(ticks / 30 + st.t)) + ')';
          ctx.fillRect(Math.floor(st.x), Math.floor(st.y), st.s, st.s);
        }
        ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 6.28); ctx.fill();
        ctx.fillStyle = 'rgba(80,255,170,0.10)';   // northern lights
        for (let x = 0; x < W; x += 8) ctx.fillRect(x, 30 + Math.floor(14 * Math.sin((x + ticks * 0.5) * 0.03)), 8, 26);
      }
      for (let x = 0; x < W; x += 4) {
        const m1 = x + bgX * 0.06, h1 = Math.floor(120 + 40 * Math.sin(m1 * 0.012 + 2) + 25 * Math.sin(m1 * 0.035));
        ctx.fillStyle = day ? '#9cc4ec' : '#2c3f78'; ctx.fillRect(x, GROUND - h1, 4, h1);
        const m2 = x + bgX * 0.14, h2 = Math.floor(105 + 55 * Math.sin(m2 * 0.017) + 30 * Math.sin(m2 * 0.046 + 1));
        ctx.fillStyle = day ? '#5f86c0' : '#1d2c5e'; ctx.fillRect(x, GROUND - h2, 4, h2);
        const cap = h2 > 130 ? Math.min(26, Math.floor((h2 - 130) * 0.8) + 4) : 0;
        if (cap) { ctx.fillStyle = day ? '#fff' : '#dfe8ff'; ctx.fillRect(x, GROUND - h2, 4, cap); }
      }
      const sh = groundX * 0.8, first = Math.floor(sh / 26);   // snowy pines
      for (let i = first - 1; i < first + W / 26 + 2; i++) {
        const x = Math.floor(i * 26 - sh), t = ((i * 7) % 3 + 3) % 3, h = 24 + t * 8, q = Math.floor(h / 4.5);
        ctx.fillStyle = day ? '#14502e' : '#0d3320';
        for (let l = 0; l < 4; l++) ctx.fillRect(x - (3 + l * 3), GROUND - h + l * q, 6 + l * 6, q + 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, GROUND - h, 6, 2); ctx.fillRect(x - 6, GROUND - h + q, 4, 1);
        ctx.fillStyle = '#5a3b22'; ctx.fillRect(x - 1, GROUND - 3, 3, 3);
      }
    } else {   // VOLCANO
      skyGrad(['#12030a', '#4a0f10', '#ff5a1f']);
      ctx.fillStyle = 'rgba(255,120,40,' + (0.10 + 0.05 * Math.sin(ticks / 25)) + ')'; ctx.fillRect(0, GROUND - 140, W, 140);
      ctx.fillStyle = 'rgba(40,14,14,0.55)';   // ash clouds
      for (const c of clouds) {
        const x = Math.floor(((c.x - bgX * 0.25) % (W + 120) + (W + 120)) % (W + 120)) - 60, y = Math.floor(c.y);
        ctx.fillRect(x, y, c.w + 20, 12); ctx.fillRect(x + 10, y - 7, Math.floor(c.w * 0.6), 7);
      }
      const P = 420;
      for (let x = 0; x < W; x += 4) {
        const m = x + bgX * 0.1, idx = Math.floor(m / P), d = Math.abs(m - idx * P - P / 2), peak = 120 + ((idx % 3 + 3) % 3) * 18;
        const h = Math.floor(d < 16 ? peak - 14 - (d < 7 ? 5 : 0) : peak - d * 0.85);
        ctx.fillStyle = '#2b1214';
        if (h < 22) { ctx.fillRect(x, GROUND - 22, 4, 22); continue; }
        ctx.fillRect(x, GROUND - h, 4, h);
        if (d < 16) { ctx.fillStyle = '#ff7b2e'; ctx.fillRect(x, GROUND - h, 4, 3); }
        const q = Math.floor(m / 4);
        if (d >= 7 && d < 34 && q % 3 === 0) { ctx.fillStyle = 'rgba(255,110,30,0.85)'; ctx.fillRect(x, GROUND - h, 2, 18 + (q * 7) % 30); }
      }
      const i0 = Math.floor(bgX * 0.1 / P);   // smoke rising from the craters
      for (let i = i0 - 1; i < i0 + 3; i++) {
        const cx = i * P + P / 2 - bgX * 0.1;
        if (cx < -60 || cx > W + 60) continue;
        const ty = GROUND - (120 + ((i % 3 + 3) % 3) * 18) + 19;
        for (let k = 0; k < particleLevel()*2; k++) {
          const t = ((particleReducedMotion.matches?0:ticks) * 0.35 + k * 14) % 84, r = 4 + t / 8;
          ctx.fillStyle = 'rgba(70,40,40,' + 0.45 * (1 - t / 84) + ')';
          ctx.fillRect(Math.floor(cx + Math.sin(t / 14 + k) * 8 - r), Math.floor(ty - t - r), Math.floor(r * 2), Math.floor(r * 2));
        }
      }
      const sh = groundX * 0.8, first = Math.floor(sh / 44);   // basalt spires
      for (let i = first - 1; i < first + W / 44 + 2; i++) {
        const x = Math.floor(i * 44 - sh), t = ((i * 7) % 5 + 5) % 5, h = 20 + t * 9, w = 14 + (t % 3) * 4;
        ctx.fillStyle = '#1d0d11'; ctx.fillRect(x, GROUND - h, w, h); ctx.fillRect(x + 3, GROUND - h - 6, w - 6, 6);
        ctx.fillStyle = 'rgba(255,123,46,0.7)'; ctx.fillRect(x, GROUND - h, 1, h);
      }
    }
  }

  function drawMapGround() {
    const gw = Math.floor(groundX);
    if (SHOP_MAPS.some(m => m.id === cfg.map)) { drawPremiumGround(); return; }
    if (cfg.map === 'MOUNTAINS') {
      ctx.fillStyle = '#7d93b8'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, GROUND, W, 8);
      ctx.fillStyle = '#c4e0f5'; ctx.fillRect(0, GROUND + 8, W, 3);
      ctx.fillStyle = INK; ctx.fillRect(0, GROUND - 2, W, 2);
      for (let x = -(gw % 16); x < W; x += 16) {
        const i = Math.floor((x + gw) / 16);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + (i % 4) * 3, GROUND + 1 + (i % 2) * 3, 3, 2);
        ctx.fillStyle = '#5f759c'; ctx.fillRect(x + 4, GROUND + 18 + (i % 2) * 8, 6, 3);
      }
    } else {
      ctx.fillStyle = '#241519'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#3a2328'; ctx.fillRect(0, GROUND, W, 7);
      ctx.fillStyle = INK; ctx.fillRect(0, GROUND - 2, W, 2);
      ctx.fillStyle = 'rgba(255,110,30,' + (0.55 + 0.35 * Math.sin(ticks / 18)) + ')';   // glowing lava cracks
      for (let x = -(gw % 24); x < W; x += 24) {
        const i = Math.floor((x + gw) / 24), ox = x + (i % 3) * 5, oy = GROUND + 12 + (i % 2) * 10;
        ctx.fillRect(ox, oy, 10, 2); ctx.fillRect(ox + 8, oy + 2, 2, 6);
      }
      ctx.fillStyle = 'rgba(255,100,30,0.10)'; ctx.fillRect(0, GROUND - 10, W, 8);   // heat haze
      ctx.fillStyle = 'rgba(255,100,30,0.06)'; ctx.fillRect(0, GROUND - 20, W, 10);
    }
  }

  function drawMapDetail(){
    window.flyingBirdMapArt?.(ctx,{map:cfg.map,w:W,ground:GROUND,tick:ticks,distance:bgX,
      quality:particleLevel(),day:themeName()==='DAY',highContrast:cfg.cb==='HIGH CONTRAST',
      reducedMotion:cfg.fx||particleReducedMotion.matches});
  }

  function tri(cx, base, hgt, col) {   // stepped pixel triangle
    ctx.fillStyle = col;
    for (let r = 0; r < hgt; r += 2) ctx.fillRect(Math.floor(cx - r * 0.8), base - hgt + r, Math.floor(r * 1.6) + 2, 2);
  }

  function mapPreview(key, x, y, w, h, drawActors = true) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    if (SHOP_MAPS.some(m => m.id === key)) { premiumArt(key,x,y,w,h,true); }
    else {
      const C = { CITY: ['#302b63', '#d4638f'], MOUNTAINS: ['#16285a', '#5a7fc0'], VOLCANO: ['#4a0f10', '#ff5a1f'] }[key];
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, C[0]); g.addColorStop(1, C[1]);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const gy = y + h - 12;
      if (key === 'CITY') {
        for (let i = 0; i < w; i += 14) {
          const drift=0;
          const xx=x+((i-drift+w+14)%(w+14));
          const bh = 14 + (i * 7) % 26;
          ctx.fillStyle = INK; ctx.fillRect(xx, gy - bh, 12, bh);
          ctx.fillStyle = '#ffd66b'; ctx.fillRect(xx + 3, gy - bh + 4, 3, 4);
        }
        ctx.fillStyle = '#7ed957';
      } else if (key === 'MOUNTAINS') {
        for (let i = 0; i < 3; i++) { const cx = x + w * (0.2 + i * 0.3) + 0; const hh = 34 + (i % 2) * 14; tri(cx, gy, hh, '#1d2c5e'); tri(cx, gy - hh + 12, 12, '#fff'); }
        ctx.fillStyle = '#f4fbff';
        for(let i=0;i<7;i++){ctx.fillRect(x+((i*19)%(w+8)),y+8+(i*13%(Math.max(10,h-28))),2,2);}
      } else {
        const cx = x + w * 0.5;
        tri(cx, gy, 50, '#2b1214'); ctx.fillStyle = '#ff7b2e'; ctx.fillRect(cx - 7, gy - 50, 14, 3); ctx.fillRect(cx - 2, gy - 47, 2, 22);
        ctx.fillStyle = '#241519';
        for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#ffb135':'#ff7b2e';ctx.fillRect(x+((i*23)%(w+18)+w+18)%(w+18),y+10+((i*17)%(Math.max(12,h-24))),2,3);}
      }
      ctx.fillRect(x, gy, w, 12);
      if (key === 'VOLCANO') { ctx.fillStyle = '#ff7b2e'; ctx.fillRect(x, gy, w, 2); }
    }
    ctx.save();ctx.translate(x,y);ctx.scale(w/640,(h-12)/312);
    window.flyingBirdMapArt?.(ctx,{map:key,w:640,ground:312,tick:0,distance:0,quality:0,day:false,reducedMotion:true});
    ctx.restore();
    if (drawActors) {
      // One fixed pipe pair and one animated bird per compact card.
    const gap = Math.max(24, Math.min(44, h * .38));
    const center = y + h * .5;
    const pipeW = Math.max(12, Math.min(18, w*.11));
    const pipeX = x + w * .72;
    const pal = MAPS[key]?.pipes?.[0] || GREEN;
    drawPreviewPipePair(pal,x,y,w,h,center,gap,pipeX,pipeW);
    animatedBirdIcon(equippedPreviewSkin(),x+w*.3,center,Math.min(.88,Math.max(.5,h/60)),{phase:x*.03,drift:2});
    }
    ctx.restore();
  }

  let mapPage = 0;
  function drawMaps() {
    ctx.fillStyle='rgba(11,17,39,.96)';ctx.fillRect(0,0,W,H);
    titleFitted(tr('SELECT_MAP'),27,L?24:23);
    cosmeticLabel(tr('MAP_HINT'),W/2,50,11,W-70,'#d3daea');
    const cols=L?4:1,per=L?4:3,pages=Math.ceil(MAP_KEYS.length/per);
    mapPage=Math.max(0,Math.min(mapPage,pages-1));
    const visible=MAP_KEYS.slice(mapPage*per,(mapPage+1)*per), gap=L?10:8;
    const cw=L?(W-48-(cols-1)*gap)/cols:W-36;
    const y0=L?70:72;
    const ch=L?Math.min(186,H-166):Math.min(174,Math.floor((H-175-gap*2)/3));
    const navY=H-70;
    visible.forEach((id,i)=>{
      const x=L?24+i*(cw+gap):18,y=y0+(L?0:i*(ch+gap));
      const owned=mapOK(id),selected=cfg.map===id,meta=SHOP_MAPS.find(m=>m.id===id);
      const status=selected?tr('ACTIVE'):owned?tr('READY_TO_PLAY'):tr('LOCKED');
      btns.push({x,y,w:cw,h:ch,fn:()=>{
        if(!owned){
          previewItem={id,name:mapLabel(id),price:meta?.price||0,kind:'MAPS',rarity:meta?.rarity||'COMMON'};
          previewReturn='MAPS';screen='PREVIEW';focus=0;return;
        }
        cfg.map=id;saveCfg();initWeather();
        screen='DIFFICULTY';focus=Math.max(0,['EASY','NORMAL','HARD','EXTREME'].indexOf(cfg.diff));
      }});
      tile(x,y,cw,ch,selected);
      const margin=5, artY=y+5, artH=Math.max(29,ch-(L?55:48));
      mapPreview(id,x+margin,artY,cw-margin*2,artH);
      if(!owned){ctx.fillStyle='rgba(12,15,39,.30)';ctx.fillRect(x+margin,artY,cw-margin*2,artH);}
      ctx.fillStyle='#172440';ctx.fillRect(x+4,y+ch-(L?50:43),cw-8,L?45:38);
      txtFit(mapLabel(id),x+12,y+ch-(L?36:30),L?11:12,cw-24,'#fff','left');
      txtFit(status,x+12,y+ch-(L?17:12),9,cw-(owned?20:96),'#a9c6d9','left');
      if (!owned) tag('● '+meta.price,x+cw-75,y+ch-23,63,17,true,9);
      else if(selected)tag('✓',x+cw-29,y+ch-26,19,19,true,12);
      if(selected)stripe(x+2,y+2,cw-4,'#ffd23f');
      else stripe(x+2,y+2,cw-4,'#547197');
    });
    btn(18,navY,65,27,'◀',()=>{mapPage=(mapPage+pages-1)%pages;focus=0;},{size:12});
    txt((mapPage+1)+' / '+pages,W/2,navY+13,11,'#fff','center',false);
    btn(W-83,navY,65,27,'▶',()=>{mapPage=(mapPage+1)%pages;focus=0;},{size:12});
    btn(W/2-67,H-36,134,26,tr('BACK'),back,{size:11});
  }


  // ---------- Profile screen ----------
  function txtFit(str, x, y, size, maxW, color, align, outline = true) {   // shrink text until it fits (long CJK / Cyrillic nicknames)
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    while (size > 8 && ctx.measureText(str).width > maxW) { size--; ctx.font = 'bold ' + size + 'px "Courier New", monospace'; }
    txt(str, x, y, size, color, align, outline);
  }

  function drawAvatar(x, y, s, av) {
    ctx.fillStyle = BROWN; ctx.fillRect(x - 2, y - 2, s + 4, s + 4);
    ctx.fillStyle = AV_BG[av.bg]; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, s, Math.floor(s / 3));
    birdIcon(SKINS[skinOK(av.skin) ? av.skin : 0], x + s / 2, y + s / 2, s / 44);
  }

  let profileStatsPage = 0;
  function drawProfile() {
    ctx.fillStyle = 'rgba(15,12,41,0.9)'; ctx.fillRect(0, 0, W, H);
    const contentW=L?Math.min(W-40,860):W-40;
    const left=(W-contentW)/2;
    const colW=L?Math.min(390,(contentW-22)/2):contentW;
    const top=L?Math.max(58,Math.round((H-520)/2)):58+Math.max(0,H-480)*.12;
    const titleY=L?Math.max(32,top-26):32;
    title(tr('PROFILE'), W/2, titleY, L?28:24, '#ffd23f', 'center');
    const avatarSize=L?88:Math.min(88,Math.max(68,W*.26));
    drawAvatar(left,top,avatarSize,profile.av);
    const infoX=left+avatarSize+14;
    txtFit(profile.nick,infoX,top+23,16,colW-avatarSize-20,'#fff','left');
    txt(tr('PLAYER_ID'),infoX,top+45,10,'#f3e3c7','left',false);
    txtFit(profile.id,infoX,top+62,13,colW-avatarSize-20,'#ffd23f','left');
    const got = ACH.filter(a => save.ach[a.id]).length;
    const at = key => window.flyingBirdAuthText?.(key) || key;
    const mp = window.flyingBirdMpStats;
    const pages = [
      [[at('ST_EASY'),save.best?.EASY||0],[at('ST_NORMAL'),save.best?.NORMAL||0],
       [at('ST_HARD'),save.best?.HARD||0],[at('ST_EXTREME'),save.best?.EXTREME||0]],
      [[at('ST_GAMES'),save.games||0],[at('ST_PIPES'),save.pipes||0],
       [at('ST_FLAPS'),save.flaps||0],[at('ST_EARNED'),save.earnedCoins??'—'],
       [at('ST_BALANCE'),wallet.coins||0],[at('ST_ACH'),got+'/'+ACH.length]],
      mp?.ownFields?.() || []
    ];
    const stats=pages[profileStatsPage];
    const sx=left,sy=top+avatarSize+12,sw=colW;
    const sh=L?Math.min(210,Math.max(110,H*.19)):Math.min(166,Math.max(110,H*.22));
    ctx.fillStyle='#101e37';ctx.fillRect(sx,sy,sw,sh);
    ctx.fillStyle='#607ba1';ctx.fillRect(sx,sy,sw,2);
    ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(sx+3,sy+3,sw-6,28);
    btn(sx+4,sy+4,30,24,'‹',()=>{profileStatsPage=(profileStatsPage+2)%3;},{size:14});
    btn(sx+sw-34,sy+4,30,24,'›',()=>{profileStatsPage=(profileStatsPage+1)%3;},{size:14});
    const heading=profileStatsPage===2?(mp?.title?.()||tr('MULTIPLAYER')):at('STATS_TITLE');
    txtFit(heading+' '+(profileStatsPage+1)+'/3',sx+sw/2,sy+16,10,sw-82,'#ffda77','center');
    const rowGap=Math.min(23,Math.max(13,(sh-41)/Math.max(6,stats.length)));
    stats.forEach(([label,value],i)=>{
      const yy=sy+38+i*rowGap;
      if(i%2===0){ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(sx+5,yy-6,sw-10,rowGap);}
      txtFit(String(label),sx+11,yy,10,sw-104,'#d6e3f6','left',false);
      txtFit(String(value),sx+sw-10,yy,11,80,'#fff','right',false);
    });
    if(!stats.length)txtFit(mp?.selfNote?.()||at('SIGNIN_PROMPT'),sx+sw/2,sy+sh/2+12,10,sw-18,'#d6e3f6','center');
    const bx=L?left+contentW-colW:left;
    const by=L?top+4:sy+sh+12;
    const step=L?Math.min(58,Math.max(43,H*.075)):Math.min(46,Math.max(31,(H-by-37)/6));
    const bh=L?Math.min(46,step-7):Math.min(40,step-4);
    btn(bx,by,colW,bh,tr('EDIT_NICK'),editNick,{size:13});
    btn(bx,by+step,colW,bh,tr('AVATAR'),d=>{
      let i=profile.av.skin;
      do {i=(i+d+SKINS.length)%SKINS.length;} while(!skinOK(i));
      profile.av.skin=i;saveProfile();
    },{value:itemName({kind:'BIRDS',name:SKINS[profile.av.skin].name}),adj:true,size:13});
    btn(bx,by+step*2,colW,bh,tr('AVATAR_BG'),d=>{profile.av.bg=(profile.av.bg+d+AV_BG.length)%AV_BG.length;saveProfile();},
      {value:(profile.av.bg+1)+'/'+AV_BG.length,adj:true,size:13});
    btn(bx,by+step*3,colW,bh,tr('COPY_ID'),copyId,{size:13});
    btn(bx,by+step*4,colW,bh,tr('PROFILE_PRIVACY'),()=>window.flyingBirdOpenPrivacy?.(),{size:12,secondary:true});
    btn(bx,by+step*5,colW,bh,tr('BACK'),back,{size:13,secondary:true});
    if(editing){
      ctx.fillStyle='rgba(15,12,41,.8)';ctx.fillRect(0,0,W,H);
      txt(tr('NICKNAME_PH'),W/2,H/2-36,12);
    }
  }

  // ----- UI helpers -----
  // Motion is ornamental. Accessibility options disable the extra animations.
  const reducedMotionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduceUiMotion=()=>cfg.fx||!!reducedMotionQuery?.matches;
  const uiMotionTime=()=>reduceUiMotion()?0:ticks;
  let uiHoverPoint=null,uiPressPoint=null,uiLastScreen=screen,uiTransition=null;
  const uiHoverLevels=new Map();
  function pointerHot(x,y,w,h){
    const p=uiHoverPoint;
    return !!p&&(!p.touch||performance.now()-p.at<210)&&
      p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;
  }
  function pressedHot(x,y,w,h){
    const p=uiPressPoint;
    return !!p&&performance.now()-p.at<200&&
      p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;
  }
  function hoverLevel(x,y,w,h,kind){
    const key=screen+'|'+kind+'|'+Math.round(x)+'|'+Math.round(y);
    const target=pointerHot(x,y,w,h)?1:0;
    const value=reduceUiMotion()?target:(uiHoverLevels.get(key)||0)*.72+target*.28;
    uiHoverLevels.set(key,value);
    return value;
  }
  // Snapshot previous screen only on screen changes, never on every frame.
  // A short crossfade applies to in-canvas menus; the game's physics is untouched.
  function beginScreenTransition(){
    if(screen===uiLastScreen)return;
    const old=uiLastScreen;
    uiLastScreen=screen;
    uiHoverLevels.clear();
    if(reduceUiMotion()||!old||!screen||canvas.width<1||canvas.height<1){
      uiTransition=null;return;
    }
    const snapshot=document.createElement('canvas');
    snapshot.width=canvas.width;snapshot.height=canvas.height;
    const snapCtx=snapshot.getContext('2d');
    if(!snapCtx){uiTransition=null;return;}
    snapCtx.drawImage(canvas,0,0);
    uiTransition={image:snapshot,start:performance.now(),duration:260};
  }
  function drawScreenTransition(){
    if(!uiTransition)return;
    const t=Math.min(1,(performance.now()-uiTransition.start)/uiTransition.duration);
    if(t>=1||reduceUiMotion()){uiTransition=null;return;}
    const alpha=(1-t)*(1-t);
    ctx.save();ctx.globalAlpha=alpha*.96;
    ctx.drawImage(uiTransition.image,-10*t,0,W,H);
    ctx.restore();
    ctx.save();ctx.globalAlpha=alpha*.22;ctx.fillStyle='#ffd23f';
    ctx.fillRect(Math.max(0,W*(1-t)-2),0,2,H);
    ctx.restore();
  }
  function drawClickPulse(){
    if(!uiPressPoint||!screen||reduceUiMotion())return;
    const t=(performance.now()-uiPressPoint.at)/210;
    if(t>=1)return;
    const r=4+13*t;
    ctx.save();ctx.strokeStyle='rgba(255,226,134,'+(1-t)*.65+')';ctx.lineWidth=2*(1-t)+.6;
    ctx.beginPath();ctx.arc(uiPressPoint.x,uiPressPoint.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  const cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
  const bars = n => '#'.repeat(n) + '.'.repeat(10 - n);

  function btn(x, y, w, h, label, fn, o = {}) {
    const i=btns.length,on=i===focus,fs=o.size||14;
    btns.push({x,y,w,h,fn,adj:o.adj,id:o.id});
    const hover=hoverLevel(x,y,w,h,'button');
    const push=pressedHot(x,y,w,h)&&!reduceUiMotion()?1:0;
    const lift=reduceUiMotion()?0:hover*1.6;
    const dy=push*1.5-lift;
    const base=o.danger?'#ffe0d7':o.secondary?'#e8eef9':'#fff4d6';
    const selected=o.danger?'#ffbdab':'#ffd23f';
    ctx.fillStyle='rgba(3,7,24,.58)';ctx.fillRect(x-2,y+3,w+5,h+3);
    ctx.fillStyle=hover>.02?'#ffbf63':BROWN;ctx.fillRect(x-2,y-2+dy,w+4,h+4);
    ctx.fillStyle=on?selected:hover>.01?'#fffdf4':base;ctx.fillRect(x,y+dy,w,h);
    ctx.fillStyle=o.danger?'#df765f':on?'#ff9f1c':'#e8b47c';ctx.fillRect(x,y+h-3+dy,w,3);
    ctx.fillStyle=on?'#e59a1e':'rgba(56,72,106,.45)';ctx.fillRect(x+3,y+4+dy,3,Math.max(0,h-10));
    if(hover>.02){
      ctx.fillStyle='rgba(255,255,255,'+(.16+hover*.34)+')';
      ctx.fillRect(x+8,y+2+dy,Math.max(0,w-12),2);
    }
    if(o.value!==undefined){
      const value=(on?'< ':'')+o.value+(on?' >':'');
      ctx.font='bold '+fs+'px "Courier New", monospace';
      const vw=Math.min(w*.46,Math.max(49,ctx.measureText(value).width+5));
      txtFit(String(label),x+11,y+dy+h/2,fs,w-vw-21,BROWN,'left',false);
      txtFit(String(value),x+w-9,y+dy+h/2,fs,vw,BROWN,'right',false);
    }else txtFit(String(label),x+w/2,y+dy+h/2,fs,w-16,BROWN,'center',false);
  }


  // A safe header area is reserved for the always-visible coin HUD on phones.
  function titleFitted(label,y,baseSize){
    const width=Math.max(110,W-(L?145:120));
    const x=W/2-(L?0:15);
    let size=baseSize;
    ctx.font='bold '+size+'px "Courier New", monospace';
    while(size>12 && ctx.measureText(label).width>width){
      size--;ctx.font='bold '+size+'px "Courier New", monospace';
    }
    title(label,x,y,size,'#ffd23f','center');
  }

  // Pixel-style panel primitives deliberately use canvas coordinates (scaled by fit()).
  function tile(x,y,w,h,active=false){
    const hover=hoverLevel(x,y,w,h,'card');
    const pressed=pressedHot(x,y,w,h)&&!reduceUiMotion();
    const edge=active?'#ffe284':hover>.02?'#9ddaff':'#5b7496';
    ctx.fillStyle='rgba(2,5,20,.75)';ctx.fillRect(x+3,y+4,w,h);
    ctx.fillStyle=edge;ctx.fillRect(x-1,y-1,w+2,h+2);
    ctx.fillStyle=pressed?'#233957':'#182a49';ctx.fillRect(x+1,y+1,w-2,h-2);
    ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+3,y+3,w-6,3);
    ctx.fillStyle=active?'#ffd23f':'#728bae';ctx.fillRect(x+4,y+4,2,Math.max(0,h-8));
    ctx.fillStyle='rgba(6,12,32,.35)';ctx.fillRect(x+6,y+h-7,Math.max(0,w-12),3);
    if(hover>.04){
      ctx.fillStyle='rgba(190,240,255,'+(hover*.35)+')';
      ctx.fillRect(x+3,y+3,Math.max(0,w-6),2);
    }
  }


  function stripe(x,y,w,color='#ffd23f'){
    ctx.fillStyle=color;ctx.fillRect(x,y,w,3);
    ctx.fillStyle='rgba(255,255,255,.13)';ctx.fillRect(x,y+3,w,1);
  }
  function tag(s,x,y,w,h,active=false,size=9){
    const hover=hoverLevel(x,y,w,h,'tag');
    ctx.fillStyle=active?'#ffd23f':hover>.02?'#41628b':'#304360';
    ctx.fillRect(x,y,w,h);
    if(hover>.03){ctx.fillStyle='rgba(255,255,255,'+(hover*.27)+')';ctx.fillRect(x+2,y+2,w-4,2);}
    txtFit(s,x+w/2,y+h/2,size,w-9,active?BROWN:'#e8f3ff','center',false);
  }


  // Difficulty is chosen right after the map; this replaces the old row in Settings.
  function drawDifficulty() {
    ctx.fillStyle='rgba(11,17,39,.96)';ctx.fillRect(0,0,W,H);
    titleFitted(tr('DIFFICULTY'),27,L?24:23);
    cosmeticLabel(mapLabel(cfg.map),W/2,50,11,W-70,'#d3daea');
    const modes=['EASY','NORMAL','HARD','EXTREME'];
    const bw=L?280:Math.min(W-40,320), bx=Math.round(W/2-bw/2), gap=L?8:12;
    const top=70, bottom=H-50;
    const bh=Math.max(28,Math.min(L?36:44,Math.floor((bottom-top-gap*3)/4)));
    const y0=Math.round(top+(bottom-top-(bh*4+gap*3))/2);
    modes.forEach((d,i)=>{
      const y=y0+i*(bh+gap);
      btn(bx,y,bw,bh,tr(d),()=>{cfg.diff=d;saveCfg();startGame();},{size:L?13:14});
      txtFit(tr('BEST')+' '+(save.best[d]||0),bx+bw-10,y+bh/2,9,Math.max(40,bw*.32),BROWN,'right',false);
    });
    btn(W/2-67,H-36,134,26,tr('BACK'),back,{size:11});
  }

  function startGame() { screen = null; reset(); focus = 0; }
  function toMenu() { reset(); screen = 'MENU'; focus = 0; }
  function back() {
    if(lobbySkinPicker && screen!=='PREVIEW'){const picker=lobbySkinPicker;window.flyingBirdCloseSkinInventory();picker.cancel();return;}
    if (screen === 'SETTINGS') { screen = settingsFrom; resetArmed = false; focus = 0; }
    else if (screen === 'ACH') { screen = 'MENU'; focus = 0; }
    else if (screen === 'MAPS') { screen = 'MENU'; focus = 0; }
    else if (screen === 'DIFFICULTY') { screen = 'MAPS'; focus = 0; }
    else if (screen === 'PREVIEW') { screen=previewReturn; focus=0; }
    else if (screen === 'PROFILE' || screen === 'SHOP' || screen === 'INVENTORY') { screen = 'MENU'; focus = 0; }
    else if (screen === 'PAUSE') screen = null;
  }
  const fullscreenNow = () =>
  !!(document.fullscreenElement || document.webkitFullscreenElement);

function fullscreenUnavailable(unsupported = false) {
  const messages = unsupported && coarsePointer.matches ? {
    EN: 'Use Add to Home Screen for fullscreen',
    RU: 'Для полного экрана: «На экран Домой»',
    ZH: '添加到主屏幕以全屏运行',
    ES: 'Añade a inicio para pantalla completa',
    PT: 'Adicione à tela inicial para tela cheia'
  } : {
    EN: 'Fullscreen unavailable. Try again from the game.',
    RU: 'Полный экран недоступен. Попробуйте ещё раз из игры.',
    ZH: '全屏不可用，请从游戏中重试。',
    ES: 'Pantalla completa no disponible. Inténtalo desde el juego.',
    PT: 'Tela cheia indisponível. Tente novamente no jogo.'
  };

  toasts.push({
    text: messages[cfg.lang] || messages.EN,
    plain: true,
    t: 240
  });
}

let fullscreenPending = false;
function toggleFS() {
  if (fullscreenPending) return;
  const root = document.documentElement;
  const active = fullscreenNow();

  const action = active
    ? (document.exitFullscreen || document.webkitExitFullscreen)
    : (root.requestFullscreen || root.webkitRequestFullscreen);

  if (!action) {
    fullscreenUnavailable(true);
    return;
  }

  try {
    const result = action.call(active ? document : root);

    if (result && result.catch) {
      fullscreenPending = true;
      result.catch(() => fullscreenUnavailable()).finally(() => { fullscreenPending = false; queueFit(); });
    }
  } catch (e) {
    fullscreenUnavailable();
  }
}
  function drawMenu() {
    if (L) {
      title('HIGH', W / 2 - 8, 70, 40, '#ffd23f', 'right');
      title('FLY', W / 2 + 8, 70, 40, '#ff6b9d', 'left');
    } else {
      title('HIGH', W / 2, 105, 48, '#ffd23f', 'center');
      title('FLY', W / 2, 155, 48, '#ff6b9d', 'center');
    }
    drawAvatar(8, 8, 22, profile.av);
    txtFit(profile.nick, 36, 19, 11, 140, '#fff', 'left');
    // Keep the title and the menu in separate vertical bands on both layouts.
    // The former BEST line is intentionally removed from the main menu; records
    // remain available on the difficulty and profile screens.
    const bw = L ? 220 : 200, menuBh = L ? 40 : 30;
    const menuX = i => L ? W / 2 - bw - 10 + (i % 2) * (bw + 20) : W / 2 - bw / 2;
    const menuY = i => L ? 114 + Math.floor(i / 2) * 48 : 190 + i * 32;
    const got = ACH.filter(a => save.ach[a.id]).length;
    btn(menuX(0), menuY(0), bw, menuBh, tr('PLAY'), () => { screen = 'MAPS'; mapPage = Math.floor(Math.max(0,MAP_KEYS.indexOf(cfg.map))/(L?4:3)); focus = 0; });
    btn(menuX(1), menuY(1), bw, menuBh, tr('PROFILE'), () => { screen = 'PROFILE'; profileStatsPage = 0; window.flyingBirdMpStats?.refreshSelf?.(); focus = 0; });
    btn(menuX(2), menuY(2), bw, menuBh, ({EN:'FRIENDS',RU:'ДРУЗЬЯ',ZH:'好友',ES:'AMIGOS',PT:'AMIGOS'})[cfg.lang]||'FRIENDS', () => window.flyingBirdOpenFriends?.());
    btn(menuX(3), menuY(3), bw, menuBh, ({EN:'MULTIPLAYER',RU:'МУЛЬТИПЛЕЕР',ZH:'多人游戏',ES:'MULTIJUGADOR',PT:'MULTIJOGADOR'})[cfg.lang]||'MULTIPLAYER', () => window.flyingBirdOpenMultiplayer?.(), {size: 12});
    btn(menuX(4), menuY(4), bw, menuBh, tr('ACHIEVEMENTS') + ' ' + got + '/' + ACH.length, () => { screen = 'ACH'; focus = 0; }, { size: 12 });
    btn(menuX(5), menuY(5), bw, menuBh, tr('SHOP'), () => { screen = 'SHOP'; focus = 0; });
    btn(menuX(6), menuY(6), bw, menuBh, tr('INVENTORY'), () => { screen = 'INVENTORY'; focus = 0; });
    btn(menuX(7), menuY(7), bw, menuBh, tr('SETTINGS'), () => { settingsFrom = 'MENU'; screen = 'SETTINGS'; focus = 0; });
  }

  // Unified cosmetics catalogue. The legacy numeric skin indices are preserved for cloud-save compatibility.
  let shopTab='BIRDS', inventoryTab='BIRDS', shopPage=0, inventoryPage=0, previewItem=null, shopAnim=0;
  // Rarity metadata is retained for save compatibility, but not shown in the shop UI.
  function cosmeticLabel(str,x,y,size,maxW,color){
    ctx.save();ctx.font='500 '+size+'px Arial, sans-serif';
    while(size>8&&ctx.measureText(str).width>maxW){size--;ctx.font='500 '+size+'px Arial, sans-serif';}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();
  }
  function catalog(tab,inventory=false){
    const all=tab==='BIRDS'?SKINS.map((v,i)=>({id:i,name:v.name,price:v.price||0,rarity:v.rarity||(i<4?'COMMON':'RARE'),kind:'BIRDS',skin:v})):tab==='MAPS'?[...MAP_KEYS.map(id=>({id,name:mapLabel(id),price:SHOP_MAPS.find(m=>m.id===id)?.price||0,rarity:SHOP_MAPS.find(m=>m.id===id)?.rarity||'COMMON',kind:'MAPS'}))]:[{id:'NONE',name:tr('NONE_TRAIL'),price:0,rarity:'COMMON',kind:'TRAILS'},...TRAILS.map(t=>({...t,kind:'TRAILS'}))];
    return inventory?all.filter(item=>itemOwned(item)):all.filter(item=>tab!=='BIRDS'||item.id>=4);
  }
  function itemOwned(item){return item.kind==='BIRDS'?skinOK(item.id):item.kind==='MAPS'?mapOK(item.id):trailOK(item.id);}
  function itemEquipped(item){return item.kind==='BIRDS'?cfg.skin===item.id:item.kind==='MAPS'?cfg.map===item.id:cfg.trail===item.id;}
  let lobbySkinPicker=null,lobbySkinPending=false;
  const lobbySkinBlocked = item => !!(lobbySkinPicker && item.kind==='BIRDS' && lobbySkinPicker.blocked().includes(item.id));
  window.flyingBirdOpenSkinInventory = options => {
    lobbySkinPicker=options;lobbySkinPending=false;inventoryTab='BIRDS';inventoryPage=0;
    screen='INVENTORY';focus=0;toasts.push({text:options.message,plain:true,t:180});
  };
  window.flyingBirdCloseSkinInventory = () => {lobbySkinPicker=null;lobbySkinPending=false;if(screen==='INVENTORY'||screen==='PREVIEW')screen='MENU';};
  async function equipItem(item){
    if(!itemOwned(item)||lobbySkinBlocked(item)||lobbySkinPending)return;
    if(lobbySkinPicker){
      if(item.kind!=='BIRDS')return;
      const picker=lobbySkinPicker;lobbySkinPending=true;
      let accepted=false;try{accepted=await picker.choose(item.id);}finally{lobbySkinPending=false;}
      if(!accepted||picker!==lobbySkinPicker)return;
      lobbySkinPicker=null;screen='MENU';picker.done();
    }
    if(item.kind==='BIRDS'){cfg.skin=item.id;const bundle=SKINS[item.id]?.bundleTrail;if(bundle&&wallet.trails.includes(bundle))cfg.trail=bundle;}
    else if(item.kind==='MAPS'){cfg.map=item.id;initWeather();}
    else cfg.trail=item.id;
    saveCfg();shopAnim=22;tone(520,850,.13,'triangle',.06);
    toasts.push({text:tr('EQUIPPED')+' '+itemName(item),plain:true,t:70});
  }
  function buyItem(item){
    if(itemOwned(item)){equipItem(item);return;}
    if(wallet.coins<item.price){toasts.push({text:tr('NOT_ENOUGH'),plain:true,t:85});tone(180,120,.16,'square',.05);return;}
    wallet.coins-=item.price;
    if(item.kind==='BIRDS'){wallet.owned.push(item.id);const bundle=SKINS[item.id]?.bundleTrail;if(bundle&&!wallet.trails.includes(bundle))wallet.trails.push(bundle);}
    else if(item.kind==='MAPS')wallet.maps.push(item.id);
    else wallet.trails.push(item.id);
    saveWallet();shopAnim=35;tone(660,1320,.2,'triangle',.08);
    toasts.push({text:tr('BUY_SUCCESS')+' '+itemName(item),plain:true,t:90});
  }
  // The same flight path is reused in a small card and a large item preview.
  // Only its visual size changes; equipped effects and ownership are unchanged.
  function drawTrailPreviewScene(id,x,y,w,h,large=false){
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const t=TRAILS.find(t=>t.id===id);
    const colors=t?t.colors:['#91a8d0','#d7e8ff','#91a8d0'];
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#101e42');g.addColorStop(.64,'#24477e');g.addColorStop(1,'#24375e');
    ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    const now=uiMotionTime(),phase=now*.105;
    // Faint parallax stars and air-current streaks keep a blank trail readable.
    for(let i=0;i<13;i++){
      const sx=x+((i*47-now*.18)%(w+25)+w+25)%(w+25);
      const sy=y+6+(i*23)%Math.max(8,h-15);
      ctx.fillStyle=i%3===0?'rgba(255,245,197,.47)':'rgba(193,229,255,.26)';
      ctx.fillRect(sx,sy,i%3===0?2:1,1);
    }
    const by=y+h*.49+Math.sin(phase)*Math.min(h*.045,7);
    const bx=x+w*.77+Math.cos(phase*.57)*Math.min(w*.018,6);
    if(t){
      const step=Math.max(3.5,Math.min(11,w*.032));
      for(let i=0;i<23;i++){
        const px=bx-15-i*step;
        const py=by+Math.sin(phase-i*.54)*(Math.min(10,h*.09))+(i%3-1)*1.3;
        const sz=Math.max(1.5,(large?5:3.8)-i*.115);
        const alpha=Math.max(.12,.94-i*.035);
        if(id==='LIGHTNING'&&i<20){
          ctx.strokeStyle=colors[i%colors.length];ctx.globalAlpha=alpha*.78;
          ctx.lineWidth=Math.max(1.4,sz*.72);
          ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-step*.7,py+(i%2?8:-8));ctx.stroke();
        }else if(NEWTR[id]){
          if(id==='CONSTELLATION'&&i>0){
            const qx=bx-15-(i-1)*step;
            const qy=by+Math.sin(phase-(i-1)*.54)*Math.min(10,h*.09)+((i-1)%3-1)*1.3;
            ctx.strokeStyle='#9cb8ff';ctx.lineWidth=large?1.3:.9;ctx.globalAlpha=alpha*.34;
            ctx.beginPath();ctx.moveTo(qx,qy);ctx.lineTo(px,py);ctx.stroke();ctx.globalAlpha=1;
          }
          trailMark(id,px,py,sz*1.5,i,alpha,now);
        }else{
          ctx.globalAlpha=alpha*.30;
          ctx.fillStyle=colors[(i+1)%colors.length];ctx.fillRect(px-2,py-2,sz+5,sz+5);
          ctx.globalAlpha=alpha;
          ctx.fillStyle=colors[i%colors.length];ctx.fillRect(px,py,sz,sz);
        }
        if(id==='WATER'&&i%4===0){
          ctx.strokeStyle='#b5faff';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(px,py-5,Math.max(1.5,sz*.65),0,Math.PI*2);ctx.stroke();
        }else if(id==='NATURE'&&i%4===0){
          ctx.fillStyle='#c9ff91';ctx.fillRect(px-4,py-4,4,2);ctx.fillRect(px-2,py-6,2,5);
        }else if((id==='GOLDEN'||id==='RAINBOW')&&i%5===0){
          ctx.fillStyle=id==='GOLDEN'?'#fff7cd':colors[(i+2)%colors.length];
          ctx.fillRect(px-4,py,9,1);ctx.fillRect(px,py-4,1,9);
        }else if(id==='FIRE'&&i%4===0){
          ctx.fillStyle='#fff1ae';ctx.fillRect(px-2,py-5,2,4);
        }
      }
    }
    ctx.globalAlpha=1;
    const k=large?Math.min(2,Math.max(1.25,h/110)):Math.min(.98,Math.max(.55,h/67));
    animatedBirdIcon(equippedPreviewSkin(),bx,by,k,{phase:1.7,drift:2,rotBase:-.09});
    if(large){
      // Subtle frame corners help the player read the larger active-effect preview.
      ctx.fillStyle='rgba(219,241,255,.37)';
      ctx.fillRect(x+9,y+9,17,2);ctx.fillRect(x+9,y+9,2,12);
      ctx.fillRect(x+w-26,y+h-11,17,2);ctx.fillRect(x+w-11,y+h-21,2,12);
    }
    ctx.restore();
  }
  function drawTrailIcon(id,x,y,w,h){drawTrailPreviewScene(id,x,y,w,h,false);}


  // Large map preview: detailed static scenery with the actual map-specific obstacle palette.
  // The shop thumbnails intentionally continue to use the compact mapPreview renderer.
  function detailedMapPreview(key,x,y,w,h){
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    mapPreview(key,x,y,w,h,false); // Background only: avoid duplicate bird and pipes.
    const floor=y+h-12;
    // Foreground environment details stay strictly within the preview viewport.
    if(key==='NEON'||key==='CITY'){
      for(let i=0;i<Math.ceil(w/34);i++){
        const bx=x+((i*34)%(w+40))-12,by=floor-19-(i*17%24);
        ctx.fillStyle=key==='NEON'?'#14234c':'#282045';ctx.fillRect(bx,by,20,floor-by);
        ctx.fillStyle=key==='NEON'?'#ff75d5':'#ffcf75';
        for(let k=0;k<3;k++)ctx.fillRect(bx+4+k*5,by+5,2,4);
        if(i%3===0){ctx.fillStyle='#5ee9ef';ctx.fillRect(bx+3,by-3,14,2);}
      }
    }else if(key==='SAKURA'){
      for(let i=0;i<Math.ceil(w/55);i++){
        const tx=x+i*55+15;
        ctx.fillStyle='#73506d';ctx.fillRect(tx,floor-34,5,34);
        for(let j=0;j<5;j++){
          ctx.fillStyle=j%2?'#ffd1e5':'#ff9bc9';
          ctx.beginPath();ctx.arc(tx+(j%3-1)*10,floor-43+Math.floor(j/3)*9,10,0,Math.PI*2);ctx.fill();
        }
      }
      for(let i=0;i<14;i++){ctx.fillStyle=i%2?'#fff1f7':'#ffb7d7';ctx.fillRect(x+((i*31)%(w+12)+w+12)%(w+12),y+14+((i*17)%(Math.max(18,h-34))),3,2);}
    }else if(key==='OCEAN'){
      for(let i=0;i<Math.ceil(w/29);i++){
        const bx=x+10+i*29;
        ctx.fillStyle=i%2?'#46d9ac':'#ff9cad';ctx.fillRect(bx,floor-18,5,18);
        ctx.fillRect(bx-4,floor-14,4,5);ctx.fillRect(bx+5,floor-11,4,5);
        ctx.fillStyle='#b3f8ff';ctx.beginPath();ctx.arc(bx+9+Math.sin(i)*3,y+15+((i*17)%(Math.max(12,h-40))+Math.max(12,h-40))%(Math.max(12,h-40)),3,0,Math.PI*2);ctx.fill();
      }
    }else if(key==='VOLCANO'||key==='VOLCANO_PLUS'){
      for(let i=0;i<Math.ceil(w/24);i++){
        const bx=x+i*24+7;
        ctx.fillStyle='#26131e';ctx.fillRect(bx,floor-7-(i*7%10),12,18);
        ctx.fillStyle='#ff852e';ctx.fillRect(bx+3,floor-4,3,2);
      }
      for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#ffbc47':'#ff6c29';ctx.fillRect(x+((i*41)%(w+15)+w+15)%(w+15),y+((i*17)%(h+15)+h+15)%(h+15),2,3);}
    }else if(key==='COSMIC'){
      for(let i=0;i<Math.ceil(w/42);i++){
        const sx=x+12+i*42,sy=y+18+(i*19)%Math.max(12,h-48);
        ctx.fillStyle='#f9d9ff';ctx.fillRect(sx,sy-3,2,8);ctx.fillRect(sx-3,sy,8,2);
      }
      for(let i=0;i<10;i++){const sx=x+((i*47)%(w+12));const sy=y+10+((i*23)%(Math.max(10,h-30)));ctx.fillStyle='#ffe6a8';ctx.fillRect(sx-2,sy,5,1);ctx.fillRect(sx,sy-2,1,5);}
    }else if(MYTHIC_MAPS.has(key)){
      const accent={TEMPEST:'#c8eeff',ECLIPSE_REALM:'#ffd39b',PRISM:'#e0ffff',CLOCKWORK:'#fce1a8',AURORA:'#b8fff1',NECROPOLIS:'#ffbcc4'}[key];
      for(let i=0;i<Math.ceil(w/30);i++){const px=x+8+i*30,yy=floor-10-(i%4)*2;ctx.fillStyle=accent;ctx.fillRect(px,yy,3,3);if(i%3===0)ctx.fillRect(px-3,yy+2,9,1);}
    }else if(ELITE_MAPS.has(key)){
      // Identifying foreground details for the large static item preview.
      for(let i=0;i<Math.ceil(w/34);i++){
        const px=x+8+i*34,yy=floor-11-(i%3)*3;
        const accent={CELESTIAL:'#ffedb8',CYBERPUNK:'#69faff',MYSTIC:'#baffd7',SHATTERED:'#e2adff'}[key];
        ctx.fillStyle=accent;ctx.fillRect(px,yy,3,4);
        if(i%2===0){ctx.fillRect(px-3,yy+2,9,1);}
      }
    }else if(key==='MOUNTAINS'){
      for(let i=0;i<Math.ceil(w/30);i++){
        const px=x+i*30+8;
        ctx.fillStyle='#194f4b';ctx.fillRect(px,floor-20,3,20);
        ctx.fillRect(px-5,floor-17,13,5);ctx.fillRect(px-3,floor-24,9,6);
        ctx.fillStyle='#f5faff';ctx.fillRect(px-3,floor-24,9,2);
      }
      for(let i=0;i<18;i++){ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(x+((i*27)%(w+14)),y+10+((i*19)%(Math.max(10,h-28))),2,2);}
    }
    const pal=MAPS[key]?.pipes?.[0]||GREEN;
    const gap=Math.max(42,Math.min(90,h*.43));
    const center=y+h*.49;
    const pipeX=x+w*.7;
    drawPreviewPipePair(pal,x,y,w,h,center,gap,pipeX,Math.max(17,Math.min(34,w*.095)));
    animatedBirdIcon(equippedPreviewSkin(),x+w*.29+Math.sin(ticks*.07)*Math.min(12,w*.03),center+Math.sin(ticks*.09)*Math.min(6,h*.035),Math.min(1.08,Math.max(.58,h/150)),{trailId:cfg.trail,drift:4,phase:h*.01});
    ctx.restore();
  }
  function itemArt(item,x,y,w,h){
    if(item.kind==='MAPS')mapPreview(item.id,x,y,w,h);
    else if(item.kind==='TRAILS'){ctx.fillStyle='#172642';ctx.fillRect(x,y,w,h);drawTrailIcon(item.id,x,y,w,h);}
    else {drawBirdPreviewScene(item.skin,x,y,w,h,cfg.trail||'NONE');}
  }
  const specialName = () => ({EN:'SPECIAL',RU:'ОСОБЫЙ',ZH:'特别',ES:'ESPECIAL',PT:'ESPECIAL'})[cfg.lang] || 'SPECIAL';
  function drawCosmetics(inventory){
    const tab=inventory?inventoryTab:shopTab, page=inventory?inventoryPage:shopPage;
    ctx.fillStyle='rgba(11,17,39,.97)';ctx.fillRect(0,0,W,H);
    title(tr(inventory?'INVENTORY':'SHOP'),W/2,23,L?23:22,'#ffd23f','center');
    cosmeticLabel(tr(inventory?'INVENTORY_HINT':'SHOP_HINT'),W/2,44,10,W-82,'#b5c5df');
    const tabs=lobbySkinPicker?['BIRDS']:['BIRDS','MAPS','TRAILS'], tabX=12,tabY=59,tabGap=6, tw=(W-24-tabGap*2)/3;
    tabs.forEach((t,i)=>{
      const x=tabX+i*(tw+tabGap), chosen=t===tab;
      btns.push({x,y:tabY,w:tw,h:27,fn:()=>{
        if(inventory){inventoryTab=t;inventoryPage=0;}else{shopTab=t;shopPage=0;}
        focus=0;
      }});
      const glow=hoverLevel(x,tabY,tw,27,'tab');
      ctx.fillStyle=chosen?'#ffd23f':glow>.02?'#4c6d96':'#354665';ctx.fillRect(x,tabY,tw,27);
      if(chosen)ctx.fillRect(x,tabY+25,tw,3);
      else if(glow>.02){ctx.fillStyle='rgba(186,229,255,'+(glow*.55)+')';ctx.fillRect(x+2,tabY+2,tw-4,2);}
      txtFit(tr(t==='MAPS'?'MAPS_TAB':t),x+tw/2,tabY+14,11,tw-8,chosen?BROWN:'#e9efff','center',false);
    });
    const items=catalog(tab,inventory),cols=L?3:2,per=L?(coarsePointer.matches?3:6):(H>=630?6:4),pages=Math.max(1,Math.ceil(items.length/per));
    const pg=Math.max(0,Math.min(page,pages-1));
    if(inventory)inventoryPage=pg;else shopPage=pg;
    const shown=items.slice(pg*per,(pg+1)*per);
    const rows=Math.max(1,Math.ceil(shown.length/cols)),gap=9,cardX=13,cardTop=103;
    const cw=(W-cardX*2-gap*(cols-1))/cols;
    const available=Math.max(100,H-cardTop-92);
    const ch=Math.max(62,Math.min(L?(per===3?170:116):170,Math.floor((available-gap*(rows-1))/rows)));
    const hBottom=cardTop+rows*ch+(rows-1)*gap;
    const totalOwned=catalog(tab,false).filter(itemOwned).length;
    txtFit(tr('COLLECTION')+'  '+totalOwned+'/'+catalog(tab,false).length,W/2,95,9,W-40,'#aecfe0','center');
    shown.forEach((item,n)=>{
      const x=cardX+(n%cols)*(cw+gap),y=cardTop+Math.floor(n/cols)*(ch+gap);
      const owned=itemOwned(item),equipped=itemEquipped(item),name=itemName(item);
      tile(x,y,cw,ch,equipped);
      const status=lobbySkinBlocked(item)?lobbySkinPicker.taken:equipped?tr('ACTIVE'):owned?tr('OWNED'):tr('COST')+' '+item.price;
      // State and price already appear in the caption below; putting a second
      // badge in the narrow landscape text column obscured long item names.
      if (L && per === 6) {
        // Wide-but-short phone layout: keep name, price and buttons beside the art,
        // instead of squeezing them into 70–80px-tall cards.
        const artW=Math.min(74,Math.floor(cw*.36));
        const rightX=x+artW+12, rightW=cw-artW-18;
        itemArt(item,x+5,y+5,artW,ch-10);
        if(tab==='MAPS')tag(tr('WORLD'),x+7,y+7,Math.min(48,artW-5),14,false,7);
        if(isNew(item))tag(tr('NEW'),x+5+artW-35,y+ch-24,31,14,true,7);
        if(item.kind==='BIRDS'&&item.rarity==='SPECIAL')tag(specialName(),x+7,y+7,Math.min(66,artW-4),14,true,7);
        cosmeticLabel(name,rightX+rightW/2,y+16,11,rightW-5,'#fff');
        cosmeticLabel(tab==='MAPS'?tr('MAP_TYPE'):tab==='TRAILS'?tr('TRAIL_TYPE'):tr('BIRD_TYPE'),rightX+rightW/2,y+29,8,rightW-6,'#8fc0ff');
        cosmeticLabel(status,rightX+rightW/2,y+41,9,rightW-5,equipped?'#ffd23f':owned?'#a7f3ce':'#ffdc98');
        const actionH=per===6&&L?24:30, bY=y+ch-actionH-6,bW=(rightW-5)/2;
        btns.push({x:rightX,y:bY,w:bW,h:actionH,fn:()=>{
          previewItem=item;previewReturn=inventory?'INVENTORY':'SHOP';screen='PREVIEW';focus=0;
        }});
        tag(tr('PREVIEW'),rightX,bY,bW,actionH,false,9);
        btns.push({x:rightX+bW+5,y:bY,w:bW,h:actionH,fn:()=>{
          if(inventory) equipItem(item);else buyItem(item);
        }});
        tag(equipped?'✓':owned?tr('EQUIP'):tr('BUY'),rightX+bW+5,bY,bW,actionH,true,9);
      } else {
        const artH=Math.max(23,Math.min(ch*.45,ch-90));
        itemArt(item,x+5,y+5,cw-10,artH);
        if(tab==='MAPS')tag(tr('WORLD'),x+7,y+7,48,14,false,7);
        if(isNew(item))tag(tr('NEW'),x+cw-44,y+7,36,14,true,7);
        if(item.kind==='BIRDS'&&item.rarity==='SPECIAL')tag(specialName(),x+7,y+7,Math.min(72,cw-14),14,true,8);
        ctx.fillStyle='#1b2d4d';ctx.fillRect(x+5,y+artH+5,cw-10,Math.max(0,ch-artH-10));
        const nameY=y+artH+16;
        cosmeticLabel(name,x+cw/2,nameY,12,cw-13,'#fff');
        cosmeticLabel(tab==='MAPS'?tr('MAP_TYPE'):tab==='TRAILS'?tr('TRAIL_TYPE'):tr('BIRD_TYPE'),x+cw/2,nameY+12,8,cw-14,'#8fc0ff');
        cosmeticLabel(status,x+cw/2,nameY+24,9,cw-12,equipped?'#ffd23f':owned?'#a7f3ce':'#ffdc98');
        const actionH=per===6&&L?24:30, bY=y+ch-actionH-6,bW=(cw-15)/2;
        btns.push({x:x+5,y:bY,w:bW,h:actionH,fn:()=>{
          previewItem=item;previewReturn=inventory?'INVENTORY':'SHOP';screen='PREVIEW';focus=0;
        }});
        tag(tr('PREVIEW'),x+5,bY,bW,actionH,false,9);
        btns.push({x:x+10+bW,y:bY,w:bW,h:actionH,fn:()=>{
          if(inventory) equipItem(item);else buyItem(item);
        }});
        tag(equipped?'✓':owned?tr('EQUIP'):tr('BUY'),x+10+bW,bY,bW,actionH,true,9);
      }
      if(lobbySkinBlocked(item)){ctx.fillStyle='rgba(12,15,30,.45)';ctx.fillRect(x,y,cw,ch);tag(lobbySkinPicker.taken,x+5,y+5,cw-10,18,false,9);}
      if(equipped)stripe(x+1,y+1,cw-2,'#ffd23f');
    });
    if(!items.length){
      const mid=(cardTop+H-90)/2;
      txt('✦',W/2,mid-24,28,'#ffd23f','center',false);
      cosmeticLabel(tr('NO_ITEMS'),W/2,mid+4,13,W-34,'#dbe8f3');
      btn(W/2-82,mid+23,164,27,tr('VIEW_SHOP'),()=>{screen='SHOP';shopTab=tab;shopPage=0;focus=0;},{size:10});
    }
    const navY=Math.max(hBottom+8,H-70);
    btn(14,navY,67,26,'◀',()=>{
      if(inventory)inventoryPage=(pg+pages-1)%pages;else shopPage=(pg+pages-1)%pages;focus=0;
    },{size:11});
    txt((pg+1)+' / '+pages,W/2,navY+13,11,'#eaf0fc','center',false);
    btn(W-81,navY,67,26,'▶',()=>{
      if(inventory)inventoryPage=(pg+1)%pages;else shopPage=(pg+1)%pages;focus=0;
    },{size:11});
    btn(W/2-62,H-36,124,26,tr('BACK'),back,{size:11});
    if(shopAnim>0){ctx.fillStyle='rgba(255,220,90,'+(shopAnim/35*.12)+')';ctx.fillRect(0,0,W,H);}
  }

  function drawShop(){drawCosmetics(false);}
  function drawInventory(){drawCosmetics(true);}
  function drawPreview(){
    if(!previewItem){screen=previewReturn||'SHOP';return;}
    ctx.fillStyle='rgba(11,17,39,.97)';ctx.fillRect(0,0,W,H);
    titleFitted(tr('PREVIEW_ITEM'),27,L?22:20);
    const name=itemName(previewItem);
    cosmeticLabel(name,W/2,56,16,W-35,'#fff');
    const kind=previewItem.kind==='MAPS'?'MAP_TYPE':previewItem.kind==='BIRDS'?'BIRD_TYPE':'TRAIL_TYPE';
    cosmeticLabel(tr(kind)+(previewItem.rarity==='SPECIAL'?' · '+specialName():'')+(previewItem.skin?.bundleTrail?' + STARDUST':''),W/2,74,10,W-45,'#a9bbd6');
    const x=18,y=91,w=W-36,backY=H-38,actionY=backY-41;
    const detailsY=actionY-39;
    const h=Math.max(40,Math.min(L?Math.max(145,Math.min(300,H*.37)):Math.max(300,H*.72),detailsY-y-10));
    tile(x,y,w,h,true);
    if(previewItem.kind==='MAPS')detailedMapPreview(previewItem.id,x+4,y+4,w-8,h-8);
    else if(previewItem.kind==='BIRDS')drawBirdPreviewScene(previewItem.skin,x+4,y+4,w-8,h-8,cfg.trail||'NONE');
    else if(previewItem.kind==='TRAILS')drawTrailPreviewScene(previewItem.id,x+4,y+4,w-8,h-8,true);
    else itemArt(previewItem,x+4,y+4,w-8,h-8);
    stripe(x+1,y+1,w-2,'#ffd23f');
    const owned=itemOwned(previewItem),equipped=itemEquipped(previewItem);
    const status=equipped?tr('ACTIVE'):owned?tr('IN_COLLECTION'):tr('COST')+': '+previewItem.price;
    tag(status,W/2-Math.min(144,(W-35)/2),detailsY,Math.min(288,W-35),24,owned,11);
    btn(W/2-100,actionY,200,29,equipped?tr('EQUIPPED'):owned?tr('EQUIP'):tr('BUY')+'  ● '+previewItem.price,()=>{
      if(owned)equipItem(previewItem);else buyItem(previewItem);
    },{size:12});
    btn(W/2-65,backY,130,27,tr('BACK'),()=>{screen=previewReturn;focus=0;},{size:11});
  }

  let previewReturn='SHOP';

  function drawPause() {
    ctx.fillStyle = 'rgba(15,12,41,0.7)'; ctx.fillRect(0, 0, W, H);
    title(tr('PAUSED'), W / 2, H / 2 - 70, 34, '#ffd23f', 'center');
    const bw = 200, bx = Math.round(W / 2 - bw / 2), y0 = Math.round(H / 2 - 30);
    btn(bx, y0, bw, 32, tr('RESUME'), () => { screen = null; });
    btn(bx, y0 + 42, bw, 32, tr('SETTINGS'), () => { settingsFrom = 'PAUSE'; screen = 'SETTINGS'; focus = 0; });
    btn(bx, y0 + 84, bw, 32, tr('MAIN_MENU'), toMenu);
  }

  function drawSettings() {
    ctx.fillStyle = 'rgba(15,12,41,0.85)'; ctx.fillRect(0, 0, W, H);
    title(tr('SETTINGS'), W / 2, 34, 26, '#ffd23f', 'center');
    const wrap = (n, v, d) => (v + d + n) % n, onoff = v => (v ? tr('ON') : tr('OFF'));
    const rows = [
      [tr('LANGUAGE'), LANG_NAMES[cfg.lang], d => { cfg.lang = cyc(LANGS, cfg.lang, d); }],
      [tr('THEME'), displayValue(cfg.theme), d => { cfg.theme = cyc(['NIGHT', 'DAY', 'AUTO'], cfg.theme, d); }],
      [tr('MUSIC'), cfg.music*10+'%', d => { cfg.music = wrap(11, cfg.music, d); }],
      [tr('SOUND_FX'), cfg.sfx*10+'%', d => { cfg.sfx = wrap(11, cfg.sfx, d); tone(500, 700, 0.08); }],
      [tr('COLOR_MODE'), displayValue(cfg.cb), d => { cfg.cb = cyc(Object.keys(PIPES), cfg.cb, d); }],
      [tr('REDUCE_EFFECTS'), onoff(cfg.fx), () => { cfg.fx = !cfg.fx; }],
      [tr('PARTICLE_QUALITY'), displayValue(cfg.particleQuality), d => { cfg.particleQuality = cyc(['AUTO','HIGH','LOW','OFF'], cfg.particleQuality, d); }],
      [tr('FPS_LIMIT'), cfg.fps === 'MAX' ? tr('MAX') + ' (' + displayHz() + ')' : cfg.fps, d => { const o = fpsOptions(); cfg.fps = cyc(o, o.includes(cfg.fps) ? cfg.fps : 'MAX', d); }],
      [tr('SHOW_FPS'), onoff(cfg.showFps), () => { cfg.showFps = !cfg.showFps; }]
    ];
    rows.push(
      [tr('BIRD_SKIN'), itemName({kind:'BIRDS',name:SKINS[cfg.skin].name}), d => { let i = cfg.skin; do { i = wrap(SKINS.length, i, d); } while (!skinOK(i)); cfg.skin = i; }],
      [
  tr('FULLSCREEN'),
  onoff(
    fullscreenNow() ||
    navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches
  ),
  toggleFS
]
    );
    const total=rows.length+2,cols=L?2:1,per=Math.ceil(total/cols);
    const gutter=L?Math.min(30,W*.045):0;
    const maxWidth=L?Math.min(880,W-44):Math.min(W-40,420);
    const bw=L?(maxWidth-gutter)/2:maxWidth;
    const bx0=(W-maxWidth)/2;
    const gap=L?Math.min(12,Math.max(4,H*.014)):H>610?7:3;
    const maxRh=L?Math.min(54,Math.max(30,H*.09)):Math.min(44,Math.max(29,H*.067));
    const topClear=L?Math.max(64,Math.min(120,H*.13)):Math.max(58,Math.min(86,H*.11));
    const bottomClear=L?Math.max(44,Math.min(88,H*.09)):48;
    const rh=Math.max(24,Math.min(maxRh,Math.floor((H-topClear-bottomClear-gap*(per-1))/per)));
    const blockH=per*rh+(per-1)*gap;
    const y0=Math.max(topClear,Math.floor((H-blockH)/2));
    const h=rh;
    const fs=L?Math.min(14,Math.max(11,W/105)):Math.min(13,Math.max(11,W/27));
    const pos=i=>({x:bx0+Math.floor(i/per)*(bw+gutter),y:y0+(i%per)*(rh+gap)});
    rows.forEach((r,i)=>{
      const q=pos(i);
      btn(q.x,q.y,bw,h,r[0],d=>{r[2](d);saveCfg();},{value:String(r[1]),adj:true,size:fs});
      // Color-coded category rails clarify related options without adding translation strings.
      const stripeColor=i<2?'#69b9e4':i<4?'#ecad60':i<9?'#a68cf5':'#81c8ad';
      ctx.fillStyle=stripeColor;ctx.fillRect(q.x+3,q.y+5,3,Math.max(0,h-10));
    });
    let q=pos(rows.length);
    btn(q.x,q.y,bw,h,resetArmed?tr('PRESS_RESET'):tr('RESET_PROGRESS'),()=>{
      if(!resetArmed){resetArmed=true;return;}
      Object.assign(save,{best:{EASY:0,NORMAL:0,HARD:0,EXTREME:0},games:0,flaps:0,pipes:0,earnedCoins:0,ach:{}});
      cfg.skin=0;profile.av.skin=0;wallet.coins=0;wallet.owned=[];wallet.maps=[];wallet.trails=[];cfg.map='CITY';cfg.trail='NONE';saveProfile();saveWallet();saveGame();saveCfg();resetArmed=false;
    },{id:'reset',size:fs,danger:true});
    q=pos(rows.length+1);
    btn(q.x,q.y,bw,h,tr('BACK'),back,{size:fs,secondary:true});
    const lk = SKINS.find(k => k.need > maxBest());
    if (lk) txt(tr('SKIN_UNLOCK') + ' ' + lk.need, W / 2, H - 14, 9, '#f3e3c7', 'center', false);
  }

  function drawAch() {
    ctx.fillStyle='rgba(15,12,41,.92)';ctx.fillRect(0,0,W,H);
    const got=ACH.filter(a=>save.ach[a.id]).length;
    const wide=L,cols=wide?2:1,per=Math.ceil(ACH.length/cols);
    const maxContent=wide?Math.min(W-40,900):W-40;
    const gapX=wide?18:0;
    const cw=(maxContent-gapX*(cols-1))/cols;
    const left=(W-maxContent)/2;
    const gap=wide?7:5;
    // Reserve the back button's entire hitbox, plus a visible gap, even on 320px screens.
    const rh=Math.min(wide?64:54,Math.max(29,Math.floor((H-122-(per-1)*gap)/per)));
    const blockH=per*rh+(per-1)*gap;
    const startY=Math.max(73,Math.floor((H-blockH)/2)-8);
    title(tr('ACHIEVEMENTS'),W/2,wide?Math.max(30,startY-42):30,wide?24:22,'#ffd23f','center');
    txtFit(got+'/'+ACH.length+'   '+tr('GAMES')+' '+save.games+'   '+tr('FLAPS')+' '+save.flaps,W/2,wide?Math.max(54,startY-17):55,10,W-36,'#e2e9f6','center',false);
    const achKeys={
      first:['FIRST_FLIGHT','FIRST_FLIGHT_DESC'],s5:['ROOKIE','ROOKIE_DESC'],
      s15:['PRO','PRO_DESC'],s30:['MASTER','MASTER_DESC'],s50:['LEGEND','LEGEND_DESC'],
      pink:['PINK_PASSER','PINK_PASSER_DESC'],reg:['REGULAR','REGULAR_DESC'],
      flap:['FLAP_HAPPY','FLAP_HAPPY_DESC'],owl:['NIGHT_OWL','NIGHT_OWL_DESC'],
      early:['EARLY_BIRD','EARLY_BIRD_DESC']
    };
    const best=maxBest();
    const measures={first:[save.games||0,1],s5:[best,5],s15:[best,15],s30:[best,30],s50:[best,50],reg:[save.games||0,25],flap:[save.flaps||0,1000]};
    ACH.forEach((a,i)=>{
      const c=Math.floor(i/per),r=i%per,ok=!!save.ach[a.id];
      const x=left+c*(cw+gapX),y=startY+r*(rh+gap),ch=rh;
      ctx.fillStyle='#080e21';ctx.fillRect(x+2,y+3,cw,ch);
      ctx.fillStyle=ok?'#fff0cf':'#22314f';ctx.fillRect(x,y,cw,ch);
      ctx.fillStyle=ok?'#ffd23f':'#61769b';ctx.fillRect(x,y,5,ch);
      ctx.fillStyle=ok?'#8f6322':'#344b70';ctx.fillRect(x+5,y,cw-5,2);
      const iconW=25;
      ctx.fillStyle=ok?'#ffd23f':'#344768';ctx.fillRect(x+11,y+8,iconW,iconW);
      txt(ok?'✓':'•',x+11+iconW/2,y+8+iconW/2,16,ok?BROWN:'#bfcee4','center',false);
      const textX=x+44;
      txtFit(tr(achKeys[a.id][0]),textX,y+15,wide?13:12,cw-51,ok?BROWN:'#f3f5fc','left',false);
      txtFit(tr(achKeys[a.id][1]),textX,y+rh-15,wide?10:9,cw-52,ok?'#6b4a1a':'#becce0','left',false);
      const measure=measures[a.id];
      if(measure){
        const progress=Math.max(0,Math.min(1,measure[0]/measure[1]));
        const pw=Math.max(0,cw-50);
        ctx.fillStyle=ok?'#d8b98b':'#172743';ctx.fillRect(textX,y+rh-5,pw,2);
        ctx.fillStyle=ok?'#9f6a18':'#9bd2ff';ctx.fillRect(textX,y+rh-5,pw*progress,2);
      }
    });
    btn(W/2-70,H-39,140,28,tr('BACK'),back,{size:12,secondary:true});
  }

  function drawUI() {
    btns = [];
    const blink = Math.floor(ticks / 30) % 2 === 0;

    // The account shortcut belongs exclusively to the main menu.
    const accountShortcut=document.getElementById('accountBtn');
    if(accountShortcut) accountShortcut.hidden = screen !== 'MENU';
    if (window.__flyingBirdAccountScreen !== screen) {
      window.__flyingBirdAccountScreen = screen;
      window.dispatchEvent(new CustomEvent('flyingbird:screen-change', { detail: { screen } }));
    }
    if (screen === 'MENU') drawMenu();

    if (state === 'READY' && !screen) {
      const py = L ? 250 : 320;
      if (blink) txt(tr('SPACE_CLICK_TAP'), W / 2, py, cfg.lang === 'EN' ? 16 : 12);
      txt(tr('BEST') + ' ' + bestNow(), W / 2, py + 30, 16);
    }

    if (state === 'PLAYING' || state === 'DEAD') {
      const s = 1 + pop * 0.35;
      ctx.save(); ctx.translate(W / 2, 50); ctx.scale(s, s);
      txt(String(score), 0, 0, 44);
      ctx.restore();
      if (state === 'PLAYING' && !screen) {   // tap-able pause icon (for touch screens)
        ctx.fillStyle = 'rgba(26,16,51,0.6)'; ctx.fillRect(8, 8, 22, 22);
        ctx.fillStyle = '#fff'; ctx.fillRect(14, 13, 4, 12); ctx.fillRect(22, 13, 4, 12);
      }
    }

    if (state === 'GAMEOVER' && !screen) {
      const w = 230, h = 200, x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - 120);
      panel(x, y, w, h);
      txt(tr('GAME_OVER'), W / 2, y + 34, 20, BROWN, 'center', false);
      txt(tr('SCORE') + ' ' + score, W / 2, y + 68, 16, BROWN, 'center', false);
      txt(tr('BEST') + '  ' + bestNow() + (newBest ? ' ' + tr('NEW') : ''), W / 2, y + 92, 15, BROWN, 'center', false);
      txt(tr('RANK') + '  ' + displayValue(rank()), W / 2, y + 116, 16, BROWN, 'center', false);
      if (performance.now() - overAt > 450) {
        btn(x + 14, y + 148, 96, 30, tr('RETRY'), startGame, { size: 12 });
        btn(x + w - 110, y + 148, 96, 30, tr('MENU'), toMenu, { size: 12 });
      }
    }

    if (screen === 'PAUSE') drawPause();
    if (screen === 'SETTINGS') drawSettings();
    if (screen === 'ACH') drawAch();
    if (screen === 'MAPS') drawMaps();
    if (screen === 'DIFFICULTY') drawDifficulty();
    if (screen === 'PROFILE') drawProfile();
    if (screen === 'SHOP') drawShop();
    if (screen === 'INVENTORY') drawInventory();
    if (screen === 'PREVIEW') drawPreview();

    if (screen === 'MENU' || (!screen && state !== 'GAMEOVER'))
      txt(tr('PAUSE_HINT') + '  M: ' + (cfg.muted ? tr('UNMUTE') : tr('MUTE')) + '  ' + tr('FULLSCREEN_HINT'), W / 2, H - 14, 8, '#f3e3c7', 'center', false);

    if (toasts.length) {
      const t = toasts[0], k = Math.min(1, ((t.duration || (t.duration = t.t)) - t.t) / 12, t.t / 12), w = 220, y = Math.round(H + 4 - 46 * k), x = Math.round(W / 2 - w / 2);
      ctx.fillStyle = BROWN; ctx.fillRect(x - 2, y - 2, w + 4, 28);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y, w, 24);
      txtFit((t.plain ? '' : tr('ACHIEVEMENT_TOAST') + ': ') + t.text, W / 2, y + 12, 10, w-12, BROWN, 'center',false);
    }
    // HUD: reserve the coin's entire diameter + a gap before the digits.
    // Shift the coin left as the balance grows instead of letting text overlap it.
    const balanceNumber = Math.max(0, Math.floor(Number(wallet.coins) || 0));
    let balanceText = String(balanceNumber);
    let coinFont = 12;
    const textLimit = Math.min(155, W * 0.42);
    ctx.font = 'bold ' + coinFont + 'px "Courier New", monospace';
    while (coinFont > 9 && ctx.measureText(balanceText).width > textLimit) {
      coinFont--;
      ctx.font = 'bold ' + coinFont + 'px "Courier New", monospace';
    }
    // Extremely large developer balances use a short label, rather than clipping the HUD.
    if (ctx.measureText(balanceText).width > textLimit) {
      balanceText = balanceNumber.toExponential(2);
    }
    const labelWidth = ctx.measureText(balanceText).width;
    const rightEdge = W - 10;
    const coinScale = .72, coinRadius = 14 * coinScale;
    const coinCenter = rightEdge - labelWidth - 4 - coinRadius;
    ctx.save();ctx.translate(coinCenter,18);ctx.scale(coinScale,coinScale);
    drawCoin(0, 0, {static: true});ctx.restore();
    txt(balanceText, rightEdge, 18, coinFont, '#fff2a6', 'right');
    if (cfg.showFps) {
      // Second number = the longest gap between two drawn frames in the last ~second.
      const ratio = fpsExpect > 0 ? worstShown / fpsExpect : 0;
      txt('FPS ' + fpsShown + ' | ' + (worstShown ? Math.round(worstShown) : '-') + 'ms', W - 8, 39, 10,
        ratio > 2.2 ? '#ff6b6b' : ratio > 1.5 ? '#ffd23f' : '#9fe870', 'right');
    }
    if (focus >= btns.length) focus = 0;
  }

  function draw() {
    if (window.flyingBirdMpRaceActive) return; // Multiplayer renderer owns the visible scene.
    beginScreenTransition();
    ctx.save();
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    drawMapDetail();
    drawAtmos();
    for (const p of pipes) {
      drawPipe(p);
      if (!p.coinTaken) drawCoin(p.x + PW / 2, p.top + p.gap / 2);
    }
    drawGround();
    drawParticles();
    if(cfg.trail==='CONSTELLATION')constellationLinks(trailParticles);
    for(const p of trailParticles){if(p.k&&NEWTR[p.k])trailMark(p.k,p.x,p.y,p.size,p.i,Math.max(0,p.life/p.max),ticks);else{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,p.size,p.size);}}
    ctx.globalAlpha=1;
    drawBird();
    ctx.restore();
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
    drawUI();
    drawScreenTransition();
    drawClickPulse();
  }

  // ---------- Input ----------
  // A resize or rotation can invalidate last frame's canvas button rectangles.
  // Refresh hitboxes before dispatching a pointer; never dispatch with stale geometry.
  let uiHitboxesStale = false;
  const pt = e => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height || !Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return null;
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  };
  const hit = p => btns.findIndex(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
  function press(i) {
    const b = btns[i];
    if (!b) return;
    if (b.id !== 'reset') resetArmed = false;
    b.fn(1);
  }
  function pointer(p) {
    if (!p || window.flyingBirdMpRaceActive) return;
    if (uiHitboxesStale) {uiHitboxesStale=false;draw();}
    initAudio();
    uiHoverPoint={...p,touch:true,at:performance.now()};
    uiPressPoint={...p,at:performance.now()};
    if (editing) { endNick(true); return; }
    const i = hit(p);
    if (i >= 0) { focus = i; press(i); return; }
    if (screen || state === 'GAMEOVER') return;
    if (state === 'PLAYING' && p.x < 36 && p.y < 36) { screen = 'PAUSE'; focus = 0; return; }
    act();
  }
  // Unified pointer handling avoids duplicate synthetic mouse clicks after a touch.
  canvas.addEventListener('pointerdown', e => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    canvas.focus({preventScroll:true});
    pointer(pt(e));
  }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    if(e.pointerType === 'touch') return;
    const point=pt(e);if(!point)return;
    uiHoverPoint={...point,touch:false,at:performance.now()};
    if(uiHitboxesStale){uiHitboxesStale=false;draw();}
    const i=hit(point);if(i>=0)focus=i;
  });
  canvas.addEventListener('pointerleave',()=>{uiHoverPoint=null;});
  canvas.addEventListener('pointercancel',()=>{uiHoverPoint=null;});

  window.addEventListener('keydown', e => {
    if (window.flyingBirdMpRaceActive || editing ||
        e.target.closest?.('input, textarea, select, button, [contenteditable="true"]') ||
        document.querySelector('[role="dialog"]:not([hidden])')) return;
    const k = e.code, nav = screen || state === 'GAMEOVER', n = btns.length || 1;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'KeyW', 'KeyS'].includes(k)) e.preventDefault();
    if (e.repeat && !(nav && (k === 'ArrowLeft' || k === 'ArrowRight'))) return;
    initAudio();
    if (k === 'KeyM') { cfg.muted = !cfg.muted; saveCfg(); return; }
    if (k === 'KeyF') { toggleFS(); return; }
    if (nav) {
      const b = btns[focus];
      if (k === 'ArrowUp' || k === 'KeyW') focus = (focus - 1 + n) % n;
      else if (k === 'ArrowDown' || k === 'KeyS') focus = (focus + 1) % n;
      else if ((k === 'ArrowLeft' || k === 'ArrowRight') && b && b.adj) { resetArmed = false; b.fn(k === 'ArrowLeft' ? -1 : 1, true); }
      else if (k === 'Space' || k === 'Enter') press(focus);
      else if (k === 'Escape' || k === 'KeyP') { if (screen) back(); else toMenu(); }
      return;
    }
    if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter') act();
    else if ((k === 'Escape' || k === 'KeyP') && state === 'PLAYING') { screen = 'PAUSE'; focus = 0; }
  });
  window.flyingBirdPauseForOverlay=()=>{if(state==='PLAYING'&&!screen){screen='PAUSE';focus=0;}};
  window.addEventListener('blur', () => { if (state === 'PLAYING' && !screen) { screen = 'PAUSE'; focus = 0; } });

  // ---------- Sizing: picks portrait or 16:9 by window shape ----------
  function fit() {
  const viewport = window.visualViewport;
  const css = getComputedStyle(document.body);

  const left = parseFloat(css.paddingLeft) || 0;
  const right = parseFloat(css.paddingRight) || 0;
  const top = parseFloat(css.paddingTop) || 0;
  const bottom = parseFloat(css.paddingBottom) || 0;

  // During text entry, the visual viewport shrinks to the keyboard.
  // Keep the game canvas at its original size and move only the input.
  if (editing) { positionNicknameInput(); return; }
  if (document.activeElement?.matches('input, textarea, select')) return;

  const box = document.body.getBoundingClientRect();
  const vw = Math.max(1, box.width - left - right);
  const vh = Math.max(1, box.height - top - bottom);

  const mobile = window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('mobile', mobile);

  const land = vw / vh >= 1.15;

  let width = land ? 640 : 320;
  let height = land ? 360 : 480;
  let scale;

  if (mobile) {
    // Portrait fills phone width; landscape uses a stable 16:9 canvas,
    // preventing ultra-wide layouts and clipped menus on rotated devices.
    scale = Math.min(vw / width, vh / height);
    if (!land) {
      width = vw / scale;
      height = vh / scale;
    }
  } else {
    scale = Math.min(vw / (width + 8), vh / (height + 8));
  }

  if (
    !editing &&
    (
      L === null ||
      land !== L ||
      Math.abs(W - width) > 0.01 ||
      Math.abs(H - height) > 0.01
    )
  ) {
    layout(land, width, height);
  }

  const r = Math.min(Math.max(1, scale * Math.min(devicePixelRatio || 1, 2)),
    Math.sqrt(4200000 / (W * H)));

  const backingW = Math.round(W * r), backingH = Math.round(H * r);
  if (canvas.width !== backingW || canvas.height !== backingH) {
    canvas.width = backingW; canvas.height = backingH;
  }
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  // The HTML account button needs the true logical width (portrait can vary).
  canvas.dataset.logicalWidth = String(W);
  canvas.dataset.logicalHeight = String(H);
  uiHitboxesStale = true;

  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
  window.dispatchEvent(new Event('flyingbird:layout'));
}

let fitQueued = false;
function queueFit() {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fit(); });
}
window.addEventListener('resize', queueFit);
window.addEventListener('orientationchange', () => requestAnimationFrame(fit));
document.addEventListener('fullscreenchange', fit);
document.addEventListener('webkitfullscreenchange', fit);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => editing ? positionNicknameInput() : queueFit());
  window.visualViewport.addEventListener('scroll', positionNicknameInput);
}

fit();

  // ---------- Loop ----------
  // The simulation always runs at a fixed 60 updates/sec (same physics for everyone, which multiplayer needs).
  // The FPS limit only changes how often we draw.
  //  * ~60 Hz display: "locked" mode. Exactly one physics step per frame (no 0/2-step beat that looked
  //    like stutter), drawn without interpolation, so there is no extra input latency.
  //  * Any other refresh rate (90/120/144...): fixed steps + interpolation between them.
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0, nextDraw = 0, fpsN = 0, fpsT = last, fpsShown = 0;
  let worstCur = 0, worstPrev = 0, worstShown = 0, fpsExpect = 0, lastDrawAt = 0;
  let activeFpsCap = cfg.fps, loopRaf = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(loopRaf); loopRaf = 0;
      if (state === 'PLAYING' && !screen) { screen = 'PAUSE'; focus = 0; }
      if (AC?.state === 'running') AC.suspend().catch(() => {});
    } else {
      last = performance.now(); acc = 0; nextDraw = last;
      fpsT = last; fpsN = 0; lastDrawAt = 0;
      worstCur = worstPrev = worstShown = 0;
      dtHist.length = 0; refreshDt = 0; locked = false;
      if (!loopRaf) loopRaf = requestAnimationFrame(loop);
    }
  });
  const dtHist = []; let refreshDt = 0, locked = false;

  // Real display refresh (what the browser delivers), snapped to common values.
  function displayHz() {
    const hz = refreshDt > 0 ? 1000 / refreshDt : 60;
    for (const k of [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240, 360]) if (Math.abs(hz - k) / k < 0.04) return k;
    return Math.round(hz);
  }
  // Only limits that divide the refresh rate evenly (e.g. 120 Hz -> 60, 40, 30) give even frame pacing.
  function fpsOptions() {
    const hz = displayHz(), list = ['MAX', String(hz)];
    if (cfg.fps !== 'MAX' && !list.includes(cfg.fps)) list.push(cfg.fps);
    for (let k = 2; k <= 4; k++) { const v = String(Math.round(hz / k)); if (+v >= 30 && !list.includes(v)) list.push(v); }
    return list;
  }

  const prev = { by: 0, br: 0, gx: 0, bx: 0 };
  function snap() {
    prev.by = bird.y; prev.br = bird.rot; prev.gx = groundX; prev.bx = bgX;
    for (const p of pipes) { p.px = p.x; p.pt = p.top; }
    for (const q of particles) { q.ox = q.x; q.oy = q.y; }
    for (const w of weather) { w.ox = w.x; w.oy = w.y; }
  }
  const lerp = (a, b, t) => (a === undefined || Math.abs(b - a) > 60 ? b : a + (b - a) * t);
  function drawInterp(a) {
    if (a >= 1 || a <= 0) { draw(); return; }
    const sv = { by: bird.y, br: bird.rot, gx: groundX, bx: bgX };
    const ps = pipes.map(p => [p.x, p.top]), qs = particles.map(q => [q.x, q.y]), ws = weather.map(w => [w.x, w.y]);
    bird.y = lerp(prev.by, bird.y, a); bird.rot = lerp(prev.br, bird.rot, a);
    groundX = lerp(prev.gx, groundX, a); bgX = lerp(prev.bx, bgX, a);
    pipes.forEach(p => { p.x = lerp(p.px, p.x, a); p.top = lerp(p.pt, p.top, a); });
    particles.forEach(q => { q.x = lerp(q.ox, q.x, a); q.y = lerp(q.oy, q.y, a); });
    weather.forEach(w => { w.x = lerp(w.ox, w.x, a); w.y = lerp(w.oy, w.y, a); });
    try { draw(); } finally {
      bird.y = sv.by; bird.rot = sv.br; groundX = sv.gx; bgX = sv.bx;
      pipes.forEach((p, i) => { p.x = ps[i][0]; p.top = ps[i][1]; });
      particles.forEach((q, i) => { q.x = qs[i][0]; q.y = qs[i][1]; });
      weather.forEach((w, i) => { w.x = ws[i][0]; w.y = ws[i][1]; });
    }
  }
  function loop(now) {
    if (document.hidden) { loopRaf = 0; return; }
    const raw = now - last;
    last = now;
    // In multiplayer the shared Canvas renderer runs its own animation loop.
    // Do not simulate/redraw the hidden solo world at the same time.
    if (window.flyingBirdMpRaceActive) {
      acc=0;
      loopRaf = requestAnimationFrame(loop);
      return;
    }
    // After a long stall (tab switch) do not replay the lost time as a burst of physics steps.
    const dt = raw > 100 ? STEP : Math.max(0, raw);

    // Track the display's real frame interval (low percentile of recent rAF gaps, so slow frames do not skew it).
    if (raw > 3 && raw < 50) {
      dtHist.push(raw); if (dtHist.length > 30) dtHist.shift();
      if (dtHist.length >= 20) refreshDt = [...dtHist].sort((x, y) => x - y)[Math.floor(dtHist.length * 0.2)];   // low percentile: drops only make frames longer
    }
    const wasLocked = locked;
    if (refreshDt > 0) {
      if (!locked && Math.abs(refreshDt - STEP) < 1.5) locked = true;
      else if (locked && Math.abs(refreshDt - STEP) > 2.5) locked = false;
    }
    if (locked !== wasLocked) acc = 0;
    // Preserve the chosen cap across displays and temporary refresh-rate changes.

    acc += dt;
    if (locked) {
      const n = Math.min(6, Math.max(0, Math.round(acc / STEP)));
      for (let i = 0; i < n; i++) { snap(); update(); }
      acc -= n * STEP;
      if (Math.abs(acc) > STEP) acc = 0;   // safety resync
    } else {
      while (acc >= STEP) { snap(); update(); acc -= STEP; }
    }

    const requestedCap = cfg.fps === 'MAX' ? 0 : 1000 / Number(cfg.fps);
    // Menus never need 120/240 renders per second; physics still ticks at 60 Hz.
    const cap = screen ? Math.max(requestedCap, 1000 / 60) : requestedCap;
    if (cfg.fps !== activeFpsCap) {
      activeFpsCap = cfg.fps;
      nextDraw = now; // switching limits must not inherit an old deadline
      fpsN = 0;
      fpsT = now;
      worstCur = worstPrev = worstShown = 0;
    }
    // Half a refresh interval of tolerance: a frame that arrives a hair early is still "on time".
    const tol = cap ? Math.max(0.35, Math.min(refreshDt || 0, cap) * 0.5) : 0;
    if (!cap || now + tol >= nextDraw) {
      if (locked) draw(); else drawInterp(acc / STEP);
      fpsN++;
      if (lastDrawAt) { const gap = now - lastDrawAt; if (gap < 250 && gap > worstCur) worstCur = gap; }
      lastDrawAt = now;
      if (cap) {
        nextDraw += cap;
        if (nextDraw < now - cap) nextDraw = now + cap;
      } else nextDraw = now;
    }
    if (now - fpsT >= 500) {
      fpsShown = Math.round(fpsN * 1000 / (now - fpsT));
      worstShown = Math.max(worstCur, worstPrev);
      worstPrev = worstCur; worstCur = 0;
      fpsExpect = cap ? Math.max(cap, refreshDt || 0) : (refreshDt || STEP);
      fpsN = 0;
      fpsT = now;
    }
    loopRaf = requestAnimationFrame(loop);
  }


  // Multiplayer art bridge: reuse EXACT solo map, atmosphere, pipe, bird-skin and trail
  // drawing functions, without changing physics, save files, equipped cosmetics or UI.
  // A synchronous canvas copy makes it safe to keep the main game in its original IIFE.
  // Multiplayer particles use the SAME trail palette and specialised trailMark()
  // renderer as the solo mode, with persistent particles instead of a static preview.
  const multiplayerTrailTracks = new Map();
  let multiplayerTrailSession = null, multiplayerTrailFrame = 0;
  function drawMultiplayerTrails(scene, g) {
    const session = String(scene.matchId||'')+':'+scene.world.w+'x'+scene.world.h;
    if(session!==multiplayerTrailSession){multiplayerTrailTracks.clear();multiplayerTrailSession=session;multiplayerTrailFrame=0;}
    const now=performance.now();
    const dt=multiplayerTrailFrame?Math.max(.2,Math.min(3,(now-multiplayerTrailFrame)/16.667)):1;
    multiplayerTrailFrame=now;
    const enabled=!cfg.fx&&cfg.particleQuality!=='OFF';
    const quality=particleLevel();
    const present = new Set();
    for(const player of scene.birds||[]){
      if(!player.id)continue;
      const id=String(player.id),type=String(player.trail||'NONE');present.add(id);
      let track=multiplayerTrailTracks.get(id);
      if(!track){track={particles:[],emission:0,type};multiplayerTrailTracks.set(id,track)}
      if(track.type!==type){track.particles=[];track.emission=0;track.type=type}
      const def=TRAILS.find(t=>t.id===type);
      for(const particle of track.particles){
        particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;
        advanceTrailParticle(particle,dt);
      }
      track.particles=track.particles.filter(p=>p.life>0);
      if(enabled&&def&&player.active!==false){
        const premium=PREMIUM_TRAIL_IDS.has(type);
        track.emission+=(ELITE_TRAIL_IDS.has(type)?Math.max(.55,quality*.52):premium?Math.max(.7,quality*.67):quality)*dt;
        const count=Math.min(9,Math.floor(track.emission));track.emission-=count;
        for(let i=0;i<count;i++){
          if(type==='HEART'&&Math.random()<.5)continue;
          const life=premium?23+Math.random()*15:17+Math.random()*16;
          track.particles.push({x:player.x-4+Math.random()*3,y:player.y+8+(Math.random()-.5)*(premium?7:9),
            vx:-1.3-Math.random()*1.5,vy:(Math.random()-.5)*1.2,
            life,max:life,col:def.colors[Math.floor(Math.random()*def.colors.length)],
            size:premium?3+Math.random()*2.1:2+Math.random()*3,k:type,i:Math.floor(now/16)+i,
            opacity:Math.max(0,Math.min(1,Number(player.alpha??1)))});
        }
        const maxPerBird=ELITE_TRAIL_IDS.has(type)?(quality===1?28:quality===2?42:56):120;
        if(track.particles.length>maxPerBird)track.particles.splice(0,track.particles.length-maxPerBird);
      }
      if(type==='CONSTELLATION')constellationLinks(track.particles);
      for(const p of track.particles){
        const alpha=Math.max(0,p.life/p.max)*p.opacity;
        if(NEWTR[p.k])trailMark(p.k,p.x,p.y,p.size,p.i,alpha,ticks);
        else{
          g.globalAlpha=alpha;g.fillStyle=p.col;
          g.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.round(p.size)),Math.max(1,Math.round(p.size)));
          // A subtle inner sparkle makes classic trails match the lively solo particle effect.
          if(p.size>=3&&p.i%3===0){g.globalAlpha=alpha*.5;g.fillStyle='#fff';g.fillRect(Math.round(p.x)+1,Math.round(p.y)+1,1,1)}
          g.globalAlpha=1;
        }
      }
    }
    for(const [id,track] of multiplayerTrailTracks)if(!present.has(id)){multiplayerTrailTracks.delete(id)}
    g.globalAlpha=1;
  }
  window.flyingBirdMultiplayerArt = function(scene, destination) {
    if (!scene || !destination || !scene.world || !MAPS[scene.map]) return false;
    const keep={W,H,GROUND,L,ticks,bgX,groundX,map:cfg.map,ctx};
    const world=scene.world;
    try {
      W=world.w; H=world.h; GROUND=world.ground; L=world.layout==='LANDSCAPE';
      ticks=Math.max(0,Math.floor(scene.tick||0));
      bgX=Number(scene.distance)||0; groundX=bgX*.82;
      cfg.map=scene.map;
      ctx=destination;
      const g=ctx;
      g.save();
      try {
        g.setTransform(destination.canvas.width/world.w,0,0,destination.canvas.height/world.h,0,0);
        g.imageSmoothingEnabled=false;
        g.clearRect(0,0,W,H);
        drawBackground();drawMapDetail();drawAtmos();
        for(const pipe of (scene.pipes||[]))drawPipe(pipe);
        drawGround();
        drawMultiplayerTrails(scene,g);
        for(const player of (scene.birds||[])){
          const sk=SKINS[Math.max(0,Math.min(SKINS.length-1,Math.floor(Number(player.skin)||0)))];
          g.save();
          g.globalAlpha=Math.max(0,Math.min(1,Number(player.alpha)||1));
          g.translate(Math.round(player.x+10),Math.round(player.y+8));
          g.rotate(Math.max(-.65,Math.min(1.2,Number(player.rotation)||0)));
          birdShapes(sk,(Math.floor(ticks/5)%3-1)*3);
          g.restore();
        }
          } finally {g.restore();}
      destination.imageSmoothingEnabled=false;
      return true;
    } catch(e){console.warn('[High Fly] Multiplayer art:',e);return false;}
    finally {ctx=keep.ctx;W=keep.W;H=keep.H;GROUND=keep.GROUND;L=keep.L;ticks=keep.ticks;bgX=keep.bgX;groundX=keep.groundX;cfg.map=keep.map;}
  };

  loopRaf = requestAnimationFrame(loop);
})();
