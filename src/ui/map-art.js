/* Shared decorative pass. No simulation, random state, timers or gameplay writes.
 * Pixel geometry is drawn behind actors. Stable world tiles avoid resize-dependent scenery.
 */
(() => {
  const mod=(v,n)=>((v%n)+n)%n;
  const noise=n=>{n=(n^0x51f2a3)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296};
  const supported=new Set(['CITY','MOUNTAINS','VOLCANO','SAKURA','NEON','OCEAN','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','DESERT','CELESTIAL','CYBERPUNK','MYSTIC','SHATTERED']);
  function draw(g,s){
    if(!supported.has(s.map)||s.highContrast||s.graphicsQuality==='LOW')return;
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
    }else if(map==='CELESTIAL'){
      tiles(286,.14,(x,i,n)=>{
        const y=h-36-n*18;
        poly('#8c8eb5',[x,y,x+58,y-6,x+96,y+3,x+70,y+21,x+35,y+33]);
        rect('#c0d9d9',x+12,y-8,67,6);rect('#eee9e2',x+34,y-27,24,19);
        poly('#fff5d8',[x+29,y-27,x+46,y-42,x+64,y-27]);
        rect('#f9dca5',x+44,y-19,5,11);
        rect('rgba(155,243,255,.5)',x+71,y+3,7,23);
        line('#f2dfb6',x+111,y+6,x+175,y-9,2);
      });
    }else if(map==='CYBERPUNK'){
      tiles(244,.20,(x,i,n)=>{
        const y=h-100-n*28;
        rect('#13244a',x,y,62,h-y);rect('#304379',x-2,y-3,65,4);
        rect(i%2?'#ff61b9':'#63faff',x+9,y+17,42,24);
        rect('#172445',x+13,y+21,34,16);
        for(let j=0;j<4;j++)rect('#93a4e7',x+17+j*7,y+26,3,2);
        rect('#61f0eb',x+60,y+44,55,2);rect('#42578d',x+88,y+46,4,27);
      });
      if(q>1){rect('rgba(97,235,251,.08)',0,h*.72,w,5);}
    }else if(map==='MYSTIC'){
      tiles(218,.17,(x,i,n)=>{
        const y=h-29;
        rect('#234c4c',x+13,h-90,10,90);
        line('#2c665c',x+16,h-70,x-18,h-96,4);
        line('#2e7668',x+17,h-74,x+67,h-104,4);
        for(let j=0;j<3;j++)poly(j%2?'#4a9d87':'#2c8177',[x+j*22,y-15,x+8+j*22,y-34,x+29+j*22,y-16]);
        rect('#dfdde6',x+105,y-9,5,11);
        poly('#a1f1df',[x+89,y-10,x+95,y-23,x+107,y-29,x+119,y-15,x+123,y-10]);
        rect('#fff8db',x+100,y-19,3,3);
      });
    }else if(map==='SHATTERED'){
      tiles(264,.11,(x,i,n)=>{
        const y=h*.3+n*h*.18;
        poly('#514b77',[x+15,y+8,x+36,y-8,x+65,y+1,x+67,y+24,x+33,y+31]);
        poly('#9e89ba',[x+36,y-8,x+65,y+1,x+46,y+11]);
        line('#dd9fff',x+31,y+3,x+52,y+20,2);
        poly('#292d51',[x+130,h,x+146,h-57,x+156,h-72,x+180,h-36,x+192,h]);
        line('#b078df',x+156,h-68,x+161,h-12,2);
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
      const n=noise(i+100),speed=.12+n*.22,up=['OCEAN','VOLCANO','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','MYSTIC','SHATTERED','CELESTIAL'].includes(map);
      const px=mod(n*(w+24)-d*.045+t*(map==='DESERT'?-.6:.035)+Math.sin(t*.012+i)*5,w+24)-12;
      const py=mod(noise(i+900)*h+t*speed*(up?-1:1),h);
      g.globalAlpha=.28+n*.32;
      if(map==='OCEAN'){g.strokeStyle='#a9e4e4';g.lineWidth=1;g.beginPath();g.arc(px,py,1+n*2,0,Math.PI*2);g.stroke();if(q>1)rect('#e0ffff',px-1,py-1-n,1,1);}
      else if(map==='SAKURA'){rect(i%3?'#f9c9da':'#ffe6e8',px,py,3,2);rect('#f2aac5',px+1,py+2,2,1);}
      else if(map==='MOUNTAINS'){rect('#e7f2ff',px,py,1+n*2,1+n*2);if(q>1&&i%3===0){line('#bad7ed',px-2,py+1,px+3,py+1);line('#e7f2ff',px+1,py-2,px+1,py+3);}}
      else if(map==='VOLCANO'||map==='VOLCANO_PLUS'){rect(i%3?'#f6a05a':'#79616a',px,py,2,2);if(q>1&&i%3)rect('#ffe1a0',px,py,1,1);}
      else if(map==='NEON'){line('#77a3ce',px,py,px-2,py+5);if(q>1)rect('#c0ecff',px-2,py+5,1,1);}
      else if(map==='FOREST'){rect('#cde8a1',px,py,2,2);if(q>1){g.globalAlpha=.06;rect('#cde8a1',px-2,py-2,6,6)}}
      else if(map==='CRYSTAL'||map==='COSMIC'){rect('#c8d8f1',px,py,1,3);rect('#c8d8f1',px-1,py+1,3,1);}
      else if(map==='CELESTIAL'){rect('#fff5ce',px,py,2,1);if(q>1)rect('#f1d39f',px+2,py+1,1,1);}
      else if(map==='CYBERPUNK'){rect(i%2?'#81e5ff':'#f291c9',px,py,1,5);}
      else if(map==='MYSTIC'){rect(i%2?'#a6ffe8':'#e8bdff',px,py,2,2);if(q>1){g.globalAlpha=.10;rect('#8bffe2',px-2,py-2,6,6);}}
      else if(map==='SHATTERED'){rect(i%3?'#c3a4ff':'#f8c4ae',px,py,2,2);if(i%4===0)rect('#f1e1ff',px-2,py,6,1);}
      else if(map==='DESERT'){rect('#ebc384',px,py,3,1);}
      else{rect(day?'#dbe0d1':'#d7c8a3',px,py,1,1);}
    }
    g.restore();
  }
  // Five mythic backgrounds. Deterministic Canvas geometry shared by shop, solo and
  // multiplayer: no assets, random-number generators, timers or gameplay mutations.
  function drawMythic(g,s){
    const worlds={
      TEMPEST:['#07172f','#375d81','#748ba7'],
      ECLIPSE_REALM:['#09091a','#4c283d','#a25b57'],
      PRISM:['#172051','#7297d8','#b8d9f2'],
      CLOCKWORK:['#231d30','#84644f','#bd9c77'],
      AURORA:['#061834','#1e507a','#599b9c'],
      NECROPOLIS:['#06050b','#2c0e17','#5b1926']
    };
    if(!worlds[s.map])return;
    const {x=0,y=0,w,h}=s;
    if(!(w>0&&h>0))return;
    const c=worlds[s.map],q=Math.max(0,Math.min(3,s.quality|0));
    const ultra=s.graphicsQuality==='ULTRA'&&!s.highContrast;
    const low=s.graphicsQuality==='LOW';
    const detailed=['HIGH','ULTRA'].includes(s.graphicsQuality);
    const t=(s.staticCard||s.reducedMotion)?0:(s.tick||0);
    const scroll=s.staticCard?0:(Number(s.distance)||0);
    const k=Math.max(.40,Math.min(1.45,h/260)),floor=y+h-12;
    const pi=Math.PI,TAU=pi*2;
    const rect=(col,px,py,pw,ph)=>{if(pw<=0||ph<=0)return;g.fillStyle=col;g.fillRect(px,py,pw,ph)};
    const line=(col,ax,ay,bx,by,width=1)=>{g.strokeStyle=col;g.lineWidth=Math.max(.6,width);g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke()};
    const poly=(col,pts)=>{g.fillStyle=col;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.fill()};
    const circ=(col,cx,cy,r)=>{g.fillStyle=col;g.beginPath();g.arc(cx,cy,Math.max(.1,r),0,TAU);g.fill()};
    const ring=(col,cx,cy,r,width=1,a=0,b=TAU)=>{g.strokeStyle=col;g.lineWidth=width;g.beginPath();g.arc(cx,cy,r,a,b);g.stroke()};
    const glow=(cx,cy,r,color)=>{if(!q)return;const grd=g.createRadialGradient(cx,cy,0,cx,cy,r);grd.addColorStop(0,color);grd.addColorStop(1,'rgba(0,0,0,0)');rect(grd,cx-r,cy-r,2*r,2*r)};
    const tile=(step,velocity,fn)=>{const off=scroll*velocity,first=Math.floor(off/step)-1;for(let i=first;i<=first+Math.ceil(w/step)+2;i++)fn(x+i*step-off,i)};
    // Surface detail belongs to scenery, never the moving particle budget.
    const masonry=(bx,by,bw,bh,color)=>{
      if(!detailed)return;
      for(let row=0;row<Math.ceil(bh/(12*k));row++){
        const yy=by+row*12*k;
        line(color,bx,yy,bx+bw,yy,.65*k);
        for(let xx=bx+(row%2?9:18)*k;xx<bx+bw;xx+=18*k)
          line(color,xx,yy,xx,Math.min(by+bh,yy+12*k),.65*k);
      }
      line(color,bx+2*k,by+2*k,bx+2*k,by+bh,1.2*k);
    };
    const star=(sx,sy,col,size=1)=>{rect(col,sx-size*2,sy,size*5,1);rect(col,sx,sy-size*2,1,size*5)};
    g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    const sky=g.createLinearGradient(x,y,x,y+h);sky.addColorStop(0,c[0]);sky.addColorStop(.59,c[1]);sky.addColorStop(1,c[2]);rect(sky,x,y,w,h);
    if(s.map==='TEMPEST'){
      // Suspended storm city: three layers of stone towers, airborne ships and branching lightning.
      const moonX=x+w*.77,moonY=y+h*.20;
      glow(moonX,moonY,65*k,'rgba(198,233,255,.16)');circ('rgba(218,237,252,.55)',moonX,moonY,20*k);
      for(let z=0;z<2;z++)tile((156+z*70)*k,z?.17:.065,(bx,i)=>{
        const by=y+h*(z?.24:.15)+(i%3)*13*k;
        for(let a=0;a<4;a++)circ(z?'rgba(26,46,78,.55)':'rgba(17,35,65,.7)',bx+a*33*k,by,31*k);
        rect(z?'rgba(26,46,78,.55)':'rgba(17,35,65,.7)',bx,by-6*k,140*k,17*k);
      });
      // Citadel bridgework and watch towers: distant plane.
      tile(178*k,.14,(bx,i)=>{
        const sy=floor-(105+(i%3)*26)*k;
        rect('#1b3556',bx+26*k,sy,51*k,floor-sy);masonry(bx+26*k,sy,51*k,floor-sy,'#304f70');
        poly('#243b62',[bx+19*k,sy,bx+53*k,sy-32*k,bx+87*k,sy]);
        rect('#94bad0',bx+46*k,sy-34*k,13*k,3*k);
        for(let a=0;a<3;a++)rect('#8dabbc',bx+(34+a*13)*k,sy+20*k,5*k,10*k);
        rect('#1a3354',bx+78*k,floor-34*k,98*k,9*k);
        for(let a=0;a<4;a++)rect('#263e60',bx+(87+a*21)*k,floor-27*k,6*k,27*k);
      });
      // Floating weather balloons and small airship silhouettes.
      if(!low)tile(260*k,.25,(bx,i)=>{
        const ay=y+h*(.34+(i%3)*.09)+Math.sin(t*.015+i)*4*k;
        poly('#132d50',[bx+30*k,ay,bx+88*k,ay-6*k,bx+111*k,ay+5*k,bx+78*k,ay+16*k,bx+47*k,ay+16*k]);
        rect('#aedfff',bx+57*k,ay+17*k,28*k,3*k);
        line('#91bfd8',bx+65*k,ay+18*k,bx+65*k,ay+27*k);
        rect('#516b8a',bx+55*k,ay+26*k,22*k,7*k);
      });
      if(!low)tile(115*k,.45,(bx,i)=>{const bh=(39+(i%4)*12)*k;
        rect('#233f63',bx,floor-bh,54*k,bh);rect('#526e88',bx+4*k,floor-bh-4*k,46*k,5*k);
        rect('#a7c8d9',bx+23*k,floor-bh-18*k,6*k,16*k);
        for(let j=0;j<3;j++)rect('#a1c7d6',bx+(11+j*14)*k,floor-bh+14*k,4*k,6*k);
      });
      // Ultra: three spatially separated branches per slow storm cycle; no full-screen flash.
      const lightningCycle=ultra?240:430;
      const phase=mod(t,lightningCycle);
      const strikeCount=ultra?3:1;
      for(let strike=0;strike<strikeCount;strike++)if(q>0&&!s.highContrast&&!s.reducedMotion && (s.staticCard || (phase>=86+strike*22&&phase<93+strike*22))){
        const sx=x+w*(strike===0?.31:strike===1?.70:.51),sy=y+h*.04;
        const points=[[sx,sy],[sx+13*k,sy+29*k],[sx+1*k,sy+43*k],[sx+25*k,sy+70*k],[sx+13*k,sy+97*k]];
        if(q>1){g.shadowColor='#9de5ff';g.shadowBlur=17*k;}
        g.strokeStyle='#e5faff';g.lineWidth=Math.max(1.5,2*k);g.beginPath();g.moveTo(...points[0]);for(let j=1;j<points.length;j++)g.lineTo(...points[j]);g.stroke();g.shadowBlur=0;
        line('rgba(190,242,255,.65)',sx+1*k,sy+43*k,sx-18*k,sy+68*k,1.5*k);
        // Local light keeps the playable corridor readable.
        if(ultra)glow(sx,sy+43*k,38*k,'rgba(157,229,255,.20)');
      }
      if(q>0)for(let i=0;i<Math.min(35,9*q);i++){
        const sx=x+mod(i*79+t*1.8-scroll*.06,w+26)-13,sy=y+mod(i*57+t*2.1,h);
        line('rgba(190,223,244,.38)',sx,sy,sx-9*k,sy+16*k,q===3?1.2:.7);
      }
    }else if(s.map==='ECLIPSE_REALM'){
      // Animated corona around a black sun; restrained warm rim lightning over dark temples.
      const sx=x+w*.68,sy=y+h*.25,r=Math.min(w*.175,h*.20,62*k);
      glow(sx,sy,92*k,'rgba(252,103,58,.30)');
      circ('rgba(255,162,68,.12)',sx,sy,r*1.9);circ('#ffb468',sx,sy,r*1.2);
      ring('rgba(255,227,153,.6)',sx,sy,r*1.36,2*k);
      for(let i=0;i<12;i++){
        const a=i*TAU/12+t*.0015;const rr=r*1.24;
        line(i%3?'rgba(255,173,106,.54)':'#ffdd9d',sx+Math.cos(a)*rr,sy+Math.sin(a)*rr,sx+Math.cos(a)*(rr+13*k),sy+Math.sin(a)*(rr+13*k),i%4===0?3*k:1.4*k);
      }
      circ('#0a0a1b',sx,sy,r*1.10);circ('#151325',sx-3*k,sy-3*k,r*.82);
      ring('#de9161',sx,sy,r*1.14,2*k,.20,pi*.96);
      tile(178*k,.10,(bx,i)=>{
        const bh=(105+i%3*31)*k;
        poly('#211c32',[bx+8*k,floor,bx+19*k,floor-bh*.77,bx+37*k,floor-bh,bx+59*k,floor-bh*.88,bx+75*k,floor]);
        rect('#684152',bx+36*k,floor-bh+8*k,4*k,64*k);
        poly('#3e283e',[bx+93*k,floor,bx+104*k,floor-82*k,bx+140*k,floor-82*k,bx+153*k,floor]);
        rect('#845261',bx+99*k,floor-87*k,46*k,6*k);
        for(let j=0;j<3;j++)rect('#bf6d5d',bx+(106+j*13)*k,floor-77*k,4*k,30*k);
      });
      if(!low)tile(142*k,.26,(bx,i)=>{
        const bh=(54+i%3*13)*k;
        rect('#241c31',bx+14*k,floor-bh,44*k,bh);masonry(bx+14*k,floor-bh,44*k,bh,'#503147');
        rect('#764552',bx+10*k,floor-bh-6*k,52*k,8*k);
        rect('#ffb270',bx+26*k,floor-bh+12*k,16*k,2*k);
        rect('#805566',bx+34*k,floor-bh-20*k,4*k,14*k);
        poly('#2a1b35',[bx+80*k,floor,bx+91*k,floor-33*k,bx+104*k,floor-44*k,bx+116*k,floor]);
      });
      if(q>0){
        const beam=.06+.025*Math.sin(t*.025);
        poly(`rgba(255,172,105,${beam})`,[sx-r*.25,sy+r,sx+r*.5,sy+r,sx+w*.6,floor,x+w*.2,floor]);
        for(let i=0;i<q*8;i++){
          const px=x+mod(i*91+t*.17,w+20)-10,py=y+mod(i*47-t*.29,h*.77);
          rect(i%3?'rgba(255,179,113,.62)':'rgba(255,103,78,.44)',px,py,2*k,2*k);
        }
      }
    }else if(s.map==='PRISM'){
      // Glass vaults: colored refracted beams, animated floating prisms and rose windows.
      const centerX=x+w*.49,centerY=y+h*.18;
      glow(centerX,centerY,90*k,'rgba(195,244,255,.20)');
      for(let i=0;i<5;i++){
        const a=Math.sin(t*.006+i)*13*k,px=centerX+(i-2)*36*k;
        poly(['rgba(147,243,255,.10)','rgba(255,194,235,.11)','rgba(251,242,157,.10)','rgba(167,165,255,.11)','rgba(117,255,229,.10)'][i],
          [px+a,y+18*k,px+17*k+a,y+18*k,px+80*k+a,floor,px+32*k+a,floor]);
      }
      tile(200*k,.10,(bx,i)=>{
        const sy=floor-(132+(i%3)*12)*k;
        rect('#40558e',bx+26*k,sy,108*k,floor-sy);masonry(bx+26*k,sy,108*k,floor-sy,'#6079ac');
        poly('#536fa9',[bx+17*k,sy,bx+77*k,sy-59*k,bx+143*k,sy]);
        poly('#a6d2f5',[bx+42*k,sy,bx+77*k,sy-39*k,bx+109*k,sy]);
        rect('#b3ceef',bx+44*k,sy+8*k,75*k,5*k);
        for(let j=0;j<3;j++){
          const wx=bx+(44+j*26)*k,wy=sy+25*k;
          circ('#c4f2ff',wx,wy,8*k);rect(['#9cdeec','#e7a6da','#e9d997'][j],wx-7*k,wy,14*k,29*k);
          rect('#6c83b3',wx-1*k,wy-7*k,2*k,36*k);
        }
      });
      if(!low)tile(106*k,.30,(bx,i)=>{
        const by=floor-(48+i%4*8)*k;
        poly('#5a74aa',[bx+3*k,by+20*k,bx+31*k,by-17*k,bx+60*k,by+20*k]);
        rect('#6686bc',bx+13*k,by+22*k,38*k,floor-by);
        poly('#cbf7fc',[bx+22*k,by+14*k,bx+31*k,by+2*k,bx+39*k,by+14*k,bx+31*k,by+31*k]);
        rect('#b9d7e9',bx+17*k,by+38*k,31*k,3*k);
      });
      for(let i=0;i<(low?3:8);i++){
        const fx=x+mod(i*71+scroll*.0,w+18)-9,fy=y+h*(.19+(i%4)*.12)+Math.sin(i*2+t*.019)*9*k;
        poly(i%3===0?'#bbf8ff':i%3===1?'#efb3fc':'#ffe9b6',[fx,fy-11*k,fx+10*k,fy,fx,fy+11*k,fx-10*k,fy]);
        poly('rgba(255,255,255,.55)',[fx,fy-11*k,fx,fy+11*k,fx-10*k,fy]);
        if(q>1)glow(fx,fy,20*k,'rgba(201,232,255,.14)');
      }
    }else if(s.map==='CLOCKWORK'){
      // Massive rotating gears, independent clockhands and steam-era machine towers.
      const gear=(cx,cy,rad,phase,metal,detail)=>{
        g.save();g.translate(cx,cy);g.rotate(phase);
        for(let n=0;n<12;n++){
          const a=n*TAU/12;
          g.save();g.rotate(a);rect(metal,rad*.75,-rad*.15,rad*.35,rad*.3);g.restore();
        }
        circ(metal,0,0,rad);circ('#372e3b',0,0,rad*.77);
        ring(detail,0,0,rad*.69,2*k);
        for(let n=0;n<6;n++){
          const a=n*TAU/6;line(metal,Math.cos(a)*rad*.25,Math.sin(a)*rad*.25,Math.cos(a)*rad*.74,Math.sin(a)*rad*.74,5*k);
        }
        circ('#e3c38b',0,0,rad*.22);circ('#302e3c',0,0,rad*.10);
        g.restore();
      };
      if(!low)tile(230*k,.075,(bx,i)=>{
        const by=y+h*(.48+(i%2)*.1);
        gear(bx+88*k,by,56*k,t*.0028*(i%2?-1:1)+i,'#69536a','#9d7772');
        gear(bx+171*k,by+40*k,35*k,-t*.0034+i,'#8e705c','#e1b87f');
      });
      const clockX=x+w*.78,clockY=y+h*.21,rr=Math.min(w*.17,52*k);
      glow(clockX,clockY,64*k,'rgba(255,210,121,.16)');
      circ('#4e3d4b',clockX,clockY,rr+7*k);circ('#cfaa70',clockX,clockY,rr);
      circ('#352d3c',clockX,clockY,rr-5*k);circ('#edd6a6',clockX,clockY,rr-10*k);
      for(let i=0;i<12;i++){
        const a=i*TAU/12;rect('#5f4b3c',clockX+Math.cos(a)*(rr-15*k)-2*k,clockY+Math.sin(a)*(rr-15*k)-2*k,4*k,4*k);
      }
      const hr=t*.002,min=t*.014;
      line('#533f3a',clockX,clockY,clockX+Math.cos(hr)*rr*.43,clockY+Math.sin(hr)*rr*.43,3*k);
      line('#674c42',clockX,clockY,clockX+Math.cos(min)*rr*.67,clockY+Math.sin(min)*rr*.67,2*k);circ('#3c3140',clockX,clockY,4*k);
      tile(130*k,.28,(bx,i)=>{
        const bh=(66+(i%3)*17)*k;
        rect('#4c3b45',bx+12*k,floor-bh,66*k,bh);if(detailed){for(let rivet=0;rivet<5;rivet++){circ('#c39a62',bx+15*k,floor-bh+(7+rivet*12)*k,1.3*k);circ('#c39a62',bx+74*k,floor-bh+(7+rivet*12)*k,1.3*k);}line('#aa805d',bx+18*k,floor-12*k,bx+70*k,floor-12*k,2*k);}
        rect('#ad895f',bx+8*k,floor-bh-7*k,74*k,8*k);
        for(let j=0;j<3;j++){rect('#d1af78',bx+(19+j*19)*k,floor-bh+11*k,8*k,25*k);rect('#43313c',bx+(21+j*19)*k,floor-bh+14*k,4*k,20*k);}
        rect('#75564a',bx+78*k,floor-23*k,37*k,24*k);
        for(let a=0;a<3;a++)rect('#dda969',bx+(86+a*9)*k,floor-15*k,4*k,7*k);
      });
      if(q>0)for(let i=0;i<7*q;i++){
        const px=x+mod(i*93+t*.17-scroll*.04,w+12)-6,py=y+mod(i*59-t*.20,h*.95);
        circ('rgba(255,224,170,.54)',px,py,1.2*k);
      }
    }else if(s.map==='NECROPOLIS'){
      // A cursed red-black grave realm: crimson moon, skull cairns, chains and ember ash.
      const mx=x+w*.72,my=y+h*.18;
      glow(mx,my,72*k,'rgba(255,60,82,.22)');circ('#6d1326',mx,my,22*k);circ('#1a0a10',mx-3*k,my-2*k,16*k);
      for(let i=0;i<5;i++){
        const px=x+w*(.14+i*.18)+Math.sin(t*.004+i)*5*k,py=y+h*(.33+(i%2)*.07);
        poly(i%2?'#28131e':'#351420',[px-20*k,py+17*k,px-6*k,py-9*k,px+11*k,py-19*k,px+24*k,py+12*k,px+10*k,py+25*k]);
        rect('#7a2638',px-2*k,py-10*k,4*k,18*k);
        rect('#f2e3df',px-9*k,py-2*k,18*k,10*k);rect('#f2e3df',px-5*k,py-7*k,10*k,7*k);
        rect('#130b0f',px-6*k,py-1*k,3*k,3*k);rect('#130b0f',px+3*k,py-1*k,3*k,3*k);
        if(ultra){const pulse=.60+.15*Math.sin(t*.025+i);for(const ex of [-4.5,4.5]){glow(px+ex*k,py+.5*k,7*k,`rgba(255,24,55,${pulse})`);rect('#ff294d',px+(ex-1.5)*k,py-k,3*k,3*k);rect('#ffd0bc',px+(ex-.5)*k,py,1*k,1*k);}}rect('#130b0f',px-2*k,py+4*k,4*k,2*k);
      }
      tile(154*k,.16,(bx,i)=>{
        const bh=(76+(i%3)*18)*k;
        rect('#201019',bx+16*k,floor-bh,48*k,bh);masonry(bx+16*k,floor-bh,48*k,bh,'#492330');if(detailed){rect('#0e090f',bx+31*k,floor-29*k,18*k,29*k);poly('#0e090f',[bx+31*k,floor-29*k,bx+40*k,floor-40*k,bx+49*k,floor-29*k]);line('#824151',bx+30*k,floor-29*k,bx+40*k,floor-41*k);line('#824151',bx+40*k,floor-41*k,bx+50*k,floor-29*k);}rect('#5f2032',bx+10*k,floor-bh-6*k,60*k,8*k);
        for(let j=0;j<3;j++){rect('#f2e3df',bx+(20+j*12)*k,floor-bh+13*k,6*k,6*k);rect(ultra?'#ff3655':'#130b0f',bx+(22+j*12)*k,floor-bh+15*k,2*k,2*k);if(ultra)glow(bx+(23+j*12)*k,floor-bh+16*k,5*k,'rgba(255,24,55,.40)');}
        line('#8f3042',bx+82*k,floor-12*k,bx+114*k,floor-36*k,3*k);line('#8f3042',bx+82*k,floor-28*k,bx+114*k,floor-4*k,3*k);
      });
      if(!low)tile(96*k,.30,(bx,i)=>{
        const h1=(26+(i%4)*6)*k;
        poly('#2d131d',[bx+6*k,floor,bx+22*k,floor-h1,bx+38*k,floor]);
        rect('#f3dfdb',bx+18*k,floor-h1+4*k,8*k,8*k);rect(ultra?'#ff3655':'#130b0f',bx+20*k,floor-h1+6*k,2*k,2*k);rect(ultra?'#ff3655':'#130b0f',bx+24*k,floor-h1+6*k,2*k,2*k);if(ultra)glow(bx+23*k,floor-h1+7*k,6*k,'rgba(255,24,55,.35)');
        line('#7f2c3c',bx+52*k,floor-32*k,bx+68*k,floor-48*k,2*k);line('#7f2c3c',bx+52*k,floor-18*k,bx+68*k,floor-34*k,2*k);
      });
      if(q>0){
        for(let i=0;i<q*10;i++){const px=x+mod(i*81+t*.14-scroll*.05,w+18)-9,py=y+mod(i*53+t*.42,h);rect(i%4?'rgba(147,69,83,.42)':'rgba(255,113,122,.45)',px,py,2*k,k);if(q>1&&i%4===0)rect('#ffb3a4',px,py,k,k);}
      }
    }else if(s.map==='AURORA'){
      // Glassy ice palace under moving, multi-color aurora ribbons; snow and hanging icicles.
      const mx=x+w*.72,my=y+h*.19;
      glow(mx,my,65*k,'rgba(162,244,250,.20)');circ('#d9faff',mx,my,18*k);
      for(let i=0;i<24;i++){
        const ax=x+w*i/23,kink=Math.sin(i*.38+t*.011)*16*k;
        const edge=y+h*(.18+.04*Math.sin(i*.28+t*.005));
        const thick=(45+18*Math.sin(i*.44+t*.009))*k;
        poly(i%3===0?'rgba(95,245,192,.07)':i%3===1?'rgba(118,187,255,.08)':'rgba(205,133,255,.08)',
          [ax,edge+kink,ax+w/22,edge+kink+4*k,ax+w/22+9*k,edge+kink+thick,ax+3*k,edge+kink+thick]);
      }
      if(q>1){
        for(let b=0;b<3;b++){
          g.strokeStyle=['rgba(112,255,198,.19)','rgba(152,205,255,.15)','rgba(228,169,255,.14)'][b];
          g.lineWidth=(8+b*4)*k;g.beginPath();
          for(let i=0;i<=24;i++){
            const ax=x+w*i/24,ay=y+h*(.22+b*.052)+Math.sin(i*.48+t*.012+b)*17*k;
            if(i===0)g.moveTo(ax,ay);else g.lineTo(ax,ay);
          }
          g.stroke();
        }
      }
      tile(200*k,.12,(bx,i)=>{
        const bh=(99+(i%3)*20)*k;
        poly('#2e6685',[bx+3*k,floor,bx+32*k,floor-bh*.72,bx+50*k,floor-bh,bx+68*k,floor-bh*.85,bx+105*k,floor]);
        poly('#8be1e6',[bx+32*k,floor-bh*.72,bx+50*k,floor-bh,bx+68*k,floor-bh*.85,bx+51*k,floor-bh*.72]);
        rect('#477e9f',bx+105*k,floor-70*k,57*k,70*k);if(detailed){for(let panel=0;panel<3;panel++){const xx=bx+(112+panel*16)*k;poly('#78c3d5',[xx,floor-9*k,xx,floor-54*k,xx+5*k,floor-63*k,xx+10*k,floor-54*k,xx+10*k,floor-9*k]);line('#b5edf0',xx+5*k,floor-58*k,xx+5*k,floor-14*k);}}
        rect('#a6e1ee',bx+102*k,floor-74*k,63*k,5*k);
        poly('#b8f4f5',[bx+115*k,floor-74*k,bx+133*k,floor-115*k,bx+151*k,floor-74*k]);
        rect('#dcffff',bx+130*k,floor-89*k,6*k,20*k);
      });
      if(!low)tile(78*k,.32,(bx,i)=>{
        const hh=(30+i%4*9)*k;
        poly('#195067',[bx+8*k,floor,bx+24*k,floor-hh,bx+41*k,floor]);
        poly('#9de2ed',[bx+15*k,floor-hh*.55,bx+24*k,floor-hh,bx+30*k,floor-hh*.64]);
        rect('#d2f9ff',bx+23*k,floor-hh+3*k,2*k,11*k);
        rect('#4d93a8',bx+50*k,floor-14*k,10*k,14*k);
      });
      if(q>0)for(let i=0;i<q*11;i++){
        const px=x+mod(i*83+t*.17-scroll*.04,w+25)-12,py=y+mod(i*47+t*(.35+i%3*.09),h);
        star(px,py,'rgba(224,255,255,.72)',i%8===0?1.5:1);
      }
    }
    // Small world-specific tessellated stage, permanently below playable pipes.
    const floorCol={TEMPEST:['#243e60','#9dcbe5'],ECLIPSE_REALM:['#3a233a','#df8767'],PRISM:['#3b65a1','#bdefff'],CLOCKWORK:['#6f503f','#e5bf84'],AURORA:['#2d5d7a','#b3eced'],NECROPOLIS:['#2f1119','#ff7e90']}[s.map];
    rect(floorCol[0],x,floor,w,12);rect(floorCol[1],x,floor,w,3);
    g.restore();
  }

  window.flyingBirdMythicArt=drawMythic;
  window.flyingBirdMapArt=draw;
})();
