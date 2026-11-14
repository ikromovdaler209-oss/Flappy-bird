// High landmark detail and Ultra environmental lighting. No extra airborne particles. All geometry is behind obstacles and players.
// Bounded landmark geometry; Ultra light is attached to scenery, not particle queues.
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
    if (!['HIGH','ULTRA'].includes(scene.quality) || !theme || scene.highContrast) return;
    const ultra=scene.quality==='ULTRA'&&scene.effects!==false;
    const w = Number(scene.w), h = Number(scene.ground);
    if (!(w > 0 && h > 0)) return;
    const frozen = scene.staticCard || scene.reducedMotion || scene.effects === false;
    const time = frozen || !ultra ? 0 : Math.max(0, Number(scene.tick) || 0);
    const distance = scene.staticCard ? 0 : Math.max(0, Number(scene.distance) || 0);
    const [accent] = theme;
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
        g.globalAlpha = .68;
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
            g.fillStyle='#1b2c48';g.fillRect(-15,-40,30,30);
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
            g.fillStyle='#775442';g.fillRect(-18,-23,36,34);g.strokeStyle='#c49b69';
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
            g.fillStyle='#1b2446';g.fillRect(-18,-42,36,45);
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
            g.fillStyle='#2f1b28';g.fillRect(-13,-23,26,34);g.beginPath();g.arc(0,-23,13,Math.PI,0);g.fill();g.strokeStyle='#9b6873';
            g.strokeRect(-13, -23, 26, 34);
            g.beginPath(); g.arc(0, -23, 13, Math.PI, 0); g.stroke();
            line(0, -20, 0, -2); line(-6, -14, 6, -14);
            g.globalAlpha = .08; g.beginPath(); g.ellipse(5, 12, 30, 6, 0, 0, Math.PI * 2); g.fill();
            break;
        }
        if(ultra){
          const pulse=.68+.18*Math.sin(time*.018+i);
          const glow=(cx,cy,r,color)=>{
            const gradient=g.createRadialGradient(cx,cy,0,cx,cy,r);
            gradient.addColorStop(0,color);gradient.addColorStop(1,'rgba(0,0,0,0)');
            g.fillStyle=gradient;g.globalAlpha=pulse;g.fillRect(cx-r,cy-r,r*2,r*2);
          };
          const wash=(color,yy)=>{g.strokeStyle=color;g.globalAlpha=.24*pulse;
            for(let row=0;row<3;row++)line(-18+row*3,yy+row*4,20-row*2,yy+row*4);};
          switch(scene.map){
            case 'CITY': glow(13,-32,20,'rgba(255,210,128,.45)');wash('#ffdc9c',8);break;
            case 'MOUNTAINS': wash('#def5ff',-10);g.strokeStyle='#f0fcff';g.globalAlpha=pulse;line(-7,-12,0,-16,2);glow(0,-16,18,'rgba(188,230,255,.30)');break;
            case 'VOLCANO': case 'VOLCANO_PLUS':
              glow(4,0,26,'rgba(255,84,24,.40)');g.strokeStyle='#ffd18a';g.globalAlpha=pulse;line(-3,2,7,-10);break;
            case 'SAKURA': glow(0,-22,25,'rgba(255,156,198,.25)');wash('#f4b4cd',10);break;
            case 'NEON': case 'CYBERPUNK':
              glow(0,-24,28,'rgba(91,225,255,.28)');g.strokeStyle='#ffa1e2';g.globalAlpha=pulse;line(-12,-30+Math.sin(time*.015+i)*10,12,-30+Math.sin(time*.015+i)*10);wash('#66eaff',8);break;
            case 'OCEAN':
              g.strokeStyle='#b5fff1';g.globalAlpha=.40;
              for(let j=0;j<3;j++){const yy=5+j*5;g.beginPath();g.moveTo(-24,yy);g.quadraticCurveTo(Math.sin(time*.012+i+j)*12,yy-12,35,yy);g.stroke();line(-20,yy,-8,yy-7);line(15,yy-4,29,yy+2);}break;
            case 'COSMIC': glow(0,-48,32,'rgba(155,121,255,.25)');break;
            case 'FOREST': glow(-5,-7,15,'rgba(186,237,114,.35)');glow(9,-2,10,'rgba(137,224,150,.25)');break;
            case 'CRYSTAL': case 'PRISM':
              glow(-9,-16,24,'rgba(133,229,255,.30)');g.strokeStyle='#fff5e2';g.globalAlpha=pulse;line(-9,-23,-4,-10);wash('#c4c0ff',9);break;
            case 'DESERT': wash('#ffdfab',12);glow(0,-5,20,'rgba(255,178,82,.40)');g.strokeStyle='#f5c381';g.globalAlpha=.25;for(let shimmer=0;shimmer<3;shimmer++)line(-28,3+shimmer*4+Math.sin(time*.025+i+shimmer)*2,28,3+shimmer*4);break;
            case 'CELESTIAL': glow(0,-49,24,'rgba(255,226,140,.40)');wash('#fff2c4',5);break;
            case 'MYSTIC': glow(0,-12,28,'rgba(103,255,204,.30)');break;
            case 'SHATTERED': glow(0,-18,22,'rgba(181,119,255,.28)');break;
            case 'TEMPEST': wash('#b6eaff',5);break;
            case 'ECLIPSE_REALM': glow(0,-35,36,'rgba(255,139,65,.28)');break;
            case 'CLOCKWORK': glow(0,-16,20,'rgba(255,194,96,.28)');g.strokeStyle='#ffe3a0';g.globalAlpha=pulse;line(-13,-16,-7,-25);break;
            case 'AURORA': wash('#9affe0',5);break;
            case 'NECROPOLIS': glow(0,-14,18,'rgba(183,23,51,.25)');break;
          }
        }
        g.restore();
      }

    } finally { g.restore(); }
  }
  window.flyingBirdUltraArt = draw;
})();
