
const $=id=>document.getElementById(id);
const cv=$("field"),ctx=cv.getContext("2d",{alpha:false});
let W=0,H=0,DPR=1,pts=[],events=0,flow=0,lastEvents=0,lastT=performance.now(),liqCount=0,liqValue=0;
let syms=new Set(), tape=[], deferredInstall=null;
const venueState={binance:false,futures:false,coinbase:false,kraken:false,okx:false};

function resize(){
 DPR=Math.max(1,Math.min(2,devicePixelRatio||1));W=innerWidth;H=innerHeight;
 cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+"px";cv.style.height=H+"px";
 ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize);resize();

function h(s){let x=2166136261;for(let c of s)x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0}
function usd(n){
 if(!Number.isFinite(n))return"—";
 if(n>=1e12)return"$"+(n/1e12).toFixed(2)+"T";
 if(n>=1e9)return"$"+(n/1e9).toFixed(2)+"B";
 if(n>=1e6)return"$"+(n/1e6).toFixed(2)+"M";
 if(n>=1e3)return"$"+(n/1e3).toFixed(1)+"K";
 return"$"+Math.round(n).toLocaleString()
}
function price(n){return Number.isFinite(n)?"$"+n.toLocaleString(undefined,{maximumFractionDigits:n>1000?0:2}):"—"}
function venue(id,state){
 venueState[id]=state;
 const el=$("v-"+id);el.textContent=state?"LIVE":"OFF";el.className=state?"live":"error";
 updateMaster();
}
function updateMaster(){
 const n=Object.values(venueState).filter(Boolean).length;
 $("masterDot").className=n>=3?"live":n===0?"error":"";
 $("masterStatus").textContent=n>=3?"MULTI-FEED LIVE":n>0?"PARTIAL LIVE":"RECONNECTING";
}
function addTape(text,kind=""){
 tape.unshift({text,kind,t:Date.now()});tape=tape.slice(0,8);
 $("tape").innerHTML=tape.map(x=>`<div class="tick"><span>${new Date(x.t).toLocaleTimeString()}</span><span class="${x.kind}">${x.text}</span></div>`).join("");
}
function spawn(symbol,vol,pct,boost=1){
 const a=(h(symbol)%6283)/1000, base=Math.min(W,H)*.11, spread=Math.min(W,H)*.35;
 const rr=base+Math.random()*spread,side=pct>=0?1:-1,q=Math.max(1,vol||1);
 pts.push({x:W/2+Math.cos(a)*rr,y:H/2+Math.sin(a)*rr,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,
   r:Math.min(16,(1.3+Math.log10(q)*.8)*boost),life:1,side,symbol});
 if(pts.length>3200)pts.splice(0,500)
}
function drawGrid(){
 const cx=W/2,cy=H/2;ctx.strokeStyle="rgba(100,145,165,.065)";ctx.lineWidth=1;
 for(let r=70;r<Math.min(W,H)*.47;r+=70){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke()
}
function draw(){
 ctx.fillStyle="rgba(2,4,7,.19)";ctx.fillRect(0,0,W,H);drawGrid();
 const cx=W/2,cy=H/2;
 for(const p of pts){
   const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy)||1;
   p.vx+=(-dy/d)*.003+p.side*.0006;p.vy+=(dx/d)*.003;p.x+=p.vx;p.y+=p.vy;p.life*=.994;
   const a=.10+.70*p.life;
   ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(.3,p.life),0,Math.PI*2);
   ctx.fillStyle=p.side>0?`rgba(105,255,182,${a})`:`rgba(255,102,132,${a})`;ctx.fill();
   if(Math.random()<.014){ctx.strokeStyle="rgba(150,190,210,.05)";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke()}
 }
 pts=pts.filter(p=>p.life>.05);
 $("clusters").textContent=Math.floor(pts.filter(p=>p.r>8&&p.life>.25).length/8);
 requestAnimationFrame(draw)
}
draw();

function engineTick(){
 $("pressure").textContent=flow>.11?"BUY BIAS":flow<-.11?"SELL BIAS":"BALANCED";
 const a=Math.abs(flow);$("pulse").textContent=a>.24?"ELEVATED":a>.13?"ACTIVE":"NORMAL";
 $("signal").textContent=a>.24?"ANOMALY":"SEARCHING";$("symbols").textContent=syms.size.toLocaleString();
 $("events").textContent=events.toLocaleString()+" EVENTS";$("liqCount").textContent=liqCount.toLocaleString();$("liqValue").textContent=usd(liqValue);
}

async function fetchGlobal(){
 try{
   const r=await fetch("https://api.coingecko.com/api/v3/global",{cache:"no-store"});if(!r.ok)throw 0;
   const d=(await r.json()).data;
   $("marketCap").textContent=usd(d.total_market_cap?.usd);$("volume24h").textContent=usd(d.total_volume?.usd);
   $("btcDom").textContent=(d.market_cap_percentage?.btc??0).toFixed(1)+"%";$("ethDom").textContent=(d.market_cap_percentage?.eth??0).toFixed(1)+"%";
   $("aggregateStamp").textContent="GLOBAL AGGREGATE: COINGECKO · "+new Date().toLocaleTimeString();
 }catch(e){$("aggregateStamp").textContent="GLOBAL AGGREGATE: TEMPORARILY UNAVAILABLE"}
}
fetchGlobal();setInterval(fetchGlobal,60000);

function startBinanceSpot(){
 const ws=new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");
 ws.onopen=()=>venue("binance",true);
 ws.onmessage=e=>{
   let a;try{a=JSON.parse(e.data)}catch(_){return} if(!Array.isArray(a))return;
   for(const q of a.slice(0,240)){
     const p=+q.c,o=+q.o,v=+q.q;if(!p||!o)continue;const pct=(p-o)/o*100;
     flow=.988*flow+.012*(pct>=0?1:-1);syms.add("B:"+q.s);spawn(q.s,v,pct);events++;
     if(q.s==="BTCUSDT")$("btc").textContent=price(p);if(q.s==="ETHUSDT")$("eth").textContent=price(p);
   }engineTick()
 };
 ws.onerror=()=>venue("binance",false);ws.onclose=()=>{venue("binance",false);setTimeout(startBinanceSpot,2500)}
}
function startFutures(){
 const ws=new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");
 ws.onopen=()=>venue("futures",true);
 ws.onmessage=e=>{
   let x;try{x=JSON.parse(e.data)}catch(_){return}
   const o=x.o||x; if(!o||!o.s)return;
   const px=+o.ap||+o.p||0,qty=+o.q||0,val=px*qty;liqCount++;liqValue+=val;events++;
   spawn("LQ:"+o.s,val,o.S==="SELL"?-1:1,1.5);
   addTape(`LIQ ${o.s} ${o.S||""} ${usd(val)}`,"liq");engineTick()
 };
 ws.onerror=()=>venue("futures",false);ws.onclose=()=>{venue("futures",false);setTimeout(startFutures,3000)}
}
function startCoinbase(){
 const ws=new WebSocket("wss://ws-feed.exchange.coinbase.com");
 ws.onopen=()=>{venue("coinbase",true);ws.send(JSON.stringify({type:"subscribe",product_ids:["BTC-USD","ETH-USD","SOL-USD"],channels:["ticker"]}))};
 ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.type!=="ticker")return;
   const p=+x.price,v=(+x.last_size||0)*p,side=x.side==="buy"?1:-1;flow=.995*flow+.005*side;
   syms.add("C:"+x.product_id);spawn("C:"+x.product_id,v,side,0.7);events++;
 };
 ws.onerror=()=>venue("coinbase",false);ws.onclose=()=>{venue("coinbase",false);setTimeout(startCoinbase,3500)}
}
function startKraken(){
 const ws=new WebSocket("wss://ws.kraken.com/v2");
 ws.onopen=()=>{venue("kraken",true);ws.send(JSON.stringify({method:"subscribe",params:{channel:"ticker",symbol:["BTC/USD","ETH/USD","SOL/USD"]}}))};
 ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.channel!=="ticker"||!Array.isArray(x.data))return;
   for(const q of x.data){const p=+q.last||0,v=(+q.volume||1)*p;syms.add("K:"+q.symbol);spawn("K:"+q.symbol,v,Math.random()-.5,.55);events++}
 };
 ws.onerror=()=>venue("kraken",false);ws.onclose=()=>{venue("kraken",false);setTimeout(startKraken,4000)}
}
function startOkx(){
 const ws=new WebSocket("wss://ws.okx.com:8443/ws/v5/public");
 ws.onopen=()=>{venue("okx",true);ws.send(JSON.stringify({op:"subscribe",args:[
   {channel:"tickers",instId:"BTC-USDT"},{channel:"tickers",instId:"ETH-USDT"},{channel:"tickers",instId:"SOL-USDT"}
 ]}))};
 ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(!x.arg||x.arg.channel!=="tickers"||!Array.isArray(x.data))return;
   for(const q of x.data){const p=+q.last||0,o=+q.open24h||p,v=+q.volCcy24h||1,pct=o?(p-o)/o*100:0;
     syms.add("O:"+q.instId);spawn("O:"+q.instId,v,pct,.55);events++}
 };
 ws.onerror=()=>venue("okx",false);ws.onclose=()=>{venue("okx",false);setTimeout(startOkx,4500)}
}
startBinanceSpot();startFutures();startCoinbase();startKraken();startOkx();

setInterval(()=>{
 const now=performance.now(),dt=(now-lastT)/1000,r=dt?(events-lastEvents)/dt:0;
 $("rate").textContent=r.toFixed(0)+"/s";lastEvents=events;lastT=now;
 $("utc").textContent=new Date().toISOString().replace("T"," ").slice(0,19)+" UTC";
},1000);

if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("install").classList.remove("hidden")});
$("install").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("install").classList.add("hidden")};
