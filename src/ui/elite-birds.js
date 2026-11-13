// Elite skins — the active Canvas renderer used by the game, shop, avatars and
// multiplayer ghosts. Geometry is cosmetic only; collision bounds are unchanged.
(() => {
  const names = new Set(['AURUM', 'ABYSS', 'ECLIPSE', 'EMERALD KING', 'PLATINUM']);
  const INK = '#111321';

  function draw(g, name, wing = 0) {
    if (!names.has(name)) return false;
    const w = Math.max(-3, Math.min(3, Number(wing) || 0));
    const pulse = (w + 3) / 6;
    // All coordinates remain in the original local bird coordinate space.
    const shape = (fill, points, stroke = null, width = 0.9) => {
      g.beginPath();
      points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
    };
    const line = (color, width, points) => {
      g.strokeStyle = color; g.lineWidth = width; g.beginPath();
      points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.stroke();
    };
    const box = (color, x, y, width, height) => { g.fillStyle = color; g.fillRect(x, y, width, height); };
    const orb = (color, x, y, radius) => {
      g.fillStyle = color; g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.fill();
    };
    const bloom = (color, x, y, radius, opacity) => {
      g.save(); g.globalAlpha = opacity;
      orb(color, x, y, radius); g.restore();
    };
    const shine = (color, x, y, length = 3) => {
      line(color, .8, [[x - length, y], [x + length, y]]);
      line(color, .8, [[x, y - length], [x, y + length]]);
      orb('#ffffff', x, y, .65);
    };
    const eye = (rim, iris, x = 6, y = -6) => {
      shape(INK, [[x-4,y-4],[x+2,y-5],[x+5,y-1],[x+3,y+3],[x-3,y+3]]);
      shape(rim, [[x-3,y-3],[x+2,y-4],[x+4,y-1],[x+2,y+2],[x-2,y+2]]);
      orb(iris,x+1,y,2.05);orb('#fffdf0',x+.55,y-.75,.65);
    };

    g.save();
    // Keep the larger crown/tail silhouettes within the size of other shop birds.
    g.scale(.8, .8);
    try {
      switch (name) {
        case 'AURUM': {
          // Imperial falcon: three unmistakable golden tail blades, crown and
          // a broad hinged wing with large individual flight feathers.
          shape('#6d4215',[[-11,-3],[-25,-15],[-28,-13],[-21,-1],[-29,2],[-26,5],[-17,5],[-28,14],[-24,15],[-9,7]]);
          shape('#df9b28',[[-14,-2],[-25,-12],[-22,-3],[-17,0]]);
          shape('#ffce52',[[-14,3],[-27,2],[-20,5],[-14,6]]);
          shape('#c28024',[[-13,6],[-25,13],[-18,10],[-10,7]]);
          line('#fff0a3',.9,[[-24,-11],[-17,-2],[-12,0]]);
          line('#ffeb88',.9,[[-25,2],[-16,3]]);
          line('#ffe58a',.85,[[-24,12],[-17,8]]);
          // Large angular armored body and cream breast.
          shape(INK,[[-16,-8],[-8,-13],[3,-13],[12,-7],[14,3],[6,11],[-7,11],[-17,5]]);
          shape('#a76e18',[[-14,-7],[-7,-11],[3,-11],[10,-6],[11,3],[5,9],[-7,9],[-15,4]]);
          shape('#efb938',[[-12,-6],[-5,-10],[6,-9],[10,-4],[2,-2],[-11,0]]);
          shape('#ffe9a1',[[2,1],[10,0],[8,6],[2,9],[-5,8]]);
          shape('#c18a27',[[-14,4],[-8,8],[1,9],[-7,10]]);
          // Tall five-pronged regal crest that reads even at game size.
          shape(INK,[[-9,-10],[-12,-22],[-5,-18],[-2,-25],[2,-19],[8,-22],[7,-12]]);
          shape('#eeb641',[[-9,-12],[-10,-19],[-5,-16],[-2,-22],[2,-16],[6,-19],[6,-12]]);
          shape('#fff0ad',[[-3,-19],[-2,-23],[-1,-19],[0,-16]]);
          orb('#a84327',-2,-14,2);orb('#ffe79a',-2.4,-14.6,.75);
          // Swept layered animated wings — visible as separate feathers.
          g.save();g.translate(0, w * .55);
          shape(INK,[[-9,-3],[-3,-5],[3,0],[-2,8],[-16,12],[-21,9],[-16,5],[-23,5],[-17,1]]);
          shape('#c78b2d',[[-10,-2],[-3,-3],[1,0],[-3,6],[-16,10],[-19,9],[-13,5],[-19,4],[-13,2]]);
          shape('#ffdf75',[[-10,-2],[-3,-2],[0,0],[-5,2],[-16,4]]);
          line('#fff2ba',.85,[[-12,1],[-4,1]]);
          line('#8c5a16',1,[[-15,7],[-6,4]]);
          box('#fff4b4',-14 + pulse*3, 1, 2, 1);
          g.restore();
          // Regal hooked beak and a gold-lined eye.
          shape(INK,[[10,-4],[22,-1],[18,6],[13,6],[10,3]]);
          shape('#ffd65a',[[11,-3],[20,-1],[17,3],[12,2]]);
          shape('#ad6314',[[12,3],[18,4],[15,5],[11,4]]);
          eye('#ffde78','#6f3c17',6,-6);
          shine('#fff6c5',-8 + pulse*4,-16,1.5);
          break;
        }
        case 'ABYSS': {
          // Abyssal predator: ragged trident tail, tall dorsal fin and
          // drifting bioluminescent lure over a dark streamlined body.
          shape('#071628',[[-12,-1],[-24,-14],[-29,-18],[-23,-5],[-31,1],[-23,5],[-29,17],[-23,14],[-11,5]]);
          shape('#0d547b',[[-13,-2],[-25,-14],[-24,-5],[-18,-1]]);
          shape('#067b95',[[-13,1],[-28,1],[-18,4]]);
          shape('#0a4b79',[[-13,5],[-25,14],[-21,9],[-12,6]]);
          line('#52e9ed',1,[[-27,-16],[-19,-5],[-12,-2]]);
          line('#47d8e9',1,[[-28,1],[-18,1]]);
          line('#52e9ed',1,[[-27,15],[-19,7]]);
          shape(INK,[[-16,-7],[-8,-11],[2,-12],[12,-7],[16,-1],[12,8],[0,12],[-12,8],[-17,1]]);
          shape('#102e4e',[[-14,-6],[-7,-9],[3,-10],[11,-6],[14,-1],[10,6],[0,10],[-11,6],[-15,1]]);
          shape('#175778',[[-12,-5],[-5,-9],[5,-9],[11,-5],[8,-2],[-12,0]]);
          shape('#1d7895',[[0,3],[12,0],[9,6],[1,10],[-7,7]]);
          shape('#65cad3',[[-2,8],[8,6],[1,10],[-5,9]]);
          // Tall sawtooth dorsal fin and spine ridges.
          shape(INK,[[-11,-9],[-13,-22],[-7,-17],[-3,-25],[2,-17],[6,-21],[7,-10]]);
          shape('#15587f',[[-10,-10],[-11,-19],[-7,-15],[-3,-21],[2,-15],[5,-18],[5,-11]]);
          line('#67ecf5',1,[[-11,-19],[-7,-14],[-3,-20]]);
          // Organic animated translucent fin-wings.
          g.save();g.translate(0,w*.7);
          shape(INK,[[-9,-2],[0,0],[-5,8],[-14,13],[-13,6],[-20,10],[-17,3]]);
          shape('#167fa1',[[-9,-1],[-1,0],[-6,7],[-13,11],[-12,5],[-18,8],[-15,3]]);
          shape('#57dce8',[[-10,0],[-3,1],[-10,5],[-16,7]]);
          line('#b3ffff',.8,[[-10,1],[-9,9]]);
          line('#4fc7d6',.8,[[-9,1],[-13,6]]);
          g.restore();
          // Angler lure with a halo that swells from wing motion.
          line('#3ea7c0',1.65,[[0,-11],[2,-18],[7,-20],[12,-17]]);
          bloom('#37f5f4',12,-17,4.5 + pulse*1.4,.2);
          orb('#50dfe5',12,-17,2.55);orb('#e4ffff',12.5,-17.7,1.05);
          // Gill vents and open deep-sea mouth.
          for(let i=0;i<3;i++)line('#58b9cf',1,[[-3+i*2,-2],[-4+i*2,2]]);
          shape(INK,[[12,-1],[23,1],[19,7],[12,5]]);
          shape('#27b7c8',[[14,1],[21,2],[18,4],[14,4]]);
          eye('#3ed4dc','#d6ffff',7,-6);
          bloom('#57faff',-22,3,2.8,.21);
          break;
        }
        case 'ECLIPSE': {
          // Solar eclipse reimagined as an angular night-hawk silhouette.
          // One open crescent, rather than the old circular body/halo.
          g.strokeStyle='#ef8f31';g.lineWidth=3.4;g.beginPath();g.arc(-5,-1,19.5,2.32,5.18);g.stroke();
          g.strokeStyle='#ffd078';g.lineWidth=.8;g.beginPath();g.arc(-5,-1,21,2.52,4.96);g.stroke();
          shape('#f5a448',[[-17,-15],[-19,-23],[-13,-17],[-10,-25],[-7,-17],[-2,-22],[0,-16]]);
          shape('#351a40',[[-14,3],[-26,-7],[-22,3],[-27,10],[-17,8],[-21,16],[-9,8]]);
          shape('#f7882d',[[-20,1],[-26,-6],[-23,3],[-17,5]]);
          shape('#fbbe64',[[-21,8],[-25,10],[-15,8]]);
          shape(INK,[[-15,-8],[-6,-14],[5,-14],[14,-8],[16,2],[7,11],[-8,10],[-18,3]]);
          shape('#24172f',[[-13,-7],[-5,-12],[5,-12],[12,-7],[13,2],[6,9],[-7,8],[-15,2]]);
          shape('#402644',[[-10,-5],[-2,-10],[8,-9],[12,-4],[3,-3],[-10,1]]);
          shape('#6a3651',[[3,1],[12,-1],[9,6],[2,9],[-6,7]]);
          // Radiant asymmetric blade crest.
          shape(INK,[[-9,-11],[-10,-22],[-4,-17],[0,-26],[3,-18],[8,-22],[7,-12]]);
          shape('#d9732e',[[-8,-12],[-8,-19],[-3,-15],[0,-22],[3,-15],[6,-19],[6,-13]]);
          shape('#ffcf7a',[[0,-22],[2,-17],[-1,-16]]);
          // Animated serrated scythe wing.
          g.save();g.translate(0,w*.55);
          shape(INK,[[-10,-3],[-1,-7],[4,-1],[-3,8],[-16,14],[-20,9],[-13,5],[-22,5]]);
          shape('#572b50',[[-10,-2],[-1,-5],[1,-1],[-5,6],[-15,11],[-18,9],[-12,4],[-19,4]]);
          shape('#f08c40',[[-10,-2],[-1,-5],[1,-1],[-4,2],[-15,5]]);
          line('#ffcb78',1,[[-14,4],[-6,0]]);
          g.restore();
          // Black beak edged by the solar corona.
          shape(INK,[[12,-4],[23,0],[15,6],[11,3]]);
          shape('#e98c3f',[[13,-3],[20,0],[14,3]]);
          eye('#e7a05a','#ffcc67',7,-6);
          shine('#ffe29c',-16 + pulse*4,-18,1.5);
          bloom('#ffac4c',-16 + pulse*3,-18,2.5,.16);
          break;
        }
        case 'EMERALD KING': {
          // Royal peacock: long three-leaf fan, curved jewel plumes and a
          // five-point crown. Gold edging contrasts against saturated green.
          for (let i=0;i<3;i++) {
            const y = -11+i*10;
            const move = (i-1)*w*.35;
            shape(INK,[[-11,1],[-27,y-5+move],[-30,y+2+move],[-25,y+7+move]]);
            shape('#126c53',[[-12,1],[-26,y-3+move],[-28,y+2+move],[-24,y+5+move]]);
            shape('#34b18a',[[-18,(y+1)*.45],[-26,y-1+move],[-25,y+4+move]]);
            orb('#e6bd58',-24,y+1+move,2.2);
            orb('#5de8be',-24,y+1+move,1.1);
          }
          // Body and royal sapphire-green breast.
          shape(INK,[[-15,-9],[-5,-13],[6,-12],[14,-5],[14,5],[6,12],[-8,10],[-17,3]]);
          shape('#0e4d40',[[-13,-8],[-4,-11],[6,-10],[12,-4],[12,5],[5,10],[-8,8],[-15,3]]);
          shape('#168565',[[-11,-7],[-4,-9],[7,-8],[11,-3],[0,-1],[-12,0]]);
          shape('#85d6aa',[[3,2],[11,0],[10,5],[5,9],[-2,8]]);
          shape('#d8bd59',[[-3,7],[7,9],[1,11],[-8,9]]);
          // Crown has raised emerald jewel rather than a basic flat stripe.
          shape(INK,[[-8,-11],[-11,-23],[-5,-18],[0,-26],[5,-18],[10,-23],[8,-11]]);
          shape('#e5bd53',[[-7,-12],[-9,-20],[-5,-16],[0,-23],[5,-16],[8,-20],[7,-12]]);
          shape('#fff2b1',[[-7,-12],[7,-12],[5,-10],[-5,-10]]);
          shape('#0a8061',[[-2,-17],[0,-20],[2,-17],[0,-14]]);
          orb('#7dffca',0,-17,.95);
          // Royal cloak wing articulated over the shoulder.
          g.save();g.translate(0,w*.5);
          shape(INK,[[-10,-4],[1,-3],[2,3],[-9,13],[-17,12],[-14,5],[-21,5]]);
          shape('#d6ae47',[[-10,-3],[0,-2],[1,2],[-9,11],[-15,10],[-12,4],[-19,4]]);
          shape('#127352',[[-9,-2],[-1,-1],[-2,3],[-10,9],[-14,8],[-12,3],[-17,3]]);
          shape('#36d7a7',[[-10,-2],[-3,-1],[-5,3],[-13,4]]);
          orb('#ffeb8c',-8,4,1.5);
          g.restore();
          // Ornamental hooked gold beak + emerald eye.
          shape(INK,[[12,-5],[22,-2],[17,5],[12,4]]);
          shape('#e9c15d',[[13,-4],[20,-2],[17,2],[13,1]]);
          eye('#e6e8a1','#177b54',7,-5);
          shine('#e8fff0',-18,-9 + pulse*2,1.6);
          break;
        }
        case 'PLATINUM': {
          // Silver interceptor: turbine tail, articulated delta wing, small
          // stabilizer antennae and a very obvious luminous cockpit visor.
          shape('#24324b',[[-11,-3],[-23,-11],[-21,-2],[-30,0],[-22,3],[-24,12],[-11,6]]);
          shape('#7d9dbd',[[-12,-3],[-22,-9],[-19,-1],[-12,0]]);
          shape('#a8c8d7',[[-14,0],[-28,0],[-17,2]]);
          shape('#536a93',[[-13,4],[-23,10],[-20,5]]);
          box('#75edff',-25,-1,6,2);
          bloom('#5be9ff',-25,0,3.5,.16+pulse*.06);
          shape(INK,[[-15,-7],[-6,-13],[7,-12],[15,-4],[16,4],[6,11],[-9,9],[-17,3]]);
          shape('#7a8da7',[[-13,-6],[-5,-11],[7,-10],[13,-4],[13,3],[6,9],[-8,7],[-15,2]]);
          shape('#dbe6f0',[[-11,-6],[-5,-10],[7,-9],[12,-4],[2,-3],[-10,0]]);
          shape('#a8bad0',[[0,1],[12,-1],[10,5],[5,8],[-7,6]]);
          shape('#f6fbff',[[-8,-5],[-5,-8],[5,-7],[-2,-5]]);
          // Segmented armor and blue energy core.
          shape('#4e678b',[[-8,-4],[-3,-4],[-4,3],[-9,3]]);
          shape('#92cbd8',[[0,4],[8,2],[7,6],[0,9]]);
          orb('#1d355f',-3,3,3.3);orb('#3ca8e2',-3,3,2.2);orb('#b6f9ff',-3,2.5,1);
          // Wing is three separate hard metal blades with animated tips.
          g.save();g.translate(0,w*.48);
          shape(INK,[[-10,-3],[1,-3],[4,0],[-4,8],[-18,14],[-23,12],[-14,5],[-22,4]]);
          shape('#aebfd3',[[-10,-2],[0,-2],[2,0],[-5,6],[-18,12],[-20,11],[-13,4],[-19,3]]);
          shape('#f6faff',[[-10,-2],[-1,-2],[-4,1],[-14,4]]);
          shape('#6182b5',[[-10,5],[-17,10],[-12,7]]);
          box('#36b6ff',-12,3,5,1.5);
          line('#e4f7ff',.8,[[-18,11],[-7,4]]);
          g.restore();
          // Twin aerial stabilizers.
          shape(INK,[[-7,-11],[-9,-23],[-4,-18],[1,-24],[3,-12]]);
          shape('#8b9fbd',[[-7,-12],[-8,-20],[-4,-16],[1,-21],[1,-13]]);
          box('#82e8ff',-2,-18,2,2);
          // Sharp futuristic nose and cockpit.
          shape(INK,[[12,-4],[24,-1],[19,5],[12,3]]);
          shape('#e5edf7',[[13,-3],[22,-1],[19,2],[13,1]]);
          shape('#152944',[[2,-8],[11,-7],[13,-3],[4,-1]]);
          shape('#37afe3',[[3,-7],[10,-6],[11,-4],[4,-3]]);
          line('#edfdff',.8,[[5,-6],[10,-5]]);
          shine('#deffff',8-pulse*2,-11,1.4);
          break;
        }
      }
    } finally {
      g.restore();
    }
    return true;
  }
  window.flyingBirdEliteArt = draw;
})();
