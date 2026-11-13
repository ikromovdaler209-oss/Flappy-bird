// Distinct compact silhouettes, reused by solo, multiplayer, previews and avatars.
(() => {
  const names = new Set(['AURUM','ABYSS','ECLIPSE','EMERALD KING','PLATINUM']);
  function draw(g, name, wing) {
    if (!names.has(name)) return false;
    const ink = '#151727';
    const polygon = (color, points) => {
      g.fillStyle=color; g.beginPath();g.moveTo(...points[0]);
      for (const point of points.slice(1)) g.lineTo(...point);
      g.closePath();g.fill();
    };
    const rect = (color,x,y,w,h) => {g.fillStyle=color;g.fillRect(x,y,w,h);};
    const eye = (rim,iris,x=5,y=-7) => {
      rect(ink,x-2,y-2,7,7);rect(rim,x-1,y-1,5,5);
      rect(iris,x+1,y,3,3);rect('#ffffff',x+1,y,1,1);
    };
    g.save();
    try {
      switch (name) {
        case 'AURUM':
          // Falcon: swept crest, layered metal flight feathers and hooked beak.
          polygon(ink,[[-19,3],[-10,-7],[-5,-13],[6,-14],[12,-6],[12,5],[2,11],[-12,8]]);
          polygon('#bc7b19',[[-17,3],[-8,-5],[-4,-11],[6,-12],[10,-5],[9,5],[1,9],[-11,6]]);
          polygon('#ffe28a',[[-7,-7],[-10,-16],[-2,-12],[6,-13],[9,-8],[2,-6]]);
          rect('#fff4c9',-5,-11,9,2);
          polygon('#ffdc6f',[[9,-3],[20,-1],[17,5],[14,3],[9,3]]);
          polygon('#684013',[[9,3],[14,3],[17,5],[11,6]]);
          polygon(ink,[[-12,-3+wing],[2,-1+wing],[-2,7+wing],[-17,10+wing],[-13,5+wing],[-20,6+wing]]);
          polygon('#eab73f',[[-12,-1+wing],[0,0+wing],[-3,5+wing],[-15,8+wing],[-10,3+wing],[-17,4+wing]]);
          rect('#fff0a0',-12,wing,9,1);rect('#8b5614',-10,3+wing,7,1);
          eye('#ffecb6','#8a4613');
          break;
        case 'ABYSS':
          // Deep-sea creature: forked fin, gills and a bioluminescent lure.
          polygon('#073047',[[-10,-5],[-20,-12],[-17,-1],[-20,8],[-9,5]]);
          polygon('#37d4e0',[[-13,-3],[-18,-8],[-15,0],[-18,5],[-11,3]]);
          polygon(ink,[[-13,-6],[-3,-11],[8,-9],[14,-1],[10,8],[-1,11],[-12,7]]);
          polygon('#123b62',[[-11,-5],[-3,-9],[7,-7],[12,0],[8,7],[-1,9],[-10,5]]);
          polygon('#76e7e1',[[-8,6],[1,7],[9,3],[7,7],[-1,9]]);
          g.strokeStyle='#3bbdcf';g.lineWidth=2;
          g.beginPath();g.moveTo(0,-9);g.quadraticCurveTo(0,-19,8,-14);g.stroke();
          rect('#6df5f3',7,-16,4,4);rect('#e5ffff',8,-15,2,2);
          polygon('#198fb0',[[-9,-2+wing],[0,2+wing],[-7,9+wing],[-12,4+wing]]);
          rect('#77f4ee',-9,1+wing,2,3);
          for(let i=0;i<3;i++)rect('#57b9cc',-3+i*2,-3,1,5-i);
          polygon('#0a263d',[[11,-1],[19,1],[17,5],[10,4]]);
          rect('#a2ffff',13,1,5,1);
          eye('#24bdcf','#eaffff',5,-6);
          break;
        case 'ECLIPSE':
          // A dark round body framed by an asymmetric solar crescent.
          g.fillStyle='#f6a843';g.beginPath();g.arc(-3,-1,14,0,Math.PI*2);g.fill();
          g.fillStyle='#241a3b';g.beginPath();g.arc(0,-3,12,0,Math.PI*2);g.fill();
          polygon('#ffcb70',[[-15,-3],[-20,-5],[-16,1],[-18,7],[-12,7]]);
          polygon('#382a55',[[-7,-6],[4,-10],[10,-6],[11,4],[4,9],[-6,7]]);
          polygon('#ffb051',[[10,-2],[19,1],[12,4]]);
          polygon(ink,[[-12,1+wing],[-2,-3+wing],[2,3+wing],[-7,10+wing]]);
          polygon('#69416b',[[-10,2+wing],[-2,-1+wing],[0,3+wing],[-7,8+wing]]);
          polygon('#ffc16b',[[-10,2+wing],[-7,8+wing],[-10,6+wing],[-13,4+wing]]);
          rect('#c0748d',-4,-8,3,1);
          eye('#ffc878','#ed7440',5,-6);
          break;
        case 'EMERALD KING':
          // Peacock fan, jeweled crown and a small gold-edged cape.
          for(let i=0;i<3;i++){
            const y=-7+i*7;
            polygon('#102f2c',[[-9,2],[-20,y-4],[-18,y+4]]);
            polygon('#25886a',[[-10,2],[-18,y-2],[-17,y+2]]);
            rect('#e7c05c',-18,y,3,2);rect('#86f1bb',-17,y,1,1);
          }
          polygon(ink,[[-11,-7],[3,-11],[11,-7],[12,5],[3,11],[-10,7]]);
          polygon('#18714f',[[-9,-6],[3,-9],[9,-6],[10,4],[2,9],[-8,6]]);
          polygon('#c4f4c3',[[3,0],[9,1],[8,6],[2,9],[-2,6]]);
          polygon('#ddb644',[[-7,-10],[-8,-16],[-3,-13],[0,-18],[3,-13],[7,-16],[6,-10]]);
          rect('#fff1aa',-5,-11,10,1);rect('#32eab0',-1,-15,2,3);
          polygon('#dfb64b',[[-10,-3+wing],[1,0+wing],[-3,9+wing],[-13,5+wing]]);
          polygon('#0f4e3e',[[-9,-1+wing],[-1,1+wing],[-4,7+wing],[-11,4+wing]]);
          rect('#5ad5a0',-8,1+wing,3,3);
          polygon('#f3d67b',[[10,-3],[19,0],[11,4]]);
          eye('#def4bc','#137650');
          break;
        case 'PLATINUM':
          // Mechanical swift: swept wings, segmented armor and a blue visor.
          polygon('#24324e',[[-12,-3],[-20,-8],[-18,1],[-20,7],[-10,5]]);
          rect('#85dbff',-18,-3,5,2);rect('#5061a1',-17,3,5,2);
          polygon(ink,[[-13,-5],[-3,-11],[8,-8],[14,-1],[10,7],[-1,10],[-12,5]]);
          polygon('#b3c2d4',[[-11,-4],[-2,-9],[7,-6],[12,0],[8,5],[-1,8],[-10,4]]);
          polygon('#f1f8ff',[[-9,-5],[-2,-9],[7,-6],[2,-4]]);
          polygon('#5c6e8e',[[1,1],[10,0],[8,5],[-1,8],[-6,6]]);
          polygon(ink,[[-9,-2+wing],[1,1+wing],[-13,12+wing],[-17,8+wing]]);
          polygon('#e3edfa',[[-9,wing],[-1,2+wing],[-13,10+wing],[-15,8+wing]]);
          rect('#568fe2',-10,3+wing,5,2);
          polygon('#e2eefb',[[12,-2],[20,0],[12,3]]);
          rect('#142744',3,-6,9,5);rect('#55cafa',4,-5,7,2);rect('#e4ffff',8,-5,3,1);
          rect('#6f86a6',-5,-3,1,4);rect('#f2faff',-6,-2,1,2);
          break;
      }
    } finally {g.restore();}
    return true;
  }
  window.flyingBirdEliteArt = draw;
})();
