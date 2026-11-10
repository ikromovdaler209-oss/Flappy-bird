/* Shared decorative pass. No simulation, random state, timers or gameplay writes.
 * Pixel geometry is drawn behind actors. Stable world tiles avoid resize-dependent scenery.
 */
(() => {
  const mod=(v,n)=>((v%n)+n)%n;
  const noise=n=>{n=(n^0x51f2a3)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296};
  const supported=new Set(['CITY','MOUNTAINS','VOLCANO','SAKURA','NEON','OCEAN','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','DESERT']);
  function draw(g,s){
    if(!supported.has(s.map)||s.highContrast)return;
    const {map,w,ground:h}=s,q=Math.max(0,Math.min(3,s.quality|0)),t=s.reducedMotion?0:Math.max(0,s.tick||0),d=Number(s.distance)||0,day=s.day;
    if(!(w>0&&h>0))return;
    const rect=(col,x,y,a,b)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.ceil(a),Math.ceil(b))};
    const poly=(col,points)=>{g.fillStyle=col;g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.closePath();g.fill()};
    const line=(col,x,y,x2,y2,width=1)=>{g.strokeStyle=col;g.lineWidth=width;g.beginPath();g.moveTo(Math.round(x),Math.round(y));g.lineTo(Math.round(x2),Math.round(y2));g.stroke()};
    const tiles=(spacing,speed,fn)=>{const shift=d*speed,first=Math.floor(shift/spacing)-1;for(let i=first;i<=first+Math.ceil(w/spacing)+2;i++)fn(i*spacing-shift,i,noise(i+31))};
    g.save();g.beginPath();g.rect(0,0,w,h);g.clip();
    // Silhouettes stay near the horizon, below the central flight corridor.
    if(map==='CITY'){
      tiles(182,.19,(x,i,n)=>{
        const y=h-55-n*30;rect(day?'#768099':'#312a51',x,y,72,h-y);
        rect(day?'#b3bac8':'#625477',x+4,y-3,64,3);rect('#3e425b',x+12,y-17,18,17);rect('#55516d',x+9,y-20,24,4);
        line('#817089',x+50,y,x+50,y-28);rect('#e5a599',x+49,y-29,3,2);
        for(let row=0;row<3;row++)for(let col=0;col<5;col++)rect(day?'#d0dee7':(mod(i+row+col,3)?'#c9aa73':'#514567'),x+7+col*12,y+10+row*13,4,6);
      });
      tiles(100,.34,(x)=>{line('#40344e',x,h-3,x,h-37,2);line('#40344e',x,h-37,x+12,h-37,2);rect('#ffe1a1',x+9,h-35,7,3);rect('rgba(255,213,135,.09)',x+4,h-31,18,25)});
    }else if(map==='MOUNTAINS'){
      tiles(290,.18,(x,i,n)=>{const y=h-68-n*24;rect(day?'#5c718b':'#293456',x,y,2,55);rect(day?'#5c718b':'#293456',x+180,y-18,2,65);line('#7187a3',x-35,y+3,x+210,y-21);
        const cx=x+65+Math.sin(t*.004+i)*12;line('#7f91aa',cx,y-8,cx,y+1);rect('#7b4f57',cx-8,y+1,18,12);rect('#d1e6ed',cx-5,y+3,12,5);
        rect('#4c535f',x+35,h-23,32,23);poly('#dbeaf5',[x+29,h-23,x+51,h-38,x+73,h-23]);rect('#eedfa9',x+48,h-17,7,7);
      });
    }else if(map==='SAKURA'){
      tiles(270,.22,(x)=>{const y=h-65;rect('#784b61',x+12,y+8,5,57);rect('#784b61',x+62,y+8,5,57);rect('#b96c7b',x+5,y+10,70,5);rect('#683e59',x,y,80,7);rect('#683e59',x-5,y-3,15,4);rect('#683e59',x+70,y-3,15,4);
        for(let k=0;k<3;k++){line('#826078',x+22+k*17,y+7,x+22+k*17,y+22);rect('#ffd2b7',x+18+k*17,y+21,9,12);rect('#df8e9b',x+19+k*17,y+21,7,2)}
        rect('#6c657e',x+140,h-18,15,18);rect('#9b94ac',x+135,h-21,25,4);poly('#736b87',[x+132,h-22,x+148,h-32,x+163,h-22]);rect('#ffe8af',x+144,h-15,6,6);
      });
    }else if(map==='NEON'){
      tiles(220,.21,(x,i,n)=>{const y=h-110-n*30;rect('#13243f',x,y,56,h-y);rect('#3b426b',x+4,y+5,48,2);line('#5985ac',x+12,y,x+12,y-16);rect(i%2?'#9b4b90':'#287c95',x+8,y+19,40,20);rect(i%2?'#ef9acb':'#8ce2ed',x+12,y+23,2,10);rect('#b0b4da',x+18,y+25,22,2);rect('#b0b4da',x+18,y+30,15,2);
        for(let k=0;k<4;k++)rect('#3b6686',x+9+k*10,y+53,3,29);
        line('#354b6a',x+56,y+65,x+105,y+65,3);rect('#7b5d94',x+70,y+68,22,2);
      });
      rect('rgba(62,160,205,.09)',0,h-12,w,8);
    }else if(map==='OCEAN'){
      // Distant ruins, sea fans and layered kelp give the seabed a distinct silhouette.
      tiles(236,.16,(x,i,n)=>{const y=h-72;rect('#205579',x,y,11,72);rect('#205579',x+57,y+9,11,63);rect('#2d6d8c',x-4,y-5,19,6);rect('#2d6d8c',x+53,y+4,19,6);line('#205579',x+10,y+10,x+57,y+19,7);rect('#387c93',x+2,y+10,2,45);
        for(let k=0;k<3;k++){const xx=x+105+k*12,hh=24+n*28+k*7;line('#296c76',xx,h,xx+Math.sin(t*.018+k)*4,h-hh,3);line('#296c76',xx,h-12,xx-9,h-23,2)}
        line('#9a6a97',x+181,h,x+181,h-25,3);line('#9a6a97',x+181,h-9,x+168,h-21,3);line('#9a6a97',x+181,h-15,x+193,h-29,3);
      });
      if(q)for(let i=0;i<3;i++){g.globalAlpha=.035;poly('#a3eef1',[w*(i*.42+.1),0,w*(i*.42+.1)+16,0,w*(i*.42+.1)-40,h,w*(i*.42+.1)-85,h]);g.globalAlpha=1;}
    }else if(map==='VOLCANO'||map==='VOLCANO_PLUS'){
      const premium=map==='VOLCANO_PLUS';
      tiles(premium?180:240,.22,(x,i,n)=>{const y=h-30-n*40;poly('#281b2c',[x,h,x+8,y+11,x+25,y,x+41,y+14,x+48,h]);poly('#483040',[x+25,y,x+41,y+14,x+48,h,x+28,h]);
        line('#b95542',x+26,y+5,x+28,h-8,2);line('#7b3a3d',x+28,h-25,x+37,h-16);
        rect('#9d4938',x+75,h-5,61,4);rect('#e99048',x+83,h-5,39,1);
        if(premium){poly('#3d253b',[x+110,h-4,x+116,h-72,x+127,h-79,x+135,h-62,x+140,h-4]);line('#a2545e',x+127,h-75,x+132,h-13,2);}
      });
    }else if(map==='COSMIC'){
      tiles(320,.1,(x,i,n)=>{const y=h*.3+n*h*.25;g.globalAlpha=.46;poly('#665b9b',[x,y+7,x+15,y,x+29,y+10,x+24,y+24,x+5,y+22]);rect('#9684b9',x+8,y+6,8,3);g.globalAlpha=1;
        const sy=h-85;rect('#4c527d',x+110,sy,45,8);rect('#687c9a',x+127,sy-9,11,26);rect('#2e496b',x+88,sy-6,19,20);rect('#2e496b',x+158,sy-6,19,20);for(let k=0;k<3;k++){line('#5d7a9a',x+91+k*6,sy-5,x+91+k*6,sy+12);line('#5d7a9a',x+161+k*6,sy-5,x+161+k*6,sy+12)}rect('#d2c0cf',x+130,sy-7,5,4);
      });
      if(q){g.globalAlpha=.07;g.fillStyle='#a38be1';g.beginPath();g.ellipse(w*.6,h*.25,w*.33,24,-.18,0,Math.PI*2);g.fill();g.globalAlpha=1;}
    }else if(map==='FOREST'){
      tiles(220,.28,(x,i,n)=>{rect('#394a33',x,h-17,57,17);rect('#638054',x+3,h-19,49,4);rect('#1d302e',x+6,h-12,7,8);line('#223c30',x+18,h-17,x+31,h-6,2);
        for(let k=0;k<4;k++){const xx=x+92+k*8;line('#376d4c',xx,h-2,xx-5,h-14-k*3,2);line('#589365',xx-4,h-10,xx-11,h-13);line('#589365',xx-2,h-7,xx+4,h-12)}
        line('#1c493c',x+160,0,x+165,35+n*30,2);for(let k=0;k<4;k++)poly('#35694d',[x+161,k*12+9,x+152,k*12+4,x+156,k*12+13]);
      });
    }else if(map==='CRYSTAL'){
      tiles(210,.18,(x,i,n)=>{const y=h-20;rect('#1e3765',x,y,75,20);rect('#4b7397',x+6,y,62,2);
        for(let k=0;k<3;k++){const xx=x+25+k*14,hh=22+n*25+k*8;poly(k%2?'#6474b1':'#438ea8',[xx,y,xx-5,y-hh+8,xx+1,y-hh,xx+8,y-hh+9,xx+10,y]);line('#b9e1df',xx+1,y-hh+3,xx+3,y-6)}
        for(let k=0;k<4;k++)rect('#38517d',x+105+k*11,h-5-k%2*4,7,2);
      });
    }else if(map==='DESERT'){
      tiles(280,.19,(x,i,n)=>{const y=h-54;rect('#865739',x,y,40,54);rect('#ae7948',x-3,y-6,46,7);rect('#cc9b61',x,y-6,40,2);rect('#613b33',x+11,y+18,17,36);rect('#79492f',x+14,y+13,11,5);rect('#b3834f',x+3,y+8,3,37);
        const cx=x+112;rect('#6c7545',cx,h-32,6,32);rect('#6c7545',cx-10,h-23,13,5);rect('#6c7545',cx-10,h-31,4,12);rect('#6c7545',cx+4,h-17,12,5);rect('#6c7545',cx+12,h-25,4,13);rect('#9b9b55',cx+1,h-29,2,24);
        rect('#9a6843',x+185,h-5,27,5);rect('#bc8851',x+189,h-8,19,4);
      });
    }
    // Bounded deterministic ambience. OFF really draws zero particles, in both modes.
    const count=q?Math.min(60,Math.ceil(w/640*12*q)):0;
    for(let i=0;i<count;i++){
      const n=noise(i+100),speed=.12+n*.22,up=['OCEAN','VOLCANO','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL'].includes(map);
      const px=mod(n*(w+24)-d*.045+t*(map==='DESERT'?-.6:.035)+Math.sin(t*.012+i)*5,w+24)-12;
      const py=mod(noise(i+900)*h+t*speed*(up?-1:1),h);
      g.globalAlpha=.28+n*.32;
      if(map==='OCEAN'){g.strokeStyle='#a9e4e4';g.lineWidth=1;g.beginPath();g.arc(px,py,1+n*2,0,Math.PI*2);g.stroke();}
      else if(map==='SAKURA'){rect(i%3?'#f9c9da':'#ffe6e8',px,py,3,2);rect('#f2aac5',px+1,py+2,2,1);}
      else if(map==='MOUNTAINS'){rect('#e7f2ff',px,py,1+n*2,1+n*2);}
      else if(map==='VOLCANO'||map==='VOLCANO_PLUS'){rect(i%3?'#f6a05a':'#c28788',px,py,2,2);}
      else if(map==='NEON'){rect('#77a3ce',px,py,1,5);}
      else if(map==='FOREST'){rect('#cde8a1',px,py,2,2);if(q>1){g.globalAlpha=.06;rect('#cde8a1',px-2,py-2,6,6)}}
      else if(map==='CRYSTAL'||map==='COSMIC'){rect('#c8d8f1',px,py,1,3);rect('#c8d8f1',px-1,py+1,3,1);}
      else if(map==='DESERT'){rect('#ebc384',px,py,3,1);}
      else{rect(day?'#dbe0d1':'#d7c8a3',px,py,1,1);}
    }
    g.restore();
  }
  window.flyingBirdMapArt=draw;
})();
