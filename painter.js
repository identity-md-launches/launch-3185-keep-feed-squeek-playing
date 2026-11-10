/* Feed Squeek room painter.
   The game page runs this file as a Web Worker to paint the rooms of swarm levels (levels/<id>.js). It draws on its own
   canvas and sends back a picture with the drip point and the lights, so a level's painter never reaches the page, and
   the page stops this worker when a painter takes too long. tools/validate-level.mjs checks every level file before it
   is listed; this worker is the second wall. The kit below matches tools/level-kit.mjs: change both together. */
'use strict';
const CTX_FN=['fillRect','strokeRect','clearRect','beginPath','closePath','moveTo','lineTo','arc','arcTo','ellipse','rect','quadraticCurveTo','bezierCurveTo','fill','stroke','clip','save','restore','translate','rotate','scale','createLinearGradient','createRadialGradient','fillText','strokeText','measureText','setLineDash'];
const CTX_PROP=['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','miterLimit','globalAlpha','globalCompositeOperation','font','textAlign','textBaseline','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY','lineDashOffset'];
const paints=Object.create(null);
let got=null;
self.FeedSqueek=Object.freeze({level(d){ got=d; }});

function safeCtx(c){
  const o={};
  for(const f of CTX_FN)o[f]=(...a)=>c[f](...a);
  for(const k of CTX_PROP)Object.defineProperty(o,k,{get:()=>c[k],set:v=>{c[k]=v;}});
  return Object.freeze(o);
}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const num=v=>typeof v==='number'&&isFinite(v);
const all=(...v)=>v.every(num);
const col=v=>typeof v==='string'&&/^\d{1,3},\d{1,3},\d{1,3}$/.test(v);

function load(id){
  if(paints[id])return paints[id];
  got=null;
  importScripts('levels/'+id+'.js');
  const d=got; got=null;
  if(!d||d.id!==id||typeof d.paint!=='function')throw new Error('levels/'+id+'.js did not register the level');
  return paints[id]=d.paint;
}

/* q: {n, id, W, H, dpr, seed, G:{cx,hw,sFar,yFN,yFF,yCN,yCF,unit,fy}, K:{KK,ZMAX,DRIP,BULB,PIPE,RUST,IRON,LCOL}} */
self.onmessage=e=>{
  const q=e.data||{};
  try{
    if(typeof OffscreenCanvas!=='function'){ postMessage({n:q.n,unsupported:true}); return; }
    if(!/^[a-z0-9-]{3,48}$/.test(q.id||''))throw new Error('bad level id');
    const paint=load(q.id);
    const W=q.W, H=q.H, K=q.K, G0=q.G;
    const cv=new OffscreenCanvas(Math.max(1,Math.round(W*q.dpr)),Math.max(1,Math.round(H*q.dpr))), c=cv.getContext('2d');
    if(!c){ postMessage({n:q.n,unsupported:true}); return; }
    c.setTransform(q.dpr,0,0,q.dpr,0,0); c.fillStyle='#000'; c.fillRect(0,0,W,H);
    const sc=z=>1/(1+z*K.KK);
    const proj=(x,z)=>{const s=sc(z),t=(s-G0.sFar)/(1-G0.sFar);return {x:G0.cx+x*G0.hw*s,y:G0.yFF+(G0.yFN-G0.yFF)*t,s};};
    const ceilY=z=>{const s=sc(z),t=(s-G0.sFar)/(1-G0.sFar);return G0.yCF+(G0.yCN-G0.yCF)*t;};
    const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
    const pipeH=(cx,x0,x1,y,r,cols)=>{ const p=Array.isArray(cols)&&cols.length===4?cols:K.PIPE, g=cx.createLinearGradient(0,y-r,0,y+r);
      g.addColorStop(0,p[0]); g.addColorStop(.28,p[1]); g.addColorStop(.62,p[2]); g.addColorStop(1,p[3]); cx.fillStyle=g; cx.fillRect(x0,y-r,x1-x0,2*r); };
    const poly=(cx,pts)=>{cx.beginPath();cx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)cx.lineTo(pts[i][0],pts[i][1]);cx.closePath();};
    const lights=[], glows=[];
    const addLight=(x,y,rad,i)=>{ i=Math.abs(Math.round(+i||0)); lights.push({x,y,r:rad,col:K.LCOL[i%5],sp:1.5+((i*7)%5)*.7,ph:i*1.9}); };
    const z=K.DRIP.z, pr=G0.hw*.03*sc(z);
    const g={...G0,dripX:proj(K.DRIP.x,z).x,dripY:ceilY(z)+pr*3.56,pr,fire:null,lights,glows};
    const kit=Object.freeze({W,H,G:g,proj,ceilY,sc,squash:s=>G0.fy*s/G0.hw,pipeH,poly,addLight,clamp,lerp:(a,b,t)=>a+(b-a)*t,
      smooth:t=>{t=clamp(t);return t*t*(3-2*t);},TAU:Math.PI*2,PI:Math.PI,ZMAX:K.ZMAX,
      DRIP:Object.freeze({...K.DRIP}),BULB:Object.freeze({...K.BULB}),
      PIPE:Object.freeze(K.PIPE.slice()),RUST:Object.freeze(K.RUST.slice()),IRON:Object.freeze(K.IRON.slice())});
    c.save(); paint(safeCtx(c),mulberry(q.seed),kit); c.restore();
    /* send back plain data only */
    const L=Array.isArray(g.lights)?g.lights.slice(0,120):[], Q=Array.isArray(g.glows)?g.glows.slice(0,24):[], f=g.fire;
    const out={dripX:num(g.dripX)?g.dripX:NaN,dripY:num(g.dripY)?g.dripY:NaN,pr:num(g.pr)?g.pr:NaN,
      lights:L.filter(l=>l&&all(l.x,l.y,l.r,l.sp,l.ph)&&col(l.col)).map(l=>({x:l.x,y:l.y,r:l.r,col:l.col,sp:l.sp,ph:l.ph})),
      glows:Q.filter(o=>o&&all(o.x,o.y,o.r,o.a)&&col(o.col)).map(o=>({x:o.x,y:o.y,r:o.r,col:o.col,a:o.a,fl:o.fl?1:0})),
      fire:f&&all(f.x,f.y,f.w,f.h)?{x:f.x,y:f.y,w:f.w,h:f.h}:null};
    const bm=cv.transferToImageBitmap();
    postMessage({n:q.n,bm,g:out},[bm]);
  }catch(err){
    postMessage({n:q.n,error:String(err&&err.message||err).slice(0,160)});
  }
};
