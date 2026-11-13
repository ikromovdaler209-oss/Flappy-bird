// Decorative Ultra pass. All geometry is behind obstacles and players.
// Counts are bounded; effects are calculated from scene time without particle queues.
(() => {
  const themes = Object.freeze({
    CITY: ['#ffd99b', 'dust'],
    MOUNTAINS: ['#d5f3ff', 'snow'],
    VOLCANO: ['#ff9c53', 'ember'],
    SAKURA: ['#ffc6df', 'petal'],
    NEON: ['#70edff', 'rain'],
    OCEAN: ['#9bf5ff', 'bubble'],
    VOLCANO_PLUS: ['#ffcc68', 'ash'],
    COSMIC: ['#ded2ff', 'star'],
    FOREST: ['#c3f18e', 'firefly'],
    CRYSTAL: ['#a3f5ff', 'shard'],
    DESERT: ['#ffdf9c', 'sand'],
    CELESTIAL: ['#fff0b8', 'feather'],
    CYBERPUNK: ['#ff98e9', 'data'],
    MYSTIC: ['#a0ffda', 'spore'],
    SHATTERED: ['#d5b4ff', 'rock'],
    TEMPEST: ['#b8deff', 'rain'],
    ECLIPSE_REALM: ['#ffc685', 'cinder'],
    PRISM: ['#b5ffff', 'prism'],
    CLOCKWORK: ['#ffe0a0', 'steam'],
    AURORA: ['#9dffe3', 'snow'],
    NECROPOLIS: ['#b8cbbf', 'wisp']
  });
  const mod = (value, span) => ((value % span) + span) % span;

  function draw(g, scene) {
    const theme = themes[scene.map];
    if (scene.quality !== 'ULTRA' || !theme || scene.highContrast) return;
    const w = Number(scene.w), h = Number(scene.ground);
    if (!(w > 0 && h > 0)) return;
    const frozen = scene.staticCard || scene.reducedMotion || scene.effects === false;
    const time = frozen ? 0 : Math.max(0, Number(scene.tick) || 0);
    const distance = frozen ? 0 : Math.max(0, Number(scene.distance) || 0);
    const [accent, effect] = theme;
    const scale = Math.min(1.3, Math.max(.35, h / 312));
    const line = (x, y, x2, y2, width = 1) => {
      g.lineWidth = width;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    };
    const circle = (x, y, radius) => {
      g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.stroke();
    };
    const diamond = (x, y, radius) => {
      g.beginPath(); g.moveTo(x, y - radius); g.lineTo(x + radius * .55, y);
      g.lineTo(x, y + radius); g.lineTo(x - radius * .55, y); g.closePath(); g.fill();
    };

    g.save();
    try {
      g.beginPath(); g.rect(0, 0, w, h); g.clip();
      g.fillStyle = accent; g.strokeStyle = accent;
      // Keep landmark detail around the horizon and soft light in the upper sky.
      const skyLandmark = ['COSMIC', 'ECLIPSE_REALM'].includes(scene.map);
      const count = skyLandmark ? 2 : Math.min(10, Math.max(3, Math.ceil(w / (130 * scale))));
      for (let i = 0; i < count; i++) {
        const x = mod(i * w / count - distance * .13, w + 40 * scale) - 20 * scale;
        const y = h - (18 + i % 3 * 9) * scale;
        const unit = scale;
        g.save();
        g.translate(x, y); g.scale(unit, unit);
        g.globalAlpha = .44;
        switch (scene.map) {
          case 'CITY':
            line(0, 0, 0, -36); line(0, -36, 13, -36);
            g.fillRect(10, -35, 6, 3);
            g.globalAlpha = .08;
            g.beginPath(); g.moveTo(13, -32); g.lineTo(-4, 12); g.lineTo(30, 12); g.fill();
            break;
          case 'MOUNTAINS':
            line(-20, 8, 0, -24); line(0, -24, 22, 8);
            line(-7, -12, 0, -16); line(0, -16, 7, -12);
            g.fillRect(-18, 9, 43, 2);
            break;
          case 'VOLCANO':
            line(-20, 8, -3, 2, 2); line(-3, 2, 7, -10, 2); line(7, -10, 21, -4, 2);
            g.globalAlpha = .09; g.fillRect(-20, 4, 42, 7);
            break;
          case 'SAKURA':
            line(0, 10, 0, -24); line(0, -12, -12, -24); line(0, -8, 16, -20);
            for (let j = 0; j < 5; j++) {
              g.beginPath(); g.ellipse((j - 2) * 8, -24 - j % 2 * 6, 8, 5, .3, 0, Math.PI * 2); g.fill();
            }
            break;
          case 'NEON':
            g.strokeRect(-15, -40, 30, 30);
            line(-11, -32, 9, -32, 2); line(-11, -25, 4, -25, 2);
            g.globalAlpha = .12; g.fillRect(-15, 7, 30, 3); g.fillRect(-10, 12, 20, 2);
            break;
          case 'OCEAN':
            for (let j = 0; j < 3; j++) {
              const sway = Math.sin(time * .018 + i + j) * 5;
              g.beginPath(); g.moveTo(j * 9, 12);
              g.quadraticCurveTo(j * 9 + sway, -7, j * 9 + sway * 2, -25 - j * 6); g.stroke();
            }
            g.globalAlpha = .06;
            g.beginPath(); g.moveTo(-20, -h / unit); g.lineTo(15, -h / unit);
            g.lineTo(75, 10); g.lineTo(45, 10); g.fill();
            break;
          case 'VOLCANO_PLUS':
            g.fillRect(-16, -24, 12, 35); g.fillRect(2, -43, 15, 54);
            g.strokeStyle = '#ff6b40'; line(6, -35, 10, -18, 2); line(10, -18, 5, 5, 2);
            break;
          case 'COSMIC':
            g.save(); g.translate(0, -48); g.rotate(-.35);
            circle(0, 0, 13);
            g.beginPath(); g.ellipse(0, 0, 27, 6, 0, 0, Math.PI * 2); g.stroke();
            g.restore();
            break;
          case 'FOREST':
            line(-5, 10, -5, -6); line(9, 10, 9, -1);
            g.beginPath(); g.ellipse(-5, -7, 10, 5, 0, Math.PI, Math.PI * 2); g.fill();
            g.beginPath(); g.ellipse(9, -2, 7, 4, 0, Math.PI, Math.PI * 2); g.fill();
            break;
          case 'CRYSTAL':
            diamond(-9, -5, 22); diamond(10, 0, 14);
            g.strokeStyle = '#ffffff'; line(-9, -25, -9, 10);
            break;
          case 'DESERT':
            g.strokeRect(-18, -23, 36, 34); line(-18, -24, 0, -38); line(0, -38, 18, -24);
            g.strokeRect(-4, -5, 8, 16); line(-22, 14, 24, 14);
            break;
          case 'CELESTIAL':
            g.strokeRect(-18, -8, 36, 8);
            for (let j = 0; j < 3; j++) line(-12 + j * 12, -8, -12 + j * 12, -32, 3);
            line(-20, -34, 20, -34, 2);
            g.globalAlpha = .14; circle(0, -49, 10);
            break;
          case 'CYBERPUNK':
            g.strokeRect(-18, -42, 36, 45);
            for (let j = 0; j < 4; j++) {
              g.globalAlpha = .18 + .12 * (1 + Math.sin(time * .025 + j + i));
              line(-13, -35 + j * 9, 13 - j * 3, -35 + j * 9, 2);
            }
            break;
          case 'MYSTIC':
            g.save(); g.translate(0, -12); g.rotate(time * .003 + i);
            circle(0, 0, 20); diamond(0, 0, 9);
            for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); g.fillRect(17, -2, 5, 3); }
            g.restore();
            break;
          case 'SHATTERED':
            g.save(); g.translate(0, -18 + Math.sin(time * .014 + i) * 5); g.rotate(i + time * .002);
            g.beginPath(); g.moveTo(-20, -7); g.lineTo(5, -17); g.lineTo(18, 8);
            g.lineTo(-9, 13); g.closePath(); g.stroke(); line(-9, 13, 0, -3); line(0, -3, 5, -17);
            g.restore();
            break;
          case 'TEMPEST':
            line(-20, 8, -20, -22, 2); line(20, 8, 20, -22, 2);
            g.beginPath(); g.moveTo(-20, -22); g.quadraticCurveTo(0, 1, 20, -22); g.stroke();
            g.globalAlpha = .15;
            for (let j = 0; j < 3; j++) line(-18, -50 + j * 6, 25, -54 + j * 6);
            break;
          case 'ECLIPSE_REALM':
            g.save(); g.translate(0, -35); g.rotate(-.2);
            g.beginPath(); g.arc(0, 0, 24, .2, Math.PI * 1.7); g.stroke();
            g.globalAlpha = .15;
            g.beginPath(); g.arc(0, 0, 29, .1, Math.PI * 1.8); g.stroke();
            g.restore();
            break;
          case 'PRISM':
            for (let j = 0; j < 3; j++) {
              g.fillStyle = ['#8defff', '#d1a6ff', '#ffe0ae'][j];
              g.globalAlpha = .12; diamond((j - 1) * 10, -22, 36);
            }
            break;
          case 'CLOCKWORK':
            g.save(); g.translate(0, -16); g.rotate(time * .008 * (i % 2 ? -1 : 1));
            circle(0, 0, 17); circle(0, 0, 6);
            for (let j = 0; j < 8; j++) {
              g.rotate(Math.PI / 4); g.fillRect(15, -3, 7, 6); line(6, 0, 14, 0);
            }
            g.restore();
            break;
          case 'AURORA':
            g.globalAlpha = .09;
            g.beginPath(); g.moveTo(-25, -h / unit * .6);
            g.bezierCurveTo(15, -h / unit * .7, -5, -h / unit * .3, 40, -h / unit * .4);
            g.lineTo(40, -h / unit * .4 + 16);
            g.bezierCurveTo(-5, -h / unit * .3 + 16, 15, -h / unit * .7 + 16, -25, -h / unit * .6 + 16);
            g.closePath(); g.fill();
            break;
          case 'NECROPOLIS':
            g.strokeRect(-13, -23, 26, 34);
            g.beginPath(); g.arc(0, -23, 13, Math.PI, 0); g.stroke();
            line(0, -20, 0, -2); line(-6, -14, 6, -14);
            g.globalAlpha = .08; g.beginPath(); g.ellipse(5, 12, 30, 6, 0, 0, Math.PI * 2); g.fill();
            break;
        }
        g.restore();
      }

      if (scene.effects === false) return;
      const particles = Math.min(scene.staticCard ? 12 : 38, Math.max(8, Math.round(w / 18)));
      for (let i = 0; i < particles; i++) {
        const speed = .12 + i % 5 * .035;
        const rises = ['bubble', 'ember', 'ash', 'firefly', 'spore', 'steam', 'wisp', 'cinder'].includes(effect);
        const px = mod(i * 137.37 + Math.sin(time * .008 + i) * 8 - time * speed - distance * .05, w + 12) - 6;
        const py = mod(i * 71.13 + time * speed * (rises ? -1 : 1), h);
        const size = scale * (1 + i % 3 * .6);
        g.save(); g.translate(px, py);
        g.fillStyle = accent; g.strokeStyle = accent;
        g.globalAlpha = .18 + .22 * (1 + Math.sin(time * .025 + i)) / 2;
        switch (effect) {
          case 'rain': line(0, 0, -3 * scale, 9 * scale); break;
          case 'bubble': circle(0, 0, size * 2); break;
          case 'petal': case 'feather':
            g.rotate(time * .012 + i);
            g.beginPath(); g.ellipse(0, 0, size * 2, size * .7, 0, 0, Math.PI * 2); g.fill(); break;
          case 'shard': case 'prism': case 'rock':
            g.rotate(i + time * .006); diamond(0, 0, size * 2); break;
          case 'data': g.fillRect(0, 0, size, size * 4); g.fillRect(size * 2, size, size, size); break;
          case 'star': line(-size * 2, 0, size * 2, 0); line(0, -size * 2, 0, size * 2); break;
          case 'steam': case 'wisp': case 'spore':
            g.globalAlpha *= .5;
            g.beginPath(); g.ellipse(0, 0, size * 3, size * 1.8, i, 0, Math.PI * 2); g.fill(); break;
          case 'sand': case 'ash': line(0, 0, size * 3, size); break;
          default: g.fillRect(0, 0, size, size);
        }
        g.restore();
      }
    } finally { g.restore(); }
  }
  window.flyingBirdUltraArt = draw;
})();
