// Elite skins — active Canvas renderer used by gameplay, shop previews, avatars
// and multiplayer ghosts. The artwork below keeps the premium look, but pushes
// the silhouettes back toward clear bird anatomy: readable beaks, wings and tails.
(() => {
  const names = new Set(['AURUM', 'ABYSS', 'ECLIPSE', 'EMERALD KING', 'PLATINUM']);
  const INK = '#101321';

  function draw(g, name, wing = 0) {
    if (!names.has(name)) return false;
    const w = Math.max(-3, Math.min(3, Number(wing) || 0));
    const pulse = (w + 3) / 6;

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
    const orb = (color, x, y, r) => {
      g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    };
    const box = (color, x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
    const bloom = (color, x, y, radius, opacity) => {
      g.save(); g.globalAlpha = opacity; orb(color, x, y, radius); g.restore();
    };
    const shine = (color, x, y, length = 3) => {
      line(color, .8, [[x - length, y], [x + length, y]]);
      line(color, .8, [[x, y - length], [x, y + length]]);
      orb('#ffffff', x, y, .65);
    };
    const eye = (rim, iris, x = 6, y = -5) => {
      shape(INK, [[x-4,y-4],[x+2,y-5],[x+5,y-1],[x+3,y+3],[x-3,y+3]]);
      shape(rim, [[x-3,y-3],[x+2,y-4],[x+4,y-1],[x+2,y+2],[x-2,y+2]]);
      orb(iris, x+1, y, 1.95); orb('#fffdf0', x+.55, y-.75, .6);
    };
    const birdBody = (base, shade, hi, belly) => {
      shape(INK,[[-15,-8],[-6,-13],[5,-13],[14,-7],[16,1],[11,8],[2,12],[-10,10],[-17,2]]);
      shape(base,[[-13,-7],[-5,-11],[5,-11],[12,-6],[13,1],[9,7],[2,10],[-9,8],[-15,2]]);
      shape(hi,[[-10,-6],[-3,-9],[6,-9],[11,-5],[7,-2],[-11,0]]);
      shape(belly,[[1,1],[11,0],[8,6],[2,9],[-5,8],[-7,4]]);
      shape(shade,[[-13,4],[-7,8],[0,10],[-9,9]]);
    };

    g.save();
    // Slight downscale keeps special silhouettes inside small shop/mobile cards.
    g.scale(.76, .76);
    try {
      switch (name) {
        case 'AURUM': {
          // Golden falcon with crown, broad feathered wing and split royal tail.
          shape('#6a3e12',[[-10,-2],[-24,-14],[-28,-13],[-23,-4],[-29,1],[-24,4],[-14,4]]);
          shape('#d58f22',[[-12,-2],[-24,-11],[-20,-4],[-14,-1]]);
          shape('#ffd75e',[[-13,1],[-26,1],[-18,3],[-13,3]]);
          shape('#b9781c',[[-14,4],[-26,12],[-20,8],[-14,6]]);
          line('#fff0ad',.9,[[-24,-10],[-16,-3],[-12,-1]]);
          line('#ffe58e',.85,[[-25,1],[-17,1]]);
          line('#f2c44e',.85,[[-24,11],[-18,7]]);
          birdBody('#a76e18','#8c5a16','#efb938','#ffe9a1');
          // Crest.
          shape(INK,[[-8,-10],[-10,-21],[-4,-17],[-1,-24],[2,-18],[8,-22],[7,-11]]);
          shape('#efb938',[[-8,-12],[-8,-18],[-4,-15],[-1,-21],[2,-15],[6,-18],[6,-12]]);
          shape('#fff3b5',[[-1,-21],[0,-17],[1,-14],[-2,-14]]);
          orb('#a84327',-1,-14,1.9); orb('#ffe79a',-1.4,-14.5,.65);
          // Bird wing.
          g.save(); g.translate(0, w * .48);
          shape(INK,[[-10,-2],[-2,-5],[4,-1],[1,5],[-8,11],[-18,13],[-22,10],[-18,5],[-23,3],[-16,0]]);
          shape('#ca8d2c',[[-10,-1],[-2,-3],[2,0],[0,4],[-9,9],[-17,11],[-19,10],[-15,5],[-19,3],[-14,1]]);
          shape('#ffde74',[[-10,-1],[-3,-2],[0,0],[-4,2],[-15,5]]);
          line('#fff3b7',.8,[[-15,5],[-5,1]]);
          line('#8c5a16',.8,[[-16,9],[-7,4]]);
          g.restore();
          // Tail feathers.
          shape(INK,[[-15,5],[-20,9],[-17,13],[-12,9]]);
          shape('#b9781c',[[-15,6],[-19,9],[-17,12],[-13,9]]);
          shape(INK,[[-11,6],[-15,13],[-11,15],[-8,8]]);
          shape('#dba239',[[-11,7],[-14,12],[-11,14],[-9,9]]);
          shape(INK,[[-7,6],[-7,14],[-3,13],[-4,7]]);
          shape('#ffd75e',[[-7,7],[-7,13],[-4,12],[-5,8]]);
          // Beak.
          shape(INK,[[12,-3],[23,0],[19,6],[13,5],[11,1]]);
          shape('#ffd65a',[[13,-2],[21,0],[18,3],[13,2]]);
          shape('#ad6314',[[13,2],[18,4],[15,5],[12,4]]);
          eye('#ffde78','#6f3c17',6,-5);
          shine('#fff6c5',-8 + pulse*4,-15,1.4);
          break;
        }
        case 'ABYSS': {
          // Dark seabird: still premium/oceanic, but clearly bird-shaped.
          shape('#061625',[[-10,-2],[-23,-15],[-27,-16],[-22,-6],[-28,-1],[-22,3],[-14,3]]);
          shape('#11476b',[[-12,-2],[-23,-12],[-20,-5],[-13,-1]]);
          shape('#47ddee',[[-13,1],[-25,0],[-18,2],[-13,3]]);
          shape('#0b3a60',[[-14,4],[-24,13],[-19,8],[-13,6]]);
          line('#9bf8ff',.85,[[-23,-11],[-16,-4],[-11,-2]]);
          line('#50d7e6',.8,[[-24,0],[-17,1]]);
          line('#4cc4d7',.8,[[-23,12],[-18,7]]);
          birdBody('#0f2f4d','#0a2137','#185b79','#65cad3');
          // Dorsal fin / crest.
          shape(INK,[[-8,-10],[-10,-21],[-4,-18],[0,-25],[3,-18],[7,-21],[6,-10]]);
          shape('#15587f',[[-8,-11],[-8,-18],[-4,-16],[0,-22],[3,-16],[5,-18],[5,-11]]);
          line('#67ecf5',.8,[[-8,-18],[-4,-15],[0,-21]]);
          // Wing.
          g.save(); g.translate(0,w*.62);
          shape(INK,[[-10,-2],[-1,-3],[3,0],[0,6],[-9,12],[-17,14],[-20,11],[-17,5],[-21,4],[-16,1]]);
          shape('#146b8a',[[-10,-1],[-2,-2],[1,0],[0,5],[-9,10],[-16,12],[-18,11],[-15,5],[-18,4],[-14,2]]);
          shape('#57dce8',[[-10,0],[-3,0],[-7,3],[-15,6]]);
          line('#b3ffff',.75,[[-10,1],[-9,10]]);
          line('#4fc7d6',.75,[[-9,1],[-13,7]]);
          g.restore();
          // Tail and lure.
          shape(INK,[[-15,5],[-20,10],[-17,13],[-12,9]]);
          shape('#0d375a',[[-15,6],[-19,10],[-17,12],[-13,9]]);
          shape(INK,[[-11,6],[-15,14],[-11,16],[-8,8]]);
          shape('#15587f',[[-11,7],[-14,13],[-11,15],[-9,9]]);
          line('#3ea7c0',1.45,[[0,-10],[2,-16],[7,-18],[12,-16]]);
          bloom('#37f5f4',12,-16,4.2 + pulse*1.2,.2);
          orb('#50dfe5',12,-16,2.4); orb('#e4ffff',12.4,-16.7,.95);
          for(let i=0;i<3;i++) line('#58b9cf',.9,[[-3+i*2,-2],[-4+i*2,2]]);
          shape(INK,[[12,-1],[23,1],[19,7],[12,5]]);
          shape('#27b7c8',[[14,1],[21,2],[18,4],[14,4]]);
          eye('#3ed4dc','#d6ffff',6,-5);
          break;
        }
        case 'ECLIPSE': {
          // Eclipse hawk with solar crest and sharp feathering.
          g.strokeStyle='#ef8f31'; g.lineWidth=3; g.beginPath(); g.arc(-4,-1,18.5,2.35,5.08); g.stroke();
          g.strokeStyle='#ffd078'; g.lineWidth=.8; g.beginPath(); g.arc(-4,-1,20,2.5,4.94); g.stroke();
          shape('#391f42',[[-10,-2],[-22,-14],[-25,-13],[-21,-5],[-27,-1],[-22,3],[-14,3]]);
          shape('#f7882d',[[-12,-2],[-22,-11],[-19,-4],[-13,-1]]);
          shape('#fbbe64',[[-13,1],[-24,0],[-18,2],[-13,3]]);
          shape('#572b50',[[-14,4],[-24,13],[-19,8],[-13,6]]);
          birdBody('#24172f','#1c1228','#402644','#6a3651');
          // Crown.
          shape(INK,[[-8,-10],[-10,-21],[-4,-17],[0,-25],[4,-18],[8,-21],[7,-11]]);
          shape('#d9732e',[[-8,-11],[-8,-18],[-4,-15],[0,-21],[4,-15],[6,-18],[6,-12]]);
          shape('#ffcf7a',[[-1,-20],[1,-16],[-1,-14],[-2,-16]]);
          // Wing.
          g.save(); g.translate(0,w*.5);
          shape(INK,[[-10,-2],[-2,-6],[4,-2],[1,5],[-8,11],[-18,14],[-21,10],[-17,5],[-22,3],[-16,0]]);
          shape('#572b50',[[-10,-1],[-2,-4],[2,-1],[0,4],[-9,9],[-17,12],[-19,10],[-15,5],[-19,3],[-14,1]]);
          shape('#f08c40',[[-10,-1],[-3,-4],[0,-1],[-4,2],[-15,5]]);
          line('#ffcb78',.85,[[-14,4],[-6,0]]);
          g.restore();
          // Tail and beak.
          shape(INK,[[-15,5],[-20,10],[-17,13],[-12,9]]);
          shape('#301b3a',[[-15,6],[-19,10],[-17,12],[-13,9]]);
          shape(INK,[[-11,6],[-15,14],[-11,16],[-8,8]]);
          shape('#f08c40',[[-11,7],[-14,13],[-11,15],[-9,9]]);
          shape(INK,[[12,-3],[23,0],[15,6],[11,3]]);
          shape('#e98c3f',[[13,-2],[20,0],[14,3]]);
          eye('#e7a05a','#ffcc67',6,-5);
          shine('#ffe29c',-15 + pulse*4,-17,1.4);
          bloom('#ffac4c',-15 + pulse*3,-17,2.4,.16);
          break;
        }
        case 'EMERALD KING': {
          // Royal bird with peacock-inspired tail but still a clear bird body.
          birdBody('#0e4d40','#0b3a30','#168565','#85d6aa');
          // Crown.
          shape(INK,[[-8,-11],[-11,-23],[-5,-18],[0,-26],[5,-18],[10,-23],[8,-11]]);
          shape('#e5bd53',[[-7,-12],[-9,-20],[-5,-16],[0,-23],[5,-16],[8,-20],[7,-12]]);
          shape('#fff2b1',[[-7,-12],[7,-12],[5,-10],[-5,-10]]);
          shape('#0a8061',[[-2,-17],[0,-20],[2,-17],[0,-14]]);
          orb('#7dffca',0,-17,.95);
          // Wing.
          g.save(); g.translate(0,w*.46);
          shape(INK,[[-10,-3],[1,-3],[2,2],[-6,9],[-16,13],[-20,11],[-16,5],[-21,4],[-15,1]]);
          shape('#d6ae47',[[-10,-2],[0,-2],[1,1],[-7,8],[-15,11],[-17,10],[-14,5],[-18,4],[-14,2]]);
          shape('#127352',[[-9,-1],[-1,-1],[-2,3],[-9,7],[-14,8],[-12,3],[-17,3]]);
          shape('#36d7a7',[[-10,-1],[-3,0],[-5,3],[-13,4]]);
          orb('#ffeb8c',-8,4,1.4);
          g.restore();
          // Tail fan — three feathers, not fish fins.
          for (let i=0;i<3;i++) {
            const oy = -8 + i*7 + w*.18*(i-1);
            shape(INK,[[-13,4],[-25,oy],[-28,oy+3],[-23,oy+8],[-15,8+i]]);
            shape('#126c53',[[-14,5],[-24,oy+1],[-26,oy+3],[-23,oy+6],[-16,8+i]]);
            shape('#34b18a',[[-18,6],[-24,oy+2],[-23,oy+5],[-18,8+i]]);
            orb('#e6bd58',-23,oy+4,1.8); orb('#5de8be',-23,oy+4,.9);
          }
          // Beak.
          shape(INK,[[12,-4],[22,-2],[17,5],[12,4]]);
          shape('#e9c15d',[[13,-3],[20,-2],[17,2],[13,1]]);
          eye('#e6e8a1','#177b54',6,-5);
          shine('#e8fff0',-18,-8 + pulse*2,1.5);
          break;
        }
        case 'PLATINUM': {
          // Mechanical bird rather than a fish/drone.
          shape('#24324b',[[-10,-2],[-23,-12],[-24,-10],[-21,-3],[-28,0],[-22,3],[-14,3]]);
          shape('#7d9dbd',[[-12,-2],[-22,-9],[-19,-2],[-13,-1]]);
          shape('#d8e4ef',[[-13,1],[-24,0],[-17,2],[-13,3]]);
          shape('#536a93',[[-14,4],[-24,12],[-19,8],[-13,6]]);
          birdBody('#7a8da7','#5f718b','#dbe6f0','#a8bad0');
          shape('#4e678b',[[-8,-4],[-3,-4],[-4,3],[-9,3]]);
          orb('#1d355f',-3,3,3.1); orb('#3ca8e2',-3,3,2); orb('#b6f9ff',-3,2.5,.95);
          // Crest antennae.
          shape(INK,[[-7,-11],[-9,-23],[-4,-18],[1,-24],[3,-12]]);
          shape('#8b9fbd',[[-7,-12],[-8,-20],[-4,-16],[1,-21],[1,-13]]);
          box('#82e8ff',-2,-18,2,2);
          // Wing.
          g.save(); g.translate(0,w*.42);
          shape(INK,[[-10,-2],[1,-2],[4,0],[-3,7],[-16,13],[-21,12],[-15,5],[-22,4],[-14,1]]);
          shape('#aebfd3',[[-10,-1],[0,-1],[2,0],[-4,6],[-16,11],[-19,10],[-13,4],[-19,3],[-13,2]]);
          shape('#f6faff',[[-10,-1],[-1,-1],[-4,1],[-14,4]]);
          shape('#6182b5',[[-10,5],[-17,10],[-12,7]]);
          box('#36b6ff',-12,3,5,1.3);
          line('#e4f7ff',.75,[[-18,10],[-7,4]]);
          g.restore();
          // Tail feathers / stabilizers.
          shape(INK,[[-15,5],[-21,9],[-18,12],[-13,8]]);
          shape('#6c7f9a',[[-15,6],[-20,9],[-18,11],[-14,8]]);
          shape(INK,[[-11,6],[-16,13],[-11,15],[-8,8]]);
          shape('#dce7f2',[[-11,7],[-15,12],[-11,14],[-9,9]]);
          // Futuristic beak/cockpit.
          shape(INK,[[12,-3],[24,-1],[19,5],[12,3]]);
          shape('#e5edf7',[[13,-2],[22,-1],[19,2],[13,1]]);
          shape('#152944',[[2,-8],[11,-7],[13,-3],[4,-1]]);
          shape('#37afe3',[[3,-7],[10,-6],[11,-4],[4,-3]]);
          line('#edfdff',.8,[[5,-6],[10,-5]]);
          shine('#deffff',8-pulse*2,-11,1.3);
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
